// החדשות ב-3 דקות – Cloudflare Worker שמסכם חדשות 3 פעמים ביום (07:00, 13:00, 20:00 שעון ישראל).
// קורא כותרות ותקצירים מ-RSS ← מסנן לקו כשר ← Gemini כותב נקודות קצרות במילים שלו ← בדיקה שנייה מול המקור.
// אין מפתח Gemini? יוצא "מצב כותרות": הכותרות הנבחרות עם קישור, בלי סיכום.
// בשבת ובחג לא רץ (מהדלקת נרות בירושלים עד צאת הכוכבים). מוצ"ש בערב: סיכום "מה היה בשבת".
// התראות: Web Push בלי תוכן (לא צריך הצפנה) – ה-sw.js של הכלים מקבל את הדחיפה ומביא בעצמו את /latest.
// חינם לכולם. נקודות הקצה: /latest  /history  /report (POST)  /reports?key=  /run?key=  /stats  /subscribe  /unsubscribe
import { HDate, HebrewCalendar, Zmanim, GeoLocation, flags } from '@hebcal/core';

const TZ = 'Asia/Jerusalem';
const VERSION = 3;
const RUN_HOURS = [7, 13, 20];
const LATE_HOURS = [21, 22]; // ריצה מאוחרת רק אם הריצה של 20:00 נפלה על שבת/חג
const JLM = new GeoLocation('ירושלים', 31.778, 35.235, 754, TZ);

// [מזהה, שם, נושא, כתובת]
export const SOURCES = [
  ['ynet', 'ynet', 'כללי', 'https://www.ynet.co.il/Integration/StoryRss1854.xml'],
  ['walla', 'וואלה', 'כללי', 'https://www.walla.co.il/rss/feed/news/israel'],
  ['maariv', 'מעריב', 'כללי', 'https://www.maariv.co.il/rss/rsschadashot'],
  ['inn', 'ערוץ 7', 'כללי', 'https://www.inn.co.il/Rss.aspx'],
  ['c14', 'ערוץ 14', 'כללי', 'https://www.c14.co.il/feed/'],
  ['srugim', 'סרוגים', 'כללי', 'https://www.srugim.co.il/feed'],
  ['kipa', 'כיפה', 'כללי', 'https://www.kipa.co.il/feed/'],
  ['kikar', 'כיכר השבת', 'חרדי', 'https://www.kikar.co.il/feed'],
  ['bhol', 'בחדרי חרדים', 'חרדי', 'https://www.bhol.co.il/rss'],
  ['jdn', 'JDN', 'חרדי', 'https://www.jdn.co.il/feed/'],
  ['globes', 'גלובס', 'כלכלה', 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2']
];

// ---------- סינון לקו כשר ----------
// ידיעה עם אחת המילים האלה לא נכנסת בכלל (גם לא לבינה)
const BLOCK_WORDS = ['מינית', 'מיני ', 'אונס', 'נאנס', 'זנות', 'פורנו', 'עירום', 'חשפנ', 'פדופיל', 'מעשה מגונה', 'מעשים מגונים',
  'בגידה', 'רומן', 'דוגמנ', 'סלב', 'ריאליטי', 'האח הגדול', 'אירוויזיון', 'זמרת', 'שחקנית', 'הומו', 'להט"ב', 'גאווה',
  'הימורים', 'קזינו', 'כדורגל', 'כדורסל', 'ליגת העל', 'הפועל ', 'מכבי תל אביב', 'בית"ר ירושלים', 'מונדיאל', 'אולימפי', 'סמים', 'קנאביס', 'אלכוהול', 'שיכור', 'התאבד', 'התאבדות'];
// פשע: רק אם זה לא פיגוע/ביטחון (פיגוע נכנס כמשפט עובדתי אחד)
const CRIME_WORDS = ['נרצח', 'רצח', 'נדקר', 'דקירה', 'שוד', 'אלימות במשפחה', 'התעללות', 'גופה'];
const SECURITY_WORDS = ['פיגוע', 'מחבל', 'טרור', 'צה"ל', 'חמאס', 'חיזבאללה'];
const BLOCK_LINKS = /\/(sport|sports|spo|entertainment|celebs|culture|tarbut|food|fashion|travel|tvreviews|xnet|pnai|leisure|digital\/games)\b/i;

export function kosher(text, link = '') {
  if (BLOCK_LINKS.test(link)) return false;
  if (BLOCK_WORDS.some(w => text.includes(w))) return false;
  if (CRIME_WORDS.some(w => text.includes(w)) && !SECURITY_WORDS.some(w => text.includes(w))) return false;
  return true;
}

// ---------- RSS ----------
function decode(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}
// גרשיים בתוך מילה (זצ"ל, חב"ד) הופכים ל-״, אחרת הבינה סוגרת את המחרוזת באמצע המילה והנקודה נקטעת
export const gershayim = s => s.replace(/([א-ת])["“”]([א-ת])/g, '$1״$2');
function strip(s) { return gershayim(decode(decode(s || '')).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()); }
function tag(item, name) { const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? m[1] : ''; }

export function parseRss(xml, src) {
  const items = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const it = m[0];
    const title = strip(tag(it, 'title'));
    const link = strip(tag(it, 'link')).replace(/[?#]utm_[^ ]*$/, '').split('?utm_')[0];
    const desc = strip(tag(it, 'description')).slice(0, 400);
    const t = Date.parse(strip(tag(it, 'pubDate'))) || 0;
    if (title && link.startsWith('http')) items.push({ src: src[0], name: src[1], topic: src[2], title, desc, link, t });
  }
  return items;
}

async function fetchAll(sinceMs, cap = 14) {
  const res = await Promise.allSettled(SOURCES.map(async s => {
    const r = await fetch(s[3], { headers: { 'user-agent': 'Mozilla/5.0 (kelim-news; hakelim.com)' }, redirect: 'follow', cf: { cacheTtl: 300 } });
    if (!r.ok) throw new Error(s[0] + ' ' + r.status);
    return parseRss(await r.text(), s);
  }));
  const ok = [], failed = [];
  res.forEach((r, i) => r.status === 'fulfilled' ? ok.push(...r.value) : failed.push(SOURCES[i][0]));
  const seen = new Set();
  const items = ok
    .filter(x => !x.t || x.t >= sinceMs)
    .filter(x => kosher(x.title + ' ' + x.desc, x.link))
    .filter(x => { const k = x.title.slice(0, 40); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.t - a.t);
  // עד 14 ידיעות מכל מקור, כדי שמקור אחד לא ישתלט
  const per = {}, out = [];
  for (const x of items) { per[x.src] = (per[x.src] || 0) + 1; if (per[x.src] <= cap) out.push(x); }
  out.forEach((x, i) => { x.id = i + 1; });
  return { items: out, failed };
}

// ---------- Gemini ----------
const WRITE_TPL = `אתה עורך של "החדשות ב-3 דקות": סיכום חדשות רגוע לציבור החרדי, למי שרוצה להפסיק לרפרש אתרי חדשות.
קיבלת רשימת ידיעות ממוספרות (כותרת, תקציר, מקור). כתוב:
- main: __MAIN__ הנקודות הכי חשובות לכלל הציבור. כל נקודה משפט אחד או שניים, עד 30 מילים, במילים שלך.
- haredi: עד __HAREDI__ נקודות מהציבור החרדי (רק מידיעות שמקורן כיכר השבת, בחדרי חרדים או JDN, ושלא נכנסו ל-main).
- economy: עד __ECON__ נקודות כלכלה שנוגעות לכיס של משפחה (מחירים, משכנתא, קצבאות, מיסים). אם אין – ריק.
חוקים:
1. רק עובדות שכתובות בידיעות. לא להוסיף שום פרט, מספר, שם או הערכה שלא מופיעים שם.
2. לא להעתיק משפטים מהמקור. לנסח מחדש, פשוט ורגוע. בלי סימני קריאה, בלי "דרמטי", "סערה", "הלם".
3. כל נקודה עם ids – מספרי הידיעות שעליהן היא מבוססת (לפחות אחת).
4. אם רק מקור אחד מדווח על משהו שנוי במחלוקת – לפתוח ב"לפי דיווח ב<שם המקור>".
5. קו כשר: בלי פשע ופריצות, בלי רכילות, בלי ספורט ובידור, בלי פרטים קשים. פיגוע או אסון – משפט עובדתי אחד, בלי תיאורים.
6. בלי פוליטיקה צועקת ובלי דעות. מה קרה, ומה זה אומר לאנשים.
7. אם יש כמה ידיעות על אותו נושא – נקודה אחת עם כל ה-ids.
8. ביטחון, פשע ואסונות: ניסוח שקט ועניני. מה קרה, איפה, ומה המצב עכשיו. בלי פעלים קשים ("נטבח", "נשחט", "מרחץ דמים"), בלי פרטי פציעות, בלי ציטוטים מפחידים. אם יש הנחיה לציבור (פיקוד העורף, משטרה) – לכתוב אותה.
9. ראשי תיבות כותבים עם ״ (גרשיים עבריים), לא עם מירכאות: זצ״ל, חב״ד, צה״ל.`;

const rules = (main, haredi, econ) => WRITE_TPL.replace('__MAIN__', main).replace('__HAREDI__', haredi).replace('__ECON__', econ);
const WRITE_RULES = rules('5', '3', '2');
// מוצאי שבת/חג: כל מה שהיה, עד 12 נקודות
const SHABBAT_RULES = rules('8', '3', '1') + `
10. זו מהדורה שמסכמת את כל השבת (או החג) ביחד: העדיפו את מה שקרה ומה שעוד חשוב עכשיו, בלי כפילויות, ובלי לפתוח ב"בשבת" בכל נקודה.`;
// שישי בבוקר: מהנקודות שכבר נבדקו במהלך השבוע (הקלט הוא נקודות קיימות, לא כתבות)
const WEEKLY_RULES = `אתה עורך של "השבוע ב-3 דקות": סיכום שבועי רגוע לציבור החרדי. קיבלת רשימת נקודות ממוספרות שכבר פורסמו השבוע (כל אחת עם שם המקור שלה).
כתוב:
- main: 7 הנקודות הכי חשובות של השבוע, מהחשובה לפחות חשובה. כל נקודה משפט אחד או שניים, עד 30 מילים, במילים שלך. נושא שחזר כמה פעמים – נקודה אחת שמסכמת את מה שהיה בסוף.
- good: בדיוק 3 נקודות "חדשות טובות מהשבוע": רק דברים שבאמת טובים (הצלה, החלמה, הישג, חסד, התקדמות, הקלה). בלי אסון, בלי פיגוע, בלי מחלה, בלי "למרות ש". אם אין 3 – כתוב פחות, אל תמציא.
חוקים:
1. רק עובדות שכתובות בנקודות. לא להוסיף שום פרט, מספר, שם או הערכה.
2. ניסוח פשוט ורגוע. בלי סימני קריאה, בלי "דרמטי", "סערה", "הלם".
3. כל נקודה עם ids – מספרי הנקודות שעליהן היא מבוססת (לפחות אחת).
4. ביטחון ואסונות: משפט עובדתי אחד, בלי תיאורים.
5. ראשי תיבות כותבים עם ״ (גרשיים עבריים), לא עם מירכאות: זצ״ל, חב״ד, צה״ל.`;
const WEEKLY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    main: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text', 'ids'] } },
    good: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text', 'ids'] } }
  },
  required: ['main', 'good']
};

const WRITE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    main: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text', 'ids'] } },
    haredi: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text', 'ids'] } },
    economy: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, ids: { type: 'ARRAY', items: { type: 'INTEGER' } } }, required: ['text', 'ids'] } }
  },
  required: ['main', 'haredi', 'economy']
};

