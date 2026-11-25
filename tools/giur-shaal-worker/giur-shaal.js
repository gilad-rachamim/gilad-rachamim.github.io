// "שאלה שלא מצאתי" בשו"ת לגרים – איסוף שאלות לגילעד בלבד. Cloudflare Worker + Durable Object אחד (SQLite, חינמי).
// ציבורי:
//   POST /ask {q, back, consent, hp, ms} -> {ok:true}   שאלה (חובה) ודרך חזרה (רשות). אין מספר, אין טוקן, אין מונה ציבורי.
// ניהול (כותרת X-Admin-Key):
//   GET  /admin/list                      -> כל השאלות
//   POST /admin/del {no}                  -> מחיקה
// הגנה מספאם בלי CAPTCHA: שדה מלכודת (hp), זמן מילוי מינימלי, 5 שאלות ביום לכל רשת (טביעה יומית, לא כתובת), 100 ביום לכל האתר.
// פרטיות: לא נשמרת כתובת רשת. שאלה שמכילה טלפון או מייל נדחית, כדי שלא יישמרו פרטים מזהים בטעות.
// השרת לא שולח מייל או הודעה לאף אחד.
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LIM = { IP: 5, ALL: 100, MIN_MS: 4000, QMIN: 8, QMAX: 600, BACK: 120 };

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req.headers.get('Origin') || '', env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const url = new URL(req.url);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'giur-shaal', v: 1 });
      else {
        const admin = url.pathname.startsWith('/admin/');
        if (admin && (!env.ADMIN_KEY || req.headers.get('X-Admin-Key') !== env.ADMIN_KEY)) res = json({ error: 'forbidden' }, 403);
        else {
          const ip = req.headers.get('CF-Connecting-IP') || 'x';
          const iph = (await sha(ip + '|' + day() + '|' + (env.ADMIN_KEY || 'salt'))).slice(0, 16);
          const r = await env.ASK.get(env.ASK.idFromName('questions')).fetch('https://do' + url.pathname, {
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

export class Questions {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.s = ctx.storage; }

  async fetch(req) {
    const p = new URL(req.url).pathname, iph = req.headers.get('X-Iph') || 'x';
    const b = req.method === 'POST' ? await readJson(req) : null;
    if (req.method === 'POST' && !b) return json({ error: 'בקשה לא תקינה' }, 400);
    if (p === '/ask' && b) return this.ask(b, iph);
    if (p === '/admin/list') return json({ items: [...(await this.s.list({ prefix: 'q:', limit: 5000 })).values()] });
    if (p === '/admin/del' && b) { const no = parseInt(b.no, 10); await this.s.delete('q:' + pad(no)); return json({ ok: true, no }); }
    return json({ error: 'not found' }, 404);
  }

  async bump(key, max) {
    const k = 'rl:' + day() + ':' + key, n = ((await this.s.get(k)) || 0) + 1;
    await this.s.put(k, n);
    if (n === 1) this.ctx.waitUntil(this.sweep());
    return n > max;
  }

  async sweep() {
    const old = await this.s.list({ prefix: 'rl:', limit: 1000 }), today = 'rl:' + day() + ':';
    const del = [...old.keys()].filter(k => !k.startsWith(today));
    for (let i = 0; i < del.length; i += 120) await this.s.delete(del.slice(i, i + 120));
  }

  async ask(b, iph) {
    if (b.hp) return json({ ok: true });                                      // בוט: מתעלמים בשקט
    if (!(Number(b.ms) >= LIM.MIN_MS)) return json({ error: 'רגע, מהר מדי. בדקו את השאלה ושלחו שוב.' }, 400);
    if (b.consent !== true) return json({ error: 'כדי לשלוח צריך לסמן שקראתם את ההבהרה.' }, 400);
    const q = clean(b.q, LIM.QMAX + 1);
    if (q.length < LIM.QMIN) return json({ error: 'כתבו את השאלה במשפט או שניים.' }, 400);
    if (q.length > LIM.QMAX) return json({ error: 'השאלה ארוכה מדי. קצרו אותה עד ' + LIM.QMAX + ' תווים.' }, 400);
    if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(q) || /(?:\+?972|0)[\s-]*\d(?:[\s-]*\d){7,9}/.test(q))
      return json({ error: 'נראה שבשאלה יש טלפון או מייל. אין צורך: כתבו רק את השאלה. אם רוצים שיחזרו אליכם, יש שדה נפרד.' }, 400);
    const back = clean(b.back, LIM.BACK);
    if (await this.bump('a:' + iph, LIM.IP)) return json({ error: 'קיבלנו מכם כבר כמה שאלות היום. תודה! אפשר להמשיך מחר.' }, 429);
    if (await this.bump('a:all', LIM.ALL)) return json({ error: 'הגיעו היום הרבה מאוד שאלות. נסו שוב מחר.' }, 429);
    const no = ((await this.s.get('n')) || 0) + 1;
    await this.s.put({ n: no, ['q:' + pad(no)]: { no, t: Date.now(), q, back } });
    return json({ ok: true });
  }
}

function clean(s, max) { return String(s || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max); }
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
