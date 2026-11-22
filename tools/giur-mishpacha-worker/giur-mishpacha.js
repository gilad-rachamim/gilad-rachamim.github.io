// משפחה מלווה לגיור – רישום משפחות מתנדבות לפי עיר. Cloudflare Worker + Durable Object אחד (SQLite, חינמי).
// מחובר ל-/kodesh/giur/mishpacha-melava/ (טופס + מונה לפי עיר) ול-/kodesh/giur/mishpacha-melava/sheli/ (הרשימה של גילעד).
//
// ציבורי:
//   GET  /count                              -> {total, cities:[[עיר, מספר]...]}   רק מספרים, בלי פרטים
//   POST /join  {fam, city, phone, email, kehila, offer[], note, consent, hp, ms}
//                                            -> {no, tok, upd?}   משפחה חדשה (אותו טלפון = עדכון)
//   POST /leave {no, tok}                    -> {ok}              המשפחה מוחקת את עצמה (הטוקן נשמר רק בטלפון שלה)
// ניהול (כותרת X-Admin-Key):
//   GET  /admin/list                         -> כל המשפחות, כולל פרטים
//   POST /admin/del {no}                     -> מחיקה
//   POST /admin/set {no, st?, memo?}         -> סטטוס (new/contacted/active/paused) והערה פנימית
//
// הגנה מספאם בלי CAPTCHA: שדה מלכודת (hp), זמן מילוי מינימלי, 3 רישומים ביום לכל רשת (טביעה יומית, לא כתובת),
// 60 ביום לכל האתר, וטלפון ישראלי תקין בלבד.
import { CITIES } from './cities.js';