const CHECK_RULES = `אתה בודק עובדות. לכל נקודה מצורפים המקורות שלה (שם האתר, כותרת ותקציר).
ok=false רק אם יש בנקודה עובדה ממשית שלא כתובה במקורות או סותרת אותם: שם, מספר, תאריך, מקום, תפקיד, ציטוט, או טענה מה קרה.
מותר, ולא סיבה לפסול: ניסוח אחר במילים פשוטות; סיכום של כמה מקורות יחד; "לפי דיווח ב<שם האתר>" כששם האתר מופיע במקורות; "היום", "אתמול", "הלילה" כשהמקורות מדברים על אירוע עכשווי; תואר מוכר (נשיא, ראש הממשלה, ח״כ) של אדם ששמו במקור.
ok=false גם אם הנקודה קטועה או לא מובנת.
נקודה שמסומנת [חדשות טובות] חייבת להיות טובה באמת – הצלה, החלמה, הישג, חסד או הקלה. אם יש בה אסון, פיגוע, פגיעה, מחלה או עצב, או שהיא טובה רק בעיני צד אחד – ok=false.
כש-ok=false: why קצר בעברית, ו-fix – הנקודה מתוקנת במשפט אחד או שניים שכל פרט בהם כתוב במקורות (בלי הפרט הבעייתי), או ריק אם אי אפשר.`;
const CHECK_SCHEMA = {
  type: 'OBJECT',
  properties: { results: { type: 'ARRAY', items: { type: 'OBJECT', properties: { n: { type: 'INTEGER' }, ok: { type: 'BOOLEAN' }, why: { type: 'STRING' }, fix: { type: 'STRING' } }, required: ['n', 'ok'] } } },
  required: ['results']
};

async function gemini(env, system, user, schema) {
  const models = (env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash,gemini-flash-lite-latest,gemini-3.5-flash-lite').split(',').map(s => s.trim());
  let last;
  for (let round = 0; round < 2; round++) {
  if (round) await new Promise(r => setTimeout(r, 20000)); // כולם עמוסים (503) – מחכים רגע ומנסים סבב אחד נוסף
  for (const model of models) {
    let r;
    try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema }
      })
    });
    } catch (e) { last = `${model} timeout`; continue; } // דגם עמוס – עוברים לבא
    if (r.ok) {
      const j = await r.json();
      const txt = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      return { data: JSON.parse(txt), model };
    }
    last = `${model} ${r.status} ${(await r.text()).slice(0, 200)}`;
    if (![404, 429, 500, 503].includes(r.status)) throw new Error(last); // שגיאה אמיתית – לא מנסים שוב
  }
  }
  throw new Error(last);
}

// מספרים בנקודה חייבים להופיע במקור (בדיקה בקוד, בלי בינה)
export function numbersOk(text, srcText) {
  const nums = (text.match(/\d[\d,.]*/g) || []).map(n => n.replace(/[,.]$/, ''));
  const plain = srcText.replace(/,/g, '');
  return nums.every(n => srcText.includes(n) || plain.includes(n.replace(/,/g, '')));
}

// הדגמים הקלים מכניסים לפעמים מילה ברוסית/ערבית/סינית באמצע משפט – נקודה כזו לא יוצאת
export const FOREIGN = /[Ѐ-ӿ؀-ۿ぀-鿿가-힯]/;
// ניקוי אחרון: גרשיים, ו"דיווח בבחדרי חרדים" (ב' כפולה) ← "דיווח באתר בחדרי חרדים"
export const tidy = s => gershayim(String(s).trim()).replace(/(דיווח|פורסם|נמסר)\s+בבחדרי/g, '$1 באתר בחדרי');

// תיקון של הבודק מתקבל רק אם הוא משפט שלם וקצר, המספרים בו מהמקור, והוא עובר סינון כשר
export function fixOk(fix, srcText) {
  const t = (fix || '').trim();
  return t.length >= 25 && t.length <= 260 && /[.)א-ת\d]$/.test(t) && !FOREIGN.test(t) && numbersOk(t, srcText) && kosher(t);
}

