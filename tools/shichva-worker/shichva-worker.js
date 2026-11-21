// פורטל שכבה – ההכנה להכתרה (hakelim.com/kelim/shichva/). Cloudflare Worker + D1 (+ R2 לאלבום כשיופעל).
// פרטיות קטינים – הכלל העליון:
//  * מרחב שכבה נפתח רק עם קוד. אין מייל, טלפון או תמונה בנתונים – שם וכיתה בלבד.
//  * קבצים רק ב-R2 (binding FILES) ומוגשים רק דרך השרת עם אסימון של חבר בשכבה. בלי R2 – האלבום כבוי (לא ממציאים תחליף).
//  * לבינה המלאכותית נשלח טקסט בלבד. אף תמונה או פנים לא יוצאות לשירות חיצוני.
// "הגבאי" – הדמות המייעצת: צוחקים על תופעות ולא על אנשים, אם יש ספק אין ספק, כל קטע נגמר בשורת כבוד,
// לכל טקסט רמזור כבוד (ירוק/צהוב/אדום + סיבה). לא נקרא על שם אף רב ולא מחקה איש צוות.
// בינה: Gemini כשיש סוד GEMINI_KEYS (מפתח נפרד לשרת הזה), אחרת Workers AI (חינם, בלי מפתח).

import { handle as kioskHandle, demoRows as kioskDemo } from './kiosk.js';

const ORIGINS = ['https://hakelim.com', 'https://www.hakelim.com', 'https://gilad-rachamim.github.io'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const CF_MODEL = '@cf/openai/gpt-oss-120b';
const AI_PER_GRADE = 600, AI_PER_DEMO = 120, AI_DAY_CAP = 3000, JOIN_FAILS = 30;
const ROLES = ['rakaz', 'gizbar', 'chaver', 'melave'];
const ROLE_HE = { rakaz: 'רכז', gizbar: 'גזבר', chaver: 'חבר', melave: 'מלווה מהצוות' };
const STATES = ['draft', 'liked', 'head', 'melave', 'approved', 'replace'];
const KINDS = ['text', 'meme', 'trailer', 'video', 'idea', 'gemara', 'torah', 'shir'];
const FOLDERS = ["ט'", "י'", 'י"א', 'י"ב', 'טיולים ושבתות', 'צוות', 'מצחיקים', 'לסרטון'];
const DEMO_ID = 'demo', DEMO_JOIN = 'הדגמה';

// משימות שנזרעות בפתיחת שכבה: [כותרת, ימים לפני ההכתרה (שלילי = אחרי)]
export const SEED_TASKS = [
  ['שם מחזור וסלוגן', 100], ['חלוקה לוועדות', 95], ['איסוף תמונות מט\' עד י"ב', 60],
  ['אישור הנהלה וחתימות', 45], ['הזמנת אולם', 40], ['הגברה ותאורה', 21], ['מקרן ומסך', 21],
  ['תפאורה ותלבושות', 14], ['חוברת הערב', 14], ['הזמנות להורים ולצוות', 10], ['צלם לערב', 7],
  ['חזרות', 5], ['ניקיון אחרי הערב', 0], ['תודות לצוות ולמי שעזר', -2]
];
export const SUGGESTED_COMMITTEES = ['תסריט', 'סרטונים', 'ממים', 'במה והגברה', 'כספים', 'ספונסרים', 'שבת זכור', 'דף גמרא'];

class Bad extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
const bad = (m, s) => { throw new Bad(m, s); };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: h['Access-Control-Allow-Origin'] ? 204 : 403, headers: h });
    try {
      const res = await route(req, env, origin);
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
      return out;
    } catch (e) {
      const status = e instanceof Bad ? e.status : 500;
      if (status === 500) console.log('error', e && e.stack || e);
      return new Response(JSON.stringify({ error: e instanceof Bad ? e.message : 'server' }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...h } });
    }
  },
  async scheduled(ev, env) { await seedDemo(env); }
};

async function route(req, env, origin) {
  const url = new URL(req.url), p = url.pathname, m = req.method;
  if (p === '/ping') return json({ ok: true, storage: !!env.FILES, ai: env.GEMINI_KEYS ? 'gemini' : (env.AI ? 'workers-ai' : 'off') });
  if (p === '/' && m === 'GET') return json({ name: 'פורטל שכבה – הכנה להכתרה', page: 'https://hakelim.com/kelim/shichva/' });
  if (!cors(origin)['Access-Control-Allow-Origin']) bad('origin', 403);
  if (p === '/grade/create' && m === 'POST') return createGrade(req, env);
  if (p === '/join' && m === 'POST') return join(req, env);
  const me = await auth(req, env);
  const g = await env.DB.prepare('SELECT * FROM grades WHERE id=?').bind(me.grade_id).first();
  if (!g) bad('no grade', 401);
  if (p === '/state' && m === 'GET') return state(env, me, g);
  if (p === '/album/file' && m === 'GET') return albumFile(url, env, me, g);
  if (p.startsWith('/kiosk/')) return kioskHandle(p, m, req, env, me, g, { bad, json, clean, rid, today, date });
  if (m !== 'POST') bad('not found', 404);
  if (p === '/album/upload') return albumUpload(req, env, me, g);
  const b = await body(req);
  switch (p) {
    case '/grade/update': return gradeUpdate(b, env, me, g);
    case '/member/role': return memberRole(b, env, me, g);
    case '/member/remove': return memberRemove(b, env, me, g);
    case '/committee/create': return committeeCreate(b, env, me, g);
    case '/committee/join': return committeeJoin(b, env, me, g, true);
    case '/committee/leave': return committeeJoin(b, env, me, g, false);
    case '/committee/head': return committeeHead(b, env, me, g);
    case '/committee/remove': return committeeRemove(b, env, me, g);
    case '/product/create': return productCreate(b, env, me, g);
    case '/product/edit': return productEdit(b, env, me, g);
    case '/product/vote': return productVote(b, env, me, g);
    case '/product/like': return productLike(b, env, me, g);
    case '/product/send': return productSend(b, env, me, g);
    case '/product/head': return productHead(b, env, me, g);
    case '/product/melave': return productMelave(b, env, me, g);
    case '/product/comment': return productComment(b, env, me, g);
    case '/product/delete': return productDelete(b, env, me, g);
    case '/task/create': return taskCreate(b, env, me, g);
    case '/task/update': return taskUpdate(b, env, me, g);
    case '/task/delete': return taskDelete(b, env, me, g);
    case '/task/zachor': return taskZachor(b, env, me, g);
    case '/album/delete': return albumDelete(b, env, me, g);
    case '/ai': return ai(b, env, me, g);
  }
  bad('not found', 404);
}

/* ---------- שכבה, הצטרפות, אסימון ---------- */
async function createGrade(req, env) {
  const b = await body(req);
  const name = clean(b.name, 40) || bad('name');
  const rakaz = clean(b.rakaz_name, 30) || bad('rakaz_name');
  const hachtara = date(b.hachtara) || bad('hachtara');
  const now = Date.now(), id = rid(10);
  const codes = { join: await freeCode(env, 6), admin: await freeCode(env, 8), melave: await freeCode(env, 7) };
  const tok = rid(28), mid = rid(10);
  const st = [
    env.DB.prepare('INSERT INTO grades (id,name,slogan,hachtara,join_code,admin_code,melave_code,melave_name,demo,created) VALUES (?,?,?,?,?,?,?,?,0,?)')
      .bind(id, name, '', hachtara, codes.join, codes.admin, codes.melave, clean(b.melave_name, 40) || 'ראש הישיבה', now),
    env.DB.prepare('INSERT INTO members (id,grade_id,name,klass,role,token,created) VALUES (?,?,?,?,?,?,?)').bind(mid, id, rakaz, clean(b.klass, 10), 'rakaz', tok, now),
    ...seedTasks(env, id, hachtara, now)
  ];
  await env.DB.batch(st);
  return json({ token: tok, grade: id });
}

