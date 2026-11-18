// בדיקות מקומיות לשרת הטרמפים: רכב, מונית, התראות, מחפשים טרמפ ולוח פתוח.
// הכנה: npx wrangler d1 execute trempim --local --file schema.sql
// הרצה: npx wrangler dev --local --port 18877  (ו-.dev.vars עם SESSION_SECRET=localtest, VAPID_PRIVATE, PUSH_TEST_LOCAL=1)
//       node tests/test-local.mjs   (מאפס את המשתמשים gA..gE לפני כל ריצה דרך tests/seed-local.sql)
import crypto from 'node:crypto';
import http from 'node:http';
import { execSync } from 'node:child_process';
const API = process.env.TREMPIM_API || 'http://127.0.0.1:18877';
const PUSH_PORT = +(process.env.PUSH_PORT || 18878);
if (process.env.SEED !== '0') execSync('npx wrangler d1 execute trempim --local --file tests/seed-local.sql', { stdio: 'ignore', shell: true });
const b64u = (b) => Buffer.from(b).toString('base64url');
function tok(uid) {
  const p = b64u(JSON.stringify({ u: uid, e: Date.now() + 864e5 }));
  return p + '.' + crypto.createHmac('sha256', 'localtest').update(p).digest('base64url');
}
async function call(uid, path, data) {
  const r = await fetch(API + path, { method: data ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + tok(uid), 'Content-Type': 'application/json', Origin: 'http://localhost:8080' }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json(); j._s = r.status; return j;
}
let fails = 0;
const ok = (c, m, x) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); if (!c) fails++; };
const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(Date.now() + 864e5));
const route = []; for (let i = 0; i <= 50; i++) route.push([31.78, +(35.20 + i * 0.002).toFixed(5)]);
const from = { label: 'A', lat: 31.78, lng: 35.20 }, to = { label: 'B', lat: 31.78, lng: 35.30 };
const base = { from, to, date: tomorrow, time: '10:00', km: 10, min: 20, route };

// רכב: נשאר כמו שהיה
let car = await call('gA', '/rides', { ...base, seats: 3, rate: 1 });
ok(car._s === 200 && car.ride.kind === 'car', 'car ride created', car);
ok((await call('gA', '/rides', { ...base, seats: 3, rate: 3 }))._s === 400, 'car rate above 1.5 rejected');
// מונית
let tx = await call('gA', '/rides', { ...base, kind: 'taxi', seats: 3, split: 'equal' });
ok(tx._s === 200 && tx.ride.kind === 'taxi' && tx.ride.fare === 77, 'taxi equal created, fare 77 (12.46+5.78+10*1.95+20*1.95)', tx);
ok((await call('gA', '/rides', { ...base, kind: 'taxi', seats: 4, split: 'equal' }))._s === 400, 'taxi 4 joiners rejected');
let txk = await call('gA', '/rides', { ...base, kind: 'taxi', seats: 2, split: 'km', rate: 5 });
ok(txk._s === 200, 'taxi km created (rate ignored)', txk);
let mine = await call('gA', '/rides/mine');
const mt = mine.rides.find(r => r.id === tx.ride.id);
ok(mt && mt.kind === 'taxi' && mt.split === 'equal' && mt.fare === 77 && mt.rate === 0, 'mine shows taxi', mt);

// חיפוש: B מחצי הדרך עד הסוף
const s = await call('gB', '/search', { from: { label: 'mid', lat: 31.781, lng: 35.25 }, to, dates: [tomorrow], radius: 1 });
const sc = s.matches.find(m => m.ride === car.ride.id), st = s.matches.find(m => m.ride === tx.ride.id), sk = s.matches.find(m => m.ride === txk.ride.id);
ok(sc && sc.kind === 'car' && sc.price === 5 && !sc.taxi, 'search car price by km (≈4.8km → min 5)', sc && sc.price);
ok(st && st.kind === 'taxi' && st.taxi.fare === 77 && st.taxi.people === 2 && st.price === 39, 'search taxi equal: 77/2 = 39', st && st.taxi);
ok(st && st.taxi.alone > st.price && st.taxi.save === st.taxi.alone - st.price, 'taxi shows saving vs alone', st && st.taxi);
ok(sk && sk.taxi.split === 'km' && sk.price === Math.round(77 * (sk.segKm / 10) / 2), 'search taxi km: fare*seg/km/2', sk && { seg: sk.segKm, p: sk.price });