const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const OFFERS = ['shabbat', 'chag', 'limud', 'beitkneset', 'beitdin', 'kehila', 'ivrit'];
const STATUS = ['new', 'contacted', 'active', 'paused'];
const LIM = { IP: 3, ALL: 60, MIN_MS: 4000 };

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const url = new URL(req.url);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'giur-mishpacha', v: 1 });
      else {
        const admin = url.pathname.startsWith('/admin/');
        if (admin && (!env.ADMIN_KEY || req.headers.get('X-Admin-Key') !== env.ADMIN_KEY)) res = json({ error: 'forbidden' }, 403);
        else {
          const ip = req.headers.get('CF-Connecting-IP') || 'x';
          const iph = (await sha(ip + '|' + day() + '|' + (env.ADMIN_KEY || 'salt'))).slice(0, 16);
          const r = await store(env).fetch('https://do' + url.pathname, {
            method: req.method, headers: { 'X-Iph': iph }, body: req.method === 'POST' ? await req.text() : undefined });
          res = new Response(r.body, r);
        }
      }
    } catch (e) {
      res = json({ error: 'שגיאה פנימית' }, 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};
function store(env) { return env.FAM.get(env.FAM.idFromName('families')); }

export class Families {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.s = ctx.storage; }

  async fetch(req) {
    const p = new URL(req.url).pathname, iph = req.headers.get('X-Iph') || 'x';
    const b = req.method === 'POST' ? await readJson(req) : null;
    if (req.method === 'POST' && !b) return json({ error: 'בקשה לא תקינה' }, 400);
    if (p === '/count' && req.method === 'GET') return this.count();
    if (p === '/join' && b) return this.join(b, iph);
    if (p === '/leave' && b) return this.leave(b);
    if (p === '/admin/list') return json({ items: await this.all(), cities: CITIES });
    if (p === '/admin/del' && b) return this.del(b);
    if (p === '/admin/set' && b) return this.set(b);
    return json({ error: 'not found' }, 404);
  }

  async all() {
    const m = await this.s.list({ prefix: 'f:', limit: 5000 });
    return [...m.values()].map(f => { const o = { ...f }; delete o.tok; return o; });
  }

  async count() {
    const m = await this.s.list({ prefix: 'f:', limit: 5000 }), c = {};
    let total = 0;
    for (const f of m.values()) { if (f.test) continue; c[f.city] = (c[f.city] || 0) + 1; total++; }
    const cities = Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'he'));
    return json({ total, cities });
  }

  async bump(key, max) {
    const k = 'rl:' + day() + ':' + key, n = ((await this.s.get(k)) || 0) + 1;
    await this.s.put(k, n);
    if (n === 1) this.ctx.waitUntil(this.sweep());
    return n > max;
  }

  async sweep() {               // מונים של ימים קודמים
    const old = await this.s.list({ prefix: 'rl:', limit: 1000 }), today = 'rl:' + day() + ':';
    const del = [...old.keys()].filter(k => !k.startsWith(today));
    for (let i = 0; i < del.length; i += 120) await this.s.delete(del.slice(i, i + 120));
  }

  async join(b, iph) {
    if (b.hp) return json({ no: 0 });                                          // בוט
    if (!(Number(b.ms) >= LIM.MIN_MS)) return json({ error: 'רגע, מהר מדי. בדקו את הפרטים ושלחו שוב.' }, 400);
    const fam = clean(b.fam, 60), city = String(b.city || '');
    if (fam.length < 2) return json({ error: 'כתבו את שם המשפחה.' }, 400);
    if (!CITIES.includes(city)) return json({ error: 'בחרו עיר מהרשימה.' }, 400);
    const phone = normPhone(b.phone);
    if (!phone) return json({ error: 'מספר הטלפון לא נראה תקין. כתבו מספר ישראלי, למשל 050-1234567.' }, 400);
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
    if (email && !/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/.test(email)) return json({ error: 'כתובת המייל לא נראית תקינה. אפשר לתקן, או להשאיר ריק.' }, 400);
    if (b.consent !== true) return json({ error: 'כדי להירשם צריך לסמן את ההסכמה להעביר את הפרטים לגופי הגיור הרשמיים.' }, 400);
    const offer = (Array.isArray(b.offer) ? b.offer : []).filter(o => OFFERS.includes(o));
    if (await this.bump('j:' + iph, LIM.IP)) return json({ error: 'קיבלנו מכם כבר כמה רישומים היום. תודה! אם צריך לתקן משהו, כתבו לגילעד.' }, 429);
    if (await this.bump('j:all', LIM.ALL)) return json({ error: 'הגיעו היום הרבה מאוד רישומים. נסו שוב מחר.' }, 429);

    const rec = { fam, city, phone, email, kehila: clean(b.kehila, 80), offer, note: clean(b.note, 300),
      consent: true, test: /בדיקה|טסט|test/i.test(fam) };
    const prevNo = await this.s.get('p:' + phone);
    if (prevNo) {                                                             // אותו טלפון – עדכון, לא כפילות
      const old = await this.s.get('f:' + pad(prevNo));
      if (old) {
        const f = { ...old, ...rec, no: old.no, t: old.t, tu: Date.now(), st: old.st, memo: old.memo || '' };
        await this.s.put('f:' + pad(prevNo), f);
        return json({ no: f.no, tok: f.tok, upd: true });
      }
    }
    const no = ((await this.s.get('n')) || 0) + 1, tok = rand();
    const f = { no, t: Date.now(), ...rec, st: 'new', memo: '', tok };
    await this.s.put({ n: no, ['f:' + pad(no)]: f, ['p:' + phone]: no });
    return json({ no, tok });
  }

  async leave(b) {
    const no = parseInt(b.no, 10), f = await this.s.get('f:' + pad(no));
    if (!f || !b.tok || f.tok !== b.tok) return json({ error: 'לא נמצא רישום להסרה.' }, 404);
    await this.s.delete(['f:' + pad(no), 'p:' + f.phone]);
    return json({ ok: true });
  }

  async del(b) {
    const no = parseInt(b.no, 10), f = await this.s.get('f:' + pad(no));
    if (!f) return json({ error: 'not found' }, 404);
    await this.s.delete(['f:' + pad(no), 'p:' + f.phone]);
    return json({ ok: true, no });
  }

  async set(b) {
    const no = parseInt(b.no, 10), f = await this.s.get('f:' + pad(no));
    if (!f) return json({ error: 'not found' }, 404);
    if (b.st !== undefined) { if (!STATUS.includes(b.st)) return json({ error: 'bad status' }, 400); f.st = b.st; }
    if (b.memo !== undefined) f.memo = clean(b.memo, 300);
    await this.s.put('f:' + pad(no), f);
    return json({ ok: true, no, st: f.st, memo: f.memo });
  }
}

// ---------- עזר ----------
function clean(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function normPhone(s) {
  let d = String(s || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+972')) d = '0' + d.slice(4); else if (d.startsWith('972')) d = '0' + d.slice(3);
  return /^0(5\d|[2-4689]|7\d)\d{7}$/.test(d) ? d : '';
}
function rand() { const a = new Uint8Array(12); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
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
