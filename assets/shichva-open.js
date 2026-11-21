/* פורטל שכבה – דף הכניסה הציבורי: פתיחת שכבה, כניסה בקוד, הדגמה. */
(function () {
  'use strict';
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8791' : 'https://kelim-shichva.gilad4049.workers.dev';
  var KEY = 'shichva_s', APP = '/kelim/shichva/merchav/';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { list: [], cur: 0 }; } catch (e) { return { list: [], cur: 0 }; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function remember(r, label) {
    var s = load();
    s.list = s.list.filter(function (x) { return !(x.g === r.grade && x.role === r.role && x.g === 'demo'); });
    s.list.unshift({ t: r.token, g: r.grade, role: r.role, label: label || '' });
    s.list = s.list.slice(0, 8); s.cur = 0;
    if (!save(s)) { location.href = APP + '#t=' + r.token; return; }
    location.href = APP;
  }
  var ERR = { code: 'הקוד לא נמצא. כדאי לבדוק מול הרכז.', name: 'חסר שם.', too_many: 'יותר מדי ניסיונות היום. אפשר לנסות מחר.', hachtara: 'חסר תאריך הכתרה.', rakaz_name: 'חסר השם שלך.', origin: 'הדף נפתח מכתובת לא מוכרת.' };
  function post(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'net'); return j; }); });
  }
  function errText(e) { return ERR[e.message] || 'משהו השתבש. כדאי לנסות שוב בעוד רגע.'; }
  function busy(f, on) { var b = f.querySelector('button'); if (b) { b.disabled = on; b.setAttribute('aria-busy', on ? 'true' : 'false'); } }

  // ברירת מחדל לתאריך: יומיים לפני פורים הקרוב (לפי הלוח העברי של הדפדפן)
  function nextPurim() {
    var f; try { f = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' }); } catch (e) { return null; }
    var d = new Date(); d.setHours(12, 0, 0, 0);
    for (var i = 0; i < 420; i++) {
      var s = f.format(d);
      if (/^14 Adar( II)?$/.test(s)) return d;
      d.setDate(d.getDate() + 1);
    }
    return null;
  }
  var fNew = document.getElementById('fNew'), fJoin = document.getElementById('fJoin');
  var p = nextPurim();
  if (p && fNew) { p.setDate(p.getDate() - 2); fNew.hachtara.value = p.toISOString().slice(0, 10); }

  // קישור הצטרפות: #j=קוד&v=ועדה
  var h = new URLSearchParams(location.hash.slice(1));
  if (h.get('j') && fJoin) {
    fJoin.code.value = h.get('j');
    if (h.get('v')) { fJoin.committee.value = h.get('v'); var jv = document.getElementById('joinV'); jv.hidden = false; jv.textContent = 'הקישור הזה מצרף אותך ישר לוועדה.'; }
    setTimeout(function () { document.getElementById('knisa').scrollIntoView(); fJoin.name.focus(); }, 50);
  }
  if (load().list.length) document.getElementById('shBack').hidden = false;

  if (fJoin) fJoin.addEventListener('submit', function (e) {
    e.preventDefault(); busy(fJoin, true); document.getElementById('joinErr').textContent = '';
    post('/join', { code: fJoin.code.value.trim(), name: fJoin.name.value.trim(), klass: fJoin.klass.value.trim(), committee: fJoin.committee.value })
      .then(function (r) { remember(r); })
      .catch(function (er) { document.getElementById('joinErr').textContent = errText(er); busy(fJoin, false); });
  });
  if (fNew) fNew.addEventListener('submit', function (e) {
    e.preventDefault(); busy(fNew, true); document.getElementById('newErr').textContent = '';
    post('/grade/create', { name: fNew.name.value.trim(), rakaz_name: fNew.rakaz_name.value.trim(), klass: fNew.klass.value.trim(), hachtara: fNew.hachtara.value, melave_name: fNew.melave_name.value.trim() })
      .then(function (r) { r.role = 'rakaz'; remember(r); })
      .catch(function (er) { document.getElementById('newErr').textContent = errText(er); busy(fNew, false); });
  });
  var NAMES = { rakaz: 'רכז ההדגמה', chaver: 'תלמיד בהדגמה', melave: 'המלווה בהדגמה' };
  document.querySelectorAll('[data-demo]').forEach(function (b) {
    b.addEventListener('click', function () {
      var role = b.getAttribute('data-demo'); b.disabled = true;
      post('/join', { code: 'הדגמה', name: NAMES[role], role: role, committee: role === 'chaver' ? 'd-c-memim' : '' })
        .then(function (r) { remember(r, 'הדגמה'); })
        .catch(function () { b.disabled = false; alert('ההדגמה לא נפתחה כרגע. אפשר לנסות שוב בעוד רגע.'); });
    });
  });
})();
