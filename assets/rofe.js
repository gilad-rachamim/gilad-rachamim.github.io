// הכנה לביקור אצל רופא: טופס → דף להראות בחדר, ווטסאפ או הדפסה. נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('rf-form'), card = $('rf-card');
  if (!form) return;
  var KEY = 'kelim-rofe';
  var F = [['who', ''], ['doc', ''], ['what', 'מה מרגישים'], ['since', 'ממתי וכמה פעמים'], ['better', 'מה עוזר ומה מחמיר'], ['q', 'שאלות לרופא'], ['meds', 'תרופות קבועות'], ['allerg', 'אלרגיות'], ['docs', 'מה הבאתי']];
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function v(k) { return String(st[k] || '').trim(); }
  var text = '';
  function draw() {
    var title = 'לביקור אצל הרופא' + (v('who') ? ' – ' + v('who') : '');
    var body = F.slice(2).filter(function (f) { return v(f[0]); });
    card.innerHTML = '<h3>' + esc(title) + '</h3><p class="s2">' + (v('doc') ? esc(v('doc')) : 'מה חשוב לי לספר ולשאול') + '</p>' +
      (body.length ? body.map(function (f) {
        var val = v(f[0]);
        if (f[0] === 'q') return '<h4>' + f[1] + '</h4><ol style="padding-inline-start:1.3rem">' + val.split('\n').filter(function (x) { return x.trim(); }).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
        return '<h4>' + f[1] + '</h4><p class="nt">' + esc(val) + '</p>';
      }).join('') : '<p class="s2">ממלאים למעלה, והדף נבנה כאן.</p>');
    text = title + (v('doc') ? '\n' + v('doc') : '') + '\n\n' + body.map(function (f) {
      var val = v(f[0]);
      if (f[0] === 'q') val = val.split('\n').filter(function (x) { return x.trim(); }).map(function (x, i) { return (i + 1) + '. ' + x.trim(); }).join('\n');
      return '*' + f[1] + '*\n' + val;
    }).join('\n\n');
    $('rf-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  function fill() { F.forEach(function (f) { form.querySelector('[name=' + f[0] + ']').value = st[f[0]] || ''; }); }
  form.addEventListener('input', function () { F.forEach(function (f) { st[f[0]] = form.querySelector('[name=' + f[0] + ']').value; }); save(); draw(); });
  // ביקור חדש: מנקה את התלונה והשאלות, ומשאיר את מי, התרופות והאלרגיות
  $('rf-new').addEventListener('click', function () { ['doc', 'what', 'since', 'better', 'q', 'docs'].forEach(function (k) { st[k] = ''; }); save(); fill(); draw(); });
  function used(how) { if (window.toolUsed) window.toolUsed('rofe', { how: how }); }
  $('rf-print').addEventListener('click', function () { used('print'); window.print(); });
  $('rf-wa').addEventListener('click', function () { used('wa'); });
  fill(); draw();
})();
