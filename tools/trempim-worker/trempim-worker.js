// טרמפים – מיזם חסד: נהגים מפרסמים מסלול, טרמפיסטים מוצאים מי עובר לידם ושולחים בקשה.
// Cloudflare Worker + D1 (binding DB). כניסה עם גוגל: הדף שולח credential של Google Identity,
// השרת מאמת אותו מול Google ומחזיר אסימון סשן חתום (HMAC, 60 יום).
//
//  POST /auth            {credential}                 -> {token, user}
//  GET  /me                                          -> {user}
//  POST /me              {name, phone, paybox, agreed} -> {user}
//  POST /rides           {..., kind: car|taxi, split: equal|km} -> {ride}  (מונית: עד 3 מצטרפים, מתחלקים במונה)
//  GET  /rides/mine                                  -> {rides}
//  POST /rides/:id/close                             -> {ok}
//  POST /search          {from, to, dates[], radius}  -> {matches}
//  POST /requests        {ride, date, pickup, drop, mode, msg} -> {request}
//  POST /requests/:id    {action: approve|decline|cancel}       -> {ok}
//  GET  /inbox                                       -> {asDriver, asRider}
//  POST /report          {about, ride, text}          -> {ok}
//  POST /ideas           {text}                       -> {ok}
//  GET  /stats                                       -> {rides, users, joined}
//  GET  /leaders                                     -> {month, leaders}  (לוח כבוד ציבורי: שם פרטי בלבד)
//  GET  /me/points                                   -> {log}             (פירוט נקודות החסד)
//  POST /ratings         {request, stars, text}       -> {ok}
//  GET  /admin  (דף)  ·  POST /admin/data {key}  ·  POST /admin/act {key, action, id}
//
// תגמולים: נקודות על העלאה (2 / קבועה 5, עד 5 בשבוע), בונוס 15 על נסיעה קבועה "פעילה"
// (פתוחה שבועיים או שמישהו הצטרף), 10/15 על טרמפ שאושר, 5 על דירוג חם. כל תנועה ב-points_log.
// דרגות: 1 נהג חסד, 2 נהג קבוע, 3 עמוד התווך; amb = שגריר השכונה. דרגה לא יורדת.
//
// סודות (wrangler secret put): SESSION_SECRET, ADMIN_KEY. משתנים: GOOGLE_CLIENT_ID.

const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const TZ = 'Asia/Jerusalem';
const MIN_PRICE = 5;
const MAX_RATE = 1.5;
const SESSION_DAYS = 60;

// מונית: תעריף מונה רשמי של משרד התחבורה, בתוקף מ-01.04.2026 (מתעדכן כל 1 באפריל).
// מקור: gov.il/he/pages/taxi-rate-2026, כפי שמופיע ב-taxitariff.co.il וב-taxi-il.co.il (נבדק 10.11.2026).
// מחיר = פתיחת מונה + הזמנה + ק"מ × תעריף + דקות × תעריף + תוספת לכל ק"מ מעל 10.
// תעריף א' (חול 06:00–21:00) 1.95; ב' (ערב, ושבת ביום) 2.34; ג' (לילה של שישי ושבת) 2.73.
const TAXI = { start: 12.46, booking: 5.78, a: 1.95, b: 2.34, c: 2.73, over10: 1.84, maxJoin: 3, updated: '2026-04-01' };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      res = await route(req, env, url);
    } catch (e) {
      if (e instanceof HttpError) res = json({ error: e.message }, e.status);
      else { console.log('ERR', e && e.stack || e); res = json({ error: 'internal' }, 500); }
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
  // פעם ביום: בונוס "פעילה" ודרגות לכולם (גם למי שלא נכנס)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncActive(env, null));
  },
};

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };

async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;
  if (p === '/stats' && m === 'GET') return stats(env);
  if (p === '/leaders' && m === 'GET') return leaders(env);
  if (p === '/admin' && m === 'GET') return adminPage();
  if (p.startsWith('/admin/') && m === 'POST') return admin(req, env, p);
  if (m === 'POST') {
    const origin = req.headers.get('Origin') || '';
    if (!corsHeaders(origin)['Access-Control-Allow-Origin']) bad('origin', 403);
  }
  if (p === '/auth' && m === 'POST') return auth(req, env);

  const me = await session(req, env);
  if (p === '/me' && m === 'GET') { await syncActive(env, me.id); return json({ user: await meOut(env, me.id) }); }
  if (p === '/me' && m === 'POST') return saveMe(req, env, me);
  if (p === '/me/points' && m === 'GET') return pointsLog(env, me);
  if (p === '/ideas' && m === 'POST') return idea(req, env, me);
  if (!me.phone || !me.agreed) bad('profile');
  if (me.blocked) bad('blocked', 403);
  if (p === '/rides' && m === 'POST') return createRide(req, env, me);
  if (p === '/rides/mine' && m === 'GET') return myRides(env, me);
  let mm;
  if ((mm = p.match(/^\/rides\/([\w-]{6,40})\/close$/)) && m === 'POST') return closeRide(env, me, mm[1]);
  if (p === '/search' && m === 'POST') return search(req, env, me);
  if (p === '/requests' && m === 'POST') return createRequest(req, env, me);
  if ((mm = p.match(/^\/requests\/([\w-]{6,40})$/)) && m === 'POST') return actRequest(req, env, me, mm[1]);
  if (p === '/inbox' && m === 'GET') return inbox(env, me);
  if (p === '/report' && m === 'POST') return report(req, env, me);
  if (p === '/ratings' && m === 'POST') return rate(req, env, me);
  bad('not found', 404);
}

/* ---------- עזרים ---------- */
function corsHeaders(origin) {
  const ok = ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { 'Vary': 'Origin' };
  if (ok) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
async function body(req) {
  try { const b = await req.json(); return b && typeof b === 'object' ? b : bad('bad json'); } catch (e) { bad('bad json'); }
}
const str = (v, max) => (typeof v === 'string' ? v.trim().replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '');
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : NaN);
function newId() {
  const ABC = '0123456789abcdefghijkmnopqrstuvwxyz';
  return [...crypto.getRandomValues(new Uint8Array(12))].map(x => ABC[x % ABC.length]).join('');
}
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = (s) => b64u(new TextEncoder().encode(s));
const unb64u = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));

