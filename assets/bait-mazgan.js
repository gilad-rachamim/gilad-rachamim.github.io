/* שלט למזגן – בדיקת טלפון, מונה קודים, השלטים של הבית. הכול נשמר רק בטלפון (localStorage). */
(function () {
  var KEY = 'bait_mazgan_v1';
  var $ = function (id) { return document.getElementById(id); };
  var used = {};
  function use(act) { if (used[act]) return; used[act] = 1; if (window.toolUsed) window.toolUsed('mazgan', { how: act }); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return ('00' + n).slice(-3); }

  var st = load() || {
    n: 1, brand: 'תדיראן',
    list: [{ room: 'סלון', brand: 'תדיראן', code: '012', note: 'דוגמה בלבד, הקוד לא אמיתי. נמחקת כשמוסיפים שלט', ex: 1 }]
  };

  var PH = {
    samsung: ['no', 'בסמסונג אין משדר אינפרא-אדום', 'סמסונג הפסיקה לשים משדר כזה בטלפונים אחרי גלקסי S6 (2015). כל גלקסי חדש, כולל סדרות S ו-A, לא יכול לשדר למזגן לבד. בוחרים אחת משלוש הדרכים למטה. אם המזגן חכם, הכי פשוט: SmartThings, שכבר מותקנת אצלכם.'],
    iphone: ['no', 'באייפון אין משדר אינפרא-אדום', 'אף אייפון לא נבנה עם משדר כזה. הדרך הנוחה: רכזת בוויפיי, או מזגן חכם עם האפליקציה של היצרן.'],
    xiaomi: ['ok', 'כנראה שכן!', 'ברוב הטלפונים של שיאומי, רדמי ופוקו יש משדר. מחפשים בטלפון אפליקציה בשם "שלט" או Mi Remote (בדרך כלל כבר מותקנת), בוחרים "מזגן" ואת המותג. איך בודקים? מסתכלים על הקצה העליון של הטלפון: נקודה כהה קטנה ליד המיקרופון היא המשדר.'],
    huawei: ['ok', 'בחלק מהדגמים כן', 'בהרבה דגמים של וואווי ואונור יש משדר, ואפליקציית "שלט רחוק" (Smart Remote) מותקנת מראש. אם אין אותה בטלפון, כנראה שאין משדר, ובוחרים דרך מלמטה.'],
    pixel: ['no', 'בפיקסל אין משדר', 'הטלפונים של גוגל לא נבנים עם משדר אינפרא-אדום. בוחרים אחת משלוש הדרכים למטה.'],
    other: ['', 'איך בודקים בעצמכם', 'מסתכלים על הקצה העליון של הטלפון: נקודה כהה קטנה, כמו עדשה, היא בדרך כלל המשדר. אפשר גם להתקין אפליקציית שלט: אם היא אומרת שאין משדר, בוחרים דרך מלמטה.']
  };

  function phone(k) {
    var p = PH[k]; if (!p) return;
    [].forEach.call(document.querySelectorAll('#mz-phones .chip'), function (b) { b.classList.toggle('on', b.getAttribute('data-ph') === k); });
    var r = $('mz-phone-res');
    r.className = 'box mz-res' + (p[0] ? ' mz-' + p[0] : '');
    r.innerHTML = '<b>' + esc(p[1]) + '</b><p style="margin:.3rem 0 0">' + esc(p[2]) + '</p>';
    st.ph = k; save(); use('phone');
  }

  function count() {
    $('mz-num').textContent = pad(st.n);
    $('mz-tried').textContent = st.n > 1 ? 'כבר ניסיתם ' + (st.n - 1) + ' קודים ב' + st.brand + '. ממשיכים מ-' + pad(st.n) + '.' : '';
  }

  function list() {
    var ul = $('mz-list');
    if (!st.list.length) { ul.innerHTML = '<li class="muted">עוד אין שלטים שמורים.</li>'; }
    else ul.innerHTML = st.list.map(function (x, i) {
      return '<li><span><b>' + esc(x.room) + '</b> · ' + esc(x.brand) + (x.note ? '<br><span class="muted">' + esc(x.note) + '</span>' : '') + '</span>' +
        '<span><span class="k">' + esc(x.code) + '</span> <button type="button" class="btn btn-line btn-sm" data-del="' + i + '" aria-label="למחוק">✕</button></span></li>';
    }).join('');
    var t = '❄️ הקודים של המזגנים בבית:\n' + st.list.filter(function (x) { return !x.ex; }).map(function (x) {
      return '• ' + x.room + ' (' + x.brand + '): קוד ' + x.code + (x.note ? ' – ' + x.note : '');
    }).join('\n');
    $('mz-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }

  function init() {
    if (!$('mz-num')) return;
    [].forEach.call(document.querySelectorAll('#mz-phones .chip'), function (b) {
      b.addEventListener('click', function () { phone(b.getAttribute('data-ph')); });
    });
    if (st.ph) phone(st.ph);
    var sel = $('mz-brand'); sel.value = st.brand;
    sel.addEventListener('change', function () {
      if (sel.value !== st.brand) { st.brand = sel.value; st.n = 1; save(); count(); }
      $('mz-fbrand').value = st.brand;
    });
    $('mz-fbrand').value = st.brand;
    $('mz-next').addEventListener('click', function () { if (st.n < 999) st.n++; save(); count(); use('next'); });
    $('mz-minus').addEventListener('click', function () { if (st.n > 1) st.n--; save(); count(); });
    $('mz-reset').addEventListener('click', function () { st.n = 1; save(); count(); });
    $('mz-found').addEventListener('click', function () {
      $('mz-code').value = pad(st.n); $('mz-fbrand').value = st.brand;
      $('mz-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('mz-room').focus();
    });
    $('mz-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var code = $('mz-code').value.trim(); if (!code) { $('mz-code').focus(); return; }
      st.list = st.list.filter(function (x) { return !x.ex; });
      st.list.push({ room: $('mz-room').value.trim() || 'מזגן', brand: $('mz-fbrand').value.trim() || st.brand, code: code, note: $('mz-note').value.trim() });
      st.n = 1; save(); list(); count(); use('add');
      $('mz-room').value = ''; $('mz-code').value = ''; $('mz-note').value = '';
    });
    $('mz-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return;
      st.list.splice(+b.getAttribute('data-del'), 1); save(); list();
    });
    $('mz-wa').addEventListener('click', function () { use('wa'); });
    count(); list();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
