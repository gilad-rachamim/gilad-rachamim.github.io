// דף פרשת השבוע באנגלית לארה"ב: src/pages/kodesh/parasha/en/index.html
// ("torah portion this week" 10K–100K חיפושים בחודש בארה"ב; "parsha this week" 1K–10K).
// הרצה: node tools/parasha_en.js  ואז  python build.py
// החישוב: assets/parasha-en.js (hebcal-core getSedra). כאן הוא רץ פעם אחת בזמן הבנייה כדי שבדף תהיה טבלה קבועה לגוגל
// ולמי שאין לו JavaScript; בדפדפן אותו קוד מחשב מחדש לפי התאריך של היום.
// טווחי הפסוקים: ספריא, api/v2/raw/index/<ספר> → alt_structs.Parasha (tools/data/parshiot-sefaria.json, לפי סדר hebcal).
// מילות החיפוש והמתחרים: ~/.claude/state/kelim-seo/runs/2026-11-22-parasha-en/
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src/pages/kodesh/parasha/en');
const HEB = '/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js';
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, HEB.slice(1)), 'utf8') + ';hebcal');
const REFS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data/parshiot-sefaria.json'), 'utf8'));
const C = require(path.join(ROOT, 'assets/parasha-en.js')).core(H, REFS);
if (C.P.length !== 54 || REFS.length !== 54) throw new Error('expected 54 portions');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const he = s => s ? ` <span lang="he" dir="rtl">${esc(s)}</span>` : '';
const fD = (d, o) => d.toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, o || { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
// greg() מחזיר חצות מקומית; מעבירים ל-UTC כדי שהתאריך לא יזוז בשרת הבנייה
const U = d => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

const today = new Date(), sat0 = C.satOf(today), hy = sat0.getFullYear();
const list = C.weeks(today, 9), w = list[0];
const row = (x, now) => {
  const d = x.dia, i = x.il;
  return `<tr${now ? ' class="now"' : ''}><th scope="row">${fD(U(x.greg), { month: 'short', day: 'numeric', year: 'numeric' })}</th><td><b>${esc(d.en)}</b>${he(d.he)}</td><td>${d.chag ? 'Holiday reading' : esc(d.refs.map(r => C.verses(r.ref)).join('; '))}</td><td>${x.same ? '<span class="pa-same">same</span>' : esc(i.en)}</td></tr>`;
};
const yearRows = C.year(hy);
const yStart = new H.HDate(1, 7, hy).greg().getFullYear();
const d0 = w.dia;
const hero = `<p class="pa-when">Shabbat ${fD(U(w.greg), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · ${esc(w.sat.render('en'))}</p>` +
  `<p class="pa-name"><b>${d0.chag ? '' : 'Parashat '}${esc(d0.en)}</b>${he(d0.he)}</p>` +
  (d0.chag ? '' : `<p class="pa-book">${esc(d0.refs[0].book)}</p><p class="pa-read">${d0.refs.map(r => `<a href="${C.sefaria(r.ref)}" target="_blank" rel="noopener">Read ${esc(r.name)} · ${esc(C.verses(r.ref))}</a>`).join('')}</p>`);

// רשימת 54 הפרשות
const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];
const count = BOOKS.map(b => REFS.filter(r => r[0] === b).length);
const seen = {};
yearRows.forEach(x => { if (!x.dia.chag) x.dia.refs.forEach(r => { if (!seen[r.i]) seen[r.i] = x.greg; }); });
const allRows = C.P.map((n, i) => `<tr><td>${i + 1}</td><th scope="row">${esc(n)}${he(C.heName(n))}</th><td>${REFS[i][0]}</td><td><a href="${C.sefaria(REFS[i][1])}" target="_blank" rel="noopener">${esc(C.verses(REFS[i][1].replace(REFS[i][0] + ' ', '')))}</a></td>` +
  (i === 53 ? '<td>Simchat Torah</td>' : `<td data-i="${i}">${seen[i] ? fD(U(seen[i]), { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>`) + '</tr>').join('\n');
const doubles = [['Vayakhel', 'Pekudei'], ['Tazria', 'Metzora'], ['Achrei Mot', 'Kedoshim'], ['Behar', 'Bechukotai'], ['Chukat', 'Balak'], ['Matot', 'Masei'], ['Nitzavim', 'Vayeilech']];
const nDoubleThisYear = yearRows.filter(x => !x.dia.chag && x.dia.refs.length > 1).length;
const nDiff = yearRows.filter(x => !x.same).length;

