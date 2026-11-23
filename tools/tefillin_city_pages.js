// יוצר את דפי "זמן הנחת תפילין <עיר>": src/pages/kodesh/tefillin/<עיר>/index.html, לכל עיר ב-CITIES של assets/kodesh-shabat.js.
// הכלי עצמו (כרטיס ההנחה, המשיכיר, השקיעה, התזכורת והמשחק) מועתק מהדף הראשי src/pages/kodesh/tefillin/index.html,
// והמנוע assets/kodesh-tefillin.js נפתח עם העיר של הדף (data-place / data-name על #tf).
// הטבלה שבתוך הדף (לגוגל ולמי שאין לו JavaScript) מחושבת כאן ליום ההרצה; בדפדפן המנוע מחשב מחדש בכל כניסה.
// העובדות המקומיות (המקום והגובה): tools/shabat_local.js.
// הרצה (פעם בכמה חודשים):  node tools/tefillin_city_pages.js   ואז  python build.py
'use strict';
process.env.TZ = 'Asia/Jerusalem';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js'), 'utf8') + ';hebcal');
const S = require(path.join(ROOT, 'assets/kodesh-shabat.js'));
const LOCAL = require('./shabat_local.js');
const CITIES = S.CITIES, HOME = '/kodesh/tefillin/', ZM = '/kodesh/zmanim/', SHABAT = S.HOME;
const OUT = path.join(ROOT, 'src/pages/kodesh/tefillin');
const NOW = new Date(); NOW.setHours(12, 0, 0, 0);

// ---- הכלי והעיצוב מהדף הראשי
const MAIN = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').split(String.fromCharCode(13)).join('');
const MAIN_META = JSON.parse(MAIN.match(/<!--meta\s*(\{[\s\S]*?\})\s*-->/)[1]);
const HEAD = MAIN_META.head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
const FOOT = MAIN_META.foot;
const TS = MAIN.indexOf('<div class="tool tf-card" id="tf">'), TE = MAIN.indexOf('<!--seo-txt-->');
if (TS < 0 || TE < 0) throw new Error('כרטיס הכלי בדף הראשי השתנה – לעדכן את tefillin_city_pages.js');
const TOOL = MAIN.slice(TS, TE).trimEnd();

// ---- חישובים (אותו חישוב כמו במנוע: משיכיר של hebcal, ו-66 דקות זמניות לפני הנץ לדעת פוסקים מסוימים בדורנו)
const fmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
const t = d => fmt.format(d);
const hdm = d => d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
const gl = c => new H.GeoLocation(c[1], c[3], c[4], 0, 'Asia/Jerusalem');
const Z = (c, d) => new H.Zmanim(gl(c), d, false);
const tod = d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
function day(c, d) {
  const z = Z(c, d), sr = z.sunrise(), ss = z.sunset(), sz = (ss - sr) / 720;
  return { d, sr, ss, msh: z.misheyakir(), msh66: new Date(sr.getTime() - 66 * sz), tz: z.tzeit(8.5), mz: sz / 60000 };
}
function year(c) {
  const out = [];
  for (let i = 0; i < 365; i++) { const d = new Date(NOW); d.setDate(d.getDate() + i); out.push(day(c, d)); }
  const by = (k, f) => out.reduce((a, b) => f(tod(b[k]), tod(a[k])) ? b : a);
  return { mshE: by('msh', (x, y) => x < y), mshL: by('msh', (x, y) => x > y), m66E: by('msh66', (x, y) => x < y), m66L: by('msh66', (x, y) => x > y),
    setE: by('ss', (x, y) => x < y), setL: by('ss', (x, y) => x > y) };
}
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const gap = (a, b) => Math.round((a - b) / 60000);

