// סיום תהילים בקישור + מעשי חסד – Cloudflare Worker + Durable Object. מחובר ל-/kodesh/tehillim/.
// כל סיום יושב ב-Durable Object משלו (Siyum), ולכן חלוקת הפרקים אטומית: שני אנשים לא מקבלים אותו פרק.
//
// ציבורי:
//   POST /s                    {m}                       -> {id, a}       יצירת סיום (a = מפתח ניהול, נשמר רק כ-hash)
//   GET  /s/:id[?t=tok]                                  -> המצב: פרטים, מי לקח מה, מה נקרא, מעשי חסד
//   POST /s/:id/take           {t, w, n | u:[...]}       -> {got:[...]}    לקחת פרקים (n = כמה, הבאים בתור; u = יחידות מסוימות)
//   POST /s/:id/done           {t, u:[...], a?}          -> {ok}          סימון "קראתי"
//   POST /s/:id/free           {t, u:[...], a?}          -> {ok}          החזרת פרק (רק מי שלקח, או המנהל)
//   POST /s/:id/chesed         {i, w, x}                 -> {ok}          קבלת מעשה טוב
//   GET  /j/:id                                          -> דף שיתוף: כותרת ותמונה לווטסאפ (og), ומיד מעבר לדף הסיום
// ניהול:
//   POST /s/:id/admin          {a, op:'round'|'edit'|'delete', m?}
//
// יחידה = פרק (150 בסבב), יום בחודש (30) או ספר (5). יחידה גלובלית = סבב * N + מספר.
// הנתונים נמחקים מעצמם 120 יום אחרי היצירה (alarm).
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const MODES = { perek: 150, yom: 30, sefer: 5 };
const MAXR = { perek: 10, yom: 30, sefer: 60 };
const PURPOSES = ['niftar', 'refua', 'hatzlacha', 'zivug', 'zchut', 'other'];
const CHESED = ['tzedaka', 'bikur', 'ner', 'lashon', 'brachot', 'mishna', 'tefila', 'horim', 'ezra', 'orchim', 'milatova', 'other'];
const KEEP_DAYS = 120;
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/s(?:\/([a-z0-9]{6,12}))?(?:\/(take|done|free|chesed|admin))?\/?$/);
      const j = url.pathname.match(/^\/j\/([a-z0-9]{6,12})\/?$/);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'kodesh-tehillim', v: 2 });
      else if (j && req.method === 'GET') {
        const r = await env.SIYUM.get(env.SIYUM.idFromName('s:' + j[1])).fetch('https://do/og');
        return new Response(r.body, r);
      }
      else if (!m) res = json({ error: 'not found' }, 404);
      else if (!m[1] && req.method === 'POST') {
        const ip = req.headers.get('CF-Connecting-IP') || 'x';
        const rl = env.SIYUM.get(env.SIYUM.idFromName('rl:' + ip));
        const r = await rl.fetch('https://do/rl', { method: 'POST' });
        if (r.status === 429) res = json({ error: 'יותר מדי סיומים ברצף. נסו שוב בעוד שעה.' }, 429);
        else {
          const id = shortId(8);
          const stub = env.SIYUM.get(env.SIYUM.idFromName('s:' + id));
          res = await stub.fetch('https://do/create?id=' + id, { method: 'POST', body: await req.text() });
        }
      } else if (m[1]) {
        const stub = env.SIYUM.get(env.SIYUM.idFromName('s:' + m[1]));
        const op = m[2] || 'get';
        if ((op === 'get') !== (req.method === 'GET')) res = json({ error: 'not found' }, 404);
        else res = await stub.fetch('https://do/' + op + url.search, { method: req.method, body: req.method === 'POST' ? await req.text() : undefined });
        res = new Response(res.body, res);
      } else res = json({ error: 'not found' }, 404);
    } catch (e) {
      res = json({ error: 'שגיאה פנימית: ' + (e && e.message || e) }, 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

export class Siyum {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async fetch(req) {
    const url = new URL(req.url);
    const op = url.pathname.slice(1);
    if (op === 'rl') return this.rateLimit();
    const body = req.method === 'POST' ? await readJson(req) : null;
    if (req.method === 'POST' && !body) return json({ error: 'בקשה לא תקינה' }, 400);
    if (op === 'create') return this.create(url.searchParams.get('id'), body);
    const st = await this.ctx.storage.get('st');
    if (!st) return op === 'og' ? sharePage(null) : json({ error: 'הסיום לא נמצא. אולי הקישור לא שלם, או שהסיום נמחק.' }, 404);
    if (op === 'get') return json(view(st, url.searchParams.get('t') || ''));
    if (op === 'og') return sharePage(st);
    if (op === 'take') return this.take(st, body);
    if (op === 'done' || op === 'free') return this.mark(st, body, op);
    if (op === 'chesed') return this.chesed(st, body);
    if (op === 'admin') return this.admin(st, body);
    return json({ error: 'not found' }, 404);
  }

  async rateLimit() {
    const now = Date.now();
    let r = (await this.ctx.storage.get('rl')) || { s: now, n: 0 };
    if (now - r.s > 3600e3) r = { s: now, n: 0 };
    r.n++;
    await this.ctx.storage.put('rl', r);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + 2 * 3600e3);
    return r.n > 8 ? json({ error: 'rate' }, 429) : json({ ok: true });
  }

  async create(id, b) {
    if (await this.ctx.storage.get('st')) return json({ error: 'קיים' }, 409);
    const m = cleanMeta(b && b.m);
    if (!m) return json({ error: 'חסר שם' }, 400);
    const a = shortId(14);
    const st = { id, m, r: m.r, at: Date.now(), ah: await sha(a), u: {}, c: {}, cl: [], v: 1 };
    await this.ctx.storage.put('st', st);
    await this.ctx.storage.setAlarm(Date.now() + KEEP_DAYS * 864e5);
    return json({ id, a });
  }

  async take(st, b) {
    const t = clean(b.t, 40), w = clean(b.w, 40);
    if (t.length < 8) return json({ error: 'חסר מזהה' }, 400);
    const N = MODES[st.m.mo], total = N * st.r, got = [];
    const mineNow = Object.keys(st.u).filter(k => st.u[k][1] === t && !st.u[k][2]).length;
    let room = 60 - mineNow;
    if (room <= 0) return json({ error: 'לקחת כבר הרבה. אחרי שתסיים ותסמן "קראתי", אפשר לקחת עוד.' }, 400);
    if (Array.isArray(b.u)) {
      for (const x of b.u.slice(0, 30)) {
        const k = parseInt(x, 10);
        if (room > 0 && k >= 0 && k < total && !st.u[k]) { st.u[k] = [w, t, 0, Date.now()]; got.push(k); room--; }
      }
    } else {
      let n = Math.max(1, Math.min(parseInt(b.n, 10) || 1, st.m.mo === 'perek' ? 30 : 5, room));
      for (let k = 0; k < total && n > 0; k++) if (!st.u[k]) { st.u[k] = [w, t, 0, Date.now()]; got.push(k); n--; }
    }
    if (got.length) await this.ctx.storage.put('st', st);
    return json({ got, s: view(st, t) });
  }

  async mark(st, b, op) {
    const t = clean(b.t, 40);
    const isAdmin = b.a ? (await sha(clean(b.a, 40))) === st.ah : false;
    let n = 0;
    for (const x of (Array.isArray(b.u) ? b.u : []).slice(0, 200)) {
      const k = parseInt(x, 10), e = st.u[k];
      if (!e || (e[1] !== t && !isAdmin)) continue;
      if (op === 'done') { if (!e[2]) { e[2] = 1; e[3] = Date.now(); n++; } }
      else { delete st.u[k]; n++; }
    }
    if (n) await this.ctx.storage.put('st', st);
    return json({ ok: true, n, s: view(st, t) });
  }

  async chesed(st, b) {
    const i = CHESED.includes(b.i) ? b.i : null;
    if (!i) return json({ error: 'בחרו מעשה טוב' }, 400);
    const x = clean(b.x, 120);
    if (i === 'other' && !x) return json({ error: 'כתבו מה קיבלתם על עצמכם' }, 400);
    if ((st.cl || []).length >= 2000) return json({ error: 'הרשימה מלאה' }, 400);
    st.c[i] = (st.c[i] || 0) + 1;
    st.cl.push([i, clean(b.w, 40), x, Date.now()]);
    await this.ctx.storage.put('st', st);
    return json({ ok: true, s: view(st, clean(b.t, 40)) });
  }

  async admin(st, b) {
    if (!b.a || (await sha(clean(b.a, 40))) !== st.ah) return json({ error: 'אין הרשאה' }, 403);
    if (b.op === 'round') {
      if (st.r >= MAXR[st.m.mo]) return json({ error: 'זה המקסימום של סבבים' }, 400);
      st.r++;
    } else if (b.op === 'edit') {
      const m = cleanMeta(Object.assign({}, st.m, b.m || {}, { mo: st.m.mo, r: st.r }));
      if (!m) return json({ error: 'חסר שם' }, 400);
      st.m = m;
    } else if (b.op === 'delete') {
      await this.ctx.storage.deleteAll();
      return json({ ok: true, deleted: true });
    } else return json({ error: 'פעולה לא מוכרת' }, 400);
    await this.ctx.storage.put('st', st);
    return json({ ok: true, s: view(st, clean(b.t, 40)) });
  }

  async alarm() { await this.ctx.storage.deleteAll(); }
}

// מה שכל אחד רואה: בלי המזהים של אחרים, רק שם (אם נכתב) ומצב
function view(st, t) {
  const N = MODES[st.m.mo], total = N * st.r;
  let s = '', taken = 0, done = 0;
  const w = {}, mine = [];
  for (let k = 0; k < total; k++) {
    const e = st.u[k];
    if (!e) { s += '0'; continue; }
    s += e[2] ? '2' : '1';
    taken++; if (e[2]) done++;
    if (e[0]) w[k] = e[0];
    if (t && e[1] === t) mine.push(k);
  }
  const cl = (st.cl || []).slice(-40).reverse().map(x => [x[0], x[1], x[2], x[3]]);
  return { id: st.id, m: st.m, r: st.r, N, total, s, taken, done, w, mine, c: st.c, cn: (st.cl || []).length, cl, at: st.at };
}

// דף השיתוף: ווטסאפ קורא ממנו כותרת, תיאור ותמונה. אדם שנכנס מועבר מיד לדף הסיום באתר.
const SITE = 'https://hakelim.com/kodesh/tehillim/';
const PHR = { niftar: 'לעילוי נשמת', refua: 'לרפואת', hatzlacha: 'להצלחת', zivug: 'לזיווג הגון ל', zchut: 'לזכות' };
function sharePage(st) {
  const h = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let title = 'סיום תהילים בקישור', desc = 'כל אחד לוקח פרק וקורא אותו ישר בקישור, עד שכל הספר נגמר. ומעשה טוב של דקה, כבר עכשיו.', to = SITE;
  if (st) {
    const m = st.m, ph = m.p === 'other' ? (m.pt || '') : PHR[m.p] || '';
    const who = m.n + (m.par ? ' ' + m.bb + ' ' + m.par : '');
    title = 'סיום תהילים ' + (ph ? (/(^|\s)ל$/.test(ph) ? ph + who : ph + ' ' + who) : who);
    const v = view(st, ''), N = MODES[m.mo], u = m.mo === 'perek' ? 'פרקים' : m.mo === 'yom' ? 'ימים' : 'ספרים';
    const free = v.total - v.taken;
    desc = (m.g ? m.g + ' · ' : '') + (v.done === v.total ? 'הסיום הושלם! תודה לכל המשתתפים.' : v.taken ? 'נלקחו ' + v.taken + ' מתוך ' + v.total + ' ' + u + ', נשארו ' + free + '. בחרו פרק וקחו חלק בזכות.' : v.total + ' ' + u + ' מחכים לכם. בחרו פרק וקחו חלק בזכות.');
    to = SITE + '?s=' + st.id;
  }
  const html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + h(title) + '</title><meta name="description" content="' + h(desc) + '">' +
    '<meta property="og:type" content="website"><meta property="og:locale" content="he_IL"><meta property="og:site_name" content="כלי קודש">' +
    '<meta property="og:title" content="' + h(title) + '"><meta property="og:description" content="' + h(desc) + '">' +
    '<meta property="og:image" content="https://hakelim.com/assets/og-tehillim.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
    '<meta property="og:url" content="' + h(to) + '"><meta name="twitter:card" content="summary_large_image">' +
    '<link rel="canonical" href="' + h(to) + '"><meta http-equiv="refresh" content="0;url=' + h(to) + '">' +
    '<script>location.replace(' + JSON.stringify(to) + ' + location.hash)</script>' +
    '<style>body{font-family:Arial,sans-serif;background:#0e1628;color:#eef0f6;text-align:center;padding:3rem 1rem}a{color:#d4b062}</style></head>' +
    '<body><p>' + h(title) + '</p><p><a href="' + h(to) + '">לחצו כאן לסיום</a></p></body></html>';
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}

function cleanMeta(b) {
  if (!b) return null;
  const n = clean(b.n, 60);
  if (!n) return null;
  const mo = MODES[b.mo] ? b.mo : 'perek';
  return {
    p: PURPOSES.includes(b.p) ? b.p : 'niftar',
    pt: clean(b.pt, 40),            // ניסוח חופשי למטרה "אחר"
    n,                              // השם
    bb: b.bb === 'בת' ? 'בת' : 'בן',
    par: clean(b.par, 40),          // שם ההורה
    g: clean(b.g, 60),              // יעד: תאריך או אירוע ("עד השלושים, כ"ה בכסלו")
    x: clean(b.x, 200),             // מילה מהמשפחה
    cr: clean(b.cr, 40),            // מי פתח
    mo,
    r: Math.max(1, Math.min(parseInt(b.r, 10) || 1, MAXR[mo])),
    ch: b.ch === 0 ? 0 : 1,         // מעשי חסד מופעלים
  };
}

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
const clean = (s, max) => (typeof s === 'string' ? s : '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
async function readJson(req) { try { const t = await req.text(); return t ? JSON.parse(t) : {}; } catch (e) { return null; } }
function shortId(len) {
  const a = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (const b of a) s += ALPHA[b % ALPHA.length];
  return s;
}
async function sha(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
