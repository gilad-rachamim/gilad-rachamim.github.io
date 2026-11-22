// ממיר התאריכים בשפות אחרות (רוסית, אנגלית): /kodesh/taarich-ivri/ru/ ו-/kodesh/taarich-ivri/en/.
// החישוב כולו מ-assets/kodesh-ivri.js (core); כאן רק בניית התוצאה עם המילים מחבילת השפה (L.TI).
// הדף העברי לא משתמש בקובץ הזה, והפלט שלו לא משתנה.
// נטען בדפדפן לפני kodesh-ivri.js, וב-node מתוך המחוללים (tools/ivri_taarich_l.js).
(function (root) {
  'use strict';
  function TL(C, L) {
    var S = L.TI, HD = C.HD, ltr = C.ltr, tr = C.tr;
    function cap(s) { return L.cap(s); }
    function li(a) { return a.length ? '<ul>' + a.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' : ''; }
    function he(hd, noYear) { return '<span lang="he" dir="rtl">' + C.hebHe(hd, noYear) + '</span>'; }
    function where(t) { return t.tm ? S.at(ltr(t.tm), city(t.pl)) : ''; }
    function city(pl) { var c = S.CITY[pl.slug]; return c ? c[1] : S.here; }
    function shabbat(sat) { var x = C.day(sat); return x.parsha ? tr('שבת פרשת ') + x.parsha : S.shabbat + (x.ev.length ? ' (' + x.ev[0].short + ')' : ''); }
    function extra(hdate) {
      var a = C.dayLines(C.day(hdate)), p = C.parsha(C.nextSat(hdate));
      if (p && hdate.getDay() !== 6) a.push(tr('פרשת השבוע: ') + p);
      return a;
    }

    function todayHtml(t, stat) {
      var civ = t.civ, tom = t.hdDay.next(), h, hdate = C.hgreg(t.hd), a;
      if (stat) {
        h = '<p class="iv-k">' + S.kStat(C.wd(civ), C.greg(civ)) + '</p><p class="iv-big">' + C.heb(t.hdDay) + '</p><p class="iv-he">' + he(t.hdDay) + '</p>' +
          '<p class="iv-sub">' + S.subTom(where(t), C.heb(tom, true)) + '</p>';
        a = extra(civ);
      } else if (!t.after) {
        h = '<p class="iv-k">' + S.kToday(C.wd(civ), C.greg(civ)) + '</p><p class="iv-big">' + C.heb(t.hdDay) + '</p><p class="iv-he">' + he(t.hdDay) + '</p>' +
          '<p class="iv-sub">' + S.subTom(where(t), C.heb(tom, true)) + '</p>';
        a = extra(hdate);
        var nh = C.nextHolidayText(hdate); if (nh) a.push(nh);
      } else {
        h = '<p class="iv-k">' + S.kNow(where(t)) + '</p><p class="iv-big">' + C.heb(t.hd) + '</p><p class="iv-he">' + he(t.hd) + '</p>' +
          '<p class="iv-sub">' + S.subNow(C.wd(C.add(civ, 1)), C.wd(civ), ltr(C.dm(civ)), C.heb(t.hdDay, true)) + '</p>';
        a = extra(hdate);
        var nh2 = C.nextHolidayText(hdate); if (nh2) a.push(nh2);
      }
      return h + li(a);
    }
    function todayText(t, url) {
      var hdate = C.hgreg(t.hd), a = C.dayLines(C.day(hdate)), p = C.parsha(C.nextSat(hdate));
      return S.txtToday(t.after) + ': ' + C.heb(t.hd) + ' (' + C.hebHe(t.hd) + ')\n' + cap(C.wd(t.civ)) + ', ' + C.dmy(t.civ) +
        (a.length ? '\n' + a.join(' · ') : '') + (p && hdate.getDay() !== 6 ? '\n' + tr('פרשת השבוע: ') + p : '') + '\n\n' + S.txtUrl + ': ' + url;
    }
    function nextDaysHtml(civ, n, stat) {
      var map = C.evMap(civ, C.add(civ, n)), h = '<table class="iv-tbl"><thead><tr><th scope="col">' + S.thDay + '</th><th scope="col">' + S.thHeb + '</th></tr></thead><tbody>';
      for (var i = 0; i < n; i++) {
        var d = C.add(civ, i), x = C.day(d, map), lines = C.dayLines(x), w = C.wd(d);
        h += '<tr' + (i === 0 && !stat ? ' class="now"' : '') + '><th scope="row">' + (!stat && i === 0 ? S.todayP + w : !stat && i === 1 ? S.tomP + w : cap(w)) + '<small>' + ltr(C.dmy(d)) + '</small></th><td><b>' + C.heb(x.hd) + '</b>' +
          '<small>' + he(x.hd, true) + (lines.length ? ' · ' + lines.join(' · ') : '') + '</small></td></tr>';
      }
      return h + '</tbody></table>';
    }

    function g2hHtml(d, after) {
      if (!C.inRange(d)) return '<p class="iv-err">' + S.range(C.GY_MIN - 1, C.GY_MAX + 1) + '</p>';
      var hd = C.g2h(d, after), hdate = C.hgreg(hd);
      return '<p class="iv-k">' + cap(C.wd(d)) + ', ' + C.greg(d) + (after ? S.afterK : '') + '</p><p class="iv-big">' + C.heb(hd) + '</p><p class="iv-he">' + he(hd) + '</p>' +
        (after ? '<p class="iv-sub">' + S.afterNote(C.wd(hdate)) + '</p>' : '') + li(extra(hdate)) +
        (d.getFullYear() < 1583 ? '<p class="iv-sub">' + S.julian + '</p>' : '');
    }
    function g2hText(d, after) { var hd = C.g2h(d, after); return C.dmy(d) + (after ? ' (' + S.afterT + ')' : '') + ' = ' + C.heb(hd) + ' (' + C.hebHe(hd) + ')'; }
    function hcheck(hy, hm, hday) {
      if (isNaN(hy) || !(hy >= C.HY_MIN && hy <= C.HY_MAX)) return S.errYear(C.HY_MIN, C.HY_MAX);
      if (hm === 13 && !HD.isLeapYear(hy)) return S.errAdar2(hy);
      if (hday > HD.daysInMonth(hm, hy)) return S.err30(C.mon(hm, hy), hy);
      return '';
    }
    function h2gHtml(hy, hm, hday) {
      var err = hcheck(hy, hm, hday);
      if (err) return '<p class="iv-err">' + err + '</p>';
      var hd = new HD(hday, hm, hy), d = C.h2g(hy, hm, hday), e = C.add(d, -1);
      return '<p class="iv-k">' + C.heb(hd) + ' · ' + he(hd) + '</p><p class="iv-big">' + cap(C.wd(d)) + ', ' + C.greg(d) + '</p>' +
        li(C.dayLines(C.day(d))) + '<p class="iv-sub">' + S.eve(C.wd(e), ltr(C.dm(e))) + '</p>';
    }
    function h2gText(hy, hm, hday) { return hcheck(hy, hm, hday) ? '' : C.heb(new HD(hday, hm, hy)) + ' = ' + cap(C.wd(C.h2g(hy, hm, hday))) + ', ' + C.dmy(C.h2g(hy, hm, hday)); }

    function note(hb, r) {
      var bm = hb.getMonth(), by = hb.getFullYear(), leapB = HD.isLeapYear(by), leapR = HD.isLeapYear(r.getFullYear());
      if (hb.getDate() === 30 && r.getDate() === 1) return bm === 12 && leapB && !leapR ? S.n30adar : S.n30(C.mon(bm, by));
      if (bm === 12 && !leapB && leapR) return S.nAdarToLeap;
      if (bm === 12 && leapB && !leapR) return S.nAdar1;
      if (bm === 13 && !leapR) return S.nAdar2;
      return '';
    }
    function mz(d, after, girl) {
      var m = C.mitzva(d, after, girl);
      m.shabbat = shabbat(m.sat); m.note = note(m.hb, m.r);
      return m;
    }
    function bmHtml(d, after, girl, from, example) {
      if (!C.inRange(d) || new HD(d).getFullYear() + 14 > C.HY_MAX) return '<p class="iv-err">' + S.bmRange + '</p>';
      var m = mz(d, after, girl), eve = C.add(m.g, -1), list = C.birthdays(m.hb, from, 10);
      var h = (example ? '<p class="iv-ex">' + S.ex(girl, ltr(C.dmy(d))) + '</p>' : '') +
        '<div class="res"><h3>' + S.hBirth + '</h3><p class="iv-big">' + C.heb(m.hb) + '</p><p class="iv-he">' + he(m.hb) + '</p><p class="iv-sub">' + cap(C.wd(d)) + ', ' + C.greg(d) + (after ? S.afterBirth : '') + '</p></div>' +
        '<div class="res"><h3>' + S.what(girl) + '</h3><p class="iv-big">' + C.heb(m.r) + '</p><p class="iv-g">' + cap(C.wd(m.g)) + ', ' + C.greg(m.g) + '</p><ul>' +
        '<li>' + S.oblig(C.wd(eve), ltr(C.dm(eve))) + '</li>' +
        '<li>' + (m.g.getDay() === 6 ? S.satSame(m.shabbat) : S.satNext(m.shabbat, ltr(C.dmy(m.sat)))) + '</li>' +
        (m.note ? '<li>' + m.note + '</li>' : '') + '</ul></div>';
      if (list.length) {
        h += '<div class="res"><h3>' + S.hList + '</h3><table class="iv-tbl"><thead><tr><th scope="col">' + S.thAge + '</th><th scope="col">' + S.thG + '</th></tr></thead><tbody>' +
          list.map(function (b) {
            var n = note(m.hb, b.hd);
            return '<tr><th scope="row">' + b.age + '<small>' + C.heb(b.hd) + (n ? ' · ' + n : '') + '</small></th><td><b>' + ltr(C.dmy(b.g)) + '</b><small>' + cap(C.wd(b.g)) + '</small></td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      return h;
    }
    function bmText(d, after, girl) {
      var m = mz(d, after, girl);
      return S.hBirth + ': ' + C.heb(m.hb) + ' (' + C.hebHe(m.hb) + ')\n' + S.what(girl) + ': ' + C.heb(m.r) + ', ' + cap(C.wd(m.g)) + ' ' + C.dmy(m.g) + '\n' +
        (m.g.getDay() === 6 ? m.shabbat : S.satAfterT + ': ' + m.shabbat + ' (' + C.dmy(m.sat) + ')');
    }

    // יארצייט (יום השנה לפטירה): לפי התאריך העברי של הפטירה, בשנים הקרובות
    function yzHtml(d, after, from) {
      if (!C.inRange(d)) return '<p class="iv-err">' + S.range(C.GY_MIN - 1, C.GY_MAX + 1) + '</p>';
      var hd = C.g2h(d, after), out = [], hy = Math.max(new HD(from).getFullYear(), hd.getFullYear() + 1), fk = C.key(from), g = 0;
      while (out.length < 5 && g++ < 40) {
        var r = null; try { r = C.H.HebrewCalendar.getYahrzeit(hy, hd); } catch (e) {}
        if (r) { var gd = C.hgreg(r); if (C.key(gd) >= fk) out.push({ r: r, g: gd }); }
        hy++;
      }
      return '<div class="res"><h3>' + S.yzH + '</h3><p class="iv-big">' + C.heb(hd) + '</p><p class="iv-he">' + he(hd) + '</p><p class="iv-sub">' + cap(C.wd(d)) + ', ' + C.greg(d) + (after ? S.afterBirth : '') + '</p></div>' +
        (out.length ? '<div class="res"><h3>' + S.yzList + '</h3><table class="iv-tbl"><thead><tr><th scope="col">' + S.thHeb + '</th><th scope="col">' + S.thG + '</th></tr></thead><tbody>' +
          out.map(function (o) { var e = C.add(o.g, -1); return '<tr><th scope="row">' + C.heb(o.r) + '<small>' + S.yzEve(C.wd(e), ltr(C.dm(e))) + '</small></th><td><b>' + ltr(C.dmy(o.g)) + '</b><small>' + cap(C.wd(o.g)) + '</small></td></tr>'; }).join('') +
          '</tbody></table></div>' : '');
    }
    function yzText(d, after, from) {
      var hd = C.g2h(d, after), r = null, hy = Math.max(new HD(from).getFullYear(), hd.getFullYear() + 1), fk = C.key(from), g = 0;
      while (g++ < 5) { try { r = C.H.HebrewCalendar.getYahrzeit(hy, hd); } catch (e) { r = null; } if (r && C.key(C.hgreg(r)) >= fk) break; r = null; hy++; }
      return S.yzH + ': ' + C.heb(hd) + ' (' + C.hebHe(hd) + ')' + (r ? '\n' + S.yzNext + ': ' + C.heb(r) + ', ' + cap(C.wd(C.hgreg(r))) + ' ' + C.dmy(C.hgreg(r)) : '');
    }

    return { todayHtml: todayHtml, todayText: todayText, nextDaysHtml: nextDaysHtml, g2hHtml: g2hHtml, g2hText: g2hText, h2gHtml: h2gHtml, h2gText: h2gText,
      bmHtml: bmHtml, bmText: bmText, yzHtml: yzHtml, yzText: yzText, hcheck: hcheck, M: S.M, CITY: S.CITY };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = TL; else root.KODESH_TL = TL;
})(this);
