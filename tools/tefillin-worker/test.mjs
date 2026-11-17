// בדיקה בלי רשת: ההחלטה, הכללים והאתגרים.
import assert from 'node:assert/strict';
import { verdict, rules, why, GESTURES, Quota, vwhy, vshape, vrules, VSCHEMA } from './tefillin-worker.js';
const all = { person: true, shel_rosh: true, shel_yad: true, gesture: true, wrapped_hand: true, live: true, screen: false };
assert.equal(verdict(all), true);
for (const k of Object.keys(all).filter(k => k !== 'screen')) assert.equal(verdict({ ...all, [k]: false }), false, k);
// חשד לצילום מסך (או תשובה בלי השדה) => נדחה
assert.equal(verdict({ ...all, screen: true }), false);
const { screen, ...noScreen } = all; assert.equal(verdict(noScreen), false);
assert.equal(verdict(null), false);
assert.match(why({ ...all, screen: true }), /מסך/);
assert.match(why({ ...all, wrapped_hand: false }), /רצועות/);
assert.equal(why(all), '');
assert.ok(rules('X').includes('bezel') && rules('X').includes('wrapped_hand'));
assert.ok(rules('X SIGN').includes('X SIGN'));
assert.equal(new Set(GESTURES.map(g => g.g)).size, GESTURES.length);
// Quota: שימוש אחד, תוקף, מכשיר אחר, מכסה
const mem = new Map();
const st = { get: async k => mem.get(k), put: async (k, v) => { mem.set(k, v); }, delete: async k => { mem.delete(k); },
  list: async ({ prefix }) => new Map([...mem].filter(([k]) => k.startsWith(prefix))) };
const q = new Quota({ storage: st });
const go = async (p, b) => (await q.fetch(new Request('https://q/' + p, { method: 'POST', body: JSON.stringify(b) }))).json();
const day = '2026-11-16';
await go('put', { id: 'a', g: 'two', d: 'dev1', exp: Date.now() + 1e5 });
assert.equal((await go('take', { id: 'a', who: 'dev2', day, per: 2, cap: 9 })).error, 'challenge');
await go('put', { id: 'a', g: 'two', d: 'dev1', exp: Date.now() + 1e5 });
const r = await go('take', { id: 'a', who: 'dev1', day, per: 2, cap: 9 });
assert.equal(r.g, 'two'); assert.equal(r.left, 1);
assert.equal((await go('take', { id: 'a', who: 'dev1', day, per: 2, cap: 9 })).error, 'challenge');
await go('put', { id: 'b', g: 'one', d: 'dev1', exp: Date.now() - 1 });
assert.equal((await go('take', { id: 'b', who: 'dev1', day, per: 2, cap: 9 })).error, 'challenge');
await go('put', { id: 'c', g: 'one', d: 'dev1', exp: Date.now() + 1e5 });
assert.equal((await go('take', { id: 'c', who: 'dev1', day, per: 2, cap: 9 })).left, 0);
await go('put', { id: 'd', g: 'one', d: 'dev1', exp: Date.now() + 1e5 });
assert.equal((await go('take', { id: 'd', who: 'dev1', day, per: 2, cap: 9 })).error, 'quota');
// אתגר וידאו: g2 נשמר ומוחזר
await go('put', { id: 'v', g: 'two', g2: 'ok', d: 'dev9', exp: Date.now() + 1e5 });
const rv = await go('take', { id: 'v', who: 'dev9', day, per: 2, cap: 9 });
assert.equal(rv.g2, 'ok');

// ---- סרטון (1.3.0) ----
const F = (o = {}) => ({ person: true, shel_rosh: true, shel_yad: true, gesture_a: false, gesture_b: false, screen: false, ...o });
const good = { frames: [F({ gesture_a: true }), F({ gesture_a: true }), F({ gesture_b: true }), F({ gesture_b: true })],
  same_person: true, motion: true, wrapped_hand: true, screen: false, live: true };