function seedTasks(env, gid, hachtara, now) {
  return SEED_TASKS.map(([t, d], i) => env.DB.prepare('INSERT INTO tasks (id,grade_id,title,due,done,owner,committee_id,sort,created) VALUES (?,?,?,?,0,?,?,?,?)')
    .bind(rid(10), gid, t, shift(hachtara, -d), '', '', i, now));
}

async function join(req, env) {
  const b = await body(req);
  const code = String(b.code || '').replace(/\s|-/g, '');
  const name = clean(b.name, 30) || bad('name');
  const ipk = 'fail:' + await hash((req.headers.get('cf-connecting-ip') || 'x') + '|' + today());
  const fails = await env.DB.prepare('SELECT n FROM ai_count WHERE grade_id=? AND day=?').bind(ipk, today()).first();
  if (fails && fails.n >= JOIN_FAILS) bad('too_many', 429);
  let g = null, role = 'chaver';
  if (code === DEMO_JOIN || code.toLowerCase() === 'demo') {
    g = await env.DB.prepare('SELECT * FROM grades WHERE id=?').bind(DEMO_ID).first();
    if (!g) { await seedDemo(env); g = await env.DB.prepare('SELECT * FROM grades WHERE id=?').bind(DEMO_ID).first(); }
    role = ['rakaz', 'chaver', 'melave', 'gizbar'].includes(b.role) ? b.role : 'chaver';
  } else if (/^\d{6,8}$/.test(code)) {
    g = await env.DB.prepare('SELECT * FROM grades WHERE join_code=? OR admin_code=? OR melave_code=?').bind(code, code, code).first();
    if (g) role = g.admin_code === code ? 'rakaz' : g.melave_code === code ? 'melave' : 'chaver';
  }
  if (!g) {
    await env.DB.prepare('INSERT INTO ai_count (grade_id,day,n) VALUES (?,?,1) ON CONFLICT(grade_id,day) DO UPDATE SET n=n+1').bind(ipk, today()).run();
    bad('code', 404);
  }
  const tok = rid(28), mid = rid(10);
  await env.DB.prepare('INSERT INTO members (id,grade_id,name,klass,role,token,created) VALUES (?,?,?,?,?,?,?)').bind(mid, g.id, name, clean(b.klass, 10), role, tok, Date.now()).run();
  // קישור הצטרפות אישי לוועדה: #j=קוד&v=ועדה
  if (b.committee && role !== 'melave') {
    const c = await env.DB.prepare('SELECT id FROM committees WHERE id=? AND grade_id=?').bind(String(b.committee), g.id).first();
    if (c) await env.DB.prepare('INSERT OR IGNORE INTO cmembers (committee_id,member_id) VALUES (?,?)').bind(c.id, mid).run();
  }
  return json({ token: tok, grade: g.id, role });
}

async function auth(req, env) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!/^[a-z0-9]{20,40}$/.test(t)) bad('auth', 401);
  const me = await env.DB.prepare('SELECT * FROM members WHERE token=?').bind(t).first();
  if (!me) bad('auth', 401);
  return me;
}

async function state(env, me, g) {
  const isMelave = me.role === 'melave';
  const [members, committees, cm, tasks, products, votes, photos] = await Promise.all([
    env.DB.prepare('SELECT id,name,klass,role FROM members WHERE grade_id=? ORDER BY created').bind(g.id).all(),
    env.DB.prepare('SELECT id,name,about,head_id FROM committees WHERE grade_id=? ORDER BY created').bind(g.id).all(),
    env.DB.prepare('SELECT cm.committee_id c, cm.member_id m FROM cmembers cm JOIN committees c ON c.id=cm.committee_id WHERE c.grade_id=?').bind(g.id).all(),
    env.DB.prepare('SELECT id,title,due,done,owner,committee_id FROM tasks WHERE grade_id=? ORDER BY due, sort').bind(g.id).all(),
    env.DB.prepare('SELECT * FROM products WHERE grade_id=? ORDER BY updated DESC LIMIT 400').bind(g.id).all(),
    env.DB.prepare('SELECT v.product_id p, v.member_id m FROM votes v JOIN products p ON p.id=v.product_id WHERE p.grade_id=?').bind(g.id).all(),
    env.FILES && !isMelave ? env.DB.prepare('SELECT id,folder,year,event,by_name,w,h,has_orig,created FROM photos WHERE grade_id=? ORDER BY created DESC LIMIT 2000').bind(g.id).all() : { results: [] }
  ]);
  const myC = new Set(cm.results.filter(x => x.m === me.id).map(x => x.c));
  let prods = products.results;
  if (isMelave) prods = prods.filter(x => ['melave', 'approved', 'replace'].includes(x.state));
  else if (me.role !== 'rakaz') prods = prods.filter(x => myC.has(x.committee_id) || x.author_id === me.id || x.state === 'approved');
  const ids = prods.map(x => x.id);
  let hist = [];
  if (ids.length) {
    const rows = await env.DB.prepare(`SELECT h.product_id p,h.who,h.action,h.note,h.ts FROM history h JOIN products p ON p.id=h.product_id WHERE p.grade_id=? ORDER BY h.id`).bind(g.id).all();
    const keep = new Set(ids); hist = rows.results.filter(r => keep.has(r.p));
  }
  const vByP = {};
  for (const v of votes.results) (vByP[v.p] = vByP[v.p] || []).push(v.m);
  const grade = { id: g.id, name: g.name, slogan: g.slogan, hachtara: g.hachtara, melave_name: g.melave_name, demo: !!g.demo };
  if (me.role === 'rakaz' && !g.demo) Object.assign(grade, { join_code: g.join_code, admin_code: g.admin_code, melave_code: g.melave_code });
  if (!isMelave && !g.demo) grade.join_code = g.join_code;
  if (g.demo) Object.assign(grade, { join_code: DEMO_JOIN });
  const done = tasks.results.filter(t => t.done).length;
  return json({
    me: { id: me.id, name: me.name, klass: me.klass, role: me.role },
    grade, storage: !!env.FILES, folders: FOLDERS, suggested: SUGGESTED_COMMITTEES,
    progress: tasks.results.length ? Math.round(100 * done / tasks.results.length) : 0,
    members: isMelave ? [] : members.results,
    committees: committees.results.map(c => ({ ...c, members: isMelave ? [] : cm.results.filter(x => x.c === c.id).map(x => x.m) })),
    tasks: isMelave ? [] : tasks.results,
    products: prods.map(x => ({ ...x, data: safeJson(x.data), votes: isMelave ? [] : (vByP[x.id] || []), history: hist.filter(r => r.p === x.id) })),
    photos: photos.results
  });
}

async function gradeUpdate(b, env, me, g) {
  rakaz(me);
  const name = clean(b.name, 40) || g.name, slogan = b.slogan === undefined ? g.slogan : clean(b.slogan, 80);
  const hachtara = b.hachtara ? (date(b.hachtara) || bad('hachtara')) : g.hachtara;
  const st = [env.DB.prepare('UPDATE grades SET name=?, slogan=?, hachtara=?, melave_name=? WHERE id=?').bind(name, slogan, hachtara, clean(b.melave_name, 40) || g.melave_name, g.id)];
  if (hachtara !== g.hachtara) {
    // כל תאריכי היעד זזים יחד עם תאריך ההכתרה
    const delta = Math.round((Date.parse(hachtara) - Date.parse(g.hachtara)) / 864e5);
    const ts = await env.DB.prepare("SELECT id,due FROM tasks WHERE grade_id=? AND due<>''").bind(g.id).all();
    for (const t of ts.results) st.push(env.DB.prepare('UPDATE tasks SET due=? WHERE id=?').bind(shift(t.due, delta), t.id));
  }
  await env.DB.batch(st);
  return json({ ok: true });
}

