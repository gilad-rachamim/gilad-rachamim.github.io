/* מתאים לבד את גובה ה-iframe של כלי מ-hakelim.com בהטמעה באתר. שורה אחת:
   <script src="https://hakelim.com/assets/hk-embed.js" defer></script>
   מחפש iframe עם data-hk-embed ומעדכן את הגובה לפי ההודעה שהכלי שולח. בלי עוגיות ובלי שמירת פרטים. */
(function () {
  window.addEventListener("message", function (e) {
    if (e.origin !== "https://hakelim.com" || !e.data || typeof e.data.hkH !== "number") return;
    var fr = document.querySelectorAll("iframe[data-hk-embed]");
    for (var i = 0; i < fr.length; i++) {
      if (fr[i].contentWindow === e.source) { fr[i].style.height = Math.min(Math.max(e.data.hkH, 200), 4000) + "px"; }
    }
  });
})();
