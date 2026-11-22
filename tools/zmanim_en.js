// דף זמני היום באנגלית לארה"ב: src/pages/kodesh/zmanim/en/index.html  ("zmanim", 10K–100K חיפושים בחודש בארה"ב, 22.11.2026).
// הרצה: node tools/zmanim_en.js  ואז  python build.py
// החישוב: assets/zmanim-en.js (hebcal-core), רשימת הערים: assets/shabbat-en.js. כאן הוא רץ פעם אחת בזמן הבנייה
// כדי שבדף יהיה לוח ניו יורק קבוע לגוגל ולמי שאין לו JavaScript; בדפדפן אותו קוד מחשב מחדש לפי העיר והתאריך.
// מילות החיפוש והמתחרים: ~/.claude/state/kelim-seo/runs/2026-11-22-zmanim-en/
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'src/pages/kodesh/zmanim/en');
const HEB = '/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js';
const H = vm.runInThisContext(fs.readFileSync(path.join(ROOT, HEB.slice(1)), 'utf8') + ';hebcal');
const S = require(path.join(ROOT, 'assets/shabbat-en.js'));
const Z = require(path.join(ROOT, 'assets/zmanim-en.js'));
const C = Z.core(H);

const ny = S.CITIES[0];
const p = { name: ny[1] + ', ' + ny[2], lat: ny[3], lon: ny[4], tz: ny[5] };
const d = C.localDay(p.tz, new Date());
const z = C.day(p, d);
const T = C.fmt(p.tz, { hour: 'numeric', minute: '2-digit' }), D = C.fmt(p.tz, { weekday: 'short', month: 'short', day: 'numeric' });
const L = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const iso = x => x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2);
const rows = Z.ZMANIM.map(r => '<tr><th scope="row">' + r[1] + '<span>' + r[2] + '</span></th><td><b>' + (z[r[0]] ? T.format(z[r[0]]) : '—') + '</b></td></tr>').join('\n');
const week = [];
for (let i = 0; i < 7; i++) { const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, 12); const y = C.day(p, dd);
  week.push('<tr><th scope="row">' + D.format(dd) + '</th>' + ['alot', 'sunrise', 'shmaMGA', 'shmaGRA', 'chatzot', 'plag', 'sunset', 'tzeit'].map(k => '<td>' + T.format(y[k]) + '</td>').join('') + '</tr>'); }
const hero = '<p class="sh-where">' + p.name + ' · ' + L.format(d) + ' · ' + z.hdate + '</p><div class="sh-two"><div><strong>Sunrise</strong><b>' + T.format(z.sunrise) +
  '</b><span>Latest Shema: ' + T.format(z.shmaMGA) + ' / ' + T.format(z.shmaGRA) + '</span></div><div><strong>Sunset</strong><b>' + T.format(z.sunset) + '</b><span>Nightfall: ' + T.format(z.tzeit) + '</span></div></div>';

const opts = S.CITIES.map(c => '<option value="' + c[0] + '">' + c[1] + ', ' + c[2] + '</option>').join('');
const cityList = S.CITIES.map(c => c[1] + (c[0] === 'washington-dc' ? ' DC' : '')).join(', ');