async function summarize(env, items, opts = {}) {
  const secs = opts.secs || ['main', 'haredi', 'economy'];
  const list = items.map(x => `#${x.id} [${x.name}] ${x.title}${x.desc ? ' – ' + x.desc : ''}`).join('\n');
  const w = await gemini(env, opts.rules || WRITE_RULES, list, opts.schema || WRITE_SCHEMA);
  const byId = Object.fromEntries(items.map(x => [x.id, x]));
  const all = [];
  for (const sec of secs) {
    for (const p of (w.data[sec] || [])) {
      const ids = (p.ids || []).filter(id => byId[id]);
      if (!ids.length || !p.text) continue;
      all.push({ sec, text: tidy(p.text), ids });
    }
  }
  // בדיקה שנייה מול המקור
  const checkText = all.map((p, i) => `נקודה ${i + 1}${p.sec === 'good' ? ' [חדשות טובות]' : ''}: ${p.text}\nמקורות:\n` +
    p.ids.map(id => `- [${byId[id].name}] ${byId[id].title}. ${byId[id].desc}`).join('\n')).join('\n\n');
  let verdict = null, checkError = '';
  for (let tryN = 0; tryN < 2 && !verdict; tryN++) { // דגמים עמוסים בבוקר – ניסיון שני אחרי הפסקה קצרה
    try {
      const c = await gemini(env, CHECK_RULES, checkText, CHECK_SCHEMA);
      verdict = {};
      for (const r of c.data.results || []) verdict[r.n] = r;
    } catch (e) { checkError = String(e.message || e).slice(0, 300); if (!tryN) await new Promise(r => setTimeout(r, 8000)); }
  }
  const dropped = [], fixed = [];
  const sections = Object.fromEntries(secs.map(k => [k, []]));
  all.forEach((p, i) => {
    const srcText = p.ids.map(id => byId[id].name + ' ' + byId[id].title + ' ' + byId[id].desc).join(' ');
    const v = verdict ? verdict[i + 1] : null;
    let why = '', fixedFrom = '';
    // הבודק פסל ונתן תיקון שנשען רק על המקור – לוקחים את התיקון
    if (v && !v.ok && fixOk(v.fix, srcText)) { fixedFrom = p.text; p.text = tidy(v.fix); v.ok = true; }
    if (FOREIGN.test(p.text)) why = 'אותיות בשפה זרה באמצע הנקודה';
    else if (!numbersOk(p.text, srcText)) why = 'מספר שלא מופיע במקור';
    else if (verdict === null) why = 'הבדיקה השנייה לא רצה';
    else if (!v || !v.ok) why = (v && v.why) || 'לא אומת';
    else if (!kosher(p.text)) why = 'סינון כשר';
    if (why) { dropped.push({ text: p.text, why }); return; }
    if (fixedFrom) fixed.push({ from: fixedFrom, to: p.text, why: v.why || '' });
    const seen = new Set(); // מקור אחד פעם אחת, גם אם כמה ידיעות שלו
    sections[p.sec].push({ text: p.text, sources: p.ids.flatMap(id => byId[id].srcs || [{ name: byId[id].name, link: byId[id].link }]).filter(x => x.link && !seen.has(x.name) && seen.add(x.name)).slice(0, 3) });
  });
  return { mode: 'summary', model: w.model, sections, dropped, fixed, checkError };
}

function titlesOnly(items) {
  const pick = (topic, n) => {
    const out = [], used = new Set();
    for (const x of items) {
      if (x.topic !== topic || used.has(x.src)) continue;
      const text = x.title.replace(/^(צפו|צפו בתיעוד|תיעוד|וידאו|בלעדי|דרמה|מבזק)\s*[:|]\s*/, '').replace(/\s*\|\s*(צפו|תיעוד|וידאו|גלריה)[^|]*$/, '').replace(/!+/g, '');
      used.add(x.src); out.push({ text, sources: [{ name: x.name, link: x.link }] });
      if (out.length >= n) break;
    }
    return out;
  };
  return { mode: 'titles', sections: { main: pick('כללי', 5), haredi: pick('חרדי', 3), economy: pick('כלכלה', 1) }, dropped: [] };
}

// ---------- זמן, שבת וחג ----------
export function israelParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' })
    .formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hour: +p.hour % 24, min: +p.minute, wd: p.weekday };
}
function isHoly(civil) { // civil = Date בצהרי היום בישראל
  if (civil.getDay() === 6) return true;
  return HebrewCalendar.getHolidaysOnDate(new HDate(civil), true)?.some(e => e.getFlags() & flags.CHAG) || false;
}
// האם עכשיו שבת או חג (מהדלקת נרות – 40 דק' לפני השקיעה בירושלים – עד צאת הכוכבים + מרווח)
export function holyNow(now = new Date()) {
  const p = israelParts(now);
  const today = new Date(p.y, p.m - 1, p.d, 12);
  const tomorrow = new Date(p.y, p.m - 1, p.d + 1, 12);
  const z = new Zmanim(JLM, today, false);
  const candle = new Date(z.sunset().getTime() - 40 * 60000);
  const havdala = new Date(z.tzeit(8.5).getTime() + 10 * 60000);
  if (isHoly(today) && now < havdala) return true;
  if (isHoly(tomorrow) && now >= candle) return true;
  return false;
}
// מתי נגמרה השבת/החג של היום (הבדלה + 10 דק'); null אם היום לא היום האחרון של שבת/חג
export function holyEndedAt(now = new Date()) {
  const p = israelParts(now);
  const today = new Date(p.y, p.m - 1, p.d, 12), tomorrow = new Date(p.y, p.m - 1, p.d + 1, 12);
  if (!isHoly(today) || isHoly(tomorrow)) return null;
  return new Date(new Zmanim(JLM, today, false).tzeit(8.5).getTime() + 10 * 60000);
}
// חלון מהדורת מוצאי שבת: 35 עד 100 דקות אחרי ההבדלה (ה-cron רץ בדקה 45 בכל שעה, אז תמיד יש פגיעה אחת)
export function shabbatDue(now = new Date()) {
  const h = holyEndedAt(now); if (!h) return false;
  const m = (now - h) / 60000; return m >= 35 && m <= 100;
}
// כמה ימי שבת/חג רצופים היו ממש לפני היום (חג ושבת צמודים: מסתכלים עוד אחורה)
function holyDaysBefore(now) {
  const p = israelParts(now); let n = 0;
  for (let k = 1; k <= 3; k++) { if (isHoly(new Date(p.y, p.m - 1, p.d - k, 12))) n++; else break; }
  return n;
}
function editionName(hour, afterHoly) {
  if (afterHoly) return 'מה היה בשבת ובחג';
  return hour < 11 ? 'בוקר' : hour < 17 ? 'צהריים' : 'ערב';
}

