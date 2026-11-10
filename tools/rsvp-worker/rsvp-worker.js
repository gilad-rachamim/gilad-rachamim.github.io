// אישורי הגעה לברית – Cloudflare Worker + KV. מחובר למחולל ההודעה (/mohel/hazmana/).
// האירוע כולו (פרטים, מוזמנים, תשובות) יושב במפתח KV אחד, עם תפוגה אוטומטית 30 יום אחרי הברית.
//
// ציבורי:
//   POST /ev                         {d}                      -> {id, tok}   יצירת אירוע (tok = טוקן ניהול, נשמר רק כ-hash)
//   GET  /ev/:id[?g=gid]                                      -> {d, g:{n}}  פרטי האירוע (+ שם המוזמן בקישור אישי)
//   POST /ev/:id/rsvp                {g?, n, c, ok, note, bl} -> {ok, aid}   אישור הגעה (g = מזהה אישי, אחרת תשובה חופשית; bl = ברכה לתינוק)
//   POST /ev/:id/bracha              {n, bl, bid?}            -> {ok, bid}   ברכה בלבד (אחרי הברית, בלי אישור הגעה)
// ניהול (?t=<tok>):
//   GET  /ev/:id/admin                                        -> האירוע המלא
//   POST /ev/:id/guests              {add:[{n,p}], del:[gid]} -> {guests}
//   POST /ev/:id/update              {d}                      -> {ok}
//   POST /ev/:id/gift                {url}                    -> {ok, gift}  קישור "מתנה להורים" (Bit / PayBox). רק קישור: אין כסף, אין פרטי חשבון
//   POST /ev/:id/delete                                       -> {ok}       מחיקה מיידית
//
// KV: ev:<id> -> האירוע (JSON) · rl:<ip>:<kind> -> מונה לקצב
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LIM = { name: 60, note: 200, place: 120, guests: 400, count: 20, create: 5, rsvp: 20, windowSec: 600 };
const PUB = ['k', 'dt', 'tm', 'sh', 'shp', 'pl', 'ad', 'fm', 'par', 'fam', 'gp', 'vs', 'se', 'sep', 'sz', 'szt', 'szp', 'st', 'kh']; // k = brit / zeved / pidyon
const KEEP_DAYS = 30; // כמה ימים אחרי הברית הנתונים נמחקים מעצמם

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/ev(?:\/([a-z0-9]{6,12}))?(?:\/(rsvp|bracha|admin|guests|update|delete|gift))?\/?$/);
      if (!m) res = json({ error: 'not found' }, 404);
      else if (!m[1] && req.method === 'POST') res = await createEvent(req, env);
      else if (m[1] && !m[2] && req.method === 'GET') res = await getEvent(m[1], url, env);
      else if (m[2] === 'rsvp' && req.method === 'POST') res = await rsvp(m[1], req, env);
      else if (m[2] === 'bracha' && req.method === 'POST') res = await bracha(m[1], req, env);
      else if (m[2] && m[2] !== 'rsvp' && m[2] !== 'bracha') res = await admin(m[1], m[2], url, req, env);
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
  return new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const clean = (s, max) => (typeof s === 'string' ? s : '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const evKey = id => 'ev:' + id;
// קישור המתנה: https בלבד, בלי סיסמאות בכתובת. האורחים רואים את שם האתר לפני שהם נכנסים.
function giftUrl(u) {
  u = clean(u, 300);
  if (!u) return '';
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:' || x.username || x.password || !x.hostname.includes('.')) return null;
    return x.href;
  } catch (e) { return null; }
}
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789'; // בלי אותיות שמתבלבלות (i, l, o, 0, 1)
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
  const n = parseInt((await env.RSVP.get(key)) || '0', 10);
  if (n >= max) return json({ error: 'יותר מדי פעולות ברצף. נסו שוב בעוד כמה דקות.' }, 429);
  await env.RSVP.put(key, String(n + 1), { expirationTtl: LIM.windowSec });
  return null;
}
async function readJson(req) {
  try { return await req.json(); } catch (e) { return null; }
}