async function memberRole(b, env, me, g) {
  rakaz(me);
  const role = ROLES.includes(b.role) ? b.role : bad('role');
  const r = await env.DB.prepare('UPDATE members SET role=? WHERE id=? AND grade_id=?').bind(role, String(b.id), g.id).run();
  if (!r.meta.changes) bad('member', 404);
  return json({ ok: true });
}
async function memberRemove(b, env, me, g) {
  if (String(b.id) !== me.id) rakaz(me);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM members WHERE id=? AND grade_id=?').bind(String(b.id), g.id),
    env.DB.prepare('DELETE FROM cmembers WHERE member_id=?').bind(String(b.id))
  ]);
  return json({ ok: true });
}

/* ---------- ועדות ---------- */
async function committeeCreate(b, env, me, g) {
  rakaz(me);
  const name = clean(b.name, 30) || bad('name');
  const id = rid(8);
  await env.DB.prepare('INSERT INTO committees (id,grade_id,name,about,head_id,created) VALUES (?,?,?,?,?,?)').bind(id, g.id, name, clean(b.about, 200), '', Date.now()).run();
  return json({ ok: true, id });
}
async function committeeJoin(b, env, me, g, on) {
  notMelave(me);
  const c = await committee(env, g, b.id);
  const who = b.member && me.role === 'rakaz' ? String(b.member) : me.id;
  if (on) await env.DB.prepare('INSERT OR IGNORE INTO cmembers (committee_id,member_id) VALUES (?,?)').bind(c.id, who).run();
  else await env.DB.prepare('DELETE FROM cmembers WHERE committee_id=? AND member_id=?').bind(c.id, who).run();
  return json({ ok: true });
}
async function committeeHead(b, env, me, g) {
  rakaz(me);
  const c = await committee(env, g, b.id);
  const mem = await env.DB.prepare('SELECT id FROM members WHERE id=? AND grade_id=?').bind(String(b.member || ''), g.id).first();
  await env.DB.batch([
    env.DB.prepare('UPDATE committees SET head_id=? WHERE id=?').bind(mem ? mem.id : '', c.id),
    ...(mem ? [env.DB.prepare('INSERT OR IGNORE INTO cmembers (committee_id,member_id) VALUES (?,?)').bind(c.id, mem.id)] : [])
  ]);
  return json({ ok: true });
}
async function committeeRemove(b, env, me, g) {
  rakaz(me);
  const c = await committee(env, g, b.id);
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM products WHERE committee_id=?').bind(c.id).first();
  if (n.n) bad('has_products');
  await env.DB.batch([env.DB.prepare('DELETE FROM committees WHERE id=?').bind(c.id), env.DB.prepare('DELETE FROM cmembers WHERE committee_id=?').bind(c.id)]);
  return json({ ok: true });
}

/* ---------- מוצרים ומסלול האישור ----------
   טיוטה בוועדה (draft) -> אהבנו (liked: רוב פשוט בהצבעה או ראש הוועדה) -> אצל האחראי הראשי (head)
   -> אצל המלווה מהצוות (melave) -> אושר (approved) / להחליף (replace, חוזר לוועדה).
   האחראי הראשי (הרכז): "להעלות למלווה" או "להחזיר לוועדה לתיקונים" עם הערה. המלווה רואה רק מה שהועלה אליו.
   מם על איש צוות: אחרי "אהבנו" עובר אוטומטית למלווה. */
async function productCreate(b, env, me, g) {
  notMelave(me);
  const c = await committee(env, g, b.committee_id);
  await member(env, c, me);
  const kind = KINDS.includes(b.kind) ? b.kind : 'text';
  const title = clean(b.title, 80) || bad('title');
  const text = clean(b.body, 4000, true);
  const data = JSON.stringify(b.data && typeof b.data === 'object' ? b.data : {}).slice(0, 12000);
  const lt = await lightFor(env, g, title + '\n' + text + '\n' + dataText(b.data), b.light);
  const id = rid(10), now = Date.now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO products (id,grade_id,committee_id,author_id,kind,title,body,data,about_staff,light,light_why,state,file_id,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, g.id, c.id, me.id, kind, title, text, data, b.about_staff ? 1 : 0, lt.light, lt.why, 'draft', await fileOk(env, g, b.file_id), now, now),
    hist(env, id, me, 'נוצר כטיוטה בוועדה', '')
  ]);
  return json({ ok: true, id, light: lt });
}
async function productEdit(b, env, me, g) {
  const p = await product(env, g, b.id);
  const c = await committee(env, g, p.committee_id);
  if (p.author_id !== me.id && c.head_id !== me.id && me.role !== 'rakaz') bad('forbidden', 403);
  if (!['draft', 'replace'].includes(p.state)) bad('state');
  const title = clean(b.title, 80) || p.title, text = b.body === undefined ? p.body : clean(b.body, 4000, true);
  const data = b.data && typeof b.data === 'object' ? JSON.stringify(b.data).slice(0, 12000) : p.data;
  const lt = await lightFor(env, g, title + '\n' + text + '\n' + dataText(safeJson(data)), b.light);
  await env.DB.batch([
    env.DB.prepare("UPDATE products SET title=?, body=?, data=?, light=?, light_why=?, about_staff=?, state='draft', updated=? WHERE id=?")
      .bind(title, text, data, lt.light, lt.why, b.about_staff === undefined ? p.about_staff : (b.about_staff ? 1 : 0), Date.now(), p.id),
    env.DB.prepare('DELETE FROM votes WHERE product_id=?').bind(p.id),
    hist(env, p.id, me, 'עודכן – חזר לטיוטה בוועדה', clean(b.note, 300))
  ]);
  return json({ ok: true, light: lt });
}
async function productVote(b, env, me, g) {
  const p = await product(env, g, b.id);
  if (p.state !== 'draft') bad('state');
  const c = await committee(env, g, p.committee_id);
  await member(env, c, me);
  const had = await env.DB.prepare('SELECT 1 FROM votes WHERE product_id=? AND member_id=?').bind(p.id, me.id).first();
  if (had) await env.DB.prepare('DELETE FROM votes WHERE product_id=? AND member_id=?').bind(p.id, me.id).run();
  else await env.DB.prepare('INSERT INTO votes (product_id,member_id) VALUES (?,?)').bind(p.id, me.id).run();
  const [nv, nm] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) n FROM votes WHERE product_id=?').bind(p.id).first(),
    env.DB.prepare('SELECT COUNT(*) n FROM cmembers WHERE committee_id=?').bind(c.id).first()
  ]);
  let liked = false;
  if (!had && nm.n > 0 && nv.n * 2 > nm.n) { await toLiked(env, g, p, me, `רוב בוועדה (${nv.n} מתוך ${nm.n})`); liked = true; }
  return json({ ok: true, votes: nv.n, of: nm.n, liked });
}
async function productLike(b, env, me, g) {
  const p = await product(env, g, b.id);
  if (p.state !== 'draft') bad('state');
  const c = await committee(env, g, p.committee_id);
  if (c.head_id !== me.id && me.role !== 'rakaz') bad('forbidden', 403);
  await toLiked(env, g, p, me, 'ראש הוועדה');
  return json({ ok: true });
}
async function toLiked(env, g, p, me, why) {
  const st = [env.DB.prepare("UPDATE products SET state='liked', updated=? WHERE id=?").bind(Date.now(), p.id), hist(env, p.id, me, 'אהבנו', why)];
  if (p.about_staff) st.push(
    env.DB.prepare("UPDATE products SET state='melave', updated=? WHERE id=?").bind(Date.now() + 1, p.id),
    env.DB.prepare('INSERT INTO history (product_id,member_id,who,action,note,ts) VALUES (?,?,?,?,?,?)').bind(p.id, me.id, 'המערכת', 'עבר אוטומטית למלווה', 'מוצר על איש צוות – תמיד עובר לאישור המלווה', Date.now() + 1)
  );
  await env.DB.batch(st);
}
async function productSend(b, env, me, g) {
  // מ"אהבנו" אל האחראי הראשי – ראש הוועדה או הרכז
  const p = await product(env, g, b.id);
  if (p.state !== 'liked') bad('state');
  const c = await committee(env, g, p.committee_id);
  if (c.head_id !== me.id && me.role !== 'rakaz') bad('forbidden', 403);
  await env.DB.batch([env.DB.prepare("UPDATE products SET state='head', updated=? WHERE id=?").bind(Date.now(), p.id), hist(env, p.id, me, 'נשלח לאחראי הראשי', clean(b.note, 300))]);
  return json({ ok: true });
}
async function productHead(b, env, me, g) {
  rakaz(me);
  const p = await product(env, g, b.id);
  if (p.state !== 'head') bad('state');
  const note = clean(b.note, 300);
  if (b.action === 'up') {
    await env.DB.batch([env.DB.prepare("UPDATE products SET state='melave', updated=? WHERE id=?").bind(Date.now(), p.id), hist(env, p.id, me, 'הועלה למלווה', note)]);
  } else if (b.action === 'back') {
    if (!note) bad('note');
    await env.DB.batch([env.DB.prepare("UPDATE products SET state='draft', updated=? WHERE id=?").bind(Date.now(), p.id), env.DB.prepare('DELETE FROM votes WHERE product_id=?').bind(p.id), hist(env, p.id, me, 'הוחזר לוועדה לתיקונים', note)]);
  } else bad('action');
  return json({ ok: true });
}
async function productMelave(b, env, me, g) {
  if (me.role !== 'melave') bad('forbidden', 403);
  const p = await product(env, g, b.id);
  if (p.state !== 'melave') bad('state');
  const note = clean(b.note, 300);
  if (b.action === 'ok') await env.DB.batch([env.DB.prepare("UPDATE products SET state='approved', updated=? WHERE id=?").bind(Date.now(), p.id), hist(env, p.id, me, 'אושר', note)]);
  else if (b.action === 'replace') {
    if (!note) bad('note');
    await env.DB.batch([env.DB.prepare("UPDATE products SET state='replace', updated=? WHERE id=?").bind(Date.now(), p.id), env.DB.prepare('DELETE FROM votes WHERE product_id=?').bind(p.id), hist(env, p.id, me, 'להחליף', note)]);
  } else bad('action');
  return json({ ok: true });
}
async function productComment(b, env, me, g) {
  const p = await product(env, g, b.id);
  if (me.role === 'melave' && !['melave', 'approved', 'replace'].includes(p.state)) bad('forbidden', 403);
  if (me.role !== 'melave' && me.role !== 'rakaz') await member(env, await committee(env, g, p.committee_id), me);
  const note = clean(b.note, 500) || bad('note');
  await hist(env, p.id, me, 'הערה', note).run();
  return json({ ok: true });
}
async function productDelete(b, env, me, g) {
  const p = await product(env, g, b.id);
  if (!(me.role === 'rakaz' || (p.author_id === me.id && p.state === 'draft'))) bad('forbidden', 403);
  await env.DB.batch(['products WHERE id', 'votes WHERE product_id', 'history WHERE product_id'].map(t => env.DB.prepare(`DELETE FROM ${t}=?`).bind(p.id)));
  return json({ ok: true });
}

