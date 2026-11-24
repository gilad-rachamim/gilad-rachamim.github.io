// "תפילין – הכלים": בדיקת תמונה עם תפילין, לפתיחה מוקדמת של "הנעילה המחייבת" באפליקציה.
// Cloudflare Worker, חינם:
//   POST /challenge {device}                         -> {id, gesture, he, exp}   אתגר אקראי, תקף 3 דקות, לשימוש אחד
//   POST /check {id, device, image:{mime,data}}      -> {pass, reason, engine, left}           (אפליקציה 1.2.0, תמונה אחת)
//   POST /challenge {device, mode:'video'}           -> {id, gesture, he, gesture2, he2, exp}   שני סימנים, בסדר הזה
//   POST /check-video {id, device, motion, frames:[{t,mime,data}]} -> {pass, reason, engine, left}  (1.3.0, סרטון קצר)
//   GET  /ping
//   GET  /status?device=CODE[&from=HH:MM]            -> טקסט: ok / no   (קיצור הדרך באייפון, מ-17.11.2026)
//        ok = עבר היום בדיקת תפילין, או שעכשיו לא זמן תפילין (לפני משיכיר / אחרי השקיעה / שבת / חג / חול המועד),
//        או שבתשעה באב לפני חצות. no = זמן תפילין ועוד לא עבר היום.
// CORS: רק לאתר (hakelim.com, github.io, localhost) – לדף "נעילת תפילין באייפון".
// פרטיות: התמונה נבדקת בזיכרון ונזרקת. לא נשמרת בשום מקום, לא נרשמת ביומן.
// נשמר רק: מונה יומי לכל מכשיר (מזהה אקראי של האפליקציה, מגובב) ואתגרים פתוחים ל-3 דקות.
// נגד רמאות: אתגר אקראי שחייב להופיע בתמונה, תוקף קצר, שימוש אחד, הגבלת ניסיונות,
// ובדיקה שזו לא תמונה של מסך / הדפסה. האפליקציה מצלמת רק במצלמה חיה (בלי גלריה).
// מ-1.3.0: סרטון של כ-4 שניות במקום תמונה. האפליקציה שולחת 3–5 פריימים (לא את הווידאו) עם חותמות זמן.
// השרת בודק: אותו אדם בכל הפריימים, תפילין של ראש בכולם ושל יד ברובם, סימן א' ואחריו סימן ב' (בסדר),
// תנועה אמיתית בין הפריימים (לא אותה תמונה), ואף פריים לא נראה כמו צילום של מסך.

const PER_DEVICE = 6, CAP = 3000;          // בדיקות ביום: למכשיר / לכל השרת
const CH_TTL = 180_000;                    // 3 דקות לאתגר
const MAX_IMG = 3_000_000;
const MAX_FRAME = 900_000, MIN_FRAMES = 3, MAX_FRAMES = 5;
const MIN_SPAN = 1500, MAX_SPAN = 8000;    // מילישניות בין הפריים הראשון לאחרון
const MIN_MOTION = 1.0;                    // הפרש בהירות ממוצע בין פריימים (0–255), נמדד באפליקציה
const VISION = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];   // 3.1 עמוס (503) – נוסף לפניו 3.5-flash-lite (24.11.2026)
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
const ORIGINS = /^https:\/\/(hakelim\.com|www\.hakelim\.com|gilad-rachamim\.github\.io)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
// הוספת CORS לתשובה – רק לבקשה מהאתר. האפליקציה לא שולחת Origin, אז אצלה שום דבר לא משתנה.
export function cors(request, res) {
  const o = request.headers.get('origin') || '';
  if (!ORIGINS.test(o)) return res;
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', o);
  h.set('vary', 'origin');
  h.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  h.set('access-control-allow-headers', 'content-type');
  h.set('access-control-max-age', '86400');
  return new Response(res.body, { status: res.status, headers: h });
}
export function geminiKeys(env) { return String(env.GEMINI_KEYS || env.GEMINI_KEY || '').split(/[,\s]+/).filter(Boolean); }
const spent = new Map();
const pday = () => new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 10);

