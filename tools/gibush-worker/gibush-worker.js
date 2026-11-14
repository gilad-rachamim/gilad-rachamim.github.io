// "הכנה לגיבוש" – שכבת השותפים של /kelim/miluim/gibush/ (Cloudflare Worker, חינם).
// מה שבחינם (שבוע ראשון, המדריך) יושב בדף עצמו. כאן רק מה ששותפים מקבלים:
//   POST /open  {code}            → {ok, days:[40 ימים]}   (או {ok:false, badCode:true})
//   POST /file/<book|erev|days>   כותרת x-kelim-partner     → הקובץ (PDF / ההקלטה), בלי קישור ציבורי
// הקבצים יושבים בתיקייה private/ שעולה רק עם ה-Worker ([assets], run_worker_first) ולא במאגר הציבורי.
// קוד שותף: אותו קוד אישי של כל הכלים, 'NNN-DDDDD' = מספר + 5 ספרות HMAC(PARTNER_SECRET, 'chaye-partner:'+N)
// (tools/chaye-worker/partner_codes.py). ביטול קוד: REVOKED="7,12". ניחושים: עד BAD_MAX קודים שגויים ביום לכתובת.

const ALLOWED = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const CODE = /^(\d{3})-?(\d{5})$/;
const FILES = {
  book: ['/book.pdf', 'application/pdf', 'המסע לסופר-על שבך - מהדורת הגיבוש.pdf'],
  days: ['/40-days.pdf', 'application/pdf', '40 הודעות ל-40 יום.pdf'],
  erev: ['/erev.m4a', 'audio/mp4', 'ההקלטה לערב שלפני הגיבוש.m4a']
};

async function codeFor(secret, n) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('chaye-partner:' + n)));
  const v = ((sig[0] << 24 | sig[1] << 16 | sig[2] << 8 | sig[3]) >>> 0) % 100000;
  return String(n).padStart(3, '0') + '-' + String(v).padStart(5, '0');
}
async function partner(env, code) {
  const m = String(code || '').replace(/\s/g, '').match(CODE);
  if (!m || !env.PARTNER_SECRET) return false;
  if (String(env.REVOKED || '').split(',').map(x => x.trim()).filter(Boolean).map(Number).includes(+m[1])) return false;
  return (await codeFor(env.PARTNER_SECRET, +m[1])) === m[1] + '-' + m[2];
}

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-kelim-partner', 'access-control-expose-headers': 'content-disposition', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(h || {}) } });

// מונה ניחושים שגויים לכתובת ליום (Cache API של אותו מרכז נתונים – מספיק כדי שאי אפשר לנחש 100,000 צירופים)
async function badCount(req, add) {
  const ip = req.headers.get('cf-connecting-ip') || '0';
  const key = new Request('https://gibush.local/bad/' + new Date().toISOString().slice(0, 10) + '/' + encodeURIComponent(ip));
  const c = caches.default;
  const r = await c.match(key);
  let n = r ? +(await r.text()) || 0 : 0;
  if (add) { n++; await c.put(key, new Response(String(n), { headers: { 'cache-control': 'max-age=86400' } })); }
  return n;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(req.headers.get('origin'));
    if (req.method === 'OPTIONS') return new Response(null, { status: h ? 204 : 403, headers: h || {} });
    if (!h) return json({ error: 'origin' }, 403);
    if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
    const max = +(env.BAD_MAX || 12);
    if (await badCount(req, false) >= max) return json({ ok: false, error: 'יותר מדי ניסיונות היום. נסו שוב מחר, או כתבו לי בווטסאפ.' }, 429, h);

    if (url.pathname === '/open') {
      let b = {};
      try { b = await req.json(); } catch (e) {}
      if (!(await partner(env, b.code))) { await badCount(req, true); return json({ ok: false, badCode: true }, 200, h); }
      const r = await env.ASSETS.fetch(new Request(new URL('/days.json', url)));
      if (!r.ok) return json({ ok: false, error: 'התוכן לא זמין כרגע.' }, 503, h);
      return json({ ok: true, days: await r.json() }, 200, h);
    }
    const f = url.pathname.match(/^\/file\/(book|erev|days)$/);
    if (f) {
      if (!(await partner(env, req.headers.get('x-kelim-partner')))) { await badCount(req, true); return json({ ok: false, badCode: true }, 403, h); }
      const [p, type, name] = FILES[f[1]];
      const r = await env.ASSETS.fetch(new Request(new URL(p, url)));
      if (!r.ok) return json({ ok: false, error: 'הקובץ לא זמין כרגע.' }, 503, h);
      return new Response(r.body, { headers: { 'content-type': type, 'cache-control': 'private, no-store',
        'content-disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(name), ...h } });
    }
    return json({ error: 'not found' }, 404, h);
  }
};
