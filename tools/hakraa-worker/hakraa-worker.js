// "הקראה בקול אנושי" – שרת הקול של /kelim/tochen/hakraa/ (Cloudflare Worker).
//   POST /tts   {text, voice:'m'|'f'}  -> התשובה של Gemini כמו שהיא (JSON עם הקול ב-base64); הדפדפן מפענח וממיר ל-MP3
//   POST /skira {text}                 -> {t}   סקירה קצרה בעברית מדוברת, להקראה
//   GET  /ping
// למה מעבירים את התשובה כמו שהיא: קטע קול הוא כמה מגה; פענוח בשרת היה שורף זמן מעבד. כך השרת רק שומר על המפתח ועל המכסה.
// פרטיות: לא שומרים טקסטים ולא קול. נשמר רק מונה יומי (כתובת מגובבת, מתאפס כל יום).

const ALLOWED = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
// תקציב של גילעד: 200 ₪ לחודש (23.11.2026), כלומר כ-6.6 ₪ ביום. קטע מלא (1200 תווים) עולה כ-0.09 ₪ עד סוף 2026
// וכ-0.17 ₪ מ-1.1.2027 (המחיר של גוגל מוכפל). לכן התקרה היומית יורדת לבד בתחילת 2027.
const TTS_PER = 30;                                              // קטעי קול לכתובת ביום
const ttsCap = () => (Date.now() < Date.UTC(2027, 0, 1) ? 70 : 38); // קטעי קול לכל האתר ביום
const SK_PER = 30, SK_CAP = 1500;      // סקירות
const MAX_TTS = 1600, MAX_SKIRA = 120000;
const TTS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
const TEXT = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];
const VOICES = { m: 'Charon', f: 'Kore' };
// בלי הוראת סגנון: המנוע מקריא גם אותה בקול (נבדק 23.11.2026), לכן נשלח רק הטקסט עצמו.

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type', 'access-control-expose-headers': 'x-left, x-model', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(h || {}) } });
function geminiKeys(env) { return String(env.GEMINI_KEYS || env.GEMINI_KEY || '').split(/[,\s]+/).filter(Boolean); }
const pday = () => new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 10); // Gemini מתאפס בחצות של קליפורניה
const spent = new Map();   // "מפתח|דגם" שנגמרה לו המכסה היום

async function sha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function take(env, request, kind, per, cap) {
  try {
    const who = await sha((request.headers.get('cf-connecting-ip') || '?') + '|' + pday());
    const stub = env.QUOTA.get(env.QUOTA.idFromName(kind));
    const r = await stub.fetch('https://q/', { method: 'POST', body: JSON.stringify({ day: pday(), who, per, cap }) });
    return await r.json();
  } catch (_) { return { ok: true, left: -1 }; }
}

// ניקוי לפני הקראה: בלי ניקוד חריג, בלי תווי בקרה, רווחים מסודרים
function clean(t) {
  return String(t || '').replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

async function ttsRoute(request, env, h) {
  let b; try { b = await request.json(); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
  const text = clean(b.text), voice = VOICES[b.voice] || VOICES.m;
  if (!text) return json({ error: 'empty' }, 400, h);
  if (text.length > MAX_TTS) return json({ error: 'too_long' }, 413, h);
  const keys = geminiKeys(env);
  if (!keys.length) return json({ error: 'no_key' }, 200, h);
  const quota = await take(env, request, 'tts', TTS_PER, ttsCap());
  if (!quota.ok) return json({ error: 'quota' }, 200, h);
  const body = JSON.stringify({
    contents: [{ parts: [{ text: text }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }
  });
  let last = '';
  for (const model of TTS) for (const key of keys) {
    const tag = key.slice(-6) + '|' + model;
    if (spent.get(tag) === pday()) continue;
    let r;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(90000), headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body
      });
    } catch (e) { last = model + ' ' + String(e && e.message || e).slice(0, 60); continue; }
    if (r.ok) return new Response(r.body, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-left': String(quota.left), 'x-model': model, ...h } });
    last = model + ' ' + r.status;
    if (r.status === 429) { const t = await r.text(); if (/PerDay|per day|limit: 0/i.test(t)) spent.set(tag, pday()); }
    else await r.body?.cancel();
  }
  return json({ error: /429/.test(last) || !last ? 'quota' : 'busy', why: last }, 200, h);
}

function skiraRules() {
  return 'אתה מכין "סקירה קולית" קצרה למסמך, למי שלא רואה ורוצה לדעת מה יש בו לפני שהוא מקשיב לכולו. ' +
    'כתוב בעברית פשוטה ומדוברת, בלי ניקוד, בלי כותרות, בלי רשימות ובלי סימנים מיוחדים – רק משפטים שלמים שנעים לשמוע. ' +
    'פתח במשפט אחד שאומר מה המסמך. אחר כך הנקודות העיקריות לפי הסדר, ובסוף משפט מסכם. ' +
    '150 עד 300 מילים. אל תמציא דבר שלא כתוב במסמך. מספרים כתוב במילים כשהם קצרים.';
}
async function skiraRoute(request, env, h) {
  let b; try { b = await request.json(); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
  const text = clean(b.text).slice(0, MAX_SKIRA);
  if (text.length < 200) return json({ error: 'short' }, 400, h);
  const keys = geminiKeys(env);
  if (!keys.length) return json({ error: 'no_key' }, 200, h);
  const quota = await take(env, request, 'sk', SK_PER, SK_CAP);
  if (!quota.ok) return json({ error: 'quota' }, 200, h);
  let last = '';
  for (const model of TEXT) for (const key of keys) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: skiraRules() }] }, contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } } })
      });
      if (!r.ok) { last = model + ' ' + r.status; await r.body?.cancel(); continue; }
      const j = await r.json();
      const t = clean((j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('').replace(/[*#_`]/g, ''));
      if (t) return json({ t, left: quota.left }, 200, h);
      last = model + ' empty';
    } catch (e) { last = model + ' ' + String(e && e.message || e).slice(0, 60); }
  }
  return json({ error: /429/.test(last) ? 'quota' : 'busy', why: last }, 200, h);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const h = cors(request.headers.get('origin'));
    if (request.method === 'OPTIONS') return h ? new Response('', { headers: h }) : new Response('', { status: 403 });
    if (url.pathname === '/ping') return json({ ok: true, gemini: geminiKeys(env).length }, 200, h || {});
    if (request.method === 'POST' && (url.pathname === '/tts' || url.pathname === '/skira')) {
      if (!h) return json({ error: 'origin' }, 403);
      return url.pathname === '/tts' ? ttsRoute(request, env, h) : skiraRoute(request, env, h);
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
