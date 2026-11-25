/* Zmanim (halachic times) for the USA (/kodesh/zmanim/en/).
   זמני היום לארה"ב. החישוב: hebcal-core, הכל בדפדפן. רשימת הערים: assets/shabbat-en.js (US_CITIES).
   אותו קוד רץ גם ב-node (tools/zmanim_en.js) כדי לכתוב לוח קבוע של ניו יורק בתוך הדף לגוגל. */
(function (root) {
  'use strict';
  // [key, name, short note, rounding]. rounding: 'up' = זמן התחלה (מעגלים קדימה), 'down' = סוף זמן (מעגלים אחורה)
  var ZMANIM = [
    ['alot', 'Alot Hashachar (dawn)', 'sun 16.1° below the horizon', 'up'],
    ['alot72', 'Alot Hashachar, 72 min', '72 minutes before sunrise', 'up'],
    ['misheyakir', 'Misheyakir (earliest tallit and tefillin)', 'sun 11.5° below the horizon', 'up'],
    ['sunrise', 'Sunrise (Netz Hachama)', 'sea-level sunrise', 'up'],
    ['shmaMGA', 'Latest Shema (Magen Avraham)', '3 halachic hours, day from 72 min before sunrise to 72 min after sunset', 'down'],
    ['shmaGRA', 'Latest Shema (Gra)', '3 halachic hours, day from sunrise to sunset', 'down'],
    ['tfilaMGA', 'Latest Shacharit (Magen Avraham)', '4 halachic hours, Magen Avraham day', 'down'],
    ['tfilaGRA', 'Latest Shacharit (Gra)', '4 halachic hours, Gra day', 'down'],
    ['chatzot', 'Chatzot (midday)', 'halfway between sunrise and sunset', 'near'],
    ['minchaG', 'Mincha Gedola (earliest Mincha)', '6½ halachic hours', 'up'],
    ['minchaK', 'Mincha Ketana', '9½ halachic hours', 'up'],
    ['plag', 'Plag Hamincha', '10¾ halachic hours', 'up'],
    ['sunset', 'Sunset (Shkiah)', 'sea-level sunset', 'down'],
    ['tzeit', 'Nightfall (Tzeit Hakochavim)', 'three stars, sun 8.5° below the horizon', 'up'],
    ['rt', 'Rabbeinu Tam', '72 minutes after sunset', 'up'],
    ['chatzotN', 'Chatzot Halaila (midnight)', 'halfway between sunset and sunrise', 'near']
  ];

  function core(H) {
    function fmt(tz, o) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, o)); }
    function rnd(d, how) {
      if (!d || isNaN(d.getTime())) return null;
      var f = how === 'up' ? Math.ceil : how === 'down' ? Math.floor : Math.round;
      return new Date(f(d.getTime() / 60000) * 60000);
    }
    // התאריך המקומי בעיר (שנה/חודש/יום) – כדי שלא יתבלבל אצל מי שהמחשב שלו באזור זמן אחר
    function localDay(tz, d) {
      var a = fmt(tz, { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d), o = {};
      a.forEach(function (x) { o[x.type] = x.value; });
      return new Date(+o.year, +o.month - 1, +o.day, 12);
    }
    function day(p, date) {
      var loc = new H.Location(p.lat, p.lon, false, p.tz, p.name);
      var z = new H.Zmanim(loc, date, false), ss = z.sunset();
      var raw = {
        alot: z.alotHaShachar(), alot72: z.alotHaShachar72(), misheyakir: z.misheyakir(), sunrise: z.sunrise(),
        shmaMGA: z.sofZmanShmaMGA(), shmaGRA: z.sofZmanShma(), tfilaMGA: z.sofZmanTfillaMGA(), tfilaGRA: z.sofZmanTfilla(),
        chatzot: z.chatzot(), minchaG: z.minchaGedola(), minchaK: z.minchaKetana(), plag: z.plagHaMincha(),
        sunset: ss, tzeit: z.tzeit(8.5), rt: new Date(ss.getTime() + 72 * 60000), chatzotN: z.chatzotNight()
      };
      var out = {};
      ZMANIM.forEach(function (r) { out[r[0]] = rnd(raw[r[0]], r[3]); });
      out.hdate = new H.HDate(date).render('en');
      return out;
    }
    return { day: day, fmt: fmt, localDay: localDay };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { ZMANIM: ZMANIM, core: core }; return; }

  // ---- בדפדפן ----
  var $ = function (id) { return document.getElementById(id); };
  var CITIES = root.US_CITIES;
  if (!$('zm-place') || !root.hebcal || !CITIES) return;
  var C = core(root.hebcal), KEY = 'zmanim-en';
  var st = { city: 'new-york', gps: null };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) { if (sv.city) st.city = sv.city; if (sv.gps) st.gps = sv.gps; } } catch (e) {}
  var q = (location.search.match(/[?&]city=([a-z-]+)/) || [])[1];
  if (q && CITIES.some(function (c) { return c[0] === q; })) { st.city = q; st.gps = null; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function used(how) { if (root.toolUsed) root.toolUsed('zmanim_en', { how: how }); }
  function place() {
    if (st.gps) return { name: 'My location', lat: st.gps[0], lon: st.gps[1], tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York', slug: '' };
    var c = CITIES.filter(function (x) { return x[0] === st.city; })[0] || CITIES[0];
    return { name: c[1] + ', ' + c[2], lat: c[3], lon: c[4], tz: c[5], slug: c[0] };
  }
  var sel = $('zm-place'), dt = $('zm-date');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + ', ' + c[2] + '</option>'; }).join('') + '<option value="gps" hidden>My location</option>';
  sel.value = st.gps ? 'gps' : st.city;

  var chosen = null; // null = היום
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function span(ms) {
    var m = Math.round(ms / 60000), h = Math.floor(m / 60), mm = m % 60;
    return (h ? h + (h === 1 ? ' hour ' : ' hours ') : '') + (mm || !h ? mm + ' min' : '');
  }
  var last = null;
  function draw() {
    var p = place(), now = new Date(), today = C.localDay(p.tz, now);
    var d = chosen || today, isToday = iso(d) === iso(today);
    var z = C.day(p, d);
    var T = C.fmt(p.tz, { hour: 'numeric', minute: '2-digit' }), D = C.fmt(p.tz, { weekday: 'short', month: 'short', day: 'numeric' });
    var L = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    dt.value = iso(d);
    last = { p: p, z: z, d: d, T: T, L: L };
    var next = null;
    if (isToday) ZMANIM.some(function (r) { if (z[r[0]] && z[r[0]] > now && r[0] !== 'alot72') { next = r; return true; } });
    $('zm-hero').innerHTML = '<p class="sh-where">' + p.name + ' · ' + L.format(d) + ' · ' + z.hdate + '</p>' +
      '<div class="sh-two"><div><strong>Sunrise</strong><b>' + (z.sunrise ? T.format(z.sunrise) : '—') + '</b><span>Latest Shema: ' + T.format(z.shmaMGA) + ' / ' + T.format(z.shmaGRA) + '</span></div>' +
      '<div><strong>Sunset</strong><b>' + (z.sunset ? T.format(z.sunset) : '—') + '</b><span>Nightfall: ' + T.format(z.tzeit) + '</span></div></div>' +
      (next ? '<p class="sh-count">Next: ' + next[1] + ' at ' + T.format(z[next[0]]) + ', in ' + span(z[next[0]] - now) + '</p>' : '');
    $('zm-rows').innerHTML = ZMANIM.map(function (r) {
      var t = z[r[0]], past = isToday && t && t < now;
      return '<tr' + (next && next[0] === r[0] ? ' class="now"' : past ? ' class="zm-past"' : '') + '><th scope="row">' + r[1] + '<span>' + r[2] + '</span></th><td><b>' + (t ? T.format(t) : '—') + '</b></td></tr>';
    }).join('');
    $('zm-cap').textContent = 'Zmanim for ' + p.name + ', ' + L.format(d) + ' (' + p.tz.replace(/_/g, ' ') + ')';
    var wk = [];
    for (var i = 0; i < 7; i++) { var dd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, 12); wk.push([dd, C.day(p, dd)]); }
    $('zm-week').innerHTML = wk.map(function (x) {
      var y = x[1];
      return '<tr><th scope="row">' + D.format(x[0]) + '</th><td>' + T.format(y.alot) + '</td><td>' + T.format(y.sunrise) + '</td><td>' + T.format(y.shmaMGA) + '</td><td>' + T.format(y.shmaGRA) + '</td><td>' + T.format(y.chatzot) + '</td><td>' + T.format(y.plag) + '</td><td>' + T.format(y.sunset) + '</td><td>' + T.format(y.tzeit) + '</td></tr>';
    }).join('');
    var sh = document.querySelector('[data-share-tool]');
    if (sh) sh.setAttribute('data-text', 'Zmanim for ' + p.name + ' today: sunrise ' + T.format(z.sunrise) + ', latest Shema ' + T.format(z.shmaMGA) + ' / ' + T.format(z.shmaGRA) + ', sunset ' + T.format(z.sunset) + '. Free, no ads:');
    if (p.slug && history.replaceState) history.replaceState(null, '', location.pathname + (p.slug === 'new-york' ? '' : '?city=' + p.slug));
  }
  sel.addEventListener('change', function () { if (sel.value === 'gps') return; st.city = sel.value; st.gps = null; save(); used('city'); draw(); });
  dt.addEventListener('change', function () { var m = dt.value.match(/^(\d{4})-(\d\d)-(\d\d)$/); if (!m) return; chosen = new Date(+m[1], +m[2] - 1, +m[3], 12); used('date'); draw(); });
  function shift(n) { var b = chosen || C.localDay(place().tz, new Date()); chosen = new Date(b.getFullYear(), b.getMonth(), b.getDate() + n, 12); used('day'); draw(); }
  $('zm-prev').addEventListener('click', function () { shift(-1); });
  $('zm-next').addEventListener('click', function () { shift(1); });
  $('zm-today').addEventListener('click', function () { chosen = null; draw(); });
  var gb = $('zm-gps');
  if (gb) gb.addEventListener('click', function () {
    if (!navigator.geolocation) { $('zm-gps-msg').textContent = 'This browser cannot share a location. Pick your city from the list.'; return; }
    $('zm-gps-msg').textContent = 'Finding your location…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      st.gps = [+pos.coords.latitude.toFixed(3), +pos.coords.longitude.toFixed(3)]; save(); sel.value = 'gps'; $('zm-gps-msg').textContent = ''; used('gps'); draw();
    }, function () { $('zm-gps-msg').textContent = 'Location was not shared. Pick your city from the list.'; }, { timeout: 15000, maximumAge: 6e5 });
  });
  var cp = $('zm-copy');
  if (cp) cp.addEventListener('click', function () {
    var txt = 'Zmanim – ' + last.p.name + ', ' + last.L.format(last.d) + '\n' + ZMANIM.map(function (r) { return r[1] + ': ' + (last.z[r[0]] ? last.T.format(last.z[r[0]]) : '—'); }).join('\n') + '\n' + location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { cp.textContent = 'Copied ✓'; }, function () { cp.textContent = 'Copy failed'; });
    used('copy');
  });
  draw();
  setInterval(function () { if (!chosen) draw(); }, 60000);
})(typeof window !== 'undefined' ? window : this);
