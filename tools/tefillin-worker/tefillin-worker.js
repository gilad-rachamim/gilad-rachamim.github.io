// "תפילין – הכלים": בדיקת תמונה עם תפילין, לפתיחה מוקדמת של "הנעילה המחייבת" באפליקציה.
// Cloudflare Worker, חינם:
//   POST /challenge {device}                         -> {id, gesture, he, exp}   אתגר אקראי, תקף 3 דקות, לשימוש אחד
//   POST /check {id, device, image:{mime,data}}      -> {pass, reason, engine, left}
//   GET  /ping
// פרטיות: התמונה נבדקת בזיכרון ונזרקת. לא נשמרת בשום מקום, לא נרשמת ביומן.
// נשמר רק: מונה יומי לכל מכשיר (מזהה אקראי של האפליקציה, מגובב) ואתגרים פתוחים ל-3 דקות.
// נגד רמאות: אתגר אקראי שחייב להופיע בתמונה, תוקף קצר, שימוש אחד, הגבלת ניסיונות,
// ובדיקה שזו לא תמונה של מסך / הדפסה. האפליקציה מצלמת רק במצלמה חיה (בלי גלריה).

const PER_DEVICE = 6, CAP = 3000;          // בדיקות ביום: למכשיר / לכל השרת
const CH_TTL = 180_000;                    // 3 דקות לאתגר
const MAX_IMG = 3_000_000;
const VISION = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
const AI_VISION = '@cf/meta/llama-4-scout-17b-16e-instruct';

export const GESTURES = [
  { g: 'two', he: 'הרם 2 אצבעות (סימן V) ליד הפנים', en: 'one hand raised near the face showing exactly TWO fingers (a V sign)' },
  { g: 'three', he: 'הרם 3 אצבעות ליד הפנים', en: 'one hand raised near the face showing exactly THREE fingers' },
  { g: 'thumb', he: 'הרם אגודל למעלה (👍) ליד הפנים', en: 'one hand near the face giving a thumbs-up' },
  { g: 'palm', he: 'הרם כף יד פתוחה (5 אצבעות) ליד הפנים', en: 'one open palm with all FIVE fingers spread, raised near the face' },
  { g: 'one', he: 'הרם אצבע אחת למעלה ליד הפנים', en: 'one hand near the face with exactly ONE finger pointing up' },
  { g: 'ok', he: 'עשה סימן "אוקיי" (👌) ליד הפנים', en: 'one hand near the face making an OK sign (thumb and index finger forming a circle)' }
];

