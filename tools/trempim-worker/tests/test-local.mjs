// בדיקות מקומיות לשרת הטרמפים: רכב + מונית. wrangler dev --local --port 8799, SESSION_SECRET=localtest
import crypto from 'node:crypto';
const API = 'http://127.0.0.1:8799';
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
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