// ---------- זמנים ולוח (לקיצור הדרך באייפון). אותן נוסחאות כמו Sun.kt / Luach.kt באפליקציה ----------
const IL = 'Asia/Jerusalem', JLAT = 31.778, JLON = 35.235;
export const ilDate = (t = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: IL }).format(new Date(t));
const R = Math.PI / 180;
function solar(t) {
  const l0 = ((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360 + 360) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c = Math.sin(m * R) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * m * R) * (0.019993 - 0.000101 * t) + Math.sin(3 * m * R) * 0.000289;
  const om = 125.04 - 1934.136 * t;
  const app = l0 + c - 0.00569 - 0.00478 * Math.sin(om * R);
  const mo = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const ob = mo + 0.00256 * Math.cos(om * R);
  const decl = Math.asin(Math.sin(ob * R) * Math.sin(app * R));
  const y = Math.tan(ob * R / 2) ** 2;
  const eq = 4 / R * (y * Math.sin(2 * l0 * R) - 2 * e * Math.sin(m * R) + 4 * e * y * Math.sin(m * R) * Math.cos(2 * l0 * R) -
    0.5 * y * y * Math.sin(4 * l0 * R) - 1.25 * e * e * Math.sin(2 * m * R));
  return [eq, decl];
}
// זמן השמש (מילישניות UTC) בתאריך YYYY-MM-DD. zenith 90.833 = זריחה/שקיעה, 101.5 = משיכיר (כמו באפליקציה ובאתר).
export function sunAt(date, zenith, rise, lat = JLAT, lon = JLON) {
  const d0 = Date.parse(date + 'T00:00:00Z'), jd0 = d0 / 864e5 + 2440587.5;
  let min = 720 - 4 * lon;
  for (let i = 0; i < 3; i++) {
    const [eq, decl] = solar((jd0 + min / 1440 - 2451545) / 36525);
    const ch = Math.cos(zenith * R) / (Math.cos(lat * R) * Math.cos(decl)) - Math.tan(lat * R) * Math.tan(decl);
    if (ch < -1 || ch > 1) return null;
    const ha = Math.acos(ch) / R;
    min = 720 - 4 * lon - eq + (rise ? -4 * ha : 4 * ha);
  }
  return d0 + Math.round(min * 60) * 1000;
}
// סוג היום – כמו Luach.kind באפליקציה (ארץ ישראל, יום טוב אחד). off = שבת/חג, moed = חול המועד, av = תשעה באב.
export function dayKind(date) {
  const t = new Date(date + 'T12:00:00Z');
  if (t.getUTCDay() === 6) return { off: true, why: 'שבת' };
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-u-ca-hebrew', { timeZone: 'UTC', month: 'long', day: 'numeric' })
    .formatToParts(t).map(x => [x.type, x.value]));
  const m = p.month, d = +p.day;
  if (m === 'Tishri') {
    if (d === 1 || d === 2) return { off: true, why: 'ראש השנה' };
    if (d === 10) return { off: true, why: 'יום כיפור' };
    if (d === 15) return { off: true, why: 'סוכות' };
    if (d >= 16 && d <= 21) return { off: false, moed: true, why: 'חול המועד סוכות' };
    if (d === 22) return { off: true, why: 'שמיני עצרת' };
  }
  if (m === 'Nisan') {
    if (d === 15) return { off: true, why: 'פסח' };
    if (d >= 16 && d <= 20) return { off: false, moed: true, why: 'חול המועד פסח' };
    if (d === 21) return { off: true, why: 'שביעי של פסח' };
  }
  if (m === 'Sivan' && d === 6) return { off: true, why: 'שבועות' };
  if (m === 'Av' && (d === 9 || (d === 10 && t.getUTCDay() === 0))) return { off: false, av: true, why: 'תשעה באב' };
  return { off: false, why: '' };
}
// האם עכשיו זמן שבו החסימה באייפון פעילה (לפני שבדקו תפילין היום). from = "HH:MM" שעון ישראל, לא לפני משיכיר.
export function lockTime(now = Date.now(), from = '') {
  const date = ilDate(now), k = dayKind(date);
  if (k.off || k.moed) return false;
  const sunset = sunAt(date, 90.833, false);
  if (sunset && now >= sunset) return false;
  let start = sunAt(date, 101.5, true) || Date.parse(date + 'T04:30:00Z');
  if (k.av) start = Math.max(start, (sunAt(date, 90.833, true) + sunset) / 2); // תשעה באב: מניחים במנחה – מחצות
  const f = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(from || '');
  if (f) {
    // ההפרש בין שעון ישראל ל-UTC ביום הזה
    const noon = Date.parse(date + 'T12:00:00Z');
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: IL, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(noon)).split(':');
    const off = ((+hm[0] - 12) * 60 + +hm[1]) * 60000;
    start = Math.max(start, Date.parse(date + 'T00:00:00Z') + (+f[1] * 60 + +f[2]) * 60000 - off);
  }
  return now >= start;
}

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