const L = (h, t) => `<a href="${h}">${t}</a>`;
const qa = [
  ['What parsha are we in this week?', 'The portion for this coming Shabbat is shown at the top of this page, calculated for today\'s date: its English and Hebrew name, the book and the exact verses, with a link to read it. Outside Israel and in Israel the portion is usually the same; in the weeks when they differ, the page shows both.'],
  ['What is today\'s daily Torah portion?', 'The weekly portion is read in full in the synagogue on Shabbat morning. On Shabbat afternoon and on Monday and Thursday mornings, the first section of the next Shabbat\'s portion is read. Many people also study the weekly portion a little each day during the week, so that by Shabbat they have read all of it; one way is to read one of its seven sections (aliyot) each day.'],
  ['What is my Torah portion?', 'Usually this means the portion of your bar or bat mitzvah, or of the week you were born. Enter a date of birth in the "What is my Torah portion?" calculator on this page: it finds the Hebrew birthday, the bar mitzvah date (13 years) or bat mitzvah date (12 years) on the Hebrew calendar, and the portion read on the first Shabbat on or after it.'],
  ['What is the Torah portion?', 'The Torah, the Five Books of Moses, is divided into 54 portions (parshiot; one is a parsha or parashah). One portion is read each Shabbat in order, so the whole Torah is read every year. Genesis has ' + count[0] + ' portions, Exodus ' + count[1] + ', Leviticus ' + count[2] + ', Numbers ' + count[3] + ' and Deuteronomy ' + count[4] + '.'],
  ['Why are some weeks a double portion?', 'There are 54 portions but fewer Shabbatot available in most years, because some Shabbatot fall on holidays that have their own reading. So in some years up to seven pairs are read together: ' + doubles.map(p => p.join('-')).join(', ') + '. In a Jewish leap year, which has an extra month, most of them are read separately. In ' + hy + ' there are ' + nDoubleThisYear + ' double-portion weeks.'],
  ['Why is the Torah portion different in Israel?', 'Outside Israel, the last day of Pesach and the second day of Shavuot are holidays, and when one of them falls on Shabbat, a holiday reading replaces the weekly portion. In Israel that day is an ordinary Shabbat, so Israel reads the next portion and is one week ahead. A few weeks later the diaspora joins two portions together and the two calendars line up again. In ' + hy + ' they differ for ' + nDiff + ' weeks.'],
  ['When does the Torah reading start again?', 'On Simchat Torah the last portion, V\'Zot HaBerachah, is read, and immediately afterward the Torah is started again from the beginning of Genesis. Parashat Bereshit is then read on the following Shabbat. V\'Zot HaBerachah is the only portion that is not read on a Shabbat.'],
  ['What is a haftarah?', 'The haftarah is a reading from the books of the Prophets that follows the Torah reading on Shabbat and holidays. Each portion has its own haftarah, usually connected to it in theme; on some special Shabbatot a different haftarah is read.'],
  ['How is the bar mitzvah date calculated?', 'By the Hebrew calendar: a boy becomes bar mitzvah on his Hebrew birthday when he turns 13, and a girl becomes bat mitzvah on her Hebrew birthday when she turns 12. The Hebrew day begins at nightfall, so a baby born after sunset has the next Hebrew date; tick "born after sunset" in the calculator. If the Hebrew birthday is in Adar or on the 30th of a month, the calculator notes it; ask your rabbi.'],
  ['Which calendar does this page use?', 'The fixed Hebrew calendar, calculated in your browser with the open-source hebcal library, for the diaspora (the default here, for the USA) or for Israel. The verse ranges and the links to read each portion come from Sefaria.'],
  ['Is this page free?', 'Yes. This week\'s portion, the year table, the list of all 54 portions and the bar mitzvah calculator are free, with no sign-up and no ads. Nothing you enter is sent anywhere.']
];
const faqLd = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }) + '</script>';
const faqHtml = '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">Questions about the weekly Torah portion</h2>\n' +
  qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';

const meta = {
  site: 'kodesh', nav: 'rabanim', lang: 'en', crumb_root: 'Jewish tools', tool: 'parasha_en', no_hub: true,
  title: 'Torah Portion This Week: Parsha of the Week and Calendar',
  description: 'Torah portion this week: the parsha in English and Hebrew with its verses, the coming weeks, the year calendar for the USA and Israel, and a bar mitzvah finder.',
  og_title: 'Torah Portion This Week – parsha calendar and bar mitzvah portion',
  priority: '0.8',
  crumbs: [['Torah portion this week', null]],
  head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/parasha-en.css">' + faqLd,
  foot: '<script>window.PA_REFS=' + JSON.stringify(REFS) + ';</script><script src="' + HEB + '" data-hebcal defer></script><script src="/assets/parasha-en.js" defer></script>'
};

