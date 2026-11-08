// סיפורים לילדים בהמשכים (כלי קודש): סרטונים מוכנים לכל פרק, מ-/kodesh/sipurim/vid/. הטקסטים מ-sipur-sifria.js.
(function () {
  'use strict';
  var box = document.getElementById('sy-list');
  if (!box || !window.SIPUR_LIB) return;
  var VID = '/kodesh/sipurim/vid/';
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function used(how, extra) {
    if (!window.toolUsed) return;
    var o = { how: how }; if (extra) for (var k in extra) o[k] = extra[k];
    window.toolUsed('sipurim', o);
  }
  function fname(s, i) { return s.title + ' - פרק ' + (i + 1) + '.mp4'; }

  window.SIPUR_LIB.filter(function (s) { return s.mode === 'kids'; }).forEach(function (s) {
    var sec = el('section', 'sy-story'); sec.id = s.id;
    sec.appendChild(el('h2', null, s.title));
    sec.appendChild(el('p', 'sy-about', s.about + ' · ' + s.chapters.length + ' פרקים'));
    var eps = el('div', 'sy-eps');
    s.chapters.forEach(function (text, i) {
      var src = VID + s.id + '-' + (i + 1) + '.mp4', ep = el('div', 'sy-ep');
      ep.appendChild(el('b', null, 'פרק ' + (i + 1) + ' מתוך ' + s.chapters.length));
      var v = el('video'); v.controls = true; v.preload = 'none'; v.playsInline = true;
      v.poster = VID + s.id + '-' + (i + 1) + '.jpg'; v.src = src;
      v.addEventListener('play', function once() { v.removeEventListener('play', once); used('play', { story: s.id, chapter: i + 1 }); });
      ep.appendChild(v);
      var row = el('div', 'share-row');
      var dl = el('a', 'btn btn-gold btn-sm', 'להורדה'); dl.href = src; dl.download = fname(s, i);
      dl.addEventListener('click', function () { used('download', { story: s.id, chapter: i + 1 }); });
      var sh = el('button', 'btn btn-line btn-sm', 'לשתף'); sh.type = 'button';
      sh.addEventListener('click', function () {
        var link = location.origin + '/kodesh/sipurim/#' + s.id, msg = s.title + ', פרק ' + (i + 1) + ' – סיפור לילדים לפני השינה: ' + link;
        sh.disabled = true; sh.textContent = 'מכין…';
        fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
          var f = new File([b], fname(s, i), { type: 'video/mp4' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], text: msg }).then(function () { used('share_file', { story: s.id, chapter: i + 1 }); });
          throw new Error('no file share');
        }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener');
          used('share_link', { story: s.id, chapter: i + 1 });
        }).then(function () { sh.disabled = false; sh.textContent = 'לשתף'; });
      });
      row.appendChild(dl); row.appendChild(sh); ep.appendChild(row);
      var d = el('details'); d.appendChild(el('summary', null, 'הטקסט של הפרק, להקראה')); d.appendChild(el('p', null, text));
      ep.appendChild(d);
      eps.appendChild(ep);
    });
    sec.appendChild(eps);
    box.appendChild(sec);
  });
  if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
})();