const tripped = new Map();   // מפסק: דגם -> עד מתי לדלג עליו (בזיכרון של המופע)
// דגם אחד על כל המפתחות. דגם עמוס (5xx) או תקוע נכנס למפסק, כדי שהבקשות הבאות לא יחכו לו
async function geminiModel(env, model, parts, system, schema, ms) {
  let last;
  for (const key of geminiKeys(env)) {
    const tag = key.slice(-6) + '|' + model;
    if (spent.get(tag) === pday()) continue;
    if ((tripped.get(model) || 0) > Date.now()) break;
    try {
      const gen = { temperature: 0, maxOutputTokens: 1024, responseMimeType: 'application/json', responseSchema: schema };
      if (!/3\.5-flash-lite/.test(model)) gen.thinkingConfig = { thinkingBudget: 0 };   // 3.5-flash-lite דוחה את ההגדרה (400)
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: AbortSignal.timeout(ms),
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }],
          generationConfig: gen })
      });
      if (!r.ok) {
        last = new Error(model + ' ' + r.status);
        if (r.status === 429) spent.set(tag, pday()); else if (r.status >= 500) tripped.set(model, Date.now() + 5 * 60000);
        continue;
      }
      const j = await r.json();
      const txt = j.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
      if (txt) return { o: JSON.parse(txt), engine: model };
      last = new Error(model + ' empty');
    } catch (e) {
      last = e;
      if (e.name === 'TimeoutError' || e.name === 'AbortError') tripped.set(model, Date.now() + 5 * 60000);   // נתקע
    }
  }
  throw last || new Error(model + ' skipped');
}
// מירוץ: הדגם הראשי מתחיל; לא ענה תוך 4 שניות (או נפל) – הדגמים הבאים מתחילים במקביל, והראשון שעונה מנצח
async function gemini(env, parts, system, schema = SCHEMA) {
  if (!geminiKeys(env).length) throw new Error('no key');
  const live = VISION.filter(m => !((tripped.get(m) || 0) > Date.now()));
  if (!live.length) throw new Error('gemini busy');
  let done = false;
  const first = geminiModel(env, live[0], parts, system, schema, 8000);
  first.then(() => { done = true; }, e => { console.log('gemini', live[0], String(e && e.message || e).slice(0, 80)); });
  const rest = (async () => {
    let t;
    await Promise.race([new Promise(r => { t = setTimeout(r, 4000); }), first.catch(() => {})]);
    clearTimeout(t);
    for (const m of live.slice(1)) {
      if (done) break;
      try { return await geminiModel(env, m, parts, system, schema, 6000); } catch (e) { console.log('gemini', m, String(e && e.message || e).slice(0, 80)); }
    }
    throw new Error('gemini spent');
  })();
  try { return await Promise.any([first, rest]); }
  catch (e) { throw (e.errors && e.errors[0]) || e; }
}