const qa = [
  ['What are zmanim?', 'Zmanim (Hebrew for "times") are the times of the day that matter in Jewish law: the earliest and latest times for morning prayers, the latest time to say the Shema, midday, the earliest time for the afternoon prayer, sunset and nightfall. They are based on the position of the sun, so they change every day and are different in every city.'],
  ['How do I find zmanim for my location?', 'Press "My location" and allow your browser to share your position. The times are then calculated for your exact spot and your device\'s time zone. Your location stays on your device and is not sent anywhere. You can also pick one of ' + S.CITIES.length + ' US cities from the list.'],
  ['What are the zmanim for today?', 'The table at the top of this page shows today\'s zmanim for the city you choose, and highlights the next zman with a countdown. Times that have already passed today are dimmed. Use the arrows or the date box to see any other day, and the 7-day table for the week ahead.'],
  ['What time is sof zman Shema today?', 'Two times are shown. The Magen Avraham counts the day from 72 minutes before sunrise to 72 minutes after sunset, so his latest time for Shema is earlier. The Gra (Vilna Gaon) counts from sunrise to sunset, so his time is later. Both are three "halachic hours" into the day. Many people try to say the Shema by the earlier time; ask your rabbi which time to follow.'],
  ['What is plag hamincha?', 'Plag hamincha is 10¾ halachic hours into the day, about an hour and a quarter before sunset. It is the earliest time some communities light candles and pray Maariv for an "early Shabbat" in summer, and it is also used for lighting Chanukah candles in some customs. How to use it depends on your community; ask your rabbi.'],
  ['What is a halachic hour (shaah zmanit)?', 'A halachic hour is one twelfth of the day. In summer the day is long, so a halachic hour can be more than 75 minutes; in winter it can be under 50 minutes. Zmanim such as the latest Shema (3 hours) and plag hamincha (10¾ hours) are counted in these hours, which is why they move with the seasons.'],
  ['What is the difference between Magen Avraham and Gra?', 'They disagree about when the day begins and ends for counting halachic hours. The Magen Avraham uses dawn to nightfall (here 72 minutes before sunrise and after sunset); the Gra uses sunrise to sunset. The Magen Avraham\'s morning times are therefore earlier. The page shows both so you can follow your own custom.'],
  ['Is there a zmanim calculator for any date?', 'Yes. Choose a date in the date box, or use the previous and next day buttons, and every zman is recalculated for that day and city. This works for past and future dates, so you can plan a trip, a simcha or a yahrzeit.'],
  ['What is the earliest time to put on tallit and tefillin?', 'That time is called misheyakir, when there is enough light to recognize someone at a short distance. This page uses the common calculation of the sun 11.5 degrees below the horizon, usually 50 to 60 minutes before sunrise in the continental US. Some communities use a different degree; follow your rabbi.'],
  ['When is the latest time for Mincha?', 'Mincha, the afternoon prayer, can be said from Mincha Gedola, half an hour after midday. The ideal latest time is sunset. Mincha Ketana and plag hamincha are also shown, because some customs prefer praying after Mincha Ketana. If you are late, ask your rabbi what to do.'],
  ['Do zmanim change with daylight saving time?', 'Every clock time on the page jumps by an hour when daylight saving time starts in March and ends in November, because the sun\'s times on the clock move with it. The times are always in your city\'s local time, including Arizona and Hawaii, which do not use daylight saving time.'],
  ['Is this zmanim page free?', 'Yes. All the times, the 7-day table, copying and printing are free, with no sign-up and no ads. Everything is calculated in your own browser.']
];
const faqLd = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) }) + '</script>';
const faqHtml = '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">Questions about zmanim</h2>\n' +
  qa.map(([q, a]) => `  <details><summary>${q}</summary><p>${a}</p></details>`).join('\n') + '\n</section>';

