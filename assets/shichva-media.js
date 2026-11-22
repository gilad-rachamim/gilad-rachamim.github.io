/* פורטל שכבה – יצירה: מחולל ממים, טריילר משיר קיים, עורך סרטון.
   פרטיות: תמונות וסרטונים נשארים בטלפון בלבד (לא עולים לשרת). לבינה נשלח רק טקסט. זיהוי פנים רק בדפדפן. */
(function () {
  'use strict';
  var SH = window.SH = window.SH || {};
  SH.creators = SH.creators || {};
  function esc(s) { return SH.esc ? SH.esc(s) : String(s); }
  function $(s, el) { return (el || document).querySelector(s); }
  function toast(t) { if (SH.toast) SH.toast(t); }
  var FONT = '"Assistant","Heebo","Arial Hebrew",Arial,sans-serif';

  /* ---------- רקעים ומדבקות ---------- */
  var BG = [
    ['#1f3b73', '#0d1a33'], ['#7a2e5c', '#2b0f22'], ['#0f5c4d', '#06241e'], ['#c0782b', '#4a2508'],
    ['#2c2c54', '#101020'], ['#8c1c13', '#2e0905'], ['#3e7cb1', '#0f2a40'], ['#5b4a2f', '#1e180d']
  ];
  var STICKERS = ['👑', '🎭', '🎉', '🥳', '😂', '🫠', '📜', '🍷', '⭐', '🤡', '📚', '🕯️', '🎓', '🏆'];

  function wrapLines(ctx, text, maxW) {
    var words = String(text || '').split(/\s+/).filter(Boolean), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    return lines;
  }
  function outlined(ctx, text, x, y, size) {
    ctx.font = '900 ' + size + 'px ' + FONT;
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size / 7);
    ctx.strokeStyle = '#000'; ctx.strokeText(text, x, y);
    ctx.fillStyle = '#fff'; ctx.fillText(text, x, y);
  }
  function captionBlock(ctx, text, W, yTop, maxH, fromBottom) {
    if (!text) return;
    var size = Math.round(W / 10), lines;
    for (; size > W / 28; size -= 2) {
      ctx.font = '900 ' + size + 'px ' + FONT;
      lines = wrapLines(ctx, text, W * 0.9);
      if (lines.length * size * 1.15 <= maxH) break;
    }
    ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.textBaseline = 'top';
    var h = lines.length * size * 1.15, y0 = fromBottom ? yTop + maxH - h : yTop;
    lines.forEach(function (l, i) { outlined(ctx, l, W / 2, y0 + i * size * 1.15, size); });
  }
  // ציור "חיתוך חכם": ממלא את המסגרת סביב נקודת המיקוד (הפנים), בזום נתון
  function coverDraw(ctx, img, dx, dy, W, H, focus, zoom, panX) {
    var iw = img.width, ih = img.height, f = focus || { x: 0.5, y: 0.38 };
    var s = Math.max(W / iw, H / ih) * (zoom || 1);
    var sw = W / s, sh = H / s;
    var sx = Math.min(Math.max(f.x * iw - sw / 2 + (panX || 0) * iw, 0), iw - sw);
    var sy = Math.min(Math.max(f.y * ih - sh / 2, 0), ih - sh);
    ctx.drawImage(img.el || img, sx, sy, sw, sh, dx, dy, W, H);
  }
  SH.memeCanvas = function (d, fmt, width, photo) {
    d = d || {};
    var W = 1080, H = fmt === 'story' ? 1920 : 1080;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var g = BG[(+d.bg || 0) % BG.length], gr = ctx.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, g[0]); gr.addColorStop(1, g[1]); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    if (photo) coverDraw(ctx, photo.img, 0, 0, W, H, photo.focus, 1);
    else {
      ctx.save(); ctx.globalAlpha = 0.12; ctx.font = (W * 0.42) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👑', W / 2, H / 2); ctx.restore();
    }
    (Array.isArray(d.stickers) ? d.stickers : []).slice(0, 12).forEach(function (s) {
      ctx.save(); ctx.font = Math.round(W * (s.s || 0.16)) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.e, s.x * W, s.y * H); ctx.restore();
    });
    var band = H * (fmt === 'story' ? 0.2 : 0.28);
    captionBlock(ctx, d.top, W, H * 0.03, band, false);
    captionBlock(ctx, d.bottom, W, H - band - H * 0.03, band, true);
    ctx.save(); ctx.globalAlpha = 0.55; ctx.font = '600 ' + Math.round(W / 40) + 'px ' + FONT; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('hakelim.com', W * 0.02, H - H * 0.008); ctx.restore();
    if (width) c.style.maxWidth = width + 'px';
    return c;
  };

  /* ---------- עזרי תמונות (נשארות בטלפון) ---------- */
  function loadImage(file, max) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, (max || 1600) / Math.max(im.width, im.height));
        var c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res({ img: c, url: c.toDataURL('image/jpeg', 0.6), focus: { x: 0.5, y: 0.38 } });
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('img')); };
      im.src = url;
    });
  }
  // זיהוי פנים בדפדפן בלבד (FaceDetector כשקיים); אחרת – מרכז-למעלה
  function findFocus(p) {
    if (!('FaceDetector' in window)) return Promise.resolve(p);
    try {
      return new window.FaceDetector({ fastMode: true, maxDetectedFaces: 10 }).detect(p.img).then(function (fs) {
        if (fs && fs.length) {
          var x = 0, y = 0; fs.forEach(function (f) { x += f.boundingBox.x + f.boundingBox.width / 2; y += f.boundingBox.y + f.boundingBox.height / 2; });
          p.focus = { x: x / fs.length / p.img.width, y: y / fs.length / p.img.height }; p.faces = fs.length;
        }
        return p;
      }).catch(function () { return p; });
    } catch (e) { return Promise.resolve(p); }
  }
  function download(blobOrCanvas, name) {
    var go = function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
    if (blobOrCanvas.toBlob) blobOrCanvas.toBlob(go, 'image/png'); else go(blobOrCanvas);
  }
  function recMime() {
    var o = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < o.length; i++) if (MediaRecorder.isTypeSupported(o[i])) return o[i];
    return '';
  }
  function saveBox(existing, kind) {
    return '<section class="sh-card"><h2>' + (existing ? 'שמירת השינויים' : 'שמירה בוועדה') + '</h2>' + (existing ? '' : SH.committeeSelect()) +
      '<label class="field">כותרת<input name="ptitle" maxlength="80" required value="' + esc(existing ? existing.title : '') + '"></label>' +
      (kind === 'meme' ? '<label class="sh-check"><input type="checkbox" name="staff"' + (existing && existing.about_staff ? ' checked' : '') + '> המם על איש צוות (יעבור אוטומטית לאישור המלווה)</label>' : '') +
      '<p class="msg">נשמר כטיוטה בוועדה. ' + (kind === 'meme' ? 'התמונה עצמה לא נשמרת בשרת – רק הכיתובים, הרקע והמדבקות.' : 'הקבצים עצמם נשארים בטלפון שלך – בשרת נשמר רק הטקסט.') + '</p>' +
      '<button type="button" class="btn btn-gold" data-save>שמירה</button></section>';
  }
  function wireSave(root, existing, kind, collect) {
    var b = root.querySelector('[data-save]'); if (!b) return;
    b.onclick = function () {
      var t = root.querySelector('[name=ptitle]').value.trim(); if (!t) { toast('חסרה כותרת'); return; }
      var cs = root.querySelector('[name=committee_id]');
      if (!existing && !cs) { toast('צריך להיות בוועדה כדי לשמור'); return; }
      var o = collect(); o.title = t; o.kind = kind;
      if (!existing) o.committee_id = cs.value;
      var st = root.querySelector('[name=staff]'); if (st) o.about_staff = st.checked;
      b.disabled = true;
      SH.saveProduct(o, existing).then(function () { SH.go('vaadot:' + (existing ? existing.committee_id : o.committee_id)); }).catch(function (e) { b.disabled = false; toast(SH.err(e)); });
    };
  }

  /* ================= מחולל ממים ================= */
  SH.creators.meme = function (root, existing) {
    var d = existing && existing.data ? JSON.parse(JSON.stringify(existing.data)) : { top: '', bottom: '', bg: 0, stickers: [] };
    if (!Array.isArray(d.stickers)) d.stickers = [];
    var fmt = 'sq', photo = null, light = null;
    root.innerHTML = '<section class="sh-card"><h2>מחולל ממים</h2><p class="msg">צוחקים על תופעות, לא על אנשים. תמונה מהטלפון נשארת בטלפון.</p>' +
      '<div class="sh-stage"><canvas id="mmC" aria-label="תצוגת המם"></canvas></div>' +
      '<div class="sh-row"><button type="button" class="btn btn-sm btn-line" data-fmt="sq" aria-pressed="true">ריבוע</button><button type="button" class="btn btn-sm btn-line" data-fmt="story" aria-pressed="false">סטורי</button>' +
      '<label class="btn btn-sm btn-line">תמונה מהטלפון<input type="file" accept="image/*" id="mmPh" hidden></label><button type="button" class="btn btn-sm btn-line" id="mmNoPh" hidden>בלי תמונה</button></div>' +
      '<label class="field">כיתוב עליון<input id="mmTop" maxlength="90"></label><label class="field">כיתוב תחתון<input id="mmBot" maxlength="90"></label>' +
      '<p class="msg">רקע:</p><div class="sh-pal" id="mmPal">' + BG.map(function (g, i) { return '<button type="button" aria-label="רקע ' + (i + 1) + '" data-bg="' + i + '" style="background:linear-gradient(135deg,' + g[0] + ',' + g[1] + ')"></button>'; }).join('') + '</div>' +
      '<p class="msg">מדבקות של אדר (לחיצה מוסיפה, גוררים על המם):</p><div class="sh-row sh-stk">' + STICKERS.map(function (e) { return '<button type="button" data-stk="' + e + '">' + e + '</button>'; }).join('') + '<button type="button" class="btn btn-sm btn-line" id="mmClr">ניקוי מדבקות</button></div>' +
      '<div class="sh-row"><button type="button" class="btn btn-sm btn-gold" id="mmDl">הורדה כתמונה</button></div></section>' +
      '<section class="sh-card" id="mmGimBox"></section>' +
      '<section class="sh-card"><h2>5 כיתובים מהגבאי</h2><p class="msg">מתארים במילים מה רואים בתמונה (התמונה עצמה לא נשלחת).</p><label class="field">מה בתמונה<input id="mmDesc" maxlength="200" placeholder="תלמיד נרדם על הגמרא בשיעור בוקר"></label>' +
      '<label class="sh-check"><input type="checkbox" id="mmStaff"> יש בתמונה איש צוות</label><button type="button" class="btn btn-line" id="mmAi">לקבל 5 כיתובים</button><div class="sh-caps" id="mmCaps"></div><div id="mmLight"></div></section>' +
      saveBox(existing, 'meme');
    var cv = $('#mmC', root), T = $('#mmTop', root), Bt = $('#mmBot', root);
    T.value = d.top || ''; Bt.value = d.bottom || '';
    function paint() {
      var c = SH.memeCanvas(d, fmt, 0, photo);
      cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0);
      root.querySelectorAll('[data-bg]').forEach(function (b) { b.setAttribute('aria-pressed', +b.getAttribute('data-bg') === (+d.bg || 0)); });
      root.querySelectorAll('[data-fmt]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-fmt') === fmt); });
      $('#mmLight', root).innerHTML = light ? SH.lightHtml(light.light, light.why) : '';
    }
    T.oninput = function () { d.top = T.value; paint(); };
    if (SH.gimBox) SH.gimBox($('#mmGimBox', root), { title: 'גימטריות למם', hint: 'המם הכי חזק כשהמספר מפתיע: למעלה המילה, למטה "בגימטריא" והצירוף. לוחצים על הצעה והיא נכנסת לכיתובים.', seed: function () { return T.value.split(/\s+/).slice(-1)[0]; },
      insert: function (h, ln, sd) { d.top = T.value = SH.gim.parse(sd).join(' ') + ' = ' + SH.gim.value(sd); d.bottom = Bt.value = 'בגימטריא ' + h.t + (h.k ? ' (עם הכולל)' : ''); paint(); toast('נכנס לכיתובים. אפשר לתקן'); } });
    Bt.oninput = function () { d.bottom = Bt.value; paint(); };
    root.querySelectorAll('[data-bg]').forEach(function (b) { b.onclick = function () { d.bg = +b.getAttribute('data-bg'); paint(); }; });
    root.querySelectorAll('[data-fmt]').forEach(function (b) { b.onclick = function () { fmt = b.getAttribute('data-fmt'); paint(); }; });
    root.querySelectorAll('[data-stk]').forEach(function (b) { b.onclick = function () { if (d.stickers.length >= 12) return toast('עד 12 מדבקות'); d.stickers.push({ e: b.getAttribute('data-stk'), x: 0.5 + (Math.random() - 0.5) * 0.3, y: 0.5 + (Math.random() - 0.5) * 0.2, s: 0.16 }); paint(); }; });
    $('#mmClr', root).onclick = function () { d.stickers = []; paint(); };
    $('#mmPh', root).onchange = function (e) { var f = e.target.files[0]; if (!f) return; loadImage(f, 1600).then(findFocus).then(function (p) { photo = p; $('#mmNoPh', root).hidden = false; paint(); }).catch(function () { toast('לא הצלחתי לפתוח את התמונה'); }); };
    $('#mmNoPh', root).onclick = function () { photo = null; this.hidden = true; paint(); };
    $('#mmDl', root).onclick = function () { download(SH.memeCanvas(d, fmt, 0, photo), 'mem-hachtara.png'); };
    // גרירת מדבקות
    var drag = -1;
    function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
    cv.addEventListener('pointerdown', function (e) {
      var p = pt(e), best = -1, bd = 0.09;
      d.stickers.forEach(function (s, i) { var dd = Math.hypot(s.x - p.x, (s.y - p.y) * cv.height / cv.width); if (dd < bd) { bd = dd; best = i; } });
      drag = best; if (best >= 0) cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', function (e) { if (drag < 0) return; var p = pt(e); d.stickers[drag].x = Math.min(Math.max(p.x, 0), 1); d.stickers[drag].y = Math.min(Math.max(p.y, 0), 1); paint(); });
    cv.addEventListener('pointerup', function () { drag = -1; });
    $('#mmAi', root).onclick = function () {
      var b = this, desc = $('#mmDesc', root).value.trim(); if (!desc) { toast('צריך לתאר מה בתמונה'); return; }
      b.disabled = true; $('#mmCaps', root).innerHTML = '<p class="msg">הגבאי חושב…</p>';
      SH.api('/ai', { task: 'captions', desc: desc, about_staff: $('#mmStaff', root).checked }).then(function (r) {
        var cs = r.captions || [];
        $('#mmCaps', root).innerHTML = cs.map(function (c, i) { return '<button type="button" class="btn btn-sm btn-line" data-cap="' + i + '"><b>' + esc(c.top) + '</b><br>' + esc(c.bottom) + '<br>' + SH.lightHtml(c.light, c.why) + '</button>'; }).join('');
        $('#mmCaps', root).querySelectorAll('[data-cap]').forEach(function (x) { x.onclick = function () { var c = cs[+x.getAttribute('data-cap')]; d.top = T.value = c.top || ''; d.bottom = Bt.value = c.bottom || ''; light = { light: c.light, why: c.why }; if ($('#mmStaff', root).checked) { var s = root.querySelector('[name=staff]'); if (s) s.checked = true; } paint(); window.scrollTo({ top: root.offsetTop, behavior: 'smooth' }); }; });
      }).catch(function (e) { $('#mmCaps', root).innerHTML = '<p class="msg sh-err">' + esc(SH.err(e)) + '</p>'; }).then(function () { b.disabled = false; });
    };
    wireSave(root, existing, 'meme', function () { return { data: { top: d.top, bottom: d.bottom, bg: +d.bg || 0, stickers: d.stickers }, light: light, body: '' }; });
    paint();
  };

  /* ================= טריילר משיר קיים ================= */
  function sylEst(t) { var l = String(t || '').replace(/[^א-תa-zA-Z]/g, '').length; return l ? Math.max(1, Math.round(l / 2.2)) : 0; }
  SH.creators.trailer = function (root, existing) {
    var d = existing && existing.data ? JSON.parse(JSON.stringify(existing.data)) : {};
    var lines = Array.isArray(d.lines) ? d.lines : [], light = null, media = null, mediaKind = '', tapI = -1;
    root.innerHTML = '<section class="sh-card"><h2>טריילר משיר קיים</h2><p class="sh-warn">לשימוש פנימי בערב ההכתרה. לפני העלאה לרשת – לבדוק זכויות על השיר.</p>' +
      '<label class="field">שם השיר (לא חובה)<input id="trSong" maxlength="80"></label>' +
      '<label class="field">מילות השיר המקורי (מדביקים)<textarea id="trLy" rows="6" maxlength="3000" placeholder="שורה בכל שורה"></textarea></label>' +
      '<label class="field">על מה הפרודיה<input id="trTopic" maxlength="120" placeholder="ארבע שנים בשכבה, השבתות, הטיול השנתי"></label>' +
      '<button type="button" class="btn btn-gold" id="trGo">לכתוב פרודיה שורה מול שורה</button><div id="trLight"></div></section>' +
      '<section class="sh-card"><h2>השורות</h2><p class="msg">אפשר לתקן כל שורה ביד, או לבקש "עוד גרסה". מספר ההברות עוזר שיישב על המנגינה.</p><div id="trLines"></div></section>' +
      '<section class="sh-card"><h2>כתוביות על הסרטון או השיר</h2><p class="msg">בוחרים קובץ מהטלפון (השיר או סרטון). הוא לא עולה לשום מקום.</p>' +
      '<label class="btn btn-sm btn-line">בחירת קובץ<input type="file" accept="audio/*,video/*" id="trFile" hidden></label>' +
      '<div class="sh-stage"><canvas id="trC" width="720" height="1280" hidden></canvas></div>' +
      '<div id="trCtl" hidden><p class="msg">סנכרון: לוחצים "התחלה", ובכל פעם שמתחילה שורה – לוחצים על הכפתור הגדול.</p><div class="sh-row"><button type="button" class="btn btn-sm btn-line" id="trSync">התחלה (סנכרון)</button><button type="button" class="btn btn-sm btn-line" id="trPlay">תצוגה מקדימה</button><button type="button" class="btn btn-sm btn-gold" id="trRec">יצירת סרטון והורדה</button></div><button type="button" class="btn btn-gold sh-tap" id="trTap" hidden>השורה הבאה</button><p class="msg" id="trSt"></p></div></section>' +
      saveBox(existing, 'trailer');
    $('#trSong', root).value = d.song || ''; $('#trTopic', root).value = d.topic || '';
    if (lines.length) $('#trLy', root).value = lines.map(function (l) { return l.orig; }).join('\n');
    function paintLines() {
      $('#trLight', root).innerHTML = light ? SH.lightHtml(light.light, light.why) : '';
      if (!lines.length) { $('#trLines', root).innerHTML = '<p class="msg">עוד אין שורות.</p>'; return; }
      $('#trLines', root).innerHTML = lines.map(function (l, i) {
        var so = l.syl_orig || sylEst(l.orig), sn = sylEst(l.new);
        return '<div class="sh-tline"><span class="sh-orig">' + (i + 1) + '. ' + esc(l.orig) + ' <small>(~' + so + ' הברות)</small></span><input data-ln="' + i + '" value="' + esc(l.new) + '" maxlength="120" aria-label="שורה ' + (i + 1) + '">' +
          '<div class="sh-row"><span class="sh-syl' + (Math.abs(so - sn) > 2 ? ' bad' : '') + '">~' + sn + ' הברות' + (Math.abs(so - sn) > 2 ? ' – כדאי לקצר או להאריך' : '') + '</span>' + (l.t != null ? '<small>⏱ ' + l.t.toFixed(1) + ' ש\'</small>' : '') + '<button type="button" class="btn btn-sm btn-line" data-alt="' + i + '">עוד גרסה</button></div></div>';
      }).join('');
      $('#trLines', root).querySelectorAll('[data-ln]').forEach(function (x) { x.onchange = function () { lines[+x.getAttribute('data-ln')].new = x.value; paintLines(); }; });
      $('#trLines', root).querySelectorAll('[data-alt]').forEach(function (x) {
        x.onclick = function () {
          var i = +x.getAttribute('data-alt'); x.disabled = true; x.textContent = 'חושב…';
          SH.api('/ai', { task: 'line', orig: lines[i].orig, prev: (lines[i - 1] || {}).new || '', next: (lines[i + 1] || {}).new || '', current: lines[i].new, topic: $('#trTopic', root).value }).then(function (r) { lines[i].new = r.new; light = { light: r.light, why: r.why }; paintLines(); })
            .catch(function (e) { toast(SH.err(e)); x.disabled = false; x.textContent = 'עוד גרסה'; });
        };
      });
    }
    $('#trGo', root).onclick = function () {
      var b = this, ly = $('#trLy', root).value.trim(); if (!ly) { toast('צריך להדביק מילים'); return; }
      b.disabled = true; $('#trLines', root).innerHTML = '<p class="msg">הגבאי כותב…</p>';
      SH.api('/ai', { task: 'parody', lyrics: ly, topic: $('#trTopic', root).value.trim() }).then(function (r) { lines = r.lines || []; light = { light: r.light, why: r.why }; paintLines(); })
        .catch(function (e) { $('#trLines', root).innerHTML = '<p class="msg sh-err">' + esc(SH.err(e)) + '</p>'; }).then(function () { b.disabled = false; });
    };
    // קובץ, סנכרון, כתוביות
    var cv = $('#trC', root), ctx = cv.getContext('2d'), raf = 0;
    function curLine(t) { var c = -1; lines.forEach(function (l, i) { if (l.t != null && t >= l.t) c = i; }); return c; }
    function frame() {
      var W = cv.width, H = cv.height;
      if (mediaKind === 'video' && media.videoWidth) coverDraw(ctx, { width: media.videoWidth, height: media.videoHeight, el: media }, 0, 0, W, H, { x: 0.5, y: 0.5 }, 1);
      else { var gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#1f3b73'); gr.addColorStop(1, '#2b0f22'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 0.15; ctx.font = (W * 0.4) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👑', W / 2, H * 0.4); ctx.globalAlpha = 1; }
      var i = curLine(media.currentTime);
      if (i >= 0) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, H * 0.7, W, H * 0.24); captionBlock(ctx, lines[i].new, W, H * 0.72, H * 0.2, false); }
      if (!media.paused && !media.ended) raf = requestAnimationFrame(frame);
    }
    $('#trFile', root).onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      if (media) { media.pause(); URL.revokeObjectURL(media.src); }
      mediaKind = /^video/.test(f.type) ? 'video' : 'audio';
      media = document.createElement(mediaKind); media.src = URL.createObjectURL(f); media.playsInline = true; media.preload = 'auto';
      media.onloadedmetadata = function () { if (mediaKind === 'video' && media.videoWidth > media.videoHeight) { cv.width = 1280; cv.height = 720; } else { cv.width = 720; cv.height = 1280; } cv.hidden = false; $('#trCtl', root).hidden = false; frame(); };
      media.onplay = function () { cancelAnimationFrame(raf); frame(); };
      media.onended = function () { $('#trTap', root).hidden = true; tapI = -1; paintLines(); };
    };
    $('#trSync', root).onclick = function () {
      if (!lines.length) { toast('קודם כותבים את השורות'); return; }
      lines.forEach(function (l) { delete l.t; }); tapI = 0; media.currentTime = 0; media.play();
      var tb = $('#trTap', root); tb.hidden = false; tb.textContent = 'שורה 1: ' + lines[0].new;
      tb.onclick = function () { if (tapI < 0 || tapI >= lines.length) return; lines[tapI].t = media.currentTime; tapI++; if (tapI >= lines.length) { tb.hidden = true; toast('הסנכרון מוכן'); paintLines(); } else tb.textContent = 'שורה ' + (tapI + 1) + ': ' + lines[tapI].new; };
    };
    $('#trPlay', root).onclick = function () { $('#trTap', root).hidden = true; tapI = -1; media.currentTime = 0; media.play(); };
    $('#trRec', root).onclick = function () {
      var b = this, mime = recMime();
      if (mime === null || !cv.captureStream) { toast('הדפדפן הזה לא יודע להקליט סרטון. אפשר לנסות בכרום.'); return; }
      if (!lines.some(function (l) { return l.t != null; })) { toast('קודם עושים סנכרון'); return; }
      b.disabled = true; $('#trSt', root).textContent = 'מקליט… (זה לוקח בדיוק את אורך השיר)';
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      var src = media._src || (media._src = ac.createMediaElementSource(media)), dest = ac.createMediaStreamDestination();
      try { src.connect(dest); src.connect(ac.destination); } catch (e) { }
      var stream = new MediaStream(cv.captureStream(30).getVideoTracks().concat(dest.stream.getAudioTracks()));
      var rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3e6 } : undefined), chunks = [];
      rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      rec.onstop = function () { var type = rec.mimeType || 'video/webm'; download(new Blob(chunks, { type: type }), 'trailer-hachtara.' + (/mp4/.test(type) ? 'mp4' : 'webm')); b.disabled = false; $('#trSt', root).textContent = 'הסרטון ירד לטלפון.'; };
      media.currentTime = 0; rec.start(500); media.play();
      media.addEventListener('ended', function stop() { media.removeEventListener('ended', stop); setTimeout(function () { rec.stop(); }, 300); });
    };
    wireSave(root, existing, 'trailer', function () { return { body: '', light: light, data: { song: $('#trSong', root).value.trim(), topic: $('#trTopic', root).value.trim(), lines: lines.map(function (l) { return { orig: l.orig, new: l.new, t: l.t }; }) } }; });
    paintLines();
  };

  /* ================= עורך סרטון ================= */
  var TPL = {
    'טריילר': { words: 'טריילר מצחיק ומרגש לערב ההכתרה, קצב מהיר, סיום מרגש', sec: 40 },
    'מט\' עד י"ב': { words: 'מסע בזמן מכיתה ט\' עד י"ב, לפי הסדר, סיום עם כל השכבה', sec: 90 },
    'קליפ פנים': { words: 'קליפ מהיר של פנים מחייכות, כל תמונה שנייה, אנרגיה גבוהה', sec: 45 },
    'תודה לצוות': { words: 'סרטון תודה מכבד לצוות ולר"מים, קצב איטי, כיתובים של הוקרה', sec: 60 }
  };
  SH.creators.video = function (root, existing) {
    var S = SH.state(), d = existing && existing.data ? existing.data : {};
    var photos = [], scenes = Array.isArray(d.scenes) ? d.scenes : [], title = d.title || '', light = null, seen = {};
    var names = (S.members || []).filter(function (m) { return m.role !== 'melave'; }).map(function (m) { return m.name; });
    root.innerHTML = '<section class="sh-card"><h2>עורך סרטון</h2><p class="msg">בוחרים תמונות מהטלפון. הן לא עולות לשום מקום – הסרטון נוצר כאן בטלפון ויורד אליו. הפנים במרכז המסגרת (זיהוי בדפדפן בלבד).</p>' +
      '<label class="btn btn-sm btn-gold">בחירת תמונות<input type="file" accept="image/*" multiple id="vdF" hidden></label> <span class="msg" id="vdN"></span>' +
      '<div class="sh-thumbs" id="vdT"></div></section>' +
      (names.length ? '<section class="sh-card"><h2>מי עוד לא מופיע</h2><p class="msg">מסמנים מי כבר מופיע בתמונות, כדי שאף אחד לא יישכח.</p><p class="sh-cur" id="vdMiss"></p><div class="sh-chips" id="vdChips">' + names.map(function (n) { return '<button type="button" data-nm="' + esc(n) + '" aria-pressed="false">' + esc(n) + '</button>'; }).join('') + '</div></section>' : '') +
      '<section class="sh-card"><h2>תבנית ותסריט</h2><div class="sh-sub">' + Object.keys(TPL).map(function (k, i) { return '<button type="button" data-tpl="' + esc(k) + '" aria-selected="' + (k === (d.template || 'טריילר')) + '">' + esc(k) + '</button>'; }).join('') + '</div>' +
      '<label class="field">מה רוצים בסרטון<textarea id="vdW" rows="2" maxlength="300"></textarea></label><label class="field">אורך בשניות<input id="vdS" type="number" min="10" max="300"></label>' +
      '<div class="sh-row"><label class="sh-check"><input type="radio" name="vdO" value="v" checked> לאורך (טלפון)</label><label class="sh-check"><input type="radio" name="vdO" value="h"> לרוחב (מקרן)</label></div>' +
      '<label class="btn btn-sm btn-line">מוזיקת רקע מהטלפון (לא חובה)<input type="file" accept="audio/*" id="vdM" hidden></label> <span class="msg" id="vdMn"></span>' +
      '<div class="sh-row"><button type="button" class="btn btn-gold" id="vdAi">תסריט עריכה מהגבאי</button><button type="button" class="btn btn-line" id="vdLoc">סידור פשוט בלי גבאי</button></div><div id="vdLight"></div><ol class="sh-lines" id="vdSc"></ol>' +
      '<div class="sh-stage"><canvas id="vdC" hidden></canvas></div><div class="sh-row"><button type="button" class="btn btn-line" id="vdPrev">תצוגה מקדימה</button><button type="button" class="btn btn-gold" id="vdRec">יצירת הסרטון והורדה</button></div><p class="msg" id="vdSt"></p></section>' +
      saveBox(existing, 'video');
    var tpl = 'טריילר', music = null;
    function setTpl(k) { tpl = k; $('#vdW', root).value = TPL[k].words; $('#vdS', root).value = TPL[k].sec; root.querySelectorAll('[data-tpl]').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tpl') === k); }); }
    setTpl(TPL[d.template] ? d.template : 'טריילר');
    root.querySelectorAll('[data-tpl]').forEach(function (b) { b.onclick = function () { setTpl(b.getAttribute('data-tpl')); }; });
    function missing() {
      if (!names.length) return;
      photos.forEach(function (p) { names.forEach(function (n) { if (p.note && p.note.indexOf(n.split(' ')[0]) >= 0) seen[n] = 1; }); });
      var miss = names.filter(function (n) { return !seen[n]; });
      $('#vdMiss', root).textContent = miss.length ? 'עוד לא מופיעים: ' + miss.length + ' מתוך ' + names.length : 'כולם מופיעים! 🎉';
      root.querySelectorAll('[data-nm]').forEach(function (b) { b.setAttribute('aria-pressed', !!seen[b.getAttribute('data-nm')]); });
    }
    root.querySelectorAll('[data-nm]').forEach(function (b) { b.onclick = function () { var n = b.getAttribute('data-nm'); seen[n] = !seen[n]; missing(); }; });
    function thumbs() {
      $('#vdN', root).textContent = photos.length ? photos.length + ' תמונות' : '';
      $('#vdT', root).innerHTML = photos.map(function (p, i) { return '<figure><img src="' + p.url + '" alt="תמונה ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="הסרה">✕</button><input data-note="' + i + '" maxlength="60" placeholder="מה בתמונה? מי?" value="' + esc(p.note || '') + '"></figure>'; }).join('');
      $('#vdT', root).querySelectorAll('[data-note]').forEach(function (x) { x.onchange = function () { photos[+x.getAttribute('data-note')].note = x.value.trim(); missing(); }; });
      $('#vdT', root).querySelectorAll('[data-rm]').forEach(function (x) { x.onclick = function () { photos.splice(+x.getAttribute('data-rm'), 1); scenes = scenes.filter(function (s) { return s.photo < photos.length; }); thumbs(); }; });
      missing();
    }
    $('#vdF', root).onchange = function (e) {
      var fs = [].slice.call(e.target.files, 0, 120 - photos.length); if (!fs.length) return;
      $('#vdN', root).textContent = 'טוען ' + fs.length + ' תמונות…';
      fs.reduce(function (pr, f) { return pr.then(function () { return loadImage(f, 1400).then(findFocus).then(function (p) { p.note = ''; photos.push(p); }).catch(function () { }); }); }, Promise.resolve()).then(thumbs);
    };
    $('#vdM', root).onchange = function (e) { var f = e.target.files[0]; if (!f) return; music = URL.createObjectURL(f); $('#vdMn', root).textContent = f.name; };
    function paintScenes() {
      $('#vdLight', root).innerHTML = (title ? '<p class="msg">כותרת: <b>' + esc(title) + '</b></p>' : '') + (light ? SH.lightHtml(light.light, light.why) : '');
      $('#vdSc', root).innerHTML = scenes.map(function (s, i) { return '<li>' + (s.photo >= 0 && photos[s.photo] ? '<img src="' + photos[s.photo].url + '" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-inline-end:.4rem">' : '(כרטיס כיתוב) ') + '<input data-cap="' + i + '" value="' + esc(s.caption || '') + '" maxlength="80" aria-label="כיתוב סצנה ' + (i + 1) + '" style="width:60%"> · ' + s.dur + ' ש\'</li>'; }).join('');
      $('#vdSc', root).querySelectorAll('[data-cap]').forEach(function (x) { x.onchange = function () { scenes[+x.getAttribute('data-cap')].caption = x.value; }; });
    }
    var FX = ['zoom', 'pan', 'fade', 'slide'];
    $('#vdLoc', root).onclick = function () {
      if (!photos.length) { toast('קודם בוחרים תמונות'); return; }
      var sec = +$('#vdS', root).value || 40, dur = Math.max(1, Math.min(6, Math.round(sec / photos.length * 10) / 10));
      scenes = photos.map(function (p, i) { return { photo: i, caption: p.note || '', dur: dur, fx: FX[i % 4] }; });
      title = title || 'ההכתרה שלנו'; paintScenes();
    };
    $('#vdAi', root).onclick = function () {
      if (!photos.length) { toast('קודם בוחרים תמונות'); return; }
      var b = this; b.disabled = true; $('#vdSc', root).innerHTML = '<li>הגבאי עורך…</li>';
      SH.api('/ai', { task: 'edit', template: tpl, words: $('#vdW', root).value, seconds: +$('#vdS', root).value || 40, photos: photos.map(function (p) { return { note: p.note || '' }; }) })
        .then(function (r) { scenes = r.scenes; title = r.title || title; light = { light: r.light, why: r.why }; paintScenes(); })
        .catch(function (e) { toast(SH.err(e) + ' בינתיים: סידור פשוט.'); $('#vdLoc', root).onclick(); })
        .then(function () { b.disabled = false; });
    };
    // ציור הסרטון
    var cv = $('#vdC', root), ctx = cv.getContext('2d');
    function size() { var h = root.querySelector('[name=vdO]:checked').value === 'h'; cv.width = h ? 1280 : 720; cv.height = h ? 720 : 1280; }
    function timeline() { var t = 2.5, out = [{ card: title || 'ההכתרה', t0: 0, dur: 2.5 }]; scenes.forEach(function (s) { out.push({ s: s, t0: t, dur: s.dur }); t += s.dur; }); return { items: out, total: t }; }
    function drawAt(T, tl) {
      var W = cv.width, H = cv.height, it = null;
      for (var i = 0; i < tl.items.length; i++) if (T >= tl.items[i].t0 && T < tl.items[i].t0 + tl.items[i].dur) { it = tl.items[i]; break; }
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (!it) return;
      var k = (T - it.t0) / it.dur;
      if (it.card) { var gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#16130f'); gr.addColorStop(1, '#3a2e14'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = Math.min(1, k * 3); captionBlock(ctx, it.card, W, H * 0.38, H * 0.24, false); ctx.globalAlpha = 1; return; }
      var s = it.s, p = photos[s.photo];
      if (p) {
        var z = 1, pan = 0, a = 1, off = 0;
        if (s.fx === 'zoom') z = 1 + 0.12 * k; else if (s.fx === 'pan') { z = 1.12; pan = (k - 0.5) * 0.08; } else if (s.fx === 'fade') a = Math.min(1, k * 4, (1 - k) * 4 + 0.001); else if (s.fx === 'slide') off = Math.max(0, 1 - k * 4) * W;
        ctx.globalAlpha = a; coverDraw(ctx, p.img, -off, 0, W, H, p.focus, z, pan); ctx.globalAlpha = 1;
      } else { ctx.fillStyle = '#16130f'; ctx.fillRect(0, 0, W, H); }
      if (s.caption) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, H * 0.78, W, H * 0.18); captionBlock(ctx, s.caption, W, H * 0.8, H * 0.14, false); }
    }
    function run(record) {
      if (!scenes.length) { toast('קודם מכינים תסריט'); return; }
      size(); cv.hidden = false;
      var tl = timeline(), mime = recMime(), rec = null, chunks = [], au = null, ac = null;
      if (record) {
        if (mime === null || !cv.captureStream) { toast('הדפדפן הזה לא יודע להקליט סרטון. אפשר לנסות בכרום.'); return; }
        var tracks = cv.captureStream(30).getVideoTracks();
        if (music) { au = new Audio(music); ac = new (window.AudioContext || window.webkitAudioContext)(); var src = ac.createMediaElementSource(au), dest = ac.createMediaStreamDestination(); src.connect(dest); src.connect(ac.destination); tracks = tracks.concat(dest.stream.getAudioTracks()); }
        rec = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined);
        rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        rec.onstop = function () { var type = rec.mimeType || 'video/webm'; download(new Blob(chunks, { type: type }), 'sirton-hachtara.' + (/mp4/.test(type) ? 'mp4' : 'webm')); $('#vdSt', root).textContent = 'הסרטון ירד לטלפון.'; if (ac) ac.close(); };
        rec.start(500); $('#vdSt', root).textContent = 'מקליט… ' + Math.round(tl.total) + ' שניות. לא לסגור את המסך.';
      } else if (music) { au = new Audio(music); }
      if (au) au.play().catch(function () { });
      var t0 = performance.now();
      (function loop() {
        var T = (performance.now() - t0) / 1000;
        drawAt(T, tl);
        if (T < tl.total) requestAnimationFrame(loop);
        else { if (au) au.pause(); if (rec) setTimeout(function () { rec.stop(); }, 200); }
      })();
    }
    $('#vdPrev', root).onclick = function () { run(false); };
    $('#vdRec', root).onclick = function () { run(true); };
    wireSave(root, existing, 'video', function () { return { body: '', light: light, data: { template: tpl, title: title, scenes: scenes.map(function (s) { return { photo: s.photo, caption: s.caption, dur: s.dur, fx: s.fx }; }) } }; });
    if (scenes.length) paintScenes();
  };
})();
