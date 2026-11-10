// טרמפים – מיזם חסד: נהגים מפרסמים מסלול, טרמפיסטים מוצאים מי עובר לידם ושולחים בקשה.
// Cloudflare Worker + D1 (binding DB). כניסה עם גוגל: הדף שולח credential של Google Identity,
// השרת מאמת אותו מול Google ומחזיר אסימון סשן חתום (HMAC, 60 יום).
//
//  POST /auth            {credential}                 -> {token, user}
//  GET  /me                                          -> {user}
//  POST /me              {name, phone, paybox, agreed} -> {user}
//  POST /rides           {...}                        -> {ride}
//  GET  /rides/mine                                  -> {rides}
//  POST /rides/:id/close                             -> {ok}
//  POST /search          {from, to, dates[], radius}  -> {matches}
//  POST /requests        {ride, date, pickup, drop, mode, msg} -> {request}
//  POST /requests/:id    {action: approve|decline|cancel}       -> {ok}
//  GET  /inbox                                       -> {asDriver, asRider}
//  POST /report          {about, ride, text}          -> {ok}
//  POST /ideas           {text}                       -> {ok}
//  GET  /stats                                       -> {rides, users, joined}
//
// סודות (wrangler secret put): SESSION_SECRET. משתנים: GOOGLE_CLIENT_ID.

const ORIGINS = ['https://gilad-rachamim.github.io'];
const TZ = 'Asia/Jerusalem';
const MIN_PRICE = 5;
const MAX_RATE = 1.5;
const SESSION_DAYS = 60;

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
};

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };

async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;
  if (p === '/stats' && m === 'GET') return stats(env);
  if (m === 'POST') {
    const origin = req.headers.get('Origin') || '';
    if (!corsHeaders(origin)['Access-Control-Allow-Origin']) bad('origin', 403);
  }
  if (p === '/auth' && m === 'POST') return auth(req, env);

  const me = await session(req, env);
  if (p === '/me' && m === 'GET') return json({ user: pubMe(me) });
  if (p === '/me' && m === 'POST') return saveMe(req, env, me);
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
  await env.DB.prepare(
    `INSERT INTO users (id,email,name,pic,created) VALUES (?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET email=excluded.email, pic=excluded.pic`
  ).bind(id, g.email || '', str(g.name, 60) || 'נהג/ת', str(g.picture, 300), now).run();
  const u = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first();
  return json({ token: await makeToken(env, id), user: pubMe(u) });
}
function pubMe(u) {
  return {
    id: u.id, name: u.name, pic: u.pic, phone: u.phone || '', paybox: u.paybox || '', agreed: !!u.agreed,
    points: u.points || 0, rating: u.rating_n ? +(u.rating_sum / u.rating_n).toFixed(1) : null, ratingN: u.rating_n || 0,
    ready: !!(u.phone && u.agreed),
  };
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
  await env.DB.prepare('UPDATE users SET name=?, phone=?, paybox=?, agreed=1 WHERE id=?').bind(name, phone, paybox, me.id).run();
  const u = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(me.id).first();
  return json({ user: pubMe(u) });
}

