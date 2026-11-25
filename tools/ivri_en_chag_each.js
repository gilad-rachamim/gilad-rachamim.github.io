// דף נפרד לכל חג באנגלית: src/pages/kodesh/luach-ivri/en/holidays/<slug>/index.html (8 דפים).
// נקרא מתוך tools/ivri_pages.js אחרי דף החגים הכללי. התאריכים מאותו קוד של הלוח (assets/kodesh-ivri.js)
// במצב חוץ לארץ, עם טבלת ישראל לצד. הכותרת בנויה מהשנה של המועד הבא (Y ו-Y+1), והרענון השבועי (ivri.yml) מגלגל אותה.
// מחקר: ~/.claude/state/kelim-seo/runs/2026-11-23-chagim-each-en/ (נפחים בארה"ב, 5 המתחרים, שער מקום ראשון).
'use strict';
module.exports = function (x) {
  const { I, H, L, CIV, HY, ROOT, path, write, faqLd, faqHtml, WA } = x;
  const C = I.core(H, L); C.setDia(true);
  const CI = I.core(H, L);
  const TK = C.key(CIV);
  const HUB = '/kodesh/luach-ivri/en/holidays/', CAL = '/kodesh/luach-ivri/en/', CONV = '/kodesh/taarich-ivri/en/';
  const range = core => { let a = []; for (let hy = HY - 2; hy <= HY + 7; hy++) a = a.concat(core.holidays(hy)); return a; };
  const all = range(C), allIL = range(CI);
  const end = r => r.b || r.a;
  const S = n => n.replace(/ \(.*\)$/, '');
  const iso = d => C.key(d);
  const eveD = r => C.add(r.a, -1);
  const when = r => L.greg(r.a) + (r.b && iso(r.b) !== iso(r.a) ? ' – ' + L.greg(r.b) : '');
  const eveTxt = r => C.wd(eveD(r)) + ' evening, ' + L.greg(eveD(r));
  const days = r => r.b ? Math.round((r.b - r.a) / 864e5) + 1 : 1;
  const occ = (name, src) => (src || all).filter(r => r.name === name);
  const nextOcc = name => occ(name).filter(r => iso(end(r)) >= TK);
  const prevOcc = name => occ(name).filter(r => iso(end(r)) < TK).pop();
  const near = (name, d, src) => occ(name, src).filter(r => Math.abs(r.a - d) < 200 * 864e5)[0];

  const N = {
    rh: 'Rosh Hashanah (Jewish New Year)', gd: 'Fast of Gedaliah', yk: 'Yom Kippur (Day of Atonement)',
    su: 'Sukkot', cms: 'Chol HaMoed Sukkot', sa: 'Shemini Atzeret', st: 'Simchat Torah', saIL: 'Simchat Torah and Shemini Atzeret',
    ha: 'Hanukkah', tu: 'Tu BiShvat', fe: 'Fast of Esther', pu: 'Purim', sp: 'Shushan Purim (Purim in Jerusalem)', pk: 'Purim Katan',
    pe: 'Passover (Pesach)', cmp: 'Chol HaMoed Pesach', lp: 'Last days of Passover', lpIL: 'Seventh day of Passover', sh: 'Shavuot'
  };

  const PAGES = [
    { slug: 'hanukkah', name: 'Hanukkah', main: N.ha, len: 'eight days', tail: 'Dates and Candle Lighting', related: [N.ha], il: null,
      lead: Y => `Hanukkah ${Y} and ${Y + 1}: the eight days, the evening of the first candle, a night-by-night candle chart and the dates for the next five years.`,
      desc: (Y, r) => `Hanukkah ${Y}: ${when(r)}, first candle ${C.wd(eveD(r))} evening ${L.greg(eveD(r))}. Candle chart for all 8 nights and dates to ${Y + 4}. Free, no ads.` },
    { slug: 'passover', name: 'Passover', main: N.pe, tail: 'Dates and Seder Nights', last: [N.lp, N.lpIL], len: 'eight days outside Israel and seven in Israel', related: [N.pe, N.cmp, N.lp], il: [[N.pe, N.pe, 'First day(s) of Yom Tov'], [N.lp, N.lpIL, 'Last day(s) of Yom Tov']],
      lead: Y => `Passover ${Y} and ${Y + 1}: the Seder nights, the Yom Tov days and Chol HaMoed day by day, the dates in the USA and in Israel, and the next five years.`,
      desc: (Y, r) => `Passover ${Y}: ${when(r)}, first Seder ${C.wd(eveD(r))} evening ${L.greg(eveD(r))}. All 8 days, Israel dates and the next 5 years. Free, no sign-up.` },
    { slug: 'rosh-hashanah', name: 'Rosh Hashanah', main: N.rh, len: 'two days', tail: 'Dates and When It Starts', related: [N.rh, N.gd, N.yk], il: null,
      lead: Y => `Rosh Hashanah ${Y} and ${Y + 1}: the two days of the Jewish New Year, the evening it begins, the Ten Days of Repentance and the dates for the next five years.`,
      desc: (Y, r) => `Rosh Hashanah ${Y}: ${when(r)}, starts ${C.wd(eveD(r))} evening ${L.greg(eveD(r))}. Jewish New Year dates to ${Y + 4}, customs and FAQ. Free, no ads.` },
    { slug: 'yom-kippur', name: 'Yom Kippur', main: N.yk, phrase: Y => 'When Is Yom Kippur ' + Y, title: Y => `When Is Yom Kippur ${Y}? Dates for the Next 5 Years`, related: [N.rh, N.yk, N.su], il: null,
      lead: Y => `When is Yom Kippur ${Y}? The date, the evening the fast begins, and Yom Kippur for the next five years, with the days around it.`,
      desc: (Y, r) => `When is Yom Kippur ${Y}? ${C.wd(r.a)} ${L.greg(r.a)}; the fast begins ${C.wd(eveD(r))} evening ${L.greg(eveD(r))}. Dates to ${Y + 4}. Free, no sign-up.` },
    { slug: 'purim', name: 'Purim', main: N.pu, tail: 'Dates and Fast of Esther', related: [N.fe, N.pu, N.sp], il: null,
      lead: Y => `Purim ${Y} and ${Y + 1}: the Fast of Esther, Purim and Shushan Purim, the evening the Megillah is read, and the dates for the next five years.`,
      desc: (Y, r) => `Purim ${Y}: ${C.wd(r.a)} ${L.greg(r.a)}, Megillah on ${C.wd(eveD(r))} evening. Fast of Esther, Shushan Purim and dates to ${Y + 4}. Free, no ads.` },
    { slug: 'sukkot', name: 'Sukkot', main: N.su, tail: 'Dates and Simchat Torah', last: [N.st, N.saIL], len: 'nine days outside Israel with Shemini Atzeret and Simchat Torah, eight in Israel', related: [N.su, N.cms, N.sa, N.st], il: [[N.su, N.su, 'Sukkot (Yom Tov)'], [N.sa, N.saIL, 'Shemini Atzeret'], [N.st, N.saIL, 'Simchat Torah']],
      lead: Y => `Sukkot ${Y} and ${Y + 1}: Yom Tov, Chol HaMoed, Hoshana Rabbah, Shemini Atzeret and Simchat Torah day by day, in the USA and in Israel, and the next five years.`,
      desc: (Y, r) => `Sukkot ${Y}: ${when(r)}, starts ${C.wd(eveD(r))} evening ${L.greg(eveD(r))}. Shemini Atzeret, Simchat Torah, Israel dates, 5 years. Free, no ads.` },
    { slug: 'shavuot', name: 'Shavuot', main: N.sh, len: 'two days outside Israel and one day in Israel', tail: 'Dates and When It Starts', related: [N.sh], il: [[N.sh, N.sh, 'Shavuot']],
      lead: Y => `Shavuot ${Y} and ${Y + 1}: the evening it begins, the two days outside Israel and the one day in Israel, and the dates for the next five years.`,
      desc: (Y, r) => `Shavuot ${Y}: ${when(r)}, starts ${C.wd(eveD(r))} evening ${L.greg(eveD(r))}. USA and Israel dates, customs and the next 5 years. Free, no sign-up.` },
    { slug: 'tu-bishvat', name: 'Tu BiShvat', main: N.tu, tail: 'Date and Customs', related: [N.tu], il: null,
      lead: Y => `Tu BiShvat ${Y} and ${Y + 1}: the New Year for Trees, the evening it begins, the seven species and the dates for the next five years.`,
      desc: (Y, r) => `Tu BiShvat ${Y}: ${C.wd(r.a)} ${L.greg(r.a)}, begins ${C.wd(eveD(r))} evening. The New Year for Trees, the seven species and dates to ${Y + 4}. Free.` }
  ];

  // ---------- טקסט קבוע לכל חג (רקע כללי בלבד, בלי פסיקה) ----------
  const TXT = {
    hanukkah: (r, Y) => [
      ['What Hanukkah celebrates', `Hanukkah begins on the 25th of the Hebrew month of Kislev and lasts eight days. It recalls the victory of the Maccabees, a small group of Jews led by the Hasmonean family, over the Seleucid Greek empire in the second century BCE, and the rededication of the Holy Temple in Jerusalem. The Talmud tells that the Maccabees found only one sealed jar of pure oil, enough to light the Temple menorah for a single day, and it burned for eight days. That is why the holiday lasts eight days and why its central practice is lighting lights. The word Hanukkah means "dedication".`],
      ['How the menorah is lit', `A Hanukkah menorah, also called a hanukkiah, has eight branches in a row plus a separate place for the shamash, the helper candle used to light the others. On the first night one candle is lit, on the second night two, and so on until all eight burn on the last night. Candles are placed from right to left, and the newest one is lit first. The blessings are said before lighting: on the first night three blessings, and on the other nights two. The full text in Hebrew, transliteration and English is on the page <a href="/kodesh/chanuka/en/">Hanukkah blessings</a>. Many families place the menorah by a window or the front door, so that people outside can see the lights. Over the eight nights, counting the shamash, 44 candles are used.`],
      ['Hanukkah on Friday and Saturday night', `On Friday the Hanukkah candles are lit before the Shabbat candles, before sunset, and they need enough oil or long enough candles to keep burning until well after dark. On Saturday night they are lit after Shabbat ends. The exact time to light depends on your city and on family custom; for the time Shabbat begins and ends where you live, see <a href="/kodesh/shabat/en/candle-lighting/">candle lighting times</a>, and for questions of practice ask a rabbi.`],
      ['Food, dreidel and gelt', `Because the miracle was about oil, foods fried in oil are traditional: potato latkes in many homes, and sufganiyot, jelly doughnuts, especially in Israel. Children play with a dreidel, a four-sided spinning top. Its letters, nun, gimel, hei and shin, stand for the words "a great miracle happened there"; in Israel the last letter is pe, for "here". Many families give Hanukkah gelt, coins or chocolate coins, and in many homes gifts too.`],
      ['Is Hanukkah a day off?', `Hanukkah is not a Yom Tov. Work, school and driving go on as usual, and the holiday is marked by lighting the menorah each evening, by adding the Al HaNissim prayer and the full Hallel in the daily prayers, and by festive meals. Hanukkah falls in November or December on the Gregorian calendar, which is why its date seems to move every year.`]
    ],
    passover: (r, Y) => [
      ['What Passover celebrates', `Passover, Pesach in Hebrew, begins on the 15th of Nisan and celebrates the Exodus, when the Israelites left slavery in Egypt. The Torah calls it the festival of matzot and the festival of spring. In Israel Passover lasts seven days; outside Israel it lasts eight. The first and last days are Yom Tov, days on which work is not done, and the days in between are Chol HaMoed, the intermediate days.`],
      ['The Seder night', `On the first night of Passover families gather for the Seder, a festive meal in a set order, and read the Haggadah, the story of the Exodus. Its parts include Kiddush over the first of four cups of wine, the four questions asked by the youngest child, eating matzah and maror (bitter herbs), and songs of praise at the end. Outside Israel a second Seder is held on the second night. For the Kiddush text in Hebrew, transliteration and English, see <a href="/kodesh/kiddush/en/">Kiddush</a>.`],
      ['Chametz and matzah', `All through Passover no chametz is eaten or kept: bread, cakes, pasta, beer and anything made from wheat, barley, spelt, oats or rye that was allowed to rise. Before the holiday the home is cleaned, a search for chametz is made on the evening before Passover, and many sell the chametz they keep through a rabbi. Matzah, unleavened bread, is eaten in its place. Questions about which foods are kosher for Passover, and about medicines, should be asked of a rabbi.`],
      ['Counting the Omer', `On the second night of Passover the counting of the Omer begins: forty-nine days, counted each evening, leading up to Shavuot. Each evening has its own count and blessing; you can see tonight's count on the page <a href="/kodesh/omer/en/">Omer count tonight</a>.`],
      ['Passover in the USA and in Israel', `Because Passover is eight days outside Israel and seven in Israel, families who travel or have relatives in Israel see different dates for the last days. The table "Passover in Israel and outside Israel" on this page shows both, for this year and the next.`]
    ],
    'rosh-hashanah': (r, Y) => [
      ['What Rosh Hashanah is', `Rosh Hashanah, "head of the year", is the Jewish New Year. It falls on the 1st and 2nd of Tishrei and lasts two days everywhere, in Israel and outside it. In the Torah it is called the day of the sounding of the shofar. The prayers speak of God as King and Judge, and the day opens the Ten Days of Repentance, which end on Yom Kippur.`],
      ['The shofar', `The shofar, a ram's horn, is sounded in the synagogue during the morning service on both days of Rosh Hashanah. There are three kinds of sounds: tekiah, a long blast, shevarim, three broken blasts, and teruah, a series of short blasts. When the first day of Rosh Hashanah falls on Shabbat, the shofar is not sounded that day, only on the second day.`],
      ['Rosh Hashanah foods and greetings', `At the festive meals many dip apple in honey for a sweet year, eat a round challah, and eat symbolic foods such as pomegranate, dates, leek, beets and a fish or ram's head, each with a short prayer. The common greeting is "Shanah Tovah", a good year. On the first afternoon, or on the second if the first day is Shabbat, many go to a river, sea or spring for Tashlich, a short prayer.`],
      ['Which days Rosh Hashanah can fall on', `By the rules of the fixed Hebrew calendar, Rosh Hashanah never begins on a Sunday, a Wednesday or a Friday. It always falls on a Monday, Tuesday, Thursday or Shabbat. In the Gregorian calendar it falls in September or early October.`],
      ['The days after Rosh Hashanah', `The day after Rosh Hashanah is the Fast of Gedaliah, a fast from dawn to nightfall; when it falls on Shabbat it moves to Sunday. A week later comes <a href="${HUB}yom-kippur/">Yom Kippur</a>, and five days after that <a href="${HUB}sukkot/">Sukkot</a>. The table "Rosh Hashanah to Yom Kippur" on this page lists all three.`]
    ],
    'yom-kippur': (r, Y) => [
      ['What Yom Kippur is', `Yom Kippur, the Day of Atonement, falls on the 10th of Tishrei, ten days after Rosh Hashanah. It is the most solemn day of the Jewish year, a day of fasting, prayer and repentance. It is a full Yom Tov, the same in Israel and outside Israel, and lasts one day everywhere.`],
      ['When the fast begins and ends', `The fast begins before sunset on the evening before the date in the table and ends after nightfall the next day, about 25 hours in all. Before it begins there is a festive meal, the seudah mafseket. The exact time in your city depends on sunset there; check a local synagogue or Jewish calendar, or <a href="/kodesh/shabat/en/candle-lighting/">candle lighting times</a> for your city.`],
      ['The five restrictions', `On Yom Kippur five things are avoided: eating and drinking, washing, anointing the body with oils or creams, wearing leather shoes, and marital relations. Anyone who is ill, pregnant, nursing or taking regular medicine should ask a rabbi, together with their doctor, before the fast, and children are not required to fast.`],
      ['The prayers of the day', `Yom Kippur begins with Kol Nidre in the evening. The next day has the morning prayer, Musaf, Minchah and the closing prayer Neilah, which ends with a single long blast of the shofar. Many wear white, and in many communities a memorial prayer, Yizkor, is said for parents and relatives who have passed away.`],
      ['Which days Yom Kippur can fall on', `Because of the rules of the Hebrew calendar, Yom Kippur never falls on a Sunday, a Tuesday or a Friday. It is always on a Monday, Wednesday, Thursday or Shabbat. When it falls on Shabbat, it is still kept as a fast day. In the Gregorian calendar it falls in September or October, and is followed five days later by <a href="${HUB}sukkot/">Sukkot</a>.`]
    ],
    purim: (r, Y) => [
      ['What Purim celebrates', `Purim recalls the events of the Book of Esther, when Haman, a minister of the Persian king Ahasuerus, plotted to destroy the Jews of the empire, and Queen Esther and her cousin Mordechai turned the decree around. The name comes from "pur", the lot Haman cast to choose the day. Purim falls on the 14th of Adar, and in a leap year on the 14th of Adar II.`],
      ['The four mitzvot of Purim', `There are four main practices on Purim: hearing the Megillah, the Book of Esther, read in the evening and again in the morning; sending mishloach manot, gifts of at least two kinds of ready-to-eat food to at least one friend; giving matanot la'evyonim, gifts to at least two poor people; and a festive meal in the afternoon. Many also give a half-coin to charity before Purim, in memory of the half-shekel.`],
      ['Costumes and hamantaschen', `Children and adults dress up in costumes, and synagogues are noisy during the Megillah reading, when Haman's name is drowned out. Hamantaschen, triangle cookies filled with poppy seed, jam or chocolate, are the best-known Purim food.`],
      ['The Fast of Esther and Shushan Purim', `The day before Purim is the Fast of Esther, from dawn to nightfall; when that day is Shabbat, the fast is held on the Thursday before. In cities that had a wall in the days of Joshua, above all Jerusalem, Purim is celebrated a day later, on the 15th of Adar, called Shushan Purim. The table "Fast of Esther, Purim and Shushan Purim" on this page lists all three.`],
      ['Is Purim a day off?', `Purim is a festive day but not a Yom Tov: work and driving are allowed. In Israel many schools close. In a Hebrew leap year there is also a Purim Katan, a "little Purim", on the 14th of Adar I, a month before Purim, with no special practices.`]
    ],
    sukkot: (r, Y) => [
      ['What Sukkot celebrates', `Sukkot, the Festival of Booths, begins on the 15th of Tishrei, five days after <a href="${HUB}yom-kippur/">Yom Kippur</a>. For seven days meals are eaten in a sukkah, a temporary hut, in memory of the clouds that sheltered the Israelites in the desert after the Exodus. It is also the festival of the harvest, and the Torah calls it "the time of our joy".`],
      ['Building a sukkah', `A sukkah has at least three walls and a roof of schach: branches, palm leaves, bamboo or other plant material that grew from the ground, laid loosely so that more shade than sun comes through. Many decorate it with fruit, paper chains and pictures. The sukkah is built under the open sky, not under a tree or a balcony. For questions about the exact rules, ask a rabbi.`],
      ['The four species', `Each day of Sukkot except Shabbat, the four species are held together and waved: the lulav (a closed palm branch), the etrog (a citron), three myrtle branches and two willow branches. They are held during the Hallel prayer, and in the synagogue there is a procession, the hakafot, around the bimah.`],
      ['Chol HaMoed and Hoshana Rabbah', `Outside Israel the first two days are Yom Tov and the next days are Chol HaMoed; in Israel only the first day is Yom Tov. The last day of Chol HaMoed is Hoshana Rabbah, when seven processions are made in the synagogue and a bundle of willows is beaten on the ground.`],
      ['Shemini Atzeret and Simchat Torah', `Right after the seven days of Sukkot comes Shemini Atzeret. Outside Israel it is followed by Simchat Torah, when the yearly cycle of Torah reading is finished and begun again, with singing and dancing around the Torah scrolls. In Israel both are celebrated on the same day. The table "Sukkot in Israel and outside Israel" on this page shows the dates side by side.`]
    ],
    shavuot: (r, Y) => [
      ['What Shavuot celebrates', `Shavuot, the Festival of Weeks, falls on the 6th of Sivan, at the end of the seven weeks of the Omer count that begins on <a href="${HUB}passover/">Passover</a>. It marks the giving of the Torah at Mount Sinai. It is also the festival of the wheat harvest and of the first fruits, which were brought to the Temple in Jerusalem.`],
      ['One day in Israel, two days outside', `In Israel Shavuot is one day of Yom Tov. Outside Israel it lasts two days, the 6th and 7th of Sivan. Both are Yom Tov, days on which work is not done. Like every holiday, it begins on the evening before the first date.`],
      ['Learning through the night', `Many stay awake on the first night of Shavuot learning Torah until dawn, a custom called Tikkun Leil Shavuot, and then pray the morning prayer at sunrise. In the synagogue the Ten Commandments are read from the Torah, and the Book of Ruth is read too.`],
      ['Dairy foods and greenery', `It is customary to eat dairy foods on Shavuot, such as cheesecake and blintzes, and many decorate the home and the synagogue with flowers and greenery. In Israel, kibbutzim and schools hold first-fruits festivals.`],
      ['Counting to Shavuot', `Shavuot is the only holiday that the Torah does not tie to a date in the month but to a count: fifty days from the second day of Passover. You can follow the count each evening on the page <a href="/kodesh/omer/en/">Omer count tonight</a>.`]
    ],
    'tu-bishvat': (r, Y) => [
      ['What Tu BiShvat is', `Tu BiShvat is the 15th day of the Hebrew month of Shevat. "Tu" is the number 15 written in Hebrew letters. The Mishnah calls it the New Year for Trees. It is the date from which the age of a fruit tree and the year of its fruit are counted for the laws of tithes and of orlah, the fruit of a tree's first three years.`],
      ['The seven species', `On Tu BiShvat many eat fruit, especially the seven species for which the Torah praises the Land of Israel: wheat, barley, grapes, figs, pomegranates, olives and dates. Some try a fruit they have not yet eaten that season, so as to say the Shehecheyanu blessing.`],
      ['The Tu BiShvat Seder', `The Kabbalists of Safed began the custom of a Tu BiShvat Seder: a meal of many fruits, in an order, with four cups of wine from white to red, and readings about trees and the Land of Israel. Today it is held in many homes, schools and synagogues.`],
      ['Planting trees in Israel', `In Israel Tu BiShvat falls at the end of the winter rains, when the almond trees begin to blossom. Schoolchildren and families plant trees all over the country, and the day has become a day of caring for nature.`],
      ['Is Tu BiShvat a day off?', `Tu BiShvat is not a Yom Tov. Work and school go on as usual. The penitential Tachanun prayer is not said, and many avoid fasting on that day.`]
    ]
  };

  const sibs = PAGES.map(p => `<a href="${HUB}${p.slug}/">${p.name}</a>`);
  const done = [];
  // פסח וסוכות: מהיום הראשון עד היום האחרון (כולל חול המועד), לא רק ימי החג הראשונים
  const full = (p, rr, il) => { if (!rr || !p.last) return rr; const l = near(p.last[il ? 1 : 0], rr.a, il ? allIL : all); return l ? Object.assign({}, rr, { b: end(l) }) : rr; };
  for (const p of PAGES) {
    const nx = nextOcc(p.main).map(o => full(p, o)), r = nx[0], pv = full(p, prevOcc(p.main));
    const Y = r.a.getFullYear();
    const phrase = p.phrase ? p.phrase(Y) : p.name + ' ' + Y;
    const title = p.title ? p.title(Y) : `${p.name} ${Y} and ${Y + 1}: ${p.tail}`;
    const h1 = p.title ? `When Is Yom Kippur ${Y}? Date and When the Fast Begins` : `${p.name} ${Y} and ${Y + 1}: ${p.tail}`;
    const r1 = nx[1];
    // טבלת 5 שנים
    const five = [pv].concat(nx.slice(0, 5)).filter(Boolean);
    const ilOf = rr => p.il ? full(p, near(p.il[0][1], rr.a, allIL), true) : null;
    const fiveHtml = '<table class="iv-tbl"><thead><tr><th scope="col">Year</th><th scope="col">' + (p.il ? 'USA and outside Israel' : 'Dates') + '</th><th scope="col">Begins (evening)</th>' + (p.il ? '<th scope="col">In Israel</th>' : '') + '</tr></thead><tbody>' +
      five.map(rr => { const il = ilOf(rr); return '<tr' + (iso(end(rr)) < TK ? ' class="past"' : '') + '><th scope="row">' + rr.a.getFullYear() + '</th><td><b>' + C.span(rr.a, rr.b) + '</b><small>' + (rr.b ? C.wd(rr.a) + ' – ' + C.wd(rr.b) : C.wd(rr.a)) + '</small></td><td>' + C.wd(eveD(rr)) + '<small>' + L.greg(eveD(rr)) + '</small></td>' + (p.il ? '<td>' + (il ? '<b>' + C.span(il.a, il.b) + '</b>' : '') + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table>';
    // יום אחרי יום (הסבב הבא)
    const rows = p.related.map(n => near(n, r.a)).filter(Boolean).sort((a, b) => a.a - b.a);
    const dayHtml = '<table class="iv-tbl"><thead><tr><th scope="col">Day</th><th scope="col">Date</th></tr></thead><tbody>' +
      rows.map(rr => '<tr><th scope="row">' + rr.name + (rr.sh ? ' <span class="iv-shb">Yom Tov</span>' : '') + (rr.note ? '<small>' + rr.note + '</small>' : '') + '</th><td><b>' + C.span(rr.a, rr.b) + '</b><small>' + (rr.b ? C.wd(rr.a) + ' – ' + C.wd(rr.b) : C.wd(rr.a)) + '</small></td></tr>').join('') + '</tbody></table>';
    // ישראל מול חוץ לארץ
    const ilTbl = rr0 => '<table class="iv-tbl"><thead><tr><th scope="col">' + rr0.a.getFullYear() + '</th><th scope="col">USA and outside Israel</th><th scope="col">In Israel</th></tr></thead><tbody>' +
      p.il.map(([d, il, label]) => { const a = near(d, rr0.a), b = near(il, rr0.a, allIL); return a && b ? '<tr><th scope="row">' + label + '</th><td><b>' + C.span(a.a, a.b) + '</b></td><td><b>' + C.span(b.a, b.b) + '</b></td></tr>' : ''; }).join('') + '</tbody></table>';
    // חנוכה: טבלת נרות
    let candles = '';
    if (p.slug === 'hanukkah') {
      candles = '<section class="k-sec" aria-labelledby="hc-h" id="candles">\n  <h2 id="hc-h">Hanukkah ' + Y + ' candle lighting chart</h2>\n  <p class="lead2">Each night one more candle, plus the shamash. The candles are lit on the evening shown in the column "Evening of".</p>\n  <table class="iv-tbl"><thead><tr><th scope="col">Night</th><th scope="col">Evening of</th><th scope="col">Candles</th></tr></thead><tbody>' +
        [1, 2, 3, 4, 5, 6, 7, 8].map(n => { const d = C.add(r.a, n - 2); return '<tr><th scope="row">Night ' + n + '</th><td><b>' + C.wd(d) + '</b><small>' + L.greg(d) + '</small></td><td>' + n + ' + shamash</td></tr>'; }).join('') +
        '</tbody></table>\n</section>\n';
    }
    const relTitle = { passover: 'Passover ' + Y + ' day by day', sukkot: 'Sukkot ' + Y + ' day by day', 'rosh-hashanah': 'Rosh Hashanah to Yom Kippur ' + Y, 'yom-kippur': 'From Rosh Hashanah to Sukkot ' + Y, purim: 'Fast of Esther, Purim and Shushan Purim ' + Y }[p.slug];
    const ilTitle = { passover: 'Passover in Israel and outside Israel', sukkot: 'Sukkot in Israel and outside Israel', shavuot: 'Shavuot in Israel and outside Israel' }[p.slug];
    const txt = TXT[p.slug](r, Y);
    const nm = S(r.name);
    const others = PAGES.filter(q => q !== p).map(q => { const o = nextOcc(q.main)[0]; return `<a href="${HUB}${q.slug}/">${q.name} ${o.a.getFullYear()}</a> (${when(o)})`; });

    const qa = [
      [`When is ${p.name} ${Y}?`, `${p.name} ${Y}: ${when(r)}${p.len ? ', ' + p.len : ''}. It begins on the ${eveTxt(r)}, at sunset.${p.il ? ' These are the dates outside Israel; the Israel dates are in the table on this page.' : ''}`],
      [`When is ${p.name} ${Y + 1}?`, r1 && r1.a.getFullYear() === Y + 1 ? `${p.name} ${Y + 1}: ${when(r1)}, beginning on the ${eveTxt(r1)}.` : `${p.name} does not fall in ${Y + 1} on the Gregorian calendar; the next date after ${Y} is ${r1 ? when(r1) : ''}.`],
      [`When was ${p.name} ${pv ? pv.a.getFullYear() : Y - 1}?`, pv ? `${p.name} ${pv.a.getFullYear()} was on ${when(pv)}, beginning on the ${eveTxt(pv)}.` : ''],
      [`What time does ${p.name} start?`, `Like every Jewish holiday, ${p.name} begins at sunset on the evening before its first date, and ends at nightfall. The exact minute depends on your city. For local times see <a href="/kodesh/shabat/en/candle-lighting/">candle lighting times</a> or ask your synagogue.`],
      [`Why does ${p.name} fall on a different date every year?`, `${p.name} always has the same date on the Hebrew calendar, which follows the moon and adds a leap month in some years. On the Gregorian calendar the date moves by up to a few weeks. You can convert any date with the <a href="${CONV}">Hebrew date converter</a>.`],
      ...({
        hanukkah: [['How many candles are needed for Hanukkah?', 'For all eight nights you need 44 candles: 36 for the nights themselves (1+2+...+8) and 8 for the shamash, one each night. Many boxes of Hanukkah candles hold exactly 44.'], ['What blessings are said on the Hanukkah candles?', 'On the first night three blessings are said before lighting, and on the other nights two. The text in Hebrew, transliteration and English: <a href="/kodesh/chanuka/en/">Hanukkah blessings</a>.']],
        passover: [['When is the Seder?', `The first Seder is on the ${eveTxt(r)}. Outside Israel a second Seder is held on the next evening. In Israel there is one Seder.`], ['How long is Passover?', 'Eight days outside Israel and seven days in Israel. The first two and last two days are Yom Tov outside Israel; in Israel the first and seventh days.']],
        'rosh-hashanah': [['How long is Rosh Hashanah?', 'Two days, the 1st and 2nd of Tishrei, both in Israel and outside Israel.'], ['What year is it on the Hebrew calendar?', `Rosh Hashanah ${Y} opens the Hebrew year ${new H.HDate(r.a).getFullYear()}. You can see any date on the Hebrew calendar on the <a href="${CAL}">Hebrew calendar</a>.`]],
        'yom-kippur': [['How long is the Yom Kippur fast?', 'About 25 hours: from before sunset on the evening before until after nightfall on the day itself.'], ['When does Yom Kippur end?', `At nightfall on ${C.wd(r.a)}, ${L.greg(r.a)}, after the Neilah prayer and a long blast of the shofar. The exact time depends on your city.`]],
        purim: [['What are the four mitzvot of Purim?', 'Hearing the Megillah at night and in the morning, sending mishloach manot to a friend, giving gifts to at least two poor people, and a festive meal.'], ['When is Shushan Purim?', (() => { const s = near(N.sp, r.a); return s ? `Shushan Purim, Purim in Jerusalem, is the day after Purim: ${C.wd(s.a)}, ${L.greg(s.a)}.` : 'The day after Purim.'; })()]],
        sukkot: [['When is Simchat Torah?', (() => { const s = near(N.st, r.a), b = near(N.saIL, r.a, allIL); return (s ? `Outside Israel Simchat Torah is on ${C.wd(s.a)}, ${L.greg(s.a)}` : '') + (b ? `; in Israel it is on ${C.wd(b.a)}, ${L.greg(b.a)}, together with Shemini Atzeret.` : '.'); })()], ['How long is Sukkot?', 'Seven days, followed by Shemini Atzeret. Outside Israel the first two days are Yom Tov and Simchat Torah is a separate ninth day; in Israel the first day is Yom Tov and Shemini Atzeret and Simchat Torah are one day.']],
        shavuot: [['How many days is Shavuot?', 'Two days outside Israel and one day in Israel.'], ['Why is dairy eaten on Shavuot?', 'It is a widespread custom with several reasons given, among them that when the Torah was given, with its laws of kosher meat, the people ate dairy. Cheesecake and blintzes are favorites.']],
        'tu-bishvat': [['What fruits are eaten on Tu BiShvat?', 'Many eat the seven species of the Land of Israel: wheat, barley, grapes, figs, pomegranates, olives and dates, and other fruits too, especially dried fruit and carob.'], ['Is Tu BiShvat a Jewish holiday?', 'It is a minor festive day, not a Yom Tov. Work and school go on as usual.']]
      })[p.slug],
      ['Is this page free?', 'Yes. The dates, the tables and printing are free, with no sign-up and no ads. The dates are calculated on your own device and update by themselves.']
    ].filter(q => q[1]);

    const meta = {
      site: 'kodesh', lang: 'en', crumb_root: 'Jewish tools', tool: 'chagim_en', no_hub: true,
      title, description: p.desc(Y, r), og_title: title, priority: '0.7',
      crumbs: [['Hebrew calendar', CAL], ['Jewish holidays', HUB], [p.name, null]],
      head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css">' + faqLd(qa)
    };
    const body = `<header class="k-hero no-print">
  <h1>${h1}</h1>
  <p class="sub">${p.lead(Y)}</p>
</header>
<div class="tool" id="ch">
  <h2>Next ${p.name}</h2>
  <p class="iv-big"><b>${when(r)}</b></p>
  <p>Begins at sunset on the <b>${eveTxt(r)}</b>${p.len ? ', and lasts ' + p.len : ''}.</p>
  <p class="iv-today" data-cd="${iso(eveD(r))}" data-end="${iso(end(r))}" aria-live="polite"></p>
  <div class="share-row no-print">
    <a class="btn btn-gold btn-sm" href="${HUB}">All Jewish holidays</a>
    <button class="btn btn-line btn-sm" type="button" onclick="window.print()">Print</button>
    <a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="${p.name} ${Y}: ${when(r)}. All the dates, free, no ads:" target="_blank" rel="noopener">${WA} Share</a>
  </div>
</div>
${candles}${relTitle ? `<section class="k-sec" aria-labelledby="rel-h" id="days">
  <h2 id="rel-h">${relTitle}</h2>
  <p class="lead2">Every day in order, with the day of the week${p.il ? ', as kept in the USA and outside Israel' : ''}. "Yom Tov" marks a festival day on which work is not done.</p>
  ${dayHtml}
</section>
` : ''}<section class="k-sec" aria-labelledby="five-h" id="years">
  <h2 id="five-h">${p.name} dates for the next five years</h2>
  <p class="lead2">${p.name} ${pv ? pv.a.getFullYear() + ' (past), ' : ''}${nx.slice(0, 5).map(o => o.a.getFullYear()).join(', ')}: the date, the day of the week and the evening it begins.</p>
  ${fiveHtml}
</section>
${p.il ? `<section class="k-sec" aria-labelledby="il-h" id="israel">
  <h2 id="il-h">${ilTitle}</h2>
  <p class="lead2">Outside Israel this holiday has an extra day of Yom Tov. If you are travelling to Israel or have family there, these are the dates side by side.</p>
  ${ilTbl(r)}
  ${r1 ? ilTbl(r1) : ''}
</section>
` : ''}<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">About ${p.name}</h2>
  <p>${p.name} ${Y} falls on ${when(r)} and begins on the ${eveTxt(r)}.${pv ? ' Last time it was on ' + when(pv) + '.' : ''} Below is general background about the holiday: what it celebrates, its main customs and why its date changes from year to year. It is a short introduction, not a guide to practice; for questions about how to keep the holiday, ask a rabbi.</p>
${txt.map(([h, t]) => `  <h3>${h}</h3>\n  <p>${t}</p>`).join('\n')}
  <h3>Why ${p.name} begins in the evening</h3>
  <p>On the Hebrew calendar each day begins at sunset, not at midnight. So ${p.name} begins on the evening before the first date in the tables, and ends at nightfall on its last day. That is why the box at the top of this page shows both the date and the evening it begins. Candle lighting is usually about 18 minutes before sunset, and each city has its own times.</p>
  <h3>Other Jewish holidays</h3>
  <p>${others.join('; ')}. All of them on one page: <a href="${HUB}">Jewish holidays calendar</a>. Every day of the year on the Hebrew and Gregorian calendar: <a href="${CAL}">Hebrew calendar</a>. A Hebrew birthday or yahrzeit date: <a href="/kodesh/yahrzeit/en/">yahrzeit calculator</a> and <a href="${CONV}">Hebrew date converter</a>.</p>
  <h3>Why it is free</h3>
  <p>This page is part of "Gilad Rachamim's Tools": simple tools, free, with no sign-up and no ads. The dates are calculated with the same open-source library that many Jewish calendars use, and the page updates them by itself every year.</p>
</section>
${faqHtml(qa, 'Questions and answers about ' + p.name)}
<!--/seo-txt-->
<script>(function(){var e=document.querySelector('[data-cd]');if(!e)return;var p=function(s){var a=s.split('-');return new Date(+a[0],a[1]-1,+a[2]);};var t=new Date();t.setHours(0,0,0,0);var d=Math.round((p(e.getAttribute('data-cd'))-t)/864e5),z=Math.round((p(e.getAttribute('data-end'))-t)/864e5);e.innerHTML=d>1?'<b>'+d+' days</b> to go.':d===1?'<b>Begins tomorrow evening.</b>':d===0?'<b>Begins this evening.</b>':z>=0?'<b>Happening now.</b>':'';})();</script>
`;
    write(path.join(ROOT, 'src/pages/kodesh/luach-ivri/en/holidays', p.slug), meta, body);
    done.push({ slug: p.slug, phrase, title, Y });
  }
  return done;
};
