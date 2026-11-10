// מאגר תרגילים משותף למחשבון לבגרות (/limudim/machshevon/) + תיקוני דיבור משותפים.
// Durable Object אחד (SQLite) לכל המאגר. בלי הרשמה: לכל טלפון מזהה אקראי (uid).
// שמירה על מאגר נקי בלי אישור ידני:
//  - נשמר רק התרגיל עצמו (התשובה מחושבת מחדש בכל טלפון, לכן תמיד נכונה)
//  - כותרת קצרה עם מסנן: בלי קישורים, טלפונים, מיילים ומילים גסות
//  - 3 דיווחים מאנשים שונים מסתירים תרגיל. גילעד רואה רק את המדווחים (/admin)
//  - הגבלה: 15 תרגילים ו-30 תיקונים ליום לכל טלפון ולכל כתובת
//  - תיקון דיבור נכנס לכולם רק אחרי 3 אנשים שונים ששלחו אותו
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const HIDE_AT = 3, FIX_AT = 3, ADD_DAY = 15, FIX_DAY = 30;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const h = cors(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: h });
    const url = new URL(req.url);
    if (url.pathname === '/ping') return json({ ok: 1, v: 1 }, 200, h);
    const id = env.BANK.idFromName('bank');
    const stub = env.BANK.get(id);
    const ip = req.headers.get('CF-Connecting-IP') || '';
    const r = await stub.fetch(new Request(url.toString(), { method: req.method, headers: { 'content-type': 'application/json', 'x-ip': await hash(ip), 'x-admin': env.ADMIN_KEY || '' }, body: req.method === 'POST' ? await req.text() : undefined }));
    const out = new Response(r.body, r);
    for (const k in h) out.headers.set(k, h[k]);
    return out;
  }
};

