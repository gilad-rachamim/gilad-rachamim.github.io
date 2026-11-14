// "הפותר" – פותר שאלות בגרות במתמטיקה (3–5 יח"ל) עם דרך מלאה ובדיקה.
// Cloudflare Worker. נתיב אחד: POST /solve {text, image:{mime,data}, level}
// שלבים: 1) Gemini פותר ומחזיר JSON (סעיפים, שלבים, תשובות, ובדיקות בכתיב מחשבון)
//        2) הקוד מחשב את הבדיקות בעצמו (check.js) – הצבה במשוואה, נגזרת, אינטגרל
//        3) מודל שני פותר מחדש לבד ומשווה לכל סעיף
//        4) אם יש מחלוקת או בדיקה שנכשלה – סבב תיקון אחד, ושוב בדיקה
// חינם: Gemini בשכבה החינמית (רשימת דגמים, עוברים לבא כשעמוס), וגיבוי Workers AI לטקסט.
// פרטיות: לא שומרים שאלות ותמונות. נשמר רק מונה יומי (כתובת מגובבת, נמחק אחרי יום).

import { runChecks } from './check.js';
import { DAF_RULES, DAF_SCHEMA, DAF_MAX_TEXT, dafPrompt, dafEditPrompt, tidyDaf } from './daf.js';

const ALLOWED = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const PER_IP = 12;   // פתרונות לכתובת ביום
const DAY_CAP = 80;  // לכל האתר ביום – המכסות החינמיות (Gemini + Workers AI) קטנות; כשנגמרות – "נסו מחר"
const MAX_TEXT = 6000;
const MAX_IMG = 3_500_000; // base64
const AI_MODEL = '@cf/openai/gpt-oss-120b';

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-kelim-partner', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...(h || {}) } });

const LEVELS = { 3: '3 יחידות לימוד (שאלונים 35182, 35381, 35382)', 4: '4 יחידות לימוד (שאלונים 35481, 35482)', 5: '5 יחידות לימוד (שאלונים 35581, 35582)' };

const SOLVE_RULES = `את/ה מורה מומחה/ית למתמטיקה בישראל, ופותר/ת שאלות בגרות במתמטיקה (3–5 יח"ל) בדיוק מלא.
פתור/פתרי את כל הסעיפים של השאלה, לפי הסדר, בדרך שמורה בבגרות היה נותן עליה ציון מלא.

כללי הפתרון:
1. קודם חשוב/חשבי בזהירות. בדוק/בדקי כל תוצאה (הצבה חזרה, תחום הגדרה, סימן, יחידות) לפני שכותבים.
2. כל סעיף: שלבים קצרים – נתון, נוסחה, הצבה, חישוב, מסקנה. כל שלב: משפט קצר בעברית (say) ואם יש – שורת מתמטיקה (math) ב-LaTeX.
3. answer של כל סעיף: התשובה הסופית בקצרה, בדיוק מה שנשאלו (כולל x ו-y של נקודה, סוג קיצון, תחומים). מספרים מדויקים (שבר, שורש, ln), ובסוגריים עיגול ל-2 ספרות כשזה עוזר.
4. סעיף שתלוי בסעיף קודם – להשתמש בתוצאה שלו. סעיף של "הראו ש..." – להראות, וה-answer הוא מה שהוכח.
5. אם יש סרטוט שחסר בשאלה – להניח את המקובל ולכתוב את ההנחה בשלב הראשון.
6. LaTeX: רק בשדה math, בלי סימני $. עברית לא בתוך math. בשדות given ו-answer – כתיב קריא לתלמיד (x², √, ·, π, e⁶), לא כוכביות ולא LaTeX.
7. אם זו לא שאלה במתמטיקה, או שהתמונה לא קריאה – readable=false ו-question_text מסביר מה חסר.

בדיקות (checks) – הכי חשוב. הקוד יחשב אותן בעצמו, לכן כתוב/כתבי אותן בכתיב מחשבון פשוט (ASCII), לא LaTeX:
- כפל תמיד עם *, חזקה ^, sqrt(), ln(), log() לבסיס 10, logb(b,x), exp(), sin() ברדיאנים (אם השאלה במעלות – deg=true), pi, e. משתנים באות אחת.
- kind="equal": expr ו-expr2 שווים אחרי הצבת vars (למשל הצבת פתרון במשוואה: expr="x^3-3*x+2", expr2="0", vars="x=1"). גם לחישוב סופי: expr="sqrt(3^2+4^2)", expr2="5".
- kind="derivative": expr2 היא הנגזרת של expr לפי var. a,b = תחום שבו הפונקציה מוגדרת (למשל a="0.1", b="5" עבור ln).
- kind="integral": האינטגרל של expr לפי var מ-a עד b שווה ל-expr2 (שטחים, נפחים).
- kind="identity": expr ו-expr2 שווים לכל var בתחום a..b (פישוט, פירוק, ביטוי לפרמטר).
- vars: "x=2; y=-1/3" (אפשר ביטויים). what: משפט קצר בעברית מה נבדק. part: האות של הסעיף.
כתוב/כתבי לפחות בדיקה אחת לכל סעיף שיש בו תוצאה מספרית או אלגברית – עדיף 2-3. בדיקה טובה בודקת את התשובה מכיוון אחר (הצבה חזרה, נגזרת שמתאפסת בנקודת הקיצון, שטח שמחושב גם באינטגרל).`;

const SOLVE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    readable: { type: 'BOOLEAN' },
    question_text: { type: 'STRING' },
    topic: { type: 'STRING' },
    given: { type: 'ARRAY', items: { type: 'STRING' } },
    parts: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      label: { type: 'STRING' }, ask: { type: 'STRING' },
      steps: { type: 'ARRAY', items: { type: 'OBJECT', properties: { say: { type: 'STRING' }, math: { type: 'STRING' } }, required: ['say'] } },
      answer: { type: 'STRING' }
    }, required: ['label', 'steps', 'answer'] } },
    checks: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      part: { type: 'STRING' }, what: { type: 'STRING' },
      kind: { type: 'STRING', enum: ['equal', 'derivative', 'integral', 'identity'] },
      expr: { type: 'STRING' }, expr2: { type: 'STRING' }, vars: { type: 'STRING' }, var: { type: 'STRING' },
      a: { type: 'STRING' }, b: { type: 'STRING' }, deg: { type: 'BOOLEAN' }
    }, required: ['part', 'kind', 'expr', 'expr2'] } },
    tip: { type: 'STRING' }
  },
  required: ['readable', 'question_text', 'parts', 'checks']
};

