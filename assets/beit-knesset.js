// R9 – דף לבית הכנסת (כלי קודש). כמו כרטיס הביקור: הפרטים יושבים בקישור (אחרי #), לא בשרת.
// בנוסף: QR לקישור, ושלט A4 להדפסה לכניסה לבית הכנסת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('bk-form'), view = $('bk-card'), builder = $('bk-build');
  if (!form) return;
  var F = ['name', 'nusach', 'addr', 'place', 'pname', 'times', 'shiur', 'gname', 'gphone', 'rav', 'note'];

  // ---------- זמני היום (נחשבים בטלפון של מי שפותח, לפי היום שבו פותחים) ----------
  // [קואורדינטות, שם, דקות הדלקת נרות לפני השקיעה] – כמו בלוח השבועי
  var CITIES = [['31.778,35.235', 'ירושלים', 40], ['32.08,34.78', 'תל אביב', 20], ['32.79,34.99', 'חיפה', 30], ['31.25,34.79', 'באר שבע', 20], ['32.965,35.496', 'צפת', 20], ['32.79,35.53', 'טבריה', 20], ['29.557,34.952', 'אילת', 20], ['31.89,34.81', 'רחובות', 20], ['32.17,34.84', 'הרצליה', 20], ['32.32,34.85', 'נתניה', 20], ['31.8,34.65', 'אשדוד', 20], ['31.67,34.57', 'אשקלון', 20], ['32.09,34.88', 'פתח תקווה', 20], ['32.08,34.83', 'בני ברק', 20], ['31.9,35.0', 'מודיעין', 20], ['31.71,35.0', 'בית שמש', 30], ['31.53,35.1', 'חברון וקריית ארבע', 20], ['32.3,35.2', 'שומרון', 20], ['31.35,34.3', 'עוטף עזה', 20], ['33.2,35.57', 'קריית שמונה', 20], ['32.7,35.3', 'נצרת עילית ועפולה', 20]];
  var H = null;
  function hm(d) { return d && !isNaN(d) ? ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : ''; }
  function geo(o) {
    if (!H || !o.place) return null;
    var ll = String(o.place).split(',').map(Number);
    if (ll.length !== 2 || isNaN(ll[0]) || isNaN(ll[1])) return null;
    return { ll: ll, gl: new H.GeoLocation(o.pname || '', ll[0], ll[1], 0, 'Asia/Jerusalem') };
  }
  // "15 דקות לפני השקיעה" → (היום 16:27). לפני = מעגלים כלפי מטה, אחרי = כלפי מעלה, כדי לא לאחר.
  var REL = /(?:(\d{1,3})\s*(?:דקות|דק'|דק׳|דק)\s*(לפני|אחרי)\s*|(?:ב|עם\s*)?)(ה?שקיעה|צאת\s*הכוכבים|צה"כ|צה״כ)/;
  function relTime(line, z) {
    var m = line.match(REL);
    if (!m || !z) return '';
    var base = /שקיעה/.test(m[3]) ? z.sunset() : z.tzeit(8.5);
    if (!base || isNaN(base)) return '';
    var n = m[1] ? +m[1] * (m[2] === 'לפני' ? -1 : 1) : 0;
    var d = new Date(base.getTime() + n * 60000);
    if (n < 0 || (!m[1] && /שקיעה/.test(m[3]))) d.setSeconds(0, 0); else if (d.getSeconds()) d = new Date(Math.ceil(d.getTime() / 60000) * 60000);
    return hm(d);
  }
  function todayBox(o, g) {
    var now = new Date(), z = new H.Zmanim(g.gl, now, false), hd = new H.HDate(now);
    var fri = new Date(now); fri.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7)); fri.setHours(12, 0, 0, 0);
    var sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    var city = CITIES.filter(function (c) { return c[0] === o.place; })[0], mins = city ? city[2] : 20;
    var loc = new H.Location(g.ll[0], g.ll[1], true, 'Asia/Jerusalem', o.pname || '', 'IL', undefined, 0);
    var candle = '', havdala = '', parsha = '';
    try {
      H.HebrewCalendar.calendar({ start: fri, end: sat, il: true, location: loc, candlelighting: true, candleLightingMins: mins, havdalahDeg: 8.5 }).forEach(function (e) {
        var desc = e.getDesc();
        if (desc === 'Candle lighting' && !candle) candle = hm(e.eventTime);
        else if (desc === 'Havdalah') havdala = hm(e.eventTime);
      });
      var sd = H.getSedra(new H.HDate(sat).getFullYear(), true).lookup(new H.HDate(sat));
      if (!sd.chag) parsha = 'פרשת ' + sd.parsha.map(function (p) { return H.Locale.gettext(p, 'he-x-NoNikud'); }).join('-');
    } catch (e) {}
    return '<div class="bk-today"><h3>זמני היום</h3><p class="d">' + esc(hd.renderGematriya(true)) + ' · ' + now.getDate() + '.' + (now.getMonth() + 1) + '.' + now.getFullYear() + '</p><dl>' +
      '<dt>הנץ החמה</dt><dd>' + hm(z.sunrise()) + '</dd><dt>סוף זמן ק"ש (גר"א)</dt><dd>' + hm(z.sofZmanShma()) + '</dd><dt>שקיעה</dt><dd>' + hm(z.sunset()) + '</dd><dt>צאת הכוכבים</dt><dd>' + relTime('בצאת הכוכבים', z) + '</dd></dl>' +
      (candle ? '<p class="sh">שבת' + (parsha ? ' ' + parsha : '') + ': הדלקת נרות <b>' + candle + '</b>' + (havdala ? ' · צאת השבת <b>' + havdala + '</b>' : '') + '</p>' : '') +
      '<small>לפי ' + esc(o.pname || 'המיקום') + ' · מתעדכן לבד בכל יום · הדלקת נרות ' + mins + ' דקות לפני השקיעה · צאת הכוכבים 8.5°</small></div>';
  }

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function read() {
    var o = {}; F.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && el.value.trim()) o[k] = el.value.trim(); });
    var ps = $('bk-place'), opt = ps.options[ps.selectedIndex];
    if (o.place && opt) o.pname = opt.getAttribute('data-n') || opt.textContent;
    return o;
  }
  function link(o) { return location.origin + location.pathname + '#d=' + enc(o); }
  function list(t) { return '<ul>' + t.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'; }

  function qr(el, url, size) {
    el.innerHTML = '';
    if (!window.QRCode) { el.textContent = ''; return false; }
    new window.QRCode(el, { text: url, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.L });
    return true;
  }

  function render(o) {
    var h = '<div class="bk"><span class="bsd">בס"ד</span><h2>' + esc(o.name) + '</h2>' +
      (o.nusach ? '<p class="bk-sub">' + esc(o.nusach) + '</p>' : '') +
      (o.rav ? '<p class="bk-addr">רב בית הכנסת: ' + esc(o.rav) + '</p>' : '') + '<div class="bk-btns">';
    if (o.addr) h += '<a class="btn btn-gold" href="https://waze.com/ul?q=' + encodeURIComponent(o.addr) + '&navigate=yes">🧭 ניווט בוויז</a><a class="btn btn-line" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.addr) + '">🗺️ גוגל מפות</a>';
    if (o.gphone) h += '<a class="btn btn-gold" href="https://wa.me/' + intl(o.gphone) + '">💬 ווטסאפ לגבאי</a><a class="btn btn-line" href="tel:+' + intl(o.gphone) + '">📞 להתקשר לגבאי</a>';
    h += '<button class="btn btn-line" type="button" data-bk="share">↗️ לשתף את הדף</button><button class="btn btn-line" type="button" data-bk="print">🖨️ שלט עם QR</button></div>';
    if (o.addr) h += '<p class="bk-addr">📍 ' + esc(o.addr) + '</p>';
    var g = geo(o), z = g ? new H.Zmanim(g.gl, new Date(), false) : null;
    if (o.times) h += '<div class="bk-box"><h3>זמני תפילות' + (z ? ' להיום' : '') + '</h3><ul>' + o.times.split('\n').filter(function (l) { return l.trim(); }).map(function (l) {
      var r = relTime(l, z);
      return '<li>' + esc(l) + (r ? ' <span class="bk-calc">(היום ' + r + ')</span>' : '') + '</li>';
    }).join('') + '</ul></div>';
    if (g) { try { h += todayBox(o, g); } catch (e) {} }
    if (o.shiur) h += '<div class="bk-box"><h3>שיעורים</h3>' + list(o.shiur) + '</div>';
    if (o.gname || o.gphone) h += '<p class="bk-note">הגבאי: ' + esc(o.gname || '') + (o.gphone ? ' · <span dir="ltr">' + esc(o.gphone) + '</span>' : '') + '</p>';
    if (o.note) h += '<p class="bk-note">' + esc(o.note) + '</p>';
    h += '<p class="bk-credit">דף חינמי מ<a href="/kodesh/beit-knesset/">כלי קודש</a> · רוצים כזה לבית הכנסת שלכם? בונים תוך שתי דקות</p></div>';
    view.innerHTML = h;
    view.hidden = false;
    view._o = o;
  }

  function sign(o) {
    var s = $('bk-sign'), url = link(o);
    s.innerHTML = '<p class="small">בס"ד</p><h2>' + esc(o.name) + '</h2>' + (o.nusach ? '<p>' + esc(o.nusach) + '</p>' : '') +
      '<p>זמני תפילות, שיעורים וקשר עם הגבאי</p><div class="qrbig" id="bk-qr-big"></div><p><b>סורקים במצלמה של הטלפון</b></p>' +
      (o.gphone ? '<p>גבאי' + (o.gname ? ': ' + esc(o.gname) : '') + ' · <span dir="ltr">' + esc(o.gphone) + '</span></p>' : '') +
      '<p class="small">נבנה בחינם בכלי קודש · hakelim.com/kodesh</p>';
    qr($('bk-qr-big'), url, 300);
  }
  function printSign(o) {
    sign(o);
    if (window.toolUsed) window.toolUsed('beit_knesset', { action: 'print_sign' });
    setTimeout(function () { window.print(); }, 300);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bk]');
    if (!b) return;
    var o = view._o || read(), k = b.getAttribute('data-bk');
    if (!o.name) return;
    if (k === 'print') printSign(o);
    else if (k === 'share') {
      var url = link(o);
      if (navigator.share) navigator.share({ title: o.name, text: o.name, url: url }).catch(function () {});
      else (window.kelimShort ? window.kelimShort.go('https://api.whatsapp.com/send?text=' + encodeURIComponent(o.name + ' – זמני תפילות ושיעורים\n' + url)) : (location.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(o.name + ' – זמני תפילות ושיעורים\n' + url)));
    }
  });

  // ספריית הלוח העברי נטענת אחרי הדף: כשהיא מוכנה מציירים שוב, עם הזמנים
  function whenHebcal(cb) {
    if (window.hebcal) { H = window.hebcal; cb(); return; }
    var sc = document.querySelector('script[data-hebcal]');
    if (sc) sc.addEventListener('load', function () { H = window.hebcal; cb(); });
  }

  // מצב דף: הגיעו מקישור
  var m = location.hash.match(/#d=([\w-]+)/);
  if (m) {
    try {
      var o = dec(m[1]);
      render(o);
      builder.hidden = true;
      document.title = o.name + ' – זמני תפילות ושיעורים';
      $('bk-mine').hidden = false;
      if (o.place) whenHebcal(function () { render(o); });
      return;
    } catch (e) { /* קישור פגום – ממשיכים לבנייה */ }
  }

  // רשימת הערים + "המיקום שלי" (קואורדינטות מהטלפון של הגבאי, כשהוא בבית הכנסת)
  var ps = $('bk-place');
  ps.innerHTML += CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '<option value="gps">המיקום שלי עכשיו (מהטלפון)</option>';
  function addCustom(v, n) {
    if (!v || [].some.call(ps.options, function (op) { return op.value === v; })) return;
    var op = document.createElement('option'); op.value = v; op.textContent = n || 'המיקום של בית הכנסת'; op.setAttribute('data-n', n || 'מיקום בית הכנסת');
    ps.insertBefore(op, ps.lastChild);
  }
  ps.addEventListener('change', function () {
    if (ps.value !== 'gps') return;
    if (!navigator.geolocation) { ps.value = ''; return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      var v = p.coords.latitude.toFixed(3) + ',' + p.coords.longitude.toFixed(3);
      addCustom(v, 'מיקום בית הכנסת'); ps.value = v; upd();
    }, function () { ps.value = ''; upd(); }, { timeout: 15000 });
  });

  try { var saved = JSON.parse(localStorage.getItem('kodesh-bk') || '{}'); if (saved.place) addCustom(saved.place, saved.pname); F.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && saved[k]) el.value = saved[k]; }); } catch (e) {}
  whenHebcal(function () { upd(); });
  function upd() {
    var o = read();
    try { localStorage.setItem('kodesh-bk', JSON.stringify(o)); } catch (e) {}
    if (o.name) render(o); else view.hidden = true;
  }
  form.addEventListener('input', upd);
  upd();
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var o = read(), url = link(o);
    $('bk-link').value = url;
    $('bk-ready').hidden = false;
    $('bk-open').href = url;
    $('bk-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(o.name + ' – זמני תפילות ושיעורים\n' + url);
    qr($('bk-qr-small'), url, 160);
    $('bk-ready').scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (window.toolUsed) window.toolUsed('beit_knesset', { has_times: !!o.times, has_shiur: !!o.shiur, has_gabai: !!o.gphone });
  });
  $('bk-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText($('bk-link').value) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }).catch(function () { $('bk-link').select(); });
  });
})();