export class Bank {
  constructor(ctx) {
    this.ctx = ctx; this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS q (id TEXT PRIMARY KEY, e TEXT, ang TEXT, topic TEXT, lv INTEGER, title TEXT, uid TEXT, ip TEXT, t INTEGER, likes INTEGER DEFAULT 0, reports INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS votes (qid TEXT, uid TEXT, kind TEXT, PRIMARY KEY (qid, uid, kind))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS fixes (heard TEXT, fixed TEXT, uid TEXT, t INTEGER, PRIMARY KEY (heard, fixed, uid))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, day TEXT, n INTEGER)`);
  }
  rows(q, ...a) { return this.sql.exec(q, ...a).toArray(); }
  limit(key, max) {
    const day = new Date().toISOString().slice(0, 10);
    const r = this.rows('SELECT day, n FROM rate WHERE k = ?', key)[0];
    const n = r && r.day === day ? r.n : 0;
    if (n >= max) return false;
    this.sql.exec('INSERT OR REPLACE INTO rate (k, day, n) VALUES (?, ?, ?)', key, day, n + 1);
    return true;
  }
  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, ip = req.headers.get('x-ip') || '';
    let b = {};
    if (req.method === 'POST') { try { b = JSON.parse(await req.text() || '{}'); } catch (e) { return json({ error: 'בקשה לא תקינה' }, 400); } }
    const uid = String(b.uid || url.searchParams.get('uid') || '');
    if (req.method === 'POST' && !/^[a-z0-9]{12,40}$/.test(uid)) return json({ error: 'חסר מזהה' }, 400);

    if (p === '/list') {
      const topic = url.searchParams.get('topic') || '', lv = +url.searchParams.get('lv') || 0, sort = url.searchParams.get('sort') === 'top' ? 'likes DESC, t DESC' : 't DESC';
      const before = +url.searchParams.get('before') || 9e15;
      let w = 'hidden = 0 AND t < ?', a = [before];
      if (/^[a-z-]{2,20}$/.test(topic)) { w += ' AND topic = ?'; a.push(topic); }
      if (lv >= 3 && lv <= 5) { w += ' AND (lv = ? OR lv = 0)'; a.push(lv); }
      const items = this.rows(`SELECT id, e, ang, topic, lv, title, t, likes FROM q WHERE ${w} ORDER BY ${sort} LIMIT 40`, ...a);
      const total = this.rows('SELECT COUNT(*) AS n FROM q WHERE hidden = 0')[0].n;
      return json({ items, total });
    }
    if (p === '/add' && req.method === 'POST') {
      const e = cleanExpr(b.e), title = cleanTitle(b.title);
      if (!e) return json({ error: 'אפשר לשתף רק תרגיל חשבון (מספרים, פעולות ופונקציות של המחשבון), בלי Ans, A או B.' }, 400);
      if (title === null) return json({ error: 'בכותרת אסור קישור, טלפון, מייל או מילים לא יפות. אפשר גם בלי כותרת.' }, 400);
      const topic = /^[a-z-]{2,20}$/.test(b.topic || '') ? b.topic : 'other';
      const lv = [3, 4, 5].includes(+b.lv) ? +b.lv : 0, ang = b.ang === 'rad' ? 'rad' : 'deg';
      const dup = this.rows('SELECT id FROM q WHERE e = ? AND ang = ? AND hidden = 0', e, ang)[0];
      if (dup) return json({ ok: 1, id: dup.id, dup: 1 });
      if (!this.limit('a:' + uid, ADD_DAY) || !this.limit('ai:' + ip, ADD_DAY * 3)) return json({ error: 'שיתפתם הרבה היום. תודה! אפשר להמשיך מחר.' }, 429);
      const id = rid();
      this.sql.exec('INSERT INTO q (id, e, ang, topic, lv, title, uid, ip, t) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', id, e, ang, topic, lv, title, uid, ip, Date.now());
      return json({ ok: 1, id });
    }
    if ((p === '/like' || p === '/report') && req.method === 'POST') {
      const kind = p.slice(1), qid = String(b.id || '');
      const q = this.rows('SELECT id, uid FROM q WHERE id = ?', qid)[0];
      if (!q) return json({ error: 'לא נמצא' }, 404);
      if (this.rows('SELECT 1 FROM votes WHERE qid = ? AND uid = ? AND kind = ?', qid, uid, kind).length) return json({ ok: 1, again: 1 });
      if (!this.limit('v:' + uid, 200)) return json({ error: 'הרבה לחיצות היום' }, 429);
      this.sql.exec('INSERT INTO votes (qid, uid, kind) VALUES (?, ?, ?)', qid, uid, kind);
      if (kind === 'like') this.sql.exec('UPDATE q SET likes = likes + 1 WHERE id = ?', qid);
      else this.sql.exec('UPDATE q SET reports = reports + 1, hidden = CASE WHEN reports + 1 >= ? THEN 1 ELSE hidden END WHERE id = ?', HIDE_AT, qid);
      return json({ ok: 1 });
    }
    if (p === '/fix' && req.method === 'POST') {
      const pairs = Array.isArray(b.pairs) ? b.pairs.slice(0, 5) : [];
      let n = 0;
      for (const pr of pairs) {
        const hd = cleanWord(pr && pr[0]), fx = cleanWord(pr && pr[1]);
        if (!hd || !fx || hd === fx) continue;
        if (!this.limit('f:' + uid, FIX_DAY)) break;
        this.sql.exec('INSERT OR IGNORE INTO fixes (heard, fixed, uid, t) VALUES (?, ?, ?, ?)', hd, fx, uid, Date.now()); n++;
      }
      return json({ ok: 1, n });
    }
    if (p === '/fixes') {
      // רק תיקון ש-3 אנשים שונים שלחו, והכי נפוץ לכל מילה
      const rows = this.rows('SELECT heard, fixed, COUNT(*) AS c FROM fixes GROUP BY heard, fixed HAVING c >= ? ORDER BY c DESC', FIX_AT);
      const w = {}; rows.forEach(r => { if (!w[r.heard]) w[r.heard] = r.fixed; });
      return json({ w });
    }
    // ניהול: רק מה שדווח
    if (p.startsWith('/admin')) {
      const key = req.headers.get('x-admin');
      if (!key || (url.searchParams.get('key') !== key && b.key !== key)) return json({ error: 'אין הרשאה' }, 403);
      if (p === '/admin/list') return json({ items: this.rows('SELECT id, e, ang, topic, title, reports, hidden, t FROM q WHERE reports > 0 ORDER BY hidden DESC, reports DESC LIMIT 100'), total: this.rows('SELECT COUNT(*) AS n FROM q')[0].n, fixes: this.rows('SELECT heard, fixed, COUNT(*) AS c FROM fixes GROUP BY heard, fixed ORDER BY c DESC LIMIT 50') });
      if (p === '/admin/keep' && req.method === 'POST') { this.sql.exec('UPDATE q SET hidden = 0, reports = 0 WHERE id = ?', String(b.id)); this.sql.exec("DELETE FROM votes WHERE qid = ? AND kind = 'report'", String(b.id)); return json({ ok: 1 }); }
      if (p === '/admin/delete' && req.method === 'POST') { this.sql.exec('DELETE FROM q WHERE id = ?', String(b.id)); this.sql.exec('DELETE FROM votes WHERE qid = ?', String(b.id)); return json({ ok: 1 }); }
      if (p === '/admin/export') return json({ items: this.rows('SELECT id, e, ang, topic, lv, title, likes, t FROM q WHERE hidden = 0 ORDER BY topic, likes DESC') });
    }
    return json({ error: 'לא נמצא' }, 404);
  }
}

// תרגיל: רק תווים ושמות של המחשבון. בלי Ans/A/B (הם של הטלפון הפרטי)
const NAMES = /sin⁻¹|cos⁻¹|tan⁻¹|arcsin|arccos|arctan|asin|acos|atan|logb|log|ln|root|sqrt|cbrt|abs|exp|sin|cos|tan|nCr|ncr|pi|C|e|π|√/g;
function cleanExpr(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (!s || s.length > 140 || !/\d/.test(s)) return '';
  const rest = s.replace(NAMES, '');
  if (!/^[0-9.,()\s+\-*/^!×÷−·²³⁻¹°]*$/.test(rest)) return '';
  return s;
}
const BAD = ['זונה', 'זין', 'כוס', 'מזדיין', 'לזיין', 'שרמוטה', 'בן זונה', 'מניאק', 'חרא', 'קקי', 'דביל', 'מפגר', 'אידיוט', 'סתום', 'fuck', 'shit', 'bitch', 'sex', 'porn', 'סקס', 'פורנו', 'נאצי', 'היטלר', 'מוות ל'];
function cleanTitle(s) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length > 60) s = s.slice(0, 60);
  if (/https?:|www\.|\.(com|co|il|net|org|ly|me)\b|@|t\.me/i.test(s)) return null;
  if (/\d[\d\s-]{6,}\d/.test(s)) return null; // מספר טלפון
  if (!/^[֐-׿A-Za-z0-9\s.,?!:;()'"״׳\-+=×÷^√π°²%/]*$/.test(s)) return null;
  const low = ' ' + s.toLowerCase().replace(/[.,?!:;()'"״׳-]/g, ' ') + ' ';
  if (BAD.some(w => low.includes(' ' + w + ' ') || (w.length > 3 && low.includes(w)))) return null;
  return s;
}
function cleanWord(s) { s = String(s || '').trim(); return /^[֐-׿'׳]{1,20}$/.test(s) ? s : ''; }
function rid() { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(8)); for (const x of r) s += a[x % a.length]; return s; }
async function hash(s) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('calc:' + s)); return [...new Uint8Array(d)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join(''); }
function json(o, st = 200, h = {}) { return new Response(JSON.stringify(o), { status: st, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, h) }); }
function cors(origin, env) {
  const extra = (env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = ORIGINS.includes(origin) || extra.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Vary': 'Origin' };
  if (ok) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
