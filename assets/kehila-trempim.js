/* טרמפים – /kelim/kehila/trempim/
   השרת: trempim.gilad4049.workers.dev (Cloudflare Worker + D1). כניסה: Google Identity Services.
   כתובות: Photon (OpenStreetMap). מסלול: OSRM. */
(function () {
  'use strict';
  var API = 'https://trempim.gilad4049.workers.dev';
  // בדיקה מקומית בלבד: ?api=http://127.0.0.1:8799
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { var qa = new URLSearchParams(location.search).get('api'); if (qa) API = qa; }
  var CLIENT_ID = '811978831024-vp67lekd6gmffh9sq07jqapvjvmdpudn.apps.googleusercontent.com';
  var CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
  var TOKEN_KEY = 'trempim_token';
  var $ = function (id) { return document.getElementById(id); };
  var used = function (how) { try { window.toolUsed && window.toolUsed('trempim', { how: how }); } catch (e) {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };

  var token = lsGet(TOKEN_KEY);
  var me = null;

  /* ---------- שרת ---------- */
  function api(path, data) {
    var opt = { method: data === undefined ? 'GET' : 'POST', headers: {} };
    if (token) opt.headers.Authorization = 'Bearer ' + token;
    if (data !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(data); }
    return fetch(API + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401) { logout(true); }
        if (!r.ok) { var e = new Error(j.error || 'http ' + r.status); e.code = j.error; throw e; }
        return j;
      });
    });
  }
  var ERR = {
    'not on route': 'הנקודות שלך כבר לא על המסלול של הנהג.', 'full': 'אין יותר מקום בנסיעה הזאת.', 'ride gone': 'הנסיעה בוטלה.',
    'date': 'התאריך לא תקין (עד 30 יום קדימה).', 'time': 'חסרה שעה.', 'route': 'לא הצלחתי לחשב מסלול.', 'phone': 'מספר הטלפון לא נראה תקין.',
    'name': 'חסר שם.', 'agree': 'צריך לסמן שאתה מעל 18 ומסכים לכללים.', 'paybox': 'קישור הפייבוקס לא נראה תקין.', 'profile': 'צריך להשלים פרופיל.',
    'seats': 'במונית אפשר עד 3 מצטרפים.', 'too many rides': 'יש לך כבר הרבה נסיעות פתוחות.', 'too many requests': 'שלחת הרבה בקשות היום. נסה שוב מחר.', 'place out of range': 'הכתובת מחוץ לישראל.',
  };
  var errText = function (e) { return ERR[e && e.code] || 'משהו השתבש. נסה שוב בעוד רגע.'; };

  /* ---------- תאריכים ---------- */
  var LET = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
  function dayLabel(s) {
    if (s === addDays(0)) return 'היום';
    if (s === addDays(1)) return 'מחר';
    var d = new Date(s + 'T12:00:00');
    return 'יום ' + DAYS[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1);
  }
  function price(km, rate) { return rate ? Math.max(5, Math.round(km * rate)) : 0; }
  // מונית: אותו תעריף מונה כמו בשרת (משרד התחבורה, בתוקף מ-01.04.2026). א' ביום חול, ב' בערב ובשבת, ג' בלילה של שישי ושבת.
  var TAXI = { start: 12.46, booking: 5.78, a: 1.95, b: 2.34, c: 2.73, over10: 1.84 };
  function taxiRate(date, time) {
    var wd = new Date((date || addDays(0)) + 'T12:00:00').getDay(), t = +(time || '12:00').slice(0, 2) * 60 + +(time || '12:00').slice(3, 5);
    var day = t >= 360 && t <= 1260;
    if (wd === 6) return day && t <= 1140 ? TAXI.b : TAXI.c;
    if (wd === 5 && !day) return t > 1380 || t < 360 ? TAXI.c : TAXI.b;
    return day ? TAXI.a : TAXI.b;
  }
  function taxiFare(km, min, date, time) { var r = taxiRate(date, time); return Math.round(TAXI.start + TAXI.booking + km * r + min * r + Math.max(0, km - 10) * TAXI.over10); }

  /* ---------- כתובות: השלמה אוטומטית ---------- */
  function photonLabel(p) {
    var a = p.properties || {};
    var street = a.street ? a.street + (a.housenumber ? ' ' + a.housenumber : '') : '';
    var main = a.name && a.name !== a.street ? a.name : street || a.name || '';
    var sub = [a.name && street && a.name !== a.street ? street : '', a.city || a.town || a.village || a.county || ''].filter(Boolean).join(', ');
    return { main: main || sub, sub: main ? sub : '', label: [main, a.city || a.town || a.village || ''].filter(Boolean).join(', ') };
  }
  // Photon (OpenStreetMap). בישראל אין בו מספרי בתים, אז: מחפשים בלי המספר, מעדיפים את העיר שנכתבה
  // ואת האזור של המשתמש, ומחזירים את המספר לתווית. lang=default = שמות בעברית כמו במפה.
  var BIAS_KEY = 'trempim_bias';
  function bias() { try { var b = JSON.parse(lsGet(BIAS_KEY) || 'null'); if (b && b.lat) return b; } catch (e) {} return null; }
  function setBias(p) { lsSet(BIAS_KEY, JSON.stringify({ lat: +p.lat.toFixed(3), lng: +p.lng.toFixed(3) })); }
  function splitNum(q) {
    var m = q.match(/(^|\s)(\d{1,4}[א-ת]?)(?=\s|,|$)/);
    return m ? { num: m[2], text: (q.slice(0, m.index) + ' ' + q.slice(m.index + m[0].length)).replace(/\s+/g, ' ').replace(/\s*,\s*,/g, ',').trim() } : { num: '', text: q };
  }
  function geocode(q) {
    var sp = splitNum(q.replace(/[״]/g, '"'));
    if (sp.text.length < 2) return Promise.resolve([]);
    var b = bias() || { lat: 31.78, lng: 35.05 };
    var u = 'https://photon.komoot.io/api/?limit=12&lang=default&lat=' + b.lat + '&lon=' + b.lng + '&location_bias_scale=0.4&bbox=34.2,29.4,35.95,33.4&q=' + encodeURIComponent(sp.text);
    var words = sp.text.split(/[\s,]+/).filter(function (w) { return w.length > 2; });
    return fetch(u).then(function (r) { return r.json(); }).then(function (j) {
      var seen = {};
      return (j.features || []).filter(function (f) {
        var a = f.properties || {};
        if (a.countrycode !== 'IL' && a.countrycode !== 'PS') return false;
        // תחנות אוטובוס וצמתים ("א/ב") רק מבלבלים
        return !(a.osm_value === 'bus_stop' || a.osm_key === 'public_transport' || a.osm_value === 'platform' || /\//.test(a.name || ''));
      }).map(function (f, i) {
        var l = photonLabel(f), a = f.properties || {};
        var city = a.city || a.town || a.village || '';
        var isStreet = a.type === 'street' || (a.osm_key === 'highway' && !a.housenumber);
        var main = l.main, label = l.label;
        if (sp.num && isStreet) { main = (a.name || a.street) + ' ' + sp.num; label = main + (city ? ', ' + city : ''); }
        // ניקוד: עיר שנכתבה בחיפוש קודם, ואחר כך הסדר של Photon (שכבר מתחשב באזור)
        var score = i;
        words.forEach(function (w) { if (city && city.indexOf(w) >= 0) score -= 20; });
        if (main && main.indexOf(sp.text.split(',')[0].trim()) === 0) score -= 8;
        return { label: label, main: main, sub: l.sub || city, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], score: score };
      }).filter(function (it) { var k = it.label; if (seen[k]) return false; seen[k] = 1; return true; })
        .sort(function (x, y) { return x.score - y.score; }).slice(0, 7);
    });
  }
  function reverse(lat, lng) {
    return fetch('https://photon.komoot.io/reverse?lang=default&lat=' + lat + '&lon=' + lng).then(function (r) { return r.json(); }).then(function (j) {
      var f = (j.features || [])[0];
      return f ? photonLabel(f).label : 'המיקום שלי';
    }).catch(function () { return 'המיקום שלי'; });
  }
  // כל שדה כתובת זוכר את הנקודה שנבחרה (input._place)
  function autocomplete(input) {
    var ul = document.createElement('ul'); ul.className = 'tp-sug'; ul.hidden = true;
    input.parentNode.appendChild(ul);
    var timer, items = [], idx = -1;
    function close() { ul.hidden = true; idx = -1; }
    function pick(it) { input.value = it.label; input._place = { label: it.label, lat: it.lat, lng: it.lng }; setBias(it); close(); input.dispatchEvent(new Event('placechange')); }
    input.addEventListener('input', function () {
      input._place = null;
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 3) { close(); return; }
      timer = setTimeout(function () {
        geocode(q).then(function (list) {
          if (input.value.trim() !== q) return;
          items = list; idx = -1;
          ul.innerHTML = list.map(function (it, i) { return '<li data-i="' + i + '">' + esc(it.main) + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</li>'; }).join('');
          ul.hidden = !list.length;
        }).catch(close);
      }, 300);
    });
    input.addEventListener('keydown', function (e) {
      if (ul.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; [].forEach.call(ul.children, function (li, i) { li.classList.toggle('on', i === idx); }); }
      else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(items[idx]); }
      else if (e.key === 'Escape') close();
    });
    ul.addEventListener('mousedown', function (e) { var li = e.target.closest('li'); if (li) { e.preventDefault(); pick(items[+li.getAttribute('data-i')]); } });
    input.addEventListener('blur', function () { setTimeout(close, 150); });
  }
  // אם לא בחרו מהרשימה – לוקחים את התוצאה הראשונה
  function placeOf(input) {
    if (input._place) return Promise.resolve(input._place);
    var q = input.value.trim();
    if (!q) return Promise.reject(new Error('empty'));
    return geocode(q).then(function (l) {
      if (!l.length) throw new Error('notfound');
      input._place = { label: l[0].label, lat: l[0].lat, lng: l[0].lng };
      input.value = l[0].label;
      setBias(l[0]);
      return input._place;
    });
  }
  function hereInto(input, btn) {
    if (!navigator.geolocation) return;
    btn.disabled = true; btn.textContent = 'מאתר...';
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = +pos.coords.latitude.toFixed(5), lng = +pos.coords.longitude.toFixed(5);
      reverse(lat, lng).then(function (label) {
        input.value = label; input._place = { label: label, lat: lat, lng: lng }; setBias({ lat: lat, lng: lng });
        btn.disabled = false; btn.textContent = 'המיקום שלי';
      });
    }, function () { btn.disabled = false; btn.textContent = 'המיקום שלי'; alert('לא הצלחתי לקבל מיקום. אפשר לכתוב כתובת.'); }, { timeout: 12000, maximumAge: 60000 });
  }

  /* ---------- מסלול ---------- */
  function routeOf(a, b) {
    var u = 'https://router.project-osrm.org/route/v1/driving/' + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=simplified&geometries=geojson';
    return fetch(u).then(function (r) { return r.json(); }).then(function (j) {
      var r = j.routes && j.routes[0];
      if (!r) throw new Error('route');
      var pts = r.geometry.coordinates.map(function (c) { return [+c[1].toFixed(5), +c[0].toFixed(5)]; });
      if (pts.length > 1400) { var step = Math.ceil(pts.length / 1400); pts = pts.filter(function (p, i) { return i % step === 0 || i === pts.length - 1; }); }
      return { km: r.distance / 1000, min: r.duration / 60, pts: pts };
    });
  }

  /* ---------- קישורים ---------- */
  var waze = function (p) { return 'https://waze.com/ul?ll=' + p.lat + ',' + p.lng + '&navigate=yes'; };
  function waPhone(ph, text) { var n = String(ph || '').replace(/\D/g, '').replace(/^0/, '972'); return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function calLink(title, date, time, mins, where, details) {
    var s = date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
    var t = new Date(date + 'T' + time + ':00'); t.setMinutes(t.getMinutes() + Math.max(15, Math.round(mins || 30)));
    var e = ymd(t).replace(/-/g, '') + 'T' + String(t.getHours()).padStart(2, '0') + String(t.getMinutes()).padStart(2, '0') + '00';
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&ctz=Asia/Jerusalem&text=' + encodeURIComponent(title) + '&dates=' + s + '/' + e +
      '&location=' + encodeURIComponent(where || '') + '&details=' + encodeURIComponent(details || '');
  }
  var PAGE = 'https://gilad-rachamim.github.io/kelim/kehila/trempim/';

  /* ---------- מונים ---------- */
  function loadStats() {
    fetch(API + '/stats').then(function (r) { return r.json(); }).then(function (s) {
      if (!s || s.rides == null) return;
      $('tp-stats').innerHTML = '<span><b>' + s.rides + '</b> נסיעות פתוחות</span><span><b>' + s.users + '</b> חברים במיזם</span><span><b>' + s.joined + '</b> טרמפים שאושרו</span>' +
        (s.taxis ? '<span><b>' + s.taxis + '</b> מוניות משותפות</span>' : '');
    }).catch(function () {});
  }

  /* ---------- מחשבון ---------- */
  function initCalc() {
    autocomplete($('tc-from')); autocomplete($('tc-to'));
    $('tc-go').addEventListener('click', function () {
      var res = $('tc-res');
      res.textContent = 'מחשב...';
      Promise.all([placeOf($('tc-from')), placeOf($('tc-to'))]).then(function (pp) { return routeOf(pp[0], pp[1]); }).then(function (r) {
        var km = Math.round(r.km * 10) / 10;
        res.innerHTML = '<div class="tp-big">' + price(km, 1) + ' ₪ <small>לנוסע, לפי שקל לק"מ</small></div>' +
          '<p>' + km + ' ק"מ · כ-' + Math.round(r.min) + ' דקות נסיעה בלי פקקים. עלות הדלק לנהג: כ-' + Math.round(km * 0.75) + ' ₪. התקרה במיזם (פי 1.5): ' + price(km, 1.5) + ' ₪.</p>' +
          taxiSplitText(taxiFare(km, r.min));
        used('calc');
      }).catch(function () { res.textContent = 'לא מצאתי את אחת הכתובות. נסו לכתוב רחוב ועיר.'; });
    });
  }

  // כמה כל אחד משלם במונית כשמתחלקים
  function taxiSplitText(fare) {
    return '<div class="tp-pay tp-taxi-calc">🚕 <b>במונית לבד: כ-' + fare + ' ₪.</b> שניים מתחלקים: ' + Math.round(fare / 2) + ' ₪ לכל אחד · שלושה: ' + Math.round(fare / 3) +
      ' ₪ · ארבעה: ' + Math.round(fare / 4) + ' ₪. <small>הערכה לפי תעריף המונה של משרד התחבורה, עם הזמנה, בלי פקקים. המונה קובע.</small></div>';
  }

  /* ---------- כניסה ---------- */
  function initGoogle() {
    if (CLIENT_ID === 'PENDING') { $('tp-login-msg').textContent = 'הכניסה תיפתח בקרוב.'; return; }
    var tries = 0;
    (function wait() {
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, ux_mode: 'popup', auto_select: false });
        google.accounts.id.renderButton($('tp-gbtn'), { theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'pill', locale: 'he' });
      } else if (tries++ < 60) setTimeout(wait, 250);
      else $('tp-login-msg').textContent = 'לא הצלחתי לטעון את הכניסה של גוגל. נסו לרענן.';
    })();
  }
  function onCredential(resp) {
    $('tp-login-msg').textContent = 'נכנס...';
    api('/auth', { credential: resp.credential }).then(function (j) {
      token = j.token; lsSet(TOKEN_KEY, token); me = j.user; used('login'); showApp();
    }).catch(function () { $('tp-login-msg').textContent = 'הכניסה לא הצליחה. נסו שוב.'; });
  }
  function logout(silent) {
    token = null; me = null; lsSet(TOKEN_KEY, null);
    $('tp-app').hidden = true; $('tp-guest').hidden = false;
    if (!silent && window.google && google.accounts) google.accounts.id.disableAutoSelect();
  }

  function showApp() {
    $('tp-guest').hidden = true; $('tp-app').hidden = false;
    renderMe();
    if (!me.ready) {
      $('tp-profile').hidden = false; $('tp-main').hidden = true;
      $('pf-name').value = me.name || ''; $('pf-phone').value = me.phone || ''; $('pf-paybox').value = me.paybox || '';
    } else {
      $('tp-profile').hidden = true; $('tp-main').hidden = false;
      loadInbox(); loadMyRides();
    }
  }
  function renderMe() {
    var stars = me.rating ? ' · ★ ' + me.rating : '';
    $('tp-me').innerHTML = '<div class="who">' + (me.pic ? '<img src="' + esc(me.pic) + '" alt="" referrerpolicy="no-referrer">' : '') +
      '<div><b>' + esc(me.name) + '</b><div class="pts">' + (me.points || 0) + ' נקודות חסד' + stars + '</div></div></div>' +
      '<div><button type="button" id="tp-edit">עריכת פרופיל</button> · <button type="button" id="tp-out">יציאה</button></div>';
    $('tp-out').onclick = function () { logout(false); };
    $('tp-edit').onclick = function () { me.ready = false; showApp(); };
  }
  function initProfile() {
    $('tp-profile').addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('pf-msg'); msg.textContent = 'שומר...';
      api('/me', { name: $('pf-name').value, phone: $('pf-phone').value, paybox: $('pf-paybox').value.trim(), agreed: $('pf-agree').checked })
        .then(function (j) { me = j.user; msg.textContent = ''; showApp(); })
        .catch(function (err) { msg.textContent = errText(err); });
    });
  }

  /* ---------- לשוניות ---------- */
  function initTabs() {
    document.querySelectorAll('.tp-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { tab(b.getAttribute('data-tab')); });
    });
  }
  function tab(name) {
    document.querySelectorAll('.tp-tabs button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-tab') === name); });
    document.querySelectorAll('.tp-pane').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== name; });
    if (name === 'inbox') loadInbox();
    if (name === 'drive') loadMyRides();
  }
  function chips(id, multi) {
    var box = $(id);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (multi) b.classList.toggle('on');
      else box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      box.dispatchEvent(new Event('change'));
    });
  }
  var chipVal = function (id, attr) { var b = $(id).querySelector('button.on'); return b ? b.getAttribute(attr) : null; };

  /* ---------- טרמפיסט ---------- */
  var lastSearch = null;
  function initRider() {
    autocomplete($('rd-from')); autocomplete($('rd-to'));
    chips('rd-when'); chips('rd-radius');
    $('rd-here').addEventListener('click', function () { hereInto($('rd-from'), $('rd-here')); });
    $('rd-form').addEventListener('submit', function (e) { e.preventDefault(); search(); });
  }
  function search() {
    var msg = $('rd-msg'), list = $('rd-list');
    msg.textContent = 'מחפש מי עובר דרכך...'; list.innerHTML = '';
    var w = chipVal('rd-when', 'data-w');
    var dates = w === 'today' ? [addDays(0)] : w === 'tomorrow' ? [addDays(1)] : [0, 1, 2, 3, 4, 5, 6].map(addDays);
    Promise.all([placeOf($('rd-from')), placeOf($('rd-to'))]).then(function (pp) {
      lastSearch = { from: pp[0], to: pp[1], dates: dates, radius: +chipVal('rd-radius', 'data-r') };
      return api('/search', lastSearch);
    }).then(function (j) {
      used('search'); rememberPlace(lastSearch.from); rememberPlace(lastSearch.to);
      lastMatches = j.matches;
      msg.textContent = j.matches.length ? 'נמצאו ' + j.matches.length + ' נסיעות שעוברות לידך:' : '';
      list.innerHTML = j.matches.length ? j.matches.map(matchHtml).join('') :
        '<p class="kh-empty">עוד אין מי שעובר כאן בזמן הזה. המיזם צומח מאנשים כמוך: שלחו את הדף לקבוצה של השכונה, וחזרו לבדוק מחר.</p>';
    }).catch(function (err) {
      msg.textContent = err.message === 'notfound' || err.message === 'empty' ? 'לא מצאתי את הכתובת. כתבו רחוב ועיר ובחרו מהרשימה.' : errText(err);
    });
  }
  function matchHtml(m, i) {
    var d = m.driver;
    var stars = d.rating ? ' · ★ ' + d.rating + ' (' + d.ratingN + ')' : '';
    var near = m.pickupKm < 0.1 ? 'ממש לידך' : m.pickupKm < 1 ? Math.round(m.pickupKm * 1000 / 50) * 50 + ' מ\' ממך' : m.pickupKm + ' ק"מ ממך';
    var act;
    if (m.taxi) return taxiMatchHtml(m, i, near, stars);
    if (m.mine) act = '<span class="tp-st ' + m.mine.status + '">' + (m.mine.status === 'approved' ? 'אושר! ראו בלשונית הבקשות' : 'הבקשה נשלחה, ממתין לנהג') + '</span>';
    else act = (m.price ? '<span class="tp-price">' + m.price + ' ₪</span><button type="button" class="go" data-req="' + i + '" data-mode="paid">לבקש בהשתתפות בדלק</button>' : '<span class="tp-price tp-free">בחינם</span>') +
      '<button type="button" data-req="' + i + '" data-mode="free">' + (m.price ? 'לבקש בחינם' : 'לבקש להצטרף') + '</button>';
    return '<div class="kh-item tp-match" data-i="' + i + '">' +
      '<div class="top"><b>' + esc(d.name) + ' · עובר לידך ב-' + esc(m.pass) + '</b><span>' + esc(dayLabel(m.date)) + ' · ' + (m.seatsLeft === 1 ? 'מקום אחד פנוי' : 'עוד ' + m.seatsLeft + ' מקומות') + '</span></div>' +
      '<p>' + esc(m.from) + ' ← ' + esc(m.to) + (m.regular ? '<span class="tp-reg">נסיעה קבועה</span>' : '') + '</p>' +
      '<p class="lbl">' + near + ' · הדרך שלך ' + m.segKm + ' ק"מ' + stars + '</p>' +
      (m.note ? '<p>' + esc(m.note) + '</p>' : '') +
      '<div class="acts">' + act + '</div></div>';
  }
  // כרטיס מונית: החלק המשוער של המבקש, וכמה הוא חוסך מול מונית לבד
  function taxiMatchHtml(m, i, near, stars) {
    var t = m.taxi, d = m.driver;
    var act = m.mine ? '<span class="tp-st ' + m.mine.status + '">' + (m.mine.status === 'approved' ? 'אושר! ראו בלשונית הבקשות' : 'הבקשה נשלחה, ממתין לאישור') + '</span>' :
      '<span class="tp-price">כ-' + m.price + ' ₪</span><button type="button" class="go" data-req="' + i + '" data-mode="paid">לבקש להצטרף למונית</button>';
    return '<div class="kh-item tp-match tp-taxi" data-i="' + i + '">' +
      '<div class="top"><b><span class="tp-kind">🚕 מונית</span> ' + esc(d.name) + ' · עובר לידך ב-' + esc(m.pass) + '</b><span>' + esc(dayLabel(m.date)) + ' · ' + (m.seatsLeft === 1 ? 'מקום אחד' : 'עוד ' + m.seatsLeft + ' מקומות') + '</span></div>' +
      '<p>' + esc(m.from) + ' ← ' + esc(m.to) + (m.regular ? '<span class="tp-reg">נסיעה קבועה</span>' : '') + '</p>' +
      '<p class="lbl">' + near + ' · הדרך שלך ' + m.segKm + ' ק"מ' + stars + '</p>' +
      '<p class="tp-save">המונית כולה כ-' + t.fare + ' ₪. ' + (t.split === 'km' ? 'מתחלקים לפי הק"מ: ' : 'מתחלקים שווה בשווה, ' + t.people + ' נוסעים: ') +
      'החלק שלך כ-<b>' + m.price + ' ₪</b>' + (t.save ? ' במקום כ-' + t.alone + ' ₪ במונית לבד. <b>חוסך כ-' + t.save + ' ₪.</b>' : '.') + '</p>' +
      (m.note ? '<p>' + esc(m.note) + '</p>' : '') +
      '<div class="acts">' + act + '</div></div>';
  }
  var lastMatches = [];
  function initRiderActions() {
    $('rd-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-req]'); if (!b) return;
      var card = b.closest('.tp-match');
      var m = lastMatches[+b.getAttribute('data-req')];
      if (!m) return;
      var note = prompt(m.taxi ? 'רוצה להוסיף משהו למי שמזמין את המונית? (לא חובה)' : 'רוצה להוסיף משהו לנהג? (לא חובה)', '');
      if (note === null) return;
      b.disabled = true;
      api('/requests', { ride: m.ride, date: m.date, pickup: lastSearch.from, drop: lastSearch.to, mode: b.getAttribute('data-mode'), msg: note })
      .then(function () {
        used('request');
        card.querySelector('.acts').innerHTML = '<span class="tp-st pending">הבקשה נשלחה. ' + (m.taxi ? 'מי שמזמין את המונית' : 'הנהג') + ' יקבל אותה כשייכנס לאתר, ותראה כאן בלשונית הבקשות כשיאשר.</span>';
      }).catch(function (err) { b.disabled = false; alert(errText(err)); });
    });
  }

  /* ---------- נהג ---------- */
  var drRoute = null;
  function initDriver() {
    autocomplete($('dr-from')); autocomplete($('dr-to'));
    chips('dr-kind'); chips('dr-days', true); chips('dr-mode'); chips('dr-split');
    $('dr-mode').addEventListener('change', function () {
      var tx = isTaxiMode();
      $('dr-car-f').hidden = tx; $('dr-taxi-f').hidden = !tx; $('dr-taxi-hint').hidden = !tx;
      $('dr-go').textContent = tx ? 'לחשב מחיר מונית ולפרסם' : 'לחשב מסלול ולפרסם';
      $('dr-note').placeholder = tx ? 'מזמין דרך גט, אפשר לחכות 5 דקות' : 'אוסף ליד הכניסה לשכונה, בלי עישון';
      showRoute();
    });
    $('dr-split').addEventListener('change', function () {
      $('dr-split-hint').textContent = chipVal('dr-split', 'data-s') === 'km' ? 'כל מצטרף משלם לפי החלק שלו מהדרך: מי שנוסע חצי דרך משלם פחות.' : 'כל מי שבמונית משלם אותו סכום.';
      showRoute();
    });
    $('dr-tseats').addEventListener('change', showRoute);
    $('dr-date').value = addDays(0); $('dr-date').min = addDays(0); $('dr-date').max = addDays(30);
    $('dr-here').addEventListener('click', function () { hereInto($('dr-from'), $('dr-here')); });
    $('dr-kind').addEventListener('change', function () {
      var reg = chipVal('dr-kind', 'data-k') === 'regular';
      $('dr-days-f').hidden = !reg; $('dr-date-f').hidden = reg;
    });
    ['dr-from', 'dr-to'].forEach(function (id) { $(id).addEventListener('input', function () { drRoute = null; $('dr-route').innerHTML = ''; }); });
    $('dr-rate').addEventListener('change', showRoute);
    $('dr-form').addEventListener('submit', function (e) { e.preventDefault(); publish(); });
    $('dr-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-close]'); if (!b) return;
      if (!confirm('לבטל את הנסיעה? מי שאושר יראה אצלו שהנסיעה בוטלה.')) return;
      api('/rides/' + b.getAttribute('data-close') + '/close', {}).then(loadMyRides).catch(function (err) { alert(errText(err)); });
    });
    $('dr-cal').addEventListener('click', importCalendar);
  }
  var isTaxiMode = function () { return chipVal('dr-mode', 'data-m') === 'taxi'; };
  function showRoute() {
    if (!drRoute) return;
    var rate = +$('dr-rate').value, km = Math.round(drRoute.km * 10) / 10;
    if (isTaxiMode()) {
      var reg = chipVal('dr-kind', 'data-k') === 'regular';
      var fare = taxiFare(km, drRoute.min, reg ? addDays(0) : $('dr-date').value, $('dr-time').value);
      var n = +$('dr-tseats').value + 1;
      $('dr-route').innerHTML = '<b>' + km + ' ק"מ · כ-' + Math.round(drRoute.min) + ' דקות · המונית כ-' + fare + ' ₪.</b> ' +
        (chipVal('dr-split', 'data-s') === 'km' ? 'כל מצטרף משלם לפי הק"מ שלו, ואת השאר משלמים יחד.' :
          'אם יצטרפו ' + (n - 1) + ', כל אחד משלם כ-' + Math.round(fare / n) + ' ₪, ואתה חוסך כ-' + (fare - Math.round(fare / n)) + ' ₪.') +
        ' תקבל 10 נקודות חסד על כל מי שמצטרף.';
      return;
    }
    $('dr-route').innerHTML = '<b>' + km + ' ק"מ · כ-' + Math.round(drRoute.min) + ' דקות.</b> ' +
      (rate ? 'נוסע לכל הדרך משתתף ב-' + price(km, rate) + ' ₪; מי שמצטרף לחלק מהדרך משלם לפי הק"מ שלו (מינימום 5 ₪).' : 'בחינם. תזכה לנקודות חסד על כל טרמפ.');
  }
  function publish() {
    var msg = $('dr-msg');
    var reg = chipVal('dr-kind', 'data-k') === 'regular';
    var days = [].map.call($('dr-days').querySelectorAll('button.on'), function (b) { return +b.getAttribute('data-d'); });
    if (reg && !days.length) { msg.textContent = 'בחרו לפחות יום אחד.'; return; }
    msg.textContent = 'מחשב מסלול...';
    var from, to, sent;
    Promise.all([placeOf($('dr-from')), placeOf($('dr-to'))]).then(function (pp) {
      from = pp[0]; to = pp[1];
      return drRoute ? drRoute : routeOf(from, to);
    }).then(function (r) {
      drRoute = r; showRoute();
      msg.textContent = 'מפרסם...';
      var data = { from: from, to: to, time: $('dr-time').value, seats: +$('dr-seats').value, rate: +$('dr-rate').value, km: r.km, min: r.min, route: r.pts, note: $('dr-note').value };
      if (isTaxiMode()) { data.kind = 'taxi'; data.split = chipVal('dr-split', 'data-s'); data.seats = +$('dr-tseats').value; data.rate = 0; }
      if (reg) data.days = days; else data.date = $('dr-date').value;
      sent = data;
      return api('/rides', data);
    }).then(function () {
      var tx = isTaxiMode();
      used(tx ? 'publish-taxi' : 'publish');
      var when = reg ? 'בימים ' + days.map(function (d) { return LET[d] + "'"; }).join(' ') : dayLabel($('dr-date').value);
      var share = tx ? 'אני לוקח מונית ' + when + ' ב-' + $('dr-time').value + ' מ' + from.label + ' ל' + to.label + '. מי שבדרך מוזמן להצטרף, ומתחלקים במונה: ' + PAGE :
        'אני נוסע ' + when + ' ב-' + $('dr-time').value + ' מ' + from.label + ' ל' + to.label + ', ויש לי מקום. מי שבדרך מוזמן להצטרף: ' + PAGE;
      msg.innerHTML = 'הנסיעה פורסמה! כל מי שבדרך יראה אותה. <a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(share) + '">לספר בקבוצה של השכונה</a>';
      drRoute = null; $('dr-route').innerHTML = '';
      rememberRide(sent); loadMyRides(); loadStats();
    }).catch(function (err) {
      msg.textContent = err.message === 'notfound' || err.message === 'empty' ? 'לא מצאתי את הכתובת. כתבו רחוב ועיר ובחרו מהרשימה.' : err.message === 'route' ? 'לא הצלחתי לחשב מסלול בין הנקודות.' : errText(err);
    });
  }
  function loadMyRides() {
    if (!token || !me || !me.ready) return;
    api('/rides/mine').then(function (j) {
      $('dr-list').innerHTML = j.rides.length ? j.rides.map(function (r) {
        var when = r.days ? 'קבוע: ' + r.days.split(',').map(function (d) { return LET[+d] + "'"; }).join(' ') : dayLabel(r.date);
        var tx = r.kind === 'taxi';
        return '<div class="kh-item' + (tx ? ' tp-taxi' : '') + '"><div class="top"><b>' + (tx ? '<span class="tp-kind">🚕 מונית</span> ' : '') + esc(when) + ' · ' + esc(r.time) + '</b><span>' + r.seats + ' מקומות · ' +
          (tx ? 'כ-' + r.fare + ' ₪, ' + (r.split === 'km' ? 'לפי ק"מ' : 'שווה בשווה') : r.rate ? r.rate + ' ₪ לק"מ' : 'בחינם') + '</span></div>' +
          '<p>' + esc(r.from_label) + ' ← ' + esc(r.to_label) + ' · ' + r.km + ' ק"מ</p>' +
          (r.pending ? '<p class="lbl">' + r.pending + ' מבקשים להצטרף – ראו בלשונית הבקשות</p>' : '') +
          (r.approved ? '<p class="lbl">אושרו: ' + r.approved + '</p>' : '') +
          '<div class="acts"><button type="button" data-close="' + esc(r.id) + '">לבטל את הנסיעה</button></div></div>';
      }).join('') : '<p class="kh-empty">עוד לא פרסמת נסיעה.</p>';
    }).catch(function () {});
  }

  /* ---------- יומן גוגל → טרמפים (מה ש-Waze מתכנן) ---------- */
  var calEvents = [];
  function importCalendar() {
    var box = $('dr-cal-list');
    if (!(window.google && google.accounts && google.accounts.oauth2) || CLIENT_ID === 'PENDING') { box.innerHTML = '<p class="kh-empty">הייבוא עוד לא זמין. נסו לרענן.</p>'; return; }
    var client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: CAL_SCOPE, prompt: '',
      callback: function (t) {
        if (!t || !t.access_token) { box.innerHTML = '<p class="kh-empty">לא התקבלה הרשאה ליומן.</p>'; return; }
        box.innerHTML = '<p class="kh-empty">קורא את השבוע הקרוב...</p>';
        var now = new Date(), end = new Date(Date.now() + 8 * 864e5);
        fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=50&timeMin=' + now.toISOString() + '&timeMax=' + end.toISOString(),
          { headers: { Authorization: 'Bearer ' + t.access_token } })
          .then(function (r) { return r.json(); }).then(function (j) {
            calEvents = (j.items || []).filter(function (ev) { return ev.location && ev.start && ev.start.dateTime; });
            used('calendar');
            box.innerHTML = calEvents.length ? '<div class="kh-sec"><h2>נסיעות מהיומן</h2>' + calEvents.map(function (ev, i) {
              var s = new Date(ev.start.dateTime);
              return '<div class="kh-item"><div class="top"><b>' + esc(ev.summary || 'אירוע') + '</b><span>' + esc(dayLabel(ymd(s))) + ' · ' + String(s.getHours()).padStart(2, '0') + ':' + String(s.getMinutes()).padStart(2, '0') + '</span></div>' +
                '<p>' + esc(ev.location) + '</p><div class="acts"><button type="button" class="go" data-ev="' + i + '">להפוך לטרמפ</button></div></div>';
            }).join('') + '</div>' : '<p class="kh-empty">לא מצאתי בשבוע הקרוב אירועים עם כתובת. אירוע עם כתובת ביומן = נסיעה ש-Waze יתכנן.</p>';
            try { google.accounts.oauth2.revoke(t.access_token, function () {}); } catch (e) {}
          }).catch(function () { box.innerHTML = '<p class="kh-empty">לא הצלחתי לקרוא את היומן.</p>'; });
      },
    });
    client.requestAccessToken();
  }
  function initCalendarPick() {
    $('dr-cal-list').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-ev]'); if (!b) return;
      var ev = calEvents[+b.getAttribute('data-ev')]; if (!ev) return;
      var s = new Date(ev.start.dateTime);
      // יוצאים חצי שעה לפני האירוע (אפשר לשנות)
      var dep = new Date(s.getTime() - 30 * 60000);
      document.querySelector('#dr-kind [data-k="once"]').click();
      $('dr-date').value = ymd(dep);
      $('dr-time').value = String(dep.getHours()).padStart(2, '0') + ':' + String(dep.getMinutes()).padStart(2, '0');
      $('dr-to').value = ev.location; $('dr-to')._place = null; drRoute = null;
      $('dr-note').value = ev.summary ? 'בדרך ל' + ev.summary.slice(0, 60) : '';
      $('dr-msg').textContent = 'מילאתי מהיומן. בדקו את "יוצא מ..." ואת השעה, ולחצו לפרסם.';
      $('dr-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- בקשות ---------- */
  var inboxData = null;
  function loadInbox() {
    if (!token || !me || !me.ready) return;
    api('/inbox').then(function (j) {
      inboxData = j;
      var pend = j.asDriver.filter(function (x) { return x.status === 'pending'; }).length;
      var b = $('tp-badge'); b.hidden = !pend; b.textContent = pend;
      document.title = document.title.replace(/^\(\d+\) /, '');
      if (pend) document.title = '(' + pend + ') ' + document.title;
      $('ib-driver').innerHTML = j.asDriver.length ? j.asDriver.map(driverReqHtml).join('') : '<p class="kh-empty">עוד אין בקשות. כשמישהו יבקש להצטרף לנסיעה שלך, זה יופיע כאן.</p>';
      $('ib-rider').innerHTML = j.asRider.length ? j.asRider.map(riderReqHtml).join('') : '<p class="kh-empty">עוד לא שלחת בקשות.</p>';
    }).catch(function () {});
  }
  var ST = { pending: 'ממתין', approved: 'אושר', declined: 'לא הפעם', cancelled: 'בוטל' };
  function money(x) { return x.price ? x.price + ' ₪ השתתפות בדלק' : 'בחינם'; }
  function driverReqHtml(x) {
    var r = x.rider;
    var acts = '';
    if (x.status === 'pending') {
      acts = '<button type="button" class="ok" data-act="approve" data-id="' + x.id + '">' + (x.kind === 'taxi' ? 'לאשר שיצטרף למונית' : 'לאשר' + (x.mode === 'paid' && x.price ? ' (' + x.price + ' ₪)' : '')) + '</button>' +
        (x.mode === 'paid' && x.price && x.kind !== 'taxi' ? '<button type="button" data-act="approve-free" data-id="' + x.id + '">לאשר בחינם</button>' : '') +
        '<button type="button" class="no" data-act="decline" data-id="' + x.id + '">לא הפעם</button>';
    } else if (x.status === 'approved' && x.kind === 'taxi') {
      var tt = 'היי ' + r.name.split(' ')[0] + ', זה ' + me.name.split(' ')[0] + ' מהטרמפים. נפגשים ' + dayLabel(x.date) + ' בסביבות ' + x.pass + ' ב' + x.pickup.label +
        ', ואני עם המונית. החלק שלך במונה כ-' + x.price + ' ₪, בביט אחרי הנסיעה.';
      acts = '<a href="' + waPhone(r.phone, tt) + '" target="_blank" rel="noopener">ווטסאפ ל' + esc(r.name.split(' ')[0]) + '</a>' +
        '<a href="' + waze(x.pickup) + '" target="_blank" rel="noopener">נפגשים ב' + esc(x.pickup.label) + ' (Waze)</a>' +
        '<a href="' + calLink('מונית משותפת עם ' + r.name, x.date, x.pass, 20, x.pickup.label, 'טלפון: ' + r.phone + '\n' + PAGE) + '" target="_blank" rel="noopener">ליומן</a>' +
        '<button type="button" data-act="cancel" data-id="' + x.id + '">לבטל</button>';
    } else if (x.status === 'approved') {
      var t = 'היי ' + r.name.split(' ')[0] + ', זה ' + me.name.split(' ')[0] + ' מהטרמפים. אוסף אותך ' + dayLabel(x.date) + ' בסביבות ' + x.pass + ' ב' + x.pickup.label + '.';
      acts = '<a href="' + waPhone(r.phone, t) + '" target="_blank" rel="noopener">ווטסאפ ל' + esc(r.name.split(' ')[0]) + '</a>' +
        '<a href="' + waze(x.pickup) + '" target="_blank" rel="noopener">Waze לנקודת האיסוף</a>' +
        '<a href="' + calLink('טרמפ: לאסוף את ' + r.name, x.date, x.pass, 20, x.pickup.label, 'טלפון: ' + r.phone + '\n' + PAGE) + '" target="_blank" rel="noopener">ליומן (ול-Waze)</a>' +
        '<button type="button" data-act="cancel" data-id="' + x.id + '">לבטל</button>';
    }
    var tx = x.kind === 'taxi';
    return '<div class="kh-item tp-match' + (tx ? ' tp-taxi' : '') + '"><div class="top"><b>' + (tx ? '<span class="tp-kind">🚕 מונית</span> ' : '') + esc(r.name) + (r.rating ? ' · ★ ' + r.rating : '') + '</b><span class="tp-st ' + x.status + '">' + ST[x.status] + '</span></div>' +
      '<p>' + esc(dayLabel(x.date)) + ' · ' + (tx ? 'מונית של ' : 'נסיעה של ') + esc(x.time) + ' · ' + esc(x.from) + ' ← ' + esc(x.to) + '</p>' +
      '<p class="lbl">' + (tx ? 'נפגשים ב' : 'איסוף ב') + esc(x.pickup.label) + ' בערך ב-' + esc(x.pass) + ' · עד ' + esc(x.drop) + ' · ' + x.segKm + ' ק"מ · ' +
        (tx ? 'משתתף במונה בכ-' + x.price + ' ₪ (המונית כולה כ-' + x.fare + ' ₪)' : x.mode === 'free' ? 'מבקש בחינם' : money(x)) + '</p>' +
      (x.msg ? '<p>"' + esc(x.msg) + '"</p>' : '') + '<div class="acts">' + acts + '</div></div>';
  }
  function riderReqHtml(x) {
    var d = x.driver, acts = '', pay = '', tx = x.kind === 'taxi';
    if (x.status === 'approved' && tx) {
      var tt = 'היי ' + d.name.split(' ')[0] + ', זה ' + me.name.split(' ')[0] + ' מהטרמפים. תודה שצירפת אותי למונית! נפגשים ב' + x.pickup.label + ' בסביבות ' + x.pass + '.';
      acts = '<a href="' + waPhone(d.phone, tt) + '" target="_blank" rel="noopener">ווטסאפ ל' + esc(d.name.split(' ')[0]) + '</a>' +
        '<a href="' + waze(x.pickup) + '" target="_blank" rel="noopener">נפגשים ב' + esc(x.pickup.label) + ' (Waze)</a>' +
        '<a href="' + calLink('מונית משותפת עם ' + d.name, x.date, x.pass, 30, x.pickup.label, 'טלפון: ' + d.phone + '\n' + PAGE) + '" target="_blank" rel="noopener">ליומן</a>' +
        '<button type="button" data-act="cancel" data-id="' + x.id + '">לבטל</button>';
      pay = '<div class="tp-pay">החלק שלך במונה: <b>כ-' + x.price + ' ₪</b> (המונית כולה כ-' + x.fare + ' ₪, ' + (x.split === 'km' ? 'לפי הק"מ שלך' : 'שווה בשווה') + '). ' +
        'המספר המדויק לפי המונה בסוף. משלמים ל' + esc(d.name.split(' ')[0]) + ' בביט לטלפון <b dir="ltr">' + esc(d.phone) + '</b> <button type="button" class="btn btn-line btn-sm" data-copy="' + esc(d.phone) + '">להעתיק</button>' +
        (d.paybox ? ' או <a href="' + esc(/^https:/.test(d.paybox) ? d.paybox : '#') + '" target="_blank" rel="noopener">בפייבוקס</a>' : '') + '.</div>';
    } else if (x.status === 'approved') {
      var t = 'היי ' + d.name.split(' ')[0] + ', זה ' + me.name.split(' ')[0] + ' מהטרמפים. תודה שאישרת! אחכה ב' + x.pickup.label + ' בסביבות ' + x.pass + '.';
      acts = '<a href="' + waPhone(d.phone, t) + '" target="_blank" rel="noopener">ווטסאפ ל' + esc(d.name.split(' ')[0]) + '</a>' +
        '<a href="' + waze(x.pickup) + '" target="_blank" rel="noopener">Waze לנקודת האיסוף</a>' +
        '<a href="' + calLink('טרמפ עם ' + d.name, x.date, x.pass, 30, x.pickup.label, 'טלפון: ' + d.phone + '\n' + PAGE) + '" target="_blank" rel="noopener">ליומן</a>' +
        '<button type="button" data-act="cancel" data-id="' + x.id + '">לבטל</button>';
      if (x.price) pay = '<div class="tp-pay">השתתפות בדלק: <b>' + x.price + ' ₪</b>. בביט לטלפון <b dir="ltr">' + esc(d.phone) + '</b> <button type="button" class="btn btn-line btn-sm" data-copy="' + esc(d.phone) + '">להעתיק</button>' +
        (d.paybox ? ' או <a href="' + esc(/^https:/.test(d.paybox) ? d.paybox : '#') + '" target="_blank" rel="noopener">בפייבוקס</a>' : '') + '. משלמים אחרי הנסיעה.</div>';
    } else if (x.status === 'pending') {
      acts = '<button type="button" data-act="cancel" data-id="' + x.id + '">לבטל את הבקשה</button>';
    }
    return '<div class="kh-item tp-match' + (tx ? ' tp-taxi' : '') + '"><div class="top"><b>' + (tx ? '<span class="tp-kind">🚕 מונית</span> ' : '') + esc(d.name) + ' · ' + esc(dayLabel(x.date)) + ' ב-' + esc(x.pass) + '</b><span class="tp-st ' + x.status + '">' + ST[x.status] + '</span></div>' +
      '<p>' + (tx ? 'נפגשים ב' : 'איסוף ב') + esc(x.pickup.label) + ' · עד ' + esc(x.drop) + ' · ' + (tx ? 'החלק שלך במונה כ-' + x.price + ' ₪' : money(x)) + '</p>' + pay + '<div class="acts">' + acts + '</div></div>';
  }
  function initInboxActions() {
    $('tp-main').addEventListener('click', function (e) {
      var c = e.target.closest('button[data-copy]');
      if (c) { (window.kelimCopy ? window.kelimCopy(c.getAttribute('data-copy')) : navigator.clipboard.writeText(c.getAttribute('data-copy'))); c.textContent = 'הועתק'; return; }
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'cancel' && !confirm('לבטל?')) return;
      var data = act === 'approve-free' ? { action: 'approve', free: true } : { action: act };
      b.disabled = true;
      api('/requests/' + b.getAttribute('data-id'), data).then(function () { used(act === 'cancel' ? 'cancel' : act === 'decline' ? 'decline' : 'approve'); loadInbox(); loadMyRides(); loadStats(); })
        .catch(function (err) { b.disabled = false; alert(errText(err)); });
    });
  }

  /* ---------- רעיונות ---------- */
  function initIdeas() {
    $('id-send').addEventListener('click', function () {
      var t = $('id-text').value.trim(); if (t.length < 3) return;
      api('/ideas', { text: t }).then(function () { $('id-msg').textContent = 'תודה! הרעיון הגיע לגילעד.'; $('id-text').value = ''; used('idea'); })
        .catch(function () { $('id-msg').textContent = 'לא נשלח. נסו שוב.'; });
    });
  }

  /* ---------- מהיר לנהג: יוצא עכשיו, מקומות שמורים, שוב כמו בפעם הקודמת ---------- */
  var PLACES_KEY = 'trempim_places', AGAIN_KEY = 'trempim_again';
  var readJson = function (k, d) { try { var v = JSON.parse(lsGet(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  var short = function (label) { var t = String(label || '').split(',')[0].trim(); return t.length > 20 ? t.slice(0, 19) + '…' : t; };
  var samePlace = function (a, b) { return !!(a && b && Math.abs(a.lat - b.lat) < 0.0015 && Math.abs(a.lng - b.lng) < 0.0015); };
  function rememberPlace(p) {
    if (!p || !p.lat) return;
    var list = readJson(PLACES_KEY, []).filter(function (x) { return !samePlace(x, p); });
    list.unshift({ label: p.label, lat: p.lat, lng: p.lng });
    lsSet(PLACES_KEY, JSON.stringify(list.slice(0, 8)));
    renderPlaces();
  }
  // הבית והמקומות מ"הלו"ז הקבוע שלי" קודם, אחר כך המקומות האחרונים
  function savedPlaces() {
    var out = [], luz = readJson('trempim_luz', null);
    var add = function (name, p) { if (p && p.lat && !out.some(function (x) { return samePlace(x.p, p); })) out.push({ name: name, p: p }); };
    if (luz && !luz.sample) {
      add('🏠 בית', luz.home);
      (luz.items || []).forEach(function (it) { add('📍 ' + it.name, it.place); });
    }
    readJson(PLACES_KEY, []).forEach(function (p) { add(short(p.label), p); });
    return out.slice(0, 7);
  }
  function renderPlaces() {
    var list = savedPlaces();
    document.querySelectorAll('.tp-places').forEach(function (box) {
      box.innerHTML = list.map(function (x, i) { return '<button type="button" data-pl="' + i + '">' + esc(x.name) + '</button>'; }).join('');
      box.hidden = !list.length;
      box._list = list;
    });
  }
  function fillPlace(input, p) {
    input.value = p.label; input._place = { label: p.label, lat: p.lat, lng: p.lng };
    if (/^dr-/.test(input.id)) { drRoute = null; $('dr-route').innerHTML = ''; }
  }
  function nowPlus(mins) {
    var d = new Date(Date.now() + mins * 60000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return d;
  }
  var hhmm = function (d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  var daysShort = function (ds) { return ds.map(function (d) { return LET[d] + "'"; }).join(' '); };
  function rememberRide(d) {
    if (!d) return;
    rememberPlace(d.from); rememberPlace(d.to);
    var t = { from: d.from, to: d.to, time: d.time, seats: d.seats, rate: d.rate, note: d.note || '', days: d.days || null, kind: d.kind || 'car', split: d.split || null };
    var list = readJson(AGAIN_KEY, []).filter(function (x) { return !(samePlace(x.from, t.from) && samePlace(x.to, t.to) && x.time === t.time && x.kind === t.kind); });
    list.unshift(t);
    lsSet(AGAIN_KEY, JSON.stringify(list.slice(0, 4)));
    renderAgain();
  }
  function renderAgain() {
    var list = readJson(AGAIN_KEY, []), box = $('dr-again');
    box.innerHTML = list.length ? '<span class="label">שוב כמו בפעם הקודמת:</span><div class="tp-again">' + list.map(function (t, i) {
      var when = t.days ? daysShort(t.days) + ' · ' : '';
      return '<button type="button" data-again="' + i + '"><span>' + (t.kind === 'taxi' ? '🚕 ' : '↻ ') + esc(short(t.from.label)) + ' ← ' + esc(short(t.to.label)) + '</span><small>' + esc(when + t.time) + '</small></button>';
    }).join('') + '</div>' : '';
    box._list = list;
  }
  function setMode(kind) { var b = document.querySelector('#dr-mode [data-m="' + (kind === 'taxi' ? 'taxi' : 'car') + '"]'); if (b && !b.classList.contains('on')) b.click(); }
  function setOnce(date) {
    var b = document.querySelector('#dr-kind [data-k="once"]'); if (!b.classList.contains('on')) b.click();
    $('dr-date').value = date;
  }
  function useAgain(t) {
    setMode(t.kind);
    fillPlace($('dr-from'), t.from); fillPlace($('dr-to'), t.to);
    $('dr-time').value = t.time; $('dr-note').value = t.note || '';
    if (t.kind === 'taxi') {
      if (t.seats) $('dr-tseats').value = String(t.seats);
      var sb = t.split && document.querySelector('#dr-split [data-s="' + t.split + '"]'); if (sb && !sb.classList.contains('on')) sb.click();
    } else { $('dr-seats').value = String(t.seats || 3); $('dr-rate').value = String(t.rate); }
    if (t.days) {
      var rb = document.querySelector('#dr-kind [data-k="regular"]'); if (!rb.classList.contains('on')) rb.click();
      document.querySelectorAll('#dr-days button').forEach(function (b) { b.classList.toggle('on', t.days.indexOf(+b.getAttribute('data-d')) >= 0); });
    } else {
      // היום אם השעה עוד לא עברה, אחרת מחר
      setOnce(hhmm(new Date()) < t.time ? addDays(0) : addDays(1));
    }
    $('dr-msg').textContent = 'מילאתי כמו בפעם הקודמת (' + (t.days ? 'נסיעה קבועה' : dayLabel($('dr-date').value)) + ' ב-' + t.time + '). בודקים ולוחצים לפרסם.';
    $('dr-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    used('fast-again');
  }
  function leaveNow() {
    var d = nowPlus(10);
    setOnce(ymd(d)); $('dr-time').value = hhmm(d);
    $('dr-msg').textContent = 'יוצא ב-' + hhmm(d) + '. בוחרים לאן, ולוחצים לפרסם.';
    $('dr-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!$('dr-from')._place) {
      if (navigator.geolocation) hereInto($('dr-from'), $('dr-here'));
      else { var home = savedPlaces().filter(function (x) { return x.name === '🏠 בית'; })[0]; if (home) fillPlace($('dr-from'), home.p); }
    }
    setTimeout(function () { $('dr-to').focus(); }, 400);
    used('fast-now');
  }
  function initFast() {
    ['dr-from', 'dr-to', 'rd-from', 'rd-to'].forEach(function (id) {
      var field = $(id).closest('.field'), box = document.createElement('div');
      box.className = 'kh-chips tp-places'; box.hidden = true;
      field.appendChild(box);
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-pl]'); if (!b) return;
        var x = box._list[+b.getAttribute('data-pl')]; if (!x) return;
        fillPlace($(id), x.p); used('fast-place');
      });
    });
    $('dr-now').addEventListener('click', leaveNow);
    $('dr-again').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-again]'); if (!b) return;
      var t = $('dr-again')._list[+b.getAttribute('data-again')]; if (t) useAgain(t);
    });
    renderPlaces(); renderAgain();
  }

  /* ---------- התחלה ---------- */
  function start() {
    loadStats(); initCalc(); initProfile(); initTabs(); initRider(); initRiderActions(); initDriver(); initFast(); initCalendarPick(); initInboxActions(); initIdeas();
    if (token) {
      api('/me').then(function (j) { me = j.user; showApp(); }).catch(function () { initGoogle(); });
    }
    initGoogle();
    // בדיקת בקשות חדשות כל דקה כשהדף פתוח
    setInterval(function () { if (!document.hidden && me && me.ready) loadInbox(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && me && me.ready) loadInbox(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
