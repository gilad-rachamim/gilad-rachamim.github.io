// חנוכייה משותפת בקישור – Cloudflare Worker + Durable Object. מחובר ל-/kodesh/chanuka/chanukiya/.
// מישהו פותח חנוכייה (למשל לעילוי נשמה, לרפואה, או של קהילה), שולח קישור, וכל מי שנכנס מדליק נר עם הקדשה.
// המבנה כמו tools/tehillim-worker.
//
// ציבורי:
//   POST /h                 {m}                    -> {id, a}     פתיחת חנוכייה (a = מפתח ניהול, נשמר רק כ-hash)
//   GET  /h/:id                                    -> המצב: פרטים, מספר הנרות, 120 האחרונים
//   POST /h/:id/light       {t, w, p, pt, n, bb, par, x} -> {ok}  הדלקת נר (t = מזהה המכשיר, עד 10 נרות בשעה)
//   POST /h/:id/ask         {t, k, n, bb, par, x}  -> {ok}  בקשה מתחת לחנוכייה (עד 3 בשעה למכשיר, סינון מילים)
//   POST /h/:id/amen        {t, k}                 -> {ok}  אמן על בקשה
//   GET  /j/:id                                    -> דף שיתוף לווטסאפ (og), ומיד מעבר לדף באתר
// ניהול:
//   POST /h/:id/admin       {a, op:'hide'|'hideR'|'edit'|'delete', k?, m?}
//
// הנתונים נמחקים מעצמם 90 יום אחרי הפתיחה (alarm).
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const PURPOSES = ['niftar', 'refua', 'hatzlacha', 'zivug', 'zchut', 'kehila', 'other'];
const KEEP_DAYS = 90, MAX_CANDLES = 5000, PER_HOUR = 10;
// בקשות מתחת לחנוכייה
const KINDS = ['refua', 'zivug', 'parnasa', 'banim', 'shalom', 'yeshua', 'hatzlacha', 'other'];
const MAX_REQ = 600, REQ_PER_HOUR = 3, AMEN_PER_HOUR = 60;
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/h(?:\/([a-z0-9]{6,12}))?(?:\/(light|admin|ask|amen))?\/?$/);
      const j = url.pathname.match(/^\/j\/([a-z0-9]{6,12})\/?$/);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'kodesh-chanuka', v: 2 });
      else if (j && req.method === 'GET') {
        const r = await env.CH.get(env.CH.idFromName('h:' + j[1])).fetch('https://do/og');
        return new Response(r.body, r);
      }
      else if (!m) res = json({ error: 'not found' }, 404);
      else if (!m[1] && req.method === 'POST') {
        const ip = req.headers.get('CF-Connecting-IP') || 'x';
        const r = await env.CH.get(env.CH.idFromName('rl:' + ip)).fetch('https://do/rl', { method: 'POST' });
        if (r.status === 429) res = json({ error: 'נפתחו יותר מדי חנוכיות ברצף. נסו שוב בעוד שעה.' }, 429);
        else {
          const id = shortId(8);
          res = await env.CH.get(env.CH.idFromName('h:' + id)).fetch('https://do/create?id=' + id, { method: 'POST', body: await req.text() });
        }
      } else if (m[1]) {
        const op = m[2] || 'get';
        if ((op === 'get') !== (req.method === 'GET')) res = json({ error: 'not found' }, 404);
        else res = await env.CH.get(env.CH.idFromName('h:' + m[1])).fetch('https://do/' + op, { method: req.method, body: req.method === 'POST' ? await req.text() : undefined });
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

export class Chanukiya {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1);
    if (op === 'rl') return this.rateLimit();
    const body = req.method === 'POST' ? await readJson(req) : null;
    if (req.method === 'POST' && !body) return json({ error: 'בקשה לא תקינה' }, 400);
    if (op === 'create') return this.create(new URL(req.url).searchParams.get('id'), body);
    const st = await this.ctx.storage.get('st');
    if (!st) return op === 'og' ? sharePage(null) : json({ error: 'החנוכייה לא נמצאה. אולי הקישור לא שלם, או שהיא נמחקה.' }, 404);
    const rq = (await this.ctx.storage.get('rq')) || { r: [], am: {} };
    if (op === 'get') return json(view(st, rq));
    if (op === 'og') return sharePage(st);
    if (op === 'light') return this.light(st, rq, body);
    if (op === 'ask') return this.ask(st, rq, body);
    if (op === 'amen') return this.amen(st, rq, body);
    if (op === 'admin') return this.admin(st, rq, body);
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
    if (!m) return json({ error: 'חסר שם לחנוכייה' }, 400);
    const a = shortId(14);
    const st = { id, m, at: Date.now(), ah: await sha(a), c: [], v: 1 };
    await this.ctx.storage.put('st', st);
    await this.ctx.storage.setAlarm(Date.now() + KEEP_DAYS * 864e5);
    return json({ id, a });
  }

  async light(st, rq, b) {
    const t = clean(b.t, 40);
    if (t.length < 8) return json({ error: 'חסר מזהה' }, 400);
    if (st.c.length >= MAX_CANDLES) return json({ error: 'החנוכייה מלאה באור! תודה.' }, 400);
    const hour = Date.now() - 3600e3, mine = st.c.filter(x => x[6] === t && x[5] > hour).length;
    if (mine >= PER_HOUR) return json({ error: 'הדלקתם כבר הרבה נרות בשעה האחרונה. אפשר להמשיך אחר כך.' }, 429);
    const p = PURPOSES.includes(b.p) ? b.p : '', n = clean(b.n, 50);
    // [מי הדליק, מטרה, ניסוח למטרה "אחר", שם + בן/בת + הורה, ברכה, זמן, מזהה מכשיר, מוסתר]
    st.c.push([clean(b.w, 40), n ? p || 'zchut' : '', clean(b.pt, 30), n ? n + (clean(b.par, 40) ? ' ' + (b.bb === 'בת' ? 'בת' : 'בן') + ' ' + clean(b.par, 40) : '') : '', clean(b.x, 100), Date.now(), t, 0]);
    await this.ctx.storage.put('st', st);
    return json({ ok: true, s: view(st, rq) });
  }

  // בקשה: [סוג, שם + בן/בת + שם האם, טקסט, זמן, מזהה מכשיר, מוסתר, אמן]
  async ask(st, rq, b) {
    const t = clean(b.t, 40);
    if (t.length < 8) return json({ error: 'חסר מזהה' }, 400);
    const k = KINDS.includes(b.k) ? b.k : '';
    if (!k) return json({ error: 'בחרו על מה הבקשה.' }, 400);
    const n = holyName(clean(b.n, 30)), par = holyName(clean(b.par, 30)), x = holyName(clean(b.x, 80));
    if (k === 'other' && !x) return json({ error: 'כתבו את הבקשה במילים קצרות.' }, 400);
    const all = [n, par, x].join(' ');
    if (badWords(all)) return json({ error: 'נא לכתוב בלשון נקייה. זו בקשה מתחת לחנוכייה.' }, 400);
    if (contactInfo(all)) return json({ error: 'בלי טלפונים וקישורים – רק שם פרטי ושם האם.' }, 400);
    if (rq.r.length >= MAX_REQ) return json({ error: 'יש כבר הרבה בקשות בחנוכייה הזאת. תודה!' }, 400);
    const hour = Date.now() - 3600e3;
    if (rq.r.filter(r => r[4] === t && r[3] > hour).length >= REQ_PER_HOUR) return json({ error: 'השארתם כבר כמה בקשות בשעה האחרונה. אפשר להוסיף אחר כך.' }, 429);
    rq.r.push([k, n ? n + (par ? ' ' + (b.bb === 'בת' ? 'בת' : 'בן') + ' ' + par : '') : '', x, Date.now(), t, 0, 0]);
    await this.ctx.storage.put('rq', rq);
    return json({ ok: true, s: view(st, rq) });
  }

  async amen(st, rq, b) {
    const t = clean(b.t, 40), k = parseInt(b.k, 10);
    if (t.length < 8) return json({ error: 'חסר מזהה' }, 400);
    if (!(k >= 0 && k < rq.r.length) || rq.r[k][5]) return json({ error: 'הבקשה לא נמצאה' }, 400);
    const now = Date.now();
    for (const key of Object.keys(rq.am)) if (now - rq.am[key][0] > 3600e3) delete rq.am[key];
    const a = rq.am[t] || [now, 0];
    if (a[1] >= AMEN_PER_HOUR) return json({ error: 'אמרתם הרבה אמן בשעה האחרונה. תודה!' }, 429);
    rq.am[t] = [a[0], a[1] + 1];
    rq.r[k][6]++;
    await this.ctx.storage.put('rq', rq);
    return json({ ok: true, s: view(st, rq) });
  }

  async admin(st, rq, b) {
    if (!b.a || (await sha(clean(b.a, 40))) !== st.ah) return json({ error: 'אין הרשאה' }, 403);
    if (b.op === 'hide') {
      const k = parseInt(b.k, 10);
      if (!(k >= 0 && k < st.c.length)) return json({ error: 'לא נמצא' }, 400);
      st.c[k][7] = st.c[k][7] ? 0 : 1;
    } else if (b.op === 'hideR') {
      const k = parseInt(b.k, 10);
      if (!(k >= 0 && k < rq.r.length)) return json({ error: 'לא נמצא' }, 400);
      rq.r[k][5] = rq.r[k][5] ? 0 : 1;
      await this.ctx.storage.put('rq', rq);
      return json({ ok: true, s: view(st, rq) });
    } else if (b.op === 'edit') {
      const m = cleanMeta(Object.assign({}, st.m, b.m || {}));
      if (!m) return json({ error: 'חסר שם לחנוכייה' }, 400);
      st.m = m;
    } else if (b.op === 'delete') {
      await this.ctx.storage.deleteAll();
      return json({ ok: true, deleted: true });
    } else return json({ error: 'פעולה לא מוכרת' }, 400);
    await this.ctx.storage.put('st', st);
    return json({ ok: true, s: view(st, rq) });
  }

  async alarm() { await this.ctx.storage.deleteAll(); }
}

