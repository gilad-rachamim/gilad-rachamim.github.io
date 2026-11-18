// בדיקת הצפנת ההתראות מול וקטור הבדיקה של RFC 8291 (נספח A), וחתימת VAPID. node tests/test-webpush.mjs
import { encryptPush, vapidAuth, newVapidKeys, b64u, unb64u, endpointOk } from '../webpush.js';
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined && !c ? ' → ' + JSON.stringify(x) : '')); if (!c) fails++; };

const V = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPub: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPriv: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPub: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};
const out = await encryptPush({ keys: { p256dh: V.uaPub, auth: V.auth } }, V.plaintext, { asKeys: { pub: V.asPub, priv: V.asPriv }, salt: V.salt });
ok(b64u(out) === V.body, 'RFC 8291 test vector: encrypted body matches byte for byte', b64u(out));

// VAPID: החתימה מאומתת עם המפתח הציבורי
const k = await newVapidKeys();
ok(unb64u(k.pub).length === 65 && unb64u(k.priv).length === 32, 'new VAPID keys: 65-byte public, 32-byte private');
const h = await vapidAuth('https://fcm.googleapis.com/fcm/send/abc', k.pub, k.priv);
const m = h.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
ok(!!m && m[4] === k.pub, 'vapid header shape');
const claims = JSON.parse(new TextDecoder().decode(unb64u(m[2])));
ok(claims.aud === 'https://fcm.googleapis.com' && claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 86400 && claims.sub.startsWith('https://'), 'vapid claims: aud origin, exp < 24h, sub', claims);
const pk = await crypto.subtle.importKey('raw', unb64u(k.pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pk, unb64u(m[3]), new TextEncoder().encode(m[1] + '.' + m[2])), 'vapid ES256 signature verifies');

ok(endpointOk('https://fcm.googleapis.com/fcm/send/x', {}) && endpointOk('https://web.push.apple.com/abc', {}) && endpointOk('https://updates.push.services.mozilla.com/wpush/v2/x', {}), 'real push hosts allowed');
ok(!endpointOk('https://evil.example.com/x', {}) && !endpointOk('http://127.0.0.1:1/x', {}) && !endpointOk('https://fcm.googleapis.com.evil.com/x', {}), 'other hosts refused');
ok(endpointOk('http://127.0.0.1:18878/p/x', { PUSH_TEST_LOCAL: '1' }), 'local receiver only in test mode');

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
