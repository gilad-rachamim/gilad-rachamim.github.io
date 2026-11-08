// Y3 – פוסט מעוצב (כלי קודש): כל טקסט → תמונה לסטטוס, לפייסבוק או לאינסטגרם.
(function () {
  'use strict';
  window.KCard.init({
    form: 'pt-form', canvas: 'pt-canvas', key: 'kodesh-post', tool: 'post', theme: 'night',
    keep: ['sig', 'theme', 'size', 'foot'],
    ids: { share: 'pt-share', dl: 'pt-dl', text: 'pt-text', tip: 'pt-tip' },
    valid: function (api) { return !!api.val('body'); },
    fname: function (api) { return api.val('head') || 'פוסט'; },
    draw: function (api, th, W, H, M) {
      var ctx = api.ctx, S = api.SERIF, N = api.SANS, maxW = W - 2 * M - 100, head = api.val('head'), sig = api.val('sig');
      var body = api.val('body') || document.getElementById('pt-body').placeholder;
      var top = M + (head ? 60 : 70), bottom = H - M - (sig ? 120 : 70);
      var hl = [], hfs = W > H ? 54 : 64;
      if (head) { hl = api.wrap(head, '700 ' + hfs + 'px ' + S, maxW).slice(0, 2); }
      var big = api.val('style') === 'quote', fs, lines, lh, font;
      var hH = (hl.length ? hl.length * hfs * 1.2 + 50 : 0) + (big ? 90 : 0);
      for (fs = big ? 64 : 50; fs >= 20; fs -= 2) {
        font = (big ? '700 ' : '400 ') + fs + 'px ' + (big ? S : N);
        lh = Math.round(fs * 1.5); lines = api.wrap(body, font, maxW);
        if (lines.length * lh + hH <= bottom - top) break;
      }
      var maxL = Math.max(1, Math.floor((bottom - top - hH) / lh));
      if (lines.length > maxL) { lines = lines.slice(0, maxL); lines[maxL - 1] += ' …'; }
      var y = top + Math.max(0, (bottom - top - hH - lines.length * lh) / 2);
      ctx.textAlign = 'center';
      if (hl.length) {
        ctx.fillStyle = th.title; ctx.font = '700 ' + hfs + 'px ' + S;
        hl.forEach(function (l) { y += hfs * 1.2; ctx.fillText(l, W / 2, y); });
        y += 22; ctx.fillStyle = th.frame; ctx.fillRect(W / 2 - 70, y, 140, 3); y += 28;
      }
      if (big) { ctx.fillStyle = th.sub; ctx.font = '700 ' + Math.round(fs * 1.6) + 'px ' + S; ctx.fillText('”', W / 2, y + fs * 1.3); y += fs * 1.2; }
      ctx.textAlign = api.val('align') === 'right' ? 'right' : 'center';
      var x = ctx.textAlign === 'right' ? W - M - 50 : W / 2;
      ctx.fillStyle = big ? th.title : th.text; ctx.font = font;
      lines.forEach(function (l) { ctx.fillText(l, x, y + fs); y += lh; });
      ctx.textAlign = 'center';
      if (sig) { ctx.fillStyle = th.title; ctx.font = '700 ' + (W > H ? 32 : 38) + 'px ' + S; ctx.fillText(sig, W / 2, H - M - (H < 800 ? 60 : 80)); }
    },
    text: function (api) { return (api.val('head') ? '*' + api.val('head') + '*\n\n' : '') + api.val('body') + (api.val('sig') ? '\n\n' + api.val('sig') : ''); }
  });
})();
