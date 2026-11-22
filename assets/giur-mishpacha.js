/* משפחה מלווה לגיור – /kodesh/giur/mishpacha-melava/ (טופס + מונה לפי עיר) ו-/sheli/ (הרשימה של גילעד).
   השרת: tools/giur-mishpacha-worker. לבדיקה מקומית: localStorage['gm-api'] = 'http://127.0.0.1:8796'.
   רשימת הערים זהה ל-tools/giur-mishpacha-worker/cities.js. */
(function () {
  'use strict';
  var API = 'https://giur-mishpacha.gilad4049.workers.dev';
  try { var o = localStorage.getItem('gm-api'); if (o && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) API = o; } catch (e) {}
  var CITIES = [
    'אופקים', 'אור יהודה', 'אור עקיבא', 'אילת', 'אלעד', 'אלקנה', 'אפרת', 'אריאל', 'אשדוד', 'אשקלון',
    'באר יעקב', 'באר שבע', 'בית שאן', 'בית שמש', 'ביתר עילית', 'בני ברק', 'בת ים', 'גבעת שמואל', 'גבעתיים', 'גדרה',
    'גן יבנה', 'דימונה', 'הוד השרון', 'הרצליה', 'חדרה', 'חולון', 'חיפה', 'חריש', 'טבריה', 'טירת כרמל',
    'יבנה', 'יהוד-מונוסון', 'יקנעם', 'ירוחם', 'ירושלים', 'כפר יונה', 'כפר סבא', 'כרמיאל', 'לוד', 'מבשרת ציון',
    'מגדל העמק', 'מודיעין-מכבים-רעות', 'מודיעין עילית', 'מעלה אדומים', 'מעלות-תרשיחא', 'נהריה', 'נס ציונה', 'נצרת עילית (נוף הגליל)', 'נשר', 'נתיבות',
    'נתניה', 'עכו', 'עפולה', 'ערד', 'עתלית', 'פרדס חנה-כרכור', 'פתח תקווה', 'צפת', 'קדומים', 'קצרין',
    'קריית אונו', 'קריית ארבע', 'קריית אתא', 'קריית ביאליק', 'קריית גת', 'קריית ים', 'קריית מוצקין', 'קריית מלאכי', 'קריית שמונה', 'קרני שומרון',
    'ראש העין', 'ראשון לציון', 'רחובות', 'רמלה', 'רמת גן', 'רמת השרון', 'רעננה', 'שדרות', 'שוהם', 'תל אביב-יפו',
    'יישוב אחר בצפון', 'יישוב אחר במרכז', 'יישוב אחר בירושלים והסביבה', 'יישוב אחר ביהודה ושומרון', 'יישוב אחר בדרום'
  ];
  var OFF = { shabbat: 'ארוחות שבת', chag: 'חגים', limud: 'לימוד משותף', beitkneset: 'בית כנסת', beitdin: 'בית דין וטבילה', kehila: 'קהילה', ivrit: 'עברית וסידורים' };
  var ST = { 'new': 'חדשה', contacted: 'דיברנו', active: 'מלווה עכשיו', paused: 'בהפסקה' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function used(how, extra) { if (window.toolUsed) window.toolUsed('giur_mishpacha', Object.assign({ how: how }, extra || {})); }
  function call(path, body, key) {
    var h = {}; if (body) h['Content-Type'] = 'application/json'; if (key) h['X-Admin-Key'] = key;
    return fetch(API + path, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }

  // ---------- הדף הציבורי ----------
  var cnt = $('[data-mm-count]');
  function loadCount() {
    if (!cnt) return;
    call('/count').then(function (j) {
      if (!j.total) { cnt.innerHTML = '<p class="gr-cnt">עוד אין משפחות ברשימה. המשפחה הראשונה יכולה להיות שלכם.</p>'; return; }
      cnt.innerHTML = '<p class="mm-total"><b>' + j.total + '</b> ' + (j.total === 1 ? 'משפחה הצטרפה' : 'משפחות הצטרפו') + '</p><ul class="mm-cities">' +
        j.cities.map(function (c) { return '<li><span>' + esc(c[0]) + '</span><b>' + c[1] + '</b></li>'; }).join('') + '</ul>';
    }).catch(function () { cnt.innerHTML = '<p class="gr-cnt">המונה לא נטען כרגע. נסו לרענן בעוד רגע.</p>'; });
  }
  loadCount();

  var form = $('[data-mm-form]'), done = $('[data-mm-done]');
  if (form) {
    var sel = $('[data-mm-cities]', form), t0 = Date.now(), res = $('[data-mm-res]', form), btn = $('.mm-send', form);
    sel.insertAdjacentHTML('beforeend', CITIES.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join(''));
    var showDone = function (no) { form.hidden = true; done.hidden = false; $('[data-mm-no]', done).textContent = 'משפחה מספר ' + no; };
    var me = ls('gm-mine');
    if (me && me.no) showDone(me.no);
    var once = function () { used('start'); form.removeEventListener('focusin', once); };
    form.addEventListener('focusin', once);
    var idle = function () { btn.disabled = false; btn.textContent = 'להצטרף כמשפחה מלווה'; };
    form.addEventListener('submit', function (e) {
      e.preventDefault(); res.textContent = '';
      var f = form.elements, offer = [].slice.call(form.querySelectorAll('[name=offer]:checked')).map(function (x) { return x.value; });
      if (!f.fam.value.trim()) { res.textContent = 'כתבו את שם המשפחה.'; f.fam.focus(); return; }
      if (!f.city.value) { res.textContent = 'בחרו עיר מהרשימה.'; f.city.focus(); return; }
      if (!f.phone.value.trim()) { res.textContent = 'כתבו טלפון או ווטסאפ.'; f.phone.focus(); return; }
      if (!f.consent.checked) { res.textContent = 'כדי להצטרף צריך לסמן את ההסכמה להעביר את הפרטים לגופי הגיור הרשמיים.'; f.consent.focus(); return; }
      btn.disabled = true; btn.textContent = 'שולח…';
      call('/join', { fam: f.fam.value, city: f.city.value, phone: f.phone.value, email: f.email.value, kehila: f.kehila.value,
        offer: offer, note: f.note.value, consent: true, hp: f.hp.value, ms: Date.now() - t0 }).then(function (j) {
        idle();
        if (j.error) { res.textContent = j.error; return; }
        if (!j.no) { res.textContent = 'משהו השתבש. נסו שוב.'; return; }
        ls('gm-mine', { no: j.no, tok: j.tok }); used(j.upd ? 'update' : 'join', { city: f.city.value });
        showDone(j.no); done.focus(); loadCount();
      }).catch(function () { idle(); res.textContent = 'אין חיבור לשרת כרגע. נסו שוב בעוד רגע.'; });
    });
    $('[data-mm-again]', done).addEventListener('click', function () { done.hidden = true; form.hidden = false; t0 = Date.now(); form.elements.fam.focus(); });
    $('[data-mm-leave]', done).addEventListener('click', function () {
      var m = ls('gm-mine'); if (!m || !confirm('להסיר את המשפחה שלכם מהרשימה? הפרטים יימחקו.')) return;
      call('/leave', { no: m.no, tok: m.tok }).then(function (j) {
        if (j.error && j._status !== 404) { alert(j.error); return; }
        ls('gm-mine', null); used('leave'); done.hidden = true; form.hidden = false; form.reset(); loadCount();
      });
    });
  }

  // ---------- הרשימה של גילעד ----------
  var adm = $('[data-mm-admin]');
  if (!adm) return;
  var key = (location.hash.match(/k=([\w-]+)/) || [])[1] || ls('gm-key') || '', items = [];
  var kf = $('[data-mm-key]', adm), tools = $('[data-mm-tools]', adm), list = $('[data-mm-alist]', adm), sum = $('[data-mm-sum]', adm), q = $('[data-mm-q]', adm);
  if (location.hash) history.replaceState(null, '', location.pathname);
  kf.addEventListener('submit', function (e) { e.preventDefault(); key = kf.elements.k.value.trim(); load(); });
  function date(t) { var d = new Date(t); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function card(f) {
    return '<div class="gr-card mm-fam" data-no="' + f.no + '"><h3>' + esc(f.fam) + (f.test ? ' <small>(בדיקה)</small>' : '') + '</h3>' +
      '<p><a href="tel:' + esc(f.phone) + '" dir="ltr">' + esc(f.phone) + '</a> · <a href="https://wa.me/972' + esc(f.phone.slice(1)) + '" rel="noopener">ווטסאפ</a>' +
      (f.email ? ' · <a href="mailto:' + esc(f.email) + '" dir="ltr">' + esc(f.email) + '</a>' : '') + '</p>' +
      (f.kehila ? '<p>קהילה: ' + esc(f.kehila) + '</p>' : '') +
      (f.offer && f.offer.length ? '<p>מציעים: ' + f.offer.map(function (o) { return OFF[o] || o; }).join(', ') + '</p>' : '') +
      (f.note ? '<p>' + esc(f.note) + '</p>' : '') +
      '<p class="gr-src">מספר ' + f.no + ' · הצטרפו ' + date(f.t) + (f.tu ? ' · עודכן ' + date(f.tu) : '') + ' · הסכמה להעברה: כן</p>' +
      '<div class="mm-row"><select data-st aria-label="סטטוס">' + Object.keys(ST).map(function (s) { return '<option value="' + s + '"' + (f.st === s ? ' selected' : '') + '>' + ST[s] + '</option>'; }).join('') + '</select>' +
      '<input type="text" data-memo maxlength="300" placeholder="הערה פנימית" value="' + esc(f.memo || '') + '" aria-label="הערה פנימית">' +
      '<button type="button" class="gr-btn" data-del>מחיקה</button></div></div>';
  }
  function render() {
    var s = (q.value || '').trim(), by = {}, n = 0, all = {};
    items.forEach(function (f) {
      all[f.city] = 1;
      if (s && (f.fam + ' ' + f.city + ' ' + f.kehila + ' ' + f.note).indexOf(s) < 0) return;
      (by[f.city] = by[f.city] || []).push(f); n++;
    });
    var cities = Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length || a.localeCompare(b, 'he'); });
    sum.textContent = items.length + ' משפחות ב-' + Object.keys(all).length + ' ערים' + (s ? ' · מוצגות ' + n : '');
    list.innerHTML = cities.length ? cities.map(function (c) {
      return '<details class="mm-city" open><summary>' + esc(c) + ' <b>' + by[c].length + '</b></summary>' + by[c].sort(function (a, b) { return b.t - a.t; }).map(card).join('') + '</details>';
    }).join('') : '<p class="gr-cnt">עוד אין משפחות ברשימה.</p>';
  }
  function load() {
    if (!key) { kf.hidden = false; return; }
    sum.textContent = 'טוען…';
    call('/admin/list', null, key).then(function (j) {
      if (j._status === 403) { ls('gm-key', null); key = ''; kf.hidden = false; sum.textContent = 'המפתח לא נכון.'; return; }
      ls('gm-key', key); kf.hidden = true; tools.hidden = false; items = j.items || []; render();
    }).catch(function () { sum.textContent = 'אין חיבור לשרת כרגע.'; });
  }
  q.addEventListener('input', render);
  $('[data-mm-reload]', adm).addEventListener('click', load);
  $('[data-mm-csv]', adm).addEventListener('click', function () {
    var cols = ['no', 'city', 'fam', 'phone', 'email', 'kehila', 'offer', 'note', 'st', 'memo', 't'];
    var head = ['מספר', 'עיר', 'משפחה', 'טלפון', 'מייל', 'קהילה', 'מציעים', 'הערה', 'סטטוס', 'הערה פנימית', 'תאריך'];
    var rows = items.map(function (f) { return cols.map(function (c) {
      var v = c === 'offer' ? (f.offer || []).map(function (o) { return OFF[o]; }).join(' / ') : c === 'st' ? ST[f.st] : c === 't' ? date(f.t) : f[c];
      return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(','); });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + [head.join(',')].concat(rows).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'mishpachot-melavot.csv'; a.click();
  });
  list.addEventListener('change', function (e) {
    var c = e.target.closest('.mm-fam'); if (!c) return;
    var no = +c.getAttribute('data-no'), body = { no: no };
    if (e.target.matches('[data-st]')) body.st = e.target.value; else if (e.target.matches('[data-memo]')) body.memo = e.target.value; else return;
    call('/admin/set', body, key).then(function (j) { if (j.ok) items.forEach(function (f) { if (f.no === no) { f.st = j.st; f.memo = j.memo; } }); });
  });
  list.addEventListener('click', function (e) {
    if (!e.target.matches('[data-del]')) return;
    var c = e.target.closest('.mm-fam'), no = +c.getAttribute('data-no');
    if (!confirm('למחוק את המשפחה מהרשימה? אי אפשר לשחזר.')) return;
    call('/admin/del', { no: no }, key).then(function (j) { if (j.ok) { items = items.filter(function (f) { return f.no !== no; }); render(); } });
  });
  load();
})();
