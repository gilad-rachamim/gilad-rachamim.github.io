// איחוד קבצי PDF (/kelim/machshev/ichud-pdf/) – כמה קבצי PDF (וגם תמונות) לקובץ PDF אחד, בסדר שבוחרים.
// הכול בדפדפן: pdf-lib (עותק מקומי ב-assets/vendor, נטען רק כשמאחדים) מעתיק את העמודים לקובץ חדש.
// תמונה נכנסת כעמוד A4 משלה. שום קובץ לא עולה לשרת. נשמר בטלפון רק שם הקובץ האחרון (localStorage).
// מדידה: window.toolUsed – add / merge / download / share, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ip-file')) return;
  var LIB = '/assets/vendor/pdf-lib/pdf-lib.min.js';
  var KEY = 'kelim-machshev-ichud-pdf';
  var A4 = [595.28, 841.89], M = 18;
  var items = [], url = null, blob = null, busy = false, done = {};
  function used(a) { if (done[a]) return; done[a] = 1; if (window.toolUsed) window.toolUsed(document.body.getAttribute('data-tool') || 'machshev_ichud_pdf', { action: a }); }
  function mb(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' מ״ב' : Math.max(1, Math.round(b / 1024)) + ' ק״ב'; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function msg(t, cls) { var m = $('ip-msg'); m.textContent = t; m.className = cls || ''; }
  function lib() {
    return new Promise(function (ok, bad) {
      if (window.PDFLib) { ok(); return; }
      var s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = function () { bad(new Error('load')); };
      document.head.appendChild(s);
    });
  }
  function isPdf(f) { return /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name); }
  function isImg(f) { return /^image\/(jpeg|png)$/i.test(f.type) || /\.(jpe?g|png)$/i.test(f.name); }

  function draw() {
    var ul = $('ip-list');
    ul.innerHTML = items.map(function (it, i) {
      return '<li><span class="ip-n">' + (i + 1) + '</span><span class="ip-name">' + (it.img ? '🖼️ ' : '📄 ') + esc(it.f.name) +
        '<small>' + mb(it.f.size) + (it.pages ? ' · ' + it.pages + ' עמודים' : '') + '</small></span>' +
        '<button type="button" data-up="' + i + '" aria-label="להזיז למעלה"' + (i ? '' : ' disabled') + '>▲</button>' +
        '<button type="button" data-dn="' + i + '" aria-label="להזיז למטה"' + (i < items.length - 1 ? '' : ' disabled') + '>▼</button>' +
        '<button type="button" data-rm="' + i + '" aria-label="להסיר">✕</button></li>';
    }).join('');
    $('ip-go').disabled = items.length < 1 || busy;
    $('ip-count').textContent = items.length ? items.length + ' קבצים, לפי הסדר שלמטה' : '';
  }
  function reset() { if (url) { URL.revokeObjectURL(url); url = null; } blob = null; $('ip-box').hidden = true; }
  function add(list) {
    var bad = 0;
    [].forEach.call(list, function (f) { if (isPdf(f) || isImg(f)) items.push({ f: f, img: !isPdf(f), pages: 0 }); else bad++; });
    reset(); draw(); used('add');
    if (bad) { $('ip-box').hidden = false; msg(bad + ' קבצים דולגו: אפשר לאחד רק PDF ותמונות JPG או PNG.', 'warn'); }
    // ספירת עמודים ברקע, כדי שיראו כמה עמודים יש בכל קובץ
    lib().then(function () {
      items.forEach(function (it) {
        if (it.img || it.pages) return;
        it.f.arrayBuffer().then(function (b) { return PDFLib.PDFDocument.load(b, { ignoreEncryption: true }); })
          .then(function (d) { it.pages = d.getPageCount(); draw(); }).catch(function () { it.bad = 1; });
      });
    }).catch(function () {});
  }
  $('ip-file').addEventListener('change', function () { add(this.files); this.value = ''; });
  var drop = $('ip-drop');
  ['dragover', 'dragenter'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('on'); }); });
  ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function () { drop.classList.remove('on'); }); });
  drop.addEventListener('drop', function (ev) { ev.preventDefault(); if (ev.dataTransfer && ev.dataTransfer.files) add(ev.dataTransfer.files); });
  $('ip-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b || busy) return;
    var i;
    if (b.hasAttribute('data-up')) { i = +b.getAttribute('data-up'); items.splice(i - 1, 0, items.splice(i, 1)[0]); }
    else if (b.hasAttribute('data-dn')) { i = +b.getAttribute('data-dn'); items.splice(i + 1, 0, items.splice(i, 1)[0]); }
    else if (b.hasAttribute('data-rm')) { items.splice(+b.getAttribute('data-rm'), 1); }
    reset(); draw();
  });

  $('ip-go').addEventListener('click', function () {
    if (busy || !items.length) return;
    busy = true; draw(); reset(); $('ip-box').hidden = false; msg('מאחד…');
    var skipped = [];
    lib().then(function () {
      var L = window.PDFLib;
      return L.PDFDocument.create().then(function (out) {
        var chain = Promise.resolve();
        items.forEach(function (it) {
          chain = chain.then(function () { return it.f.arrayBuffer(); }).then(function (buf) {
            if (it.img) {
              var p = /png$/i.test(it.f.type) || /\.png$/i.test(it.f.name) ? out.embedPng(buf) : out.embedJpg(buf);
              return p.then(function (im) {
                var page = out.addPage(A4), w = A4[0] - 2 * M, h = A4[1] - 2 * M, s = Math.min(w / im.width, h / im.height, 1);
                page.drawImage(im, { x: (A4[0] - im.width * s) / 2, y: (A4[1] - im.height * s) / 2, width: im.width * s, height: im.height * s });
              });
            }
            return L.PDFDocument.load(buf, { ignoreEncryption: true }).then(function (src) {
              return out.copyPages(src, src.getPageIndices()).then(function (pages) { pages.forEach(function (p) { out.addPage(p); }); });
            });
          }).catch(function () { skipped.push(it.f.name); });
        });
        return chain.then(function () {
          if (!out.getPageCount()) throw new Error('empty');
          out.setTitle(($('ip-name').value || 'מאוחד').trim());
          out.setProducer('hakelim.com');
          return out.save().then(function (bytes) { return [bytes, out.getPageCount()]; });
        });
      });
    }).then(function (r) {
      blob = new Blob([r[0]], { type: 'application/pdf' }); url = URL.createObjectURL(blob);
      var name = (($('ip-name').value || 'מאוחד').trim().replace(/[\\/:*?"<>|]+/g, ' ') || 'מאוחד') + '.pdf';
      try { localStorage.setItem(KEY, JSON.stringify({ name: $('ip-name').value })); } catch (e) {}
      var a = $('ip-dl'); a.href = url; a.download = name; a.hidden = false;
      $('ip-share').hidden = !(navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: 'application/pdf' })] }));
      $('ip-size').textContent = mb(blob.size) + ' · ' + r[1] + ' עמודים';
      msg(skipped.length ? 'מוכן. לא הצלחנו לקרוא: ' + skipped.join(', ') + ' (אולי הקובץ נעול בסיסמה או פגום).' : 'מוכן! הקובץ המאוחד נבנה אצלכם בטלפון.', skipped.length ? 'warn' : 'ok');
      used('merge');
    }).catch(function (e) {
      msg(e && e.message === 'load' ? 'לא הצלחנו לטעון את הכלי. בודקים חיבור לאינטרנט ומנסים שוב.' : 'לא הצלחנו לאחד. ייתכן שאחד הקבצים נעול בסיסמה או פגום – נסו להסיר אותו.', 'warn');
    }).then(function () { busy = false; draw(); });
  });
  $('ip-dl').addEventListener('click', function () { used('download'); });
  $('ip-share').addEventListener('click', function () {
    if (!blob) return;
    var f = new File([blob], $('ip-dl').download, { type: 'application/pdf' });
    navigator.share({ files: [f], title: f.name }).then(function () { used('share'); }).catch(function () {});
  });
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv && sv.name) $('ip-name').value = sv.name; } catch (e) {}
  draw();
})();
