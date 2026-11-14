// זמנים לבסיס: זמני היום ושבת לפי GPS או קואורדינטות, מ-@hebcal/core 6.14.7 (jsdelivr), כמו בלוח השבועי.
// המיקום האחרון נשמר בטלפון (localStorage) ולא נשלח לשום מקום.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('zm-form'), res = $('zm-res');
  if (!form) return;
  var H = window.hebcal, KEY = 'kodesh-zmanim';
  // הערים: אותה רשימה כמו בדפי השבת (assets/kodesh-shabat.js), ועוד אזורים לחיילים בשטח.
  var CITIES = [['31.778,35.235', 'ירושלים', 40, 'yerushalaim'], ['32.08,34.78', 'תל אביב', 20, 'tel-aviv'], ['32.79,34.99', 'חיפה', 30, 'haifa'], ['31.25,34.79', 'באר שבע', 20, 'beer-sheva'], ['32.09,34.88', 'פתח תקווה', 20, 'petah-tikva'], ['31.97,34.79', 'ראשון לציון', 20, 'rishon-lezion'], ['32.32,34.85', 'נתניה', 20, 'netanya'], ['31.8,34.65', 'אשדוד', 20, 'ashdod'], ['32.08,34.83', 'בני ברק', 20, 'bnei-brak'], ['32.02,34.78', 'חולון', 20, 'holon'], ['32.07,34.82', 'רמת גן', 20, 'ramat-gan'], ['32.02,34.75', 'בת ים', 20, 'bat-yam'], ['31.89,34.81', 'רחובות', 20, 'rehovot'], ['31.67,34.57', 'אשקלון', 20, 'ashkelon'], ['31.71,35', 'בית שמש', 30, 'beit-shemesh'], ['31.9,35', 'מודיעין', 20, 'modiin'], ['32.17,34.84', 'הרצליה', 20, 'herzliya'], ['32.18,34.91', 'כפר סבא', 20, 'kfar-saba'], ['32.18,34.87', 'רעננה', 20, 'raanana'], ['32.44,34.92', 'חדרה', 20, 'hadera'], ['31.95,34.89', 'לוד', 20, 'lod'], ['31.93,34.87', 'רמלה', 20, 'ramla'], ['31.61,34.77', 'קריית גת', 20, 'kiryat-gat'], ['31.07,35.03', 'דימונה', 20, 'dimona'], ['29.557,34.952', 'אילת', 20, 'eilat'], ['31.53,35.1', 'חברון וקריית ארבע', 20, 'hevron'], ['32.79,35.53', 'טבריה', 20, 'tveria'], ['32.965,35.496', 'צפת', 20, 'tzfat'], ['32.61,35.29', 'עפולה', 20, 'afula'], ['32.93,35.08', 'עכו', 20, 'akko'], ['33.01,35.1', 'נהריה', 20, 'nahariya'], ['32.92,35.3', 'כרמיאל', 20, 'karmiel'], ['33.2,35.57', 'קריית שמונה', 20, 'kiryat-shmona'], ['31.35,34.3', 'עוטף עזה', 20], ['32.3,35.2', 'שומרון', 20], ['31.0,34.8', 'הנגב (צאלים)', 20], ['32.9,35.75', 'רמת הגולן', 20]], NCITY = 33;
  // בדף של עיר (/kodesh/zmanim/<עיר>/) הטופס מסומן data-city, והעיר קבועה. מעבר לעיר אחרת = מעבר לדף שלה.
  var FIXED = form.getAttribute('data-city') || '', PAGES = '/kodesh/zmanim/';
  var ZM = [
    ['עלות השחר', function (z) { return z.alotHaShachar(); }],
    ['זמן ציצית ותפילין (משיכיר)', function (z) { return z.misheyakir(); }],
    ['הנץ החמה', function (z) { return z.sunrise(); }, 1],
    ['סוף זמן קריאת שמע', function (z) { return z.sofZmanShma(); }, 0, function (z) { return z.sofZmanShmaMGA(); }],
    ['סוף זמן תפילה', function (z) { return z.sofZmanTfilla(); }, 0, function (z) { return z.sofZmanTfillaMGA(); }],
    ['חצות היום', function (z) { return z.chatzot(); }],
    ['מנחה גדולה', function (z) { return z.minchaGedola(); }],
    ['מנחה קטנה', function (z) { return z.minchaKetana(); }],
    ['פלג המנחה', function (z) { return z.plagHaMincha(); }],
    ['שקיעה', function (z) { return z.sunset(); }, 1],
    ['צאת הכוכבים', function (z) { return z.tzeit(8.5); }]
  ];
  var st = { place: CITIES[0][0], name: 'ירושלים', candle: 'auto', elev: '' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  if (FIXED) { var fc = CITIES.filter(function (c) { return c[3] === FIXED; })[0]; if (fc) { st.place = fc[0]; st.name = fc[1]; } }
  function save() {
    try {
      var o = st;
      if (FIXED) { o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; o.candle = st.candle; o.elev = st.elev; }  // בדף עיר לא דורסים את המקום השמור של הדף הראשי
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) {}
  }

  var sel = $('zm-place');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '<option value="manual">קואורדינטות (בסיס בלי שם)</option>' + '<option value="gps" hidden>המיקום שלי</option>';
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  $('zm-date').value = iso(new Date());
  $('zm-candle').value = st.candle || 'auto';
  $('zm-elev').value = st.elev || '';
  $('zm-elev').addEventListener('input', function () { var v = this.value.trim(); st.elev = /^-?\d{1,4}$/.test(v) ? v : ''; save(); draw(); });
  function syncSel() {
    var city = CITIES.some(function (c) { return c[0] === st.place; });
    sel.value = city ? st.place : (st.name === 'המיקום שלי' ? 'gps' : 'manual');
    $('zm-coords-row').hidden = sel.value !== 'manual';
    if (!city) $('zm-coords').value = st.place;
    if (sel.value === 'gps') $('zm-st').textContent = 'המיקום שנשמר: ' + st.place;
  }
  syncSel();

  sel.addEventListener('change', function () {
    var to = CITIES.filter(function (c) { return c[0] === sel.value; })[0];
    if (FIXED && to && to[3] && to[3] !== FIXED) { location.href = PAGES + to[3] + '/'; return; }
    if (sel.value === 'manual') { $('zm-coords-row').hidden = false; st.name = 'קואורדינטות'; if ($('zm-coords').value) st.place = $('zm-coords').value; }
    else { $('zm-coords-row').hidden = true; st.place = sel.value; st.name = sel.options[sel.selectedIndex].text; }
    save(); draw();
  });
  $('zm-coords').addEventListener('input', function () { var v = this.value.replace(/\s/g, ''); if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(v)) { st.place = v; st.name = 'קואורדינטות'; save(); draw(); } });
  $('zm-date').addEventListener('change', draw);
  $('zm-candle').addEventListener('change', function () { st.candle = this.value; save(); draw(); });
  $('zm-gps').addEventListener('click', function () {
    var s = $('zm-st');
    if (!navigator.geolocation) { s.textContent = 'הטלפון לא נותן מיקום. אפשר לבחור מקום או להקליד קואורדינטות.'; return; }
    s.textContent = 'מאתר…';
    navigator.geolocation.getCurrentPosition(function (p) {
      st.place = p.coords.latitude.toFixed(4) + ',' + p.coords.longitude.toFixed(4); st.name = 'המיקום שלי';
      if (p.coords.altitude != null && !isNaN(p.coords.altitude)) { st.elev = String(Math.round(p.coords.altitude)); $('zm-elev').value = st.elev; }
      save(); syncSel(); s.textContent = 'נמצא ✓ ' + st.place; draw();
      if (window.toolUsed) window.toolUsed('zmanim', { how: 'gps' });
    }, function () { s.textContent = 'לא קיבלתי מיקום. צריך לאשר מיקום לדפדפן, או לבחור מקום מהרשימה.'; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });

  var tf = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
  function t(d) { return d && !isNaN(d) ? tf.format(d) : '—'; }
  function down(d) { return new Date(Math.floor(d.getTime() / 60000) * 60000); }
  function up(d) { return new Date(Math.ceil(d.getTime() / 60000) * 60000); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  var tfs = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
  function ts(d) { return d && !isNaN(d) ? tfs.format(d) : '—'; }
  function km(a, b) { var r = Math.PI / 180, x = (b[1] - a[1]) * r * Math.cos((a[0] + b[0]) / 2 * r), y = (b[0] - a[0]) * r; return Math.sqrt(x * x + y * y) * 6371; }
  function secs(n) { var a = Math.abs(n), m = Math.floor(a / 60), s = a % 60; return (m ? m + ' דק׳' + (s ? ' ו-' : '') : '') + (s || !m ? s + ' שניות' : ''); }
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var lastText = '';

  // השקיעה בדיוק של שניות, וההבדל מהמקום הקרוב ברשימה: כל מקום מקבל זמן משלו.
  // העיר הקרובה (בדף עיר – העיר של הדף): [עיר, ק״מ]
  function nearest(ll) {
    var list = CITIES.slice(0, NCITY).filter(function (c) { return !FIXED || c[3] === FIXED; });
    return list.map(function (c) { return [c, km(ll, c[0].split(',').map(Number))]; }).sort(function (a, b) { return a[1] - b[1]; })[0];
  }
  function exact(gl, d, ll, city) {
    var ss = new H.Zmanim(gl, d, false).sunset(), out = '<div class="zm-ex"><p><b>השקיעה בדיוק: <bdi>' + ts(ss) + '</bdi></b> (בגובה פני הים)</p>';
    var el = parseInt(st.elev, 10);
    if (!isNaN(el) && el > 0) {
      var ge = new H.GeoLocation('', ll[0], ll[1], el, 'Asia/Jerusalem'), ze = new H.Zmanim(ge, d, true);
      out += '<p>לפי גובה של ' + el + ' מטר: הנץ <bdi>' + ts(ze.sunrise()) + '</bdi>, שקיעה <bdi>' + ts(ze.sunset()) + '</bdi>. מגובה רואים את השמש ' + secs(Math.round((ze.sunset() - ss) / 1000)) + ' אחרי השקיעה בגובה פני הים.</p>';
    }
    if (city) out += '<p>זה מרכז ' + city[1] + '. בשכונות שונות באותה עיר השקיעה יכולה להשתנות בעשרות שניות, ובמקום גבוה בכמה דקות. לזמן של המקום המדויק: "המיקום שלי עכשיו".</p>';
    else {
      var n0 = nearest(ll), near = [n0[0], n0[0][0].split(',').map(Number), n0[1]];
      var sc = new H.Zmanim(new H.GeoLocation('', near[1][0], near[1][1], 0, 'Asia/Jerusalem'), d, false).sunset(), df = Math.round((ss - sc) / 1000);
      out += '<p>מרכז ' + near[0][1] + ' (כ-' + Math.max(1, Math.round(near[2])) + ' ק״מ מכאן): שקיעה <bdi>' + ts(sc) + '</bdi>. ' + (df === 0 ? 'באותה שנייה.' : 'אצלכם השקיעה ' + secs(df) + ' ' + (df < 0 ? 'מוקדם' : 'מאוחר') + ' יותר.') + '</p>';
    }
    return out + '</div>';
  }

  function draw() {
    if (!H) return;
    var ll = String(st.place).split(',').map(Number);
    if (ll.length !== 2 || isNaN(ll[0]) || isNaN(ll[1])) ll = [31.778, 35.235];
    var gl = new H.GeoLocation(st.name || '', ll[0], ll[1], 0, 'Asia/Jerusalem');
    var d = parse($('zm-date').value || iso(new Date()));
    var z = new H.Zmanim(gl, d, false);
    var city = CITIES.filter(function (c) { return c[0] === st.place; })[0];
    var nc = city ? [city, 0] : nearest(ll);  // במיקום מהטלפון: עד 10 ק״מ מעיר הולכים לפי מנהג ההדלקה שלה (ירושלים 40)
    var mins = st.candle === 'auto' ? (nc[1] <= 10 ? nc[0][2] : 20) : +st.candle;
    // השבת הקרובה (אם היום שבת – השבת הזו)
    var fri = add(d, (5 - d.getDay() + 7) % 7); if (d.getDay() === 6) fri = add(d, -1);
    var sat = add(fri, 1);
    var candle = down(new Date(new H.Zmanim(gl, fri, false).sunset().getTime() - mins * 60000));
    var havdala = up(new H.Zmanim(gl, sat, false).tzeit(8.5));
    var parsha = '';
    try { var sd = H.getSedra(new H.HDate(sat).getFullYear(), true).lookup(new H.HDate(sat)); parsha = sd.chag ? '' : 'פרשת ' + sd.parsha.map(function (p) { return H.Locale.gettext(p, 'he-x-NoNikud'); }).join('-'); } catch (e) {}
    var hd = new H.HDate(d).renderGematriya(true);
    var where = city ? city[1] : (st.name === 'המיקום שלי' ? 'לפי המיקום שלי' : 'לפי קואורדינטות') + ' (' + ll[0].toFixed(3) + ', ' + ll[1].toFixed(3) + ')';
    var rows = ZM.map(function (x) {
      var main = t(x[1](z)), alt = x[3] ? ' <small>מג״א: ' + t(x[3](z)) + '</small>' : '';
      return '<tr' + (x[2] ? ' class="hl"' : '') + '><td>' + x[0] + alt + '</td><td class="t">' + main + '</td></tr>';
    }).join('');
    res.innerHTML = '<h3>יום ' + DAYS[d.getDay()] + ', ' + hd + '</h3><p class="zm-st">' + where + '</p>' +
      '<table class="zm-tbl">' + rows + '</table>' + exact(gl, d, ll, city) +
      '<h3 style="margin-top:1.2rem">שבת' + (parsha ? ' ' + parsha : '') + '</h3>' +
      '<div class="zm-shab"><div><b>' + t(candle) + '</b><span>הדלקת נרות, שישי<br>(' + mins + ' דק׳ לפני השקיעה)</span></div><div><b>' + t(havdala) + '</b><span>צאת השבת</span></div></div>';
    lastText = 'זמני היום – יום ' + DAYS[d.getDay()] + ', ' + hd + '\n' + where + '\n\n' +
      ZM.map(function (x) { return x[0] + ': ' + t(x[1](z)); }).join('\n') +
      '\n\nשבת' + (parsha ? ' ' + parsha : '') + ':\nהדלקת נרות: ' + t(candle) + '\nצאת השבת: ' + t(havdala) +
      '\n\nמכלי קודש: ' + location.origin + '/kodesh/zmanim/';
    $('zm-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(lastText);
  }
  $('zm-wa').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('zmanim', { how: 'wa' }); });
  $('zm-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(lastText) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
    if (window.toolUsed) window.toolUsed('zmanim', { how: 'copy' });
  });
  function start() { H = window.hebcal; draw(); }
  if (H) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
})();
