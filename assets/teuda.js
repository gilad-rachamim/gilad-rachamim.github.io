// תעודת הוקרה (כלי קודש): חתן תורה, חתן בראשית, סיום מסכת, הוקרה לגבאי/תורם, מצטיין → דף A4 לרוחב להדפסה ותמונה.
(function () {
  'use strict';
  var KINDS = {
    torah: ['תעודת כבוד', 'חתן תורה', 'לכבוד היותו חתן תורה בשמחת תורה'],
    bereshit: ['תעודת כבוד', 'חתן בראשית', 'לכבוד היותו חתן בראשית בשמחת תורה'],
    siyum: ['תעודת הוקרה', 'סיום מסכת', 'לרגל סיום הלימוד, בשמחה ובהודיה'],
    gabai: ['תעודת הוקרה', 'הוקרה והערכה', 'על מסירות, נאמנות ועבודת הקודש למען הציבור'],
    torem: ['תעודת הוקרה', 'הוקרה והערכה', 'על תרומתו הנדיבה ועל שותפותו בבניין בית הכנסת'],
    metzayen: ['תעודת הצטיינות', 'הצטיינות', 'על התמדה, שקידה ולימוד בשמחה'],
    other: ['תעודת הוקרה', '', '']
  };
  var $ = function (id) { return document.getElementById(id); };
  function K(api) { return KINDS[api.val('k')] || KINDS.torah; }
  window.KCard.init({
    form: 'te-form', canvas: 'te-canvas', key: 'kodesh-teuda', tool: 'teuda', theme: 'parch', printSize: 'a4l', foot: false, bsd: false,
    keep: ['org', 'sig1', 'sig2', 'theme'],
    ids: { share: 'te-share', dl: 'te-dl', tip: 'te-tip', print: 'te-print' },
    onChange: function (api) {
      var k = K(api);
      $('te-title').placeholder = k[1] || 'הוקרה והערכה';
      $('te-why').placeholder = k[2] || 'על מסירות ונאמנות';
    },
    fname: function (api) { return 'תעודה-' + (api.val('name') || ''); },
    decor: function (api, th, W, H, M) {
      var ctx = api.ctx, c = 70;
      ctx.strokeStyle = th.frame; ctx.lineWidth = 2;
      [[M + 20, M + 20, 1, 1], [W - M - 20, M + 20, -1, 1], [M + 20, H - M - 20, 1, -1], [W - M - 20, H - M - 20, -1, -1]].forEach(function (p) {
        ctx.beginPath(); ctx.moveTo(p[0], p[1] + c * p[3]); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + c * p[2], p[1]); ctx.stroke();
        ctx.beginPath(); ctx.arc(p[0] + 18 * p[2], p[1] + 18 * p[3], 5, 0, Math.PI * 2); ctx.fillStyle = th.frame; ctx.fill();
      });
    },
    draw: function (api, th, W, H, M) {
      var land = W > H, s = land ? 1.15 : 1, k = K(api), ctx = api.ctx;
      ctx.textAlign = 'right'; ctx.fillStyle = th.sub; ctx.font = '600 28px ' + api.SANS; ctx.fillText('בס"ד', W - M - 110, M + 62);
      var sig1 = api.val('sig1'), sig2 = api.val('sig2'), sigH = (sig1 || sig2) ? 190 * s : 60;
      api.stack([
        api.val('org') ? [api.val('org'), '600', 36 * s, 'sans', th.sub, 22 * s] : null,
        [k[0], '700', 96 * s, 'serif', th.title, 18 * s],
        ['—  ✦  —', '400', 30 * s, 'sans', th.frame, 18 * s],
        [api.val('title') || k[1] || 'הוקרה והערכה', '600', 44 * s, 'serif', th.sub, 24 * s],
        ['מוענקת ל', '400', 34 * s, 'sans', th.text, 6 * s],
        [api.val('name') || 'שם המקבל', '700', 84 * s, 'serif', th.title, 22 * s],
        [api.val('why') || k[2] || '', '400', 38 * s, 'sans', th.text, 18 * s],
        api.val('date') ? [api.val('date'), '400', 32 * s, 'sans', th.sub, 0] : null
      ], W, M + 60, H - M - sigH, W - 2 * M - 220);
      // חתימות: שתיים בצדדים, או אחת באמצע
      var y = H - M - 70 * s, list = [sig1, sig2].filter(Boolean);
      var xs = list.length === 2 ? [W * 0.72, W * 0.28] : [W / 2];
      list.forEach(function (n, i) {
        ctx.strokeStyle = th.frame; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xs[i] - 190, y - 52 * s); ctx.lineTo(xs[i] + 190, y - 52 * s); ctx.stroke();
        ctx.textAlign = 'center'; ctx.fillStyle = th.title; ctx.font = '700 ' + Math.round(34 * s) + 'px ' + api.SERIF; ctx.fillText(n, xs[i], y - 8 * s);
      });
    }
  });
})();
