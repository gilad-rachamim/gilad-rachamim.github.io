// ספירה לאחור לתאריך (/kelim/eruim/sfira/): יום הולדת, חופשה, חתונה, מבחן.
// בלי שרת: הספירות נשמרות בטלפון (localStorage), והשיתוף הוא קישור שמכיל את השם והתאריך בחלק ה-# (לא נשלח לשום שרת).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var card = $('sf-card');
  if (!card) return;
  var KEY = 'eruim-sfira', PATH = '/kelim/eruim/sfira/';
  var TYPES = [['🎉', 'אירוע', 'המסיבה של הכיתה'], ['🎂', 'יום הולדת', 'יום ההולדת של אבא'], ['💍', 'חתונה', 'החתונה של נועה ואביתר'], ['✈️', 'חופשה', 'הטיסה ליוון'], ['📝', 'מבחן', 'הבגרות במתמטיקה'], ['🕎', 'חג', 'ליל הסדר'], ['👶', 'לידה', 'תאריך הלידה המשוער'], ['🎓', 'סיום', 'מסיבת הסיום'], ['🪖', 'שחרור', 'השחרור מהצבא'], ['⭐', 'אחר', 'היום הגדול']];
  var STYLES = ['לילה', 'קלף', 'ירוק זית'];
  function used(how) { if (window.toolUsed) window.toolUsed('eruim_sfira', { how: how }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function clean(o) {  // רק מה שמותר להיכנס מקישור
    if (!o || typeof o !== 'object') return null;
    var d = String(o.d || ''), t = String(o.t || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(new Date(d + 'T00:00').getTime())) return null;
    if (!/^\d{2}:\d{2}$/.test(t)) t = '';
    return { n: String(o.n || '').slice(0, 60), d: d, t: t, e: Math.max(0, Math.min(TYPES.length - 1, o.e | 0)), s: Math.max(0, Math.min(STYLES.length - 1, o.s | 0)) };
  }
  function enc(it) {
    var j = JSON.stringify([it.n, it.d, it.t, it.e, it.s]);
    return btoa(unescape(encodeURIComponent(j))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function dec(s) {
    try { var a = JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); return clean({ n: a[0], d: a[1], t: a[2], e: a[3], s: a[4] }); } catch (e) { return null; }
  }
  function link(it) { return location.origin + PATH + '#s=' + enc(it); }
  function target(it) { return new Date(it.d + 'T' + (it.t || '00:00') + ':00'); }
  function same(a, b) { return a && b && a.n === b.n && a.d === b.d && a.t === b.t; }

  var st = { list: [] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && Array.isArray(sv.list)) st.list = sv.list.map(clean).filter(Boolean).slice(0, 40); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  // cur = הספירה שמוצגת. idx = המקום שלה ברשימה השמורה, או -1 (דוגמה / ספירה שהגיעה בקישור ועוד לא נשמרה)
  var cur, idx = -1, mode = 'demo';
  var shared = (/[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash) || [])[1];
  var got = shared ? dec(shared) : null;
  if (got) {
    idx = -1; st.list.forEach(function (x, i) { if (same(x, got)) idx = i; });
    cur = idx >= 0 ? st.list[idx] : got; mode = idx >= 0 ? 'mine' : 'guest';
  } else if (st.list.length) { idx = 0; cur = st.list[0]; mode = 'mine'; }
  else { var dd = new Date(); dd.setDate(dd.getDate() + 30); cur = { n: 'יום ההולדת של סבתא רחל', d: iso(dd), t: '18:00', e: 1, s: 0 }; }

  var fullDate = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function dateText(it) { return fullDate.format(target(it)) + (it.t ? ', בשעה ' + it.t : ''); }
  function daysWord(n) { return n === 1 ? 'יום אחד' : n === 2 ? 'יומיים' : n + ' ימים'; }
  function summary(it) {  // משפט אחד: "עוד 30 ימים ל..." (לשיתוף ולרשימה)
    var ms = target(it) - Date.now(), name = it.n || TYPES[it.e][1];
    if (ms <= 0) {
      var ago = Math.floor(-ms / 86400000);
      return (!it.t && ago === 0) || (it.t && -ms < 86400000) ? 'הגיע היום: ' + name + ' 🎉' : 'עברו ' + daysWord(ago) + ' מאז: ' + name;
    }
    var d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000);
    if (d >= 1) return 'עוד ' + daysWord(d) + ' עד: ' + name;
    return 'עוד ' + (h >= 1 ? (h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : h + ' שעות') : Math.max(1, Math.floor(ms / 60000)) + ' דקות') + ' עד: ' + name;
  }
  function tick() {
    var ms = target(cur) - Date.now(), past = ms <= 0, a = Math.abs(ms);
    var d = Math.floor(a / 86400000), h = Math.floor(a % 86400000 / 3600000), m = Math.floor(a % 3600000 / 60000), s = Math.floor(a % 60000 / 1000);
    var today = past && ((!cur.t && d === 0) || (cur.t && a < 86400000));
    $('sf-pre').textContent = today ? '🎉 הגיע היום!' : past ? 'עברו כבר' : 'עוד';
    $('sf-d').textContent = d; $('sf-h').textContent = pad(h); $('sf-m').textContent = pad(m); $('sf-s').textContent = pad(s);
    $('sf-dl').textContent = d === 1 ? 'יום' : 'ימים';
    $('sf-nums').hidden = today && !cur.t;
    var wk = Math.floor(d / 7);
    $('sf-extra').textContent = !past && d >= 14 ? 'שהם ' + wk + ' שבועות' + (d % 7 ? ' ו' + (d % 7 === 1 ? 'יום' : d % 7 === 2 ? 'יומיים' : '-' + (d % 7) + ' ימים') : '') : '';
  }
  function paint() {
    card.className = 'sf-card s' + cur.s;
    $('sf-em').textContent = TYPES[cur.e][0];
    $('sf-name').textContent = cur.n || TYPES[cur.e][1];
    $('sf-date').textContent = dateText(cur);
    tick();
    var note = $('sf-note');
    note.hidden = mode === 'mine';
    if (mode === 'demo') note.innerHTML = '<span>זו דוגמה. כותבים למטה שם ותאריך משלכם, והיא מתחלפת.</span>';
    if (mode === 'guest') note.innerHTML = '<span>קיבלתם ספירה לאחור בקישור.</span> <button class="btn btn-gold btn-sm" type="button" id="sf-keep">לשמור אצלי</button> <button class="btn btn-line btn-sm" type="button" id="sf-own">ליצור ספירה משלי</button>';
    $('sf-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('⏳ ' + summary(cur) + '\n' + dateText(cur) + '\n\nהספירה לאחור, מתעדכנת לבד:\n' + link(cur));
    var t0 = target(cur), z = function (d, time) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + (time ? 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00' : ''); };
    var t1 = new Date(t0.getTime() + (cur.t ? 3600000 : 86400000));
    $('sf-cal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(cur.n || TYPES[cur.e][1]) + '&dates=' + z(t0, !!cur.t) + '/' + z(t1, !!cur.t) + (cur.t ? '&ctz=Asia/Jerusalem' : '');
    drawList();
  }
  function fill() {
    $('sf-n').value = mode === 'demo' ? '' : cur.n; $('sf-n').placeholder = 'למשל: ' + TYPES[cur.e][2];
    $('sf-dt').value = mode === 'demo' ? '' : cur.d; $('sf-tm').value = mode === 'demo' ? '' : cur.t;
    chips('sf-types', cur.e); chips('sf-styles', cur.s);
  }
  function chips(id, on) { $(id).querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i === on); b.setAttribute('aria-pressed', i === on); }); }
  function drawList() {
    var box = $('sf-list');
    $('sf-mine').hidden = !st.list.length;
    box.innerHTML = st.list.map(function (it, i) {
      return '<div class="er-item' + (i === idx ? ' soon' : '') + '"><div class="top"><b>' + TYPES[it.e][0] + ' ' + esc(it.n || TYPES[it.e][1]) + '</b><span>' + esc(fullDate.format(target(it))) + '</span></div><p>' + esc(summary(it)) + '</p>' +
        '<div class="acts"><button type="button" data-open="' + i + '"' + (i === idx ? ' aria-current="true"' : '') + '>' + (i === idx ? 'מוצגת למעלה' : 'להציג') + '</button><button type="button" data-del="' + i + '">למחוק</button></div></div>';
    }).join('');
  }
  // כל שינוי בטופס: דוגמה או ספירה מקישור הופכות לספירה שמורה משלי
  function mine() {
    if (mode === 'mine') return;
    var base = mode === 'guest' ? cur : { n: '', d: cur.d, t: '', e: cur.e, s: cur.s };
    cur = { n: base.n, d: base.d, t: base.t, e: base.e, s: base.s };
    st.list.unshift(cur); idx = 0; mode = 'mine';
    try { history.replaceState(null, '', PATH); } catch (e) {}
    used('new');
  }
  function edit(fn) {
    var was = mode; mine(); fn(); save(); paint();
    if (was !== 'mine') { if (!$('sf-dt').value) $('sf-dt').value = cur.d; if (!$('sf-tm').value && cur.t) $('sf-tm').value = cur.t; }
  }
  $('sf-n').addEventListener('input', function () { var v = this.value.slice(0, 60); edit(function () { cur.n = v; }); });
  $('sf-dt').addEventListener('change', function () { var v = this.value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; edit(function () { cur.d = v; }); });
  $('sf-tm').addEventListener('change', function () { var v = /^\d{2}:\d{2}$/.test(this.value) ? this.value : ''; edit(function () { cur.t = v; }); });
  $('sf-types').innerHTML = TYPES.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + t[0] + ' ' + t[1] + '</button>'; }).join('');
  $('sf-styles').innerHTML = STYLES.map(function (t, i) { return '<button type="button" data-i="' + i + '">' + t + '</button>'; }).join('');
  $('sf-types').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var i = +b.getAttribute('data-i'); edit(function () { cur.e = i; }); chips('sf-types', i); $('sf-n').placeholder = 'למשל: ' + TYPES[i][2]; });
  $('sf-styles').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var i = +b.getAttribute('data-i'); edit(function () { cur.s = i; }); chips('sf-styles', i); });
  $('sf-note').addEventListener('click', function (e) {
    if (e.target.id === 'sf-keep') { mine(); save(); paint(); fill(); $('sf-live').textContent = 'הספירה נשמרה ברשימה שלכם'; used('keep'); }
    if (e.target.id === 'sf-own') newOne();
  });
  function newOne() {
    var d = new Date(); d.setDate(d.getDate() + 30);
    cur = { n: '', d: iso(d), t: '', e: 0, s: cur.s }; st.list.unshift(cur); idx = 0; mode = 'mine'; save();
    try { history.replaceState(null, '', PATH); } catch (e) {}
    paint(); fill(); $('sf-n').focus(); used('new');
  }
  $('sf-new').addEventListener('click', newOne);
  $('sf-list').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-open')) { idx = +b.getAttribute('data-open'); cur = st.list[idx]; mode = 'mine'; paint(); fill(); window.scrollTo(0, 0); }
    if (b.hasAttribute('data-del')) {
      var i = +b.getAttribute('data-del');
      if (!confirm('למחוק את הספירה "' + (st.list[i].n || TYPES[st.list[i].e][1]) + '"?')) return;
      var was = st.list[i] === cur; st.list.splice(i, 1); save();
      if (was) { if (st.list.length) { idx = 0; cur = st.list[0]; } else { idx = -1; mode = 'demo'; var d = new Date(); d.setDate(d.getDate() + 30); cur = { n: 'יום ההולדת של סבתא רחל', d: iso(d), t: '18:00', e: 1, s: 0 }; } }
      else idx = st.list.indexOf(cur);
      paint(); fill();
    }
  });
  $('sf-wa').addEventListener('click', function () { used('wa'); });
  $('sf-cal').addEventListener('click', function () { used('cal'); });
  $('sf-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(link(cur)) : Promise.reject()).then(function () { b.textContent = 'הקישור הועתק ✓'; setTimeout(function () { b.textContent = '🔗 להעתיק קישור'; }, 1800); }).catch(function () {});
    used('copy');
  });
  $('sf-full').addEventListener('click', function () {
    var on = document.body.classList.toggle('sf-fullscreen');
    this.textContent = on ? 'לצאת ממסך מלא' : 'מסך מלא';
    if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    else if (!on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
    window.scrollTo(0, 0); used('full');
  });
  $('sf-form').addEventListener('submit', function (e) { e.preventDefault(); });
  if (mode === 'guest') used('open_link');
  paint(); fill();
  setInterval(tick, 1000);
  setInterval(drawList, 60000);
})();
