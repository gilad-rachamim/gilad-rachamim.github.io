// עוזר המילים של המחוללים (בינגו, תשבץ, תפזורת) – Cloudflare Worker עם Workers AI (חינם, בלי מפתח).
// נתיב אחד: POST /words {tool, topic, n, have:[...], clues:bool, clueFor:[...]}
//   -> {items:[{w, c}], clues:{מילה: הגדרה}}
// באתר: קודם בנקי המילים (assets/machol-banks.js, בלי שרת). לכאן מגיעים רק נושא שאין במאגר, והגדרות למילים שכתבו בעצמם.
// פרטיות: לא שומרים מה כתבו. נשמר רק מונה יומי (כתובת IP מגובבת), ומטמון של נושאים כלליים (נושא -> מילים), בלי פרטים אישיים.
// מכסות: PER_IP לכל כתובת ביום, ו-DAY_CAP לכל האתר, כדי להישאר בתוך המכסה החינמית של Workers AI (משותפת עם kelim-shir).

import { heWords } from './he-words.js';
const MODEL = '@cf/openai/gpt-oss-120b'; // נבחר כמו ב-kelim-shir: עברית טבעית, זמין בתוכנית החינמית
const ALLOWED = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const PER_IP = 25;
const DAY_CAP = 150; // המכסה החינמית של Workers AI משותפת עם kelim-shir ו-limudim-poter
// מילה עברית חדשה נכנסת רק אם היא ב-20,000 המילים השכיחות או בבנקים (he-words.js): כך המודל לא יכול להמציא מילים.
// נבדק 13.11.2026: בלי זה הומצאו שמות דינוזאורים, ובדיקת עובדות בקריאה שנייה לא תפסה אותם ולקחה 115 שניות.
let DICT = null;
const dict = () => DICT || (DICT = new Set(heWords().split(String.fromCharCode(10))));
const MAX_IN = 4000;
const CACHE_DAYS = 30;
const PCODE = /^(\d{3})-?(\d{5})$/;
async function partnerOk(env, code) {
  const m = String(code || '').replace(/\s/g, '').match(PCODE);
  if (!m || !env.PARTNER_SECRET) return false;
  if (String(env.REVOKED || '').split(',').map(x => x.trim()).filter(Boolean).map(Number).includes(+m[1])) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PARTNER_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('chaye-partner:' + (+m[1]))));
  return ((sig[0] << 24 | sig[1] << 16 | sig[2] << 8 | sig[3]) >>> 0) % 100000 === +m[2];
}

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-kelim-partner', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...(h || {}) } });
const clip = (s, n) => String(s == null ? '' : s).replace(/[֑-ׇ]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const isEn = w => /[A-Za-z]/.test(w) && !/[א-ת]/.test(w);
const letters = w => isEn(w) ? w.toUpperCase().replace(/[^A-Z]/g, '') : String(w).replace(/[^א-ת]/g, '');

const SYSTEM = `את/ה עוזר/ת למורים, להורים ולמדריכים להכין בינגו, תשבץ ותפזורת באתר חינמי.
כללים:
- כל מילה היא מילה אחת בלבד: בלי רווחים, מקפים, גרשיים, ניקוד או מספרים. בין 2 ל-12 אותיות.
- עברית תקנית בכתיב מלא, כמו שכותבים היום. אם הנושא הוא אנגלית (או כתוב "באנגלית") – המילים באנגלית וההגדרה היא התרגום בעברית.
- רק מילים יומיומיות ונפוצות מהעברית המדוברת, שכל ילד בכיתה ה׳ מכיר: מושגים, חפצים, פעולות, תכונות ומקומות שקשורים ישירות לנושא. מגוונות, מהקלות אל הקשות.
- אסור להמציא מילים. בלי שמות מדעיים, בלי שמות של מינים ובלי שמות פרטיים. מילה נדירה תימחק אוטומטית – עדיף מילה פשוטה ונפוצה.
- בלי כפילויות ובלי מילים שכבר ברשימה.
- הגדרה (רק כשמבקשים): קצרה, עד 8 מילים, נכונה עובדתית ומובילה לתשובה אחת. לא בטוחים בעובדה? הגדרה כללית ופשוטה. בלי מילת התשובה ובלי מילה מאותו שורש. מותר להשלמה: "___".
- תוכן שמתאים לכל הגילים ולכיתה: בלי אלימות, בלי מילים גסות, בלי פוליטיקה. נושא שלא מתאים – מחזירים רשימה ריקה.
- מחזירים JSON בלבד, בלי שום טקסט נוסף: {"items":[{"w":"מילה","c":"הגדרה"}],"clues":{"מילה שקיבלת":"הגדרה"}}`;

export function buildPrompt(b) {
  const topic = clip(b.topic, 60), n = Math.max(0, Math.min(40, +b.n || 0));
  const have = (Array.isArray(b.have) ? b.have : []).map(x => clip(x, 30)).filter(Boolean).slice(0, 60);
  const clueFor = (Array.isArray(b.clueFor) ? b.clueFor : []).map(x => clip(x, 30)).filter(Boolean).slice(0, 40);
  const lines = [`נושא: ${topic || '(לפי המילים שברשימה)'}`];
  if (n) lines.push(`כמה מילים חדשות: ${n}`, `הגדרה לכל מילה: ${b.clues ? 'כן' : 'לא – רק מילים, "c" ריק'}`);
  else lines.push('לא צריך מילים חדשות ("items" ריק).');
  if (have.length) lines.push(`מילים שכבר ברשימה (לא לחזור עליהן): ${have.join(', ')}`);
  if (clueFor.length) lines.push(`כתבו הגדרה לכל אחת מהמילים האלה, ב-"clues" (המפתח הוא המילה בדיוק כפי שנכתבה): ${clueFor.join(', ')}`);
  if (b.tool === 'machol_tashbetz') lines.push('זה לתשבץ: עדיף מילים עם אותיות נפוצות שיכולות להצטלב.');
  return [{ role: 'system', content: SYSTEM }, { role: 'user', content: lines.join('\n') }];
}

function rawText(raw) {
  let t = typeof raw === 'string' ? raw : (raw && (raw.response || raw.output_text)) || '';
  if (!t && raw && Array.isArray(raw.output)) for (const o of raw.output) for (const c of (o.content || [])) if (c.type === 'output_text') t += c.text;
  if (!t && raw && raw.choices) t = raw.choices[0]?.message?.content || '';
  return typeof t === 'object' ? JSON.stringify(t) : t;
}

export function parseOut(raw, want) {
  let t = typeof raw === 'string' ? raw : (raw && (raw.response || raw.output_text)) || '';
  if (!t && raw && Array.isArray(raw.output)) for (const o of raw.output) for (const c of (o.content || [])) if (c.type === 'output_text') t += c.text;
  if (!t && raw && raw.choices) t = raw.choices[0]?.message?.content || '';
  if (typeof t === 'object') t = JSON.stringify(t);
  let o = null; const m = String(t).match(/\{[\s\S]*\}/);
  if (m) { try { o = JSON.parse(m[0]); } catch (_) {} }
  if (!o) return { items: [], clues: {} };
  const seen = new Set((want.have || []).map(letters)), items = [];
  for (const it of (Array.isArray(o.items) ? o.items : [])) {
    const w = clip(it && (it.w || it.word), 30), c = clip(it && (it.c || it.clue), 110), L = letters(w);
    if (L.length < 2 || L.length > 14 || /\s/.test(w) || seen.has(L)) continue;
    if (c && !isEn(w) && c.includes(w)) continue; // הגדרה שמגלה את התשובה
    if (want.dict && !isEn(w) && !want.dict.has(w)) continue; // מילה שלא במילון השכיחות – כנראה מומצאת או נדירה
    seen.add(L); items.push({ w, c: want.clues ? c : '' });
    if (items.length >= Math.max(1, want.n || 0)) break;
  }
  const clues = {}, ask = new Set((want.clueFor || []).map(x => clip(x, 30)));
  if (o.clues && typeof o.clues === 'object') for (const k in o.clues) { const kk = clip(k, 30); if (ask.has(kk)) clues[kk] = clip(o.clues[k], 110); }
  return { items, clues };
}

async function ipHash(ip, day) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(day + '|' + ip + '|machol'));
  return [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
}
export async function runModel(env, messages, effort) {
  return env.AI.run(MODEL, { instructions: messages[0].content, input: messages[1].content, reasoning: { effort: effort || 'low' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('origin'), h = cors(origin);
    if (request.method === 'OPTIONS') return h ? new Response('', { headers: h }) : new Response('', { status: 403 });
    if (url.pathname === '/ping') return json({ ok: true, model: MODEL }, 200, h || {});
    if (url.pathname !== '/words' || request.method !== 'POST') return json({ name: 'עוזר המילים – מחוללים', page: 'https://hakelim.com/kelim/chashiva/' }, 200);
    if (!h) return json({ error: 'origin' }, 403);
    const text = await request.text();
    if (text.length > MAX_IN) return json({ error: 'too_long' }, 413, h);
    let b; try { b = JSON.parse(text); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
    b.n = Math.max(0, Math.min(40, +b.n || 0)); b.clues = !!b.clues;
    b.have = (Array.isArray(b.have) ? b.have : []).slice(0, 60); b.clueFor = (Array.isArray(b.clueFor) ? b.clueFor : []).slice(0, 40);
    if (!b.n && !b.clueFor.length) return json({ items: [], clues: {} }, 200, h);
    if (!clip(b.topic, 60) && !b.clueFor.length) return json({ error: 'topic' }, 400, h);

    const stub = env.QUOTA.get(env.QUOTA.idFromName('q'));
    // מטמון: נושא כללי בלי מילים משלהם -> אותה רשימה (מעורבבת), בלי לבזבז מכסה
    const ckey = !b.have.length && !b.clueFor.length ? 'c4:' + clip(b.topic, 60).toLowerCase() + '|' + (b.clues ? 1 : 0) : ''; // c3: רק מילים מהמילון (c:/c2: ישנים – לא בשימוש)
    if (ckey) {
      const hit = await (await stub.fetch('https://q/get', { method: 'POST', body: JSON.stringify({ k: ckey }) })).json();
      if (hit && hit.items && hit.items.length >= Math.min(b.n, 12)) {
        const a = hit.items.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return json({ items: a.slice(0, b.n), clues: {}, cached: true }, 200, h);
      }
    }
    const day = new Date().toISOString().slice(0, 10), ip = request.headers.get('cf-connecting-ip') || 'x';
    const per = (await partnerOk(env, request.headers.get('x-kelim-partner'))) ? 1e9 : PER_IP;
    const q = await (await stub.fetch('https://q/take', { method: 'POST', body: JSON.stringify({ day, who: await ipHash(ip, day), per, cap: DAY_CAP }) })).json();
    if (!q.ok) return json({ error: 'quota', rest: true }, 429, h);
    try {
      const n0 = ckey ? Math.max(b.n, 16) : b.n, ask = n0 ? Math.min(32, Math.ceil(n0 * 1.8) + 2) : 0;
      const want = { n: ask, clues: b.clues, have: b.have, clueFor: b.clueFor, dict: dict() };
      const out = parseOut(await runModel(env, buildPrompt({ ...b, n: ask }), b.clues || b.clueFor.length ? 'medium' : 'low'), want);
      out.items = out.items.slice(0, n0);
      if (!out.items.length && !Object.keys(out.clues).length) return json({ error: 'empty' }, 502, h);
      if (ckey && out.items.length >= 8) await stub.fetch('https://q/put', { method: 'POST', body: JSON.stringify({ k: ckey, items: out.items, days: CACHE_DAYS }) });
      return json({ items: out.items.slice(0, b.n), clues: out.clues }, 200, h);
    } catch (e) {
      return json({ error: 'ai', rest: /limit|quota|neuron|capacity/i.test(String(e)), ...(LOCAL.test(origin || '') ? { detail: String(e).slice(0, 300) } : {}) }, 503, h);
    }
  }
};

// מונה יומי {day, all, who:{hash:count}} + מטמון נושאים (c:<נושא> -> {items, until})
export class Quota {
  constructor(state) { this.s = state.storage; }
  async fetch(request) {
    const p = new URL(request.url).pathname, b = await request.json();
    if (p === '/get') { const v = await this.s.get(b.k); if (!v || v.until < Date.now()) return Response.json({}); return Response.json(v); }
    if (p === '/put') { await this.s.put(b.k, { items: b.items.slice(0, 40), until: Date.now() + b.days * 864e5 }); return Response.json({ ok: true }); }
    let d = (await this.s.get('d')) || {};
    if (d.day !== b.day) d = { day: b.day, all: 0, who: {} };
    const n = d.who[b.who] || 0;
    if (n >= b.per || d.all >= b.cap) return Response.json({ ok: false });
    d.who[b.who] = n + 1; d.all++;
    await this.s.put('d', d);
    return Response.json({ ok: true, left: b.per - n - 1 });
  }
}
