// אישורי הגעה ולוח מעקב למחולל ההזמנות לכל אירוע (/kelim/eruim/hazmana/) – Cloudflare Worker + KV.
// נפרד משרת הברית של המוהל (tools/rsvp-worker), שלא משתנה.
// האירוע כולו (פרטים ותשובות) יושב במפתח KV אחד, ונמחק מעצמו 30 יום אחרי האירוע.
//
// ציבורי:
//   POST /ev                    {d}                      -> {id, tok}   יצירת אירוע (tok = טוקן ניהול, נשמר רק כ-hash)
//   GET  /ev/:id                                         -> {d}         פרטי האירוע לדף האורחים
//   POST /ev/:id/rsvp           {n, c, ok, note, aid?, g?} -> {aid}     אישור הגעה (aid נשמר בטלפון של האורח כדי לעדכן)
//                               ok: 1 מגיעים, 0 לא, 2 אולי (מגרסה 2). g: קוד המוזמן מהקישור האישי של כלי אישורי ההגעה
// ניהול (?t=<tok>):
//   GET  /ev/:id/admin                                   -> האירוע עם כל התשובות
//   POST /ev/:id/update         {d}                      -> {ok}
//   POST /ev/:id/delete                                  -> {ok}        מחיקה מיידית
//
// KV: ev:<id> -> האירוע (JSON) · rl:<ip>:<kind> -> מונה לקצב
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
// rsvp/create גבוהים כי בחתונה הרבה אורחים עונים מאותה רשת (אולם, בית כנסת)
const LIM = { name: 60, note: 200, field: 140, answers: 1500, count: 30, create: 8, rsvp: 60, windowSec: 600 };
const KINDS = ['chatuna', 'bar-mitzva', 'bat-mitzva', 'erusin', 'china', 'sheva-brachot', 'yom-huledet', 'chalake', 'sefer-torah', 'chanukat-bayit'];
const PUB = ['k', 'vr', 'nm1', 'nm2', 'p1', 'p2', 'fam', 'gp', 'host', 'age', 'lzn', 'dt', 'tm', 't2', 'pl', 'pl2', 'ad', 'a_dt', 'a_par', 'a_pl', 'fm', 'vs', 'fr', 'end', 'st', 'nobsd'];
const KEEP_DAYS = 30;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/ev(?:\/([a-z0-9]{6,12}))?(?:\/(rsvp|admin|update|delete))?\/?$/);
      if (!m) res = json({ error: 'not found' }, 404);
      else if (!m[1] && req.method === 'POST') res = await createEvent(req, env);
      else if (m[1] && !m[2] && req.method === 'GET') res = await getEvent(m[1], env);
      else if (m[2] === 'rsvp' && req.method === 'POST') res = await rsvp(m[1], req, env);
      else if (m[1] && m[2] && m[2] !== 'rsvp') res = await admin(m[1], m[2], url, req, env);
      else res = json({ error: 'not found' }, 404);
    } catch (e) {
      res = json({ error: 'שגיאה פנימית: ' + (e && e.message || e) }, 500);
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

function corsHeaders(origin, env) {
  const extra = (env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = ORIGINS.includes(origin) || extra.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { 'Vary': 'Origin' };
  if (ok) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
const clean = (s, max) => (typeof s === 'string' ? s : '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const evKey = id => 'ev:' + id;
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
function shortId(len) {
  const a = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (const b of a) s += ALPHA[b % ALPHA.length];
  return s;
}
async function sha(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function rateLimit(req, env, kind, max) {
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const key = 'rl:' + ip + ':' + kind;
  const n = parseInt((await env.ERSVP.get(key)) || '0', 10);
  if (n >= max) return json({ error: 'יותר מדי פעולות ברצף. נסו שוב בעוד כמה דקות.' }, 429);
  await env.ERSVP.put(key, String(n + 1), { expirationTtl: LIM.windowSec });
  return null;
}
async function readJson(req) { try { return await req.json(); } catch (e) { return null; } }

// פרטי האירוע הציבוריים, רק השדות המוכרים
function pubDetails(d) {
  if (!d || typeof d !== 'object') return null;
  const o = {};
  for (const k of PUB) {
    const v = d[k];
    if (v === undefined || v === null || v === '' || v === 0) continue;
    o[k] = typeof v === 'number' ? (v ? 1 : 0) : clean(String(v), LIM.field);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.dt || '')) return null;
  if (!KINDS.includes(o.k)) o.k = 'chatuna';
  return o;
}
function ttlFor(d) {
  const day = Date.parse(d.dt + 'T23:59:59Z');
  const end = Math.max(day, Date.now()) + KEEP_DAYS * 86400e3;
  return Math.max(3600, Math.round((end - Date.now()) / 1000));
}
async function save(env, ev) { await env.ERSVP.put(evKey(ev.id), JSON.stringify(ev), { expirationTtl: ttlFor(ev.d) }); }
async function load(env, id) { const raw = await env.ERSVP.get(evKey(id)); return raw ? JSON.parse(raw) : null; }

async function createEvent(req, env) {
  const rl = await rateLimit(req, env, 'create', LIM.create);
  if (rl) return rl;
  const b = await readJson(req);
  if (!b) return json({ error: 'גוף הבקשה לא תקין' }, 400);
  if (b.website) return json({ ok: true, id: shortId(7), tok: shortId(24) }, 201); // honeypot
  const d = pubDetails(b.d);
  if (!d) return json({ error: 'חסר תאריך האירוע' }, 400);
  let id;
  for (let i = 0; i < 5; i++) { id = shortId(7); if (!(await env.ERSVP.get(evKey(id)))) break; }
  const tok = shortId(24);
  await save(env, { id, th: await sha(tok), d, created: new Date().toISOString(), answers: {} });
  return json({ ok: true, id, tok }, 201);
}

async function getEvent(id, env) {
  const ev = await load(env, id);
  if (!ev) return json({ error: 'האירוע לא נמצא, או שהנתונים כבר נמחקו' }, 404);
  return json({ d: ev.d, exp: KEEP_DAYS, v: 2 }); // v: 2 = יודע "אולי" וקוד מוזמן
}

async function rsvp(id, req, env) {
  const rl = await rateLimit(req, env, 'rsvp', LIM.rsvp);
  if (rl) return rl;
  const b = await readJson(req);
  if (!b) return json({ error: 'גוף הבקשה לא תקין' }, 400);
  if (b.website) return json({ ok: true, aid: 'a' + shortId(6) }, 201); // honeypot
  const ev = await load(env, id);
  if (!ev) return json({ error: 'האירוע לא נמצא' }, 404);
  const ok = +b.ok === 2 ? 2 : b.ok ? 1 : 0, n = clean(b.n, LIM.name), note = clean(b.note, LIM.note);
  const g = /^[a-z0-9]{3,10}$/.test(b.g || '') ? b.g : '';
  let c = parseInt(b.c, 10);
  if (!ok) c = 0; else if (!(c >= 1)) c = 1; else if (c > LIM.count) c = LIM.count;
  if (n.length < 2) return json({ error: 'כתבו שם (לפחות 2 אותיות)' }, 400);
  let aid = clean(b.aid, 12);
  if (!/^a[a-z0-9]{5,}$/.test(aid) || !ev.answers[aid]) aid = 'a' + shortId(6);
  if (Object.keys(ev.answers).length >= LIM.answers && !ev.answers[aid]) return json({ error: 'הרשימה מלאה' }, 400);
  ev.answers[aid] = { n, c, ok, note, ts: new Date().toISOString() };
  if (g) ev.answers[aid].g = g;
  await save(env, ev);
  return json({ ok: true, aid }, 201);
}

async function admin(id, action, url, req, env) {
  const ev = await load(env, id);
  if (!ev) return json({ error: 'האירוע לא נמצא, או שהנתונים כבר נמחקו' }, 404);
  const tok = url.searchParams.get('t') || '';
  if (!tok || (await sha(tok)) !== ev.th) return json({ error: 'קישור הניהול לא תקין' }, 403);
  if (action === 'admin' && req.method === 'GET') return json({ d: ev.d, created: ev.created, answers: ev.answers, exp: KEEP_DAYS });
  if (req.method !== 'POST') return json({ error: 'not found' }, 404);
  const b = (await readJson(req)) || {};
  if (action === 'update') {
    const d = pubDetails(b.d);
    if (!d) return json({ error: 'חסר תאריך האירוע' }, 400);
    ev.d = d;
    await save(env, ev);
    return json({ ok: true });
  }
  if (action === 'delete') { await env.ERSVP.delete(evKey(id)); return json({ ok: true }); }
  return json({ error: 'not found' }, 404);
}
