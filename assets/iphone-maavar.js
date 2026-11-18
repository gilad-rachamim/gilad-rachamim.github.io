/* Checklist saved on the device only (localStorage). Used by the Android-to-iPhone page.
   Markup: [data-ip-check="storage-key"] wrapping input[type=checkbox][data-k]; #ipc-bar>span, #ipc-pct, #ipc-reset, #ipc-next */
(function () {
  var root = document.querySelector('[data-ip-check]'); if (!root) return;
  var KEY = root.getAttribute('data-ip-check'), TOOL = root.getAttribute('data-tool') || 'iphone_maavar';
  var boxes = [].slice.call(root.querySelectorAll('input[type=checkbox][data-k]'));
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { st = {}; }
  function $(id) { return document.getElementById(id); }
  var used = false;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function paint() {
    var done = 0, next = null;
    boxes.forEach(function (b) { b.checked = !!st[b.getAttribute('data-k')]; if (b.checked) done++; else if (!next) next = b; });
    var pct = boxes.length ? Math.round(done * 100 / boxes.length) : 0;
    var bar = $('ipc-bar'); if (bar) { bar.firstElementChild.style.width = pct + '%'; bar.setAttribute('aria-valuenow', pct); }
    var p = $('ipc-pct'); if (p) p.textContent = done === boxes.length ? 'סיימתם את כל הרשימה. מזל טוב על האייפון החדש 🎉' : 'סימנתם ' + done + ' מתוך ' + boxes.length + ' (' + pct + '%)';
    var n = $('ipc-next');
    if (n) {
      if (next) { var l = next.closest('li'); n.hidden = false; n.textContent = 'הצעד הבא: ' + (l.querySelector('b') || l).textContent.trim(); }
      else n.hidden = true;
    }
    return pct;
  }
  boxes.forEach(function (b) {
    b.addEventListener('change', function () {
      st[b.getAttribute('data-k')] = b.checked ? 1 : 0; save();
      var pct = paint();
      if (window.toolUsed && !used) { used = true; window.toolUsed(TOOL, { how: 'check' }); }
      if (pct === 100 && window.kelimEv) window.kelimEv('iphone_checklist_done', { tool: TOOL });
    });
  });
  var r = $('ipc-reset');
  if (r) r.addEventListener('click', function () { st = {}; save(); paint(); });
  paint();
})();
