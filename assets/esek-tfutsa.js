// רשימת תפוצה בוואטסאפ ובמייל (כלים לעסק קטן, /esek/tfutsa/).
// הרשימה וההודעה נשמרות רק ב-localStorage. אין שרת.
// וואטסאפ: צ'אט אישי לכל אדם (wa.me/972…?text=), האדם לוחץ שליחה בעצמו. אין שליחה אוטומטית.
// הקישורים האישיים של הלקוחות (למשל תיק המסמכים) לא עוברים דרך מקצר הקישורים של האתר (kishur.js):
// פותחים חלון ריק ומעבירים אותו ב-location, ומעתיקים ב-execCommand.
// שותפים במיזם: שליחה מהחשבון של העסק דרך Apps Script שהם מתקינים (assets/esek-tfutsa-script.txt).
(function () {
  'use strict';
  var KEY = 'esek-tfutsa', CKEY = 'esek-tfutsa-conn', TOOL = 'esek_tfutsa';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('tp-list')) return;

  // ---------- תבניות ----------
  var RM_DEF = 'לא רוצים לקבל מאיתנו הודעות? השיבו "הסר" ונוריד אתכם מהרשימה.';
  var TPLS = [
    { id: 'upgrade', name: 'השתדרגנו', ad: false, subj: 'השתדרגנו: מהיום הכול ישר מהטלפון',
      body: 'שלום {שם פרטי} 👋\n*השתדרגנו!* ✨\n\nמהיום אפשר לשלוח לנו מסמכים *ישר מהטלפון*, בלי לסרוק ובלי לנסוע.\n\nזה הקישור האישי שלך:\n{קישור}\n\nפותחים, בוחרים מה שולחים ומצלמים, וזה נכנס ישר לתיק שלך אצלנו.\nשאלות? אנחנו כאן.\n\n{עסק}' },
    { id: 'sale', name: 'מבצע', ad: true, subj: 'מבצע ללקוחות שלנו: 20% הנחה עד יום חמישי',
      body: 'שלום {שם פרטי},\nללקוחות שלנו בלבד: *20% הנחה* על כל השירותים, עד יום חמישי.\n\nלהזמנה או לשאלות פשוט עונים להודעה הזאת.\n\n{עסק}' },
    { id: 'remind', name: 'תזכורת', ad: false, subj: 'תזכורת קטנה',
      body: 'שלום {שם פרטי},\nתזכורת קטנה: {הערה}\n\nאם צריך לשנות משהו, עונים להודעה הזאת ונסדר.\nתודה,\n{עסק}' },
    { id: 'invite', name: 'הזמנה', ad: true, subj: 'מוזמנים: ערב פתוח אצלנו',
      body: 'שלום {שם פרטי},\nנשמח לראות אותך בערב הפתוח שלנו, ביום שלישי ב-19:00.\n\nלאישור הגעה:\n{קישור}\n\nמחכים לך,\n{עסק}' },
    { id: 'prices', name: 'עדכון מחירים', ad: false, subj: 'עדכון מחירים מ-1 בחודש',
      body: 'שלום {שם פרטי},\nרצינו לעדכן מראש: מ-1 בחודש המחירים שלנו מתעדכנים.\nהזמנות שייכנסו עד אז יהיו במחיר הנוכחי.\n\nתודה שאתם איתנו,\n{עסק}' },
    { id: 'vacation', name: 'סגור לחופשה', ad: false, subj: 'העסק סגור לחופשה קצרה',
      body: 'שלום {שם פרטי},\nרצינו לעדכן שהעסק סגור לחופשה מיום ראשון עד יום רביעי.\nנחזור לעבודה ביום חמישי, ונענה לכל ההודעות לפי הסדר.\n\n{עסק}' },
    { id: 'chag', name: 'ברכה לחג', ad: false, subj: 'חג שמח!',
      body: 'שלום {שם פרטי},\nלקראת החג רצינו להגיד תודה שאתם איתנו 🙏\nחג שמח ומאיר לך ולכל המשפחה!\n\n{עסק}' }
  ];
  var EXAMPLE = [
    { name: 'משה כהן', phone: '972500000001', email: 'moshe@example.com', link: 'https://example.com/tik/moshe', note: 'הפגישה ביום שני ב-10:00' },
    { name: 'רחל לוי', phone: '972520000002', email: 'rachel@example.com', link: 'https://example.com/tik/rachel', note: 'חסר טופס 106' },
    { name: 'יוסי אברהם', phone: '972540000003', email: '', link: 'https://example.com/tik/yossi', note: '' }
  ];

  // ---------- מצב ----------
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var st = load(KEY, null), first = !st;
  if (!st) st = { list: EXAMPLE.map(mk), demo: true, biz: 'משרד יעקב זאווי · ייעוץ מס', tpl: 'upgrade', subj: TPLS[0].subj, body: TPLS[0].body, ad: false, rm: RM_DEF, me: '', grp: 100, from: '', pv: 0, mode: 'wa', bccDone: {} };
  st.list = st.list || []; st.bccDone = st.bccDone || {};
  var seq = Date.now();
  function mk(p) { return { id: 'p' + (seq++).toString(36) + Math.random().toString(36).slice(2, 5), name: p.name || '', phone: p.phone || '', email: p.email || '', link: p.link || '', note: p.note || '', wa: 0, em: 0, off: false }; }
  function persist() { save(KEY, st); }
  var usedOnce = {};
  function used(how) { if (usedOnce[how] && Date.now() - usedOnce[how] < 30000) return; usedOnce[how] = Date.now(); if (window.toolUsed) window.toolUsed(TOOL, { how: how, n: st.list.length }); }

  // ---------- טלפון, מייל, קישור ----------
  var EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
  var URL_RE = /^(https?:\/\/|www\.)\S+$/i;
  function normPhone(v) {
    var s = String(v || '').trim(); if (!s) return '';
    var plus = /^\s*(\+|00)/.test(s), d = s.replace(/\D/g, '');
    if (!d) return '';
    if (/^00/.test(d)) d = d.slice(2);
    if (!plus && /^0\d{8,9}$/.test(d)) d = '972' + d.slice(1);
    else if (!plus && /^5\d{8}$/.test(d)) d = '972' + d;
    if (/^9720/.test(d)) d = '972' + d.slice(4);
    return d.length >= 8 && d.length <= 15 ? d : '';
  }
  function isPhone(v) { var s = String(v || '').trim(); return /^[\d\s()+\-.]{7,22}$/.test(s) && s.replace(/\D/g, '').length >= 9 && !!normPhone(s); }
  function showPhone(d) { if (!d) return ''; if (/^972\d{8,9}$/.test(d)) { var l = '0' + d.slice(3); return l.length === 10 ? l.slice(0, 3) + '-' + l.slice(3) : l.slice(0, 2) + '-' + l.slice(2); } return '+' + d; }
  function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }

  // ---------- פענוח הדבקה ו-CSV ----------
  function parseRows(text) {
    text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    var firstLine = text.split('\n')[0] || '', delim = /\t/.test(text) ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"' && cell === '') { q = true; continue; }
      if (c === delim) { row.push(cell); cell = ''; continue; }
      if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
      cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.map(function (r) { return r.map(function (x) { return String(x).trim(); }); }).filter(function (r) { return r.some(function (x) { return x; }); });
  }
  var HEAD = [
    ['first', /^(first name|given name|שם פרטי)$/i],
    ['last', /^(last name|family name|שם משפחה)$/i],
    ['name', /^(name|full name|display name|שם|שם מלא|שם הלקוח|לקוח|איש קשר|שם הליד)$/i],
    ['phone', /(phone|mobile|tel|טלפון|נייד|פלאפון|סלולרי|מספר)/i],
    ['email', /(e-?mail|מייל|דוא"?ל|אימייל|דואר אלקטרוני)/i],
    ['link', /(link|url|קישור|לינק)/i],
    ['note', /(note|הערה|הערות)/i]
  ];
  function headerMap(r) {
    var m = {}, hits = 0;
    r.forEach(function (h, i) {
      if (/(label|type|תווית|סוג)/i.test(h)) return;
      for (var k = 0; k < HEAD.length; k++) { if (HEAD[k][1].test(h) && m[HEAD[k][0]] == null) { m[HEAD[k][0]] = i; hits++; return; } }
    });
    var looksData = r.some(function (x) { return EMAIL_RE.test(x) || isPhone(x); });
    return hits && !looksData ? m : null;
  }
  function fromCells(r) {
    var p = { name: '', phone: '', email: '', link: '', note: '' }, rest = [];
    r.forEach(function (x) {
      var v = x.split(':::')[0].trim(); if (!v) return;
      if (!p.email && EMAIL_RE.test(v)) p.email = v.toLowerCase();
      else if (!p.phone && isPhone(v)) p.phone = normPhone(v);
      else if (!p.link && URL_RE.test(v)) p.link = /^www\./i.test(v) ? 'https://' + v : v;
      else rest.push(v);
    });
    p.name = rest.shift() || ''; p.note = rest.join(' · ');
    return p;
  }
  function fromMap(r, m) {
    function g(k) { return m[k] == null ? '' : String(r[m[k]] || '').split(':::')[0].trim(); }
    var name = g('name') || [g('first'), g('last')].filter(Boolean).join(' ');
    var em = g('email'), ph = g('phone'), ln = g('link');
    return { name: name, phone: normPhone(ph), email: EMAIL_RE.test(em) ? em.toLowerCase() : '', link: ln && URL_RE.test(ln) ? (/^www\./i.test(ln) ? 'https://' + ln : ln) : '', note: g('note') };
  }
  function addPeople(arr, src) {
    if (st.demo) { st.list = []; st.demo = false; }
    var seen = {}, added = 0, dup = 0, bad = 0, nocon = 0;
    function nk(p) { return 'n' + String(p.name || '').trim() + '|' + (p.link || ''); }
    st.list.forEach(function (p) { if (p.phone) seen['t' + p.phone] = 1; if (p.email) seen['e' + p.email] = 1; if (!p.phone && !p.email) seen[nk(p)] = 1; });
    arr.forEach(function (p) {
      // בלי טלפון ובלי מייל: נכנס רק אם יש שם (למשל לקוח מהחדר עם קישור), ומוסיפים לו טלפון ברשימה
      if (!p.phone && !p.email) { if (!String(p.name || '').trim()) { bad++; return; } if (seen[nk(p)]) { dup++; return; } seen[nk(p)] = 1; st.list.push(mk(p)); added++; nocon++; return; }
      if ((p.phone && seen['t' + p.phone]) || (p.email && seen['e' + p.email])) { dup++; return; }
      if (p.phone) seen['t' + p.phone] = 1; if (p.email) seen['e' + p.email] = 1;
      st.list.push(mk(p)); added++;
    });
    persist(); renderAll(); used(src);
    var t = 'נוספו ' + added + '.';
    if (dup) t += ' ' + dup + ' כבר היו ברשימה.';
    if (nocon) t += ' ל-' + nocon + ' אין טלפון ומייל: מוסיפים להם ברשימה ב"+ טלפון".';
    if (bad) t += ' ' + bad + ' שורות ריקות לא נכנסו.';
    $('tp-add-msg').textContent = t;
    return added;
  }
  function importText(text, src) {
    var rows = parseRows(text); if (!rows.length) { $('tp-add-msg').textContent = 'לא מצאנו שורות. מדביקים שורה לכל אדם.'; return; }
    var m = headerMap(rows[0]), out = [];
    (m ? rows.slice(1) : rows).forEach(function (r) { out.push(m ? fromMap(r, m) : fromCells(r)); });
    addPeople(out, src);
  }
  $('tp-add-paste').addEventListener('click', function () { var t = $('tp-paste').value; if (!t.trim()) { $('tp-add-msg').textContent = 'קודם מדביקים את הרשימה בתיבה.'; $('tp-paste').focus(); return; } importText(t, 'paste'); if ($('tp-add-msg').textContent.indexOf('נוספו 0') !== 0) $('tp-paste').value = ''; });
  $('tp-csv').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var t = String(r.result || '');
      if (/�/.test(t)) { var r2 = new FileReader(); r2.onload = function () { importText(String(r2.result || ''), 'csv'); }; r2.readAsText(f, 'windows-1255'); return; }
      importText(t, 'csv');
    };
    r.readAsText(f, 'utf-8'); this.value = '';
  });
  $('tp-one-open').addEventListener('click', function () { var o = $('tp-one'); o.hidden = !o.hidden; this.setAttribute('aria-expanded', String(!o.hidden)); if (!o.hidden) $('tp-o-name').focus(); });
  $('tp-one').addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('tp-o-email').value.trim(), ph = $('tp-o-phone').value.trim(), ln = $('tp-o-link').value.trim();
    if (em && !EMAIL_RE.test(em)) { $('tp-add-msg').textContent = 'המייל לא נראה תקין.'; return; }
    if (ph && !normPhone(ph)) { $('tp-add-msg').textContent = 'הטלפון לא נראה תקין.'; return; }
    if (addPeople([{ name: $('tp-o-name').value.trim(), phone: normPhone(ph), email: em.toLowerCase(), link: ln, note: '' }], 'one')) { this.reset(); $('tp-o-name').focus(); }
  });

  // ---------- הרשימה ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function renderList() {
    var f = $('tp-find').value.trim().toLowerCase(), on = st.list.filter(function (p) { return !p.off; }).length;
    $('tp-count').innerHTML = '<b>' + st.list.length + '</b> ברשימה' + (on !== st.list.length ? ' · ' + (st.list.length - on) + ' ביקשו הסרה' : '') + ' · ' + st.list.filter(function (p) { return p.phone && !p.off; }).length + ' עם טלפון · ' + st.list.filter(function (p) { return p.email && !p.off; }).length + ' עם מייל';
    $('tp-demo').hidden = !st.demo;
    var html = '';
    st.list.forEach(function (p, i) {
      if (f && (p.name + ' ' + p.phone + ' ' + showPhone(p.phone) + ' ' + p.email + ' ' + p.note).toLowerCase().indexOf(f) < 0) return;
      html += '<li class="' + (p.off ? 'is-off' : '') + '"><div class="tp-who"><b>' + esc(p.name || 'בלי שם') + '</b>' +
        '<span dir="ltr">' + esc(showPhone(p.phone)) + (p.phone && p.email ? ' · ' : '') + esc(p.email) + '</span>' +
        (p.link ? '<span class="tp-lnk" dir="ltr">' + esc(p.link) + '</span>' : '') + (p.note ? '<span>' + esc(p.note) + '</span>' : '') + '</div>' +
        '<div class="tp-st">' + (p.wa > 0 ? '<span class="tp-badge">✓ וואטסאפ</span>' : '') + (p.em > 0 ? '<span class="tp-badge">✓ מייל</span>' : '') +
        (!p.phone ? '<button type="button" class="tp-off" data-addph="' + i + '">+ טלפון</button>' : '') + (!p.email ? '<button type="button" class="tp-off" data-addem="' + i + '">+ מייל</button>' : '') +
        '<button type="button" class="tp-off" data-off="' + i + '" aria-pressed="' + (p.off ? 'true' : 'false') + '">הסרה</button>' +
        '<button type="button" class="tp-del" data-del="' + i + '" aria-label="למחוק את ' + esc(p.name || 'השורה') + '">✖</button></div></li>';
    });
    $('tp-list').innerHTML = html || '<li class="tp-empty">' + (st.list.length ? 'אין תוצאות לחיפוש.' : 'הרשימה ריקה. מדביקים למעלה.') + '</li>';
  }
  $('tp-list').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-del')) { st.list.splice(+b.getAttribute('data-del'), 1); }
    else if (b.hasAttribute('data-off')) { var p = st.list[+b.getAttribute('data-off')]; p.off = !p.off; }
    else if (b.hasAttribute('data-addph')) {
      var q = st.list[+b.getAttribute('data-addph')], v = prompt('הטלפון של ' + (q.name || 'הלקוח') + ':', ''); if (v == null) return;
      if (!normPhone(v)) { alert('הטלפון לא נראה תקין.'); return; } q.phone = normPhone(v);
    } else if (b.hasAttribute('data-addem')) {
      var q2 = st.list[+b.getAttribute('data-addem')], v2 = prompt('המייל של ' + (q2.name || 'הלקוח') + ':', ''); if (v2 == null) return;
      v2 = v2.trim().toLowerCase(); if (!EMAIL_RE.test(v2)) { alert('המייל לא נראה תקין.'); return; } q2.email = v2;
    }
    persist(); renderAll();
  });
  $('tp-find').addEventListener('input', renderList);
  $('tp-clear').addEventListener('click', function () {
    if (!st.list.length) return;
    if (!confirm('למחוק את כל ' + st.list.length + ' האנשים מהרשימה? אפשר לשמור קודם כ-CSV.')) return;
    st.list = []; st.demo = false; st.bccDone = {}; persist(); renderAll();
  });
  $('tp-export').addEventListener('click', function () {
    var rows = [['שם', 'טלפון', 'מייל', 'קישור', 'הערה', 'הסרה']];
    st.list.forEach(function (p) { rows.push([p.name, showPhone(p.phone), p.email, p.link, p.note, p.off ? 'כן' : '']); });
    var csv = '﻿' + rows.map(function (r) { return r.map(function (x) { x = String(x || ''); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'רשימת-תפוצה.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); used('export');
  });

  // ---------- ההודעה ----------
  function fill(t, p, generic) {
    var biz = st.biz.trim();
    var v = { 'שם': generic ? '' : (p.name || ''), 'שם פרטי': generic ? '' : firstName(p.name), 'קישור': generic ? '' : (p.link || ''), 'הערה': generic ? '' : (p.note || ''),
      'עסק': biz, 'טלפון': generic ? '' : showPhone(p.phone), 'מייל': generic ? '' : (p.email || '') };
    var s = String(t || '').replace(/\{(שם פרטי|שם|קישור|הערה|עסק|טלפון|מייל)\}/g, function (m, k) { return v[k]; });
    return s.replace(/[ \t]+([,.!?])/g, '$1').replace(/^(שלום|היי|הי)\s*,?\s*(👋)?\s*$/gm, function (m, a, w) { return a + (w ? ' ' + w : ','); })
      .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  function msgBody(p, generic, forEmail) {
    var b = fill(st.body, p, generic);
    if (forEmail) b = b.replace(/\*([^*\n]+)\*/g, '$1');
    if (st.ad) { b = (forEmail ? '' : 'פרסומת\n') + b + '\n\n' + (st.rm || RM_DEF).trim(); }
    return b;
  }
  function msgSubj(p, generic) { var s = fill(st.subj, p, generic) || st.biz || 'הודעה'; if (st.ad && !/^פרסומת/.test(s)) s = 'פרסומת: ' + s; return s; }
  function renderTpls() {
    $('tp-tpls').innerHTML = TPLS.map(function (t) { return '<button type="button" data-t="' + t.id + '" aria-pressed="' + (st.tpl === t.id) + '">' + t.name + '</button>'; }).join('');
  }
  $('tp-tpls').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-t]'); if (!b) return;
    var t = TPLS.filter(function (x) { return x.id === b.getAttribute('data-t'); })[0];
    var custom = st.body && TPLS.every(function (x) { return x.body !== st.body; });
    if (custom && !confirm('להחליף את ההודעה שכתבתם בתבנית "' + t.name + '"?')) return;
    st.tpl = t.id; st.subj = t.subj; st.body = t.body; st.ad = t.ad; persist(); syncForm(); renderAll(); used('template');
  });
  function syncForm() { $('tp-biz').value = st.biz; $('tp-subj').value = st.subj; $('tp-body').value = st.body; $('tp-ad').checked = !!st.ad; $('tp-rm').value = st.rm || RM_DEF; $('tp-rm-wrap').hidden = !st.ad; $('tp-me').value = st.me || ''; $('tp-grp').value = String(st.grp || 100); $('tp-from').value = st.from || st.biz; }
  [['tp-biz', 'biz'], ['tp-subj', 'subj'], ['tp-body', 'body'], ['tp-rm', 'rm'], ['tp-me', 'me'], ['tp-from', 'from']].forEach(function (x) {
    $(x[0]).addEventListener('input', function () { st[x[1]] = this.value; if (x[1] === 'body') st.tpl = (TPLS.filter(function (t) { return t.body === st.body; })[0] || {}).id || ''; persist(); renderMsg(); if (x[1] !== 'from') renderSend(); if (x[1] === 'body') renderTpls(); });
  });
  $('tp-ad').addEventListener('change', function () { st.ad = this.checked; $('tp-rm-wrap').hidden = !st.ad; persist(); renderMsg(); renderSend(); });
  $('tp-grp').addEventListener('change', function () { st.grp = +this.value || 100; st.bccDone = {}; persist(); renderSend(); });
  $('tp-chips').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-v]'); if (!b) return;
    var ta = $('tp-body'), v = b.getAttribute('data-v'), s = ta.selectionStart == null ? ta.value.length : ta.selectionStart, en = ta.selectionEnd == null ? s : ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + v + ta.value.slice(en); ta.focus(); ta.selectionStart = ta.selectionEnd = s + v.length;
    ta.dispatchEvent(new Event('input'));
  });
  function active() { return st.list.filter(function (p) { return !p.off; }); }
  function renderMsg() {
    var L = active(); if (st.pv >= L.length) st.pv = 0;
    var p = L[st.pv] || { name: 'משה כהן', phone: '', email: '', link: 'https://…', note: '' };
    $('tp-pv-who').textContent = L.length ? (p.name || 'בלי שם') + ' (' + (st.pv + 1) + ' מתוך ' + L.length + ')' : 'דוגמה';
    $('tp-pv-subj').innerHTML = '<span>נושא המייל:</span> ' + esc(msgSubj(p));
    $('tp-pv-body').innerHTML = esc(msgBody(p)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    var w = [];
    if (/\{קישור\}/.test(st.body + st.subj) && L.some(function (x) { return !x.link; })) w.push(L.filter(function (x) { return !x.link; }).length + ' אנשים בלי קישור: אצלם {קישור} ייצא ריק.');
    if (/\{הערה\}/.test(st.body + st.subj) && L.some(function (x) { return !x.note; })) w.push(L.filter(function (x) { return !x.note; }).length + ' אנשים בלי הערה: אצלם {הערה} ייצא ריק.');
    if (/\{עסק\}/.test(st.body + st.subj) && !st.biz.trim()) w.push('כתבו למעלה את שם העסק, כדי שהחתימה לא תצא ריקה.');
    if (/\{[^}]{1,12}\}/.test(st.body.replace(/\{(שם פרטי|שם|קישור|הערה|עסק|טלפון|מייל)\}/g, ''))) w.push('יש בהודעה משתנה שלא מוכר לכלי (בסוגריים מסולסלים). המשתנים: {שם}, {שם פרטי}, {קישור}, {הערה}, {עסק}, {טלפון}, {מייל}.');
    $('tp-pv-warn').hidden = !w.length; $('tp-pv-warn').textContent = w.join(' ');
  }
  $('tp-pv-prev').addEventListener('click', function () { var n = active().length; if (n) { st.pv = (st.pv - 1 + n) % n; renderMsg(); } });
  $('tp-pv-next').addEventListener('click', function () { var n = active().length; if (n) { st.pv = (st.pv + 1) % n; renderMsg(); } });

  // ---------- פתיחה בלי מקצר הקישורים ----------
  function openRaw(url, sameTab) {
    if (!sameTab) { var w = null; try { w = window.open('', '_blank'); } catch (e) {} if (w) { try { w.opener = null; w.location.href = url; return; } catch (e) {} } }
    location.href = url;
  }
  function copyRaw(text, el, okText) {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove();
    if (el) el.textContent = ok ? (okText || 'הועתק ✓') : 'לא הצלחנו להעתיק. מסמנים ומעתיקים ידנית.';
    return ok;
  }
  var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  function waUrl(p) { return 'https://wa.me/' + p.phone + '?text=' + encodeURIComponent(msgBody(p)); }
  function gmailUrl(o) {
    var q = 'view=cm&fs=1&tf=1' + (o.to ? '&to=' + encodeURIComponent(o.to) : '') + (o.bcc ? '&bcc=' + encodeURIComponent(o.bcc) : '') + '&su=' + encodeURIComponent(o.su) + '&body=' + encodeURIComponent(o.body);
    return 'https://mail.google.com/mail/?' + q;
  }
  function mailto(o) { return 'mailto:' + encodeURIComponent(o.to || '').replace(/%40/g, '@').replace(/%2C/g, ',') + '?' + (o.bcc ? 'bcc=' + encodeURIComponent(o.bcc).replace(/%40/g, '@').replace(/%2C/g, ',') + '&' : '') + 'subject=' + encodeURIComponent(o.su) + '&body=' + encodeURIComponent(o.body); }

  // ---------- שליחה ----------
  function setMode(m) {
    st.mode = m; persist();
    [].forEach.call(document.querySelectorAll('#tp-modes button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === m)); });
    [].forEach.call(document.querySelectorAll('.tp-mode'), function (d) { d.hidden = d.getAttribute('data-mode') !== m; });
    if (m === 'acc') accShow();
  }
  $('tp-modes').addEventListener('click', function (e) { var b = e.target.closest('button[data-m]'); if (b) setMode(b.getAttribute('data-m')); });

  function queue(kind) { return st.list.filter(function (p) { return !p.off && (kind === 'wa' ? p.phone : p.email); }); }
  function nextCard(kind) {
    var Q = queue(kind), done = Q.filter(function (p) { return p[kind] > 0; }).length, skip = Q.filter(function (p) { return p[kind] < 0; }).length, nx = Q.filter(function (p) { return !p[kind]; })[0];
    $('tp-' + kind + '-prog').innerHTML = Q.length ? 'נשלחו <b>' + done + '</b> מתוך <b>' + Q.length + '</b>' + (skip ? ' · דילגתם על ' + skip : '') + (Q.length - done - skip ? ' · נשארו ' + (Q.length - done - skip) : ' · <b>סיימתם את כולם ✓</b>') : (kind === 'wa' ? 'אין ברשימה אף אחד עם טלפון.' : 'אין ברשימה אף אחד עם מייל.');
    var bar = Q.length ? '<div class="tp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + Q.length + '" aria-valuenow="' + done + '" aria-label="התקדמות"><i style="width:' + Math.round(done * 100 / Q.length) + '%"></i></div>' : '';
    if (!nx) { $('tp-' + kind + '-next').innerHTML = bar + (Q.length ? '<p class="tp-ok">כל ההודעות נפתחו. כל הכבוד! 🎉</p>' : ''); return; }
    var btns = kind === 'wa'
      ? '<button class="btn btn-gold tp-go" type="button" data-go="wa" data-id="' + nx.id + '">פתיחת צ\'אט עם ' + esc(firstName(nx.name) || showPhone(nx.phone)) + ' ←</button>'
      : '<button class="btn btn-gold tp-go" type="button" data-go="gm" data-id="' + nx.id + '">Gmail ←</button><button class="btn btn-line" type="button" data-go="mt" data-id="' + nx.id + '">אפליקציית המייל</button>';
    $('tp-' + kind + '-next').innerHTML = bar + '<div class="tp-card"><p class="tp-nx">הבא בתור: <b>' + esc(nx.name || 'בלי שם') + '</b> <span dir="ltr">' + esc(kind === 'wa' ? showPhone(nx.phone) : nx.email) + '</span></p>' +
      '<div class="tp-row">' + btns + '<button class="btn btn-line btn-sm" type="button" data-skip="' + kind + '" data-id="' + nx.id + '">לדלג</button></div></div>';
  }
  function allList(kind) {
    $('tp-' + kind + '-all').innerHTML = queue(kind).map(function (p) {
      return '<li class="' + (p[kind] > 0 ? 'is-done' : '') + '"><span><b>' + esc(p.name || 'בלי שם') + '</b> <span dir="ltr">' + esc(kind === 'wa' ? showPhone(p.phone) : p.email) + '</span></span>' +
        (kind === 'wa' ? '<button class="btn btn-line btn-sm" type="button" data-go="wa" data-id="' + p.id + '">' + (p.wa > 0 ? '✓ שוב' : 'וואטסאפ') + '</button>'
          : '<button class="btn btn-line btn-sm" type="button" data-go="gm" data-id="' + p.id + '">' + (p.em > 0 ? '✓ ' : '') + 'Gmail</button><button class="btn btn-line btn-sm" type="button" data-go="mt" data-id="' + p.id + '">אפליקציה</button>') + '</li>';
    }).join('') || '<li>אין עדיין אף אחד.</li>';
  }
  function byId(id) { return st.list.filter(function (p) { return p.id === id; })[0]; }
  document.querySelector('.tp').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-go],button[data-skip],button[data-reset]'); if (!b) return;
    if (b.hasAttribute('data-reset')) {
      var k = b.getAttribute('data-reset');
      if (!confirm('לנקות את סימוני ה"נשלח" ב' + (k === 'wa' ? 'וואטסאפ' : 'מייל') + ' ולהתחיל סבב חדש?')) return;
      st.list.forEach(function (p) { p[k] = 0; }); persist(); renderAll(); return;
    }
    var p = byId(b.getAttribute('data-id')); if (!p) return;
    if (b.hasAttribute('data-skip')) { p[b.getAttribute('data-skip')] = -1; persist(); renderAll(); return; }
    var go = b.getAttribute('data-go');
    if (go === 'wa') { p.wa = Date.now(); persist(); used('wa'); openRaw(waUrl(p), mobile); }
    else {
      var o = { to: p.email, su: msgSubj(p), body: msgBody(p, false, true) };
      p.em = Date.now(); persist(); used(go === 'gm' ? 'gmail' : 'mailto');
      if (go === 'gm') openRaw(gmailUrl(o)); else openRaw(mailto(o), true);
    }
    setTimeout(renderAll, 50);
  });

  function renderBcc() {
    var Q = queue('em'), n = +st.grp || 100, groups = [];
    for (var i = 0; i < Q.length; i += n) groups.push(Q.slice(i, i + n));
    var generic = /\{(שם|שם פרטי|קישור|הערה|טלפון|מייל)\}/.test(st.body + st.subj);
    $('tp-groups').innerHTML = (generic ? '<p class="tp-warn">בהודעה יש משתנים אישיים. במייל אחד לכולם הם יוצאים ריקים, ו"שלום {שם פרטי}" יוצא "שלום,".</p>' : '') +
      (groups.length ? groups.map(function (g, gi) {
        var done = st.bccDone[gi];
        return '<div class="tp-grp' + (done ? ' is-done' : '') + '"><p><b>קבוצה ' + (gi + 1) + '</b> · ' + g.length + ' נמענים' + (done ? ' · ✓ נפתח' : '') + '</p><div class="tp-row">' +
          '<button class="btn ' + (done ? 'btn-line' : 'btn-gold') + ' btn-sm" type="button" data-bcc="gm" data-g="' + gi + '">Gmail</button>' +
          '<button class="btn btn-line btn-sm" type="button" data-bcc="mt" data-g="' + gi + '">אפליקציית המייל</button>' +
          '<button class="btn btn-line btn-sm" type="button" data-bcc="cp" data-g="' + gi + '">להעתיק כתובות</button><span class="tp-msg" id="tp-bcc-m' + gi + '"></span></div></div>';
      }).join('') : '<p class="es-hint">אין ברשימה אף אחד עם מייל.</p>');
    $('tp-groups').__g = groups;
  }
  $('tp-groups').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-bcc]'); if (!b) return;
    var gi = +b.getAttribute('data-g'), g = $('tp-groups').__g[gi]; if (!g) return;
    var bcc = g.map(function (p) { return p.email; }).join(','), k = b.getAttribute('data-bcc');
    if (k === 'cp') { copyRaw(g.map(function (p) { return p.email; }).join(', '), $('tp-bcc-m' + gi), 'הכתובות הועתקו ✓ מדביקים בשדה "עותק מוסתר"'); used('bcc_copy'); return; }
    var me = (st.me || '').trim();
    if (me && !EMAIL_RE.test(me)) { alert('המייל שלכם (בשדה "אל") לא נראה תקין.'); return; }
    var o = { to: me, bcc: bcc, su: msgSubj({}, true), body: msgBody({}, true, true) };
    st.bccDone[gi] = Date.now(); persist(); used(k === 'gm' ? 'bcc_gmail' : 'bcc_mailto');
    if (k === 'gm') openRaw(gmailUrl(o)); else openRaw(mailto(o), true);
    setTimeout(renderBcc, 50);
  });

  // ---------- שותפים במיזם: שליחה מהחשבון של העסק ----------
  var conn = load(CKEY, null);
  function getP() { try { return localStorage.getItem('kelim-partner') || ''; } catch (e) { return ''; } }
  function goodP(v) { return /^\d{3}-?\d{5}$/.test(String(v || '').replace(/\s/g, '')); }
  function okUrl(u) { return /^https:\/\/script\.google(usercontent)?\.com\/[\w\/.\-]+\/exec$/.test(u) || /^http:\/\/127\.0\.0\.1:\d+\/[\w\/.\-]*exec$/.test(u); }
  function call(u, body) { return fetch(u, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' }).then(function (r) { return r.json(); }); }
  function errText(e) { return ({ key: 'המפתח לא מתאים. נתקו וחברו מחדש.', already: 'הקוד הזה כבר מחובר לדפדפן אחר. כדי לחבר גם כאן, מריצים בעורך את הפעולה resetKey ומחברים שוב.', quota: 'נגמרה המכסה היומית של גוגל לחשבון הזה. ממשיכים מחר מאותו מקום.', bad: 'הבקשה לא נקראה.' })[e] || 'משהו השתבש (' + (e || 'שגיאה') + ').'; }
  function accShow() {
    var p = getP(), isP = goodP(p);
    $('tp-acc-out').hidden = isP; $('tp-acc-in').hidden = !isP;
    if (!isP) { if (p) $('tp-pc').value = p; return; }
    $('tp-acc-setup').hidden = !!conn; $('tp-acc-ready').hidden = !conn;
    if (conn) { accProg(); call(conn.u, { a: 'ping', key: conn.key }).then(function (r) { $('tp-quota').textContent = r.ok ? 'אפשר לשלוח היום עוד ' + r.quota + ' מיילים מהחשבון.' : errText(r.err); if (r.ok) conn.quota = r.quota; accProg(); }).catch(function () { $('tp-quota').textContent = 'אין תשובה מהחשבון כרגע.'; }); }
  }
  function accProg() {
    var Q = queue('em'), left = Q.filter(function (p) { return !(p.em > 0); }).length;
    $('tp-acc-prog').innerHTML = Q.length ? 'מוכנים לשליחה: <b>' + left + '</b> מתוך ' + Q.length + ' עם מייל' + (conn && conn.quota != null && left > conn.quota ? ' · היום יישלחו ' + conn.quota + ', והשאר מחר' : '') : 'אין ברשימה אף אחד עם מייל.';
    $('tp-acc-send').disabled = !left || busy;
  }
  $('tp-pcode').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('tp-pc').value.trim();
    if (!goodP(v)) { $('tp-pc-msg').textContent = 'הקוד בנוי משמונה ספרות, כמו 123-45678. אין קוד? בוחרים מדרגה למטה, ואשלח אותו.'; return; }
    try { localStorage.setItem('kelim-partner', v); localStorage.setItem('chaye-code', v); } catch (x) {}
    $('tp-pc-msg').textContent = ''; used('partner_code'); accShow();
  });
  $('tp-copy-code').addEventListener('click', function () {
    var el = $('tp-code-msg'); el.textContent = 'טוען…';
    fetch('/assets/esek-tfutsa-script.txt').then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (t) { $('tp-code').value = t; $('tp-code').hidden = false; copyRaw(t, el, 'הקוד הועתק ✓'); used('code'); })
      .catch(function () { el.textContent = 'לא הצלחנו לטעון. נסו שוב.'; });
  });
  $('tp-conn').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = $('tp-url').value.trim().replace(/\?.*$/, '');
    if (!okUrl(u)) { $('tp-conn-msg').textContent = 'הכתובת צריכה להתחיל ב-https://script.google.com/ ולהסתיים ב-/exec'; return; }
    $('tp-conn-msg').textContent = 'בודק את החיבור…';
    call(u, { a: 'init' }).then(function (r) {
      if (!r.ok) { $('tp-conn-msg').textContent = errText(r.err); return; }
      conn = { u: u, key: r.key, quota: r.quota }; save(CKEY, conn); used('connect');
      $('tp-conn-msg').textContent = ''; accShow();
    }).catch(function () { $('tp-conn-msg').textContent = 'אין תשובה מהכתובת. בדקו שבפריסה בחרתם "כולם" ושהעתקתם את כתובת אפליקציית האינטרנט.'; });
  });
  $('tp-acc-off').addEventListener('click', function () { if (!confirm('לנתק את הדפדפן הזה מהחשבון? הקוד נשאר בחשבון הגוגל שלכם.')) return; conn = null; save(CKEY, null); accShow(); });
  var busy = false;
  $('tp-acc-send').addEventListener('click', function () {
    if (busy || !conn) return;
    var todo = queue('em').filter(function (p) { return !(p.em > 0); });
    if (!todo.length) return;
    var p0 = todo[0];
    if (!confirm('לשלוח עכשיו ' + todo.length + ' מיילים אישיים מהחשבון של העסק?\n\nלדוגמה, ל' + (p0.name || p0.email) + ':\n' + msgSubj(p0) + '\n\n' + msgBody(p0, false, true).slice(0, 300))) return;
    busy = true; $('tp-acc-send').disabled = true; used('acc_send');
    var sent = 0, failed = 0, i = 0, B = 10, from = (st.from || st.biz || '').trim();
    function step() {
      var batch = todo.slice(i, i + B); if (!batch.length) return finish('');
      $('tp-acc-msg').textContent = 'שולח… ' + sent + ' מתוך ' + todo.length;
      call(conn.u, { a: 'send', key: conn.key, name: from, items: batch.map(function (p) { return { id: p.id, to: p.email, subject: msgSubj(p), body: msgBody(p, false, true) }; }) }).then(function (r) {
        if (!r.ok && r.err !== 'quota') return finish(errText(r.err));
        (r.sent || []).forEach(function (id) { var p = byId(id); if (p) { p.em = Date.now(); sent++; } });
        failed += (r.failed || []).length; conn.quota = r.quota; save(CKEY, conn); persist();
        if (r.err === 'quota' || r.quota === 0) return finish(errText('quota'));
        i += B; step();
      }).catch(function () { finish('החיבור נקטע. לוחצים שוב, והשליחה ממשיכה ממי שעוד לא קיבל.'); });
    }
    function finish(note) {
      busy = false; persist(); renderAll();
      if (conn && conn.quota != null) $('tp-quota').textContent = 'אפשר לשלוח היום עוד ' + conn.quota + ' מיילים מהחשבון.';
      $('tp-acc-msg').textContent = 'נשלחו ' + sent + ' מיילים ✓' + (failed ? ' · ' + failed + ' לא נשלחו (כתובת לא תקינה)' : '') + (note ? ' · ' + note : '');
    }
    step();
  });

  function renderSend() { nextCard('wa'); nextCard('em'); allList('wa'); allList('em'); renderBcc(); if (st.mode === 'acc') accProg(); }
  function renderAll() { renderList(); renderMsg(); renderSend(); }

  renderTpls(); syncForm(); renderAll(); setMode(st.mode || 'wa');
  if (first) persist();
})();