/* ---------- נסיעות ---------- */
async function createRide(req, env, me) {
  const b = await body(req);
  const from = place(b.from), to = place(b.to);
  const time = str(b.time, 5);
  if (!TIME_RE.test(time)) bad('time');
  const seats = Math.round(num(b.seats));
  if (!(seats >= 1 && seats <= 6)) bad('seats');
  let rate = num(b.rate);
  if (!(rate === 0 || (rate >= 1 && rate <= MAX_RATE))) bad('rate');
  rate = Math.round(rate * 10) / 10;
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
    `INSERT INTO rides (id,driver,from_label,from_lat,from_lng,to_label,to_lat,to_lng,date,days,start,until,time,seats,rate,km,min,route,note,created)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, me.id, from.label, from.lat, from.lng, to.label, to.lat, to.lng, date, days, start, until, time, seats, rate,
    Math.round(km * 10) / 10, Math.round(mins), JSON.stringify(pts), note, Date.now()).run();
  return json({ ride: { id } });
}
async function myRides(env, me) {
  const today = todayIL();
  const { results } = await env.DB.prepare(
    `SELECT id,from_label,to_label,date,days,start,until,time,seats,rate,km,min,note,status,
       (SELECT COUNT(*) FROM requests q WHERE q.ride=rides.id AND q.status='pending' AND q.date>=?) pending,
       (SELECT COUNT(*) FROM requests q WHERE q.ride=rides.id AND q.status='approved' AND q.date>=?) approved
     FROM rides WHERE driver=? AND status='open' AND (date>=? OR until>=?) ORDER BY COALESCE(date,start), time LIMIT 60`
  ).bind(today, today, me.id, today, today).all();
  return json({ rides: results });
}
async function closeRide(env, me, id) {
  const r = await env.DB.prepare('UPDATE rides SET status=? WHERE id=? AND driver=?').bind('closed', id, me.id).run();
  if (!r.meta.changes) bad('not found', 404);
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
    `SELECT r.*, u.name dname, u.pic dpic, u.rating_sum, u.rating_n, u.points
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
      out.push({
        ride: r.id, date: d, time: r.time, pass: m.pass, from: r.from_label, to: r.to_label,
        pickupKm: m.pickupKm, dropKm: m.dropKm, segKm: m.segKm, rate: r.rate, price: priceFor(m.segKm, r.rate),
        seatsLeft: left, note: r.note || '', regular: !!r.days,
        driver: { name: firstName(r.dname), pic: r.dpic || '', rating: r.rating_n ? +(r.rating_sum / r.rating_n).toFixed(1) : null, ratingN: r.rating_n || 0, points: r.points || 0 },
        mine: mine ? { id: mine.id, status: mine.status } : null,
      });
    }
  }
  out.sort((x, y) => (x.date + x.pass).localeCompare(y.date + y.pass) || x.pickupKm - y.pickupKm);
  return json({ matches: out.slice(0, 80) });
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
  const price = mode === 'free' ? 0 : priceFor(m.segKm, r.rate);
  await env.DB.prepare(
    `INSERT INTO requests (id,ride,date,rider,pickup_label,pickup_lat,pickup_lng,drop_label,drop_lat,drop_lng,seg_km,price,pass_time,mode,msg,created)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, rideId, date, me.id, pickup.label, pickup.lat, pickup.lng, drop.label, drop.lat, drop.lng, m.segKm, price, m.pass, mode, msg, Date.now()).run();
  return json({ request: { id } });
}
async function actRequest(req, env, me, id) {
  const b = await body(req);
  const action = b.action;
  const q = await env.DB.prepare(`SELECT q.*, r.driver, r.seats FROM requests q JOIN rides r ON r.id=q.ride WHERE q.id=?`).bind(id).first();
  if (!q) bad('not found', 404);
  const now = Date.now();
  if (action === 'cancel') {
    if (q.rider !== me.id && q.driver !== me.id) bad('not yours', 403);
    if (!['pending', 'approved'].includes(q.status)) bad('state');
    await env.DB.prepare(`UPDATE requests SET status='cancelled', updated=? WHERE id=?`).bind(now, id).run();
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
    // נקודות חסד: 10 על כל טרמפ שאושר, ועוד 5 כשהוא בחינם
    await env.DB.prepare('UPDATE users SET points=points+? WHERE id=?').bind(price ? 10 : 15, me.id).run();
    return json({ ok: true });
  }
  bad('action');
}
async function inbox(env, me) {
  const since = todayIL(-1);
  const asDriver = (await env.DB.prepare(
    `SELECT q.id,q.ride,q.date,q.status,q.mode,q.price,q.seg_km,q.pass_time,q.msg,q.pickup_label,q.pickup_lat,q.pickup_lng,q.drop_label,q.created,
       r.from_label,r.to_label,r.time, u.name rname, u.pic rpic, u.phone rphone, u.rating_sum, u.rating_n, u.id rid
     FROM requests q JOIN rides r ON r.id=q.ride JOIN users u ON u.id=q.rider
     WHERE r.driver=? AND q.date>=? AND q.status IN ('pending','approved') ORDER BY q.date, q.pass_time LIMIT 100`
  ).bind(me.id, since).all()).results.map(x => ({
    id: x.id, ride: x.ride, date: x.date, status: x.status, mode: x.mode, price: x.price, segKm: x.seg_km, pass: x.pass_time, msg: x.msg,
    pickup: { label: x.pickup_label, lat: x.pickup_lat, lng: x.pickup_lng }, drop: x.drop_label, from: x.from_label, to: x.to_label, time: x.time,
    rider: { id: x.rid, name: x.rname, pic: x.rpic, rating: x.rating_n ? +(x.rating_sum / x.rating_n).toFixed(1) : null, phone: x.status === 'approved' ? x.rphone : '' },
  }));
  const asRider = (await env.DB.prepare(
    `SELECT q.id,q.ride,q.date,q.status,q.mode,q.price,q.seg_km,q.pass_time,q.pickup_label,q.pickup_lat,q.pickup_lng,q.drop_label,
       r.from_label,r.to_label,r.time, u.name dname, u.pic dpic, u.phone dphone, u.paybox, u.id did
     FROM requests q JOIN rides r ON r.id=q.ride JOIN users u ON u.id=r.driver
     WHERE q.rider=? AND q.date>=? ORDER BY q.date, q.pass_time LIMIT 100`
  ).bind(me.id, since).all()).results.map(x => ({
    id: x.id, ride: x.ride, date: x.date, status: x.status, mode: x.mode, price: x.price, segKm: x.seg_km, pass: x.pass_time,
    pickup: { label: x.pickup_label, lat: x.pickup_lat, lng: x.pickup_lng }, drop: x.drop_label, from: x.from_label, to: x.to_label, time: x.time,
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
  await env.DB.prepare('INSERT INTO reports (id,by_user,about_user,ride,text,created) VALUES (?,?,?,?,?,?)')
    .bind(newId(), me.id, str(b.about, 40), str(b.ride, 40), text, Date.now()).run();
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
  return json({ rides: r.n, users: u.n, joined: j.n });
}