/* ---------- משימות ---------- */
async function taskCreate(b, env, me, g) {
  notMelave(me);
  const id = rid(10);
  await env.DB.prepare('INSERT INTO tasks (id,grade_id,title,due,done,owner,committee_id,sort,created) VALUES (?,?,?,?,0,?,?,99,?)')
    .bind(id, g.id, clean(b.title, 80) || bad('title'), date(b.due) || '', clean(b.owner, 30), await cid(env, g, b.committee_id), Date.now()).run();
  return json({ ok: true, id });
}
async function taskUpdate(b, env, me, g) {
  notMelave(me);
  const t = await env.DB.prepare('SELECT * FROM tasks WHERE id=? AND grade_id=?').bind(String(b.id), g.id).first() || bad('task', 404);
  await env.DB.prepare('UPDATE tasks SET title=?, due=?, done=?, owner=?, committee_id=? WHERE id=?').bind(
    b.title !== undefined ? (clean(b.title, 80) || t.title) : t.title,
    b.due !== undefined ? (date(b.due) || '') : t.due,
    b.done !== undefined ? (b.done ? 1 : 0) : t.done,
    b.owner !== undefined ? clean(b.owner, 30) : t.owner,
    b.committee_id !== undefined ? await cid(env, g, b.committee_id) : t.committee_id, t.id).run();
  return json({ ok: true });
}
/* ---------- משימות שבת זכור: נוספות פעם אחת, ליעד של השבת שלפני ההכתרה ---------- */
const ZACHOR_TASKS = [
  ['שבת זכור – מי מתפלל ומי קורא בתורה', 14], ['שבת זכור – סעודות ואוכל', 10], ['שבת זכור – תוכנית עונג שבת', 10],
  ['שבת זכור – דברי תורה ורבני פורים', 12], ['שבת זכור – דף גמרא להדפסה', 7], ['שבת זכור – שירון ושירים', 7],
  ['שבת זכור – קישוט האולם', 3], ['שבת זכור – מודעות וסרטון', 9], ['שבת זכור – אישור סופי של כל התכנים מול המלווה', 5]
];
async function taskZachor(b, env, me, g) {
  if (me.role !== 'rakaz') bad('forbidden', 403);
  const have = await env.DB.prepare("SELECT COUNT(*) n FROM tasks WHERE grade_id=? AND title LIKE 'שבת זכור –%'").bind(g.id).first();
  if (have.n) return json({ ok: true, added: 0 });
  let sat = date(b.shabbat) || '';
  if (!sat) { sat = g.hachtara; for (let i = 0; i < 7; i++) { if (new Date(sat + 'T12:00:00Z').getUTCDay() === 6) break; sat = shift(sat, -1); } }
  const now = Date.now();
  await env.DB.batch(ZACHOR_TASKS.map(([t, d], i) => env.DB.prepare('INSERT INTO tasks (id,grade_id,title,due,done,owner,committee_id,sort,created) VALUES (?,?,?,?,0,?,?,?,?)')
    .bind(rid(10), g.id, t, shift(sat, -d), '', '', 40 + i, now)));
  return json({ ok: true, added: ZACHOR_TASKS.length, shabbat: sat });
}
async function taskDelete(b, env, me, g) {
  rakaz(me);
  await env.DB.prepare('DELETE FROM tasks WHERE id=? AND grade_id=?').bind(String(b.id), g.id).run();
  return json({ ok: true });
}

