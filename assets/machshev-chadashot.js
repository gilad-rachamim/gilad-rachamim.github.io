/* החדשות ב-3 דקות – מציג את הסיכום האחרון מהשרת kelim-news (tools/news-worker). */
(function () {
  'use strict';
  var API = 'https://kelim-news.gilad4049.workers.dev';
  var TOOL = 'chadashot';
  var KEY = 'kelim_chadashot_topics';
  var NAMES = { main: 'העיקר', haredi: 'ציבור חרדי', economy: 'כלכלה וכיס' };
  var $ = function (id) { return document.getElementById(id); };
  var ed = null;

  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shown() { var t = load(); return ['main'].concat(['haredi', 'economy'].filter(function (k) { return t[k] !== false; })); }

  function nextRun() {
    var h = new Date().getHours();
    return h < 7 ? '07:00' : h < 13 ? '13:00' : h < 20 ? '20:00' : 'מחר ב-07:00';
  }

  function render() {
    if (!ed) return;
    $('nw-ed').textContent = 'סיכום ' + ed.name + ' – יום ' + ed.date.day + ', ' + ed.date.he;
    $('nw-when').textContent = 'יצא ב-' + ed.time + ' · הבא: ' + nextRun();
    var note = $('nw-note');
    if (ed.mode === 'titles') { note.hidden = false; note.textContent = 'הפעם רק הכותרות החשובות מכל אתר, עם קישור. הסיכום המלא במילים שלנו – בקרוב.'; }
    else note.hidden = true;
    var html = '';
    shown().forEach(function (sec) {
      var pts = (ed.sections && ed.sections[sec]) || [];
      if (!pts.length) return;
      html += '<section class="nw-sec"><h2>' + NAMES[sec] + '</h2><ol class="nw-list">';
      pts.forEach(function (p, i) {
        html += '<li>' + esc(p.text) + '<div class="nw-src">' + p.sources.map(function (s) {
          return '<a href="' + esc(s.link) + '" target="_blank" rel="noopener nofollow">' + esc(s.name) + '</a>';
        }).join('') + '<button type="button" class="no-print" data-sec="' + sec + '" data-i="' + i + '">מצאתי טעות</button></div></li>';
      });
      html += '</ol></section>';
    });
    $('nw-body').innerHTML = html || '<p class="nw-wait">אין נקודות בסיכום הזה.</p>';
    $('nw-wa').href = 'https://wa.me/?text=' + encodeURIComponent(asText());
  }

  function asText() {
    if (!ed) return '';
    var out = ['📰 החדשות ב-3 דקות – ' + ed.name + ', יום ' + ed.date.day + ' ' + ed.date.he, ''];
    shown().forEach(function (sec) {
      var pts = (ed.sections && ed.sections[sec]) || [];
      if (!pts.length) return;
      if (sec !== 'main') out.push('', '*' + NAMES[sec] + '*');
      pts.forEach(function (p, i) { out.push((i + 1) + '. ' + p.text); });
    });
    out.push('', 'כל הנקודות עם קישור למקור:', location.origin + '/kelim/machshev/chadashot/', 'בטלפון כשר: 077-2253345 שלוחה 8');
    return out.join('\n');
  }

  function renderOld(list) {
    var box = $('nw-old-list'), html = '';
    (list || []).slice(1, 7).forEach(function (e) {
      html += '<h3>' + esc(e.name) + ' – יום ' + esc(e.date.day) + ', ' + esc(e.date.he) + ' (' + esc(e.time) + ')</h3>';
      ((e.sections && e.sections.main) || []).forEach(function (p, i) { html += '<p>' + (i + 1) + '. ' + esc(p.text) + '</p>'; });
    });
    box.innerHTML = html || '<p>עוד אין.</p>';
  }

  function report(sec, i) {
    var p = ed.sections[sec][+i];
    var note = window.prompt('מה לא מדויק? (אפשר גם להשאיר ריק)\n\n' + p.text, '');
    if (note === null) return;
    fetch(API + '/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: p.text, note: note }) })
      .then(function () { alert('תודה! נבדוק ונתקן.'); }).catch(function () { alert('לא נשלח. נסו שוב מאוחר יותר.'); });
    used('report');
  }

  function init() {
    var t = load();
    document.querySelectorAll('#nw-topics input').forEach(function (cb) {
      cb.checked = t[cb.dataset.topic] !== false;
      cb.addEventListener('change', function () { var o = load(); o[cb.dataset.topic] = cb.checked; save(o); render(); used('topic'); });
    });
    $('nw-body').addEventListener('click', function (e) { var b = e.target.closest('button[data-sec]'); if (b) report(b.dataset.sec, b.dataset.i); });
    $('nw-copy').addEventListener('click', function () {
      var txt = asText(), btn = this;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        btn.textContent = 'הועתק ✓'; setTimeout(function () { btn.textContent = 'להעתיק את הסיכום'; }, 2000);
      }).catch(function () { window.prompt('העתיקו מכאן:', txt); });
      used('copy');
    });
    $('nw-wa').addEventListener('click', function () { used('wa'); });

    fetch(API + '/latest', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || j.empty) {
        $('nw-ed').textContent = 'הסיכום הראשון יוצא בקרוב';
        $('nw-body').innerHTML = '<p class="nw-wait">הסיכום הבא: ' + nextRun() + '.</p>';
        return;
      }
      ed = j; render(); used('view');
      return fetch(API + '/history').then(function (r) { return r.json(); }).then(renderOld);
    }).catch(function () {
      $('nw-ed').textContent = 'הסיכום לא נטען';
      $('nw-body').innerHTML = '<p class="nw-wait">ייתכן שהסינון בטלפון חוסם את שרת הסיכום. אפשר לשמוע אותו בקו הכלים: 077-2253345, שלוחה 8.</p>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
