/* מגילת אנטיוכוס: גודל אותיות והדפסה */
(function () {
  var box = document.getElementById('mg-text');
  if (!box) return;
  var KEY = 'chanuka_megila_size_v1', size = 1.5;
  try { var s = parseFloat(localStorage.getItem(KEY)); if (s >= 1.1 && s <= 2.6) size = s; } catch (e) {}
  function apply() {
    box.style.fontSize = size + 'rem';
    try { localStorage.setItem(KEY, size); } catch (e) {}
  }
  apply();
  var up = document.getElementById('mg-up'), dn = document.getElementById('mg-dn'), pr = document.getElementById('mg-print-btn');
  if (up) up.addEventListener('click', function () { size = Math.min(2.6, size + 0.2); apply(); });
  if (dn) dn.addEventListener('click', function () { size = Math.max(1.1, size - 0.2); apply(); });
  if (pr) pr.addEventListener('click', function () {
    if (window.toolUsed) { try { window.toolUsed('chanuka_megila', { action: 'print' }); } catch (e) {} }
    var old = document.getElementById('mg-print'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'mg-print'; d.setAttribute('dir', 'rtl'); d.setAttribute('lang', 'arc');
    d.innerHTML = '<h1>מגילת אנטיוכוס</h1>' + box.innerHTML.replace(/<b>[^<]*<\/b>/g, '');
    document.body.appendChild(d);
    document.body.classList.add('mg-printing');
    window.print();
    setTimeout(function () { document.body.classList.remove('mg-printing'); d.remove(); }, 800);
  });
  if (window.toolUsed) { try { window.toolUsed('chanuka_megila', { action: 'open' }); } catch (e) {} }
})();