function faqLd(qa) {
  return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }) + '</script>';
}
function faqHtml(qa) {
  return '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n' +
    qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';
}
function chips(cur) {
  return '<nav class="sb-chips" aria-label="זמן הנחת תפילין בערים נוספות">' + CITIES.map(c => `<a href="${HOME}${c[0]}/"${c[0] === cur ? ' aria-current="page"' : ''}>${c[1]}</a>`).join('') + '</nav>';
}
function write(dir, meta, body) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
}
function dist(a, b) { const r = Math.PI / 180, x = (b[4] - a[4]) * r * Math.cos((a[3] + b[3]) / 2 * r), y = (b[3] - a[3]) * r; return Math.sqrt(x * x + y * y) * 6371; }

const JER = CITIES[0];
CITIES.forEach(function (c, ci) {
  const loc = c[2], L = LOCAL[c[0]];
  if (!L) throw new Error('חסרות עובדות מקומיות לעיר ' + c[0] + ' ב-tools/shabat_local.js');
  const code = (ci * 37 + 11) % 243, v = k => Math.floor(code / Math.pow(3, k)) % 3;
  const X = day(c, NOW), Y = year(c), date = hdm(NOW), dn = DAYS[NOW.getDay()];
  const msh = t(X.msh), m66 = t(X.msh66), rise = t(X.sr), set = t(X.ss), tz = t(X.tz);
  const diff = gap(X.msh, X.msh66);  // כמה דקות לפני המשיכיר הרגיל
  const jx = c[0] === JER[0] ? null : day(JER, NOW);
  const cmpTxt = jx ? `ב${JER[1]} המשיכיר באותו יום ב-<bdi>${t(jx.msh)}</bdi> והשקיעה ב-<bdi>${t(jx.ss)}</bdi>, כלומר ${loc} המשיכיר ${Math.abs(gap(X.msh, jx.msh)) < 1 ? 'באותה שעה' : (Math.abs(gap(X.msh, jx.msh)) + ' דקות ' + (X.msh < jx.msh ? 'מוקדם' : 'מאוחר') + ' יותר')} והשקיעה ${Math.abs(gap(X.ss, jx.ss)) < 1 ? 'באותה שעה' : (Math.abs(gap(X.ss, jx.ss)) + ' דקות ' + (X.ss < jx.ss ? 'מוקדם' : 'מאוחר') + ' יותר')}` : `ירושלים היא העיר שאליה מתייחסים בלוחות הארץ, ושאר הערים זזות ממנה בדקות בודדות לפי קו האורך`;
  const near = CITIES.filter(o => o[0] !== c[0]).map(o => [o, dist(c, o)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
  const nearHtml = near.map(x => `<a href="${HOME}${x[0][0]}/">זמן הנחת תפילין ${x[0][1]}</a> (כ-${Math.round(x[1])} ק״מ, משיכיר <bdi>${t(day(x[0], NOW).msh)}</bdi>)`).join(', ');

  const intro = [
    `זמן הנחת תפילין ${c[1]} משתנה כל יום. ביום ${dn}, ${date}: אפשר להניח תפילין מהמשיכיר, בשעה <bdi>${msh}</bdi>, ועד השקיעה, בשעה <bdi>${set}</bdi>. מי שנוהג לפי הדעה המוקדמת (פירוט בהמשך) יכול להתחיל כבר ב-<bdi>${m66}</bdi>. הכלי שלמעלה כבר פתוח על ${c[1]}, ומחשב את הזמנים של היום ושל כל יום.`,
    `מאיזו שעה מניחים תפילין ${loc}, ועד מתי? ב-${date} המשיכיר ${loc} הוא <bdi>${msh}</bdi>, הנץ החמה <bdi>${rise}</bdi> והשקיעה <bdi>${set}</bdi>. כלומר אפשר להניח מ-<bdi>${msh}</bdi> ועד <bdi>${set}</bdi>. הכלי למעלה פתוח על ${c[1]} ומראה גם כמה זמן נשאר עד השקיעה.`,
    `בדף הזה זמן הנחת תפילין ${c[1]} להיום: משיכיר <bdi>${msh}</bdi>, הנץ <bdi>${rise}</bdi>, שקיעה <bdi>${set}</bdi> (יום ${dn}, ${date}). התאריך מתעדכן בכל כניסה, והכלי למעלה, שכבר מכוון ל${c[1]}, גם סופר לאחור עד השקיעה ומזכיר להניח לפני שמפספסים.`
  ][v(0)];
  const mshP = [
    `משיכיר הוא הזמן שבו אפשר להכיר אדם מוכר ממרחק קצר, ובו מתחיל הזמן להניח תפילין וללבוש ציצית. החישוב ${loc} מבוסס על מיקום השמש מתחת לאופק, ולכן הוא משתנה כל יום. ב-${date} הוא <bdi>${msh}</bdi>. במשך השנה הקרובה המשיכיר ${loc} נע בין <bdi>${t(Y.mshE.msh)}</bdi> (${hdm(Y.mshE.d)}) לבין <bdi>${t(Y.mshL.msh)}</bdi> (${hdm(Y.mshL.d)}).`,
    `אי אפשר להניח תפילין לפני המשיכיר, והוא זז במשך השנה: ${loc} הוא מגיע הכי מוקדם ב-${hdm(Y.mshE.d)}, בשעה <bdi>${t(Y.mshE.msh)}</bdi>, והכי מאוחר ב-${hdm(Y.mshL.d)}, בשעה <bdi>${t(Y.mshL.msh)}</bdi>. ב-${date} זה <bdi>${msh}</bdi>. הדף מחשב את זה לבד לכל יום, כך שלא צריך לחפש בלוח.`,
    `המשיכיר ${loc} ב-${date} הוא <bdi>${msh}</bdi>. הוא נע בין <bdi>${t(Y.mshE.msh)}</bdi> בקיץ (${hdm(Y.mshE.d)}) ל-<bdi>${t(Y.mshL.msh)}</bdi> בחורף (${hdm(Y.mshL.d)}), ולכן מי שמניח כל בוקר באותה שעה צריך לשנות אותה במהלך השנה.`
  ][v(1)];
  const opP = [
    `יש פוסקים בדורנו שמחשבים את תחילת הזמן מוקדם יותר: 66 דקות זמניות לפני הנץ החמה, כלומר עלות השחר (72 דקות) ועוד 6 דקות. ${loc} ב-${date} זה <bdi>${m66}</bdi>, כ-${Math.abs(diff)} דקות לפני המשיכיר הרגיל. זו דעה של פוסקים מסוימים בדורנו, ולא כל הנוהגים סומכים עליה. מי שרוצה לנהוג כך, או שיש לו שאלה, שישאל את הרב שלו.`,
    `הכלי מראה בנפרד גם "משיכיר לדעת פוסקים מסוימים בדורנו": 66 דקות זמניות לפני הנץ (עלות 72 דקות ועוד 6). ${loc} ב-${date} זה <bdi>${m66}</bdi>. דקה זמנית היא חלק מ-720 של היום מהנץ עד השקיעה, ולכן ב${c[1]} היא היום <bdi>${X.mz.toFixed(2)}</bdi> דקות רגילות. ההכרעה למי שמחזיק בדעה הזאת היא של הרב שלו.`,
    `לצד המשיכיר הרגיל, הדף מציג זמן מוקדם יותר לדעת פוסקים מסוימים בדורנו: 66 דקות זמניות לפני הנץ. ${loc} ב-${date}: <bdi>${m66}</bdi>. במשך השנה הוא נע בין <bdi>${t(Y.m66E.msh66)}</bdi> ל-<bdi>${t(Y.m66L.msh66)}</bdi>. זו דעה שלא כולם נוהגים לפיה, ולכן ההחלטה אצל הרב של כל אחד.`
  ][v(2)];
  const endP = [
    `מניחים תפילין עד השקיעה. ${loc} ב-${date} השקיעה בשעה <bdi>${set}</bdi>, וצאת הכוכבים <bdi>${tz}</bdi>. במשך השנה השקיעה נעה בין <bdi>${t(Y.setE.ss)}</bdi> (${hdm(Y.setE.d)}) ל-<bdi>${t(Y.setL.ss)}</bdi> (${hdm(Y.setL.d)}). מי שהגיע אחרי השקיעה ולא הניח, שישאל רב. תזכורת לפני השקיעה אפשר להגדיר בכלי למעלה, והיא מחושבת לפי ${c[1]}.`,
    `הזמן נגמר בשקיעה, ולכן בחורף, כשהשקיעה מוקדמת, כדאי להזכיר לעצמך מראש. ${loc} ב-${date} השקיעה <bdi>${set}</bdi>. השנה היא נעה בין <bdi>${t(Y.setE.ss)}</bdi> ל-<bdi>${t(Y.setL.ss)}</bdi>. הכלי למעלה סופר את הזמן שנשאר, ושולח תזכורת לפני השקיעה של ${c[1]}.`,
    `עד מתי מניחים תפילין ${loc}? עד השקיעה, שב-${date} היא בשעה <bdi>${set}</bdi>. אחריה, ועד צאת הכוכבים (<bdi>${tz}</bdi>), אפשר להניח רק בדיעבד ובלי ברכה, ועדיף לשאול רב. הכלי למעלה מציג את הזמן שנשאר היום.`
  ][v(3)];
  const calcP = [
    'החישוב אסטרונומי, בטלפון: לפי קו הרוחב, קו האורך והתאריך מחשבים את מקום השמש, בגובה פני הים. המשיכיר והשקיעה זהים לאלה שבדף זמני היום באתר. לזמנים להלכה במקום מסוים שואלים את הרב.',
    'הכול מחושב בדפדפן לפי מיקום העיר והתאריך, בלי שרת ובלי שהמיקום יישלח לשום מקום. בין לוחות שונים יש לפעמים הבדל של דקה או שתיים, ולכן מי שנוהג בהידור מקדים מעט. לשאלה להלכה, שואלים את הרב.',
    'אותה נוסחה אסטרונומית שבה משתמשים רוב הלוחות בארץ, בגובה פני הים. מי שגר במקום גבוה רואה את השמש עוד כמה דקות, ולכן בשקיעה יש לו מעט יותר זמן. כל אחד נוהג לפי מנהגו ורבו.'
  ][v(4)];

  const qa = [
    [`מאיזו שעה מניחים תפילין ${loc}?`, `ב-${date} אפשר להניח תפילין ${loc} מהמשיכיר, בשעה ${msh}. לדעת פוסקים מסוימים בדורנו, שמחשבים 66 דקות זמניות לפני הנץ, מ-${m66}. הדף מחשב את זה לכל יום.`],
    [`עד מתי מניחים תפילין ${loc} היום?`, `עד השקיעה. ב-${date} השקיעה ${loc} ב-${set}. הכלי למעלה מראה כמה זמן נשאר.`],
    [`מה זמן הנחת תפילין ${loc} בבוקר?`, `בבוקר מתחילים מהמשיכיר: ב-${date} ${msh}, כשעה וקצת לפני הנץ החמה שבשעה ${rise}.`],
    [`מה זה משיכיר?`, `הזמן שבו אפשר להכיר אדם מוכר ממרחק קצר, ובו מתחיל זמן התפילין והציצית. ${loc} ב-${date}: ${msh}.`],
    [`למה יש שני זמנים למשיכיר בדף?`, `הראשון הוא המשיכיר הרגיל, והשני הוא זמן מוקדם יותר לדעת פוסקים מסוימים בדורנו (66 דקות זמניות לפני הנץ). מי שרוצה לנהוג לפי הדעה השנייה, שישאל את הרב שלו.`],
    [`אפשר לקבל תזכורת להנחת תפילין ${loc}?`, `כן. בכלי למעלה מגדירים תזכורת לפני השקיעה של ${c[1]}, או קובץ יומן לחצי שנה. הכול בחינם, בלי הרשמה ובלי פרסומות.`]
  ];
  const meta = {
    site: 'kodesh', nav: 'rabanim', tool: 'tefillin_ir',
    title: `זמן הנחת תפילין ${c[1]} – משיכיר ושקיעה היום | כלי קודש`,
    description: `זמן הנחת תפילין ${c[1]} להיום: מאיזו שעה (משיכיר) ועד מתי (שקיעה), עם ספירה לאחור, תזכורת לפני השקיעה וסדר הנחת תפילין מלא. בחינם, בלי הרשמה.`,
    og_title: `זמן הנחת תפילין ${c[1]}`,
    priority: '0.6',
    crumbs: [['סדר הנחת תפילין', HOME], [c[1], null]],
    head: HEAD + faqLd(qa), foot: FOOT
  };
  const tool = TOOL.replace('<div class="tool tf-card" id="tf">', `<div class="tool tf-card" id="tf" data-place="${c[3]},${c[4]}" data-name="${c[1]}">`);
  const body = `<header class="k-hero">
  <h1>זמן הנחת תפילין ${c[1]}: מאיזו שעה ועד מתי</h1>
  <p class="sub">משיכיר ושקיעה ${loc} להיום, כמה זמן נשאר להניח, תזכורת שלא מפספסת יום, והסדר המלא של ההנחה.</p>
</header>
${tool}
<section class="k-sec" aria-labelledby="tf-other-h">
  <h2 id="tf-other-h">זמן הנחת תפילין בערים נוספות</h2>
  ${chips(c[0])}
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">${['זמן הנחת תפילין ' + c[1] + ' היום', 'מתי מניחים תפילין ' + loc, 'זמן תפילין ' + c[1] + ': משיכיר ושקיעה'][v(0)]}</h2>
  <p>${intro}</p>
  <h3>${['משיכיר ' + loc + ': מתי מתחיל הזמן', 'מאיזו שעה אפשר להניח ' + loc, 'המשיכיר ' + loc + ' במשך השנה'][v(1)]}</h3>
  <p>${mshP}</p>
  <h3>${['משיכיר לדעת פוסקים מסוימים בדורנו', 'הדעה המוקדמת: 66 דקות זמניות לפני הנץ', 'זמן מוקדם יותר לדעת פוסקים בדורנו'][v(2)]}</h3>
  <p>${opP}</p>
  <h3>${['עד מתי מניחים תפילין ' + loc, 'שקיעה ' + loc + ' ועד מתי להניח', 'הזמן האחרון להנחת תפילין ' + loc][v(3)]}</h3>
  <p>${endP}</p>
  <h3>${c[1]}: המקום</h3>
  <p>${L.geo.replace(/s*[^.]*צאת השבת[^.]*./g,"").trim()}</p>
  <h3>${c[1]} מול ירושלים והערים הקרובות</h3>
  <p>${cmpTxt}. הערים הקרובות: ${nearHtml}.</p>
  <h3>${['איך מחושבים הזמנים', 'מאיפה הזמנים', 'דיוק הזמנים'][v(4)]}</h3>
  <p>${calcP} ${[`עוד: <a href="${HOME}">סדר הנחת תפילין המלא, עם הברכות והפרשיות</a>, <a href="${ZM}${c[0]}/">כל זמני היום ${loc}</a>, ו<a href="${SHABAT}${c[0]}/">כניסת שבת ${loc}</a>. הכול בחינם, בלי הרשמה ובלי פרסומות.`,
    `לסדר ההנחה עצמו: <a href="${HOME}">ברכות התפילין, ארבע הפרשיות וקריאת שמע</a>. לזמנים נוספים: <a href="${ZM}${c[0]}/">זמני היום ${loc}</a>. ולשבת: <a href="${SHABAT}${c[0]}/">מתי נכנסת השבת ${loc}</a>. בחינם ובלי הרשמה.`,
    `קשור: <a href="${HOME}">סדר הנחת תפילין שלב אחרי שלב</a>, <a href="${ZM}${c[0]}/">זמני היום ${loc}</a>, <a href="${SHABAT}${c[0]}/">זמני שבת ${loc}</a>. אין פרסומות ואין צורך להירשם.`][v(2)]}</p>
</section>
${faqHtml(qa)}
<!--/seo-txt-->
`;
  write(path.join(OUT, c[0]), meta, body);
});
console.log('נכתבו', CITIES.length, 'דפים אל', path.relative(ROOT, OUT));