// ---------- ריצה ----------
async function store(env) { return env.STORE.get(env.STORE.idFromName('news')); }
async function call(env, path, body) {
  const s = await store(env);
  const r = await s.fetch('https://store' + path, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
  return r.json();
}

export async function runEdition(env, { force = false, now = new Date(), push = !force, kind = '' } = {}) {
  const p = israelParts(now);
  if (!force) {
    if (holyNow(now)) return { skipped: 'שבת או חג' };
    if (!kind) {
      const isRun = RUN_HOURS.includes(p.hour);
      const isLate = LATE_HOURS.includes(p.hour);
      if (!isRun && !isLate) return { skipped: 'לא שעת ריצה' };
      const last = await call(env, '/latest');
      const lastAge = last?.at ? now - Date.parse(last.at) : Infinity;
      if (lastAge < 90 * 60000) return { skipped: 'כבר יצא סיכום בשעה האחרונה' };
      if (isLate && lastAge < 10 * 3600000) return { skipped: 'אין צורך בריצה מאוחרת' };
      if (last?.kind === 'shabbat' && lastAge < 5 * 3600000) return { skipped: 'יצאה מהדורת מוצאי שבת' };
    } else if (kind === 'shabbat') {
      if (!shabbatDue(now)) return { skipped: 'לא חלון מוצאי שבת' };
      const k = await call(env, '/kind-latest', { k: 'shabbat' });
      if (k?.at && now - Date.parse(k.at) < 5 * 3600000) return { skipped: 'מהדורת מוצאי שבת כבר יצאה' };
    } else if (kind === 'weekly') {
      if (p.hour !== 9 || p.wd !== 'Fri') return { skipped: 'לא שישי 09:00' };
      const k = await call(env, '/kind-latest', { k: 'weekly' });
      if (k?.at && now - Date.parse(k.at) < 5 * 86400000) return { skipped: 'הסיכום השבועי כבר יצא' };
    }
  }
  const last = await call(env, '/latest');
  const afterHoly = !kind && !!(last?.at && now - Date.parse(last.at) > 20 * 3600000);
  let ed, items, failed = [];
  if (kind === 'weekly') {
    // סיכום שבועי: נבנה מהנקודות שכבר נבדקו ופורסמו בשבוע האחרון, לא מכתבות חדשות
    const hist = (await call(env, '/history')) || [];
    items = []; let id = 0;
    for (const e of hist) {
      if (e.kind === 'weekly' || e.mode !== 'summary' || Date.parse(e.at) < now - 8 * 86400000) continue;
      for (const sec of ['main', 'haredi', 'economy']) for (const pt of (e.sections?.[sec] || [])) {
        if (pt.sources?.length) items.push({ id: ++id, name: `${e.date.day} ${e.name}`, title: pt.text, desc: '', link: pt.sources[0].link, srcs: pt.sources });
      }
    }
    if (!env.GEMINI_KEY || items.length < 12) return { skipped: 'אין מספיק נקודות מהשבוע (' + items.length + ')' };
    try { ed = await summarize(env, items, { rules: WEEKLY_RULES, schema: WEEKLY_SCHEMA, secs: ['main', 'good'] }); }
    catch (e) { return { skipped: 'סיכום שבועי נכשל: ' + String(e.message || e).slice(0, 200) }; }
    if (ed.sections.main.length < 3) return { skipped: 'מעט מדי נקודות עברו בדיקה', dropped: ed.dropped };
  } else {
    const holyBack = kind === 'shabbat' ? holyDaysBefore(now) : 0;
    const since = kind === 'shabbat' ? now - (30 + 24 * holyBack) * 3600000
      : afterHoly ? now - 30 * 3600000
      : Math.max(now - 9 * 3600000, Math.min(now - 6 * 3600000, last?.at ? Date.parse(last.at) - 3600000 : 0)); // לפחות 6 שעות אחורה
    const f = await fetchAll(since, kind === 'shabbat' ? 20 : 14);
    items = f.items; failed = f.failed;
    if (env.GEMINI_KEY && items.length) {
      try { ed = await summarize(env, items, kind === 'shabbat' ? { rules: SHABBAT_RULES } : {}); } catch (e) { ed = titlesOnly(items); ed.error = String(e.message || e).slice(0, 300); }
      if (ed.mode === 'summary' && ed.sections.main.length < 2) { const t = titlesOnly(items); t.error = 'מעט מדי נקודות עברו בדיקה' + (ed.checkError ? ' – ' + ed.checkError : ''); t.dropped = ed.dropped; ed = t; }
    } else ed = titlesOnly(items);
  }
  const hd = new HDate(new Date(p.y, p.m - 1, p.d, 12));
  ed.at = now.toISOString();
  ed.name = kind === 'weekly' ? 'השבוע ב-3 דקות' : kind === 'shabbat' ? (p.wd === 'Sat' ? 'מה קרה בשבת' : 'מה קרה בחג') : editionName(p.hour, afterHoly);
  if (kind) ed.kind = kind;
  ed.date = { he: hd.renderGematriya(true), day: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][new Date(p.y, p.m - 1, p.d).getDay()] };
  ed.time = `${String(p.hour).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
  ed.count = items.length;
  ed.failed = failed;
  ed.v = VERSION;
  await call(env, '/save', ed);
  if (push) await call(env, '/push-start', {});
  const cfg = await call(env, '/config');
  const links = cfg.links || {};
  if (push && env.FB_PAGE_TOKEN && env.FB_PAGE_ID) ed.fb = await postFacebook(env, ed, links).catch(e => ({ error: String(e).slice(0, 200) }));
  if (push && env.WHAPI_TOKEN && cfg.waid) ed.wa = await postWhatsapp(env, ed, cfg.waid, { wag: links.wag }).catch(e => ({ error: String(e).slice(0, 200) }));
  if (push && env.WHAPI_TOKEN && cfg.wagid) ed.wag = await postWhatsapp(env, ed, cfg.wagid, {}, 'wag').catch(e => ({ error: String(e).slice(0, 200) }));
  if (push && env.TG_TOKEN && cfg.tgid) ed.tg = await postTelegram(env, cfg.tgid, editionText(ed, links, 'tg')).catch(e => ({ error: String(e).slice(0, 200) }));
  if (ed.mode === 'summary') ed.en = await runEnglish(env, ed, { push }).catch(e => ({ error: String(e.message || e).slice(0, 200) }));
  const st = (r, tok, id) => r ? (r.error ? 'שגיאה: ' + r.error : 'עלה') : (tok ? (id ? 'לא נשלח' : 'אין מזהה ערוץ') : 'לא מוגדר');
  if (push) await call(env, '/post-log', { at: new Date().toISOString(), name: ed.name, fb: st(ed.fb, env.FB_PAGE_TOKEN, env.FB_PAGE_ID), wa: st(ed.wa, env.WHAPI_TOKEN, cfg.waid), wag: st(ed.wag, env.WHAPI_TOKEN, cfg.wagid), tg: st(ed.tg, env.TG_TOKEN, cfg.tgid), en: ed.en ? (ed.en.error ? 'שגיאה: ' + ed.en.error : ed.en.skipped ? 'לא תורגם' : 'עלה' + (ed.en.tg ? ' tg' : '') + (ed.en.wa ? ' wa' : '')) : '' }).catch(() => {});
  return { ok: true, fb: ed.fb, wa: ed.wa, wag: ed.wag, tg: ed.tg, en: ed.en, name: ed.name, mode: ed.mode, main: ed.sections.main.length, dropped: ed.dropped.length, failed, error: ed.error };
}

// ---------- מהדורה באנגלית: "Israel News in 3 Minutes" (24.11.2026) ----------
// אותן נקודות בדיוק שכבר עברו בדיקה בעברית, מתורגמות ב-Gemini (בלי כתיבה מחדש ובלי מקורות חדשים).
const EN_SRC = { 'ynet': 'Ynet', 'וואלה': 'Walla', 'מעריב': 'Maariv', 'ערוץ 7': 'Arutz Sheva (Channel 7)', 'ערוץ 14': 'Channel 14', 'סרוגים': 'Srugim', 'כיפה': 'Kipa', 'כיכר השבת': 'Kikar HaShabbat', 'בחדרי חרדים': 'BeChadrei Charedim', 'JDN': 'JDN', 'גלובס': 'Globes' };
const EN_NAMES = { 'בוקר': 'Morning edition', 'צהריים': 'Midday edition', 'ערב': 'Evening edition', 'מה היה בשבת ובחג': 'What happened over Shabbat and the holiday', 'מה קרה בשבת': 'What happened on Shabbat', 'מה קרה בחג': 'What happened on the holiday', 'השבוע ב-3 דקות': 'This week in 3 minutes' };
const EN_SECTIONS = { main: 'Top stories', haredi: 'Haredi (ultra-Orthodox) community', economy: 'Economy and cost of living', good: '☀️ Good news of the week' };
const EN_PAGE_URL = 'https://hakelim.com/kelim/machshev/chadashot/en/';
const EN_RULES = `You translate calm Hebrew news summary points into English for new immigrants (olim) and Jews abroad.
You get numbered points that were already written and fact-checked in Hebrew. Translate each one faithfully.
Rules:
1. Translate only what is written. Add nothing: no name, number, place, date, detail or opinion that is not in the Hebrew point. Drop nothing important.
2. Plain, calm, international English. One or two short sentences per point. No exclamation marks, no dramatic words, no idioms that need culture to understand.
3. Use the usual English forms for Israeli names and bodies: Knesset, IDF, Shin Bet, Netanyahu, Bank of Israel, Haredi. Transliterate other names simply. On first mention a term that an immigrant may not know, add a short gloss in brackets.
4. Numbers: copy digits exactly as in the Hebrew point (same digits, same order). Do not turn written-out Hebrew numbers into digits.
5. If a point begins "According to a report on <site>", keep that attribution.
6. Output English letters only: no Hebrew letters, no other alphabets.
Return every point: {n, text} with the same n.`;
const EN_SCHEMA = { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { n: { type: 'INTEGER' }, text: { type: 'STRING' } }, required: ['n', 'text'] } } }, required: ['items'] };
export const HEB = /[א-ת]/;
export function enDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now);
}
// תרגום מהדורה: מחזיר { name, date, sections } או null אם עברו פחות מ-2 נקודות ראשיות
export async function translateEdition(env, ed) {
  if (!env.GEMINI_KEY || ed.mode !== 'summary') return null;
  const flat = [];
  for (const k of ['main', 'haredi', 'economy', 'good']) for (const pt of (ed.sections?.[k] || [])) flat.push({ n: flat.length + 1, k, pt });
  if (!flat.length) return null;
  const r = await gemini(env, EN_RULES, flat.map(x => `#${x.n} ${x.pt.text}`).join('\n'), EN_SCHEMA);
  const by = Object.fromEntries((r.data.items || []).map(i => [i.n, String(i.text || '').trim()]));
  const sections = { main: [], haredi: [], economy: [], good: [] }, dropped = [];
  for (const x of flat) {
    const t = by[x.n] || '';
    let why = '';
    if (t.length < 20 || t.length > 420) why = 'length';
    else if (HEB.test(t) || FOREIGN.test(t)) why = 'foreign letters';
    else if (!numbersOk(t, x.pt.text)) why = 'number not in source';
    if (why) { dropped.push({ n: x.n, why }); continue; }
    sections[x.k].push({ text: t.replace(/\s+/g, ' '), sources: (x.pt.sources || []).map(s => ({ name: EN_SRC[s.name] || s.name, link: s.link })) });
  }
  if (sections.main.length < 2 && ed.kind !== 'weekly') return null;
  return { name: EN_NAMES[ed.name] || ed.name, date: enDate(new Date(ed.at)), model: r.model, sections, dropped };
}
export function editionTextEn(en, links = {}, src = 'entg') {
  const out = [`🇮🇱 Israel News in 3 Minutes – ${en.name}, ${en.date}`, ''];
  en.sections.main.forEach((p, i) => out.push(`${i + 1}. ${p.text}`));
  for (const k of ['haredi', 'economy', 'good']) if (en.sections[k]?.length) { out.push('', `▪️ ${EN_SECTIONS[k]}`); en.sections[k].forEach(p => out.push(`• ${p.text}`)); }
  out.push('', 'Every point links to its source (Hebrew-language news sites). Read it on the page:', EN_PAGE_URL + '?utm_source=' + src);
  if (links.enwa && src !== 'enwa') out.push('', '📲 WhatsApp channel, 3 times a day:', links.enwa);
  if (links.entg && src !== 'entg') out.push('', '✈️ Telegram channel:', links.entg);
  out.push('', '💛 A kindness project: free, no ads, no sign-up, no profit motive.');
  out.push('', 'Know someone who would appreciate calm news? Feel free to forward this message 🙏');
  return out.join('\n');
}
async function postWhatsappText(env, to, text) {
  const r = await fetch('https://gate.whapi.cloud/messages/text', { method: 'POST', headers: { authorization: 'Bearer ' + env.WHAPI_TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ to, body: text }) });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { id: j.message?.id || true } : { error: (j.error && (j.error.message || j.error)) || String(r.status) };
}
// תרגום + שמירה על המהדורה + שליחה לערוצים האנגליים (אם הוגדרו)
export async function runEnglish(env, ed, { push = true } = {}) {
  const out = {};
  const en = await translateEdition(env, ed);
  if (!en) return { skipped: 'no translation' };
  await call(env, '/attach-en', { at: ed.at, en });
  const cfg = await call(env, '/config'); const links = cfg.links || {};
  if (push && env.TG_TOKEN && cfg.entgid) out.tg = await postTelegram(env, cfg.entgid, editionTextEn(en, links, 'entg')).catch(e => ({ error: String(e).slice(0, 200) }));
  if (push && env.WHAPI_TOKEN && cfg.enwaid) out.wa = await postWhatsappText(env, cfg.enwaid, editionTextEn(en, links, 'enwa')).catch(e => ({ error: String(e).slice(0, 200) }));
  return { ok: true, main: en.sections.main.length, dropped: en.dropped.length, ...out };
}