// בקשות ואישור במונית שווה: B, C מצטרפים → כל אחד 77/3
const rB = await call('gB', '/requests', { ride: tx.ride.id, date: tomorrow, pickup: { label: 'mid', lat: 31.781, lng: 35.25 }, drop: to, mode: 'paid' });
const rC = await call('gC', '/requests', { ride: tx.ride.id, date: tomorrow, pickup: from, drop: to, mode: 'paid' });
ok(rB._s === 200 && rC._s === 200, 'taxi requests sent');
ok((await call('gA', '/requests/' + rB.request.id, { action: 'approve' }))._s === 200, 'approve B');
let ib = await call('gB', '/inbox');
let xB = ib.asRider.find(x => x.id === rB.request.id);
ok(xB.status === 'approved' && xB.kind === 'taxi' && xB.price === 39 && xB.fare === 77 && xB.driver.phone, 'B approved, 39, phone shown', xB);
ok((await call('gA', '/requests/' + rC.request.id, { action: 'approve' }))._s === 200, 'approve C');
xB = (await call('gB', '/inbox')).asRider.find(x => x.id === rB.request.id);
const xC = (await call('gC', '/inbox')).asRider.find(x => x.id === rC.request.id);
ok(xB.price === 26 && xC.price === 26, 'after C joins both pay 77/3 = 26', [xB.price, xC.price]);
const dA = (await call('gA', '/inbox')).asDriver.filter(x => x.ride === tx.ride.id);
ok(dA.length === 2 && dA.every(x => x.kind === 'taxi' && x.rider.phone), 'owner inbox shows taxi riders with phones');
// C מבטל → B חוזר ל-39
ok((await call('gC', '/requests/' + rC.request.id, { action: 'cancel' }))._s === 200, 'C cancels');
xB = (await call('gB', '/inbox')).asRider.find(x => x.id === rB.request.id);
ok(xB.price === 39, 'after cancel B back to 39', xB.price);
// עד 3 מצטרפים: מונית km עם 2 מקומות
const k1 = await call('gB', '/requests', { ride: txk.ride.id, date: tomorrow, pickup: from, drop: to, mode: 'paid' });
const k2 = await call('gC', '/requests', { ride: txk.ride.id, date: tomorrow, pickup: from, drop: to, mode: 'paid' });
const k3 = await call('gD', '/requests', { ride: txk.ride.id, date: tomorrow, pickup: from, drop: to, mode: 'paid' });
await call('gA', '/requests/' + k1.request.id, { action: 'approve' });
await call('gA', '/requests/' + k2.request.id, { action: 'approve' });
ok((await call('gA', '/requests/' + k3.request.id, { action: 'approve' })).error === 'full', 'taxi full after seats');
const sD = await call('gD', '/search', { from, to, dates: [tomorrow], radius: 1 });
ok(!sD.matches.find(m => m.ride === txk.ride.id), 'full taxi hidden from search');
// רכב: אישור בחינם עדיין עובד
const cr = await call('gD', '/requests', { ride: car.ride.id, date: tomorrow, pickup: from, drop: to, mode: 'paid' });
ok((await call('gA', '/requests/' + cr.request.id, { action: 'approve', free: true }))._s === 200, 'car approve free');
ok((await call('gD', '/inbox')).asRider.find(x => x.id === cr.request.id).price === 0, 'car free price 0');
const st2 = await (await fetch(API + '/stats')).json();
ok(st2.taxis >= 2, 'stats counts taxis', st2);
// תעריף לילה/שבת: יום שבת בצהריים = תעריף ב'
const sat = new Date(); while (sat.getDay() !== 6) sat.setDate(sat.getDate() + 1);
const satD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(sat);
const ts = await call('gA', '/rides', { ...base, date: satD, kind: 'taxi', seats: 1, split: 'equal' });
ok(ts.ride.fare === Math.round(12.46 + 5.78 + 30 * 2.34), 'shabbat fare uses tariff B', ts.ride.fare);

