// "המתרגם" – שרת תרגום לטלפונים ולדפדפנים בלי תרגום מובנה, ותרגום מתמונה.
// Cloudflare Worker, חינם:
//   POST /t   {q, from, to}             -> {t, engine}     טקסט: Gemini (מפתח משלו) ← Llama 4 ב-Workers AI
//   POST /img {image:{mime,data}, to}   -> {src, from, t}  תמונה: Gemini רואה, מעתיק את הטקסט ומתרגם ← Llama 4 ב-Workers AI
//   POST /voice {mime, data, to}        -> {src, from, t}  הקלטה בשפה זרה: Gemini שומע ומתרגם ← Whisper + Llama 4
//   GET  /ping
// פרטיות: לא שומרים טקסטים ותמונות. נשמר רק מונה יומי (כתובת מגובבת, מתאפס כל יום),
// ותרגומי טקסט זהים נשמרים במטמון של Cloudflare (לפי טביעת אצבע) כדי לא לבזבז מכסה.

const ALLOWED = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const T_PER = 400, T_CAP = 6000;     // בקשות טקסט: לכתובת ביום / לכל האתר ביום
const I_PER = 15, I_CAP = 400;       // תמונות
const V_PER = 15, V_CAP = 400;       // הודעות קוליות
const MAX_AUDIO = 7_000_000;         // base64
const MAX_Q = 5000, MAX_IMG = 4_000_000;
// 24.11: 3.1-flash-lite ו-3.5-flash עמוסים אצל גוגל (503 / תקועים 20+ שנ׳); 3.5-flash-lite עונה תוך 0.5–1.7 שנ׳ (בלי thinkingBudget – איתו 400)
const LITE = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const NO_THINK_CFG = /3\.5-flash-lite/;
// תמונה וקול: 3.5-flash ראשון (מדויק), ואחריו הקלים שעונים מהר; 3.1-flash-lite העמוס יצא
const VISION = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
const NO_THINK_CFG2 = /flash-lite/;
const AI_TEXT = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/mistralai/mistral-small-3.1-24b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
const AI_VISION = '@cf/meta/llama-4-scout-17b-16e-instruct';
const AI_WHISPER = '@cf/openai/whisper-large-v3-turbo';

export const NAMES = {
  he: 'Hebrew', en: 'English', ar: 'Arabic', ru: 'Russian', fr: 'French', es: 'Spanish', am: 'Amharic', uk: 'Ukrainian',
  de: 'German', it: 'Italian', pt: 'Portuguese', tr: 'Turkish', ro: 'Romanian', pl: 'Polish', nl: 'Dutch', hu: 'Hungarian',
  fa: 'Persian', el: 'Greek', hi: 'Hindi', th: 'Thai', zh: 'Chinese (Simplified)', ja: 'Japanese', ko: 'Korean'
};

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(h || {}) } });

export function geminiKeys(env) { return String(env.GEMINI_KEYS || env.GEMINI_KEY || '').split(/[,\s]+/).filter(Boolean); }
const spent = new Map();
const pday = () => new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 10); // Gemini מתאפס בחצות של קליפורניה
const sleep = ms => new Promise(r => setTimeout(r, ms));
// מפסק: דגם שנתקע או עמוס – מדלגים עליו 5 דקות, כדי שאף תרגום לא יחכה לו שוב
const tripped = new Map();
const TRIP_MS = 5 * 60e3;
const isTripped = tag => (tripped.get(tag) || 0) > Date.now();

