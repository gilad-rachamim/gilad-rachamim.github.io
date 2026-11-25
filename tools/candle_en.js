// דף זמני הדלקת נרות לשנה שלמה באנגלית: src/pages/kodesh/shabat/en/candle-lighting/index.html
// ("candle lighting times" בארה"ב; בכוונה דף נפרד מ-/kodesh/shabat/en/: שם השבוע הזה, כאן כל ההדלקות של השנה + הברכה לכל אחת).
// הרצה: node tools/candle_en.js  ואז  python build.py
// החישוב: assets/candle-en.js (hebcal-core), הערים: assets/shabbat-en.js. לוח ניו יורק לשנה נכתב כאן בזמן הבנייה לגוגל.
// הברכות: עברית – Siddur Sefard, Torat Emet 357 (נחלת הכלל, ספריא); אנגלית – Metsudah Siddur (CC-BY) ו-Metsudah Machzor Interlinear (CC-BY).
// מילות החיפוש והמתחרים: ~/.claude/state/kelim-seo/runs/2026-11-22-candle-en/
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src/pages/kodesh/shabat/en/candle-lighting');
const HEB = '/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js';
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, HEB.slice(1)), 'utf8') + ';hebcal');
const S = require(path.join(ROOT, 'assets/shabbat-en.js'));
const C = require(path.join(ROOT, 'assets/candle-en.js')).core(H);

