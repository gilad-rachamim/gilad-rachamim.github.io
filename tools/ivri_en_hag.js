// דף החגים באנגלית: src/pages/kodesh/luach-ivri/en/holidays/index.html  ("Jewish Holidays 2026").
// נקרא מתוך tools/ivri_pages.js. התאריכים מחושבים מאותו קוד של הלוח (assets/kodesh-ivri.js) עם מפת השפה assets/kodesh-ivri-en.js,
// במצב חוץ לארץ (setDia: שני ימים טובים), כי רוב המחפשים באנגלית גרים בארה"ב. טבלת השוואה קטנה מראה גם את מועדי ישראל.
// בדפדפן מתעדכנים לבד "היום" ורשימת המועדים הקרובים (initHag, לפי data-dia); הטבלאות לפי שנה לועזית מתרעננות ברענון השבועי.
// מילות החיפוש: ~/.claude/state/kelim-seo/runs/2026-11-22-us-en/kp.txt (jewish holidays 2026: 100K–1M בארה"ב)
// והמתחרים: ~/.claude/state/kelim-seo/runs/2026-11-22-chagim-en/.
'use strict';
module.exports = function (x) {
  const { I, H, L, T, CIV, HY, ROOT, path, write, faqLd, faqHtml, WA, LANGNAV, ALT3 } = x;
  const C = I.core(H, L); C.setDia(true);                  // חוץ לארץ
  const CI = I.core(H, L);                                   // ישראל, לטבלת ההשוואה
  const GY = CIV.getFullYear(), NEXTG = GY + 1, TK = C.key(CIV);
  const HERE = '/kodesh/luach-ivri/en/holidays/', CAL = '/kodesh/luach-ivri/en/', CONV = '/kodesh/taarich-ivri/en/';
  const grab = (core, from) => [from - 1, from, from + 1, from + 2].reduce((a, hy) => a.concat(core.holidays(hy)), []);
  const all = grab(C, HY), allIL = grab(CI, HY);
  const N = he => L.T[he];
  const S = name => name.replace(/ \(.*\)$/, '');
  const end = r => r.b || r.a;
  const civ = y => all.filter(r => r.a.getFullYear() === y);
  const inY = (y, he, src) => (src || all).filter(r => r.a.getFullYear() === y && r.name === N(he))[0];
  const nextOf = he => all.filter(r => r.name === N(he) && C.key(end(r)) >= TK)[0];
  const when = r => r ? L.greg(r.a) + (r.b && C.key(r.b) !== C.key(r.a) ? ' – ' + L.greg(r.b) : '') : '';
  const eve = r => L.greg(C.add(r.a, -1));
  const wdE = r => r ? C.wd(C.add(r.a, -1)) + ' evening, ' + L.greg(C.add(r.a, -1)) : '';
  const list = (y, hes) => hes.map(he => inY(y, he)).filter(Boolean).map(r => S(r.name) + ' – ' + when(r)).join('; ');
  const left = civ(GY).filter(r => C.key(end(r)) >= TK);

  function civHtml(y) {
    return '<table class="iv-tbl"><thead><tr><th scope="col">Holiday</th><th scope="col">Date</th></tr></thead><tbody>' +
      civ(y).map(r => '<tr' + (C.key(end(r)) < TK ? ' class="past"' : '') + '><th scope="row">' + r.name + (r.sh ? ' <span class="iv-shb">Yom Tov</span>' : '') +
        (r.note ? '<small>' + r.note + '</small>' : '') + '</th><td><b>' + C.span(r.a, r.b) + '</b><small>' + (r.b ? C.wd(r.a) + ' – ' + C.wd(r.b) : C.wd(r.a)) + '</small></td></tr>').join('') +
      '</tbody></table>';
  }
  // ישראל מול חוץ לארץ: שלושת הרגלים, באותה שנה לועזית
  function cmpHtml(y) {
    const pairs = [['סוכות', 'סוכות', 'Sukkot (first days)'], ['שמיני עצרת', 'שמחת תורה ושמיני עצרת', 'Shemini Atzeret'], ['שמחת תורה', 'שמחת תורה ושמיני עצרת', 'Simchat Torah'],
      ['פסח', 'פסח', 'Passover (first days)'], ['שביעי ואחרון של פסח', 'שביעי של פסח', 'Passover (last days)'], ['שבועות', 'שבועות', 'Shavuot']];
    const rows = pairs.map(([d, il, label]) => { const a = inY(y, d), b = inY(y, il, allIL); return a && b ? '<tr><th scope="row">' + label + '</th><td><b>' + C.span(a.a, a.b) + '</b></td><td><b>' + C.span(b.a, b.b) + '</b></td></tr>' : ''; }).join('');
    return '<table class="iv-tbl"><thead><tr><th scope="col">' + y + '</th><th scope="col">USA and outside Israel</th><th scope="col">In Israel</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  const MAIN = ['פורים', 'פסח', 'שבועות', 'ראש השנה', 'יום הכיפורים', 'סוכות', 'חנוכה'];
  const rhG = inY(GY, 'ראש השנה'), rhN = inY(NEXTG, 'ראש השנה'), ykG = inY(GY, 'יום הכיפורים'), ykN = inY(NEXTG, 'יום הכיפורים');
  const suG = inY(GY, 'סוכות'), suN = inY(NEXTG, 'סוכות'), peN = inY(NEXTG, 'פסח'), peG = inY(GY, 'פסח');
  const haG = inY(GY, 'חנוכה'), haN = inY(NEXTG, 'חנוכה'), puN = inY(NEXTG, 'פורים'), shN = inY(NEXTG, 'שבועות');

  const INFO = [
    ['ראש השנה', 'Rosh Hashanah – the Jewish New Year', 'Rosh Hashanah falls on the 1st and 2nd of Tishrei and opens the new Jewish year. It lasts two days everywhere, in Israel and abroad. The shofar, a ram\'s horn, is sounded in the synagogue, and many families eat apple dipped in honey for a sweet year. Rosh Hashanah begins the Ten Days of Repentance, which end on Yom Kippur.'],
    ['יום הכיפורים', 'Yom Kippur – the Day of Atonement', 'Yom Kippur, the 10th of Tishrei, is the most solemn day of the Jewish year. It is a fast of about 25 hours, from before sunset until nightfall the next day, and most of the day is spent in prayer in the synagogue. It ends with the Neilah prayer and a long blast of the shofar.'],
    ['סוכות', 'Sukkot – the Festival of Booths', 'Sukkot begins on the 15th of Tishrei. Meals are eaten in a sukkah, a hut roofed with branches, in memory of the forty years in the desert after the Exodus. On the holiday the four species are held: the lulav (palm branch), etrog (citron), myrtle and willow. Outside Israel the first two days are Yom Tov, followed by the intermediate days of Chol HaMoed.'],
    ['שמחת תורה', 'Shemini Atzeret and Simchat Torah', 'Right after the seven days of Sukkot comes Shemini Atzeret. Outside Israel it is followed by a second day, Simchat Torah, when the yearly cycle of Torah reading is completed and begun again, with dancing around the Torah scrolls. In Israel both are celebrated on a single day.'],
    ['חנוכה', 'Hanukkah – the Festival of Lights', 'Hanukkah starts on the 25th of Kislev and lasts eight days. Each night one more candle is lit, from one on the first night to eight on the last. It recalls the rededication of the Holy Temple in Jerusalem in the days of the Maccabees. Hanukkah is not a Yom Tov: work and school go on as usual. Latkes and doughnuts are the traditional foods.'],
    ['ט״ו בשבט', 'Tu BiShvat – the New Year for Trees', 'Tu BiShvat is the 15th of Shevat. Many eat the fruits the Land of Israel is praised for: grapes, figs, pomegranates, olives and dates. In Israel it is a day for planting trees.'],
    ['פורים', 'Purim', 'Purim falls on the 14th of Adar, or the 14th of Adar II in a leap year. The Book of Esther (the Megillah) is read, gifts of food are sent to friends, gifts are given to the poor, and there is a festive meal. Children and adults dress up in costumes. In Jerusalem Purim is celebrated a day later, on Shushan Purim. The day before Purim is the Fast of Esther.'],
    ['פסח', 'Passover (Pesach)', 'Passover begins on the 15th of Nisan and celebrates the Exodus from Egypt. On the first night, and outside Israel on the second night too, families gather for the Seder and read the Haggadah. Matzah is eaten and no chametz (leavened food) is eaten all through the holiday. Outside Israel Passover lasts eight days: the first two and last two days are Yom Tov, with Chol HaMoed in between.'],
    ['ל״ג בעומר', 'Lag BaOmer', 'Lag BaOmer is the 33rd day of the Omer count, the 18th of Iyar. The Omer is counted for forty-nine days, from Passover to Shavuot. In Israel bonfires are lit, and many travel to Mount Meron.'],
    ['שבועות', 'Shavuot – the giving of the Torah', 'Shavuot falls on the 6th of Sivan, seven weeks after Passover, and marks the giving of the Torah at Mount Sinai. Many stay up the first night learning Torah, and dairy foods are customary. Outside Israel Shavuot lasts two days, in Israel one.'],
    ['תשעה באב', "Tisha B'Av and the other fast days", "Tisha B'Av, the 9th of Av, is a day of mourning for the destruction of the First and Second Temples. The fast begins before sunset the evening before and ends at nightfall. There are four more fast days, from dawn to nightfall: the Fast of Gedaliah, the 10th of Tevet, the Fast of Esther and the 17th of Tammuz. When a fast falls on Shabbat it is moved, and the tables show the moved date."],
    ['יום העצמאות', 'Israel\'s national days', 'In spring Israel marks Yom HaShoah, Holocaust Remembrance Day (27 Nisan), Yom HaZikaron, the memorial day for Israel\'s fallen soldiers (4 Iyar), Yom HaAtzmaut, Israel Independence Day (5 Iyar), and Yom Yerushalayim, Jerusalem Day (28 Iyar). These dates are sometimes moved by a day or two so they do not touch Shabbat; the tables show the day they are actually marked.']
  ];
  const infoHtml = INFO.map(([he, h, p]) => { const r = nextOf(he); return `  <h3>${h}</h3>\n  <p>${p}${r ? ' Next date: <b>' + when(r) + '</b>.' : ''}</p>`; }).join('\n');

  const qa = [
    ['What are the Jewish holidays in ' + GY + '?', (left.length ? 'Still ahead in ' + GY + ': ' + left.map(r => S(r.name) + ' – ' + when(r)).join('; ') + '.' : 'All the holidays of ' + GY + ' have passed.') + ' The full list is in the table "Jewish holidays ' + GY + '" on this page.'],
    ['What are the Jewish holidays in ' + NEXTG + '?', 'The main dates of ' + NEXTG + ': ' + list(NEXTG, MAIN) + '. Every other date, including the fast days and Israel\'s national days, is in the table "Jewish holidays ' + NEXTG + '".'],
    ['When is Yom Kippur ' + GY + '?', 'Yom Kippur ' + GY + ': ' + when(ykG) + '. The fast begins before sunset on ' + wdE(ykG) + ', and ends at nightfall. Yom Kippur ' + NEXTG + ': ' + when(ykN) + '.'],
    ['When is Rosh Hashanah ' + GY + ' and ' + NEXTG + '?', 'Rosh Hashanah ' + GY + ': ' + when(rhG) + ', beginning on ' + wdE(rhG) + '. Rosh Hashanah ' + NEXTG + ': ' + when(rhN) + '.'],
    ['When is Hanukkah ' + GY + '?', 'Hanukkah ' + GY + ': ' + when(haG) + '. The first candle is lit on the evening of ' + eve(haG) + '. Hanukkah ' + NEXTG + ': ' + when(haN) + ', first candle on the evening of ' + eve(haN) + '.'],
    ['When is Passover ' + NEXTG + '?', 'Passover ' + NEXTG + ' outside Israel: ' + when(peN) + ' (first days), and eight days in all. The first Seder is on the evening of ' + eve(peN) + ', and the second Seder the next evening.'],
    ['Which Jewish holiday is coming up soon?', 'The list "Upcoming Jewish holidays" at the top of this page always shows the next six dates and how many days are left until each one. It updates by itself every time you open the page.'],
    ['What are the most important holidays in Judaism?', 'The holidays written in the Torah are Rosh Hashanah, Yom Kippur and the three pilgrimage festivals: Passover, Shavuot and Sukkot (with Shemini Atzeret). Rosh Hashanah and Yom Kippur are known as the High Holidays. Hanukkah and Purim were added later, in the days of the Second Temple and the Book of Esther.'],
    ['Why do Jewish holidays start at sunset?', 'On the Hebrew calendar the day begins at sunset, not at midnight. So every holiday and every fast day begins on the evening before the date in the table, and ends at nightfall.'],
    ['Why do the dates of Jewish holidays change every year?', 'The Hebrew calendar is lunisolar: months follow the moon, and some years get a thirteenth month (Adar II) so the holidays stay in their season. On the Hebrew calendar a holiday always has the same date; on the Gregorian calendar it moves. You can convert any date with the <a href="' + CONV + '">Hebrew date converter</a>. Learning to read Hebrew: <a href="/kodesh/alefbet/en/">the Hebrew alphabet</a>.'],
    ['Why are some holidays one day longer outside Israel?', 'Outside Israel the first and last days of Passover, the first day of Sukkot, Shemini Atzeret and Shavuot are each kept for two days, so Passover lasts eight days and Shavuot two. In Israel each of these is one day. Rosh Hashanah is two days everywhere and Yom Kippur one day everywhere. The tables on this page follow the dates outside Israel, and a separate table shows the dates in Israel.'],
    ['What does "Yom Tov" mean in the tables?', 'Yom Tov marks a festival day on which work is not done, much like Shabbat. Chol HaMoed, Hanukkah and Purim are festive days but not Yom Tov. For questions about what is allowed on a given day, ask a rabbi.'],
    ['Is this page free?', 'Yes. The holiday tables, the upcoming-holidays list and printing are free, with no sign-up and no ads. It opens in any phone or computer browser.']
  ];
  const meta = {
    site: 'kodesh', lang: 'en', alt: ALT3, crumb_root: 'Jewish tools', tool: 'chagim_en', no_hub: true,
    title: 'Jewish Holidays ' + GY + ' and ' + NEXTG + ': Dates and Calendar',
    description: 'Jewish holidays ' + GY + ' and ' + NEXTG + ': Rosh Hashanah, Yom Kippur, Sukkot, Hanukkah, Purim, Passover and Shavuot dates, the evening each begins, for the USA and Israel. Free.',
    og_title: 'Jewish Holidays ' + GY + '–' + NEXTG + ': all the dates',
    priority: '0.8',
    crumbs: [['Hebrew calendar', CAL], ['Jewish holidays', null]],
    head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/lang-switch.css">' + faqLd(qa),
    foot: '<script src="/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js" data-hebcal defer></script><script src="/assets/kodesh-ivri-en.js" defer></script><script src="/assets/kodesh-ivri.js" defer></script>'
  };
  const body = `<header class="k-hero no-print">
  <h1>Jewish Holidays ${GY} and ${NEXTG}: Dates and Calendar</h1>
  <p class="sub">Every Jewish holiday and fast day of ${GY} and ${NEXTG}: the date, the day of the week and the evening it begins. Dates for the USA and outside Israel, with the Israel dates alongside.</p>
</header>
${LANGNAV('en', ALT3)}
<p class="iv-today no-print"><span id="pr-today"><b>Today:</b> ${C.todayLine(T)}</span></p>
<div class="tool" id="pr" data-dia="1">
  <h2>Upcoming Jewish holidays</h2>
  <div id="pr-up" aria-live="polite">${C.upcomingHtml(CIV, 6)}</div>
  <p class="disclaimer">This list updates by itself: it always shows the next six dates and the days left until each. Every holiday begins the evening before.</p>
  <div class="share-row no-print">
    <a class="btn btn-gold btn-sm" href="${CAL}">Open the Hebrew calendar</a>
    <button class="btn btn-line btn-sm" type="button" onclick="window.print()">Print</button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="Jewish holidays ${GY} and ${NEXTG}: every date and the evening it begins. Free, no ads:" target="_blank" rel="noopener">${WA} Share</a>
  </div>
</div>

<section class="k-sec" aria-labelledby="pr-y0-h" id="y${GY}">
  <h2 id="pr-y0-h">Jewish holidays ${GY}</h2>
  <p class="lead2">All the dates from January to December ${GY}, in order, for the USA and outside Israel. Past dates are shown lighter. "Yom Tov" marks a festival day on which work is not done.</p>
  ${civHtml(GY)}
</section>

<section class="k-sec" aria-labelledby="pr-y1-h" id="y${NEXTG}">
  <h2 id="pr-y1-h">Jewish holidays ${NEXTG}</h2>
  <p class="lead2">Planning a trip, a vacation or a family celebration? Here you can see ahead of time the date and the day of the week of every holiday in ${NEXTG}.</p>
  ${civHtml(NEXTG)}
</section>

<section class="k-sec" aria-labelledby="pr-il-h" id="israel">
  <h2 id="pr-il-h">Holiday dates in Israel and outside Israel</h2>
  <p class="lead2">Sukkot, Passover and Shavuot have one more day of Yom Tov outside Israel. If you are travelling to Israel for the holidays, or have family there, these are the dates side by side.</p>
  ${cmpHtml(GY)}
  ${cmpHtml(NEXTG)}
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">The Jewish holidays: what they are and when they fall</h2>
  <p>The Jewish holidays follow the cycle of the Hebrew year. In the autumn, in the month of Tishrei, Rosh Hashanah, Yom Kippur, Sukkot, Shemini Atzeret and Simchat Torah come one after another. Winter brings Hanukkah, Tu BiShvat and Purim. Spring brings Passover, Israel's national days, Lag BaOmer and Shavuot. In the summer come the fasts of the 17th of Tammuz and Tisha B'Av. This page lists all of these dates for ${GY} and ${NEXTG}: the tables above give the date and the day of the week, and below is a short explanation of each holiday with its next date.</p>
${infoHtml}
  <h3>Why holidays begin in the evening</h3>
  <p>On the Hebrew calendar the day begins at sunset. So a holiday begins on the evening before the date in the table. For example, if the first day of Passover is ${when(peN)}, the first Seder is held on the evening of ${eve(peN)}. The same goes for the fasts of Yom Kippur and Tisha B'Av: they begin in the evening. A holiday ends not at midnight but at nightfall. The tables note, next to the main holidays, on which evening they begin. For the exact candle-lighting time in your city, check a local synagogue or Jewish calendar for your city.</p>
  <h3>Why the dates are different every year</h3>
  <p>The Hebrew calendar is lunisolar. A month is one cycle of the moon, 29 or 30 days, and so that the holidays do not drift out of their seasons, some years add a thirteenth month, Adar II. That is why Passover is always on the 15th of Nisan on the Hebrew calendar, but on the Gregorian calendar it can fall at the end of March or late in April. To see how the Hebrew months line up with the Gregorian ones, open the <a href="${CAL}">Hebrew calendar by month</a>, or convert any single date with the <a href="${CONV}">Hebrew date converter</a>.</p>
  <h3>Holidays in the USA and in Israel</h3>
  <p>The tables on this page follow the custom outside Israel, as kept in the USA, Canada, the UK and every other country outside the Land of Israel. Outside Israel Sukkot, Shemini Atzeret, Passover and Shavuot each have an extra day of Yom Tov, so Passover lasts eight days and Shavuot two, and Simchat Torah is the day after Shemini Atzeret. In Israel Passover lasts seven days, Shavuot one, and Shemini Atzeret and Simchat Torah are the same day. Rosh Hashanah is two days everywhere and Yom Kippur one day everywhere. The table "Holiday dates in Israel and outside Israel" shows both.</p>
  <h3>Planning work and school around the holidays</h3>
  <p>Many people use this page to plan time off for Rosh Hashanah, Yom Kippur, Sukkot, Passover and Shavuot, and to schedule school tests, meetings and events so they do not fall on a holiday. Remember that each holiday starts the evening before, so an event on the evening before Yom Tov will also clash. Hanukkah, Purim and the days of Chol HaMoed are festive days but are not Yom Tov.</p>
  <h3>More in English</h3>
  <p>Every day of the year on the Gregorian and the Hebrew calendar, with the weekly Torah portion and a printable month: <a href="${CAL}">Hebrew calendar</a>. A Hebrew birthday, a bar or bat mitzvah date or a yahrzeit: <a href="${CONV}">Hebrew date converter</a>. Candle lighting times for Shabbat and every holiday in your city: <a href="/kodesh/shabat/en/">Shabbat times</a>. Today's halachic times for your city: <a href="/kodesh/zmanim/en/">zmanim</a>. Prayers in Hebrew with English transliteration: <a href="/kodesh/shema-israel/en/">the Shema</a>, <a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon, the grace after meals</a> and <a href="/kodesh/tefilat-haderech/en/">Tefilat Haderech, the traveler's prayer</a>. For people converting to Judaism in Israel: <a href="/kodesh/giur/en/">preparing for conversion</a>.</p>
  <h3>Why it is free</h3>
  <p>This page is part of "Gilad Rachamim's Tools": simple tools, free, with no sign-up and no ads. The dates are calculated on your own device with the same open-source library that many Jewish calendars around the world use. It gives dates and general background only; for questions about how to keep a holiday in practice, ask a rabbi.</p>
</section>
${faqHtml(qa, 'Questions and answers')}
<!--/seo-txt-->
`;
  write(path.join(ROOT, 'src/pages/kodesh/luach-ivri/en/holidays'), meta, body);
  return HERE;
};
