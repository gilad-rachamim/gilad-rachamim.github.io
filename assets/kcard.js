// מנוע קטן ומשותף לכלי "טקסט → תמונה" בכלי קודש (חג בבסיס, פוסט מעוצב): רקע, מסגרת, שבירת שורות, שמירה ושיתוף.
(function () {
  'use strict';
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif', SANS = '"Assistant", Arial, sans-serif';
  var THEMES = {
    night: { bg1: '#0e1628', bg2: '#1b2a4a', frame: '#d4b062', title: '#e6c57e', text: '#eef0f6', sub: '#d4b062', foot: '#9aa6bf' },
    olive: { bg1: '#2b3320', bg2: '#47522f', frame: '#d9c48a', title: '#f0dfa8', text: '#f4f1e4', sub: '#d9c48a', foot: '#bdb795' },
    parch: { bg1: '#f6efdd', bg2: '#ead9b4', frame: '#8a6a2a', title: '#6b4f1a', text: '#241d14', sub: '#8a6a2a', foot: '#6b5d45' },
    black: { bg1: '#16130f', bg2: '#2a2219', frame: '#c9a55c', title: '#dcbb74', text: '#f5eedf', sub: '#c9a55c', foot: '#a99c82' },
    white: { bg1: '#ffffff', bg2: '#f3f1ec', frame: '#1e3a5f', title: '#1e3a5f', text: '#1b1b1b', sub: '#7a5c1e', foot: '#666666' },
    sky: { bg1: '#eaf3fb', bg2: '#cfe2f3', frame: '#2a5d8f', title: '#1e4670', text: '#14273b', sub: '#2a5d8f', foot: '#4c6680' },
    stone: { bg1: '#2a2c30', bg2: '#3d4046', frame: '#b9b4a8', title: '#ece8de', text: '#e2ded4', sub: '#b9b4a8', foot: '#9a968c' },
    paper: { bg1: '#fbfaf7', bg2: '#efede8', frame: '#55524b', title: '#2b2925', text: '#2b2925', sub: '#6b675e', foot: '#77736a' }
  };
  var SIZES = { square: [1080, 1080], story: [1080, 1920], wide: [1200, 630], a5: [1240, 1754], a4l: [1754, 1240] };

  function init(o) {
    var $ = function (id) { return document.getElementById(id); };
    var form = $(o.form), cv = $(o.canvas);
    if (!form || !cv) return;
    var ctx = cv.getContext('2d');
    function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; }
    function wrap(text, font, maxW) {
      ctx.font = font;
      var out = [];
      String(text).split('\n').forEach(function (para) {
        var words = para.split(/\s+/).filter(Boolean), line = '';
        if (!words.length) { out.push(''); return; }
        words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
        out.push(line);
      });
      return out;
    }
    // stack: שורות ממורכזות לגובה. כל פריט: [טקסט, משקל, גודל, 'serif'|'sans', צבע, רווח אחרי]. טקסט ארוך נשבר לשורות.
    function stack(items, W, top, bottom, maxW) {
      var rows = [];
      items.forEach(function (it) {
        if (!it || it[0] === null || it[0] === undefined) return;
        var font = it[1] + ' ' + it[2] + 'px ' + (it[3] === 'serif' ? SERIF : SANS);
        if (it[0] === '') { rows.push(['', font, it[2], it[4], it[5]]); return; }
        var ls = wrap(it[0], font, maxW);
        ls.forEach(function (l, i) { rows.push([l, font, it[2], it[4], i === ls.length - 1 ? it[5] : it[2] * 0.25]); });
      });
      var total = rows.reduce(function (a, r) { return a + (r[0] ? r[2] * 1.15 : 0) + r[4]; }, 0);
      var k = total > bottom - top ? (bottom - top) / total : 1, y = top + Math.max(0, (bottom - top - total) / 2);
      ctx.textAlign = 'center';
      rows.forEach(function (r) {
        if (r[0]) { var fs = Math.round(r[2] * k); ctx.font = r[1].replace(/\d+px/, fs + 'px'); ctx.fillStyle = r[3]; ctx.fillText(r[0], W / 2, y + fs); y += fs * 1.15; }
        y += r[4] * k;
      });
    }
    var api = { ctx: ctx, val: val, wrap: wrap, stack: stack, SERIF: SERIF, SANS: SANS };
    function draw() {
      var th = THEMES[val('theme')] || THEMES[o.theme || 'night'], sz = SIZES[val('size')] || SIZES.square, W = sz[0], H = sz[1];
      cv.width = W; cv.height = H;
      var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var M = H < 800 ? 40 : 60;
      ctx.strokeStyle = th.frame; ctx.lineWidth = 3; ctx.strokeRect(M / 2, M / 2, W - M, H - M);
      ctx.lineWidth = 1; ctx.strokeRect(M / 2 + 10, M / 2 + 10, W - M - 20, H - M - 20);
      ctx.direction = 'rtl';
      if (o.bsd !== false) { ctx.textAlign = 'right'; ctx.fillStyle = th.sub; ctx.font = '600 26px ' + SANS; ctx.fillText('בס"ד', W - M - 20, M + 40); }
      ctx.textAlign = 'center';
      if (o.decor) o.decor(api, th, W, H, M);
      o.draw(api, th, W, H, M);
      if (o.foot === false) return;
      ctx.textAlign = 'center'; ctx.fillStyle = th.foot; ctx.font = '400 22px ' + SANS;
      ctx.fillText(val('foot') || 'נוצר בחינם בכלי קודש', W / 2, H - M - (H < 800 ? 18 : 30));
    }
    var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('600 40px "Frank Ruhl Libre"'), document.fonts.load('400 40px "Assistant"'), document.fonts.load('700 40px "Assistant"')]).catch(function () {}) : Promise.resolve();
    try { var st = JSON.parse(localStorage.getItem(o.key) || '{}'); (o.keep || []).forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && st[k]) el.value = st[k]; }); } catch (e) {}
    function upd() {
      var s = {}; (o.keep || []).forEach(function (k) { s[k] = val(k); });
      try { localStorage.setItem(o.key, JSON.stringify(s)); } catch (e) {}
      if (o.onChange) o.onChange(api);
      draw();
    }
    form.addEventListener('input', upd);
    form.addEventListener('change', upd);
    fontsReady.then(function () { if (o.onChange) o.onChange(api); draw(); });

    function blob() { return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); }
    function fname() { return (o.fname ? o.fname(api) : 'כלי-קודש').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 50) + '.png'; }
    function used(how) { if (window.toolUsed) window.toolUsed(o.tool, { how: how, theme: val('theme'), size: val('size') }); }
    function download(b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); }
    function ok() { if (!o.valid || o.valid(api) !== false) return true; form.reportValidity(); return false; }
    var ids = o.ids || {};
    if (ids.dl && $(ids.dl)) $(ids.dl).addEventListener('click', function () { if (!ok()) return; blob().then(function (b) { download(b); used('download'); }); });
    if (ids.share && $(ids.share)) $(ids.share).addEventListener('click', function () {
      if (!ok()) return;
      blob().then(function (b) {
        var f = new File([b], fname(), { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
          navigator.share({ files: [f], text: o.text ? o.text(api) : '' }).then(function () { used('share'); }).catch(function () {});
        } else { download(b); used('download_fallback'); if (ids.tip && $(ids.tip)) $(ids.tip).hidden = false; }
      });
    });
    if (ids.text && $(ids.text)) $(ids.text).addEventListener('click', function () {
      var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(o.text(api)) : Promise.reject()).then(function () { b.textContent = 'הטקסט הועתק ✓'; used('copy_text'); });
    });
    // הדפסה: התמונה (בגודל A5) נכנסת ל-#kc-print, וה-CSS של הדף מדפיס רק אותה
    if (ids.print && $(ids.print)) $(ids.print).addEventListener('click', function () {
      if (!ok()) return;
      var sel = form.querySelector('[name=size]'), prev = sel ? sel.value : '';
      if (sel && o.printSize) { sel.value = o.printSize; draw(); }
      var box = $('kc-print'); if (!box) { box = document.createElement('div'); box.id = 'kc-print'; document.body.appendChild(box); }
      box.innerHTML = '<img alt="" src="' + cv.toDataURL('image/png') + '">';
      if (sel && o.printSize) { sel.value = prev; draw(); }
      used('print');
      setTimeout(function () { window.print(); }, 150);
    });
    if (ids.wa && $(ids.wa)) $(ids.wa).addEventListener('click', function (e) { e.currentTarget.href = 'https://wa.me/?text=' + encodeURIComponent(o.text(api)); used('wa_text'); });
    return api;
  }
  // quote: ציור ישיר של "ציטוט גדול" (כמו בפוסט המעוצב) על קנבס, בלי טופס. משמש את "שבוע של תוכן" (/kodesh/shavua/).
  // o: { theme, size, head, body, sig, foot, tag }
  function quote(cv, o) {
    var th = THEMES[o.theme] || THEMES.night, sz = SIZES[o.size] || SIZES.story, W = sz[0], H = sz[1], ctx = cv.getContext('2d');
    cv.width = W; cv.height = H;
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var M = 60;
    ctx.strokeStyle = th.frame; ctx.lineWidth = 3; ctx.strokeRect(M / 2, M / 2, W - M, H - M);
    ctx.lineWidth = 1; ctx.strokeRect(M / 2 + 10, M / 2 + 10, W - M - 20, H - M - 20);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right'; ctx.fillStyle = th.sub; ctx.font = '600 26px ' + SANS; ctx.fillText('בס"ד', W - M - 20, M + 40);
    if (o.tag) { ctx.textAlign = 'left'; ctx.font = '600 24px ' + SANS; ctx.fillText(o.tag, M + 20, M + 40); }
    function wrap(text, font, maxW) {
      ctx.font = font; var out = [];
      String(text).split('\n').forEach(function (para) {
        var words = para.split(/\s+/).filter(Boolean), line = '';
        words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
        if (line) out.push(line);
      });
      return out;
    }
    var maxW = W - 2 * M - 100, top = M + 90, bottom = H - M - (o.sig ? 150 : 90);
    var hl = [], hfs = W > H ? 46 : 52;
    if (o.head) hl = wrap(o.head, '700 ' + hfs + 'px ' + SERIF, maxW).slice(0, 2);
    var hH = (hl.length ? hl.length * hfs * 1.2 + 50 : 0) + 90, fs, lines, lh, font;
    for (fs = H > 1500 ? 84 : 70; fs >= 24; fs -= 2) {
      font = '700 ' + fs + 'px ' + SERIF; lh = Math.round(fs * 1.45); lines = wrap(o.body, font, maxW);
      if (lines.length * lh + hH <= bottom - top) break;
    }
    var maxL = Math.max(1, Math.floor((bottom - top - hH) / lh));
    if (lines.length > maxL) { lines = lines.slice(0, maxL); lines[maxL - 1] += ' …'; }
    var y = top + Math.max(0, (bottom - top - hH - lines.length * lh) / 2);
    ctx.textAlign = 'center';
    if (hl.length) {
      ctx.fillStyle = th.sub; ctx.font = '700 ' + hfs + 'px ' + SERIF;
      hl.forEach(function (l) { y += hfs * 1.2; ctx.fillText(l, W / 2, y); });
      y += 22; ctx.fillStyle = th.frame; ctx.fillRect(W / 2 - 70, y, 140, 3); y += 28;
    }
    ctx.fillStyle = th.sub; ctx.font = '700 ' + Math.round(fs * 1.6) + 'px ' + SERIF; ctx.fillText('”', W / 2, y + fs * 1.3); y += fs * 1.2;
    ctx.fillStyle = th.title; ctx.font = font;
    lines.forEach(function (l) { ctx.fillText(l, W / 2, y + fs); y += lh; });
    if (o.sig) { ctx.fillStyle = th.title; ctx.font = '700 40px ' + SERIF; ctx.fillText(o.sig, W / 2, H - M - 95); }
    ctx.fillStyle = th.foot; ctx.font = '400 24px ' + SANS;
    if (o.foot) ctx.fillText(o.foot, W / 2, H - M - 40);
    return cv;
  }
  window.KCard = { init: init, THEMES: THEMES, quote: quote, SIZES: SIZES };
})();
