// קישורים קצרים לכרטיס ביקור לרב, לכרטיס ביקור למוהל ולדף עבודה – Cloudflare Worker + KV.
//  POST /s     {d: "<הקוד הארוך מאחרי #d=>"}  -> {k: "a7Xq2b"}   (אותו כרטיס = אותו קוד)
//  POST /s     {d: "...", t: "m"}              -> {k: "a7Xq2bZ"}  כרטיס מוהל: 7 תווים, כדי ש-/k/ ידע לאן להפנות
//  POST /s     {d: "...", t: "w"}              -> {k: "a7Xq2bZ9"} דף עבודה (/limudim/dapim/): 8 תווים
//  GET  /s/<k>                                -> {d: "..."}
//  POST /s     {d: "/kelim/..?..#..", t: "u"}  -> {k: "a7Xq2b"}  כל קישור באתר (hakelim.com/s/#קוד), בשיתוף מכל כלי
//  GET  /u/<k>                                -> {d: "/kelim/..."}
// KV:  c:<k> -> d  ·  h:<sha256(d)> -> k  ·  rl:<ip> -> מונה יצירות לשעה
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const D_RE = /^[\w-]{8,4000}$/;
const DM_RE = /^[\w-]{8,20000}$/; // כרטיס מוהל יכול לכלול תמונה קטנה
const DW_RE = /^[\w-]{8,24000}$/; // דף עבודה: הגדרות הדף + עד 20 שאלות של המורה
const K_RE = /^[0-9A-Za-z]{6,8}$/;
const ABC = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; // בלי I l O o – לא מתבלבלים
const PER_IP_HOUR = 30;
const U_PER_IP_HOUR = 120; // קישור רגיל: מורה ששולחת כמה דפים ברצף
const DU_RE = /^\/(?!\/)[^\s<>"'\\]{1,12000}$/; // נתיב באתר בלבד (לא כתובת של אתר אחר)

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req.headers.get('Origin') || '');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/s\/([^\/]+)$/);
      const mu = url.pathname.match(/^\/u\/([^\/]+)$/);
      if (url.pathname === '/s' && req.method === 'POST') res = await create(req, env);
      else if (m && req.method === 'GET') res = await get(m[1], env);
      else if (mu && req.method === 'GET') res = await getU(mu[1], env);
      else res = json({ error: 'not found' }, 404);
    } catch (e) {
      res = json({ error: 'internal' }, 500);
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

function corsHeaders(origin) {
  const ok = ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { 'Vary': 'Origin' };
  if (ok) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

function json(obj, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache } });
}

// דף עבודה: base64url של JSON {d: הגדרות הדף (topic.k.min...), c: כותרת, q: שאלות המורה (base64url)}
function validSheet(d) {
  if (!DW_RE.test(d)) return false;
  try {
    const b = atob(d.replace(/-/g, '+').replace(/_/g, '/'));
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0))));
    return o && typeof o === 'object' && typeof o.d === 'string' && /^[\w,~.-]{6,300}$/.test(o.d) &&
      (o.q === undefined || (typeof o.q === 'string' && /^[\w-]{0,22000}$/.test(o.q))) && (o.c === undefined || (typeof o.c === 'string' && o.c.length <= 60));
  } catch (e) { return false; }
}

// בודק שהקוד הוא באמת כרטיס: base64url של JSON עם שם (name ברב, n במוהל)
function validCard(d, mohel) {
  if (!(mohel ? DM_RE : D_RE).test(d)) return false;
  try {
    const b = atob(d.replace(/-/g, '+').replace(/_/g, '/'));
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0))));
    const n = mohel ? o && o.n : o && o.name;
    return o && typeof o === 'object' && typeof n === 'string' && n.trim().length > 0;
  } catch (e) { return false; }
}

async function sha(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function code(len) {
  const r = crypto.getRandomValues(new Uint8Array(len));
  return [...r].map(x => ABC[x % ABC.length]).join('');
}

async function create(req, env) {
  const origin = req.headers.get('Origin') || '';
  if (!corsHeaders(origin)['Access-Control-Allow-Origin']) return json({ error: 'origin' }, 403);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
  const d = body && typeof body.d === 'string' ? body.d : '';
  if (body.t === 'u') return createU(req, env, d);
  const mohel = body.t === 'm', sheet = body.t === 'w';
  if (sheet ? !validSheet(d) : !validCard(d, mohel)) return json({ error: 'bad card' }, 400);

  const h = 'h:' + (mohel ? 'm:' : sheet ? 'w:' : '') + await sha(d);
  const old = await env.KARTIS.get(h);
  if (old) return json({ k: old });

  const ip = req.headers.get('CF-Connecting-IP') || 'x';
  const rk = 'rl:' + ip;
  const n = parseInt(await env.KARTIS.get(rk) || '0', 10);
  if (n >= PER_IP_HOUR) return json({ error: 'rate' }, 429);
  await env.KARTIS.put(rk, String(n + 1), { expirationTtl: 3600 });

  let k = '';
  for (let i = 0; i < 5; i++) { const c = code(sheet ? 8 : mohel ? 7 : 6); if (!(await env.KARTIS.get('c:' + c))) { k = c; break; } }
  if (!k) return json({ error: 'busy' }, 503);
  await env.KARTIS.put('c:' + k, d);
  await env.KARTIS.put(h, k);
  return json({ k });
}

async function get(k, env) {
  if (!K_RE.test(k)) return json({ error: 'not found' }, 404);
  const d = await env.KARTIS.get('c:' + k, { cacheTtl: 3600 });
  if (!d) return json({ error: 'not found' }, 404);
  return json({ d }, 200, 'public, max-age=86400');
}

// ---------- קישור קצר לכל דף באתר ----------
async function createU(req, env, d) {
  if (!DU_RE.test(d)) return json({ error: 'bad link' }, 400);
  const h = 'h:u:' + await sha(d);
  const old = await env.KARTIS.get(h);
  if (old) return json({ k: old });
  const ip = req.headers.get('CF-Connecting-IP') || 'x';
  const rk = 'rlu:' + ip;
  const n = parseInt(await env.KARTIS.get(rk) || '0', 10);
  if (n >= U_PER_IP_HOUR) return json({ error: 'rate' }, 429);
  await env.KARTIS.put(rk, String(n + 1), { expirationTtl: 3600 });
  let k = '';
  for (let i = 0; i < 5; i++) { const c = code(6); if (!(await env.KARTIS.get('u:' + c))) { k = c; break; } }
  if (!k) return json({ error: 'busy' }, 503);
  await env.KARTIS.put('u:' + k, d);
  await env.KARTIS.put(h, k);
  return json({ k });
}

async function getU(k, env) {
  if (!/^[0-9A-Za-z]{6}$/.test(k)) return json({ error: 'not found' }, 404);
  const d = await env.KARTIS.get('u:' + k, { cacheTtl: 3600 });
  if (!d) return json({ error: 'not found' }, 404);
  return json({ d }, 200, 'public, max-age=86400');
}
