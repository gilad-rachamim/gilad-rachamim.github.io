/* Shortcuts library page: copy buttons for the manual route + usage events for downloads. */
(function () {
  var root = document.getElementById('kz-list'); if (!root) return;
  root.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]');
    if (c) {
      var t = c.getAttribute('data-copy'), old = c.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
        c.textContent = 'הועתק ✓'; setTimeout(function () { c.textContent = old; }, 2000);
      }, function () { c.textContent = 'לא הצלחתי להעתיק'; });
      if (window.toolUsed) window.toolUsed('iphone_kizurei_derech', { how: 'copy', k: c.getAttribute('data-k') });
      return;
    }
    var d = e.target.closest('a[data-kz]');
    if (d && window.toolUsed) window.toolUsed('iphone_kizurei_derech', { how: 'download', k: d.getAttribute('data-kz') });
  });
})();