// ---------- התראות, "מחפשים טרמפ", לוח פתוח וחיפוש לאורחים (18.11.2026) ----------
// מקלט התראות מקומי: מקבל את ה-POST מהשרת ומפענח אותו כמו דפדפן (RFC 8291)
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const inbox = {}; let goneHits = 0;
const srv = http.createServer((req, res) => {
  const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
    if (req.url.startsWith('/gone/')) { goneHits++; res.writeHead(410); return res.end(); }
    const who = req.url.split('/')[2];
    (inbox[who] = inbox[who] || []).push({ body: Buffer.concat(chunks), auth: req.headers.authorization || '', ce: req.headers['content-encoding'] });
    res.writeHead(201); res.end();
  });
});
await new Promise(r => srv.listen(PUSH_PORT, '127.0.0.1', r));
const hmacB = async (k, d) => new Uint8Array(await subtle.sign('HMAC', await subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), d));
const hkdf = async (salt, ikm, info, len) => (await hmacB(await hmacB(salt, ikm), Buffer.concat([info, Buffer.from([1])]))).slice(0, len);
const devices = {};
async function device(uid, path = '/p/' + uid) {
  const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  const auth = crypto.randomBytes(16);
  const d = { kp, pub, auth, endpoint: 'http://127.0.0.1:' + PUSH_PORT + path };
  devices[uid] = d;
  return call(uid, '/push/sub', { endpoint: d.endpoint, keys: { p256dh: b64u(pub), auth: b64u(auth) } });
}
async function decrypt(uid, buf) {
  const d = devices[uid];
  const salt = buf.subarray(0, 16), idlen = buf[20], asPub = buf.subarray(21, 21 + idlen), ct = buf.subarray(21 + idlen);
  const asKey = await subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asKey }, d.kp.privateKey, 256));
  const ikm = await hkdf(d.auth, ecdh, Buffer.concat([enc.encode('WebPush: info\0'), d.pub, asPub]), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), ct));
  let end = plain.length - 1; while (end > 0 && plain[end] === 0) end--;
  return JSON.parse(new TextDecoder().decode(plain.subarray(0, end)));
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function got(uid, n0) { for (let i = 0; i < 30; i++) { if ((inbox[uid] || []).length > n0) break; await wait(150); } const l = inbox[uid] || []; return l.length > n0 ? decrypt(uid, l[l.length - 1].body) : null; }
const count = (uid) => (inbox[uid] || []).length;
const phoneLike = /0\d{8,9}|05\d-?\d{7}/;

const key = await (await fetch(API + '/push/key')).json();
ok(/^[\w-]{87}$/.test(key.key), 'GET /push/key returns the public VAPID key', key);
ok((await call('gA', '/push/sub', { endpoint: 'https://evil.example.com/x', keys: { p256dh: 'x'.repeat(87), auth: 'y'.repeat(22) } }))._s === 400, 'push/sub refuses a non-push host');
for (const u of ['gA', 'gB', 'gC', 'gD']) ok((await device(u))._s === 200, 'push/sub saved for ' + u);