const ny = S.CITIES[0];
const p = { name: ny[1] + ', ' + ny[2], lat: ny[3], lon: ny[4], tz: ny[5] };
const list = C.lightings(p, 18, new Date(), 366);
const T = C.fmt(p.tz, { hour: 'numeric', minute: '2-digit' }), D = C.fmt(p.tz, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const BL = { shabbat: 'Shabbat', yt: 'Yom Tov', 'shabbat-yt': 'Shabbat and Yom Tov', yk: 'Yom Kippur', 'shabbat-yk': 'Shabbat and Yom Kippur', hanukkah: 'Hanukkah' };
function row(o) {
  const b = o.bless === 'hanukkah' ? '<a href="/kodesh/chanuka/en/">Hanukkah blessings</a>' : '<a href="#bl-' + o.bless + '">' + BL[o.bless] + '</a>' + (o.she ? ' + <a href="#bl-she">Shehecheyanu</a>' : '');
  const note = o.kind === 'hanukkah' ? (o.fri ? 'Before the Shabbat candles' : (o.after ? 'After Shabbat ends' : 'At nightfall')) : (o.after ? 'After nightfall, from an existing flame' : o.flame ? 'Before sunset, from an existing flame' : 'Before sunset');
  return '<tr class="cl-' + o.kind + '"><th scope="row">' + o.name + '</th><td>' + D.format(o.t) + '</td><td><b>' + (o.after && o.kind !== 'hanukkah' ? 'after ' : '') + T.format(o.t) + '</b><span class="cl-note">' + note + '</span></td><td>' + b + '</td></tr>';
}
const rows = list.map(row).join('\n');
const n = list.filter(o => o.kind !== 'hanukkah')[0];
const next = '<p class="cl-where">' + p.name + ' · next candle lighting</p><p class="cl-big"><b>' + (n.after ? 'after ' : '') + T.format(n.t) + '</b><span>' + n.name + ' – ' + D.format(n.t) + '</span></p><p class="cl-bl">Blessing: <a href="#bl-' + n.bless + '">' + BL[n.bless] + '</a>' + (n.she ? ' + <a href="#bl-she">Shehecheyanu</a>' : '') + '</p>';
const holidays = [...new Set(list.filter(o => o.kind === 'yt' || o.kind === 'yk').map(o => o.name.replace(/ · Shabbat| \(on Shabbat\)/, '').replace(/ (I|II|VII|VIII)$/, '')))];
const opts = S.CITIES.map(c => '<option value="' + c[0] + '">' + c[1] + ', ' + c[2] + '</option>').join('');
const cityLinks = S.CITIES.map(c => '<a href="?city=' + c[0] + '">' + c[1] + (c[0] === 'washington-dc' ? ' DC' : '') + '</a>').join(', ');

// ---- הברכות (עברית מ-Torat Emet; השם בקיצור ה') ----
const HE_PRE = 'בָּרוּךְ אַתָּה ה\' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לְהַדְלִיק נֵר שֶׁל ';
const TR_PRE = 'Baruch ata A-donai Eloheinu melech ha\'olam, asher kid\'shanu b\'mitzvotav v\'tzivanu l\'hadlik ner shel ';
const EN_PRE = 'Blessed are You, the Lord our God, King of the Universe, Who sanctified us with His commandments and commanded us to kindle ';
const BLESS = [
  ['shabbat', 'On Friday night (Shabbat)', HE_PRE + 'שַׁבָּת:', TR_PRE + 'Shabbat.', EN_PRE + 'the Shabbat light.', 'metsudah'],
  ['yt', 'On a holiday night (Yom Tov)', HE_PRE + 'יוֹם טוֹב:', TR_PRE + 'Yom Tov.', EN_PRE + 'the Yom Tov light.', 'metsudah'],
  ['shabbat-yt', 'When Yom Tov falls on Shabbat', HE_PRE + 'שַׁבָּת וְשֶׁל יוֹם טוֹב:', TR_PRE + 'Shabbat v\'shel Yom Tov.', EN_PRE + 'the Shabbat light and Yom Tov light.', 'metsudah'],
  ['yk', 'On the eve of Yom Kippur', HE_PRE + 'יוֹם הַכִּפּוּרִים:', TR_PRE + 'Yom haKippurim.', EN_PRE + 'the light of the Day of Atonement.', 'machzor'],
  ['shabbat-yk', 'When Yom Kippur falls on Shabbat', HE_PRE + 'שַׁבָּת וְשֶׁל יוֹם הַכִּפּוּרִים:', TR_PRE + 'Shabbat v\'shel Yom haKippurim.', EN_PRE + 'the light of the Sabbath and [the light] of the Day of Atonement.', 'machzor'],
  ['she', 'Shehecheyanu – after the candle blessing on holiday nights', 'בָּרוּךְ אַתָּה ה\' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה:', 'Baruch ata A-donai Eloheinu melech ha\'olam, shehecheyanu v\'kiy\'manu v\'higi\'anu laz\'man hazeh.', 'Blessed are You, the Lord our God, King of the Universe, Who has kept us alive and sustained us and brought us to this season.', 'metsudah']
];
const all = JSON.stringify(BLESS);
if (/יְהֹוָה|יהוה|yehov|jehov/i.test(all)) throw new Error('the full Name must not appear');
const blessHtml = BLESS.map(([id, who, he, tr, en]) => `<div class="kd-b" id="bl-${id}">
<p class="kd-who">${who}</p>
<p class="kd-he" lang="he" dir="rtl">${he}</p>
<p class="kd-tr"><span class="kd-k">Say:</span> ${tr}</p>
<p class="kd-en"><span class="kd-k">Meaning:</span> ${en}</p>
</div>`).join('\n');

const qa = [
  ['What time is candle lighting tonight?', 'Pick your city at the top of this page (or press "My location"): the box shows the next candle lighting time, and the table lists every lighting for the coming twelve months. The default is 18 minutes before sunset, the common custom in American communities; you can switch to 20, 22, 30 or 40 minutes.'],
  ['What is the candle lighting time for Shabbat?', 'Shabbat candles are lit on Friday before sunset. Most US communities light 18 minutes before sunset, and that is the time in the table. For this week\'s Shabbat together with the time Shabbat ends (Havdalah), see the <a href="/kodesh/shabat/en/">Shabbat times</a> page.'],
  ['What is the blessing for lighting Shabbat candles?', 'Baruch ata A-donai Eloheinu melech ha\'olam, asher kid\'shanu b\'mitzvotav v\'tzivanu l\'hadlik ner shel Shabbat – Blessed are You, the Lord our God, King of the Universe, Who sanctified us with His commandments and commanded us to kindle the Shabbat light. The Hebrew with vowels is on this page, together with the blessings for Yom Tov and Yom Kippur.'],
  ['What is the blessing for Yom Tov candles?', 'On a holiday night the blessing ends "l\'hadlik ner shel Yom Tov", and when the holiday falls on Friday night it ends "ner shel Shabbat v\'shel Yom Tov". In the siddur this page quotes, Shehecheyanu follows on holiday nights, except on the last days of Pesach. Each row in the table links to the right blessing.'],
  ['Why are second-night holiday candles lit after nightfall?', 'Outside Israel most holidays last two days. The second day begins at nightfall, and its candles are prepared for it only after the first day ends. A new fire is not struck on Yom Tov, so the candles are lit from a flame that was already burning, such as a memorial candle or a gas pilot light. The table marks these lightings "after nightfall, from an existing flame". Ask your rabbi how this is done in your home.'],
  ['Do I light candles on Yom Kippur?', 'Yes. Candles are lit on the eve of Yom Kippur before sunset, with the blessing "l\'hadlik ner shel Yom haKippurim" (and "Shabbat v\'shel Yom haKippurim" when Yom Kippur falls on Shabbat), followed by Shehecheyanu. The table shows the time for your city.'],
  ['Are Hanukkah candles in the table?', 'Yes. All eight nights of Hanukkah are listed with their times. On Friday the Hanukkah candles are lit before the Shabbat candles, and on Saturday night after Shabbat ends. The Hanukkah blessings in Hebrew, transliteration and English are on the <a href="/kodesh/chanuka/en/">Hanukkah blessings</a> page.'],
  ['Why do women cover their eyes after lighting?', 'The Metsudah siddur explains that the blessing over the candles is said after lighting: since lighting the candles begins Shabbat, the woman lights first, covers her eyes, says the blessing, and then looks at the candles, so that the blessing comes before she enjoys their light.'],
  ['Can I add all the candle lighting times to my calendar?', 'Yes. Press "Add to calendar (.ics)" and a file with every lighting in the table is downloaded. Open it on your phone or computer and the times are added to Google Calendar, Apple Calendar or Outlook, each with a reminder 30 minutes before.'],
  ['How early can I light Shabbat candles?', 'Some families light early in summer, before the time on the table. How early is a question of Jewish law that depends on your community\'s custom; ask your rabbi.'],
  ['Are these times exact for my address?', 'The times are calculated for the center of the chosen city. Inside a large metro area sunset can differ by a minute or two. Press "My location" for your exact spot, and follow your synagogue\'s calendar if it differs.'],
  ['Is this page free?', 'Yes. Free, with no sign-up and no ads. Everything is calculated in your own browser and nothing is sent to a server.']
];
const strip = s => s.replace(/<[^>]+>/g, '');
const faqLd = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: strip(a) } })) }) + '</script>';
const faqHtml = '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">Questions about candle lighting times</h2>\n' +
  qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';

