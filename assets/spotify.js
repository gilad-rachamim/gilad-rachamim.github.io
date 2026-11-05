// נגן ספוטיפי קל: ה-iframe נוצר רק כשלוחצים על הכפתור, כדי שהדף יישאר מהיר.
// לחיצה בתוך הנגן עצמו לא נמדדת (דף של אתר אחר), ולכן המדידה על הכפתור, ב-track.js.
(function () {
  document.querySelectorAll('button[data-sp]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.pl');
      var slot = card && card.querySelector('.sp');
      if (!slot) return;
      var f = document.createElement('iframe');
      f.src = 'https://open.spotify.com/embed/playlist/' + btn.getAttribute('data-sp') + '?utm_source=generator&theme=0';
      f.title = 'נגן ספוטיפי: ' + (btn.getAttribute('data-style') || 'פלייליסט');
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      f.loading = 'eager';
      slot.appendChild(f);
      btn.remove();
    });
  });
})();
