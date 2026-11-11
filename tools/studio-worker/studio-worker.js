// "סטודיו" – עוזר עיצוב במילים לעורך הגרפי באתר הכלים (/kelim/tochen/studio/).
// נתיב אחד: POST /design {prompt, mode:'new'|'edit', doc, size:{w,h}, images:[{id,w,h,data?}], variants:1|3}
// מחזיר {doc, note, options:[{doc,note}...]}: עד 3 עיצובים שלמים (רקע + שכבות טקסט/צורה/תמונה/סמל) שהעורך טוען ואפשר להמשיך לערוך ידנית.
// דגם: Gemini (אם הוגדר GEMINI_KEYS, חינם) ואחר כך Workers AI (gpt-oss-120b, בתוך המכסה החינמית).
// פרטיות: לא שומרים את מה שכתבו ולא תמונות. מהדפדפן מגיעה גרסה קטנה (עד 512px) של התמונות שבעיצוב, כדי ש-Gemini יראה אותן;
// היא עוברת רק לבקשה הזו ולא נשמרת בשום מקום.

const ALLOWED = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const PER_IP = 40;   // בקשות לכתובת ביום
const DAY_CAP = 600; // לכל האתר ביום
const MAX_PROMPT = 1500;
const MAX_DOC = 24000;
const AI_MODEL = '@cf/openai/gpt-oss-120b';
const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

const FONTS = ['Assistant', 'Heebo', 'Rubik', 'Varela Round', 'Secular One', 'Suez One', 'Frank Ruhl Libre',
  'David Libre', 'Bellefair', 'Noto Rashi Hebrew', 'Amatic SC', 'Karantina'];

const ICONS = ['phone', 'pin', 'clock', 'calendar', 'heart', 'magen', 'candles', 'book', 'gift', 'cup', 'star', 'flower', 'sun', 'crown', 'balloon', 'music', 'home', 'mail', 'chat', 'user', 'check', 'arrow', 'pomegranate'];

