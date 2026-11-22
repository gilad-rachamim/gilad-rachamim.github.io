// הדף האנגלי של הלוח העברי: src/pages/kodesh/luach-ivri/en/index.html  ("Hebrew Calendar").
// נקרא מתוך tools/ivri_pages.js. הלוח והטבלאות מחושבים מאותו קוד (assets/kodesh-ivri.js) עם מפת השפה assets/kodesh-ivri-en.js.
// מילות החיפוש: ~/.claude/state/kelim-seo/runs/2026-11-22-taarich-ru-en/ (hebrew calendar, 1K–10K).
'use strict';
module.exports = function (x) {
  const { I, H, L, T, CIV, HY, ROOT, path, write, faqLd, faqHtml, strip, WA, ALT, LANGNAV } = x;
  const C = I.core(H, L);
  const Y0 = C.yearInfo(HY), Y1 = C.yearInfo(HY + 1);
  const yrs = i => i.start.getFullYear() + '–' + i.end.getFullYear();
  const GY = CIV.getFullYear(), NEXTG = GY + 1;
  const HYJAN = new H.HDate(C.noon(GY, 0, 1)).getFullYear();
  const mo = C.month('g', GY, CIV.getMonth()), map = C.evMap(mo.days[0], mo.days[mo.days.length - 1]);
  const row = (hy, name) => C.holidays(hy).filter(r => r.name.indexOf(name) === 0)[0];
  const when = r => r ? L.greg(new Date(r.a)) + (r.b ? ' – ' + L.greg(new Date(r.b)) : '') : '';
  const rh0 = row(HY, 'Rosh Hashanah'), rh1 = row(HY + 1, 'Rosh Hashanah'), yk1 = row(HY + 1, 'Yom Kippur');
  const pe0 = row(HY, 'Passover'), ha0 = row(HY, 'Hanukkah'), su1 = row(HY + 1, 'Sukkot');
  const months = C.hmonths(HY).map(k => C.mon(k, HY)).join(', ');
  const HERE = '/kodesh/luach-ivri/en/';

  const qa = [
    ["What is today's Hebrew calendar date?", "Today's Hebrew date is written above the calendar, and today is framed in gold. The Hebrew day begins at sunset, so in the evening the page also shows the date that has already begun. Tap any day to see its full Hebrew date, holiday and Torah portion."],
    ['What are the 12 months of the Hebrew calendar?', 'Counting from the new year: Tishrei, Cheshvan, Kislev, Tevet, Shevat, Adar, Nisan, Iyar, Sivan, Tammuz, Av and Elul. In a leap year Adar is doubled into Adar I and Adar II, so the year has 13 months. In the Torah the months are counted from Nisan, the month of the Exodus.'],
    ['Which Hebrew year is ' + GY + '?', GY + ' spans two Hebrew years: ' + HYJAN + ' until Rosh Hashanah, and ' + (HYJAN + 1) + ' from Rosh Hashanah on. The Hebrew year ' + HY + ' runs from ' + L.greg(Y0.start) + ' to ' + L.greg(Y0.end) + '.'],
    ['What is the Hebrew calendar for the year ' + GY + '?', 'Pick any month of ' + GY + ' above to see every day with its Hebrew date, holidays, fast days, Rosh Chodesh and the weekly Torah portion. Below the calendar are two tables with all the Jewish holidays of ' + HY + ' (' + yrs(Y0) + ') and ' + (HY + 1) + ' (' + yrs(Y1) + ').'],
    ['When is Rosh Hashanah?', 'Rosh Hashanah ' + HY + ': ' + when(rh0) + '. Rosh Hashanah ' + (HY + 1) + ': ' + when(rh1) + '. Like every Jewish holiday, it begins the evening before the first day.'],
    ['Is this calendar for Israel or for outside Israel?', 'For Israel: one day of Yom Tov for each festival, and the Torah portions as they are read in Israel. Outside Israel some festivals last one day longer, and the weekly portion is sometimes a week apart.'],
    ['Why is Rosh Chodesh sometimes two days?', 'When the previous month has 30 days, its 30th day is the first day of Rosh Chodesh and the 1st of the new month is the second day. When the previous month has 29 days, Rosh Chodesh is one day.'],
    ['How do I print the Hebrew calendar?', 'Press "Print month" to get one clean page with the month on the screen. "Print the whole year" prints every month of the year, two per page. In the print window you can also choose "Save as PDF".'],
    ['Is the calendar free?', 'Yes. The calendar, printing and holiday tables are free, with no sign-up and no ads. It opens in any phone or computer browser; there is nothing to install.']
  ];
  const meta = {
    site: 'kodesh', lang: 'en', alt: ALT, crumb_root: 'Jewish tools', tool: 'luach_ivri_en', no_hub: true,
    title: 'Hebrew Calendar ' + HY + ' (' + yrs(Y0) + '): Jewish Holidays & Dates',
    description: 'Hebrew calendar online: today\'s Hebrew date, Jewish holidays ' + GY + '–' + NEXTG + ', Rosh Chodesh, Torah portions and days off in Israel. Free, no ads.',
    og_title: 'Hebrew Calendar: Jewish holidays, Hebrew dates and Torah portions',
    priority: '0.8',
    crumbs: [['Hebrew calendar', null]],
    head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/lang-switch.css">' + faqLd(qa),
    foot: '<script src="/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js" data-hebcal defer></script><script src="/assets/kodesh-ivri-en.js" defer></script><script src="/assets/kodesh-ivri.js" defer></script>'
  };
  const he = s => '<span lang="he" dir="rtl">' + s + '</span>';
  const body = `<header class="k-hero no-print">
  <h1>Hebrew Calendar: Hebrew Dates, Jewish Holidays and Torah Portions</h1>
  <p class="sub">Every day on the Gregorian and the Hebrew calendar. Holidays, fast days, Rosh Chodesh and the weekly Torah portion. Browse the months, pick a year, print.</p>
</header>
${LANGNAV('en')}
<p class="iv-today no-print"><span id="li-today"><b>Today:</b> ${C.todayLine(T)}</span><span class="iv-nh" id="li-nexthag">${strip(C.nextHolidayText(CIV))}</span></p>
<div class="tool iv-print" id="li">
  <div class="iv-bar">
    <button class="iv-nav" type="button" id="li-prev" aria-label="Previous month">←</button>
    <h2><span id="li-title">${mo.title}</span><small id="li-sub">${mo.sub}</small></h2>
    <button class="iv-nav" type="button" id="li-next" aria-label="Next month">→</button>
  </div>
  <form class="k-form iv-ctl no-print" id="li-form" novalidate onsubmit="return false">
    <div class="radios" role="radiogroup" aria-label="Calendar view"><label><input type="radio" name="li-mode" value="g" checked> By Gregorian month</label><label><input type="radio" name="li-mode" value="h"> By Hebrew month</label></div>
    <div class="field"><label for="li-month">Month</label><select id="li-month">${L.GM.map((n, i) => `<option value="${i}"${i === CIV.getMonth() ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="li-year" id="li-year-l">Year</label><input id="li-year" type="number" inputmode="numeric" min="${I.GY_MIN}" max="${I.GY_MAX}" value="${GY}"></div>
    <button class="btn btn-line btn-sm" type="button" id="li-now">Today</button>
    <p class="iv-msg" id="li-msg" role="status"></p>
  </form>
  <div id="li-grid">${C.gridHtml(mo, C.key(CIV), map)}</div>
  <ul class="iv-leg no-print" aria-label="Legend">
    <li><span style="background:var(--gold)"></span>holiday</li><li><span style="background:rgba(212,176,98,.35)"></span>intermediate days</li><li><span style="background:rgba(160,130,210,.5)"></span>fast day</li><li><span style="background:rgba(110,180,130,.45)"></span>Rosh Chodesh</li><li><span style="background:rgba(127,167,224,.45)"></span>national day</li>
  </ul>
  <p class="disclaimer no-print">Tap a day to see its full Hebrew date, holiday and Torah portion.</p>
  <div class="res iv-day no-print" id="li-day" aria-live="polite" hidden></div>
  <div class="share-row no-print">
    <button class="btn btn-gold btn-sm" type="button" data-iv-print="m">Print month</button>
    <button class="btn btn-line btn-sm" type="button" data-iv-print="y">Print the whole <bdi data-iv-yr>${GY}</bdi> year</button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="Hebrew calendar in English: Jewish holidays, Rosh Chodesh and Torah portions. Free, no ads:" target="_blank" rel="noopener">${WA} Send to a friend</a>
  </div>
</div>
<div id="li-printbox" aria-hidden="true"></div>

<section class="k-sec iv-list-wrap" aria-labelledby="li-list-h">
  <h2 id="li-list-h">${C.tr('חגים ומועדים: ')}${mo.title}</h2>
  <div id="li-list">${C.listHtml(mo, map)}</div>
</section>

<section class="k-sec" aria-labelledby="li-hag0-h" id="chagim">
  <h2 id="li-hag0-h">${L.hagH(Y0.name, yrs(Y0), 1)}</h2>
  <p class="lead2">The year ${HY} begins on <bdi>${L.greg(Y0.start)}</bdi> and ends on <bdi>${L.greg(Y0.end)}</bdi>. ${Y0.leap ? 'It is a leap year: ' + Y0.days + ' days and 13 months, with Adar I and Adar II.' : 'It is a regular year: ' + Y0.days + ' days and 12 months.'} "Day off" marks a Yom Tov: in Israel there is no work or school that day.</p>
  <div id="li-hag0">${C.holidaysHtml(HY, CIV)}</div>
</section>

<section class="k-sec" aria-labelledby="li-hag1-h">
  <h2 id="li-hag1-h">${L.hagH(Y1.name, yrs(Y1), 0)}</h2>
  <p class="lead2">The year ${HY + 1} begins on <bdi>${L.greg(Y1.start)}</bdi>. ${Y1.leap ? 'It is a leap year, with Adar I and Adar II.' : 'It is a regular year, with one month of Adar.'} Planning a trip, a wedding or a Bar Mitzvah? Here you can see in advance on which day each holiday falls.</p>
  <div id="li-hag1">${C.holidaysHtml(HY + 1, null)}</div>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">Hebrew calendar online: every date in one place</h2>
  <p>The calendar shows every day twice: the Gregorian date in large numbers and the Hebrew date under it. Next to the day it says whether it is a holiday, a fast day, Rosh Chodesh, Memorial Day or Independence Day, and every Shabbat shows the weekly Torah portion. Use the arrows to move to the next or previous month, pick any month and year, or jump back to today with one tap. Holiday and month names are written the way they are said in Hebrew – Rosh Hashanah, Yom Kippur, Sukkot, Hanukkah, Purim, Passover, Shavuot – with a short English explanation where it helps.</p>
  <h3>What is today's Hebrew date?</h3>
  <p>Above the calendar you always see today's date: the day of the week, the Gregorian date and the Hebrew date, for example "${C.todayLine(T)}". On the Jewish calendar a day begins in the evening, at sunset, not at midnight. So on Wednesday evening it is already Thursday's Hebrew date. If you open the page after sunset, it also shows the date that has already begun. Tap any day of the calendar to see its full Hebrew date in English and in Hebrew letters (${he(C.hebHe(T.hdDay))}), the way it is written on invitations and memorial plaques.</p>
  <h3>Which Hebrew year is ${GY}?</h3>
  <p>The Hebrew year is counted from the creation of the world and begins in the autumn, on Rosh Hashanah, the 1st of Tishrei. That is why every Gregorian year spans two Hebrew years. ${GY} began in the year ${HYJAN} and from Rosh Hashanah it is ${HYJAN + 1}. The current Hebrew year is ${HY}, written ${he(C.gem(HY))} in Hebrew letters, and the next one, ${HY + 1}, begins on ${L.greg(Y1.start)}.</p>
  <h3>Jewish holidays ${GY} and ${NEXTG}</h3>
  <p>Below the calendar are two tables: the holidays of the current Hebrew year and of the next one. Each row has the holiday's name, the Hebrew date, the Gregorian date and the day of the week, and the evening it begins – such as the Passover Seder night or the eve of Yom Kippur. So you can see in advance when Hanukkah (${when(ha0)}), Purim, Passover (${when(pe0)}), Israel's Independence Day, Shavuot, Rosh Hashanah (${when(rh1)}), Yom Kippur (${when(yk1)}) and Sukkot (${when(su1)}) will be. Past holidays in the table are faded and the next one is highlighted.</p>
  <h3>The 12 months of the Hebrew calendar</h3>
  <p>The Hebrew calendar is lunisolar: months follow the moon and years are kept in line with the sun. A month has 29 or 30 days, and each one begins with the new moon, Rosh Chodesh. In ${HY} the months are: ${months}. ${Y0.leap ? 'It is a leap year, so it has 13 months: Adar I and Adar II.' : 'It is a regular year with 12 months. A leap year, seven times in every nineteen years, adds a 13th month, and then there are Adar I and Adar II.'} Choose "By Hebrew month" to see a whole Hebrew month with the Gregorian date of each day.</p>
  <h3>Holidays and days off in Israel</h3>
  <p>Days marked "day off" are Yom Tov days and Independence Day: in Israel there is no work, and schools and offices are closed. Chol HaMoed (the intermediate days of Sukkot and Passover), Hanukkah and Purim have a different color: they are festive days, but not legal days off. The exact school vacation dates are set every year by Israel's Ministry of Education, so check them there as well. This calendar follows the custom of the Land of Israel; outside Israel, some festivals have a second day.</p>
  <h3>Weekly Torah portion and Rosh Chodesh</h3>
  <p>Every Shabbat in the calendar shows the weekly Torah portion read in synagogues in Israel: Bereshit, Noach, Lech Lecha and so on, through the yearly cycle. Below the calendar is a list of the special days of the month: Shabbat portions, Rosh Chodesh, holidays and fast days. Rosh Chodesh days are green in the calendar and fast days are purple.</p>
  <h3>Any year, and a printable Hebrew calendar</h3>
  <p>The calendar works for any year from ${I.GY_MIN} to ${I.GY_MAX}. Type a year, such as ${NEXTG}, and browse the months. To find the Hebrew date of a birthday, wedding or yahrzeit, choose the month and tap the day – or use the <a href="/kodesh/taarich-ivri/en/">Hebrew date converter</a>, which also calculates the Bar Mitzvah date and the yahrzeit for the coming years. Remember: an event after sunset belongs to the next Hebrew date. "Print month" gives a clean page, black on white to save ink, and "Print the whole year" prints every month, two to a page.</p>
  <h3>More in English</h3>
  <p>Prayers in Hebrew with English transliteration: <a href="/kodesh/shema-israel/en/">Shema Israel</a>, <a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon (Grace after Meals)</a> and <a href="/kodesh/tefilat-haderech/en/">Tefilat HaDerech, the Traveler's Prayer</a>. For people going through an Orthodox conversion in Israel: <a href="/kodesh/giur/en/">conversion study guide</a>, <a href="/kodesh/giur/en/brachot/">blessings with transliteration</a> and <a href="/kodesh/giur/en/musagim/">a glossary of terms</a>.</p>
  <h3>Why it is free</h3>
  <p>The calendar is part of hakelim.com, a free chesed project of simple tools: free, unlimited, no sign-up and no ads. The calculation runs on your own phone, by the custom of the Land of Israel, using an open-source library that powers many Jewish calendars around the world. Practical halachic questions go to a rabbi.</p>
</section>
${faqHtml(qa, 'Questions and answers')}
<!--/seo-txt-->
`;
  write(path.join(ROOT, 'src/pages/kodesh/luach-ivri/en'), meta, body);
  return HERE;
};