function todayIL(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function nowHM() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}
const weekday = (date) => new Date(date + 'T12:00:00Z').getUTCDay();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const hm2min = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const min2hm = (x) => { x = ((Math.round(x) % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); };

function place(o, need = true) {
  if (!o || typeof o !== 'object') return need ? bad('place') : null;
  const lat = num(o.lat), lng = num(o.lng);
  // בערך ישראל והסביבה
  if (!(lat > 29 && lat < 33.5 && lng > 34 && lng < 36)) bad('place out of range');
  return { label: str(o.label, 120) || 'נקודה במפה', lat: +lat.toFixed(5), lng: +lng.toFixed(5) };
}
const phoneOk = (s) => /^0\d{8,9}$/.test(s.replace(/[\s-]/g, ''));
const normPhone = (s) => s.replace(/[\s-]/g, '');

function priceFor(segKm, rate) {
  if (!rate) return 0;
  return Math.max(MIN_PRICE, Math.round(segKm * rate));
}
// תעריף לפי יום ושעה: א' ביום חול, ב' בערב ובשבת ביום, ג' בלילה של שישי ושבת
function taxiRate(date, time) {
  const wd = date ? weekday(date) : 1, t = hm2min(time || '12:00');
  const day = t >= 360 && t <= 1260;
  if (wd === 6) return t >= 360 && t <= 1140 ? TAXI.b : TAXI.c;
  if (wd === 5 && !day) return t > 1380 || t < 360 ? TAXI.c : TAXI.b;
  return day ? TAXI.a : TAXI.b;
}
// הערכת מחיר מונית לנסיעה (₪, מעוגל)
function taxiFare(km, mins, date, time) {
  const r = taxiRate(date, time);
  return Math.round(TAXI.start + TAXI.booking + km * r + mins * r + Math.max(0, km - 10) * TAXI.over10);
}
// החלק של מצטרף. people = כל מי שבמונית (המזמין + המצטרפים)
function taxiShare(ride, segKm, people, date) {
  const fare = taxiFare(ride.km, ride.min, date || ride.date, ride.time);
  const part = ride.split === 'km' ? fare * Math.min(1, segKm / (ride.km || segKm)) / people : fare / people;
  return Math.max(MIN_PRICE, Math.round(part));
}
const isTaxi = (r) => r && r.kind === 'taxi';

/* ---------- כניסה וסשן ---------- */
async function hmac(env, data) {
  if (!env.SESSION_SECRET) bad('server not configured', 500);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}
async function makeToken(env, uid) {
  const payload = b64uStr(JSON.stringify({ u: uid, e: Date.now() + SESSION_DAYS * 864e5 }));
  return payload + '.' + await hmac(env, payload);
}
async function session(req, env) {
  const h = req.headers.get('Authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [payload, sig] = t.split('.');
  if (!payload || !sig) bad('login', 401);
  if (await hmac(env, payload) !== sig) bad('login', 401);
  let o; try { o = JSON.parse(unb64u(payload)); } catch (e) { bad('login', 401); }
  if (!o || !o.u || o.e < Date.now()) bad('login', 401);
  const u = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(o.u).first();
  if (!u) bad('login', 401);
  return u;
}
async function auth(req, env) {
  const b = await body(req);
  const cred = str(b.credential, 4000);
  if (!cred) bad('credential');
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred));
  if (!r.ok) bad('google', 401);
  const g = await r.json();
  if (g.aud !== env.GOOGLE_CLIENT_ID) bad('aud', 401);
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(g.iss)) bad('iss', 401);
  if (+g.exp * 1000 < Date.now()) bad('expired', 401);
  if (g.email_verified !== 'true' && g.email_verified !== true) bad('email', 401);
  const id = 'g' + g.sub;
  const now = Date.now();
  // קישור הזמנה (?ref=): רק למשתמש חדש, ולא לעצמו
  const existed = await env.DB.prepare('SELECT id FROM users WHERE id=?').bind(id).first();
  let refBy = null;
  const ref = str(b.ref, 12);
  if (!existed && /^[a-z0-9]{6,12}$/.test(ref)) {
    const rr = await env.DB.prepare('SELECT id FROM users WHERE ref_code=?').bind(ref).first();
    if (rr && rr.id !== id) refBy = rr.id;
  }
  await env.DB.prepare(
    `INSERT INTO users (id,email,name,pic,created,ref_by) VALUES (?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET email=excluded.email, pic=excluded.pic`
  ).bind(id, g.email || '', str(g.name, 60) || 'נהג/ת', str(g.picture, 300), now, refBy).run();
  await env.DB.prepare('UPDATE users SET ref_code=? WHERE id=? AND ref_code IS NULL').bind(newId().slice(0, 8), id).run();
  return json({ token: await makeToken(env, id), user: await meOut(env, id) });
}
function pubMe(u) {
  return {
    id: u.id, name: u.name, pic: u.pic, phone: u.phone || '', paybox: u.paybox || '', agreed: !!u.agreed,
    points: u.points || 0, rating: u.rating_n ? +(u.rating_sum / u.rating_n).toFixed(1) : null, ratingN: u.rating_n || 0,
    ready: !!(u.phone && u.agreed), board: u.board !== 0,
  };
}
// הפרופיל המלא: פרטים + דרגה + מה חסר לשלב הבא
async function meOut(env, uid) {
  const s = await refreshLevel(env, uid);
  const u = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(uid).first();
  if (!u.ref_code) {
    const code = newId().slice(0, 8);
    await env.DB.prepare('UPDATE users SET ref_code=? WHERE id=? AND ref_code IS NULL').bind(code, uid).run();
    u.ref_code = code;
  }
  return Object.assign(pubMe(u), {
    level: u.level || 0, amb: !!u.amb, refCode: u.ref_code,
    stats: { active: s.active, waiting: s.waiting, approved: s.approved, refs: s.refs },
  });
}