const thead = '<thead><tr><th scope="col">Shabbat</th><th scope="col">Torah portion</th><th scope="col">Verses</th><th scope="col" class="pa-other">In Israel</th></tr></thead>';
const body = `<header class="k-hero">
  <h1>Torah Portion This Week: the Parsha of the Week</h1>
  <p class="sub">This Shabbat's Torah portion with its Hebrew name, book and verses, the coming weeks, the whole year's calendar for the USA and for Israel, and "What is my Torah portion?" for a bar or bat mitzvah.</p>
</header>

<div class="tool" id="pa">
  <h2>This week's Torah portion</h2>
  <div class="pa-loc no-print" id="pa-loc" role="group" aria-label="Where you are">
    <button type="button" data-il="0" aria-pressed="true">Outside Israel (USA)</button>
    <button type="button" data-il="1" aria-pressed="false">Israel</button>
  </div>
  <div class="pa-hero" id="pa-hero" aria-live="polite">${hero}</div>
  <p class="pa-where" id="pa-where">Showing the reading for outside Israel (USA and the diaspora).</p>
  <div class="pa-wrap">
  <table class="iv-tbl pa-tbl">
    <caption class="pa-cap">The coming weeks</caption>
    ${thead}
    <tbody id="pa-next">
${list.slice(1).map(x => row(x, false)).join('\n')}
    </tbody>
  </table>
  </div>
  <div class="share-row no-print">
    <button class="btn btn-gold btn-sm" type="button" id="pa-copy">Copy the coming portions</button>
    <button class="btn btn-line btn-sm" type="button" onclick="window.print()">Print</button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="This week's Torah portion and the full parsha calendar. Free, no ads:" target="_blank" rel="noopener">Share</a>
  </div>
</div>

<section class="k-sec" aria-labelledby="pb-h" id="my-portion">
  <h2 id="pb-h">What is my Torah portion? Bar and bat mitzvah portion finder</h2>
  <p class="lead2">Enter a date of birth to find the Hebrew birthday, the Torah portion of the birth week, and the bar mitzvah (13) or bat mitzvah (12) date with its Torah portion.</p>
  <div class="pb-form">
    <label for="pb-d">Date of birth<input type="date" id="pb-d" min="1900-01-01" max="2099-12-31"></label>
    <fieldset class="pb-kind"><legend>Bar or bat mitzvah</legend>
      <label><input type="radio" name="pb-k" id="pb-boy" checked> Boy – bar mitzvah at 13</label>
      <label><input type="radio" name="pb-k" id="pb-girl"> Girl – bat mitzvah at 12</label>
    </fieldset>
    <label class="pb-chk"><input type="checkbox" id="pb-sun"> Born after sunset (the Hebrew date had already changed)</label>
    <button class="btn btn-gold" type="button" id="pb-go">Find my Torah portion</button>
  </div>
  <div class="pb-out" id="pb-out" aria-live="polite"></div>
</section>

<section class="k-sec" aria-labelledby="pa-y-h" id="calendar">
  <h2 id="pa-y-h">Torah portion calendar for the whole year</h2>
  <p class="lead2">Every Shabbat of the Jewish year with its portion and verses. The last column shows Israel's portion in the weeks when it is different.</p>
  <label class="pa-ysel no-print" for="pa-y">Jewish year<select id="pa-y"><option value="${hy}" selected>${hy} (${yStart}–${yStart + 1})</option></select></label>
  <div class="pa-wrap">
  <table class="iv-tbl pa-tbl">
    <caption class="pa-cap" id="pa-ycap">Torah portions for the Jewish year ${hy} (${yStart}–${yStart + 1}), outside Israel (USA and the diaspora)</caption>
    ${thead}
    <tbody id="pa-yrows">
${yearRows.map(x => row(x, x.sat.abs() === sat0.abs())).join('\n')}
    </tbody>
  </table>
  </div>
</section>

<section class="k-sec" aria-labelledby="pa-all-h" id="all-portions">
  <h2 id="pa-all-h">All 54 Torah portions in order</h2>
  <p class="lead2">The name of each portion in English and Hebrew, its book and verses (tap to read it on Sefaria), and the Shabbat it is read this year.</p>
  <div class="pa-wrap">
  <table class="iv-tbl pa-tbl" id="pa-all">
    <caption class="pa-cap" id="pa-allcap">The 54 Torah portions, with the Shabbat each is read in ${hy} (outside Israel (USA and the diaspora))</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Portion</th><th scope="col">Book</th><th scope="col">Verses</th><th scope="col">This year</th></tr></thead>
    <tbody>
${allRows}
    </tbody>
  </table>
  </div>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">The weekly Torah portion, explained</h2>
  <p>Every Shabbat morning, in synagogues all over the world, a portion of the Torah is read aloud from a handwritten scroll. The Five Books of Moses are divided into 54 portions, called parshiot (one is a parsha, parashah or sidra), and they are read in order through the year, so that the whole Torah is completed every year. The portion for each week is known in advance from the Hebrew calendar, which is why the "parsha of the week" is printed in Jewish calendars, mentioned in the rabbi's sermon and studied at home before Shabbat.</p>
  <h3>How the portion of the week is found</h3>
  <p>This page calculates the portion from today's date, in your own browser. It finds the coming Shabbat, looks up its Hebrew date, and works out which portion falls on it in this Jewish year, including double portions and Shabbatot that fall on a holiday. Nothing needs to be updated by hand, and the page is right for any week of any year: choose a year in the calendar table to see all of its Shabbatot.</p>
  <h3>The name of each portion</h3>
  <p>Each portion is named after one of its first words. The first portion, Bereshit, is named after the first word of the Torah, "in the beginning"; Noach after Noah; Lech-Lecha after God's call to Abraham, "go forth". English spellings vary (Bereshit or Bereishit, Vayera or Vayeira), so the Hebrew name is shown beside each one.</p>
  <h3>The five books and their portions</h3>
  <p>Genesis (Bereshit) has ${count[0]} portions, Exodus (Shemot) ${count[1]}, Leviticus (Vayikra) ${count[2]}, Numbers (Bamidbar) ${count[3]} and Deuteronomy (Devarim) ${count[4]}. The cycle begins after Simchat Torah, in October, with Genesis, and reaches Deuteronomy in the summer. The book of each week is shown under the portion's name, and the table of all 54 portions links every one to its full text.</p>
  <h3>Double portions and leap years</h3>
  <p>A regular Jewish year does not have enough free Shabbatot for 54 separate readings, so some neighboring portions are joined and read on the same Shabbat. The seven pairs that can be joined are ${doubles.map(p => p.join('-')).join(', ')}. A Jewish leap year adds a second month of Adar, about four more Shabbatot, and most of the pairs are read separately. The page joins them exactly as the calendar requires for each year.</p>
  <h3>Israel and the diaspora</h3>
  <p>Outside Israel some holidays last one more day. When that extra day, the last day of Pesach or the second day of Shavuot, falls on Shabbat, the diaspora reads the holiday portion that Shabbat, while Israel goes on to the next weekly portion. For a few weeks Israel is one portion ahead, until the diaspora reads a double portion and the two line up. Choose "Outside Israel" or "Israel" above; the choice is remembered on this device. Travelers usually follow the reading of the place where they are for Shabbat.</p>
  <h3>Holidays that replace the weekly reading</h3>
  <p>When a holiday such as Rosh Hashanah, Yom Kippur, Sukkot or Pesach falls on Shabbat, or on the Shabbat of the intermediate days, the regular portion is not read that week. Instead there is a special reading for the holiday, and the weekly portion moves to the next Shabbat. The tables mark these weeks as a holiday reading.</p>
  <h3>Your bar or bat mitzvah portion</h3>
  <p>A boy becomes bar mitzvah at 13 and a girl becomes bat mitzvah at 12, on the Hebrew birthday. Because the Hebrew and the civil calendars do not line up, the Hebrew birthday moves on the civil calendar every year. The calculator finds the Hebrew date of birth, the date of the bar or bat mitzvah, and the portion read on the first Shabbat on or after it, often the Shabbat on which the bar mitzvah boy is called to the Torah. Questions about which date to keep, especially for a birthday in Adar or on the 30th of a month, are for your rabbi.</p>
  <h3>Reading and studying the portion</h3>
  <p>Each portion is divided into seven sections, called aliyot, for the seven people called up to the Torah on Shabbat. Many people read the portion during the week, a section a day, together with a commentary. The links on this page open the portion on Sefaria, with the Hebrew text beside an English translation, so you can read it before Shabbat or follow along in synagogue.</p>
  <h3>More in English</h3>
  <p>Candle lighting and Havdalah for your city: ${L('/kodesh/shabat/en/', 'Shabbat times')}. Daily halachic times, from dawn to nightfall: ${L('/kodesh/zmanim/en/', 'zmanim for today')}. The ${L('/kodesh/luach-ivri/en/', 'Hebrew calendar')} and the ${L('/kodesh/taarich-ivri/en/', 'Hebrew date converter')} show any Jewish date. To read the prayers in Hebrew with transliteration: ${L('/kodesh/birkat-hamazon/en/', 'Birkat Hamazon')} and ${L('/kodesh/shema-israel/en/', 'the Shema')}. Learning to read Hebrew? Start with the ${L('/kodesh/alefbet/en/', 'Hebrew alphabet')}, and add up the letters of any word with the ${L('/kodesh/gimatria/en/', 'gematria calculator')}. For people converting to Judaism in Israel: ${L('/kodesh/giur/en/', 'preparing for conversion')}.</p>
</section>
${faqHtml}
<!--/seo-txt-->
`;
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
console.log('wrote', path.relative(ROOT, path.join(DIR, 'index.html')), 'weeks', yearRows.length, 'diff', nDiff, 'double', nDoubleThisYear, 'this week', d0.en);
