// מדריך וידאו בדף כלי: הנגן של יוטיוב נטען רק בלחיצה, פרקים קופצים לזמן, ושיתוף לחבר.
// בלי JavaScript כל הכפתורים הם קישורים רגילים (ליוטיוב ולווטסאפ).
(function () {
  var ev = function (name, p) { try { window.gtag && gtag('event', name, p); } catch (e) {} };
  var load = function (box, sec) {
    var frame = box.querySelector('.mdr-frame');
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + box.getAttribute('data-mdr-id') + '?autoplay=1&rel=0' + (sec ? '&start=' + sec : '');
    f.title = box.getAttribute('data-mdr-name');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.textContent = '';
    frame.appendChild(f);
    f.focus({ preventScroll: true });
    var r = frame.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) frame.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  // עם JavaScript הקישורים הופכים לכפתורים בתוך הדף, כדי שמעקב הלחיצות הכללי לא יספור אותם כיציאה מהאתר
  document.querySelectorAll('[data-mdr-play],[data-mdr-sec],[data-mdr-share]').forEach(function (a) {
    if (a.hasAttribute('data-mdr-share')) a.setAttribute('data-mdr-wa', a.href);
    a.setAttribute('href', '#madrich');
    a.setAttribute('role', 'button');
    a.removeAttribute('target');
  });
  document.addEventListener('click', function (e) {
    var box = e.target.closest('[data-mdr-tool]');
    if (!box) return;
    var tool = box.getAttribute('data-mdr-tool');
    var chip = e.target.closest('[data-mdr-sec]');
    if (e.target.closest('[data-mdr-play]')) {
      e.preventDefault();
      ev('madrich_play', { tool: tool });
      load(box, 0);
    } else if (chip) {
      e.preventDefault();
      var sec = Number(chip.getAttribute('data-mdr-sec'));
      box.querySelectorAll('[data-mdr-sec]').forEach(function (a) { a.removeAttribute('aria-current'); });
      chip.setAttribute('aria-current', 'true');
      ev('madrich_chapter', { tool: tool, sec: sec });
      load(box, sec);
    } else if (e.target.closest('[data-mdr-cta]')) {
      ev('madrich_cta', { tool: tool });
    } else {
      var s = e.target.closest('[data-mdr-share]');
      if (!s) return;
      e.preventDefault();
      var how = navigator.share ? 'native' : 'wa_link';
      var wa = s.getAttribute('data-mdr-wa');
      ev('madrich_share', { tool: tool, how: how });
      if (!navigator.share) { window.open(wa, '_blank', 'noopener'); return; }
      navigator.share({ title: box.getAttribute('data-mdr-name'), url: s.getAttribute('data-mdr-share') }).catch(function (err) {
        if (!err || err.name !== 'AbortError') location.href = wa;
      });
    }
  });
})();