/* ---------- נקודות, דרגות ומוניטין ---------- */
const DAY = 864e5;
const ACTIVE_DAYS = 14;        // נסיעה קבועה פתוחה שבועיים = פעילה
const UPLOAD_PTS = { once: 2, regular: 5 };
const UPLOADS_PER_WEEK = 5;
const CANCEL_DAYS = 3;         // ביטול תוך 3 ימים מחזיר את נקודות ההעלאה
async function addPoints(env, uid, reason, pts, ride = null) {
  if (!pts) return;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO points_log (id,user_id,reason,points,ride,created) VALUES (?,?,?,?,?,?)').bind(newId(), uid, reason, pts, ride, Date.now()),
    env.DB.prepare('UPDATE users SET points=MAX(0,points+?) WHERE id=?').bind(pts, uid),
  ]);
}
async function userStats(env, uid) {
  return env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM rides WHERE driver=?1 AND active_bonus=1) active,
       (SELECT COUNT(*) FROM rides WHERE driver=?1 AND days IS NOT NULL AND COALESCE(kind,'car')<>'taxi' AND active_bonus=0 AND status='open' AND until>=?2) waiting,
       (SELECT COUNT(*) FROM requests q JOIN rides r ON r.id=q.ride WHERE r.driver=?1 AND q.status='approved') approved,
       (SELECT COUNT(*) FROM users x WHERE x.ref_by=?1 AND EXISTS (SELECT 1 FROM rides WHERE driver=x.id)) refs`
  ).bind(uid, todayIL()).first();
}
const levelOf = (s) => (s.active >= 10 || s.approved >= 30) ? 3 : (s.active >= 6 || s.approved >= 10) ? 2 : s.active >= 3 ? 1 : 0;
// דרגה שהושגה נשארת (גם אם טרמפ בוטל אחר כך)
async function refreshLevel(env, uid) {
  const s = await userStats(env, uid);
  const lv = levelOf(s), amb = s.refs >= 5 ? 1 : 0;
  await env.DB.prepare('UPDATE users SET level=MAX(COALESCE(level,0),?), amb=MAX(COALESCE(amb,0),?) WHERE id=?').bind(lv, amb, uid).run();
  return s;
}
// בונוס "פעילה": נסיעה קבועה שהייתה פתוחה שבועיים, או שמישהו הצטרף אליה. פעם אחת לכל נסיעה.
async function syncActive(env, uid) {
  const now = Date.now();
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.driver FROM rides r
     WHERE r.days IS NOT NULL AND COALESCE(r.kind,'car')<>'taxi' AND COALESCE(r.active_bonus,0)=0 ${uid ? 'AND r.driver=?3' : ''}
       AND ( (CASE WHEN r.status='open' THEN ?1 ELSE COALESCE(r.closed, r.created) END) - r.created >= ?2
             OR EXISTS (SELECT 1 FROM requests q WHERE q.ride=r.id AND q.status='approved') )
     LIMIT 500`
  ).bind(...(uid ? [now, ACTIVE_DAYS * DAY, uid] : [now, ACTIVE_DAYS * DAY])).all();
  const drivers = new Set();
  for (const r of results) {
    const u = await env.DB.prepare('UPDATE rides SET active_bonus=1 WHERE id=? AND COALESCE(active_bonus,0)=0').bind(r.id).run();
    if (u.meta.changes) { await addPoints(env, r.driver, 'active', 15, r.id); drivers.add(r.driver); }
  }
  if (!uid) {
    // פעם ביום: דרגות לכל הנהגים (גם שגרירים שהנהגים שלהם התחילו לנסוע)
    const all = await env.DB.prepare('SELECT DISTINCT driver FROM rides LIMIT 2000').all();
    for (const x of all.results) drivers.add(x.driver);
    const refs = await env.DB.prepare('SELECT DISTINCT ref_by FROM users WHERE ref_by IS NOT NULL LIMIT 2000').all();
    for (const x of refs.results) drivers.add(x.ref_by);
  }
  for (const d of drivers) await refreshLevel(env, d);
  return drivers.size;
}
const avgOf = (sum, n) => (n ? +(sum / n).toFixed(1) : null);
// ציון מוניטין למיון: נקודות, ודירוג מעל/מתחת ל-3 משפיע לפי מספר הדירוגים
function repOf(u) {
  const avg = u.rating_n ? u.rating_sum / u.rating_n : 3;
  return (u.points || 0) + (avg - 3) * 10 * Math.min(u.rating_n || 0, 10);
}
function monthStart() {
  const t = todayIL();
  // חצות בירושלים, בקירוב (שעון חורף +2, קיץ +3)
  return Date.parse(t.slice(0, 8) + '01T00:00:00+03:00');
}
async function pointsLog(env, me) {
  const { results } = await env.DB.prepare(
    `SELECT l.reason, l.points, l.created, r.from_label, r.to_label FROM points_log l LEFT JOIN rides r ON r.id=l.ride
     WHERE l.user_id=? ORDER BY l.created DESC LIMIT 40`
  ).bind(me.id).all();
  return json({ log: results });
}
async function leaders(env) {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.name, u.level, u.amb, u.rating_sum, u.rating_n, SUM(l.points) pts
     FROM points_log l JOIN users u ON u.id=l.user_id
     WHERE l.created>=? AND u.blocked=0 AND COALESCE(u.board,1)=1 AND EXISTS (SELECT 1 FROM rides WHERE driver=u.id)
     GROUP BY u.id HAVING pts>0 ORDER BY pts DESC, u.points DESC LIMIT 10`
  ).bind(monthStart()).all();
  return json({
    month: todayIL().slice(0, 7),
    leaders: results.map(x => ({ name: firstName(x.name), level: x.level || 0, amb: !!x.amb, rating: avgOf(x.rating_sum, x.rating_n), ratingN: x.rating_n || 0, points: x.pts, cert: (x.level || 0) >= 1 })),
  });
}

/* ---------- דירוגים ---------- */
async function rate(req, env, me) {
  const b = await body(req);
  const id = str(b.request, 40);
  const stars = Math.round(num(b.stars));
  if (!(stars >= 1 && stars <= 5)) bad('stars');
  const text = str(b.text, 200);
  const q = await env.DB.prepare(`SELECT q.id,q.ride,q.date,q.pass_time,q.rider,q.status,r.driver FROM requests q JOIN rides r ON r.id=q.ride WHERE q.id=?`).bind(id).first();
  if (!q) bad('not found', 404);
  if (q.status !== 'approved') bad('state');
  const today = todayIL();
  if (q.date > today || (q.date === today && hm2min(q.pass_time || '23:59') > hm2min(nowHM()))) bad('too early');
  let ratee, role;
  if (me.id === q.rider) { ratee = q.driver; role = 'driver'; }
  else if (me.id === q.driver) { ratee = q.rider; role = 'rider'; }
  else bad('not yours', 403);
  const ins = await env.DB.prepare(
    'INSERT OR IGNORE INTO ratings (id,request,rater,ratee,role,stars,text,created) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(newId(), q.id, me.id, ratee, role, stars, text, Date.now()).run();
  if (!ins.meta.changes) bad('already rated');
  await env.DB.prepare('UPDATE users SET rating_sum=rating_sum+?, rating_n=rating_n+1 WHERE id=?').bind(stars, ratee).run();
  if (stars === 5 && text.length >= 2) await addPoints(env, ratee, 'warm', 5, q.ride);
  return json({ ok: true });
}

async function saveMe(req, env, me) {
  const b = await body(req);
  const name = str(b.name, 40);
  const phone = normPhone(str(b.phone, 20));
  const paybox = str(b.paybox, 200);
  if (name.length < 2) bad('name');
  if (!phoneOk(phone)) bad('phone');
  if (paybox && !/^https:\/\/[\w.-]*(payboxapp|paybox)\.[\w./?=&%-]+$/i.test(paybox) && !phoneOk(paybox)) bad('paybox');
  if (b.agreed !== true) bad('agree');
  const board = b.board === false ? 0 : 1;
  await env.DB.prepare('UPDATE users SET name=?, phone=?, paybox=?, agreed=1, board=? WHERE id=?').bind(name, phone, paybox, board, me.id).run();
  return json({ user: await meOut(env, me.id) });
}

/* ---------- נסיעות ---------- */
async function createRide(req, env, me) {
  const b = await body(req);
  const from = place(b.from), to = place(b.to);
  const time = str(b.time, 5);
  if (!TIME_RE.test(time)) bad('time');
  const kind = b.kind === 'taxi' ? 'taxi' : 'car';
  const seats = Math.round(num(b.seats));
  if (!(seats >= 1 && seats <= (kind === 'taxi' ? TAXI.maxJoin : 6))) bad('seats');
  let rate = 0, split = null;
  if (kind === 'taxi') {
    // במונית אין תעריפון לק"מ: מתחלקים במונה
    split = b.split === 'km' ? 'km' : 'equal';
  } else {
    rate = num(b.rate);
    if (!(rate === 0 || (rate >= 1 && rate <= MAX_RATE))) bad('rate');
    rate = Math.round(rate * 10) / 10;
  }
  const km = num(b.km), mins = num(b.min);
  if (!(km > 0.3 && km < 600) || !(mins > 0 && mins < 900)) bad('route');
  let pts = Array.isArray(b.route) ? b.route : [];
  pts = pts.filter(q => Array.isArray(q) && isFinite(q[0]) && isFinite(q[1])).map(q => [+(+q[0]).toFixed(5), +(+q[1]).toFixed(5)]);
  if (pts.length < 2 || pts.length > 1500) bad('route');
  const note = str(b.note, 200);

  let date = null, days = null, start = null, until = null;
  const today = todayIL();
  if (Array.isArray(b.days) && b.days.length) {
    const ds = [...new Set(b.days.map(Number).filter(d => d >= 0 && d <= 6))].sort();
    if (!ds.length) bad('days');
    days = ds.join(',');
    start = DATE_RE.test(b.start || '') && b.start >= today ? b.start : today;
    until = todayIL(56); // שמונה שבועות, אחר כך מחדשים בלחיצה
  } else {
    date = str(b.date, 10);
    if (!DATE_RE.test(date) || date < today || date > todayIL(30)) bad('date');
  }
  const open = await env.DB.prepare(`SELECT COUNT(*) n FROM rides WHERE driver=? AND status='open' AND (date>=? OR until>=?)`).bind(me.id, today, today).first();
  if (open.n >= 30) bad('too many rides');

  const id = newId();
  await env.DB.prepare(
    `INSERT INTO rides (id,driver,from_label,from_lat,from_lng,to_label,to_lat,to_lng,date,days,start,until,time,seats,rate,km,min,route,note,created,kind,split)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, me.id, from.label, from.lat, from.lng, to.label, to.lat, to.lng, date, days, start, until, time, seats, rate,
    Math.round(km * 10) / 10, Math.round(mins), JSON.stringify(pts), note, Date.now(), kind, split).run();
  const out = { id, kind, points: 0 };
  if (kind === 'taxi') out.fare = taxiFare(Math.round(km * 10) / 10, Math.round(mins), date || start, time);
  // נקודות על עצם ההעלאה (רק רכב פרטי): עד 5 בשבוע
  if (kind !== 'taxi') {
    const wk = await env.DB.prepare('SELECT COUNT(*) n FROM rides WHERE driver=? AND pts_upload>0 AND created>?').bind(me.id, Date.now() - 7 * DAY).first();
    if (wk.n < UPLOADS_PER_WEEK) {
      out.points = days ? UPLOAD_PTS.regular : UPLOAD_PTS.once;
      await env.DB.prepare('UPDATE rides SET pts_upload=? WHERE id=?').bind(out.points, id).run();
      await addPoints(env, me.id, days ? 'upload_regular' : 'upload', out.points, id);
    }
    // נהג שהגיע בהזמנה: השגריר מתקדם
    if (me.ref_by) await refreshLevel(env, me.ref_by);
  }
  return json({ ride: out });
}
async function myRides(env, me) {
  await syncActive(env, me.id);
  const today = todayIL();
  const { results } = await env.DB.prepare(
    `SELECT id,from_label,to_label,date,days,start,until,time,seats,rate,km,min,note,status,kind,split,created,
       COALESCE(active_bonus,0) active, COALESCE(pts_upload,0) pts,
       (SELECT COUNT(*) FROM requests q WHERE q.ride=rides.id AND q.status='pending' AND q.date>=?) pending,
       (SELECT COUNT(*) FROM requests q WHERE q.ride=rides.id AND q.status='approved' AND q.date>=?) approved
     FROM rides WHERE driver=? AND status='open' AND (date>=? OR until>=?) ORDER BY COALESCE(date,start), time LIMIT 60`
  ).bind(today, today, me.id, today, today).all();
  for (const r of results) if (isTaxi(r)) r.fare = taxiFare(r.km, r.min, r.date || r.start, r.time);
  return json({ rides: results });
}
async function closeRide(env, me, id) {
  const ride = await env.DB.prepare(`SELECT id,created,COALESCE(pts_upload,0) pts FROM rides WHERE id=? AND driver=? AND status='open'`).bind(id, me.id).first();
  if (!ride) bad('not found', 404);
  const now = Date.now();
  await env.DB.prepare(`UPDATE rides SET status='closed', closed=? WHERE id=?`).bind(now, id).run();
  // ביטול מהר (תוך 3 ימים) מחזיר את נקודות ההעלאה
  if (ride.pts > 0 && now - ride.created < CANCEL_DAYS * DAY) {
    await env.DB.prepare('UPDATE rides SET pts_upload=0 WHERE id=?').bind(id).run();
    await addPoints(env, me.id, 'upload_cancel', -ride.pts, id);
  }
  await env.DB.prepare(`UPDATE requests SET status='cancelled', updated=? WHERE ride=? AND status IN ('pending','approved') AND date>=?`)
    .bind(Date.now(), id, todayIL()).run();
  return json({ ok: true });
}

