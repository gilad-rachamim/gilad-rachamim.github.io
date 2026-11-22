// בדיקות לשרת "מוצאים קבוצה" – מדמה Durable Object בזיכרון, בלי wrangler ובלי רשת.
import worker, { Groups, META } from './kvutzot-worker.js';
class Store {
  constructor() { this.m = new Map(); }
  async get(k) { return this.m.has(k) ? structuredClone(this.m.get(k)) : undefined; }
  async put(k, v) { if (typeof k === 'object') { for (const [a, b] of Object.entries(k)) this.m.set(a, structuredClone(b)); } else this.m.set(k, structuredClone(v)); }
  async delete(k) { (Array.isArray(k) ? k : [k]).forEach(x => this.m.delete(x)); }
  async list({ prefix = '', limit = 1000 } = {}) { return new Map([...this.m].filter(([k]) => k.startsWith(prefix)).sort().slice(0, limit)); }
}
const alerts = [];
const env = { ADMIN_KEY: 'adm', HUB_SECRET: 's', HUB: { fetch: async (u, o) => { alerts.push(JSON.parse(o.body).text); return new Response('{"ok":true}'); } } };
const ctx = { storage: new Store(), waitUntil: p => p };
const obj = new Groups(ctx, env);
env.GROUPS = { idFromName: () => 1, get: () => ({ fetch: (u, o) => obj.fetch(new Request(u, o)) }) };
let ip = '1.1.1.1';
async function call(path, data, headers = {}) {
  const r = await worker.fetch(new Request('https://w' + path, { method: data ? 'POST' : 'GET', body: data ? JSON.stringify(data) : undefined,
    headers: Object.assign({ 'CF-Connecting-IP': ip, Origin: 'https://hakelim.com' }, headers) }), env);
  const j = await r.json(); j._s = r.status; j._cors = r.headers.get('Access-Control-Allow-Origin'); return j;
}
let fails = 0, n = 0;
const ok = (c, m, x) => { n++; if (!c) { fails++; console.log('FAIL ' + m + (x !== undefined ? ' → ' + JSON.stringify(x) : '')); } };
const G = { name: 'הולכים בשכונה', desc: 'קבוצת הליכה בבוקר בירושלים, בקצב נוח לכולם.', interests: ['ספורט והליכה', 'קהילה ושכונה'], region: 'ירושלים והסביבה', ages: ['45–60', '60+'], tags: [], link: 'https://chat.whatsapp.com/AbCdEfGhIj1234567890', ok18: true };