/* ---------- אלבום (R2 בלבד) ---------- */
async function albumUpload(req, env, me, g) {
  notMelave(me);
  if (!env.FILES) bad('storage_off', 503);
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM photos WHERE grade_id=?').bind(g.id).first();
  if (n.n >= (g.demo ? 60 : 3000)) bad('album_full');
  const f = await req.formData();
  const thumb = f.get('thumb'), orig = f.get('orig');
  if (!thumb || typeof thumb === 'string' || thumb.size > 900e3) bad('thumb');
  if (orig && typeof orig !== 'string' && orig.size > (g.demo ? 0 : 15e6)) bad('orig_big');
  const folder = FOLDERS.includes(f.get('folder')) ? f.get('folder') : 'מצחיקים';
  const id = rid(12), base = `g/${g.id}/${id}/`;
  await env.FILES.put(base + 't', thumb.stream(), { httpMetadata: { contentType: thumb.type || 'image/jpeg' } });
  const hasOrig = orig && typeof orig !== 'string' && orig.size > 0 && !g.demo;
  if (hasOrig) await env.FILES.put(base + 'o', orig.stream(), { httpMetadata: { contentType: orig.type || 'image/jpeg' } });
  await env.DB.prepare('INSERT INTO photos (id,grade_id,folder,year,event,by_id,by_name,w,h,has_orig,created) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, g.id, folder, clean(f.get('year'), 10), clean(f.get('event'), 40), me.id, me.name, +f.get('w') || 0, +f.get('h') || 0, hasOrig ? 1 : 0, Date.now()).run();
  return json({ ok: true, id });
}
async function albumFile(url, env, me, g) {
  if (!env.FILES) bad('storage_off', 503);
  const id = String(url.searchParams.get('id') || '');
  const ph = await env.DB.prepare('SELECT * FROM photos WHERE id=? AND grade_id=?').bind(id, g.id).first() || bad('photo', 404);
  if (me.role === 'melave') {
    // המלווה רואה רק קבצים של מוצרים שהועלו אליו
    const ok = await env.DB.prepare("SELECT 1 FROM products WHERE grade_id=? AND file_id=? AND state IN ('melave','approved','replace')").bind(g.id, id).first();
    if (!ok) bad('forbidden', 403);
  }
  const key = `g/${g.id}/${id}/` + (url.searchParams.get('s') === 'o' && ph.has_orig ? 'o' : 't');
  const obj = await env.FILES.get(key) || bad('photo', 404);
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
}
async function albumDelete(b, env, me, g) {
  if (!env.FILES) bad('storage_off', 503);
  const ph = await env.DB.prepare('SELECT * FROM photos WHERE id=? AND grade_id=?').bind(String(b.id), g.id).first() || bad('photo', 404);
  if (ph.by_id !== me.id && me.role !== 'rakaz') bad('forbidden', 403);
  await env.FILES.delete([`g/${g.id}/${ph.id}/t`, `g/${g.id}/${ph.id}/o`]);
  await env.DB.prepare('DELETE FROM photos WHERE id=?').bind(ph.id).run();
  return json({ ok: true });
}
async function fileOk(env, g, id) {
  if (!id || !env.FILES) return '';
  const ph = await env.DB.prepare('SELECT id FROM photos WHERE id=? AND grade_id=?').bind(String(id), g.id).first();
  return ph ? ph.id : '';
}

/* ---------- הגבאי: בינה מלאכותית, טקסט בלבד ---------- */
const GABAI = `אתה "הגבאי" – דמות מייעצת חמה, שנונה וצנועה של פורטל שכבה. שכבת י"ב בישיבה תיכונית מכינה את ערב ההכתרה בפורים (סרטונים, ממים, מערכונים, טריילר, שירים).
כתיבה: עברית בלבד (בלי מילים בערבית או באנגלית), טקסט רגיל בלי סימני markdown כמו כוכביות או #.
כללי כבוד שאסור לשבור:
1. צוחקים על תופעות ולא על אנשים: על הלו"ז, המבחנים, האוכל בחדר האוכל, הקימה לשחרית, הטיולים, המחשבים – לא על אדם מסוים.
2. אף פעם לא על מראה, משקל, גובה, משפחה, הורים, מוגבלות, מחלה, כסף, מוצא, עדה, מבטא, או על אמונה ומצוות.
3. אם יש ספק – אין ספק: מוותרים על הבדיחה.
4. כל קטע שאתה כותב נגמר ב"שורת כבוד" – משפט חם וקצר של הוקרה (לצוות, לחברים, להורים, לישיבה).
5. אתה לא נקרא על שם אף רב, לא מחקה אף איש צוות אמיתי, ולא כותב שמות של אנשים אמיתיים.
6. שפה נקייה לגמרי, בלי קללות ובלי רמיזות. עברית תקינה וטבעית של בני נוער דתיים.
רמזור כבוד לכל טקסט: green = צחוק על תופעה, מכבד, אפשר להציג. yellow = יש משהו שעלול לפגוע במישהו או לא להתאים לערב עם הורים וצוות – צריך תיקון קטן. red = פוגע באדם, במראה, במשפחה, במוגבלות, בכסף או בקדושה – לא מציגים. הסיבה במשפט קצר אחד בעברית.
מחזירים JSON בלבד, בדיוק במבנה שהתבקש.`;

const LIGHT_SCHEMA = { light: 'green|yellow|red', why: 'סיבה קצרה' };
const TASKS = {
  light: {
    in: b => `בדוק את הטקסט הבא ותן רמזור כבוד.\nטקסט:\n${clean(b.text, 3000, true)}`,
    shape: LIGHT_SCHEMA,
    out: d => normLight(d)
  },
  ask: {
    in: b => `שאלה מהשכבה: ${clean(b.q, 600, true)}\nענה בקצרה ובמעשיות (עד 120 מילים, אפשר רשימה), לפי כללי הכבוד, וסיים בשורת כבוד. תן גם רמזור לתשובה שלך.`,
    shape: { answer: 'התשובה', light: 'green|yellow|red', why: 'סיבה' },
    out: d => ({ answer: clean(d.answer, 2000, true) || bad('ai_empty', 502), ...normLight(d) })
  },
  captions: {
    in: b => `תיאור במילים של תמונה למם (התמונה עצמה לא נשלחת): ${clean(b.desc, 400)}\n${b.about_staff ? 'המם הוא על איש צוות – רק הומור חם ומכבד על תופעה (למשל "כשהר"מ אומר עוד חמש דקות"), בלי ללעוג.' : ''}\nכתוב 5 כיתובים שונים למם: שורה עליונה קצרה ושורה תחתונה קצרה (עד 7 מילים כל אחת), מצחיקים, בסגנון ממים ישראליים, על תופעה. לכל אחד רמזור כבוד.`,
    shape: { captions: [{ top: 'שורה עליונה', bottom: 'שורה תחתונה', light: 'green|yellow|red', why: 'סיבה' }] },
    out: d => ({ captions: (Array.isArray(d.captions) ? d.captions : []).slice(0, 5).map(c => ({ top: clean(c.top, 80), bottom: clean(c.bottom, 80), ...normLight(c) })).filter(c => c.top || c.bottom) })
  },
  parody: {
    in: b => `שיר מקורי (מילים בלבד, לשימוש פנימי בערב ההכתרה):\n${clean(b.lyrics, 2500, true)}\n\nעל מה לצחוק: ${clean(b.topic, 400)}\nכתוב פרודיה: לכל שורה של המקור שורה חדשה עם אותו מספר הברות בערך ואותו חרוז בסוף כמו השורה המקבילה (אם במקור שתי שורות מתחרזות – גם אצלך). שורות ריקות נשארות ריקות. syl = מספר ההברות במקור ובשורה החדשה. השורה האחרונה של הפרודיה היא שורת כבוד. רמזור לפרודיה כולה.`,
    shape: { lines: [{ orig: 'שורת המקור', new: 'שורה חדשה', syl_orig: 0, syl_new: 0 }], light: 'green|yellow|red', why: 'סיבה' },
    out: d => ({ lines: (Array.isArray(d.lines) ? d.lines : []).slice(0, 60).map(l => ({ orig: clean(l.orig, 160), new: clean(l.new, 160), syl_orig: +l.syl_orig || 0, syl_new: +l.syl_new || 0 })), ...normLight(d) })
  },
  line: {
    in: b => `שורה במקור: "${clean(b.orig, 160)}"\nהשורה לפני בפרודיה: "${clean(b.prev, 160)}"\nהשורה אחרי בפרודיה: "${clean(b.next, 160)}"\nהגרסה הנוכחית (לא לחזור עליה): "${clean(b.current, 160)}"\nעל מה צוחקים: ${clean(b.topic, 300)}\nכתוב גרסה אחרת לשורה הזאת בלבד, באותו מספר הברות בערך ובאותו חרוז כמו השורה במקור. תן רמזור.`,
    shape: { new: 'שורה חדשה', syl: 0, light: 'green|yellow|red', why: 'סיבה' },
    out: d => ({ new: clean(d.new, 160) || bad('ai_empty', 502), syl: +d.syl || 0, ...normLight(d) })
  },
  ad: {
    in: b => `כתוב מודעה לשיווק בבית הספר (טקסט בלבד, בלי שמות של אנשים אמיתיים).
על מה: ${clean(b.about, 200)}
הצעה או מבצע: ${clean(b.offer, 200) || 'ללא'}
זמן ומקום: ${clean(b.when, 120) || 'לא צוין'}
סגנון: ${['funny', 'warm', 'short'].includes(b.tone) ? { funny: 'מצחיק וקליל', warm: 'חם ומזמין', short: 'קצר וקולע' }[b.tone] : 'מצחיק וקליל'}
החזר: כותרת קצרה (עד 6 מילים), עד 3 שורות גוף קצרות, קריאה לפעולה, והודעת ווטסאפ שבועית מוכנה לשליחה לקבוצת בית הספר (עד 60 מילים, עם אימוג'י מעטים, בלי קישורים).`,
    shape: { headline: 'כותרת', lines: ['שורה'], cta: 'קריאה לפעולה', weekly: 'הודעת ווטסאפ', light: 'green|yellow|red', why: 'סיבה' },
    out: d => ({ headline: clean(d.headline, 60) || bad('ai_empty', 502), lines: (Array.isArray(d.lines) ? d.lines : []).slice(0, 4).map(x => clean(x, 90)).filter(Boolean), cta: clean(d.cta, 60), weekly: clean(d.weekly, 600, true), ...normLight(d) })
  },
  sponsor_letter: {
    in: b => `כתוב מכתב קצר ומכבד מתלמידי שכבת י"ב לבעל עסק בקהילה, בבקשה לתרום או לתת חסות לערב ההכתרה של השכבה.
שם העסק: ${clean(b.business, 60)}
מה השכבה מציעה בתמורה: ${clean(b.package, 120) || 'תודה בערב ולוגו בחוברת'}
תאריך הערב: ${clean(b.when, 60) || 'פורים'}
שם התלמיד השולח (שם פרטי בלבד): ${clean(b.sender, 30)}
כללים: בלי לחץ ובלי להתחנן, מנומס, עד 90 מילים, בלי שם הישיבה ובלי פרטים אישיים על התלמידים, בלי הבטחות כספיות. סיים בהודיה. החזר גם נושא קצר למייל ושורת תודה שתופיע בחוברת ובמסך.`,
    shape: { subject: 'נושא', letter: 'המכתב', thanks: 'שורת תודה', light: 'green|yellow|red', why: 'סיבה' },
    out: d => ({ subject: clean(d.subject, 80), letter: clean(d.letter, 1500, true) || bad('ai_empty', 502), thanks: clean(d.thanks, 140), ...normLight(d) })
  },
  torah: {
    in: b => `בנה דבר תורה היתולי לפורים תורה בשבת זכור, בנושא: ${clean(b.topic, 200)}.
הרעיון של התלמידים (אם יש): ${clean(b.idea, 400) || 'אין'}
מבנה אמיתי של דבר תורה: קושיה, תירוץ מופרך ומצחיק, גימטריה, "נפקא מינה" מעשית על חיי הישיבה, ופתיחה וסיום קצרים. הכול היתולי ומכבד, צחוק על תופעות.
חשוב מאוד: לא להמציא ציטוטים מחז"ל או מראשונים ולא לכתוב "אמרו חכמים" על דבר שלא נאמר. לא לשנות פסוקים, ולא לכתוב שמות קדושים. אפשר לרמוז על פסוק או נושא רק במילים "אפשר לחפש", בלי לצטט. מראה מקום אמיתי יוסיפו התלמידים בעצמם מספר. בלי שמות של אנשים אמיתיים.`,
    shape: { opening: 'פתיחה', question: 'קושיה', answer: 'תירוץ', gematria: 'גימטריה היתולית עם החישוב', nafka: 'נפקא מינה', closing: 'סיום עם שורת כבוד', search_hint: 'במה כדאי לחפש מקור אמיתי (בלי ציטוט)', light: 'green|yellow|red', why: 'סיבה' },
    out: d => ({ opening: clean(d.opening, 300, true), question: clean(d.question, 500, true) || bad('ai_empty', 502), answer: clean(d.answer, 700, true), gematria: clean(d.gematria, 400, true), nafka: clean(d.nafka, 500, true), closing: clean(d.closing, 300, true), search_hint: clean(d.search_hint, 200), ...normLight(d) })
  },
  joke: {
    in: b => `הצע 5 בדיחות או סיפורים קצרים בעברית לדף גמרא של שבת זכור בנושא: ${clean(b.topic, 200)}. כל אחת עד 25 מילים, על תופעות בחיי שכבת י"ב בישיבה, בלי שמות של אנשים.`,
    shape: { jokes: [{ text: 'הבדיחה', light: 'green|yellow|red', why: 'סיבה' }] },
    out: d => ({ jokes: (Array.isArray(d.jokes) ? d.jokes : []).slice(0, 5).map(j => ({ text: clean(j.text, 200, true), ...normLight(j) })).filter(j => j.text) })
  },
  gemara: {
    in: b => `נסח את הבדיחה או הסיפור הבא כדף גמרא היתולי לפורים תורה, בלשון משנה וגמרא בארמית: ${clean(b.joke, 600, true)}
נושא הסוגיה: ${clean(b.topic, 120) || 'לא צוין'}
מבנה: כותרת מסכת היתולית; "מתניתין" קצרה בלשון משנה; "גמרא" בארמית עם "מאי טעמא", "תנו רבנן", "איבעיא להו" ומחלוקת, ואם צריך "תיקו"; 2-3 הערות רש"י קצרות (דיבור מתחיל + הסבר בעברית); 2 קושיות של תוספות (דיבור מתחיל + קושיה). הכול היתולי ומכבד.
חשוב: בלי שמות קדושים, בלי שינוי פסוקים, בלי ציטוט מחז"ל אמיתי כאילו נאמר, בלי שמות של אנשים אמיתיים. הארמית פשוטה וקצרה.`,
    shape: { title: 'כותרת מסכת', mishna: 'מתניתין', gemara: 'גמרא', rashi: [{ dh: 'דיבור מתחיל', text: 'הסבר' }], tosafot: [{ dh: 'דיבור מתחיל', text: 'קושיה' }], light: 'green|yellow|red', why: 'סיבה' },
    out: d => ({ title: clean(d.title, 60), mishna: clean(d.mishna, 500, true), gemara: clean(d.gemara, 1500, true) || bad('ai_empty', 502),
      rashi: (Array.isArray(d.rashi) ? d.rashi : []).slice(0, 4).map(x => ({ dh: clean(x.dh, 40), text: clean(x.text, 300, true) })).filter(x => x.text),
      tosafot: (Array.isArray(d.tosafot) ? d.tosafot : []).slice(0, 3).map(x => ({ dh: clean(x.dh, 40), text: clean(x.text, 300, true) })).filter(x => x.text), ...normLight(d) })
  },
  edit: {
    in: b => {
      const ph = (Array.isArray(b.photos) ? b.photos : []).slice(0, 80).map((p, i) => `${i}: ${clean(p && p.note, 60) || 'תמונה'}`).join('\n');
      return `תבנית: ${clean(b.template, 40)}\nמה התלמיד רוצה (במילים שלו): ${clean(b.words, 800, true)}\nאורך רצוי בשניות: ${Math.min(240, Math.max(15, +b.seconds || 60))}\nהתמונות שבחר (מספר: הערה שכתב – התמונות עצמן לא נשלחות):\n${ph}\nבנה תסריט עריכה: רשימת סצנות לפי הסדר. כל סצנה: photo = מספר תמונה מהרשימה (או -1 לכרטיס כותרת בלי תמונה), caption = כיתוב קצר (עד 8 מילים, יכול להיות ריק), dur = שניות (1.5 עד 6), fx = zoom|pan|fade|slide. pace = slow|mid|fast. הסצנה האחרונה: כרטיס כותרת עם שורת כבוד. רמזור לכיתובים.`;
    },
    shape: { title: 'כותרת הסרטון', pace: 'mid', scenes: [{ photo: 0, caption: 'כיתוב', dur: 3, fx: 'zoom' }], light: 'green|yellow|red', why: 'סיבה' },
    out: (d, b) => {
      const n = Array.isArray(b.photos) ? b.photos.length : 0;
      const scenes = (Array.isArray(d.scenes) ? d.scenes : []).slice(0, 120).map(s => ({
        photo: Number.isInteger(+s.photo) && +s.photo >= 0 && +s.photo < n ? +s.photo : -1,
        caption: clean(s.caption, 90), dur: Math.min(6, Math.max(1.5, +s.dur || 3)),
        fx: ['zoom', 'pan', 'fade', 'slide'].includes(s.fx) ? s.fx : 'fade'
      }));
      if (!scenes.length) bad('ai_empty', 502);
      return { title: clean(d.title, 60), pace: ['slow', 'mid', 'fast'].includes(d.pace) ? d.pace : 'mid', scenes, ...normLight(d) };
    }
  }
};

async function ai(b, env, me, g) {
  const t = TASKS[b.task] || bad('task');
  await aiQuota(env, g);
  const d = await askModel(env, t.in(b), t.shape);
  return json(t.out(d, b));
}

async function aiQuota(env, g) {
  const day = today();
  const per = g.demo ? AI_PER_DEMO : AI_PER_GRADE;
  const [mine, all] = await env.DB.batch([
    env.DB.prepare('INSERT INTO ai_count (grade_id,day,n) VALUES (?,?,1) ON CONFLICT(grade_id,day) DO UPDATE SET n=n+1 RETURNING n').bind(g.id, day),
    env.DB.prepare("INSERT INTO ai_count (grade_id,day,n) VALUES ('*',?,1) ON CONFLICT(grade_id,day) DO UPDATE SET n=n+1 RETURNING n").bind(day)
  ]);
  if (mine.results[0].n > per || all.results[0].n > AI_DAY_CAP) bad('ai_quota', 429);
}

async function lightFor(env, g, text, given) {
  // רמזור לכל מוצר. בעיה בבינה לא חוסמת שמירה – רמזור ריק = "לא נבדק".
  const pre = localLight(text);
  if (pre) return pre;
  try { await aiQuota(env, g); return normLight(await askModel(env, TASKS.light.in({ text }), LIGHT_SCHEMA)); }
  catch (e) { if (given && ['green', 'yellow', 'red'].includes(given.light)) return { light: given.light, why: clean(given.why, 200) }; return { light: '', why: '' }; }
}
// מילים שאין עליהן ויכוח – אדום מיד, בלי לשאול את הבינה
const RED_WORDS = /(?:^|[^א-ת])(מכוער|מכוערת|מפגר|מפגרת|דביל|דבילית|אידיוט|אידיוטית|טמבל|קמצן|קמצנית|ערס|ערסית|פרחה|כושי|חולה נפש)(?=[^א-ת]|$)/;
function localLight(text) {
  const m = String(text || '').match(RED_WORDS);
  return m ? { light: 'red', why: `"${m[1]}" – פגיעה באדם (מראה, מוגבלות, כסף או מוצא). אם יש ספק אין ספק.` } : null;
}
function normLight(d) {
  const l = String(d && d.light || '').toLowerCase();
  return { light: ['green', 'yellow', 'red'].includes(l) ? l : 'yellow', why: clean(d && d.why, 200) || (l === 'green' ? 'צחוק על תופעה, מכבד.' : 'כדאי לעבור שוב לפני שמציגים.') };
}

async function askModel(env, user, shape) {
  const want = `\nהחזר JSON בלבד במבנה הזה (הערכים הם דוגמה):\n${JSON.stringify(shape)}`;
  if (env.GEMINI_KEYS) {
    const keys = String(env.GEMINI_KEYS).split(/[\s,]+/).filter(Boolean);
    const models = (env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.5-flash,gemini-3.7-flash').split(',').map(s => s.trim());
    for (const key of keys) for (const model of models) {
      let r;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', signal: AbortSignal.timeout(30000),
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: GABAI }] },
            contents: [{ role: 'user', parts: [{ text: user + want }] }],
            generationConfig: { temperature: 0.8, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }
          })
        });
      } catch (e) { continue; }
      if (r.ok) {
        const j = await r.json();
        const d = parseJson(j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '');
        if (d) return d;
      } else if (![404, 429, 500, 503].includes(r.status)) break;
    }
  }
  if (!env.AI) bad('ai_off', 503);
  let r;
  try { r = await env.AI.run(CF_MODEL, { instructions: GABAI, input: user + want, reasoning: { effort: 'low' } }); }
  catch (e) { bad('ai_busy', 503); }
  const d = parseJson(cfText(r));
  if (!d) bad('ai_bad', 502);
  return d;
}
function cfText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (r.response) return typeof r.response === 'string' ? r.response : JSON.stringify(r.response);
  if (Array.isArray(r.output)) return r.output.filter(o => o.type === 'message').flatMap(o => o.content || []).map(c => c.text || '').join('');
  return r.output_text || '';
}
export function parseJson(t) {
  const s = String(t || ''); const a = s.indexOf('{'), z = s.lastIndexOf('}');
  if (a < 0 || z <= a) return null;
  try { return tidyDeep(JSON.parse(s.slice(a, z + 1))); } catch (e) { return null; }
}
// ניקוי פלט הבינה: בלי סימני markdown, ובלי מילים בערבית שנפלטות לפעמים באמצע עברית
export function tidy(x) {
  return String(x).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^[ 	]*[*\-][ 	]+/gm, '• ').replace(/(^|\s)#{1,4}\s+/g, '$1')
    .replace(/كل/g, 'כל').replace(/[؀-ۿ]+/g, '').replace(/[ 	]{2,}/g, ' ');
}
function tidyDeep(d) {
  if (typeof d === 'string') return tidy(d);
  if (Array.isArray(d)) return d.map(tidyDeep);
  if (d && typeof d === 'object') { for (const k in d) d[k] = tidyDeep(d[k]); }
  return d;
}

