/* Android call pages (/kelim/android/...): maker+version picker (from /assets/android-sicha-data.json),
   and after transcription: summary, tasks, reminders (Google Calendar + ICS) and "save to my call journal".
   Needs /assets/sicha-core.js (window.SichaCore). Uses window.YomanDB from /assets/yoman-sichot.js when present.
   Nothing here is sent to a server; the journal lives in this browser's IndexedDB. */
(function () {
  var C = window.SichaCore; if (!C) return;
  var esc = C.esc;
  function $(id) { return document.getElementById(id); }
  function used(what, extra) { try { if (window.toolUsed) window.toolUsed(document.body.getAttribute('data-tool') || '', Object.assign({ step: what }, extra || {})); } catch (e) {} }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var CAL = { prodid: 'android-sicha', desc: 'מתוך שיחה מוקלטת. hakelim.com/kelim/android/yoman-sichot/' };

  /* ---------- 1. picker ---------- */
  var V = { yes: 'כן', no: 'לא', depends: 'תלוי בטלפון ובאזור' };
  var pick = $('as-pick'), DATA = null;
  function linkList(src) {
    return String(src || '').split(/\s*;\s*/).filter(Boolean).map(function (u, i) {
      var host = u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      return '<a class="gold" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(host) + '</a>';
    }).join(' · ');
  }
  function badge(label, val, goodWhen) {
    var cls = val === goodWhen ? 'ok' : val === 'depends' ? 'mid' : 'no';
    return '<li class="as-b as-' + cls + '"><span>' + label + '</span><b>' + (V[val] || val) + '</b></li>';
  }
  function showVariant(b, v) {
    var out = $('as-how'); if (!out) return;
    var h = '<h3>' + esc(v.label_he) + '</h3><ul class="as-badges">' +
      badge('מקליט מובנה', v.builtin, 'yes') + badge('הצד השני שומע הודעה', v.announce, 'no') + badge('הקלטה אוטומטית', v.auto, 'yes') + '</ul>';
    if (v.steps_he && v.steps_he.length) h += '<h4>איך מקליטים</h4><ol class="ip-steps">' + v.steps_he.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    if (v.auto_steps_he && v.auto_steps_he.length) h += '<h4>הקלטה אוטומטית</h4><ol class="ip-steps">' + v.auto_steps_he.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    if (v.folder_he) h += '<h4>איפה הקובץ נשמר</h4><p>' + esc(v.folder_he) + '</p>';
    if (v.notes_he) h += '<p class="ip-why">' + esc(v.notes_he) + '</p>';
    if (v.builtin !== 'yes' && DATA && DATA.alternatives) {
      h += '<details class="ip-block"><summary><b>אין כפתור הקלטה? מה עוד אפשר</b></summary>' + DATA.alternatives.map(function (a) {
        return '<div class="as-alt"><b>' + esc(a.title_he) + '</b><p>' + esc(a.how_he) + '</p>' + (a.cons_he ? '<p class="ip-why">חיסרון: ' + esc(a.cons_he) + '</p>' : '') + '</div>';
      }).join('') + '</details>';
    }
    h += '<p class="as-src">מקור: ' + linkList(v.source) + (v.source_date ? ' · נבדק ' + esc(v.source_date) : '') +
      (v.verified === false ? ' · <b>לא אומת בטלפון אמיתי בישראל</b>' : '') + '</p>';
    out.innerHTML = h; out.hidden = false;
    store('as-variant', v.id);
    used('pick', { variant: v.id });
  }
  function selectBrand(b, keepVar) {
    var wrap = $('as-var-wrap'), sel = $('as-var');
    Array.prototype.forEach.call($('as-brands').children, function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-k') === b.id)); });
    sel.innerHTML = b.variants.map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(v.label_he) + '</option>'; }).join('');
    wrap.hidden = b.variants.length < 2;
    var v = b.variants.filter(function (x) { return x.id === keepVar; })[0] || b.variants[0];
    sel.value = v.id; sel.onchange = function () { showVariant(b, b.variants.filter(function (x) { return x.id === sel.value; })[0]); };
    showVariant(b, v);
  }
  if (pick) {
    fetch('/assets/android-sicha-data.json').then(function (r) { return r.json(); }).then(function (d) {
      DATA = d;
      var fixed = pick.getAttribute('data-brand'), brands = d.brands.filter(function (b) { return !fixed || b.id === fixed; });
      var box = $('as-brands');
      box.innerHTML = brands.map(function (b) { return '<button type="button" data-k="' + esc(b.id) + '" aria-pressed="false">' + esc(b.name_he) + '</button>'; }).join('');
      box.hidden = brands.length < 2;
      box.onclick = function (e) { var t = e.target.closest('button'); if (!t) return; selectBrand(brands.filter(function (b) { return b.id === t.getAttribute('data-k'); })[0]); };
      var want = (location.hash.match(/v=([\w-]+)/) || [])[1] || store('as-variant');
      var hit = null; brands.forEach(function (b) { b.variants.forEach(function (v) { if (v.id === want) hit = b; }); });
      if (hit) selectBrand(hit, want); else if (fixed) selectBrand(brands[0]);
    }).catch(function () { var o = $('as-how'); if (o) { o.hidden = false; o.innerHTML = '<p>לא הצלחתי לטעון את הטבלה. בדקו חיבור לאינטרנט ונסו שוב.</p>'; } });
  }

  /* ---------- 2. after transcription: summary, tasks, reminders ---------- */
  var sum = $('as-sum'); if (!sum) return;
  var cur = { text: '', blob: null, name: '', when: null, tasks: [], rems: [] };

  /* who/when from common call-recording file names (Samsung, MIUI, generic date stamps) */
  function fromName(name, lastMod) {
    var n = String(name || '').replace(/\.[a-z0-9]{2,5}$/i, ''), who = '', d = null, m;
    if ((m = n.match(/^call recording\s+(.+?)_(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/i))) { who = m[1]; d = new Date(2000 + +m[2], +m[3] - 1, +m[4], +m[5], +m[6]); }
    else if ((m = n.match(/^(.+?)\(([+\d\s-]+)\)_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/))) { who = m[1].trim() || m[2]; d = new Date(+m[3], +m[4] - 1, +m[5], +m[6], +m[7]); }
    else {
      if ((m = n.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_ ]?(\d{2})[-_:]?(\d{2})/))) d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      if ((m = n.match(/\+?\d[\d-]{8,}\d/))) who = m[0];
    }
    if (d && isNaN(d)) d = null;
    if (!d && lastMod) d = new Date(lastMod);
    return { who: who.replace(/[_]+/g, ' ').trim(), when: d };
  }
  window.tlOnFile = function (blob, name) {
    cur.blob = blob; cur.name = name || (blob && blob.name) || '';
    var g = fromName(cur.name, blob && blob.lastModified);
    cur.when = g.when; if (g.who && $('as-who') && !$('as-who').value) $('as-who').value = g.who;
    if ($('as-saved')) $('as-saved').textContent = '';
  };

  function taskRow(t, i) {
    return '<li><input type="checkbox" data-i="' + i + '"' + (t.done ? ' checked' : '') + ' aria-label="בוצע"><input class="as-in" type="text" data-ti="' + i + '" value="' + esc(t.t) + '" aria-label="המשימה"><button class="as-x" type="button" data-tdel="' + i + '" aria-label="למחוק משימה">✕</button></li>';
  }
  function remRow(r, i) {
    return '<li class="as-rem"><div class="as-rem-f"><input class="as-in" type="text" data-ri="' + i + '" data-f="title" value="' + esc(r.title) + '" aria-label="מה להזכיר">' +
      '<span class="as-dt"><input type="date" data-ri="' + i + '" data-f="date" value="' + esc(r.date) + '" aria-label="תאריך"><input type="time" data-ri="' + i + '" data-f="time" value="' + esc(r.time) + '" aria-label="שעה"></span>' +
      '<span class="as-rem-a"><a class="btn btn-gold btn-sm" data-gc="' + i + '" href="' + esc(C.gcal(r, curDetails())) + '" target="_blank" rel="noopener">📅 ליומן גוגל</a>' +
      '<button class="btn btn-line btn-sm" type="button" data-ics="' + i + '">קובץ יומן</button><button class="as-x" type="button" data-rdel="' + i + '" aria-label="למחוק תזכורת">✕</button></span></div></li>';
  }
  function curDetails() { var w = $('as-who') && $('as-who').value.trim(); return (w ? 'שיחה עם ' + w + '. ' : '') + 'מתוך יומן השיחות: hakelim.com/kelim/android/yoman-sichot/'; }
  function drawTasks() {
    $('as-tasks').innerHTML = cur.tasks.map(taskRow).join('');
    $('as-task-none').hidden = cur.tasks.length > 0;
  }
  function drawRems() {
    $('as-rem').innerHTML = cur.rems.map(remRow).join('');
    $('as-rem-none').hidden = cur.rems.length > 0; $('as-rem-all').hidden = cur.rems.length < 1;
  }
  function render(t) {
    t = String(t || '').trim(); if (t.length < 20 || t === cur.text) return;
    cur.text = t; cur.summary = C.summarize(t);
    cur.tasks = C.findTasks(t).map(function (s) { return { t: s, done: false }; });
    cur.rems = C.findDates(t);
    $('as-sum-list').innerHTML = cur.summary.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') || '<li>השיחה קצרה מדי לסיכום.</li>';
    $('as-sum-wa').href = 'https://wa.me/?text=' + encodeURIComponent('סיכום השיחה:\n• ' + cur.summary.join('\n• '));
    drawTasks(); drawRems();
    sum.hidden = false; $('as-saved').textContent = '';
    used('summary', { tasks: cur.tasks.length, dates: cur.rems.length });
  }

  $('as-sum-copy').onclick = function () { var b = this; try { navigator.clipboard.writeText('• ' + cur.summary.join('\n• ')).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק את הסיכום'; }, 1800); }); } catch (e) {} };
  $('as-tasks').addEventListener('change', function (e) { var i = e.target.getAttribute('data-i'); if (i != null) cur.tasks[+i].done = e.target.checked; });
  $('as-tasks').addEventListener('input', function (e) { var i = e.target.getAttribute('data-ti'); if (i != null) cur.tasks[+i].t = e.target.value; });
  $('as-tasks').addEventListener('click', function (e) { var i = e.target.getAttribute('data-tdel'); if (i != null) { cur.tasks.splice(+i, 1); drawTasks(); } });
  $('as-task-add').onclick = function () { cur.tasks.push({ t: '', done: false }); drawTasks(); var ins = $('as-tasks').querySelectorAll('.as-in'); if (ins.length) ins[ins.length - 1].focus(); };
  $('as-rem').addEventListener('input', function (e) {
    var i = e.target.getAttribute('data-ri'); if (i == null) return;
    cur.rems[+i][e.target.getAttribute('data-f')] = e.target.value;
    var a = $('as-rem').querySelector('[data-gc="' + i + '"]'); if (a && cur.rems[+i].date && cur.rems[+i].time) a.href = C.gcal(cur.rems[+i], curDetails());
  });
  $('as-rem').addEventListener('click', function (e) {
    var t = e.target, i;
    if ((i = t.getAttribute('data-rdel')) != null) { cur.rems.splice(+i, 1); drawRems(); }
    else if ((i = t.getAttribute('data-ics')) != null) { C.download([cur.rems[+i]], CAL); used('ics'); }
    else if (t.getAttribute('data-gc') != null) used('gcal');
  });
  $('as-rem-add').onclick = function () { var d = new Date(); d.setDate(d.getDate() + 1); cur.rems.push({ title: '', date: C.ymd(d), time: '09:00' }); drawRems(); var ins = $('as-rem').querySelectorAll('input[data-f=title]'); if (ins.length) ins[ins.length - 1].focus(); };
  $('as-rem-all').onclick = function () { C.download(cur.rems.filter(function (r) { return r.title && r.date; }), CAL); used('ics_all'); };

  /* paste an existing transcript */
  if ($('as-paste-go')) $('as-paste-go').onclick = function () { cur.blob = null; cur.name = ''; cur.when = null; render($('as-paste').value); sum.scrollIntoView({ behavior: 'smooth' }); };

  /* watch the tamlul engine's output */
  var tl = $('tl-text'), timer = null;
  if (tl && window.MutationObserver) new MutationObserver(function () {
    clearTimeout(timer); timer = setTimeout(function () {
      var out = $('tl-out'); if (out && out.hidden) return;
      var txt = tl.innerText.replace(/^\s*\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*/gm, '');
      if (txt.trim().length > 20) render(txt);
    }, 700);
  }).observe(tl, { childList: true, subtree: true, characterData: true });

  /* ---------- 3. save to the call journal ---------- */
  $('as-save').onclick = function () {
    var msg = $('as-saved'), btn = this;
    if (!window.YomanDB) { msg.textContent = 'היומן לא נטען. רעננו את הדף ונסו שוב.'; return; }
    var keep = $('as-keep-audio') && $('as-keep-audio').checked && cur.blob;
    var rec = {
      id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      when: (cur.when || new Date()).toISOString(), created: new Date().toISOString(),
      who: $('as-who').value.trim(), tags: $('as-tags').value.split(/[,،]/).map(function (s) { return s.trim(); }).filter(Boolean),
      text: cur.text, summary: cur.summary || [], tasks: cur.tasks.filter(function (t) { return t.t.trim(); }),
      rems: cur.rems.filter(function (r) { return r.title && r.date; }), fileName: cur.name || '',
      audio: keep ? cur.blob : null, audioType: keep ? (cur.blob.type || '') : ''
    };
    btn.disabled = true;
    window.YomanDB.put(rec).then(function () {
      msg.innerHTML = 'נשמר ביומן ✓ ' + (document.getElementById('ys-list') ? '' : '<a class="gold" href="/kelim/android/yoman-sichot/">לפתוח את היומן</a>');
      used('save', { audio: keep ? 1 : 0 });
      document.dispatchEvent(new CustomEvent('yoman-change'));
    }).catch(function (e) {
      msg.textContent = /quota/i.test(String(e && (e.name || e.message))) ? 'אין מספיק מקום בטלפון לשמור את ההקלטה. נסו בלי "לשמור גם את ההקלטה".' : 'לא הצלחתי לשמור. נסו שוב.';
    }).then(function () { btn.disabled = false; });
  };
})();
