// בקשות כלים – Cloudflare Worker + Durable Object אחד (חינמי). מחובר ל-/kelim/bakasha/.
// כל בקשה מקבלת מספר רץ וסטטוס, ומופיעה בלוח ציבורי בלי שם ובלי פרטים מזהים.
//
// ציבורי:
//   GET  /board                         -> {items:[{no,what,dom,st,url,v,t}], sum}   הלוח (בלי מייל, בלי "למי")
//   POST /req    {what, who, dom, email, hp}  -> {no}                               בקשה חדשה
//   POST /vote   {no}                   -> {v}                                       "גם אני רוצה" (פעם ביום לכל רשת)
//   GET  /mailcheck?no&kind&h           -> {ok, what, url}   רק לסקריפט המיילים: מאשר שהכתובת היא זו שנשמרה, פעם אחת
// ניהול (כותרת X-Admin-Key):
//   GET  /admin/list                    -> הכול, כולל "למי", האם יש מייל, מוסתרות
//   POST /admin/set   {no, st?, url?, hid?}
//   POST /admin/add   {what, dom?}      בקשה שהגיעה בווטסאפ
//   POST /admin/digest {force?}         לשלוח עכשיו את הסיכום לבוט הפרטי (בדיקה)
// cron יומי 07:00 UTC: ניסיון חוזר למיילים שמחכים, ניקוי מונים; ביום ראשון – סיכום שבועי לגילעד (רק אם יש חדש).
//
// מיילים: ה-Worker לא שולח מייל בעצמו (ב-Cloudflare זה בתשלום). הוא מבקש מסקריפט הלידים הקיים (Apps Script),
// והסקריפט חוזר ל-/mailcheck כדי לוודא שהכתובת אמיתית. בלי סוד משותף, ובלי אפשרות לשלוח לכתובת אחרת.
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const DOMAINS = ['כלי קודש', 'נפש ויום-יום', 'לימודים', 'זכויות ושיקום', 'כסף', 'עסק קטן', 'יצירת תוכן', 'משפחה ובית', 'בריאות', 'מחשב וטלפון',
  'צבא ומילואים', 'חברה וקשרים', 'טיולים ונסיעות', 'אירועים', 'קהילה', 'עבודה', 'תמלול', 'מתכנתים', 'משחקי חשיבה', 'אחר'];