// ---------- השרת ----------
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const admin = env.ADMIN_KEY && key === env.ADMIN_KEY;
    if (request.method === 'OPTIONS') return new Response('', { headers: CORS });
    if (url.pathname === '/ping') return json({ ok: true, v: VERSION, gemini: !!env.GEMINI_KEY });
    if (url.pathname === '/latest') {
      const kq = url.searchParams.get('kind');
      const ed = ['shabbat', 'weekly'].includes(kq) ? await call(env, '/kind-latest', { k: kq }) : await call(env, '/latest');
      const from = url.searchParams.get('from');
      if (from !== 'none') ctx.waitUntil(call(env, '/hit', { e: FROM.includes(from) ? from : url.searchParams.get('lang') === 'en' ? 'en' : 'web' }).catch(() => {})); // none = המשך הקראה בטלפון, כבר נספר
      if (!ed?.at) return json({ empty: true });
      const { dropped, error, fixed, checkError, en, ...pub } = ed;
      const links = (await call(env, '/config')).links || {};
      if (url.searchParams.get('lang') === 'en') { // המהדורה האנגלית של אותה מהדורה
        if (!en?.sections) return json({ empty: true }, 200, { 'cache-control': 'public, max-age=60' });
        return json({ at: ed.at, time: ed.time, kind: ed.kind, name: en.name, date: en.date, sections: en.sections, links: { wa: links.enwa, tg: links.entg } }, 200, { 'cache-control': 'public, max-age=120' });
      }
      return json({ ...(admin ? ed : pub), links }, 200, { 'cache-control': 'public, max-age=120' });
    }
    if (url.pathname === '/history') return json(((await call(env, '/history')) || []).map(({ en, ...e }) => e), 200, { 'cache-control': 'public, max-age=300' });
    if (url.pathname === '/report' && request.method === 'POST') {
      let b = {}; try { b = await request.json(); } catch (e) {}
      const text = String(b.text || '').slice(0, 300), note = String(b.note || '').slice(0, 500);
      if (!text && !note) return json({ ok: false }, 400);
      await call(env, '/report', { text, note, at: new Date().toISOString() });
      return json({ ok: true });
    }
    if (url.pathname === '/reports') return admin ? json(await call(env, '/reports')) : json({ ok: false }, 403);
    if (url.pathname === '/stats') return json(await call(env, '/stats'));
    // קישורים שמופיעים בדף ובפוסטים (ערוץ הווטסאפ) – נקבעים פעם אחת, בלי להעלות את השרת מחדש
    // /config?key=..&wa=https://whatsapp.com/channel/...   (wa= ריק מוחק)
    if (url.pathname === '/config') {
      if (!admin) return json({ ok: false }, 403);
      const wa = url.searchParams.get('wa');
      const waid = url.searchParams.get('waid');
      // טלגרם: tg = קישור ציבורי לכפתור בדף (https://t.me/..), tgid = לאן הבוט שולח (@שם_הערוץ או -100...)
      const tg = url.searchParams.get('tg'), tgid = url.searchParams.get('tgid');
      // קבוצת הווטסאפ השקטה: wagid = לאן שולחים (...@g.us), wag = קישור ההצטרפות שמוצג לציבור
      const wag = url.searchParams.get('wag'), wagid = url.searchParams.get('wagid');
      // מהדורה באנגלית: entg/enwa = קישורים ציבוריים, entgid/enwaid = לאן שולחים
      const entg = url.searchParams.get('entg'), entgid = url.searchParams.get('entgid'), enwa = url.searchParams.get('enwa'), enwaid = url.searchParams.get('enwaid');
      if (entg !== null) {
        if (entg && !/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}$/.test(entg)) return json({ ok: false, error: 'bad telegram link' }, 400);
        return json(await call(env, '/config-set', { entg }));
      }
      if (entgid !== null) {
        if (entgid && !/^(@[A-Za-z0-9_]{5,32}|-100\d{6,16})$/.test(entgid)) return json({ ok: false, error: 'bad telegram id' }, 400);
        return json(await call(env, '/config-set', { entgid }));
      }
      if (enwa !== null) {
        if (enwa && !/^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+$/.test(enwa)) return json({ ok: false, error: 'bad channel link' }, 400);
        return json(await call(env, '/config-set', { enwa }));
      }
      if (enwaid !== null) {
        if (enwaid && !/^\d{10,25}@newsletter$/.test(enwaid)) return json({ ok: false, error: 'bad channel id' }, 400);
        return json(await call(env, '/config-set', { enwaid }));
      }
      if (wag !== null) {
        if (wag && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(wag)) return json({ ok: false, error: 'קישור קבוצה לא תקין' }, 400);
        return json(await call(env, '/config-set', { wag }));
      }
      if (wagid !== null) {
        if (wagid && !/^[\d-]{10,30}@g\.us$/.test(wagid)) return json({ ok: false, error: 'מזהה קבוצה לא תקין' }, 400);
        return json(await call(env, '/config-set', { wagid }));
      }
      if (tg !== null) {
        if (tg && !/^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}$/.test(tg)) return json({ ok: false, error: 'קישור טלגרם לא תקין' }, 400);
        return json(await call(env, '/config-set', { tg }));
      }
      if (tgid !== null) {
        if (tgid && !/^(@[A-Za-z0-9_]{5,32}|-100\d{6,16})$/.test(tgid)) return json({ ok: false, error: 'מזהה ערוץ טלגרם לא תקין' }, 400);
        return json(await call(env, '/config-set', { tgid }));
      }
      if (waid !== null) {
        if (waid && !/^\d{10,25}@newsletter$/.test(waid)) return json({ ok: false, error: 'מזהה ערוץ לא תקין' }, 400);
        return json(await call(env, '/config-set', { waid }));
      }
      if (wa === null) return json(await call(env, '/config'));
      if (wa && !/^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]+$/.test(wa)) return json({ ok: false, error: 'קישור ערוץ לא תקין' }, 400);
      return json(await call(env, '/config-set', { wa }));
    }
    // תרגום המהדורה האחרונה לאנגלית (גיבוי/בדיקה). push=1 שולח גם לערוצים האנגליים
    if (url.pathname === '/en-run') {
      if (!admin) return json({ ok: false }, 403);
      const ed = await call(env, '/latest');
      if (!ed?.at) return json({ ok: false, error: 'no edition' });
      return json(await runEnglish(env, ed, { push: url.searchParams.get('push') === '1' }));
    }
    if (url.pathname === '/run') {
      if (!admin) return json({ ok: false }, 403);
      const force = url.searchParams.get('force') === '1';
      const kind = ['shabbat', 'weekly'].includes(url.searchParams.get('kind')) ? url.searchParams.get('kind') : '';
      return json(await runEdition(env, { force, kind, push: !force || url.searchParams.get('push') === '1' }));
    }
    // רילס יומי: GitHub Action (news-reel.yml) מרנדר mp4 ושולח לכאן; השרת מעלה לדף בפייסבוק עם המפתח שכבר יש לו
    if (url.pathname === '/reel' && request.method === 'POST') {
      if (!admin) return json({ ok: false }, 403);
      if (holyNow()) return json({ ok: false, error: 'שבת/חג' });
      const cfg = await call(env, '/config');
      const toTg = !!(env.TG_TOKEN && cfg.tgid), toFb = !!(env.FB_PAGE_TOKEN && env.FB_PAGE_ID);
      if (!toFb && !toTg) return json({ ok: false, error: 'אין מפתח פייסבוק' });
      const video = await request.arrayBuffer();
      if (video.byteLength < 10000 || video.byteLength > 50e6) return json({ ok: false, error: 'גודל קובץ' }, 400);
      const text = String(url.searchParams.get('text') || '').slice(0, 2000);
      const res = toFb ? await postReel(env, video, text).catch(e => ({ error: String(e).slice(0, 300) })) : { error: 'אין מפתח פייסבוק' };
      const tgr = toTg ? await postTelegramVideo(env, cfg.tgid, video, text).catch(e => ({ error: String(e).slice(0, 200) })) : null;
      await call(env, '/post-log', { at: new Date().toISOString(), name: 'רילס', fb: res.id ? 'עלה' : 'שגיאה: ' + res.error, wa: '-', tg: tgr ? (tgr.error ? 'שגיאה: ' + tgr.error : 'עלה') : '-' }).catch(() => {});
      return json({ ok: !!res.id, ...res, tg: tgr });
    }
    // 24.11.2026: קובץ שמע/סרטון של המהדורה (news-media.yml) -> ערוץ הטלגרם; kind=audio|video, title, text (כיתוב), לא בשבת ובחג
    if (url.pathname === '/media' && request.method === 'POST') {
      if (!admin) return json({ ok: false }, 403);
      if (holyNow()) return json({ ok: false, error: 'שבת/חג' });
      const cfg = await call(env, '/config');
      if (!env.TG_TOKEN || !cfg.tgid) return json({ ok: false, error: 'אין ערוץ טלגרם' });
      const kind = url.searchParams.get('kind') === 'audio' ? 'audio' : 'video';
      const file = await request.arrayBuffer();
      if (file.byteLength < 5000 || file.byteLength > 48e6) return json({ ok: false, error: 'גודל קובץ' }, 400);
      const title = String(url.searchParams.get('title') || 'החדשות ב-3 דקות').slice(0, 120), text = String(url.searchParams.get('text') || '').slice(0, 1000);
      const tgr = await postTelegramMedia(env, cfg.tgid, kind, file, title, text).catch(e => ({ error: String(e).slice(0, 200) }));
      await call(env, '/post-log', { at: new Date().toISOString(), name: kind === 'audio' ? 'שמע' : 'סרטון מהדורה', fb: '-', wa: '-', tg: tgr.error ? 'שגיאה: ' + tgr.error : 'עלה' }).catch(() => {});
      return json({ ok: !tgr.error, ...tgr });
    }
    // הודעת טקסט לערוץ הווטסאפ עם קישורי האזנה/צפייה (אחרי שהקבצים מוכנים; בשבת וחג מסרב)
    if (url.pathname === '/media-note' && request.method === 'POST') {
      if (!admin) return json({ ok: false }, 403);
      if (holyNow()) return json({ ok: false, error: 'שבת/חג' });
      const cfg = await call(env, '/config');
      if (!env.WHAPI_TOKEN || !cfg.waid) return json({ ok: false, error: 'אין ערוץ ווטסאפ' });
      const text = String((await request.json().catch(() => ({}))).text || '').trim().slice(0, 1500);
      if (!text) return json({ ok: false, error: 'אין טקסט' }, 400);
      return json({ ok: true, ...(await postWhatsappText(env, cfg.waid, text)) });
    }
    // קישורים קבועים לקובץ האחרון: /media/latest.mp3 ו-/media/latest.mp4 (מפנים ל-Release)
    if (/^\/media\/latest\.(mp3|mp4)$/.test(url.pathname)) {
      return Response.redirect('https://github.com/gilad-rachamim/gilad-rachamim.github.io/releases/download/media/latest.' + url.pathname.slice(-3), 302);
    }
    if (url.pathname === '/tg-post' && request.method === 'POST') { // פרסום ידני של הודעה אחת לערוץ הטלגרם שהוגדר (רק עם מפתח ניהול)
      if (!admin) return json({ ok: false }, 403);
      if (!env.TG_TOKEN) return json({ ok: false, error: 'אין TG_TOKEN' });
      const b = await request.json().catch(() => ({})); const text = String(b.text || '').trim();
      if (text.length < 5 || text.length > 3900) return json({ ok: false, error: 'טקסט לא תקין' }, 400);
      const cfg = await call(env, '/config'); if (!cfg.tgid) return json({ ok: false, error: 'אין ערוץ מוגדר' });
      return json({ ok: true, ...(await postTelegram(env, cfg.tgid, text)) });
    }
    if (url.pathname === '/tg-check') { // הבוט חי? הערוץ נמצא? כמה מצטרפים (למדידה השבועית)
      if (!admin) return json({ ok: false }, 403);
      if (!env.TG_TOKEN) return json({ ok: false, error: 'אין TG_TOKEN' });
      const me = await tgApi(env, 'getMe', {});
      const cfg = await call(env, '/config');
      const chat = cfg.tgid ? await tgApi(env, 'getChat', { chat_id: cfg.tgid }) : null;
      const n = cfg.tgid ? await tgApi(env, 'getChatMemberCount', { chat_id: cfg.tgid }) : null;
      return json({ ok: !!me.ok, bot: me.result?.username || me.description, tgid: cfg.tgid || null, chat: chat ? (chat.result?.title || chat.description) : null, members: n?.result ?? null, link: cfg.links?.tg || null });
    }
    if (url.pathname === '/tg-pin-kelim' && request.method === 'POST') { // 23.11.2026: הודעה נעוצה אחת על בוט הכלים (טקסט קבוע)
      if (!admin) return json({ ok: false }, 403);
      const cfg = await call(env, '/config');
      if (!env.TG_TOKEN || !cfg.tgid) return json({ ok: false, error: 'אין ערוץ' });
      const m = await tgApi(env, 'sendMessage', { chat_id: cfg.tgid, text: TG_PIN_KELIM, link_preview_options: { is_disabled: true } });
      if (!m.ok) return json({ ok: false, error: m.description });
      const p = await tgApi(env, 'pinChatMessage', { chat_id: cfg.tgid, message_id: m.result.message_id, disable_notification: true });
      return json({ ok: true, id: m.result.message_id, pinned: !!p.ok, pinError: p.ok ? null : p.description });
    }
    if (url.pathname === '/tg-desc-kelim' && request.method === 'POST') { // 23.11.2026: שורת בוט הכלים בתיאור הערוץ (פעם אחת, לא מכפיל)
      if (!admin) return json({ ok: false }, 403);
      const cfg = await call(env, '/config');
      if (!env.TG_TOKEN || !cfg.tgid) return json({ ok: false, error: 'אין ערוץ' });
      const c = await tgApi(env, 'getChat', { chat_id: cfg.tgid });
      if (!c.ok) return json({ ok: false, error: c.description });
      const cur = c.result.description || '';
      if (cur.includes('HakelimBot')) return json({ ok: true, already: true, description: cur });
      const line = '🤖 בוט הכלים: t.me/HakelimBot?start=tg';
      const base = cur.replace(/\s*בחינם,\s*/g, ' ').trim(); // "חינם" אסור בתיאורים חדשים (כלל של גילעד)
      const next = (base ? base + '\n' : '') + line;
      if (next.length > 255) return json({ ok: false, error: 'ארוך מדי', len: next.length, description: cur });
      const r = await tgApi(env, 'setChatDescription', { chat_id: cfg.tgid, description: next });
      return json({ ok: !!r.ok, error: r.ok ? null : r.description, description: next });
    }
    if (url.pathname === '/wa-check') {
      if (!admin) return json({ ok: false }, 403);
      if (!env.WHAPI_TOKEN) return json({ ok: false, error: 'אין WHAPI_TOKEN' });
      const r = await fetch('https://gate.whapi.cloud/health', { headers: { authorization: 'Bearer ' + env.WHAPI_TOKEN } });
      const j = await r.json().catch(() => ({}));
      return json({ ok: r.ok, http: r.status, status: j.status || j.error || null, user: j.user ? { name: j.user.name } : null });
    }
    // ניהול קבוצת הווטסאפ דרך Whapi (יצירה, קישור הזמנה, מצב): רק נתיבי groups/health/limits/chats, אף פעם לא שליחת הודעות
    if (url.pathname === '/wa-api') {
      if (!admin) return json({ ok: false }, 403);
      if (!env.WHAPI_TOKEN) return json({ ok: false, error: 'אין WHAPI_TOKEN' });
      const path = url.searchParams.get('p') || '';
      if (!/^\/(groups|health|limits|chats|newsletters)(\/[A-Za-z0-9@._-]+)*$/.test(path)) return json({ ok: false, error: 'נתיב לא מורשה' }, 400);
      const method = ['GET', 'POST', 'PUT', 'PATCH'].includes(request.method) ? request.method : 'GET';
      const r = await fetch('https://gate.whapi.cloud' + path, { method, headers: { authorization: 'Bearer ' + env.WHAPI_TOKEN, 'content-type': 'application/json' }, body: method === 'GET' ? undefined : await request.text() });
      return json({ http: r.status, body: await r.json().catch(() => null) });
    }
    if (url.pathname === '/push-test') { // שולח התראה רק למנוי אחד (endpoint) – לבדיקה
      if (!admin) return json({ ok: false }, 403);
      return json(await call(env, '/push-one', { endpoint: url.searchParams.get('endpoint') }));
    }
    if ((url.pathname === '/subscribe' || url.pathname === '/unsubscribe') && request.method === 'POST') {
      let b = {}; try { b = await request.json(); } catch (e) {}
      const ep = String(b.endpoint || '');
      if (!/^https:\/\/[a-z0-9.-]+\//i.test(ep) || ep.length > 1000) return json({ ok: false }, 400);
      return json(await call(env, url.pathname, { endpoint: ep }));
    }
    return json({ name: 'החדשות ב-3 דקות', page: 'https://hakelim.com/kelim/machshev/chadashot/' });
  },
  async scheduled(event, env, ctx) {
    // טריגר אחד בלבד (מסלול חינמי: 5 טריגרים לחשבון): "0,45 4-20 * * *", והשרת מחליט מה לעשות לפי השעה
    const t = new Date(event.scheduledTime || Date.now()), h = t.getUTCHours(), m = t.getUTCMinutes(), dow = t.getUTCDay();
    let kind = null;
    if (m === 45 && h >= 15 && h <= 19) kind = 'shabbat';
    else if (m === 0 && dow === 5 && (h === 6 || h === 7)) kind = 'weekly';
    else if (m === 0 && [4, 5, 10, 11, 17, 18, 19, 20].includes(h)) kind = '';
    if (kind === null) return;
    ctx.waitUntil(runEdition(env, { kind }).then(r => console.log(JSON.stringify(r))).catch(e => console.log('run error', String(e))));
  }
};

