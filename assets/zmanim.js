// זמנים לבסיס: זמני היום ושבת לפי GPS או קואורדינטות, מ-@hebcal/core 6.14.7 (jsdelivr), כמו בלוח השבועי.
// המיקום האחרון נשמר בטלפון (localStorage) ולא נשלח לשום מקום.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('zm-form'), res = $('zm-res');
  if (!form) return;
  var H = window.hebcal, KEY = 'kodesh-zmanim';
  // הערים: אותה רשימה כמו בדפי השבת (assets/kodesh-shabat.js), ועוד אזורים לחיילים בשטח.
  var CITIES = [['31.778,35.235', 'ירושלים', 40], ['32.08,34.78', 'תל אביב', 20], ['32.79,34.99', 'חיפה', 30], ['31.25,34.79', 'באר שבע', 20], ['32.09,34.88', 'פתח תקווה', 20], ['31.97,34.79', 'ראשון לציון', 20], ['32.32,34.85', 'נתניה', 20], ['31.8,34.65', 'אשדוד', 20], ['32.08,34.83', 'בני ברק', 20], ['32.02,34.78', 'חולון', 20], ['32.07,34.82', 'רמת גן', 20], ['32.02,34.75', 'בת ים', 20], ['31.89,34.81', 'רחובות', 20], ['31.67,34.57', 'אשקלון', 20], ['31.71,35', 'בית שמש', 30], ['31.9,35', 'מודיעין', 20], ['32.17,34.84', 'הרצליה', 20], ['32.18,34.91', 'כפר סבא', 20], ['32.18,34.87', 'רעננה', 20], ['32.44,34.92', 'חדרה', 20], ['31.95,34.89', 'לוד', 20], ['31.93,34.87', 'רמלה', 20], ['31.61,34.77', 'קריית גת', 20], ['31.07,35.03', 'דימונה', 20], ['29.557,34.952', 'אילת', 20], ['31.53,35.1', 'חברון וקריית ארבע', 20], ['32.79,35.53', 'טבריה', 20], ['32.965,35.496', 'צפת', 20], ['32.61,35.29', 'עפולה', 20], ['32.93,35.08', 'עכו', 20], ['33.01,35.1', 'נהריה', 20], ['32.92,35.3', 'כרמיאל', 20], ['33.2,35.57', 'קריית שמונה', 20], ['31.35,34.3', 'עוטף עזה', 20], ['32.3,35.2', 'שומרון', 20], ['31.0,34.8', 'הנגב (צאלים)', 20], ['32.9,35.75', 'רמת הגולן', 20]], NCITY = 33;
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
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

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
  function exact(gl, d, ll, city) {
    var ss = new H.Zmanim(gl, d, false).sunset(), out = '<div class="zm-ex"><p><b>השקיעה בדיוק: <bdi>' + ts(ss) + '</bdi></b> (בגובה פני הים)</p>';
    var el = parseInt(st.elev, 10);
    if (!isNaN(el) && el > 0) {
      var ge = new H.GeoLocation('', ll[0], ll[1], el, 'Asia/Jerusalem'), ze = new H.Zmanim(ge, d, true);
      out += '<p>לפי גובה של ' + el + ' מטר: הנץ <bdi>' + ts(ze.sunrise()) + '</bdi>, שקיעה <bdi>' + ts(ze.sunset()) + '</bdi>. מגובה רואים את השמש ' + secs(Math.round((ze.sunset() - ss) / 1000)) + ' אחרי השקיעה בגובה פני הים.</p>';
    }
    if (city) out += '<p>זה מרכז ' + city[1] + '. בשכונות שונות באותה עיר השקיעה יכולה להשתנות בעשרות שניות, ובמקום גבוה בכמה דקות. לזמן של המקום המדויק: "המיקום שלי עכשיו".</p>';
    else {
      var near = CITIES.slice(0, NCITY).map(function (c) { var q = c[0].split(',').map(Number); return [c, q, km(ll, q)]; }).sort(function (a, b) { return a[2] - b[2]; })[0];
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
    var mins = st.candle === 'auto' ? (city ? city[2] : 20) : +st.candle;
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
