// R12 – לוח השנה של הרב (כלי קודש). פרשות, חגים, תעניות, ראשי חודשים וזמני שבת לפי עיר,
// לשנה העברית או לחודשים הקרובים. להדפסה ולקובץ ics ליומן. החישוב מ-@hebcal/core (jsdelivr), הכול בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('ls-form'), out = $('ls-out');
  if (!form || !out) return;
  var H = window.hebcal;
  var CITIES = [['31.778,35.235', 'ירושלים', 40], ['32.08,34.78', 'תל אביב', 20], ['32.79,34.99', 'חיפה', 30], ['31.25,34.79', 'באר שבע', 20],
    ['32.965,35.496', 'צפת', 20], ['32.79,35.53', 'טבריה', 20], ['29.557,34.952', 'אילת', 20], ['31.53,35.1', 'חברון', 20], ['31.9,35.0', 'מודיעין', 20],
    ['32.09,34.88', 'פתח תקווה', 20], ['31.8,34.65', 'אשדוד', 20], ['32.33,34.86', 'נתניה', 20], ['31.7,35.12', 'גוש עציון', 20], ['32.3,35.2', 'שומרון', 20],
    ['31.35,34.3', 'עוטף עזה', 20], ['33.2,35.57', 'קריית שמונה', 20]];
  var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  var DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
  // ימים אזרחיים שלא צריכים להופיע בלוח של רב (נשארים: ימי זיכרון, עצמאות, ירושלים, עלייה, רבין, סיגד)
  var SKIP_MODERN = /School Observance|Ben-Gurion|Hebrew Language|Family Day|Herzl|Jabotinsky/;
  var KEY = 'kodesh-luach-shana';
  var st = { place: CITIES[0][0], range: 'year', candle: 'auto', parsha: 1, chag: 1, fast: 1, rc: 1, modern: 1, times: 1, title: '' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hm(d) { return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' }); }
  function key(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  var sel = $('ls-place');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('');
  sel.value = st.place;
  ['range', 'candle', 'title'].forEach(function (k) { form.elements[k].value = st[k]; });
  ['parsha', 'chag', 'fast', 'rc', 'modern', 'times'].forEach(function (k) { form.elements[k].checked = !!st[k]; });

  function rangeDates() {
    var today = new Date(); today.setHours(12, 0, 0, 0);
    if (st.range === 'year' || st.range === 'next') {
      var hy = new H.HDate(today).getFullYear() + (st.range === 'next' ? 1 : 0);
      return { start: new H.HDate(1, H.months.TISHREI, hy).greg(), end: new H.HDate(29, H.months.ELUL, hy).greg(), label: 'שנת ' + H.gematriya(hy % 1000) };
    }
    var n = +st.range, end = new Date(today); end.setMonth(end.getMonth() + n);
    return { start: today, end: end, label: n + ' החודשים הקרובים' };
  }

  var rows = [], meta = {};
  function build() {
    var city = CITIES.filter(function (c) { return c[0] === st.place; })[0] || CITIES[0];
    var ll = city[0].split(',').map(Number);
    var mins = st.candle === 'auto' ? city[2] : +st.candle;
    var loc = new H.Location(ll[0], ll[1], true, 'Asia/Jerusalem', city[1], 'IL', undefined, 0);
    var r = rangeDates();
    var evs = H.HebrewCalendar.calendar({ start: r.start, end: r.end, il: true, location: loc, candlelighting: true, candleLightingMins: mins,
      havdalahDeg: 8.5, sedrot: true, noMinorFast: false, noModern: false, noRoshChodesh: false, noSpecialShabbat: false });
    var F = H.flags, by = {};
    evs.forEach(function (e) {
      var f = e.getFlags(), d = e.getDate().greg(), k = key(d), kind = '', txt = e.render('he-x-NoNikud'), t = '';
      var dsc = e.getDesc();
      if (dsc === 'Havdalah') { if (!st.times) return; kind = 'havdala'; t = e.eventTime ? hm(e.eventTime) : ''; }
      else if (dsc === 'Candle lighting' || f & F.LIGHT_CANDLES) { if (!st.times) return; kind = 'candle'; t = e.eventTime ? hm(e.eventTime) : ''; }
      else if (f & F.YOM_TOV_ENDS) { if (!st.times) return; kind = 'havdala'; t = e.eventTime ? hm(e.eventTime) : ''; }
      else if (f & F.PARSHA_HASHAVUA) { if (!st.parsha) return; kind = 'parsha'; }
      else if (f & (F.MINOR_FAST | F.MAJOR_FAST)) { if (!st.fast) return; kind = 'fast'; if (e.eventTime) t = hm(e.eventTime); }
      else if (f & F.ROSH_CHODESH) { if (!st.rc) return; kind = 'rc'; }
      else if (f & F.MODERN_HOLIDAY) { if (!st.modern || SKIP_MODERN.test(e.getDesc())) return; kind = 'modern'; }
      else if (f & F.SPECIAL_SHABBAT) { if (!st.parsha) return; kind = 'special'; }
      else if (f & (F.CHAG | F.MINOR_HOLIDAY | F.CHOL_HAMOED | F.EREV)) { if (!st.chag) return; kind = f & F.CHAG ? 'chag' : 'holiday'; }
      else if (f & (F.OMER_COUNT | F.DAF_YOMI | F.MOLAD | F.SHABBAT_MEVARCHIM | F.HEBREW_DATE | F.USER_EVENT | F.MISHNA_YOMI | F.YERUSHALMI_YOMI | F.NACH_YOMI)) return;
      else { if (!st.chag) return; kind = 'holiday'; }
      if (e.eventTime && (kind === 'candle' || kind === 'havdala')) txt = kind === 'candle' ? 'הדלקת נרות' : 'צאת';
      else if (e.eventTime && kind === 'fast') txt = txt.replace(/\s*\d{1,2}:\d{2}.*$/, '');
      (by[k] = by[k] || { d: d, items: [] }).items.push({ kind: kind, txt: txt, t: t });
    });
    rows = Object.keys(by).sort().map(function (k) { return by[k]; });
    meta = { city: city[1], label: r.label, mins: mins };
    draw();
  }

  function draw() {
    var h = '<div class="ls-head"><span class="bsd">בס"ד</span><h2>' + esc(st.title || 'לוח השנה') + '</h2><p>' + esc(meta.label) + ' · ' + esc(meta.city) +
      (st.times ? ' · הדלקה ' + meta.mins + ' דק׳ לפני השקיעה, צאת 8.5°' : '') + '</p></div>';
    var month = -1;
    rows.forEach(function (r) {
      var d = r.d, hd = new H.HDate(d);
      if (d.getMonth() !== month) {
        if (month !== -1) h += '</tbody></table>';
        month = d.getMonth();
        h += '<h3 class="ls-m">' + MONTHS[month] + ' ' + d.getFullYear() + ' <small>' + esc(hd.renderGematriya(true).split(' ').slice(1).join(' ')) + '</small></h3><table class="ls-t"><tbody>';
      }
      var sh = d.getDay() === 6, parts = [], times = [];
      r.items.forEach(function (it) {
        if (it.kind === 'candle' || it.kind === 'havdala') times.push(it.txt + ' ' + it.t);
        else parts.push('<span class="k-' + it.kind + '">' + esc(it.txt) + (it.t ? ' ' + it.t : '') + '</span>');
      });
      h += '<tr class="' + (sh ? 'sh' : '') + '"><td class="ls-d">' + DAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '</td><td class="ls-h">' +
        esc(hd.renderGematriya(true).replace(/\s[^\s]+$/, '')) + '</td><td>' + parts.join(' · ') + '</td><td class="ls-tm">' + esc(times.join(' · ')) + '</td></tr>';
    });
    if (month !== -1) h += '</tbody></table>';
    h += '<p class="ls-foot">נוצר בכלי קודש · hakelim.com/kodesh/luach-shana · לזמנים מדויקים להלכה – לוח מקומי</p>';
    out.innerHTML = h;
    $('ls-count').textContent = rows.length + ' ימים בלוח';
  }

  // ---------- ics ----------
  function ics() {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kelim//luach-shana//HE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + (st.title || 'לוח השנה'), 'X-WR-TIMEZONE:Asia/Jerusalem'];
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    rows.forEach(function (r, i) {
      var d = r.d, nx = new Date(d); nx.setDate(nx.getDate() + 1);
      var main = [], times = [];
      r.items.forEach(function (it) { (it.kind === 'candle' || it.kind === 'havdala' ? times : main).push(it.txt + (it.t ? ' ' + it.t : '')); });
      var sum = main.length ? main.join(' · ') : times.join(' · ');
      var desc = main.length && times.length ? times.join(' · ') : '';
      L.push('BEGIN:VEVENT', 'UID:ls-' + key(d) + '-' + i + '@kodesh', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + key(d).replace(/-/g, ''),
        'DTEND;VALUE=DATE:' + key(nx).replace(/-/g, ''), 'SUMMARY:' + sum.replace(/[,;]/g, '\\$&'), 'TRANSP:TRANSPARENT');
      if (desc) L.push('DESCRIPTION:' + (meta.city + ': ' + desc).replace(/[,;]/g, '\\$&'));
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    var blob = new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'luach-shana.ics'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    $('ls-tip').hidden = false;
  }

  form.addEventListener('change', function () {
    st.place = sel.value; st.range = form.elements.range.value; st.candle = form.elements.candle.value; st.title = form.elements.title.value;
    ['parsha', 'chag', 'fast', 'rc', 'modern', 'times'].forEach(function (k) { st[k] = form.elements[k].checked ? 1 : 0; });
    save(); build();
  });
  form.elements.title.addEventListener('input', function () { st.title = this.value; save(); draw(); });
  $('ls-print').addEventListener('click', function () { window.print(); });
  $('ls-ics').addEventListener('click', ics);

  function start() { H = window.hebcal; try { build(); } catch (e) { out.innerHTML = '<p class="disclaimer">משהו נתקע בחישוב. רעננו את הדף.</p>'; if (window.console) console.error(e); } }
  if (H) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
})();