/* ---------- שכבת ההדגמה: בלי תמונות אמיתיות, נבנית מחדש כל לילה ---------- */
export async function seedDemo(env) {
  const old = ['products', 'tasks', 'committees', 'members', 'photos', 'k_items', 'k_tx', 'k_receipt', 'k_shop', 'k_shift', 'k_count', 'k_coll', 'k_sponsor'];
  const st = [
    env.DB.prepare('DELETE FROM votes WHERE product_id IN (SELECT id FROM products WHERE grade_id=?)').bind(DEMO_ID),
    env.DB.prepare('DELETE FROM history WHERE product_id IN (SELECT id FROM products WHERE grade_id=?)').bind(DEMO_ID),
    env.DB.prepare('DELETE FROM k_paid WHERE coll_id IN (SELECT id FROM k_coll WHERE grade_id=?)').bind(DEMO_ID),
    env.DB.prepare('DELETE FROM cmembers WHERE committee_id IN (SELECT id FROM committees WHERE grade_id=?)').bind(DEMO_ID),
    ...old.map(t => env.DB.prepare(`DELETE FROM ${t} WHERE grade_id=?`).bind(DEMO_ID)),
    env.DB.prepare('DELETE FROM grades WHERE id=?').bind(DEMO_ID)
  ];
  const now = Date.now(), hachtara = '2027-03-21';
  st.push(env.DB.prepare('INSERT INTO grades (id,name,slogan,hachtara,join_code,admin_code,melave_code,melave_name,demo,created) VALUES (?,?,?,?,?,?,?,?,1,?)')
    .bind(DEMO_ID, 'מחזור ההדגמה', 'עולים ומעלים', hachtara, 'demo-j', 'demo-a', 'demo-m', 'המלווה מהצוות', now));
  const M = [['d-rakaz', 'אריאל (דוגמה)', 'י"ב 1', 'rakaz'], ['d-noam', 'נועם (דוגמה)', 'י"ב 1', 'chaver'], ['d-yair', 'יאיר (דוגמה)', 'י"ב 2', 'chaver'], ['d-itai', 'איתי (דוגמה)', 'י"ב 2', 'gizbar'], ['d-melave', 'המלווה (דוגמה)', '', 'melave']];
  for (const [id, n, k, r] of M) st.push(env.DB.prepare('INSERT INTO members (id,grade_id,name,klass,role,token,created) VALUES (?,?,?,?,?,?,?)').bind(id, DEMO_ID, n, k, r, 'demo' + rid(24), now));
  const C = [['d-c-tasrit', 'תסריט', 'כותבים את המערכונים והקטעים בין הסרטונים', 'd-noam', ['d-noam', 'd-yair', 'd-rakaz']], ['d-c-memim', 'ממים', 'מם ליום מראש חודש אדר ועד פורים', 'd-yair', ['d-yair', 'd-itai', 'd-noam']], ['d-c-sratim', 'סרטונים', 'טריילר, מט\' עד י"ב, תודה לצוות', 'd-itai', ['d-itai', 'd-rakaz']]];
  for (const [id, n, a, hd, ms] of C) {
    st.push(env.DB.prepare('INSERT INTO committees (id,grade_id,name,about,head_id,created) VALUES (?,?,?,?,?,?)').bind(id, DEMO_ID, n, a, hd, now));
    for (const m of ms) st.push(env.DB.prepare('INSERT INTO cmembers (committee_id,member_id) VALUES (?,?)').bind(id, m));
  }
  const P = [
    ['d-p1', 'd-c-memim', 'd-yair', 'meme', 'כשאומרים "עוד חמש דקות" בשיעור', '', { top: 'כשהשיעור "נגמר עוד חמש דקות"', bottom: 'ואנחנו כבר בדקה ה-40', bg: 2 }, 0, 'green', 'צחוק על תופעה שכולם מכירים, בלי אדם מסוים.', 'draft'],
    ['d-p2', 'd-c-memim', 'd-itai', 'meme', 'שחרית ביום חורף', '', { top: 'אני ב-6:59', bottom: 'מגלה שהשעון מקדים', bg: 4 }, 0, 'green', 'הומור על קימה בבוקר – תופעה, לא אדם.', 'liked'],
    ['d-p3', 'd-c-tasrit', 'd-noam', 'text', 'מערכון: חדר האוכל ב-2040', 'רובוט מגיש שניצל, ומודיע שאין יותר פתיתים "מטעמי בטיחות". כולם מתחילים הפגנה שקטה עם צלחות.\nשורת כבוד: תודה לצוות המטבח שמאכיל אותנו באהבה כבר ארבע שנים.', {}, 0, 'green', 'צחוק על המצב, וסיום בהוקרה למטבח.', 'head'],
    ['d-p4', 'd-c-memim', 'd-yair', 'meme', 'הר"מ והלו"ז של סוף הזמן', '', { top: 'הר"מ: "נספיק את כל המסכת"', bottom: 'המסכת: 🫠', bg: 1 }, 1, 'yellow', 'על איש צוות – רק אם הוא מסכים ובחיוך. עבר אוטומטית למלווה.', 'melave'],
    ['d-p5', 'd-c-sratim', 'd-itai', 'trailer', 'טריילר: "ארבע שנים, שכבה אחת"', 'פתיחה עם תמונת כיתה ט\', מעבר לטיול השנתי, וסיום: "תודה לר"מים, להורים ולחברים – עולים ומעלים".', {}, 0, 'green', 'מכבד ומרגש.', 'approved']
  ];
  const H = { liked: [['אהבנו', 'רוב בוועדה (2 מתוך 3)']], head: [['אהבנו', 'ראש הוועדה'], ['נשלח לאחראי הראשי', '']], melave: [['אהבנו', 'רוב בוועדה (2 מתוך 3)'], ['עבר אוטומטית למלווה', 'מוצר על איש צוות – תמיד עובר לאישור המלווה']], approved: [['אהבנו', 'ראש הוועדה'], ['נשלח לאחראי הראשי', ''], ['הועלה למלווה', 'מוכן'], ['אושר', 'יפה מאוד, באהבה']] };
  P.forEach(([id, c, a, k, t, bd, dt, s, l, w, stt], i) => {
    st.push(env.DB.prepare('INSERT INTO products (id,grade_id,committee_id,author_id,kind,title,body,data,about_staff,light,light_why,state,file_id,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, DEMO_ID, c, a, k, t, bd, JSON.stringify(dt), s, l, w, stt, '', now - 9e5 + i, now - 9e5 + i));
    st.push(env.DB.prepare('INSERT INTO history (product_id,member_id,who,action,note,ts) VALUES (?,?,?,?,?,?)').bind(id, a, 'יוצר המוצר', 'נוצר כטיוטה בוועדה', '', now - 9e5));
    (H[stt] || []).forEach(([act, note], j) => st.push(env.DB.prepare('INSERT INTO history (product_id,member_id,who,action,note,ts) VALUES (?,?,?,?,?,?)').bind(id, 'd-rakaz', 'דוגמה', act, note, now - 8e5 + j * 1000)));
  });
  st.push(...seedTasks(env, DEMO_ID, hachtara, now));
  st.push(...kioskDemo(env.DB, DEMO_ID, now));
  await env.DB.batch(st);
  // כמה משימות כבר בוצעו, שיהיה אחוז התקדמות
  await env.DB.prepare("UPDATE tasks SET done=1, owner='אריאל (דוגמה)' WHERE grade_id=? AND title IN ('שם מחזור וסלוגן','חלוקה לוועדות')").bind(DEMO_ID).run();
}

/* ---------- עזרים ---------- */
function cors(origin) {
  const ok = ORIGINS.includes(origin) || LOCAL.test(origin);
  const h = { 'Vary': 'Origin' };
  if (ok) Object.assign(h, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' });
  return h;
}
function json(o, status = 200) { return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
async function body(req) { const t = await req.text(); if (t.length > 30000) bad('too_long', 413); try { return JSON.parse(t || '{}'); } catch (e) { bad('bad_json'); } }
export function clean(s, max, multi) {
  let t = String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
  t = multi ? t.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n') : t.replace(/\s+/g, ' ');
  return t.trim().slice(0, max);
}
function date(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m && !isNaN(Date.parse(s)) ? s : ''; }
export function shift(d, days) { const t = new Date(Date.parse(d) + days * 864e5); return t.toISOString().slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
function rid(n) { const a = crypto.getRandomValues(new Uint8Array(n)); return [...a].map(x => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join(''); }
async function freeCode(env, len) {
  for (let i = 0; i < 20; i++) {
    const a = crypto.getRandomValues(new Uint32Array(1))[0];
    const c = String(a % 10 ** len).padStart(len, '0');
    if (c[0] === '0') continue;
    const x = await env.DB.prepare('SELECT 1 FROM grades WHERE join_code=? OR admin_code=? OR melave_code=?').bind(c, c, c).first();
    if (!x) return c;
  }
  bad('code_gen', 500);
}
async function hash(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join(''); }
function safeJson(s) { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } }
function dataText(d) { return d && typeof d === 'object' ? [d.top, d.bottom, ...(Array.isArray(d.lines) ? d.lines.map(l => l && l.new) : []), ...(Array.isArray(d.scenes) ? d.scenes.map(s => s && s.caption) : [])].filter(Boolean).join('\n').slice(0, 3000) : ''; }
function rakaz(me) { if (me.role !== 'rakaz') bad('forbidden', 403); }
function notMelave(me) { if (me.role === 'melave') bad('forbidden', 403); }
async function committee(env, g, id) { return await env.DB.prepare('SELECT * FROM committees WHERE id=? AND grade_id=?').bind(String(id || ''), g.id).first() || bad('committee', 404); }
async function product(env, g, id) { return await env.DB.prepare('SELECT * FROM products WHERE id=? AND grade_id=?').bind(String(id || ''), g.id).first() || bad('product', 404); }
async function member(env, c, me) {
  if (me.role === 'rakaz') return;
  const x = await env.DB.prepare('SELECT 1 FROM cmembers WHERE committee_id=? AND member_id=?').bind(c.id, me.id).first();
  if (!x) bad('not_in_committee', 403);
}
async function cid(env, g, id) { if (!id) return ''; const c = await env.DB.prepare('SELECT id FROM committees WHERE id=? AND grade_id=?').bind(String(id), g.id).first(); return c ? c.id : ''; }
function hist(env, pid, me, action, note) {
  return env.DB.prepare('INSERT INTO history (product_id,member_id,who,action,note,ts) VALUES (?,?,?,?,?,?)').bind(pid, me.id, `${me.name} (${ROLE_HE[me.role] || ''})`, action, note || '', Date.now());
}