const SHAPE1 = '{"person":true,"shel_rosh":true,"shel_yad":true,"gesture":true,"wrapped_hand":true,"screen":false,"live":true,"reason_he":"..."}';
async function llama(env, img, system, shape = SHAPE1, imgs = [img], ask = 'Check this photo.') {
  const r = await env.AI.run(AI_VISION, { messages: [
    { role: 'system', content: system + '\nAnswer with JSON only: ' + shape },
    { role: 'user', content: [{ type: 'text', text: ask }, ...imgs.map(i => ({ type: 'image_url', image_url: { url: `data:${i.mime};base64,${i.data}` } }))] }
  ], max_tokens: 700, temperature: 0 });
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
  const who = (await sha('tf|' + d)).slice(0, 16);
  if (b.mode === 'video') {
    // שני סימנים שונים, בסדר קבוע: 6×5 = 30 צירופים. סרטון מוכן מראש לא יתאים.
    const G2 = GESTURES.filter(x => x.g !== G.g)[pick[1] % (GESTURES.length - 1)];
    await call(env, 'put', { id, g: G.g, g2: G2.g, d: who, exp });
    return json({ id, gesture: G.g, he: G.he, gesture2: G2.g, he2: G2.he, exp });
  }
  await call(env, 'put', { id, g: G.g, d: who, exp });
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
  if (ch.g2) return json({ pass: false, error: 'challenge', reason: 'האתגר הזה לסרטון. מצלמים שוב.', left: ch.left });
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
  if (pass) await call(env, 'done', { who, day: ilDate() });
  const reason = pass ? 'רואים תפילין. יישר כוח!' : (why(o) || String(o.reason_he || '').slice(0, 160) || 'התמונה לא עברה.');
  return json({ pass, reason, engine, left: ch.left,
    parts: { rosh: !!o.shel_rosh, yad: !!o.shel_yad, gesture: !!o.gesture, hand: !!o.wrapped_hand, screen: o.screen !== false, live: !!o.live } });
}

// ---------- סרטון (1.3.0) ----------
const FRAME = { type: 'OBJECT', properties: {
  person: { type: 'BOOLEAN' }, shel_rosh: { type: 'BOOLEAN' }, shel_yad: { type: 'BOOLEAN' },
  gesture_a: { type: 'BOOLEAN' }, gesture_b: { type: 'BOOLEAN' }, screen: { type: 'BOOLEAN' }
}, required: ['person', 'shel_rosh', 'shel_yad', 'gesture_a', 'gesture_b', 'screen'] };
export const VSCHEMA = { type: 'OBJECT', properties: {
  frames: { type: 'ARRAY', items: FRAME },
  same_person: { type: 'BOOLEAN' }, motion: { type: 'BOOLEAN' }, wrapped_hand: { type: 'BOOLEAN' },
  screen: { type: 'BOOLEAN' }, live: { type: 'BOOLEAN' }, reason_he: { type: 'STRING' }
}, required: ['frames', 'same_person', 'motion', 'wrapped_hand', 'screen', 'live', 'reason_he'] };

export function vrules(a, b, n) {
  return `You check ${n} frames taken in order from one short live selfie video (about 4 seconds) for a Jewish tefillin (phylacteries) app. ` +
    'Be strict and honest; do not guess in the user\'s favour. The user was asked to FIRST show gesture A and THEN switch to gesture B.\n' +
    `Gesture A: ${a}.\nGesture B: ${b}.\n` +
    `Return "frames": exactly ${n} objects, one per frame in the given order, each with:\n` +
    '- person: a real person is clearly visible.\n' +
    '- shel_rosh: the person is WEARING the head tefillin: a black leather box on the head above the forehead at the hairline, held by a black strap. A kippah, hat, or a box held in the hand does NOT count.\n' +
    '- shel_yad: the arm tefillin is visible: a black box on the upper arm and/or black leather straps wound around the arm, hand or fingers.\n' +
    '- gesture_a / gesture_b: this frame shows gesture A / gesture B.\n' +
    '- screen: this frame shows ANY sign of a re-photographed picture or video: a phone, tablet, monitor or TV frame or bezel; a picture inside the picture; screen glare; pixels, scan lines or moire; UI, status bar or text overlays; paper or print edges; a flat image with no real depth. When unsure, true.\n' +
    'Then over all frames:\n' +
    '- same_person: all frames show the same person in the same place.\n' +
    '- motion: there is real movement between the frames (the hand and/or head position changes naturally). Identical or near-identical frames => false.\n' +
    '- wrapped_hand: the gestures are made by the hand that has the black tefillin straps wound around it.\n' +
    '- screen: true if ANY frame looks like a screen or a print.\n' +
    '- live: this is a live camera video of a real person in a real room, NOT a video of a screen, phone, printed picture or poster. If screen is true, live must be false.\n' +
    '- reason_he: one short sentence in Hebrew (no niqqud) for the user: what is missing, or that all is fine.';
}