const RULES = `את/ה מעצב/ת גרפי/ת מקצועי/ת בסגנון Canva, שמעצב/ת לקהל ישראלי בעברית.
המשתמש כותב במילים מה הוא רוצה (פוסט, הזמנה, מודעה, ברכה, סטטוס, דף מסמך, כיתוב על תמונה וכו').
את/ה מחזיר/ה עיצוב שלם כ-JSON בלבד, לפי המבנה:
{"note": "משפט קצר בעברית: מה עשית", "doc": {"w": רוחב, "h": גובה, "bg": {...}, "els": [ ... ]}}

הקנבס: פיקסלים, (0,0) בפינה השמאלית העליונה. x,y = הפינה השמאלית העליונה של השכבה, w,h = הגודל. rot = סיבוב במעלות.
bg: {"color":"#rrggbb", "grad":"#rrggbb" או null (צבע שני למעבר צבע), "angle": מעלות למעבר, "img": מזהה תמונה או null (תמונת רקע), "dim": 0 עד 0.8 (הכהיה מעל תמונת הרקע כדי שהטקסט ייקרא)}
שכבות els (מהתחתונה לעליונה), לכל אחת "id" (מחרוזת קצרה), "type", x, y, w, h, rot, opacity (0-1):
- טקסט: {"type":"text","text":"...","font":שם גופן,"size":גודל בפיקסלים,"weight":400-900,"color":"#..","align":"center"|"right"|"left","lh":1.1-1.6,"ls":ריווח אותיות בפיקסלים,"bg":"#.." או null (מלבן צבע מאחורי הטקסט),"pad":ריפוד,"radius":עיגול פינות,"stroke":"#.." או null (קו מתאר לאותיות),"sw":עובי קו המתאר,"shadow":true/false}
  שורה חדשה בטקסט = \\n. גובה h של טקסט = בערך מספר השורות × size × lh (+ ריפוד כפול).
- תמונה: {"type":"image","src":מזהה תמונה מהרשימה,"fit":"cover"|"contain","radius":עיגול פינות,"stroke":"#.." או null,"sw":עובי מסגרת}
- מלבן: {"type":"rect","fill":"#.." או null,"stroke":"#.." או null,"sw":עובי,"radius":עיגול פינות}
- עיגול/אליפסה: {"type":"ellipse","fill":"#.." או null,"stroke":"#.." או null,"sw":עובי}
- קו: {"type":"line","stroke":"#..","sw":עובי} (קו אופקי ברוחב w; לקו אנכי rot=90)
- סמל (אייקון קטן בצבע אחד): {"type":"icon","icon":שם,"fill":"#.."} – w ו-h שווים. שמות מותרים בלבד: ${ICONS.join(', ')}.
  (magen = מגן דוד, candles = נרות שבת/חנוכה, cup = כוס קידוש, pin = מיקום, pomegranate = רימון). טוב ליד פרטים: שעון ליד שעה, מיקום ליד כתובת, טלפון ליד מספר. בלי להגזים.

גופנים מותרים בלבד: ${FONTS.join(', ')}.
התאמה: Secular One / Suez One / Rubik 800 לכותרות חזקות; Frank Ruhl Libre / David Libre / Bellefair לסגנון קלאסי, תורני, חגיגי; Amatic SC / Karantina לכתב יד שמח ולילדים; Assistant / Heebo / Varela Round לטקסט רגיל.

כללי עיצוב טובים:
- היררכיה ברורה: כותרת אחת גדולה (בערך 8%-14% מרוחב הקנבס), תת-כותרת בינונית, פרטים קטנים יותר (לא פחות מ-3.2% מהרוחב כדי שיהיה קריא בטלפון).
- שוליים של לפחות 6% מכל צד. שום טקסט לא יוצא מהקנבס. רוב הטקסט ממורכז (align center) אלא אם התבקש אחרת.
- ניגודיות חזקה בין טקסט לרקע. פלטה של 2-4 צבעים שמתאימים זה לזה ולאווירה (חגים, שבת, ילדים, עסק, אבל – צבעים מאופקים).
- אפשר להוסיף צורות עדינות לקישוט: פס, מסגרת, עיגולים שקופים למחצה, קו מפריד. לא להעמיס.
- כשיש תמונה של המשתמש – להשתמש בה (כרקע עם dim, או כשכבת תמונה בולטת), אלא אם ביקש אחרת. אסור להמציא מזהה תמונה שלא ברשימה.
- כשמצורפת התמונה עצמה – להסתכל עליה: לבחור צבעים שמתאימים לצבעים שבתמונה (צבע מודגש מתוך התמונה, ניגודיות טובה), ולשים טקסט רק במקום פנוי ושקט בתמונה – אף פעם לא על פנים של אנשים ולא על הנושא המרכזי. אם אין מקום פנוי – פס צבע או מלבן חצי שקוף מאחורי הטקסט, או dim גבוה יותר.
- כתיבה בעברית תקנית ונעימה. להשתמש בדיוק במילים שהמשתמש ביקש; אם לא נתן מילים – לנסח בעצמך קצר וטוב. בלי אימוג'י, אלא אם ביקש. שם ה' בקיצור: ה׳.
- לא להמציא פרטים עובדתיים (שעה, כתובת, טלפון, שמות) שלא נכתבו – במקומם להשאיר מקום עם טקסט כמו "שעה · מקום" רק אם צריך.
כשמבקשים כמה הצעות (variants) – להחזיר {"options":[{"note":"...","doc":{...}}, ...]} עם הצעות שונות באמת זו מזו: פלטת צבעים אחרת, פריסה אחרת (למשל ממורכז / כותרת למעלה עם פס / מסגרת), וגופנים אחרים. כל הצעה שלמה ועומדת בכל הכללים.
במצב "edit" מקבלים את העיצוב הנוכחי: לשנות רק את מה שהתבקש, לשמור את שאר השכבות (כולל ה-id שלהן) כמו שהן, ולהחזיר את כל העיצוב המעודכן.
החזר/י JSON תקין בלבד, בלי טקסט לפניו או אחריו.`;

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-kelim-partner', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', ...(h || {}) } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const day = () => new Date().toISOString().slice(0, 10);

