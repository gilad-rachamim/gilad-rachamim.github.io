// דף זמני שבת באנגלית לארה"ב: src/pages/kodesh/shabat/en/index.html  ("shabbat times", 10K–100K חיפושים בחודש בארה"ב;
// "candle lighting times", "shabbat candle lighting times" 1K–10K).
// הרצה: node tools/shabbat_en.js  ואז  python build.py
// החישוב: assets/shabbat-en.js (hebcal-core). כאן הוא רץ פעם אחת בזמן הבנייה כדי שבדף יהיה לוח ניו יורק קבוע לגוגל
// ולמי שאין לו JavaScript; בדפדפן אותו קוד מחשב מחדש לפי העיר שנבחרה.
// מילות החיפוש והמתחרים: ~/.claude/state/kelim-seo/runs/2026-11-22-shabbat-en/
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src/pages/kodesh/shabat/en');
const HEB = '/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js';
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, HEB.slice(1)), 'utf8') + ';hebcal');
const S = require(path.join(ROOT, 'assets/shabbat-en.js'));
const C = S.core(H);

const ny = S.CITIES[0];
const p = { name: ny[1] + ', ' + ny[2], lat: ny[3], lon: ny[4], tz: ny[5] };
const list = C.occasions(p, 18, new Date(), 13);
const T = C.fmt(p.tz, { hour: 'numeric', minute: '2-digit' }), D = C.fmt(p.tz, { weekday: 'short', month: 'short', day: 'numeric' });
const w = list[0];
const rows = list.map((o, i) => '<tr' + (i === 0 ? ' class="now"' : '') + '><th scope="row">' + o.names.join(' · ') + '</th><td>' +
  o.lights.map(l => D.format(l) + ' <b>' + T.format(l) + '</b>').join('<br>') + '</td><td>' + D.format(o.havdala) + ' <b>' + T.format(o.havdala) + '</b></td><td>' + T.format(o.rt) + '</td></tr>').join('\n');
const hero = '<p class="sh-where">' + p.name + ' · ' + w.names.join(' · ') + '</p><div class="sh-two"><div><strong>Candle lighting</strong><b>' + T.format(w.lights[0]) + '</b><span>' + D.format(w.lights[0]) +
  '<br>18 min before sunset</span></div><div><strong>Shabbat ends (Havdalah)</strong><b>' + T.format(w.havdala) + '</b><span>' + D.format(w.havdala) + '<br>nightfall, 3 stars</span><span class="sh-rt">Rabbeinu Tam: ' + T.format(w.rt) + '</span></div></div>';

const opts = S.CITIES.map(c => '<option value="' + c[0] + '">' + c[1] + ', ' + c[2] + '</option>').join('');
const cityList = S.CITIES.map(c => c[1] + (c[0] === 'washington-dc' ? ' DC' : '')).join(', ');

const qa = [
  ['What time does Shabbat start?', 'Shabbat starts at sunset on Friday. Candles are lit before that, and the custom in most American communities is 18 minutes before sunset, which is the "candle lighting time" in this page\'s table. Some communities light earlier: 20 minutes in parts of New Jersey, 30 minutes in some congregations, and 40 minutes in Jerusalem. Pick your city above and the time is shown for this Friday and the coming weeks.'],
  ['What time does Shabbat end?', 'Shabbat ends on Saturday night at nightfall, when three small stars can be seen. This page uses the common calculation of the sun at 8.5 degrees below the horizon, usually 40 to 50 minutes after sunset in the continental US. Many people wait until 72 minutes after sunset, the time of Rabbeinu Tam, which is shown in its own column. Havdalah is said after Shabbat ends.'],
  ['Why do we light candles 18 minutes before sunset?', 'Lighting a little before sunset makes sure the candles are lit before Shabbat begins, since lighting a fire is not done on Shabbat itself. Eighteen minutes became the widespread custom in Europe and America; it gives a margin for clocks that are not exact and for the time it takes to light. Follow the custom of your community or your rabbi.'],
  ['Why do women cover their eyes when lighting Shabbat candles?', 'Usually a blessing is said before doing a mitzvah. With Shabbat candles, saying the blessing first could be taken as accepting Shabbat, after which lighting would no longer be possible. So the custom is to light first, cover the eyes, say the blessing, and then uncover the eyes and look at the candles, as if they were lit just after the blessing.'],
  ['What are the basic rules of Shabbat?', 'Shabbat is a day of rest from Friday sunset until Saturday nightfall. The Torah forbids melachah, creative work, on Shabbat; the rabbis list 39 categories, such as cooking, writing, lighting a fire and carrying in a public area. Shabbat is also marked by lighting candles, Kiddush over wine, festive meals with challah, prayer and Havdalah at the end. For how the rules apply in practice, ask a rabbi you trust.'],
  ['Can I wear jeans to Shabbat dinner?', 'Many people keep special, nicer clothes for Shabbat, as a way of honoring the day, and in many Orthodox homes and synagogues men wear a shirt and slacks or a suit and women a dress or skirt. If you are invited, the simplest thing is to ask your host what people usually wear. Bringing something modest and a little dressier than everyday clothes is rarely wrong.'],
  ['What is Rabbeinu Tam time?', 'Rabbeinu Tam, a great 12th-century French scholar, held that night begins 72 minutes after sunset. Many observant Jews, especially Chasidic communities, wait until this time before ending Shabbat or a holiday. The table shows it beside the standard nightfall time so you can follow your own custom.'],
  ['How are Yom Tov candle times different?', 'Outside Israel, most holidays last two days. On the first night candles are lit before sunset, like on Friday. On the second night they are lit after nightfall, from a flame that was already burning (such as a memorial candle or a pilot light), because a new fire is not lit on Yom Tov. When a holiday ends right before Shabbat, the Shabbat candles are lit before sunset on Friday from an existing flame. The table lists every lighting time for each holiday.'],
  ['Do Shabbat times change with daylight saving time?', 'The clock times jump by an hour when daylight saving time starts in March and ends in November, because sunset itself moves an hour on the clock. The times on this page are always in your city\'s local time, including the change.'],
  ['Are these times exact for my address?', 'The times are calculated for the center of the city you choose. Inside a large metro area, sunset can differ by a minute or two from one side to the other, and mountains or tall buildings do not change the calculation. Use "My location" for your exact spot, and follow your local synagogue\'s calendar if it differs.'],
  ['Is this page free?', 'Yes. The times, the 12-week table, copying and printing are free, with no sign-up and no ads. Everything is calculated in your own browser.']
];
const faqLd = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }) + '</script>';
const faqHtml = '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">Questions about Shabbat times</h2>\n' +
  qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';

