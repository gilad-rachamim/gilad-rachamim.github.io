// E9/E3 – מודעת מבצע לסטטוס ולפייסבוק (כלים לעסק קטן), על המנוע המשותף kcard.js.
// העיצובים של אוכל וחנויות נוספים כאן ל-KCard.THEMES (בלי לשנות את kcard.js).
(function () {
  'use strict';
  if (!window.KCard) return;
  var T = window.KCard.THEMES;
  T.tomato = { bg1: '#8e1b16', bg2: '#c4361f', frame: '#ffd66b', title: '#fff3c4', text: '#ffffff', sub: '#ffd66b', foot: '#ffd2c6', badge: '#ffd66b', badgeText: '#8e1b16' };
  T.sunny = { bg1: '#fff3c2', bg2: '#ffd45e', frame: '#b23a1c', title: '#9e2a12', text: '#2b1a0e', sub: '#b23a1c', foot: '#6b4a2e', badge: '#c7361b', badgeText: '#fff7dc' };
  T.fresh = { bg1: '#0f4d31', bg2: '#1f7d4f', frame: '#f6dc74', title: '#fff6c9', text: '#f3fbf4', sub: '#f6dc74', foot: '#bfe3cb', badge: '#f6dc74', badgeText: '#0f4d31' };
  T.coffee = { bg1: '#2a1a12', bg2: '#4d3021', frame: '#d9a066', title: '#f3d2a2', text: '#f7ece0', sub: '#d9a066', foot: '#c2a78a', badge: '#d9a066', badgeText: '#2a1a12' };
  T.sweet = { bg1: '#fde9ee', bg2: '#f6c3d0', frame: '#a8325a', title: '#8c1f45', text: '#3a1422', sub: '#a8325a', foot: '#7a4a5a', badge: '#a8325a', badgeText: '#fff1f5' };
  var CREDIT = 'נוצר בחינם · כלים לעסק קטן';
  var bsd = document.getElementById('mv-bsd');

  function money(v) { v = String(v || '').replace(/[^\d.,]/g, '').replace(',', '.'); return v; }
  function pill(ctx, text, cx, y, font, bg, fg) {
    ctx.font = font; var w = ctx.measureText(text).width + 56, h = 64, x = cx - w / 2, r = h / 2;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(text, cx, y + h / 2 + 13);
    return h;
  }
  function badge(ctx, th, cx, cy, R, price, old, SANS) {
    var bg = th.badge || th.frame, fg = th.badgeText || th.bg1;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = R * 0.12; ctx.shadowOffsetY = R * 0.04;
    // עיגול "כוכב" עם שיניים קטנות, כמו מדבקת מבצע
    var n = 28; ctx.beginPath();
    for (var i = 0; i <= n * 2; i++) { var a = Math.PI * i / n, rr = i % 2 ? R * 0.94 : R; ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
    ctx.closePath(); ctx.fillStyle = bg; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = fg; ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(2, R * 0.015); ctx.beginPath(); ctx.arc(cx, cy, R * 0.8, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = fg; ctx.textAlign = 'center';
    var top = cy - R * 0.08;
    if (old) {
      ctx.font = '600 ' + Math.round(R * 0.15) + 'px ' + SANS;
      var ot = 'במקום ' + old + ' ₪', ow = ctx.measureText(ot).width, oy = cy - R * 0.42;
      ctx.fillText(ot, cx, oy);
      ctx.strokeStyle = fg; ctx.lineWidth = Math.max(2, R * 0.018); ctx.beginPath(); ctx.moveTo(cx - ow / 2 - 6, oy - R * 0.05); ctx.lineTo(cx + ow / 2 + 6, oy - R * 0.05); ctx.stroke();
    } else {
      ctx.font = '700 ' + Math.round(R * 0.15) + 'px ' + SANS; ctx.fillText('רק', cx, cy - R * 0.42);
    }
    // המחיר: ₪ קטן משמאל למספר, כמו בשלטי חנות
    var fs = R * 0.72; ctx.font = '800 ' + Math.round(fs) + 'px ' + SANS;
    while (ctx.measureText(price).width > R * 1.25 && fs > 20) { fs -= 4; ctx.font = '800 ' + Math.round(fs) + 'px ' + SANS; }
    var pw = ctx.measureText(price).width, ss = Math.round(fs * 0.42);
    ctx.font = '700 ' + ss + 'px ' + SANS; var sw = ctx.measureText('₪').width + 8;
    var startX = cx - (pw + sw) / 2;
    ctx.direction = 'ltr'; ctx.textAlign = 'left';
    ctx.fillText('₪', startX, top + fs * 0.32 - fs * 0.28);
    ctx.font = '800 ' + Math.round(fs) + 'px ' + SANS; ctx.fillText(price, startX + sw, top + fs * 0.32);
    ctx.direction = 'rtl'; ctx.textAlign = 'center';
    ctx.font = '600 ' + Math.round(R * 0.14) + 'px ' + SANS; ctx.fillText('בלבד', cx, cy + R * 0.52);
  }

  window.KCard.init({
    form: 'mv-form', canvas: 'mv-canvas', key: 'esek-mivtza', tool: 'esek_mivtza', theme: 'tomato', bsd: false, printSize: 'a5',
    keep: ['biz', 'head', 'tag', 'what', 'price', 'old', 'until', 'terms', 'contact', 'theme', 'size'],
    ids: { dl: 'mv-dl', share: 'mv-share', text: 'mv-text', print: 'mv-print', tip: 'mv-tip' },
    valid: function (k) { return !!k.val('what'); },
    fname: function (k) { return 'מבצע-' + (k.val('biz') || k.val('what')); },
    onChange: function () { document.querySelector('#mv-form [name=foot]').value = CREDIT; },
    text: function (k) {
      var v = k.val, p = money(v('price')), o = money(v('old'));
      return [(v('head') || 'מבצע!') + (v('biz') ? ' ב' + v('biz') : '') + (v('tag') ? ' · ' + v('tag') : ''), v('what'),
        p ? 'רק ' + p + ' ₪' + (o ? ' (במקום ' + o + ' ₪)' : '') : '', v('until') ? 'בתוקף ' + v('until').replace(/^בתוקף\s*/, '') : '', v('terms'), v('contact')]
        .filter(Boolean).join('\n');
    },
    draw: function (k, th, W, H, M) {
      var ctx = k.ctx, v = k.val, p = money(v('price')), o = money(v('old')), wide = W > H * 1.4, story = H > W * 1.4;
      if (bsd && bsd.checked) { ctx.textAlign = 'right'; ctx.fillStyle = th.sub; ctx.font = '600 26px ' + k.SANS; ctx.fillText('בס"ד', W - M - 20, M + 40); }
      var until = v('until') ? 'בתוקף ' + v('until').replace(/^בתוקף\s*/, '') : '';
      var top = [
        [v('biz') || null, '600', wide ? 38 : 50, 'serif', th.sub, wide ? 10 : 18],
        [v('head') || 'מבצע!', '700', wide ? 92 : (story ? 150 : 120), 'serif', th.title, wide ? 12 : 22],
        [v('what') || 'מה במבצע?', '700', wide ? 44 : (story ? 66 : 54), 'sans', th.text, 0]
      ];
      var bottom = [
        [until || null, '700', wide ? 34 : (story ? 50 : 40), 'sans', th.sub, 12],
        [v('terms') || null, '400', wide ? 24 : (story ? 32 : 28), 'sans', th.foot, 12],
        [v('contact') || null, '700', wide ? 30 : (story ? 44 : 36), 'sans', th.text, 0]
      ];
      var footSpace = H < 800 ? 60 : 90, tag = v('tag');
      if (wide) {
        var R = p ? H * 0.31 : 0, cx = M + 40 + R, cy = H / 2, left = p ? cx + R + 30 : M + 30, right = W - M - 30, mid = (left + right) / 2;
        if (p) badge(ctx, th, cx, cy, R, p, o, k.SANS);
        var y0 = M + 34;
        if (tag) y0 += pill(ctx, tag, mid, y0, '700 30px ' + k.SANS, th.badge || th.frame, th.badgeText || th.bg1) + 8;
        k.stack(top.concat([['', '400', 16, 'sans', th.text, 18]]).concat(bottom), mid * 2, y0, H - M - footSpace, right - left);
        return;
      }
      var R2 = p ? W * (story ? 0.25 : 0.19) : 0, cy2 = H * (story ? 0.585 : 0.625), yT = M + (story ? 80 : 56);
      if (tag) yT += pill(ctx, tag, W / 2, yT, '700 ' + (story ? 38 : 32) + 'px ' + k.SANS, th.badge || th.frame, th.badgeText || th.bg1) + 14;
      if (!p) { k.stack(top.concat([['', '400', 30, 'sans', th.text, 40]]).concat(bottom), W, yT, H - M - footSpace, W - 2 * M - 80); return; }
      k.stack(top, W, yT, cy2 - R2 - 30, W - 2 * M - 80);
      badge(ctx, th, W / 2, cy2, R2, p, o, k.SANS);
      k.stack(bottom, W, cy2 + R2 + 30, H - M - footSpace, W - 2 * M - 80);
    }
  });
})();
