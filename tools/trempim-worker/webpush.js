// Web Push בלי ספריות: חתימת VAPID (ES256, RFC 8292) והצפנת aes128gcm (RFC 8291), רק WebCrypto.
// עובד גם ב-Cloudflare Workers וגם ב-Node 20+ (בשביל הבדיקות).
//
//   VAPID_PUBLIC  – base64url של המפתח הציבורי (65 בתים, 0x04||x||y), ב-[vars]
//   VAPID_PRIVATE – base64url של d (32 בתים), סוד של wrangler. לא נכנס למאגר.

const enc = new TextEncoder();
export const b64u = (buf) => {
  const a = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const unb64u = (s) => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const concat = (...arr) => {
  const out = new Uint8Array(arr.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arr) { out.set(a, o); o += a.length; }
  return out;
};
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
// HKDF עם בלוק אחד (עד 32 בתים) – מספיק לכל מה ש-RFC 8291 צריך
async function hkdf(salt, ikm, info, len) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, new Uint8Array([1])))).slice(0, len);
}

function pubJwk(pub) {
  return { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
}

// הצפנת ההודעה לפי RFC 8291. opts.asKeys / opts.salt רק לבדיקה מול וקטור ה-RFC.
export async function encryptPush(sub, plaintext, opts = {}) {
  const uaPub = unb64u(sub.keys.p256dh);
  const auth = unb64u(sub.keys.auth);
  if (uaPub.length !== 65 || auth.length !== 16) throw new Error('bad keys');
  let asPriv, asPub;
  if (opts.asKeys) {
    asPub = unb64u(opts.asKeys.pub);
    asPriv = await crypto.subtle.importKey('jwk', { ...pubJwk(asPub), d: opts.asKeys.priv }, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  } else {
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    asPriv = kp.privateKey;
    asPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  }
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPriv, 256));
  const salt = opts.salt ? unb64u(opts.salt) : crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(auth, ecdh, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const data = typeof plaintext === 'string' ? enc.encode(plaintext) : plaintext;
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(data, new Uint8Array([2]))));
  const rs = 4096;
  const header = concat(salt, new Uint8Array([rs >>> 24, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255, 65]), asPub);
  return concat(header, ct);
}

// כותרת Authorization של VAPID לשרת ההתראות של הדפדפן
export async function vapidAuth(endpoint, pubB64, privB64, sub = 'https://hakelim.com/kelim/kehila/trempim/') {
  const pub = unb64u(pubB64);
  const key = await crypto.subtle.importKey('jwk', { ...pubJwk(pub), d: privB64 }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body));
  return 'vapid t=' + head + '.' + body + '.' + b64u(sig) + ', k=' + pubB64;
}

// שליחה אחת. מחזיר את קוד התשובה (201 = נשלח; 404/410 = המנוי מת)
export async function sendPush(sub, payload, env, ttl = 86400) {
  const bodyBytes = await encryptPush(sub, JSON.stringify(payload));
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(sub.endpoint, env.VAPID_PUBLIC, env.VAPID_PRIVATE),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: 'normal',
    },
    body: bodyBytes,
  });
  return r.status;
}

// כתובת מנוי מותרת: רק שירותי ההתראות של הדפדפנים (שלא ישמשו אותנו לשלוח בקשות לכל מקום)
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;
export function endpointOk(endpoint, env) {
  let u; try { u = new URL(endpoint); } catch (e) { return false; }
  if (u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname)) return true;
  // בדיקות מקומיות בלבד: מקלט על המחשב
  return env.PUSH_TEST_LOCAL === '1' && u.protocol === 'http:' && u.hostname === '127.0.0.1';
}

// יצירת זוג מפתחות VAPID (לשימוש חד-פעמי מהמחשב: node webpush.js keys)
export async function newVapidKeys() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  return { pub: b64u(pub), priv: jwk.d };
}
