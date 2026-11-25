// kelim-kishur – מקצר הקישורים של מיזם הכלים (hakelim.com).
// Cloudflare Worker + D1. כתובת קצרה: https://s.hakelim.com/<קוד>
// בחינם, בלי הרשמה, בלי פרסומות; בלמים נגד ניצול לרעה (ראו README.md).
//
// נקודות קצה:
//   POST /api/new     {url, alias?}      -> {code, short, key}
//   POST /api/bulk    {urls:[...]}       -> {results:[...]}   (עד 20)
//   GET  /api/check?alias=               -> {free, reason?}
//   GET  /api/stats?code=&key=           -> {url, clicks, created, days:[{day,n}], disabled}
//   POST /api/edit    {code,key,url}
//   POST /api/delete  {code,key}
//   POST /api/report  {code,reason}
//   GET  /api/admin?action=list|disable|enable&code=   (כותרת x-admin-key)
//   GET  /<code>      -> 302 ליעד     GET /<code>+ -> דף תצוגה מקדימה

const ORIGINS = [
  'https://hakelim.com',
  'https://www.hakelim.com',
  'https://gilad-rachamim.github.io',
  // בעתיד (תוסף הכרום): 'chrome-extension://<id>'
];
const TOOL_URL = 'https://hakelim.com/kelim/machshev/kitzur-kishurim/';
const DEFAULT_BASE = 'https://s.hakelim.com';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // בלי 0 o 1 l i
const MAX_BODY = 20 * 1024;
const MAX_URL = 2000;
const MAX_BULK = 20;
const LIMIT_HOUR = 20;
const LIMIT_DAY = 100;
const LIMIT_REPORT_HOUR = 5;
const LIMIT_GLOBAL_DAY = 5000;
const REPORTS_TO_DISABLE = 3;
const RECHECK_MS = 24 * 3600 * 1000;

const RESERVED = new Set(('api admin s www new stats report preview kelim hakelim static assets favicon.ico robots.txt about help login ' +
  'google gmail paypal bit paybox leumi hapoalim discount mizrahi poalim isracard max cal visa gov misrad bituach btl doar israelpost ' +
  'amazon apple facebook instagram whatsapp telegram microsoft netflix bank pay secure verify account').split(' '));
// מותגים שמושכים דיוג – אסורים גם כתחילת שם
const RESERVED_PREFIX = ('google gmail paypal bit paybox leumi hapoalim discount mizrahi poalim isracard max cal visa gov misrad bituach btl doar israelpost ' +
  'amazon apple facebook instagram whatsapp telegram microsoft netflix bank pay secure verify account ' +
  'לאומי פועלים ביטוח דואר בנק מזרחי דיסקונט ישראכרט פייפאל גוגל פייסבוק').split(' ');

const SHORTENERS = ['s.hakelim.com', 'bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'rebrand.ly', 'tiny.cc', 'ow.ly',
  'buff.ly', 'shorturl.at', 'rb.gy', 't.ly', 'katzr.net', 'kitsur.com', 'kishur.app', 'srt.co.il', 'short-link.me', 'u2l.ai', 'short.io', 'v.gd',
  'lnkd.in', 'tr.ee', 'bl.ink', 'soo.gd', 'clck.ru', 'urlz.fr', 'adf.ly', 'shorte.st'];
const BLOCKED_EXT = new Set('exe scr msi bat cmd apk jar vbs ps1 com pif dll lnk iso'.split(' '));
const BLOCKED_SUFFIX = ['.local', '.internal', '.localhost', '.lan', '.home', '.corp', '.intranet', '.test', '.invalid', '.example', '.onion'];
const BOT_UA = /bot|crawl|spider|preview|facebookexternalhit|WhatsApp|TelegramBot|Slack|Discord|curl|wget|python|HeadlessChrome|Go-http-client|okhttp/i;

// ---------- כלי עזר ----------
function corsHeaders(origin) {
  const ok = ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
  const h = { Vary: 'Origin' };
  if (ok) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}
