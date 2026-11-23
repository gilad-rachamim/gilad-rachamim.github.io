/* פרשת השבוע (/kodesh/parasha/): מסמן את פרשת השבת הקרובה, מעתיק אותה לראש הדף, מציג את השבתות הבאות,
   ובאפליקציה – תזכורת שבועית (HakelimApp.setEvents). החישוב: hebcal-core (getSedra), לוח ארץ ישראל. */
(function () {
  'use strict';
  var H = window.hebcal, $ = function (id) { return document.getElementById(id); };
  if (!H || !$('pr-now')) return;
  var P = H.parshiot, KEY = 'kodesh-parasha', st = { on: false, h: 18, m: 0, day: 4 }, cache = {};
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) for (var k in sv) st[k] = sv[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sedra(y) { return cache[y] || (cache[y] = H.getSedra(y, true)); }
  function heName(n) { var t = H.Locale.gettext(n, 'he-x-NoNikud'); return t && t !== n ? t : n; }
  function week(sat) {
    var r = sedra(sat.getFullYear()).lookup(sat);
    var idx = r.chag ? [] : r.parsha.map(function (n) { return P.indexOf(n); }).filter(function (i) { return i >= 0; });
    return { sat: sat, greg: sat.greg(), chag: !!r.chag, idx: idx, name: r.chag ? heName(r.parsha[0]) : idx.map(nameOf).join('-') };
  }
  function nameOf(i) { var d = $('p-' + (i + 1)); return d ? d.getAttribute('data-name') : heName(P[i]); }
  function gdate(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function hdate(hd) { return H.gematriya(hd.getDate()) + ' ב' + heName(hd.getMonthName()) + ' ' + H.gematriya(hd.getFullYear() % 1000); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function part(i, cls) { var d = $('p-' + (i + 1)), el = d && d.querySelector('.' + cls); return el ? el.innerHTML : ''; }
  function text(i, cls) { var d = $('p-' + (i + 1)), el = d && d.querySelector('.' + cls); return el ? el.textContent.trim() : ''; }

  var today = new Date(), sat = new H.HDate(today).onOrAfter(6), list = [];
  for (var n = 0; n < 60; n++) { list.push(week(sat)); sat = sat.add(7); }
  var cur = list[0], reading = null;
  for (var j = 0; j < list.length; j++) if (!list[j].chag) { reading = list[j]; break; }

  function shareText(w) {
    var i = w.idx[0], t = 'שבת פרשת ' + w.name + '\n\n' + text(i, 'pr-short') + '\n\nרעיון לשולחן שבת: ' + text(i, 'pr-idea') +
      '\n\nשאלה לילדים: ' + text(i, 'pr-q') + '\n\nכל הפרשה בקצרה: https://hakelim.com/kodesh/parasha/?utm_source=share#p-' + (i + 1);
    return t;
  }

  function renderNow() {
    var w = reading, html = '';
    if (!w) return;
    if (cur.chag) html += '<p class="pr-when">בשבת הקרובה (' + esc(gdate(cur.greg)) + ') קוראים קריאה של ' + esc(cur.name) + ', ולא את פרשת השבוע. הפרשה הבאה:</p>';
    html += '<h2>פרשת ' + esc(w.name) + '</h2>';
    html += '<p class="pr-when">שבת, ' + esc(hdate(w.sat)) + ' · ' + esc(gdate(w.greg)) + (w.idx.length > 1 ? ' · פרשות מחוברות' : '') + '</p>';
    w.idx.forEach(function (i) {
      if (w.idx.length > 1) html += '<h3>' + esc(nameOf(i)) + '</h3>';
      html += '<h3>בקצרה</h3><p>' + part(i, 'pr-short') + '</p>';
      html += '<h3>הפסוק</h3><p class="pr-pasuk">' + part(i, 'pr-pasuk') + '</p>';
      html += '<h3>רעיון לשולחן שבת</h3><p>' + part(i, 'pr-idea') + '</p>';
      html += '<h3>שאלה לילדים</h3><p>' + part(i, 'pr-q') + '</p><details><summary>התשובה</summary><p>' + part(i, 'pr-a') + '</p></details>';
    });
    html += '<div class="pr-nav"><a class="btn btn-gold" id="pr-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(shareText(w)) + '">לשלוח למשפחה בווטסאפ</a>' +
      '<a class="btn btn-line" href="#p-' + (w.idx[0] + 1) + '">לפרשה ברשימה</a></div>';
    $('pr-now').innerHTML = html;
    w.idx.forEach(function (i) { var d = $('p-' + (i + 1)); if (d) { d.classList.add('pr-cur'); var s = d.querySelector('summary span'); if (s) s.textContent += ' · השבוע'; } });
    var wa = $('pr-wa'); if (wa) wa.addEventListener('click', function () { if (window.toolUsed) window.toolUsed('parasha', { how: 'share' }); });
  }

  function renderNext() {
    var ul = $('pr-next'); if (!ul) return;
    ul.innerHTML = list.slice(0, 8).map(function (w) {
      var nm = w.chag ? esc(w.name) : '<a href="#p-' + (w.idx[0] + 1) + '">' + esc(w.name) + '</a>';
      return '<li><b>' + nm + '</b><span>' + esc(hdate(w.sat)) + ' · ' + esc(gdate(w.greg)) + '</span></li>';
    }).join('');
  }

  // פתיחת הפרשה לפי העוגן בכתובת
  function openHash() {
    var m = /^#p-(\d+)$/.exec(location.hash); if (!m) return;
    var d = $('p-' + m[1]); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); }
  }

  // תזכורת באפליקציה
  function events() {
    var out = [];
    list.forEach(function (w) {
      if (w.chag) return;
      var d = new Date(w.greg.getTime()); d.setDate(d.getDate() - (6 - st.day));
      var idea = text(w.idx[0], 'pr-idea');
      out.push({ date: iso(d), title: 'שבת פרשת ' + w.name, text: idea.length > 110 ? idea.slice(0, 107) + '…' : idea });
    });
    return out;
  }
  function push() {
    var A = window.HakelimApp; if (!A || !A.setEvents) return;
    try { A.setEvents(JSON.stringify(st.on ? events() : [])); A.setReminder(!!st.on, st.h, st.m); } catch (e) {}
  }
  function initRem() {
    var box = $('pr-rem'), A = window.HakelimApp;
    if (!box || !A || !A.setEvents) return;
    box.hidden = false;
    var on = $('pr-rem-on'), tm = $('pr-rem-time'), dy = $('pr-rem-day');
    on.checked = !!st.on; tm.value = ('0' + st.h).slice(-2) + ':' + ('0' + st.m).slice(-2); dy.value = String(st.day);
    function ch() {
      var p = (tm.value || '18:00').split(':');
      st.on = on.checked; st.h = +p[0] || 0; st.m = +p[1] || 0; st.day = +dy.value; save(); push();
      if (window.toolUsed) window.toolUsed('parasha', { how: 'reminder' });
    }
    on.addEventListener('change', ch); tm.addEventListener('change', ch); dy.addEventListener('change', ch);
    push();
  }

  renderNow(); renderNext(); initRem(); openHash();
  window.addEventListener('hashchange', openHash);
})();
