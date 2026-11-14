// כניסת שבת וצאת שבת לפי עיר (/kodesh/shabat/ ודף לכל עיר).
// אותו חישוב בדיוק כמו ב"זמנים לבסיס" (assets/zmanim.js), מ-@hebcal/core 6.14.7:
//   הדלקת נרות = שקיעה מישורית בגובה פני הים, פחות X דקות (ירושלים 40, חיפה ובית שמש 30, שאר המקומות 20), מעוגל למטה לדקה.
//   צאת השבת  = השמש 8.5° מתחת לאופק, מעוגל למעלה לדקה.
//   רבנו תם   = 72 דקות שוות אחרי השקיעה המישורית של שבת, מעוגל למעלה לדקה (כמו בלוחות הנפוצים בארץ).
// הקובץ נטען גם ב-node (tools/shabat_pages.js) כדי שהטבלאות שבדף עצמו ייצאו מאותו קוד.
(function (root) {
  'use strict';
  // [כתובת, שם, "ב..." , רוחב, אורך, דקות לפני השקיעה]. הדקות והמיקומים כמו בשאר הכלים באתר (zmanim.js, beit-knesset.js).
  var CITIES = [
    ['yerushalaim', 'ירושלים', 'בירושלים', 31.778, 35.235, 40],
    ['tel-aviv', 'תל אביב', 'בתל אביב', 32.08, 34.78, 20],
    ['haifa', 'חיפה', 'בחיפה', 32.79, 34.99, 30],
    ['beer-sheva', 'באר שבע', 'בבאר שבע', 31.25, 34.79, 20],
    ['petah-tikva', 'פתח תקווה', 'בפתח תקווה', 32.09, 34.88, 20],
    ['rishon-lezion', 'ראשון לציון', 'בראשון לציון', 31.97, 34.79, 20],
    ['netanya', 'נתניה', 'בנתניה', 32.32, 34.85, 20],
    ['ashdod', 'אשדוד', 'באשדוד', 31.8, 34.65, 20],
    ['bnei-brak', 'בני ברק', 'בבני ברק', 32.08, 34.83, 20],
    ['holon', 'חולון', 'בחולון', 32.02, 34.78, 20],
    ['ramat-gan', 'רמת גן', 'ברמת גן', 32.07, 34.82, 20],
    ['bat-yam', 'בת ים', 'בבת ים', 32.02, 34.75, 20],
    ['rehovot', 'רחובות', 'ברחובות', 31.89, 34.81, 20],
    ['ashkelon', 'אשקלון', 'באשקלון', 31.67, 34.57, 20],
    ['beit-shemesh', 'בית שמש', 'בבית שמש', 31.71, 35.0, 30],
    ['modiin', 'מודיעין', 'במודיעין', 31.9, 35.0, 20],
    ['herzliya', 'הרצליה', 'בהרצליה', 32.17, 34.84, 20],
    ['kfar-saba', 'כפר סבא', 'בכפר סבא', 32.18, 34.91, 20],
    ['raanana', 'רעננה', 'ברעננה', 32.18, 34.87, 20],
    ['hadera', 'חדרה', 'בחדרה', 32.44, 34.92, 20],
    ['lod', 'לוד', 'בלוד', 31.95, 34.89, 20],
    ['ramla', 'רמלה', 'ברמלה', 31.93, 34.87, 20],
    ['kiryat-gat', 'קריית גת', 'בקריית גת', 31.61, 34.77, 20],
    ['dimona', 'דימונה', 'בדימונה', 31.07, 35.03, 20],
    ['eilat', 'אילת', 'באילת', 29.557, 34.952, 20],
    ['hevron', 'חברון וקריית ארבע', 'בחברון ובקריית ארבע', 31.53, 35.1, 20],
    ['tveria', 'טבריה', 'בטבריה', 32.79, 35.53, 20],
    ['tzfat', 'צפת', 'בצפת', 32.965, 35.496, 20],
    ['afula', 'עפולה', 'בעפולה', 32.61, 35.29, 20],
    ['akko', 'עכו', 'בעכו', 32.93, 35.08, 20],
    ['nahariya', 'נהריה', 'בנהריה', 33.01, 35.1, 20],
    ['karmiel', 'כרמיאל', 'בכרמיאל', 32.92, 35.3, 20],
    ['kiryat-shmona', 'קריית שמונה', 'בקריית שמונה', 33.2, 35.57, 20]
  ];
  var HOME = '/kodesh/shabat/';

  function core(H) {
    var tf = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jerusalem' });
    function t(d) { return d && !isNaN(d) ? tf.format(d) : '—'; }
    function down(d) { return new Date(Math.floor(d.getTime() / 60000) * 60000); }
    function up(d) { return new Date(Math.ceil(d.getTime() / 60000) * 60000); }
    function add(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function noon(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
    function dm(d) { return d.getDate() + '.' + (d.getMonth() + 1); }
    function he(s) { return H.Locale.gettext(s, 'he-x-NoNikud'); }
    function chagOn(d) {
      var ev = H.HebrewCalendar.getHolidaysOnDate(new H.HDate(d), true) || [];
      for (var i = 0; i < ev.length; i++) if (ev[i].getFlags() & (H.flags.CHAG | H.flags.CHOL_HAMOED)) return ev[i];
      return null;
    }
    // שבת אחת במקום אחד
    function week(lat, lon, fri, mins) {
      var gl = new H.GeoLocation('', lat, lon, 0, 'Asia/Jerusalem'), sat = add(fri, 1), hd = new H.HDate(sat);
      var w = {
        fri: fri, sat: sat, mins: mins,
        candle: down(new Date(new H.Zmanim(gl, fri, false).sunset().getTime() - mins * 60000)),
        havdala: up(new H.Zmanim(gl, sat, false).tzeit(8.5)),
        rt: up(new Date(new H.Zmanim(gl, sat, false).sunset().getTime() + 72 * 60000)),
        hdate: hd.renderGematriya(true), name: '', title: 'שבת', notes: []
      };
      try {
        var sd = H.getSedra(hd.getFullYear(), true).lookup(hd);
        if (!sd.chag) { w.name = sd.parsha.map(he).join('-'); w.title = 'שבת פרשת ' + w.name; }
        else {
          var e = chagOn(sat);
          if (e) { w.name = ((e.getFlags() & H.flags.CHOL_HAMOED) ? 'חול המועד ' : '') + he(e.basename()); w.title = 'שבת ' + w.name; }
        }
        var ef = chagOn(fri), es = chagOn(add(sat, 1));
        if (ef && (ef.getFlags() & H.flags.CHAG)) w.notes.push('יום שישי הזה הוא יום טוב (' + he(ef.basename()) + ').');
        if (es && (es.getFlags() & H.flags.CHAG)) w.notes.push('מוצאי השבת הזו הוא ליל יום טוב (' + he(es.basename()) + ').');
      } catch (x) {}
      return w;
    }
    // יום שישי של השבת הקרובה. בשבת עצמה: השבת הזו, ואחרי צאת השבת: השבת הבאה.
    function firstFriday(now, lat, lon) {
      var d = noon(now), fri = d.getDay() === 6 ? add(d, -1) : add(d, (5 - d.getDay() + 7) % 7);
      if (d.getDay() === 6 && now > week(lat, lon, fri, 20).havdala) fri = add(fri, 7);
      return fri;
    }
    function weeks(lat, lon, fri, mins, n) { var a = []; for (var i = 0; i < n; i++) a.push(week(lat, lon, add(fri, 7 * i), mins)); return a; }
    function span(ms) {
      var m = Math.max(1, Math.round(ms / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
      function hrs(n) { return n === 1 ? 'שעה' : n === 2 ? 'שעתיים' : n + ' שעות'; }
      if (d >= 2) return d + ' ימים' + (h % 24 ? ' ו' + (h % 24 === 1 || h % 24 === 2 ? '' : '-') + hrs(h % 24) : '');
      if (d === 1) return 'יום' + (h % 24 ? ' ו' + (h % 24 === 1 || h % 24 === 2 ? '' : '-') + hrs(h % 24) : '');
      if (h >= 1) return hrs(h) + (m % 60 ? ' ו-' + (m % 60) + ' דקות' : '');
      return m === 1 ? 'דקה' : m + ' דקות';
    }
    function countText(w, now) {
      if (!now) return '';
      if (now < w.candle) return 'השבת נכנסת בעוד ' + span(w.candle - now);
      if (now < w.havdala) return 'שבת שלום! השבת יוצאת ב-' + t(w.havdala);
      return '';
    }
    // ---- HTML (משמש גם את הדף החי וגם את המחולל) ----
    function heroHtml(w, where, now) {
      var c = countText(w, now);
      return '<h2 class="sb-h">' + w.title + '</h2>' +
        '<p class="sb-st">' + where + ' · שבת, ' + w.hdate + ' (' + dm(w.sat) + '.' + w.sat.getFullYear() + ')</p>' +
        '<div class="sb-two"><div><strong>כניסת שבת</strong><b>' + t(w.candle) + '</b><span>הדלקת נרות, יום שישי ' + dm(w.fri) + '<br>' + w.mins + ' דק׳ לפני השקיעה</span></div>' +
        '<div><strong>צאת שבת</strong><b>' + t(w.havdala) + '</b><span>מוצאי שבת ' + dm(w.sat) + '<br>צאת הכוכבים</span><span class="sb-rt">לפי רבנו תם: <bdi>' + t(w.rt) + '</bdi></span></div></div>' +
        (c ? '<p class="sb-count">' + c + '</p>' : '') +
        w.notes.map(function (n) { return '<p class="sb-note">' + n + '</p>'; }).join('');
    }
    function weeksHtml(list) {
      return '<table class="sb-tbl"><thead><tr><th scope="col">שבת</th><th scope="col" class="c">כניסה</th><th scope="col" class="c">יציאה</th><th scope="col" class="c rt"><abbr title="לפי רבנו תם">ר״ת</abbr></th></tr></thead><tbody>' +
        list.map(function (w, i) {
          return '<tr' + (i === 0 ? ' class="now"' : '') + '><th scope="row">' + (w.name || 'שבת') + '<small>' + w.hdate + ' · ' + dm(w.sat) + '</small></th><td class="t">' + t(w.candle) + '</td><td class="t">' + t(w.havdala) + '</td><td class="t rt">' + t(w.rt) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    function citiesHtml(fri) {
      return '<table class="sb-tbl"><thead><tr><th scope="col">עיר</th><th scope="col" class="c">כניסת שבת</th><th scope="col" class="c">צאת שבת</th><th scope="col" class="c rt">רבנו תם</th></tr></thead><tbody>' +
        CITIES.map(function (c) {
          var w = week(c[3], c[4], fri, c[5]);
          return '<tr><th scope="row"><a href="' + HOME + c[0] + '/">' + c[1] + '</a></th><td class="t">' + t(w.candle) + '</td><td class="t">' + t(w.havdala) + '</td><td class="t rt">' + t(w.rt) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    function shareText(w, where, url) {
      return w.title + ' (' + w.hdate + ')\n' + where + '\n\nכניסת שבת (הדלקת נרות): ' + t(w.candle) + '\nצאת שבת: ' + t(w.havdala) + '\nצאת שבת לפי רבנו תם: ' + t(w.rt) +
        (w.notes.length ? '\n' + w.notes.join('\n') : '') + '\n\nזמני השבת לכל עיר: ' + url;
    }
    return { t: t, dm: dm, add: add, week: week, weeks: weeks, firstFriday: firstFriday, heroHtml: heroHtml, weeksHtml: weeksHtml, citiesHtml: citiesHtml, shareText: shareText, countText: countText };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { CITIES: CITIES, HOME: HOME, core: core }; return; }

  // ---------------- הדף עצמו ----------------
  var $ = function (id) { return document.getElementById(id); };
  var box = $('sb');
  if (!box) return;
  var KEY = 'kodesh-shabat', fixed = box.getAttribute('data-city') || '', C = null, shown = 12, lastText = '', lastSay = '';
  function say() { var l = $('sb-live'); if (l) l.textContent = lastSay; }
  var st = { city: 'yerushalaim', gps: null, candle: 'auto' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  // בדף של עיר: אפשר מיקום מדויק בתוך העיר. הוא נשמר לכל עיר בנפרד (gps:<עיר>), ולא נוגע במיקום של הדף הראשי.
  if (fixed) { st.city = fixed; st.gps = (sv && sv['gps:' + fixed]) || null; }
  function save() { if (fixed) { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; o.candle = st.candle; o['gps:' + fixed] = st.gps; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} return; } try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  // העיר הקרובה למיקום (בדף עיר – העיר של הדף). עד 10 ק״מ ממנה הולכים לפי מנהג ההדלקה שלה (ירושלים 40, חיפה 30).
  function nearCity(lat, lon) {
    if (fixed) return [cityOf(fixed), 0];
    var best = CITIES[0], bd = 1e9;
    CITIES.forEach(function (c) { var r = Math.PI / 180, x = (c[4] - lon) * r * Math.cos((c[3] + lat) / 2 * r), y = (c[3] - lat) * r, d = Math.sqrt(x * x + y * y) * 6371; if (d < bd) { bd = d; best = c; } });
    return [best, bd];
  }
  function used(how) { if (window.toolUsed) window.toolUsed('shabat', { how: how }); }
  function cityOf(slug) { return CITIES.filter(function (c) { return c[0] === slug; })[0] || CITIES[0]; }
  function place() {
    if (st.gps) { var nc = nearCity(st.gps[0], st.gps[1]); return { name: fixed ? 'המיקום שלי ' + nc[0][2] : 'לפי המיקום שלי', lat: st.gps[0], lon: st.gps[1], mins: nc[1] <= 10 ? nc[0][5] : 20, url: HOME + (fixed ? fixed + '/' : ''), ref: nc }; }
    var c = cityOf(st.city);
    return { name: c[1], lat: c[3], lon: c[4], mins: c[5], url: HOME + c[0] + '/' };
  }
  var sel = $('sb-place'), cand = $('sb-candle');
  sel.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + (fixed ? '' : '<option value="gps" hidden>המיקום שלי</option>');
  sel.value = st.gps && !fixed ? 'gps' : cityOf(st.city)[0];
  cand.value = st.candle || 'auto';
  if (cand.value !== String(st.candle || 'auto')) { st.candle = 'auto'; cand.value = 'auto'; }

  function draw() {
    if (!C) return;
    var p = place(), now = new Date(), mins = st.candle === 'auto' ? p.mins : +st.candle;
    var fri = C.firstFriday(now, p.lat, p.lon), list = C.weeks(p.lat, p.lon, fri, mins, shown), w = list[0];
    $('sb-res').innerHTML = C.heroHtml(w, p.name, now);
    $('sb-weeks').innerHTML = C.weeksHtml(list);
    $('sb-more').hidden = shown >= 60;
    if ($('sb-cities')) { $('sb-cities').innerHTML = C.citiesHtml(fri); var cap = $('sb-cities-h'); if (cap) cap.textContent = 'זמני השבת בכל הערים, ' + w.title.replace(/^שבת /, '') + ' (' + C.dm(w.sat) + ')'; }
    lastText = C.shareText(w, p.name, location.origin + p.url);
    lastSay = p.name + ', ' + w.title + ': כניסת שבת ' + C.t(w.candle) + ', צאת שבת ' + C.t(w.havdala) + ', לפי רבנו תם ' + C.t(w.rt);
    $('sb-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(lastText);
    diff(p, w, mins);
  }
  // כמה המיקום המדויק שונה ממרכז העיר הקרובה, בשניות (לפני העיגול לדקה)
  function diff(p, w, mins) {
    var el = $('sb-diff'), back = $('sb-center');
    if (back) back.hidden = !(fixed && st.gps);
    if (!el) return;
    if (!p.ref || p.ref[1] > 25) { el.hidden = true; return; }
    var H = window.hebcal, c = p.ref[0];
    function z(lat, lon, d) { return new H.Zmanim(new H.GeoLocation('', lat, lon, 0, 'Asia/Jerusalem'), d, false); }
    var dSet = Math.round((z(p.lat, p.lon, w.fri).sunset() - z(c[3], c[4], w.fri).sunset()) / 1000);
    var dOut = Math.round((z(p.lat, p.lon, w.sat).tzeit(8.5) - z(c[3], c[4], w.sat).tzeit(8.5)) / 1000);
    var cw = C.week(c[3], c[4], w.fri, mins);
    function sec(n) { if (n === 0) return 'באותה שנייה'; var a = Math.abs(n), m = Math.floor(a / 60), s = a % 60; return (m ? m + ' דק׳' + (s ? ' ו-' + s + ' שנ׳' : '') : s + ' שניות') + (n < 0 ? ' מוקדם יותר' : ' מאוחר יותר'); }
    el.innerHTML = 'לעומת מרכז ' + c[1] + ': השקיעה ביום שישי אצלכם ' + sec(dSet) + ', וצאת השבת ' + sec(dOut) + '. במרכז העיר: הדלקה <bdi>' + C.t(cw.candle) + '</bdi>, יציאה <bdi>' + C.t(cw.havdala) + '</bdi>.' +
      (C.t(cw.candle) !== C.t(w.candle) || C.t(cw.havdala) !== C.t(w.havdala) ? ' <b>אצלכם הזמן יוצא בדקה אחרת.</b>' : ' בדקות, הזמנים יוצאים זהים.') +
      (p.ref[1] > 10 ? ' (אתם במרחק של כ-' + Math.round(p.ref[1]) + ' ק״מ מ' + c[1] + ', ולכן ההדלקה לפי 20 דקות. אפשר לשנות למטה.)' : '');
    el.hidden = false;
  }
  sel.addEventListener('change', function () {
    if (sel.value === 'gps') return;
    if (fixed) { used('city'); location.href = HOME + sel.value + '/'; return; }
    st.city = sel.value; st.gps = null; if ($('sb-st')) $('sb-st').textContent = ''; save(); draw(); say(); used('city');
  });
  cand.addEventListener('change', function () { st.candle = cand.value; save(); draw(); say(); used('candle'); });
  $('sb-more').addEventListener('click', function () { shown = Math.min(60, shown + 12); draw(); used('more'); });
  var gps = $('sb-gps');
  if (gps) gps.addEventListener('click', function () {
    var s = $('sb-st');
    if (!navigator.geolocation) { s.textContent = 'הטלפון לא נותן מיקום. אפשר לבחור עיר מהרשימה.'; return; }
    s.textContent = 'מאתר…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      st.gps = [+pos.coords.latitude.toFixed(4), +pos.coords.longitude.toFixed(4)];
      save(); if (!fixed) sel.value = 'gps'; s.textContent = 'נמצא ✓ הזמנים לפי המקום שבו אתם'; draw(); say(); used('gps');
    }, function () { s.textContent = 'לא קיבלתי מיקום. צריך לאשר מיקום לדפדפן, או לבחור עיר מהרשימה.'; }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });
  var back = $('sb-center');
  if (back) back.addEventListener('click', function () { st.gps = null; save(); if ($('sb-st')) $('sb-st').textContent = ''; draw(); say(); used('center'); });
  $('sb-wa').addEventListener('click', function () { used('wa'); });
  $('sb-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(lastText) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
    used('copy');
  });
  function start() { C = core(window.hebcal); draw(); setInterval(draw, 60000); }
  if (window.hebcal) start(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', start); }
})(this);