// אחסון: הסיכום האחרון, 21 הקודמים, דיווחי טעויות ומונה כניסות יומי
// ---------- פייסבוק: פוסט לדף "החדשות ב-3 דקות" (Graph API, מפתח קבוע של הדף) ----------
const PAGE_URL = 'https://hakelim.com/kelim/machshev/chadashot/';
// מאיפה הגיעו (נספר ב-/stats): דף, טלפון, התראה, פייסבוק, ווטסאפ, מודעה (QR), שיתוף, דף הבית
export const FROM = ['web', 'phone', 'push', 'fb', 'wa', 'wag', 'qr', 'share', 'home', 'tg', 'embed', 'bot', 'en', 'entg', 'enwa'];
// ערוץ הווטסאפ: דרך Whapi.Cloud (מסלול חינמי), שמחובר למספר של גילעד כ"מכשיר מקושר". אין API רשמי לערוצים.
// WHAPI_TOKEN = סוד בשרת (tools/news-worker/wa-setup.ps1), מזהה הערוץ ב-/config?waid=
async function postWhatsapp(env, ed, waid, links = {}, src = 'wa') {
  const r = await fetch('https://gate.whapi.cloud/messages/text', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.WHAPI_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ to: waid, body: editionText(ed, links, src) })
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { id: j.message?.id || true } : { error: (j.error && (j.error.message || j.error)) || String(r.status) };
}
const SUPPORT_URL = 'https://hakelim.com/kelim/';
export const TG_PIN_KELIM = `🤖 בוט הכלים של המיזם – עכשיו בטלגרם

כותבים מה צריכים, במילים שלכם, ומקבלים את הכלי המתאים מאתר הכלים: מחשבונים, קבצים, קודש, בריאות, עבודה ועוד.
גימטריה, מע"מ ותאריך עברי – עונה ישר בצ'אט.

👈 https://t.me/HakelimBot?start=tg

💛 מיזם חסד, בלי כוונת רווח. בלי הרשמה ובלי פרסומות.`;
export function editionText(ed, links = {}, src = 'fb') {
  const out = [`📰 החדשות ב-3 דקות – ${ed.name}, יום ${ed.date.day} ${ed.date.he}`, ''];
  const names = { haredi: 'ציבור חרדי', economy: 'כלכלה וכיס', good: '☀️ חדשות טובות מהשבוע' };
  ed.sections.main.forEach((p, i) => out.push(`${i + 1}. ${p.text}`));
  for (const k of ['haredi', 'economy', 'good']) if (ed.sections[k]?.length) { out.push('', `▪️ ${names[k]}`); ed.sections[k].forEach(p => out.push(`• ${p.text}`)); }
  out.push('', 'כל נקודה עם קישור למקור, והתראה 3 פעמים ביום:', PAGE_URL + '?utm_source=' + src);
  if (links.wa && src !== 'wa') out.push('', '📲 בערוץ הווטסאפ, 3 פעמים ביום:', links.wa);
  if (links.tg && src !== 'tg') out.push('', '✈️ בערוץ הטלגרם:', links.tg);
  out.push('בטלפון כשר: 077-2253345 שלוחה 8');
  // 23.11.2026: בוט הכלים בטלגרם, עם מקור לפי הערוץ
  out.push('', '🤖 כל הכלים של המיזם בבוט בטלגרם:', 'https://t.me/HakelimBot?start=' + (src === 'tg' ? 'tg' : src === 'wa' ? 'wa' : 'fb'));
  // 19.11.2026: שורת תמיכה קבועה – מיזם חסד, בלי כוונת רווח; הדף מציג ביט/פייבוקס ו-PayPal
  out.push('', '💛 מיזם חסד: בחינם, בלי פרסומות ובלי כוונת רווח. רוצים לעזור שזה יימשך?', SUPPORT_URL + '?utm_source=' + src + '#litmoch');
  // 23.11.2026: זנב העברה – כל הודעה מזמינה להעביר הלאה (וקישור לקבוצה השקטה כשיש קבוצה)
  if (links.wag && src !== 'wag') out.push('', '📲 להצטרפות לקבוצה השקטה, רק הסיכום ובלי שיחות:', links.wag);
  out.push('', 'מכירים מי שיעריך חדשות רגועות? אפשר להעביר לו את ההודעה 🙏');
  return out.join('\n');
}
// ---------- טלגרם: ערוץ "החדשות ב-3 דקות" (Bot API, חינמי ורשמי) ----------
// TG_TOKEN = סוד בשרת (tools/news-worker/tg-setup.ps1), הבוט מנהל בערוץ; לאן שולחים – /config?tgid=
async function tgApi(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ ok: false, description: String(r.status) }));
}
async function postTelegram(env, chat, text) {
  const j = await tgApi(env, 'sendMessage', { chat_id: chat, text: text.slice(0, 4000), link_preview_options: { is_disabled: true } });
  return j.ok ? { id: j.result.message_id } : { error: j.description || 'שגיאה' };
}
async function postTelegramVideo(env, chat, video, caption) {
  const f = new FormData();
  f.append('chat_id', chat);
  f.append('caption', caption.slice(0, 1000));
  f.append('supports_streaming', 'true');
  f.append('video', new Blob([video], { type: 'video/mp4' }), 'chadashot.mp4');
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendVideo`, { method: 'POST', body: f });
  const j = await r.json().catch(() => ({}));
  return j.ok ? { id: j.result.message_id } : { error: j.description || String(r.status) };
}
async function postTelegramMedia(env, chat, kind, file, title, caption) {
  if (kind === 'video') return postTelegramVideo(env, chat, file, caption);
  const f = new FormData();
  f.append('chat_id', chat);
  f.append('caption', caption.slice(0, 1000));
  f.append('title', title);
  f.append('performer', 'החדשות ב-3 דקות');
  f.append('audio', new Blob([file], { type: 'audio/mpeg' }), 'chadashot.mp3');
  const r = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendAudio`, { method: 'POST', body: f });
  const j = await r.json().catch(() => ({}));
  return j.ok ? { id: j.result.message_id } : { error: j.description || String(r.status) };
}
async function postFacebook(env, ed, links) {
  const v = env.FB_API_VERSION || 'v23.0';
  const r = await fetch(`https://graph.facebook.com/${v}/${env.FB_PAGE_ID}/feed`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message: editionText(ed, links), link: PAGE_URL + '?utm_source=fb', access_token: env.FB_PAGE_TOKEN })
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { id: j.id } : { error: (j.error && j.error.message) || String(r.status) };
}

