/* הלו"ז הקבוע שלי – /kelim/kehila/trempim/luz/
   רשימת נסיעות קבועות (localStorage) → יומן (קישור גוגל עם RRULE, או קובץ ‎.ics לכולם) → Waze,
   ובלחיצה → נסיעה קבועה בשרת הטרמפים (POST /rides עם days).
   כתובות: Photon. זמן נסיעה: OSRM. */
(function () {
  'use strict';
  var API = 'https://trempim.gilad4049.workers.dev';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { var qa = new URLSearchParams(location.search).get('api'); if (qa) API = qa; }
  var CLIENT_ID = '811978831024-vp67lekd6gmffh9sq07jqapvjvmdpudn.apps.googleusercontent.com';
  var TOKEN_KEY = 'trempim_token', KEY = 'trempim_luz';
  var PAGE = 'https://hakelim.com/kelim/kehila/trempim/luz/';
  var $ = function (id) { return document.getElementById(id); };
  var used = function (how) { try { window.toolUsed && window.toolUsed('trempim', { how: 'luz-' + how }); } catch (e) {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };

  var LET = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  var RR = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  var pad = function (n) { return String(n).padStart(2, '0'); };
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  var toMin = function (t) { var p = String(t || '').split(':'); return +p[0] * 60 + +p[1]; };
  var toTime = function (m) { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  var daysText = function (ds) {
    var s = ds.slice().sort().join(',');
    if (s === '0,1,2,3,4') return "א'–ה'";
    if (s === '0,1,2,3,4,5') return "א'–ו'";
    return ds.slice().sort().map(function (d) { return LET[d] + "'"; }).join(' ');
  };

  /* ---------- מצב ---------- */
  var SAMPLE = {
    sample: true, home: null, margin: 10, rate: 1, seats: 3,
    items: [
      { id: 's1', name: 'עבודה', place: { label: 'בית החולים שערי צדק, ירושלים', lat: 31.78696, lng: 35.2084 }, days: [0, 1, 2, 3, 4], arrive: '08:00', back: '16:30' },
      { id: 's2', name: 'שיעור ערב', place: { label: 'גן סאקר, ירושלים', lat: 31.77987, lng: 35.20758 }, days: [1, 3], arrive: '20:00', back: '21:30' },
    ],
  };
  var S;
  try { S = JSON.parse(lsGet(KEY) || 'null'); } catch (e) { S = null; }
  if (!S || !Array.isArray(S.items)) S = JSON.parse(JSON.stringify(SAMPLE));
  function save() { lsSet(KEY, JSON.stringify(S)); }
  var newId = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

  /* ---------- כתובות (כמו בדף הטרמפים) ---------- */
  function photonLabel(p) {
    var a = p.properties || {};
    var street = a.street ? a.street + (a.housenumber ? ' ' + a.housenumber : '') : '';
    var main = a.name && a.name !== a.street ? a.name : street || a.name || '';
    var sub = [a.name && street && a.name !== a.street ? street : '', a.city || a.town || a.village || a.county || ''].filter(Boolean).join(', ');
    return { main: main || sub, sub: main ? sub : '', label: [main, a.city || a.town || a.village || ''].filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }).join(', ') };
  }
  // כמו בדף הטרמפים: Photon בלי מספר הבית, עדיפות לעיר שנכתבה ולאזור של המשתמש, והמספר חוזר לתווית
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
        return !(a.osm_value === 'bus_stop' || a.osm_key === 'public_transport' || a.osm_value === 'platform' || /\//.test(a.name || ''));
      }).map(function (f, i) {
        var l = photonLabel(f), a = f.properties || {};
        var city = a.city || a.town || a.village || '';
        var isStreet = a.type === 'street' || (a.osm_key === 'highway' && !a.housenumber);
        var main = l.main, label = l.label;
        if (sp.num && isStreet) { main = (a.name || a.street) + ' ' + sp.num; label = main + (city ? ', ' + city : ''); }
        var score = i;
        words.forEach(function (w) { if (city && city.indexOf(w) >= 0) score -= 20; });
        if (main && main.indexOf(sp.text.split(',')[0].trim()) === 0) score -= 8;
        // עיר או שכונה בשם שנכתב קודמת למסעדה או חנות באותה עיר
        if (a.osm_key === 'place' && main && main.indexOf(sp.text.split(',')[0].trim()) === 0) score -= 60;
        return { label: label, main: main, sub: l.sub || city, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], score: score };
      }).filter(function (it) { var k = it.label; if (seen[k]) return false; seen[k] = 1; return true; })
        .sort(function (x, y) { return x.score - y.score; }).slice(0, 7);
    });
  }
  function autocomplete(input) {
    var ul = document.createElement('ul'); ul.className = 'tp-sug'; ul.hidden = true;
    input.parentNode.appendChild(ul);
    var timer, items = [], idx = -1;
    function close() { ul.hidden = true; idx = -1; }
    function pick(it) { input.value = it.label; input._place = { label: it.label, lat: +it.lat.toFixed(5), lng: +it.lng.toFixed(5) }; setBias(it); close(); input.dispatchEvent(new Event('placechange')); }
    input.addEventListener('input', function () {
      input._place = null; clearTimeout(timer);
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
  function placeOf(input) {
    if (input._place) return Promise.resolve(input._place);
    var q = input.value.trim();
    if (!q) return Promise.reject(new Error('empty'));
    return geocode(q).then(function (l) {
      if (!l.length) throw new Error('notfound');
      input._place = { label: l[0].label, lat: +l[0].lat.toFixed(5), lng: +l[0].lng.toFixed(5) };
      input.value = l[0].label;
      setBias(l[0]);
      return input._place;
    });
  }

  /* ---------- מסלול ---------- */
  function routeOf(a, b, full) {
    var u = 'https://router.project-osrm.org/route/v1/driving/' + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=' + (full ? 'simplified&geometries=geojson' : 'false');
    return fetch(u).then(function (r) { return r.json(); }).then(function (j) {
      var r = j.routes && j.routes[0];
      if (!r) throw new Error('route');
      var out = { km: r.distance / 1000, min: r.duration / 60 };
      if (full) {
        var pts = r.geometry.coordinates.map(function (c) { return [+c[1].toFixed(5), +c[0].toFixed(5)]; });
        if (pts.length > 1400) { var step = Math.ceil(pts.length / 1400); pts = pts.filter(function (p, i) { return i % step === 0 || i === pts.length - 1; }); }
        out.pts = pts;
      }
      return out;
    });
  }
  var homeKey = function () { return S.home ? S.home.lat + ',' + S.home.lng : ''; };
  // זמן נסיעה מהבית לכל נסיעה, אחד אחרי השני (השרת הציבורי של OSRM לא אוהב עומס)
  var routing = false;
  function ensureRoutes() {
    if (routing || !S.home) return;
    var it = S.items.filter(function (x) { return !x.r || x.r.key !== homeKey(); })[0];
    if (!it) return;
    routing = true;
    var key = homeKey();
    routeOf(S.home, it.place).then(function (r) {
      it.r = { key: key, min: Math.round(r.min), km: Math.round(r.km * 10) / 10 };
    }).catch(function () {
      it.r = { key: key, min: null };
    }).then(function () { routing = false; save(); render(); ensureRoutes(); });
  }
  // שעת יציאה: שעת הגעה פחות זמן הנסיעה פחות המרווח, מעוגל ל-5 דקות כלפי מטה
  function depart(it) {
    if (!it.r || it.r.key !== homeKey() || it.r.min == null) return null;
    var m = toMin(it.arrive) - Math.ceil(it.r.min) - (S.margin || 0);
    return toTime(Math.floor(m / 5) * 5);
  }
  var leadMin = function (it) { var d = depart(it); return d ? toMin(it.arrive) - toMin(d) : 0; };

  /* ---------- יומן ---------- */
  // התאריך הראשון מהיום שנופל על אחד הימים (כדי שההתחלה תתאים לחוק החזרה)
  function firstDate(days) {
    var d = new Date(); d.setHours(12, 0, 0, 0);
    for (var i = 0; i < 7; i++) { if (days.indexOf(d.getDay()) >= 0) return d; d.setDate(d.getDate() + 1); }
    return d;
  }
  function span(it) {
    var d = firstDate(it.days), a = toMin(it.arrive), b = it.back ? toMin(it.back) : a + 60;
    if (b <= a) b = a + 60;
    var e = new Date(d); e.setHours(0, 0, 0, 0); e.setMinutes(b);
    var stamp = function (day, m) { return ymd(day).replace(/-/g, '') + 'T' + pad(Math.floor(m / 60) % 24) + pad(m % 60) + '00'; };
    return { s: stamp(d, a), e: stamp(e, b % 1440) };
  }
  var rrule = function (it) { return 'FREQ=WEEKLY;BYDAY=' + it.days.slice().sort().map(function (d) { return RR[d]; }).join(','); };
  function details(it) {
    var dep = depart(it), lines = [];
    if (dep) lines.push('לצאת מהבית בערך ב-' + dep + ' (כ-' + it.r.min + ' דקות נסיעה בלי פקקים, ועוד ' + S.margin + ' דקות מרווח).');
    lines.push('Waze מתכנן את הנסיעה לפי הכתובת ומזכיר מתי לצאת.');
    if (it.back) lines.push('חוזרים ב-' + it.back + '.');
    lines.push('הלו"ז הקבוע שלי: ' + PAGE);
    return lines.join('\n');
  }
  function gcalLink(it) {
    var t = span(it);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&ctz=Asia/Jerusalem&text=' + encodeURIComponent(it.name) +
      '&dates=' + t.s + '/' + t.e + '&recur=' + encodeURIComponent('RRULE:' + rrule(it)) +
      '&location=' + encodeURIComponent(it.place.label) + '&details=' + encodeURIComponent(details(it));
  }
  var icsEsc = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); };
  // שורות בקובץ יומן מוגבלות ל-75 בתים; עברית תופסת 2 בתים לאות
  function fold(line) {
    var out = '', n = 0;
    for (var ch of line) {
      var b = unescape(encodeURIComponent(ch)).length;
      if (n + b > 74) { out += '\r\n '; n = 1; }
      out += ch; n += b;
    }
    return out;
  }
  var TZ = ['BEGIN:VTIMEZONE', 'TZID:Asia/Jerusalem',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0300', 'TZNAME:IDT', 'DTSTART:19700327T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=23,24,25,26,27,28,29;BYDAY=FR', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0200', 'TZNAME:IST', 'DTSTART:19701025T020000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'];
  function buildIcs() {
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//luz//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:הלו"ז הקבוע שלי'].concat(TZ);
    S.items.forEach(function (it) {
      var t = span(it), lead = leadMin(it) || 30;
      L.push('BEGIN:VEVENT', 'UID:luz-' + it.id + '@hakelim.com', 'DTSTAMP:' + now,
        'DTSTART;TZID=Asia/Jerusalem:' + t.s, 'DTEND;TZID=Asia/Jerusalem:' + t.e, 'RRULE:' + rrule(it),
        'SUMMARY:' + icsEsc(it.name), 'LOCATION:' + icsEsc(it.place.label), 'GEO:' + it.place.lat + ';' + it.place.lng,
        'DESCRIPTION:' + icsEsc(details(it)),
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc('הגיע הזמן לצאת: ' + it.name), 'TRIGGER:-PT' + lead + 'M', 'END:VALARM',
        'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  function downloadIcs() {
    var msg = $('lz-ics-msg');
    if (!S.items.length) { msg.textContent = 'קודם מוסיפים לפחות נסיעה אחת.'; return; }
    var blob = new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) { location.href = url; }
    else { var a = document.createElement('a'); a.href = url; a.download = 'luz-kavua.ics'; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    msg.textContent = 'הקובץ ירד. פותחים אותו ומאשרים "להוסיף ליומן". ' + (S.home ? '' : 'טיפ: כתבו למעלה מאיפה יוצאים, וההתראה תקפוץ בדיוק בשעת היציאה.');
    used('ics');
  }

  /* ---------- תצוגה ---------- */
  function render() {
    $('lz-sample').hidden = !S.sample;
    $('lz-list').innerHTML = S.items.length ? S.items.map(itemHtml).join('') : '<p class="kh-empty">עוד אין נסיעות. מוסיפים את הראשונה בכפתור למטה.</p>';
    document.querySelectorAll('#lz-margin button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-m') === S.margin); });
    document.querySelectorAll('#lz-rate button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-r') === S.rate); });
    $('lz-seats').value = String(S.seats);
  }
  function itemHtml(it, i) {
    var dep = depart(it), when;
    if (!S.home) when = '<p class="lbl">כתבו למעלה מאיפה יוצאים, ואחשב מתי לצאת.</p>';
    else if (dep) when = '<p class="lbl">לצאת ב-' + dep + ' · ' + it.r.km + ' ק"מ, כ-' + it.r.min + ' דק\' נסיעה</p>';
    else if (it.r && it.r.key === homeKey()) when = '<p class="lbl">לא הצלחתי לחשב זמן נסיעה לכתובת הזאת.</p>';
    else when = '<p class="lbl">מחשב זמן נסיעה...</p>';
    var pub = openRides && it.pub && (openRides[it.pub.go] || openRides[it.pub.back]);
    return '<div class="kh-item lz-item" data-i="' + i + '">' +
      '<div class="top"><b>' + esc(it.name) + '</b><span>' + esc(daysText(it.days)) + ' · להגיע ב-' + esc(it.arrive) + (it.back ? ' · חזרה ' + esc(it.back) : '') + '</span></div>' +
      '<p>' + esc(it.place.label) + '</p>' + when +
      '<div class="acts">' +
      '<a class="go" href="' + esc(gcalLink(it)) + '" target="_blank" rel="noopener" data-cal="' + i + '">📅 ליומן</a>' +
      (pub ? '<span class="tp-st approved">✓ בטרמפים</span>' : '<button type="button" class="go" data-pub="' + i + '">🚗 לפרסם כנסיעה קבועה</button>') +
      '<a href="https://waze.com/ul?ll=' + it.place.lat + ',' + it.place.lng + '&navigate=yes" target="_blank" rel="noopener">Waze</a>' +
      '<button type="button" data-edit="' + i + '">לערוך</button><button type="button" class="no" data-del="' + i + '">למחוק</button>' +
      '</div><p class="res lz-msg" id="lz-m' + i + '" aria-live="polite"></p></div>';
  }

  /* ---------- טופס ---------- */
  var editing = -1;
  function chips(id, multi) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (multi) b.classList.toggle('on');
      else $(id).querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $(id).dispatchEvent(new Event('change'));
    });
  }
  function openForm(i) {
    editing = i;
    var it = i >= 0 ? S.items[i] : { name: '', place: null, days: [0, 1, 2, 3, 4], arrive: '08:00', back: '' };
    $('lz-form-t').textContent = i >= 0 ? 'עריכה: ' + it.name : 'נסיעה קבועה חדשה';
    $('lz-name').value = it.name;
    $('lz-place').value = it.place ? it.place.label : ''; $('lz-place')._place = it.place || null;
    document.querySelectorAll('#lz-days button').forEach(function (b) { b.classList.toggle('on', it.days.indexOf(+b.getAttribute('data-d')) >= 0); });
    $('lz-arrive').value = it.arrive; $('lz-back').value = it.back || '';
    $('lz-form-msg').textContent = '';
    $('lz-form').hidden = false; $('lz-add').hidden = true;
    $('lz-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (i < 0) setTimeout(function () { $('lz-name').focus(); }, 300);
  }
  function closeForm() { editing = -1; $('lz-form').hidden = true; $('lz-add').hidden = false; }
  function submitForm(e) {
    e.preventDefault();
    var msg = $('lz-form-msg');
    var name = $('lz-name').value.trim().slice(0, 40);
    var days = [].map.call($('lz-days').querySelectorAll('button.on'), function (b) { return +b.getAttribute('data-d'); });
    if (!name) { msg.textContent = 'כתבו מה זה (למשל: עבודה).'; return; }
    if (!days.length) { msg.textContent = 'בחרו לפחות יום אחד.'; return; }
    if (!$('lz-arrive').value) { msg.textContent = 'חסרה שעת הגעה.'; return; }
    msg.textContent = 'מחפש את הכתובת...';
    placeOf($('lz-place')).then(function (place) {
      var old = editing >= 0 ? S.items[editing] : null;
      // נסיעה מהדוגמה שנערכה מקבלת מזהה משלה; הוספה ראשונה מוחקת את שאר הדוגמה
      if (!old && S.sample) S.items = S.items.filter(function (x) { return !/^s\d$/.test(x.id); });
      var it = { id: old && !/^s\d$/.test(old.id) ? old.id : newId(), name: name, place: place, days: days.sort(), arrive: $('lz-arrive').value, back: $('lz-back').value || '' };
      if (old && old.place.lat === place.lat && old.place.lng === place.lng && old.r) it.r = old.r;
      if (old && old.pub) it.pub = old.pub;
      if (old) S.items[editing] = it; else S.items.push(it);
      if (S.sample) { S.sample = false; }
      save(); closeForm(); render(); ensureRoutes();
      used(old ? 'edit' : 'add');
    }).catch(function () { msg.textContent = 'לא מצאתי את הכתובת. כתבו רחוב ועיר ובחרו מהרשימה.'; });
  }

  /* ---------- טרמפים ---------- */
  var token = lsGet(TOKEN_KEY), me = null, openRides = null;
  var ERR = {
    'too many rides': 'יש לך כבר הרבה נסיעות פתוחות.', 'route': 'לא הצלחתי לחשב מסלול.', 'place out of range': 'הכתובת מחוץ לישראל.',
    'profile': 'צריך להשלים פרופיל בדף הטרמפים.', 'time': 'השעה לא תקינה.', 'days': 'חסרים ימים.',
  };
  function api(path, data) {
    var opt = { method: data === undefined ? 'GET' : 'POST', headers: {} };
    if (token) opt.headers.Authorization = 'Bearer ' + token;
    if (data !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(data); }
    return fetch(API + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401) { token = null; me = null; lsSet(TOKEN_KEY, null); renderAcc(); }
        if (!r.ok) { var e = new Error(j.error || 'http ' + r.status); e.code = j.error; throw e; }
        return j;
      });
    });
  }
  function renderAcc() {
    var box = $('lz-acc'), g = $('lz-gbtn');
    if (me && me.ready) {
      box.innerHTML = '<p class="kh-hint">מחובר כ-<b>' + esc(me.name) + '</b>. לוחצים "🚗 לפרסם כנסיעה קבועה" ליד כל נסיעה, או:</p>' +
        '<button class="btn btn-gold" type="button" id="lz-pub-all">🚗 לפרסם את כל הנסיעות</button>';
      g.hidden = true;
      $('lz-pub-all').onclick = publishAll;
    } else if (me) {
      box.innerHTML = '<p class="kh-hint">עוד שלב אחד: שם וטלפון בדף הטרמפים, ואז חוזרים לכאן.</p><a class="btn btn-gold" href="/kelim/kehila/trempim/">להשלים פרופיל בטרמפים</a>';
      g.hidden = true;
    } else {
      box.innerHTML = '<p class="kh-hint">כדי לפרסם, נכנסים פעם אחת עם גוגל, כמו בדף הטרמפים.</p>';
      g.hidden = false; initGoogle();
    }
  }
  var gReady = false;
  function initGoogle() {
    if (gReady) return;
    var tries = 0;
    (function wait() {
      if (window.google && google.accounts && google.accounts.id) {
        gReady = true;
        google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, ux_mode: 'popup', auto_select: false });
        google.accounts.id.renderButton($('lz-gbtn'), { theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'pill', locale: 'he' });
      } else if (tries++ < 60) setTimeout(wait, 250);
      else $('lz-acc-msg').textContent = 'לא הצלחתי לטעון את הכניסה של גוגל. נסו לרענן.';
    })();
  }
  function onCredential(resp) {
    $('lz-acc-msg').textContent = 'נכנס...';
    api('/auth', { credential: resp.credential }).then(function (j) {
      token = j.token; lsSet(TOKEN_KEY, token); me = j.user; $('lz-acc-msg').textContent = ''; used('login'); renderAcc(); loadMine();
    }).catch(function () { $('lz-acc-msg').textContent = 'הכניסה לא הצליחה. נסו שוב.'; });
  }
  function loadMine() {
    if (!me || !me.ready) return;
    api('/rides/mine').then(function (j) {
      openRides = {};
      (j.rides || []).forEach(function (r) { if (r.status === 'open') openRides[r.id] = r; });
      render();
    }).catch(function () {});
  }
  function publishOne(i) {
    var it = S.items[i], msg = $('lz-m' + i);
    var say = function (t) { if (msg) msg.textContent = t; };
    if (!S.home) { say('קודם כותבים למעלה מאיפה יוצאים.'); $('lz-home').focus(); return Promise.reject(new Error('home')); }
    if (!me || !me.ready) { say('קודם נכנסים עם גוגל, בחלק "לפרסם בטרמפים" למטה.'); $('lz-acc').scrollIntoView({ behavior: 'smooth', block: 'center' }); return Promise.reject(new Error('login')); }
    say('מחשב מסלול ומפרסם...');
    var base = { seats: S.seats, rate: S.rate, days: it.days };
    var pub = {};
    return routeOf(S.home, it.place, true).then(function (r) {
      var dep = depart(it) || toTime(toMin(it.arrive) - Math.ceil(r.min) - S.margin);
      return api('/rides', Object.assign({ from: S.home, to: it.place, time: dep, km: r.km, min: r.min, route: r.pts, note: 'בדרך ל' + it.name + ', מגיע ב-' + it.arrive }, base));
    }).then(function (j) {
      pub.go = j.ride.id;
      if (!it.back) return null;
      return routeOf(it.place, S.home, true).then(function (r) {
        return api('/rides', Object.assign({ from: it.place, to: S.home, time: it.back, km: r.km, min: r.min, route: r.pts, note: 'חוזר מ' + it.name }, base));
      }).then(function (j2) { pub.back = j2.ride.id; });
    }).then(function () {
      it.pub = pub; save(); used('publish');
      openRides = openRides || {}; openRides[pub.go] = true;
      render();
      var m2 = $('lz-m' + i); if (m2) m2.textContent = 'פורסם ' + (it.back ? 'הלוך וחזור' : 'הלוך') + ' לשמונה שבועות. בקשות מגיעות בדף הטרמפים, בלשונית "בקשות".';
    }).catch(function (err) {
      if (pub.go) { it.pub = pub; save(); }
      say(err.message === 'route' ? 'לא הצלחתי לחשב מסלול לכתובת הזאת.' : ERR[err.code] || 'משהו השתבש. נסו שוב בעוד רגע.');
      throw err;
    });
  }
  function publishAll() {
    var list = S.items.map(function (it, i) { return i; }).filter(function (i) {
      var p = S.items[i].pub; return !(openRides && p && (openRides[p.go] || openRides[p.back]));
    });
    var msg = $('lz-acc-msg');
    if (!list.length) { msg.textContent = 'כל הנסיעות כבר מפורסמות.'; return; }
    msg.textContent = 'מפרסם ' + list.length + ' נסיעות...';
    var ok = 0;
    list.reduce(function (p, i) { return p.then(function () { return publishOne(i).then(function () { ok++; }, function () {}); }); }, Promise.resolve())
      .then(function () { msg.textContent = ok === list.length ? 'הכול פורסם! עכשיו מי שבדרך יראה את הנסיעות שלך.' : 'פורסמו ' + ok + ' מתוך ' + list.length + '. ליד השאר כתוב מה חסר.'; used('publish-all'); });
  }

  /* ---------- התחלה ---------- */
  function start() {
    autocomplete($('lz-home')); autocomplete($('lz-place'));
    if (S.home) $('lz-home').value = S.home.label;
    $('lz-home').addEventListener('placechange', setHome);
    $('lz-home').addEventListener('change', function () { if (!$('lz-home')._place && $('lz-home').value.trim()) placeOf($('lz-home')).then(setHome).catch(function () { $('lz-home-msg').textContent = 'לא מצאתי את הכתובת. כתבו רחוב ועיר ובחרו מהרשימה.'; }); });
    $('lz-here').addEventListener('click', function () {
      var b = $('lz-here'); if (!navigator.geolocation) return;
      b.disabled = true; b.textContent = 'מאתר...';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = +pos.coords.latitude.toFixed(5), lng = +pos.coords.longitude.toFixed(5);
        fetch('https://photon.komoot.io/reverse?lang=default&lat=' + lat + '&lon=' + lng).then(function (r) { return r.json(); })
          .then(function (j) { var f = (j.features || [])[0]; return f ? photonLabel(f).label : 'הבית'; }).catch(function () { return 'הבית'; })
          .then(function (label) { $('lz-home').value = label; $('lz-home')._place = { label: label, lat: lat, lng: lng }; setBias({ lat: lat, lng: lng }); b.disabled = false; b.textContent = 'המיקום שלי'; setHome(); });
      }, function () { b.disabled = false; b.textContent = 'המיקום שלי'; $('lz-home-msg').textContent = 'לא הצלחתי לקבל מיקום. אפשר לכתוב כתובת.'; }, { timeout: 12000, maximumAge: 60000 });
    });
    function setHome() {
      var p = $('lz-home')._place; if (!p) return;
      S.home = p; $('lz-home-msg').textContent = ''; save(); render(); ensureRoutes(); used('home');
    }
    chips('lz-margin'); chips('lz-rate'); chips('lz-days', true);
    $('lz-margin').addEventListener('change', function () { var b = $('lz-margin').querySelector('button.on'); S.margin = +b.getAttribute('data-m'); save(); render(); });
    $('lz-rate').addEventListener('change', function () { var b = $('lz-rate').querySelector('button.on'); S.rate = +b.getAttribute('data-r'); save(); });
    $('lz-seats').addEventListener('change', function () { S.seats = +$('lz-seats').value; save(); });
    $('lz-names').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) $('lz-name').value = b.textContent; });
    $('lz-add').addEventListener('click', function () { openForm(-1); });
    $('lz-cancel').addEventListener('click', closeForm);
    $('lz-form').addEventListener('submit', submitForm);
    $('lz-clear').addEventListener('click', function () { S.items = []; S.sample = false; save(); render(); openForm(-1); });
    $('lz-ics').addEventListener('click', downloadIcs);
    $('lz-list').addEventListener('click', function (e) {
      var t = e.target.closest('[data-pub],[data-edit],[data-del],[data-cal]'); if (!t) return;
      if (t.hasAttribute('data-cal')) { used('gcal'); return; }
      if (t.hasAttribute('data-edit')) { openForm(+t.getAttribute('data-edit')); return; }
      if (t.hasAttribute('data-del')) {
        var i = +t.getAttribute('data-del');
        if (!confirm('למחוק את "' + S.items[i].name + '" מהרשימה? (מהיומן ומהטרמפים מוחקים שם)')) return;
        S.items.splice(i, 1); if (!S.items.length) S.sample = false; save(); render(); return;
      }
      t.disabled = true;
      publishOne(+t.getAttribute('data-pub')).catch(function () { t.disabled = false; });
    });
    render(); ensureRoutes(); renderAcc();
    if (token) api('/me').then(function (j) { me = j.user; renderAcc(); loadMine(); }).catch(function () { renderAcc(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