const VERIFY_RULES = `את/ה בודק/ת בגרות במתמטיקה, קפדני/ת מאוד. מקבלים שאלה ופתרון מוצע.
1. קודם פתור/פתרי כל סעיף בעצמך, בלי להסתמך על הפתרון המוצע.
2. אחר כך השווה/השווי לתשובה המוצעת לכל סעיף. agree=true רק אם התשובה הסופית נכונה ושלמה (כל הנקודות, הסוג, התחום). הבדל בצורת כתיבה בלבד (שבר מול עשרוני מעוגל, צורה שקולה) – זה agree=true.
3. אם לא מסכימים – my_answer: התשובה שלך, ו-why: משפט קצר בעברית איפה הטעות.
4. לא לחפש טעויות סגנון. רק נכונות.`;

const VERIFY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    parts: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      label: { type: 'STRING' }, agree: { type: 'BOOLEAN' }, my_answer: { type: 'STRING' }, why: { type: 'STRING' }
    }, required: ['label', 'agree'] } }
  },
  required: ['parts']
};

// דגמים (נבדק 10.11.2026 בשכבה החינמית):
// gemini-3.5-flash – הכי טוב בחינם, קורא תמונות. לפעמים 503 (עמוס) – מנסים שוב אחרי כמה שניות.
// gemini-3.8-flash / 3.7-flash / flash-latest – לא ענו בכלל (גם לא על "2+2") – לא ברשימה.
// gemini-*-pro – 429 (אין בחינם). gemini-2.5-flash – 404 למשתמשים חדשים.
// flash-lite – מהיר, חלש יותר במתמטיקה: רק להעתקת שאלה מתמונה כשהדגם הראשי עמוס.
// gpt-oss-120b ב-Workers AI – חזק בחשבון, טקסט בלבד. הבודק השני (משפחת דגמים אחרת = בדיקה עצמאית יותר), וגיבוי לפתרון.
const PRIMARY = 'gemini-3.5-flash';
const LITE = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// כמה מפתחות (כל אחד מפרויקט AI Studio נפרד = מכסה יומית נפרדת). הסוד GEMINI_KEYS: מפתחות מופרדים בפסיק.
export function geminiKeys(env) {
  return String(env.GEMINI_KEYS || env.GEMINI_KEY || '').split(/[,\s]+/).filter(Boolean);
}
// מפתח+דגם שהמכסה שלהם נגמרה היום – מדלגים עליהם (זיכרון של המופע, מתאפס לבד ביום הבא)
const spent = new Map();
const today = () => new Date(Date.now() - 8 * 3600e3).toISOString().slice(0, 10); // Gemini מתאפס בחצות של קליפורניה
const isQuota = e => e && e.status === 429 && /quota|exceed|limit/i.test(e.message);

async function geminiOnce(env, model, system, parts, schema, opts, key) {
  const fetcher = (opts && opts.fetch) || fetch;
  const gen = { temperature: 0.2, maxOutputTokens: 30000 };
  if (schema) { gen.responseMimeType = 'application/json'; gen.responseSchema = schema; }
  const r = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    signal: AbortSignal.timeout((opts && opts.timeout) || 150000),
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key || geminiKeys(env)[0] },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }], generationConfig: gen })
  });
  if (!r.ok) { const e = new Error(`${model} ${r.status} ${(await r.text()).slice(0, 160)}`); e.status = r.status; throw e; }
  const j = await r.json();
  const txt = j.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
  return schema ? JSON.parse(txt) : txt;
}

// דגם אחד על כל המפתחות: מתחילים ממפתח אקראי (לפזר עומס), עמוס (503) – מנסים שוב, מכסה (429) – למפתח הבא
export async function gemini(env, system, parts, schema, opts, model) {
  model = model || (env.GEMINI_MODEL || PRIMARY);
  const keys = geminiKeys(env);
  if (!keys.length) throw new Error('no key');
  const start = Math.floor(Math.random() * keys.length);
  let last;
  for (let k = 0; k < keys.length; k++) {
    const key = keys[(start + k) % keys.length], tag = key.slice(-6) + '|' + model;
    if (spent.get(tag) === today()) { last = last || Object.assign(new Error(model + ' 429 quota (cached)'), { status: 429 }); continue; }
    for (let i = 0; i < 3; i++) {
      try { return { data: await geminiOnce(env, model, system, parts, schema, opts, key), model }; }
      catch (e) {
        last = e;
        if (isQuota(e)) { spent.set(tag, today()); break; }
        if (e.status && ![429, 500, 502, 503, 504].includes(e.status)) break;
        if (e.name === 'TimeoutError' || e.name === 'AbortError') break;
        await sleep(i === 0 ? 2500 : 7000);
      }
    }
  }
  throw last;
}
async function geminiAnyKey(env, model, system, parts, schema, opts) { return (await gemini(env, system, parts, schema, opts, model)).data; }

