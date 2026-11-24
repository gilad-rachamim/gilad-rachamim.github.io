// /ask: תיאור במילים חופשיות -> עד 5 כלים מהקטלוג, עם משפט "למה זה מתאים".
// ציבורי: POST /ask {q}  ->  {items:[{u,n,why}], via}     GET /ping
// פרטיות: הטקסט נשלח רק בלחיצה מפורשת; לא נשמרת כתובת רשת; ביומן רק הטקסט והאם נמצא כלי.
// נפל המודל -> מוחזרות התאמות מילים פשוטות, בלי שגיאה למשתמש. כל נתיב מאומת מול הקטלוג.
const ORIGINS = ['https://hakelim.com', 'https://www.hakelim.com', 'https://gilad-rachamim.github.io'];
const CATALOG = 'https://hakelim.com/assets/catalog.json';
// המהיר ראשון: llama-3.3-fast כותב 5 תשובות ב-5 שנ' מול 9 שנ' של llama-4-scout (נמדד 24.11.2026)
const MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-4-scout-17b-16e-instruct'];
const GEMINI = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];   // רק אם יוגדר מפתח; הדגמים הקודמים (2.5) כבר לא קיימים
const wait = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
const DAILY = 40;   // שאלות ליום לכל רשת (טביעה יומית)

