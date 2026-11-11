// לוח בריתות מיוחדות לשנה – כלי קודש למוהלים (08.11.2026).
// לכל יום לידה: מתי חל היום השמיני בשבת, ביום טוב, ביום כיפור, בתשעה באב, בחנוכה, בפורים או בצום,
// ומה ההלכה בקצרה עם מקורות. גם מחשבון "נולד ב..." והדפסה של השנה כולה.
// החישוב מ-@hebcal/core (jsdelivr), הכול בטלפון. המנוע (makeEngine) נבדק גם ב-node.
(function (root) {
  'use strict';

  // ---------- המנוע: בלי DOM ----------
  function makeEngine(H) {
    var F = H.flags;
    var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    var cache = {};

    function key(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function noon(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
    function addDays(d, n) { var x = noon(d); x.setDate(x.getDate() + n); return x; }

    // כל האירועים של שנה עברית (וגם החודש שלפניה ואחריה, בשביל לידות בסוף אלול), לפי תאריך לועזי
    function yearEvents(hy, il) {
      var ck = hy + (il ? 'i' : 'd');
      if (cache[ck]) return cache[ck];
      var by = {};
      var start = addDays(new H.HDate(1, H.months.TISHREI, hy).greg(), -40);
      var end = addDays(new H.HDate(29, H.months.ELUL, hy).greg(), 40);
      H.HebrewCalendar.calendar({ start: start, end: end, il: il, sedrot: true, noMinorFast: false, noModern: true,
        noRoshChodesh: true, noSpecialShabbat: true }).forEach(function (e) {
        var k = key(e.getDate().greg());
        (by[k] = by[k] || []).push(e);
      });
      cache[ck] = by;
      return by;
    }

    // מה מיוחד ביום הזה (d = תאריך לועזי של היום, ביום עצמו)
    function dayInfo(d, il) {
      d = noon(d);
      var hd = new H.HDate(d), r = { d: d, hd: hd, tags: [], names: [] };
      var evs = yearEvents(hd.getFullYear(), il)[key(d)] || [];
      // אירועים של סוף השנה שעברה או תחילת הבאה
      if (!evs.length) {
        var o = yearEvents(hd.getFullYear() + (hd.getMonth() === H.months.ELUL ? 1 : -1), il)[key(d)];
        if (o) evs = o;
      }
      r.shabbat = d.getDay() === 6;
      evs.forEach(function (e) {
        var f = e.getFlags(), desc = e.getDesc(), he = e.render('he-x-NoNikud');
        if (f & F.PARSHA_HASHAVUA) { r.parsha = he; return; }
        if (desc === 'Yom Kippur') { r.yk = true; r.names.push('יום כיפור'); }
        else if (f & F.CHAG) { r.yt = true; r.names.push(he.replace(/\s*\d{4}$/, '')); if (/ II$|VIII$|Simchat Torah/.test(desc) && !il && !/Rosh Hashana/.test(desc)) r.ytSheni = true; }
        else if (/^Tish'a B'Av/.test(desc)) { r.tb = true; r.tbNidche = /observed/i.test(desc); r.names.push(r.tbNidche ? 'תשעה באב נדחה' : 'תשעה באב'); }
        else if ((f & F.MINOR_FAST) && !/Bechorot/.test(desc)) { r.fast = true; r.fastName = he; r.esther = /Esther/.test(desc); r.names.push(he); }
        else if (desc === 'Purim') { r.purim = true; r.names.push('פורים'); }
        else if (desc === 'Shushan Purim') { r.shushan = true; r.names.push('שושן פורים (פורים בירושלים)'); }
      });
      // חנוכה: מכ"ה בכסלו, שמונה ימים
      var c = new H.HDate(25, H.months.KISLEV, hd.getFullYear()).greg();
      var cd = Math.round((noon(d) - noon(c)) / 864e5);
      if (cd >= 0 && cd < 8) { r.chanuka = cd + 1; r.names.push('חנוכה, יום ' + H.gematriya(cd + 1)); }
      // ט' באב שחל בשבת: הצום נדחה למחר, והברית בשבת כרגיל
      if (r.shabbat && hd.getMonth() === H.months.AV && hd.getDate() === 9) { r.tbShabbat = true; r.names.push('ט׳ באב שחל בשבת'); }
      if (r.shabbat) r.names.unshift(r.parsha ? 'שבת ' + r.parsha : 'שבת');
      ['shabbat', 'yt', 'yk', 'tb', 'tbShabbat', 'chanuka', 'purim', 'shushan', 'fast'].forEach(function (t) { if (r[t]) r.tags.push(t); });
      r.special = r.tags.length > 0;
      r.blocked = !!(r.shabbat || r.yt || r.yk); // ימים שספק או ברית שלא בזמנה לא דוחה
      return r;
    }

    // היום הראשון מ-d והלאה שאינו שבת, יום טוב או יום כיפור
    function firstAllowed(d, il) {
      var x = noon(d), n = 0;
      while (dayInfo(x, il).blocked && n < 6) { x = addDays(x, 1); n++; }
      return x;
    }

    // מחשבון: birth = יום לידה לועזי; when = 'day' | 'night' | 'bh'; cs = ניתוח קיסרי
    function compute(birth, when, cs, il) {
      birth = noon(birth);
      var hebDay = when === 'day' ? birth : addDays(birth, 1); // אחרי השקיעה – כבר היום העברי הבא
      var eighth = addDays(hebDay, 7);
      var info = dayInfo(eighth, il), res = { hebBirth: new H.HDate(hebDay), eighth: eighth, info: info, notes: [] };
      if (when === 'bh') {
        // ספק: מונים מהלילה, ונימול לתשיעי שהוא ספק שמיני (יו"ד רסב ד; רסו ח)
        res.hebBirth = new H.HDate(birth);
        res.hebBirth2 = new H.HDate(hebDay);
        res.brit = firstAllowed(eighth, il);
        res.doubt = true;
      } else if (cs) {
        res.brit = firstAllowed(eighth, il);
      } else {
        res.brit = eighth;
      }
      res.moved = key(res.brit) !== key(eighth);
      // בספק מונים מהיום הראשון: "נימול לתשיעי, שהוא ספק שמיני"
      res.dayNum = (res.doubt ? 9 : 8) + Math.round((res.brit - eighth) / 864e5);
      res.britInfo = res.moved ? dayInfo(res.brit, il) : info;
      return res;
    }

    // כל ימי השמיני המיוחדים בשנה עברית (היום השמיני בתוך השנה)
    function year(hy, il) {
      var s = noon(new H.HDate(1, H.months.TISHREI, hy).greg()), e = noon(new H.HDate(29, H.months.ELUL, hy).greg());
      var out = [];
      for (var d = s; d <= e; d = addDays(d, 1)) {
        var inf = dayInfo(d, il);
        if (!inf.special) continue;
        var born = addDays(d, -7);
        out.push({ eighth: inf, born: born, bornPrevEve: addDays(born, -1), alt: inf.blocked ? firstAllowed(d, il) : null });
      }
      return out;
    }

    function hebStr(hd) { return hd.renderGematriya(true).replace(/\s[^\s]+$/, ''); }
    function hebFull(hd) { return hd.renderGematriya(true); }
    function g(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
    function gs(d) { return d.getDate() + '.' + (d.getMonth() + 1); }
    function dayName(d) { return d.getDay() === 6 ? 'שבת' : 'יום ' + DAYS[d.getDay()]; }

    return { dayInfo: dayInfo, compute: compute, year: year, firstAllowed: firstAllowed, addDays: addDays, noon: noon, key: key,
      hebStr: hebStr, hebFull: hebFull, g: g, gs: gs, dayName: dayName, DAYS: DAYS };
  }

  // ---------- ההלכות בקצרה, עם מקורות ----------
  var HAL = {
    shabbat: { t: 'ברית בשבת', p: [
      'ברית ביום השמיני דוחה שבת: המילה, הפריעה והמציצה, ונותנים תחבושת.',
      'כל מה שאפשר להכין מערב שבת מכינים מערב שבת: האיזמל, התחבושות והאבקה, ומביאים אותם למקום הברית לפני שבת (במקום בלי עירוב).',
      'ברית שנדחתה (לא ביום השמיני) לא נעשית בשבת.',
      'נולד בין השמשות או בניתוח קיסרי – לא נימול בשבת (ראו למטה).',
      'מי שלא מל מעולם לא ימול לראשונה בשבת.',
      'שעת הברית: לפני השקיעה, עם מרווח ביטחון.'],
      s: 'שו"ע יו"ד רסו ב–ג, ז–י; או"ח שלא א, ד–ו' },
    yt: { t: 'ברית ביום טוב', p: [
      'ברית ביום השמיני דוחה גם יום טוב, כמו שבת.',
      'מכשירי מילה שאפשר להכין מערב יום טוב לא דוחים יום טוב.',
      'ספק (נולד בין השמשות) לא נימול ביום טוב, ואפילו ביום טוב שני של גלויות.'],
      s: 'שו"ע יו"ד רסו ב, ו, ח' },
    yk: { t: 'ברית ביום כיפור', p: [
      'מלים בין שחרית למוסף, אחרי קריאת התורה, ואחר כך אומרים אשרי (ברמ"א: המנהג למול אחרי אשרי).',
      'הכוס: לשולחן ערוך מברכים בלי כוס. לרמ"א מברכים על הכוס ונותנים לתינוק הנימול, וכן נוהגים.',
      'הסעודה לא ביום הצום. יש שנוהגים לעשות את הברית סמוך יחסית לשקיעה, ואת סעודת המצווה בערב, אחרי הצום.'],
      s: 'שו"ע או"ח תרכא ב–ג; יו"ד רסה ד' },
    tb: { t: 'ברית בתשעה באב', p: [
      'מלים אחרי שגומרים את הקינות (יש שממתינים עד אחרי חצות). מברכים בלי בשמים.',
      'הכוס: אם היולדת נמצאת ושומעת את הברכה – היא שותה ממנו. אם לא – נותנים לתינוקות.',
      'בעלי הברית (אבי הבן, המוהל והסנדק) לובשים בגדי שבת אחרי הקינות, אבל לא בגדים לבנים ממש.',
      'הסעודה לא ביום הצום. יש שנוהגים לעשות את הברית סמוך יחסית לשקיעה, ואת סעודת המצווה בערב, אחרי הצום.'],
      s: 'שו"ע או"ח תקנט ז–ח; יו"ד רסה ד' },
    tbNidche: { t: 'תשעה באב שנדחה ליום ראשון', p: [
      'כשתשעה באב חל בשבת ונדחה ליום ראשון: בעל הברית מתפלל מנחה כשהיום עוד גדול, רוחץ ואוכל, ואינו משלים את התענית, כי זה יום טוב שלו.'],
      s: 'שו"ע או"ח תקנט ט' },
    tbShabbat: { t: 'ט׳ באב שחל בשבת', p: [
      'הצום נדחה ליום ראשון, והברית בשבת כמו בכל שבת.'],
      s: 'שו"ע או"ח תקנט א, ט' },
    fast: { t: 'ברית ביום צום', p: [
      'מתפללים סליחות ואומרים וידוי כרגיל, אבל לא אומרים "והוא רחום" ולא נופלים על פניהם.',
      'הכוס: בצומות שהיולדת לא מתענה, היא יכולה לשתות אם שמעה את הברכה. לרמ"א מברכים על הכוס ונותנים לתינוקות.',
      'הסעודה לא ביום הצום. יש שנוהגים לעשות את הברית סמוך יחסית לשקיעה, ואת סעודת המצווה בערב, אחרי הצום.'],
      s: 'שו"ע יו"ד רסה ד, יג' },
    chanuka: { t: 'ברית בחנוכה', p: [
      'אין שינוי בדיני הברית.',
      'על סעודות חנוכה כתב הרמ"א שיש בהן קצת מצווה, ובשירות ותשבחות הן סעודת מצווה. סעודת ברית בחנוכה – שמחה כפולה.'],
      s: 'רמ"א או"ח תרע ב' },
    purim: { t: 'ברית בפורים', p: [
      'כשיש מילה בפורים, מלים את התינוק לפני קריאת המגילה.',
      '"וששון" – זו מילה.'],
      s: 'רמ"א או"ח תרצג ד; מגילה טז ב' },
    shushan: { t: 'שושן פורים', p: [
      'בירושלים זה יום הפורים. בשאר הארץ יום רגיל.'],
      s: '' },
    bh: { t: 'נולד בין השמשות', p: [
      'ספק יום ספק לילה: מונים מהלילה, ונימול ביום התשיעי, שהוא ספק שמיני.',
      'אם זה יוצא בשבת או ביום טוב (גם יום טוב שני בחו"ל) – לא מלים, כי לא דוחים שבת מספק. לכן לפעמים נימול ביום העשירי או האחד עשר.',
      'בשיעור בין השמשות יש מחלוקת. לשאול את הרב.'],
      s: 'שו"ע יו"ד רסב ד; רסו ח–ט' },
    cs: { t: 'נולד בניתוח קיסרי', p: [
      'נימול ביום השמיני, אבל לא בשבת, לא ביום טוב ולא ביום כיפור. אם השמיני חל באחד מהם – ביום הראשון שאחריו שאינו שבת או חג.'],
      s: 'שו"ע יו"ד רסב ג; רסו י; או"ח שלא ה' },
    sick: { t: 'תינוק שאינו בריא', p: [
      'לא מלים עד שיבריא. בחולי של כל הגוף ממתינים שבעה ימים מעת לעת מההחלמה. ברית כזו לא נעשית בשבת וביום טוב.'],
      s: 'שו"ע יו"ד רסב ב; רסו ב' }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = { makeEngine: makeEngine, HAL: HAL }; return; }
  root.BM = { makeEngine: makeEngine, HAL: HAL };

  // ---------- הדף ----------
  var $ = function (id) { return document.getElementById(id); };
  var out = $('bm-out');
  if (!out) return;
  var CITIES = [['31.778,35.235', 'ירושלים'], ['32.08,34.78', 'תל אביב'], ['32.79,34.99', 'חיפה'], ['31.25,34.79', 'באר שבע'],
    ['32.965,35.496', 'צפת'], ['32.79,35.53', 'טבריה'], ['29.557,34.952', 'אילת'], ['31.53,35.1', 'חברון'], ['31.9,35.0', 'מודיעין'],
    ['32.09,34.88', 'פתח תקווה'], ['31.8,34.65', 'אשדוד'], ['32.33,34.86', 'נתניה'], ['31.7,35.12', 'גוש עציון'], ['32.3,35.2', 'שומרון'],
    ['31.35,34.3', 'עוטף עזה'], ['33.2,35.57', 'קריית שמונה'], ['31.68,34.57', 'אשקלון'], ['32.18,34.87', 'כפר סבא'], ['32.02,34.75', 'בת ים']];
  var KEY = 'kodesh-britot-meyuchadot';
  var st = { y: 0, il: 1, city: CITIES[0][0], f: { shabbat: 1, yt: 1, yk: 1, tb: 1, chanuka: 1, purim: 1, fast: 1 } };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ev(n, p) { if (window.kelimEv) window.kelimEv(n, p || {}); }
  var H, E;

  function loc() {
    var c = CITIES.filter(function (x) { return x[0] === st.city; })[0] || CITIES[0], ll = c[0].split(',').map(Number);
    return { name: c[1], l: new H.Location(ll[0], ll[1], true, 'Asia/Jerusalem', c[1], 'IL', undefined, 0) };
  }
  function hm(d) { return d && !isNaN(d) ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }) : ''; }
  function zm(d) { var z = new H.Zmanim(loc().l, d, false); return { sunset: z.sunset(), tzeit: z.tzeit(8.5) }; }

  function halBlock(tags, extra) {
    var h = '';
    tags.concat(extra || []).forEach(function (t) {
      var x = HAL[t]; if (!x) return;
      h += '<div class="bm-hal"><b>' + esc(x.t) + '</b><ul>' + x.p.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
        (x.s ? '<p class="bm-src">מקור: ' + esc(x.s) + '</p>' : '') + '</div>';
    });
    return h;
  }
  function tagsOf(inf) {
    var t = inf.tags.slice();
    if (inf.tb && inf.tbNidche) t.push('tbNidche');
    return t.filter(function (x) { return !(x === 'tb' && inf.tbShabbat); });
  }
  function want(inf) {
    return inf.tags.some(function (t) { return st.f[t === 'shushan' ? 'purim' : t === 'tbShabbat' ? 'tb' : t]; });
  }

  // ---------- הרשימה לשנה ----------
  function draw() {
    var hy = st.y, rows = E.year(hy, !!st.il).filter(function (r) { return want(r.eighth); });
    var L = loc(), cnt = {}, h = '';
    h += '<div class="bm-head"><span class="bsd">בס"ד</span><h2>לוח בריתות מיוחדות – שנת ' + esc(H.gematriya(hy % 1000)) + '</h2>' +
      '<p>מתי היום השמיני חל בשבת, ביום טוב, ביום כיפור, בתשעה באב, בחנוכה, בפורים או בצום · ' + (st.il ? 'ארץ ישראל' : 'חוץ לארץ (כולל יום טוב שני)') + ' · שקיעה ב' + esc(L.name) + '</p></div>';
    var month = '';
    rows.forEach(function (r) {
      var inf = r.eighth, hd = inf.hd, mname = hd.getMonthName();
      if (mname !== month) {
        if (month) h += '</tbody></table>';
        month = mname;
        h += '<h3 class="bm-m">' + esc(new H.HDate(1, hd.getMonth(), hd.getFullYear()).renderGematriya(true).split(' ').slice(1).join(' ')) + '</h3>' +
          '<table class="bm-t"><thead><tr><th>נולד</th><th>היום השמיני</th><th>מה מיוחד</th></tr></thead><tbody>';
      }
      inf.tags.forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; });
      var bornHd = new H.HDate(r.born), z = inf.blocked ? zm(inf.d) : null;
      var alt = r.alt ? '<div class="bm-alt">ניתוח קיסרי, או לידה בבין השמשות ב-' + E.gs(r.bornPrevEve) + ' בערב: הברית ' + esc(E.dayName(r.alt)) + ' ' + esc(E.hebStr(new H.HDate(r.alt))) + ' (' + E.gs(r.alt) + ')</div>' : '';
      h += '<tr class="' + (inf.blocked ? 'bl' : '') + '"><td><b>' + esc(E.dayName(r.born)) + ' ' + esc(E.hebStr(bornHd)) + '</b><small>' + E.gs(r.born) +
        ' לפני השקיעה, או ' + E.gs(r.bornPrevEve) + ' אחרי צאת הכוכבים</small></td><td><b>' + esc(E.dayName(inf.d)) + ' ' + esc(E.hebStr(hd)) + '</b><small>' + E.g(inf.d) +
        (z ? ' · שקיעה ' + hm(z.sunset) : '') + '</small></td><td>' + inf.names.map(function (n, i) { return '<span class="bm-tag t-' + esc(inf.tags[i] || '') + '">' + esc(n) + '</span>'; }).join(' ') + alt + '</td></tr>';
    });
    if (month) h += '</tbody></table>';
    if (!rows.length) h += '<p>לא נבחר שום סוג. סמנו למעלה מה להציג.</p>';
    h += '<div class="bm-rules"><h3 class="bm-m">ההלכות בקצרה</h3>' + halBlock(['shabbat', 'yt', 'yk', 'tb', 'tbNidche', 'fast', 'chanuka', 'purim', 'bh', 'cs', 'sick']) +
      '<p class="bm-ask">זה תקציר לעיון ולהכנה. בכל מקרה לשאול את הרב.</p></div>';
    h += '<p class="bm-foot">מתנה באהבה מגילעד רחמים, מוהל מוסמך · 058-404-9049 · hakelim.com/kodesh/britot-meyuchadot</p>';
    out.innerHTML = h;
    var parts = [];
    if (cnt.shabbat) parts.push(cnt.shabbat + ' בשבת');
    if (cnt.yt) parts.push(cnt.yt + ' ביום טוב');
    if (cnt.yk) parts.push('יום כיפור');
    if (cnt.tb || cnt.tbShabbat) parts.push('תשעה באב');
    if (cnt.chanuka) parts.push(cnt.chanuka + ' בחנוכה');
    if (cnt.purim || cnt.shushan) parts.push('פורים');
    if (cnt.fast) parts.push(cnt.fast + ' בצומות');
    $('bm-count').textContent = rows.length + ' ימי ברית מיוחדים' + (parts.length ? ': ' + parts.join(', ') : '');
  }

  // ---------- המחשבון ----------
  function calc() {
    var v = $('bm-birth').value, res = $('bm-res');
    if (!v) { res.hidden = true; return; }
    var p = v.split('-'), birth = new Date(+p[0], +p[1] - 1, +p[2], 12);
    var when = $('bm-when').value, note = '';
    if (when === 'time') {
      var t = $('bm-time').value;
      if (!t) { res.hidden = false; res.innerHTML = '<p>כתבו את שעת הלידה, או בחרו "לפני השקיעה" / "אחרי צאת הכוכבים".</p>'; return; }
      var tp = t.split(':'), z = zm(birth), bt = new Date(birth.getFullYear(), birth.getMonth(), birth.getDate(), +tp[0], +tp[1]);
      // השוואה בשעון ישראל: בונים את שעת הלידה כשעה מקומית בטלפון; מספיק לשימוש בארץ
      when = bt < z.sunset ? 'day' : bt >= z.tzeit ? 'night' : 'bh';
      note = '<p class="bm-when">ב' + esc(loc().name) + ' באותו יום: שקיעה ' + hm(z.sunset) + ', צאת הכוכבים ' + hm(z.tzeit) + '. הלידה ב-' + esc(t) + ' – ' +
        (when === 'day' ? 'לפני השקיעה.' : when === 'night' ? 'אחרי צאת הכוכבים, כלומר כבר היום העברי הבא.' : 'בין השקיעה לצאת הכוכבים: ספק.') + '</p>';
    }
    var cs = $('bm-cs').checked, r = E.compute(birth, when, cs, !!st.il), bi = r.britInfo, inf = r.info;
    var special = bi.special || r.moved || r.doubt || inf.special;
    var h = note;
    h += '<p class="bm-big">' + (special ? 'ברית מיוחדת' : 'ברית רגילה') + '</p>';
    h += '<p>נולד: ' + (r.doubt ? 'ספק ' + esc(E.hebStr(r.hebBirth)) + ' או ' + esc(E.hebStr(r.hebBirth2)) : esc(E.hebStr(r.hebBirth))) + '</p>';
    h += '<p>הברית: <b>' + esc(E.dayName(r.brit)) + ' ' + esc(E.hebFull(new H.HDate(r.brit))) + '</b> · ' + E.g(r.brit) +
      (r.dayNum !== 8 ? ' · <b>היום ה-' + r.dayNum + '</b>' : '') + '</p>';
    if (bi.names.length) h += '<p>' + bi.names.map(function (n, i) { return '<span class="bm-tag t-' + esc(bi.tags[i] || '') + '">' + esc(n) + '</span>'; }).join(' ') + '</p>';
    if (r.moved) h += '<p class="bm-why">היום השמיני (' + esc(E.dayName(r.eighth)) + ' ' + esc(E.hebStr(new H.HDate(r.eighth))) + ', ' + esc(inf.names.join(', ')) + ') ' +
      (r.doubt ? 'הוא ספק, וספק לא דוחה שבת ויום טוב.' : 'לא מתאים, כי ברית של ניתוח קיסרי לא דוחה שבת, יום טוב ויום כיפור.') + '</p>';
    if (bi.blocked && !r.moved) { var zz = zm(r.brit); h += '<p class="bm-why">שקיעה ב' + esc(loc().name) + ' ביום הברית: ' + hm(zz.sunset) + '. לעשות את הברית לפני כן, עם מרווח ביטחון.</p>'; }
    var extra = [];
    if (r.doubt) extra.push('bh');
    if (cs) extra.push('cs');
    h += halBlock(tagsOf(bi), extra);
    if (!special) h += '<p>היום השמיני לא חל בשבת, ביום טוב, בצום, בחנוכה או בפורים.</p>';
    h += '<p class="bm-ask">תינוק שאינו בריא – לפי הרופא והמוהל. בכל ספק לשאול את הרב.</p>';
    res.hidden = false;
    res.innerHTML = h;
    ev('bm_calc', { tool: 'britot_meyuchadot', special: special ? 1 : 0 });
  }

  function start() {
    H = window.hebcal; E = makeEngine(H);
    var nowY = new H.HDate(new Date()).getFullYear();
    if (!st.y || st.y < nowY - 1 || st.y > nowY + 3) st.y = nowY;
    var ys = $('bm-year');
    ys.innerHTML = [nowY - 1, nowY, nowY + 1, nowY + 2].map(function (y) { return '<option value="' + y + '">' + H.gematriya(y % 1000) + ' (' + new H.HDate(1, H.months.TISHREI, y).greg().getFullYear() + '–' + new H.HDate(29, H.months.ELUL, y).greg().getFullYear() + ')</option>'; }).join('');
    ys.value = st.y;
    var cs = $('bm-city'); cs.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join(''); cs.value = st.city;
    $('bm-il').value = st.il ? '1' : '0';
    document.querySelectorAll('[data-f]').forEach(function (b) { b.checked = !!st.f[b.getAttribute('data-f')]; });
    var b = $('bm-birth'); if (!b.value) { var t = new Date(); b.value = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2); }
    function upd() {
      st.y = +ys.value; st.city = cs.value; st.il = $('bm-il').value === '1' ? 1 : 0;
      document.querySelectorAll('[data-f]').forEach(function (x) { st.f[x.getAttribute('data-f')] = x.checked ? 1 : 0; });
      save(); draw(); calc();
    }
    $('bm-form').addEventListener('change', upd);
    $('bm-calc').addEventListener('input', calc);
    $('bm-calc').addEventListener('change', function () { $('bm-time-f').hidden = $('bm-when').value !== 'time'; calc(); });
    $('bm-print').addEventListener('click', function () { ev('bm_print', { tool: 'britot_meyuchadot' }); window.print(); });
    $('bm-time-f').hidden = $('bm-when').value !== 'time';
    draw(); calc();
  }
  function safeStart() { try { start(); } catch (e) { out.innerHTML = '<p class="disclaimer">משהו נתקע בחישוב. רעננו את הדף.</p>'; if (window.console) console.error(e); } }
  if (window.hebcal) safeStart(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', safeStart); }
})(typeof window !== 'undefined' ? window : this);