assert.equal(vwhy(good, 4), '');
assert.match(vwhy({ ...good, frames: good.frames.slice(0, 3) }, 4), /כל הסרטון/);
assert.match(vwhy({ ...good, frames: [F({ gesture_a: true }), F({ screen: true }), F({ gesture_b: true }), F()] }, 4), /מסך/);
assert.match(vwhy({ ...good, screen: true }, 4), /מסך/);
assert.match(vwhy({ ...good, live: false }, 4), /מסך/);
assert.match(vwhy({ ...good, same_person: false }, 4), /אותו אדם/);
assert.match(vwhy({ ...good, frames: [F({ gesture_a: true }), F({ shel_rosh: false }), F({ gesture_b: true }), F()] }, 4), /של ראש/);
// של יד: מספיק ברוב הפריימים
assert.equal(vwhy({ ...good, frames: [F({ gesture_a: true, shel_yad: false }), F({ gesture_a: true }), F({ gesture_b: true, shel_yad: false }), F({ gesture_b: true })] }, 4), '');
assert.match(vwhy({ ...good, frames: [F({ gesture_a: true, shel_yad: false }), F({ shel_yad: false }), F({ gesture_b: true, shel_yad: false }), F()] }, 4), /של יד/);
// הסדר: קודם א' ואחר כך ב'
assert.match(vwhy({ ...good, frames: [F({ gesture_b: true }), F(), F({ gesture_a: true }), F()] }, 4), /קודם/);
assert.match(vwhy({ ...good, frames: [F(), F(), F({ gesture_b: true }), F()] }, 4), /הראשון/);
assert.match(vwhy({ ...good, frames: [F({ gesture_a: true }), F(), F(), F()] }, 4), /השני/);
assert.match(vwhy({ ...good, motion: false }, 4), /תנועה/);
assert.match(vwhy({ ...good, wrapped_hand: false }, 4), /רצועות/);
assert.notEqual(vwhy(null, 4), '');
assert.notEqual(vwhy({ ...good, frames: good.frames.map(({ screen, ...x }) => x) }, 4), ''); // בלי screen => נדחה
// מבנה הבקשה
const fr = t => ({ t, mime: 'image/jpeg', data: 'x'.repeat(10) + t });
assert.equal(vshape({ frames: [fr(0), fr(1000), fr(2000), fr(3000)] }), '');
assert.equal(vshape({ frames: [fr(0), fr(1000)] }), 'frames');
assert.equal(vshape({ frames: [0, 1, 2, 3, 4, 5].map(i => fr(i * 900)) }), 'frames');
assert.equal(vshape({ frames: [fr(0), fr(2000), fr(1000)] }), 'time');
assert.equal(vshape({ frames: [fr(0), fr(300), fr(600)] }), 'span');
assert.equal(vshape({ frames: [fr(0), fr(5000), fr(9000)] }), 'span');
assert.equal(vshape({ frames: [fr(0), fr(1000), { ...fr(2000), mime: 'image/gif' }] }), 'frame');
assert.equal(vshape({ frames: [fr(0), fr(1000), { ...fr(2000), data: 'x'.repeat(900_001) }] }), 'frame');
assert.ok(vrules('AAA', 'BBB', 4).includes('AAA') && vrules('AAA', 'BBB', 4).includes('exactly 4'));
assert.ok(VSCHEMA.required.includes('motion') && VSCHEMA.required.includes('same_person'));
console.log('ok – כל הבדיקות עברו');

// ---- קיצור הדרך באייפון (17.11.2026): לוח, זמנים, CORS, "עבר היום" ----
import { dayKind, sunAt, lockTime, ilDate, cors } from './tefillin-worker.js';
assert.equal(dayKind('2026-11-21').why, 'שבת');
assert.equal(dayKind('2026-09-12').off, true);          // ראש השנה
assert.equal(dayKind('2026-09-21').why, 'יום כיפור');
assert.equal(dayKind('2026-09-28').moed, true);         // חול המועד סוכות
assert.equal(dayKind('2026-10-03').off, true);          // שמיני עצרת (חל בשבת)
assert.equal(dayKind('2027-04-22').why, 'פסח');
assert.equal(dayKind('2027-06-11').why, 'שבועות');
assert.equal(dayKind('2026-11-17').off, false);
assert.equal(dayKind('2027-08-12').av, true);           // ט' באב תשפ"ז
// שקיעה בירושלים 17.11.2026 ~16:39 שעון ישראל (14:39 UTC)
const ss = new Date(sunAt('2026-11-17', 90.833, false));
assert.ok(Math.abs(ss.getUTCHours() * 60 + ss.getUTCMinutes() - (14 * 60 + 39)) <= 3, ss.toISOString());
const mi = new Date(sunAt('2026-11-17', 101.5, true));    // משיכיר ~05:20 שעון ישראל
assert.ok(mi.getUTCHours() === 3, mi.toISOString());
assert.equal(ilDate(Date.parse('2026-11-17T23:30:00Z')), '2026-11-18');
assert.equal(lockTime(Date.parse('2026-11-17T08:00:00Z')), true);    // 10:00 בבוקר יום חול
assert.equal(lockTime(Date.parse('2026-11-17T02:00:00Z')), false);   // 04:00 – לפני משיכיר
assert.equal(lockTime(Date.parse('2026-11-17T15:30:00Z')), false);   // אחרי השקיעה
assert.equal(lockTime(Date.parse('2026-11-21T08:00:00Z')), false);   // שבת
assert.equal(lockTime(Date.parse('2026-09-28T08:00:00Z')), false);   // חול המועד
assert.equal(lockTime(Date.parse('2026-11-17T05:00:00Z'), '08:00'), false); // 07:00 לפני השעה שנבחרה
assert.equal(lockTime(Date.parse('2026-11-17T06:30:00Z'), '08:00'), true);  // 08:30
assert.equal(lockTime(Date.parse('2027-08-12T06:00:00Z')), false);   // תשעה באב בבוקר
assert.equal(lockTime(Date.parse('2027-08-12T12:00:00Z')), true);    // תשעה באב אחרי חצות
// CORS רק לאתר; בלי Origin (האפליקציה) התשובה לא משתנה
const res = () => new Response('x', { headers: { 'content-type': 'text/plain' } });
assert.equal(cors(new Request('https://w/ping'), res()).headers.get('access-control-allow-origin'), null);
assert.equal(cors(new Request('https://w/ping', { headers: { origin: 'https://hakelim.com' } }), res()).headers.get('access-control-allow-origin'), 'https://hakelim.com');
assert.equal(cors(new Request('https://w/ping', { headers: { origin: 'https://evil.com' } }), res()).headers.get('access-control-allow-origin'), null);
// "עבר היום"
await go('done', { who: 'dev5', day: '2026-11-17' });
assert.equal((await go('is', { who: 'dev5', day: '2026-11-17' })).done, true);
assert.equal((await go('is', { who: 'dev5', day: '2026-11-18' })).done, false);
assert.equal((await go('is', { who: 'dev6', day: '2026-11-17' })).done, false);
console.log('ok – בדיקות האייפון עברו');
