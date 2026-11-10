// R5 – דבר תורה מעוצב (כלי קודש): כותרת + טקסט + שם הרב ובית הכנסת → תמונה לווטסאפ (קנבס) ודף A4 להדפסה.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('dt-form'), cv = $('dt-canvas');
  if (!form || !cv) return;
  var ctx = cv.getContext('2d');
  var THEMES = {
    night: { bg1: '#0e1628', bg2: '#1b2a4a', frame: '#d4b062', title: '#e6c57e', text: '#eef0f6', sub: '#d4b062', foot: '#9aa6bf' },
    parch: { bg1: '#f6efdd', bg2: '#ead9b4', frame: '#8a6a2a', title: '#6b4f1a', text: '#241d14', sub: '#8a6a2a', foot: '#6b5d45' },
    black: { bg1: '#16130f', bg2: '#2a2219', frame: '#c9a55c', title: '#dcbb74', text: '#f5eedf', sub: '#c9a55c', foot: '#a99c82' },
    white: { bg1: '#ffffff', bg2: '#f3f1ec', frame: '#1e3a5f', title: '#1e3a5f', text: '#1b1b1b', sub: '#7a5c1e', foot: '#666666' }
  };
  var SIZES = { square: [1080, 1080], story: [1080, 1920] };
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif', SANS = '"Assistant", Arial, sans-serif';
  var KEEP = ['rav', 'shul', 'theme', 'size', 'foot'];

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
  function sigLine() { return [val('rav'), val('shul')].filter(Boolean).join(' · '); }

  function draw() {
    var th = THEMES[val('theme')] || THEMES.night, sz = SIZES[val('size')] || SIZES.square, W = sz[0], H = sz[1];
    cv.width = W; cv.height = H;
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var M = 60;
    ctx.strokeStyle = th.frame; ctx.lineWidth = 3; ctx.strokeRect(M / 2, M / 2, W - M, H - M);
    ctx.lineWidth = 1; ctx.strokeRect(M / 2 + 10, M / 2 + 10, W - M - 20, H - M - 20);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right'; ctx.fillStyle = th.sub; ctx.font = '600 28px ' + SANS;
    ctx.fillText('בס"ד', W - M - 20, M + 45);
    ctx.textAlign = 'center';
    var par = val('par'), y0 = M + 100;
    if (par) { ctx.fillStyle = th.sub; ctx.font = '600 34px ' + SANS; ctx.fillText(par, W / 2, y0); y0 += 20; }
    var title = val('title') || 'דבר תורה';
    var tl = wrap(title, '700 58px ' + SERIF, W - 2 * M - 120);
    ctx.fillStyle = th.title; ctx.font = '700 58px ' + SERIF;
    tl.slice(0, 2).forEach(function (l, i) { ctx.fillText(l, W / 2, y0 + 62 + i * 70); });
    var ty = y0 + 62 + (Math.min(tl.length, 2) - 1) * 70 + 30;
    ctx.fillStyle = th.frame; ctx.fillRect(W / 2 - 70, ty, 140, 3);
    var sig = sigLine(), top = ty + 50, bottom = H - M - (sig ? 150 : 90), maxW = W - 2 * M - 80;
    var body = val('body') || $('dt-body').placeholder, fs, lines, lh;
    for (fs = 44; fs >= 20; fs -= 2) {
      lh = Math.round(fs * 1.55);
      lines = wrap(body, '400 ' + fs + 'px ' + SANS, maxW);
      if (lines.length * lh <= bottom - top) break;
    }
    var maxLines = Math.floor((bottom - top) / lh);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] += ' …'; }
    var y = top + Math.max(0, (bottom - top - lines.length * lh) / 2);
    ctx.textAlign = 'right'; ctx.fillStyle = th.text; ctx.font = '400 ' + fs + 'px ' + SANS;
    lines.forEach(function (l) { ctx.fillText(l, W - M - 40, y + fs); y += lh; });
    ctx.textAlign = 'center';
    if (sig) { ctx.fillStyle = th.title; ctx.font = '700 38px ' + SERIF; ctx.fillText(sig, W / 2, H - M - 80); }
    ctx.fillStyle = th.foot; ctx.font = '400 22px ' + SANS;
    ctx.fillText(val('foot') || 'נוצר בחינם בכלי קודש', W / 2, H - M - 30);
    fillPrint(th);
  }

  // דף A4 להדפסה: HTML אמיתי (טקסט חד, כמה עמודים אם צריך), נבנה מאותם שדות
  function fillPrint(th) {
    var p = $('dt-print'); if (!p) return;
    var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var paras = (val('body') || '').split(/\n\s*\n|\n/).filter(function (s) { return s.trim(); });
    p.style.setProperty('--pc', th.title); p.style.setProperty('--pf', th.frame);
    p.innerHTML = '<div class="pg"><div class="bsd">בס"ד</div>' +
      (val('par') ? '<div class="par">' + esc(val('par')) + '</div>' : '') +
      '<h1>' + esc(val('title') || 'דבר תורה') + '</h1><div class="rule"></div>' +
      paras.map(function (s) { return '<p>' + esc(s) + '</p>'; }).join('') +
      (sigLine() ? '<div class="sig">' + esc(sigLine()) + '</div>' : '') +
      '<div class="ft">' + esc(val('foot') || 'נוצר בחינם בכלי קודש · hakelim.com/kodesh') + '</div></div>';
  }

  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('400 40px "Assistant"'), document.fonts.load('600 40px "Assistant"')]).catch(function () {}) : Promise.resolve();
  try { var s = JSON.parse(localStorage.getItem('kodesh-dvar') || '{}'); KEEP.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && s[k]) el.value = s[k]; }); } catch (e) {}
  function upd() {
    var o = {}; KEEP.forEach(function (k) { o[k] = val(k); });
    try { localStorage.setItem('kodesh-dvar', JSON.stringify(o)); } catch (e) {}
    draw();
  }
  form.addEventListener('input', upd);
  form.addEventListener('change', upd);
  fontsReady.then(draw);

  function ok() { if (!val('body')) { form.reportValidity(); return false; } return true; }
  function blob() { return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); }
  function fname() { return (val('title') || 'דבר-תורה').replace(/[\\/:*?"<>|]/g, '').slice(0, 40) + '.png'; }
  function used(how) { if (window.toolUsed) window.toolUsed('dvar_torah', { how: how, theme: val('theme'), size: val('size') }); }
  function download(b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); }
  $('dt-dl').addEventListener('click', function () { if (!ok()) return; blob().then(function (b) { download(b); used('download'); }); });
  $('dt-share').addEventListener('click', function () {
    if (!ok()) return;
    blob().then(function (b) {
      var f = new File([b], fname(), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        navigator.share({ files: [f], text: val('title') }).then(function () { used('share'); }).catch(function () {});
      } else { download(b); used('download_fallback'); $('dt-tip').hidden = false; }
    });
  });
  $('dt-printbtn').addEventListener('click', function () { if (!ok()) return; draw(); used('print'); window.print(); });
  $('dt-text').addEventListener('click', function () {
    var t = (val('par') ? val('par') + '\n' : '') + '*' + (val('title') || 'דבר תורה') + '*\n\n' + val('body') + (sigLine() ? '\n\n' + sigLine() : '');
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'הטקסט הועתק ✓'; used('copy_text'); });
  });
})();
