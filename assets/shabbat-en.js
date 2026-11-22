/* Shabbat times for the USA (/kodesh/shabat/en/): candle lighting, Havdalah, Rabbeinu Tam, Yom Tov.
   זמני שבת לארה"ב. החישוב: hebcal-core (שקיעה, צאת הכוכבים 8.5°), הכל בדפדפן.
   אותו קוד רץ גם ב-node (tools/shabbat_en.js) כדי לכתוב לוח קבוע בתוך הדף לגוגל. */
(function (root) {
  'use strict';
  // [slug, city, state, lat, lon, time zone]. ערים מסומנות * נלקחו מרשימת הערים של hebcal-core; השאר מרכז העיר.
  var CITIES = [
    ['new-york', 'New York', 'NY', 40.71427, -74.00597, 'America/New_York'], // *
    ['brooklyn', 'Brooklyn', 'NY', 40.6782, -73.9442, 'America/New_York'],
    ['queens', 'Queens', 'NY', 40.7282, -73.7949, 'America/New_York'],
    ['monsey', 'Monsey', 'NY', 41.1112, -74.0685, 'America/New_York'],
    ['five-towns', 'Five Towns (Lawrence)', 'NY', 40.6157, -73.7296, 'America/New_York'],
    ['buffalo', 'Buffalo', 'NY', 42.88645, -78.87837, 'America/New_York'], // *
    ['rochester', 'Rochester', 'NY', 43.1566, -77.6088, 'America/New_York'],
    ['albany', 'Albany', 'NY', 42.6526, -73.7562, 'America/New_York'],
    ['lakewood', 'Lakewood', 'NJ', 40.0821, -74.2097, 'America/New_York'],
    ['teaneck', 'Teaneck', 'NJ', 40.8976, -74.016, 'America/New_York'],
    ['passaic', 'Passaic', 'NJ', 40.8568, -74.1285, 'America/New_York'],
    ['los-angeles', 'Los Angeles', 'CA', 34.05223, -118.24368, 'America/Los_Angeles'], // *
    ['san-francisco', 'San Francisco', 'CA', 37.77493, -122.41942, 'America/Los_Angeles'], // *
    ['oakland', 'Oakland', 'CA', 37.8044, -122.2712, 'America/Los_Angeles'],
    ['san-diego', 'San Diego', 'CA', 32.71533, -117.15726, 'America/Los_Angeles'], // *
    ['sacramento', 'Sacramento', 'CA', 38.5816, -121.4944, 'America/Los_Angeles'],
    ['chicago', 'Chicago', 'IL', 41.85003, -87.65005, 'America/Chicago'], // *
    ['skokie', 'Skokie', 'IL', 42.0324, -87.7416, 'America/Chicago'],
    ['miami', 'Miami', 'FL', 25.77427, -80.19366, 'America/New_York'], // *
    ['miami-beach', 'Miami Beach', 'FL', 25.7907, -80.13, 'America/New_York'],
    ['boca-raton', 'Boca Raton', 'FL', 26.3683, -80.1289, 'America/New_York'],
    ['fort-lauderdale', 'Fort Lauderdale', 'FL', 26.1224, -80.1373, 'America/New_York'],
    ['hollywood-fl', 'Hollywood', 'FL', 26.0112, -80.1495, 'America/New_York'],
    ['orlando', 'Orlando', 'FL', 28.5383, -81.3792, 'America/New_York'],
    ['tampa', 'Tampa', 'FL', 27.9506, -82.4572, 'America/New_York'],
    ['jacksonville', 'Jacksonville', 'FL', 30.3322, -81.6557, 'America/New_York'],
    ['boston', 'Boston', 'MA', 42.35843, -71.05977, 'America/New_York'], // *
    ['providence', 'Providence', 'RI', 41.82399, -71.41283, 'America/New_York'], // *
    ['hartford', 'Hartford', 'CT', 41.7658, -72.6734, 'America/New_York'],
    ['new-haven', 'New Haven', 'CT', 41.3083, -72.9279, 'America/New_York'],
    ['philadelphia', 'Philadelphia', 'PA', 39.95233, -75.16379, 'America/New_York'], // *
    ['pittsburgh', 'Pittsburgh', 'PA', 40.44062, -79.99589, 'America/New_York'], // *
    ['scranton', 'Scranton', 'PA', 41.409, -75.6624, 'America/New_York'],
    ['baltimore', 'Baltimore', 'MD', 39.29038, -76.61219, 'America/New_York'], // *
    ['silver-spring', 'Silver Spring', 'MD', 38.9907, -77.0261, 'America/New_York'],
    ['washington-dc', 'Washington', 'DC', 38.89511, -77.03637, 'America/New_York'], // *
    ['richmond', 'Richmond', 'VA', 37.5407, -77.436, 'America/New_York'],
    ['atlanta', 'Atlanta', 'GA', 33.749, -84.38798, 'America/New_York'], // *
    ['charlotte', 'Charlotte', 'NC', 35.2271, -80.8431, 'America/New_York'],
    ['raleigh', 'Raleigh', 'NC', 35.7796, -78.6382, 'America/New_York'],
    ['cleveland', 'Cleveland', 'OH', 41.4995, -81.69541, 'America/New_York'], // *
    ['cincinnati', 'Cincinnati', 'OH', 39.162, -84.45689, 'America/New_York'], // *
    ['columbus', 'Columbus', 'OH', 39.9612, -82.9988, 'America/New_York'],
    ['detroit', 'Detroit', 'MI', 42.33143, -83.04575, 'America/Detroit'], // *
    ['indianapolis', 'Indianapolis', 'IN', 39.7684, -86.1581, 'America/Indiana/Indianapolis'],
    ['milwaukee', 'Milwaukee', 'WI', 43.0389, -87.9065, 'America/Chicago'],
    ['minneapolis', 'Minneapolis', 'MN', 44.97997, -93.26384, 'America/Chicago'], // *
    ['st-louis', 'St. Louis', 'MO', 38.62727, -90.19789, 'America/Chicago'], // *
    ['kansas-city', 'Kansas City', 'MO', 39.0997, -94.5786, 'America/Chicago'],
    ['omaha', 'Omaha', 'NE', 41.25861, -95.93779, 'America/Chicago'], // *
    ['nashville', 'Nashville', 'TN', 36.1627, -86.7816, 'America/Chicago'],
    ['memphis', 'Memphis', 'TN', 35.1495, -90.049, 'America/Chicago'],
    ['new-orleans', 'New Orleans', 'LA', 29.9511, -90.0715, 'America/Chicago'],
    ['dallas', 'Dallas', 'TX', 32.78306, -96.80667, 'America/Chicago'], // *
    ['houston', 'Houston', 'TX', 29.76328, -95.36327, 'America/Chicago'], // *
    ['austin', 'Austin', 'TX', 30.26715, -97.74306, 'America/Chicago'], // *
    ['san-antonio', 'San Antonio', 'TX', 29.4241, -98.4936, 'America/Chicago'],
    ['denver', 'Denver', 'CO', 39.73915, -104.9847, 'America/Denver'], // *
    ['salt-lake-city', 'Salt Lake City', 'UT', 40.7608, -111.891, 'America/Denver'],
    ['albuquerque', 'Albuquerque', 'NM', 35.0844, -106.6504, 'America/Denver'],
    ['phoenix', 'Phoenix', 'AZ', 33.44838, -112.07404, 'America/Phoenix'], // *
    ['tucson', 'Tucson', 'AZ', 32.2226, -110.9747, 'America/Phoenix'],
    ['las-vegas', 'Las Vegas', 'NV', 36.17497, -115.13722, 'America/Los_Angeles'], // *
    ['seattle', 'Seattle', 'WA', 47.60621, -122.33207, 'America/Los_Angeles'], // *
    ['portland', 'Portland', 'OR', 45.52345, -122.67621, 'America/Los_Angeles'], // *
    ['anchorage', 'Anchorage', 'AK', 61.2181, -149.9003, 'America/Anchorage'],
    ['honolulu', 'Honolulu', 'HI', 21.3069, -157.8583, 'Pacific/Honolulu']
  ];

  function core(H) {
    function fmt(tz, o) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, o)); }
    function down(d) { return new Date(Math.floor(d.getTime() / 60000) * 60000); }
    function up(d) { return new Date(Math.ceil(d.getTime() / 60000) * 60000); }
    // רשימת "מועדים": שבת או חג, עם הדלקות הנרות, צאת השבת/החג וצאת לפי רבנו תם (72 דקות אחרי השקיעה)
    function occasions(p, mins, from, weeks) {
      var loc = new H.Location(p.lat, p.lon, false, p.tz, p.name);
      var start = new Date(from.getTime() - 2 * 864e5), end = new Date(from.getTime() + weeks * 7 * 864e5);
      var ev = H.HebrewCalendar.calendar({ start: start, end: end, location: loc, candlelighting: true, candleLightingMins: mins, sedrot: true, il: false });
      var out = [], cur = null, CHAG = H.flags.CHAG;
      ev.forEach(function (e) {
        var d = e.getDesc(), fl = e.getFlags();
        if (d === 'Havdalah') {
          if (!cur) return;
          cur.havdala = up(e.eventTime);
          var z = new H.Zmanim(loc, e.getDate().greg(), false);
          cur.rt = up(new Date(z.sunset().getTime() + 72 * 60000));
          if (!cur.names.length) cur.names.push('Shabbat');
          out.push(cur); cur = null;
        } else if (d === 'Candle lighting' && e.eventTime) {
          if (!cur) cur = { lights: [], names: [] };
          cur.lights.push(down(e.eventTime));
        } else if (cur && (fl & H.flags.PARSHA_HASHAVUA)) {
          cur.names.push(e.render('en'));
        } else if (cur && (fl & CHAG) && !(fl & H.flags.EREV)) {
          var n = e.render('en').replace(/ ([IV]+|\d{4})$/, '');
          if (cur.names.indexOf(n) < 0) cur.names.push(n);
        }
      });
      return out.filter(function (o) { return o.havdala > from; });
    }
    return { occasions: occasions, fmt: fmt };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { CITIES: CITIES, core: core }; return; }

  // ---- בדפדפן ----
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sh-place') || !root.hebcal) return;
  var C = core(root.hebcal), KEY = 'shabbat-en';
  var st = { city: 'new-york', mins: 18, gps: null };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  var q = (location.search.match(/[?&]city=([a-z-]+)/) || [])[1];
  if (q && CITIES.some(function (c) { return c[0] === q; })) { st.city = q; st.gps = null; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function used(how) { if (root.toolUsed) root.toolUsed('shabbat_en', { how: how }); }
  function place() {
    if (st.gps) return { name: 'My location', lat: st.gps[0], lon: st.gps[1], tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York', slug: '' };
    var c = CITIES.filter(function (x) { return x[0] === st.city; })[0] || CITIES[0];
    return { name: c[1] + ', ' + c[2], lat: c[3], lon: c[4], tz: c[5], slug: c[0] };
  }
  var sel = $('sh-place'), mins = $('sh-mins');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + ', ' + c[2] + '</option>'; }).join('') + '<option value="gps" hidden>My location</option>';
  sel.value = st.gps ? 'gps' : st.city; mins.value = String(st.mins);
  if (mins.value !== String(st.mins)) { st.mins = 18; mins.value = '18'; }

  function span(ms) {
    var m = Math.round(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60, a = [];
    if (d) a.push(d + (d === 1 ? ' day' : ' days')); if (h) a.push(h + (h === 1 ? ' hour' : ' hours')); if (!d && mm) a.push(mm + ' min');
    return a.join(' ') || 'less than a minute';
  }
  var lastList = [], lastP = null;
  function draw() {
    var p = place(), now = new Date(), list = C.occasions(p, +st.mins, now, 13);
    var T = C.fmt(p.tz, { hour: 'numeric', minute: '2-digit' }), D = C.fmt(p.tz, { weekday: 'short', month: 'short', day: 'numeric' });
    lastList = list; lastP = p;
    var w = list[0]; if (!w) return;
    var count = now < w.lights[0] ? 'Shabbat begins in ' + span(w.lights[0] - now) : now < w.havdala ? 'Shabbat Shalom! It ends at ' + T.format(w.havdala) : '';
    if (!/Shabbat|Parashat/.test(w.names.join(' '))) count = count.replace('Shabbat begins', 'Yom Tov begins').replace('Shabbat Shalom! It', 'Chag Sameach! It');
    $('sh-hero').innerHTML = '<p class="sh-where">' + p.name + ' · ' + w.names.join(' · ') + '</p>' +
      '<div class="sh-two"><div><strong>Candle lighting</strong><b>' + T.format(w.lights[0]) + '</b><span>' + D.format(w.lights[0]) + '<br>' + st.mins + ' min before sunset</span></div>' +
      '<div><strong>Shabbat ends (Havdalah)</strong><b>' + T.format(w.havdala) + '</b><span>' + D.format(w.havdala) + '<br>nightfall, 3 stars</span><span class="sh-rt">Rabbeinu Tam: ' + T.format(w.rt) + '</span></div></div>' +
      (w.lights.length > 1 ? '<p class="sh-note">Second night: light after ' + w.lights.slice(1).map(function (l) { return T.format(l) + ' (' + D.format(l) + ')'; }).join(', ') + ', from an existing flame.</p>' : '') +
      (count ? '<p class="sh-count">' + count + '</p>' : '');
    $('sh-rows').innerHTML = list.map(function (o, i) {
      return '<tr' + (i === 0 ? ' class="now"' : '') + '><th scope="row">' + o.names.join(' · ') + '</th><td>' + o.lights.map(function (l) { return D.format(l) + ' <b>' + T.format(l) + '</b>'; }).join('<br>') + '</td><td>' + D.format(o.havdala) + ' <b>' + T.format(o.havdala) + '</b></td><td>' + T.format(o.rt) + '</td></tr>';
    }).join('');
    $('sh-cap').textContent = 'Shabbat and Yom Tov times for ' + p.name + ' (' + p.tz.replace(/_/g, ' ') + ')';
    var sh = document.querySelector('[data-share-tool]');
    if (sh) sh.setAttribute('data-text', 'Shabbat times for ' + p.name + ': candle lighting ' + D.format(w.lights[0]) + ' ' + T.format(w.lights[0]) + ', Shabbat ends ' + T.format(w.havdala) + '. Free, no ads:');
    if (p.slug && history.replaceState) history.replaceState(null, '', location.pathname + (p.slug === 'new-york' ? '' : '?city=' + p.slug));
  }
  sel.addEventListener('change', function () { if (sel.value === 'gps') return; st.city = sel.value; st.gps = null; save(); used('city'); draw(); });
  mins.addEventListener('change', function () { st.mins = +mins.value; save(); used('mins'); draw(); });
  var gb = $('sh-gps');
  if (gb) gb.addEventListener('click', function () {
    if (!navigator.geolocation) { $('sh-gps-msg').textContent = 'This browser cannot share a location. Pick your city from the list.'; return; }
    $('sh-gps-msg').textContent = 'Finding your location…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      st.gps = [+pos.coords.latitude.toFixed(3), +pos.coords.longitude.toFixed(3)]; save(); sel.value = 'gps'; $('sh-gps-msg').textContent = ''; used('gps'); draw();
    }, function () { $('sh-gps-msg').textContent = 'Location was not shared. Pick your city from the list.'; }, { timeout: 15000, maximumAge: 6e5 });
  });
  var cp = $('sh-copy');
  if (cp) cp.addEventListener('click', function () {
    var T = C.fmt(lastP.tz, { hour: 'numeric', minute: '2-digit' }), D = C.fmt(lastP.tz, { weekday: 'short', month: 'short', day: 'numeric' });
    var txt = 'Shabbat times – ' + lastP.name + '\n' + lastList.slice(0, 6).map(function (o) { return o.names.join(' · ') + ': candles ' + D.format(o.lights[0]) + ' ' + T.format(o.lights[0]) + ', ends ' + T.format(o.havdala); }).join('\n') + '\n' + location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { cp.textContent = 'Copied ✓'; }, function () { cp.textContent = 'Copy failed'; });
    used('copy');
  });
  draw();
  setInterval(draw, 60000);
})(typeof window !== 'undefined' ? window : this);
