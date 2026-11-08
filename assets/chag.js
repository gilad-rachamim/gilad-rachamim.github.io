// T3 – דף מידע לחג בבסיס (כלי קודש): הרב ממלא שעות ומקום, יוצאת תמונה לקבוצות הפלוגה + טקסט לווטסאפ.
(function () {
  'use strict';
  var CHAG = {
    shabbat: ['שבת בבסיס', 'שבת שלום'],
    rosh: ['ראש השנה בבסיס', 'שנה טובה ומתוקה'],
    kipur: ['יום הכיפורים בבסיס', 'גמר חתימה טובה'],
    sukkot: ['סוכות בבסיס', 'חג שמח'],
    simchat: ['שמחת תורה בבסיס', 'חג שמח'],
    chanuka: ['חנוכה בבסיס', 'חנוכה שמח'],
    purim: ['פורים בבסיס', 'פורים שמח'],
    pesach: ['פסח בבסיס', 'חג כשר ושמח'],
    shavuot: ['שבועות בבסיס', 'חג שמח'],
    other: ['', '']
  };
  function rows(api) {
    return api.val('rows').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 10).map(function (l) {
      var m = l.match(/^(\d{1,2}[:.]\d{2})\s*[-–:]?\s*(.*)$/);
      return m ? [m[1].replace('.', ':'), m[2]] : ['', l];
    });
  }
  function title(api) { var c = CHAG[api.val('chag')] || CHAG.shabbat; return api.val('chag') === 'other' ? (api.val('title') || 'מידע לחג') : c[0]; }
  function greet(api) { return (CHAG[api.val('chag')] || CHAG.shabbat)[1]; }
  var $ = function (id) { return document.getElementById(id); };
  window.KCard.init({
    form: 'cg-form', canvas: 'cg-canvas', key: 'kodesh-chag', tool: 'chag_basis', theme: 'olive',
    keep: ['unit', 'sig', 'theme', 'size'],
    ids: { share: 'cg-share', dl: 'cg-dl', text: 'cg-text', wa: 'cg-wa', tip: 'cg-tip' },
    onChange: function (api) { $('cg-title-wrap').hidden = api.val('chag') !== 'other'; },
    fname: function (api) { return title(api); },
    draw: function (api, th, W, H, M) {
      var ctx = api.ctx, S = api.SERIF, N = api.SANS, s = H > W ? 1.15 : 1, y = M + 110 * s, maxW = W - 2 * M - 100;
      if (api.val('unit')) { ctx.fillStyle = th.sub; ctx.font = '600 ' + Math.round(34 * s) + 'px ' + N; ctx.fillText(api.val('unit'), W / 2, y); y += 30 * s; }
      ctx.fillStyle = th.title; ctx.font = '700 ' + Math.round(76 * s) + 'px ' + S;
      api.wrap(title(api), ctx.font, maxW).slice(0, 2).forEach(function (l) { y += 80 * s; ctx.fillText(l, W / 2, y); });
      if (api.val('date')) { y += 52 * s; ctx.fillStyle = th.text; ctx.font = '600 ' + Math.round(36 * s) + 'px ' + N; ctx.fillText(api.val('date'), W / 2, y); }
      y += 34 * s; ctx.fillStyle = th.frame; ctx.fillRect(W / 2 - 70, y, 140, 3); y += 30 * s;
      var R = rows(api), bottom = H - M - (api.val('sig') ? 190 : 120) * s - (api.val('note') ? 60 * s : 0);
      var fs = Math.round(42 * s); while (fs > 24 && R.length * fs * 1.75 > bottom - y) fs -= 2;
      var lh = fs * 1.75, tx = W - M - 60, timeW = fs * 3.4;
      y += Math.max(0, (bottom - y - R.length * lh) / 2);
      R.forEach(function (r) {
        ctx.textAlign = 'right';
        if (r[0]) { ctx.fillStyle = th.title; ctx.font = '700 ' + fs + 'px ' + N; ctx.fillText(r[0], tx, y + fs); }
        ctx.fillStyle = th.text; ctx.font = '400 ' + fs + 'px ' + N;
        var t = r[1], x = r[0] ? tx - timeW : tx, w = x - (M + 50);
        while (ctx.measureText(t).width > w && t.length > 4) t = t.slice(0, -2);
        if (t !== r[1]) t = t.trim() + '…';
        ctx.fillText(t, x, y + fs); y += lh;
      });
      ctx.textAlign = 'center';
      var yb = H - M - (api.val('sig') ? 150 : 80) * s;
      if (api.val('note')) { ctx.fillStyle = th.sub; ctx.font = 'italic 400 ' + Math.round(32 * s) + 'px ' + N; ctx.fillText(api.wrap(api.val('note'), ctx.font, maxW)[0], W / 2, yb - 40 * s); }
      ctx.fillStyle = th.title; ctx.font = '700 ' + Math.round(46 * s) + 'px ' + S;
      if (greet(api)) ctx.fillText(greet(api), W / 2, yb + 20 * s);
      if (api.val('sig')) { ctx.fillStyle = th.text; ctx.font = '600 ' + Math.round(32 * s) + 'px ' + N; ctx.fillText(api.val('sig'), W / 2, yb + 80 * s); }
    },
    text: function (api) {
      var t = '*' + title(api) + '*' + (api.val('unit') ? '\n' + api.val('unit') : '') + (api.val('date') ? '\n' + api.val('date') : '') + '\n\n';
      t += rows(api).map(function (r) { return (r[0] ? r[0] + ' – ' : '• ') + r[1]; }).join('\n');
      if (api.val('note')) t += '\n\n' + api.val('note');
      if (greet(api)) t += '\n\n' + greet(api) + '!';
      if (api.val('sig')) t += '\n' + api.val('sig');
      return t;
    }
  });
})();
