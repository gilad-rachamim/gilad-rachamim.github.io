/* Home-screen icon builder. Draws an icon on a canvas (on the device), lets you save it as a picture,
   and can prepare this very page so that "Add to Home Screen" creates an icon that opens the chosen tool:
   the page swaps its touch icon and title, and when it is later opened from the home screen it jumps to the tool. */
(function () {
  var cv = document.getElementById('wg-cv'); if (!cv) return;
  function $(id) { return document.getElementById(id); }
  var COLORS = { gold: ['#e8c66a', '#a8791f'], blue: ['#4f8df7', '#1c3f9e'], green: ['#3fbf7f', '#136b45'], red: ['#f0605a', '#9c1f2b'], purple: ['#9a6cf0', '#4a2aa0'], dark: ['#3a3f4b', '#12141a'] };
  var st = { color: 'gold' };

  // opened from the home screen with a target? go straight to the tool (only paths inside this site)
  var m = /[#&]go=([^&]+)/.exec(location.hash || '');
  var go = m ? decodeURIComponent(m[1]) : '';
  var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (go && /^\/kelim\/[a-z0-9\/-]*$/.test(go) && standalone) { location.replace(go); return; }

  function tool() { var o = $('wg-tool').selectedOptions[0]; return { path: o.value, name: o.getAttribute('data-n'), emo: o.getAttribute('data-e') }; }
  function draw() {
    var x = cv.getContext('2d'), s = cv.width, c = COLORS[st.color] || COLORS.gold;
    var g = x.createLinearGradient(0, 0, s, s); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    var e = ($('wg-emo').value || tool().emo).trim();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    var fs = Math.round(s * (Array.from(e).length > 2 ? .3 : .52));
    x.font = '700 ' + fs + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';
    x.fillStyle = '#fff'; x.fillText(e, s / 2, s / 2 + s * .03);
  }
  function fill() { var t = tool(); $('wg-name').value = t.name; $('wg-emo').value = t.emo; draw(); }
  $('wg-tool').addEventListener('change', function () { fill(); $('wg-ready').hidden = true; });
  $('wg-emo').addEventListener('input', draw);
  [].forEach.call(document.querySelectorAll('#wg-color button'), function (b) {
    b.addEventListener('click', function () {
      [].forEach.call(document.querySelectorAll('#wg-color button'), function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      st.color = b.getAttribute('data-c'); draw();
    });
  });
  function use(how) { if (window.toolUsed) window.toolUsed('iphone_widgetim', { how: how, t: tool().path }); }

  $('wg-save').addEventListener('click', function () {
    cv.toBlob(function (b) {
      var name = 'icon-' + (tool().path.replace(/\/$/, '').split('/').pop() || 'kelim') + '.png';
      var f = null; try { f = new File([b], name, { type: 'image/png' }); } catch (e) {}
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(function () {}); }
      else { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
      use('save');
    }, 'image/png');
  });

  $('wg-apply').addEventListener('click', function () {
    var t = tool(), name = ($('wg-name').value || t.name).trim().slice(0, 30), url = cv.toDataURL('image/png');
    [].forEach.call(document.querySelectorAll('link[rel~="apple-touch-icon"],link[rel="manifest"],link[rel~="icon"]'), function (l) { l.remove(); });
    var l = document.createElement('link'); l.rel = 'apple-touch-icon'; l.href = url; document.head.appendChild(l);
    var mt = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!mt) { mt = document.createElement('meta'); mt.name = 'apple-mobile-web-app-title'; document.head.appendChild(mt); }
    mt.content = name; document.title = name;
    try { history.replaceState(null, '', location.pathname + '#go=' + encodeURIComponent(t.path)); } catch (e) {}
    $('wg-ready-name').textContent = name;
    var r = $('wg-ready'); r.hidden = false;
    try { r.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
    use('apply');
  });

  // came back to a prepared link in the browser (not from the home screen): preselect that tool
  if (go) { var o = $('wg-tool').querySelector('option[value="' + go.replace(/"/g, '') + '"]'); if (o) o.selected = true; }
  fill();
})();
