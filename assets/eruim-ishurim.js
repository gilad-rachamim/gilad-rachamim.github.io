// אישורי הגעה ורשימת מוזמנים – הכלים של גילעד רחמים (/kelim/eruim/ishurim/)
// כלי עצמאי: יוצרים אירוע, שולחים קישור בווטסאפ, ורואים בלוח מי מגיע / אולי / לא, וכמה אנשים.
// השרת: Worker eruim-rsvp (tools/eruim-rsvp-worker), אותו שרת של אישורי ההגעה במחולל ההזמנות.
//   בשרת: פרטי האירוע ותשובות האורחים (נמחקים 30 יום אחרי האירוע).
//   בטלפון בלבד (localStorage): רשימת המוזמנים והטלפונים, וקישור הניהול.
// שם האירוע נשמר בשדה host של השרת (שדה טקסט קיים), כדי שהכלי יעבוד גם בלי שינוי בשרת.
// שני מצבים באותו קובץ: הלוח (#ish) ודף האורח (#ga, /kelim/eruim/ishurim/a/?e=ID&g=CODE&n=NAME).
(function () {
  'use strict';
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:8788' : 'https://eruim-rsvp.gilad4049.workers.dev';
  var BASE = '/kelim/eruim/ishurim/', HAZ = '/kelim/eruim/hazmana/';
  var STORE = 'eruim-ishurim-evs';
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function used(how, x) { try { if (window.toolUsed) window.toolUsed('eruim_ishurim', Object.assign({ how: how }, x || {})); } catch (e) {} }
  function api(path, body) {
    var o = { method: body ? 'POST' : 'GET', headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(API + path, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ('שגיאה ' + r.status)); return j; });
    });
  }
  function copy(text, btn) {
    var done = function () { if (!btn) return; var o = btn.innerHTML; btn.textContent = 'הועתק ✓'; setTimeout(function () { btn.innerHTML = o; }, 1800); };
    var fb = function () { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fb); else fb();
  }

  // ---------- תאריך (עברי ולועזי) ----------
  var enFmt = null; try { enFmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
  var MONTHS = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'], s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function hebrew(d) {
    if (!enFmt) return '';
    var o = {}; enFmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    return gem(parseInt(o.day, 10)) + ' ב' + (MONTHS[(o.month || '').toLowerCase()] || o.month) + ' ' + gem(parseInt(o.year, 10) % 1000);
  }
  function parseDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function whenText(d) {
    var dt = parseDate(d.dt); if (!dt) return '';
    var h = hebrew(dt), g = dt.getDate() + '.' + (dt.getMonth() + 1) + '.' + dt.getFullYear();
    return (dt.getDay() === 6 ? 'בשבת קודש, ' : 'ביום ' + DAYS[dt.getDay()] + ', ') + (h ? h + ' (' + g + ')' : g) + (d.tm ? ', בשעה ' + d.tm.replace(/^0(\d)/, '$1') : '');
  }
  function isPast(d) { var dt = parseDate(d.dt), t = new Date(); t.setHours(0, 0, 0, 0); return dt && dt < t; }
  function titleOf(d, ev) { return (ev && ev.t) || d.host || [d.nm1, d.nm2].filter(Boolean).join(' ו') || 'השמחה'; }
  function navQ(d) { return d.ad || d.pl || ''; }
  function gcalUrl(d) {
    var p = d.dt.replace(/-/g, ''), dates;
    if (d.tm) {
      var t = d.tm.split(':').map(Number), e = new Date(2000, 0, 1, t[0] + 4, t[1]), end = parseDate(d.dt);
      if (t[0] + 4 >= 24) end.setDate(end.getDate() + 1);
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      dates = p + 'T' + pad(t[0]) + pad(t[1]) + '00/' + end.getFullYear() + pad(end.getMonth() + 1) + pad(end.getDate()) + 'T' + pad(e.getHours()) + pad(e.getMinutes()) + '00&ctz=Asia/Jerusalem';
    } else {
      var n = parseDate(d.dt); n.setDate(n.getDate() + 1);
      dates = p + '/' + n.getFullYear() + String(n.getMonth() + 1).padStart(2, '0') + String(n.getDate()).padStart(2, '0');
    }
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(titleOf(d)) + '&dates=' + dates + '&location=' + encodeURIComponent([d.pl, d.ad].filter(Boolean).join(', '));
  }
  function telIntl(t) {
    var n = (t || '').replace(/[^\d+]/g, '');
    if (!n) return '';
    if (n[0] === '+') return n.slice(1);
    if (/^0\d{8,9}$/.test(n)) return '972' + n.slice(1);
    return n;
  }

  // =========================================================
  // דף האורח
  // =========================================================
  var ga = $('#ga');
  if (ga) { guestPage(); return; }
  function guestPage() {
    var q = new URLSearchParams(location.search), eid = (q.get('e') || '').replace(/[^a-z0-9]/g, '');
    var gcode = (q.get('g') || '').replace(/[^a-z0-9]/g, '').slice(0, 10), gname = (q.get('n') || '').slice(0, 60);
    if (!eid) { $('#ga-missing').hidden = false; return; }
    api('/ev/' + eid).then(function (j) { show(j); }, function (x) {
      if (/לא נמצא|404/.test(x.message)) $('#ga-missing').hidden = false; else $('#ga-down').hidden = false;
    });
    function show(j) {
      var d = j.d || {}, f = $('#ga-form'), done = $('#ga-done'), KEY = 'eruim-ishur-' + eid + (gcode ? '-' + gcode : ''), mine = null;
      document.title = titleOf(d) + ' – אישור הגעה';
      $('#ga-title').textContent = titleOf(d);
      $('#ga-when').textContent = whenText(d);
      $('#ga-place').textContent = [d.pl, d.ad].filter(Boolean).join(', ');
      if (navQ(d)) {
        $('#ga-waze').href = 'https://waze.com/ul?q=' + encodeURIComponent(navQ(d)) + '&navigate=yes';
        $('#ga-maps').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(navQ(d));
      } else $('#ga-nav').hidden = true;
      $('#ga-gcal').href = gcalUrl(d);
      if (!(j.v >= 2)) $('#ga-maybe-l').remove(); // שרת ישן: בלי "אולי"
      ga.hidden = false;
      if (isPast(d)) { $('#ga-after').hidden = false; $('#ga-links').hidden = true; return; }
      try { mine = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      if (gname && gname.length > 1) { $('#ga-hi').textContent = 'שלום ' + gname + '! בעלי השמחה ישמחו לדעת אם תגיעו.'; }
      function toggle() { var ok = f.querySelector('input[name=ok]:checked'); $('#ga-cwrap').hidden = !(ok && ok.value !== '0'); $('#ga-cwrap label').textContent = ok && ok.value === '2' ? 'אם תגיעו, כמה תהיו?' : 'כמה תהיו?'; }
      function fill(a) { f.elements.n.value = a.n || ''; f.elements.note.value = a.note || ''; f.elements.c.value = a.c || 1; var r = f.querySelector('input[name=ok][value="' + a.ok + '"]'); if (r) r.checked = true; }
      function showDone(a) {
        f.hidden = true; done.hidden = false;
        $('#ga-done-txt').textContent = a.ok === 1 ? 'תודה! נרשם: ' + (a.c > 1 ? a.c + ' מגיעים' : 'מגיעים') + '. נתראה בשמחה 🎉' : a.ok === 2 ? 'תודה! נרשם "אולי". כשתדעו, חזרו לקישור ועדכנו.' : 'תודה שעדכנתם. נתראה בשמחות!';
      }
      f.addEventListener('change', toggle);
      if (mine) { fill(mine); showDone(mine); } else { if (gname) f.elements.n.value = gname; toggle(); }
      $('#ga-edit').addEventListener('click', function () { done.hidden = true; f.hidden = false; toggle(); });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = f.querySelector('input[name=ok]:checked'), err = $('#ga-err');
        if (!ok) { err.textContent = 'סמנו אם אתם מגיעים'; err.hidden = false; return; }
        if (!f.reportValidity()) return;
        var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'שולח…'; err.hidden = true;
        var body = { aid: mine && mine.aid, n: f.elements.n.value.trim(), c: f.elements.c.value, ok: +ok.value, note: f.elements.note.value.trim(), website: f.elements.website.value };
        if (gcode) body.g = gcode;
        api('/ev/' + eid + '/rsvp', body).then(function (r) {
          mine = { aid: r.aid, n: body.n, c: +body.c, ok: body.ok, note: body.note };
          try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (x) {}
          showDone(mine); used('answer', { ok: body.ok, personal: gcode ? 1 : 0 });
        }, function (x) { err.textContent = x.message || 'לא הצלחנו לשלוח. נסו שוב.'; err.hidden = false; }).then(function () { btn.disabled = false; btn.textContent = 'שליחת התשובה'; });
      });
      $('#ga-box').hidden = false;
    }
  }

  // =========================================================
  // הלוח של בעלי השמחה
  // =========================================================
  var root = $('#ish');
  if (!root) return;
  var st = { evs: {}, cur: '' };
  try { var sv = JSON.parse(localStorage.getItem(STORE) || 'null'); if (sv && sv.evs) st = sv; } catch (e) {}
  function save() { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) {} }
  var ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
  function rid(n) { var s = ''; var a = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < n; i++) s += ALPHA[a[i] % ALPHA.length]; return s; }

  // קישור ניהול שהגיע בכתובת (מטלפון אחר, או מלוח המעקב של מחולל ההזמנות)
  (function importFromUrl() {
    var q = new URLSearchParams(location.search), id = (q.get('e') || '').replace(/[^a-z0-9]/g, ''), tok = (q.get('t') || '').replace(/[^a-z0-9]/g, '');
    if (!id || !tok) return;
    var ev = st.evs[id] || { id: id, g: [] };
    ev.tok = tok;
    if (q.get('src') === 'h') ev.src = 'h';
    if (q.get('ttl')) ev.t = q.get('ttl').slice(0, 90);
    st.evs[id] = ev; st.cur = id; save();
    used('import', { src: ev.src || 'i' });
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  })();

  var data = null, filter = 'all';
  var form = $('#ish-form');
  function cur() { return st.evs[st.cur]; }
  function guestBase(ev) { return location.origin + (ev.src === 'h' ? HAZ + 'v/' : BASE + 'a/') + '?e=' + ev.id; }
  function personalUrl(ev, g) { return guestBase(ev) + '&g=' + g.c + '&n=' + encodeURIComponent(g.n); }
  function adminUrl(ev) { return location.origin + BASE + '?e=' + ev.id + '&t=' + ev.tok + (ev.src === 'h' ? '&src=h' : '') + (ev.t ? '&ttl=' + encodeURIComponent(ev.t) : ''); }
  function norm(s) { return String(s || '').replace(/["'״׳.,\-–()]/g, ' ').replace(/^\s*(משפחת|משפ׳|מש׳)\s+/, '').replace(/\s+/g, ' ').trim(); }

  function showView(v) {
    form.hidden = v !== 'form'; $('#ish-ev').hidden = v !== 'ev';
    var ids = Object.keys(st.evs);
    $('#ish-mine').hidden = !ids.length;
    $('#ish-evs').innerHTML = ids.map(function (id) {
      var e = st.evs[id];
      return '<li><a href="#" data-ev="' + id + '"' + (id === st.cur && v === 'ev' ? ' aria-current="true"' : '') + '><b>' + esc(e.t || e.title || 'אירוע') + '</b><small>' + esc(e.when || '') + (e.g && e.g.length ? ' · ' + e.g.length + ' מוזמנים ברשימה' : '') + '</small></a></li>';
    }).join('');
  }
  $('#ish-evs').addEventListener('click', function (e) {
    var a = e.target.closest('[data-ev]'); if (!a) return; e.preventDefault();
    st.cur = a.getAttribute('data-ev'); save(); openEv();
  });
  $('#ish-new').addEventListener('click', function () { newForm(null, true); });
  $('#f-cancel').addEventListener('click', function () { if (cur()) openEv(); else newForm(); });

  // ---------- יצירה ועריכה ----------
  var editing = false;
  function newForm(ev, focus) {
    editing = !!ev; form.reset();
    $('#ish-form-h').textContent = ev ? 'עריכת פרטי האירוע' : 'אירוע חדש';
    $('#f-go').textContent = ev ? 'לשמור' : 'ליצור קישור לאישורי הגעה';
    $('#f-cancel').hidden = !Object.keys(st.evs).length;
    if (ev && data) { var d = data.d; form.elements.host.value = titleOf(d, ev); ['dt', 'tm', 'pl', 'ad'].forEach(function (k) { form.elements[k].value = d[k] || ''; }); }
    $('#f-err').hidden = true;
    showView('form');
    if (focus) setTimeout(function () { form.elements.host.focus(); }, 50);
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('#f-err'), el = form.elements;
    err.hidden = true;
    if (!el.host.value.trim()) { err.textContent = 'כתבו את שם האירוע'; err.hidden = false; el.host.focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(el.dt.value)) { err.textContent = 'בחרו תאריך'; err.hidden = false; el.dt.focus(); return; }
    var d = { host: el.host.value.trim(), dt: el.dt.value, tm: el.tm.value, pl: el.pl.value.trim(), ad: el.ad.value.trim() };
    var btn = $('#f-go'), label = btn.textContent; btn.disabled = true; btn.textContent = 'רגע…';
    var ev = cur(), p;
    if (editing && ev) {
      var full = Object.assign({}, data.d, d); // שומרים שדות אחרים של האירוע
      p = api('/ev/' + ev.id + '/update?t=' + encodeURIComponent(ev.tok), { d: full }).then(function () { ev.t = ''; used('edit'); });
    } else {
      p = api('/ev', { d: d, website: el.website.value }).then(function (j) {
        st.evs[j.id] = { id: j.id, tok: j.tok, g: [] }; st.cur = j.id; used('create');
      });
    }
    p.then(function () { save(); openEv(); }, function (x) { err.textContent = x.message || 'לא הצלחנו להתחבר. בדקו את האינטרנט ונסו שוב.'; err.hidden = false; })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  });

  // ---------- הלוח ----------
  function openEv() {
    var ev = cur(); if (!ev) { newForm(); return; }
    data = null; filter = 'all';
    document.querySelectorAll('#ev-tabs [data-f]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-f') === 'all' ? 'true' : 'false'); });
    $('#ev-title').textContent = ev.t || ev.title || 'טוען…'; $('#ev-when').textContent = ev.when || '';
    $('#ev-list').innerHTML = '<li class="eh-empty">טוען…</li>';
    showView('ev');
    drawGuests();
    load();
    try { window.scrollTo({ top: root.offsetTop - 70, behavior: 'smooth' }); } catch (e) {}
  }
  function load() {
    var ev = cur(); if (!ev) return Promise.resolve();
    $('#ev-err').hidden = true;
    return api('/ev/' + ev.id + '/admin?t=' + encodeURIComponent(ev.tok)).then(function (j) {
      if (cur() !== ev) return;
      data = j; ev.title = titleOf(j.d, ev); ev.when = whenText(j.d); save();
      show();
    }, function (x) {
      var gone = /לא נמצא|לא תקין|403|404/.test(x.message);
      $('#ev-err').textContent = gone ? 'האירוע הזה כבר לא נמצא בשרת (נמחק, או שעברו 30 יום מהאירוע). אפשר להסיר אותו מהרשימה שלכם.' : (x.message || 'לא הצלחנו להתחבר') + '. נסו "רענון" בעוד רגע.';
      $('#ev-err').hidden = false;
      if (gone) $('#ev-list').innerHTML = '<li class="eh-empty"><button class="btn btn-line" type="button" id="ev-forget">להסיר מהרשימה שלי</button></li>';
      else $('#ev-list').innerHTML = '';
    });
  }
  root.addEventListener('click', function (e) {
    if (e.target.id !== 'ev-forget') return;
    delete st.evs[st.cur]; st.cur = Object.keys(st.evs)[0] || ''; save();
    if (st.cur) openEv(); else newForm();
  });
  function answers() {
    if (!data) return [];
    return Object.keys(data.answers || {}).map(function (k) { return Object.assign({ id: k }, data.answers[k]); }).sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
  }
  // מי מהמוזמנים ענה: לפי הקוד מהקישור האישי, ואם אין – לפי השם
  function matchGuests() {
    var ev = cur(), A = answers(), byG = {}, byN = {}, out = {};
    A.forEach(function (a) { if (a.g) byG[a.g] = a; else { var k = norm(a.n); if (k && !byN[k]) byN[k] = a; } });
    (ev.g || []).forEach(function (g) { out[g.c] = byG[g.c] || byN[norm(g.n)] || null; });
    return out;
  }
  function chip(a) {
    if (!a) return '<span class="chip wait">לא ענו</span>';
    if (a.ok === 1) return '<span class="chip yes">מגיעים' + (a.c > 1 ? ' · ' + a.c : '') + '</span>';
    if (a.ok === 2) return '<span class="chip maybe">אולי' + (a.c > 1 ? ' · ' + a.c : '') + '</span>';
    return '<span class="chip no">לא מגיעים</span>';
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function show() {
    var ev = cur(), d = data.d, A = answers();
    var yes = A.filter(function (a) { return a.ok === 1; }), maybe = A.filter(function (a) { return a.ok === 2; }), no = A.filter(function (a) { return !a.ok; });
    var people = yes.reduce(function (s, a) { return s + (+a.c || 1); }, 0);
    var m = matchGuests(), wait = (ev.g || []).filter(function (g) { return !m[g.c]; });
    $('#ev-title').textContent = titleOf(d, ev);
    $('#ev-when').textContent = whenText(d) + (d.pl ? ' · ' + d.pl : '');
    $('#ev-edit').hidden = ev.src === 'h'; // הזמנה מהמחולל: עורכים שם, כדי לא לדרוס את פרטי ההזמנה
    $('#st-people').textContent = people; $('#st-yes').textContent = yes.length; $('#st-maybe').textContent = maybe.length; $('#st-no').textContent = no.length;
    $('#st-wait').textContent = wait.length; $('#st-wait-box').hidden = !(ev.g && ev.g.length); $('#tab-wait').hidden = !(ev.g && ev.g.length);
    var link = guestBase(ev), ul = $('#ev-list'), list;
    $('#ev-short').textContent = link.replace(/^https?:\/\//, '');
    $('#ev-view').href = link;
    var msg = titleOf(d, ev) + '\n' + whenText(d) + (d.pl ? '\n' + d.pl : '') + '\n\nנשמח לדעת אם תגיעו. אישור הגעה בלחיצה:\n' + link;
    $('#ev-wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
    $('#ev-remind').href = 'https://wa.me/?text=' + encodeURIComponent('תזכורת: ' + titleOf(d, ev) + ', ' + whenText(d) + ' 🎉\nעוד לא עניתם? כאן מאשרים הגעה בלחיצה: ' + link);
    $('#ev-self').href = 'https://wa.me/?text=' + encodeURIComponent('לוח אישורי ההגעה – ' + titleOf(d, ev) + ' (לשמור, לא להעביר לאורחים): ' + adminUrl(ev));
    if (filter === 'wait') {
      ul.innerHTML = wait.length ? wait.map(function (g) { return '<li class="eh-row"><span class="who">' + esc(g.n) + '</span>' + chip(null) + '</li>'; }).join('') : '<li class="eh-empty">כל המוזמנים ברשימה ענו 🎉</li>';
    } else {
      list = filter === 'yes' ? yes : filter === 'maybe' ? maybe : filter === 'no' ? no : A;
      var gName = {}; (ev.g || []).forEach(function (g) { gName[g.c] = g.n; });
      ul.innerHTML = list.length ? list.map(function (a) {
        var t = new Date(a.ts), from = a.g && gName[a.g] && norm(gName[a.g]) !== norm(a.n) ? ' <small class="meta">(' + esc(gName[a.g]) + ')</small>' : '';
        return '<li class="eh-row"><span class="who">' + esc(a.n) + from + '</span>' + chip(a) +
          (a.note ? '<span class="meta">💬 ' + esc(a.note) + '</span>' : '') + '<span class="meta">' + t.getDate() + '.' + (t.getMonth() + 1) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()) + '</span></li>';
      }).join('') : '<li class="eh-empty">' + (A.length ? 'אין תשובות בסינון הזה.' : 'עוד אין תשובות. שלחו את הקישור לאורחים, והתשובות יופיעו כאן.') + '</li>';
    }
    drawGuests(m);
    showView('ev');
  }
  document.querySelectorAll('#ev-tabs [data-f]').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-f');
      document.querySelectorAll('#ev-tabs [data-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (data) show();
    });
  });
  $('#ev-refresh').addEventListener('click', function () { load(); used('refresh'); });
  $('#ev-edit').addEventListener('click', function () { if (data) newForm(cur()); });
  $('#ev-copy').addEventListener('click', function (e) { copy(guestBase(cur()), e.currentTarget); used('copy_link'); });
  $('#ev-wa').addEventListener('click', function () { used('share_wa'); });
  $('#ev-remind').addEventListener('click', function () { used('remind_all'); });
  $('#ev-self').addEventListener('click', function () { used('self'); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && !$('#ish-ev').hidden) load(); });

  // ---------- רשימת המוזמנים (רק בטלפון) ----------
  function parseLines(txt) {
    var out = [];
    txt.split(/\r?\n/).forEach(function (line) {
      line = line.replace(/\t/g, ' ').trim(); if (!line) return;
      var pm = line.match(/(\+?\d[\d\s\-–]{7,}\d)/), p = pm ? pm[1].replace(/[^\d+]/g, '') : '';
      var n = (pm ? line.replace(pm[1], ' ') : line).replace(/^[\s,;:\-–|]+|[\s,;:\-–|]+$/g, '').replace(/\s*[,;|]\s*/g, ' ').replace(/\s+/g, ' ').slice(0, 60);
      if (!n && p) n = p;
      if (n) out.push({ n: n, p: p });
    });
    return out;
  }
  $('#g-add').addEventListener('click', function () {
    var ev = cur(), ta = $('#g-paste'); if (!ev) return;
    var L = parseLines(ta.value); if (!L.length) { ta.focus(); return; }
    ev.g = ev.g || [];
    var seen = {}; ev.g.forEach(function (g) { seen[norm(g.n) + '|' + g.p] = 1; });
    var codes = {}; ev.g.forEach(function (g) { codes[g.c] = 1; });
    var added = 0;
    L.forEach(function (x) {
      var k = norm(x.n) + '|' + x.p; if (seen[k]) return; seen[k] = 1;
      var c; do { c = rid(4); } while (codes[c]); codes[c] = 1;
      ev.g.push({ c: c, n: x.n, p: x.p }); added++;
    });
    save(); ta.value = '';
    used('guests_add', { n: added });
    if (data) show(); else drawGuests();
  });
  function drawGuests(m) {
    var ev = cur(), ul = $('#g-list'); if (!ev) return;
    m = m || (data ? matchGuests() : {});
    var G = (ev.g || []).slice(), d = data ? data.d : {};
    // קודם מי שלא ענה
    G.sort(function (a, b) { return (m[a.c] ? 1 : 0) - (m[b.c] ? 1 : 0); });
    ul.innerHTML = G.map(function (g) {
      var a = m[g.c], tel = telIntl(g.p), act = '';
      if (!a && data) {
        var txt = 'שלום ' + g.n + '!\nהוזמנתם: ' + titleOf(d, ev) + ', ' + whenText(d) + '.\nנשמח לדעת אם תגיעו. אישור הגעה בלחיצה:\n' + personalUrl(ev, g);
        act = tel ? '<a class="go" href="https://wa.me/' + tel + '?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener" data-wa="1"><svg class="ic"><use href="#wa"/></svg> לשלוח</a>'
          : '<button class="go line" type="button" data-copy="' + g.c + '">העתקת קישור</button>';
      } else act = a ? chip(a) : '';
      return '<li class="' + (a ? 'ans' : '') + '"><span class="nm">' + esc(g.n) + '</span>' + act + '<button class="x" type="button" data-del="' + g.c + '" aria-label="להסיר את ' + esc(g.n) + '">×</button>' + (g.p ? '<span class="ph">' + esc(g.p) + '</span>' : '') + '</li>';
    }).join('');
    var n = G.length, ans = G.filter(function (g) { return m[g.c]; }).length;
    $('#g-sum').hidden = !n;
    $('#g-sum').textContent = n ? 'ענו ' + ans + ' מתוך ' + n + ' ברשימה' + (n - ans ? '. עוד ' + (n - ans) + ' לא ענו: לוחצים "לשלוח" ליד כל אחד, וההודעה האישית נפתחת בווטסאפ.' : '. כולם ענו 🎉') : '';
  }
  $('#g-list').addEventListener('click', function (e) {
    var ev = cur(), b = e.target.closest('button,a'); if (!b || !ev) return;
    if (b.hasAttribute('data-del')) {
      var c = b.getAttribute('data-del');
      ev.g = ev.g.filter(function (g) { return g.c !== c; }); save();
      if (data) show(); else drawGuests();
    } else if (b.hasAttribute('data-copy')) {
      var g = ev.g.filter(function (x) { return x.c === b.getAttribute('data-copy'); })[0];
      if (g) { copy(personalUrl(ev, g), b); used('copy_personal'); }
    } else if (b.hasAttribute('data-wa')) used('remind_one');
  });

  // ---------- סיכום, ייצוא ומחיקה ----------
  function statusText(a) { return !a ? 'לא ענו' : a.ok === 1 ? 'מגיעים' : a.ok === 2 ? 'אולי' : 'לא מגיעים'; }
  $('#ev-copylist').addEventListener('click', function (e) {
    if (!data) return;
    var ev = cur(), A = answers(), m = matchGuests(), out = [titleOf(data.d, ev), whenText(data.d), ''];
    [[1, 'מגיעים'], [2, 'אולי'], [0, 'לא מגיעים']].forEach(function (s) {
      var L = A.filter(function (a) { return (a.ok || 0) === s[0]; });
      if (!L.length) return;
      var sum = s[0] ? ' (' + L.reduce(function (t, a) { return t + (+a.c || 1); }, 0) + ' אנשים)' : '';
      out.push(s[1] + ' – ' + L.length + sum + ':');
      L.forEach(function (a) { out.push('• ' + a.n + (a.c > 1 ? ' – ' + a.c : '') + (a.note ? ' – ' + a.note : '')); });
      out.push('');
    });
    var W = (ev.g || []).filter(function (g) { return !m[g.c]; });
    if (W.length) { out.push('עוד לא ענו – ' + W.length + ':'); W.forEach(function (g) { out.push('• ' + g.n); }); }
    copy(out.join('\n').trim(), e.currentTarget); used('copy_list');
  });
  $('#ev-csv').addEventListener('click', function () {
    if (!data) return;
    var ev = cur(), A = answers(), m = matchGuests(), gBy = {};
    (ev.g || []).forEach(function (g) { gBy[g.c] = g; });
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var used2 = {}, rows = [['שם', 'תשובה', 'כמה', 'הערה', 'מהרשימה', 'טלפון', 'מתי']];
    (ev.g || []).forEach(function (g) { var a = m[g.c]; if (a) used2[a.id] = 1; rows.push([a ? a.n : g.n, statusText(a), a && a.ok ? a.c : '', a ? a.note : '', g.n, g.p, a ? a.ts.slice(0, 16).replace('T', ' ') : '']); });
    A.forEach(function (a) { if (!used2[a.id]) rows.push([a.n, statusText(a), a.ok ? a.c : '', a.note, '', '', a.ts.slice(0, 16).replace('T', ' ')]); });
    var csv = '﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n');
    var el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    el.download = 'ishurei-hagaa-' + (data.d.dt || ev.id) + '.csv'; document.body.appendChild(el); el.click(); setTimeout(function () { el.remove(); }, 1000);
    used('csv');
  });
  $('#ev-del').addEventListener('click', function () {
    var ev = cur(); if (!ev) return;
    if (!confirm('למחוק את האירוע ואת כל התשובות עכשיו? אי אפשר לשחזר. גם רשימת המוזמנים בטלפון תימחק.')) return;
    api('/ev/' + ev.id + '/delete?t=' + encodeURIComponent(ev.tok), {}).then(function () {
      delete st.evs[ev.id]; st.cur = Object.keys(st.evs)[0] || ''; save(); used('delete');
      if (st.cur) openEv(); else newForm();
    }, function (x) { alert(x.message); });
  });

  // ---------- התחלה ----------
  if (cur()) openEv();
  else {
    var ids = Object.keys(st.evs);
    if (ids.length) { st.cur = ids[0]; openEv(); } else newForm();
  }
  // השרת לא זמין (חסום ברשת, או נפל): מסתירים את הטופס ומציעים את הרשימה הפשוטה
  fetch(API + '/ev/ping00').then(function (r) { if (!/json/.test(r.headers.get('Content-Type') || '')) throw 0; }).catch(function () {
    $('#ish-off').hidden = false;
    if (!Object.keys(st.evs).length) form.hidden = true;
  });
  window.__ish = { st: function () { return st; }, parseLines: parseLines, norm: norm, load: load };
})();