const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...h } });
const norm = t => String(t || '').toLowerCase().replace(/[֑-ׇ"'׳״]/g, '').replace(/[^א-תa-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = t => norm(t).split(' ').filter(w => w.length > 1);
const stem = w => w.replace(/^[והבלמכש]+(?=.{3})/, '').replace(/(ים|ות|ה|י)$/, '').slice(0, 5);

async function loadCatalog() {
  const cache = caches.default, key = new Request(CATALOG);
  let r = await cache.match(key);
  if (!r) {
    r = await fetch(CATALOG);
    if (!r.ok) throw new Error('catalog ' + r.status);
    r = new Response(r.body, r);
    r.headers.set('cache-control', 'public, max-age=3600');
    await cache.put(key, r.clone());
  }
  const c = await r.json();
  return c.items.filter(x => x.ty === 'tool' && x.l === 'he').map(x => ({ u: x.u, n: x.n, s: x.s || '', k: x.k || '', d: x.d || '', nw: x.nw || '', st: new Set(toks(x.n + ' ' + x.k + ' ' + x.s + ' ' + x.d).map(stem)) }));
}
function lexical(items, q, n) {
  const qs = toks(q).map(stem);
  return items.map(x => ({ x, sc: qs.reduce((a, w) => a + (x.st.has(w) ? 1 : 0), 0) })).filter(o => o.sc > 0)
    .sort((a, b) => b.sc - a.sc || (a.x.u < b.x.u ? -1 : 1)).slice(0, n).map(o => o.x);
}
function short(x) { return x.n.split(':')[0].split(',')[0].trim().slice(0, 50); }
function parse(txt, byU, max) {
  const m = /\[[\s\S]*\]|\{[\s\S]*\}/.exec(txt || '');
  if (!m) return [];
  let o; try { o = JSON.parse(m[0]); } catch (e) { return []; }
  if (!Array.isArray(o)) o = o.items || o.results || [];
  const out = [], seen = new Set();
  for (const r of o) {
    const u = typeof r === 'string' ? r : (r.u || r.path || r.url);
    if (!byU.has(u) || seen.has(u)) continue;
    seen.add(u);
    out.push({ u, n: short(byU.get(u)), why: String((r && r.why) || '').slice(0, 140) });
    if (out.length >= max) break;
  }
  return out;
}
async function llm(env, q, cand) {
  const list = cand.map(x => x.u + ' | ' + short(x) + ' | ' + (x.s || x.d).slice(0, 90) + ' | ' + x.k.slice(0, 90)).join('\n');
  const system = 'אתה עוזר באתר כלים בעברית. מקבל בקשה של אדם ורשימת כלים (נתיב | שם | תיאור | ביטויים). בחר עד 5 כלים מהרשימה בלבד שהכי מתאימים, מהמתאים ביותר. אם אין התאמה אמיתית החזר []. '
    + 'לכל כלי כתוב בעברית משפט קצר אחד "why" (עד 12 מילים) שמסביר למה זה מתאים לבקשה, בלי המילה "חינם". החזר JSON בלבד: [{"u":"<נתיב מהרשימה>","why":"..."}]. אסור להמציא נתיבים.';
  const user = 'בקשה: ' + q + '\n\nרשימת הכלים:\n' + list;
  const keys = String(env.GEMINI_KEYS || '').split(/[\s,]+/).filter(Boolean);
  if (keys.length) {
    for (const m of GEMINI) {
      try {
        const gen = { responseMimeType: 'application/json', temperature: 0.2 };
        if (!/flash-lite/.test(m)) gen.thinkingConfig = { thinkingBudget: 0 };   // הדגמים הקלים דוחים את ההגדרה (400)
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', {
          method: 'POST', signal: AbortSignal.timeout(6000),
          headers: { 'content-type': 'application/json', 'x-goog-api-key': keys[Math.floor(Math.random() * keys.length)] },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: gen }) });
        if (!r.ok) continue;
        const j = await r.json();
        const t = j.candidates && j.candidates[0] && j.candidates[0].content.parts.map(p => p.text).join('');
        if (t) return { t, via: 'gemini' };
      } catch (e) { /* ננסה הבא */ }
    }
  }
  if (env.AI) {
    for (const m of MODELS) {
      try {
        const r = await wait(env.AI.run(m, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: 500, temperature: 0.2 }), 12000);
        const t = typeof r.response === 'string' ? r.response : JSON.stringify(r.response || '');
        if (t) return { t, via: 'llama' };
      } catch (e) { /* ננסה את הבא */ }
    }
  }
  throw new Error('no model');
}
async function sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function limited(req) {
  const ip = req.headers.get('CF-Connecting-IP') || 'x', day = new Date().toISOString().slice(0, 10);
  const key = new Request('https://rl.local/' + (await sha(ip + '|' + day)).slice(0, 16)), c = caches.default;
  const hit = await c.match(key), n = hit ? +(await hit.text()) : 0;
  if (n >= DAILY) return true;
  await c.put(key, new Response(String(n + 1), { headers: { 'cache-control': 'max-age=86400' } }));
  return false;
}
export async function ask(env, q, items) {
  const byU = new Map(items.map(x => [x.u, x]));
  let cand = lexical(items, q, 30);
  const extra = items.filter(x => x.nw && !cand.includes(x)).slice(0, 6);
  cand = cand.concat(extra);
  if (cand.length < 25) cand = cand.concat(items.filter(x => !cand.includes(x)).slice(0, 25 - cand.length));
  let res = [], via = 'lexical';
  try {
    const r = await llm(env, q, cand);
    res = parse(r.t, byU, 5);
    via = r.via;
  } catch (e) { /* נפילה שקטה */ }
  if (!res.length) { res = lexical(items, q, 3).map(x => ({ u: x.u, n: short(x), why: '' })); via = 'lexical'; }
  return { items: res, via };
}
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = { 'access-control-allow-origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/' || url.pathname === '/ping') return json({ ok: true, name: 'kelim-ask', ai: !!env.AI, gemini: String(env.GEMINI_KEYS || '').split(/[\s,]+/).filter(Boolean).length }, 200, cors);
      if (url.pathname === '/ask' && req.method === 'POST') {
        if (origin && !ORIGINS.includes(origin)) return json({ error: 'forbidden' }, 403, cors);
        let b = {}; try { b = await req.json(); } catch (e) { /* ריק */ }
        const q = String(b.q || '').trim().slice(0, 200);
        if (q.length < 3) return json({ items: [], via: 'none' }, 200, cors);
        const ck = new Request('https://ask.local/' + (await sha(norm(q))).slice(0, 24)), c = caches.default;
        const hit = await c.match(ck);
        if (hit) return json(await hit.json(), 200, cors);
        if (await limited(req)) return json({ items: [], via: 'limit' }, 429, cors);
        const items = await loadCatalog();
        const out = await ask(env, q, items);
        console.log('ask', JSON.stringify({ q: norm(q), found: out.items.length, via: out.via }));
        if (out.via !== 'lexical') await c.put(ck, new Response(JSON.stringify(out), { headers: { 'cache-control': 'max-age=86400' } }));
        return json(out, 200, cors);
      }
      return json({ error: 'not found' }, 404, cors);
    } catch (e) {
      return json({ items: [], via: 'error' }, 200, cors);
    }
  },
};
