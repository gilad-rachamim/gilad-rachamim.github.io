// ברכה לחג לכל האנשים הקרובים, עם השם של כל אחד (/kelim/kesharim/bracha-lechag/ ודפי החגים).
// הרשימה, הנוסחים והסימונים נשמרים רק ב-localStorage. אין שרת.
// וואטסאפ ו-SMS: צ'אט אישי לכל אדם עם הברכה כבר כתובה, והאדם לוחץ שליחה בעצמו (אין שליחה אוטומטית).
// מייל: אחד-אחד (ג'ימייל / אפליקציה), או בלחיצה לכולם מהחשבון של המשתמש דרך Apps Script
// (אותו קוד של רשימת התפוצה, assets/esek-tfutsa-script.txt, ואותו חיבור שמור esek-tfutsa-conn).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = document.querySelector('.bl');
  var D = window.BRACHA_DATA;
  if (!root || !D) return;
  var KEY = 'kesharim-bracha', CKEY = 'esek-tfutsa-conn', TOOL = 'kesharim_bracha';
  var OCC = {}; D.occ.forEach(function (o) { OCC[o.id] = o; });
  var GRP = {}; D.groups.forEach(function (g) { GRP[g[0]] = g; });
  var STY = {}; D.styles.forEach(function (s) { STY[s[0]] = s; });
  var DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];

  // ---------- מצב ----------
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var seq = Date.now();
  function mk(p) {
    return { id: 'b' + (seq++).toString(36) + Math.random().toString(36).slice(2, 5), name: String(p.name || '').trim().slice(0, 60), call: String(p.call || '').trim().slice(0, 40),
      phone: normPhone(p.phone), email: String(p.email || '').trim().toLowerCase().slice(0, 90), grp: GRP[p.grp] ? p.grp : 'mishpacha', pl: !!p.pl || /^משפחת\s/.test(String(p.name || '').trim()), sent: {} };
  }
  var EXAMPLE = [
    { name: 'רחל כהן', call: 'אמא', phone: '0500000001', grp: 'mishpacha' },
    { name: 'משפחת לוי', call: 'משפחת לוי היקרה', phone: '0520000002', grp: 'mishpacha', pl: true },
    { name: 'יוסי אברהם', call: 'יוסי', phone: '0540000003', email: 'yossi@example.com', grp: 'chaverim' },
    { name: 'דנה מזרחי', call: 'דנה', phone: '0530000004', email: 'dana@example.com', grp: 'lekochot' }
  ];
  var st = load(KEY, null), first = !st;
  if (!st) st = { people: EXAMPLE.map(mk), demo: true };
  st.people = st.people || []; st.sel = st.sel || { mishpacha: 1, chaverim: 1, lekochot: 1, avoda: 1 };
  st.gstyle = st.gstyle || {}; D.groups.forEach(function (g) { if (!STY[st.gstyle[g[0]]]) st.gstyle[g[0]] = g[2]; });
  st.vr = st.vr || {}; st.custom = st.custom || {}; st.sign = st.sign || ''; st.mode = st.mode || 'wa'; st.sh = st.sh || {};
  function persist() { save(KEY, st); }
  var usedAt = {};
  function used(how) { if (usedAt[how] && Date.now() - usedAt[how] < 30000) return; usedAt[how] = Date.now(); if (window.toolUsed) window.toolUsed(TOOL, { how: how, n: st.people.length, occ: cur }); }

  // ---------- טלפון, מייל, שם ----------
  var EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
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
  function callName(p) {
    if (p.call) return p.call;
    var n = String(p.name || '').trim();
    if (/^(משפחת|משפ'|הרב|הרבנית|ד"ר|דר'|פרופ'|סבא|סבתא|דוד|דודה|הדוד|הדודה|אמא|אבא|סבתוש)\s/.test(n)) return n;
    return n.split(/\s+/)[0] || '';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- תאריכים עבריים (Intl, בלי ספרייה) ----------
  var HF = null;
  try { HF = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch (e) {}
  function today0() { var n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); }
  function addD(d, k) { return new Date(d.getTime() + k * 864e5); }
  function heb(d) { var p = HF.formatToParts(d), m = '', dd = 0; p.forEach(function (x) { if (x.type === 'month') m = x.value; if (x.type === 'day') dd = +x.value; }); return { m: m, d: dd }; }
  var dateCache = {};
  function occDate(o) {
    if (o.id in dateCache) return dateCache[o.id];
    var t = today0(), r = null, len = Math.max(1, o.len || 1);
    if (o.greg) {
      var y = t.getUTCFullYear(), c = new Date(Date.UTC(y, o.greg[1] - 1, o.greg[0]));
      r = c < t ? new Date(Date.UTC(y + 1, o.greg[1] - 1, o.greg[0])) : c;
    } else if (o.m && HF) {
      for (var i = -(len - 1); i < 420; i++) { var d = addD(t, i), h = heb(d); if (h.d === o.d && o.m.indexOf(h.m) >= 0) { r = d; break; } }
    }
    return (dateCache[o.id] = r);
  }
  function dayDiff(d) { return Math.round((d - today0()) / 864e5); }
  function fmtD(d) { return d.getUTCDate() + '.' + (d.getUTCMonth() + 1); }
  function whenText(o) {
    var d = occDate(o); if (!d) return '';
    var n = dayDiff(d), len = o.len || 1;
    if (n < 0 && n > -len) return 'עכשיו';
    if (n === 0) return 'היום';
    if (n === 1) return 'מחר';
    return 'בעוד ' + n + ' ימים';
  }
  function eveText(o) {
    var d = occDate(o); if (!d) return '';
    var eve = addD(d, -1), w = d.getUTCDay();
    if (o.greg) return 'ב-' + fmtD(d) + ' (יום ' + DAYS[w] + ') · ' + whenText(o);
    var first = o.id === 'chanuka' ? 'נר ראשון' : 'ערב החג';
    return first + ': ' + (eve.getUTCDay() === 5 ? 'יום שישי' : 'יום ' + DAYS[eve.getUTCDay()]) + ' ' + fmtD(eve) + ' בערב · ' + whenText(o);
  }
  // החג נכנס בשבת או ביום שישי -> מציעים להוסיף "ושבת שלום"
  function nearShabbat(o) { var d = occDate(o); if (!d) return false; var w = d.getUTCDay(); return w === 6 || w === 5; }
  function autoOcc() {
    var best = null, bd = 1e9;
    D.occ.forEach(function (o) { var d = occDate(o); if (!d) return; var n = dayDiff(d); if (n < 0) n = 0; if (n < bd) { bd = n; best = o.id; } });
    return best || 'chag';
  }
  function yearKey(id) { var o = OCC[id], d = occDate(o); return id + '-' + (d ? d.getUTCFullYear() : new Date().getFullYear()); }

  // בחירה ידנית של חג נשמרת לשבועיים; אחר כך חוזרים לחג הקרוב
  var cur = (root.getAttribute('data-occ') && OCC[root.getAttribute('data-occ')]) ? root.getAttribute('data-occ') : (OCC[st.occ] && Date.now() - (st.occAt || 0) < 14 * 864e5 ? st.occ : autoOcc());
  var editStyle = 'cham';

  // ---------- הברכה ----------
  var PL = { 'לך': 'לכם', 'אותך': 'אתכם', 'שלך': 'שלכם', 'איתך': 'איתכם' };
  function tplKey(style) { return cur + '_' + style; }
  function baseTpl(style) { var L = OCC[cur].t[style]; return L[(st.vr[tplKey(style)] || 0) % L.length]; }
  function tplOf(style) { var c = st.custom[tplKey(style)]; return c != null ? c : baseTpl(style); }
  function shabbatOn() { var o = OCC[cur]; return cur in st.sh ? !!st.sh[cur] : nearShabbat(o); }
  function fill(tpl, p) {
    var t = String(tpl).replace(/\{שם מלא\}/g, p.name || callName(p)).replace(/\{שם\}/g, callName(p));
    t = t.replace(/\{(לך|אותך|שלך|איתך)\}/g, function (m, w) { return p.pl ? PL[w] : w; });
    var sign = String(st.sign || '').trim(), hasSign = /\{חתימה\}/.test(t);
    t = t.replace(/\{חתימה\}/g, sign);
    var lines = t.split('\n');
    if (shabbatOn() && OCC[cur].len) {
      var last = lines[lines.length - 1];
      if (/,\s*$/.test(last)) lines[lines.length - 1] = last.replace(/,\s*$/, ' ושבת שלום,');
      else lines.push('ושבת שלום 🕯️');
    }
    if (!hasSign) {
      if (sign) lines.push(sign);
      else lines[lines.length - 1] = lines[lines.length - 1].replace(/,\s*$/, '');
    }
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function styleOf(p) { return st.gstyle[p.grp] || 'cham'; }
  function msgOf(p) { return fill(tplOf(styleOf(p)), p); }
  function subjOf() { return OCC[cur].subj; }

  // ---------- 1. החג ----------
  function renderOcc() {
    var list = D.occ.slice().sort(function (a, b) {
      var da = occDate(a), db = occDate(b);
      if (da && db) return da - db; if (da) return -1; if (db) return 1; return 0;
    });
    $('bl-occs').innerHTML = list.map(function (o) {
      var w = whenText(o);
      return '<button type="button" data-o="' + o.id + '" aria-pressed="' + (o.id === cur) + '"><span aria-hidden="true">' + o.icon + '</span> ' + esc(o.name) + (w ? '<small>' + esc(w) + '</small>' : '') + '</button>';
    }).join('');
    var o = OCC[cur];
    $('bl-occ-info').textContent = o.len ? eveText(o) : (cur === 'yomhuledet' ? 'מסמנים למטה רק את מי שחוגג, או שולחים לאחד מתוך הרשימה. את ימי ההולדת עצמם שומרים ב"ימי הולדת ותאריכים".' : 'ברכה כללית לכל חג.');
    var shw = !!o.len;
    $('bl-sh-wrap').hidden = !shw;
    $('bl-sh').checked = shabbatOn();
    $('bl-sh-why').textContent = nearShabbat(o) ? 'החג נכנס בשבת או ביום שישי, ולכן זה מסומן.' : '';
    document.querySelectorAll('[data-occ-name]').forEach(function (el) { el.textContent = o.name; });
  }
  $('bl-occs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-o]'); if (!b) return;
    cur = b.getAttribute('data-o'); st.occ = cur; st.occAt = Date.now(); st.pv = 0; persist(); used('occ'); renderAll();
  });
  $('bl-sh').addEventListener('change', function () { st.sh[cur] = this.checked ? 1 : 0; persist(); renderMsg(); renderSend(); });

  // ---------- 2. האנשים ----------
  function groupSel() { return $('bl-addgrp').value || 'mishpacha'; }
  function clearDemo() { if (st.demo) { st.people = []; st.demo = false; } }
  function addPeople(arr, how) {
    var added = 0, dup = 0, bad = 0;
    clearDemo();
    arr.forEach(function (p) {
      var x = mk(p);
      if (!x.name && !x.phone && !x.email) return;
      if (!x.phone && !x.email) { bad++; }
      if (!x.name) x.name = x.email ? x.email.split('@')[0] : showPhone(x.phone);
      var same = st.people.some(function (q) { return (x.phone && q.phone === x.phone) || (x.email && q.email === x.email); });
      if (same) { dup++; return; }
      st.people.push(x); added++;
    });
    persist(); renderAll();
    var m = added ? 'נוספו ' + added + ' ✓' : 'לא נוסף אף אחד.';
    if (dup) m += ' · ' + dup + ' כבר ברשימה';
    if (bad) m += ' · ' + bad + ' בלי טלפון ובלי מייל';
    say('bl-add-msg', m);
    if (added) used(how);
    return added;
  }
  function say(id, t) { var el = $(id); if (el) el.textContent = t || ''; }
  // הדבקה: שורה לכל אדם. מייל וטלפון מזוהים לבד, שם קבוצה (משפחה/חברים/לקוחות/עבודה) מזוהה לבד, והשאר הוא השם.
  function grpFromWord(v) { var s = String(v || '').trim(); for (var k in GRP) if (GRP[k][1] === s) return k; return ''; }
  var PH_RE = /\+?\d[\d\s\-().]{7,}\d/g, EM_RE = /[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}/g;
  function fromCells(cells, defGrp) {
    var p = { grp: defGrp }, rest = [];
    if (cells.length === 1) {
      var one = String(cells[0] || ''), em = one.match(EM_RE), ph = one.replace(EM_RE, ' ').match(PH_RE);
      if (em) p.email = em[0];
      if (ph && isPhone(ph[0])) p.phone = ph[0];
      one = one.replace(EM_RE, ' ').replace(PH_RE, ' ');
      cells = one.split(/[,;|]|\s{2,}|\s[-–]\s/);
    }
    cells.forEach(function (c) {
      c = String(c || '').trim(); if (!c) return;
      if (!p.email && EMAIL_RE.test(c)) p.email = c;
      else if (!p.phone && isPhone(c)) p.phone = c;
      else if (grpFromWord(c)) p.grp = grpFromWord(c);
      else rest.push(c);
    });
    p.name = rest[0] || ''; if (rest[1]) p.call = rest[1];
    return p;
  }
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
  // CSV עם כותרות (גוגל, אאוטלוק, אייפון, אקסל בעברית)
  function fromCSV(text, defGrp) {
    var rows = parseRows(text); if (!rows.length) return [];
    var h = rows[0].map(function (x) { return x.toLowerCase(); });
    function col(re) { var out = []; h.forEach(function (x, i) { if (re.test(x)) out.push(i); }); return out; }
    var cFull = col(/^(name|display name|full name|שם מלא|שם)$/), cFirst = col(/^(first name|given name|שם פרטי)$/), cLast = col(/^(last name|family name|surname|שם משפחה)$/);
    var cNick = col(/^(nickname|כינוי|פנייה|פניה)$/), cPh = col(/(phone.*value|mobile|phone|טלפון|נייד)/), cEm = col(/(e-?mail.*(value|address)|^e-?mail$|מייל|דוא"ל)/), cGr = col(/^(קבוצה|group)$/);
    var known = cFull.length + cFirst.length + cPh.length + cEm.length;
    if (!known) return rows.map(function (r) { return fromCells(r, defGrp); });
    return rows.slice(1).map(function (r) {
      var name = cFull.map(function (i) { return r[i]; }).filter(Boolean)[0] || [].concat(cFirst, cLast).map(function (i) { return r[i]; }).filter(Boolean).join(' ');
      var ph = '', em = '';
      cPh.some(function (i) { var v = String(r[i] || '').split(':::')[0]; if (isPhone(v)) { ph = v; return true; } return false; });
      cEm.some(function (i) { var v = String(r[i] || '').split(':::')[0].trim(); if (EMAIL_RE.test(v)) { em = v; return true; } return false; });
      var g = cGr.length ? grpFromWord(r[cGr[0]]) : '';
      return { name: name, call: cNick.length ? r[cNick[0]] : '', phone: ph, email: em, grp: g || defGrp };
    });
  }
  function qpDecode(v) {
    var bytes = [], i;
    for (i = 0; i < v.length; i++) {
      if (v.charAt(i) === '=' && /^[0-9A-F]{2}$/i.test(v.substr(i + 1, 2))) { bytes.push(parseInt(v.substr(i + 1, 2), 16)); i += 2; }
      else bytes.push(v.charCodeAt(i) & 255);
    }
    try { return new TextDecoder('utf-8').decode(new Uint8Array(bytes)); } catch (e) { return v; }
  }
  function fromVCF(text, defGrp) {
    text = text.replace(/\r\n?/g, '\n').replace(/=\n/g, '').replace(/\n[ \t]/g, '');
    var out = [], c = null;
    text.split('\n').forEach(function (line) {
      if (/^BEGIN:VCARD/i.test(line)) { c = { name: '', n: '', phone: '', email: '', call: '', grp: defGrp }; return; }
      if (/^END:VCARD/i.test(line)) { if (c) { c.name = c.name || c.n; out.push(c); } c = null; return; }
      if (!c) return;
      var ci = line.indexOf(':'); if (ci < 0) return;
      var left = line.slice(0, ci), val = line.slice(ci + 1), prop = left.split(';')[0].replace(/^[^.]*\./, '').toUpperCase();
      if (/QUOTED-PRINTABLE/i.test(left)) val = qpDecode(val);
      val = val.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
      if (prop === 'FN') c.name = val;
      else if (prop === 'N') { var p = val.split(';'); c.n = [p[1], p[0]].filter(Boolean).join(' '); }
      else if (prop === 'NICKNAME') c.call = val;
      else if (prop === 'TEL' && !c.phone) c.phone = val;
      else if (prop === 'EMAIL' && !c.email) c.email = val;
    });
    return out;
  }
  $('bl-add-paste').addEventListener('click', function () {
    var t = $('bl-paste').value; if (!t.trim()) { say('bl-add-msg', 'מדביקים קודם שמות ומספרים בתיבה.'); return; }
    var arr = /BEGIN:VCARD/i.test(t) ? fromVCF(t, groupSel()) : parseRows(t).map(function (r) { return fromCells(r.length === 1 ? [r[0]] : r, groupSel()); });
    if (addPeople(arr, 'paste')) $('bl-paste').value = '';
  });
  $('bl-file').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var fr = new FileReader(), inp = this;
    fr.onload = function () {
      var t = String(fr.result || '');
      addPeople(/BEGIN:VCARD/i.test(t) ? fromVCF(t, groupSel()) : fromCSV(t, groupSel()), 'file');
      inp.value = '';
    };
    fr.readAsText(f);
  });
  if ('contacts' in navigator && navigator.contacts && navigator.contacts.select) {
    $('bl-pick').hidden = false;
    $('bl-pick').addEventListener('click', function () {
      navigator.contacts.select(['name', 'tel', 'email'], { multiple: true }).then(function (list) {
        addPeople((list || []).map(function (c) { return { name: (c.name || [])[0], phone: (c.tel || [])[0], email: (c.email || [])[0], grp: groupSel() }; }), 'picker');
      }).catch(function () {});
    });
  }
  // אדם אחד: הוספה ועריכה
  var editing = null;
  function openOne(p) {
    editing = p ? p.id : null;
    $('bl-one').hidden = false; $('bl-one-open').setAttribute('aria-expanded', 'true');
    $('bl-o-name').value = p ? p.name : ''; $('bl-o-call').value = p ? p.call : '';
    $('bl-o-phone').value = p ? showPhone(p.phone) : ''; $('bl-o-email').value = p ? p.email : '';
    $('bl-o-grp').value = p ? p.grp : groupSel(); $('bl-o-pl').checked = p ? !!p.pl : false;
    $('bl-o-save').textContent = p ? 'לשמור שינויים' : 'להוסיף';
    $('bl-o-name').focus();
  }
  $('bl-one-open').addEventListener('click', function () { if ($('bl-one').hidden) openOne(null); else { $('bl-one').hidden = true; this.setAttribute('aria-expanded', 'false'); } });
  $('bl-o-cancel').addEventListener('click', function () { $('bl-one').hidden = true; editing = null; $('bl-one-open').setAttribute('aria-expanded', 'false'); });
  $('bl-o-name').addEventListener('input', function () { if (/^משפחת\s/.test(this.value)) $('bl-o-pl').checked = true; });
  $('bl-one').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = { name: $('bl-o-name').value, call: $('bl-o-call').value, phone: $('bl-o-phone').value, email: $('bl-o-email').value, grp: $('bl-o-grp').value, pl: $('bl-o-pl').checked };
    if (!v.name.trim()) { say('bl-one-msg', 'צריך לפחות שם.'); return; }
    if (v.phone.trim() && !normPhone(v.phone)) { say('bl-one-msg', 'המספר לא נראה תקין.'); return; }
    if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) { say('bl-one-msg', 'המייל לא נראה תקין.'); return; }
    say('bl-one-msg', '');
    if (editing) {
      var p = byId(editing);
      if (p) { var n = mk(v); ['name', 'call', 'phone', 'email', 'grp', 'pl'].forEach(function (k) { p[k] = n[k]; }); st.demo = false; persist(); renderAll(); used('edit'); say('bl-add-msg', 'נשמר ✓'); }
    } else if (!addPeople([v], 'one')) return;
    $('bl-one').reset(); $('bl-one').hidden = true; editing = null; $('bl-one-open').setAttribute('aria-expanded', 'false');
  });
  function byId(id) { for (var i = 0; i < st.people.length; i++) if (st.people[i].id === id) return st.people[i]; return null; }
  function sentRec(p) { return (p.sent || {})[yearKey(cur)]; }
  var CH = { wa: 'וואטסאפ', sms: 'SMS', em: 'מייל', acc: 'מייל', copy: 'הועתק' };
  function renderPeople() {
    var q = ($('bl-find').value || '').trim();
    var L = st.people.filter(function (p) { return !q || (p.name + ' ' + p.call + ' ' + p.phone + ' ' + p.email).indexOf(q) >= 0 || showPhone(p.phone).indexOf(q) >= 0; });
    $('bl-demo').hidden = !st.demo;
    $('bl-count').textContent = st.people.length === 1 ? 'אדם אחד ברשימה' : st.people.length + ' אנשים ברשימה';
    $('bl-list').innerHTML = L.length ? L.map(function (p) {
      var s = sentRec(p), g = GRP[p.grp];
      var sub = [showPhone(p.phone), p.email].filter(Boolean).join(' · ') || 'אין טלפון ומייל';
      return '<li data-id="' + p.id + '"><div class="bl-who"><b>' + esc(p.name) + (p.call && p.call !== p.name ? ' <i>· "' + esc(p.call) + '"</i>' : '') + '</b><span>' + esc(sub) + '</span></div>' +
        '<div class="bl-st"><span class="bl-g bl-g-' + p.grp + '">' + esc(g[1]) + (p.pl ? ' · רבים' : '') + '</span>' + (s ? '<span class="bl-ok">✓ ' + esc(CH[s.c] || 'נשלח') + '</span>' : '') +
        '<button type="button" class="bl-ib" data-edit aria-label="לערוך את ' + esc(p.name) + '">✎</button><button type="button" class="bl-ib" data-del aria-label="למחוק את ' + esc(p.name) + '">✖</button></div></li>';
    }).join('') : '<li class="bl-empty">' + (q ? 'לא נמצא.' : 'הרשימה ריקה. מוסיפים למעלה.') + '</li>';
    // בחירת קבוצות לשליחה
    $('bl-sel').innerHTML = D.groups.map(function (g) {
      var n = st.people.filter(function (p) { return p.grp === g[0]; }).length;
      return '<label class="bl-chip"><input type="checkbox" data-g="' + g[0] + '"' + (st.sel[g[0]] ? ' checked' : '') + '> ' + esc(g[1]) + ' <small>(' + n + ')</small></label>';
    }).join('');
  }
  $('bl-find').addEventListener('input', renderPeople);
  $('bl-list').addEventListener('click', function (e) {
    var li = e.target.closest('li[data-id]'); if (!li) return;
    var p = byId(li.getAttribute('data-id')); if (!p) return;
    if (e.target.closest('[data-del]')) { if (!confirm('למחוק את ' + p.name + ' מהרשימה?')) return; st.people = st.people.filter(function (x) { return x !== p; }); persist(); renderAll(); }
    else if (e.target.closest('[data-edit]')) { openOne(p); $('bl-one').scrollIntoView({ block: 'center', behavior: 'instant' }); }
  });
  $('bl-sel').addEventListener('change', function (e) { var g = e.target.getAttribute('data-g'); if (!g) return; st.sel[g] = e.target.checked ? 1 : 0; persist(); renderSend(); renderPreview(); });
  $('bl-export').addEventListener('click', function () {
    var rows = [['שם', 'פנייה', 'טלפון', 'מייל', 'קבוצה']].concat(st.people.map(function (p) { return [p.name, p.call, showPhone(p.phone), p.email, GRP[p.grp][1]]; }));
    var csv = '﻿' + rows.map(function (r) { return r.map(function (x) { x = String(x || ''); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'האנשים-שלי-לברכות.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); used('export');
  });
  $('bl-clear').addEventListener('click', function () { if (!st.people.length || !confirm('למחוק את כל הרשימה מהמכשיר הזה?')) return; st.people = []; st.demo = false; persist(); renderAll(); });

  // ---------- 3. הברכה ----------
  function renderMsg() {
    $('bl-gstyle').innerHTML = D.groups.map(function (g) {
      return '<div class="bl-gs"><label for="bl-gs-' + g[0] + '">' + esc(g[1]) + '</label><select id="bl-gs-' + g[0] + '" data-g="' + g[0] + '">' +
        D.styles.map(function (s) { return '<option value="' + s[0] + '"' + (st.gstyle[g[0]] === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('') + '</select></div>';
    }).join('');
    $('bl-stabs').innerHTML = D.styles.map(function (s) {
      var custom = st.custom[tplKey(s[0])] != null;
      return '<button type="button" data-s="' + s[0] + '" aria-pressed="' + (s[0] === editStyle) + '">' + esc(s[1]) + (custom ? ' ✎' : '') + '<small>' + esc(s[2]) + '</small></button>';
    }).join('');
    var ta = $('bl-text');
    if (document.activeElement !== ta) ta.value = tplOf(editStyle);
    $('bl-reset').hidden = st.custom[tplKey(editStyle)] == null;
    var L = OCC[cur].t[editStyle];
    $('bl-var-n').textContent = 'נוסח ' + ((st.vr[tplKey(editStyle)] || 0) % L.length + 1) + ' מתוך ' + L.length;
    if (document.activeElement !== $('bl-sign')) $('bl-sign').value = st.sign;
    renderPreview();
  }
  $('bl-gstyle').addEventListener('change', function (e) { var g = e.target.getAttribute('data-g'); if (!g) return; st.gstyle[g] = e.target.value; editStyle = e.target.value; persist(); renderMsg(); renderSend(); });
  $('bl-stabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-s]'); if (!b) return; editStyle = b.getAttribute('data-s'); renderMsg(); });
  $('bl-text').addEventListener('input', function () { st.custom[tplKey(editStyle)] = this.value; persist(); $('bl-reset').hidden = false; renderPreview(); renderSend(); });
  $('bl-other').addEventListener('click', function () {
    var k = tplKey(editStyle); st.vr[k] = (st.vr[k] || 0) + 1; delete st.custom[k]; persist(); used('variant'); renderMsg(); renderSend();
  });
  $('bl-reset').addEventListener('click', function () { delete st.custom[tplKey(editStyle)]; persist(); renderMsg(); renderSend(); });
  $('bl-sign').addEventListener('input', function () { st.sign = this.value; persist(); renderPreview(); renderSend(); });
  $('bl-chips').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-v]'); if (!b) return;
    var ta = $('bl-text'), v = b.getAttribute('data-v'), s = ta.selectionStart || ta.value.length, en = ta.selectionEnd || s;
    ta.value = ta.value.slice(0, s) + v + ta.value.slice(en); ta.focus(); ta.selectionStart = ta.selectionEnd = s + v.length;
    ta.dispatchEvent(new Event('input'));
  });
  function targets() { return st.people.filter(function (p) { return st.sel[p.grp]; }); }
  function renderPreview() {
    var T = st.people.filter(function (p) { return styleOf(p) === editStyle; });
    if (!T.length) T = targets();
    if (!T.length) T = [{ name: 'ישראל ישראלי', call: 'ישראל', grp: 'mishpacha', pl: false }];
    st.pv = ((st.pv || 0) % T.length + T.length) % T.length;
    var p = T[st.pv];
    $('bl-pv-who').textContent = (st.pv + 1) + '/' + T.length + ' · ' + (p.name || '');
    $('bl-pv').textContent = fill(tplOf(editStyle), p);
  }
  $('bl-pv-prev').addEventListener('click', function () { st.pv = (st.pv || 0) - 1; renderPreview(); });
  $('bl-pv-next').addEventListener('click', function () { st.pv = (st.pv || 0) + 1; renderPreview(); });

  // ---------- 4. שליחה ----------
  function waUrl(p) { return 'https://wa.me/' + p.phone + '?text=' + encodeURIComponent(msgOf(p)); }
  function smsUrl(p) { return 'sms:+' + p.phone + (/iPhone|iPad|Mac/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(msgOf(p)); }
  function gmailUrl(p) { return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(p.email) + '&su=' + encodeURIComponent(subjOf()) + '&body=' + encodeURIComponent(msgOf(p)); }
  function mailto(p) { return 'mailto:' + p.email + '?subject=' + encodeURIComponent(subjOf()) + '&body=' + encodeURIComponent(msgOf(p)); }
  function need(kind) { return kind === 'em' || kind === 'acc' ? 'email' : 'phone'; }
  function queue(kind) { var f = need(kind); return targets().filter(function (p) { return p[f]; }); }
  function mark(p, c) { p.sent = p.sent || {}; p.sent[yearKey(cur)] = { c: c, t: Date.now() }; persist(); }
  function open(url, sameTab) {
    if (sameTab) { location.href = url; return; }
    var w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url;
  }
  var skipped = {};
  function nextCard(kind) {
    var Q = queue(kind), done = Q.filter(function (p) { return sentRec(p); }).length;
    var nx = null; for (var i = 0; i < Q.length; i++) if (!sentRec(Q[i]) && !skipped[kind + Q[i].id]) { nx = Q[i]; break; }
    if (!nx) for (i = 0; i < Q.length; i++) if (!sentRec(Q[i])) { nx = Q[i]; break; }
    var box = $('bl-next-' + kind); if (!box) return;
    var miss = targets().length - Q.length;
    var head = '<p class="bl-prog">נשלח ל-<b>' + done + '</b> מתוך ' + Q.length + (miss ? ' · ל-' + miss + ' אין ' + (need(kind) === 'email' ? 'מייל' : 'טלפון') : '') + '</p><div class="bl-bar" aria-hidden="true"><i style="width:' + (Q.length ? Math.round(done * 100 / Q.length) : 0) + '%"></i></div>';
    if (!Q.length) { box.innerHTML = head + '<p class="bl-note">אין ברשימה אף אחד עם ' + (need(kind) === 'email' ? 'מייל' : 'טלפון') + ' בקבוצות שסימנתם.</p>'; return; }
    if (!nx) { box.innerHTML = head + '<p class="bl-done">🎉 סיימתם! כולם קיבלו ברכה ל' + esc(OCC[cur].name) + '.</p>'; return; }
    var btns = kind === 'wa' ? '<button class="btn btn-gold bl-go" type="button" data-go="wa">פתיחה בווטסאפ ושליחה ←</button>'
      : kind === 'sms' ? '<button class="btn btn-gold bl-go" type="button" data-go="sms">פתיחה ב-SMS ←</button>'
      : '<button class="btn btn-gold bl-go" type="button" data-go="gm">ג׳ימייל ←</button><button class="btn btn-line bl-go" type="button" data-go="mt">אפליקציית המייל</button>';
    box.innerHTML = head + '<div class="bl-card"><p class="bl-nx">עכשיו: <b>' + esc(nx.name) + '</b> <span>' + esc(kind === 'em' ? nx.email : showPhone(nx.phone)) + '</span></p>' +
      '<div class="bl-bubble" dir="auto">' + esc(msgOf(nx)) + '</div><div class="bl-row">' + btns + '<button class="btn btn-line btn-sm" type="button" data-skip>דילוג</button></div></div>';
    box.setAttribute('data-id', nx.id);
  }
  function allList(kind) {
    var el = $('bl-all-' + kind); if (!el) return;
    el.innerHTML = queue(kind).map(function (p) {
      var s = sentRec(p);
      return '<li class="' + (s ? 'is-done' : '') + '" data-id="' + p.id + '"><span>' + esc(p.name) + ' <span>' + esc(kind === 'em' ? p.email : showPhone(p.phone)) + '</span></span><span class="bl-row">' +
        (s ? '<button type="button" class="bl-ib" data-unmark>✓ בטל סימון</button>' : '') + '<button type="button" class="btn btn-line btn-sm" data-one="' + kind + '">לפתוח</button></span></li>';
    }).join('') || '<li>אין אף אחד.</li>';
  }
  function go(kind, p, how) {
    if (!p) return;
    var url = how === 'wa' ? waUrl(p) : how === 'sms' ? smsUrl(p) : how === 'gm' ? gmailUrl(p) : mailto(p);
    mark(p, how === 'gm' || how === 'mt' ? 'em' : how);
    used(how);
    renderSend(); renderPeople();
    open(url, how === 'sms' || how === 'mt');
  }
  ['wa', 'sms', 'em'].forEach(function (kind) {
    $('bl-next-' + kind).addEventListener('click', function (e) {
      var p = byId(this.getAttribute('data-id'));
      var b = e.target.closest('[data-go]'); if (b) { go(kind, p, b.getAttribute('data-go')); return; }
      if (e.target.closest('[data-skip]') && p) { skipped[kind + p.id] = 1; renderSend(); }
    });
    $('bl-all-' + kind).addEventListener('click', function (e) {
      var li = e.target.closest('li[data-id]'); if (!li) return; var p = byId(li.getAttribute('data-id'));
      if (e.target.closest('[data-unmark]') && p) { delete p.sent[yearKey(cur)]; persist(); renderSend(); renderPeople(); return; }
      if (e.target.closest('[data-one]')) go(kind, p, kind === 'em' ? 'gm' : kind);
    });
  });
  document.querySelectorAll('[data-reset]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!confirm('לנקות את סימוני "נשלח" של ' + OCC[cur].name + ' ולהתחיל מחדש?')) return;
      st.people.forEach(function (p) { if (p.sent) delete p.sent[yearKey(cur)]; }); skipped = {}; persist(); renderSend(); renderPeople();
    });
  });
  function setMode(m) {
    st.mode = m; persist();
    document.querySelectorAll('#bl-modes button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === m)); });
    document.querySelectorAll('.bl-mode').forEach(function (d) { d.hidden = d.getAttribute('data-mode') !== m; });
    if (m === 'acc') accShow();
    if (m === 'copy') renderCopy();
  }
  $('bl-modes').addEventListener('click', function (e) { var b = e.target.closest('button[data-m]'); if (b) setMode(b.getAttribute('data-m')); });
  // להעתיק הכול
  function allText() { return targets().map(function (p) { return '— ' + p.name + (p.phone ? ' · ' + showPhone(p.phone) : '') + ' —\n' + msgOf(p); }).join('\n\n'); }
  function renderCopy() { $('bl-copy-ta').value = allText(); }
  $('bl-copy').addEventListener('click', function () {
    var t = allText(), el = $('bl-copy-msg');
    function ok() { el.textContent = 'הועתק ✓ (' + targets().length + ' ברכות)'; used('copy'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { $('bl-copy-ta').select(); document.execCommand('copy'); ok(); });
    else { $('bl-copy-ta').select(); document.execCommand('copy'); ok(); }
  });

  // ---------- מייל בלחיצה מהחשבון שלכם (Apps Script) ----------
  var conn = load(CKEY, null);
  function okUrl(u) { return /^https:\/\/script\.google(usercontent)?\.com\/[\w\/.\-]+\/exec$/.test(u) || /^http:\/\/127\.0\.0\.1:\d+\/[\w\/.\-]*exec$/.test(u); }
  function call(u, body) { return fetch(u, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' }).then(function (r) { return r.json(); }); }
  function errText(e) { return ({ key: 'המפתח לא מתאים. מנתקים ומחברים מחדש.', already: 'הקוד הזה כבר מחובר לדפדפן אחר. כדי לחבר גם כאן, מריצים בעורך את הפעולה resetKey ומחברים שוב.', quota: 'נגמרה המכסה היומית של גוגל לחשבון. ממשיכים מחר מאותו מקום.', bad: 'הבקשה לא נקראה.' })[e] || 'משהו השתבש (' + (e || 'שגיאה') + ').'; }
  function accShow() {
    $('bl-acc-setup').hidden = !!conn; $('bl-acc-ready').hidden = !conn;
    if (conn) { accProg(); call(conn.u, { a: 'ping', key: conn.key }).then(function (r) { $('bl-quota').textContent = r.ok ? 'אפשר לשלוח היום עוד ' + r.quota + ' מיילים.' : errText(r.err); if (r.ok) conn.quota = r.quota; accProg(); }).catch(function () { $('bl-quota').textContent = 'אין תשובה מהחשבון כרגע.'; }); }
  }
  function accProg() {
    var Q = queue('em'), left = Q.filter(function (p) { return !sentRec(p); }).length;
    $('bl-acc-prog').innerHTML = Q.length ? 'מוכנים לשליחה: <b>' + left + '</b> מתוך ' + Q.length + ' עם מייל' + (conn && conn.quota != null && left > conn.quota ? ' · היום יישלחו ' + conn.quota + ', והשאר מחר' : '') : 'אין ברשימה אף אחד עם מייל בקבוצות שסימנתם.';
    $('bl-acc-send').disabled = !left || busy;
  }
  $('bl-copy-code').addEventListener('click', function () {
    var el = $('bl-code-msg'); el.textContent = 'טוען…';
    fetch('/assets/esek-tfutsa-script.txt').then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (t) {
      $('bl-code').value = t; $('bl-code').hidden = false; $('bl-code').select();
      var done = function () { el.textContent = 'הקוד הועתק ✓'; used('code'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { document.execCommand('copy'); done(); }); else { document.execCommand('copy'); done(); }
    }).catch(function () { el.textContent = 'לא הצלחנו לטעון. נסו שוב.'; });
  });
  $('bl-conn').addEventListener('submit', function (e) {
    e.preventDefault();
    var u = $('bl-url').value.trim().replace(/\?.*$/, '');
    if (!okUrl(u)) { say('bl-conn-msg', 'הכתובת צריכה להתחיל ב-https://script.google.com/ ולהסתיים ב-/exec'); return; }
    say('bl-conn-msg', 'בודק את החיבור…');
    call(u, { a: 'init' }).then(function (r) {
      if (!r.ok) { say('bl-conn-msg', errText(r.err)); return; }
      conn = { u: u, key: r.key, quota: r.quota }; save(CKEY, conn); used('connect'); say('bl-conn-msg', ''); accShow();
    }).catch(function () { say('bl-conn-msg', 'אין תשובה מהכתובת. בודקים שבפריסה בחרתם "כולם" ושהעתקתם את כתובת אפליקציית האינטרנט.'); });
  });
  $('bl-acc-off').addEventListener('click', function () { if (!confirm('לנתק את הדפדפן הזה מהחשבון? הקוד נשאר בחשבון הגוגל שלכם.')) return; conn = null; save(CKEY, null); accShow(); });
  var busy = false;
  $('bl-acc-send').addEventListener('click', function () {
    if (busy || !conn) return;
    var todo = queue('em').filter(function (p) { return !sentRec(p); });
    if (!todo.length) return;
    var p0 = todo[0];
    if (!confirm('לשלוח עכשיו ' + todo.length + ' ברכות במייל, כל אחת עם השם של האדם?\n\nלדוגמה, ל' + p0.name + ':\n' + msgOf(p0).slice(0, 300))) return;
    busy = true; $('bl-acc-send').disabled = true; used('acc_send');
    var sent = 0, failed = 0, i = 0, B = 10, from = String(st.sign || '').trim().split('\n')[0].slice(0, 60);
    function step() {
      var batch = todo.slice(i, i + B); if (!batch.length) return finish('');
      say('bl-acc-msg', 'שולח… ' + sent + ' מתוך ' + todo.length);
      call(conn.u, { a: 'send', key: conn.key, name: from, items: batch.map(function (p) { return { id: p.id, to: p.email, subject: subjOf(), body: msgOf(p) }; }) }).then(function (r) {
        if (!r.ok && r.err !== 'quota') return finish(errText(r.err));
        (r.sent || []).forEach(function (id) { var p = byId(id); if (p) { mark(p, 'acc'); sent++; } });
        failed += (r.failed || []).length; conn.quota = r.quota; save(CKEY, conn);
        if (r.err === 'quota' || r.quota === 0) return finish(errText('quota'));
        i += B; step();
      }).catch(function () { finish('החיבור נקטע. לוחצים שוב, והשליחה ממשיכה ממי שעוד לא קיבל.'); });
    }
    function finish(note) {
      busy = false; persist(); renderSend(); renderPeople();
      if (conn && conn.quota != null) $('bl-quota').textContent = 'אפשר לשלוח היום עוד ' + conn.quota + ' מיילים.';
      say('bl-acc-msg', 'נשלחו ' + sent + ' ברכות ✓' + (failed ? ' · ' + failed + ' לא נשלחו (כתובת לא תקינה)' : '') + (note ? ' · ' + note : ''));
    }
    step();
  });

  // ---------- 5. תזכורת לחג הבא ----------
  function upcoming() {
    return D.occ.filter(function (o) { return occDate(o) && dayDiff(occDate(o)) >= 2; }).sort(function (a, b) { return occDate(a) - occDate(b); });
  }
  function ymd(d) { return d.getUTCFullYear() + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCDate()).slice(-2); }
  var PAGE = 'https://hakelim.com/kelim/kesharim/bracha-lechag/';
  function remindDay(o) { return addD(occDate(o), -2); }
  function renderRemind() {
    var U = upcoming(), nx = U.filter(function (o) { return o.id !== cur; })[0] || U[0];
    if (!nx) { $('bl-rem-next').hidden = true; return; }
    var d = remindDay(nx);
    $('bl-rem-txt').textContent = 'החג הבא: ' + nx.name + ' (' + fmtD(occDate(nx)) + '). התזכורת תגיע ב-' + fmtD(d) + ', יומיים לפני, עם קישור ישר לרשימה שלכם.';
    $('bl-rem-g').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('לשלוח ברכות ל' + nx.name + ' ' + nx.icon) +
      '&dates=' + ymd(d) + '/' + ymd(addD(d, 1)) + '&details=' + encodeURIComponent('הרשימה והברכות מחכות כאן: ' + PAGE);
  }
  function ics() {
    var U = upcoming(), now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//hakelim.com//bracha-lechag//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    U.forEach(function (o) {
      var d = remindDay(o);
      L.push('BEGIN:VEVENT', 'UID:bracha-' + o.id + '-' + ymd(d) + '@hakelim.com', 'DTSTAMP:' + now, 'DTSTART;VALUE=DATE:' + ymd(d), 'DTEND;VALUE=DATE:' + ymd(addD(d, 1)),
        'SUMMARY:לשלוח ברכות ל' + o.name, 'DESCRIPTION:הרשימה והברכות מחכות כאן: ' + PAGE, 'URL:' + PAGE, 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:לשלוח ברכות ל' + o.name, 'TRIGGER:PT10H', 'END:VALARM', 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }
  $('bl-rem-ics').addEventListener('click', function () {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics()], { type: 'text/calendar;charset=utf-8' })); a.download = 'תזכורות-ברכות-לחגים.ics';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    used('ics'); say('bl-rem-msg', 'הקובץ ירד. פותחים אותו, והיומן מוסיף תזכורת לפני כל חג בשנה הקרובה.');
  });
  $('bl-rem-g').addEventListener('click', function () { used('gcal'); });

  function renderSend() { nextCard('wa'); nextCard('sms'); nextCard('em'); allList('wa'); allList('sms'); allList('em'); if (st.mode === 'acc') accProg(); if (st.mode === 'copy') renderCopy(); }
  function renderAll() { renderOcc(); renderPeople(); renderMsg(); renderSend(); renderRemind(); }
  window.__bracha = { fill: fill, st: function () { return st; }, occDate: function (id) { return occDate(OCC[id]); } };

  renderAll(); setMode(st.mode);
  if (first) persist();
})();
