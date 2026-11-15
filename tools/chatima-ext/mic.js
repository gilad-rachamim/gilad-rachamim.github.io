// מבקש רשות למיקרופון פעם אחת, בשביל 🎤 בחלון התוסף ובחלון הצד (שם כרום לא יכול לשאול)
(function () {
  var st = document.getElementById('st');
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
    s.getTracks().forEach(function (t) { t.stop(); });
    st.textContent = '✓ המיקרופון מאושר. חוזרים לתוסף ולוחצים 🎤. אפשר לסגור את הדף.';
    setTimeout(function () { window.close(); }, 4000);
  }, function () {
    st.textContent = 'המיקרופון חסום. לוחצים על 🔒 ליד הכתובת למעלה ← מיקרופון ← "לאפשר", ומרעננים.';
  });
})();