// ---------- ניקוי התשובה של הדגם ----------
const HEX = /^#[0-9a-f]{6}$/i;
const num = (v, lo, hi, d) => { v = Number(v); if (!isFinite(v)) return d; return Math.min(hi, Math.max(lo, v)); };
const RGBA = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i;
const col = (v, d) => { if (typeof v !== 'string') return d; v = v.trim(); if (RGBA.test(v)) return v.replace(/\s+/g, ''); if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map(c => c + c).join(''); return HEX.test(v) ? v.toLowerCase() : d; };
const colN = v => (v == null || v === '' || v === 'none' || v === 'transparent') ? null : col(v, null);

export function cleanDoc(d, size, imageIds) {
  d = d && typeof d === 'object' ? d : {};
  const W = Math.round(num(size && size.w || d.w, 200, 4000, 1080)), H = Math.round(num(size && size.h || d.h, 200, 6000, 1080));
  const ids = new Set(imageIds || []);
  const b = d.bg && typeof d.bg === 'object' ? d.bg : {};
  const bg = { color: col(b.color, '#ffffff'), grad: colN(b.grad), angle: num(b.angle, -360, 360, 160),
    img: ids.has(b.img) ? b.img : null, dim: num(b.dim, 0, 0.85, 0) };
  const els = [];
  const list = Array.isArray(d.els) ? d.els.slice(0, 60) : [];
  let n = 0;
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const t = String(e.type || '');
    const base = { id: String(e.id || '').slice(0, 24) || ('a' + (++n)), type: t,
      x: Math.round(num(e.x, -W, 2 * W, 0)), y: Math.round(num(e.y, -H, 2 * H, 0)),
      w: Math.round(num(e.w, 4, 3 * W, W / 2)), h: Math.round(num(e.h, 2, 3 * H, 100)),
      rot: num(e.rot, -360, 360, 0), opacity: num(e.opacity, 0.05, 1, 1) };
    if (t === 'text') {
      const text = String(e.text == null ? '' : e.text).replace(/\\n/g, '\n').slice(0, 1200);
      if (!text.trim()) continue;
      els.push(Object.assign(base, { text, font: FONTS.includes(e.font) ? e.font : 'Assistant',
        size: Math.round(num(e.size, 8, 600, 48)), weight: Math.round(num(e.weight, 300, 900, 700) / 100) * 100,
        color: col(e.color, '#111111'), align: ['center', 'right', 'left'].includes(e.align) ? e.align : 'center',
        lh: num(e.lh, 0.8, 2.4, 1.25), ls: num(e.ls, -20, 60, 0), bg: colN(e.bg), pad: Math.round(num(e.pad, 0, 200, 0)),
        radius: Math.round(num(e.radius, 0, 400, 0)), stroke: colN(e.stroke), sw: num(e.sw, 0, 40, 0), shadow: !!e.shadow }));
    } else if (t === 'image') {
      if (!ids.has(e.src)) continue;
      els.push(Object.assign(base, { src: e.src, fit: e.fit === 'contain' ? 'contain' : 'cover',
        radius: Math.round(num(e.radius, 0, 2000, 0)), stroke: colN(e.stroke), sw: num(e.sw, 0, 80, 0) }));
    } else if (t === 'rect' || t === 'ellipse') {
      const fill = colN(e.fill), stroke = colN(e.stroke);
      if (!fill && !stroke) continue;
      els.push(Object.assign(base, { fill, stroke, sw: num(e.sw, 0, 80, stroke ? 4 : 0), radius: t === 'rect' ? Math.round(num(e.radius, 0, 2000, 0)) : 0 }));
    } else if (t === 'icon') {
      if (!ICONS.includes(e.icon)) continue;
      const s = Math.round(Math.min(base.w, base.h));
      els.push(Object.assign(base, { w: s, h: s, icon: e.icon, fill: col(e.fill, '#c9a55c') }));
    } else if (t === 'line') {
      els.push(Object.assign(base, { h: Math.max(2, Math.round(num(e.sw, 1, 60, 4))), stroke: col(e.stroke, '#111111'), sw: num(e.sw, 1, 60, 4) }));
    }
  }
  return { w: W, h: H, bg, els };
}