const json = (o, status) => new Response(JSON.stringify(o), {
  status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
export function geminiKeys(env) { return String(env.GEMINI_KEYS || env.GEMINI_KEY || '').split(/[,\s]+/).filter(Boolean); }
const spent = new Map();
const pday = () => new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 10);

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const dev = d => /^[A-Za-z0-9-]{8,64}$/.test(String(d || '')) ? String(d) : '';
const store = env => env.QUOTA.get(env.QUOTA.idFromName('t'));
const call = async (env, path, body) => (await store(env).fetch('https://q/' + path, { method: 'POST', body: JSON.stringify(body) })).json();

export const SCHEMA = { type: 'OBJECT', properties: {
  person: { type: 'BOOLEAN' }, shel_rosh: { type: 'BOOLEAN' }, shel_yad: { type: 'BOOLEAN' },
  gesture: { type: 'BOOLEAN' }, wrapped_hand: { type: 'BOOLEAN' }, screen: { type: 'BOOLEAN' },
  live: { type: 'BOOLEAN' }, reason_he: { type: 'STRING' }
}, required: ['person', 'shel_rosh', 'shel_yad', 'gesture', 'wrapped_hand', 'screen', 'live', 'reason_he'] };

export function rules(gesture) {
  return 'You check one selfie for a Jewish tefillin (phylacteries) app. Be strict and honest; do not guess in the user\'s favour. Decide:\n' +
    '- person: a real person is clearly visible in the photo.\n' +
    '- shel_rosh: that person is WEARING the head tefillin right now: a black leather cube (box) on the head, above the forehead at the hairline, held by a black strap around the head. A kippah, hat, or a box held in the hand does NOT count.\n' +
    '- shel_yad: the arm tefillin is visible on that person: a black box on the upper arm and/or black leather straps wound around the arm, hand or fingers. If the arm is out of frame but the straps are clearly on the hand/fingers, that counts.\n' +
    `- gesture: the photo shows ${gesture}.\n` +
    '- wrapped_hand: the hand making that gesture is the SAME hand that has the black tefillin straps wound around it (straps visible on that hand or its fingers). A gesture made by a bare hand without straps => false.\n' +
    '- screen: true if there is ANY sign this is a re-photographed picture: a phone, tablet, monitor or TV frame or bezel anywhere around the person; a picture inside the picture; screen glare or reflection; visible pixels, scan lines or moire; UI elements, status bar or text overlays; paper or print edges; a flat image with no real depth. When unsure, true.\n' +
    '- live: this is a live camera photo of a real person in a real room, NOT a photo of a screen, monitor, phone, printed picture, poster or drawing. If screen is true, live must be false.\n' +
    '- reason_he: one short sentence in Hebrew (no niqqud) for the user: what is missing, or that all is fine.';
}

export function verdict(o) {
  return !!(o && o.person && o.shel_rosh && o.shel_yad && o.gesture && o.wrapped_hand && o.live && o.screen === false);
}

// הסיבה למשתמש: קודם החשד לצילום מסך, אחר כך מה חסר
export function why(o) {
  if (o.screen !== false || !o.live) return 'נראה כמו צילום של מסך או של תמונה. מצלמים את עצמך, ישירות במצלמה.';
  if (!o.shel_rosh) return 'לא רואים תפילין של ראש.';
  if (!o.shel_yad) return 'לא רואים תפילין של יד.';
  if (!o.gesture) return 'לא רואים את הסימן ביד.';
  if (!o.wrapped_hand) return 'את הסימן עושים ביד שעליה הרצועות של תפילין של יד.';
  return '';
}

async function gemini(env, parts, system) {
  const keys = geminiKeys(env);
  if (!keys.length) throw new Error('no key');
  let last;
  for (const model of VISION) for (const key of keys) {
    const tag = key.slice(-6) + '|' + model;
    if (spent.get(tag) === pday()) continue;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(40000),
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json', responseSchema: SCHEMA } })
      });
      if (!r.ok) { last = new Error(model + ' ' + r.status); if (r.status === 429) spent.set(tag, pday()); continue; }
      const j = await r.json();
      const txt = j.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
      if (txt) return { o: JSON.parse(txt), engine: model };
      last = new Error(model + ' empty');
    } catch (e) { last = e; }
  }
  throw last || new Error('gemini spent');
}

