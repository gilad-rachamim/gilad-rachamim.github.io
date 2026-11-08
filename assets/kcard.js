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
    sky: { bg1: '#eaf3fb', bg2: '#cfe2f3', frame: '#2a5d8f', title: '#1e4670', text: '#14273b', sub: '#2a5d8f', foot: '#4c6680' }
  };
  var SIZES = { square: [1080, 1080], story: [1080, 1920], wide: [1200, 630] };

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
    var api = { ctx: ctx, val: val, wrap: wrap, SERIF: SERIF, SANS: SANS };
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
      o.draw(api, th, W, H, M);
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
    if (ids.wa && $(ids.wa)) $(ids.wa).addEventListener('click', function (e) { e.currentTarget.href = 'https://wa.me/?text=' + encodeURIComponent(o.text(api)); used('wa_text'); });
    return api;
  }
  window.KCard = { init: init, THEMES: THEMES };
})();
