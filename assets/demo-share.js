// שיתוף סרטון ההדמיה והפרוספקט של כלי (14.11.2026).
// בטלפון: שולחים את הקובץ עצמו (סרטון/תמונה) דרך תפריט השיתוף, כך שבווטסאפ הוא מתנגן בלי ללחוץ על קישור.
// במחשב או כשאין תמיכה: נפתח ווטסאפ עם טקסט וקישור לדף הכלי.
(function () {
  var cfg = window.DV_SHARE || {};
  var ev = function (n, p) { try { window.gtag && gtag('event', n, Object.assign({ tool: cfg.tool }, p || {})); } catch (e) {} };
  var link = function (src) { return cfg.url + (cfg.url.indexOf('?') < 0 ? '?' : '&') + 'utm_source=' + src + '&utm_medium=share'; };
  document.addEventListener('click', async function (e) {
    var b = e.target.closest('[data-dv-share]');
    var dl = e.target.closest('[data-dv-dl]');
    if (dl) { ev('demo_download', { kind: dl.getAttribute('data-dv-dl') }); return; }
    if (!b) return;
    var kind = b.getAttribute('data-dv-kind'), src = b.getAttribute('data-dv-share');
    var text = cfg.text + ' 👇\n' + link(kind === 'video' ? 'demo-video' : 'flyer');
    b.disabled = true;
    try {
      if (navigator.canShare) {
        var r = await fetch(src);
        var blob = await r.blob();
        var f = new File([blob], src.split('/').pop(), { type: blob.type });
        if (navigator.canShare({ files: [f] })) {
          await navigator.share({ files: [f], text: text });
          ev('demo_share', { kind: kind, how: 'file' });
          return;
        }
      }
      throw 0;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      ev('demo_share', { kind: kind, how: 'wa_link' });
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    } finally { b.disabled = false; }
  });
  document.addEventListener('play', function (e) {
    var v = e.target;
    if (v.matches && v.matches('[data-dv-play]') && !v.dataset.dvPlayed) { v.dataset.dvPlayed = 1; ev('demo_play'); }
  }, true);
})();