async function postReel(env, video, description) {
  const v = env.FB_API_VERSION || 'v23.0', tok = env.FB_PAGE_TOKEN, base = `https://graph.facebook.com/${v}/${env.FB_PAGE_ID}/video_reels`;
  const err = j => (j.error && j.error.message) || JSON.stringify(j).slice(0, 200);
  const s = await (await fetch(base, { method: 'POST', body: new URLSearchParams({ upload_phase: 'start', access_token: tok }) })).json();
  if (!s.video_id) return { error: 'start: ' + err(s) };
  const u = await fetch(`https://rupload.facebook.com/video-upload/${v}/${s.video_id}`, {
    method: 'POST', headers: { authorization: 'OAuth ' + tok, offset: '0', file_size: String(video.byteLength) }, body: video });
  const uj = await u.json().catch(() => ({}));
  if (!uj.success) return { error: 'upload: ' + err(uj) };
  const f = await (await fetch(base, { method: 'POST', body: new URLSearchParams({ upload_phase: 'finish', video_id: s.video_id, video_state: 'PUBLISHED', description, access_token: tok }) })).json();
  return f.success ? { id: s.video_id } : { error: 'finish: ' + err(f) };
}

// ---------- Web Push (VAPID, בלי תוכן) ----------
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = str => b64u(new TextEncoder().encode(str));
async function vapidAuth(env, endpoint) {
  const jwk = JSON.parse(env.VAPID_JWK);
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64uStr(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64uStr(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://hakelim.com/kelim/' }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
}
export async function sendPush(env, endpoint) {
  const r = await fetch(endpoint, { method: 'POST', headers: { authorization: await vapidAuth(env, endpoint), ttl: '21600', urgency: 'normal', 'content-length': '0' } });
  return r.status;
}
async function subKey(endpoint) { return 'sub:' + b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))).slice(0, 32); }

