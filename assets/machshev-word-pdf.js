// המרת Word ל-PDF (/kelim/machshev/word-pdf/) – כולה בדפדפן, בלי להעלות את הקובץ לשום שרת.
// docx-preview (Apache-2.0) + jszip מציירים את ה-docx בדפדפן, בעברית מימין לשמאל. הספריות יושבות ב-assets/vendor ונטענות רק כשבוחרים קובץ.
// שתי דרכים: (1) "להוריד PDF" – כל עמוד הופך לתמונה ונכנס ל-PDF (html-to-image + jsPDF); (2) "הדפסה / שמירה כ-PDF" – טקסט אמיתי שאפשר לסמן ולחפש,
// דרך חלון ההדפסה של הדפדפן. קבצי doc ישנים לא נתמכים (רק docx).
// מדידה: window.toolUsed(tool, {action}) – add / download / print / remove, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var root = document.getElementById('wp');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var TOOL = document.body.getAttribute('data-tool') || 'machshev_word_pdf';
  var sent = {};
  function used(a) { if (sent[a]) return; sent[a] = 1; if (window.toolUsed) window.toolUsed(TOOL, { action: a }); }
  var V = '/assets/vendor/';
  var items = [], cur = -1, busy = false;

  var drop = $('wp-drop'), file = $('wp-file'), msg = $('wp-msg'), prev = $('wp-prev');
  function say(t, cls) { msg.textContent = t || ''; msg.className = 'wp-msg' + (cls ? ' ' + cls : ''); }

  var loaded = {};
  function loadJs(src) {
    if (loaded[src]) return loaded[src];
    return (loaded[src] = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { delete loaded[src]; rej(new Error('load ' + src)); };
      document.head.appendChild(s);
    }));
  }
  function libsView() { return loadJs(V + 'jszip/jszip-3.10.1.min.js').then(function () { return loadJs(V + 'docx-preview/docx-preview-0.4.1.min.js'); }); }
  function libsPdf() { return Promise.all([loadJs(V + 'html-to-image/html-to-image-1.11.11.js'), loadJs(V + 'jspdf/jspdf-2.5.1.umd.min.js')]); }

  async function render(it, host, styleHost) {
    await libsView();
    host.innerHTML = ''; if (styleHost) styleHost.innerHTML = '';
    await window.docx.renderAsync(it.file, host, styleHost || host, { inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: false, useBase64URL: true, experimental: true });
  }

  // ---------- רשימה ----------
  function renderList() {
    var ul = $('wp-list'); ul.innerHTML = '';
    items.forEach(function (it, i) {
      var li = document.createElement('li'); li.className = i === cur ? 'on' : '';
      var b = document.createElement('button'); b.type = 'button'; b.textContent = it.name; b.title = it.name;
      b.addEventListener('click', function () { show(i); });
      li.appendChild(b); ul.appendChild(li);
    });
    $('wp-listwrap').hidden = items.length < 2;
  }
  function ui() {
    var ok = cur >= 0 && items[cur] && items[cur].ok;
    $('wp-dl').disabled = !ok || busy; $('wp-print').disabled = !ok || busy; $('wp-rm').disabled = cur < 0;
    $('wp-all').hidden = items.filter(function (i) { return i.ok; }).length < 2;
    $('wp-box').hidden = cur < 0;
  }
  async function show(i) {
    cur = i; renderList(); ui();
    var it = items[i]; if (!it) { prev.innerHTML = ''; return; }
    say('מציג את ' + it.name + '…');
    try { await render(it, prev, $('wp-style')); it.ok = true; say('✓ כך ייראה ה-PDF. אפשר להוריד או להדפיס לקובץ.', 'ok'); }
    catch (e) { it.ok = false; prev.innerHTML = ''; say('לא הצלחתי לפתוח את הקובץ. ודאו שזה קובץ Word בסיומת docx שאינו מוגן בסיסמה.', 'warn'); }
    ui();
  }

  async function addFiles(fl) {
    var list = Array.prototype.slice.call(fl);
    var ok = list.filter(function (f) { return /\.docx$/i.test(f.name); });
    if (!ok.length) {
      say(list.some(function (f) { return /\.doc$/i.test(f.name); })
        ? 'קבצי doc ישנים לא נתמכים. פותחים אותם ב-Word, בוחרים "שמירה בשם" ו-docx, וחוזרים לכאן.'
        : 'בחרו קובץ Word בסיומת docx.', 'warn');
      return;
    }
    var first = items.length;
    ok.forEach(function (f) { items.push({ name: f.name, file: f, ok: false }); });
    used('add');
    await show(first);
  }

  // ---------- הורדה כ-PDF (כל עמוד כתמונה) ----------
  function save(b, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function base(n) { return n.replace(/\.docx$/i, ''); }
  async function makePdf(it, host) {
    await libsPdf();
    var pages = host.querySelectorAll('section.docx');
    if (!pages.length) throw new Error('nopages');
    var J = window.jspdf.jsPDF, pdf = null;
    for (var i = 0; i < pages.length; i++) {
      var el = pages[i], w = el.offsetWidth, h = el.offsetHeight;
      var wpt = w * 0.75, hpt = h * 0.75;
      var cv = await window.htmlToImage.toCanvas(el, { pixelRatio: 2, backgroundColor: '#ffffff', style: { margin: '0', boxShadow: 'none' } });
      var img = cv.toDataURL('image/jpeg', 0.92);
      if (!pdf) pdf = new J({ unit: 'pt', format: [wpt, hpt], orientation: wpt > hpt ? 'l' : 'p', compress: true });
      else pdf.addPage([wpt, hpt], wpt > hpt ? 'l' : 'p');
      pdf.addImage(img, 'JPEG', 0, 0, wpt, hpt, undefined, 'FAST');
      say('ממיר עמוד ' + (i + 1) + ' מתוך ' + pages.length + '…');
    }
    return pdf.output('blob');
  }
  async function download(it, host) {
    var b = await makePdf(it, host); save(b, base(it.name) + '.pdf');
  }
  $('wp-dl').addEventListener('click', async function () {
    var it = items[cur]; if (!it || !it.ok || busy) return; busy = true; ui();
    try { await download(it, prev); say('✓ הקובץ ירד. בדקו בתיקיית ההורדות.', 'ok'); used('download'); }
    catch (e) { say('ההמרה נכשלה בדפדפן הזה. נסו את "הדפסה / שמירה כ-PDF".', 'warn'); }
    busy = false; ui();
  });
  $('wp-all').addEventListener('click', async function () {
    if (busy) return; busy = true; ui();
    var d = items.filter(function (i) { return i.ok; }), tmp = document.createElement('div'), st = document.createElement('div');
    tmp.style.cssText = 'position:fixed;left:-99999px;top:0'; document.body.appendChild(tmp); document.body.appendChild(st);
    try {
      for (var i = 0; i < d.length; i++) { say('ממיר את ' + d[i].name + '…'); await render(d[i], tmp, st); await download(d[i], tmp); await new Promise(function (r) { setTimeout(r, 400); }); }
      say('✓ כל הקבצים ירדו.', 'ok'); used('download');
    } catch (e) { say('ההמרה נכשלה באחד הקבצים.', 'warn'); }
    tmp.remove(); st.remove(); busy = false; ui();
  });

  // ---------- הדפסה / שמירה כ-PDF (טקסט אמיתי) ----------
  $('wp-print').addEventListener('click', async function () {
    var it = items[cur]; if (!it || !it.ok || busy) return;
    var fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    var d = fr.contentDocument; d.open(); d.write('<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>' + base(it.name).replace(/[<&]/g, '') + '</title><style>@page{margin:0}body{margin:0;background:#fff}.docx-wrapper{background:#fff!important;padding:0!important}.docx-wrapper>section.docx{box-shadow:none!important;margin:0!important;page-break-after:always;break-after:page}</style></head><body><div id="h"></div><div id="s"></div></body></html>'); d.close();
    try {
      await libsView();
      await window.docx.renderAsync(it.file, d.getElementById('h'), d.getElementById('s'), { inWrapper: true, breakPages: true, useBase64URL: true, experimental: true });
      await new Promise(function (r) { setTimeout(r, 400); });
      fr.contentWindow.focus(); fr.contentWindow.print(); used('print');
      say('בחלון ההדפסה בוחרים יעד "שמירה כ-PDF" ולוחצים על שמירה.', 'ok');
    } catch (e) { say('לא הצלחתי לפתוח את חלון ההדפסה.', 'warn'); }
    setTimeout(function () { fr.remove(); }, 60000);
  });

  $('wp-rm').addEventListener('click', function () {
    if (cur < 0) return; items.splice(cur, 1); used('remove');
    if (items.length) show(Math.min(cur, items.length - 1)); else { cur = -1; prev.innerHTML = ''; say(''); renderList(); ui(); }
  });

  file.addEventListener('change', function () { if (file.files.length) addFiles(file.files); file.value = ''; });
  ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('on'); }); });
  ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('on'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  renderList(); ui();
})();