// מה שכל אחד רואה: בלי מזהי המכשירים. k = המספר הסידורי (למנהל, להסתרה).
// r = הבקשות: [k, סוג, שם, טקסט, זמן, אמן].
function view(st, rq) {
  const shown = st.c.map((x, k) => [k, x[0], x[1], x[2], x[3], x[4], x[5], x[7]]).filter(x => !x[7]);
  const req = ((rq && rq.r) || []).map((x, k) => [k, x[0], x[1], x[2], x[3], x[6], x[5]]).filter(x => !x[6]);
  return { id: st.id, m: st.m, at: st.at, n: shown.length, c: shown.slice(-120).reverse().map(x => x.slice(0, 7)),
    nr: req.length, r: req.slice(-150).reverse().map(x => x.slice(0, 6)) };
}

// שם ה' נכתב ה׳; מילים פוגעניות ופרטי קשר נחסמים (אותה רשימה כמו בדף).
function holyName(s) { return s.replace(/י[\s'"׳״-]*ה[\s'"׳״-]*ו[\s'"׳״-]*ה/g, 'ה׳').replace(/אלוהים/g, 'אלוקים'); }
const BAD_SUB = ['שרמוט', 'זונה', 'כוסאמ', 'כוס אמ', 'כוסעמ', 'מניאק', 'קוקסינ', 'בןזונה', 'ימח שמ', 'מוות ל', 'שימות', 'שתמות', 'נאצי', 'fuck', 'shit', 'bitch', 'cunt', 'porn', 'dick', 'whore', 'slut', 'nigg', 'פורנו', 'סקס'];
const BAD_WORD = /(^|[^א-ת])[והשלבכמ]?(זין|חרא|זבל|דפוק|מפגר|אידיוט|טמבל|כלב|חזיר|לעזאזל|תמות)([^א-ת]|$)/;
function badWords(s) { const t = s.toLowerCase(); return BAD_SUB.some(w => t.includes(w)) || BAD_WORD.test(t); }
function contactInfo(s) { return /\d[\d\s-]{6,}\d/.test(s) || /https?:|www\.|\.com|\.co\.il|@/i.test(s); }

