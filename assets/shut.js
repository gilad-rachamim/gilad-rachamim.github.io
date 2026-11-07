// R7 – שו"ת לפרסום: שאלה ותשובה → תמונה מעוצבת לווטסאפ ולסטטוס (כלי קודש). הכול בקנבס בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('sh-form'), cv = $('sh-canvas');
  if (!form || !cv) return;
  var ctx = cv.getContext('2d');
  var THEMES = {
    night: { bg1: '#0e1628', bg2: '#1b2a4a', frame: '#d4b062', title: '#e6c57e', q: '#fbfaf4', a: '#d3d9e6', label: '#d4b062', foot: '#9aa6bf' },
    parch: { bg1: '#f6efdd', bg2: '#ead9b4', frame: '#8a6a2a', title: '#6b4f1a', q: '#1f1a14', a: '#3a3226', label: '#8a6a2a', foot: '#6b5d45' },
    black: { bg1: '#16130f', bg2: '#2a2219', frame: '#c9a55c', title: '#dcbb74', q: '#fbf5e7', a: '#d9cfbb', label: '#c9a55c', foot: '#a99c82' }
  };
  var SIZES = { square: [1080, 1080], story: [1080, 1920], wide: [1200, 900] };
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif', SANS = '"Assistant", Arial, sans-serif';

  function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; }
  function wrap(text, font, maxW) {
    ctx.font = font;
    var out = [];
    text.split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { out.push(''); return; }
      words.forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      });
      out.push(line);
    });
    return out;
  }

  function draw() {
    var th = THEMES[val('theme')] || THEMES.night, sz = SIZES[val('size')] || SIZES.square, W = sz[0], H = sz[1];
    cv.width = W; cv.height = H;
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var M = 60;
    ctx.strokeStyle = th.frame; ctx.lineWidth = 3; ctx.strokeRect(M / 2, M / 2, W - M, H - M);
    ctx.lineWidth = 1; ctx.strokeRect(M / 2 + 10, M / 2 + 10, W - M - 20, H - M - 20);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var x = W - M - 40, maxW = W - 2 * M - 80, num = val('num');
    // כותרת
    ctx.textAlign = 'right'; ctx.fillStyle = th.label; ctx.font = '600 28px ' + SANS;
    ctx.fillText('בס"ד', W - M - 20, M + 45);
    ctx.textAlign = 'center';
    ctx.fillStyle = th.title; ctx.font = '700 54px ' + SERIF;
    var head = val('head') || 'שאלה ותשובה';
    ctx.fillText(num ? head + ' · ' + num : head, W / 2, M + 120);
    ctx.fillStyle = th.frame; ctx.fillRect(W / 2 - 70, M + 145, 140, 3);
    // גוף: מקטינים את הגופן עד שהכול נכנס
    var q = val('q') || $('sh-q').placeholder, a = val('a') || $('sh-a').placeholder, sig = val('sig'), top = M + 210, bottom = H - M - (sig ? 150 : 90);
    var fs = 46, ql, al, lh;
    for (; fs >= 22; fs -= 2) {
      lh = Math.round(fs * 1.5);
      ql = wrap(q, '600 ' + fs + 'px ' + SANS, maxW - 10);
      al = wrap(a, '400 ' + fs + 'px ' + SANS, maxW - 10);
      var need = (ql.length + al.length) * lh + 2 * (fs + 30) + 40;
      if (top + need <= bottom) break;
    }
    var y = top + (bottom - top - ((ql.length + al.length) * lh + 2 * (fs + 30) + 40)) / 2;
    ctx.textAlign = 'right';
    function block(label, lines, color, weight) {
      ctx.fillStyle = th.label; ctx.font = '700 ' + (fs + 2) + 'px ' + SERIF; ctx.fillText(label, x, y + fs); y += fs + 30;
      ctx.fillStyle = color; ctx.font = weight + ' ' + fs + 'px ' + SANS;
      lines.forEach(function (l) { ctx.fillText(l, x, y + fs * 0.9); y += lh; });
    }
    if (q) { block('שאלה:', ql, th.q, '600'); y += 40; }
    if (a) block('תשובה:', al, th.a, '400');
    // חתימה
    ctx.textAlign = 'center';
    if (sig) { ctx.fillStyle = th.title; ctx.font = '700 40px ' + SERIF; ctx.fillText(sig, W / 2, H - M - 80); }
    ctx.fillStyle = th.foot; ctx.font = '400 22px ' + SANS;
    ctx.fillText(val('foot') || 'נוצר בחינם בכלי קודש', W / 2, H - M - 30);
  }

  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('400 40px "Assistant"'), document.fonts.load('600 40px "Assistant"')]).catch(function () {}) : Promise.resolve();
  try { var s = JSON.parse(localStorage.getItem('kodesh-shut') || '{}'); ['sig', 'head', 'theme', 'size', 'foot'].forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && s[k]) el.value = s[k]; }); } catch (e) {}
  function upd() {
    var o = {}; ['sig', 'head', 'theme', 'size', 'foot'].forEach(function (k) { o[k] = val(k); });
    try { localStorage.setItem('kodesh-shut', JSON.stringify(o)); } catch (e) {}
    draw();
  }
  form.addEventListener('input', upd);
  form.addEventListener('change', upd);
  fontsReady.then(draw);

  function blob() { return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); }
  function fname() { return 'שות' + (val('num') ? '-' + val('num') : '') + '.png'; }
  function used(how) { if (window.toolUsed) window.toolUsed('shut', { how: how, theme: val('theme'), size: val('size') }); }
  $('sh-dl').addEventListener('click', function () {
    if (!val('q') || !val('a')) return form.reportValidity();
    blob().then(function (b) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname();
      document.body.appendChild(a); a.click(); a.remove();
      used('download');
    });
  });
  $('sh-share').addEventListener('click', function () {
    if (!val('q') || !val('a')) return form.reportValidity();
    blob().then(function (b) {
      var f = new File([b], fname(), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        navigator.share({ files: [f], text: val('q') }).then(function () { used('share'); }).catch(function () {});
      } else {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname();
        document.body.appendChild(a); a.click(); a.remove();
        used('download_fallback');
        $('sh-tip').hidden = false;
      }
    });
  });
  $('sh-text').addEventListener('click', function () {
    var t = (val('head') || 'שאלה ותשובה') + (val('num') ? ' ' + val('num') : '') + '\n\nשאלה: ' + val('q') + '\n\nתשובה: ' + val('a') + (val('sig') ? '\n\n' + val('sig') : '');
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'הטקסט הועתק ✓'; used('copy_text'); });
  });
})();