// מחפשים טרמפ: B מחפש מחר בין 09:00 ל-11:00 מ-35.22 עד 35.28
const pick = { label: 'רחוב הבדיקה 7, ירושלים', lat: 31.78, lng: 35.22 }, drop = { label: 'שדרות הניסוי 12, ירושלים', lat: 31.78, lng: 35.28 };
const w = await call('gB', '/wants', { from: pick, to: drop, date: tomorrow, time_from: '09:00', time_to: '11:00' });
ok(w._s === 200 && w.want.id && w.want.expires === tomorrow, 'want saved (one-time: expires on its date)', w);
const w2 = await call('gB', '/wants', { from: pick, to: drop, date: tomorrow, time_from: '09:30', time_to: '11:00' });
ok(w2.want && w2.want.id === w.want.id && w2.want.dup, 'same want again updates instead of duplicating', w2);
const wr = await call('gC', '/wants', { from: pick, to: drop, days: [0, 1, 2, 3, 4, 5, 6], time_from: '17:00', time_to: '19:00' });
ok(wr._s === 200 && wr.want.expires > tomorrow, 'regular want saved for 30 days', wr);
ok((await call('gC', '/wants/' + wr.want.id, { action: 'renew' })).ok === true, 'regular want renews');
ok((await call('gB', '/wants/' + w.want.id, { action: 'renew' }))._s === 400, 'one-time want cannot be renewed');
const mineW = await call('gB', '/wants/mine');
ok(mineW.wants.length === 1 && mineW.wants[0].timeFrom === '09:30', 'wants/mine lists it', mineW.wants);

// נסיעה שמתאימה → B מקבל התראה; C (ערב) ו-D (פג תוקף) לא
let nB = count('gB'), nC = count('gC'), nD = count('gD');
const match = await call('gA', '/rides', { ...base, seats: 2, rate: 1 });
ok(match._s === 200, 'matching ride created');
const msgB = await got('gB', nB);
ok(msgB && /בדרך שחיפשת/.test(msgB.title) && msgB.url.includes('?r=' + match.ride.id), 'matching ride → seeker notified, link to the ride', msgB);
ok(msgB && !phoneLike.test(JSON.stringify(msgB)) && !/הבדיקה|הניסוי|אברהם/.test(JSON.stringify(msgB)), 'want notification has no phone, address or last name', msgB);
ok(inbox.gB[inbox.gB.length - 1].ce === 'aes128gcm' && /^vapid t=/.test(inbox.gB[inbox.gB.length - 1].auth), 'sent as aes128gcm with VAPID header');
await wait(400);
ok(count('gC') === nC, 'evening want not notified for a 10:00 ride');
ok(count('gD') === nD, 'expired want gets nothing');
// נסיעה שלא מתאימה: מסלול אחר לגמרי
nB = count('gB');
const far = []; for (let i = 0; i <= 20; i++) far.push([31.60, +(35.0 + i * 0.002).toFixed(5)]);
await call('gA', '/rides', { from: { label: 'X', lat: 31.60, lng: 35.0 }, to: { label: 'Y', lat: 31.60, lng: 35.04 }, date: tomorrow, time: '10:00', km: 4, min: 8, route: far, seats: 2, rate: 1 });
await wait(900);
ok(count('gB') === nB, 'non-matching ride → no notification');
// ערב: C מקבל
nC = count('gC');
await call('gA', '/rides', { ...base, time: '18:00', seats: 2, rate: 1 });
const msgC = await got('gC', nC);
ok(msgC && /בדרך שחיפשת/.test(msgC.title), 'regular evening want notified by an 18:00 ride', msgC);

