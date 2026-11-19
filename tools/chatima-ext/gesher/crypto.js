/* גשר טלפון↔מחשב – הצפנה מקצה לקצה (מיזם הכלים של גילעד רחמים).
 * אותו קוד רץ בתוסף (service worker / דף הצימוד) ובבדיקות ב-node (tools/check_gesher.js).
 * הטלפון עושה בדיוק את אותו הדבר ב-Java (GesherCrypto.java), ושניהם נבדקים מול tools/data/gesher-vectors.json.
 * הפרוטוקול המלא: tools/gesher-worker/PROTOCOL.md
 * לא כותב שום דבר ללוג.
 */
(function (root) {
  'use strict';
  var subtle = (root.crypto || globalThis.crypto).subtle;
  var INFO = 'hakelim-gesher-v1';
  var enc = new TextEncoder(), dec = new TextDecoder();

  // ---- base64url ----
  function b64u(bytes) {
    bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function hex(bytes) {
    bytes = new Uint8Array(bytes);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
  }
  function concat() {
    var n = 0, i;
    for (i = 0; i < arguments.length; i++) n += arguments[i].length;
    var out = new Uint8Array(n), o = 0;
    for (i = 0; i < arguments.length; i++) { out.set(arguments[i], o); o += arguments[i].length; }
    return out;
  }
  function random(n) { return (root.crypto || globalThis.crypto).getRandomValues(new Uint8Array(n)); }

  // ---- מפתחות ----
  async function newKeyPair() {
    var kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    var pub = new Uint8Array(await subtle.exportKey('raw', kp.publicKey)); // 65 בתים, 04|x|y
    return { privateKey: kp.privateKey, pub: pub };
  }
  // לבדיקות בלבד: מפתח פרטי קבוע מתוך d (32 בתים) + pub (65 בתים)
  async function importPrivate(d, pub) {
    var jwk = { kty: 'EC', crv: 'P-256', d: b64u(d), x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: false };
    return subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  }
  async function hmac(keyBytes, data) {
    var k = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', k, data));
  }
  async function sha256Hex(data) { return hex(await subtle.digest('SHA-256', data)); }

  // אסימון הצימוד החד-פעמי (נגזר מסוד ה-QR) – השרת רואה רק את הגיבוב שלו
  async function pairToken(secret) { return hmac(secret, enc.encode(INFO + '|pair')); }
  // הוכחה שהטלפון ראה את ה-QR: HMAC(סוד, "…|hello" | חדר | מפתח המחשב | מפתח הטלפון)
  async function helloMac(secret, room, pcPub, phonePub) {
    return hmac(secret, concat(enc.encode(INFO + '|hello'), room, pcPub, phonePub));
  }
  function sameBytes(a, b) {
    if (a.length !== b.length) return false;
    var x = 0;
    for (var i = 0; i < a.length; i++) x |= a[i] ^ b[i];
    return x === 0;
  }

  // ECDH -> HKDF-SHA256(salt=חדר, info) -> 128 בתים: מפתח מחשב→טלפון, מפתח טלפון→מחשב, אסימון מחשב, אסימון טלפון
  async function deriveRaw(privateKey, otherPub, room) {
    var other = await subtle.importKey('raw', otherPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    var z = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: other }, privateKey, 256));
    var ikm = await subtle.importKey('raw', z, 'HKDF', false, ['deriveBits']);
    var okm = new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: room, info: enc.encode(INFO) }, ikm, 128 * 8));
    return { z: z, okm: okm };
  }
  async function deriveSession(privateKey, otherPub, room) {
    var r = await deriveRaw(privateKey, otherPub, room), okm = r.okm;
    var gcm = function (b) { return subtle.importKey('raw', b, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); };
    return {
      room: room,
      k12: await gcm(okm.slice(0, 32)),   // כיוון 1: מחשב -> טלפון
      k21: await gcm(okm.slice(32, 64)),  // כיוון 2: טלפון -> מחשב
      tokPc: b64u(okm.slice(64, 96)),
      tokPhone: b64u(okm.slice(96, 128)),
      hPc: await sha256Hex(okm.slice(64, 96)),
      hPhone: await sha256Hex(okm.slice(96, 128))
    };
  }

  // ---- הודעה: [0x01][כיוון][מונה 8 בתים BE] + AES-256-GCM(nonce=000|כיוון|מונה, AAD=חדר|כותרת) ----
  function header(dir, ctr) {
    var h = new Uint8Array(10);
    h[0] = 1; h[1] = dir;
    var v = BigInt(ctr);
    for (var i = 9; i >= 2; i--) { h[i] = Number(v & 0xffn); v >>= 8n; }
    return h;
  }
  function nonceOf(h) { var n = new Uint8Array(12); n[3] = h[1]; n.set(h.slice(2, 10), 4); return n; }
  async function seal(key, room, dir, ctr, obj) {
    var h = header(dir, ctr);
    var ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonceOf(h), additionalData: concat(room, h) }, key, enc.encode(JSON.stringify(obj))));
    return concat(h, ct);
  }
  // מחזיר {ctr, obj} או זורק. בדיקת "מונה עולה" – אצל מי שקורא (lastCtr).
  async function open(key, room, dir, frame, lastCtr) {
    frame = new Uint8Array(frame);
    if (frame.length < 10 + 16 || frame[0] !== 1 || frame[1] !== dir) throw new Error('frame');
    var h = frame.slice(0, 10), ctr = 0n;
    for (var i = 2; i < 10; i++) ctr = (ctr << 8n) | BigInt(h[i]);
    if (lastCtr != null && ctr <= BigInt(lastCtr)) throw new Error('replay');
    var pt = await subtle.decrypt({ name: 'AES-GCM', iv: nonceOf(h), additionalData: concat(room, h) }, key, frame.slice(10));
    return { ctr: ctr.toString(), obj: JSON.parse(dec.decode(pt)) };
  }
  // מונה שעולה תמיד, גם אחרי הפעלה מחדש, בלי לשמור לדיסק: max(הקודם+1, זמן במיקרו-שניות)
  function nextCtr(last) {
    var t = BigInt(Date.now()) * 1000n, l = BigInt(last || 0) + 1n;
    return (t > l ? t : l).toString();
  }

  var api = {
    INFO: INFO, b64u: b64u, unb64u: unb64u, hex: hex, concat: concat, random: random,
    newKeyPair: newKeyPair, importPrivate: importPrivate, hmac: hmac, sha256Hex: sha256Hex,
    pairToken: pairToken, helloMac: helloMac, sameBytes: sameBytes,
    deriveRaw: deriveRaw, deriveSession: deriveSession, seal: seal, open: open, nextCtr: nextCtr,
    DIR_PC_TO_PHONE: 1, DIR_PHONE_TO_PC: 2
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GesherCrypto = api;
})(typeof self !== 'undefined' ? self : this);
