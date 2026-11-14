// חלון קטן: "לתרגם תמיד את האתר הזה". כרום מאפשר לבקש גישה לאתר רק מתוך לחיצה בדף של התוסף,
// ולכן הפס שבדף פותח את החלון הזה, והלחיצה כאן מבקשת את הרשות.
(function () {
  var q = new URLSearchParams(location.search), origin = q.get('o') || '';
  var ok = /^https?:\/\/[^/]+$/.test(origin);
  document.getElementById('site').textContent = ok ? origin.replace(/^https?:\/\//, '') : '?';
  document.getElementById('no').onclick = function () { window.close(); };
  document.getElementById('yes').onclick = function () {
    if (!ok) return;
    chrome.permissions.request({ origins: [origin + '/*'] }, function (granted) {
      void chrome.runtime.lastError;
      if (!granted) { document.getElementById('msg').textContent = 'בלי הגישה לאתר אי אפשר לתרגם אותו לבד. אפשר תמיד לתרגם בלחיצה (Alt+Shift+T).'; return; }
      chrome.runtime.sendMessage({ trAlways: origin, on: true }, function () { void chrome.runtime.lastError; window.close(); });
    });
  };
})();
