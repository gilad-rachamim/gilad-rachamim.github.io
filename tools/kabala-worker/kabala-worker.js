// "קורא הקבלות" – קריאת סכום, תאריך ושם העסק מצילום קבלה, לפורטל הלקוחות של רואי חשבון שותפים
// (/kelim/cheshbon/tik/). Cloudflare Worker, Workers AI במכסה החינמית.
//
// נתיבים:
//   POST /key   header x-kelim-partner: קוד שותף 'NNN-DDDDD'  -> {key}
//               רואה החשבון (החדר) מחליף את קוד השותף במפתח קריאה 'NNN.xxxxxxxxxxxxxxxxxxxx' שמיועד רק לכלי הזה.
//               את המפתח הזה הקוד בגוגל של רו"ח מוסר ללקוחות שלו, כך שקוד השותף עצמו לא יוצא מהמשרד.
//   POST /read  header x-kelim-partner: מפתח קריאה, body {pages:[{mime,data}]} (1–2 תמונות, base64)
//               -> {found, amount, date, vendor, doc, left}
//   GET  /ping
//
// פרטיות: התמונה עוברת לדגם, ומשם התשובה חוזרת ישר לדפדפן. לא נשמרת תמונה, לא נשמר טקסט, ואין לוגים של תוכן.
// Cloudflare לא מאמנת דגמים על מה שנשלח ל-Workers AI. נשמר רק מונה יומי (מספר השותף, וכתובת מגובבת לניחושים).
// ביטול שותף: מוסיפים את המספר שלו ל-REVOKED ב-wrangler.toml ופורסים שוב.

const ALLOWED = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const CODE = /^(\d{3})-?(\d{5})$/;
const KEY = /^(\d{3})\.([0-9a-f]{20})$/;
const MAX_BODY = 3_200_000;   // שתי תמונות של ~1600 פיקסלים ב-base64
const VISION = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/mistralai/mistral-small-3.1-24b-instruct'];