// בקשה → נהג; אישור → מבקש; ביטול → הצד השני; דחייה → מבקש
let nA = count('gA');
const rq = await call('gB', '/requests', { ride: match.ride.id, date: tomorrow, pickup: pick, drop, mode: 'paid' });
const mA = await got('gA', nA);
ok(rq._s === 200 && mA && /בקשת טרמפ/.test(mA.title) && mA.url.endsWith('#inbox'), 'new request → driver notified', mA);
ok(mA && !phoneLike.test(JSON.stringify(mA)) && !/הבדיקה|בן דוד/.test(JSON.stringify(mA)), 'request notification: first name only, no address', mA);
nB = count('gB');
await call('gA', '/requests/' + rq.request.id, { action: 'approve' });
const mB = await got('gB', nB);
ok(mB && /אושר/.test(mB.title) && !phoneLike.test(JSON.stringify(mB)), 'approve → rider notified, no phone in it', mB);
nA = count('gA');
await call('gB', '/requests/' + rq.request.id, { action: 'cancel' });
const mA2 = await got('gA', nA);
ok(mA2 && /בוטל/.test(mA2.title), 'rider cancels → driver notified', mA2);
const rq2 = await call('gC', '/requests', { ride: match.ride.id, date: tomorrow, pickup: pick, drop, mode: 'paid' });
nC = count('gC');
await call('gA', '/requests/' + rq2.request.id, { action: 'decline' });
const mC = await got('gC', nC);
ok(mC && /לא הסתדר/.test(mC.title), 'decline → rider notified', mC);
// מנוי שהדפדפן ביטל (410) נמחק אחרי ניסיון אחד
await device('gE', '/gone/gE');
const rq3 = await call('gE', '/requests', { ride: match.ride.id, date: tomorrow, pickup: pick, drop, mode: 'paid' });
await call('gA', '/requests/' + rq3.request.id, { action: 'decline' });
await wait(800);
const rq4 = await call('gE', '/requests', { ride: match.ride.id, date: tomorrow, pickup: pick, drop, mode: 'paid' });
await call('gA', '/requests/' + rq4.request.id, { action: 'decline' });
await wait(800);
ok(goneHits === 1, 'subscription answered 410 is deleted after one try', goneHits);
ok((await call('gB', '/push/unsub', { endpoint: devices.gB.endpoint })).ok, 'push/unsub works');

// לוח פתוח: בלי כניסה, בלי פרטים אישיים
const brRes = await fetch(API + '/board');
const br = await brRes.json();
const brS = JSON.stringify(br);
ok(brRes.status === 200 && br.rides.some(r => r.id === match.ride.id), 'GET /board works without login and lists open rides', br.rides.length);
ok(!/@|test\.local|0501111111|phone|email|route|note|user_id|pic/.test(brS) && !phoneLike.test(brS), 'board has no email, phone, route, note or ids of people');
ok(!/אברהם|בן דוד|גולן|הבדיקה 7|הניסוי 12/.test(brS), 'board shows first names only and no house numbers');
ok(br.rides.every(r => [r.from.lat, r.from.lng, r.to.lat, r.to.lng].every(x => Math.round(x * 100) / 100 === x)), 'board points rounded to ~1 km');
const wg = br.wants.find(g => g.n >= 1);
ok(wg && Object.keys(wg).sort().join() === 'from,n,part,time,to' && !/בתיה|gB|גדי|gC/.test(JSON.stringify(br.wants)), 'board wants are counts only, seeker not revealed', br.wants);
const one = await (await fetch(API + '/board?r=' + match.ride.id)).json();
ok(one.ride && one.ride.id === match.ride.id && one.ride.driver === 'אבי', '/board?r=<id> returns that ride', one);
// חיפוש לאורח: עובד; בקשה – רק אחרי כניסה
const gs = await fetch(API + '/search', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' }, body: JSON.stringify({ from: pick, to: drop, dates: [tomorrow], radius: 1 }) });
const gsj = await gs.json();
ok(gs.status === 200 && gsj.matches.some(m => m.ride === match.ride.id) && gsj.matches.every(m => m.mine === null), 'guest search works without login');
const gr = await fetch(API + '/requests', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' }, body: JSON.stringify({ ride: match.ride.id, date: tomorrow, pickup: pick, drop, mode: 'paid' }) });
ok(gr.status === 401, 'guest request needs login');
const st3 = await (await fetch(API + '/stats')).json();
ok(st3.wants === 2, 'stats counts open wants (expired not counted)', st3);
ok((await call('gB', '/wants/' + w.want.id, { action: 'delete' })).ok && (await call('gB', '/wants/mine')).wants.length === 0, 'want deleted');
ok((await call('gB', '/wants/' + wr.want.id, { action: 'delete' }))._s === 404, "cannot delete someone else's want");
srv.close();

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