const SITE = 'https://hakelim.com/kodesh/chanuka/chanukiya/';
const PHR = { niftar: 'לעילוי נשמת', refua: 'לרפואת', hatzlacha: 'להצלחת', zivug: 'לזיווג הגון ל', zchut: 'לזכות' };
function title(m) {
  if (m.p === 'kehila') return m.n;
  const ph = m.p === 'other' ? (m.pt || '') : PHR[m.p] || '';
  const who = m.n + (m.par ? ' ' + m.bb + ' ' + m.par : '');
  return 'חנוכייה ' + (ph ? (/(^|\s)ל$/.test(ph) ? ph + who : ph + ' ' + who) : who);
}
function sharePage(st) {
  const h = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let t = 'חנוכייה משותפת בקישור', desc = 'כל אחד מדליק נר עם הקדשה – לעילוי נשמה, לרפואה, להצלחה. אור אחד מוסיף אור.', to = SITE;
  if (st) {
    const n = st.c.filter(x => !x[7]).length;
    t = title(st.m);
    desc = (n === 1 ? 'כבר הודלק נר אחד. ' : n ? 'כבר הודלקו ' + n + ' נרות. ' : '') + 'היכנסו והדליקו גם אתם נר, עם הקדשה או ברכה.';
    to = SITE + '?h=' + st.id;
  }
  const html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + h(t) + '</title><meta name="description" content="' + h(desc) + '">' +
    '<meta property="og:type" content="website"><meta property="og:locale" content="he_IL"><meta property="og:site_name" content="כלי קודש">' +
    '<meta property="og:title" content="' + h(t) + '"><meta property="og:description" content="' + h(desc) + '">' +
    '<meta property="og:image" content="https://hakelim.com/assets/og-kodesh.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
    '<meta property="og:url" content="' + h(to) + '"><meta name="twitter:card" content="summary_large_image">' +
    '<link rel="canonical" href="' + h(to) + '"><meta http-equiv="refresh" content="0;url=' + h(to) + '">' +
    '<script>location.replace(' + JSON.stringify(to) + ' + location.hash)</script>' +
    '<style>body{font-family:Arial,sans-serif;background:#0e1628;color:#eef0f6;text-align:center;padding:3rem 1rem}a{color:#d4b062}</style></head>' +
    '<body><p>' + h(t) + '</p><p><a href="' + h(to) + '">לחצו כאן לחנוכייה</a></p></body></html>';
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } });
}

function cleanMeta(b) {
  if (!b) return null;
  const n = clean(b.n, 60);
  if (!n) return null;
  return {
    p: PURPOSES.includes(b.p) ? b.p : 'niftar',
    pt: clean(b.pt, 40),
    n,
    bb: b.bb === 'בת' ? 'בת' : 'בן',
    par: clean(b.par, 40),
    x: clean(b.x, 200),
    cr: clean(b.cr, 40),
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