// ---------- דגמים ----------
function geminiKeys(env) { return String(env.GEMINI_KEYS || env.GEMINI_KEY || '').split(/[,\s]+/).filter(Boolean); }
async function gemini(env, text, imgs, many) {
  const keys = geminiKeys(env);
  if (!keys.length) throw new Error('no key');
  let last;
  for (const model of GEMINI_MODELS) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    for (let i = 0; i < 2; i++) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', signal: AbortSignal.timeout(many ? 95000 : 60000),
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: RULES }] }, contents: [{ role: 'user', parts: imageParts(text, imgs) }],
            generationConfig: { temperature: many ? 0.9 : 0.7, maxOutputTokens: many ? 32000 : 12000, responseMimeType: 'application/json' } })
        });
        if (!r.ok) { const e = new Error(model + ' ' + r.status); e.status = r.status; throw e; }
        const j = await r.json();
        const t = j.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
        return { data: parseJsonText(t), model };
      } catch (e) {
        last = e;
        if (e.status === 429 || (e.status && e.status < 500)) break;
        await sleep(1500);
      }
    }
  }
  throw last;
}
// הטקסט + התמונות הקטנות (inlineData) – Gemini רואה אותן ויודע לאיזה מזהה כל אחת שייכת
export function imageParts(text, imgs) {
  const parts = [{ text }];
  for (const i of (imgs || [])) if (i.data) { parts.push({ text: `התמונה שהמזהה שלה ${i.id}:` }); parts.push({ inlineData: { mimeType: 'image/jpeg', data: i.data } }); }
  return parts;
}
export function parseJsonText(raw) {
  let t = '';
  if (raw && typeof raw === 'object' && Array.isArray(raw.output)) for (const o of raw.output) if (o.type !== 'reasoning') for (const c of (o.content || [])) if (c.type === 'output_text' || c.text) t += c.text || '';
  if (!t) t = typeof raw === 'string' ? raw : ((raw && (raw.response || raw.output_text)) || '');
  if (typeof t === 'object') return t;
  t = String(t).replace(/^```(?:json)?\s*|\s*```$/g, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  return JSON.parse(a >= 0 ? t.slice(a, b + 1) : t);
}
async function workersAI(env, text) {
  if (!env.AI) throw new Error('no AI');
  const raw = await env.AI.run(AI_MODEL, { instructions: RULES, input: text, reasoning: { effort: 'low' } });
  return { data: parseJsonText(raw), model: AI_MODEL };
}

export function buildInput(body) {
  const size = body.size || {};
  let withData = 0;
  const imgs = (Array.isArray(body.images) ? body.images : []).slice(0, 12).map(i => {
    const o = { id: String(i.id).slice(0, 24), w: Math.round(num(i.w, 1, 20000, 1000)), h: Math.round(num(i.h, 1, 20000, 1000)), name: String(i.name || '').slice(0, 40) };
    if (typeof i.data === 'string' && i.data.length < 700000 && /^[A-Za-z0-9+/=]+$/.test(i.data) && withData < 3) { o.data = i.data; withData++; }
    return o;
  });
  const many = body.mode !== 'edit' && Number(body.variants) > 1;
  let s = `מצב: ${body.mode === 'edit' ? 'edit (לשנות את העיצוב הקיים)' : 'new (עיצוב חדש)'}\n`;
  s += `גודל הקנבס: רוחב ${size.w} גובה ${size.h} פיקסלים.\n`;
  if (body.dest) s += `לאן העיצוב מיועד: ${String(body.dest).slice(0, 300)}. להתאים את הגודל, את כמות הטקסט ואת המיקום ליעד הזה.\n`;
  s += imgs.length ? `תמונות שהמשתמש העלה (מותר להשתמש רק במזהים האלה): ${JSON.stringify(imgs.map(({ data, ...r }) => r))}\n` : 'אין תמונות של המשתמש (אל תוסיף/י שכבות תמונה).\n';
  if (withData) s += `מצורפות ${withData} מהתמונות עצמן (בגרסה קטנה) – הסתכל/י עליהן לפני שמעצבים: צבעים מתוך התמונה, וטקסט רק במקום פנוי, לא על פנים.\n`;
  if (many) s += 'הכן/י 3 הצעות שונות זו מזו, והחזר/י {"options":[{"note":...,"doc":...},{...},{...}]}.\n';
  if (body.mode === 'edit' && body.doc) s += `העיצוב הנוכחי:\n${JSON.stringify(body.doc).slice(0, MAX_DOC)}\n`;
  s += `\nהבקשה של המשתמש:\n${String(body.prompt || '').slice(0, MAX_PROMPT)}`;
  return { text: s, imgs, many };
}

// שותפים במיזם: קוד אישי 'NNN-DDDDD' (אותו קוד של ההחייאה, tools/chaye-worker/partner_codes.py, הסוד PARTNER_SECRET)
// נשלח בכותרת x-kelim-partner. קוד תקין = בלי מכסה אישית (התקרה היומית לכל האתר נשארת). ביטול: REVOKED ב-[vars].
const PCODE = /^(\d{3})-?(\d{5})$/;
async function partnerOk(env, code) {
  const m = String(code || '').replace(/\s/g, '').match(PCODE);
  if (!m || !env.PARTNER_SECRET) return false;
  if (String(env.REVOKED || '').split(',').map(x => x.trim()).filter(Boolean).map(Number).includes(+m[1])) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PARTNER_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('chaye-partner:' + (+m[1]))));
  return ((sig[0] << 24 | sig[1] << 16 | sig[2] << 8 | sig[3]) >>> 0) % 100000 === +m[2];
}
const perFor = async (env, req, per) => (await partnerOk(env, req.headers.get('x-kelim-partner'))) ? 1e9 : per;
async function allow(env, ip, per) {
  if (!env.QUOTA) return { ok: true };
  const who = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + day())))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
  const r = await env.QUOTA.get(env.QUOTA.idFromName('q')).fetch('https://q/', { method: 'POST', body: JSON.stringify({ day: day(), who, per: per || PER_IP, cap: DAY_CAP }) });
  return r.json();
}

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('origin'));
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: h ? 204 : 403, headers: h || {} });
    if (url.pathname === '/ping') return json({ ok: true, gemini: geminiKeys(env).length > 0 }, 200, h || {});
    if (req.method !== 'POST' || url.pathname !== '/design') return json({ error: 'not found' }, 404, h || {});
    if (!h) return json({ error: 'origin' }, 403);
    let body;
    try { body = await req.json(); } catch (_) { return json({ error: 'בקשה לא תקינה' }, 400, h); }
    if (!String(body.prompt || '').trim()) return json({ error: 'כתבו מה לעצב' }, 400, h);
    const q = await allow(env, req.headers.get('cf-connecting-ip') || '0', await perFor(env, req, PER_IP));
    if (!q.ok) return json({ error: 'הגעתם למכסה של היום לעוזר העיצוב. אפשר להמשיך לעצב ידנית, והעוזר חוזר מחר.' }, 429, h);
    const { text, imgs, many } = buildInput(body);
    const size = { w: num(body.size && body.size.w, 200, 4000, 1080), h: num(body.size && body.size.h, 200, 6000, 1080) };
    let out, err;
    const ids = imgs.map(i => i.id);
    let options = [];
    for (const f of [gemini, workersAI, workersAI]) {
      try {
        out = await f(env, text, imgs, many);
        const raw = out && out.data ? (Array.isArray(out.data.options) ? out.data.options : (out.data.doc ? [out.data] : [])) : [];
        options = raw.slice(0, 3).map(o => o && o.doc ? { doc: cleanDoc(o.doc, size, ids), note: String(o.note || '').slice(0, 300) } : null).filter(o => o && o.doc.els.length);
        if (options.length) break;
        out = null;
      } catch (e) { err = e; out = null; }
    }
    if (!out || !options.length) return json({ error: 'העוזר עמוס כרגע. נסו שוב בעוד דקה.', detail: String(err && err.message || '').slice(0, 120) }, 503, h);
    return json({ doc: options[0].doc, note: options[0].note, options, left: q.left, model: out.model }, 200, h);
  }
};

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
