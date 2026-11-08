// "היום בבית הכנסת" למסך (כלי קודש): שעון גדול, תאריך עברי, זמני היום, זמני תפילות, שבת והודעות מתחלפות.
// ההגדרות נשמרות בטלפון/במחשב ובתוך הקישור (#s=...), כך שאפשר לפתוח את אותו קישור בטלוויזיה של בית הכנסת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('ms-form'); if (!form) return;
  var H = null, F = ['place', 'shul', 'tef', 'ann', 'theme', 'mins'];
  var CITIES = [['31.778,35.235', 'ירושלים', 40], ['32.08,34.78', 'תל אביב', 20], ['32.79,34.99', 'חיפה', 30], ['31.25,34.79', 'באר שבע', 20], ['32.965,35.496', 'צפת', 20], ['32.79,35.53', 'טבריה', 20], ['29.557,34.952', 'אילת', 20], ['31.89,34.81', 'רחובות', 20], ['32.17,34.84', 'הרצליה', 20], ['32.32,34.85', 'נתניה', 20], ['31.8,34.65', 'אשדוד', 20], ['31.67,34.57', 'אשקלון', 20], ['32.09,34.88', 'פתח תקווה', 20], ['32.08,34.83', 'בני ברק', 20], ['31.9,35.0', 'מודיעין', 20], ['31.71,35.0', 'בית שמש', 30], ['31.53,35.1', 'חברון וקריית ארבע', 20], ['32.3,35.2', 'שומרון', 20], ['31.35,34.3', 'עוטף עזה', 20], ['33.2,35.57', 'קריית שמונה', 20], ['32.7,35.3', 'נצרת עילית ועפולה', 20]];
  function hm(d) { return d && !isNaN(d) ? ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : ''; }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  var REL = /(?:(\d{1,3})\s*(?:דקות|דק'|דק׳|דק)\s*(לפני|אחרי)\s*|(?:ב|עם\s*)?)(ה?שקיעה|צאת\s*הכוכבים|צה"כ|צה״כ)/;
  function relTime(line, z) {
    var m = line.match(REL); if (!m || !z) return '';
    var base = /שקיעה/.test(m[3]) ? z.sunset() : z.tzeit(8.5); if (!base || isNaN(base)) return '';
    var n = m[1] ? +m[1] * (m[2] === 'לפני' ? -1 : 1) : 0, d = new Date(base.getTime() + n * 60000);
    if (n < 0 || (!m[1] && /שקיעה/.test(m[3]))) d.setSeconds(0, 0); else if (d.getSeconds()) d = new Date(Math.ceil(d.getTime() / 60000) * 60000);
    return hm(d);
  }
  function read() { var o = {}; F.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && el.value.trim()) o[k] = el.value.trim(); }); return o; }
  function fill(o) { F.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && o[k]) el.value = o[k]; }); }

  var ps = $('ms-place');
  ps.innerHTML = CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('');
  try { fill(JSON.parse(localStorage.getItem('kodesh-masach') || '{}')); } catch (e) {}
  var fromLink = /#s=/.test(location.hash);
  if (fromLink) { try { fill(dec(location.hash.split('#s=')[1])); } catch (e) { fromLink = false; } }

  function save() {
    var o = read();
    try { localStorage.setItem('kodesh-masach', JSON.stringify(o)); } catch (e) {}
    var url = location.origin + location.pathname + '#s=' + enc(o);
    $('ms-link').value = url;
    return o;
  }
  form.addEventListener('input', save); form.addEventListener('change', save);

  // ---------- המסך ----------
  var scr = $('ms-screen'), annI = 0, annT = 0, lock = null;
  function render() {
    if (!H || scr.hidden) return;
    var o = read(), now = new Date(), ll = (o.place || CITIES[0][0]).split(',').map(Number);
    var city = CITIES.filter(function (c) { return c[0] === o.place; })[0] || CITIES[0], mins = +o.mins || city[2];
    var gl = new H.GeoLocation(city[1], ll[0], ll[1], 0, 'Asia/Jerusalem'), z = new H.Zmanim(gl, now, false), hd = new H.HDate(now);
    // אחרי השקיעה מציגים כבר את התאריך העברי של מחר (כמו בלוח)
    var ss = z.sunset(), hdShow = (ss && now > ss) ? hd.next() : hd;
    $('ms-shul').textContent = o.shul || 'בית הכנסת';
    $('ms-date').textContent = hdShow.renderGematriya(true) + ' · ' + now.getDate() + '.' + (now.getMonth() + 1) + '.' + now.getFullYear();
    $('ms-zmanim').innerHTML = [['עלות השחר', z.alotHaShachar()], ['הנץ החמה', z.sunrise()], ['סוף זמן ק"ש', z.sofZmanShma()], ['סוף זמן תפילה', z.sofZmanTfilla()], ['חצות', z.chatzot()], ['מנחה גדולה', z.minchaGedola()], ['שקיעה', z.sunset()], ['צאת הכוכבים', z.tzeit(8.5)]]
      .map(function (r) { return '<div><span>' + r[0] + '</span><b>' + hm(r[1]) + '</b></div>'; }).join('');
    var tef = (o.tef || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m = l.match(/^(.*?)[\s:–-]+(\d{1,2}[:.]\d{2})\s*$/), name = m ? m[1] : l, t = m ? m[2].replace('.', ':') : relTime(l, z);
      if (!m && t) name = l.replace(REL, '').replace(/[\s:–-]+$/, '').trim() || l;
      return '<div><span>' + esc(name) + '</span><b>' + esc(t) + '</b></div>';
    }).join('');
    $('ms-tef').innerHTML = tef || '<div><span>מקלידים את זמני התפילות בהגדרות</span><b></b></div>';
    // שבת
    var fri = new Date(now); fri.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7)); fri.setHours(12, 0, 0, 0);
    if (now.getDay() === 6) fri.setDate(fri.getDate() - 1);
    var sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    var loc = new H.Location(ll[0], ll[1], true, 'Asia/Jerusalem', city[1], 'IL', undefined, 0), candle = '', havdala = '', parsha = '';
    try {
      H.HebrewCalendar.calendar({ start: fri, end: sat, il: true, location: loc, candlelighting: true, candleLightingMins: mins, havdalahDeg: 8.5 }).forEach(function (e) {
        var d = e.getDesc(); if (d === 'Candle lighting' && !candle) candle = hm(e.eventTime); else if (d === 'Havdalah') havdala = hm(e.eventTime);
      });
      var sd = H.getSedra(new H.HDate(sat).getFullYear(), true).lookup(new H.HDate(sat));
      if (!sd.chag) parsha = 'פרשת ' + sd.parsha.map(function (p) { return H.Locale.gettext(p, 'he-x-NoNikud'); }).join('-');
    } catch (e) {}
    $('ms-shabbat').innerHTML = (parsha ? '<b>שבת ' + esc(parsha) + '</b>' : '<b>שבת</b>') + (candle ? '<span>הדלקת נרות ' + candle + '</span>' : '') + (havdala ? '<span>צאת השבת ' + havdala + '</span>' : '');
    $('ms-foot').textContent = 'זמנים לפי ' + city[1] + ' · צאת הכוכבים 8.5° · מתעדכן לבד';
  }
  function tick() {
    var n = new Date();
    $('ms-clock').textContent = hm(n) + ':' + ('0' + n.getSeconds()).slice(-2);
    if (n.getSeconds() === 0) render();
    var ann = (read().ann || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    $('ms-ann').hidden = !ann.length;
    if (ann.length && (Date.now() - annT > 9000 || !$('ms-ann').textContent)) { annT = Date.now(); $('ms-ann').textContent = ann[annI++ % ann.length]; }
  }
  function open() {
    save();
    scr.hidden = false; document.body.classList.add('ms-on');
    scr.setAttribute('data-theme', read().theme || 'dark');
    render(); tick();
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {});
    if (window.toolUsed) window.toolUsed('masach', { how: fromLink ? 'link' : 'open' });
  }
  function close() { scr.hidden = true; document.body.classList.remove('ms-on'); if (document.fullscreenElement) document.exitFullscreen().catch(function () {}); if (lock) { lock.release(); lock = null; } }
  $('ms-open').addEventListener('click', open);
  $('ms-full').addEventListener('click', function () { open(); if (scr.requestFullscreen) scr.requestFullscreen().catch(function () {}); });
  $('ms-close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !scr.hidden) close(); });
  $('ms-copy').addEventListener('click', function () {
    var b = this; save();
    (navigator.clipboard ? navigator.clipboard.writeText($('ms-link').value) : Promise.reject()).then(function () { b.textContent = 'הקישור הועתק ✓'; if (window.toolUsed) window.toolUsed('masach', { how: 'copy_link' }); });
  });
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  function boot() { H = window.hebcal; save(); if (fromLink) open(); }
  if (window.hebcal) boot(); else { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', boot); }
})();