export class Store {
  constructor(state, env) { this.s = state.storage; this.env = env; }
  // שליחה בקבוצות של 40 (מגבלת בקשות לכל ריצה); כל קבוצה בריצת alarm נפרדת
  async alarm() {
    const job = await this.s.get('push-job');
    if (!job || !this.env.VAPID_JWK) return;
    const page = await this.s.list({ prefix: 'sub:', startAfter: job.after || undefined, limit: 40 });
    let last = null;
    for (const [k, sub] of page) {
      last = k;
      try {
        const st = await sendPush(this.env, sub.endpoint);
        if (st === 404 || st === 410) { await this.s.delete(k); job.gone++; } else if (st < 300) job.sent++; else job.fail++;
      } catch (e) { job.fail++; }
    }
    if (page.size === 40) { job.after = last; await this.s.put('push-job', job); await this.s.setAlarm(Date.now() + 1000); }
    else { job.done = new Date().toISOString(); delete job.after; await this.s.put('push-last', job); await this.s.delete('push-job'); }
  }
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const body = request.method === 'POST' ? await request.json() : null;
    if (path === '/latest') return Response.json((await this.s.get('latest')) || {});
    if (path === '/attach-en') { // מצמיד תרגום אנגלי למהדורה (לפי זמן היצירה)
      const lt = await this.s.get('latest');
      if (lt?.at === body.at) { lt.en = body.en; await this.s.put('latest', lt); }
      const h = (await this.s.get('history')) || [];
      const he = h.find(x => x.at === body.at); if (he) { he.en = body.en; await this.s.put('history', h); }
      const kl = lt?.kind ? await this.s.get('kind:' + lt.kind) : null;
      if (kl?.at === body.at) { kl.en = body.en; await this.s.put('kind:' + lt.kind, kl); }
      return Response.json({ ok: !!(lt?.at === body.at) });
    }
    if (path === '/kind-latest') return Response.json((await this.s.get('kind:' + body.k)) || {});
    if (path === '/history') return Response.json((await this.s.get('history')) || []);
    if (path === '/save') {
      const h = (await this.s.get('history')) || [];
      h.unshift(body); await this.s.put('history', h.slice(0, 30)); await this.s.put('latest', body);
      if (body.kind) await this.s.put('kind:' + body.kind, body);
      return Response.json({ ok: true });
    }
    if (path === '/report') {
      const r = (await this.s.get('reports')) || [];
      r.unshift(body); await this.s.put('reports', r.slice(0, 200));
      return Response.json({ ok: true });
    }
    if (path === '/reports') return Response.json((await this.s.get('reports')) || []);
    if (path === '/config') return Response.json((await this.s.get('config')) || { links: {} });
    if (path === '/config-set') {
      const c = (await this.s.get('config')) || { links: {} };
      if ('wa' in body) { if (body.wa) c.links.wa = body.wa; else delete c.links.wa; }
      if ('waid' in body) { if (body.waid) c.waid = body.waid; else delete c.waid; } // מזהה הערוץ לפרסום (לא מוצג לציבור)
      if ('wag' in body) { if (body.wag) c.links.wag = body.wag; else delete c.links.wag; }
      if ('wagid' in body) { if (body.wagid) c.wagid = body.wagid; else delete c.wagid; }
      for (const k of ['entg', 'enwa']) if (k in body) { if (body[k]) c.links[k] = body[k]; else delete c.links[k]; }
      for (const k of ['entgid', 'enwaid']) if (k in body) { if (body[k]) c[k] = body[k]; else delete c[k]; }
      if ('tg' in body) { if (body.tg) c.links.tg = body.tg; else delete c.links.tg; }
      if ('tgid' in body) { if (body.tgid) c.tgid = body.tgid; else delete c.tgid; }
      await this.s.put('config', c);
      return Response.json({ ok: true, ...c });
    }
    if (path === '/hit') {
      const day = new Date().toISOString().slice(0, 10), st = (await this.s.get('stats')) || {};
      const k = `${day} ${String(body.e || 'web').slice(0, 12)}`;
      st[k] = (st[k] || 0) + 1;
      const keys = Object.keys(st).sort(); while (keys.length > 300) delete st[keys.shift()];
      await this.s.put('stats', st);
      return Response.json({ ok: true });
    }
    if (path === '/post-log') {
      const l = (await this.s.get('post-log')) || [];
      l.unshift(body); await this.s.put('post-log', l.slice(0, 9));
      return Response.json({ ok: true });
    }
    if (path === '/stats') {
      const subs = (await this.s.list({ prefix: 'sub:' })).size;
      return Response.json({ subscribers: subs, lastPush: (await this.s.get('push-last')) || null, posts: (await this.s.get('post-log')) || [], days: (await this.s.get('stats')) || {} });
    }
    if (path === '/subscribe') { await this.s.put(await subKey(body.endpoint), { endpoint: body.endpoint, at: new Date().toISOString() }); return Response.json({ ok: true }); }
    if (path === '/unsubscribe') { await this.s.delete(await subKey(body.endpoint)); return Response.json({ ok: true }); }
    if (path === '/push-start') { await this.s.put('push-job', { sent: 0, gone: 0, fail: 0, start: new Date().toISOString() }); await this.s.setAlarm(Date.now() + 500); return Response.json({ ok: true }); }
    if (path === '/push-one') {
      if (!body.endpoint) return Response.json({ ok: false });
      try { return Response.json({ status: await sendPush(this.env, body.endpoint) }); } catch (e) { return Response.json({ error: String(e) }); }
    }
    return Response.json({}, { status: 404 });
  }
}