// Workers AI – gpt-oss-120b (טקסט בלבד, בלי מפתח, בתוך המכסה החינמית של החשבון)
export function parseJsonText(raw) {
  let t = '';
  if (raw && Array.isArray(raw.output)) for (const o of raw.output) if (o.type !== 'reasoning') for (const c of (o.content || [])) if (c.type === 'output_text' || c.text) t += c.text || '';
  if (!t) t = (raw && (raw.response || raw.output_text)) || '';
  if (typeof t === 'object') return t;
  t = String(t).replace(/^```(?:json)?\s*|\s*```$/g, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  return JSON.parse(a >= 0 ? t.slice(a, b + 1) : t);
}
async function workersAI(env, system, text, schema) {
  if (!env.AI) throw new Error('no AI');
  const raw = await env.AI.run(AI_MODEL, {
    instructions: system + '\n\nהחזר JSON תקין בלבד, בלי שום טקסט לפניו או אחריו, לפי המבנה הזה (השדות והסוגים):\n' + JSON.stringify(schema),
    input: text, reasoning: { effort: 'high' }
  });
  return parseJsonText(raw);
}
const asText = parts => parts.map(p => p.text || '').join('\n');

// העתקת שאלה מתמונה לטקסט (כשהדגם הראשי עמוס)
async function transcribe(env, parts, opts) {
  const sys = 'העתק/העתיקי במדויק את שאלת המתמטיקה שבתמונה, כולל כל הסעיפים והנתונים. נוסחאות בכתיב פשוט (x^2, sqrt(), ln(), e^x, שברים עם / וסוגריים). אם יש סרטוט – תאר/י אותו בקצרה. החזר/י רק את השאלה.';
  for (const m of LITE) { try { return await geminiAnyKey(env, m, sys, parts, null, opts); } catch (_) {} }
  throw new Error('transcribe failed');
}

// פתרון: Gemini הראשי; אם עמוס – gpt-oss (ותמונה מועתקת קודם לטקסט); ואם גם הוא לא – flash-lite
async function solver(env, system, parts, schema, opts) {
  try { return await gemini(env, system, parts, schema, opts); }
  catch (e) {
    let tparts = parts;
    if (parts.some(p => p.inlineData)) tparts = parts.filter(p => !p.inlineData).concat([{ text: 'השאלה (הועתקה מתמונה):\n' + await transcribe(env, parts, opts) }]);
    try { return { data: await workersAI(env, system, asText(tparts), schema), model: AI_MODEL }; }
    catch (e2) {
      for (const m of LITE) {
        try {
          const d = await geminiAnyKey(env, m, system, tparts, schema, opts);
          if (schema !== SOLVE_SCHEMA || (d.readable && (d.parts || []).length)) return { data: d, model: m }; // דגם חלש ש"לא הבין" – לא סומכים עליו
        } catch (_) {}
      }
      throw e;
    }
  }
}
// בודק שני: עדיף משפחת דגמים אחרת (gpt-oss), ואם אין – Gemini
async function checker(env, system, parts, schema, opts) {
  try { return { data: await workersAI(env, system, asText(parts), schema), model: AI_MODEL }; }
  catch (e) { return await gemini(env, system, parts, schema, opts); }
}

function questionParts(body) {
  const parts = [];
  const lv = LEVELS[body.level] ? `רמה: ${LEVELS[body.level]}.\n` : '';
  const text = String(body.text || '').slice(0, MAX_TEXT).trim();
  parts.push({ text: lv + (text ? 'השאלה:\n' + text : 'השאלה בתמונה המצורפת. העתק/העתיקי אותה במדויק ל-question_text.') });
  if (body.image && body.image.data) parts.push({ inlineData: { mimeType: body.image.mime || 'image/jpeg', data: body.image.data } });
  return parts;
}

function solutionText(sol) {
  return (sol.parts || []).map(p => `סעיף ${p.label}: ${p.ask || ''}\n` +
    (p.steps || []).map(s => `- ${s.say}${s.math ? '  [' + s.math + ']' : ''}`).join('\n') + `\nתשובה: ${p.answer}`).join('\n\n');
}

// סעיף ✓ כשהבודק השני מסכים, ואין בדיקה שנכשלה (או רק אחת, כששתיים אחרות באותו סעיף יצאו נכונות –
// בדיקה שנכתבה לא טוב לא מפילה פתרון שגם בודק שני וגם המחשבון אישרו).
function verdict(sol, checks, ver) {
  const vparts = (ver && ver.parts) || [];
  const byLabel = {};
  for (const v of vparts) byLabel[normLabel(v.label)] = v;
  const failed = checks.filter(c => c.pass === false);
  const passed = checks.filter(c => c.pass === true);
  const parts = (sol.parts || []).map(p => {
    const v = byLabel[normLabel(p.label)];
    const mine = checks.filter(c => normLabel(c.part) === normLabel(p.label));
    const ok_c = mine.filter(c => c.pass === true).length, bad_c = mine.filter(c => c.pass === false).length;
    const agree = v ? !!v.agree : null;
    return { label: p.label, agree, ok: agree === true && (bad_c === 0 || (bad_c === 1 && ok_c >= 2)),
      why: v && !v.agree ? plainMath(v.why || '') : '', other: v && !v.agree ? plainMath(v.my_answer || '') : '',
      checks_ok: ok_c, checks_bad: bad_c };
  });
  const orphanBad = failed.filter(c => !parts.some(p => normLabel(p.label) === normLabel(c.part))).length;
  const ok = parts.length > 0 && parts.every(p => p.ok) && !orphanBad;
  return { ok, parts, passed: passed.length, failed: failed.length, disagree: parts.filter(p => p.agree === false).length };
}

// אותיות סעיפים אחידות: a/b/B1/"סעיף ב(1)" -> א / ב / ב(1)
const HE = { a: 'א', b: 'ב', c: 'ג', d: 'ד', e: 'ה', f: 'ו', g: 'ז', h: 'ח' };
export function normLabel(s) {
  let t = String(s == null ? '' : s).replace(/סעיף/g, '').replace(/[\s'"׳״.:\-–()\[\]]/g, '');
  t = t.replace(/^[a-hA-H]/, m => HE[m.toLowerCase()]);
  t = t.replace(/(i{1,3}|iv)$/i, m => ({ i: '1', ii: '2', iii: '3', iv: '4' }[m.toLowerCase()]));
  const m = t.match(/^([א-ת])(\d)?$/);
  return m ? m[1] + (m[2] ? `(${m[2]})` : '') : t;
}

// LaTeX -> כתיב קריא (לתשובות ולמשפטים; שורות math נשארות LaTeX ל-KaTeX)
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺', x: 'ˣ', n: 'ⁿ' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const SYM = { pi: 'π', theta: 'θ', alpha: 'α', beta: 'β', gamma: 'γ', infty: '∞', neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥', approx: '≈',
  cdot: '·', times: '×', cup: '∪', cap: '∩', to: '→', rightarrow: '→', Rightarrow: '⇒', implies: '⇒', pm: '±', circ: '°', int: '∫', in: '∈',
  mid: '|', quad: ' ', qquad: ' ', left: '', right: '', displaystyle: '', ln: 'ln', log: 'log', sin: 'sin', cos: 'cos', tan: 'tan', cis: 'cis', angle: '∠', perp: '⊥', parallel: '∥', overline: '', vec: '' };
const wrapFrac = a => (/^[\w.√π]+$/u.test(a) ? a : `(${a})`);
export function plainMath(s) {
  let t = String(s == null ? '' : s);
  if (!/[\\$^_{}]/.test(t)) return t;
  t = t.replace(/\$+/g, '');
  for (let i = 0; i < 4; i++) {
    t = t.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (m, a, b) => `${wrapFrac(a)}/${wrapFrac(b)}`);
    t = t.replace(/\\sqrt\{([^{}]*)\}/g, (m, a) => '√' + (a.length > 1 ? `(${a})` : a));
    t = t.replace(/\\(?:text|mathrm|operatorname|mathbf|textbf)\{([^{}]*)\}/g, '$1');
  }
  t = t.replace(/\^\\circ|\^\{\\circ\}/g, '°');
  t = t.replace(/\\([a-zA-Z]+)/g, (m, w) => (w in SYM ? SYM[w] : w)).replace(/\\[;,:! ]/g, ' ').replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  t = t.replace(/\^\{([^{}]*)\}|\^(-?\d+(?:\.\d+)?|-?\w)/g, (m, a, b) => { const x = a != null ? a : b; return (x.length === 1 || /^-?\d+$/.test(x)) && [...x].every(c => c in SUP) ? [...x].map(c => SUP[c]).join('') : `^(${x})`; });
  t = t.replace(/_\{([^{}]*)\}|_(\w)/g, (m, a, b) => { const x = a != null ? a : b; return [...x].every(c => c in SUB) ? [...x].map(c => SUB[c]).join('') : x; });
  return t.replace(/[{}]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
}

// ניקוי הפתרון לתצוגה ולהשוואה
function tidy(sol) {
  sol.question_text = plainMath(sol.question_text);
  sol.topic = plainMath(sol.topic);
  sol.given = (sol.given || []).map(plainMath);
  sol.tip = plainMath(sol.tip);
  for (const p of sol.parts || []) {
    p.label = normLabel(p.label); p.ask = plainMath(p.ask); p.answer = plainMath(p.answer);
    for (const st of p.steps || []) { st.say = plainMath(st.say); if (st.math) st.math = String(st.math).replace(/^\s*\$+|\$+\s*$/g, '').replace(/\\\[|\\\]/g, ''); }
  }
  for (const c of sol.checks || []) c.part = normLabel(c.part);
  return sol;
}

// כל התהליך (גם לבדיקות במחשב: node test.mjs)
export async function solve(env, body, opts) {
  const qp = questionParts(body);
  const s1 = await solver(env, SOLVE_RULES, qp, SOLVE_SCHEMA, opts);
  let sol = tidy(s1.data), models = [s1.model];
  if (!sol.readable) return { readable: false, question_text: sol.question_text || '', models };
  let checks = runChecks(sol.checks);
  const qText = sol.question_text || body.text || '';
  const verQ = () => [{ text: `השאלה:\n${qText}\n\nהפתרון המוצע:\n${solutionText(sol)}` }].concat(qp.filter(p => p.inlineData));
  let ver = (await checker(env, VERIFY_RULES, verQ(), VERIFY_SCHEMA, opts)); models.push(ver.model); ver = ver.data;
  let v = verdict(sol, checks, ver), round = 1;

  if (!v.ok && !(opts && opts.noFix)) {
    // סבב תיקון אחד: הפותר מקבל את ההערות ומחליט מה נכון
    const notes = [];
    for (const p of v.parts) if (p.agree === null) notes.push(`סעיף ${p.label}: חסר בפתרון או שהבודק לא מצא אותו.`);
    for (const p of v.parts) if (p.agree === false) notes.push(`סעיף ${p.label}: הבודק קיבל "${p.other}". ${p.why}`);
    for (const c of checks) if (c.pass === false) notes.push(`סעיף ${c.part}: בדיקה במחשבון נכשלה – ${c.what} (יצא ${fmt(c.got)}, ציפינו ${fmt(c.want)}).`);
    const fixParts = qp.concat([{ text: `\n\nפתרון קודם שלך:\n${solutionText(sol)}\n\nהערות של בודק ושל מחשבון:\n${notes.join('\n')}\n\nבדוק/בדקי שוב מההתחלה בזהירות. ההערות יכולות גם לטעות – תחליט/י לפי החשבון. החזר/י פתרון מלא ומתוקן, עם בדיקות חדשות.` }]);
    const s2 = await solver(env, SOLVE_RULES, fixParts, SOLVE_SCHEMA, opts);
    if (s2.data && s2.data.readable && (s2.data.parts || []).length) {
      sol = tidy(s2.data); models.push(s2.model);
      checks = runChecks(sol.checks);
      const ver2 = await checker(env, VERIFY_RULES, verQ(), VERIFY_SCHEMA, opts); models.push(ver2.model);
      ver = ver2.data; v = verdict(sol, checks, ver); round = 2;
    }
  }
  return {
    readable: true, question_text: qText, topic: sol.topic || '', given: sol.given || [], parts: sol.parts || [], tip: sol.tip || '',
    checks, verdict: v, rounds: round, models
  };
}
function fmt(n) { return typeof n === 'number' && isFinite(n) ? +n.toPrecision(8) : String(n); }

// ============ המחברת (/limudim/machberet/): רמז לצעד הבא ובדיקת הוכחה ============
// התלמיד פותר בעצמו. הבינה לא פותרת בשבילו: רמז אחד, או הערה לכל שורה בהוכחה.
const HINT_PER = 30, HINT_CAP = 400, PROOF_PER = 12, PROOF_CAP = 150;
const HINT_RULES = `את/ה מורה פרטי/ת סבלני/ת למתמטיקה בישראל (בגרות 3–5 יח"ל). תלמיד פותר בעצמו במחברת, שורה אחרי שורה, ונתקע.
תן/תני רמז אחד בלבד לצעד הבא:
- לא לגלות את התשובה הסופית ולא לכתוב את הפתרון המלא. רמז שמכוון, או שאלה מנחה.
- אם יש טעות באחת השורות – להצביע עליה בעדינות (באיזו שורה ומה לבדוק), בלי לתקן במקומו.
- שורה שסומנה "?" – המחשבון מצא שהיא לא שקולה לשורה שלפניה.
- עברית פשוטה ומעודדת, בלשון רבים (נסו, בדקו). עד שני משפטים קצרים.
- formula: נוסחה או משפט אחד שיעזור (LaTeX בלי $), או ריק. לא את התשובה.
- בהוכחה בגאומטריה: הצעה למשפט או לזוג משולשים לבדוק, בלי לכתוב את ההוכחה.
- רק כשכתוב "התלמיד ביקש לראות את הצעד הבא": step = השורה הבאה בלבד (צעד אחד קטן, לא הפתרון כולו), בכתיב מחשבון פשוט: x^2, sqrt(), ln(), sin(30°), שבר עם / וסוגריים, כמה פתרונות עם " או ". ו-hint = משפט קצר מה עושים בצעד הזה. בכל מקרה אחר step ריק.`;
const HINT_SCHEMA = { type: 'OBJECT', properties: { hint: { type: 'STRING' }, formula: { type: 'STRING' }, step: { type: 'STRING' } }, required: ['hint'] };
const PROOF_RULES = `את/ה בודק/ת בגרות במתמטיקה, קפדני/ת והוגן/ת. תלמיד כתב הוכחה בגאומטריה או בטריגונומטריה במבנה "טענה | נימוק".
לכל שורה (לפי הסדר, index כמו המספר של השורה, מ-1): ok=true אם הטענה נובעת נכון מהנתון ומהשורות שלפניה, והנימוק מתאים לה. ok=false אם הטענה לא נכונה, לא נובעת, או שהנימוק לא מתאים.
note: משפט קצר בעברית פשוטה רק כשיש מה לתקן (מה חסר או למה הנימוק לא מתאים), אחרת ריק. לא לכתוב את ההוכחה במקומו.
ok הכללי: true רק אם ההוכחה שלמה ומגיעה למה שצריך להוכיח.
summary: משפט מעודד אחד שמסכם. missing: אם חסר שלב – מה בערך חסר (בלי לכתוב אותו במלואו), אחרת ריק.
אין שרטוט – מניחים את המקובל לפי הנתון. בדיקה עניינית, לא סגנון.
חשוב: לבדוק שהנימוק הוא בדיוק המשפט שהטענה משתמשת בו. טענה נכונה עם נימוק של משפט אחר (למשל "משפט הסינוסים" לנוסחה של משפט הקוסינוסים, או צ.צ.צ כשהנתונים הם צ.ז.צ) – ok=false, וב-note מה הנימוק הנכון.`;
const PROOF_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ok: { type: 'BOOLEAN' }, summary: { type: 'STRING' }, missing: { type: 'STRING' },
    rows: { type: 'ARRAY', items: { type: 'OBJECT', properties: { index: { type: 'INTEGER' }, ok: { type: 'BOOLEAN' }, note: { type: 'STRING' } }, required: ['index', 'ok'] } }
  },
  required: ['ok', 'summary', 'rows']
};
const cut = (s, n) => String(s == null ? '' : s).slice(0, n);
export function hintPrompt(b) {
  if (b.mode === 'proof') {
    const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 40).map((r, i) => `${i + 1}. ${cut(r.claim, 200)} | ${cut(r.reason, 200)}`).join('\n');
    return `${cut(b.question, 1500)}\n\nההוכחה עד עכשיו (טענה | נימוק):\n${rows || '(עוד אין שורות)'}\n\nמה הרמז לשורה הבאה?`;
  }
  const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 40), marks = Array.isArray(b.marks) ? b.marks : [];
  return `התרגיל: ${cut(b.question, 1000)}\n\nהשורות של התלמיד:\n${lines.map((l, i) => `${i + 1}. ${cut(l, 300)}${marks[i] === 'warn' ? '  (?)' : marks[i] === 'ok' ? '  (✓)' : ''}`).join('\n') || '(עוד אין שורות)'}\n\n${b.level === 'next' ? 'התלמיד ביקש לראות את הצעד הבא: מה השורה הבאה?' : 'מה הרמז לצעד הבא?'}`;
}
export function proofPrompt(b) {
  const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 40).map((r, i) => `${i + 1}. ${cut(r.claim, 200)} | ${cut(r.reason, 200)}`).join('\n');
  return `נתון: ${cut(b.given, 1500)}\nצריך להוכיח: ${cut(b.prove, 300)}\n\nההוכחה (index. טענה | נימוק):\n${rows}`;
}
// רמז: דגם קל ומהיר קודם (מכסה נפרדת מהפותר), ואז gpt-oss, ואז הדגם הראשי
export async function aiHint(env, b, opts) {
  const parts = [{ text: hintPrompt(b) }], o = Object.assign({ timeout: 40000 }, opts || {});
  for (const m of LITE) { try { const d = await geminiAnyKey(env, m, HINT_RULES, parts, HINT_SCHEMA, o); if (d && d.hint) return clean2(d); } catch (_) {} }
  try { return clean2(await workersAI(env, HINT_RULES, parts[0].text, HINT_SCHEMA)); } catch (_) {}
  return clean2((await gemini(env, HINT_RULES, parts, HINT_SCHEMA, o)).data);
}
function clean2(d) {
  const o = { hint: plainMath(d.hint || ''), formula: String(d.formula || '').replace(/^\s*\$+|\$+\s*$/g, '').slice(0, 300) };
  if (d.step) o.step = cleanReadLine(d.step);
  return o;
}
// בדיקת הוכחה: צריך היגיון – הדגם הראשי, ואם עמוס gpt-oss
export async function aiProof(env, b, opts) {
  const parts = [{ text: proofPrompt(b) }], o = Object.assign({ timeout: 90000 }, opts || {});
  let d;
  try { d = (await gemini(env, PROOF_RULES, parts, PROOF_SCHEMA, o)).data; }
  catch (e) { d = await workersAI(env, PROOF_RULES, parts[0].text, PROOF_SCHEMA); }
  const rows = [];
  for (const r of d.rows || []) if (Number.isInteger(r.index) && r.index >= 1 && r.index <= 40) rows[r.index - 1] = { ok: r.ok !== false, note: plainMath(r.note || '') };
  return { ok: !!d.ok, summary: plainMath(d.summary || ''), missing: plainMath(d.missing || ''), rows: Array.from(rows, x => x || null) };
}
// ============ המחברת: להתחיל מצילום (/read) ============
// מעתיקים תרגיל מצילום של דף או ספר לשורה של המחברת, בכתיב מחשבון. רק העתקה, לא פתרון.
const READ_PER = 15, READ_CAP = 250;
const READ_RULES = `העתק/העתיקי במדויק את תרגילי המתמטיקה שבתמונה, כדי שתלמיד יפתור אותם בעצמו במחברת. לא לפתור ולא להוסיף כלום.
כל תרגיל: שורה אחת בכתיב מחשבון פשוט (ASCII), בלי LaTeX ובלי סימני $:
- חזקה ^ (x^2, e^(2x)), כפל * כשצריך, שבר עם / וסוגריים: (x+1)/(x-2). שורש: sqrt(...), שורש שלישי: cbrt(...).
- ln(...), log(...) לבסיס 10, log_2(8) לבסיס אחר, sin(x) cos(x) tan(x), מעלות עם ° (sin(30°)), pi, ערך מוחלט abs(...).
- פונקציה: f(x)=..., נגזרת: f'(x)=..., אינטגרל מסוים: int(f,a,b). אי-שוויון עם < > <= >=.
- מערכת של שתי משוואות: שתי המשוואות באותה שורה, מופרדות ב-" ; " (למשל: x+y=5 ; x-y=1).
- בלי מילים בתוך התרגיל. אם יש הוראה במילים (פתרו, פשטו, גזרו) – היא נכנסת ל-ask בעברית קצרה.
label: המספר או האות של התרגיל כמו בדף (למשל "3" או "ב"), או ריק.
אם אין בתמונה תרגיל מתמטיקה קריא – readable=false ו-why מסביר בעברית קצרה מה חסר.
עד 8 תרגילים, לפי הסדר בדף.`;
const READ_SCHEMA = {
  type: 'OBJECT',
  properties: {
    readable: { type: 'BOOLEAN' }, why: { type: 'STRING' },
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { line: { type: 'STRING' }, ask: { type: 'STRING' }, label: { type: 'STRING' } }, required: ['line'] } }
  },
  required: ['readable', 'items']
};
// ניקוי מה שהדגם החזיר: שורה בכתיב מחשבון, בלי LaTeX ובלי מילים מיותרות
export function cleanReadLine(s) {
  let t = String(s == null ? '' : s).replace(/^\s*\$+|\$+\s*$/g, '').replace(/\\\(|\\\)|\\\[|\\\]/g, '');
  for (let i = 0; i < 3; i++) {
    t = t.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)').replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)').replace(/\\sqrt\[3\]\{([^{}]*)\}/g, 'cbrt($1)');
  }
  t = t.replace(/\^\{([^{}]*)\}/g, (m, a) => (/^[\w.]+$/.test(a) && a.length === 1 ? '^' + a : '^(' + a + ')'))
    .replace(/\\cdot|\\times/g, '*').replace(/\\le(q)?\b/g, '<=').replace(/\\ge(q)?\b/g, '>=').replace(/\\circ|\^\\circ/g, '°')
    .replace(/\\(sin|cos|tan|ln|log|pi)\b/g, '$1').replace(/\\left|\\right/g, '').replace(/[{}]/g, '').replace(/\\[,;! ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return t.slice(0, 300);
}
export function tidyRead(d) {
  const items = (Array.isArray(d && d.items) ? d.items : []).slice(0, 8)
    .map(it => ({ line: cleanReadLine(it && it.line), ask: plainMath(String((it && it.ask) || '')).slice(0, 120), label: String((it && it.label) || '').slice(0, 8) }))
    .filter(it => it.line && /[0-9a-zA-Z]/.test(it.line));
  return { readable: !!(d && d.readable) && items.length > 0, why: plainMath(String((d && d.why) || '')).slice(0, 200), items };
}
// דגם קל ומהיר קודם (flash-lite), ואם עמוס – הדגם הראשי
export async function aiRead(env, image, opts) {
  const parts = [{ text: 'התמונה של התרגיל מצורפת. העתק/העתיקי את התרגילים לפי הכללים.' }, { inlineData: { mimeType: image.mime || 'image/jpeg', data: image.data } }];
  const o = Object.assign({ timeout: 45000 }, opts || {});
  for (const m of LITE) { try { const d = await geminiAnyKey(env, m, READ_RULES, parts, READ_SCHEMA, o); if (d) return tidyRead(d); } catch (_) {} }
  return tidyRead((await gemini(env, READ_RULES, parts, READ_SCHEMA, o)).data);
}
async function readRoute(request, env, ctx, h) {
  const raw = await request.text();
  if (raw.length > MAX_IMG + 2000) return json({ error: 'too_big' }, 413, h);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
  const img = b && b.image;
  if (!img || !img.data || !/^image\/(jpeg|png|webp)$/.test(img.mime || '') || String(img.data).length > MAX_IMG) return json({ error: 'image' }, 400, h);
  const q = await takeQuota(env, 'r', request, READ_PER, READ_CAP);
  if (!q.ok) return json({ error: 'quota' }, 200, h);
  return streamed(ctx, h, async () => Object.assign(await aiRead(env, img), { left: q.left }));
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
async function takeQuota(env, inst, request, per, cap) {
  per = await perFor(env, request, per);
  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  const stub = env.QUOTA.get(env.QUOTA.idFromName(inst));
  return (await stub.fetch('https://q/take', { method: 'POST', body: JSON.stringify({ day, who: await ipHash(ip, day), per, cap }) })).json();
}
// תשובה זורמת עם "סימן חיים" (כמו /solve), כדי שבדיקה של חצי דקה לא תתנתק
function streamed(ctx, h, job) {
  const { readable, writable } = new TransformStream();
  const w = writable.getWriter(), enc = new TextEncoder();
  const beat = setInterval(() => { w.write(enc.encode(' ')).catch(() => {}); }, 8000);
  const work = (async () => {
    let out;
    try { out = await job(); } catch (e) { out = { error: 'ai', busy: /429|503|timeout|limit|quota|neuron/i.test(String(e && e.message)) }; }
    clearInterval(beat);
    try { await w.write(enc.encode(JSON.stringify(out))); await w.close(); } catch (_) {}
  })();
  if (ctx && ctx.waitUntil) ctx.waitUntil(work);
  return new Response(readable, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h } });
}
async function machberet(request, env, ctx, h, path) {
  const raw = await request.text();
  if (raw.length > 30000) return json({ error: 'too_big' }, 413, h);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
  const proof = path === '/check-proof';
  if (proof ? !(Array.isArray(b.rows) && b.rows.length) : !String(b.question || '').trim()) return json({ error: 'empty' }, 400, h);
  const q = proof ? await takeQuota(env, 'pr', request, PROOF_PER, PROOF_CAP) : await takeQuota(env, 'h', request, HINT_PER, HINT_CAP);
  if (!q.ok) return json({ error: 'quota' }, 200, h);
  return streamed(ctx, h, async () => Object.assign(proof ? await aiProof(env, b) : await aiHint(env, b), { left: q.left }));
}