async function llama(env, img, system) {
  const r = await env.AI.run(AI_VISION, { messages: [
    { role: 'system', content: system + '\nAnswer with JSON only: {"person":true,"shel_rosh":true,"shel_yad":true,"gesture":true,"wrapped_hand":true,"screen":false,"live":true,"reason_he":"..."}' },
    { role: 'user', content: [{ type: 'text', text: 'Check this photo.' }, { type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.data}` } }] }
  ], max_tokens: 400, temperature: 0 });
  let t = r && r.response;
  if (typeof t === 'object') return t;
  t = String(t || '');
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
}

async function challenge(request, env) {
  let b; try { b = await request.json(); } catch (_) { return json({ error: 'bad_json' }, 400); }
  const d = dev(b.device); if (!d) return json({ error: 'device' }, 400);
  const pick = crypto.getRandomValues(new Uint32Array(2));
  const G = GESTURES[pick[0] % GESTURES.length];
  const id = crypto.randomUUID();
  const exp = Date.now() + CH_TTL;
  await call(env, 'put', { id, g: G.g, d: (await sha('tf|' + d)).slice(0, 16), exp });
  return json({ id, gesture: G.g, he: G.he, exp });
}

async function check(request, env) {
  const raw = await request.text();
  if (raw.length > MAX_IMG + 2000) return json({ error: 'too_big' }, 413);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'bad_json' }, 400); }
  const d = dev(b.device), img = b.image || {};
  if (!d || !b.id || !/^image\/(jpeg|png|webp)$/.test(img.mime || '') || !img.data) return json({ error: 'bad' }, 400);
  const who = (await sha('tf|' + d)).slice(0, 16);
  // האתגר נמחק מיד – לשימוש אחד בלבד
  const ch = await call(env, 'take', { id: String(b.id), who, day: new Date().toISOString().slice(0, 10), per: PER_DEVICE, cap: CAP });
  if (ch.error) return json({ pass: false, error: ch.error, reason: ch.error === 'quota' ? 'נגמרו הניסיונות להיום.' : 'האתגר פג. מצלמים שוב.' });
  const G = GESTURES.find(x => x.g === ch.g) || GESTURES[0];
  const system = rules(G.en);
  let o, engine;
  try { ({ o, engine } = await gemini(env, [{ inlineData: { mimeType: img.mime, data: img.data } }, { text: 'Check this selfie.' }], system)); }
  catch (e) {
    try { o = await llama(env, img, system); engine = 'llama'; }
    catch (e2) { return json({ pass: false, error: 'busy', reason: 'השרת עמוס. נסו שוב בעוד דקה.', left: ch.left }); }
  }
  // TEST_PASS קיים רק ב-.dev.vars לבדיקה מקומית (wrangler dev). אף פעם לא כסוד בשרת.
  const pass = verdict(o) || (env.TEST_PASS === '1' && ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname));
  const reason = pass ? 'רואים תפילין. יישר כוח!' : (why(o) || String(o.reason_he || '').slice(0, 160) || 'התמונה לא עברה.');
  return json({ pass, reason, engine, left: ch.left,
    parts: { rosh: !!o.shel_rosh, yad: !!o.shel_yad, gesture: !!o.gesture, hand: !!o.wrapped_hand, screen: o.screen !== false, live: !!o.live } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ping') return json({ ok: true, gemini: geminiKeys(env).length, ai: !!env.AI });
    if (request.method === 'POST' && url.pathname === '/challenge') return challenge(request, env);
    if (request.method === 'POST' && url.pathname === '/check') return check(request, env);
    return json({ error: 'not_found' }, 404);
  }
};

// אתגרים פתוחים (3 דקות) + מונה יומי למכשיר. בלי תמונות.
export class Quota {
  constructor(state) { this.s = state.storage; }
  async fetch(request) {
    const path = new URL(request.url).pathname, b = await request.json(), now = Date.now();
    if (path === '/put') {
      await this.s.put('c:' + b.id, { g: b.g, d: b.d, exp: b.exp });
      const old = await this.s.list({ prefix: 'c:' });
      for (const [k, v] of old) if (v.exp < now) await this.s.delete(k);
      return Response.json({ ok: true });
    }
    if (path === '/take') {
      const c = await this.s.get('c:' + b.id);
      if (!c || c.d !== b.who) return Response.json({ error: 'challenge' });
      await this.s.delete('c:' + b.id);
      if (c.exp < now) return Response.json({ error: 'challenge' });
      let q = (await this.s.get('q')) || {};
      if (q.day !== b.day) q = { day: b.day, all: 0, who: {} };
      const n = q.who[b.who] || 0;
      if (n >= b.per || q.all >= b.cap) return Response.json({ error: 'quota' });
      q.who[b.who] = n + 1; q.all++;
      await this.s.put('q', q);
      return Response.json({ g: c.g, left: b.per - n - 1 });
    }
    return Response.json({ error: 'path' });
  }
}