async function geminiOnce(model, key, system, parts, schema, timeout) {
  const gen = { temperature: 0.1, maxOutputTokens: 8192 };
  if (!NO_THINK_CFG.test(model) && !NO_THINK_CFG2.test(model)) gen.thinkingConfig = { thinkingBudget: 0 };
  if (schema) { gen.responseMimeType = 'application/json'; gen.responseSchema = schema; }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', signal: AbortSignal.timeout(timeout || 30000),
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }], generationConfig: gen })
  });
  if (!r.ok) { const e = new Error(`${model} ${r.status} ${(await r.text()).slice(0, 160)}`); e.status = r.status; throw e; }
  const j = await r.json();
  const txt = j.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
  if (!txt) throw Object.assign(new Error(model + ' empty'), { status: 502 });
  return schema ? JSON.parse(txt) : txt;
}
// דגמים × מפתחות: מכסה (429) – הלאה ונזכרים עד מחר; עמוס (503) – ניסיון נוסף אחד
// opt.fast: בלי ניסיון חוזר, ודגם שנכשל בפסק זמן או ב-503 נכנס למפסק; opt.deadline: לא מתחילים ניסיון אחרי הזמן הזה
async function gemini(env, models, system, parts, schema, timeout, opt) {
  const keys = geminiKeys(env), fast = !!(opt && opt.fast), deadline = (opt && opt.deadline) || Infinity;
  if (!keys.length) throw new Error('no key');
  let last;
  for (const model of models) for (let k = 0; k < keys.length; k++) {
    const key = keys[k], tag = key.slice(-6) + '|' + model;
    if (spent.get(tag) === pday() || isTripped(tag)) continue;
    for (let i = 0; i < (fast ? 1 : 2); i++) {
      const left = deadline - Date.now();
      if (left < 800) throw last || new Error('gemini budget');
      try { return { data: await geminiOnce(model, key, system, parts, schema, Math.min(timeout, left)), model }; }
      catch (e) {
        last = e;
        if (e.status === 429) { spent.set(tag, pday()); break; }
        // עומס (503) – 5 דק'; השהיה אחת – רק דקה, כדי לא לוותר על Gemini בגלל בקשה איטית אחת
        if (e.status === 503) tripped.set(tag, Date.now() + TRIP_MS);
        else if (e.name === 'TimeoutError') tripped.set(tag, Date.now() + 60e3);
        if (e.status && ![500, 502, 503, 504].includes(e.status)) break;
        if (e.name === 'TimeoutError' || fast) break;
        await sleep(1200);
      }
    }
  }
  throw last || new Error('gemini spent');
}

// מירוץ מול גיבוי: Gemini מתחיל; לא ענה תוך wait (או נכשל) – הגיבוי מתחיל במקביל, והראשון שמצליח מנצח
async function hedge(main, backup, wait) {
  let done = false, why;
  main.then(() => { done = true; }, e => { why = String(e && e.message || e).slice(0, 100); });
  const later = new Promise((res, rej) => {
    const go = () => { if (done) return rej(new Error('skip')); backup().then(o => { if (o) o.why = why || 'gemini slow'; res(o); }, rej); };
    const tm = setTimeout(go, wait);
    main.then(() => clearTimeout(tm), () => { clearTimeout(tm); go(); });
  });
  try { return await Promise.any([main, later]); }
  catch (e) { const errs = (e && e.errors) || [e]; throw errs[errs.length - 1]; }
}

export function textRules(from, to) {
  return `You are a professional translator into ${NAMES[to] || to}. Translate the user's text from ${NAMES[from] || from} into natural, fluent ${NAMES[to] || to}, ` +
    `the way a careful native speaker would write it (idioms by meaning, not word by word). ` +
    `Keep the line breaks, numbers, names, links and emoji. Keep tokens like [71] or [72] exactly as they are, in the right place. ` +
    (to === 'he' ? 'Write Hebrew without niqqud. ' : '') +
    `Output ONLY the translation, with no notes, quotes or explanations. If the text is already in ${NAMES[to] || to}, return it unchanged.`;
}
export function stripNiqqud(t) { return String(t).replace(/[֑-ׇֽֿׁׂׅׄ]/g, ''); }

async function aiText(env, q, from, to) {
  if (!env.AI) throw new Error('no AI');
  let last;
  for (const model of AI_TEXT) {
    try {
      const r = await env.AI.run(model, { messages: [{ role: 'system', content: textRules(from, to) }, { role: 'user', content: q }], max_tokens: 4096, temperature: 0.1 });
      const t = String((r && r.response) || '').trim();
      if (t) return t;
    } catch (e) { last = e; }
  }
  throw last || new Error('empty');
}

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function take(env, request, inst, per, cap) {
  const day = new Date().toISOString().slice(0, 10);
  const who = (await sha(day + '|' + (request.headers.get('cf-connecting-ip') || 'x') + '|tirgum')).slice(0, 16);
  const stub = env.QUOTA.get(env.QUOTA.idFromName(inst));
  return (await stub.fetch('https://q/take', { method: 'POST', body: JSON.stringify({ day, who, per, cap }) })).json();
}

