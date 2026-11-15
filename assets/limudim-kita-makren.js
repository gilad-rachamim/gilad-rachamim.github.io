/* הכיתה הווירטואלית – מצב מקרן (/limudim/kita/makren/#c=CODE&k=KEY): לוח, מטלות, מרתון והפסקת חשיבה על מסך גדול. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('km-app')) return;
  document.body.classList.add('km-body');
  var API = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var hp = new URLSearchParams(location.hash.slice(1)), C = { code: hp.get('c'), key: hp.get('k') };
  if (!/^\d{6}$/.test(C.code || '') || !C.key) { $('km-err').hidden = false; $('km-err').textContent = 'פותחים את מצב המקרן מפורטל המורה (לשונית "כיף בכיתה").'; return; }
  history.replaceState(null, '', location.pathname + '#c=' + C.code + '&k=' + C.key);
  var GAMES = { sudoku: 'סודוקו', mila: 'מילה – וורדל בעברית', avanim: 'אבני מספרים', reviiot: 'ארבע בשורה', 'tzviya-misparim': 'צביעה לפי מספרים', tashbetz: 'תשבץ', damka: 'דמקה', shachmat: 'שחמט' };
  function admin(act, x) { return fetch(API + '/c/' + C.code + '/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ key: C.key, act: act }, x || {})) }).then(function (r) { return r.json(); }); }
  $('km-code').textContent = C.code;
  $('km-url').textContent = location.host + '/limudim/kita/talmidim';
  var brk = null;
  setInterval(function () {
    if (!brk) { $('km-brk').hidden = true; return; }
    var s = Math.max(0, Math.round((brk.until - Date.now()) / 1000));
    $('km-brk').hidden = !s; $('km-brk-t').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
  }, 1000);
  function load() {
    Promise.all([admin('get', { p: 'week' }), admin('hw_list')]).then(function (r) {
      var g = r[0], h = r[1];
      if (!g.ok) { $('km-err').hidden = false; $('km-err').textContent = g.error; return; }
      $('km-err').hidden = true;
      $('km-name').textContent = g.name; $('km-msg').hidden = !g.msg; $('km-msg').textContent = g.msg ? '📣 ' + g.msg : '';
      brk = g.brk; if (brk) $('km-brk-g').textContent = GAMES[brk.g] || brk.g;
      var rows = g.rows.filter(function (x) { return x.pts > 0; }).slice(0, 10);
      $('km-board').innerHTML = rows.length ? rows.map(function (x) { return '<li><span>' + (['🥇', '🥈', '🥉'][x.place - 1] || x.place) + '</span><b>' + esc(x.nick) + (x.crown ? ' <small>' + esc(x.crown) + '</small>' : '') + '</b><em>' + x.pts + '</em></li>'; }).join('') : '<li class="note">עוד אין נקודות השבוע. מי תהיה הראשונה?</li>';
      if (h.ok) $('km-hw').innerHTML = h.hw.filter(function (x) { return x.open; }).slice(0, 5).map(function (x) {
        var pct = h.students ? Math.round(x.full / h.students * 100) : 0, goal = x.mar ? Math.ceil(x.mar * h.students / 100) : 0;
        return '<div class="km-hw"><b>' + (x.kind === 'prep' ? '🎬 ' : x.mar ? '🏃 ' : '📚 ') + esc(x.title) + '</b>' +
          '<span class="kp-bar km-bar" aria-hidden="true"><i style="width:' + pct + '%"></i>' + (goal ? '<u style="inset-inline-start:' + Math.min(100, Math.round(goal / Math.max(1, h.students) * 100)) + '%"></u>' : '') + '</span>' +
          '<span>' + x.full + ' מתוך ' + h.students + (x.kind === 'prep' ? ' צפו' : ' סיימו') + (goal ? (x.full >= goal ? ' · 🎉 הבונוס הכיתתי הושג!' : ' · עוד ' + (goal - x.full) + ' לבונוס הכיתתי') : '') + (x.stuck ? ' · 🙋 ' + x.stuck + ' צריכים עזרה' : '') + '</span></div>';
      }).join('') || '<p class="note">אין מטלות פתוחות.</p>';
      $('km-upd').textContent = 'עודכן ' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    }).catch(function () { $('km-upd').textContent = 'אין חיבור. מנסים שוב…'; });
  }
  load(); setInterval(function () { if (!document.hidden) load(); }, 12000);
  $('km-fs').addEventListener('click', function () { try { document.documentElement.requestFullscreen(); } catch (e) {} });
  if (window.toolUsed) window.toolUsed('kita_makren', { action: 'open' });
})();