// ============ מחולל דפי העבודה: דף לפי תיאור חופשי של המורה (/daf) ============
// המורה כותבת או מקליטה מה היא צריכה -> מבנה של בלוקים. אותו תיאור = אותו דף מהזיכרון (90 יום), בלי לגעת במכסה.
const DAF_PER = 25, DAF_CAP = 400; // כולל תיקונים במילים של דף שכבר נבנה
async function dafRoute(request, env, ctx, h) {
  const raw = await request.text();
  if (raw.length > 90000) return json({ error: 'too_big' }, 413, h);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
  const text = String(b.text || '').replace(/\s+/g, ' ').trim();
  if (text.length < 10) return json({ error: 'empty' }, 400, h);
  // תיקון במילים: הדף הנוכחי + מה לשנות -> הדף המלא המעודכן
  const change = String(b.change || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
  const doc = change && b.doc && typeof b.doc === 'object' ? tidyDaf(b.doc) : null;
  if (change && !doc) return json({ error: 'empty' }, 400, h);
  const dg = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('daf1|' + (b.grade || '') + '|' + text.slice(0, DAF_MAX_TEXT) + (doc ? '|edit|' + change + '|' + JSON.stringify(doc) : '')));
  const k = [...new Uint8Array(dg)].map(x => x.toString(16).padStart(2, '0')).join('');
  const cache = env.QUOTA.get(env.QUOTA.idFromName('cache'));
  const call = async (path, o) => { try { return await (await cache.fetch('https://q/' + path, { method: 'POST', body: JSON.stringify(Object.assign({ k }, o || {})) })).json(); } catch (_) { return {}; } };
  if (!b.fresh) { const hit = await call('cget'); if (hit.v) { const out = JSON.parse(hit.v); out.cached = true; return json(out, 200, h); } }
  const q = await takeQuota(env, 'daf', request, DAF_PER, DAF_CAP);
  if (!q.ok) return json({ error: 'quota' }, 200, h);
  return streamed(ctx, h, async () => {
    const r = await solver(env, DAF_RULES, [{ text: doc ? dafEditPrompt({ text, doc, change }) : dafPrompt({ text, grade: b.grade }) }], DAF_SCHEMA, { timeout: 150000 });
    const out = tidyDaf(r.data);
    if (!out.blocks.length) return { error: 'ai' };
    out.model = r.model;
    const v = JSON.stringify(out);
    if (v.length < 120000) await call('cput', { v, ok: true });
    out.left = q.left;
    return out;
  });
}