// ההחלטה על סרטון. מחזירה '' כשעבר, או את הסיבה למשתמש. ערך חסר = לא עבר.
export function vwhy(o, n) {
  const f = o && Array.isArray(o.frames) ? o.frames.slice(0, n) : [];
  if (!o || f.length < n) return 'הבדיקה לא הצליחה לקרוא את כל הסרטון. מצלמים שוב.';
  if (o.screen !== false || o.live !== true || f.some(x => !x || x.screen !== false)) return 'נראה כמו צילום של מסך או של תמונה. מצלמים את עצמך, ישירות במצלמה.';
  if (f.some(x => x.person !== true) || o.same_person !== true) return 'צריך לראות אותך לאורך כל הסרטון – אותו אדם בכל הרגעים.';
  if (f.some(x => x.shel_rosh !== true)) return 'לא רואים תפילין של ראש לאורך כל הסרטון.';
  if (f.filter(x => x.shel_yad === true).length < Math.ceil(n / 2)) return 'לא רואים תפילין של יד.';
  const ia = f.findIndex(x => x.gesture_a === true);
  const lb = f.map(x => x.gesture_b === true).lastIndexOf(true);
  if (ia < 0) return 'לא רואים את הסימן הראשון ביד.';
  if (lb < 0) return 'לא רואים את הסימן השני ביד.';
  if (lb <= ia) return 'צריך קודם את הסימן הראשון, ואחריו את השני.';
  if (o.motion !== true) return 'לא רואים תנועה בסרטון. עושים את שני הסימנים בזמן ההקלטה.';
  if (o.wrapped_hand !== true) return 'את הסימנים עושים ביד שעליה הרצועות של תפילין של יד.';
  return '';
}

// בדיקות מבנה לפני שמבזבזים ניסיון: מספר פריימים, גודל, חותמות זמן עולות בטווח סביר.
export function vshape(b) {
  const fr = b && Array.isArray(b.frames) ? b.frames : null;
  if (!fr || fr.length < MIN_FRAMES || fr.length > MAX_FRAMES) return 'frames';
  let prev = -1, tot = 0;
  for (const x of fr) {
    if (!x || !/^image\/(jpeg|webp)$/.test(x.mime || '') || typeof x.data !== 'string' || !x.data || x.data.length > MAX_FRAME) return 'frame';
    const t = Number(x.t);
    if (!Number.isFinite(t) || t <= prev) return 'time';
    prev = t; tot += x.data.length;
  }
  const span = Number(fr[fr.length - 1].t) - Number(fr[0].t);
  if (span < MIN_SPAN || span > MAX_SPAN) return 'span';
  if (tot > MAX_IMG) return 'too_big';
  return '';
}

