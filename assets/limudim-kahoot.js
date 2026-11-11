/* מחולל חידונים ל-Kahoot – בוחרים נושאים, מקבלים שאלות אמריקאיות, עורכים, ומורידים קובץ אקסל לייבוא ב-Kahoot.
   הכול בדפדפן: המאגר ב-limudim-kahoot-data.js, השמירה ב-localStorage, קובץ ה-xlsx נבנה כאן בלי ספרייה. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var root = $('kh-app'); if (!root || !window.KAHOOT_BANK) return;
  var KEY = 'kh-quiz-v1', QMAX = 95, AMAX = 60;
  var SHAPES = ['▲', '◆', '●', '■'];
  function used(how) { try { if (window.toolUsed) window.toolUsed('kahoot', { how: how }); } catch (e) {} }

  /* ---------- המאגר ---------- */
  var NAMES = {}, ORDER = [];
  window.KAHOOT_TOPICS.forEach(function (g) { g.items.forEach(function (t) { NAMES[t[0]] = t[1]; ORDER.push(t[0]); }); });
  var BANK = window.KAHOOT_BANK.trim().split('\n').map(function (l, i) {
    var p = l.split('|'); return { id: i, t: p[0], l: +p[1], q: p[2], a: p.slice(3, 7) };
  });

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function toItem(b) { // מערבב את סדר התשובות ושומר איפה הנכונה
    var ord = shuffle([0, 1, 2, 3]);
    return { src: b.id, t: b.t, q: b.q, a: ord.map(function (k) { return b.a[k]; }), c: ord.indexOf(0) };
  }
  function lvlOk(b, lvl) { return lvl === 'mix' || (lvl === 'easy' ? b.l === 1 : lvl === 'mid' ? b.l <= 2 : b.l >= 2); }

  /* ---------- מצב ---------- */
  var S = load();
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.qs) return s; } catch (e) {} return null; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // החג הקרוב לפי החודש העברי של היום
  function seasonTopics() {
    var m = '';
    try { m = new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long' }).format(new Date()); } catch (e) {}
    var map = { Elul: ['rh', 'yk'], Tishri: ['sukkot', 'yk'], Heshvan: ['bereshit', 'eretz'], Kislev: ['chanuka'], Tevet: ['chanuka', 'tzomot'],
      Shevat: ['tubishvat', 'eretz'], Adar: ['purim'], 'Adar I': ['purim'], 'Adar II': ['purim'], Nisan: ['pesach'], Iyar: ['atzmaut', 'yerushalayim', 'omer'],
      Sivan: ['shavuot'], Tamuz: ['tzomot', 'yerushalayim'], Av: ['tzomot', 'yerushalayim'] };
    return map[m] || ['pesach', 'chanuka'];
  }

  function build(topics, n, lvl) {
    var pools = topics.map(function (t) { return shuffle(BANK.filter(function (b) { return b.t === t && lvlOk(b, lvl); })); });
    var out = [], k = 0, guard = 0;
    while (out.length < n && guard++ < 5000) {
      var p = pools[k % pools.length]; k++;
      if (p.length) out.push(toItem(p.shift()));
      if (pools.every(function (x) { return !x.length; })) break;
    }
    return out;
  }

  /* ---------- טופס הבחירה ---------- */
  var chipsWrap = $('kh-topics');
  window.KAHOOT_TOPICS.forEach(function (g) {
    var d = document.createElement('div'); d.className = 'kh-grp';
    d.innerHTML = '<b>' + g.g + '</b><div class="kh-chips"></div>';
    g.items.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.t = t[0];
      b.setAttribute('aria-pressed', 'false'); b.textContent = t[2] + ' ' + t[1];
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); countAvail(); });
      d.lastChild.appendChild(b);
    });
    chipsWrap.appendChild(d);
  });
  function picked() { return [].map.call(chipsWrap.querySelectorAll('[aria-pressed="true"]'), function (b) { return b.dataset.t; }); }
  function setPicked(list) { [].forEach.call(chipsWrap.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', list.indexOf(b.dataset.t) > -1 ? 'true' : 'false'); }); }
  function countAvail() {
    var t = picked(), lvl = $('kh-lvl').value;
    var n = BANK.filter(function (b) { return t.indexOf(b.t) > -1 && lvlOk(b, lvl); }).length;
    $('kh-avail').textContent = t.length ? ('במאגר יש ' + n + ' שאלות מתאימות לבחירה הזו.') : 'בוחרים נושא אחד או יותר.';
  }
  $('kh-lvl').addEventListener('change', countAvail);
  $('kh-season').addEventListener('click', function () { setPicked(seasonTopics()); countAvail(); });
  $('kh-all').addEventListener('click', function () { setPicked(ORDER); countAvail(); });

  $('kh-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = picked();
    if (!t.length) { $('kh-avail').textContent = 'צריך לבחור לפחות נושא אחד.'; return; }
    var n = +$('kh-n').value, lvl = $('kh-lvl').value;
    var qs = build(t, n, lvl);
    S = { title: $('kh-title').value.trim() || defTitle(t), topics: t, n: n, lvl: lvl, time: +$('kh-time').value, qs: qs };
    save(); render(); used('build');
    $('kh-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  function defTitle(t) { return t.length === 1 ? 'חידון ' + NAMES[t[0]] : t.length === 2 ? 'חידון ' + NAMES[t[0]] + ' ו' + NAMES[t[1]] : 'חידון יהדות וארץ ישראל'; }

  /* ---------- רשימת השאלות ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cnt(v, max) { return '<span class="kh-cnt' + (v.length > max ? ' over' : '') + '">' + v.length + '/' + max + '</span>'; }

  function render() {
    $('kh-out').hidden = !S;
    if (!S) return;
    $('kh-example').hidden = !S.example;
    $('kh-n').value = S.n; $('kh-lvl').value = S.lvl; $('kh-time').value = S.time; setPicked(S.topics); countAvail();
    $('kh-qtitle').value = S.title;
    $('kh-count').textContent = S.qs.length + ' שאלות · ' + S.time + ' שניות לשאלה';
    var short = S.qs.length < S.n ? ' (ביקשת ' + S.n + ', במאגר היו ' + S.qs.length + ' מתאימות. אפשר להוסיף שאלות משלך.)' : '';
    $('kh-short').textContent = short;
    var L = $('kh-list'); L.innerHTML = '';
    S.qs.forEach(function (it, i) {
      var d = document.createElement('div'); d.className = 'kh-q'; d.dataset.i = i;
      d.innerHTML = '<div class="top"><span class="num">' + (i + 1) + '</span>' + (it.t ? '<span class="tag">' + esc(NAMES[it.t] || '') + '</span>' : '<span class="tag">שאלה שלי</span>') + '</div>' +
        '<textarea data-f="q" aria-label="השאלה" maxlength="120">' + esc(it.q) + '</textarea>' + cnt(it.q, QMAX) +
        '<div class="kh-ans">' + it.a.map(function (a, k) {
          return '<label class="kh-a' + (k === it.c ? ' ok' : '') + '"><input type="radio" name="kh-c' + i + '" value="' + k + '"' + (k === it.c ? ' checked' : '') + ' aria-label="זו התשובה הנכונה">' +
            '<span class="sh kh-c' + k + '" aria-hidden="true">' + SHAPES[k] + '</span><input type="text" data-f="a" data-k="' + k + '" value="' + esc(a) + '" maxlength="75" aria-label="תשובה ' + (k + 1) + '"></label>';
        }).join('') + '</div>' +
        '<p class="kh-hint">מסמנים בעיגול את התשובה הנכונה (בירוק).</p>' +
        '<div class="acts no-print">' + (it.t ? '<button class="linkish" type="button" data-act="swap">שאלה אחרת באותו נושא</button>' : '') +
        '<button class="linkish" type="button" data-act="up">למעלה ↑</button><button class="linkish" type="button" data-act="del">למחוק</button></div>';
      L.appendChild(d);
    });
  }

  $('kh-list').addEventListener('input', function (e) {
    var el = e.target, box = el.closest('.kh-q'); if (!box) return;
    var it = S.qs[+box.dataset.i];
    if (el.dataset.f === 'q') { it.q = el.value; el.nextElementSibling.outerHTML = cnt(it.q, QMAX); }
    else if (el.dataset.f === 'a') { it.a[+el.dataset.k] = el.value; el.style.outline = el.value.length > AMAX ? '2px solid var(--no)' : ''; }
    it.src = -1; save();
  });
  $('kh-list').addEventListener('change', function (e) {
    var el = e.target; if (el.type !== 'radio') return;
    var box = el.closest('.kh-q'); S.qs[+box.dataset.i].c = +el.value; save();
    [].forEach.call(box.querySelectorAll('.kh-a'), function (l, k) { l.classList.toggle('ok', k === +el.value); });
  });
  $('kh-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var i = +b.closest('.kh-q').dataset.i, it = S.qs[i];
    if (b.dataset.act === 'del') { S.qs.splice(i, 1); }
    else if (b.dataset.act === 'up' && i > 0) { S.qs.splice(i - 1, 0, S.qs.splice(i, 1)[0]); }
    else if (b.dataset.act === 'swap') {
      var have = S.qs.map(function (x) { return x.src; });
      var pool = shuffle(BANK.filter(function (x) { return x.t === it.t && have.indexOf(x.id) < 0 && lvlOk(x, S.lvl); }));
      if (!pool.length) pool = shuffle(BANK.filter(function (x) { return x.t === it.t && have.indexOf(x.id) < 0; }));
      if (!pool.length) { b.textContent = 'אין עוד שאלות בנושא הזה'; return; }
      S.qs[i] = toItem(pool[0]);
    }
    save(); render();
  });
  $('kh-add').addEventListener('click', function () {
    S.qs.push({ src: -1, t: '', q: '', a: ['', '', '', ''], c: 0 }); save(); render();
    var last = $('kh-list').lastElementChild; if (last) { last.scrollIntoView({ block: 'center' }); last.querySelector('textarea').focus(); }
  });
  $('kh-qtitle').addEventListener('input', function () { S.title = this.value; save(); });
  $('kh-time').addEventListener('change', function () { if (S) { S.time = +this.value; save(); $('kh-count').textContent = S.qs.length + ' שאלות · ' + S.time + ' שניות לשאלה'; } });

  /* ---------- בדיקה לפני ייצוא ---------- */
  function check() {
    var bad = [];
    S.qs.forEach(function (it, i) {
      var filled = it.a.filter(function (a) { return a.trim(); }).length;
      if (!it.q.trim()) bad.push('בשאלה ' + (i + 1) + ' חסר טקסט');
      else if (filled < 2) bad.push('בשאלה ' + (i + 1) + ' צריך לפחות שתי תשובות');
      else if (!it.a[it.c].trim()) bad.push('בשאלה ' + (i + 1) + ' התשובה הנכונה ריקה');
      if (it.q.length > QMAX || it.a.some(function (a) { return a.length > AMAX; })) bad.push('שאלה ' + (i + 1) + ' ארוכה מדי ל-Kahoot');
    });
    if (!S.qs.length) bad.push('אין שאלות');
    $('kh-msg').textContent = bad.length ? 'כדאי לתקן לפני ההורדה: ' + bad.slice(0, 4).join(' · ') : '';
    return !bad.length;
  }

  /* ---------- קובץ xlsx בלי ספרייה ---------- */
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { var c = 0xFFFFFFFF; for (var i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) { // [{name, data(Uint8Array)}] בשיטת store
    var enc = new TextEncoder(), parts = [], cd = [], off = 0, d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0, true); h.setUint16(8, 0, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true);
      h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, f.data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0, true); c.setUint16(10, 0, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true);
      c.setUint16(28, nm.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
      c.setUint32(38, 0, true); c.setUint32(42, off, true);
      cd.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + sz;
    });
    var cdSize = cd.reduce(function (s, x) { return s + x.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cd, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function xesc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function xlsx(rows) { // rows: [[{v, n?}...]] ; שורה ראשונה = שורה 1
    var ss = [], ssIdx = {};
    function si(s) { if (!(s in ssIdx)) { ssIdx[s] = ss.length; ss.push(s); } return ssIdx[s]; }
    var COLS = 'ABCDEFGH', body = '';
    rows.forEach(function (r, ri) {
      if (!r) return;
      var cells = '';
      r.forEach(function (v, ci) {
        if (v === '' || v == null) return;
        var ref = COLS[ci] + (ri + 1);
        cells += typeof v === 'number' ? '<c r="' + ref + '"><v>' + v + '</v></c>' : '<c r="' + ref + '" t="s"><v>' + si(String(v)) + '</v></c>';
      });
      body += '<row r="' + (ri + 1) + '">' + cells + '</row>';
    });
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    var sheet = X + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews>' +
      '<cols><col min="1" max="1" width="5" customWidth="1"/><col min="2" max="2" width="60" customWidth="1"/><col min="3" max="6" width="28" customWidth="1"/><col min="7" max="8" width="16" customWidth="1"/></cols>' +
      '<sheetData>' + body + '</sheetData></worksheet>';
    var sst = X + '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + ss.length + '" uniqueCount="' + ss.length + '">' +
      ss.map(function (s) { return '<si><t xml:space="preserve">' + xesc(s) + '</t></si>'; }).join('') + '</sst>';
    var F = [
      ['[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'],
      ['xl/worksheets/sheet1.xml', sheet],
      ['xl/sharedStrings.xml', sst]
    ];
    var enc = new TextEncoder();
    return zip(F.map(function (f) { return { name: f[0], data: enc.encode(f[1]) }; }));
  }
  // מבנה התבנית הרשמית של Kahoot: כותרות בשורה 8, שאלות משורה 9, עמודות A-H
  function kahootRows() {
    var rows = [];
    rows[0] = ['', S.title];
    rows[1] = ['', 'Made with hakelim.com/limudim/kahoot/'];
    rows[7] = ['', 'Question - max 120 characters', 'Answer 1 - max 75 characters', 'Answer 2 - max 75 characters', 'Answer 3 - max 75 characters', 'Answer 4 - max 75 characters', 'Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs', 'Correct answer(s) - choose at least one'];
    S.qs.forEach(function (it, i) {
      // תשובות ריקות יורדות לסוף, ומספר התשובה הנכונה מתעדכן
      var arr = it.a.map(function (a, k) { return { a: a.trim(), ok: k === it.c }; }).filter(function (x) { return x.a; });
      while (arr.length < 4) arr.push({ a: '', ok: false });
      var ci = 1; arr.forEach(function (x, k) { if (x.ok) ci = k + 1; });
      rows[8 + i] = [i + 1, it.q.trim()].concat(arr.map(function (x) { return x.a; }), [S.time, ci]);
    });
    return rows;
  }
  function fileName() { return (S.title || 'kahoot').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) + '.xlsx'; }
  $('kh-xlsx').addEventListener('click', function () {
    if (!check()) return;
    var blob = xlsx(kahootRows()), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fileName(); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    $('kh-done').hidden = false; used('xlsx');
  });
  window.__khTest = { rows: function () { return kahootRows(); }, xlsx: function () { return xlsx(kahootRows()); }, build: build, bank: BANK };

  /* ---------- הצגה בכיתה בלי Kahoot ---------- */
  var show = $('kh-show'), cur = 0, timer = null, left = 0;
  function showQ() {
    clearInterval(timer); show.classList.remove('rev');
    var it = S.qs[cur];
    $('kh-s-pos').textContent = (cur + 1) + ' / ' + S.qs.length;
    $('kh-s-q').textContent = it.q;
    $('kh-s-tiles').innerHTML = it.a.map(function (a, k) {
      return a.trim() ? '<div class="tile kh-c' + k + (k === it.c ? ' ok' : '') + '"><i aria-hidden="true">' + SHAPES[k] + '</i>' + esc(a) + '</div>' : '';
    }).join('');
    left = S.time; $('kh-s-clock').textContent = left;
    $('kh-s-rev').hidden = false; $('kh-s-next').textContent = cur < S.qs.length - 1 ? 'לשאלה הבאה ←' : 'סיום';
    timer = setInterval(function () { left--; $('kh-s-clock').textContent = Math.max(0, left); if (left <= 0) reveal(); }, 1000);
  }
  function reveal() { clearInterval(timer); show.classList.add('rev'); $('kh-s-rev').hidden = true; }
  function closeShow() { clearInterval(timer); show.hidden = true; document.body.style.overflow = ''; }
  $('kh-present').addEventListener('click', function () {
    if (!S.qs.length) return;
    cur = 0; show.hidden = false; document.body.style.overflow = 'hidden'; showQ(); used('present');
    try { if (show.requestFullscreen) show.requestFullscreen().catch(function () {}); } catch (e) {}
  });
  $('kh-s-rev').addEventListener('click', reveal);
  $('kh-s-next').addEventListener('click', function () {
    if (!show.classList.contains('rev')) { reveal(); return; }
    if (cur < S.qs.length - 1) { cur++; showQ(); } else { closeShow(); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }
  });
  $('kh-s-prev').addEventListener('click', function () { if (cur > 0) { cur--; showQ(); } });
  $('kh-s-x').addEventListener('click', function () { closeShow(); try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} });
  document.addEventListener('keydown', function (e) {
    if (show.hidden) return;
    if (e.key === 'Escape') closeShow();
    else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowLeft') { e.preventDefault(); $('kh-s-next').click(); }
    else if (e.key === 'ArrowRight') $('kh-s-prev').click();
  });

  /* ---------- הדפסה ---------- */
  $('kh-print-btn').addEventListener('click', function () {
    var L = 'אבגד';
    $('kh-print').innerHTML = '<h2>' + esc(S.title) + '</h2><ol class="qs">' + S.qs.map(function (it) {
      return '<li><b>' + esc(it.q) + '</b><div class="opts">' + it.a.map(function (a, k) { return a.trim() ? '<span>' + L[k] + '. ' + esc(a) + '</span>' : ''; }).join('') + '</div></li>';
    }).join('') + '</ol><div class="key"><h2>תשובות למורה</h2><ol>' + S.qs.map(function (it) { return '<li>' + L[it.c] + '. ' + esc(it.a[it.c]) + '</li>'; }).join('') + '</ol></div>';
    used('print'); window.print();
  });

  /* ---------- שיתוף ---------- */
  $('kh-copy').addEventListener('click', function () {
    var L = 'אבגד';
    var txt = S.title + '\n\n' + S.qs.map(function (it, i) {
      return (i + 1) + '. ' + it.q + '\n' + it.a.map(function (a, k) { return a.trim() ? '   ' + L[k] + '. ' + a + (k === it.c ? ' ✓' : '') : ''; }).filter(Boolean).join('\n');
    }).join('\n\n') + '\n\nנבנה בחינם ב: https://hakelim.com/limudim/kahoot/';
    var done = function () { $('kh-copy').textContent = 'הועתק ✓'; setTimeout(function () { $('kh-copy').textContent = 'להעתיק כטקסט'; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () {}); used('copy');
  });
  $('kh-reset').addEventListener('click', function () {
    if (!confirm('להתחיל חידון חדש? השאלות הנוכחיות יימחקו.')) return;
    S = null; try { localStorage.removeItem(KEY); } catch (e) {}
    $('kh-out').hidden = true; $('kh-title').value = ''; window.scrollTo({ top: $('kh-form').offsetTop - 80, behavior: 'smooth' });
  });

  /* ---------- כניסה ראשונה: דוגמה מלאה של החג הקרוב ---------- */
  if (!S) {
    var t0 = seasonTopics();
    S = { title: defTitle(t0), topics: t0, n: 10, lvl: 'mix', time: 20, qs: build(t0, 10, 'mix'), example: true };
  }
  render();
})();