ok((await call('/ping'))._s === 200, 'ping');
ok((await call('/meta')).interests.length === META.interests.length, 'meta');
ok((await call('/meta'))._cors === 'https://hakelim.com', 'cors hakelim');
ok((await call('/add', Object.assign({}, G, { link: 'https://evil.com/x' })))._s === 400, 'bad link rejected');
ok((await call('/add', Object.assign({}, G, { ok18: false })))._s === 400, 'must accept rules');
ok((await call('/add', Object.assign({}, G, { interests: ['לא קיים'] })))._s === 400, 'unknown interest rejected');
ok((await call('/add', Object.assign({}, G, { hp: 'x' }))).id === '0', 'honeypot');
const a = await call('/add', Object.assign({}, G, { desc: G.desc + ' טלפון 050-1234567 https://x.com' }));
ok(a._s === 200 && a.id && a.key, 'group added', a);
ok(alerts.length === 1 && alerts[0].includes('ממתינה'), 'alert on new group');
ok((await ctx.storage.get('cron:day')) === new Date().toISOString().slice(0, 10), 'daily cleanup runs on first visit (no cron trigger)');
ok((await call('/add', G))._s === 409, 'duplicate link rejected');
ok((await call('/groups')).items.length === 0, 'pending not public');
ok((await call('/link', { id: a.id }))._s === 404, 'no link while pending');
ok((await call('/admin/list'))._s === 403, 'admin needs key');
ok((await call('/admin/set', { id: a.id, st: 'live' }, { 'X-Admin-Key': 'nope' }))._s === 403, 'admin wrong key');
ok((await call('/admin/set', { id: a.id, st: 'live' }, { 'X-Admin-Key': 'adm' })).st === 'live', 'admin approve');
const pub = await call('/groups');
ok(pub.items.length === 1 && !('link' in pub.items[0]) && !('key' in pub.items[0]), 'public list without link/key', pub.items[0]);
ok(!/050|https/.test(pub.items[0].desc), 'phone/url stripped from desc', pub.items[0].desc);
ok((await call('/link', { id: a.id })).link === G.link, 'link after approval');
const adm = await call('/admin/list', null, { 'X-Admin-Key': 'adm' });
ok(adm.items.length === 1 && adm.items[0].key === undefined, 'admin list hides owner key hash');
// דיווחים: אותה רשת פעמיים = דיווח אחד; שתי רשתות = מוסתר
await call('/report', { id: a.id, why: 'פרסומות' });
await call('/report', { id: a.id, why: 'פרסומות' });
ok((await call('/groups')).items.length === 1, 'same network counted once');
ip = '2.2.2.2'; await call('/report', { id: a.id, why: 'לא מתאים' });
ok((await call('/groups')).items.length === 0, 'hidden after 2 reports');
ok(alerts.some(t => t.includes('הוסתרה')), 'alert on hide');
await call('/admin/set', { id: a.id, st: 'live' }, { 'X-Admin-Key': 'adm' });
ok((await call('/groups')).items.length === 1, 're-approved');
ok((await call('/remove', { id: a.id, key: 'wrong' }))._s === 403, 'remove wrong key');
// ביקוש
const W = { interest: 'צילום', region: 'הצפון', age: '60+', tag: '' };
for (let i = 0; i < 5; i++) { ip = '9.9.9.' + i; await call('/want', W); }
ip = '9.9.9.0'; ok((await call('/want', W)).dup, 'want once per network per day');
ok(alerts.some(t => t.includes('5 אנשים') && t.includes('צילום')), 'alert at 5 wants', alerts);
const before = alerts.length; ip = '9.9.9.77'; await call('/want', W);
ok(alerts.length === before, 'alert only once');
ok((await call('/want', { interest: 'x' }))._s === 400, 'want needs interest');
// מגבלת קישורים
ip = '5.5.5.5'; let last;
for (let i = 0; i < 26; i++) last = await call('/link', { id: a.id });
ok(last._s === 429, 'link rate limited');
ok((await call('/remove', { id: a.id, key: a.key })).ok, 'owner removes');
ok((await call('/groups')).items.length === 0, 'removed');
// מגבלת הוספה
ip = '6.6.6.6'; const st = [];
for (let i = 0; i < 5; i++) st.push((await call('/add', Object.assign({}, G, { link: 'https://chat.whatsapp.com/Zz' + i + 'CdEfGhIj12345678' })))._s);
ok(st.slice(0, 4).every(s => s === 200) && st[4] === 429, 'add rate limited', st);
ok((await call('/groups', null, { Origin: 'https://evil.com' }))._cors === null, 'no cors for other sites');
// שדרוגים 21.11: סגנון, "since", קישור שבור, החלפת קישור
ip = '7.7.7.7';
const b = await call('/add', Object.assign({}, G, { link: 'https://chat.whatsapp.com/Kk1CdEfGhIj12345678', kind: 'שיחה רגועה' }));
const bad = await call('/add', Object.assign({}, G, { link: 'https://chat.whatsapp.com/Kk2CdEfGhIj12345678', kind: 'מסיבה' }));
await call('/admin/set', { id: b.id, st: 'live' }, { 'X-Admin-Key': 'adm' });
await call('/admin/set', { id: bad.id, st: 'live' }, { 'X-Admin-Key': 'adm' });
let pl = (await call('/groups')).items;
const pb = pl.find(x => x.id === b.id);
ok(pb && pb.kind === 'שיחה רגועה' && /^\d{4}-\d\d-\d\d$/.test(pb.since), 'public has kind + since', pb);
ok(pl.find(x => x.id === bad.id).kind === '', 'unknown kind dropped');
ok((await call('/broken', { id: b.id })).ok, 'broken report ok');
await call('/broken', { id: b.id });
ok((await call('/groups')).items.some(x => x.id === b.id), 'broken: same network once');
ip = '7.7.7.8'; await call('/broken', { id: b.id });
ok(!(await call('/groups')).items.some(x => x.id === b.id), 'hidden after 2 broken');
ok(alerts.some(t => t.includes('🔗')), 'alert on broken hide');
ok((await call('/relink', { id: b.id, key: 'wrong', link: 'https://chat.whatsapp.com/Nn1CdEfGhIj12345678' }))._s === 403, 'relink wrong key');
ok((await call('/relink', { id: b.id, key: b.key, link: 'https://evil.com/x' }))._s === 400, 'relink bad link');
const rl = await call('/relink', { id: b.id, key: b.key, link: 'https://chat.whatsapp.com/Nn1CdEfGhIj12345678' });
ok(rl.ok && rl.st === 'live', 'relink brings back', rl);
ok((await call('/link', { id: b.id })).link === 'https://chat.whatsapp.com/Nn1CdEfGhIj12345678', 'new link served');
ok(alerts.some(t => t.includes('🔁')), 'alert on relink');
// דיווח רגיל מסתיר – החלפת קישור לא מחזירה
ip = '8.8.8.1'; await call('/report', { id: b.id, why: 'x' }); ip = '8.8.8.2'; await call('/report', { id: b.id, why: 'x' });
const rl2 = await call('/relink', { id: b.id, key: b.key, link: 'https://chat.whatsapp.com/Nn2CdEfGhIj12345678' });
ok(rl2.ok && rl2.st === 'hidden', 'relink does not undo abuse hide', rl2);
// מסלול שותפים 22.11: אימות ארגון, סטטיסטיקה שבועית למנהל, סיכום שבועי לגילעד
ip = '3.3.3.1';
const c = await call('/add', Object.assign({}, G, { link: 'https://chat.whatsapp.com/Pp1CdEfGhIj12345678' }));
await call('/admin/set', { id: c.id, st: 'live' }, { 'X-Admin-Key': 'adm' });
ok((await call('/admin/verify', { id: c.id, org: 'עמותה' }))._s === 403, 'verify needs admin');
ok((await call('/admin/verify', { id: c.id, org: 'עמותה', url: 'javascript:x' }, { 'X-Admin-Key': 'adm' }))._s === 400, 'verify bad url');
const v = await call('/admin/verify', { id: c.id, org: 'עמותת <b>הולכים</b>', url: 'https://example.org' }, { 'X-Admin-Key': 'adm' });
ok(v.ok && v.ver === 'עמותת b הולכים /b' && v.verUrl === 'https://example.org', 'verify cleans org', v);
let pc = (await call('/groups')).items.find(x => x.id === c.id);
ok(pc.ver && pc.verUrl === 'https://example.org', 'public has ver', pc);
ok((await call('/groups')).items.filter(x => x.id !== c.id).every(x => x.ver === ''), 'others not verified');
ok((await call('/stats', { id: c.id, key: 'wrong' }))._s === 403, 'stats wrong key');
let sc = await call('/stats', { id: c.id, key: c.key });
ok(sc.week === 0 && sc.total === 0 && sc.weeks.length === 8, 'stats empty', sc);
await call('/link', { id: c.id }); await call('/link', { id: c.id });   // אותה רשת = פעם אחת
ip = '3.3.3.2'; await call('/link', { id: c.id });
ip = '3.3.3.3'; await call('/link', { id: c.id });
sc = await call('/stats', { id: c.id, key: c.key });
ok(sc.week === 3 && sc.total === 3 && sc.weeks[7].n === 3 && sc.name === G.name, 'stats counts unique networks', sc);
ok(!('link' in sc) && !('key' in sc), 'stats hides link/key');
const al = (await call('/admin/list', null, { 'X-Admin-Key': 'adm' })).items.find(x => x.id === c.id);
ok(al.wk === 3 && al.pwk === 0, 'admin list has week counts', al);
const unv = await call('/admin/verify', { id: c.id, org: '' }, { 'X-Admin-Key': 'adm' });
ok(unv.ok && unv.ver === '' && unv.verUrl === '', 'unverify');
const { week } = await import('./kvutzot-worker.js');
ok(week(Date.parse('2026-11-22T10:00Z')) === '2026-11-22' && week(Date.parse('2026-11-28T23:00Z')) === '2026-11-22' && week(Date.parse('2026-11-21T10:00Z')) === '2026-11-15', 'week starts Sunday');
// סיכום שבועי: נשלח פעם אחת לשבוע
const nAl = alerts.length, wk1 = await obj.weekly(), wk2 = await obj.weekly();
ok(wk1.groups >= 1 && wk2.skipped && alerts.length === nAl + 1 && alerts[nAl].includes('📊'), 'weekly summary once', [wk1, wk2, alerts[nAl]]);
ok((await call('/remove', { id: c.id, key: c.key })).ok && !(await ctx.storage.get('c:' + c.id)), 'remove deletes counts');
console.log((fails ? 'FAIL' : 'PASS') + ' ' + (n - fails) + '/' + n);
process.exit(fails ? 1 : 0);
