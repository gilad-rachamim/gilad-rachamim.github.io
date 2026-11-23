/* Калькулятор йорцайта на русском (/kodesh/yahrzeit/ru/).
   Same engine as /kodesh/yahrzeit/en/: the site's hebcal bundle (window.hebcal), HDate + HebrewCalendar.getYahrzeit.
   Everything runs in the browser; names and dates stay on this device (localStorage). */
(function () {
  var box = document.getElementById('yz-calc'); if (!box) return;
  var H, KEY = 'kelim_yz_ru', LIST = 'kelim_yz_ru_list', used = false, txt = '', cur = null;
  var DOW = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var DOWV = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
  var MONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var HM = ['Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shvat', 'Adar', 'Adar I', 'Adar II', 'Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul'];
  var RU = { 'Tishrei': 'Тишрей', 'Cheshvan': 'Хешван', 'Kislev': 'Кислев', 'Tevet': 'Тевет', 'Sh\'vat': 'Шват', 'Shvat': 'Шват',
    'Adar': 'Адар', 'Adar I': 'Адар I', 'Adar II': 'Адар II', 'Nisan': 'Нисан', 'Iyyar': 'Ияр', 'Sivan': 'Сиван', 'Tamuz': 'Тамуз', 'Av': 'Ав', 'Elul': 'Элул' };
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mRu(m) { return RU[m] || m; }
  function mStd(m) { return m === 'Sh\'vat' ? 'Shvat' : m; }
  function noon(y, m, d) { return new Date(y, m, d, 12); }
  function clean(d) { return noon(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fromKey(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return null; var d = noon(+m[1], +m[2] - 1, +m[3]); return isNaN(d) || d.getFullYear() < 1300 ? null : d; }
  function add(d, n) { return noon(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function days(a, b) { return Math.round((clean(b) - clean(a)) / 864e5); }
  function gS(d) { return d.getDate() + ' ' + MONG[d.getMonth()] + ' ' + d.getFullYear(); }
  function gL(d) { return DOW[d.getDay()] + ', ' + gS(d); }
  function hS(hd) { return hd.getDate() + ' ' + mRu(hd.getMonthName()) + ' ' + hd.getFullYear(); }
  function hDM(hd) { return hd.getDate() + ' ' + mRu(hd.getMonthName()); }
  function hHe(hd) { try { return hd.renderGematriya().replace(/[֑-ׇ]/g, ''); } catch (e) { return ''; } }
  function dn(n) { var a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? 'день' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'дня' : 'дней'); }
  function yz(death, hy) { if (hy <= death.getFullYear()) return null; try { var r = H.HebrewCalendar.getYahrzeit(hy, death); return r ? new H.HDate(r) : null; } catch (e) { return null; } }
  function list(death, today, n) {
    var out = [], hy = new H.HDate(today).getFullYear() - 1, guard = 0;
    while (out.length < n && guard++ < n + 6) {
      hy++; var y = yz(death, hy); if (!y) continue; var g = clean(y.greg());
      if (days(today, g) < 0) continue;
      out.push({ hd: y, g: g, num: hy - death.getFullYear() });
    }
    return out;
  }
  function when(n) { return n === 0 ? 'сегодня' : n === 1 ? 'завтра' : 'через ' + dn(n); }
  function shabbatBefore(g) { return add(g, -(g.getDay() + 1)); }
  function ymd(d) { return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function icsText(events) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//Yahrzeit//RU', 'CALSCALE:GREGORIAN'];
    events.forEach(function (e, i) {
      var ev = add(e.g, -1);
      L.push('BEGIN:VEVENT', 'UID:yz-ru-' + ymd(e.g) + '-' + i + '@hakelim.com', 'DTSTAMP:' + ymd(new Date()) + 'T000000Z',
        'DTSTART;VALUE=DATE:' + ymd(e.g), 'DTEND;VALUE=DATE:' + ymd(add(e.g, 1)),
        'SUMMARY:Йорцайт' + (e.name ? ' – ' + e.name.replace(/[,;\\\r\n]/g, ' ') : '') + ' – ' + hS(e.hd),
        'DESCRIPTION:Поминальную свечу зажигают накануне вечером (' + gS(ev) + ')' + (ev.getDay() === 6 ? ' после исхода субботы.' : ' до захода солнца.') + ' hakelim.com/kodesh/yahrzeit/ru/',
        'END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.join('\r\n');
  }
  function setIcs(id, events, file) {
    var a = $(id); if (!a) return;
    try { a.href = URL.createObjectURL(new Blob([icsText(events)], { type: 'text/calendar' })); a.download = file; a.hidden = !events.length; } catch (e) { a.hidden = true; }
  }
  function share(t) { txt = t; $('yz-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t + '\n\nБесплатный калькулятор йорцайта: https://hakelim.com/kodesh/yahrzeit/ru/'); }
  function mark(how) { if (!used && window.toolUsed) { used = true; try { toolUsed('yahrzeit_ru', { how: how }); } catch (x) {} } }
  function table(rows, known) {
    return '<table class="iv-tbl yz-tbl"><thead><tr>' + (known ? '<th scope="col">Год</th>' : '') + '<th scope="col">Еврейская дата</th><th scope="col">Йорцайт</th><th scope="col">Зажечь свечу</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var ev = add(r.g, -1);
        return '<tr>' + (known ? '<th scope="row">' + r.num + '</th>' : '') + '<td>' + esc(hS(r.hd)) + '</td><td><b>' + gS(r.g) + '</b><small>' + DOW[r.g.getDay()] + '</small></td><td>' + gS(ev) + '<small>' + DOW[ev.getDay()] + ', вечером</small></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function notes(death, rows, known) {
    var o = [], dm = mStd(death.getMonthName()), dmr = esc(mRu(dm));
    if (/^Adar/.test(dm)) {
      var leapRow = rows.filter(function (r) { return H.HDate.isLeapYear(r.hd.getFullYear()); })[0];
      if (dm === 'Adar') o.push('Кончина в Адаре обычного года: в високосный год (два месяца Адар) по Шульхан Аруху йорцайт отмечают в Адар II, по Рамо – в Адар I, а некоторые отмечают оба. В таблице указано ' + (leapRow ? esc(hDM(leapRow.hd)) + ' ' + leapRow.hd.getFullYear() + ' года' : 'одна дата') + '. Какой день соблюдать, спросите раввина.');
      else o.push('Кончина в месяце ' + dmr + ' високосного года: в следующие високосные годы йорцайт отмечают в том же месяце, а в обычные годы – в Адаре.');
    }
    if (death.getDate() === 30 && /^(Cheshvan|Kislev)$/.test(dm)) o.push('Кончина 30 ' + dmr + '. В годы, когда в месяце ' + dmr + ' только 29 дней, есть разные обычаи (29 ' + dmr + ' или 1-е число следующего месяца)' + (known ? '' : '; точное правило зависит от первой годовщины, поэтому укажите и год кончины') + '. Спросите раввина.');
    if (known && rows[0] && rows[0].num === 1) o.push('Это первый йорцайт. Если похороны были через три дня или позже после кончины, некоторые отмечают первый йорцайт по дню похорон. Если первый год високосный (13 месяцев), кадиш заканчивают раньше йорцайта. Спросите раввина.');
    return o.length ? '<ul class="yz-notes">' + o.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '';
  }

  function show(death, known, label, how, user) {
    var out = $('yz-res'), today = clean(new Date()), rows = list(death, today, 30), next = rows[0], name = ($('yz-name').value || '').trim();
    cur = { death: death, known: known, name: name };
    var h = '<div class="res"><h3>Еврейская дата кончины</h3><p class="iv-big">' + esc(known ? hS(death) : hDM(death)) + '</p>' +
      (known ? '<p class="iv-he"><span lang="he" dir="rtl">' + esc(hHe(death)) + '</span></p>' : '') +
      (label ? '<p class="iv-sub">' + label + '</p>' : '') + '</div>';
    if (next) {
      var n = days(today, next.g), ev = add(next.g, -1), sh = shabbatBefore(next.g);
      h += '<div class="res"><h3>' + (name ? 'Ближайший йорцайт: ' + esc(name) : 'Ближайший йорцайт') + '</h3><p class="iv-big">' + (n === 0 ? 'Сегодня. ' : '') + gL(next.g) + '</p>' +
        '<p class="iv-g">' + esc(hS(next.hd)) + (known ? ' · ' + next.num + '-я годовщина' : '') + ' · ' + when(n) + '</p>' +
        '<ul><li>Поминальную свечу зажигают <b>' + DOWV[ev.getDay()] + ' вечером, ' + gS(ev) + '</b>, ' + (ev.getDay() === 6 ? 'после исхода субботы (с наступлением ночи, не раньше)' : ev.getDay() === 5 ? 'до захода солнца, перед субботними свечами' : 'до захода солнца') + '. Она горит весь следующий день.</li>' +
        (next.g.getDay() === 6 ? '<li>В этом году йорцайт выпадает на субботу.</li>' : '<li>Суббота перед йорцайтом: ' + gS(sh) + ' (во многих общинах в этот день вызывают к Торе).</li>') +
        '</ul>' + notes(death, rows, known) + '</div>';
      h += '<div class="res"><h3>Даты йорцайта на 30 лет вперёд</h3>' + table(rows, known) + '</div>';
      setIcs('yz-ics', rows.map(function (r) { return { g: r.g, hd: r.hd, name: name }; }), 'yahrzeit' + (name ? '-' + ymd(death.greg()) : '') + '.ics');
      share((name ? 'Йорцайт: ' + name : 'Йорцайт') + ' (' + hDM(death) + '): ' + gL(next.g) + '.\nСвечу зажигают ' + DOWV[ev.getDay()] + ' вечером, ' + gS(ev) + '.');
    }
    out.innerHTML = h; $('yz-save').hidden = false;
    if (user) mark(how);
  }

  function drawGreg(user) {
    var d = fromKey($('yz-date').value), after = $('yz-after').checked;
    if (!d) { if (user) $('yz-res').innerHTML = '<p class="iv-err">Выберите дату кончины.</p>'; return; }
    show(new H.HDate(after ? add(d, 1) : d), true, 'Дата кончины: ' + gL(d) + (after ? ', после захода солнца' : ''), 'greg', user);
    if (user) { try { localStorage.setItem(KEY, JSON.stringify({ d: $('yz-date').value, a: after ? 1 : 0 })); } catch (x) {} }
  }
  function fillDays() {
    var m = $('yz-hm').value, sel = $('yz-hd'), c = sel.value || '1',
      max = /^(Tishrei|Cheshvan|Kislev|Shvat|Adar I|Nisan|Sivan|Av)$/.test(m) ? 30 : 29;
    sel.innerHTML = ''; for (var i = 1; i <= max; i++) { var o = document.createElement('option'); o.value = o.textContent = i; sel.appendChild(o); }
    sel.value = Math.min(+c, max);
  }
  function okYear(mon, y) { var leap = H.HDate.isLeapYear(y); return !((mon === 'Adar I' || mon === 'Adar II') && !leap) && !(mon === 'Adar' && leap); }
  function mkH(day, mon, y) { try { var hd = new H.HDate(day, mon, y); return hd.getDate() === day && mStd(hd.getMonthName()) === mon ? hd : null; } catch (e) { return null; } }
  function heb(day, mon, y) {
    if (y) return okYear(mon, y) ? mkH(day, mon, y) : null;
    for (var t = 5700; t < 5786; t++) { if (!okYear(mon, t)) continue; var hd = mkH(day, mon, t); if (hd) return hd; }
    return null;
  }
  function drawHeb(user) {
    var day = +$('yz-hd').value, mon = $('yz-hm').value, yv = +$('yz-hy').value || 0;
    if (yv && (yv < 5000 || yv > 6000)) { $('yz-res').innerHTML = '<p class="iv-err">Еврейский год – четыре цифры, например 5785.</p>'; return; }
    var hd = heb(day, mon, yv);
    if (!hd) { $('yz-res').innerHTML = '<p class="iv-err">' + (yv && /^Adar/.test(mon) ? (H.HDate.isLeapYear(yv) ? yv + ' – високосный год: выберите Адар I или Адар II.' : yv + ' – обычный год: выберите Адар.') : 'Такой даты нет в этом еврейском году.') + '</p>'; return; }
    show(hd, !!yv, yv ? 'По обычному календарю: ' + gL(clean(hd.greg())) + ' (день, который закончился с заходом солнца)' : 'Укажите и еврейский год кончины – так расчёт будет точнее.', 'hebrew', user);
  }
  function redraw(user) { if ($('yz-m1').hidden) drawHeb(user); else drawGreg(user); }

  function getList() { try { return JSON.parse(localStorage.getItem(LIST) || '[]') || []; } catch (x) { return []; } }
  function putList(a) { try { localStorage.setItem(LIST, JSON.stringify(a)); } catch (x) {} }
  function drawList() {
    var a = getList(), el = $('yz-list'), today = clean(new Date()), ev = [];
    if (!a.length) { el.innerHTML = '<p class="iv-ex">Пока нет имён. Рассчитайте йорцайт и нажмите «Сохранить в мой список».</p>'; $('yz-ics-all').hidden = true; return; }
    var items = a.map(function (x, i) {
      var d = mkH(x.d, x.m, x.y) || heb(x.d, x.m, 0); if (!d) return null;
      var r = list(d, today, 5); r.forEach(function (q) { ev.push({ g: q.g, hd: q.hd, name: x.n }); });
      return { i: i, x: x, d: d, next: r[0] };
    }).filter(Boolean).sort(function (p, q) { return (p.next ? p.next.g : 9e15) - (q.next ? q.next.g : 9e15); });
    el.innerHTML = '<ul class="yz-list">' + items.map(function (it) {
      var n = it.next ? days(today, it.next.g) : -1;
      return '<li' + (n >= 0 && n <= 7 ? ' class="soon"' : '') + '><b>' + esc(it.x.n || 'Без имени') + '</b> · ' + esc(it.x.y ? hS(it.d) : hDM(it.d)) +
        (it.next ? '<br><span>Ближайший: ' + gL(it.next.g) + ' · ' + when(n) + ' · свеча ' + DOWV[add(it.next.g, -1).getDay()] + ' вечером</span>' : '') +
        ' <button type="button" class="btn btn-line btn-sm" data-yzdel="' + it.i + '" aria-label="Удалить: ' + esc(it.x.n || 'без имени') + '">Удалить</button></li>';
    }).join('') + '</ul>';
    setIcs('yz-ics-all', ev, 'yahrzeits.ics');
  }

  function start() {
    H = window.hebcal; if (!H) return;
    var hm = $('yz-hm'); HM.forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = mRu(m); hm.appendChild(o); });
    var t = new H.HDate(clean(new Date())); hm.value = mStd(t.getMonthName()); fillDays(); $('yz-hd').value = t.getDate();
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.d) { $('yz-date').value = s.d; $('yz-after').checked = !!s.a; } } catch (x) {}
    ['input', 'change'].forEach(function (ev) { $('yz-date').addEventListener(ev, function () { drawGreg(true); }); $('yz-hy').addEventListener(ev, function () { drawHeb(true); }); });
    $('yz-after').addEventListener('change', function () { drawGreg(true); });
    hm.addEventListener('change', function () { fillDays(); drawHeb(true); });
    $('yz-hd').addEventListener('change', function () { drawHeb(true); });
    $('yz-name').addEventListener('change', function () { if (cur) redraw(false); });
    [].forEach.call(document.querySelectorAll('[data-yzmode]'), function (b) {
      b.addEventListener('click', function () {
        var m = b.getAttribute('data-yzmode');
        [].forEach.call(document.querySelectorAll('[data-yzmode]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('yz-m1').hidden = m !== 'greg'; $('yz-m2').hidden = m !== 'hebrew';
        redraw(false);
      });
    });
    $('yz-save').addEventListener('click', function () {
      if (!cur) return; var a = getList(), d = cur.death;
      a.push({ n: ($('yz-name').value || '').trim() || cur.name, d: d.getDate(), m: mStd(d.getMonthName()), y: cur.known ? d.getFullYear() : 0 }); putList(a); drawList(); mark('save');
      $('yz-save').textContent = 'Сохранено'; setTimeout(function () { $('yz-save').textContent = 'Сохранить в мой список'; }, 1500);
    });
    $('yz-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-yzdel]'); if (!b) return;
      var a = getList(); a.splice(+b.getAttribute('data-yzdel'), 1); putList(a); drawList();
    });
    $('yz-copy').addEventListener('click', function () { if (!txt) return; try { navigator.clipboard.writeText(txt); $('yz-copy').textContent = 'Скопировано'; setTimeout(function () { $('yz-copy').textContent = 'Копировать'; }, 1500); } catch (x) {} });
    drawList();
    if (fromKey($('yz-date').value)) drawGreg(false);
  }
  if (window.hebcal) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
})();
