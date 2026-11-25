/* Время зажигания свечей в Израиле по-русски (/kodesh/shabat/ru/).
   זמני הדלקת נרות וצאת שבת ברוסית, לערי ישראל. החישוב: hebcal-core (שקיעה, צאת הכוכבים 8.5°), הכל בדפדפן.
   אותו קוד רץ גם ב-node (tools/shabbat_ru.js) כדי לכתוב לוח קבוע בתוך הדף לגוגל.
   שמות הפרשות ברוסית: assets/kodesh-ivri-ru.js (נטען לפני הקובץ הזה). */
(function (root) {
  'use strict';
  var TZ = 'Asia/Jerusalem';
  // [slug, город, широта, долгота, минут до захода]. אותן ערים ואותן דקות כמו בדף העברי (assets/kodesh-shabat.js).
  var CITIES = [
    ['yerushalaim', 'Иерусалим', 31.778, 35.235, 40],
    ['tel-aviv', 'Тель-Авив', 32.08, 34.78, 20],
    ['haifa', 'Хайфа', 32.79, 34.99, 30],
    ['beer-sheva', 'Беэр-Шева', 31.25, 34.79, 20],
    ['petah-tikva', 'Петах-Тиква', 32.09, 34.88, 20],
    ['rishon-lezion', 'Ришон-ле-Цион', 31.97, 34.79, 20],
    ['netanya', 'Нетания', 32.32, 34.85, 20],
    ['ashdod', 'Ашдод', 31.8, 34.65, 20],
    ['bnei-brak', 'Бней-Брак', 32.08, 34.83, 20],
    ['holon', 'Холон', 32.02, 34.78, 20],
    ['ramat-gan', 'Рамат-Ган', 32.07, 34.82, 20],
    ['bat-yam', 'Бат-Ям', 32.02, 34.75, 20],
    ['rehovot', 'Реховот', 31.89, 34.81, 20],
    ['ashkelon', 'Ашкелон', 31.67, 34.57, 20],
    ['beit-shemesh', 'Бейт-Шемеш', 31.71, 35.0, 30],
    ['modiin', 'Модиин', 31.9, 35.0, 20],
    ['herzliya', 'Герцлия', 32.17, 34.84, 20],
    ['kfar-saba', 'Кфар-Сава', 32.18, 34.91, 20],
    ['raanana', 'Раанана', 32.18, 34.87, 20],
    ['hadera', 'Хадера', 32.44, 34.92, 20],
    ['lod', 'Лод', 31.95, 34.89, 20],
    ['ramla', 'Рамла', 31.93, 34.87, 20],
    ['kiryat-gat', 'Кирьят-Гат', 31.61, 34.77, 20],
    ['dimona', 'Димона', 31.07, 35.03, 20],
    ['eilat', 'Эйлат', 29.557, 34.952, 20],
    ['hevron', 'Хеврон и Кирьят-Арба', 31.53, 35.1, 20],
    ['tveria', 'Тверия', 32.79, 35.53, 20],
    ['tzfat', 'Цфат', 32.965, 35.496, 20],
    ['afula', 'Афула', 32.61, 35.29, 20],
    ['akko', 'Акко', 32.93, 35.08, 20],
    ['nahariya', 'Нагария', 33.01, 35.1, 20],
    ['karmiel', 'Кармиэль', 32.92, 35.3, 20],
    ['kiryat-shmona', 'Кирьят-Шмона', 33.2, 35.57, 20]
  ];
  var CHAGIM = { 'Rosh Hashana': 'Рош ха-Шана', 'Yom Kippur': 'Йом Кипур', 'Sukkot': 'Суккот', 'Shmini Atzeret': 'Шмини Ацерет и Симхат Тора',
    'Pesach': 'Песах', 'Shavuot': 'Шавуот' };

  function core(H, L) {
    var P = (L && L.PARSHA) || {};
    function fmt(o) { return new Intl.DateTimeFormat('ru-RU', Object.assign({ timeZone: TZ }, o)); }
    function down(d) { return new Date(Math.floor(d.getTime() / 60000) * 60000); }
    function up(d) { return new Date(Math.ceil(d.getTime() / 60000) * 60000); }
    function one(n) { return P[n] || n; }
    // "Parashat Matot-Masei" -> "Матот – Масей"; "Lech-Lecha" נשאר שם אחד
    function parsha(en) {
      var n = en.replace(/^Parashat /, '').replace(/[’ʼ]/g, "'");
      if (P[n]) return 'Глава ' + P[n];
      var i = n.indexOf('-');
      while (i > 0) {
        var a = n.slice(0, i), b = n.slice(i + 1);
        if (P[a] && P[b]) return 'Главы ' + P[a] + ' – ' + P[b];
        i = n.indexOf('-', i + 1);
      }
      return 'Глава ' + one(n);
    }
    // רשימת "מועדים": שבת או חג, עם הדלקות הנרות, צאת השבת/החג וצאת לפי רבנו תם (72 דקות אחרי השקיעה). מנהג ארץ ישראל (il: true).
    function occasions(p, mins, from, weeks) {
      var loc = new H.Location(p.lat, p.lon, true, TZ, p.name);
      var start = new Date(from.getTime() - 2 * 864e5), end = new Date(from.getTime() + weeks * 7 * 864e5);
      var ev = H.HebrewCalendar.calendar({ start: start, end: end, location: loc, candlelighting: true, candleLightingMins: mins, sedrot: true, il: true });
      var out = [], cur = null, CHAG = H.flags.CHAG;
      ev.forEach(function (e) {
        var d = e.getDesc(), fl = e.getFlags();
        if (d === 'Havdalah') {
          if (!cur) return;
          cur.havdala = up(e.eventTime);
          var z = new H.Zmanim(loc, e.getDate().greg(), false);
          cur.rt = up(new Date(z.sunset().getTime() + 72 * 60000));
          cur.shabbat = !cur.names.length || cur.names.some(function (n) { return /^Глав/.test(n); });
          if (!cur.names.length) cur.names.push('Шаббат');
          out.push(cur); cur = null;
        } else if (d === 'Candle lighting' && e.eventTime) {
          if (!cur) cur = { lights: [], names: [] };
          cur.lights.push(down(e.eventTime));
        } else if (cur && (fl & H.flags.PARSHA_HASHAVUA)) {
          cur.names.push(parsha(e.render('en')));
        } else if (cur && (fl & CHAG) && !(fl & H.flags.EREV)) {
          var n = e.render('en').replace(/ ([IV]+|\d{4})$/, '');
          n = CHAGIM[n] || n;
          if (cur.names.indexOf(n) < 0) cur.names.push(n);
        }
      });
      return out.filter(function (o) { return o.havdala > from; });
    }
    return { occasions: occasions, fmt: fmt };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { CITIES: CITIES, core: core, TZ: TZ }; return; }

  // ---- в браузере ----
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sh-place') || !root.hebcal) return;
  var C = core(root.hebcal, root.KODESH_IVRI_L), KEY = 'shabbat-ru', MINS = [18, 20, 22, 30, 40];
  var st = { city: 'yerushalaim', mins: 40, gps: null };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  var q = (location.search.match(/[?&]city=([a-z-]+)/) || [])[1];
  function city(slug) { return CITIES.filter(function (x) { return x[0] === slug; })[0]; }
  if (q && city(q)) { st.city = q; st.gps = null; st.mins = city(q)[4]; }
  if (MINS.indexOf(+st.mins) < 0) st.mins = (city(st.city) || CITIES[0])[4];
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function used(how) { if (root.toolUsed) root.toolUsed('shabbat_ru', { how: how }); }
  function place() {
    if (st.gps) return { name: 'Моё местоположение', lat: st.gps[0], lon: st.gps[1], slug: '' };
    var c = city(st.city) || CITIES[0];
    return { name: c[1], lat: c[2], lon: c[3], slug: c[0] };
  }
  var sel = $('sh-place'), mins = $('sh-mins');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '<option value="gps" hidden>Моё местоположение</option>';
  sel.value = st.gps ? 'gps' : st.city; mins.value = String(st.mins);

  function pl(n, a, b, c) { var x = n % 10, y = n % 100; return n + ' ' + (x === 1 && y !== 11 ? a : x >= 2 && x <= 4 && (y < 12 || y > 14) ? b : c); }
  function span(ms) {
    var m = Math.round(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60, a = [];
    if (d) a.push(pl(d, 'день', 'дня', 'дней')); if (h) a.push(pl(h, 'час', 'часа', 'часов')); if (!d && mm) a.push(mm + ' мин');
    return a.join(' ') || 'меньше минуты';
  }
  var TO = { hour: '2-digit', minute: '2-digit' }, DO = { weekday: 'short', day: 'numeric', month: 'long' };
  var lastList = [], lastP = null;
  function draw() {
    var p = place(), now = new Date(), list = C.occasions(p, +st.mins, now, 13);
    var T = C.fmt(TO), D = C.fmt(DO);
    lastList = list; lastP = p;
    var w = list[0]; if (!w) return;
    var count = now < w.lights[0] ? (w.shabbat ? 'До зажигания субботних свечей: ' : 'До зажигания праздничных свечей: ') + span(w.lights[0] - now)
      : now < w.havdala ? (w.shabbat ? 'Шаббат шалом! Суббота закончится в ' : 'Хаг самеах! Праздник закончится в ') + T.format(w.havdala) : '';
    $('sh-hero').innerHTML = '<p class="sh-where">' + p.name + ' · ' + w.names.join(' · ') + '</p>' +
      '<div class="sh-two"><div><strong>Зажигание свечей</strong><b>' + T.format(w.lights[0]) + '</b><span>' + D.format(w.lights[0]) + '<br>за ' + st.mins + ' мин до захода солнца</span></div>' +
      '<div><strong>Исход субботы (авдала)</strong><b>' + T.format(w.havdala) + '</b><span>' + D.format(w.havdala) + '<br>выход звёзд</span><span class="sh-rt">По Рабейну Таму: ' + T.format(w.rt) + '</span></div></div>' +
      (w.lights.length > 1 ? '<p class="sh-note">Второй вечер праздника: свечи зажигают после ' + w.lights.slice(1).map(function (l) { return T.format(l) + ' (' + D.format(l) + ')'; }).join(', ') + ', от уже горящего огня.</p>' : '') +
      (count ? '<p class="sh-count">' + count + '</p>' : '');
    $('sh-rows').innerHTML = list.map(function (o, i) {
      return '<tr' + (i === 0 ? ' class="now"' : '') + '><th scope="row">' + o.names.join(' · ') + '</th><td>' + o.lights.map(function (l) { return D.format(l) + ' <b>' + T.format(l) + '</b>'; }).join('<br>') + '</td><td>' + D.format(o.havdala) + ' <b>' + T.format(o.havdala) + '</b></td><td>' + T.format(o.rt) + '</td></tr>';
    }).join('');
    $('sh-cap').textContent = 'Время зажигания свечей и исхода субботы: ' + p.name + ' (время Израиля)';
    var sh = document.querySelector('[data-share-tool]');
    if (sh) sh.setAttribute('data-text', 'Время зажигания свечей, ' + p.name + ': ' + D.format(w.lights[0]) + ' в ' + T.format(w.lights[0]) + ', исход субботы в ' + T.format(w.havdala) + '. Бесплатно, без рекламы:');
    if (p.slug && history.replaceState) history.replaceState(null, '', location.pathname + (p.slug === 'yerushalaim' ? '' : '?city=' + p.slug));
  }
  sel.addEventListener('change', function () {
    if (sel.value === 'gps') return;
    st.city = sel.value; st.gps = null; st.mins = city(st.city)[4]; mins.value = String(st.mins); save(); used('city'); draw();
  });
  mins.addEventListener('change', function () { st.mins = +mins.value; save(); used('mins'); draw(); });
  var gb = $('sh-gps');
  if (gb) gb.addEventListener('click', function () {
    if (!navigator.geolocation) { $('sh-gps-msg').textContent = 'Браузер не даёт местоположение. Выберите город из списка.'; return; }
    $('sh-gps-msg').textContent = 'Определяю местоположение…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      st.gps = [+pos.coords.latitude.toFixed(3), +pos.coords.longitude.toFixed(3)]; save(); sel.value = 'gps'; $('sh-gps-msg').textContent = ''; used('gps'); draw();
    }, function () { $('sh-gps-msg').textContent = 'Местоположение не получено. Выберите город из списка.'; }, { timeout: 15000, maximumAge: 6e5 });
  });
  var cp = $('sh-copy');
  if (cp) cp.addEventListener('click', function () {
    var T = C.fmt(TO), D = C.fmt(DO);
    var txt = 'Время зажигания свечей – ' + lastP.name + '\n' + lastList.slice(0, 6).map(function (o) { return o.names.join(' · ') + ': свечи ' + D.format(o.lights[0]) + ' в ' + T.format(o.lights[0]) + ', исход в ' + T.format(o.havdala); }).join('\n') + '\n' + location.href;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { cp.textContent = 'Скопировано ✓'; }, function () { cp.textContent = 'Не удалось скопировать'; });
    used('copy');
  });
  draw();
  setInterval(draw, 60000);
})(typeof window !== 'undefined' ? window : this);
