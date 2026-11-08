// אישורי הגעה: מוזמנים עם סטטוס (מגיע / לא / אולי / לא ענה) ומספר נפשות, סיכום, ותזכורת לווטסאפ. נשמר בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('is-form');
  if (!form) return;
  var KEY = 'kelim-ishurim';
  var S = [['y', 'מגיע'], ['m', 'אולי'], ['n', 'לא מגיע']];
  var st = { event: '', g: [] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  $('is-event').value = st.event || '';
  function draw() {
    var yes = 0, no = 0, wait = 0;
    st.g.forEach(function (g) { if (g.s === 'y') yes += g.c || 1; else if (g.s === 'n') no++; else wait++; });
    $('is-yes').textContent = yes; $('is-no').textContent = no; $('is-wait').textContent = wait;
    $('is-list').innerHTML = st.g.length ? st.g.map(function (g) {
      return '<li><span class="nm">' + esc(g.n) + '</span><button class="x" type="button" data-del="' + g.id + '" aria-label="למחוק">×</button><div class="is-b">' +
        S.map(function (s) { return '<button type="button" data-id="' + g.id + '" data-s="' + s[0] + '" aria-pressed="' + (g.s === s[0]) + '">' + s[1] + '</button>'; }).join('') +
        (g.s === 'y' ? '<label>נפשות <input type="number" min="1" max="50" inputmode="numeric" data-c="' + g.id + '" value="' + (g.c || 1) + '"></label>' : '') + '</div></li>';
    }).join('') : '<li><span>עוד אין מוזמנים. מדביקים רשימה למעלה.</span></li>';
    var ev = (st.event || '').trim() || 'האירוע';
    var remind = 'היי! 😊 רציתי לדעת אם תגיעו ל' + ev + '?\nאשמח לתשובה קצרה, וכמה תהיו. תודה!';
    $('is-remind').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(remind);
    var waitList = st.g.filter(function (g) { return !g.s || g.s === 'm'; }).map(function (g) { return g.n + (g.s === 'm' ? ' (אולי)' : ''); });
    var sum = '📋 ' + ev + '\n\nמגיעים: ' + yes + ' נפשות\n' + st.g.filter(function (g) { return g.s === 'y'; }).map(function (g) { return '▫️ ' + g.n + ' (' + (g.c || 1) + ')'; }).join('\n') +
      (waitList.length ? '\n\nעוד לא סגרו:\n' + waitList.map(function (x) { return '▫️ ' + x; }).join('\n') : '') + (no ? '\n\nלא מגיעים: ' + no : '');
    $('is-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(sum);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var have = {}; st.g.forEach(function (g) { have[g.n] = 1; });
    $('is-names').value.split('\n').map(function (x) { return x.replace(/^[\s•▫️\-\d.)]+/, '').trim(); }).filter(function (x) { return x && !have[x]; }).forEach(function (n, i) {
      have[n] = 1; st.g.push({ id: 'g' + Date.now() + i, n: n.slice(0, 50), s: '', c: 1 });
    });
    $('is-names').value = ''; save(); draw();
    if (window.toolUsed) window.toolUsed('ishurim', { how: 'add', n: st.g.length });
  });
  $('is-event').addEventListener('input', function () { st.event = this.value; save(); draw(); });
  $('is-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-s]');
    if (b) { var id = b.getAttribute('data-id'), s = b.getAttribute('data-s'); st.g.forEach(function (g) { if (g.id === id) g.s = g.s === s ? '' : s; }); save(); draw(); return; }
    var d = e.target.closest('[data-del]');
    if (d) { var did = d.getAttribute('data-del'); st.g = st.g.filter(function (g) { return g.id !== did; }); save(); draw(); }
  });
  $('is-list').addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-c'); if (!id) return;
    var v = Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1));
    st.g.forEach(function (g) { if (g.id === id) g.c = v; }); save(); draw();
  });
  $('is-clear').addEventListener('click', function () { if (confirm('לנקות את כל הרשימה ולהתחיל אירוע חדש?')) { st = { event: '', g: [] }; $('is-event').value = ''; save(); draw(); } });
  ['is-remind', 'is-wa'].forEach(function (id) { $(id).addEventListener('click', function () { if (window.toolUsed) window.toolUsed('ishurim', { how: id }); }); });
  draw();
})();
