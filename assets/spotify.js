// נגן ספוטיפי קל: ה-iframe נוצר רק כשלוחצים על הכפתור, כדי שהדף יישאר מהיר.
// לחיצה בתוך הנגן עצמו לא נמדדת (דף של אתר אחר), ולכן המדידה על הכפתור, ב-track.js.
// ברוסית ובאנגלית: כותרת הנגן בשפת הדף, ושם הסגנון מכותרת הכרטיס (data-style נשאר בעברית בשביל המדידה).
(function () {
  var L = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
  var T = function (d) { return d[L] || d.he; };
  document.querySelectorAll('button[data-sp]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.pl');
      var slot = card && card.querySelector('.sp');
      if (!slot) return;
      var h = card.querySelector('h3');
      var style = L === 'he' ? btn.getAttribute('data-style') : (h && h.textContent.trim());
      var f = document.createElement('iframe');
      f.src = 'https://open.spotify.com/embed/playlist/' + btn.getAttribute('data-sp') + '?utm_source=generator&theme=0';
      f.title = T({ he: 'נגן ספוטיפי: ', ru: 'Плеер Spotify: ', en: 'Spotify player: ' }) + (style || T({ he: 'פלייליסט', ru: 'плейлист', en: 'playlist' }));
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      f.loading = 'eager';
      slot.appendChild(f);
      btn.remove();
    });
  });
})();
