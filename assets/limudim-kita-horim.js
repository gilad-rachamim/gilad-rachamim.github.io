/* הכיתה הווירטואלית – דף ההורים (/limudim/kita/horim/?kita=CODE): הודעות המורה ושיעורי הבית הפתוחים. בלי פרטי תלמידים. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('kh-app')) return;
  var API = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function day(d) { return new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' }); }
  var code = (location.search.match(/[?&]kita=(\d{6})/) || [])[1];
  if (!code) { $('kh-err').hidden = false; $('kh-err').textContent = 'חסר קוד כיתה בקישור. בקשו מהמורה את הקישור לדף ההורים.'; $('kh-hw').innerHTML = ''; $('kh-msgs').innerHTML = ''; return; }
  fetch(API + '/c/' + code + '/parents').then(function (r) { return r.json(); }).then(function (d) {
    if (!d.ok) throw new Error(d.error || '');
    $('kh-name').textContent = 'עדכונים להורים – ' + d.name;
    $('kh-sub').textContent = (d.teacher ? d.teacher + ' · ' : '') + d.n + ' תלמידים בכיתה הווירטואלית';
    $('kh-hw').innerHTML = d.hw.length ? d.hw.map(function (h) { return '<li><b>' + (h.kind === 'prep' ? '🎬 ' : '📚 ') + esc(h.title) + '</b>' + (h.due ? '<br><small>להגיש עד ' + day(h.due) + '</small>' : '') + '</li>'; }).join('') : '<li class="note">אין כרגע מטלות פתוחות.</li>';
    $('kh-msgs').innerHTML = d.msgs.length ? d.msgs.map(function (m) { return '<li><p dir="auto">' + esc(m.text) + '</p><small>' + new Date(m.t).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' }) + '</small></li>'; }).join('') : '<li class="note">עוד אין הודעות מהמורה.</li>';
    if (window.toolUsed) window.toolUsed('kita_horim', { action: 'view' });
  }).catch(function (e) {
    $('kh-err').hidden = false; $('kh-err').textContent = e.message || 'אין חיבור כרגע. נסו שוב בעוד רגע.';
    $('kh-hw').innerHTML = ''; $('kh-msgs').innerHTML = '';
  });
})();