async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
}
// אותו חישוב כמו בשאר הכלים (chaye-worker.js / partner_codes.py)
async function codeFor(secret, n) {
  const s = await hmac(secret, 'chaye-partner:' + n);
  const v = ((s[0] << 24 | s[1] << 16 | s[2] << 8 | s[3]) >>> 0) % 100000;
  return String(n).padStart(3, '0') + '-' + String(v).padStart(5, '0');
}
async function keyFor(secret, n) {
  const s = await hmac(secret, 'kabala-key:' + n);
  return String(n).padStart(3, '0') + '.' + [...s.slice(0, 10)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const revoked = (env, n) => String(env.REVOKED || '').split(',').map(x => x.trim()).filter(Boolean).map(Number).includes(n);
async function partnerNo(env, code) {
  const m = String(code || '').replace(/\s/g, '').match(CODE);
  if (!m || !env.PARTNER_SECRET || revoked(env, +m[1])) return 0;
  return (await codeFor(env.PARTNER_SECRET, +m[1])) === m[1] + '-' + m[2] ? +m[1] : 0;
}
async function keyNo(env, key) {
  const m = String(key || '').trim().match(KEY);
  if (!m || !env.PARTNER_SECRET || revoked(env, +m[1])) return 0;
  return (await keyFor(env.PARTNER_SECRET, +m[1])) === m[0] ? +m[1] : 0;
}

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-kelim-partner', 'access-control-max-age': '86400', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(h || {}) } });
const today = () => new Date().toISOString().slice(0, 10);
async function ipHash(request) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(today() + '|' + (request.headers.get('cf-connecting-ip') || 'x') + '|kabala'));
  return [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
}
async function take(env, b) {
  if (!env.QUOTA) return { ok: true, left: 0 };
  const stub = env.QUOTA.get(env.QUOTA.idFromName('d'));
  return (await stub.fetch('https://q/take', { method: 'POST', body: JSON.stringify({ day: today(), ...b }) })).json();
}

// ---- הקריאה עצמה ----
function rules(pages) {
  return 'You read photos and scans of Israeli receipts and tax invoices (קבלה, חשבונית מס, חשבונית מס/קבלה), mostly in Hebrew, sometimes crumpled thermal paper. ' +
    (pages > 1 ? 'You get the FIRST and the LAST page of the same document side by side; the final total is usually on the last page. ' : '') +
    'Return JSON only, with these fields:\n' +
    '"total": the final amount the customer paid, as written (look for "סה"כ לתשלום", "לתשלום", "סה"כ כולל מע"מ", "סכום עסקה", "סה"כ שולם", "Total"). ' +
    'It is the amount INCLUDING VAT and AFTER any discount (הנחה, השתתפות, החזר): when a "סה"כ" line is followed by a discount, the answer is the smaller amount on "לתשלום" / "סכום עסקה" after it. ' +
    'Never the VAT line (מע"מ), never the amount before VAT (חייב במע"מ, סה"כ לפני מע"מ), never change (עודף), discount (הנחה), a single item, a card number, a phone, a business number (ח.פ / ע.מ / עוסק מורשה) or an approval number. Digits and a decimal point only, e.g. "1275.83". Empty if you cannot see it.\n' +
    '"date": the document date exactly as printed (e.g. "06/11/2026", "17/05/26", "24.06.2026"). Israeli dates are day/month/year. Empty if none.\n' +
    '"vendor": the name of the business that ISSUED the receipt, as printed at the top or next to its business number (e.g. "רמי לוי שיווק השקמה", "מאוחדת פארם", "יוניון ספורט"). Never the customer ("לכבוד", "שם לקוח"), never the software or payment company. Short, max 6 words. Empty if unsure.\n' +
    '"doc": the document type in Hebrew as printed ("חשבונית מס/קבלה", "קבלה", "חשבונית מס"), or empty.\n' +
    '"found": true if this is a receipt or invoice with a readable total, else false.\n' +
    'Never invent anything that is not in the image. Inside Hebrew strings write ״ (gershayim) instead of a straight double quote, e.g. בע״מ.';
}
const SHAPE = ' Answer with JSON only: {"found":true,"total":"45.00","date":"06/11/2026","vendor":"...","doc":"חשבונית מס/קבלה"}';

function parseOut(r) {
  let o = r && (r.response !== undefined ? r.response : r.choices ? r.choices[0].message.content : r);
  if (typeof o === 'string') {
    const t = o.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '');
    try { o = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); }
    catch (e) { // מירכאות בתוך מילה בעברית (בע"מ, סה"כ) שוברות JSON – מחלצים כל שדה לבד
      const f = k => { const m = t.match(new RegExp('"' + k + '"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,\\s*"(?:found|total|date|vendor|doc)"|\\s*})')); return m ? m[1] : ''; };
      o = { total: f('total'), date: f('date'), vendor: f('vendor'), doc: f('doc') };
      if (!o.total && !o.date) throw e;
    }
  }
  return o || {};
}
function money(v) {
  let s = String(v == null ? '' : v).replace(/[₪\s]|ש"ח|ש״ח|NIS|ILS/gi, '');
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  const n = +s;
  return isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : null;
}
function isoDate(v) {
  const m = String(v || '').match(/(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (!m) return '';
  let d, mo, y;
  if (m[1].length === 4) { y = +m[1]; mo = +m[2]; d = +m[3]; } else { d = +m[1]; mo = +m[2]; y = +m[3]; if (y < 100) y += 2000; }
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return '';
  return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

async function readImage(env, pages) {
  const content = [{ type: 'text', text: 'Read this receipt.' }].concat(pages.map(p => ({ type: 'image_url', image_url: { url: 'data:' + p.mime + ';base64,' + p.data } })));
  let last;
  for (const model of VISION) {
    try {
      const r = await env.AI.run(model, { messages: [{ role: 'system', content: rules(pages.length) + SHAPE }, { role: 'user', content }], max_tokens: 300, temperature: 0 });
      return { o: parseOut(r), model };
    } catch (e) { last = e; }
  }
  throw last || new Error('empty');
}

async function readRoute(request, env, h) {
  const no = await keyNo(env, request.headers.get('x-kelim-partner'));
  if (!no) {
    const q = await take(env, { bad: await ipHash(request) });
    return json({ error: q.ok ? 'partner' : 'blocked' }, 403, h);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_big' }, 413, h);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'bad' }, 400, h); }
  const pages = (Array.isArray(b.pages) ? b.pages : []).slice(0, 2).filter(p => p && /^image\/(jpeg|png|webp)$/.test(p.mime || '') && typeof p.data === 'string' && /^[A-Za-z0-9+/=]+$/.test(p.data.slice(0, 200)));
  if (!pages.length) return json({ error: 'bad' }, 400, h);
  const q = await take(env, { p: no, per: +env.PER_PARTNER || 80, cap: +env.DAY_CAP || 150 });
  if (!q.ok) return json({ error: 'quota' }, 200, h);
  let out;
  try { out = await readImage(env, pages); } catch (e) { return json({ error: 'busy' }, 200, h); }
  const o = out.o, amount = money(o.total);
  return json({ found: !!amount, amount, date: isoDate(o.date), vendor: clean(o.vendor, 60), doc: clean(o.doc, 30), left: q.left }, 200, h);
}

async function keyRoute(request, env, h) {
  const no = await partnerNo(env, request.headers.get('x-kelim-partner'));
  if (!no) {
    const q = await take(env, { bad: await ipHash(request) });
    return json({ error: q.ok ? 'partner' : 'blocked' }, 403, h);
  }
  return json({ key: await keyFor(env.PARTNER_SECRET, no) }, 200, h);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const h = cors(request.headers.get('origin'));
    if (request.method === 'OPTIONS') return h ? new Response('', { headers: h }) : new Response('', { status: 403 });
    if (url.pathname === '/ping') return json({ ok: true, ai: !!env.AI, partners: !!env.PARTNER_SECRET }, 200, h || {});
    if (request.method === 'POST' && (url.pathname === '/read' || url.pathname === '/key')) {
      if (!h) return json({ error: 'origin' }, 403);
      return url.pathname === '/read' ? readRoute(request, env, h) : keyRoute(request, env, h);
    }
    return json({ error: 'not_found' }, 404, h || {});
  }
};

// מונה יומי בלבד: {day, all, p:{מספר שותף:כמה}, bad:{כתובת מגובבת:כמה}}. מתאפס כל יום.
export class Quota {
  constructor(state) { this.s = state.storage; }
  async fetch(request) {
    const b = await request.json();
    let d = (await this.s.get('d')) || {};
    if (d.day !== b.day) d = { day: b.day, all: 0, p: {}, bad: {} };
    if (b.bad) {
      const n = (d.bad[b.bad] || 0) + 1; d.bad[b.bad] = n;
      await this.s.put('d', d);
      return Response.json({ ok: n <= 10 });
    }
    const n = d.p[b.p] || 0;
    if (n >= b.per || d.all >= b.cap) return Response.json({ ok: false });
    d.p[b.p] = n + 1; d.all++;
    await this.s.put('d', d);
    return Response.json({ ok: true, left: Math.min(b.per - n - 1, b.cap - d.all) });
  }
}
