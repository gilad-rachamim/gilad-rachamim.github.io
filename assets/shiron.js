// שירון להדפסה: רשימת שירים (שם + מילים) → שער, תוכן עניינים ושירים ממוספרים. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('sh-form'), box = $('sh-songs'), book = $('sh-book');
  if (!form) return;
  var KEY = 'kelim-shiron';
  function blank() { return { title: '', sub: '', size: 'r', s: [['', ''], ['', '']] }; }
  var st = blank();
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rows() {
    box.innerHTML = st.s.map(function (s, i) {
      return '<div class="sh-song"><div class="top"><b>' + (i + 1) + '.</b><input type="text" maxlength="60" data-s="' + i + '" data-k="0" placeholder="שם השיר" value="' + esc(s[0]) + '" aria-label="שם השיר ' + (i + 1) + '"><button class="x" type="button" data-del="' + i + '" aria-label="למחוק את השיר">×</button></div>' +
        '<textarea maxlength="4000" data-s="' + i + '" data-k="1" placeholder="מילות השיר" aria-label="מילות השיר ' + (i + 1) + '">' + esc(s[1]) + '</textarea></div>';
    }).join('');
  }
  function fill() {
    form.querySelector('[name=title]').value = st.title; form.querySelector('[name=sub]').value = st.sub;
    form.querySelectorAll('[name=size]').forEach(function (r) { r.checked = r.value === st.size; });
    rows();
  }
  function read() {
    st.title = form.querySelector('[name=title]').value; st.sub = form.querySelector('[name=sub]').value;
    var r = form.querySelector('[name=size]:checked'); if (r) st.size = r.value;
    box.querySelectorAll('[data-s]').forEach(function (el) { st.s[+el.getAttribute('data-s')][+el.getAttribute('data-k')] = el.value; });
  }
  function draw() {
    var songs = st.s.filter(function (s) { return s[0].trim() || s[1].trim(); });
    book.className = 'sh-book' + (st.size === 'g' ? ' sh-big' : '');
    book.innerHTML = '<div class="sh-page sh-cover"><h1>' + esc(st.title.trim() || 'שירון') + '</h1><div class="orn">❦</div>' + (st.sub.trim() ? '<p>' + esc(st.sub.trim()) + '</p>' : '') + '</div>' +
      (songs.length ? '<div class="sh-page sh-toc"><h2>תוכן העניינים</h2><ol>' + songs.map(function (s) { return '<li>' + esc(s[0].trim() || 'שיר בלי שם') + '</li>'; }).join('') + '</ol></div>' +
        '<div class="sh-page"><div class="sh-songs">' + songs.map(function (s, i) { return '<section class="sh-sg"><h2><span>' + (i + 1) + '.</span>' + esc(s[0].trim() || 'שיר בלי שם') + '</h2><p>' + esc(s[1].trim()) + '</p></section>'; }).join('') + '</div></div>'
        : '<div class="sh-page"><p class="sh-empty">מוסיפים שירים למעלה, והם יופיעו כאן.</p></div>');
  }
  form.addEventListener('input', function () { read(); save(); draw(); });
  box.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    read(); var i = +d.getAttribute('data-del');
    if ((st.s[i][0] + st.s[i][1]).trim() && !confirm('למחוק את השיר?')) return;
    st.s.splice(i, 1); if (!st.s.length) st.s.push(['', '']); save(); rows(); draw();
  });
  $('sh-add').addEventListener('click', function () { read(); st.s.push(['', '']); save(); rows(); draw(); var l = box.querySelectorAll('input[data-k="0"]'); l[l.length - 1].focus(); });
  $('sh-clear').addEventListener('click', function () { if (confirm('למחוק את כל השירון ולהתחיל חדש?')) { st = blank(); save(); fill(); draw(); } });
  $('sh-print').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('shiron', { how: 'print', n: st.s.length }); window.print(); });
  fill(); draw();
})();