async function ipHash(ip, day) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(day + '|' + ip + '|poter'));
  return [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const h = cors(origin);
    if (request.method === 'OPTIONS') return h ? new Response('', { headers: h }) : new Response('', { status: 403 });
    if (url.pathname === '/ping') return json({ ok: true, gemini: geminiKeys(env).length, per: PER_IP, machberet: true, read: true }, 200, h || {});
    if (url.pathname === '/read' && request.method === 'POST') {
      if (!h) return json({ error: 'origin' }, 403);
      return readRoute(request, env, ctx, h);
    }
    if ((url.pathname === '/hint' || url.pathname === '/check-proof') && request.method === 'POST') {
      if (!h) return json({ error: 'origin' }, 403);
      return machberet(request, env, ctx, h, url.pathname);
    }
    if (url.pathname === '/daf' && request.method === 'POST') {
      if (!h) return json({ error: 'origin' }, 403);
      return dafRoute(request, env, ctx, h);
    }
    if (url.pathname !== '/solve' || request.method !== 'POST') return json({ name: 'הפותר – שאלות בגרות במתמטיקה', page: 'https://hakelim.com/limudim/poter/' }, 200);
    if (!h) return json({ error: 'origin' }, 403);
    const raw = await request.text();
    if (raw.length > MAX_IMG + MAX_TEXT + 2000) return json({ error: 'too_big' }, 413, h);
    let body; try { body = JSON.parse(raw); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
    if (!String(body.text || '').trim() && !(body.image && body.image.data)) return json({ error: 'empty' }, 400, h);
    if (body.image && (!/^image\/(jpeg|png|webp)$/.test(body.image.mime || '') || String(body.image.data).length > MAX_IMG)) return json({ error: 'image' }, 400, h);

    // זיכרון: שאלה שכבר נפתרה חוזרת מיד, בלי לגעת במכסה (✓ – 90 יום; ⚠️ – שעתיים, למי שהחיבור שלו נקטע ומנסה שוב)
    const ck = await cacheKey(body);
    const cache = env.QUOTA.get(env.QUOTA.idFromName('cache'));
    const call = async (path, o) => { try { return await (await cache.fetch('https://q/' + path, { method: 'POST', body: JSON.stringify(Object.assign({ k: ck }, o || {})) })).json(); } catch (_) { return {}; } };
    const hit = await call('cget');
    if (hit.v) { const out = JSON.parse(hit.v); out.cached = true; return json(out, 200, h); }

    // תשובה זורמת: רווח כל 8 שניות ("סימן חיים") כדי שרשתות וסינונים לא ינתקו חיבור שקט של דקה-שתיים.
    // הפתרון ממשיך גם אם הדפדפן התנתק (waitUntil), ונשמר – הניסיון הבא מקבל אותו מהזיכרון.
    const { readable, writable } = new TransformStream();
    const w = writable.getWriter(), enc = new TextEncoder();
    const beat = setInterval(() => { w.write(enc.encode(' ')).catch(() => {}); }, 8000);
    const work = (async () => {
      let out = null;
      try {
        if (hit.pending) { // אותה שאלה כבר נפתרת עכשיו (למשל ניסיון חוזר אחרי ניתוק) – מחכים לה
          for (let i = 0; i < 60 && !out; i++) { await sleep(5000); const r = await call('cget'); if (r.v) { out = JSON.parse(r.v); out.cached = true; } else if (!r.pending) break; }
        }
        if (!out) {
          const day = new Date().toISOString().slice(0, 10);
          const ip = request.headers.get('cf-connecting-ip') || 'x';
          const stub = env.QUOTA.get(env.QUOTA.idFromName('q'));
          const q = await (await stub.fetch('https://q/take', { method: 'POST', body: JSON.stringify({ day, who: await ipHash(ip, day), per: await perFor(env, request, PER_IP), cap: DAY_CAP }) })).json();
          if (!q.ok) out = { error: 'quota' };
          else {
            await call('cpending');
            try {
              out = await solve(env, body);
              const v = JSON.stringify(out);
              if (out.readable && v.length < 120000) await call('cput', { v, ok: !!(out.verdict && out.verdict.ok) });
              else await call('cdrop');
              out.left = q.left;
            } catch (e) {
              await call('cdrop');
              out = { error: 'ai', busy: /429|503|timeout|limit|quota|neuron/i.test(String(e && e.message)) };
            }
          }
        }
      } catch (e) { out = { error: 'ai' }; }
      clearInterval(beat);
      try { await w.write(enc.encode(JSON.stringify(out))); await w.close(); } catch (_) {}
    })();
    if (ctx && ctx.waitUntil) ctx.waitUntil(work);
    return new Response(readable, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h } });
  }
};