async function checkVideo(request, env) {
  const raw = await request.text();
  if (raw.length > MAX_IMG + 5000) return json({ error: 'too_big' }, 413);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'bad_json' }, 400); }
  const d = dev(b.device);
  if (!d || !b.id) return json({ error: 'bad' }, 400);
  const bad = vshape(b);
  if (bad) return json({ error: bad }, 400);
  const fr = b.frames, n = fr.length;
  const who = (await sha('tf|' + d)).slice(0, 16);
  // האתגר נמחק מיד – לשימוש אחד בלבד
  const ch = await call(env, 'take', { id: String(b.id), who, day: new Date().toISOString().slice(0, 10), per: PER_DEVICE, cap: CAP });
  if (ch.error) return json({ pass: false, error: ch.error, reason: ch.error === 'quota' ? 'נגמרו הניסיונות להיום.' : 'האתגר פג. מצלמים שוב.' });
  if (!ch.g2) return json({ pass: false, error: 'challenge', reason: 'האתגר פג. מצלמים שוב.', left: ch.left });
  // אותה תמונה שנשלחה כמה פעמים, או כמעט בלי שינוי בין הפריימים = לא סרטון חי
  const hs = new Set(await Promise.all(fr.map(x => sha(x.data))));
  const mo = Number(b.motion);
  if (hs.size < n || !Number.isFinite(mo) || mo < MIN_MOTION)
    return json({ pass: false, error: 'static', reason: 'הסרטון כמעט לא זז. עושים את שני הסימנים בזמן ההקלטה.', left: ch.left });
  const A = GESTURES.find(x => x.g === ch.g) || GESTURES[0], B = GESTURES.find(x => x.g === ch.g2) || GESTURES[1];
  const system = vrules(A.en, B.en, n);
  const t0 = Number(fr[0].t);
  let o, engine;
  try {
    const parts = [];
    fr.forEach((x, i) => parts.push({ text: `Frame ${i + 1} (t=${((Number(x.t) - t0) / 1000).toFixed(1)}s):` }, { inlineData: { mimeType: x.mime, data: x.data } }));
    parts.push({ text: `Check these ${n} frames.` });
    ({ o, engine } = await gemini(env, parts, system, VSCHEMA));
  } catch (e) {
    try {
      const one = '{"person":true,"shel_rosh":true,"shel_yad":true,"gesture_a":false,"gesture_b":true,"screen":false}';
      const shape = '{"frames":[' + Array(n).fill(one).join(',') + '],"same_person":true,"motion":true,"wrapped_hand":true,"screen":false,"live":true,"reason_he":"..."}';
      o = await llama(env, null, system, shape, fr, `Check these ${n} frames, in order.`); engine = 'llama';
    } catch (e2) { return json({ pass: false, error: 'busy', reason: 'השרת עמוס. נסו שוב בעוד דקה.', left: ch.left }); }
  }
  const miss = vwhy(o, n);
  // TEST_PASS קיים רק ב-.dev.vars לבדיקה מקומית (wrangler dev). אף פעם לא כסוד בשרת.
  const pass = !miss || (env.TEST_PASS === '1' && ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname));
  if (pass) await call(env, 'done', { who, day: ilDate() });
  const f = (o && Array.isArray(o.frames) ? o.frames : []).slice(0, n);
  return json({ pass, reason: pass ? 'רואים תפילין. יישר כוח!' : miss, engine, left: ch.left,
    frames: f.map(x => ({ rosh: !!(x && x.shel_rosh), yad: !!(x && x.shel_yad), a: !!(x && x.gesture_a), b: !!(x && x.gesture_b), screen: !(x && x.screen === false) })),
    parts: { same: !!(o && o.same_person), motion: !!(o && o.motion), hand: !!(o && o.wrapped_hand), screen: !(o && o.screen === false), live: !!(o && o.live) } });
}

// קיצור הדרך באייפון: טקסט פשוט ok / no. בלי מכסה. at= רק לבדיקת הלוח (בלי "עבר היום").
const text = s => new Response(s, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
async function status(url, env) {
  const d = dev(url.searchParams.get('device'));
  if (!d) return text('bad');
  const at = url.searchParams.get('at');
  const now = at ? Date.parse(at) : Date.now();
  if (!Number.isFinite(now)) return text('bad');
  if (!lockTime(now, url.searchParams.get('from') || '')) return text('ok');
  if (at) return text('no');
  const who = (await sha('tf|' + d)).slice(0, 16);
  const r = await call(env, 'is', { who, day: ilDate(now) });
  return text(r.done ? 'ok' : 'no');
}

async function route(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (url.pathname === '/ping') return json({ ok: true, gemini: geminiKeys(env).length, ai: !!env.AI });
  if (request.method === 'GET' && url.pathname === '/status') return status(url, env);
  if (request.method === 'POST' && url.pathname === '/challenge') return challenge(request, env);
  if (request.method === 'POST' && url.pathname === '/check') return check(request, env);
  if (request.method === 'POST' && url.pathname === '/check-video') return checkVideo(request, env);
  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(request, env) { return cors(request, await route(request, env)); }
};

// אתגרים פתוחים (3 דקות) + מונה יומי למכשיר. בלי תמונות.
export class Quota {
  constructor(state) { this.s = state.storage; }
  async fetch(request) {
    const path = new URL(request.url).pathname, b = await request.json(), now = Date.now();
    if (path === '/put') {
      await this.s.put('c:' + b.id, { g: b.g, g2: b.g2 || '', d: b.d, exp: b.exp });
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
      return Response.json({ g: c.g, g2: c.g2 || '', left: b.per - n - 1 });
    }
    // "עבר היום" למכשיר (מזהה מגובב), לקיצור הדרך באייפון. נשמר רק התאריך האחרון.
    if (path === '/done') {
      await this.s.put('ok:' + b.who, b.day);
      return Response.json({ ok: true });
    }
    if (path === '/is') return Response.json({ done: (await this.s.get('ok:' + b.who)) === b.day });
    return Response.json({ error: 'path' });
  }
}