// פרטי הברית הציבוריים, מסוננים לשדות המוכרים בלבד
function pubDetails(d) {
  const o = {};
  if (!d || typeof d !== 'object') return null;
  for (const k of PUB) {
    const v = d[k];
    if (v === undefined || v === null || v === '' || v === 0) continue;
    o[k] = typeof v === 'number' ? (v ? 1 : 0) : clean(String(v), LIM.place);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.dt || '')) return null;
  return o;
}
// תפוגה: 30 יום אחרי הברית (ולפחות 30 יום מהיום, אם התאריך כבר עבר)
function ttlFor(d) {
  const brit = Date.parse(d.dt + 'T23:59:59Z');
  const end = Math.max(brit, Date.now()) + KEEP_DAYS * 86400e3;
  return Math.max(3600, Math.round((end - Date.now()) / 1000));
}
async function save(env, ev) {
  await env.RSVP.put(evKey(ev.id), JSON.stringify(ev), { expirationTtl: ttlFor(ev.d) });
}
async function load(env, id) {
  const raw = await env.RSVP.get(evKey(id));
  return raw ? JSON.parse(raw) : null;
}

async function createEvent(req, env) {
  const rl = await rateLimit(req, env, 'create', LIM.create);
  if (rl) return rl;
  const b = await readJson(req);
  if (!b) return json({ error: 'גוף הבקשה לא תקין' }, 400);
  if (b.website) return json({ ok: true, id: shortId(7), tok: shortId(24) }, 201); // honeypot
  const d = pubDetails(b.d);
  if (!d) return json({ error: 'חסר תאריך השמחה' }, 400);
  let id;
  for (let i = 0; i < 5; i++) { id = shortId(7); if (!(await env.RSVP.get(evKey(id)))) break; }
  const tok = shortId(24);
  const ev = { id, th: await sha(tok), d, created: new Date().toISOString(), guests: {}, answers: {} };
  await save(env, ev);
  return json({ ok: true, id, tok }, 201);
}

async function getEvent(id, url, env) {
  const ev = await load(env, id);
  if (!ev) return json({ error: 'האירוע לא נמצא, או שהנתונים כבר נמחקו' }, 404);
  const gid = url.searchParams.get('g') || '';
  const g = ev.guests[gid];
  const out = { d: ev.d, exp: KEEP_DAYS };
  if (ev.gift) out.gift = ev.gift;
  if (g) {
    out.g = { n: g.n };
    const a = ev.answers[gid];
    if (a) out.a = { ok: a.ok, c: a.c, note: a.note, n: a.n, bl: a.bl || '' };
  }
  return json(out);
}

async function rsvp(id, req, env) {
  const rl = await rateLimit(req, env, 'rsvp', LIM.rsvp);
  if (rl) return rl;
  const b = await readJson(req);
  if (!b) return json({ error: 'גוף הבקשה לא תקין' }, 400);
  if (b.website) return json({ ok: true, aid: shortId(6) }, 201); // honeypot
  const ev = await load(env, id);
  if (!ev) return json({ error: 'האירוע לא נמצא' }, 404);
  const ok = b.ok ? 1 : 0;
  const n = clean(b.n, LIM.name);
  const note = clean(b.note, LIM.note);
  const bl = clean(b.bl, LIM.note);
  let c = parseInt(b.c, 10);
  if (!ok) c = 0; else if (!(c >= 1)) c = 1; else if (c > LIM.count) c = LIM.count;
  if (n.length < 2) return json({ error: 'כתבו שם (לפחות 2 אותיות)' }, 400);
  let aid = clean(b.g, 12);
  if (aid && !ev.guests[aid]) aid = '';
  if (!aid) { // תשובה חופשית (מהקישור הכללי): מזהה שנשמר בטלפון כדי שאפשר יהיה לעדכן
    aid = clean(b.aid, 12);
    if (!/^a[a-z0-9]{5,}$/.test(aid) || (ev.answers[aid] && ev.guests[aid])) aid = 'a' + shortId(6);
  }
  if (Object.keys(ev.answers).length >= LIM.guests * 2 && !ev.answers[aid]) return json({ error: 'הרשימה מלאה' }, 400);
  ev.answers[aid] = { n, c, ok, note, ts: new Date().toISOString() };
  if (bl) ev.answers[aid].bl = bl;
  await save(env, ev);
  return json({ ok: true, aid }, 201);
}