// מפתח הזיכרון: טביעת אצבע של השאלה (רמה + טקסט מנורמל, או הצילום עצמו). בלי שום פרט על מי ששאל.
export async function cacheKey(body) {
  const text = String(body.text || '').replace(/\s+/g, ' ').replace(/[−–—]/g, '-').trim().toLowerCase();
  const src = 'v1|' + (body.level || '') + '|' + text + '|' + (body.image && body.image.data ? body.image.data : '');
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(src));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// מונה יומי בלבד: {day, all, who:{hash:count}}
// מופע 'q': מונה יומי בלבד {day, all, who:{hash:count}}.
// מופע 'cache': פתרונות שנבדקו (✓), לפי טביעת אצבע של השאלה, נשמרים 90 יום.
const CACHE_DAYS = 90;
export class Quota {
  constructor(state) { this.s = state.storage; }
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const b = await request.json();
    if (path === '/cget') {
      const e = await this.s.get('c:' + b.k);
      if (e && e.t > Date.now() - (e.ok === false ? 2 * 3600e3 : CACHE_DAYS * 864e5)) return Response.json({ v: e.v });
      const p = await this.s.get('p:' + b.k);
      return Response.json(p && p > Date.now() - 5 * 60e3 ? { pending: true } : {});
    }
    if (path === '/cpending') { await this.s.put('p:' + b.k, Date.now()); return Response.json({ ok: true }); }
    if (path === '/cdrop') { await this.s.delete('p:' + b.k); return Response.json({ ok: true }); }
    if (path === '/cput') {
      await this.s.put('c:' + b.k, { t: Date.now(), v: b.v, ok: b.ok !== false });
      await this.s.delete('p:' + b.k);
      if (!(await this.s.getAlarm())) await this.s.setAlarm(Date.now() + 864e5);
      return Response.json({ ok: true });
    }
    let d = (await this.s.get('d')) || {};
    if (d.day !== b.day) d = { day: b.day, all: 0, who: {} };
    const n = d.who[b.who] || 0;
    if (n >= b.per || d.all >= b.cap) return Response.json({ ok: false });
    d.who[b.who] = n + 1; d.all++;
    await this.s.put('d', d);
    return Response.json({ ok: true, left: b.per - n - 1 });
  }
  // ניקוי פעם ביום: מוחקים פתרונות ישנים
  async alarm() {
    const old = Date.now() - CACHE_DAYS * 864e5, del = [];
    for (const [k, e] of await this.s.list({ prefix: 'c:' })) if (!e || e.t < (e.ok === false ? Date.now() - 2 * 3600e3 : old)) del.push(k);
    for (const [k, t] of await this.s.list({ prefix: 'p:' })) if (t < Date.now() - 3600e3) del.push(k);
    for (let i = 0; i < del.length; i += 128) await this.s.delete(del.slice(i, i + 128));
    if ((await this.s.list({ prefix: 'c:', limit: 1 })).size) await this.s.setAlarm(Date.now() + 864e5);
  }
}