const STATUS = ['new', 'build', 'done', 'later'];
const LIM = { REQ_IP: 5, REQ_ALL: 150, VOTE_IP: 40 };   // ליום
const SITE = 'https://hakelim.com';

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const url = new URL(req.url);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'kelim-bakasha', v: 1 });
      else {
        const admin = url.pathname.startsWith('/admin/');
        if (admin && (!env.ADMIN_KEY || req.headers.get('X-Admin-Key') !== env.ADMIN_KEY)) res = json({ error: 'forbidden' }, 403);
        else {
          const ip = req.headers.get('CF-Connecting-IP') || 'x';
          const iph = (await sha(ip + '|' + day() + '|' + (env.ADMIN_KEY || 'salt'))).slice(0, 16);   // לא שומרים כתובת רשת, רק טביעה יומית
          const r = await board(env).fetch('https://do' + url.pathname + url.search, {
            method: req.method, headers: { 'X-Iph': iph }, body: req.method === 'POST' ? await req.text() : undefined });
          res = new Response(r.body, r);
        }
      }
    } catch (e) {
      res = json({ error: 'שגיאה פנימית: ' + (e && e.message || e) }, 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
  async scheduled(ev, env, ctx) {
    ctx.waitUntil(board(env).fetch('https://do/cron', { method: 'POST', body: '{}' }));
  },
};
function board(env) { return env.BOARD.get(env.BOARD.idFromName('board')); }

export class Board {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.s = ctx.storage; }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, iph = req.headers.get('X-Iph') || 'x';
    const b = req.method === 'POST' ? await readJson(req) : null;
    if (req.method === 'POST' && !b) return json({ error: 'בקשה לא תקינה' }, 400);
    if (p === '/board' && req.method === 'GET') return this.publicBoard();
    if (p === '/req' && b) return this.add(b, iph);
    if (p === '/vote' && b) return this.vote(b, iph);
    if (p === '/mailcheck') return this.mailcheck(url.searchParams);
    if (p === '/admin/list') return json({ items: await this.all(), meta: (await this.s.get('meta')) || {} });
    if (p === '/admin/set' && b) return this.set(b);
    if (p === '/admin/add' && b) return this.add({ what: b.what, dom: b.dom, who: b.who }, null, 'ווטסאפ');
    if (p === '/admin/digest' && b) return json(await this.digest(!!b.force));
    if (p === '/cron' && b) return json(await this.cron());
    return json({ error: 'not found' }, 404);
  }

  async all() {
    const m = await this.s.list({ prefix: 'r:', reverse: true, limit: 500 });
    return [...m.values()].map(r => ({ no: r.no, t: r.t, what: r.what, raw: r.raw !== r.what ? r.raw : undefined, who: r.who, dom: r.dom, st: r.st, url: r.url || '',
      v: r.v, hid: !!r.hid, src: r.src || '', mail: !!r.email, m_new: r.m_new || '', m_done: r.m_done || '' }));
  }

  async publicBoard() {
    const m = await this.s.list({ prefix: 'r:', reverse: true, limit: 500 });
    const items = [], sum = { new: 0, build: 0, done: 0, later: 0 };
    for (const r of m.values()) {
      if (r.hid) continue;
      sum[r.st]++;
      if (items.length < 300) items.push({ no: r.no, t: r.t, what: r.what, dom: r.dom, st: r.st, url: r.st === 'done' ? (r.url || '') : '', v: r.v });
    }
    return json({ items, sum });
  }

  async bump(key, max) {            // מונה יומי; true = עבר את התקרה
    const k = 'rl:' + day() + ':' + key, n = ((await this.s.get(k)) || 0) + 1;
    await this.s.put(k, n);
    return n > max;
  }

  async add(b, iph, src) {
    if (b.hp) return json({ no: 0 });                                          // בוט
    const raw = clean(b.what, 160);
    if (raw.length < 4) return json({ error: 'כתבו בכמה מילים מה הכלי צריך לעשות.' }, 400);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
    if (email && !/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/.test(email)) return json({ error: 'כתובת המייל לא נראית תקינה. אפשר לתקן, או להשאיר ריק.' }, 400);
    if (iph) {
      if (await this.bump('q:' + iph, LIM.REQ_IP)) return json({ error: 'קיבלתי מכם כבר כמה בקשות היום. תודה! אפשר לשלוח עוד מחר.' }, 429);
      if (await this.bump('q:all', LIM.REQ_ALL)) return json({ error: 'הגיעו היום הרבה מאוד בקשות. נסו שוב מחר.' }, 429);
    }
    const no = ((await this.s.get('n')) || 0) + 1;
    const r = { no, t: Date.now(), raw, what: publicText(raw), who: clean(b.who, 60), dom: DOMAINS.includes(b.dom) ? b.dom : '', email,
      st: 'new', url: '', v: 1, hid: false, src: src || 'טופס', m_new: email ? 'wait' : '', m_done: '' };
    await this.s.put({ n: no, ['r:' + pad(no)]: r });
    if (email) this.ctx.waitUntil(this.mail(r, 'new'));
    return json({ no, mail: !!email });
  }

  async vote(b, iph) {
    const no = parseInt(b.no, 10), r = await this.s.get('r:' + pad(no));
    if (!r || r.hid) return json({ error: 'הבקשה לא נמצאה.' }, 404);
    const k = 'rl:' + day() + ':v:' + no + ':' + iph;
    if (await this.s.get(k)) return json({ v: r.v, dup: true });
    if (await this.bump('v:' + iph, LIM.VOTE_IP)) return json({ v: r.v, dup: true });
    r.v++;
    await this.s.put({ [k]: 1, ['r:' + pad(no)]: r });
    return json({ v: r.v });
  }

  async set(b) {
    const no = parseInt(b.no, 10), r = await this.s.get('r:' + pad(no));
    if (!r) return json({ error: 'not found' }, 404);
    if (b.st !== undefined) { if (!STATUS.includes(b.st)) return json({ error: 'bad status' }, 400); r.st = b.st; }
    if (b.url !== undefined) r.url = safeUrl(b.url);
    if (b.hid !== undefined) r.hid = !!b.hid;
    if (r.st === 'done' && r.email && !r.m_done) r.m_done = 'wait';
    await this.s.put('r:' + pad(no), r);
    if (r.m_done === 'wait') this.ctx.waitUntil(this.mail(r, 'done'));
    return json({ ok: true, no, st: r.st, url: r.url, hid: r.hid, m_done: r.m_done });
  }

  // מבקש מסקריפט המיילים לשלוח. הסקריפט מאמת מולנו ב-/mailcheck, ושם המצב עובר ל-sent.
  async mail(r, kind) {
    if (!this.env.MAIL_URL || !r.email) return 'no-mailer';
    try {
      const body = new URLSearchParams({ _bk: '1', no: String(r.no), kind, to: r.email });
      const res = await fetch(this.env.MAIL_URL, { method: 'POST', body, redirect: 'follow' });
      return (await res.text()).slice(0, 40);
    } catch (e) { return 'err'; }
  }

  async mailcheck(q) {
    const no = parseInt(q.get('no'), 10), kind = q.get('kind') === 'done' ? 'done' : 'new', f = 'm_' + kind;
    const r = await this.s.get('r:' + pad(no));
    if (!r || !r.email || r.hid || r[f] !== 'wait' || (await sha(r.email)) !== q.get('h')) return json({ ok: false });
    if (kind === 'done' && r.st !== 'done') return json({ ok: false });
    r[f] = 'sent';
    await this.s.put('r:' + pad(no), r);
    return json({ ok: true, no, what: r.what, url: r.url || SITE + '/kelim/bakasha/' });
  }

  async digest(force) {
    const meta = (await this.s.get('meta')) || {}, since = meta.lastDigest || 0;
    const all = (await this.all()).filter(r => !r.hid);
    const fresh = all.filter(r => r.t > since && r.st === 'new').reverse();
    const sum = { new: 0, build: 0, done: 0, later: 0 };
    all.forEach(r => sum[r.st]++);
    if (!fresh.length && !force) return { sent: false, why: 'nothing new' };
    const line = r => r.no + ' · ' + r.what + (r.dom ? ' (' + r.dom + ')' : '');
    const top = all.filter(r => r.st === 'new' && r.v > 1).sort((a, b) => b.v - a.v)[0];
    let text = '📬 בקשות כלים: ' + (!fresh.length ? 'אין חדשות השבוע' : (fresh.length === 1 ? 'אחת חדשה' : fresh.length + ' חדשות') + ' השבוע\n\n' + fresh.slice(0, 10).map(line).join('\n'));
    if (fresh.length > 10) text += '\nועוד ' + (fresh.length - 10) + ' בלוח.';
    if (top) text += '\n\nהכי מבוקש עכשיו: ' + top.no + ' · ' + top.what + ' (' + top.v + ' רוצים)';
    text += '\n\nממתינות: ' + sum.new + ' · בבנייה: ' + sum.build + ' · נבנו: ' + sum.done;
    const markup = { inline_keyboard: [[{ text: '📋 לפתוח את הלוח שלי', url: SITE + '/kelim/bakasha/sheli/#k=' + this.env.ADMIN_KEY }]] };
    if (!this.env.HUB || !this.env.HUB_SECRET) return { sent: false, why: 'no hub binding', text };
    const res = await this.env.HUB.fetch('https://gilad-hub/pc/send', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Secret': this.env.HUB_SECRET }, body: JSON.stringify({ bot: 'hub', text, markup }) });
    const j = await res.json().catch(() => ({}));
    if (j.ok && !force) { meta.lastDigest = Date.now(); await this.s.put('meta', meta); }
    return { sent: !!j.ok, n: fresh.length };
  }

  async cron() {
    const out = { mails: 0, digest: null }, today = day();
    const old = await this.s.list({ prefix: 'rl:', limit: 1000 });            // מונים של ימים קודמים
    const del = [...old.keys()].filter(k => !k.startsWith('rl:' + today + ':'));
    for (let i = 0; i < del.length; i += 120) await this.s.delete(del.slice(i, i + 120));
    const m = await this.s.list({ prefix: 'r:', reverse: true, limit: 500 });
    for (const r of m.values()) {
      if (out.mails >= 20) break;
      if (r.hid || !r.email) continue;
      if (r.m_new === 'wait') { await this.mail(r, 'new'); out.mails++; }
      else if (r.m_done === 'wait') { await this.mail(r, 'done'); out.mails++; }
    }
    if (new Date().getUTCDay() === 0) out.digest = await this.digest(false);   // יום ראשון
    return out;
  }
}

// ---------- עזר ----------
function clean(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
// מה שמופיע בלוח הציבורי: בלי קישורים, בלי מיילים ובלי מספרי טלפון
function publicText(s) {
  return s.replace(/\bhttps?:\/\/\S+/gi, '…').replace(/\bwww\.\S+/gi, '…').replace(/\S+@\S+\.\S+/g, '…').replace(/(?:\+?\d[\s\-.]?){7,}/g, '… ').replace(/\s+/g, ' ').trim();
}
function safeUrl(u) {
  u = String(u || '').trim().slice(0, 200);
  if (!u) return '';
  if (u.startsWith('/')) return SITE + u;
  return /^https:\/\/(hakelim\.com|gilad-rachamim\.github\.io|t\.me)\//.test(u) ? u : '';
}
function pad(n) { return String(n).padStart(6, '0'); }
function day() { return new Date().toISOString().slice(0, 10); }
function corsHeaders(origin, env) {
  const extra = (env.EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = ORIGINS.includes(origin) || extra.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { 'Vary': 'Origin' };
  if (ok) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type, X-Admin-Key';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
async function readJson(req) { try { const t = await req.text(); return t ? JSON.parse(t) : {}; } catch (e) { return null; } }
async function sha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
