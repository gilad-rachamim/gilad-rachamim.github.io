// שלט QR לבית הכנסת ולשיעור (כלי קודש): קישור / קבוצת ווטסאפ / טלפון / ווטסאפ אישי → שלט עם כותרת, להדפסה ולתמונה.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TYPES = {
    link: ['כתובת הקישור', 'https://chat.whatsapp.com/...', 'סורקים ונכנסים'],
    group: ['קישור ההזמנה לקבוצה', 'https://chat.whatsapp.com/...', 'סורקים ומצטרפים לקבוצה'],
    phone: ['מספר טלפון', '050-0000000', 'סורקים ומתקשרים'],
    wa: ['מספר לווטסאפ', '050-0000000', 'סורקים ושולחים הודעה']
  };
  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function target(api) {
    var v = api.val('val'), t = api.val('type');
    if (!v) return '';
    if (t === 'phone') return 'tel:+' + intl(v);
    if (t === 'wa') return 'https://wa.me/' + intl(v);
    return /^https?:\/\//i.test(v) ? v : 'https://' + v;
  }
  var cache = { text: null, img: null };
  function qrImage(text) {
    if (!window.QRCode || !text) return null;
    if (cache.text === text) return cache.img;
    var div = document.createElement('div');
    new window.QRCode(div, { text: text, width: 600, height: 600, correctLevel: window.QRCode.CorrectLevel.M });
    cache = { text: text, img: div.querySelector('canvas') || div.querySelector('img') };
    return cache.img;
  }
  window.KCard.init({
    form: 'qr-form', canvas: 'qr-canvas', key: 'kodesh-qr', tool: 'qr_shelet', theme: 'night', printSize: 'a5',
    keep: ['org', 'theme', 'size'],
    ids: { share: 'qr-share', dl: 'qr-dl', tip: 'qr-tip', print: 'qr-print' },
    valid: function (api) { return !!api.val('val'); },
    onChange: function (api) { var t = TYPES[api.val('type')] || TYPES.link; $('qr-val-l').textContent = t[0]; $('qr-val').placeholder = t[1]; },
    fname: function (api) { return 'QR-' + (api.val('title') || 'שלט'); },
    draw: function (api, th, W, H, M) {
      var ctx = api.ctx, tall = H > W * 1.2, t = TYPES[api.val('type')] || TYPES.link;
      var qs = Math.round(Math.min(W, H) * (tall ? 0.56 : 0.44)), qx = (W - qs) / 2;
      var qy = tall ? H * 0.40 : H * 0.36;
      api.stack([
        api.val('org') ? [api.val('org'), '600', 36, 'sans', th.sub, 14] : null,
        [api.val('title') || 'הצטרפו לקבוצת בית הכנסת', '700', 64, 'serif', th.title, 10],
        api.val('sub') ? [api.val('sub'), '400', 34, 'sans', th.text, 0] : null
      ], W, M + 50, qy - 30, W - 2 * M - 100);
      var pad = 26;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(qx - pad, qy - pad, qs + 2 * pad, qs + 2 * pad);
      ctx.strokeStyle = th.frame; ctx.lineWidth = 3; ctx.strokeRect(qx - pad, qy - pad, qs + 2 * pad, qs + 2 * pad);
      var img = qrImage(target(api));
      if (img) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, qx, qy, qs, qs); }
      else { ctx.fillStyle = '#888'; ctx.font = '400 30px ' + api.SANS; ctx.textAlign = 'center'; ctx.fillText('כאן יופיע הקוד', W / 2, qy + qs / 2); }
      api.stack([
        [api.val('cta') || t[2], '700', 44, 'sans', th.title, 8],
        api.val('val') && api.val('type') !== 'link' && api.val('type') !== 'group' ? [api.val('val'), '600', 36, 'sans', th.text, 0] : null
      ], W, qy + qs + pad + 20, H - M - 60, W - 2 * M - 100);
    }
  });
})();
