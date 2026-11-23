/* Yahrzeit calculator in English (/kodesh/yahrzeit/en/).
   Uses the site's hebcal bundle (window.hebcal): HDate + HebrewCalendar.getYahrzeit, the same rules as the Hebrew page
   (/kodesh/yahrzeit/). Everything runs in the browser; names and dates stay on this device (localStorage). */
(function () {
  var box = document.getElementById('yz-calc'); if (!box) return;
  var H, KEY = 'kelim_yz_en', LIST = 'kelim_yz_en_list', used = false, txt = '', cur = null;
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var HM = ['Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shvat', 'Adar', 'Adar I', 'Adar II', 'Nisan', 'Iyyar', 'Sivan', 'Tamuz', 'Av', 'Elul'];
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function noon(y, m, d) { return new Date(y, m, d, 12); }
  function clean(d) { return noon(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fromKey(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return null; var d = noon(+m[1], +m[2] - 1, +m[3]); return isNaN(d) || d.getFullYear() < 1300 ? null : d; }
  function add(d, n) { return noon(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function days(a, b) { return Math.round((clean(b) - clean(a)) / 864e5); }
  function gS(d) { return MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function gL(d) { return DOW[d.getDay()] + ', ' + MONF[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function hS(hd) { return hd.getDate() + ' ' + hd.getMonthName() + ' ' + hd.getFullYear(); }
  function hDM(hd) { return hd.getDate() + ' ' + hd.getMonthName(); }
  function hHe(hd) { try { return hd.renderGematriya().replace(/[֑-ׇ]/g, ''); } catch (e) { return ''; } }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
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
  function when(n) { return n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; }
  function shabbatBefore(g) { return add(g, -(g.getDay() + 1)); }
  function ymd(d) { return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function icsText(events) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//Yahrzeit//EN', 'CALSCALE:GREGORIAN'];
    events.forEach(function (e, i) {
      L.push('BEGIN:VEVENT', 'UID:yz-' + ymd(e.g) + '-' + i + '@hakelim.com', 'DTSTAMP:' + ymd(new Date()) + 'T000000Z',
        'DTSTART;VALUE=DATE:' + ymd(e.g), 'DTEND;VALUE=DATE:' + ymd(add(e.g, 1)),
        'SUMMARY:Yahrzeit' + (e.name ? ' - ' + e.name.replace(/[,;\\\r\n]/g, ' ') : '') + ' - ' + hS(e.hd),
        'DESCRIPTION:Light the memorial candle the evening before (' + gS(add(e.g, -1)) + ')' + (add(e.g, -1).getDay() === 6 ? ' after Shabbat ends.' : ' before sunset.') + ' hakelim.com/kodesh/yahrzeit/en/',
        'END:VEVENT');
    });
    L.push('END:VCALENDAR'); return L.join('\r\n');
  }
  function setIcs(id, events, file) {
    var a = $(id); if (!a) return;
    try { a.href = URL.createObjectURL(new Blob([icsText(events)], { type: 'text/calendar' })); a.download = file; a.hidden = !events.length; } catch (e) { a.hidden = true; }
  }
  function share(t) { txt = t; $('yz-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t + '\n\nFree yahrzeit calculator: https://hakelim.com/kodesh/yahrzeit/en/'); }
  function mark(how) { if (!used && window.toolUsed) { used = true; try { toolUsed('yahrzeit_en', { how: how }); } catch (x) {} } }
  function table(rows, known) {
    return '<table class="iv-tbl yz-tbl"><thead><tr>' + (known ? '<th scope="col">#</th>' : '') + '<th scope="col">Hebrew date</th><th scope="col">Yahrzeit</th><th scope="col">Light candle</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var ev = add(r.g, -1);
        return '<tr>' + (known ? '<th scope="row">' + r.num + '</th>' : '') + '<td>' + esc(hS(r.hd)) + '</td><td><b><bdi dir="ltr">' + gS(r.g) + '</bdi></b><small>' + DOW[r.g.getDay()] + '</small></td><td><bdi dir="ltr">' + gS(ev) + '</bdi><small>' + DOW[ev.getDay()] + ' evening</small></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function notes(death, rows, known) {
    var o = [], dm = death.getMonthName();
    if (/^Adar/.test(dm)) {
      var leapRow = rows.filter(function (r) { return H.HDate.isLeapYear(r.hd.getFullYear()); })[0];
      if (dm === 'Adar') o.push('Passed away in Adar of a regular year: in a leap year (two months of Adar) the Shulchan Aruch says to keep the yahrzeit in Adar II, the Rema says Adar I, and some keep both. The table shows ' + (leapRow ? esc(hDM(leapRow.hd)) + ' in ' + leapRow.hd.getFullYear() : 'one date') + '. Ask your rabbi which to keep.');
      else o.push('Passed away in ' + esc(dm) + ' of a leap year: in the next leap years the yahrzeit is kept in that same month, and in regular years in Adar.');
    }
    if (death.getDate() === 30 && /^(Cheshvan|Kislev)$/.test(dm)) o.push('Passed away on 30 ' + esc(dm) + '. In years when ' + esc(dm) + ' has only 29 days there are different customs (29 ' + esc(dm) + ' or the 1st of the next month)' + (known ? '' : '; the exact rule depends on the first anniversary, so enter the year of passing') + '. Ask your rabbi.');
    if (known && rows[0] && rows[0].num === 1) o.push('This is the first yahrzeit. When the burial was three or more days after the passing, some keep the first yahrzeit only by the day of burial. If the first year is a leap year (13 months), Kaddish ends before the yahrzeit. Ask your rabbi.');
    return o.length ? '<ul class="yz-notes">' + o.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '';
  }

  function show(death, known, label, how, user) {
    var out = $('yz-res'), today = clean(new Date()), rows = list(death, today, 30), next = rows[0], name = ($('yz-name').value || '').trim();
    cur = { death: death, known: known, name: name };
    var h = '<div class="res"><h3>Hebrew date of passing</h3><p class="iv-big">' + esc(known ? hS(death) : hDM(death)) + '</p>' +
      (known ? '<p class="iv-he"><span lang="he" dir="rtl">' + esc(hHe(death)) + '</span></p>' : '') +
      (label ? '<p class="iv-sub">' + label + '</p>' : '') + '</div>';
    if (next) {
      var n = days(today, next.g), ev = add(next.g, -1), sh = shabbatBefore(next.g);
      h += '<div class="res"><h3>' + (name ? 'Next yahrzeit of ' + esc(name) : 'Next yahrzeit') + '</h3><p class="iv-big">' + (n === 0 ? 'Today. ' : '') + '<bdi dir="ltr">' + gL(next.g) + '</bdi></p>' +
        '<p class="iv-g">' + esc(hS(next.hd)) + (known ? ' · ' + ord(next.num) + ' yahrzeit' : '') + ' · ' + when(n) + '</p>' +
        '<ul><li>Light the memorial candle on <b>' + DOW[ev.getDay()] + ' evening, <bdi dir="ltr">' + gS(ev) + '</bdi></b>, ' + (ev.getDay() === 6 ? 'after Shabbat ends (after nightfall, not before)' : ev.getDay() === 5 ? 'before sunset, before the Shabbat candles' : 'before sunset') + '. It burns through the next day.</li>' +
        (next.g.getDay() === 6 ? '<li>The yahrzeit falls on Shabbat this year.</li>' : '<li>The Shabbat before: <bdi dir="ltr">' + gS(sh) + '</bdi> (aliyah to the Torah, in many communities).</li>') +
        '</ul>' + notes(death, rows, known) + '</div>';
      h += '<div class="res"><h3>Yahrzeit dates for the next 30 years</h3>' + table(rows, known) + '</div>';
      setIcs('yz-ics', rows.map(function (r) { return { g: r.g, hd: r.hd, name: name }; }), 'yahrzeit' + (name ? '-' + name.replace(/[^\w]+/g, '-').toLowerCase() : '') + '.ics');
      share((name ? 'Yahrzeit of ' + name : 'Yahrzeit') + ' (' + hDM(death) + '): ' + gL(next.g) + '.\nLight the candle on ' + DOW[ev.getDay()] + ' evening, ' + gS(ev) + '.');
    }
    out.innerHTML = h; $('yz-save').hidden = false;
    if (user) mark(how);
  }

  function drawGreg(user) {
    var d = fromKey($('yz-date').value), after = $('yz-after').checked;
    if (!d) { if (user) $('yz-res').innerHTML = '<p class="iv-err">Pick the date of passing.</p>'; return; }
    show(new H.HDate(after ? add(d, 1) : d), true, 'Passed away ' + gL(d) + (after ? ', after sunset' : ''), 'greg', user);
    if (user) { try { localStorage.setItem(KEY, JSON.stringify({ d: $('yz-date').value, a: after ? 1 : 0 })); } catch (x) {} }
  }
  function fillDays() {
    var m = $('yz-hm').value, sel = $('yz-hd'), c = sel.value || '1',
      max = /^(Tishrei|Cheshvan|Kislev|Shvat|Adar I|Nisan|Sivan|Av)$/.test(m) ? 30 : 29;
    sel.innerHTML = ''; for (var i = 1; i <= max; i++) { var o = document.createElement('option'); o.value = o.textContent = i; sel.appendChild(o); }
    sel.value = Math.min(+c, max);
  }
  function okYear(mon, y) { var leap = H.HDate.isLeapYear(y); return !((mon === 'Adar I' || mon === 'Adar II') && !leap) && !(mon === 'Adar' && leap); }
  function mkH(day, mon, y) { try { var hd = new H.HDate(day, mon, y); return hd.getDate() === day && hd.getMonthName() === mon ? hd : null; } catch (e) { return null; } }
  function heb(day, mon, y) {
    if (y) return okYear(mon, y) ? mkH(day, mon, y) : null;
    for (var t = 5700; t < 5786; t++) { if (!okYear(mon, t)) continue; var hd = mkH(day, mon, t); if (hd) return hd; }
    return null;
  }
  function drawHeb(user) {
    var day = +$('yz-hd').value, mon = $('yz-hm').value, yv = +$('yz-hy').value || 0;
    if (yv && (yv < 5000 || yv > 6000)) { $('yz-res').innerHTML = '<p class="iv-err">The Hebrew year looks like 5785 (four digits).</p>'; return; }
    var hd = heb(day, mon, yv);
    if (!hd) { $('yz-res').innerHTML = '<p class="iv-err">' + (yv && /^Adar/.test(mon) ? (H.HDate.isLeapYear(yv) ? yv + ' is a leap year: choose Adar I or Adar II.' : yv + ' is a regular year: choose Adar.') : 'That date does not exist in that Hebrew year.') + '</p>'; return; }
    show(hd, !!yv, yv ? 'Converted: ' + gL(clean(hd.greg())) + ' (the day that ended at sunset)' : 'Enter the Hebrew year of passing too for the most exact result.', 'hebrew', user);
  }
  function redraw(user) { if ($('yz-m1').hidden) drawHeb(user); else drawGreg(user); }

  function getList() { try { return JSON.parse(localStorage.getItem(LIST) || '[]') || []; } catch (x) { return []; } }
  function putList(a) { try { localStorage.setItem(LIST, JSON.stringify(a)); } catch (x) {} }
  function drawList() {
    var a = getList(), el = $('yz-list'), today = clean(new Date()), ev = [];
    if (!a.length) { el.innerHTML = '<p class="iv-ex">No names yet. Calculate a yahrzeit and tap "Save to my list".</p>'; $('yz-ics-all').hidden = true; return; }
    var items = a.map(function (x, i) {
      var d = mkH(x.d, x.m, x.y) || heb(x.d, x.m, 0); if (!d) return null;
      var r = list(d, today, 5); r.forEach(function (q) { ev.push({ g: q.g, hd: q.hd, name: x.n }); });
      return { i: i, x: x, d: d, next: r[0] };
    }).filter(Boolean).sort(function (p, q) { return (p.next ? p.next.g : 9e15) - (q.next ? q.next.g : 9e15); });
    el.innerHTML = '<ul class="yz-list">' + items.map(function (it) {
      var n = it.next ? days(today, it.next.g) : -1;
      return '<li' + (n >= 0 && n <= 7 ? ' class="soon"' : '') + '><b>' + esc(it.x.n || 'Unnamed') + '</b> · ' + esc(it.x.y ? hS(it.d) : hDM(it.d)) +
        (it.next ? '<br><span>Next: <bdi dir="ltr">' + gL(it.next.g) + '</bdi> · ' + when(n) + ' · candle ' + DOW[add(it.next.g, -1).getDay()] + ' evening</span>' : '') +
        ' <button type="button" class="btn btn-line btn-sm" data-yzdel="' + it.i + '" aria-label="Remove ' + esc(it.x.n || 'this name') + '">Remove</button></li>';
    }).join('') + '</ul>';
    setIcs('yz-ics-all', ev, 'yahrzeits.ics');
  }

  function start() {
    H = window.hebcal; if (!H) return;
    var hm = $('yz-hm'); HM.forEach(function (m) { var o = document.createElement('option'); o.value = o.textContent = m; hm.appendChild(o); });
    var t = new H.HDate(clean(new Date())); hm.value = t.getMonthName(); fillDays(); $('yz-hd').value = t.getDate();
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
      a.push({ n: ($('yz-name').value || '').trim() || cur.name, d: d.getDate(), m: d.getMonthName(), y: cur.known ? d.getFullYear() : 0 }); putList(a); drawList(); mark('save');
      $('yz-save').textContent = 'Saved'; setTimeout(function () { $('yz-save').textContent = 'Save to my list'; }, 1500);
    });
    $('yz-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-yzdel]'); if (!b) return;
      var a = getList(); a.splice(+b.getAttribute('data-yzdel'), 1); putList(a); drawList();
    });
    $('yz-copy').addEventListener('click', function () { if (!txt) return; try { navigator.clipboard.writeText(txt); $('yz-copy').textContent = 'Copied'; setTimeout(function () { $('yz-copy').textContent = 'Copy'; }, 1500); } catch (x) {} });
    drawList();
    if (fromKey($('yz-date').value)) drawGreg(false);
  }
  if (window.hebcal) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
})();
