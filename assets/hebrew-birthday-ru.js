/* Калькулятор еврейского дня рождения (/kodesh/taarich-ivri/ru/den-rozhdeniya/).
   Uses the site's hebcal bundle (window.hebcal): HDate + HebrewCalendar.getBirthdayOrAnniversary,
   which applies the usual rules for Adar in leap years and 30 Cheshvan / 30 Kislev.
   Everything runs in the browser; the birth date is kept only in this browser (localStorage). */
(function () {
  var box = document.getElementById('hb-calc'); if (!box) return;
  var H, KEY = 'kelim_hb_ru', used = false, txt = '', ics = '';
  var DOW = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var MONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  // values are hebcal's month names; labels are Russian
  var HM = ['Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shvat', 'Adar', 'Adar I', 'Adar II', 'Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul'];
  var RU = { 'Tishrei': 'Тишрей', 'Cheshvan': 'Хешван', 'Kislev': 'Кислев', 'Tevet': 'Тевет', 'Sh\'vat': 'Шват', 'Shvat': 'Шват',
    'Adar': 'Адар', 'Adar I': 'Адар I', 'Adar II': 'Адар II', 'Nisan': 'Нисан', 'Iyyar': 'Ияр', 'Sivan': 'Сиван', 'Tamuz': 'Тамуз', 'Av': 'Ав', 'Elul': 'Элул' };
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function noon(y, m, d) { return new Date(y, m, d, 12); }
  function clean(d) { return noon(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fromKey(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return null; var d = noon(+m[1], +m[2] - 1, +m[3]); return isNaN(d) || d.getFullYear() < 1300 ? null : d; }
  function add(d, n) { return noon(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function days(a, b) { return Math.round((clean(b) - clean(a)) / 864e5); }
  function mRu(m) { return RU[m] || m; }
  function gS(d) { return d.getDate() + ' ' + MONG[d.getMonth()] + ' ' + d.getFullYear(); }
  function gL(d) { return DOW[d.getDay()] + ', ' + gS(d); }
  function hS(hd) { return hd.getDate() + ' ' + mRu(hd.getMonthName()) + ' ' + hd.getFullYear(); }
  function hHe(hd) { try { return hd.renderGematriya().replace(/[֑-ׇ]/g, ''); } catch (e) { return ''; } }
  function greg(hd) { return clean(hd.greg()); }
  function dn(n) { var a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? 'день' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'дня' : 'дней'); }
  function bday(hb, hy) { if (hy <= hb.getFullYear()) return null; try { return H.HebrewCalendar.getBirthdayOrAnniversary(hy, hb) || null; } catch (e) { return null; } }
  function list(hb, today, n) {
    var out = [], hy = new H.HDate(today).getFullYear() - 1, guard = 0;
    while (out.length < n && guard++ < n + 5) {
      hy++; var b = bday(hb, hy); if (!b) continue; var g = greg(b);
      if (days(today, g) < 0) continue;
      out.push({ hd: b, g: g, age: hy - hb.getFullYear() });
    }
    return out;
  }
  function when(n) { return n === 0 ? 'сегодня' : n === 1 ? 'завтра' : 'через ' + dn(n); }
  function ymd(d) { return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function mkIcs(rows, label) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//Hebrew birthday//RU', 'CALSCALE:GREGORIAN'];
    rows.forEach(function (r, i) {
      L.push('BEGIN:VEVENT', 'UID:hbru-' + ymd(r.g) + '-' + i + '@hakelim.com', 'DTSTAMP:' + ymd(new Date()) + 'T000000Z',
        'DTSTART;VALUE=DATE:' + ymd(r.g), 'DTEND;VALUE=DATE:' + ymd(add(r.g, 1)),
        'SUMMARY:' + label + (r.age ? ' (' + r.age + ')' : '') + ' - ' + hS(r.hd),
        'DESCRIPTION:Еврейский день рождения ' + hS(r.hd) + '. Начинается накануне вечером\\, с заходом солнца. hakelim.com/kodesh/taarich-ivri/ru/den-rozhdeniya/',
        'END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.join('\r\n');
  }
  function table(rows, noAge) {
    return '<table class="iv-tbl"><thead><tr>' + (noAge ? '' : '<th scope="col">Возраст</th>') + '<th scope="col">Еврейская дата</th><th scope="col">Обычная дата</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + (noAge ? '' : '<th scope="row">' + r.age + '</th>') + '<td>' + esc(hS(r.hd)) + '</td><td><b>' + gS(r.g) + '</b><small>' + DOW[r.g.getDay()] + '</small></td></tr>'; }).join('') +
      '</tbody></table>';
  }
  function setIcs(rows, label, file) {
    ics = mkIcs(rows, label); var a = $('hb-ics');
    try { a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = file; a.hidden = false; } catch (e) { a.hidden = true; }
  }
  function share(t) { txt = t; $('hb-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t + '\n\nБесплатный калькулятор: https://hakelim.com/kodesh/taarich-ivri/ru/den-rozhdeniya/'); }
  function mark(how) { if (!used && window.toolUsed) { used = true; try { toolUsed('hebrew_birthday_ru', { how: how }); } catch (x) {} } }

  function drawBirth(user) {
    var d = fromKey($('hb-date').value), after = $('hb-after').checked, out = $('hb-res'), today = clean(new Date());
    if (!d) { out.innerHTML = user ? '<p class="iv-err">Выберите дату рождения.</p>' : out.innerHTML; return; }
    var hb = new H.HDate(after ? add(d, 1) : d), rows = list(hb, today, 30), next = rows[0];
    var h = '<div class="res"><h3>Ваша еврейская дата рождения</h3><p class="iv-big">' + esc(hS(hb)) + '</p>' +
      '<p class="iv-he"><span lang="he" dir="rtl">' + esc(hHe(hb)) + '</span></p>' +
      '<p class="iv-sub">Родились: ' + gL(d) + (after ? ', после захода солнца' : '') + '</p></div>';
    if (next) {
      var n = days(today, next.g);
      h += '<div class="res"><h3>Ближайший еврейский день рождения</h3><p class="iv-big">' + (n === 0 ? 'Сегодня! ' : '') + gL(next.g) + '</p>' +
        '<p class="iv-g">' + esc(hS(next.hd)) + (next.age ? ' · исполнится ' + next.age : '') + ' · ' + when(n) + '</p>' +
        '<ul><li>Начинается накануне вечером, с заходом солнца: ' + DOW[add(next.g, -1).getDay()] + ', ' + gS(add(next.g, -1)) + '.</li>' +
        (hb.getMonthName() !== next.hd.getMonthName() ? '<li>В этом году дата переходит на ' + esc(next.hd.getDate() + ' ' + mRu(next.hd.getMonthName())) + ' (см. «Адар и 30-е число» ниже).</li>' : '') +
        '</ul></div>';
      h += '<div class="res"><h3>Еврейские дни рождения на 30 лет вперёд</h3>' + table(rows) + '</div>';
      setIcs(rows, 'Еврейский день рождения', 'evreyskiy-den-rozhdeniya-' + ymd(d) + '.ics');
      share('Моя еврейская дата рождения: ' + hS(hb) + ' (' + hHe(hb) + ').\nБлижайший еврейский день рождения: ' + gL(next.g) + (next.age ? ', исполнится ' + next.age : '') + '.');
    }
    out.innerHTML = h;
    if (user) { mark('birth'); try { localStorage.setItem(KEY, JSON.stringify({ d: $('hb-date').value, a: after ? 1 : 0 })); } catch (x) {} }
  }

  function fillDays() {
    var m = $('hb-hm').value, sel = $('hb-hd'), cur = sel.value || '1',
      max = /^(Tishrei|Cheshvan|Kislev|Shvat|Adar I|Nisan|Sivan|Av)$/.test(m) ? 30 : 29;
    sel.innerHTML = ''; for (var i = 1; i <= max; i++) { var o = document.createElement('option'); o.value = o.textContent = i; sel.appendChild(o); }
    sel.value = Math.min(+cur, max);
  }
  function refDate(day, mon) {
    for (var y = 5700; y < 5786; y++) {
      var leap = H.HDate.isLeapYear(y);
      if ((mon === 'Adar I' || mon === 'Adar II') && !leap) continue;
      if (mon === 'Adar' && leap) continue;
      try { var hd = new H.HDate(day, mon, y); if (hd.getDate() === day) return hd; } catch (e) {}
    }
    return null;
  }
  function drawHeb(user) {
    var day = +$('hb-hd').value, mon = $('hb-hm').value, out = $('hb-res2'), today = clean(new Date());
    var ref = refDate(day, mon);
    if (!ref) { out.innerHTML = '<p class="iv-err">Такой даты нет в еврейском календаре.</p>'; return; }
    var rows = list(ref, today, 15).map(function (r) { return { hd: r.hd, g: r.g, age: 0 }; }), next = rows[0];
    var h = '<div class="res"><h3>' + esc(day + ' ' + mRu(mon)) + ' – ближайшие годы</h3>';
    if (next) {
      var n = days(today, next.g);
      h += '<p class="iv-big">' + gL(next.g) + '</p><p class="iv-g">' + esc(hS(next.hd)) + ' · ' + when(n) + ' · начинается накануне вечером</p>' + table(rows, true);
      setIcs(rows, 'Еврейский день рождения', 'evreyskiy-den-rozhdeniya-' + mon.replace(/\s/g, '') + '-' + day + '.ics');
      share('Еврейский день рождения ' + day + ' ' + mRu(mon) + ': ближайший – ' + gL(next.g) + '.');
    }
    out.innerHTML = h + '</div>';
    if (user) mark('hebrew');
  }

  function start() {
    H = window.hebcal; if (!H) return;
    var hm = $('hb-hm'); HM.forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = mRu(m); hm.appendChild(o); });
    var t = new H.HDate(clean(new Date())), tm = t.getMonthName().replace("Sh'vat", 'Shvat');
    hm.value = HM.indexOf(tm) >= 0 ? tm : 'Tishrei'; fillDays(); $('hb-hd').value = t.getDate();
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.d) { $('hb-date').value = s.d; $('hb-after').checked = !!s.a; } } catch (x) {}
    ['input', 'change'].forEach(function (ev) { $('hb-date').addEventListener(ev, function () { drawBirth(true); }); });
    $('hb-after').addEventListener('change', function () { drawBirth(true); });
    hm.addEventListener('change', function () { fillDays(); drawHeb(true); });
    $('hb-hd').addEventListener('change', function () { drawHeb(true); });
    [].forEach.call(document.querySelectorAll('[data-hbmode]'), function (b) {
      b.addEventListener('click', function () {
        var m = b.getAttribute('data-hbmode');
        [].forEach.call(document.querySelectorAll('[data-hbmode]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('hb-m1').hidden = m !== 'birth'; $('hb-m2').hidden = m !== 'hebrew';
        if (m === 'birth') drawBirth(false); else drawHeb(false);
      });
    });
    $('hb-copy').addEventListener('click', function () { if (!txt) return; try { navigator.clipboard.writeText(txt); $('hb-copy').textContent = 'Скопировано'; setTimeout(function () { $('hb-copy').textContent = 'Копировать'; }, 1500); } catch (x) {} });
    if (fromKey($('hb-date').value)) drawBirth(false);
  }
  if (window.hebcal) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
})();
