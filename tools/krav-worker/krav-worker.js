// לוח תוצאות חי לדו-קרב לבגרות (/limudim/krav/, /limudim/krav-anglit/) – Cloudflare Worker + Durable Object (חינמי).
// Durable Object אחד לכל מרוץ (לפי הזרע שבקישור). כל משתתף שולח את הניקוד שלו, וכולם רואים את הלוח מתעדכן.
// פרטיות: רק מזהה מכשיר אקראי, כינוי (בלי מספרים ארוכים, קישורים ומיילים) ונקודות. בלי שם מלא, טלפון או מייל.
// מרוץ נמחק לבד 3 ימים אחרי שנפתח. אין כאן כסף.
//
//   GET  /b/:seed               -> {rows:[[pid, nick, pts, solved, tried]], e}
//   POST /b/:seed  {pid, nick, pts, solved, tried, e, g}   -> {rows, e}
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const MAX_ROWS = 60, KEEP_MS = 3 * 864e5, GRACE_S = 15 * 60;

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/b\/((?:math|eng)-[a-z0-9]{4,12})$/);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'limudim-krav', v: 1 });
      else if (m && (req.method === 'GET' || req.method === 'POST')) {
        if (req.method === 'POST' && origin && !allowed(origin, env)) res = json({ error: 'origin' }, 403);
        else {
          const ip = req.headers.get('CF-Connecting-IP') || 'x';
          if (req.method === 'POST') {
            const r = await env.BOARD.get(env.BOARD.idFromName('rl:' + ip)).fetch('https://do/rl', { method: 'POST' });
            if (r.status === 429) { res = json({ error: 'יותר מדי עדכונים מהרשת הזאת. נסו שוב בעוד כמה דקות.' }, 429); }
          }
          if (!res) res = await env.BOARD.get(env.BOARD.idFromName('b:' + m[1])).fetch(new Request('https://do/b', { method: req.method, headers: { 'content-type': 'application/json' }, body: req.method === 'POST' ? await req.text() : null }));
        }
      } else res = json({ error: 'לא נמצא' }, 404);
    } catch (e) {
      res = json({ error: 'תקלה בשרת. נסו שוב בעוד רגע.' }, 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  },
};

export class Board {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/rl') return this.rateLimit();
    let b = (await this.ctx.storage.get('b')) || null;
    if (req.method === 'GET') return json(b ? { rows: b.rows, e: b.e } : { rows: [], e: 0 });
    let d; try { d = JSON.parse(await req.text()); } catch (e) { return json({ error: 'בקשה לא תקינה' }, 400); }
    const pid = clean(d.pid, 8), nick = nickClean(d.nick) || 'שחקן/ית';
    const pts = int(d.pts, 0, 20000), solved = int(d.solved, 0, 1000), tried = int(d.tried, 0, 1000), e = int(d.e, 0, 1e8);
    if (pid.length < 4 || solved > tried || pts > tried * 16 + 16) return json({ error: 'בקשה לא תקינה' }, 400);
    const now = Date.now();
    if (!b) {
      // מרוץ חדש: מועד הסיום חייב להיות בתוך השעתיים הקרובות
      if (!e || e * 60 < now / 1000 || e * 60 > now / 1000 + 7200) return json({ error: 'מרוץ לא תקין' }, 400);
      b = { e: e, at: now, rows: [] };
      await this.ctx.storage.setAlarm(now + KEEP_MS);
    }
    if (now / 1000 > b.e * 60 + GRACE_S) return json({ rows: b.rows, e: b.e, closed: 1 });
    const i = b.rows.findIndex(r => r[0] === pid);
    if (i > -1) { const r = b.rows[i]; if (pts >= r[2]) b.rows[i] = [pid, nick, pts, solved, tried]; else b.rows[i][1] = nick; }
    else if (b.rows.length < MAX_ROWS) b.rows.push([pid, nick, pts, solved, tried]);
    else return json({ rows: b.rows, e: b.e, full: 1 });
    b.rows.sort((x, y) => y[2] - x[2] || y[3] - x[3]);
    await this.ctx.storage.put('b', b);
    return json({ rows: b.rows, e: b.e });
  }

  async rateLimit() {
    const now = Date.now();
    let r = (await this.ctx.storage.get('rl')) || { s: now, n: 0 };
    if (now - r.s > 3600e3) r = { s: now, n: 0 };
    r.n++;
    await this.ctx.storage.put('rl', r);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + 2 * 3600e3);
    // כיתה שלמה מאחורי אותה רשת של בית ספר: עד 3000 עדכונים בשעה
    return r.n > 3000 ? new Response('rl', { status: 429 }) : new Response('ok');
  }

  async alarm() { await this.ctx.storage.deleteAll(); }
}

function allowed(o, env) { return ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) || (env.EXTRA_ORIGINS || '').split(',').includes(o); }
function corsHeaders(o, env) { return { 'Access-Control-Allow-Origin': allowed(o, env) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type', Vary: 'Origin' }; }
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
function clean(s, n) { return String(s || '').replace(/[<>"'`\u0000-\u001f]/g, '').trim().slice(0, n); }
function nickClean(s) { return clean(s, 40).replace(/https?:\S+|www\.\S+|\S+@\S+/gi, '').replace(/\d[\d\s-]{5,}/g, '').trim().slice(0, 20); }
function int(v, lo, hi) { v = Math.floor(Number(v) || 0); return Math.max(lo, Math.min(hi, v)); }
