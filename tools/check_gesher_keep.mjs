// בדיקת יחידה לחדר "קבוע" (keep) בשרת הגשר – בלי רשת: Room עם אחסון מזויף.
// הרצה: node tools/check_gesher_keep.mjs
import { Room } from './gesher-worker/gesher-worker.js';
let pass = 0, fail = 0;
const ok = (c, n) => { c ? pass++ : fail++; console.log((c ? '✓ ' : '✗ ') + n); };
function makeRoom(room, role) {
  const data = new Map([['room', room]]); let alarmAt = null; const closed = [];
  const ws = { deserializeAttachment: () => ({ role }), send() {}, close(c) { closed.push(c); } };
  const ctx = {
    storage: { get: async k => data.get(k), put: async (k, v) => { data.set(k, v); }, deleteAll: async () => data.clear(), setAlarm: async t => { alarmAt = t; } },
    getWebSockets: () => [ws],
  };
  return { r: new Room(ctx, {}), ws, data, closed, alarm: () => alarmAt };
}
const old = Date.now() - 91 * 24 * 3600e3;
const base = () => ({ at: old, used: old, sealed: true, hPc: 'a', hPhone: 'b', day: 0, n: 0 });

{ const t = makeRoom(base(), 'phone'); await t.r.alarm(); ok(!t.data.get('room') && t.closed.includes(4001), 'חדר רגיל בלי שימוש 91 יום – נמחק (כמו קודם)'); }
{ const t = makeRoom(base(), 'phone'); await t.r.webSocketMessage(t.ws, JSON.stringify({ t: 'keep', on: true }));
  ok(t.data.get('room').keep === true, 'keep מהטלפון המאומת נשמר');
  await t.r.alarm(); ok(!!t.data.get('room') && t.alarm() > Date.now(), 'חדר קבוע בלי שימוש 91 יום – לא נמחק, alarm הבא נקבע'); }
{ const t = makeRoom(base(), 'pc'); await t.r.webSocketMessage(t.ws, JSON.stringify({ t: 'keep', on: true }));
  await t.r.webSocketMessage(t.ws, JSON.stringify({ t: 'keep', on: false }));
  ok(t.data.get('room').keep === false, 'keep:false מהמחשב מבטל'); await t.r.alarm(); ok(!t.data.get('room'), 'אחרי ביטול – נמחק כרגיל'); }
{ const t = makeRoom(Object.assign(base(), { sealed: false, ph: 'x', at: Date.now(), used: Date.now() }), 'pair');
  await t.r.webSocketMessage(t.ws, JSON.stringify({ t: 'keep', on: true })); ok(!t.data.get('room').keep, 'keep מחיבור צימוד (לא מאומת) – נדחה'); }
console.log('\n' + (fail ? '✗' : '✓') + ' ' + pass + '/' + (pass + fail));
process.exit(fail ? 1 : 0);
