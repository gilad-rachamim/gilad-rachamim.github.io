// לוח שנה עברי לועזי (/kodesh/luach-ivri/) + תאריך עברי היום והמרת תאריכים (/kodesh/taarich-ivri/).
// כל החישובים מ-@hebcal/core 6.14.7 (assets/vendor/hebcal-bundle), לפי מנהג ארץ ישראל. הכול רץ בדפדפן.
// הקובץ נטען גם ב-node (tools/ivri_pages.js) כדי שהלוח והטבלאות שבתוך הדף עצמו ייצאו מאותו קוד.
(function (root) {
  'use strict';
  var LUACH = '/kodesh/luach-ivri/', TAARICH = '/kodesh/taarich-ivri/', TZ = 'Asia/Jerusalem';
  // [מזהה, שם, "ב...", רוחב, אורך] – לשעת השקיעה (אז מתחלף התאריך העברי)
  var CITIES = [
    ['yerushalaim', 'ירושלים', 'בירושלים', 31.778, 35.235], ['tel-aviv', 'תל אביב', 'בתל אביב', 32.08, 34.78],
    ['haifa', 'חיפה', 'בחיפה', 32.79, 34.99], ['beer-sheva', 'באר שבע', 'בבאר שבע', 31.25, 34.79],
    ['netanya', 'נתניה', 'בנתניה', 32.32, 34.85], ['ashdod', 'אשדוד', 'באשדוד', 31.8, 34.65],
    ['tveria', 'טבריה', 'בטבריה', 32.79, 35.53], ['tzfat', 'צפת', 'בצפת', 32.965, 35.496],
    ['kiryat-shmona', 'קריית שמונה', 'בקריית שמונה', 33.2, 35.57], ['eilat', 'אילת', 'באילת', 29.557, 34.952]
  ];
  var GM = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  var WD = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var COL = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
  var HMN = { 1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול', 7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳' };
  var ORD = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני'];
  var PFIX = { 'מצרע': 'מצורע', 'קדשים': 'קדושים', 'בחקתי': 'בחוקותי', 'בהעלתך': 'בהעלותך', 'תצוה': 'תצווה', 'נצבים': 'ניצבים', 'פינחס': 'פנחס' };
  var HY_MIN = 5001, HY_MAX = 5999, GY_MIN = 1241, GY_MAX = 2238;
  // אירועים של hebcal שלא מציגים בלוח לציבור
  var SKIP = /School Observance|Ben-Gurion|Hebrew Language|Herzl|Jabotinsky|Chag HaBanot|LaBehemot|Shushan Purim Katan|^Erev Purim$|Yom Kippur Katan|Birkat Hachamah|Purim Meshulash/;
  // שם קצר (לתא בלוח) ושם מלא (לרשימה)
  var NAMES = {
    'Yitzhak Rabin Memorial Day': ['יום רבין', 'יום הזיכרון ליצחק רבין'],
    'Swords of Iron War Memorial Day': ['זיכרון חרבות ברזל', 'יום הזיכרון לחללי מלחמת חרבות ברזל'],
    'Leil Selichot': ['סליחות', 'סליחות ראשונות למנהג אשכנז, במוצאי שבת'],
    'Tzom Gedaliah': ['צום גדליה', 'צום גדליה'], "Asara B'Tevet": ['עשרה בטבת', 'צום עשרה בטבת'],
    "Ta'anit Esther": ['תענית אסתר', 'תענית אסתר'], "Ta'anit Bechorot": ['תענית בכורות', 'תענית בכורות'],
    'Tzom Tammuz': ['י״ז בתמוז', 'צום י״ז בתמוז'], "Tish'a B'Av": ['תשעה באב', 'צום תשעה באב'], "Erev Tish'a B'Av": ['ערב ט׳ באב', 'ערב תשעה באב'],
    'Family Day': ['יום המשפחה', 'יום המשפחה'], 'Yom HaAliyah': ['יום העלייה', 'יום העלייה'], 'Sigd': ['סיגד', 'חג הסיגד'],
    'Yom HaShoah': ['יום השואה', 'יום הזיכרון לשואה ולגבורה'], 'Yom HaZikaron': ['יום הזיכרון', 'יום הזיכרון לחללי מערכות ישראל'],
    "Yom HaAtzma'ut": ['יום העצמאות', 'יום העצמאות'], 'Yom Yerushalayim': ['יום ירושלים', 'יום ירושלים'],
    'Shmini Atzeret': ['שמחת תורה', 'שמיני עצרת ושמחת תורה'], 'Yom Kippur': ['יום כיפור', 'יום הכיפורים'],
    'Erev Yom Kippur': ['ערב יום כיפור', 'ערב יום הכיפורים'], 'Shavuot': ['שבועות', 'חג השבועות'],
    'Tu BiShvat': ['ט״ו בשבט', 'ט״ו בשבט, ראש השנה לאילנות'], 'Shushan Purim': ['שושן פורים', 'שושן פורים (פורים בירושלים)']
  };

  function core(H) {
    var HD = H.HDate, F = H.flags;
    function noon(y, m, d) { var x = new Date(2000, 0, 1, 12); x.setFullYear(y, m, d); return x; }
    function clean(d) { return noon(d.getFullYear(), d.getMonth(), d.getDate()); }
    function add(d, n) { var x = clean(d); x.setDate(x.getDate() + n); return x; }
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    function key(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
    function fromKey(s) {
      var p = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(s || '');
      if (!p) return null;
      var d = noon(+p[1], +p[2] - 1, +p[3]);
      return d.getMonth() === +p[2] - 1 && d.getDate() === +p[3] ? d : null;
    }
    function gem(n) { return H.gematriya(n); }
    function mon(m, y) { return m === 12 ? (HD.isLeapYear(y) ? 'אדר א׳' : 'אדר') : HMN[m]; }
    function heb(hd, noYear) { return gem(hd.getDate()) + ' ב' + mon(hd.getMonth(), hd.getFullYear()) + (noYear ? '' : ' ' + gem(hd.getFullYear())); }
    function greg(d) { return d.getDate() + ' ב' + GM[d.getMonth()] + ' ' + d.getFullYear(); }
    function dm(d) { return d.getDate() + '.' + (d.getMonth() + 1); }
    function dmy(d) { return dm(d) + '.' + d.getFullYear(); }
    function wd(d) { return d.getDay() === 6 ? 'שבת' : 'יום ' + WD[d.getDay()]; }
    function ltr(s) { return '<bdi dir="ltr">' + s + '</bdi>'; }
    function hgreg(hd) { var g = hd.greg(); return noon(g.getFullYear(), g.getMonth(), g.getDate()); }
    function fixHe(s) { return s.replace(/חשון/g, 'חשוון').replace(/סיון/g, 'סיוון').replace(/־/g, ' ').replace(/הזכרון/g, 'הזיכרון'); }

    // ---------- אירועי היום: חגים, צומות, ראשי חודשים ----------
    function label(e) {
      var f = e.getFlags(), raw = e.getDesc(), ds = raw.replace(/ \(observed\)$/, ''), moved = ds !== raw, m, nm, kind;
      if ((f & F.PARSHA_HASHAVUA) || SKIP.test(ds)) return null;
      if ((m = /^Chanukah: (\d) Candles?$/.exec(ds))) {
        var n = +m[1];
        return n === 1 ? { kind: 'holiday', short: 'ערב חנוכה', txt: 'ערב חנוכה: בערב מדליקים נר ראשון' }
          : { kind: 'holiday', short: 'חנוכה ' + gem(n - 1), txt: 'חנוכה, יום ' + ORD[n - 1] + ': בערב מדליקים נר ' + ORD[n] };
      }
      if (ds === 'Chanukah: 8th Day') return { kind: 'holiday', short: 'חנוכה ח׳', txt: 'חנוכה, יום שמיני (זאת חנוכה)' };
      if (/^Rosh Hashana \d+$/.test(ds)) return { kind: 'chag', short: 'ראש השנה', txt: 'ראש השנה, יום ראשון' };
      if (ds === 'Rosh Hashana II') return { kind: 'chag', short: 'ראש השנה', txt: 'ראש השנה, יום שני' };
      if ((m = /^(Sukkot|Pesach) (I|VII)$/.exec(ds))) {
        if (m[2] === 'I') return { kind: 'chag', short: m[1] === 'Pesach' ? 'פסח' : 'סוכות', txt: m[1] === 'Pesach' ? 'חג הפסח, יום ראשון' : 'חג הסוכות, יום ראשון' };
        return { kind: 'chag', short: 'שביעי של פסח', txt: 'שביעי של פסח' };
      }
      if (/Hoshana Raba/.test(ds)) return { kind: 'moed', short: 'הושענא רבה', txt: 'הושענא רבה (חול המועד סוכות)' };
      if ((m = /^(Sukkot|Pesach) .*CH''M/.exec(ds))) return { kind: 'moed', short: 'חול המועד', txt: 'חול המועד ' + (m[1] === 'Pesach' ? 'פסח' : 'סוכות') };
      if (f & F.ROSH_CHODESH) return { kind: 'rc', short: 'ראש חודש', txt: fixHe(e.render('he-x-NoNikud')) };
      nm = NAMES[ds];
      kind = (f & F.CHAG) ? 'chag' : (f & (F.MAJOR_FAST | F.MINOR_FAST)) ? 'fast' : (f & F.MODERN_HOLIDAY) ? 'modern' : (f & F.SPECIAL_SHABBAT) ? 'special' : (f & F.EREV) ? 'erev' : 'holiday';
      if (nm) return { kind: kind, short: nm[0], txt: nm[1] + (moved ? ' (נדחה)' : '') };
      var he = fixHe(e.render('he-x-NoNikud')).replace(/[()]/g, '').replace(/\s*נדחה\s*/, '').trim();
      return { kind: kind, short: he, txt: he + (moved ? ' (נדחה)' : '') };
    }
    function evMap(start, end) {
      var by = {};
      H.HebrewCalendar.calendar({ start: start, end: end, il: true, sedrot: false }).forEach(function (e) {
        var l = label(e); if (!l) return;
        var k = key(e.getDate().greg());
        (by[k] = by[k] || []).push(l);
      });
      return by;
    }
    // פרשת השבוע של שבת נתונה ('' כשבשבת הזו קוראים קריאה של חג)
    function parsha(sat) {
      try {
        var hd = new HD(sat), sd = H.getSedra(hd.getFullYear(), true).lookup(hd);
        if (sd.chag) return '';
        return sd.parsha.map(function (p) { var s = fixHe(H.Locale.gettext(p, 'he-x-NoNikud')); return PFIX[s] || s; }).join('-');
      } catch (x) { return ''; }
    }
    function nextSat(d) { return add(d, (6 - d.getDay() + 7) % 7); }
    function day(d, map) {
      map = map || evMap(d, d);
      return { d: d, hd: new HD(d), ev: map[key(d)] || [], parsha: d.getDay() === 6 ? parsha(d) : '' };
    }
    function dayLines(x) {   // שורות טקסט ליום: "שבת פרשת תולדות", "ראש חודש כסלו"...
      var a = x.ev.map(function (e) { return e.txt; });
      if (x.d.getDay() === 6 && x.parsha) a.unshift('שבת פרשת ' + x.parsha);
      return a;
    }

    // ---------- חודש אחד: לועזי (mode g, m=0..11) או עברי (mode h, m=1..13 כמו ב-hebcal) ----------
    function month(mode, y, m) {
      var days = [], i, n, first, a, b, ha, hb, title, sub, prev, next;
      if (mode === 'h') {
        if (m === 13 && !HD.isLeapYear(y)) m = 12;
        n = HD.daysInMonth(m, y); first = hgreg(new HD(1, m, y));
        for (i = 0; i < n; i++) days.push(add(first, i));
        a = days[0]; b = days[n - 1];
        title = mon(m, y) + ' ' + gem(y);
        sub = a.getFullYear() !== b.getFullYear() ? GM[a.getMonth()] + ' ' + a.getFullYear() + ' – ' + GM[b.getMonth()] + ' ' + b.getFullYear()
          : (a.getMonth() === b.getMonth() ? GM[a.getMonth()] : GM[a.getMonth()] + '–' + GM[b.getMonth()]) + ' ' + a.getFullYear();
        var first0 = new HD(1, m, y).abs(), p = new HD(first0 - 1), nx = new HD(first0 + n);
        prev = { y: p.getFullYear(), m: p.getMonth() }; next = { y: nx.getFullYear(), m: nx.getMonth() };
      } else {
        n = new Date(noon(y, m + 1, 1).getTime() - 864e5).getDate();
        for (i = 1; i <= n; i++) days.push(noon(y, m, i));
        ha = new HD(days[0]); hb = new HD(days[n - 1]);
        title = GM[m] + ' ' + y;
        sub = ha.getFullYear() !== hb.getFullYear() ? mon(ha.getMonth(), ha.getFullYear()) + ' ' + gem(ha.getFullYear()) + ' – ' + mon(hb.getMonth(), hb.getFullYear()) + ' ' + gem(hb.getFullYear())
          : (ha.getMonth() === hb.getMonth() ? mon(ha.getMonth(), ha.getFullYear()) : mon(ha.getMonth(), ha.getFullYear()) + '–' + mon(hb.getMonth(), hb.getFullYear())) + ' ' + gem(ha.getFullYear());
        prev = { y: m === 0 ? y - 1 : y, m: (m + 11) % 12 }; next = { y: m === 11 ? y + 1 : y, m: (m + 1) % 12 };
      }
      return { mode: mode, y: y, m: m, days: days, title: title, sub: sub, prev: prev, next: next };
    }
    function hmonths(y) { var a = [7, 8, 9, 10, 11, 12]; if (HD.isLeapYear(y)) a.push(13); return a.concat([1, 2, 3, 4, 5, 6]); }
    function okMonth(mode, y) { return mode === 'h' ? y >= HY_MIN && y <= HY_MAX : y >= GY_MIN && y <= GY_MAX; }

    function gridHtml(mo, todayKey, map) {
      map = map || evMap(mo.days[0], mo.days[mo.days.length - 1]);
      var h = '<table class="iv-cal"><caption class="vh">' + mo.title + ', ' + mo.sub + '</caption><thead><tr>' +
        COL.map(function (c, i) { return '<th scope="col"' + (i === 6 ? ' class="sh"' : '') + '><span class="vh">' + (i === 6 ? 'שבת' : 'יום ' + WD[i]) + '</span><span aria-hidden="true">' + c + '</span></th>'; }).join('') + '</tr></thead><tbody><tr>';
      var lead = mo.days[0].getDay(), i, col = 0;
      for (i = 0; i < lead; i++, col++) h += '<td class="e"></td>';
      mo.days.forEach(function (d, ix) {
        if (col === 7) { h += '</tr><tr>'; col = 0; }
        var x = day(d, map), k = key(d), hd = x.hd, cls = [], big, small, lines = dayLines(x);
        if (d.getDay() === 6) cls.push('sh');
        if (x.ev.some(function (e) { return e.kind === 'chag'; })) cls.push('chag');
        if (k === todayKey) cls.push('today');
        if (mo.mode === 'h') { big = gem(hd.getDate()); small = ltr(dm(d)); }
        else { big = d.getDate(); small = gem(hd.getDate()) + (hd.getDate() === 1 || ix === 0 ? ' ' + mon(hd.getMonth(), hd.getFullYear()) : ''); }
        h += '<td' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') + '><button type="button" class="iv-d" data-d="' + k + '"' + (k === todayKey ? ' aria-current="date"' : '') +
          ' aria-label="' + wd(d) + ', ' + greg(d) + ', ' + heb(hd) + (lines.length ? ': ' + lines.join(', ') : '') + '"><span class="n">' + big + '</span><span class="h">' + small + '</span>' +
          (x.parsha ? '<span class="ev k-parsha">' + x.parsha + '</span>' : '') +
          x.ev.map(function (e) { return '<span class="ev k-' + e.kind + '">' + e.short + '</span>'; }).join('') + '</button></td>';
        col++;
      });
      for (; col < 7; col++) h += '<td class="e"></td>';
      return h + '</tr></tbody></table>';
    }
    function listHtml(mo, map) {
      map = map || evMap(mo.days[0], mo.days[mo.days.length - 1]);
      var li = mo.days.map(function (d) {
        var x = day(d, map), lines = dayLines(x);
        return lines.length ? '<li><span class="w">' + wd(d) + ' ' + ltr(dm(d)) + ' · ' + heb(x.hd, true) + '</span><span class="t">' + lines.join(' · ') + '</span></li>' : '';
      }).join('');
      return li ? '<ul class="iv-list">' + li + '</ul>' : '<p class="iv-sub">אין בחודש הזה חגים או מועדים מיוחדים.</p>';
    }
    function dayHtml(d) {
      var x = day(d), lines = dayLines(x), p = d.getDay() === 6 ? '' : parsha(nextSat(d));
      return '<h3>' + wd(d) + ', ' + greg(d) + '</h3><p class="iv-big">' + heb(x.hd) + '</p>' +
        (lines.length ? '<ul>' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' : '') +
        (p ? '<p class="iv-sub">פרשת השבוע: ' + p + '</p>' : '') +
        '<p class="iv-sub">התאריך העברי מתחיל כבר בערב שלפני, עם השקיעה.</p>';
    }

    // ---------- חגי ישראל בשנה עברית ----------
    function holidays(hy) {
      var evs = H.HebrewCalendar.calendar({ year: hy, isHebrewYear: true, il: true, sedrot: false }), rows = [];
      function gd(e) { return clean(e.getDate().greg()); }
      function find(re, last) { var r = null; for (var i = 0; i < evs.length; i++) if (re.test(evs[i].getDesc())) { r = evs[i]; if (!last) break; } return r; }
      function erev(lbl) { return function (a) { var p = add(a, -1); return lbl + ' ' + wd(p) + ' ' + ltr(dm(p)); }; }
      function row(name, re, o) {
        o = o || {};
        var e = find(re), l = o.to ? find(o.to, true) : null; if (!e) return;
        var a = gd(e), note = o.note ? o.note(a) : '';
        if (/observed/.test(e.getDesc())) note = 'נדחה ביום';
        if (o.day && new HD(a).getDate() !== o.day) note = 'השנה המועד הוזז ביום, בגלל השבת';
        rows.push({ name: name, a: a, b: l ? gd(l) : null, sh: !!o.sh, note: note });
      }
      row('ראש השנה', /^Rosh Hashana \d+$/, { to: /^Rosh Hashana II$/, sh: 1, note: erev('ערב החג:') });
      row('צום גדליה', /^Tzom Gedaliah/);
      row('יום הכיפורים', /^Yom Kippur$/, { sh: 1, note: erev('הצום נכנס בערב') });
      row('סוכות', /^Sukkot I$/, { sh: 1, note: erev('ערב החג:') });
      row('חול המועד סוכות', /^Sukkot II /, { to: /^Sukkot VII / });
      row('שמחת תורה ושמיני עצרת', /^Shmini Atzeret$/, { sh: 1 });
      row('חנוכה', /^Chanukah: 2 Candles$/, { to: /^Chanukah: 8th Day$/, note: erev('נר ראשון: בערב') });
      row('צום עשרה בטבת', /^Asara B'Tevet/);
      row('ט״ו בשבט', /^Tu BiShvat$/);
      row('פורים קטן', /^Purim Katan$/);
      row('תענית אסתר', /^Ta'anit Esther/);
      row('פורים', /^Purim$/);
      row('שושן פורים (פורים בירושלים)', /^Shushan Purim$/);
      row('פסח', /^Pesach I$/, { sh: 1, note: erev('ליל הסדר: בערב') });
      row('חול המועד פסח', /^Pesach II /, { to: /^Pesach VI / });
      row('שביעי של פסח', /^Pesach VII$/, { sh: 1 });
      row('יום הזיכרון לשואה ולגבורה', /^Yom HaShoah$/, { day: 27 });
      row('יום הזיכרון לחללי מערכות ישראל', /^Yom HaZikaron$/, { day: 4 });
      row('יום העצמאות', /^Yom HaAtzma'ut$/, { sh: 1, day: 5 });
      row('ל״ג בעומר', /^Lag BaOmer$/);
      row('יום ירושלים', /^Yom Yerushalayim$/);
      row('שבועות', /^Shavuot$/, { sh: 1, note: erev('ערב החג:') });
      row('צום י״ז בתמוז', /^Tzom Tammuz/);
      row('תשעה באב', /^Tish'a B'Av/, { note: erev('הצום נכנס בערב') });
      row('ט״ו באב', /^Tu B'Av$/);
      return rows;
    }
    function span(a, b) {
      if (!b || key(a) === key(b)) return ltr(dmy(a));
      if (a.getFullYear() !== b.getFullYear()) return ltr(dmy(a) + ' – ' + dmy(b));
      if (a.getMonth() === b.getMonth()) return ltr(a.getDate() + '–' + dmy(b));
      return ltr(dm(a) + ' – ' + dmy(b));
    }
    function hspan(a, b) {
      var ha = new HD(a), hb = b ? new HD(b) : null;
      if (!hb || key(a) === key(b)) return heb(ha, true);
      if (ha.getMonth() === hb.getMonth()) return gem(ha.getDate()) + '–' + gem(hb.getDate()) + ' ב' + mon(ha.getMonth(), ha.getFullYear());
      return heb(ha, true) + ' – ' + heb(hb, true);
    }
    function holidaysHtml(hy, today) {
      var tk = today ? key(today) : '', nextDone = !today;
      return '<table class="iv-tbl"><thead><tr><th scope="col">חג או מועד</th><th scope="col">תאריך לועזי</th></tr></thead><tbody>' +
        holidays(hy).map(function (r) {
          var end = r.b || r.a, cls = '';
          if (today && key(end) < tk) cls = 'past'; else if (!nextDone) { cls = 'now'; nextDone = true; }
          return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><th scope="row">' + r.name + (r.sh ? ' <span class="iv-shb">שבתון</span>' : '') +
            '<small>' + hspan(r.a, r.b) + (r.note ? ' · ' + r.note : '') + '</small></th><td><b>' + span(r.a, r.b) + '</b><small>' +
            (r.b ? wd(r.a) + ' – ' + wd(r.b) : wd(r.a)) + '</small></td></tr>';
        }).join('') + '</tbody></table>';
    }
    function nextHoliday(d) {   // החג או המועד הבא אחרי היום d
      var hy = new HD(d).getFullYear(), rows = holidays(hy).concat(holidays(hy + 1)), k = key(d);
      for (var i = 0; i < rows.length; i++) if (key(rows[i].a) > k) return { name: rows[i].name, a: rows[i].a, days: Math.round((rows[i].a - clean(d)) / 864e5) };
      return null;
    }
    function nextHolidayText(d) {
      var n = nextHoliday(d); if (!n) return '';
      return (n.days === 1 ? 'מחר' : 'בעוד ' + n.days + ' ימים') + ': ' + n.name + ' (' + wd(n.a) + ', ' + ltr(dmy(n.a)) + ')';
    }
    function yearInfo(hy) {
      var a = new HD(1, 7, hy).abs(), b = new HD(1, 7, hy + 1).abs(), g0 = hgreg(new HD(1, 7, hy)), g1 = hgreg(new HD(29, 6, hy));
      return { leap: HD.isLeapYear(hy), days: b - a, months: HD.monthsInYear(hy), start: g0, end: g1, name: gem(hy) };
    }

    // ---------- המרות ----------
    function g2h(d, after) { var hd = new HD(d); return after ? hd.next() : hd; }
    function hcheck(hy, hm, hday) {
      if (!(hy >= HY_MIN && hy <= HY_MAX)) return 'כותבים שנה עברית בין ' + HY_MIN + ' ל-' + HY_MAX + ', במספר (5787) או באותיות (תשפ״ז).';
      if (hm === 13 && !HD.isLeapYear(hy)) return 'בשנת ' + gem(hy) + ' אין אדר ב׳. זו שנה רגילה, ויש בה אדר אחד.';
      if (hday > HD.daysInMonth(hm, hy)) return 'ב' + mon(hm, hy) + ' ' + gem(hy) + ' יש רק 29 ימים.';
      return '';
    }
    function h2g(hy, hm, hday) { return hgreg(new HD(hday, hm, hy)); }
    function parseYear(s) {   // "5787", "787", "תשפ״ז", "ה׳תשפ״ז" -> 5787
      s = String(s || '').trim();
      if (/^\d+$/.test(s)) { var n = +s; return n < 1000 ? n + 5000 : n; }
      var t = s.replace(/^ה['׳`]/, '').replace(/[^א-ת]/g, ''), v = 0, V = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
      if (!t) return NaN;
      for (var i = 0; i < t.length; i++) v += V[t[i]] || 0;
      return v < 1000 ? v + 5000 : v;
    }
    function inRange(d) { var y = new HD(d).getFullYear(); return y >= HY_MIN && y <= HY_MAX; }
    // יום ההולדת (או יום השנה) העברי בשנה hy, לפי הכללים המקובלים (אדר בשנה מעוברת, ל׳ בחודש חסר)
    function bday(hb, hy) { if (hy <= hb.getFullYear()) return null; return H.HebrewCalendar.getBirthdayOrAnniversary(hy, hb) || null; }
    function bnote(hb, r) {
      var bm = hb.getMonth(), by = hb.getFullYear(), leapB = HD.isLeapYear(by), leapR = HD.isLeapYear(r.getFullYear());
      if (hb.getDate() === 30 && r.getDate() === 1) {
        return bm === 12 && leapB && !leapR ? 'הלידה הייתה בל׳ באדר א׳, ובשנה רגילה אין יום כזה. לפי החישוב המקובל היום עובר לא׳ בניסן, אבל יש בזה כמה דעות, וכדאי לשאול רב.'
          : 'בשנה הזאת אין ל׳ ב' + mon(bm, by) + ', ולכן היום עובר לא׳ בחודש שאחריו.';
      }
      if (bm === 12 && !leapB && leapR) return 'הלידה הייתה באדר של שנה רגילה. בשנה מעוברת היום חל באדר ב׳.';
      if (bm === 12 && leapB && !leapR) return 'הלידה הייתה באדר א׳. בשנה רגילה יש אדר אחד, והיום חל בו.';
      if (bm === 13 && !leapR) return 'הלידה הייתה באדר ב׳. בשנה רגילה יש אדר אחד, והיום חל בו.';
      return '';
    }
    function mitzva(d, after, girl) {
      var hb = g2h(d, after), r = bday(hb, hb.getFullYear() + (girl ? 12 : 13)), g = hgreg(r), sat = nextSat(g), sx = day(sat);
      return { hb: hb, r: r, g: g, sat: sat, shabbat: sx.parsha ? 'שבת פרשת ' + sx.parsha : 'שבת' + (sx.ev.length ? ' ' + sx.ev[0].short : ''), note: bnote(hb, r) };
    }
    function birthdays(hb, from, n) {
      var out = [], hy = Math.max(new HD(from).getFullYear(), hb.getFullYear() + 1), fk = key(from), guard = 0;
      while (out.length < n && hy <= HY_MAX + 20 && guard++ < 200) {
        var r = bday(hb, hy);
        if (r) { var g = hgreg(r); if (key(g) >= fk) out.push({ age: hy - hb.getFullYear(), hd: r, g: g, note: bnote(hb, r) }); }
        hy++;
      }
      return out;
    }

    // ---------- היום: התאריך העברי מתחלף בשקיעה ----------
    function tzDate(now, tz) {
      var o = {};
      new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now).forEach(function (p) { o[p.type] = p.value; });
      return noon(+o.year, +o.month - 1, +o.day);
    }
    function sunset(lat, lon, d) { try { return new H.Zmanim(new H.GeoLocation('', lat, lon, 0, TZ), d, false).sunset(); } catch (x) { return new Date(NaN); } }
    function tm(d, tz) { return isNaN(d) ? '' : new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz || undefined }).format(d); }
    // pl = {name, loc, lat, lon, tz} ; tz ריק = השעון של המכשיר (לפי מיקום)
    function today(now, pl) {
      var civ = pl.tz ? tzDate(now, pl.tz) : clean(now), ss = sunset(pl.lat, pl.lon, civ), after = !isNaN(ss) && now >= ss, hdDay = new HD(civ);
      return { now: now, civ: civ, ss: ss, after: after, hdDay: hdDay, hd: after ? hdDay.next() : hdDay, tm: tm(ss, pl.tz), pl: pl };
    }
    function place(slug) { var c = CITIES.filter(function (x) { return x[0] === slug; })[0] || CITIES[0]; return { name: c[1], loc: c[2], lat: c[3], lon: c[4], tz: TZ }; }
    function todayHtml(t, stat) {
      var civ = t.civ, tom = t.hdDay.next(), tmr = add(civ, 1), where = t.tm ? ' (' + ltr(t.tm) + ' ' + t.pl.loc + ')' : '', h, hdate = hgreg(t.hd), x = day(hdate), lines = dayLines(x), p = parsha(nextSat(hdate));
      if (stat) {
        h = '<p class="iv-k">התאריך העברי ב' + wd(civ) + ', ' + greg(civ) + '</p><p class="iv-big">' + heb(t.hdDay) + '</p>' +
          '<p class="iv-sub">אחרי השקיעה' + where + ' מתחיל ' + heb(tom, true) + '.</p>';
        x = day(civ); lines = dayLines(x); p = parsha(nextSat(civ));
      } else if (!t.after) {
        h = '<p class="iv-k">היום, ' + wd(civ) + ', ' + greg(civ) + '</p><p class="iv-big">' + heb(t.hdDay) + '</p>' +
          '<p class="iv-sub">אחרי השקיעה' + where + ' מתחיל כבר ' + heb(tom, true) + '.</p>';
      } else {
        h = '<p class="iv-k">עכשיו, אחרי השקיעה' + where + '</p><p class="iv-big">' + heb(t.hd) + '</p>' +
          '<p class="iv-sub">ליל ' + (tmr.getDay() === 6 ? 'שבת' : WD[tmr.getDay()]) + '. התאריך העברי התחלף בשקיעה. היום, ' + wd(civ) + ' ' + ltr(dm(civ)) + ', עד השקיעה היה ' + heb(t.hdDay, true) + '.</p>';
      }
      var li = lines.map(function (l) { return '<li>' + l + '</li>'; });
      if (p && hdate.getDay() !== 6) li.push('<li>פרשת השבוע: ' + p + '</li>');
      var nh = nextHolidayText(stat ? civ : hdate);
      if (nh && !stat) li.push('<li>' + nh + '</li>');
      return h + (li.length ? '<ul>' + li.join('') + '</ul>' : '');
    }
    function todayText(t, url) {
      var hdate = hgreg(t.hd), p = parsha(nextSat(hdate)), lines = dayLines(day(hdate));
      return 'התאריך העברי ' + (t.after ? 'עכשיו (אחרי השקיעה)' : 'היום') + ': ' + heb(t.hd) + '\n' + wd(t.civ) + ', ' + dmy(t.civ) +
        (lines.length ? '\n' + lines.join(' · ') : '') + (p && hdate.getDay() !== 6 ? '\nפרשת השבוע: ' + p : '') + '\n\nתאריך עברי והמרת תאריכים: ' + url;
    }
    function todayLine(t) {   // שורה אחת, לראש דף הלוח
      return wd(t.civ) + ', ' + greg(t.civ) + ' · ' + heb(t.hdDay) + (t.after ? ' (אחרי השקיעה: כבר ' + heb(t.hd, true) + ')' : '');
    }
    function nextDaysHtml(civ, n, stat) {
      var map = evMap(civ, add(civ, n)), h = '<table class="iv-tbl"><thead><tr><th scope="col">יום</th><th scope="col">תאריך עברי</th></tr></thead><tbody>';
      for (var i = 0; i < n; i++) {
        var d = add(civ, i), x = day(d, map), lines = dayLines(x);
        h += '<tr' + (i === 0 && !stat ? ' class="now"' : '') + '><th scope="row">' + (!stat && i === 0 ? 'היום, ' : !stat && i === 1 ? 'מחר, ' : '') + wd(d) + '<small>' + ltr(dmy(d)) + '</small></th><td><b>' + heb(x.hd) + '</b>' +
          (lines.length ? '<small>' + lines.join(' · ') + '</small>' : '') + '</td></tr>';
      }
      return h + '</tbody></table>';
    }

    // ---------- תוצאות ההמרה (אותו HTML בדף החי ובמחולל) ----------
    function g2hHtml(d, after) {
      if (!inRange(d)) return '<p class="iv-err">ההמרה עובדת לשנים ' + (GY_MIN - 1) + ' עד ' + (GY_MAX + 1) + '.</p>';
      var hd = g2h(d, after), hdate = hgreg(hd), x = day(hdate), li = dayLines(x).map(function (l) { return '<li>' + l + '</li>'; }), p = parsha(nextSat(hdate));
      if (p && hdate.getDay() !== 6) li.push('<li>פרשת השבוע: ' + p + '</li>');
      return '<p class="iv-k">' + wd(d) + ', ' + greg(d) + (after ? ', אחרי השקיעה' : '') + '</p><p class="iv-big">' + heb(hd) + '</p>' +
        (after ? '<p class="iv-sub">אחרי השקיעה כבר מתחיל היום העברי הבא, ולכן זה התאריך של ' + wd(hdate) + '.</p>' : '') +
        (li.length ? '<ul>' + li.join('') + '</ul>' : '') +
        (d.getFullYear() < 1583 ? '<p class="iv-sub">שימו לב: לפני 1582 נהג באירופה הלוח היוליאני. כאן החישוב לפי הלוח הגרגוריאני של היום.</p>' : '');
    }
    function g2hText(d, after) { return dmy(d) + (after ? ' (אחרי השקיעה)' : '') + ' = ' + heb(g2h(d, after)); }
    function h2gHtml(hy, hm, hday) {
      var err = hcheck(hy, hm, hday);
      if (err) return '<p class="iv-err">' + err + '</p>';
      var d = h2g(hy, hm, hday), e = add(d, -1), li = dayLines(day(d)).map(function (l) { return '<li>' + l + '</li>'; });
      return '<p class="iv-k">' + heb(new HD(hday, hm, hy)) + '</p><p class="iv-big">' + wd(d) + ', ' + greg(d) + '</p>' +
        (li.length ? '<ul>' + li.join('') + '</ul>' : '') +
        '<p class="iv-sub">התאריך העברי מתחיל כבר בערב שלפני, ' + wd(e) + ' ' + ltr(dm(e)) + ', עם השקיעה.</p>';
    }
    function h2gText(hy, hm, hday) { return hcheck(hy, hm, hday) ? '' : heb(new HD(hday, hm, hy)) + ' = ' + wd(h2g(hy, hm, hday)) + ', ' + dmy(h2g(hy, hm, hday)); }
    function bmHtml(d, after, girl, from, example) {
      if (!inRange(d) || new HD(d).getFullYear() + 14 > HY_MAX) return '<p class="iv-err">החישוב עובד לתאריכי לידה מ-' + (GY_MIN - 1) + ' ואילך.</p>';
      var m = mitzva(d, after, girl), eve = add(m.g, -1), what = girl ? 'בת המצווה' : 'בר המצווה', list = birthdays(m.hb, from, 10);
      var h = (example ? '<p class="iv-ex">דוגמה: ' + (girl ? 'בת שנולדה' : 'בן שנולד') + ' ב-' + ltr(dmy(d)) + '. מכניסים תאריך לידה, והתוצאה מתעדכנת.</p>' : '') +
        '<div class="res"><h3>תאריך הלידה העברי</h3><p class="iv-big">' + heb(m.hb) + '</p><p class="iv-sub">' + wd(d) + ', ' + greg(d) + (after ? ', אחרי השקיעה (לכן התאריך העברי של היום שאחרי)' : '') + '</p></div>' +
        '<div class="res"><h3>' + what + ' (גיל ' + (girl ? 12 : 13) + ')</h3><p class="iv-big">' + heb(m.r) + '</p><p class="iv-g">' + wd(m.g) + ', ' + greg(m.g) + '</p><ul>' +
        '<li>החיוב במצוות מתחיל כבר בערב שלפני, ' + wd(eve) + ' ' + ltr(dm(eve)) + ', מצאת הכוכבים.</li>' +
        '<li>' + (m.g.getDay() === 6 ? 'היום עצמו הוא ' + m.shabbat + '.' : 'השבת הקרובה אחריו: ' + m.shabbat + ', ' + ltr(dmy(m.sat)) + '.') + '</li>' +
        (m.note ? '<li>' + m.note + '</li>' : '') + '</ul></div>';
      if (list.length) {
        h += '<div class="res"><h3>ימי ההולדת העבריים הבאים</h3><table class="iv-tbl"><thead><tr><th scope="col">גיל</th><th scope="col">תאריך לועזי</th></tr></thead><tbody>' +
          list.map(function (b) {
            return '<tr><th scope="row">' + b.age + '<small>' + heb(b.hd) + (b.note ? ' · ' + b.note : '') + '</small></th><td><b>' + ltr(dmy(b.g)) + '</b><small>' + wd(b.g) + '</small></td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      return h;
    }
    function bmText(d, after, girl) {
      var m = mitzva(d, after, girl);
      return 'תאריך הלידה העברי: ' + heb(m.hb) + '\n' + (girl ? 'בת המצווה' : 'בר המצווה') + ': ' + heb(m.r) + ', ' + wd(m.g) + ' ' + dmy(m.g) + '\n' +
        (m.g.getDay() === 6 ? m.shabbat : 'השבת שאחריו: ' + m.shabbat + ' (' + dmy(m.sat) + ')');
    }

    return {
      noon: noon, clean: clean, add: add, key: key, fromKey: fromKey, gem: gem, mon: mon, heb: heb, greg: greg, dm: dm, dmy: dmy, wd: wd, hgreg: hgreg,
      evMap: evMap, parsha: parsha, nextSat: nextSat, day: day, dayLines: dayLines, month: month, hmonths: hmonths, okMonth: okMonth,
      gridHtml: gridHtml, listHtml: listHtml, dayHtml: dayHtml, holidays: holidays, holidaysHtml: holidaysHtml, nextHoliday: nextHoliday, nextHolidayText: nextHolidayText, yearInfo: yearInfo,
      g2h: g2h, hcheck: hcheck, h2g: h2g, parseYear: parseYear, inRange: inRange, bday: bday, mitzva: mitzva, birthdays: birthdays,
      tzDate: tzDate, sunset: sunset, today: today, place: place, todayHtml: todayHtml, todayText: todayText, todayLine: todayLine, nextDaysHtml: nextDaysHtml,
      g2hHtml: g2hHtml, g2hText: g2hText, h2gHtml: h2gHtml, h2gText: h2gText, bmHtml: bmHtml, bmText: bmText, HD: HD
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { core: core, CITIES: CITIES, GM: GM, HMN: HMN, LUACH: LUACH, TAARICH: TAARICH, HY_MIN: HY_MIN, HY_MAX: HY_MAX, GY_MIN: GY_MIN, GY_MAX: GY_MAX };
    return;
  }

  // ================= הדפים עצמם =================
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kodesh-ivri', C = null, st = { city: 'yerushalaim', gps: null, mode: 'g', birth: '', bafter: 0, girl: 0 };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var usedAt = {};
  function used(tool, how) {   // לא יותר מאירוע אחד בחצי דקה לכל סוג פעולה
    var k = tool + how, now = Date.now();
    if (usedAt[k] && now - usedAt[k] < 30000) return;
    usedAt[k] = now;
    if (window.toolUsed) window.toolUsed(tool, { how: how });
  }
  function pl() { return st.gps ? { name: 'המיקום שלי', loc: 'במקום שלכם', lat: st.gps[0], lon: st.gps[1], tz: '' } : C.place(st.city); }
  function copyBtn(b, getText) {
    b.addEventListener('click', function () {
      var old = b.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(getText()) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = old; }, 1800); }).catch(function () {});
    });
  }
  function wa(text) { return 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text); }

  // ---------------- לוח שנה עברי לועזי ----------------
  function initLuach() {
    var mode = st.mode === 'h' ? 'h' : 'g', t = C.today(new Date(), pl()), y, m, shownDay = '';
    function toToday() { if (mode === 'h') { y = t.hdDay.getFullYear(); m = t.hdDay.getMonth(); } else { y = t.civ.getFullYear(); m = t.civ.getMonth(); } }
    function readHash() {
      var h = /^#([gh])(\d{4})-(\d{1,2})$/.exec(location.hash || '');
      if (!h) return false;
      var hm = h[1], hy = +h[2], mm = +h[3];
      if (!C.okMonth(hm, hy) || mm < 1 || mm > (hm === 'h' ? 13 : 12)) return false;
      mode = hm; y = hy; m = hm === 'g' ? mm - 1 : mm;
      return true;
    }
    function setHash() { try { history.replaceState(null, '', '#' + mode + y + '-' + (mode === 'g' ? m + 1 : m)); } catch (e) {} }
    function fillMonths() {
      var s = $('li-month');
      s.innerHTML = mode === 'h' ? C.hmonths(y).map(function (k) { return '<option value="' + k + '">' + C.mon(k, y) + '</option>'; }).join('')
        : GM.map(function (n, i) { return '<option value="' + i + '">' + n + '</option>'; }).join('');
      s.value = String(m);
    }
    function render() {
      var mo = C.month(mode, y, m), map = C.evMap(mo.days[0], mo.days[mo.days.length - 1]);
      m = mo.m;
      $('li-title').textContent = mo.title; $('li-sub').textContent = mo.sub;
      $('li-grid').innerHTML = C.gridHtml(mo, C.key(t.civ), map);
      $('li-list').innerHTML = C.listHtml(mo, map);
      $('li-list-h').textContent = 'חגים ומועדים: ' + mo.title;
      fillMonths();
      $('li-year').value = y; $('li-year').min = mode === 'h' ? HY_MIN : GY_MIN; $('li-year').max = mode === 'h' ? HY_MAX : GY_MAX;
      $('li-year-l').textContent = mode === 'h' ? 'שנה עברית (' + C.gem(y) + ')' : 'שנה';
      $('li-prev').disabled = !C.okMonth(mode, mo.prev.y); $('li-next').disabled = !C.okMonth(mode, mo.next.y);
      [].forEach.call(document.querySelectorAll('input[name="li-mode"]'), function (r) { r.checked = r.value === mode; });
      [].forEach.call(document.querySelectorAll('[data-iv-yr]'), function (el) { el.textContent = mode === 'h' ? C.gem(y) : y; });
      if (shownDay) { var b = $('li-grid').querySelector('[data-d="' + shownDay + '"]'); if (b) b.parentNode.classList.add('sel'); else { shownDay = ''; $('li-day').hidden = true; } }
    }
    function head() {
      t = C.today(new Date(), pl());
      $('li-today').innerHTML = '<b>היום:</b> ' + C.todayLine(t);
      var nh = C.nextHolidayText(C.hgreg(t.hd)); $('li-nexthag').textContent = nh.replace(/<[^>]+>/g, '');
      var hy = t.hd.getFullYear(), i0 = C.yearInfo(hy), i1 = C.yearInfo(hy + 1);
      function yrs(i) { return i.start.getFullYear() + '–' + i.end.getFullYear(); }
      $('li-hag0-h').textContent = 'חגי ישראל ' + i0.name + ': חגים ' + yrs(i0) + ' וימי שבתון';
      $('li-hag1-h').textContent = 'חגי ישראל ' + i1.name + ': חגים ' + yrs(i1);
      $('li-hag0').innerHTML = C.holidaysHtml(hy, t.civ); $('li-hag1').innerHTML = C.holidaysHtml(hy + 1, null);
    }
    function go(ny, nm, how) { if (!C.okMonth(mode, ny)) return; y = ny; m = nm; shownDay = ''; $('li-day').hidden = true; render(); setHash(); used('luach_ivri', how); }
    if (!readHash()) toToday();
    head(); render();
    $('li-prev').addEventListener('click', function () { var mo = C.month(mode, y, m); go(mo.prev.y, mo.prev.m, 'nav'); });
    $('li-next').addEventListener('click', function () { var mo = C.month(mode, y, m); go(mo.next.y, mo.next.m, 'nav'); });
    $('li-now').addEventListener('click', function () { toToday(); shownDay = ''; $('li-day').hidden = true; render(); try { history.replaceState(null, '', location.pathname); } catch (e) {} used('luach_ivri', 'today'); });
    $('li-month').addEventListener('change', function () { go(y, +this.value, 'month'); });
    $('li-year').addEventListener('change', function () {
      var v = Math.round(+this.value);
      if (!C.okMonth(mode, v)) { this.value = y; $('li-msg').textContent = mode === 'h' ? 'שנה עברית בין ' + HY_MIN + ' ל-' + HY_MAX + '.' : 'שנה בין ' + GY_MIN + ' ל-' + GY_MAX + '.'; return; }
      $('li-msg').textContent = ''; go(v, m, 'year');
    });
    [].forEach.call(document.querySelectorAll('input[name="li-mode"]'), function (r) {
      r.addEventListener('change', function () {
        if (!r.checked || r.value === mode) return;
        var mid = C.month(mode, y, m).days[14];   // עוברים לחודש שמכיל את אמצע החודש המוצג
        mode = r.value; st.mode = mode; save();
        if (mode === 'h') { var hd = new C.HD(mid); y = hd.getFullYear(); m = hd.getMonth(); } else { y = mid.getFullYear(); m = mid.getMonth(); }
        shownDay = ''; $('li-day').hidden = true; render(); setHash(); used('luach_ivri', 'mode');
      });
    });
    $('li-grid').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.iv-d') : null; if (!b) return;
      var d = C.fromKey(b.getAttribute('data-d')); if (!d) return;
      [].forEach.call($('li-grid').querySelectorAll('td.sel'), function (x) { x.classList.remove('sel'); });
      b.parentNode.classList.add('sel'); shownDay = b.getAttribute('data-d');
      $('li-day').innerHTML = C.dayHtml(d); $('li-day').hidden = false; used('luach_ivri', 'day');
    });
    function printYear() {
      var list = mode === 'h' ? C.hmonths(y).map(function (k) { return C.month('h', y, k); }) : GM.map(function (n, i) { return C.month('g', y, i); });
      var info = mode === 'h' ? C.yearInfo(y) : null;
      $('li-printbox').innerHTML = '<h2 class="iv-ph">לוח שנה עברי לועזי ' + (mode === 'h' ? C.gem(y) + ' (<bdi dir="ltr">' + info.start.getFullYear() + '–' + info.end.getFullYear() + '</bdi>)' : y) + '</h2>' +
        list.map(function (mo) { return '<section class="iv-pm"><h3>' + mo.title + ' <small>' + mo.sub + '</small></h3>' + C.gridHtml(mo, '') + '</section>'; }).join('') +
        '<p class="iv-pf">hakelim.com/kodesh/luach-ivri · לפי מנהג ארץ ישראל</p>';
      document.documentElement.classList.add('iv-py');
      window.print();
    }
    window.addEventListener('afterprint', function () { document.documentElement.classList.remove('iv-py'); $('li-printbox').innerHTML = ''; });
    [].forEach.call(document.querySelectorAll('[data-iv-print]'), function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('data-iv-print') === 'y') { used('luach_ivri', 'print_year'); printYear(); }
        else { used('luach_ivri', 'print'); document.documentElement.classList.remove('iv-py'); window.print(); }
      });
    });
    window.addEventListener('hashchange', function () { if (readHash()) { st.mode = mode; shownDay = ''; $('li-day').hidden = true; render(); } });
    setInterval(function () { var k = C.key(t.civ), a = t.after; var n = C.today(new Date(), pl()); if (C.key(n.civ) !== k || n.after !== a) { head(); render(); } }, 60000);
  }

  // ---------------- תאריך עברי היום + המרות ----------------
  function initTaarich() {
    var t, shareNow = '', url = location.origin + TAARICH;
    var sel = $('ti-place');
    sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '<option value="gps">לפי המיקום שלי</option>';
    sel.value = st.gps ? 'gps' : (CITIES.filter(function (c) { return c[0] === st.city; })[0] || CITIES[0])[0];
    function drawToday() {
      t = C.today(new Date(), pl());
      $('ti-today').innerHTML = C.todayHtml(t, false);
      $('ti-next').innerHTML = C.nextDaysHtml(t.civ, 14, false);
      shareNow = C.todayText(t, url);
      $('ti-wa').href = wa(shareNow);
    }
    sel.addEventListener('change', function () {
      var msg = $('ti-st');
      if (sel.value !== 'gps') { st.city = sel.value; st.gps = null; msg.textContent = ''; save(); drawToday(); used('taarich_ivri', 'city'); return; }
      if (!navigator.geolocation) { msg.textContent = 'המכשיר לא נותן מיקום. אפשר לבחור עיר מהרשימה.'; sel.value = st.city; return; }
      msg.textContent = 'מאתר…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        st.gps = [+pos.coords.latitude.toFixed(3), +pos.coords.longitude.toFixed(3)]; save();
        msg.textContent = 'נמצא ✓ השקיעה לפי המקום שבו אתם.'; drawToday(); used('taarich_ivri', 'gps');
      }, function () { msg.textContent = 'לא קיבלתי מיקום. צריך לאשר מיקום לדפדפן, או לבחור עיר.'; sel.value = st.city; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });
    $('ti-wa').addEventListener('click', function () { used('taarich_ivri', 'wa'); });
    copyBtn($('ti-copy'), function () { used('taarich_ivri', 'copy'); return shareNow; });
    drawToday();
    setInterval(function () { var k = C.key(t.civ), a = t.after, n = C.today(new Date(), pl()); if (C.key(n.civ) !== k || n.after !== a) drawToday(); }, 60000);

    // לועזי -> עברי
    var gd = $('ti-gdate'), ga = $('ti-gafter'), gtxt = '';
    function drawG(user) {
      var d = C.fromKey(gd.value);
      if (!d) { $('ti-g2h-res').innerHTML = '<p class="iv-err">בוחרים תאריך לועזי.</p>'; gtxt = ''; return; }
      $('ti-g2h-res').innerHTML = C.g2hHtml(d, ga.checked);
      gtxt = C.inRange(d) ? C.g2hText(d, ga.checked) + '\n\nהמרת תאריך לועזי לעברי: ' + url : '';
      $('ti-g2h-wa').href = wa(gtxt);
      if (user) used('taarich_ivri', 'g2h');
    }
    gd.value = C.key(t.civ);
    gd.addEventListener('input', function () { drawG(true); }); gd.addEventListener('change', function () { drawG(true); }); ga.addEventListener('change', function () { drawG(true); });
    copyBtn($('ti-g2h-copy'), function () { return gtxt; });
    drawG(false);

    // עברי -> לועזי
    var hday = $('ti-hday'), hmon = $('ti-hmon'), hyear = $('ti-hyear'), htxt = '';
    hday.innerHTML = Array.apply(null, Array(30)).map(function (_, i) { return '<option value="' + (i + 1) + '">' + C.gem(i + 1) + '</option>'; }).join('');
    function fillHM(y, keep) {
      var ok = y >= HY_MIN && y <= HY_MAX, list = C.hmonths(ok ? y : 5785);
      hmon.innerHTML = list.map(function (k) { return '<option value="' + k + '">' + C.mon(k, ok ? y : 5785) + '</option>'; }).join('');
      hmon.value = String(list.indexOf(keep) >= 0 ? keep : keep === 13 ? 12 : 7);
    }
    function drawH(user) {
      var y = C.parseYear(hyear.value), keep = +hmon.value || 7;
      fillHM(y, keep);
      $('ti-hyear-eq').textContent = y >= HY_MIN && y <= HY_MAX ? '= ' + C.gem(y) + ' (' + y + ')' + (C.yearInfo(y).leap ? ', שנה מעוברת' : '') : '';
      $('ti-h2g-res').innerHTML = isNaN(y) ? '<p class="iv-err">כותבים שנה עברית, במספר (5787) או באותיות (תשפ״ז).</p>' : C.h2gHtml(y, +hmon.value, +hday.value);
      htxt = isNaN(y) ? '' : C.h2gText(y, +hmon.value, +hday.value);
      if (htxt) htxt += '\n\nהמרת תאריך עברי ללועזי: ' + url;
      $('ti-h2g-wa').href = wa(htxt);
      if (user) used('taarich_ivri', 'h2g');
    }
    hyear.value = t.hdDay.getFullYear(); fillHM(t.hdDay.getFullYear(), t.hdDay.getMonth()); hday.value = String(t.hdDay.getDate());
    [hday, hmon].forEach(function (el) { el.addEventListener('change', function () { drawH(true); }); });
    hyear.addEventListener('input', function () { drawH(true); });
    copyBtn($('ti-h2g-copy'), function () { return htxt; });
    drawH(false);

    // בר מצווה, בת מצווה ויום הולדת עברי
    var bd = $('ti-bdate'), ba = $('ti-bafter'), btxt = '';
    function girl() { var r = document.querySelector('input[name="ti-sex"]:checked'); return !!r && r.value === 'girl'; }
    function drawB(user) {
      var d = C.fromKey(bd.value), ex = !d;
      if (ex) d = C.noon(t.civ.getFullYear() - 12, t.civ.getMonth(), t.civ.getDate());
      $('ti-bm-res').innerHTML = C.bmHtml(d, !ex && ba.checked, girl(), t.civ, ex);
      $('ti-bm-inv').href = girl() ? '/kelim/eruim/hazmana/bat-mitzva/' : '/kelim/eruim/hazmana/bar-mitzva/';
      $('ti-bm-inv').textContent = girl() ? 'להכין הזמנה לבת המצווה' : 'להכין הזמנה לבר המצווה';
      btxt = '';
      if (!ex && C.inRange(d)) { try { btxt = C.bmText(d, ba.checked, girl()) + '\n\nמחשבון בר מצווה ותאריך עברי: ' + url; } catch (e) {} }
      $('ti-bm-wa').href = wa(btxt || 'מחשבון בר מצווה, בת מצווה ויום הולדת עברי, בחינם: ' + url);
      if (user) { st.birth = bd.value; st.bafter = ba.checked ? 1 : 0; st.girl = girl() ? 1 : 0; save(); used('taarich_ivri', 'bm'); }
    }
    if (st.birth && C.fromKey(st.birth)) { bd.value = st.birth; ba.checked = !!st.bafter; }
    [].forEach.call(document.querySelectorAll('input[name="ti-sex"]'), function (r) { r.checked = (r.value === 'girl') === !!st.girl; r.addEventListener('change', function () { drawB(true); }); });
    bd.addEventListener('input', function () { drawB(true); }); bd.addEventListener('change', function () { drawB(true); }); ba.addEventListener('change', function () { drawB(true); });
    copyBtn($('ti-bm-copy'), function () { return btxt; });
    drawB(false);
  }

  function start() {
    C = core(window.hebcal);
    try { if ($('li')) initLuach(); if ($('ti')) initTaarich(); } catch (e) { if (window.console) console.error(e); }
  }
  if (!$('li') && !$('ti')) return;
  if (window.hebcal) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
})(this);