async function translateRoute(request, env, ctx, h) {
  let b; try { b = await request.json(); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
  const q = String(b.q || ''), from = String(b.from || ''), to = String(b.to || '');
  if (!q.trim()) return json({ error: 'empty' }, 400, h);
  if (q.length > MAX_Q) return json({ error: 'too_long', max: MAX_Q }, 413, h);
  if (!NAMES[from] || !NAMES[to]) return json({ error: 'lang' }, 400, h);
  if (from === to) return json({ t: q, engine: 'same' }, 200, h);
  const ck = new Request('https://cache.tirgum/' + (await sha('v2|' + from + '|' + to + '|' + q)));
  const hit = await caches.default.match(ck);
  if (hit) return json(Object.assign(await hit.json(), { cached: true }), 200, h);
  const quota = await take(env, request, 't', T_PER, T_CAP);
  if (!quota.ok) return json({ error: 'quota' }, 200, h);
  // מירוץ: Gemini מתחיל; אם לא ענה תוך 1.2 שנ׳ (או נכשל) – Llama מתחיל במקביל, והראשון שמצליח מנצח
  let t = '', engine = '', why;
  const t0 = Date.now();
  const gem = gemini(env, LITE, textRules(from, to), [{ text: q }], null, 6000, { fast: true, deadline: t0 + 8000 })
    .then(r => ({ t: String(r.data).trim(), engine: 'gemini' }));
  gem.catch(e => { why = String(e && e.message || e).slice(0, 100); });
  let done = false;
  const aiLater = new Promise((res, rej) => {
    const go = () => { if (done) return rej(new Error('skip')); aiText(env, q, from, to).then(x => res({ t: x, engine: 'ai' }), rej); };
    const tm = setTimeout(go, 1200);
    gem.then(() => clearTimeout(tm), () => { clearTimeout(tm); go(); });
  });
  try {
    const first = await Promise.any([gem, aiLater]);
    done = true; t = first.t; engine = first.engine;
  } catch (e) {
    const errs = (e && e.errors) || [e];
    return json({ error: 'busy', detail: String(errs[errs.length - 1] && errs[errs.length - 1].message || errs[errs.length - 1]).slice(0, 120), why }, 200, h);
  }
  if (to === 'he') t = stripNiqqud(t);
  const res = { t, engine };
  const meta = { ms: Date.now() - t0 };
  if (engine !== 'gemini' && why) meta.why = why;
  ctx.waitUntil(caches.default.put(ck, new Response(JSON.stringify(res), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=2592000' } })));
  return json(Object.assign({}, res, meta), 200, h);
}

const IMG_SCHEMA = { type: 'OBJECT', properties: {
  found: { type: 'BOOLEAN' }, src: { type: 'STRING' }, from: { type: 'STRING' }, t: { type: 'STRING' } }, required: ['found', 'src', 'from', 't'] };
export function imgRules(to) {
  return `You read photos of signs, letters, menus, screens, labels and documents. Copy ALL the readable text in the image, in reading order, ` +
    `keeping paragraphs and line breaks (field "src"). Give its main language as a two-letter ISO code (field "from"). ` +
    `Then translate that text into natural, fluent ${NAMES[to] || to} (field "t")` + (to === 'he' ? ', without niqqud' : '') +
    `. If the text is already in ${NAMES[to] || to}, "t" repeats it. If there is no readable text, found=false and all strings empty. ` +
    `Never invent text that is not in the image.`;
}
async function imageRoute(request, env, h) {
  const raw = await request.text();
  if (raw.length > MAX_IMG + 2000) return json({ error: 'too_big' }, 413, h);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
  const to = String(b.to || 'he'), img = b.image || {};
  if (!NAMES[to] || !/^image\/(jpeg|png|webp)$/.test(img.mime || '') || !img.data) return json({ error: 'bad' }, 400, h);
  const quota = await take(env, request, 'i', I_PER, I_CAP);
  if (!quota.ok) return json({ error: 'quota' }, 200, h);
  let out;
  const parts = [{ inlineData: { mimeType: img.mime, data: img.data } }, { text: 'Read and translate the text in this image.' }];
  const main = gemini(env, VISION, imgRules(to), parts, IMG_SCHEMA, 9000, { fast: true, deadline: Date.now() + 20000 })
    .then(r => Object.assign(r.data, { engine: 'gemini' }));
  const backup = async () => {
    const r = await env.AI.run(AI_VISION, { messages: [
      { role: 'system', content: imgRules(to) + ' Answer with JSON only: {"found":true,"src":"...","from":"en","t":"..."}' },
      { role: 'user', content: [{ type: 'text', text: 'Read and translate the text in this image.' }, { type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.data}` } }] }
    ], max_tokens: 2048 });
    let txt = r && (r.response || ''), o;
    if (typeof txt === 'object') o = txt;
    else { txt = String(txt).replace(/^```(?:json)?\s*|\s*```$/g, ''); o = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1)); }
    o.engine = 'llama';
    return o;
  };
  try { out = await hedge(main, backup, 4000); }
  catch (e) { return json({ error: 'busy' }, 200, h); }
  out.from = String(out.from || '').slice(0, 2).toLowerCase();
  if (to === 'he') out.t = stripNiqqud(out.t || '');
  return json({ found: !!out.found && !!String(out.src || '').trim(), src: out.src || '', from: NAMES[out.from] ? out.from : '', t: out.t || '', engine: out.engine, why: out.why, left: quota.left }, 200, h);
}

// הודעה קולית בשפה זרה: Gemini שומע, מתמלל ומתרגם; גיבוי – Whisper ב-Workers AI ואחריו תרגום
export function voiceRules(to) {
  return `You transcribe short voice messages and recordings. Write down exactly what is said, in the spoken language and its own script ` +
    `(field "src"), give the spoken language as a two-letter ISO code (field "from"), then translate it into natural, fluent ${NAMES[to] || to}` +
    (to === 'he' ? ' without niqqud' : '') + ` (field "t"). If there is no speech, found=false and all strings empty. Never invent words.`;
}
async function voiceRoute(request, env, ctx, h) {
  const raw = await request.text();
  if (raw.length > MAX_AUDIO + 2000) return json({ error: 'too_big' }, 413, h);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
  const to = String(b.to || 'he'), mime = String(b.mime || ''), data = String(b.data || '');
  if (!NAMES[to] || !/^(audio|video)\//.test(mime) || !data) return json({ error: 'bad' }, 400, h);
  const quota = await take(env, request, 'v', V_PER, V_CAP);
  if (!quota.ok) return json({ error: 'quota' }, 200, h);
  let out;
  const parts = [{ inlineData: { mimeType: mime.replace(/;.*$/, ''), data } }, { text: 'Transcribe and translate this recording.' }];
  const main = gemini(env, VISION, voiceRules(to), parts, IMG_SCHEMA, 12000, { fast: true, deadline: Date.now() + 25000 })
    .then(r => Object.assign(r.data, { engine: 'gemini' }));
  const backup = async () => {
    const w = await env.AI.run(AI_WHISPER, { audio: data });
    const src = String((w && w.text) || '').trim();
    const from = String((w && w.transcription_info && w.transcription_info.language) || '').slice(0, 2);
    const o = !src ? { found: false, src: '', from: '', t: '' }
      : { found: true, src, from, t: from === to ? src : await aiText(env, src, NAMES[from] ? from : 'en', to) };
    o.engine = 'whisper';
    return o;
  };
  try { out = await hedge(main, backup, 5000); }
  catch (e) { return json({ error: 'busy', detail: String(e && e.message || e).slice(0, 100) }, 200, h); }
  out.from = String(out.from || '').slice(0, 2).toLowerCase();
  if (to === 'he') out.t = stripNiqqud(out.t || '');
  return json({ found: !!out.found && !!String(out.src || '').trim(), src: out.src || '', from: NAMES[out.from] ? out.from : '', t: out.t || '', engine: out.engine, why: out.why, left: quota.left }, 200, h);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const h = cors(request.headers.get('origin'));
    if (request.method === 'OPTIONS') return h ? new Response('', { headers: h }) : new Response('', { status: 403 });
    if (url.pathname === '/ping') return json({ ok: true, gemini: geminiKeys(env).length, ai: !!env.AI }, 200, h || {});
    if (request.method === 'POST' && (url.pathname === '/t' || url.pathname === '/img' || url.pathname === '/voice')) {
      if (!h) return json({ error: 'origin' }, 403);
      return url.pathname === '/t' ? translateRoute(request, env, ctx, h) : url.pathname === '/voice' ? voiceRoute(request, env, ctx, h) : imageRoute(request, env, h);
    }
    return json({ error: 'not_found' }, 404, h || {});
  }
};

// מונה יומי בלבד: {day, all, who:{hash:count}}
export class Quota {
  constructor(state) { this.s = state.storage; }
  async fetch(request) {
    const b = await request.json();
    let d = (await this.s.get('d')) || {};
    if (d.day !== b.day) d = { day: b.day, all: 0, who: {} };
    const n = d.who[b.who] || 0;
    if (n >= b.per || d.all >= b.cap) return Response.json({ ok: false });
    d.who[b.who] = n + 1; d.all++;
    await this.s.put('d', d);
    return Response.json({ ok: true, left: b.per - n - 1 });
  }
}