/* ---------- גאומטריה ---------- */
function toXY(lat, lng, lat0) { return [lng * Math.cos(lat0 * Math.PI / 180) * 111.32, lat * 110.574]; }
// הנקודה הקרובה ביותר על המסלול: מרחק (ק"מ), ואיפה לאורך המסלול (ק"מ מההתחלה)
function nearest(route, cum, lat, lng) {
  const lat0 = lat;
  const [px, py] = toXY(lat, lng, lat0);
  let best = { d: Infinity, along: 0 };
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, ay] = toXY(route[i][0], route[i][1], lat0);
    const [bx, by] = toXY(route[i + 1][0], route[i + 1][1], lat0);
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * dx, qy = ay + t * dy;
    const d = Math.hypot(px - qx, py - qy);
    if (d < best.d) best = { d, along: cum[i] + t * (cum[i + 1] - cum[i]) };
  }
  return best;
}
function cumulative(route) {
  const lat0 = route[0][0];
  const c = [0];
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = toXY(route[i - 1][0], route[i - 1][1], lat0);
    const [bx, by] = toXY(route[i][0], route[i][1], lat0);
    c.push(c[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  return c;
}
function bboxNear(route, lat, lng, padKm) {
  const pLat = padKm / 110.574, pLng = padKm / 94;
  let a = 90, b = -90, c = 180, d = -180;
  for (const [y, x] of route) { if (y < a) a = y; if (y > b) b = y; if (x < c) c = x; if (x > d) d = x; }
  return lat >= a - pLat && lat <= b + pLat && lng >= c - pLng && lng <= d + pLng;
}

function matchRide(r, from, to, radius) {
  let route; try { route = JSON.parse(r.route); } catch (e) { return null; }
  if (!route || route.length < 2) return null;
  if (!bboxNear(route, from.lat, from.lng, radius) || !bboxNear(route, to.lat, to.lng, radius)) return null;
  const cum = cumulative(route);
  const total = cum[cum.length - 1] || 1;
  const a = nearest(route, cum, from.lat, from.lng);
  const b = nearest(route, cum, to.lat, to.lng);
  if (a.d > radius || b.d > radius || b.along <= a.along) return null;
  // ק"מ אמיתיים לפי מה שהנהג קיבל מהמפה (המסלול המפושט קצר מעט)
  const scale = r.km / total;
  const segKm = Math.max(0.5, (b.along - a.along) * scale);
  const passMin = hm2min(r.time) + (a.along / total) * r.min;
  return { segKm: Math.round(segKm * 10) / 10, pickupKm: Math.round(a.d * 10) / 10, dropKm: Math.round(b.d * 10) / 10, pass: min2hm(passMin), passMin };
}

async function search(req, env, me) {
  const b = await body(req);
  const from = place(b.from), to = place(b.to);
  const radius = Math.min(5, Math.max(0.5, num(b.radius) || 2));
  const today = todayIL();
  let dates = Array.isArray(b.dates) ? b.dates.filter(d => DATE_RE.test(d) && d >= today && d <= todayIL(30)) : [];
  dates = [...new Set(dates)].sort().slice(0, 8);
  if (!dates.length) dates = [today];
  const first = dates[0], last = dates[dates.length - 1];
  const { results } = await env.DB.prepare(
    `SELECT r.*, u.name dname, u.pic dpic, u.rating_sum, u.rating_n, u.points, COALESCE(u.level,0) dlevel, COALESCE(u.amb,0) damb
     FROM rides r JOIN users u ON u.id=r.driver
     WHERE r.status='open' AND u.blocked=0 AND r.driver<>?
       AND ((r.date BETWEEN ? AND ?) OR (r.days IS NOT NULL AND r.start<=? AND r.until>=?))
     LIMIT 600`
  ).bind(me.id, first, last, last, first).all();
  const now = nowHM();
  const out = [];
  const taken = new Map();
  for (const r of results) {
    const m = matchRide(r, from, to, radius);
    if (!m) continue;
    for (const d of dates) {
      if (r.date ? r.date !== d : !(r.days.split(',').includes(String(weekday(d))) && d >= r.start && d <= r.until)) continue;
      if (d === today && m.passMin < hm2min(now) - 5) continue;
      const key = r.id + '|' + d;
      if (!taken.has(key)) {
        const c = await env.DB.prepare(`SELECT COUNT(*) n FROM requests WHERE ride=? AND date=? AND status='approved'`).bind(r.id, d).first();
        taken.set(key, c.n);
      }
      const left = r.seats - taken.get(key);
      if (left <= 0) continue;
      const mine = await env.DB.prepare(`SELECT id,status FROM requests WHERE ride=? AND date=? AND rider=? AND status IN ('pending','approved')`).bind(r.id, d, me.id).first();
      const taxi = isTaxi(r) ? taxiInfo(r, m, d, taken.get(key) + (mine && mine.status === 'approved' ? 1 : 2)) : null;
      out.push({
        ride: r.id, date: d, time: r.time, pass: m.pass, from: r.from_label, to: r.to_label, kind: r.kind || 'car',
        pickupKm: m.pickupKm, dropKm: m.dropKm, segKm: m.segKm, rate: r.rate, price: taxi ? taxi.share : priceFor(m.segKm, r.rate),
        seatsLeft: left, note: r.note || '', regular: !!r.days, taxi,
        driver: { name: firstName(r.dname), pic: r.dpic || '', rating: r.rating_n ? +(r.rating_sum / r.rating_n).toFixed(1) : null, ratingN: r.rating_n || 0, points: r.points || 0, level: r.dlevel, amb: !!r.damb },
        mine: mine ? { id: mine.id, status: mine.status } : null,
        _d: r.driver, _min: m.passMin, _rep: repOf(r) + (r.dlevel >= 2 ? 1e5 : 0),
      });
    }
  }
  // קודם התאמה: יום, חצי שעה, איסוף עד ק"מ. בתוך תוצאות קרובות – קודם נהגים מובילים (דרגה 2+, ואז נקודות ודירוג).
  const tier = (x) => [x.date, Math.floor(x._min / 30), x.pickupKm <= 1 ? 0 : 1];
  out.sort((x, y) => {
    const a = tier(x), b = tier(y);
    return a[0].localeCompare(b[0]) || a[1] - b[1] || a[2] - b[2] || y._rep - x._rep || x.pickupKm - y.pickupKm || x._min - y._min;
  });
  const list = out.slice(0, 80);
  // שתי התגובות האחרונות על כל נהג (כנהג), בלי מוסתרות
  const said = new Map();
  for (const x of list) {
    if (!said.has(x._d)) {
      const { results: rs } = await env.DB.prepare(
        `SELECT t.id, t.stars, t.text, u.name FROM ratings t JOIN users u ON u.id=t.rater
         WHERE t.ratee=? AND t.role='driver' AND t.text<>'' AND COALESCE(t.hidden,0)=0 ORDER BY t.created DESC LIMIT 2`
      ).bind(x._d).all();
      said.set(x._d, rs.map(c => ({ id: c.id, stars: c.stars, text: c.text, by: firstName(c.name) })));
    }
    x.driver.said = said.get(x._d);
    delete x._d; delete x._min; delete x._rep;
  }
  return json({ matches: list });
}
// כרטיס מונית: המחיר המלא, החלק של המבקש, וכמה הוא חוסך מול מונית לבד
function taxiInfo(r, m, d, people) {
  const fare = taxiFare(r.km, r.min, d, r.time);
  const share = taxiShare(r, m.segKm, people, d);
  const segMin = r.min * Math.min(1, m.segKm / (r.km || m.segKm));
  const alone = taxiFare(m.segKm, segMin, d, m.pass);
  return { fare, share, people, split: r.split || 'equal', alone, save: Math.max(0, alone - share) };
}
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || 'נהג/ת';

/* ---------- בקשות ---------- */
async function createRequest(req, env, me) {
  const b = await body(req);
  const rideId = str(b.ride, 40), date = str(b.date, 10);
  if (!DATE_RE.test(date) || date < todayIL()) bad('date');
  const pickup = place(b.pickup), drop = place(b.drop);
  const mode = b.mode === 'free' ? 'free' : 'paid';
  const msg = str(b.msg, 200);
  const r = await env.DB.prepare(`SELECT * FROM rides WHERE id=? AND status='open'`).bind(rideId).first();
  if (!r) bad('ride gone', 404);
  if (r.driver === me.id) bad('own ride');
  if (r.date ? r.date !== date : !(r.days.split(',').includes(String(weekday(date))) && date >= r.start && date <= r.until)) bad('date');
  const m = matchRide(r, pickup, drop, 5);
  if (!m) bad('not on route');
  const dup = await env.DB.prepare(`SELECT id FROM requests WHERE ride=? AND date=? AND rider=? AND status IN ('pending','approved')`).bind(rideId, date, me.id).first();
  if (dup) return json({ request: { id: dup.id, dup: true } });
  const cnt = await env.DB.prepare(`SELECT COUNT(*) n FROM requests WHERE rider=? AND created>?`).bind(me.id, Date.now() - 864e5).first();
  if (cnt.n >= 25) bad('too many requests');
  const id = newId();
  let price;
  if (isTaxi(r)) {
    const c = await env.DB.prepare(`SELECT COUNT(*) n FROM requests WHERE ride=? AND date=? AND status='approved'`).bind(rideId, date).first();
    if (c.n >= r.seats) bad('full');
    price = taxiShare(r, m.segKm, c.n + 2, date);
  } else price = mode === 'free' ? 0 : priceFor(m.segKm, r.rate);
  await env.DB.prepare(
    `INSERT INTO requests (id,ride,date,rider,pickup_label,pickup_lat,pickup_lng,drop_label,drop_lat,drop_lng,seg_km,price,pass_time,mode,msg,created)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, rideId, date, me.id, pickup.label, pickup.lat, pickup.lng, drop.label, drop.lat, drop.lng, m.segKm, price, m.pass, mode, msg, Date.now()).run();
  return json({ request: { id } });
}
async function actRequest(req, env, me, id) {
  const b = await body(req);
  const action = b.action;
  const q = await env.DB.prepare(`SELECT q.*, r.driver, r.seats, r.kind, r.split, r.km, r.min, r.time, r.date rdate FROM requests q JOIN rides r ON r.id=q.ride WHERE q.id=?`).bind(id).first();
  if (!q) bad('not found', 404);
  const now = Date.now();
  if (action === 'cancel') {
    if (q.rider !== me.id && q.driver !== me.id) bad('not yours', 403);
    if (!['pending', 'approved'].includes(q.status)) bad('state');
    await env.DB.prepare(`UPDATE requests SET status='cancelled', updated=? WHERE id=?`).bind(now, id).run();
    // מי שאישר וביטל: נקודות האישור חוזרות
    if (q.status === 'approved' && me.id === q.driver) await addPoints(env, me.id, 'approve_cancel', q.price || isTaxi(q) ? -10 : -15, q.ride);
    if (isTaxi(q) && q.status === 'approved') await retaxi(env, q.ride, q.date);
    return json({ ok: true });
  }
  if (q.driver !== me.id) bad('not yours', 403);
  if (q.status !== 'pending') bad('state');
  if (action === 'decline') {
    await env.DB.prepare(`UPDATE requests SET status='declined', updated=? WHERE id=?`).bind(now, id).run();
    return json({ ok: true });
  }
  if (action === 'approve') {
    const c = await env.DB.prepare(`SELECT COUNT(*) n FROM requests WHERE ride=? AND date=? AND status='approved'`).bind(q.ride, q.date).first();
    if (c.n >= q.seats) bad('full');
    // הנהג מחליט סופית: חינם או בתשלום, עד המחיר שחושב
    let price = q.price;
    if (b.free === true) price = 0;
    await env.DB.prepare(`UPDATE requests SET status='approved', price=?, updated=? WHERE id=?`).bind(price, now, id).run();
    // נקודות חסד: 10 על כל טרמפ שאושר, ועוד 5 כשהוא בחינם. במונית: 10 למי שמשתף, כי כולם חוסכים
    await addPoints(env, me.id, price || isTaxi(q) ? 'approve' : 'approve_free', price || isTaxi(q) ? 10 : 15, q.ride);
    await refreshLevel(env, me.id);
    // במונית: מצטרף חדש מקטין את החלק של כל מי שכבר אושר
    if (isTaxi(q)) await retaxi(env, q.ride, q.date);
    return json({ ok: true });
  }
  bad('action');
}
// מחשב מחדש את החלק של כל המאושרים במונית (כשמצטרף עוד אחד או כשמישהו מבטל)
async function retaxi(env, rideId, date) {
  const r = await env.DB.prepare('SELECT kind,split,km,min,time,date FROM rides WHERE id=?').bind(rideId).first();
  if (!isTaxi(r)) return;
  const { results } = await env.DB.prepare(`SELECT id,seg_km,price FROM requests WHERE ride=? AND date=? AND status='approved'`).bind(rideId, date).all();
  for (const x of results) {
    if (x.price === 0) continue; // המזמין ויתר על החלק של המצטרף
    const p = taxiShare(r, x.seg_km, results.length + 1, date);
    if (p !== x.price) await env.DB.prepare('UPDATE requests SET price=? WHERE id=?').bind(p, x.id).run();
  }
}
async function inbox(env, me) {
  const since = todayIL(-1), past = todayIL(-14), today = todayIL(), nowMin = hm2min(nowHM());
  // אפשר לדרג אחרי שעבר מועד האיסוף; טרמפים שעברו ועוד לא דורגו נשארים כאן שבועיים
  const canRate = (x) => x.status === 'approved' && !x.rated && (x.date < today || (x.date === today && hm2min(x.pass_time || '23:59') <= nowMin));
  const asDriver = (await env.DB.prepare(
    `SELECT q.id,q.ride,q.date,q.status,q.mode,q.price,q.seg_km,q.pass_time,q.msg,q.pickup_label,q.pickup_lat,q.pickup_lng,q.drop_label,q.created,
       r.from_label,r.to_label,r.time,r.kind,r.split,r.km rkm,r.min rmin, u.name rname, u.pic rpic, u.phone rphone, u.rating_sum, u.rating_n, u.id rid,
       (SELECT stars FROM ratings t WHERE t.request=q.id AND t.rater=?1) rated
     FROM requests q JOIN rides r ON r.id=q.ride JOIN users u ON u.id=q.rider
     WHERE r.driver=?1 AND ((q.date>=?2 AND q.status IN ('pending','approved'))
       OR (q.status='approved' AND q.date>=?3 AND NOT EXISTS (SELECT 1 FROM ratings t WHERE t.request=q.id AND t.rater=?1)))
     ORDER BY q.date, q.pass_time LIMIT 100`
  ).bind(me.id, since, past).all()).results.map(x => ({
    id: x.id, ride: x.ride, date: x.date, status: x.status, mode: x.mode, price: x.price, segKm: x.seg_km, pass: x.pass_time, msg: x.msg,
    canRate: canRate(x), rated: x.rated || 0,
    pickup: { label: x.pickup_label, lat: x.pickup_lat, lng: x.pickup_lng }, drop: x.drop_label, from: x.from_label, to: x.to_label, time: x.time,
    kind: x.kind || 'car', split: x.split, fare: isTaxi(x) ? taxiFare(x.rkm, x.rmin, x.date, x.time) : null,
    rider: { id: x.rid, name: x.rname, pic: x.rpic, rating: x.rating_n ? +(x.rating_sum / x.rating_n).toFixed(1) : null, phone: x.status === 'approved' ? x.rphone : '' },
  }));
  const asRider = (await env.DB.prepare(
    `SELECT q.id,q.ride,q.date,q.status,q.mode,q.price,q.seg_km,q.pass_time,q.pickup_label,q.pickup_lat,q.pickup_lng,q.drop_label,
       r.from_label,r.to_label,r.time,r.kind,r.split,r.km rkm,r.min rmin, u.name dname, u.pic dpic, u.phone dphone, u.paybox, u.id did,
       (SELECT stars FROM ratings t WHERE t.request=q.id AND t.rater=?1) rated
     FROM requests q JOIN rides r ON r.id=q.ride JOIN users u ON u.id=r.driver
     WHERE q.rider=?1 AND (q.date>=?2
       OR (q.status='approved' AND q.date>=?3 AND NOT EXISTS (SELECT 1 FROM ratings t WHERE t.request=q.id AND t.rater=?1)))
     ORDER BY q.date, q.pass_time LIMIT 100`
  ).bind(me.id, since, past).all()).results.map(x => ({
    id: x.id, ride: x.ride, date: x.date, status: x.status, mode: x.mode, price: x.price, segKm: x.seg_km, pass: x.pass_time,
    canRate: canRate(x), rated: x.rated || 0,
    pickup: { label: x.pickup_label, lat: x.pickup_lat, lng: x.pickup_lng }, drop: x.drop_label, from: x.from_label, to: x.to_label, time: x.time,
    kind: x.kind || 'car', split: x.split, fare: isTaxi(x) ? taxiFare(x.rkm, x.rmin, x.date, x.time) : null,
    driver: { id: x.did, name: x.status === 'approved' ? x.dname : firstName(x.dname), pic: x.dpic,
      phone: x.status === 'approved' ? x.dphone : '', paybox: x.status === 'approved' ? (x.paybox || '') : '' },
  }));
  return json({ asDriver, asRider });
}

/* ---------- דיווח, רעיונות, מונים ---------- */
async function report(req, env, me) {
  const b = await body(req);
  const text = str(b.text, 600);
  if (text.length < 3) bad('text');
  // דיווח על תגובה: מסתירים אותה אחרי שני מדווחים שונים, וגילעד רואה בדף הניהול
  const ratingId = str(b.rating, 40);
  let about = str(b.about, 40);
  if (ratingId) {
    const t = await env.DB.prepare('SELECT ratee FROM ratings WHERE id=?').bind(ratingId).first();
    if (!t) bad('not found', 404);
    about = t.ratee;
    const dup = await env.DB.prepare('SELECT id FROM reports WHERE rating=? AND by_user=?').bind(ratingId, me.id).first();
    if (dup) return json({ ok: true });
  }
  await env.DB.prepare('INSERT INTO reports (id,by_user,about_user,ride,text,created,rating) VALUES (?,?,?,?,?,?,?)')
    .bind(newId(), me.id, about, str(b.ride, 40), text, Date.now(), ratingId || null).run();
  if (ratingId) {
    const n = await env.DB.prepare('SELECT COUNT(DISTINCT by_user) n FROM reports WHERE rating=?').bind(ratingId).first();
    if (n.n >= 2) await env.DB.prepare('UPDATE ratings SET hidden=1 WHERE id=?').bind(ratingId).run();
  }
  return json({ ok: true });
}
async function idea(req, env, me) {
  const b = await body(req);
  const text = str(b.text, 800);
  if (text.length < 3) bad('text');
  await env.DB.prepare('INSERT INTO ideas (id,by_user,text,created) VALUES (?,?,?,?)').bind(newId(), me.id, text, Date.now()).run();
  return json({ ok: true });
}
async function stats(env) {
  const today = todayIL();
  const r = await env.DB.prepare(`SELECT COUNT(*) n FROM rides WHERE status='open' AND (date>=? OR until>=?)`).bind(today, today).first();
  const u = await env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE agreed=1`).first();
  const j = await env.DB.prepare(`SELECT COUNT(*) n FROM requests WHERE status='approved'`).first();
  const t = await env.DB.prepare(`SELECT COUNT(*) n FROM rides WHERE kind='taxi' AND status='open' AND (date>=? OR until>=?)`).bind(today, today).first();
  return json({ rides: r.n, users: u.n, joined: j.n, taxis: t.n });
}

/* ---------- ניהול (לגילעד): זכאים לתעודה, רעיונות, דיווחים ---------- */
async function adminKeyOk(env, key) {
  if (!env.ADMIN_KEY || typeof key !== 'string' || key.length < 16) return false;
  // השוואה בזמן קבוע
  const a = new TextEncoder().encode(key), b = new TextEncoder().encode(env.ADMIN_KEY);
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
async function admin(req, env, p) {
  const b = await body(req);
  if (!(await adminKeyOk(env, b.key))) bad('key', 403);
  if (p === '/admin/data') {
    await syncActive(env, null);
    const people = (await env.DB.prepare(
      `SELECT id,name,email,phone,points,level,amb,cert_sent,rating_sum,rating_n,created FROM users
       WHERE COALESCE(level,0)>=1 OR COALESCE(amb,0)=1 ORDER BY level DESC, points DESC LIMIT 300`
    ).all()).results;
    for (const u of people) Object.assign(u, await userStats(env, u.id));
    const ideas = (await env.DB.prepare(
      `SELECT i.text,i.created,u.name,u.email FROM ideas i LEFT JOIN users u ON u.id=i.by_user ORDER BY i.created DESC LIMIT 100`
    ).all()).results;
    const reports = (await env.DB.prepare(
      `SELECT r.id,r.text,r.created,r.rating,b.name by_name,a.name about_name,a.email about_email,t.text rtext,t.stars,COALESCE(t.hidden,0) hidden
       FROM reports r LEFT JOIN users b ON b.id=r.by_user LEFT JOIN users a ON a.id=r.about_user LEFT JOIN ratings t ON t.id=r.rating
       ORDER BY r.created DESC LIMIT 100`
    ).all()).results;
    const totals = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM users WHERE agreed=1) users, (SELECT COUNT(*) FROM rides) rides,
         (SELECT COUNT(*) FROM requests WHERE status='approved') approved, (SELECT COUNT(*) FROM ratings) ratings`
    ).first();
    return json({ people, ideas, reports, totals });
  }
  if (p === '/admin/act') {
    const id = str(b.id, 60);
    if (b.action === 'cert') await env.DB.prepare('UPDATE users SET cert_sent=? WHERE id=?').bind(b.on === false ? 0 : Date.now(), id).run();
    else if (b.action === 'hide' || b.action === 'unhide') await env.DB.prepare('UPDATE ratings SET hidden=? WHERE id=?').bind(b.action === 'hide' ? 1 : 0, id).run();
    else bad('action');
    return json({ ok: true });
  }
  bad('not found', 404);
}
const ADMIN_JS = String.raw`
var key = (location.hash.match(/key=([^&]+)/) || [])[1] || localStorage.getItem('trempim_admin') || '';
if (location.hash) history.replaceState(null, '', location.pathname);
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var LV = ['', '🥉 נהג חסד', '🥈 נהג קבוע', '🥇 עמוד התווך'];
var d8 = function (t) { return t ? new Date(t).toLocaleDateString('he-IL') : ''; };
function post(path, data) { data.key = key; return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function (r) { if (r.status === 403) throw new Error('key'); return r.json(); }); }
function load() {
  document.getElementById('out').textContent = 'טוען...';
  post('/admin/data', {}).then(function (j) {
    localStorage.setItem('trempim_admin', key); document.getElementById('login').hidden = true;
    var t = j.totals, h = '<p class="muted">' + t.users + ' חברים · ' + t.rides + ' נסיעות · ' + t.approved + ' טרמפים שאושרו · ' + t.ratings + ' דירוגים</p>';
    h += '<h2>זכאים לתעודה מודפסת (עמוד התווך)</h2><div class="box"><table><tr><th>שם</th><th>טלפון</th><th>מייל</th><th>פעילות</th><th>טרמפים</th><th>נקודות</th><th>תעודה</th></tr>';
    var gold = j.people.filter(function (u) { return u.level >= 3; });
    h += gold.length ? gold.map(function (u) { return '<tr><td class="lv3">' + esc(u.name) + '</td><td dir="ltr">' + esc(u.phone) + '</td><td dir="ltr">' + esc(u.email) + '</td><td>' + u.active + '</td><td>' + u.approved + '</td><td>' + u.points + '</td><td>' +
      (u.cert_sent ? 'נשלחה ' + d8(u.cert_sent) + ' <button data-cert="' + u.id + '" data-on="0">ביטול</button>' : '<button data-cert="' + u.id + '" data-on="1">סמן שנשלחה</button>') + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="muted">עוד אין. מגיעים אחרי 10 נסיעות קבועות פעילות או 30 טרמפים.</td></tr>';
    h += '</table></div><h2>כל בעלי התגים</h2><div class="box"><table><tr><th>שם</th><th>תג</th><th>שגריר</th><th>פעילות</th><th>טרמפים</th><th>הביא נהגים</th><th>דירוג</th><th>נקודות</th></tr>' +
      (j.people.map(function (u) { return '<tr><td>' + esc(u.name) + '</td><td>' + (LV[u.level] || '') + '</td><td>' + (u.amb ? '💎' : '') + '</td><td>' + u.active + '</td><td>' + u.approved + '</td><td>' + u.refs + '</td><td>' + (u.rating_n ? (u.rating_sum / u.rating_n).toFixed(1) + ' (' + u.rating_n + ')' : '') + '</td><td>' + u.points + '</td></tr>'; }).join('') || '<tr><td colspan="8" class="muted">עוד אין.</td></tr>') + '</table></div>';
    h += '<h2>דיווחים</h2><div class="box"><table><tr><th>מתי</th><th>מי דיווח</th><th>על מי</th><th>מה</th><th>תגובה</th></tr>' +
      (j.reports.map(function (r) { return '<tr><td>' + d8(r.created) + '</td><td>' + esc(r.by_name) + '</td><td>' + esc(r.about_name) + '<div class="muted" dir="ltr">' + esc(r.about_email) + '</div></td><td>' + esc(r.text) + '</td><td>' +
        (r.rating ? '★' + r.stars + ' "' + esc(r.rtext) + '" <button data-hide="' + r.rating + '" data-act="' + (r.hidden ? 'unhide' : 'hide') + '">' + (r.hidden ? 'להחזיר' : 'להסתיר') + '</button>' : '') + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="muted">אין דיווחים.</td></tr>') + '</table></div>';
    h += '<h2>רעיונות</h2><div class="box"><table><tr><th>מתי</th><th>מי</th><th>רעיון</th></tr>' +
      (j.ideas.map(function (i) { return '<tr><td>' + d8(i.created) + '</td><td>' + esc(i.name) + '</td><td>' + esc(i.text) + '</td></tr>'; }).join('') || '<tr><td colspan="3" class="muted">אין עדיין.</td></tr>') + '</table></div>';
    document.getElementById('out').innerHTML = h;
  }).catch(function (e) { document.getElementById('login').hidden = false; document.getElementById('out').textContent = e.message === 'key' ? 'המפתח לא נכון.' : 'שגיאה בטעינה.'; if (e.message === 'key') localStorage.removeItem('trempim_admin'); });
}
document.getElementById('go').onclick = function () { key = document.getElementById('k').value.trim(); load(); };
document.getElementById('out').onclick = function (e) {
  var c = e.target.closest('[data-cert]'), hd = e.target.closest('[data-hide]');
  if (c) post('/admin/act', { action: 'cert', id: c.getAttribute('data-cert'), on: c.getAttribute('data-on') === '1' }).then(load);
  if (hd) post('/admin/act', { action: hd.getAttribute('data-act'), id: hd.getAttribute('data-hide') }).then(load);
};
if (key) load();
`;
function adminPage() {
  const html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex"><title>טרמפים – ניהול</title><style>' +
    'body{font-family:Assistant,Arial,sans-serif;background:#14110c;color:#eee4cf;margin:0;padding:16px;line-height:1.5}' +
    'h1,h2{color:#d8b35f;margin:.6em 0 .3em}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #3a3226;padding:6px;text-align:right;vertical-align:top}' +
    'th{color:#d8b35f}button{font:inherit;background:#2a2318;color:#eee4cf;border:1px solid #d8b35f;border-radius:8px;padding:3px 10px;cursor:pointer}' +
    '.box{overflow-x:auto}.muted{color:#a89c84}.lv3{color:#ffd76a;font-weight:700}input{font:inherit;padding:6px;border-radius:8px;border:1px solid #555;background:#000;color:#fff;width:100%;max-width:420px}' +
    '</style></head><body><h1>טרמפים – ניהול</h1><div id="login"><p>המפתח נשמר בדפדפן הזה בלבד.</p><input id="k" type="password" placeholder="מפתח ניהול"> <button id="go">כניסה</button></div><div id="out"></div>' +
    '<script>' + ADMIN_JS + '</script></body></html>';
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
    'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'" } });
}