const meta = {
  site: 'kodesh', nav: 'rabanim', lang: 'en', crumb_root: 'Jewish tools', tool: 'candle_en', no_hub: true,
  title: 'Candle Lighting Times: Shabbat and Holidays for the Year',
  description: 'Candle lighting times for every Shabbat, Yom Tov, Yom Kippur and Hanukkah night of the coming year in ' + S.CITIES.length + ' US cities or your location, with the blessing for each. Add to calendar, print. Free.',
  og_title: 'Candle lighting times for the whole year – with the right blessing',
  priority: '0.8',
  crumbs: [['Shabbat times', '/kodesh/shabat/en/'], ['Candle lighting times', null]],
  head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/shabbat-en.css"><link rel="stylesheet" href="/assets/candle-en.css">' + faqLd,
  foot: '<script src="' + HEB + '" data-hebcal defer></script><script src="/assets/shabbat-en.js" defer></script><script src="/assets/candle-en.js" defer></script>'
};
const body = `<header class="k-hero no-print">
  <h1>Candle Lighting Times: Shabbat and Holidays, the Whole Year</h1>
  <p class="sub">Every candle lighting of the coming year for your city – each Friday night, every holiday night, Yom Kippur and the eight nights of Hanukkah – with the blessing to say each time.</p>
</header>
<div class="tool" id="cl">
  <h2>Candle lighting times for your city</h2>
  <div class="sh-pick no-print">
    <label for="cl-place">City<select id="cl-place">${opts}</select></label>
    <label for="cl-mins">Before sunset<select id="cl-mins"><option value="18">18 minutes</option><option value="20">20 minutes</option><option value="22">22 minutes</option><option value="30">30 minutes</option><option value="40">40 minutes</option></select></label>
    <label for="cl-show">Show<select id="cl-show"><option value="all">All lightings</option><option value="hol">Holidays and Hanukkah</option><option value="shabbat">Shabbat only</option><option value="nohan">Without Hanukkah</option></select></label>
    <button class="btn btn-line btn-sm" type="button" id="cl-gps">📍 My location</button>
    <p id="cl-gps-msg" aria-live="polite"></p>
  </div>
  <div class="cl-next" id="cl-next" aria-live="polite">${next}</div>
  <div class="share-row no-print">
    <button class="btn btn-gold btn-sm" type="button" id="cl-ics">📅 Add to calendar (.ics)</button>
    <button class="btn btn-line btn-sm" type="button" id="cl-copy">Copy the times</button>
    <button class="btn btn-line btn-sm" type="button" id="cl-print">Print</button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="Candle lighting times for the whole year, with the blessing for each night. Free, no ads:" target="_blank" rel="noopener">Share</a>
  </div>
  <p class="cl-count" id="cl-count">${list.length} lightings in the coming year</p>
  <div class="sh-wrap">
  <table class="iv-tbl sh-tbl cl-tbl">
    <caption class="sh-cap" id="cl-cap">Candle lighting times for ${p.name} for the next 12 months (America/New York, 18 min before sunset)</caption>
    <thead><tr><th scope="col">Occasion</th><th scope="col">Date</th><th scope="col">Light at</th><th scope="col">Blessing</th></tr></thead>
    <tbody id="cl-rows">
${rows}
    </tbody>
  </table>
  </div>
</div>
<section class="k-sec" id="blessings" aria-labelledby="bl-h">
  <h2 id="bl-h">The candle lighting blessings</h2>
  <p>Each row in the table links to the blessing for that night. The custom described in the siddur: light the candles, cover your eyes, say the blessing, then look at the lights.</p>
${blessHtml}
  <p class="kd-src">Hebrew: Siddur Sefard, Torat Emet edition, through Sefaria (public domain); the Name of God is written in short form. English: the Metsudah Siddur by Avrohom Davis, 1981, and for Yom Kippur the Metsudah Machzor (interlinear), through Sefaria (CC-BY), lightly adapted ("Adonoy" written "the Lord", "Shabbos" written "Shabbat"). Transliteration: written for this page. The siddur notes Shehecheyanu on holiday nights except the last days of Pesach.</p>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">Candle lighting times for the whole year, explained</h2>
  <p>Jewish homes light candles to welcome every Shabbat and every holiday. Because the time is tied to sunset, it moves every week and is different in every city: in New York, Friday candle lighting is a little after 4 PM in December and after 8 PM in June. Most calendars show only this week. This page lists every candle lighting of the coming twelve months for your city – each Friday night, the nights of Rosh Hashanah, Yom Kippur, Sukkot, Shemini Atzeret, Simchat Torah, Pesach and Shavuot, and the eight nights of Hanukkah – and next to each one, the exact blessing to say.</p>
  <h3>How the times are calculated</h3>
  <p>Candle lighting before Shabbat and before the first night of a holiday is sunset minus the minutes you choose; 18 minutes is the most common custom in America and the default here. Lightings on the second night of a holiday, or on a holiday that begins as Shabbat ends, are shown at nightfall (the sun 8.5 degrees below the horizon), marked "after". Times before sunset are rounded down to the minute, so the rounding leaves you on the safe side. The calculation uses the open-source Hebcal library and runs entirely in your browser, for the time zone of your city, including the daylight saving time changes.</p>
  <h3>Which blessing to say on each night</h3>
  <p>On Friday night the blessing ends <em>l'hadlik ner shel Shabbat</em>. On a holiday night it ends <em>ner shel Yom Tov</em>, and when the holiday begins on Friday night, <em>ner shel Shabbat v'shel Yom Tov</em>. On the eve of Yom Kippur it ends <em>ner shel Yom haKippurim</em>. On holiday nights and on Yom Kippur, the siddur this page quotes adds Shehecheyanu, the blessing for reaching a special time, except on the last two days of Pesach. The table picks the right one for every row, and the full Hebrew, transliteration and translation of each blessing are printed above.</p>
  <h3>The second night of holidays outside Israel</h3>
  <p>Outside Israel, Rosh Hashanah, the first and last days of Pesach, the first days of Sukkot, Shemini Atzeret and Simchat Torah, and Shavuot each come as two days. The first night's candles are lit before sunset, like on Friday. The second night's candles are lit after nightfall, from a flame that was already burning, because a new fire is not struck on Yom Tov; a long-burning memorial candle lit before the holiday is a common way to keep a flame. When a holiday ends on Friday, the Shabbat candles are lit before sunset from such a flame. The details of what may be done on Yom Tov are questions for your rabbi.</p>
  <h3>Hanukkah candles in the same list</h3>
  <p>The eight nights of Hanukkah are in the table too, so the whole year of lights is in one place. On weekdays the Hanukkah candles are lit at nightfall, as many communities do; on Friday the Hanukkah menorah is lit before the Shabbat candles, and on Saturday night it is lit after Shabbat ends. Customs about the exact time differ, so follow your community. The blessings, Haneirot Halalu and Maoz Tzur are on the <a href="/kodesh/chanuka/en/">Hanukkah blessings</a> page.</p>
  <h3>Add every candle lighting to your calendar</h3>
  <p>Press "Add to calendar" and the page creates a calendar file with every lighting in the table for your city, each with its name and a reminder half an hour before. Open the file on your phone, or import it into Google Calendar, Apple Calendar or Outlook. Use the "Show" menu first if you want only the holidays, only Shabbat, or the list without Hanukkah. The file is made in your browser; nothing is uploaded.</p>
  <h3>Print or share the list</h3>
  <p>"Print" gives a clean page with the table only, for the fridge or the synagogue board. "Copy the times" copies the next twenty lightings as plain text, ready to paste into a family group or an email, and "Share" sends a link to this page.</p>
  <h3>Choosing 18, 20, 30 or 40 minutes</h3>
  <p>Communities differ in how early they light before sunset. Eighteen minutes is the widespread custom in the United States; some communities use 20 or 22 minutes; some congregations use 30; and the custom in Jerusalem is 40. Choose the one your community uses, and the page remembers it on your device next time. Second-night lightings are always at nightfall, whatever you choose.</p>
  <h3>Candle lighting times in US cities</h3>
  <p>The list covers ${S.CITIES.length} cities and Jewish communities across the United States, from the East Coast to Hawaii and Alaska, each in its own time zone, including Arizona, which does not use daylight saving time. Open the year's times for a city directly: ${cityLinks}. If your town is not listed, press "My location": the times are then calculated for your exact spot, and your location stays on your device.</p>
  <h3>The holidays in the coming year</h3>
  <p>In the coming twelve months the table includes candle lighting for ${holidays.join(', ')}. For the dates of every Jewish holiday, including fast days and minor holidays without candles, see the <a href="/kodesh/luach-ivri/en/holidays/">Jewish holidays calendar</a>.</p>
  <h3>Lighting the candles, step by step</h3>
  <p>The candles are lit before the time in the table. Many light two candles, for the two words of the Torah about Shabbat, "remember" and "keep", and some add one for each child. After lighting, the eyes are covered, the blessing is said, and then the eyes are uncovered to look at the lights. Women traditionally light, and a man living alone lights too. If you are new to Shabbat, <a href="/kodesh/giur/en/shabat-rishona/">your first Shabbat</a> walks through the evening, and the <a href="/kodesh/kiddush/en/">Kiddush</a> page has the blessing over the wine that follows.</p>
  <h3>When Shabbat and holidays end</h3>
  <p>This page is about the start. For this week's Shabbat with the time it ends on Saturday night (Havdalah) and Rabbeinu Tam's time, see <a href="/kodesh/shabat/en/">Shabbat times</a>. Daily halachic times, from dawn and the latest Shema to nightfall, are on <a href="/kodesh/zmanim/en/">zmanim for today</a>.</p>
  <h3>More in English</h3>
  <p>The <a href="/kodesh/luach-ivri/en/">Hebrew calendar</a> and the <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a> show today's Jewish date. This week's Torah reading: <a href="/kodesh/parasha/en/">Torah portion this week</a>. Prayers with transliteration: <a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon</a>, <a href="/kodesh/shema-israel/en/">the Shema</a>, <a href="/kodesh/kaddish/en/">Kaddish</a> and <a href="/kodesh/omer/en/">the omer count</a>. Learning to read Hebrew? Start with the <a href="/kodesh/alefbet/en/">Hebrew alphabet</a>.</p>
  <h3>Why it is free</h3>
  <p>This page is part of "Gilad Rachamim's Tools": simple tools, free, with no sign-up and no ads, built as an act of kindness. The times are a calendar, not a halachic ruling; for questions of practice, ask your rabbi.</p>
</section>
${faqHtml}
<!--/seo-txt-->
`;
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
console.log('candle en: ok', list.length, 'lightings; next', n.name, T.format(n.t), '| holidays:', holidays.join(', '));