const meta = {
  site: 'kodesh', nav: 'rabanim', lang: 'en', crumb_root: 'Jewish tools', tool: 'shabbat_en', no_hub: true,
  title: 'Shabbat Times: Candle Lighting Times for Your City',
  description: 'Shabbat times for this week in ' + S.CITIES.length + ' US cities or your location: candle lighting times, Havdalah when Shabbat ends, Rabbeinu Tam, Yom Tov candles and a 12-week table. Free, no ads.',
  og_title: 'Shabbat Times – candle lighting and Havdalah for your city',
  priority: '0.8',
  crumbs: [['Shabbat times', null]],
  head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/shabbat-en.css">' + faqLd,
  foot: '<script src="' + HEB + '" data-hebcal defer></script><script src="/assets/shabbat-en.js" defer></script>'
};
const body = `<header class="k-hero no-print">
  <h1>Shabbat Times: Candle Lighting Times and Havdalah</h1>
  <p class="sub">Shabbat candle lighting times for this Friday in your city, when Shabbat ends on Saturday night, Rabbeinu Tam, and the coming holidays. Pick your city or use your location.</p>
</header>
<div class="tool" id="sh">
  <h2>Shabbat times this week</h2>
  <div class="sh-pick no-print">
    <label for="sh-place">City<select id="sh-place">${opts}</select></label>
    <label for="sh-mins">Candle lighting<select id="sh-mins"><option value="18">18 min before sunset</option><option value="20">20 min before sunset</option><option value="22">22 min before sunset</option><option value="30">30 min before sunset</option><option value="40">40 min before sunset</option></select></label>
    <button class="btn btn-line btn-sm" type="button" id="sh-gps">📍 My location</button>
    <p id="sh-gps-msg" aria-live="polite"></p>
  </div>
  <div class="sh-hero" id="sh-hero" aria-live="polite">${hero}</div>
  <div class="sh-wrap">
  <table class="iv-tbl sh-tbl">
    <caption class="sh-cap" id="sh-cap">Shabbat and Yom Tov times for ${p.name} (America/New York)</caption>
    <thead><tr><th scope="col">Shabbat / holiday</th><th scope="col">Candle lighting</th><th scope="col">Ends (Havdalah)</th><th scope="col">Rabbeinu Tam</th></tr></thead>
    <tbody id="sh-rows">
${rows}
    </tbody>
  </table>
  </div>
  <div class="share-row no-print">
    <button class="btn btn-gold btn-sm" type="button" id="sh-copy">Copy the times</button>
    <button class="btn btn-line btn-sm" type="button" onclick="window.print()">Print</button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="Shabbat times for your city: candle lighting and Havdalah. Free, no ads:" target="_blank" rel="noopener">Share</a>
  </div>
</div>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">Shabbat candle lighting times, explained</h2>
  <p>Shabbat begins every Friday at sunset and ends on Saturday night when three stars appear. Because sunset moves every day of the year and is different in every city, the time to light Shabbat candles changes from week to week: in New York it is a little after 4 PM in December and after 8 PM in June. This page calculates the times for your city from the position of the sun, so you see this Friday's candle lighting time, the time Shabbat ends, and a table of the next twelve weeks, including Rosh Hashanah, Yom Kippur, Sukkot, Pesach and Shavuot.</p>
  <h3>How the times are calculated</h3>
  <p><strong>Candle lighting</strong> is sunset minus the number of minutes you choose; 18 minutes is the custom in most US communities and the default here. <strong>Havdalah</strong>, the end of Shabbat, is nightfall (tzeit hakochavim), calculated as the sun 8.5 degrees below the horizon. <strong>Rabbeinu Tam</strong> is 72 minutes after sunset. Candle lighting times are rounded down to the minute and the end of Shabbat is rounded up, so the rounding always leaves you on the safe side. The calculations use the open-source Hebcal library, the same astronomy used by many Jewish calendars, and run entirely in your browser.</p>
  <h3>Choosing 18, 20, 30 or 40 minutes</h3>
  <p>Communities differ in how early they light. Eighteen minutes before sunset is the most common custom in America. Some communities in New Jersey and elsewhere light 20 or 22 minutes before; some congregations use 30 minutes; and Jerusalem's custom is 40 minutes. Choose the option your community uses, and the page remembers it on your device next time.</p>
  <h3>Shabbat times in US cities</h3>
  <p>The list covers ${S.CITIES.length} cities and Jewish communities across the United States, from the East Coast to Hawaii and Alaska: ${cityList}. Each city is calculated in its own time zone, including Arizona, which does not use daylight saving time. If your town is not on the list, press "My location": the times are then calculated for your exact spot and your device's time zone. Your location stays on your device.</p>
  <h3>Lighting the Shabbat candles</h3>
  <p>The custom is to light at least two candles, for the two words of the Torah about Shabbat: "remember" and "keep". Many families add a candle for each child. The candles are lit before the time shown, the hands are passed over the flames, the eyes are covered, and the blessing is said; it is printed in every siddur (prayer book). Women traditionally light, and a man living alone lights too. If you are new to Shabbat, the page <a href="/kodesh/giur/en/shabat-rishona/">your first Shabbat</a> walks through the evening step by step.</p>
  <h3>Yom Tov candles and the second day of holidays</h3>
  <p>Outside Israel, Rosh Hashanah, the first and last days of Sukkot and Pesach, and Shavuot each last two days. The first night's candles are lit before sunset; the second night's candles are lit after nightfall, from a flame that was already burning, because a new fire is not lit on Yom Tov. When a holiday falls right before Shabbat, the table shows every lighting time in order. See the dates of every holiday on the <a href="/kodesh/luach-ivri/en/holidays/">Jewish holidays calendar</a>.</p>
  <h3>When Shabbat ends: Havdalah</h3>
  <p>On Saturday night, after nightfall, Shabbat is ended with Havdalah: a blessing over wine, fragrant spices and a braided candle with several wicks. The table gives both the common nightfall time and Rabbeinu Tam's time. If your community or rabbi uses a different time, follow theirs; this page is a calendar, not a halachic ruling.</p>
  <h3>Summer, winter and daylight saving time</h3>
  <p>In winter Shabbat starts early on Friday afternoon, and many workplaces and schools in Jewish areas plan for an early Friday. In summer it starts late, and the Friday-night meal often begins after 9 PM. When daylight saving time starts in March and ends in November, every time on the page moves by an hour together with the clock. Some families make an "early Shabbat" in summer, lighting after plag hamincha, about an hour and a quarter before sunset; ask your rabbi about the exact time for your community.</p>
  <h3>More in English</h3>
  <p>The <a href="/kodesh/luach-ivri/en/">Hebrew calendar</a> and the <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a> show today's Jewish date and this week's Torah portion. To read the prayers in Hebrew with transliteration: <a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon, the grace after meals</a>, <a href="/kodesh/shema-israel/en/">the Shema</a> and <a href="/kodesh/tefilat-haderech/en/">the traveler's prayer</a>. Learning to read Hebrew? Start with the <a href="/kodesh/alefbet/en/">Hebrew alphabet</a>. For people converting to Judaism in Israel: <a href="/kodesh/giur/en/">preparing for conversion</a>.</p>
  <h3>Why it is free</h3>
  <p>This page is part of "Gilad Rachamim's Tools": simple tools, free, with no sign-up and no ads, built as an act of kindness. Nothing is sent to a server; your city and your choice of minutes are remembered only in your own browser.</p>
</section>
${faqHtml}
<!--/seo-txt-->
`;
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
console.log('shabbat en: ok', list.length, 'occasions; first', w.names.join(' · '), T.format(w.lights[0]));
