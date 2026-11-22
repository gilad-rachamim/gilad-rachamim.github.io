/* תחום גיור – פונקציות משותפות. הכול נשמר רק בטלפון (localStorage). */
(function () {
  'use strict';
  var G = window.GIUR = {};
  G.get = function (k, d) { try { var v = localStorage.getItem('giur-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  G.set = function (k, v) { try { localStorage.setItem('giur-' + k, JSON.stringify(v)); } catch (e) {} };
  G.used = function (name, extra) { if (window.toolUsed) window.toolUsed(name, extra); };
  G.wa = function (text) { G.used('giur_share'); window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); };
  G.$ = function (id) { return document.getElementById(id); };
  /* שפה (22.11.2026): עברית כברירת מחדל, אנגלית/רוסית לפי <html lang> */
  G.lang = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
  G.t = function (d) { return d[G.lang] || d.he; };
  G.lk = function (k) { return G.lang === 'he' ? k : k + '-' + G.lang; };
  G.url = function (h) { return 'https://hakelim.com' + location.pathname.replace(/index\.html$/, '') + (h || ''); };
  G.of = function () { return G.t({ he: ' מתוך ', en: ' of ', ru: ' из ' }); };
  G.bar = function (fill, cnt, done, total) {
    var p = total ? Math.round(done * 100 / total) : 0;
    if (fill) fill.style.width = p + '%';
    if (cnt) cnt.textContent = done + G.of() + total + ' (' + p + '%)';
  };
  /* רשימת סימון שנשמרת: כל input[type=checkbox][data-k] בתוך container */
  G.checklist = function (box, key, onChange) {
    var st = G.get(key, {});
    var boxes = [].slice.call(box.querySelectorAll('input[type=checkbox][data-k]'));
    boxes.forEach(function (c) {
      c.checked = !!st[c.getAttribute('data-k')];
      c.addEventListener('change', function () {
        st[c.getAttribute('data-k')] = c.checked ? 1 : 0; G.set(key, st);
        G.used('giur_check', { list: key });
        if (onChange) onChange(boxes);
      });
    });
    if (onChange) onChange(boxes);
    return boxes;
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-print]');
    if (b) { G.used('giur_print'); window.print(); }
  });
})();