function json(obj, status, origin, extra) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', ...corsHeaders(origin), ...(extra || {}) },
  });
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(s) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
function randKey() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function randCode(len) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (const x of b) s += ALPHABET[x % ALPHABET.length];
  return s;
}
function ilDay(d) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem' }).format(d || new Date()); // YYYY-MM-DD
}
function winKeys(now) {
  const d = new Date(now);
  const iso = d.toISOString(); // UTC מספיק לחלונות הגבלה
  return { hour: 'h:' + iso.slice(0, 13).replace(/\D/g, ''), day: 'd:' + iso.slice(0, 10).replace(/\D/g, '') };
}
function baseOf(url, env) {
  if (/^(localhost|127\.0\.0\.1)$/.test(url.hostname)) return url.origin;
  return env.SHORT_BASE || DEFAULT_BASE;
}
async function ipHash(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  return (await sha256((env.IP_SALT || 'dev-salt') + '|' + ip)).slice(0, 24);
}
function safeEq(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ---------- בדיקת יעד ----------
function hostMatches(host, list) {
  return list.some((d) => host === d || host.endsWith('.' + d));
}
function validateTarget(raw) {
  raw = String(raw == null ? '' : raw).trim();
  if (!raw) return { ok: false, reason: 'empty', msg: 'הדביקו קישור לקיצור.' };
  if (raw.length > MAX_URL) return { ok: false, reason: 'long', msg: 'הקישור ארוך מדי (עד 2,000 תווים).' };
  if (/[\s\u0000-\u001f]/.test(raw)) return { ok: false, reason: 'space', msg: 'בקישור יש רווחים או תווים לא תקינים.' };
  if (!/^https?:\/\//i.test(raw)) {
    if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(:\d+)?([/?#]|$)/i.test(raw)) raw = 'https://' + raw;
    else return { ok: false, reason: 'scheme', msg: 'אפשר לקצר רק קישורים של אתרים (שמתחילים ב-http או https).' };
  }
  let u;
  try { u = new URL(raw); } catch (e) { return { ok: false, reason: 'parse', msg: 'הקישור לא נראה תקין.' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: 'scheme', msg: 'אפשר לקצר רק קישורים של אתרים.' };
  if (u.username || u.password) return { ok: false, reason: 'userinfo', msg: 'לא מקצרים כתובת שיש בה שם משתמש או סיסמה.' };
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host.length > 253 || host.startsWith('[')) return { ok: false, reason: 'host', msg: 'הכתובת צריכה להיות שם אתר, לא כתובת מספרית.' };
  if (host === 'localhost' || BLOCKED_SUFFIX.some((s) => host.endsWith(s))) return { ok: false, reason: 'private', msg: 'אי אפשר לקצר כתובת פנימית.' };
  const labels = host.split('.');
  const tld = labels[labels.length - 1];
  if (labels.length < 2 || !/^([a-z]{2,}|xn--[a-z0-9-]+)$/.test(tld) || labels.some((l) => !l)) return { ok: false, reason: 'host', msg: 'הכתובת צריכה להיות שם אתר תקין (למשל example.com).' };
  if (u.port && u.port !== '80' && u.port !== '443') return { ok: false, reason: 'port', msg: 'אפשר לקצר רק כתובות בפורט הרגיל של אתר.' };
  if (hostMatches(host, SHORTENERS)) return { ok: false, reason: 'chain', msg: 'זה כבר קישור קצר. מקצרים את הקישור המקורי, לא קישור קצר.' };
  let path = u.pathname;
  try { path = decodeURIComponent(path); } catch (e) { /* נשאר כמו שהוא */ }
  const last = path.split('/').pop().toLowerCase();
  const dot = last.lastIndexOf('.');
  if (dot >= 0 && BLOCKED_EXT.has(last.slice(dot + 1))) return { ok: false, reason: 'ext', msg: 'לא מקצרים הורדה ישירה של קובץ הרצה או התקנה.' };
  return { ok: true, url: u.href, host };
}
// true = חסום, false = תקין, null = הבדיקה נכשלה (לא חוסמים)
async function dnsBlocked(host) {
  try {
    const r = await fetch('https://security.cloudflare-dns.com/dns-query?name=' + encodeURIComponent(host) + '&type=A', {
      headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.Status !== 0 && j.Status !== 3) return null;
    return (j.Answer || []).some((a) => a.data === '0.0.0.0');
  } catch (e) { return null; }
}

// ---------- שם מותאם ----------
function normAlias(a) {
  return String(a == null ? '' : a).trim().normalize('NFC').toLowerCase();
}
function aliasProblem(a) {
  if (a.length < 3 || a.length > 30) return 'השם צריך להיות באורך 3 עד 30 תווים.';
  if (!/^[a-z0-9א-ת-]+$/.test(a) || a.startsWith('-') || a.endsWith('-') || a.includes('--')) return 'מותרות אותיות באנגלית קטנות, ספרות, אותיות בעברית ומקף באמצע.';
  if (RESERVED.has(a) || RESERVED_PREFIX.some((p) => a.startsWith(p))) return 'השם הזה שמור (שמות של אתרים ובנקים ידועים לא ניתנים, כדי שלא ישתמשו בהם להטעיה). נסו שם אחר.';
  return '';
}

// ---------- הגבלת קצב ----------
async function rlGet(env, k, win) {
  const r = await env.DB.prepare('SELECT n FROM rl WHERE k=? AND win=?').bind(k, win).first();
  return r ? r.n : 0;
}
async function rlAdd(env, k, win, n) {
  await env.DB.prepare('INSERT INTO rl(k,win,n) VALUES(?,?,?) ON CONFLICT(k,win) DO UPDATE SET n=n+?').bind(k, win, n, n).run();
  if (Math.random() < 0.01) { const y = ilDay(new Date(Date.now() - 86400000)).replace(/-/g, ''); await env.DB.prepare('DELETE FROM rl WHERE substr(win,3,8) < ?').bind(y).run(); }
}
// מחזיר '' אם מותר, אחרת הודעה
async function createGate(env, ih, count) {
  const w = winKeys(Date.now());
  const [h, d, g] = await Promise.all([rlGet(env, 'c:' + ih, w.hour), rlGet(env, 'c:' + ih, w.day), rlGet(env, 'g', w.day)]);
  if (h + count > LIMIT_HOUR) return 'הגעתם למכסה לשעה, נסו שוב בעוד מעט.';
  if (d + count > LIMIT_DAY) return 'הגעתם למכסה היומית. נסו שוב מחר.';
  if (g + count > LIMIT_GLOBAL_DAY) return 'השירות עמוס מאוד היום ומאט כדי להישאר בחינם לכולם. נסו שוב מחר.';
  return '';
}
async function createCount(env, ih, count) {
  const w = winKeys(Date.now());
  await Promise.all([rlAdd(env, 'c:' + ih, w.hour, count), rlAdd(env, 'c:' + ih, w.day, count), rlAdd(env, 'g', w.day, count)]);
}

// ---------- יצירה ----------
async function aliasFree(env, a) {
  const r = await env.DB.prepare('SELECT 1 FROM links WHERE code=?').bind(a).first();
  return !r;
}
async function insertLink(env, code, url, keyHash, ih, checkedAt) {
  const r = await env.DB.prepare('INSERT OR IGNORE INTO links(code,url,created,key_hash,clicks,checked_at,disabled,creator) VALUES(?,?,?,?,0,?,0,?)')
    .bind(code, url, Date.now(), keyHash, checkedAt, ih).run();
  return r.meta && r.meta.changes === 1;
}
async function makeLink(env, base, rawUrl, aliasRaw, ih) {
  const v = validateTarget(rawUrl);
  if (!v.ok) return { status: 400, error: v.msg, reason: v.reason };
  let alias = '';
  if (aliasRaw != null && String(aliasRaw).trim() !== '') {
    alias = normAlias(aliasRaw);
    const p = aliasProblem(alias);
    if (p) return { status: 400, error: p, reason: 'alias' };
    if (!(await aliasFree(env, alias))) return { status: 409, error: 'השם הזה כבר תפוס. נסו שם אחר.', reason: 'taken' };
  }
  const blocked = await dnsBlocked(v.host);
  if (blocked) return { status: 400, error: 'הכתובת הזאת מסומנת כאתר זדוני או כאתר דיוג, ולכן לא מקצרים אותה.', reason: 'malware' };
  const checkedAt = blocked === null ? 0 : Date.now();
  const key = randKey();
  const keyHash = await sha256(key);
  let code = alias;
  if (alias) {
    if (!(await insertLink(env, alias, v.url, keyHash, ih, checkedAt))) return { status: 409, error: 'השם הזה כבר תפוס. נסו שם אחר.', reason: 'taken' };
  } else {
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) {
      code = randCode(i < 3 ? 5 : 6);
      ok = await insertLink(env, code, v.url, keyHash, ih, checkedAt);
    }
    if (!ok) return { status: 503, error: 'לא הצלחנו ליצור קישור כרגע. נסו שוב.', reason: 'busy' };
  }
  return { status: 200, code, short: base + '/' + encodeURIComponent(code), key, url: v.url };
}

// ---------- ניהול לפי מפתח ----------
async function ownLink(env, code, key) {
  code = normAlias(code);
  const row = await env.DB.prepare('SELECT * FROM links WHERE code=?').bind(code).first();
  if (!row) return { row: null };
  const ok = safeEq(row.key_hash, await sha256(String(key || '')));
  return { row, ok };
}

// ---------- דפי HTML ----------
function htmlPage(title, body, status) {
  const h = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>
body{margin:0;background:#0f0d0a;color:#f1e8d6;font:17px/1.6 system-ui,'Segoe UI',Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:1rem;box-sizing:border-box}
main{max-width:30rem;width:100%;border:1px solid #4a3f2a;border-radius:16px;padding:1.4rem;background:#17130d}
h1{font-size:1.4rem;margin:.2rem 0 .8rem;color:#e8c46a}p{margin:.5rem 0}.url{direction:ltr;text-align:left;word-break:break-all;background:#0f0d0a;border:1px solid #4a3f2a;border-radius:10px;padding:.7rem;margin:.8rem 0;font-family:ui-monospace,Consolas,monospace;font-size:.95rem}
.btn{display:inline-block;border:0;border-radius:999px;padding:.7rem 1.3rem;font:inherit;font-weight:700;cursor:pointer;text-decoration:none;margin:.3rem .3rem 0 0}
.go{background:#e8c46a;color:#1a1408}.rep{background:transparent;color:#f1e8d6;border:1px solid #6b5c3a}a{color:#e8c46a}small{color:#b9ad92}</style></head><body><main>${body}</main></body></html>`;
  return new Response(h, { status: status || 200, headers: {
    'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'",
  } });
}
function notFoundPage() {
  return htmlPage('הקישור לא נמצא', `<h1>הקישור הזה לא נמצא</h1><p>ייתכן שהוקלד שגוי, ואולי הוא נמחק.</p><p><a href="${TOOL_URL}">לקצר קישור חדש, בחינם ←</a></p>`, 404);
}
function gonePage(disabled) {
  return disabled === 2
    ? htmlPage('הקישור נמחק', `<h1>הקישור הזה נמחק</h1><p>מי שיצר אותו מחק אותו.</p><p><a href="${TOOL_URL}">לקצר קישור חדש, בחינם ←</a></p>`, 410)
    : htmlPage('הקישור הושבת', `<h1>הקישור הזה הושבת</h1><p>הוא דווח כחשוד או נחסם בבדיקת בטיחות, ולכן לא מפנים אליו.</p><p><a href="${TOOL_URL}">לקצר קישור חדש, בחינם ←</a></p>`, 410);
}
function warnPage() {
  return htmlPage('אתר חשוד', `<h1>⚠ עצרנו אותך</h1><p>האתר שהקישור הזה מוביל אליו מסומן כזדוני או כאתר דיוג, ולכן לא ממשיכים אליו.</p><p><a href="${TOOL_URL}">לקצר קישור חדש, בחינם ←</a></p>`, 410);
}
function previewPage(code, url, base) {
  let host = '';
  try { host = new URL(url).hostname; } catch (e) { /* ריק */ }
  const body = `<h1>לאן הקישור הזה מוביל?</h1><p>הקישור הקצר <b dir="ltr">${esc(base + '/' + code)}</b> מוביל לאתר:</p><p><b dir="ltr">${esc(host)}</b></p><div class="url" dir="ltr">${esc(url)}</div>
<p><small>בדקו שזה האתר שציפיתם לו. לא מקלידים סיסמה או פרטי כרטיס אשראי אחרי קישור שהגיע מזר.</small></p>
<a class="btn go" href="${esc('/' + encodeURIComponent(code))}" rel="nofollow noopener noreferrer">המשך לאתר</a><button class="btn rep" id="r" type="button">דיווח על קישור חשוד</button><p id="m" aria-live="polite"></p>
<script>document.getElementById('r').onclick=function(){var b=this;b.disabled=true;fetch('/api/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:${JSON.stringify(code)},reason:'preview'})}).then(function(r){return r.json()}).then(function(j){document.getElementById('m').textContent=j.error||'תודה, הדיווח התקבל.'}).catch(function(){document.getElementById('m').textContent='לא הצלחנו לשלוח, נסו שוב.';b.disabled=false})}</script>`;
  return htmlPage('לאן הקישור מוביל', body, 200);
}

// ---------- ספירה והפניה ----------
function recordClick(env, code) {
  const now = Date.now();
  return env.DB.batch([
    env.DB.prepare('UPDATE links SET clicks=clicks+1, last_click=? WHERE code=?').bind(now, code),
    env.DB.prepare('INSERT INTO clicks(code,day,n) VALUES(?,?,1) ON CONFLICT(code,day) DO UPDATE SET n=n+1').bind(code, ilDay()),
  ]);
}
async function handleCode(request, env, ctx, url, rawPath) {
  let p = rawPath;
  try { p = decodeURIComponent(rawPath); } catch (e) { return notFoundPage(); }
  p = p.replace(/^\/+/, '').replace(/\/+$/, '');
  let preview = false;
  if (p.endsWith('+')) { preview = true; p = p.slice(0, -1); }
  const code = normAlias(p);
  if (!code || code.length > 40 || code.includes('/')) return notFoundPage();
  const row = await env.DB.prepare('SELECT code,url,disabled,checked_at FROM links WHERE code=?').bind(code).first();
  if (!row) return notFoundPage();
  if (row.disabled) return gonePage(row.disabled);
  if (!row.checked_at || Date.now() - row.checked_at > RECHECK_MS) {
    let host = '';
    try { host = new URL(row.url).hostname; } catch (e) { /* ריק */ }
    const b = host ? await dnsBlocked(host) : null;
    if (b) {
      ctx.waitUntil(env.DB.prepare('UPDATE links SET disabled=1, checked_at=? WHERE code=?').bind(Date.now(), code).run());
      return warnPage();
    }
    if (b === false) ctx.waitUntil(env.DB.prepare('UPDATE links SET checked_at=? WHERE code=?').bind(Date.now(), code).run());
  }
  if (preview) return previewPage(code, row.url, baseOf(url, env));
  const ua = request.headers.get('user-agent') || '';
  if (request.method === 'GET' && !BOT_UA.test(ua)) ctx.waitUntil(recordClick(env, code));
  return new Response(null, { status: 302, headers: {
    location: row.url, 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer',
  } });
}

// ---------- API ----------
async function readBody(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) return { error: 'big' };
  const text = await request.text();
  if (text.length > MAX_BODY) return { error: 'big' };
  try { return { data: JSON.parse(text || '{}') }; } catch (e) { return { error: 'json' }; }
}
async function handleApi(request, env, ctx, url, path, origin) {
  const method = request.method;
  const base = baseOf(url, env);
  if (path === '/api/admin') return handleAdmin(request, env, url, origin);
  if (!corsHeaders(origin)['Access-Control-Allow-Origin']) return json({ error: 'origin' }, 403, origin);
  if (path === '/api/check') {
    if (method !== 'GET') return json({ error: 'method' }, 405, origin);
    const a = normAlias(url.searchParams.get('alias'));
    const p = aliasProblem(a);
    if (p) return json({ free: false, reason: p }, 200, origin);
    return json((await aliasFree(env, a)) ? { free: true } : { free: false, reason: 'השם הזה כבר תפוס.' }, 200, origin);
  }
  if (path === '/api/stats') {
    if (method !== 'GET') return json({ error: 'method' }, 405, origin);
    const o = await ownLink(env, url.searchParams.get('code'), url.searchParams.get('key'));
    if (!o.row) return json({ error: 'לא נמצא' }, 404, origin);
    if (!o.ok) return json({ error: 'מפתח הניהול לא תואם' }, 403, origin);
    const since = ilDay(new Date(Date.now() - 29 * 86400000));
    const days = await env.DB.prepare('SELECT day,n FROM clicks WHERE code=? AND day>=? ORDER BY day').bind(o.row.code, since).all();
    return json({ code: o.row.code, url: o.row.url, clicks: o.row.clicks, created: o.row.created, days: days.results || [], disabled: o.row.disabled }, 200, origin);
  }
  if (method !== 'POST') return json({ error: 'method' }, 405, origin);
  const b = await readBody(request);
  if (b.error) return json({ error: b.error === 'big' ? 'הבקשה גדולה מדי' : 'בקשה לא תקינה' }, b.error === 'big' ? 413 : 400, origin);
  const d = b.data || {};
  const ih = await ipHash(request, env);

  if (path === '/api/new') {
    const lim = await createGate(env, ih, 1);
    if (lim) return json({ error: lim }, 429, origin);
    const r = await makeLink(env, base, d.url, d.alias, ih);
    if (r.status !== 200) return json({ error: r.error, reason: r.reason }, r.status, origin);
    await createCount(env, ih, 1);
    return json({ code: r.code, short: r.short, key: r.key, url: r.url }, 200, origin);
  }
  if (path === '/api/bulk') {
    const urls = Array.isArray(d.urls) ? d.urls.slice(0, MAX_BULK + 1) : [];
    if (!urls.length) return json({ error: 'הדביקו לפחות קישור אחד.' }, 400, origin);
    if (urls.length > MAX_BULK) return json({ error: 'אפשר לקצר עד 20 קישורים בבת אחת.' }, 400, origin);
    const lim = await createGate(env, ih, urls.length);
    if (lim) return json({ error: lim }, 429, origin);
    const results = [];
    let made = 0;
    for (const u of urls) {
      const r = await makeLink(env, base, u, null, ih);
      if (r.status === 200) { made++; results.push({ url: r.url, code: r.code, short: r.short, key: r.key }); } else results.push({ url: u, error: r.error });
    }
    if (made) await createCount(env, ih, made);
    return json({ results }, 200, origin);
  }
  if (path === '/api/edit' || path === '/api/delete') {
    const o = await ownLink(env, d.code, d.key);
    if (!o.row) return json({ error: 'לא נמצא' }, 404, origin);
    if (!o.ok) return json({ error: 'מפתח הניהול לא תואם' }, 403, origin);
    if (o.row.disabled === 2) return json({ error: 'הקישור כבר נמחק' }, 410, origin);
    if (path === '/api/delete') {
      await env.DB.prepare("UPDATE links SET disabled=2, url='' WHERE code=?").bind(o.row.code).run();
      return json({ ok: true }, 200, origin);
    }
    const lim = await createGate(env, ih, 1);
    if (lim) return json({ error: lim }, 429, origin);
    const v = validateTarget(d.url);
    if (!v.ok) return json({ error: v.msg, reason: v.reason }, 400, origin);
    const blocked = await dnsBlocked(v.host);
    if (blocked) return json({ error: 'הכתובת הזאת מסומנת כאתר זדוני או כאתר דיוג, ולכן לא מקצרים אותה.', reason: 'malware' }, 400, origin);
    await env.DB.prepare('UPDATE links SET url=?, checked_at=? WHERE code=?').bind(v.url, blocked === null ? 0 : Date.now(), o.row.code).run();
    await createCount(env, ih, 1);
    return json({ ok: true, url: v.url }, 200, origin);
  }
  if (path === '/api/report') {
    const code = normAlias(d.code);
    const w = winKeys(Date.now());
    if ((await rlGet(env, 'p:' + ih, w.hour)) >= LIMIT_REPORT_HOUR) return json({ error: 'דיווחתם הרבה בשעה האחרונה, נסו שוב בעוד מעט.' }, 429, origin);
    const row = await env.DB.prepare('SELECT code,disabled FROM links WHERE code=?').bind(code).first();
    if (!row) return json({ error: 'הקישור לא נמצא' }, 404, origin);
    await rlAdd(env, 'p:' + ih, w.hour, 1);
    await env.DB.prepare('INSERT OR IGNORE INTO reports(code,reporter,reason,ts) VALUES(?,?,?,?)').bind(code, ih, String(d.reason || '').slice(0, 200), Date.now()).run();
    const c = await env.DB.prepare('SELECT COUNT(*) n FROM reports WHERE code=?').bind(code).first();
    let disabled = false;
    if (c && c.n >= REPORTS_TO_DISABLE && row.disabled === 0) {
      await env.DB.prepare('UPDATE links SET disabled=1 WHERE code=? AND disabled=0').bind(code).run();
      disabled = true;
    }
    return json({ ok: true, disabled }, 200, origin);
  }
  return json({ error: 'not found' }, 404, origin);
}
async function handleAdmin(request, env, url, origin) {
  const k = request.headers.get('x-admin-key');
  if (!env.ADMIN_KEY || !k || !safeEq(k, env.ADMIN_KEY)) return new Response('not found', { status: 404 });
  const action = url.searchParams.get('action') || 'list';
  if (action === 'list') {
    const r = await env.DB.prepare(`SELECT l.code, l.url, l.disabled, l.clicks, COUNT(r.reporter) reports, MAX(r.ts) last_report, GROUP_CONCAT(r.reason, ' | ') reasons
      FROM reports r JOIN links l ON l.code=r.code GROUP BY l.code ORDER BY last_report DESC LIMIT 50`).all();
    return json({ reports: r.results || [] }, 200, origin);
  }
  const code = normAlias(url.searchParams.get('code'));
  if (action === 'disable' || action === 'enable') {
    await env.DB.prepare('UPDATE links SET disabled=? WHERE code=? AND disabled!=2').bind(action === 'disable' ? 1 : 0, code).run();
    if (action === 'enable') await env.DB.prepare('DELETE FROM reports WHERE code=?').bind(code).run();
    return json({ ok: true }, 200, origin);
  }
  return json({ error: 'action' }, 400, origin);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '';
    const path = url.pathname;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (path === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    if (path === '/favicon.ico') return new Response(null, { status: 204 });
    if (path === '/' || path === '') return Response.redirect(TOOL_URL, 301);
    try {
      if (path.startsWith('/api/')) return await handleApi(request, env, ctx, url, path, origin);
      if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
      return await handleCode(request, env, ctx, url, path);
    } catch (e) {
      return json({ error: 'שגיאה בשרת, נסו שוב בעוד רגע.' }, 500, origin);
    }
  },
  async scheduled(event, env, ctx) {
    const y = ilDay(new Date(Date.now() - 86400000)).replace(/-/g, '');
    ctx.waitUntil(env.DB.prepare('DELETE FROM rl WHERE substr(win,3,8) < ?').bind(y).run());
  },
};
