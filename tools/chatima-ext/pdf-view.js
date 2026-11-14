// תרגום PDF: כרום מציג PDF בתוך "מציג" סגור שתוספים לא יכולים להיכנס אליו. לכן התוסף פותח את הקובץ כאן,
// בדף של התוסף: PDF.js (ספרייה של מוזילה, נמצאת בתוך התוסף) שולף את הטקסט מכל עמוד, אנחנו מסדרים אותו
// בפסקאות קריאות, ואז translate.js מתרגם אותו בדיוק כמו דף אינטרנט (שתי השפות / רק תרגום, מילון, סימון).
// שום דבר לא נשלח לשרת: הקובץ נקרא ומתורגם בתוך המחשב.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search), src = q.get('u') || '', tabId = +q.get('t') || 0;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';

  function fileName(u) {
    try { var p = decodeURIComponent(new URL(u).pathname.split('/').pop() || ''); if (p) return p; } catch (e) {}
    return 'מסמך PDF';
  }
  function isPdf(buf) { var h = new Uint8Array(buf.slice(0, 1024)); for (var i = 0; i < h.length - 4; i++) if (h[i] === 37 && h[i + 1] === 80 && h[i + 2] === 68 && h[i + 3] === 70) return true; return false; }
  function fromB64(s) { var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out.buffer; }

  // ---------- להביא את הקובץ ----------
  function direct() {
    if (!/^(https?|file):/.test(src)) return Promise.reject(new Error('no url'));
    return fetch(src, { credentials: 'include' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then(function (b) { if (!isPdf(b)) throw new Error('not pdf'); return b; });
  }
  // דרך הכרטיסייה של ה-PDF עצמה (שם יש לתוסף רשות אחרי הלחיצה)
  function viaTab() {
    if (!tabId) return Promise.reject(new Error('no tab'));
    return new Promise(function (res, rej) {
      chrome.runtime.sendMessage({ pdfFromTab: tabId }, function (r) {
        void chrome.runtime.lastError;
        if (r && r.b64) { var b = fromB64(r.b64); if (isPdf(b)) return res(b); }
        rej(new Error(r && r.err || 'tab'));
      });
    });
  }
  function ask(reason) {
    var m = $('msg'); m.textContent = '';
    var p = document.createElement('p'); p.style.margin = '0 0 6px';
    var local = /^file:/.test(src);
    p.textContent = reason || (local
      ? 'כרום לא נותן לתוספים לקרוא קבצים מהמחשב בלי אישור מיוחד. בוחרים כאן את אותו קובץ (או גוררים אותו לדף), והוא יתורגם מיד, בתוך המחשב.'
      : 'לא הצלחתי לקרוא את הקובץ מהאתר. אפשר לאשר לתוסף לקרוא קבצים מהאתר הזה, או לבחור את הקובץ מהמחשב.');
    m.appendChild(p);
    if (/^https?:/.test(src)) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = '✓ לאשר קריאה מהאתר הזה';
      b.onclick = function () {
        chrome.permissions.request({ origins: [new URL(src).origin + '/*'] }, function (ok) {
          void chrome.runtime.lastError;
          if (ok) { m.textContent = 'טוען…'; direct().then(show, function () { ask('גם אחרי האישור האתר לא נתן את הקובץ. בוחרים אותו מהמחשב:'); }); }
        });
      };
      m.appendChild(b);
    }
    var lab = document.createElement('label'); lab.className = 'pick'; lab.textContent = '📂 לבחור קובץ PDF';
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/pdf,.pdf'; inp.className = 'sr';
    inp.onchange = function () { if (inp.files[0]) readFile(inp.files[0]); };
    lab.appendChild(inp); m.appendChild(lab);
  }
  function readFile(f) {
    $('name').textContent = f.name; document.title = f.name + ' – תרגום';
    f.arrayBuffer().then(function (b) { if (!isPdf(b)) throw new Error('not pdf'); show(b); }).catch(function () { ask('הקובץ שנבחר הוא לא PDF. בוחרים קובץ אחר:'); });
  }
  document.addEventListener('dragover', function (e) { e.preventDefault(); document.body.classList.add('drop'); });
  document.addEventListener('dragleave', function () { document.body.classList.remove('drop'); });
  document.addEventListener('drop', function (e) { e.preventDefault(); document.body.classList.remove('drop'); var f = e.dataTransfer.files[0]; if (f) readFile(f); });

  // ---------- מהטקסט של PDF לפסקאות ----------
  // ב-PDF אין "פסקאות", רק מילים במקומות על הדף. מחברים מילים באותו גובה לשורה, ושורות קרובות לפסקה.
  function median(a) { if (!a.length) return 0; a = a.slice().sort(function (x, y) { return x - y; }); return a[a.length >> 1]; }
  function linesOf(items) {
    var lines = [], cur = null, eol = false;
    items.forEach(function (it) {
      var s = it.str || '';
      var t = it.transform, size = Math.hypot(t[2], t[3]) || it.height || 10, x = t[4], y = t[5];
      if (!s.trim()) { if (it.hasEOL) eol = true; if (cur && s) cur.text += ' '; return; }
      if (!cur || eol || Math.abs(y - cur.y) > size * 0.5) {
        cur = { text: '', y: y, x0: x, x1: x, size: size };
        lines.push(cur);
      } else if (x - cur.x1 > size * 0.12 && !/\s$/.test(cur.text) && !/^\s/.test(s)) cur.text += ' ';
      cur.text += s; cur.x1 = Math.max(cur.x1, x + (it.width || 0)); cur.x0 = Math.min(cur.x0, x);
      cur.size = Math.max(cur.size, size);
      eol = !!it.hasEOL;
    });
    return lines.filter(function (l) { l.text = l.text.replace(/\s+/g, ' ').trim(); return l.text; });
  }
  function paras(lines) {
    var gaps = [], sizes = lines.map(function (l) { return l.size; });
    for (var i = 1; i < lines.length; i++) { var g = lines[i - 1].y - lines[i].y; if (g > 0) gaps.push(g); }
    var lh = median(gaps) || 14, fs = median(sizes) || 11, wide = Math.max.apply(null, lines.map(function (l) { return l.x1 - l.x0; }).concat([1]));
    var out = [], p = null;
    lines.forEach(function (l, i) {
      var prev = lines[i - 1], brk = !p;
      if (prev) {
        var gap = prev.y - l.y;
        if (gap > lh * 1.45 || gap < -2) brk = true;                                        // רווח גדול או מעבר לטור
        if (Math.abs(l.size - prev.size) > fs * 0.2) brk = true;                            // גודל כתב אחר (כותרת)
        if ((prev.x1 - prev.x0) < wide * 0.7 && /[.:!?״"”)]$/.test(prev.text)) brk = true; // שורה קצרה שנגמרת במשפט
      }
      if (brk) { p = { text: l.text, size: l.size }; out.push(p); return; }
      if (/[A-Za-z]-$/.test(p.text) && /^[a-z]/.test(l.text)) p.text = p.text.slice(0, -1) + l.text;   // מילה שנחתכה במקף
      else p.text += ' ' + l.text;
    });
    out.forEach(function (x) { x.head = x.size > fs * 1.2 && x.text.length < 160; });
    return out;
  }

  // ---------- הצגה ----------
  function show(buf) {
    var main = $('doc');
    $('msg').textContent = 'קורא את הטקסט מה-PDF…';
    pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise.then(function (pdf) {
      var n = pdf.numPages, chars = 0, started = false, chain = Promise.resolve();
      for (var i = 1; i <= n; i++) (function (no) {
        chain = chain.then(function () { return pdf.getPage(no); }).then(function (page) { return page.getTextContent(); }).then(function (tc) {
          var ps = paras(linesOf(tc.items));
          if (!started && ps.length) { $('msg').remove(); started = true; }
          var sec = document.createElement('section'); sec.className = 'page'; sec.setAttribute('aria-label', 'עמוד ' + no);
          var h = document.createElement('div'); h.className = 'pno'; h.textContent = 'עמוד ' + no + ' מתוך ' + n; h.setAttribute('translate', 'no');
          sec.appendChild(h);
          ps.forEach(function (x) {
            var e = document.createElement(x.head ? 'h3' : 'p'); e.textContent = x.text; e.setAttribute('dir', 'auto');
            chars += x.text.length; sec.appendChild(e);
          });
          if (ps.length) main.appendChild(sec);
          // מתחילים לתרגם אחרי העמודים הראשונים, ולא מחכים לכל המסמך
          if (no >= Math.min(n, 3)) go();
        });
      })(i);
      var went = false;
      function go() { if (went || !chars || !window.__hkTr) return; went = true; window.__hkTr.cmd('toggle'); }
      return chain.then(function () {
        if (!chars && !started) $('msg').textContent = 'ב-PDF הזה אין טקסט, רק תמונות של דפים (מסמך סרוק). קודם צריך לזהות בו את הטקסט: באתר יש כלי "תמונה לטקסט" (hakelim.com/kelim/).';
        go();
      });
    }).catch(function (e) { ask('לא הצלחתי לפתוח את ה-PDF (' + String(e && e.message || e).slice(0, 80) + '). אפשר לבחור אותו מהמחשב:'); });
  }

  $('print').onclick = function () { window.print(); };
  if (src) {
    $('name').textContent = fileName(src); document.title = fileName(src) + ' – תרגום';
    if (/^https?:|^file:/.test(src)) { $('orig').href = src; $('orig').hidden = false; }
    direct().catch(viaTab).then(show, function () { ask(); });
  } else ask('בוחרים קובץ PDF (או גוררים אותו לכאן), והוא יתורגם בתוך המחשב:');
})();
