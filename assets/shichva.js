/* פורטל שכבה – המרחב הפרטי. ועדות ומסלול אישור, משימות, הגבאי, אלבום (כש-R2 פעיל).
   פרטיות: אין כאן מעקב אישי; האסימון נשמר רק בטלפון. לבינה נשלח טקסט בלבד. */
(function () {
  'use strict';
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8791' : 'https://kelim-shichva.gilad4049.workers.dev';
  var KEY = 'shichva_s', HOME = '/kelim/shichva/';
  var SITE = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? location.origin : 'https://hakelim.com';
  var SH = window.SH = window.SH || {};
  SH.creators = SH.creators || {};
  var S = null, tab = 'bait', sess = null, tokMem = null;

  /* ---------- כניסה ---------- */
  function loadS() { try { return JSON.parse(localStorage.getItem(KEY)) || { list: [], cur: 0 }; } catch (e) { return { list: [], cur: 0 }; } }
  function saveS(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
  function token() {
    if (tokMem) return tokMem;
    var s = loadS(); var c = s.list[s.cur || 0]; return c ? c.t : null;
  }
  var hh = new URLSearchParams(location.hash.slice(1));
  if (hh.get('t')) { tokMem = hh.get('t'); history.replaceState(null, '', location.pathname); }

  var ERR = {
    ai_quota: 'הגבאי נח להיום (נגמרה המכסה היומית). מחר הוא חוזר.', ai_busy: 'הגבאי עסוק כרגע. כדאי לנסות שוב בעוד דקה.',
    ai_off: 'הגבאי לא זמין כרגע.', ai_empty: 'הגבאי לא הצליח לענות הפעם. אפשר לנסח אחרת.', ai_bad: 'הגבאי לא הצליח לענות הפעם. אפשר לנסות שוב.',
    forbidden: 'הפעולה הזאת לא בהרשאה שלך.', state: 'המוצר כבר זז שלב. רענון…', note: 'צריך לכתוב הערה.', title: 'חסרה כותרת.',
    has_products: 'בוועדה יש מוצרים, אי אפשר למחוק אותה.', not_member: 'רק חברי הוועדה יכולים לעשות את זה.', storage_off: 'האלבום עוד לא פעיל.',
    no_stock: 'אין מספיק במלאי. אפשר לרשום קנייה קודם.', amount: 'הסכום לא תקין.', qty: 'הכמות לא תקינה.', reason: 'צריך לכתוב סיבה.', link: 'הקישור חייב להתחיל ב-https://', sponsor_max: 'אפשר עד 20 עסקים.', too_many: 'יש כבר מספיק פריטים.', full: 'המשמרת מלאה.', receipts_full: 'נגמר המקום לקבלות.', already: 'כבר בוטל.',
    album_full: 'האלבום מלא.', orig_big: 'הקובץ גדול מדי.', committee: 'צריך לבחור ועדה.', name: 'חסר שם.'
  };
  function api(path, body, method) {
    var t = token();
    return fetch(API + path, { method: method || (body ? 'POST' : 'GET'), headers: Object.assign({ authorization: 'Bearer ' + t }, body ? { 'content-type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401) { forget(); throw new Error('auth'); }
          if (!r.ok) { var e = new Error(j.error || 'net'); e.status = r.status; throw e; }
          return j;
        });
      });
  }
  SH.api = api; SH.API = API; SH.token = function () { return token(); };
  SH.err = function (e) { return ERR[e && e.message] || (e && e.message === 'auth' ? 'הכניסה פגה.' : 'משהו השתבש. כדאי לנסות שוב.'); };
  function forget() {
    var s = loadS(); s.list.splice(s.cur || 0, 1); s.cur = 0; saveS(s);
    location.href = HOME + '#knisa';
  }

  /* ---------- עזרים ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  SH.esc = esc;
  function $(sel, el) { return (el || document).querySelector(sel); }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.k); toast.k = setTimeout(function () { el.hidden = true; }, 3200); }
  SH.toast = toast;
  function day(iso) { var d = new Date(iso + 'T12:00:00'); return isNaN(d) ? null : d; }
  function daysTo(iso) { var d = day(iso); if (!d) return null; var n = new Date(); n.setHours(12, 0, 0, 0); return Math.round((d - n) / 864e5); }
  function heDate(iso) { var d = day(iso); if (!d) return ''; try { return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long' }).format(d); } catch (e) { return ''; } }
  function shortDate(iso) { var d = day(iso); return d ? d.getDate() + '.' + (d.getMonth() + 1) : ''; }
  function wa(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }
  SH.wa = wa;
  function member(id) { return (S.members || []).find(function (m) { return m.id === id; }); }
  function mname(id) { var m = member(id); return m ? m.name : ''; }
  function com(id) { return (S.committees || []).find(function (c) { return c.id === id; }); }
  function inC(c) { return c && c.members.indexOf(S.me.id) >= 0; }
  function isHead(c) { return c && c.head_id === S.me.id; }
  function rakaz() { return S.me.role === 'rakaz'; }
  function melave() { return S.me.role === 'melave'; }
  SH.myCommittees = function () { return (S.committees || []).filter(function (c) { return rakaz() || inC(c); }); };
  SH.state = function () { return S; };
  function prodLink(p) { return SITE + '/kelim/shichva/merchav/#p=' + p.id; }
  function joinLink(c) { return SITE + '/kelim/shichva/#j=' + encodeURIComponent(S.grade.join_code || '') + (c ? '&v=' + c.id : ''); }
  var ROLE = { rakaz: 'רכז', gizbar: 'גזבר', chaver: 'חבר', melave: 'מלווה מהצוות' };
  var STATE = { draft: 'טיוטה בוועדה', liked: 'אהבנו', head: 'אצל האחראי הראשי', melave: 'אצל המלווה', approved: 'אושר', replace: 'להחליף' };
  var KIND = { text: 'טקסט', meme: 'מם', trailer: 'טריילר', video: 'סרטון', idea: 'רעיון' };
  var LIGHT = { green: 'ירוק', yellow: 'צהוב', red: 'אדום' };
  SH.LIGHT = LIGHT;
  SH.lightHtml = function (l, why) {
    if (!l) return '<span class="sh-light sh-l-none" title="לא נבדק">רמזור: לא נבדק</span>';
    return '<span class="sh-light sh-l-' + esc(l) + '"><i aria-hidden="true"></i>רמזור ' + LIGHT[l] + (why ? ': ' + esc(why) : '') + '</span>';
  };

  /* ---------- דיאלוג קטן ---------- */
  function ask(title, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      var d = $('#dlg'), b = $('#dlgBody');
      b.innerHTML = '<h3>' + esc(title) + '</h3>' + (opts.text ? '<p class="msg">' + esc(opts.text) + '</p>' : '') +
        (opts.input !== false ? '<label class="field">' + esc(opts.label || 'הערה') + (opts.long ? '<textarea id="dlgIn" rows="3" maxlength="500"></textarea>' : '<input id="dlgIn" maxlength="120">') + '</label>' : '') +
        '<div class="sh-row"><button class="btn btn-gold" value="ok">' + esc(opts.ok || 'אישור') + '</button><button class="btn btn-line" value="no" formnovalidate>ביטול</button></div>';
      var inp = $('#dlgIn');
      if (inp) { inp.value = opts.value || ''; if (opts.required) inp.required = true; }
      var done = false, fin = function (v) { if (done) return; done = true; if (d.open) d.close(); res(v); };
      $('#dlgForm').onsubmit = function (e) {
        e.preventDefault();
        var ok = e.submitter && e.submitter.value === 'ok';
        if (ok && inp && inp.required && !inp.value.trim()) { inp.reportValidity(); return; }
        fin(ok ? (inp ? inp.value.trim() : true) : null);
      };
      d.oncancel = function () { fin(null); };
      d.showModal(); if (inp) inp.focus();
    });
  }
  SH.ask = ask;

  /* ---------- טעינה ורינדור ---------- */
  function refresh() {
    return api('/state').then(function (j) { S = j; draw(); return j; }).catch(function (e) {
      if (e.message !== 'auth') $('#view').innerHTML = '<p class="msg sh-err">' + esc(SH.err(e)) + '</p><button class="btn btn-line" type="button" onclick="location.reload()">לנסות שוב</button>';
    });
  }
  SH.refresh = refresh;
  function tabsFor() {
    if (melave()) return [['ishurim', 'מוצרים מוכנים'], ['bait', 'ההכתרה']];
    var t = [['bait', 'בית'], ['vaadot', 'ועדות'], ['yetzira', 'יצירה'], ['mesimot', 'משימות'], ['kiosk', 'קיוסק וכסף'], ['gabai', 'הגבאי'], ['album', 'אלבום']];
    if (rakaz()) t.splice(2, 0, ['ishurim', 'אישורים']);
    t.push(['chaverim', rakaz() ? 'חברים והגדרות' : 'חברים']);
    return t;
  }
  function draw() {
    $('#gName').textContent = S.grade.name + (S.grade.slogan ? ' · ' + S.grade.slogan : '');
    $('#meLine').textContent = S.me.name + ' · ' + ROLE[S.me.role];
    $('#demoBar').hidden = !S.grade.demo;
    var ts = tabsFor();
    if (!ts.some(function (x) { return x[0] === tab.split(':')[0]; })) tab = ts[0][0];
    $('#tabs').innerHTML = ts.map(function (x) { return '<button type="button" role="tab" data-tab="' + x[0] + '" aria-selected="' + (tab.split(':')[0] === x[0]) + '">' + x[1] + '</button>'; }).join('');
    var name = tab.split(':')[0], arg = tab.split(':')[1];
    var v = $('#view');
    try { (VIEWS[name] || VIEWS.bait)(v, arg); } catch (e) { v.innerHTML = '<p class="msg sh-err">שגיאה בתצוגה.</p>'; if (window.console) console.error(e); }
  }
  SH.go = function (t) { tab = t; draw(); window.scrollTo(0, 0); };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tab]'); if (b) { SH.go(b.getAttribute('data-tab')); }
    var g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); SH.go(g.getAttribute('data-go')); }
  });

  /* ---------- כרטיס מוצר ---------- */
  function canEdit(p, c) { return ['draft', 'replace'].indexOf(p.state) >= 0 && !melave() && (p.author_id === S.me.id || isHead(c) || rakaz()); }
  function waiting(p) {
    var c = com(p.committee_id);
    if (melave()) return p.state === 'melave';
    if (rakaz() && p.state === 'head') return true;
    if (p.state === 'liked' && (isHead(c) || rakaz())) return true;
    if (p.state === 'draft' && inC(c) && p.votes.indexOf(S.me.id) < 0 && p.author_id !== S.me.id) return true;
    if (p.state === 'replace' && (p.author_id === S.me.id || isHead(c))) return true;
    return false;
  }
  function content(p) {
    var d = p.data || {};
    if (p.kind === 'meme') return '<div class="sh-meme-prev" data-meme="' + esc(p.id) + '"></div>';
    if (p.kind === 'trailer' && Array.isArray(d.lines) && d.lines.length)
      return (d.song ? '<p class="msg">על המנגינה של: ' + esc(d.song) + '</p>' : '') + '<ol class="sh-lines">' + d.lines.map(function (l) { return '<li><span class="sh-orig">' + esc(l.orig) + '</span><b>' + esc(l.new) + '</b></li>'; }).join('') + '</ol>';
    if (p.kind === 'video' && Array.isArray(d.scenes))
      return '<p class="msg">' + esc(d.template || '') + ' · ' + d.scenes.length + ' סצנות. הסרטון עצמו נשמר בטלפון של מי שיצר.</p><ol class="sh-lines">' + d.scenes.slice(0, 30).map(function (s) { return '<li>' + esc(s.caption || '(בלי כיתוב)') + ' · ' + s.dur + ' ש\'</li>'; }).join('') + '</ol>';
    return p.body ? '<p class="sh-body">' + esc(p.body).replace(/\n/g, '<br>') + '</p>' : '';
  }
  function actions(p) {
    var c = com(p.committee_id), a = [];
    var B = function (act, label, cls) { a.push('<button type="button" class="btn btn-sm ' + (cls || 'btn-line') + '" data-act="' + act + '" data-id="' + esc(p.id) + '">' + label + '</button>'); };
    if (p.state === 'draft' && inC(c)) B('vote', (p.votes.indexOf(S.me.id) >= 0 ? '✓ אהבתי' : 'אהבתי') + ' (' + p.votes.length + '/' + c.members.length + ')');
    if (p.state === 'draft' && (isHead(c) || rakaz())) B('like', 'אהבנו (החלטת ראש הוועדה)');
    if (p.state === 'liked' && (isHead(c) || rakaz())) B('send', 'לשלוח לאחראי הראשי', 'btn-gold');
    if (p.state === 'head' && rakaz()) { B('up', 'להעלות למלווה', 'btn-gold'); B('back', 'להחזיר לוועדה לתיקונים'); }
    if (p.state === 'melave' && melave()) { B('ok', 'אושר', 'btn-gold'); B('replace', 'להחליף'); }
    if (canEdit(p, c)) B('edit', 'עריכה');
    B('comment', 'הערה');
    if (!melave()) {
      a.push('<a class="btn btn-sm btn-line" target="_blank" rel="noopener" href="' + wa('📣 ' + (c ? 'ועדת ' + c.name + ': ' : '') + '"' + p.title + '" – ' + STATE[p.state] + '. מחכה לכם בפורטל:\n' + prodLink(p)) + '">שלח לוועדה בווטסאפ</a>');
      if (p.state === 'liked' || p.state === 'head') a.push('<a class="btn btn-sm btn-line" target="_blank" rel="noopener" href="' + wa('היי, ' + (c ? 'ועדת ' + c.name : 'הוועדה') + ' שלחה לך את "' + p.title + '" לאישור:\n' + prodLink(p)) + '">שלח לאחראי הראשי</a>');
    }
    if (rakaz() || (p.author_id === S.me.id && p.state === 'draft')) B('del', 'מחיקה', 'btn-line sh-danger');
    return a.join(' ');
  }
  function card(p) {
    var c = com(p.committee_id);
    var hist = (p.history || []).map(function (h) { return '<li><b>' + esc(h.action) + '</b> · ' + esc(h.who) + (h.note ? ': ' + esc(h.note) : '') + ' <small>' + new Date(h.ts).toLocaleDateString('he-IL') + '</small></li>'; }).join('');
    var last = (p.history || []).filter(function (h) { return h.note; }).slice(-1)[0];
    return '<article class="sh-prod sh-st-' + p.state + '" id="p-' + esc(p.id) + '">' +
      '<div class="sh-prod-h"><span class="sh-kind">' + KIND[p.kind] + (p.about_staff ? ' · על איש צוות' : '') + '</span><span class="sh-state">' + STATE[p.state] + '</span></div>' +
      '<h3>' + esc(p.title) + '</h3>' +
      '<p class="sh-meta">' + (c ? 'ועדת ' + esc(c.name) : '') + (mname(p.author_id) ? ' · ' + esc(mname(p.author_id)) : '') + '</p>' +
      content(p) + SH.lightHtml(p.light, p.light_why) +
      (last && ['draft', 'replace', 'approved'].indexOf(p.state) >= 0 ? '<p class="sh-note">הערה אחרונה: ' + esc(last.note) + ' <small>(' + esc(last.who) + ')</small></p>' : '') +
      '<div class="sh-acts">' + actions(p) + '</div>' +
      (hist ? '<details class="sh-hist"><summary>היסטוריה (' + p.history.length + ')</summary><ul>' + hist + '</ul></details>' : '') +
      '</article>';
  }
  SH.card = card;
  function paintMemes(root) {
    if (!SH.memeCanvas) return;
    root.querySelectorAll('[data-meme]').forEach(function (el) {
      var p = S.products.find(function (x) { return x.id === el.getAttribute('data-meme'); });
      if (p) { el.innerHTML = ''; el.appendChild(SH.memeCanvas(p.data || {}, 'sq', 360)); }
    });
  }
  SH.paintMemes = paintMemes;
  function list(root, prods, empty) {
    root.innerHTML = prods.length ? prods.map(card).join('') : '<p class="msg">' + esc(empty || 'אין כאן כלום עדיין.') + '</p>';
    paintMemes(root);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var id = b.getAttribute('data-id'), act = b.getAttribute('data-act');
    var p = S.products.find(function (x) { return x.id === id; }); if (!p) return;
    var go = function (path, body, msg) { b.disabled = true; return api(path, body).then(function (r) { toast(msg || 'בוצע'); return refresh().then(function () { return r; }); }).catch(function (er) { b.disabled = false; toast(SH.err(er)); if (er.message === 'state') refresh(); }); };
    if (act === 'vote') go('/product/vote', { id: id }, 'נרשם').then(function (r) { if (r && r.liked) toast('רוב בוועדה – המוצר עבר ל"אהבנו"'); });
    else if (act === 'like') go('/product/like', { id: id }, 'סומן "אהבנו"');
    else if (act === 'send') go('/product/send', { id: id }, 'נשלח לאחראי הראשי');
    else if (act === 'up') ask('להעלות למלווה', { label: 'הערה (לא חובה)' }).then(function (n) { if (n !== null) go('/product/head', { id: id, action: 'up', note: n }, 'הועלה למלווה'); });
    else if (act === 'back') ask('להחזיר לוועדה לתיקונים', { label: 'מה לתקן?', required: true, long: true }).then(function (n) { if (n) go('/product/head', { id: id, action: 'back', note: n }, 'הוחזר לוועדה עם ההערה'); });
    else if (act === 'ok') ask('לאשר את המוצר', { label: 'מילה טובה (לא חובה)' }).then(function (n) { if (n !== null) go('/product/melave', { id: id, action: 'ok', note: n }, 'אושר'); });
    else if (act === 'replace') ask('להחליף', { label: 'מה כדאי לשנות?', required: true, long: true }).then(function (n) { if (n) go('/product/melave', { id: id, action: 'replace', note: n }, 'נשלח חזרה לוועדה'); });
    else if (act === 'comment') ask('הערה על "' + p.title + '"', { label: 'ההערה', required: true, long: true }).then(function (n) { if (n) go('/product/comment', { id: id, note: n }, 'ההערה נשמרה'); });
    else if (act === 'del') ask('למחוק את "' + p.title + '"?', { input: false, ok: 'מחיקה', text: 'אי אפשר לשחזר.' }).then(function (y) { if (y) go('/product/delete', { id: id }, 'נמחק'); });
    else if (act === 'edit') {
      if (SH.creators[p.kind]) { tab = 'yetzira:' + p.kind; draw(); SH.creators[p.kind]($('#yz'), p); window.scrollTo(0, 0); }
      else editText(p);
    }
  });

  /* ---------- שמירת מוצר (משותף ליוצרים) ---------- */
  SH.committeeSelect = function (sel) {
    var cs = SH.myCommittees();
    if (!cs.length) return '<p class="msg sh-err">כדי לשמור מוצר צריך להיות בוועדה. <a href="#" data-go="vaadot">להצטרפות לוועדה</a></p>';
    return '<label class="field">לאיזו ועדה<select name="committee_id">' + cs.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>';
  };
  SH.saveProduct = function (o, existing) {
    var body = existing ? { id: existing.id, title: o.title, body: o.body, data: o.data, light: o.light } : o;
    return api(existing ? '/product/edit' : '/product/create', body).then(function (r) {
      var lt = r.light || {};
      toast(existing ? 'נשמר. המוצר חזר לטיוטה בוועדה.' : 'נשמר כטיוטה בוועדה' + (lt.light ? ' · רמזור ' + LIGHT[lt.light] : ''));
      return refresh().then(function () { return r; });
    });
  };
  function editText(p) {
    var v = $('#view');
    v.innerHTML = '<section class="sh-card"><h2>עריכה</h2><form class="k-form" id="fEdit"><label class="field">כותרת<input name="title" maxlength="80" required></label><label class="field">תוכן<textarea name="body" rows="8" maxlength="4000"></textarea></label><div class="sh-row"><button class="btn btn-gold">שמירה</button><button class="btn btn-line" type="button" data-go="vaadot:' + esc(p.committee_id) + '">ביטול</button></div></form></section>';
    var f = $('#fEdit'); f.title.value = p.title; f.body.value = p.body || '';
    f.addEventListener('submit', function (e) { e.preventDefault(); SH.saveProduct({ title: f.title.value, body: f.body.value }, p).then(function () { SH.go('vaadot:' + p.committee_id); }).catch(function (er) { toast(SH.err(er)); }); });
  }

  /* ---------- מסכים ---------- */
  var VIEWS = SH.views = {};

  VIEWS.bait = function (v) {
    var g = S.grade, n = daysTo(g.hachtara);
    var wait = S.products.filter(waiting);
    var cd = n == null ? '' : n > 0 ? '<b>' + n + '</b> ימים להכתרה' : n === 0 ? '<b>היום ההכתרה!</b>' : 'ההכתרה הייתה לפני ' + (-n) + ' ימים';
    var h = '<section class="sh-hero"><div class="sh-count">' + cd + '</div><p class="msg">' + shortDate(g.hachtara) + (heDate(g.hachtara) ? ' · ' + esc(heDate(g.hachtara)) : '') + '</p>' +
      (melave() ? '' : '<div class="sh-prog" role="progressbar" aria-valuenow="' + S.progress + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + S.progress + '%"></span></div><p class="msg">' + S.progress + '% מהמשימות בוצעו</p>') + '</section>';
    if (!melave()) {
      h += '<section class="sh-card"><h2>מחכה לך (' + wait.length + ')</h2><div id="waitL"></div></section>';
      var mine = S.tasks.filter(function (t) { return !t.done && t.owner === S.me.name; });
      var soon = S.tasks.filter(function (t) { return !t.done; }).slice(0, 4);
      h += '<section class="sh-card"><h2>המשימות הקרובות</h2><ul class="sh-tl">' + (mine.length ? mine : soon).map(function (t) { var d = daysTo(t.due); return '<li><span>' + esc(t.title) + '</span><small class="' + (d < 0 ? 'sh-late' : '') + '">' + shortDate(t.due) + (d < 0 ? ' · באיחור' : '') + '</small></li>'; }).join('') + '</ul><button type="button" class="btn btn-sm btn-line" data-go="mesimot">לכל המשימות</button></section>';
      if (rakaz() && !g.demo) h += '<section class="sh-card"><h2>הקודים של השכבה</h2><p class="msg">רק אתה רואה את זה. את קוד המלווה מוסרים לאיש הצוות בעצמך.</p><ul class="sh-codes"><li>תלמידים: <b>' + esc(g.join_code) + '</b></li><li>רכז (כניסה ממכשיר אחר): <b>' + esc(g.admin_code) + '</b></li><li>מלווה מהצוות: <b>' + esc(g.melave_code) + '</b></li></ul>' +
        '<a class="btn btn-sm btn-gold" target="_blank" rel="noopener" href="' + wa('📣 פתחנו פורטל לשכבה להכנת ההכתרה! נכנסים כאן עם השם שלכם:\n' + joinLink()) + '">שליחת קישור הצטרפות לשכבה בווטסאפ</a></section>';
    }
    h += '<section class="sh-card" id="memeDay"></section>';
    h += '<section class="sh-card sh-install" id="inst" hidden><h2>להוסיף למסך הבית</h2><p class="msg">בפעם הבאה הפורטל ייפתח בלחיצה אחת, כמו אפליקציה.</p><button type="button" class="btn btn-sm btn-gold" id="instBtn">הוספה למסך הבית</button></section>';
    v.innerHTML = h;
    if (!melave()) list($('#waitL'), wait, 'אין כרגע משהו שמחכה לך.');
    memeOfDay($('#memeDay'));
    if (deferredInstall) { $('#inst').hidden = false; $('#instBtn').onclick = function () { deferredInstall.prompt(); deferredInstall = null; $('#inst').hidden = true; }; }
  };

  // לוח "מם היום": מראש חודש אדר עד פורים. התאריכים לפי הלוח העברי של הדפדפן.
  function adarWindow() {
    // פורים הקרוב (היום או אחריו); החלון מתחיל 14 יום לפניו = ראש חודש אדר (כולל ל' של החודש הקודם)
    var f; try { f = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' }); } catch (e) { return null; }
    var d = new Date(); d.setHours(12, 0, 0, 0);
    for (var i = 0; i < 420; i++) {
      if (/^14 Adar( II)?$/.test(f.format(d))) { var st = new Date(d); st.setDate(st.getDate() - 14); return { start: st, end: new Date(d) }; }
      d.setDate(d.getDate() + 1);
    }
    return null;
  }
  function memeOfDay(el) {
    var memes = S.products.filter(function (p) { return p.kind === 'meme' && p.state === 'approved'; });
    var w = adarWindow(), now = new Date(); now.setHours(12, 0, 0, 0);
    var open = S.grade.demo || (w && now >= w.start && now <= w.end);
    var h = '<h2>מם היום</h2>';
    if (!open) {
      h += '<p class="msg">הלוח נפתח בראש חודש אדר' + (w ? ' (' + w.start.toLocaleDateString('he-IL') + ')' : '') + ' ונשאר עד פורים. בינתיים מכינים ממים בוועדה.</p>';
    } else if (!memes.length) {
      h += '<p class="msg">עוד אין מם מאושר. מם עולה ללוח אחרי שהמלווה מאשר אותו.</p>';
    } else {
      var i = Math.floor(now / 864e5) % memes.length, m = memes[i];
      h += (S.grade.demo ? '<p class="msg">בהדגמה הלוח פתוח תמיד. בשכבה אמיתית: מראש חודש אדר עד פורים.</p>' : '') + '<div class="sh-meme-prev" data-meme="' + esc(m.id) + '"></div><p class="sh-meta">' + esc(m.title) + '</p>';
      if (memes.length > 1) h += '<details><summary>כל הממים שאושרו (' + memes.length + ')</summary><div class="sh-grid">' + memes.map(function (x) { return '<div class="sh-meme-prev" data-meme="' + esc(x.id) + '"></div>'; }).join('') + '</div></details>';
    }
    el.innerHTML = h; paintMemes(el);
  }

  VIEWS.ishurim = function (v) {
    if (melave()) {
      var ready = S.products.filter(function (p) { return p.state === 'melave'; });
      var done = S.products.filter(function (p) { return p.state !== 'melave'; });
      v.innerHTML = '<section class="sh-card"><h2>מחכים לאישור שלך (' + ready.length + ')</h2><p class="msg">כאן רק מה שהאחראי הראשי של השכבה העלה אליך. טיוטות לא מגיעות לכאן. לכל מוצר: "אושר" או "להחליף" עם הערה.</p><div id="l1"></div></section><section class="sh-card"><h2>כבר טופלו (' + done.length + ')</h2><div id="l2"></div></section>';
      list($('#l1'), ready, 'אין כרגע מוצרים שמחכים לך.'); list($('#l2'), done, 'עוד לא טופל כלום.');
      return;
    }
    var q = S.products.filter(function (p) { return p.state === 'head'; });
    var up = S.products.filter(function (p) { return ['melave', 'approved', 'replace'].indexOf(p.state) >= 0; });
    v.innerHTML = '<section class="sh-card"><h2>אצלך – להחליט (' + q.length + ')</h2><p class="msg">"להעלות למלווה" או "להחזיר לוועדה לתיקונים" עם הערה.</p><div id="l1"></div></section><section class="sh-card"><h2>אצל המלווה ואחריו (' + up.length + ')</h2><div id="l2"></div></section>';
    list($('#l1'), q, 'אין כרגע מוצרים שמחכים לך.'); list($('#l2'), up, 'עוד לא הועלה כלום למלווה.');
  };

  VIEWS.vaadot = function (v, cid) {
    if (cid) return committeePage(v, com(cid));
    var cs = S.committees;
    var h = '<section class="sh-card"><h2>הוועדות</h2><p class="msg">אפשר להיות בכמה ועדות. כל מוצר נולד בוועדה ועובר: טיוטה, אהבנו, האחראי הראשי, המלווה מהצוות.</p>' +
      (cs.length ? '<ul class="sh-clist">' + cs.map(function (c) {
        var w = S.products.filter(function (p) { return p.committee_id === c.id && waiting(p); }).length;
        return '<li><a href="#" data-go="vaadot:' + esc(c.id) + '"><b>' + esc(c.name) + '</b>' + (w ? ' <span class="sh-badge">' + w + '</span>' : '') + '<small>' + c.members.length + ' חברים' + (c.head_id ? ' · אחראי: ' + esc(mname(c.head_id)) : '') + (inC(c) ? ' · אני בוועדה' : '') + '</small></a></li>';
      }).join('') + '</ul>' : '<p class="msg">עוד אין ועדות.</p>') + '</section>';
    if (rakaz()) {
      var have = cs.map(function (c) { return c.name; });
      var sug = S.suggested.filter(function (n) { return have.indexOf(n) < 0; });
      h += '<section class="sh-card"><h2>ועדה חדשה</h2>' + (sug.length ? '<p class="msg">ועדות מוצעות, בלחיצה:</p><div class="sh-row">' + sug.map(function (n) { return '<button type="button" class="btn btn-sm btn-line" data-newc="' + esc(n) + '">+ ' + esc(n) + '</button>'; }).join('') + '</div>' : '') +
        '<form class="k-form" id="fC"><label class="field">שם הוועדה<input name="name" maxlength="30" required></label><label class="field">על מה הוועדה (לא חובה)<input name="about" maxlength="120"></label><button class="btn btn-gold">פתיחת ועדה</button></form></section>';
    }
    v.innerHTML = h;
    var mk = function (name, about) { return api('/committee/create', { name: name, about: about || '' }).then(function () { toast('ועדת ' + name + ' נפתחה'); return refresh(); }).catch(function (e) { toast(SH.err(e)); }); };
    v.querySelectorAll('[data-newc]').forEach(function (b) { b.onclick = function () { b.disabled = true; mk(b.getAttribute('data-newc')); }; });
    var f = $('#fC'); if (f) f.onsubmit = function (e) { e.preventDefault(); mk(f.name.value.trim(), f.about.value.trim()); };
  };

  function committeePage(v, c) {
    if (!c) { SH.go('vaadot'); return; }
    var prods = S.products.filter(function (p) { return p.committee_id === c.id; });
    var tasks = S.tasks.filter(function (t) { return t.committee_id === c.id; });
    var h = '<p><a href="#" data-go="vaadot">→ כל הוועדות</a></p><section class="sh-card"><h2>ועדת ' + esc(c.name) + '</h2>' + (c.about ? '<p class="msg">' + esc(c.about) + '</p>' : '') +
      '<p class="msg">אחראי הוועדה: <b>' + esc(mname(c.head_id) || 'עוד לא נבחר') + '</b> · חברים: ' + c.members.map(function (m) { return esc(mname(m)); }).join(', ') + '</p><div class="sh-row">';
    if (!melave()) h += inC(c) ? '<button type="button" class="btn btn-sm btn-line" id="cLeave">יציאה מהוועדה</button>' : '<button type="button" class="btn btn-sm btn-gold" id="cJoin">הצטרפות לוועדה</button>';
    if (S.grade.join_code) h += '<a class="btn btn-sm btn-line" target="_blank" rel="noopener" href="' + wa('מצטרפים לוועדת ' + c.name + ' של השכבה, להכנת ההכתרה. נכנסים כאן עם השם שלכם:\n' + joinLink(c)) + '">קישור הצטרפות לוועדה בווטסאפ</a>';
    h += '</div>';
    if (rakaz()) h += '<div class="sh-row"><label class="field sh-inline">אחראי הוועדה<select id="cHead"><option value="">בחירה…</option>' + S.members.filter(function (m) { return m.role !== 'melave'; }).map(function (m) { return '<option value="' + esc(m.id) + '"' + (m.id === c.head_id ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></label>' + (prods.length ? '' : '<button type="button" class="btn btn-sm btn-line sh-danger" id="cDel">מחיקת הוועדה</button>') + '</div>';
    h += '</section>';
    if (inC(c) || rakaz()) h += '<section class="sh-card"><h2>מוצר חדש לוועדה</h2><div class="sh-row"><button type="button" class="btn btn-sm btn-gold" data-new="text">טקסט / תסריט / רעיון</button><button type="button" class="btn btn-sm btn-line" data-go="yetzira:meme">מם</button><button type="button" class="btn btn-sm btn-line" data-go="yetzira:trailer">טריילר משיר</button><button type="button" class="btn btn-sm btn-line" data-go="yetzira:video">סרטון</button></div><form class="k-form" id="fT" hidden><label class="field">כותרת<input name="title" maxlength="80" required></label><label class="field">התוכן<textarea name="body" rows="6" maxlength="4000"></textarea></label><label class="sh-check"><input type="checkbox" name="staff"> יש כאן איש צוות (יעבור אוטומטית לאישור המלווה)</label><button class="btn btn-gold">שמירה כטיוטה</button></form></section>';
    h += '<section class="sh-card"><h2>המוצרים של הוועדה (' + prods.length + ')</h2><div id="cP"></div></section>';
    h += '<section class="sh-card"><h2>המשימות של הוועדה</h2>' + (tasks.length ? '<ul class="sh-tl">' + tasks.map(function (t) { return '<li><span>' + (t.done ? '✓ ' : '') + esc(t.title) + '</span><small>' + shortDate(t.due) + '</small></li>'; }).join('') + '</ul>' : '<p class="msg">אין משימות משויכות. משייכים בלשונית המשימות.</p>') + '</section>';
    v.innerHTML = h;
    list($('#cP'), prods, 'עוד אין מוצרים בוועדה.');
    var J = $('#cJoin'), L = $('#cLeave'), H = $('#cHead'), D = $('#cDel'), N = v.querySelector('[data-new]'), F = $('#fT');
    var run = function (p, b, m) { return api(p, b).then(function () { toast(m); return refresh(); }).catch(function (e) { toast(SH.err(e)); }); };
    if (J) J.onclick = function () { run('/committee/join', { id: c.id }, 'הצטרפת לוועדה'); };
    if (L) L.onclick = function () { run('/committee/leave', { id: c.id }, 'יצאת מהוועדה'); };
    if (H) H.onchange = function () { if (H.value) run('/committee/head', { id: c.id, member: H.value }, 'האחראי עודכן'); };
    if (D) D.onclick = function () { ask('למחוק את ועדת ' + c.name + '?', { input: false, ok: 'מחיקה' }).then(function (y) { if (y) run('/committee/remove', { id: c.id }, 'הוועדה נמחקה').then(function () { SH.go('vaadot'); }); }); };
    if (N) N.onclick = function () { F.hidden = false; F.title.focus(); };
    if (F) F.onsubmit = function (e) { e.preventDefault(); var b = F.querySelector('button'); b.disabled = true; SH.saveProduct({ committee_id: c.id, kind: 'text', title: F.title.value.trim(), body: F.body.value, about_staff: F.staff.checked }).catch(function (er) { b.disabled = false; toast(SH.err(er)); }); };
  }

  VIEWS.yetzira = function (v, kind) {
    var k = kind || 'meme';
    v.innerHTML = '<div class="sh-sub" role="tablist">' + [['meme', 'מחולל ממים'], ['trailer', 'טריילר משיר קיים'], ['video', 'עורך סרטון']].map(function (x) { return '<button type="button" data-go="yetzira:' + x[0] + '" aria-selected="' + (x[0] === k) + '">' + x[1] + '</button>'; }).join('') + '</div><div id="yz"></div>';
    if (SH.creators[k]) SH.creators[k]($('#yz'), null); else $('#yz').innerHTML = '<p class="msg">טוען…</p>';
  };

  VIEWS.mesimot = function (v) {
    var open = S.tasks.filter(function (t) { return !t.done; }), done = S.tasks.filter(function (t) { return t.done; });
    var opt = function (sel) { return '<option value="">בלי ועדה</option>' + S.committees.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join(''); };
    var row = function (t) {
      var d = daysTo(t.due);
      return '<li class="sh-task' + (t.done ? ' sh-done' : '') + '" data-t="' + esc(t.id) + '"><label class="sh-check"><input type="checkbox" data-tdone' + (t.done ? ' checked' : '') + '> <span>' + esc(t.title) + '</span></label>' +
        '<small class="' + (!t.done && d < 0 ? 'sh-late' : '') + '">' + shortDate(t.due) + (t.done ? '' : d < 0 ? ' · באיחור ' + (-d) + ' ימים' : d === 0 ? ' · היום' : ' · עוד ' + d + ' ימים') + '</small>' +
        '<div class="sh-row"><input class="sh-owner" data-towner placeholder="מי אחראי?" maxlength="30" value="' + esc(t.owner) + '" aria-label="אחראי"><select data-tcom aria-label="ועדה">' + opt(t.committee_id) + '</select>' + (rakaz() ? '<button type="button" class="btn btn-sm btn-line sh-danger" data-tdel aria-label="מחיקה">✕</button>' : '') + '</div></li>';
    };
    v.innerHTML = '<section class="sh-card"><h2>לוח המשימות</h2><div class="sh-prog"><span style="width:' + S.progress + '%"></span></div><p class="msg">' + S.progress + '% בוצעו · היעדים מחושבים אחורה מתאריך ההכתרה (' + shortDate(S.grade.hachtara) + ').</p><ul class="sh-tasks">' + open.map(row).join('') + '</ul></section>' +
      '<section class="sh-card"><h2>משימה חדשה</h2><form class="k-form" id="fTask"><label class="field">מה צריך לעשות<input name="title" maxlength="80" required placeholder="להשיג מקרן"></label><label class="field">עד מתי<input name="due" type="date"></label><label class="field">ועדה<select name="committee_id">' + opt('') + '</select></label><button class="btn btn-gold">הוספה</button></form></section>' +
      (done.length ? '<section class="sh-card"><details><summary>בוצעו (' + done.length + ')</summary><ul class="sh-tasks">' + done.map(row).join('') + '</ul></details></section>' : '');
    var upd = function (li, body) { body.id = li.getAttribute('data-t'); return api('/task/update', body).then(function () { return refresh(); }).catch(function (e) { toast(SH.err(e)); }); };
    v.querySelectorAll('[data-tdone]').forEach(function (x) { x.onchange = function () { var li = x.closest('li'); upd(li, { done: x.checked, owner: x.checked && !li.querySelector('[data-towner]').value ? S.me.name : undefined }).then(function () { if (x.checked) toast('כל הכבוד! ✓'); }); }; });
    v.querySelectorAll('[data-towner]').forEach(function (x) { x.onchange = function () { upd(x.closest('li'), { owner: x.value.trim() }); }; });
    v.querySelectorAll('[data-tcom]').forEach(function (x) { x.onchange = function () { upd(x.closest('li'), { committee_id: x.value }); }; });
    v.querySelectorAll('[data-tdel]').forEach(function (x) { x.onclick = function () { api('/task/delete', { id: x.closest('li').getAttribute('data-t') }).then(refresh).catch(function (e) { toast(SH.err(e)); }); }; });
    var f = $('#fTask'); f.onsubmit = function (e) { e.preventDefault(); api('/task/create', { title: f.title.value.trim(), due: f.due.value, committee_id: f.committee_id.value }).then(function () { toast('המשימה נוספה'); return refresh(); }).catch(function (er) { toast(SH.err(er)); }); };
  };

  var chat = [];
  VIEWS.gabai = function (v) {
    var Q = ['רעיון למערכון על חדר האוכל', '5 פרסים הומוריסטיים לצוות', 'פתיחה לשיר מחזור', 'נאום תודה קצר לצוות', 'רעיון לעלילה להצגה'];
    v.innerHTML = '<section class="sh-card"><h2>הגבאי</h2><p class="msg">דמות שמייעצת להכתרה: מערכונים, פרודיות, פרסים לצוות, שיר מחזור ונאום תודה. הכללים שלו: צוחקים על תופעות ולא על אנשים, אם יש ספק אין ספק, וכל קטע נגמר בשורת כבוד.</p>' +
      '<div class="sh-row">' + Q.map(function (q) { return '<button type="button" class="btn btn-sm btn-line" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
      '<div class="sh-chat" id="chat"></div><form class="k-form" id="fAsk"><label class="field">מה לשאול את הגבאי<textarea name="q" rows="2" maxlength="600" required></textarea></label><button class="btn btn-gold">שאלה</button></form></section>' +
      '<section class="sh-card"><h2>בדיקת רמזור כבוד</h2><p class="msg">מדביקים טקסט (מערכון, שיר, כיתוב) ומקבלים ירוק, צהוב או אדום עם הסבר.</p><form class="k-form" id="fLight"><textarea name="text" rows="4" maxlength="3000" required aria-label="הטקסט לבדיקה"></textarea><button class="btn btn-line">לבדוק</button><div id="lightOut"></div></form></section>';
    var paint = function () { $('#chat').innerHTML = chat.map(function (m) { return '<div class="sh-msg ' + (m.me ? 'sh-mine' : '') + '">' + esc(m.t).replace(/\n/g, '<br>') + (m.l ? SH.lightHtml(m.l, m.w) : '') + '</div>'; }).join(''); };
    paint();
    var f = $('#fAsk');
    var send = function (q) {
      chat.push({ me: 1, t: q }); chat.push({ t: 'חושב…' }); paint(); f.querySelector('button').disabled = true;
      api('/ai', { task: 'ask', q: q }).then(function (r) { chat[chat.length - 1] = { t: r.answer, l: r.light, w: r.why }; })
        .catch(function (e) { chat[chat.length - 1] = { t: SH.err(e) }; }).then(function () { paint(); f.querySelector('button').disabled = false; });
    };
    f.onsubmit = function (e) { e.preventDefault(); send(f.q.value.trim()); f.q.value = ''; };
    v.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { send(b.getAttribute('data-q')); }; });
    var fl = $('#fLight'); fl.onsubmit = function (e) { e.preventDefault(); $('#lightOut').innerHTML = '<p class="msg">בודק…</p>'; api('/ai', { task: 'light', text: fl.text.value }).then(function (r) { $('#lightOut').innerHTML = SH.lightHtml(r.light, r.why); }).catch(function (er) { $('#lightOut').innerHTML = '<p class="msg sh-err">' + esc(SH.err(er)) + '</p>'; }); };
  };

  VIEWS.album = function (v) {
    if (!S.storage) {
      v.innerHTML = '<section class="sh-card"><h2>האלבום של השכבה</h2><p class="msg">האלבום המשותף ייפתח בקרוב. התמונות יישמרו באחסון סגור, ויוצגו רק לחברי השכבה עם קוד.</p><p class="msg">בינתיים: אספו כבר עכשיו את התמונות בטלפון, בתיקיות האלה, שלא ייעלמו ושלא נתקע ברגע האחרון:</p><ul class="sh-folders">' + S.folders.map(function (f) { return '<li>📁 ' + esc(f) + '</li>'; }).join('') + '</ul><p class="msg">בעורך הסרטון ובמחולל הממים אפשר כבר עכשיו לבחור תמונות מהטלפון. הן לא עולות לשום מקום.</p></section>';
      return;
    }
    SH.albumView ? SH.albumView(v) : (v.innerHTML = '<p class="msg">טוען…</p>');
  };

  VIEWS.chaverim = function (v) {
    var ms = S.members;
    var h = '<section class="sh-card"><h2>חברי השכבה (' + ms.length + ')</h2><ul class="sh-mlist">' + ms.map(function (m) {
      return '<li data-m="' + esc(m.id) + '"><span>' + esc(m.name) + (m.klass ? ' <small>' + esc(m.klass) + '</small>' : '') + '</span>' +
        (rakaz() && m.id !== S.me.id ? '<select data-mrole aria-label="תפקיד">' + ['chaver', 'gizbar', 'rakaz', 'melave'].map(function (r) { return '<option value="' + r + '"' + (r === m.role ? ' selected' : '') + '>' + ROLE[r] + '</option>'; }).join('') + '</select><button type="button" class="btn btn-sm btn-line sh-danger" data-mdel aria-label="הסרה">✕</button>' : '<small>' + ROLE[m.role] + '</small>') + '</li>';
    }).join('') + '</ul></section>';
    if (rakaz()) h += '<section class="sh-card"><h2>הגדרות השכבה</h2><form class="k-form" id="fG"><label class="field">שם המחזור<input name="name" maxlength="40" required></label><label class="field">סלוגן<input name="slogan" maxlength="80"></label><label class="field">תאריך ההכתרה (שינוי מזיז את כל היעדים)<input name="hachtara" type="date" required></label><label class="field">איש הצוות המלווה<input name="melave_name" maxlength="40"></label><button class="btn btn-gold">שמירה</button></form></section>';
    h += '<section class="sh-card"><h2>המכשיר הזה</h2><div class="sh-row"><button type="button" class="btn btn-sm btn-line" id="outBtn">יציאה מהשכבה במכשיר הזה</button></div><p class="msg">הפרטים שלך: שם וכיתה בלבד. אין מייל, טלפון או תמונה.</p></section>';
    v.innerHTML = h;
    var f = $('#fG');
    if (f) { f.name.value = S.grade.name; f.slogan.value = S.grade.slogan || ''; f.hachtara.value = S.grade.hachtara; f.melave_name.value = S.grade.melave_name || ''; f.onsubmit = function (e) { e.preventDefault(); api('/grade/update', { name: f.name.value.trim(), slogan: f.slogan.value.trim(), hachtara: f.hachtara.value, melave_name: f.melave_name.value.trim() }).then(function () { toast('נשמר'); return refresh(); }).catch(function (er) { toast(SH.err(er)); }); }; }
    v.querySelectorAll('[data-mrole]').forEach(function (x) { x.onchange = function () { api('/member/role', { id: x.closest('li').getAttribute('data-m'), role: x.value }).then(function () { toast('התפקיד עודכן'); return refresh(); }).catch(function (e) { toast(SH.err(e)); }); }; });
    v.querySelectorAll('[data-mdel]').forEach(function (x) { x.onclick = function () { var li = x.closest('li'); ask('להסיר את ' + li.querySelector('span').textContent + ' מהשכבה?', { input: false, ok: 'הסרה' }).then(function (y) { if (y) api('/member/remove', { id: li.getAttribute('data-m') }).then(refresh).catch(function (e) { toast(SH.err(e)); }); }); }; });
    $('#outBtn').onclick = function () { ask('לצאת מהשכבה במכשיר הזה?', { input: false, ok: 'יציאה', text: 'כדי לחזור צריך שוב את הקוד.' }).then(function (y) { if (y) forget(); }); };
  };

  /* ---------- התקנה, החלפת שכבה, קישור למוצר ---------- */
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; var i = $('#inst'); if (i) { i.hidden = false; $('#instBtn').onclick = function () { deferredInstall.prompt(); deferredInstall = null; i.hidden = true; }; } });
  function switcher() {
    var s = loadS();
    var b = $('#dlgBody');
    b.innerHTML = '<h3>השכבות במכשיר הזה</h3><ul class="sh-mlist">' + s.list.map(function (x, i) { return '<li><button type="button" class="btn btn-sm ' + (i === (s.cur || 0) ? 'btn-gold' : 'btn-line') + '" data-sw="' + i + '">' + esc(x.label || (x.g === 'demo' ? 'הדגמה' : 'שכבה')) + ' · ' + ROLE[x.role] + '</button></li>'; }).join('') + '</ul><div class="sh-row"><a class="btn btn-sm btn-line" href="' + HOME + '#knisa">כניסה לשכבה אחרת</a><button class="btn btn-sm btn-line" value="no">סגירה</button></div>';
    b.querySelectorAll('[data-sw]').forEach(function (x) { x.onclick = function () { s.cur = +x.getAttribute('data-sw'); saveS(s); location.reload(); }; });
    $('#dlgForm').onsubmit = function (e) { e.preventDefault(); $('#dlg').close(); };
    $('#dlg').showModal();
  }
  function openHash() {
    var h = new URLSearchParams(location.hash.slice(1)), id = h.get('p');
    if (!id || !S) return;
    var p = S.products.find(function (x) { return x.id === id; });
    if (!p) { toast('המוצר לא נמצא או שעוד אין לך גישה אליו'); return; }
    tab = melave() ? 'ishurim' : 'vaadot:' + p.committee_id; draw();
    setTimeout(function () { var el = document.getElementById('p-' + id); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('sh-flash'); } }, 60);
  }
  window.addEventListener('hashchange', openHash);

  document.addEventListener('DOMContentLoaded', function () {
    if (!token()) { location.href = HOME + '#knisa'; return; }
    s0();
    function s0() {
      var s = loadS(); var c = s.list[s.cur || 0];
      if (c && c.g === 'demo') tab = c.role === 'melave' ? 'ishurim' : 'bait';
      $('#switchBtn').onclick = switcher;
      refresh().then(function () {
        if (S && S.grade) { var s2 = loadS(), cc = s2.list[s2.cur || 0]; if (cc && !cc.label) { cc.label = S.grade.name; saveS(s2); } }
        openHash();
      });
    }
  });
})();
