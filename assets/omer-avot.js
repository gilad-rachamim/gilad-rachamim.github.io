/* פרקי אבות לספירת העומר: 49 ימים, היום של היום, עיצובים, וקובץ יומן עם תזכורות. בלי שרת. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = $('oa'); if (!root) return;
  var DATA = null, START = null; // START = התאריך (ביום) של ט"ז בניסן
  var SEF = ['חסד', 'גבורה', 'תפארת', 'נצח', 'הוד', 'יסוד', 'מלכות'];
  var CH = ['פרק ראשון', 'פרק שני', 'פרק שלישי', 'פרק רביעי', 'פרק חמישי', 'פרק שישי', 'דרך ארץ זוטא, פרק א'];
  var WK = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'];
  var NUM = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ', 'כא', 'כב', 'כג'];
  var store = { get: function (k) { try { return localStorage.getItem('oa-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('oa-' + k, v); } catch (e) {} } };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); return x; }
  function dayOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }

  // ---------- לוח עברי (בעזרת Intl של הדפדפן) ----------
  var fEn = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' });
  var fHe = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long' });
  var fG = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  function hp(d) { var o = {}; fEn.formatToParts(d).forEach(function (p) { o[p.type] = p.value; }); return o; }
  function nisan16(y) {
    for (var d = new Date(y, 2, 10, 12); d.getMonth() < 5; d = addDays(d, 1)) { var p = hp(d); if (/^Nisan/.test(p.month) && +p.day === 16) return d; }
    return null;
  }
  function pickStart(now) {
    var s = nisan16(now.getFullYear());
    if (s && dayOnly(now) > addDays(s, 48)) s = nisan16(now.getFullYear() + 1);
    return s;
  }

  // ---------- נוסח הספירה (מנהג ספרד: "לעמר") ----------
  var U = ['', 'אחד', 'שנים', 'שלשה', 'ארבעה', 'חמשה', 'ששה', 'שבעה', 'שמונה', 'תשעה', 'עשרה'];
  function daysWords(n) {
    if (n === 1) return 'יום אחד';
    if (n === 2) return 'שני ימים';
    if (n <= 10) return U[n] + ' ימים';
    if (n < 20) return U[n - 10] + ' עשר יום';
    var t = ['', '', 'עשרים', 'שלשים', 'ארבעים'][Math.floor(n / 10)], u = n % 10;
    return (u ? U[u] + ' ו' : '') + t + ' יום';
  }
  function weeksWords(w) { return w === 1 ? 'שבוע אחד' : (w === 2 ? 'שני שבועות' : U[w] + ' שבועות'); }
  function restWords(r) { return r === 1 ? 'יום אחד' : (r === 2 ? 'שני ימים' : U[r] + ' ימים'); }
  function omerText(n) {
    var s = 'היום ' + daysWords(n);
    if (n >= 7) { var w = Math.floor(n / 7), r = n % 7; s += ', שהם ' + weeksWords(w) + (r ? ' ו' + restWords(r) : ''); }
    return s + ', לעמר.';
  }
  function sefira(n) { return SEF[(n - 1) % 7] + ' שב' + SEF[Math.floor((n - 1) / 7)]; }
  function dayDate(n) { return START ? addDays(START, n - 1) : null; }
  var GEM = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'י"א', 'י"ב', 'י"ג', 'י"ד', 'ט"ו', 'ט"ז', 'י"ז', 'י"ח', 'י"ט', 'כ', 'כ"א', 'כ"ב', 'כ"ג', 'כ"ד', 'כ"ה', 'כ"ו', 'כ"ז', 'כ"ח', 'כ"ט', 'ל'];
  var HM = { Nisan: 'ניסן', Iyar: 'אייר', Sivan: 'סיון' };
  function hebLabel(n) {
    var d = dayDate(n); if (!d) return '';
    var p = hp(d), m = HM[p.month], g = GEM[+p.day];
    if (!m) return fHe.format(d);
    return (g.length === 1 ? g + "'" : g) + ' ' + m;
  }

  // ---------- תצוגה ----------
  function srcLine(o) {
    var lab = o.c === 7 ? 'הלכות' : 'משניות';
    return CH[o.c - 1] + ', ' + (o.f === o.t ? (o.c === 7 ? 'הלכה ' : 'משנה ') + NUM[o.f] : lab + ' ' + NUM[o.f] + '–' + NUM[o.t]);
  }
  function bodyHtml(n, countLabel) {
    var o = DATA[n - 1], h = '';
    h += '<div class="oa-count"><span class="lbl">' + esc(countLabel || 'ספירת העומר') + '</span><span class="txt">' + esc(omerText(n)) + '</span></div>';
    if (n === 43) h += '<p class="oa-pre">השבוע השביעי: ממשיכים אחרי "כל מה שברא", עם מסכת דרך ארץ זוטא.</p>';
    h += '<p class="oa-src">' + esc(srcLine(o)) + '</p>';
    o.x.forEach(function (t, i) { h += '<p class="oa-m"><span class="n">(' + NUM[o.f + i] + ')</span>' + esc(t) + '</p>'; });
    var p = esc(o.p).replace('נקודה ליום:', '<b>נקודה ליום:</b>');
    h += '<div class="oa-p"><b>פירוש קליל:</b> ' + p + '</div>';
    return h;
  }
  function headHtml(n) {
    var d = dayDate(n);
    return '<div class="oa-dh"><b>יום ' + n + ' לעומר</b><span>' + esc(hebLabel(n)) + (d ? ' · ' + esc(fG.format(d)) : '') + '</span><span>' + esc(sefira(n)) + '</span></div>';
  }
  var shown = 1;
  // מה כבר נלמד (לפי יום העומר), נשמר בטלפון. הרצף והיעד השבועי: assets/hitkadmut.js
  function doneSet() { try { return JSON.parse(store.get('done') || '{}') || {}; } catch (e) { return {}; } }
  function didBtn(n) { var ok = doneSet()[n]; return '<div class="oa-did"><button type="button" class="btn ' + (ok ? 'btn-line' : 'btn-gold') + ' btn-sm" id="oa-did">' + (ok ? '✓ למדתם את יום ' + n : 'למדתי את יום ' + n + ' ✓') + '</button></div>'; }
  function renderToday(n, label, intro) {
    shown = n;
    var h = (intro ? '<div class="oa-body" style="padding-bottom:0"><p class="oa-pre">' + intro + '</p></div>' : '') + headHtml(n) + '<div class="oa-body">' + bodyHtml(n, label) + didBtn(n) + '</div>' +
      '<div class="oa-nav"><button type="button" id="oa-prev"' + (n <= 1 ? ' style="visibility:hidden"' : '') + '>→ יום ' + (n - 1) + '</button><button type="button" id="oa-next"' + (n >= 49 ? ' style="visibility:hidden"' : '') + '>יום ' + (n + 1) + ' ←</button></div>';
    $('oa-today').innerHTML = h;
    $('oa-prev').onclick = function () { if (shown > 1) renderToday(shown - 1); };
    $('oa-next').onclick = function () { if (shown < 49) renderToday(shown + 1); };
    $('oa-did').onclick = function () {
      var d = doneSet(); if (d[n]) return;
      d[n] = 1; store.set('done', JSON.stringify(d)); renderToday(n, label, intro);
      if (window.toolUsed) window.toolUsed('omer-avot', { how: 'did', day: n });
      var s = $('day-' + n); if (s) { var sm = s.querySelector('summary'); if (sm && !sm.querySelector('.oa-ok')) sm.insertAdjacentHTML('beforeend', '<span class="oa-ok">✓ נלמד</span>'); }
      if (window.HK) HK.done('omer', { el: $('oa-hk'), title: 'למדתם את יום ' + n + ' ✓', help: 'הכלי הזה בחינם ובלי פרסומות', share: 'למדתי היום פרקי אבות לספירת העומר: קטע קצר בכל יום, עם פירוש קליל. מצטרפים? בחינם:' });
    };
  }
  function renderAll(todayN) {
    var h = '';
    for (var n = 1; n <= 49; n++) {
      if ((n - 1) % 7 === 0) h += '<h2 class="oa-wk">שבוע ' + WK[(n - 1) / 7] + "' · " + CH[(n - 1) / 7] + '</h2>';
      h += '<details class="oa-day' + (n === todayN ? ' is-today' : '') + '" id="day-' + n + '"><summary>' + headHtml(n) + (doneSet()[n] ? '<span class="oa-ok">✓ נלמד</span>' : '') + '</summary><div class="oa-body">' + bodyHtml(n) + '</div></details>';
    }
    $('oa-all').innerHTML = h;
  }
  function decideToday() {
    var now = new Date(), today = dayOnly(now), evening = now.getHours() >= 20;
    var idx = Math.round((today - START) / 864e5) + 1; // יום העומר של היום (ביום)
    var hash = /^#day-(\d+)$/.exec(location.hash), hn = hash ? +hash[1] : 0;
    if (hn >= 1 && hn <= 49) { renderToday(hn); return idx; }
    if (idx >= 1 && idx <= 49) {
      if (evening && idx < 49) renderToday(idx + 1, 'הלילה סופרים');
      else renderToday(idx, 'הספירה של היום');
      return idx;
    }
    var nightBefore = addDays(START, -1), left = Math.round((dayOnly(nightBefore) - today) / 864e5);
    renderToday(1, 'בליל הספירה הראשון סופרים', 'ספירת העומר מתחילה ' + (left <= 0 ? 'הלילה' : 'בעוד ' + left + ' ימים') + ', במוצאי היום הראשון של פסח (' + esc(fG.format(nightBefore)) + '). כך ייראה היום הראשון:');
    return 0;
  }

  // ---------- הגדרות תצוגה ----------
  function setTheme(t) {
    root.setAttribute('data-theme', t); store.set('theme', t);
    [].forEach.call(document.querySelectorAll('.oa-themes button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === t)); });
  }
  [].forEach.call(document.querySelectorAll('.oa-themes button'), function (b) { b.onclick = function () { setTheme(b.getAttribute('data-t')); }; });
  var fs = parseFloat(store.get('fs')) || 1.25;
  function setFs(v) { fs = Math.max(1, Math.min(2, v)); root.style.setProperty('--fs', fs + 'rem'); store.set('fs', fs); }
  $('oa-fs').onclick = function () { setFs(fs + 0.125); };
  $('oa-fs-').onclick = function () { setFs(fs - 0.125); };
  $('oa-pr').onchange = function () { root.classList.toggle('nopr', !this.checked); store.set('pr', this.checked ? '1' : '0'); };
  var qt = /[?&]theme=(gold|night|parch|clean)\b/.exec(location.search);
  setTheme(qt ? qt[1] : (store.get('theme') || 'gold')); setFs(fs);
  if (store.get('pr') === '0') { $('oa-pr').checked = false; root.classList.add('nopr'); }
  ['ts', 'tl', 'what'].forEach(function (k) { var v = store.get(k); if (v) $('oa-' + k).value = v; $('oa-' + k).onchange = function () { store.set(k, this.value); }; });

  // ---------- קובץ יומן (ics) ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d, hm) { var t = hm.split(':'); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(+t[0]) + pad(+t[1]) + '00'; }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n'); }
  function fold(line) { var out = [], s = line; while (s.length > 30) { out.push(s.slice(0, 30)); s = " " + s.slice(30); } out.push(s); return out.join('\r\n'); }
  function isYomTovDay(d) { var p = hp(d); return /^Nisan/.test(p.month) && +p.day === 21; }
  function isRestDay(d) { return d.getDay() === 6 || isYomTovDay(d); }
  function buildIcs() {
    var ts = $('oa-ts').value || '20:15', tl = $('oa-tl').value || '08:00', what = $('oa-what').value, noShabat = $('oa-shabat').checked;
    var url = location.origin + '/kodesh/omer-avot/';
    var now = new Date(), dst = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kodesh//omer-avot//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:ספירת העומר ופרקי אבות', 'X-WR-TIMEZONE:Asia/Jerusalem'];
    function ev(id, d, hm, title, desc) {
      var t = hm.split(':'), end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +t[0], +t[1] + 15);
      L.push('BEGIN:VEVENT', 'UID:oa-' + id + '-' + START.getFullYear() + '@kodesh', 'DTSTAMP:' + dst, 'DTSTART:' + stamp(d, hm),
        'DTEND:' + stamp(end, pad(end.getHours()) + ':' + pad(end.getMinutes())), fold('SUMMARY:' + icsEsc(title)), fold('DESCRIPTION:' + icsEsc(desc)),
        'URL:' + url + '#day-' + id.replace(/\D/g, ''), 'BEGIN:VALARM', 'ACTION:DISPLAY', fold('DESCRIPTION:' + icsEsc(title)), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    }
    for (var n = 1; n <= 49; n++) {
      var o = DATA[n - 1], day = dayDate(n), night = addDays(day, -1);
      if (what !== 'limud') {
        // ליל שבת או ליל יום טוב: התזכורת עוברת לצהריים שלפני
        var restNight = night.getDay() === 5 || isYomTovDay(day);
        var early = noShabat && restNight;
        ev('s' + n, night, early ? '13:00' : ts, (early ? 'הלילה סופרים: ' : 'ספירת העומר: ') + 'יום ' + n,
          omerText(n) + '\n' + sefira(n) + (early ? '\n(תזכורת מוקדמת: הלילה ליל שבת או יום טוב)' : '') + '\n' + url + '#day-' + n);
      }
      if (what !== 'sefira') {
        var ld = day, pre = '';
        if (noShabat && isRestDay(day)) { ld = addDays(day, -1); pre = 'של מחר (שבת/יום טוב): '; if (isRestDay(ld)) ld = addDays(ld, -1); }
        var txt = o.x.join('\n\n');
        ev('l' + n, ld, tl, 'פרקי אבות ' + pre + 'יום ' + n + ' לעומר', srcLine(o) + '\n\n' + txt + '\n\nפירוש קליל: ' + o.p + '\n\n' + url + '#day-' + n);
      }
    }
    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }
  $('oa-ics').onclick = function () {
    if (!DATA || !START) return;
    var blob = new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'omer-avot-' + START.getFullYear() + '.ics';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    $('oa-rem-note').innerHTML = '<b>הקובץ ירד.</b> פותחים אותו מההורדות ובוחרים "יומן Google" או "לוח שנה", ומאשרים "הוספה". כל 49 הימים נכנסים בבת אחת.';
    if (window.gtag) window.gtag('event', 'omer_avot_ics', { what: $('oa-what').value });
  };
  $('oa-wa').href = 'https://wa.me/?text=' + encodeURIComponent('פרקי אבות לספירת העומר: קטע קצר בכל יום, עם פירוש קליל ותזכורת בטלפון לספור ולומר את המשניות 👇\n' + location.origin + '/kodesh/omer-avot/');

  // ---------- טעינה ----------
  START = pickStart(new Date());
  fetch('/assets/omer-avot.json').then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    var t = decideToday(); renderAll(t);
    var m = /^#day-(\d+)$/.exec(location.hash); if (m && $('day-' + m[1])) $('day-' + m[1]).open = true;
  }).catch(function () { $('oa-today').innerHTML = '<p class="oa-loading">לא הצלחתי לטעון את הנתונים. כדאי לרענן את הדף.</p>'; });
})();
