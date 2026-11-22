/* Candle lighting times for the whole year (/kodesh/shabat/en/candle-lighting/): every Shabbat, Yom Tov,
   Yom Kippur and Hanukkah lighting for a US city, with the blessing for each one, calendar file, copy, print.
   זמני הדלקת נרות לשנה שלמה. החישוב: hebcal-core, הערים מ-assets/shabbat-en.js (US_CITIES). הכל בדפדפן.
   אותו core רץ גם ב-node בזמן יצירת הדף כדי לכתוב לוח ניו יורק קבוע לגוגל. */
(function (root) {
  'use strict';

  function core(H) {
    var CHAG = H.flags.CHAG, EREV = H.flags.EREV;
    function fmt(tz, o) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, o)); }
    function down(d) { return new Date(Math.floor(d.getTime() / 60000) * 60000); }
    function key(g) { return g.getFullYear() + '-' + (g.getMonth() + 1) + '-' + g.getDate(); }
    function next(g) { return new Date(g.getFullYear(), g.getMonth(), g.getDate() + 1); }
    function clean(n) { return n.replace(/ \d{4}$/, '').replace('Rosh Hashana', 'Rosh Hashanah').replace('Shmini Atzeret', 'Shemini Atzeret'); }
    /* every lighting from `from` for `days` days: {t, kind, name, bless, after} */
    function lightings(p, mins, from, days) {
      var loc = new H.Location(p.lat, p.lon, false, p.tz, p.name);
      var start = new Date(from.getTime() - 864e5), end = new Date(from.getTime() + days * 864e5);
      var ev = H.HebrewCalendar.calendar({ start: start, end: end, location: loc, candlelighting: true, candleLightingMins: mins, il: false });
      var chag = {};
      ev.forEach(function (e) {
        var f = e.getFlags();
        if ((f & CHAG) && !(f & EREV)) { var k = key(e.getDate().greg()); if (!chag[k]) chag[k] = clean(e.render('en')); }
      });
      var out = [];
      ev.forEach(function (e) {
        var d = e.getDesc(), g = e.getDate().greg();
        if (!e.eventTime) return;
        if (d === 'Candle lighting') {
          var tom = next(g), hol = chag[key(tom)], sat = tom.getDay() === 6, today = chag[key(g)] || g.getDay() === 6;
          var bless, name;
          if (hol && /Yom Kippur/.test(hol)) { bless = sat ? 'shabbat-yk' : 'yk'; name = 'Yom Kippur' + (sat ? ' (on Shabbat)' : ''); }
          else if (hol) { bless = sat ? 'shabbat-yt' : 'yt'; name = hol + (sat ? ' · Shabbat' : ''); }
          else { bless = 'shabbat'; name = 'Shabbat'; }
          var she = !!hol && !/Yom Kippur/.test(hol) && !/Pesach VII/.test(hol);
          if (hol && /Yom Kippur/.test(hol)) she = true;
          out.push({ t: down(e.eventTime), kind: hol ? (/Yom Kippur/.test(hol) ? 'yk' : 'yt') : 'shabbat', name: name, bless: bless, she: she, after: !!today && !sat, flame: !!today });
        } else if (/^Chanukah: \d/.test(d)) {
          var n = +d.replace(/\D+/g, '') || 1;
          out.push({ t: down(e.eventTime), kind: 'hanukkah', name: 'Hanukkah, night ' + n + ' (' + n + (n === 1 ? ' candle' : ' candles') + ')', bless: 'hanukkah', she: n === 1, after: g.getDay() === 6, fri: g.getDay() === 5 });
        }
      });
      out.sort(function (a, b) { return a.t - b.t || (a.kind === 'hanukkah' ? -1 : 1); });
      return out.filter(function (o) { return o.t > new Date(from.getTime() - 3 * 36e5); });
    }
    return { lightings: lightings, fmt: fmt };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { core: core }; return; }

  // ---- בדפדפן ----
  var $ = function (id) { return document.getElementById(id); };
  function init() {
    var CITIES = root.US_CITIES;
    if (!$('cl-place') || !root.hebcal || !CITIES) return;
    var C = core(root.hebcal), KEY = 'candle-en';
    var st = { city: 'new-york', mins: 18, gps: null, show: 'all' };
    try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
    var q = (location.search.match(/[?&]city=([a-z-]+)/) || [])[1];
    if (q && CITIES.some(function (c) { return c[0] === q; })) { st.city = q; st.gps = null; }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
    var usedOnce = {};
    function used(how) { if (root.toolUsed && !usedOnce[how]) { usedOnce[how] = 1; root.toolUsed('candle_en', { how: how }); } }
    function place() {
      if (st.gps) return { name: 'My location', lat: st.gps[0], lon: st.gps[1], tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York' };
      var c = CITIES.filter(function (x) { return x[0] === st.city; })[0] || CITIES[0];
      return { name: c[1] + ', ' + c[2], lat: c[3], lon: c[4], tz: c[5] };
    }
    var sel = $('cl-place'), mins = $('cl-mins'), show = $('cl-show');
    sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + ', ' + c[2] + '</option>'; }).join('') + '<option value="gps" hidden>My location</option>';
    sel.value = st.gps ? 'gps' : st.city; mins.value = String(st.mins);
    if (mins.value !== String(st.mins)) { st.mins = 18; mins.value = '18'; }
    var BL = { shabbat: 'Shabbat', yt: 'Yom Tov', 'shabbat-yt': 'Shabbat and Yom Tov', yk: 'Yom Kippur', 'shabbat-yk': 'Shabbat and Yom Kippur', hanukkah: 'Hanukkah' };
    var last = [], lastP = null;
    function row(o, T, D) {
      var b = o.bless === 'hanukkah' ? '<a href="/kodesh/chanuka/en/">Hanukkah blessings</a>' : '<a href="#bl-' + o.bless + '">' + BL[o.bless] + '</a>' + (o.she ? ' + <a href="#bl-she">Shehecheyanu</a>' : '');
      var note = o.kind === 'hanukkah' ? (o.fri ? 'Before the Shabbat candles' : (o.after ? 'After Shabbat ends' : 'At nightfall')) : (o.after ? 'After nightfall, from an existing flame' : o.flame ? 'Before sunset, from an existing flame' : 'Before sunset');
      return '<tr class="cl-' + o.kind + '"><th scope="row">' + o.name + '</th><td>' + D.format(o.t) + '</td><td><b>' + (o.after && o.kind !== 'hanukkah' ? 'after ' : '') + T.format(o.t) + '</b><span class="cl-note">' + note + '</span></td><td>' + b + '</td></tr>';
    }
    function draw() {
      var p = place(); lastP = p;
      var all = C.lightings(p, st.mins, new Date(), 366);
      var list = all.filter(function (o) { return st.show === 'all' || (st.show === 'hol' ? o.kind !== 'shabbat' : st.show === 'shabbat' ? o.kind === 'shabbat' : o.kind !== 'hanukkah'); });
      last = list;
      var T = C.fmt(p.tz, { hour: 'numeric', minute: '2-digit' }), D = C.fmt(p.tz, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      var n = all.filter(function (o) { return o.kind !== 'hanukkah'; })[0];
      if (n) $('cl-next').innerHTML = '<p class="cl-where">' + p.name + ' · next candle lighting</p><p class="cl-big"><b>' + (n.after ? 'after ' : '') + T.format(n.t) + '</b><span>' + n.name + ' – ' + D.format(n.t) + '</span></p><p class="cl-bl">Blessing: <a href="#bl-' + n.bless + '">' + BL[n.bless] + '</a>' + (n.she ? ' + <a href="#bl-she">Shehecheyanu</a>' : '') + '</p>';
      $('cl-rows').innerHTML = list.map(function (o) { return row(o, T, D); }).join('');
      $('cl-cap').textContent = 'Candle lighting times for ' + p.name + ' for the next 12 months (' + p.tz.replace(/_/g, ' ') + ', ' + st.mins + ' min before sunset)';
      $('cl-count').textContent = list.length + ' lightings in the coming year';
    }
    draw();
    sel.addEventListener('change', function () { if (sel.value === 'gps') return; st.city = sel.value; st.gps = null; save(); used('city'); draw(); });
    mins.addEventListener('change', function () { st.mins = +mins.value; save(); used('mins'); draw(); });
    if (show) { show.value = st.show; show.addEventListener('change', function () { st.show = show.value; save(); used('show'); draw(); }); }
    var gb = $('cl-gps');
    if (gb) gb.addEventListener('click', function () {
      if (!navigator.geolocation) { $('cl-gps-msg').textContent = 'Location is not available on this device.'; return; }
      $('cl-gps-msg').textContent = 'Finding your location…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        st.gps = [+pos.coords.latitude.toFixed(4), +pos.coords.longitude.toFixed(4)]; save(); sel.value = 'gps'; $('cl-gps-msg').textContent = 'Times for your location.'; used('gps'); draw();
      }, function () { $('cl-gps-msg').textContent = 'Location was not shared. Pick your city from the list.'; }, { timeout: 15000, maximumAge: 6e5 });
    });
    function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var ics = $('cl-ics');
    if (ics) ics.addEventListener('click', function () {
      var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//Candle lighting//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Candle lighting – ' + lastP.name];
      last.forEach(function (o, i) {
        L.push('BEGIN:VEVENT', 'UID:cl-' + stamp(o.t) + '-' + i + '@hakelim.com', 'DTSTAMP:' + stamp(new Date()), 'DTSTART:' + stamp(o.t), 'DTEND:' + stamp(new Date(o.t.getTime() + 15 * 60000)),
          'SUMMARY:🕯 Candle lighting – ' + o.name.replace(/,/g, '\\,'), 'DESCRIPTION:' + (o.after && o.kind !== 'hanukkah' ? 'After nightfall\\, from an existing flame. ' : '') + 'https://hakelim.com/kodesh/shabat/en/candle-lighting/',
          'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Candle lighting in 30 minutes', 'END:VALARM', 'END:VEVENT');
      });
      L.push('END:VCALENDAR');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' }));
      a.download = 'candle-lighting-times.ics'; document.body.appendChild(a); a.click(); a.remove();
      used('ics');
    });
    var cp = $('cl-copy');
    if (cp) cp.addEventListener('click', function () {
      var T = C.fmt(lastP.tz, { hour: 'numeric', minute: '2-digit' }), D = C.fmt(lastP.tz, { weekday: 'short', month: 'short', day: 'numeric' });
      var txt = 'Candle lighting times – ' + lastP.name + '\n' + last.slice(0, 20).map(function (o) { return D.format(o.t) + ': ' + (o.after && o.kind !== 'hanukkah' ? 'after ' : '') + T.format(o.t) + ' – ' + o.name; }).join('\n') + '\nhttps://hakelim.com/kodesh/shabat/en/candle-lighting/';
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { cp.textContent = 'Copied ✓'; }, function () { cp.textContent = 'Copy failed'; });
      used('copy');
    });
    var pr = $('cl-print');
    if (pr) pr.addEventListener('click', function () { used('print'); window.print(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : this);