const meta = {
  site: 'kodesh', nav: 'rabanim', lang: 'en', crumb_root: 'Jewish tools', tool: 'zmanim_en', no_hub: true,
  title: 'Zmanim: Halachic Times for Today in Your City',
  description: 'Zmanim for today in ' + S.CITIES.length + ' US cities or your location: dawn, sunrise, latest Shema (MGA and Gra), chatzot, Mincha, plag hamincha, sunset, nightfall and a 7-day table. Free, no ads.',
  og_title: 'Zmanim – halachic times for today in your city',
  priority: '0.8',
  crumbs: [['Zmanim', null]],
  head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/shabbat-en.css"><link rel="stylesheet" href="/assets/zmanim-en.css">' + faqLd,
  foot: '<script src="' + HEB + '" data-hebcal defer></script><script src="/assets/shabbat-en.js" defer></script><script src="/assets/zmanim-en.js" defer></script>'
};
const body = `<header class="k-hero no-print">
  <h1>Zmanim: Halachic Times for Today</h1>
  <p class="sub">Today's zmanim for your city: dawn, sunrise, the latest time for Shema and prayer, midday, Mincha, plag hamincha, sunset and nightfall. Pick your city or use your location, and any date.</p>
</header>
<div class="tool" id="zm">
  <h2>Zmanim for today</h2>
  <div class="sh-pick no-print">
    <label for="zm-place">City<select id="zm-place">${opts}</select></label>
    <button class="btn btn-line btn-sm" type="button" id="zm-gps">📍 My location</button>
    <div class="zm-day">
      <button class="btn btn-line btn-sm" type="button" id="zm-prev" aria-label="Previous day">‹ Prev</button>
      <label for="zm-date">Date<input type="date" id="zm-date" value="${iso(d)}"></label>
      <button class="btn btn-line btn-sm" type="button" id="zm-next" aria-label="Next day">Next ›</button>
      <button class="btn btn-line btn-sm" type="button" id="zm-today">Today</button>
    </div>
    <p id="zm-gps-msg" aria-live="polite"></p>
  </div>
  <div class="sh-hero" id="zm-hero" aria-live="polite">${hero}</div>
  <div class="sh-wrap">
  <table class="iv-tbl sh-tbl zm-tbl">
    <caption class="sh-cap" id="zm-cap">Zmanim for ${p.name}, ${L.format(d)} (America/New York)</caption>
    <thead><tr><th scope="col">Zman</th><th scope="col">Time</th></tr></thead>
    <tbody id="zm-rows">
${rows}
    </tbody>
  </table>
  </div>
  <h3>The next 7 days</h3>
  <div class="sh-wrap">
  <table class="iv-tbl sh-tbl zm-week">
    <thead><tr><th scope="col">Day</th><th scope="col">Dawn</th><th scope="col">Sunrise</th><th scope="col">Shema MGA</th><th scope="col">Shema Gra</th><th scope="col">Chatzot</th><th scope="col">Plag</th><th scope="col">Sunset</th><th scope="col">Nightfall</th></tr></thead>
    <tbody id="zm-week">
${week.join('\n')}
    </tbody>
  </table>
  </div>
  <div class="share-row no-print">
    <button class="btn btn-gold btn-sm" type="button" id="zm-copy">Copy the zmanim</button>
    <button class="btn btn-line btn-sm" type="button" onclick="window.print()">Print</button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="Zmanim for today in your city. Free, no ads:" target="_blank" rel="noopener">Share</a>
  </div>
</div>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">Zmanim, explained</h2>
  <p>Zmanim are the halachic times of the Jewish day. Jewish law ties many mitzvot to the sun: the morning Shema has a latest time, the Amidah of Shacharit has a latest time, Mincha has an earliest time, and the day ends at sunset and nightfall. Because the sun rises and sets at a different time every day and in every place, these times change constantly. In New York the latest time for Shema is around 9 AM in winter and close to 10 AM in summer. This page calculates every zman for your city and any date, so you can see today's times at a glance, see what comes next, and plan the week ahead.</p>
  <h3>The zmanim of the morning</h3>
  <p><strong>Alot Hashachar</strong> (dawn) is the first light of morning. It is calculated here as the sun 16.1 degrees below the horizon, and the fixed 72 minutes before sunrise is shown too. <strong>Misheyakir</strong> is when there is enough light to recognize a person nearby; it is the earliest time for tallit and tefillin, calculated as the sun 11.5 degrees below the horizon. <strong>Sunrise</strong> (netz hachama) is the preferred time to begin the Amidah of Shacharit for those who pray "vatikin". Sunrise and sunset are calculated at sea level, the common practice in most calendars.</p>
  <h3>Latest time for Shema and for Shacharit</h3>
  <p>The Shema must be said in the first quarter of the day, three halachic hours, and the Amidah of Shacharit within the first third, four halachic hours. There are two main ways of counting the day. The <strong>Magen Avraham</strong> counts from dawn to nightfall, here 72 minutes before sunrise to 72 minutes after sunset, which gives earlier times. The <strong>Gra</strong>, the Vilna Gaon, counts from sunrise to sunset, which gives later times. The page shows both, side by side. Many people try to say the Shema by the earlier time; which time applies to you is a question for your rabbi.</p>
  <h3>Chatzot, Mincha and plag hamincha</h3>
  <p><strong>Chatzot</strong> is midday, halfway between sunrise and sunset. <strong>Mincha Gedola</strong>, half a halachic hour after chatzot, is the earliest time to pray Mincha. <strong>Mincha Ketana</strong> is nine and a half halachic hours into the day, and <strong>plag hamincha</strong> is ten and three quarter hours, about an hour and a quarter before sunset. Plag hamincha is used for an early Shabbat in summer and in some customs for Chanukah candles. <strong>Chatzot halaila</strong>, midnight, is halfway between sunset and the next sunrise; it is used, for example, as the time for the Pesach afikoman.</p>
  <h3>Sunset, nightfall and Rabbeinu Tam</h3>
  <p><strong>Sunset</strong> (shkiah) ends the day. <strong>Nightfall</strong> (tzeit hakochavim) is when three small stars can be seen; this page uses the sun 8.5 degrees below the horizon, usually 40 to 50 minutes after sunset in the continental US. <strong>Rabbeinu Tam</strong> held that night begins 72 minutes after sunset, and many people wait until then to end Shabbat and fasts. The weekly candle lighting and Havdalah times are on the <a href="/kodesh/shabat/en/">Shabbat times</a> page.</p>
  <h3>What is a halachic hour?</h3>
  <p>Zmanim are counted in halachic hours, shaot zmaniot: the day is divided into twelve equal parts, whatever its length. On a long summer day each part can be more than 75 minutes; on a short winter day under 50 minutes. So "three hours into the day" is about 9 AM in winter and close to 10 AM in summer. This is why the latest Shema time moves across the year and why a calculator is needed.</p>
  <h3>How the zmanim are calculated</h3>
  <p>The times come from the position of the sun for the latitude, longitude and time zone of your city, calculated with the open-source Hebcal library, the same astronomy used by many Jewish calendars. Times that mark the start of something (dawn, sunrise, nightfall) are rounded up to the next minute, and times that mark a deadline (latest Shema, sunset) are rounded down, so the rounding leaves you on the safe side. In practice, do not rely on the last minute: clocks differ and the horizon is not flat. This page is a calendar, not a halachic ruling; for how to apply the times, ask your rabbi.</p>
  <h3>Zmanim in US cities</h3>
  <p>The list covers ${S.CITIES.length} cities and Jewish communities across the United States, from the East Coast to Hawaii and Alaska: ${cityList}. Each city is calculated in its own time zone. If your town is not on the list, press "My location": the times are then calculated for your exact spot. The city and date you choose can be shared with a link, and the page remembers your city on your device.</p>
  <h3>Printing a zmanim calendar</h3>
  <p>The 7-day table shows the main zmanim for the week starting on the date you choose: dawn, sunrise, both Shema times, chatzot, plag hamincha, sunset and nightfall. Press Print for a clean page to put on the fridge or the synagogue notice board, or Copy to paste the times into a message.</p>
  <h3>More in English</h3>
  <p>The <a href="/kodesh/luach-ivri/en/">Hebrew calendar</a> and the <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a> show today's Jewish date and this week's Torah portion; the <a href="/kodesh/luach-ivri/en/holidays/">Jewish holidays</a> page lists every holiday. To read the prayers in Hebrew with transliteration: <a href="/kodesh/shema-israel/en/">the Shema</a>, <a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon</a> and <a href="/kodesh/tefilat-haderech/en/">the traveler's prayer</a>. Learning to read Hebrew? Start with the <a href="/kodesh/alefbet/en/">Hebrew alphabet</a>. For people converting to Judaism in Israel: <a href="/kodesh/giur/en/">preparing for conversion</a>.</p>
  <h3>Why it is free</h3>
  <p>This page is part of "Gilad Rachamim's Tools": simple tools, free, with no sign-up and no ads, built as an act of kindness. Nothing is sent to a server; your city is remembered only in your own browser.</p>
</section>
${faqHtml}
<!--/seo-txt-->
`;
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), '<!--meta ' + JSON.stringify(meta, null, 2) + ' -->\n' + body, 'utf8');
console.log('zmanim en: ok', L.format(d), 'sunrise', T.format(z.sunrise), 'sunset', T.format(z.sunset));