// ברכה בלבד: אחרי הברית (או ממי שלא מאשר הגעה). נשמרת בנפרד מהתשובות, ומוצגת להורים בלוח.
async function bracha(id, req, env) {
  const rl = await rateLimit(req, env, 'rsvp', LIM.rsvp);
  if (rl) return rl;
  const b = await readJson(req);
  if (!b) return json({ error: 'גוף הבקשה לא תקין' }, 400);
  if (b.website) return json({ ok: true, bid: 'b' + shortId(6) }, 201); // honeypot
  const ev = await load(env, id);
  if (!ev) return json({ error: 'האירוע לא נמצא' }, 404);
  const n = clean(b.n, LIM.name), bl = clean(b.bl, LIM.note);
  if (n.length < 2) return json({ error: 'כתבו שם (לפחות 2 אותיות)' }, 400);
  if (bl.length < 2) return json({ error: 'כתבו ברכה' }, 400);
  ev.brachot = ev.brachot || {};
  let bid = clean(b.bid, 12);
  if (!/^b[a-z0-9]{5,}$/.test(bid) || !ev.brachot[bid]) bid = 'b' + shortId(6);
  if (Object.keys(ev.brachot).length >= LIM.guests && !ev.brachot[bid]) return json({ error: 'הרשימה מלאה' }, 400);
  ev.brachot[bid] = { n, bl, ts: new Date().toISOString() };
  await save(env, ev);
  return json({ ok: true, bid }, 201);
}

async function admin(id, action, url, req, env) {
  const ev = await load(env, id);
  if (!ev) return json({ error: 'האירוע לא נמצא, או שהנתונים כבר נמחקו' }, 404);
  const tok = url.searchParams.get('t') || '';
  if (!tok || (await sha(tok)) !== ev.th) return json({ error: 'קישור הניהול לא תקין' }, 403);
  if (action === 'admin' && req.method === 'GET') {
    return json({ d: ev.d, created: ev.created, guests: ev.guests, answers: ev.answers, brachot: ev.brachot || {}, gift: ev.gift || '', exp: KEEP_DAYS });
  }
  if (req.method !== 'POST') return json({ error: 'not found' }, 404);
  const b = (await readJson(req)) || {};
  if (action === 'guests') {
    (Array.isArray(b.del) ? b.del : []).forEach(g => { delete ev.guests[g]; delete ev.answers[g]; });
    const added = [];
    for (const g of (Array.isArray(b.add) ? b.add : []).slice(0, LIM.guests)) {
      if (Object.keys(ev.guests).length >= LIM.guests) break;
      const n = clean(g && g.n, LIM.name), p = clean(g && g.p, 20).replace(/[^\d+]/g, '');
      if (n.length < 2) continue;
      let gid; do { gid = 'g' + shortId(5); } while (ev.guests[gid]);
      ev.guests[gid] = { n, p, ts: new Date().toISOString() };
      added.push(gid);
    }
    await save(env, ev);
    return json({ ok: true, guests: ev.guests, added });
  }
  if (action === 'update') {
    const d = pubDetails(b.d);
    if (!d) return json({ error: 'חסר תאריך השמחה' }, 400);
    ev.d = d;
    await save(env, ev);
    return json({ ok: true });
  }
  if (action === 'gift') {
    const g = giftUrl(b.url);
    if (g === null) return json({ error: 'הקישור לא תקין. מדביקים את הקישור המלא שמתחיל ב-https://' }, 400);
    if (g) ev.gift = g; else delete ev.gift;
    await save(env, ev);
    return json({ ok: true, gift: g });
  }
  if (action === 'delete') {
    await env.RSVP.delete(evKey(id));
    return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}
