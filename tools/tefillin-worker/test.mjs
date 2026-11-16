// בדיקה בלי רשת: ההחלטה, הכללים והאתגרים.
import assert from 'node:assert/strict';
import { verdict, rules, why, GESTURES, Quota } from './tefillin-worker.js';
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
console.log('ok – כל הבדיקות עברו');
