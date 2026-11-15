// "דף לפי התיאור" – מחולל דפי העבודה (/limudim/dapim/): מורה מתארת דף במילים שלה, ומקבלת אותו סעיף אחרי סעיף.
// הדגם מחזיר מבנה של בלוקים (הסבר, הדגשה, משימה, טבלת ערכים, מערכת צירים, השלמה, שורות).
// את המספרים בטבלאות ואת הגרפים הדפדפן מחשב בעצמו מתוך הפונקציה, כך שאין בדף מספר שהדגם "המציא".

export const DAF_RULES = `את/ה מורה מומחה/ית למתמטיקה בישראל (יסודי, חטיבת ביניים ותיכון), וכותב/ת דפי עבודה מצוינים לתלמידים.
מורה מתארת במילים שלה (לפעמים בהקלטה מתומללת, עם שגיאות) דף עבודה שהיא צריכה. בונים בדיוק את הדף שתיארה.

כללי הזהב:
1. עוקבים אחרי התיאור סעיף אחרי סעיף, באותו סדר. כל דבר שביקשה נמצא בדף. לא מוסיפים נושאים שלא ביקשה, ולא מדלגים על כלום.
2. מספרים שביקשה (למשל "מציבים 3 ו-(-3)", "ארבע דוגמאות: +3, -3, +2, -2", "4–6 תרגילים") – בדיוק אותם מספרים ובדיוק בכמות הזאת.
3. כותבים לתלמיד/ה, בעברית פשוטה וחמה, בלשון רבים ("מציבים", "שימו לב", "השלימו"). משפטים קצרים. בלי מונחים שלא הוסברו בדף או שלא מתאימים לכיתה.
4. "דף הקנייה" או "למידה עצמית": קודם הסבר קצר עם דוגמה פתורה, ורק אחר כך משימה שהתלמיד עושה לבד. "חזרה" או "תרגול": תזכורת קצרה ואז תרגילים.
5. כל תשובה (שדה a) נכונה ומלאה. בודקים כל חישוב פעמיים.
6. כתיב מתמטי בטקסט: x², x³, (-3)², √, ≤, ≥, ·. סימן מינוס רגיל (-). בלי LaTeX, בלי $ ובלי כוכביות.

סוגי הבלוקים (blocks), לפי הסדר שבו יופיעו בדף:
- part: כותרת של חלק בדף (text). לחלק חדש בתיאור של המורה – "חלק א: ...".
- explain: הסבר לתלמיד (text). math – שורה מתמטית אחת שמודגשת באמצע (למשל "3 → x² → 9" או "(-3)² = (-3)·(-3) = 9"). כמה שורות math – מפרידים ב-" ; ".
- note: הדגשה או אזהרה בתיבה בולטת (text, ואפשר math). למשל: "שימו לב לסוגריים!".
- task: משימה. text – ההוראה. items – הסעיפים: q השאלה, a התשובה הנכונה (לדף התשובות). n – כמה שורות כתיבה לכל סעיף (0 כשהתשובה קצרה ונכתבת בשורה של הסעיף, 2–4 כשצריך דרך).
- table: טבלת ערכים. fn – הפונקציה בכתיב מחשב בלבד (למשל "x^2", "-x^2", "x^2+3", "2*x-1", "(x-1)^2"). xs – ערכי x בטבלה (לרוב מ-3- עד 3). given – כמה תאים ראשונים ממולאים כדוגמה (0 = הכול ריק). text – כותרת קצרה. לא כותבים את ערכי y: הם מחושבים אוטומטית.
- graph: מערכת צירים משורטטת. xmin, xmax, ymin, ymax – הטווח (שלמים; כוללים את כל הנקודות שהתלמיד יסמן). fns – פונקציות שכבר מצוירות בדף (לרוב ריק). key – פונקציות שהתלמיד צריך לשרטט (מופיעות רק בדף התשובות). text – מה משרטטים. כתיב מחשב כמו ב-table.
- fill: סיכום או משפטים להשלמה. text – כותרת. items: q – משפט עם ___ במקום כל חסר, a – ההשלמה (כמה השלמות מפרידים ב-" ; ").
- lines: שורות ריקות לכתיבה חופשית. text – על מה כותבים. n – כמה שורות.

כשהמורה מבקשת "טבלת ערכים ושרטוט" – table ואחריו מיד graph עם אותה פונקציה ב-key (חובה: בלי key אין שרטוט בדף התשובות).
כשהמורה מבקשת "תרגילי שרטוט" – לכל תרגיל graph משלו, עם text שאומר מה לשרטט ("שרטטו את y = x² + 1") והפונקציה ב-key. graph שהתלמיד משרטט בו בלי key הוא טעות.
כשמראים לתלמיד דוגמאות כדי שיראה בעצמו (למשל כמה הזזות של פרבולה) – אחרי ההסבר graph אחד שבו כל הדוגמאות כבר מצוירות ב-fns, ו-text שאומר מה רואים. אחריו task קצר שבו התלמיד מגלה את הכלל (למשל מה הקודקוד של כל אחת).
כשתלמיד משרטט לפי הזזה בלבד (בלי טבלה) – ההוראה אומרת לו מאיפה מתחילים (הקודקוד), ולא מוסיפים טבלה.
כשמבקשים תכונות של גרף (קודקוד, מינימום/מקסימום, תחומי עלייה וירידה, חיוביות ושליליות, ציר סימטריה) – task עם סעיף לכל תכונה ותשובה מדויקת (למשל "עולה כאשר x > 0").
title – כותרת קצרה ומזמינה לדף. grade – הכיתה כפי שנאמרה ("ט׳"), או ריק. minutes – הערכת זמן. intro – משפט פתיחה קצר לתלמיד (לא חובה).`;

