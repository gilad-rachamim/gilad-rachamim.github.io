// דפי ממיר התאריכים בשפות אחרות: src/pages/kodesh/taarich-ivri/ru/ («Еврейская дата сегодня») ו-src/pages/kodesh/taarich-ivri/en/ ("Hebrew Date Today").
// נקרא מתוך tools/ivri_pages.js. התוצאות שבתוך הדף מחושבות מאותו קוד שרץ בדפדפן:
// assets/kodesh-ivri.js (core) + חבילת השפה (assets/kodesh-ivri-ru.js / -en.js) + assets/kodesh-taarich-l.js.
// מילות החיפוש: ~/.claude/state/kelim-seo/runs/2026-11-22-taarich-ru-en/ (еврейская дата сегодня, hebrew date today, hebrew date converter).
'use strict';
module.exports = function (x, lang) {
  const { I, H, L, T, CIV, HY, ROOT, path, write, faqLd, faqHtml, WA, ALT2, LANGNAV } = x;
  const C = I.core(H, L), V = require(path.join(ROOT, 'assets/kodesh-taarich-l.js'))(C, L);
  const Y0 = C.yearInfo(HY), Y1 = C.yearInfo(HY + 1), GY = CIV.getFullYear(), hd = T.hdDay;
  const HYJAN = new H.HDate(C.noon(GY, 0, 1)).getFullYear();       // השנה העברית ב-1 בינואר
  const ex = C.noon(GY - 12, CIV.getMonth(), CIV.getDate()), yex = C.noon(GY - 5, 2, 14);
  const he = s => '<span lang="he" dir="rtl">' + s + '</span>';
  const rhEve = y => C.greg(C.add(y.start, -1));
  const HERE = ALT2[lang], CAL = lang === 'ru' ? '/kodesh/luach-ivri/ru/' : '/kodesh/luach-ivri/en/';
  const P = lang === 'ru' ? ru() : en();

  function ru() {
    return {
      tool: 'taarich_ivri_ru', crumbRoot: 'Еврейские инструменты',
      title: 'Еврейская дата сегодня и конвертер дат: бар-мицва, йорцайт',
      description: 'Еврейская дата сегодня по заходу солнца в вашем городе. Конвертер дат, еврейская дата рождения, бар-мицва и йорцайт. Бесплатно, без рекламы.',
      og: 'Еврейская дата сегодня и конвертер дат', crumb: 'Еврейская дата и конвертер',
      h1: 'Еврейская дата сегодня и конвертер дат',
      sub: 'Какое сегодня число по еврейскому календарю, перевод любой даты в еврейскую и обратно, еврейский день рождения, бар-мицва и йорцайт.',
      tabs: ['Обычная → еврейская', 'Еврейская → обычная', 'Бар-мицва', 'Йорцайт', 'Календарь'],
      place: 'Заход солнца по', placeOpt: '(в это время меняется еврейская дата)',
      waToday: 'Отправить еврейскую дату', copy: 'Копировать', send: 'Отправить',
      disc: 'Еврейский день начинается с заходом солнца. Заход рассчитан для выбранного города, на уровне моря. Близко к закату (бейн ха-шмашот) по практическим вопросам обращаются к раввину.',
      g2hH: 'Перевод обычной даты в еврейскую', gdate: 'Обычная дата', gafter: 'После захода солнца (вечером или ночью)',
      h2gH: 'Перевод еврейской даты в обычную', hday: 'День', hmon: 'Месяц', hyear: 'Год',
      hyDisc: 'Год можно написать цифрами (' + HY + ') или еврейскими буквами (' + he(C.gem(HY)) + '). В високосном году есть Адар I и Адар II, в обычном – один Адар.',
      bmH: 'Еврейская дата рождения, бар-мицва и бат-мицва', who: 'Кто родился?', boy: 'Мальчик (бар-мицва, 13)', girl: 'Девочка (бат-мицва, 12)',
      bdate: 'Дата рождения', bafter: 'Рождение было после захода солнца',
      bmDisc: 'Дата рождения хранится только в вашем телефоне и никуда не отправляется. В особых случаях (рождение во время бейн ха-шмашот, 30 адара I) спрашивают раввина.',
      yzH2: 'Йорцайт: годовщина по еврейскому календарю', ydate: 'Дата кончины', yafter: 'Кончина была после захода солнца',
      yzEx: 'Пример: дата ' + C.greg(yex) + '. Введите дату – результат обновится.',
      yzDisc: 'Йорцайт отмечают в еврейскую дату кончины; он начинается накануне вечером. О дне похорон, о годе после кончины и об особых случаях спрашивают раввина.',
      nextH: 'Еврейская дата в ближайшие дни', toCal: 'Полный еврейский календарь →',
      seo: `<h2 id="seo-h">Еврейская дата сегодня: как узнать и как перевести дату</h2>
  <p>Вверху страницы крупно написана сегодняшняя еврейская дата – по-русски и еврейскими буквами, с днём недели и обычной датой. Ниже есть три инструмента: перевод обычной даты в еврейскую, перевод еврейской даты в обычную и расчёт еврейского дня рождения с бар-мицвой или бат-мицвой. Есть и расчёт йорцайта – годовщины кончины по еврейскому календарю. Результат появляется сразу, без нажатия кнопок, и его можно отправить в WhatsApp или скопировать. Страница работает и в телефоне, без рекламы и без регистрации, а данные никуда не отправляются.</p>
  <h3>Какой сейчас день по еврейскому календарю</h3>
  <p>Еврейский календарь лунно-солнечный: месяцы идут по луне, а годы выравниваются по солнцу. Сегодня ${C.heb(hd)} (${he(C.hebHe(hd))}). Сейчас идёт ${HY} год от сотворения мира. Он начался в Рош ха-Шана, ${C.greg(Y0.start)}, а следующий, ${HY + 1} год, начнётся ${C.greg(Y1.start)}. В обычном ${GY} году до сентября шёл ${HYJAN} год, а с Рош ха-Шана – ${HYJAN + 1}.</p>
  <h3>Почему еврейская дата меняется вечером</h3>
  <p>По еврейскому календарю день начинается не в полночь, а с заходом солнца, как сказано в Торе: «и был вечер, и было утро». Поэтому в среду вечером, после заката, уже наступает еврейская дата четверга. Страница проверяет, который час и когда заходит солнце в выбранном городе (или там, где вы находитесь), и показывает правильную дату для этой минуты. В конвертере отметьте «После захода солнца», если ищете еврейскую дату рождения или события, которое было вечером. Около самого заката, во время бейн ха-шмашот, есть сомнение, и по практическим вопросам обращаются к раввину.</p>
  <h3>Как узнать свою дату рождения по еврейскому календарю</h3>
  <p>Введите дату рождения в разделе «Еврейская дата рождения» и отметьте, было ли рождение после захода солнца. Появится еврейская дата рождения, дата бар-мицвы (мальчику 13 лет) или бат-мицвы (девочке 12 лет) по еврейскому и по обычному календарю, суббота после неё с недельной главой Торы и список еврейских дней рождения на ближайшие годы. Калькулятор знает, что происходит в високосном году, когда в году два месяца Адар, и в месяце, где нет 30-го числа.</p>
  <h3>Перевод еврейской даты в обычную</h3>
  <p>Выберите еврейский день, месяц и год, и страница покажет обычную дату и день недели. Год можно написать цифрами, например ${HY}, или еврейскими буквами, например ${he(C.gem(HY))}. Список месяцев сам меняется в зависимости от года: в високосном году есть Адар I и Адар II. Если выбрать дату, которой в этом году нет, например 30 хешвана в году, где в хешване 29 дней, страница так и скажет и не придумает дату.</p>
  <h3>Йорцайт – годовщина кончины</h3>
  <p>Йорцайт (на иврите – «азкара») отмечают каждый год в еврейскую дату кончины: зажигают свечу, читают кадиш, посещают могилу. Введите обычную дату кончины и отметьте, было ли это после захода солнца. Страница покажет еврейскую дату кончины и даты йорцайта на пять ближайших лет – по еврейскому и по обычному календарю, вместе с вечером, когда йорцайт начинается. Для кончины в месяце Адар или 30-го числа месяца действуют особые правила; расчёт следует принятому обычаю, а в сомнительных случаях спрашивают раввина.</p>
  <h3>Дни недели на иврите</h3>
  <p>На иврите у дней недели нет отдельных названий, кроме субботы: их считают от субботы. Воскресенье – ${he('יום ראשון')} (йом ришон, «первый день»), понедельник – ${he('יום שני')} (йом шени), вторник – ${he('יום שלישי')} (йом шлиши), среда – ${he('יום רביעי')} (йом ревии), четверг – ${he('יום חמישי')} (йом хамиши), пятница – ${he('יום שישי')} (йом шиши), а суббота – ${he('שבת')} (шаббат).</p>
  <h3>Ещё на русском языке</h3>
  <p>Еврейский календарь на месяц, с праздниками, постами, Рош ходешем и недельными главами: <a href="/kodesh/luach-ivri/ru/">еврейский календарь</a>. Список праздников по годам с коротким рассказом о каждом: <a href="/kodesh/luach-ivri/ru/prazdniki/">еврейские праздники</a>. Молитвы с транслитерацией: <a href="/kodesh/shema-israel/ru/">Шма Исраэль</a>, <a href="/kodesh/birkat-hamazon/ru/">Биркат ха-Мазон</a> и <a href="/kodesh/tefilat-haderech/ru/">дорожная молитва</a>. Для тех, кто проходит гиюр в Израиле: <a href="/kodesh/giur/ru/">подготовка к гиюру</a>.</p>
  <h3>Почему это бесплатно</h3>
  <p>Страница – часть проекта «Инструменты Гилада Рахамима»: простые инструменты, бесплатно, без регистрации и без рекламы. Расчёт делается прямо в вашем телефоне, по обычаю Земли Израиля, с помощью открытой библиотеки, на которой работают многие еврейские календари в мире.</p>`,
      faqT: 'Вопросы и ответы',
      qa: [
        ['Какой сейчас день по еврейскому календарю?', 'Сегодняшняя еврейская дата крупно написана вверху страницы и обновляется сама. Вечером, после захода солнца, страница показывает уже дату следующего дня, потому что еврейский день начинается на закате.'],
        ['Какой сейчас год у евреев в ' + GY + ' году?', 'В ' + GY + ' году до Рош ха-Шана шёл ' + HYJAN + ' год, а с Рош ха-Шана (' + C.greg(Y0.start) + ') идёт ' + HY + ' год. Еврейский год начинается осенью, в первый день месяца Тишрей.'],
        ['Когда Рош ха-Шана?', 'Рош ха-Шана ' + HY + ' года был ' + C.greg(Y0.start) + ' (начался накануне вечером, ' + rhEve(Y0) + '). Рош ха-Шана ' + (HY + 1) + ' года – ' + C.greg(Y1.start) + ', начинается вечером ' + rhEve(Y1) + '.'],
        ['Как узнать свою дату рождения по еврейскому календарю?', 'Введите обычную дату рождения в разделе «Еврейская дата рождения» и отметьте, было ли это после захода солнца. Появится еврейская дата рождения, дата бар-мицвы или бат-мицвы и еврейские дни рождения на ближайшие годы.'],
        ['Какой сегодня день недели на иврите?', 'Дни недели на иврите считают от субботы: воскресенье – йом ришон («первый день»), понедельник – йом шени, вторник – йом шлиши, среда – йом ревии, четверг – йом хамиши, пятница – йом шиши, суббота – шаббат.'],
        ['Когда бар-мицва по еврейскому календарю?', 'Бар-мицва – в 13-й еврейский день рождения мальчика, бат-мицва – в 12-й еврейский день рождения девочки. Введите дату рождения, и калькулятор покажет еврейскую и обычную дату, а также субботу после неё.'],
        ['Как рассчитать йорцайт?', 'Введите дату кончины в разделе «Йорцайт» и отметьте, было ли это после захода солнца. Страница покажет еврейскую дату кончины и даты йорцайта на пять ближайших лет. Йорцайт начинается накануне вечером.'],
        ['Это бесплатно?', 'Да. Все расчёты бесплатны, без регистрации и без рекламы. Даты, которые вы вводите, остаются только в вашем телефоне.']
      ]
    };
  }

  function en() {
    return {
      tool: 'taarich_ivri_en', crumbRoot: 'Jewish tools',
      title: 'Hebrew Date Today & Hebrew Date Converter – Bar Mitzvah, Yahrzeit',
      description: "Hebrew date today, by sunset in your city. Free Hebrew date converter both ways, Hebrew birthday, Bar Mitzvah and yahrzeit calculator. No ads, no sign-up.",
      og: 'Hebrew Date Today & Hebrew Date Converter', crumb: 'Hebrew date converter',
      h1: 'Hebrew Date Today and Hebrew Date Converter',
      sub: "Today's date on the Jewish calendar, any date converted to Hebrew and back, Hebrew birthday, Bar Mitzvah and yahrzeit.",
      tabs: ['Gregorian → Hebrew', 'Hebrew → Gregorian', 'Bar Mitzvah', 'Yahrzeit', 'Calendar'],
      place: 'Sunset in', placeOpt: '(when the Hebrew date changes)',
      waToday: 'Send the Hebrew date', copy: 'Copy', send: 'Send',
      disc: 'The Hebrew day begins at sunset. Sunset is calculated for the chosen city, at sea level. Close to sunset (bein hashmashot), ask a rabbi about practical questions.',
      g2hH: 'Convert a Gregorian date to Hebrew', gdate: 'Gregorian date', gafter: 'After sunset (evening or night)',
      h2gH: 'Convert a Hebrew date to Gregorian', hday: 'Day', hmon: 'Month', hyear: 'Year',
      hyDisc: 'Type the year in numbers (' + HY + ') or in Hebrew letters (' + he(C.gem(HY)) + '). A leap year has Adar I and Adar II; a regular year has one Adar.',
      bmH: 'Hebrew birthday, Bar Mitzvah and Bat Mitzvah calculator', who: 'Who was born?', boy: 'Boy (Bar Mitzvah, 13)', girl: 'Girl (Bat Mitzvah, 12)',
      bdate: 'Date of birth', bafter: 'Born after sunset',
      bmDisc: 'The birth date stays on your phone and is not sent anywhere. In special cases (birth at bein hashmashot, 30 Adar I) ask a rabbi.',
      yzH2: 'Yahrzeit calculator: the anniversary on the Hebrew calendar', ydate: 'Date of passing', yafter: 'Passed away after sunset',
      yzEx: 'Example: ' + C.greg(yex) + '. Enter the date and the result updates.',
      yzDisc: 'The yahrzeit is observed on the Hebrew date of passing and begins the evening before. About the day of burial, the first year and special cases, ask a rabbi.',
      nextH: 'The Hebrew date in the coming days', toCal: 'Full Hebrew calendar →',
      seo: `<h2 id="seo-h">Hebrew date today: what it is and how to convert dates</h2>
  <p>The top of the page shows today's Hebrew date in large letters, in English and in Hebrew, with the day of the week and the Gregorian date. Below it are three tools: a Gregorian to Hebrew date converter, a Hebrew to Gregorian converter, and a Hebrew birthday calculator with the Bar Mitzvah or Bat Mitzvah date. There is also a yahrzeit calculator for the anniversary of a passing. Results appear at once, without pressing a button, and you can send them on WhatsApp or copy them. The page works on any phone, with no ads and no sign-up, and nothing you type is sent to a server.</p>
  <h3>Which Hebrew year is ${GY}?</h3>
  <p>Today is ${C.heb(hd)} (${he(C.hebHe(hd))}), in the Hebrew year ${HY}. The Jewish year begins in the autumn, on Rosh Hashanah, the 1st of Tishrei. So ${GY} spans two Hebrew years: until Rosh Hashanah it was ${HYJAN}, and from Rosh Hashanah (${C.greg(Y0.start)}) it is ${HYJAN + 1}. The next year, ${HY + 1}, begins on ${C.greg(Y1.start)}, starting the evening before. ${Y0.leap ? 'The year ' + HY + ' is a leap year with 13 months.' : 'The year ' + HY + ' is a regular year with 12 months.'}</p>
  <h3>Why the Hebrew date changes in the evening</h3>
  <p>On the Jewish calendar a day begins at sunset, not at midnight, as the Torah says: "and there was evening and there was morning". So on Wednesday evening, after sunset, it is already Thursday's Hebrew date. The page checks the time and the sunset in the city you choose (or where you are) and shows the right Hebrew date for this moment. In the converter, tick "After sunset" when you look up the Hebrew date of a birth or an event that happened in the evening. Very close to sunset, in the time called bein hashmashot, there is a doubt, and practical questions go to a rabbi.</p>
  <h3>Hebrew date converter: Gregorian to Hebrew and back</h3>
  <p>Pick any Gregorian date from ${I.GY_MIN} to ${I.GY_MAX} and see the Hebrew date, the day of the week, and the holiday or Torah portion of that day. To go the other way, choose a Hebrew day, month and year, and get the Gregorian date. The year can be typed as a number, like ${HY}, or in Hebrew letters, like ${he(C.gem(HY))}. The list of months changes by itself: in a leap year there are Adar I and Adar II. If you pick a date that does not exist that year, such as 30 Cheshvan in a year when Cheshvan has 29 days, the page says so and does not invent a date.</p>
  <h3>Hebrew birthday and Bar Mitzvah date</h3>
  <p>A Bar Mitzvah is on a boy's 13th Hebrew birthday, and a Bat Mitzvah on a girl's 12th Hebrew birthday. Enter the Gregorian date of birth, tick whether the birth was after sunset, and you get the Hebrew birth date, the Bar or Bat Mitzvah date on both calendars, the Shabbat after it with its Torah portion (when the boy is usually called up to the Torah), and a list of Hebrew birthdays for the coming years. The calculator handles leap years with two months of Adar and months without a 30th day.</p>
  <h3>Yahrzeit calculator</h3>
  <p>A yahrzeit is the yearly anniversary of a passing on the Hebrew calendar: a memorial candle is lit, Kaddish is said, and the family often visits the grave. Enter the Gregorian date of passing and tick whether it was after sunset. The page shows the Hebrew date of passing and the yahrzeit dates for the next five years, with the evening on which each one begins. A passing in Adar or on the 30th of a month has special rules; the calculation follows the common custom, and in doubtful cases ask a rabbi.</p>
  <h3>The 12 months of the Hebrew calendar</h3>
  <p>The Hebrew calendar is lunisolar: months follow the moon and years are aligned with the sun. Each month has 29 or 30 days and begins with Rosh Chodesh. The months are Tishrei, Cheshvan, Kislev, Tevet, Shevat, Adar, Nisan, Iyar, Sivan, Tammuz, Av and Elul. Seven times in nineteen years a leap year adds a 13th month, and then there are Adar I and Adar II. The full month-by-month view, with holidays and fast days, is on the <a href="${CAL}">Hebrew calendar</a> page.</p>
  <h3>More in English</h3>
  <p>Prayers in Hebrew with English transliteration: <a href="/kodesh/shema-israel/en/">Shema Israel</a>, <a href="/kodesh/birkat-hamazon/en/">Birkat Hamazon (Grace after Meals)</a> and <a href="/kodesh/tefilat-haderech/en/">Tefilat HaDerech, the Traveler's Prayer</a>. For people going through an Orthodox conversion in Israel: <a href="/kodesh/giur/en/">conversion study guide</a>.</p>
  <h3>Why it is free</h3>
  <p>This page is part of hakelim.com, a free chesed project of simple tools: free, unlimited, no sign-up and no ads. The calculation runs on your own phone, by the custom of the Land of Israel, using an open-source library that powers many Jewish calendars around the world.</p>`,
      faqT: 'Questions and answers',
      qa: [
        ["What is today's Hebrew date?", "Today's Hebrew date is shown in large letters at the top of the page and updates by itself. In the evening, after sunset, the page already shows the next day's date, because the Hebrew day begins at sunset."],
        ['Which Hebrew year is ' + GY + '?', GY + ' spans two Hebrew years: ' + HYJAN + ' until Rosh Hashanah, and ' + (HYJAN + 1) + ' from Rosh Hashanah on ' + C.greg(C.yearInfo(HYJAN + 1).start) + '. The Jewish year begins in the autumn, on the 1st of Tishrei.'],
        ["What's the Hebrew year right now?", 'It is now the Hebrew year ' + HY + '. It began on ' + C.greg(Y0.start) + ', and ' + (HY + 1) + ' begins on ' + C.greg(Y1.start) + '.'],
        ['How do I convert a Gregorian date to a Hebrew date?', 'Choose the date in "Convert a Gregorian date to Hebrew", and tick "After sunset" if it was in the evening. The Hebrew date appears at once, with the day of the week and the holiday or Torah portion.'],
        ['When is a Bar Mitzvah on the Hebrew calendar?', "A Bar Mitzvah is on a boy's 13th Hebrew birthday, and a Bat Mitzvah on a girl's 12th. Enter the date of birth, and the calculator shows the Hebrew and Gregorian date and the Shabbat after it."],
        ['How do I calculate a yahrzeit?', 'Enter the date of passing in the yahrzeit section and tick whether it was after sunset. The page shows the Hebrew date of passing and the yahrzeit dates for the next five years. A yahrzeit begins the evening before.'],
        ['What are the 12 months of the Hebrew calendar?', 'Tishrei, Cheshvan, Kislev, Tevet, Shevat, Adar, Nisan, Iyar, Sivan, Tammuz, Av and Elul. In a leap year there are Adar I and Adar II, so the year has 13 months.'],
        ['Is it free?', 'Yes. Everything is free, with no sign-up and no ads. The dates you type stay on your phone.']
      ]
    };
  }

  const meta = {
    site: 'kodesh', lang, alt: ALT2, crumb_root: P.crumbRoot, tool: P.tool, no_hub: true,
    title: P.title, description: P.description, og_title: P.og, priority: '0.8',
    crumbs: [[P.crumb, null]],
    head: '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kodesh-ivri.css"><link rel="stylesheet" href="/assets/lang-switch.css">' + faqLd(P.qa),
    foot: '<script src="/assets/vendor/hebcal-bundle/hebcal-core-6.14.7.min.js" data-hebcal defer></script><script src="/assets/kodesh-ivri-' + lang + '.js" defer></script><script src="/assets/kodesh-taarich-l.js" defer></script><script src="/assets/kodesh-ivri.js" defer></script>'
  };
  const cityOpts = I.CITIES.map(c => `<option value="${c[0]}"${c[0] === 'yerushalaim' ? ' selected' : ''}>${L.TI.CITY[c[0]] ? L.TI.CITY[c[0]][0] : c[1]}</option>`).join('') + `<option value="gps">${L.TI.M.gps}</option>`;
  const dayOpts = Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}"${i + 1 === hd.getDate() ? ' selected' : ''}>${i + 1}</option>`).join('');
  const monOpts = C.hmonths(HY).map(k => `<option value="${k}"${k === hd.getMonth() ? ' selected' : ''}>${C.mon(k, HY)}</option>`).join('');
  const share = (id, gold) => `<div class="share-row"><a class="btn ${gold ? 'btn-gold' : 'btn-line'} btn-sm" href="#" id="${id}-wa" target="_blank" rel="noopener">${WA} ${P.send}</a><button class="btn btn-line btn-sm" type="button" id="${id}-copy">${P.copy}</button></div>`;
  const body = `<header class="k-hero">
  <h1>${P.h1}</h1>
  <p class="sub">${P.sub}</p>
</header>
${LANGNAV(lang, ALT2)}
<div class="tool" id="ti">
  <nav class="iv-tabs" aria-label="${P.h1}"><a href="#ti-g2h-h">${P.tabs[0]}</a><a href="#ti-h2g-h">${P.tabs[1]}</a><a href="#ti-bm-h">${P.tabs[2]}</a><a href="#ti-yz-h">${P.tabs[3]}</a><a href="${CAL}">${P.tabs[4]}</a></nav>
  <div class="res iv-hero" id="ti-today" aria-live="polite">${V.todayHtml(T, true)}</div>
  <form class="k-form" novalidate onsubmit="return false" style="margin-top:.8rem">
    <div class="field"><label for="ti-place">${P.place} <span class="opt">${P.placeOpt}</span></label><select id="ti-place">${cityOpts}</select></div>
    <p class="iv-sub" id="ti-st" role="status"></p>
  </form>
  <div class="share-row">
    <a class="btn btn-gold btn-sm" href="#" id="ti-wa" target="_blank" rel="noopener">${WA} ${P.waToday}</a>
    <button class="btn btn-line btn-sm" type="button" id="ti-copy">${P.copy}</button>
  </div>
  <p class="disclaimer">${P.disc}</p>
</div>

<section class="k-sec" aria-labelledby="ti-g2h-h">
  <h2 id="ti-g2h-h">${P.g2hH}</h2>
  <form class="k-form" novalidate onsubmit="return false">
    <div class="field"><label for="ti-gdate">${P.gdate}</label><input id="ti-gdate" type="date" min="${I.GY_MIN}-01-01" max="${I.GY_MAX}-12-31" value="${C.key(CIV)}"></div>
    <label class="check"><input type="checkbox" id="ti-gafter"> <span>${P.gafter}</span></label>
  </form>
  <div class="res" id="ti-g2h-res" aria-live="polite">${V.g2hHtml(CIV, false)}</div>
  ${share('ti-g2h')}
</section>

<section class="k-sec" aria-labelledby="ti-h2g-h">
  <h2 id="ti-h2g-h">${P.h2gH}</h2>
  <form class="k-form" novalidate onsubmit="return false">
    <div class="iv-row">
      <div class="field"><label for="ti-hday">${P.hday}</label><select id="ti-hday">${dayOpts}</select></div>
      <div class="field"><label for="ti-hmon">${P.hmon}</label><select id="ti-hmon">${monOpts}</select></div>
      <div class="field"><label for="ti-hyear">${P.hyear}</label><input id="ti-hyear" type="text" inputmode="text" autocomplete="off" value="${HY}" aria-describedby="ti-hyear-eq"></div>
    </div>
    <p class="iv-yeq" id="ti-hyear-eq">= ${he(C.gem(HY))} (${HY})${Y0.leap ? L.TI.M.leap : ''}</p>
  </form>
  <div class="res" id="ti-h2g-res" aria-live="polite">${V.h2gHtml(HY, hd.getMonth(), hd.getDate())}</div>
  ${share('ti-h2g')}
  <p class="disclaimer">${P.hyDisc}</p>
</section>

<section class="k-sec" aria-labelledby="ti-bm-h">
  <h2 id="ti-bm-h">${P.bmH}</h2>
  <form class="k-form" novalidate onsubmit="return false">
    <div class="field"><span class="label">${P.who}</span><div class="radios"><label><input type="radio" name="ti-sex" value="boy" checked> ${P.boy}</label><label><input type="radio" name="ti-sex" value="girl"> ${P.girl}</label></div></div>
    <div class="field"><label for="ti-bdate">${P.bdate}</label><input id="ti-bdate" type="date" min="${I.GY_MIN}-01-01" max="${I.GY_MAX - 14}-12-31"></div>
    <label class="check"><input type="checkbox" id="ti-bafter"> <span>${P.bafter}</span></label>
  </form>
  <div id="ti-bm-res" aria-live="polite">${V.bmHtml(ex, false, false, CIV, true)}</div>
  ${share('ti-bm', true)}
  <p class="disclaimer">${P.bmDisc}</p>
</section>

<section class="k-sec" aria-labelledby="ti-yz-h">
  <h2 id="ti-yz-h">${P.yzH2}</h2>
  <form class="k-form" novalidate onsubmit="return false">
    <div class="field"><label for="ti-yz-date">${P.ydate}</label><input id="ti-yz-date" type="date" min="${I.GY_MIN}-01-01" max="${I.GY_MAX}-12-31"></div>
    <label class="check"><input type="checkbox" id="ti-yz-after"> <span>${P.yafter}</span></label>
  </form>
  <div id="ti-yz-res" aria-live="polite"><p class="iv-ex">${P.yzEx}</p>${V.yzHtml(yex, false, CIV)}</div>
  ${share('ti-yz')}
  <p class="disclaimer">${P.yzDisc}</p>
</section>

<section class="k-sec" aria-labelledby="ti-next-h">
  <h2 id="ti-next-h">${P.nextH}</h2>
  <div id="ti-next">${V.nextDaysHtml(CIV, 14, true)}</div>
  <div class="share-row"><a class="btn btn-line btn-sm" href="${CAL}">${P.toCal}</a></div>
</section>
<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  ${P.seo}
</section>
${faqHtml(P.qa, P.faqT)}
<!--/seo-txt-->
`;
  write(path.join(ROOT, 'src/pages' + HERE), meta, body);
  return HERE;
};