const S = { type: 'STRING' }, N = { type: 'NUMBER' }, I = { type: 'INTEGER' };
export const DAF_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: S, grade: S, minutes: I, intro: S,
    blocks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['part', 'explain', 'note', 'task', 'table', 'graph', 'fill', 'lines'] },
          text: S, math: S,
          items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: S, a: S }, required: ['q'] } },
          fn: S, xs: { type: 'ARRAY', items: N }, given: I,
          fns: { type: 'ARRAY', items: S }, key: { type: 'ARRAY', items: S },
          xmin: N, xmax: N, ymin: N, ymax: N, n: I
        },
        propertyOrdering: ['type', 'text', 'math', 'fn', 'xs', 'given', 'fns', 'key', 'xmin', 'xmax', 'ymin', 'ymax', 'items', 'n'],
        required: ['type']
      }
    }
  },
  propertyOrdering: ['title', 'grade', 'minutes', 'intro', 'blocks'],
  required: ['title', 'blocks']
};

export const DAF_MAX_TEXT = 4000;
export function dafPrompt(b) {
  const t = String(b.text || '').slice(0, DAF_MAX_TEXT);
  const g = b.grade ? `\n(בטופס באתר נבחרה כיתה ${String(b.grade).slice(0, 4)}, אם בתיאור לא נאמרה כיתה אחרת.)` : '';
  return `התיאור של המורה:\n"""\n${t}\n"""${g}\n\nבנו את הדף.`;
}

// תיקון של דף קיים לפי מה שהמורה מבקשת במילים שלה
export function dafEditPrompt(b) {
  const t = String(b.text || '').slice(0, DAF_MAX_TEXT);
  return `התיאור המקורי של המורה:
"""
${t}
"""

הדף שנבנה (JSON):
${JSON.stringify(b.doc)}

` +
    `עכשיו המורה מבקשת לתקן, להוסיף, לשנות או לדייק:
"""
${String(b.change || '').slice(0, 1500)}
"""

` +
    `החזירו את הדף המלא אחרי התיקון, באותו מבנה. משנים רק את מה שביקשה (ובמקום שביקשה – "אחרי", "לפני", "בסוף", "במקום"). כל שאר הבלוקים נשארים בדיוק כמו שהם, באותו סדר ובאותו נוסח, מילה במילה. ` +
    `אם ביקשה להוסיף – מוסיפים במקום ההגיוני לפי התיאור. אם ביקשה להוריד – מורידים. אם ביקשה שינוי כללי (קל יותר, קצר יותר, יותר תרגילים) – מיישמים אותו על כל הדף.`;
}

// ניקוי: רק שדות מוכרים, אורכים סבירים, ומספרים אמיתיים. ביטוי פונקציה – רק תווים של כתיב מחשב.
const FN_RE = /^[x0-9+\-*/^().\s]{1,40}$/;
const str = (s, n) => String(s == null ? '' : s).replace(/\$+/g, '').replace(/\\cdot/g, '·').replace(/\*\*/g, '').trim().slice(0, n);
const fnOk = f => { const s = String(f || '').replace(/²/g, '^2').replace(/³/g, '^3').replace(/[−–]/g, '-').replace(/\s+/g, '').replace(/^y=/, ''); return FN_RE.test(s) ? s : ''; };
const numOk = (v, d) => (typeof v === 'number' && isFinite(v) ? Math.max(-60, Math.min(60, Math.round(v))) : d);
export function tidyDaf(d) {
  const out = { title: str(d && d.title, 80) || 'דף עבודה', grade: str(d && d.grade, 8), minutes: Math.max(5, Math.min(180, +(d && d.minutes) || 0)) || 0, intro: str(d && d.intro, 300), blocks: [] };
  for (const b of ((d && d.blocks) || []).slice(0, 80)) {
    if (!b || typeof b !== 'object') continue;
    const o = { type: b.type };
    if (b.text) o.text = str(b.text, 900);
    if (b.math) o.math = str(b.math, 300);
    if (b.type === 'task' || b.type === 'fill') {
      o.items = (b.items || []).slice(0, 20).map(x => ({ q: str(x && x.q, 400), a: str(x && x.a, 200) })).filter(x => x.q);
      if (!o.items.length && !o.text) continue;
      if (b.type === 'task') o.n = Math.max(0, Math.min(8, b.n | 0));
    } else if (b.type === 'table') {
      o.fn = fnOk(b.fn); if (!o.fn) continue;
      o.xs = (b.xs || []).filter(x => typeof x === 'number' && isFinite(x)).slice(0, 13).map(x => Math.round(x * 100) / 100);
      if (o.xs.length < 2) o.xs = [-3, -2, -1, 0, 1, 2, 3];
      o.given = Math.max(0, Math.min(o.xs.length, b.given | 0));
    } else if (b.type === 'graph') {
      o.fns = (b.fns || []).map(fnOk).filter(Boolean).slice(0, 6);
      o.key = (b.key || []).map(fnOk).filter(Boolean).slice(0, 6);
      o.xmin = numOk(b.xmin, -5); o.xmax = numOk(b.xmax, 5); o.ymin = numOk(b.ymin, -5); o.ymax = numOk(b.ymax, 10);
      if (o.xmax - o.xmin < 2) { o.xmin = -5; o.xmax = 5; }
      if (o.ymax - o.ymin < 2) { o.ymin = -5; o.ymax = 10; }
    } else if (b.type === 'lines') {
      o.n = Math.max(1, Math.min(15, b.n | 0 || 3));
    } else if (!['part', 'explain', 'note'].includes(b.type) || !(o.text || o.math)) continue;
    out.blocks.push(o);
  }
  return out;
}
