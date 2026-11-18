/* On-screen nikud keyboard. The text box is the single source of truth; below it every letter is a button.
   Tap a letter, tap a nikud sign: the sign is attached to that letter and the selection moves to the next letter.
   Everything stays on the device. */
(function () {
  var ta = document.getElementById('nk-text'); if (!ta) return;
  function $(id) { return document.getElementById(id); }
  var view = $('nk-view'), keys = $('nk-keys'), msg = $('nk-msg');
  var MARK = /[֑-ׇֽֿׁׂׅׄ]/, HEB = /[א-ת]/;
  var VOWELS = /[ְ-ׇֻ]/g;       // one vowel per letter: a new vowel replaces the old one
  var sel = -1, used = false;

  function split(s) {                           // -> [{b: base char, m: marks}]
    var out = [], a = Array.from(s);
    for (var i = 0; i < a.length; i++) {
      if (MARK.test(a[i]) && out.length) out[out.length - 1].m += a[i];
      else out.push({ b: a[i], m: '' });
    }
    return out;
  }
  function join(c) { return c.map(function (x) { return x.b + x.m; }).join(''); }
  function firstHeb(c, from) { for (var i = from; i < c.length; i++) if (HEB.test(c[i].b)) return i; return -1; }

  function render() {
    var c = split(ta.value);
    if (sel >= c.length || (sel >= 0 && !HEB.test(c[sel].b))) sel = -1;
    if (sel < 0) sel = firstHeb(c, 0);
    view.textContent = '';
    if (!c.length) { var p = document.createElement('span'); p.className = 'ip-why'; p.textContent = 'האותיות יופיעו כאן. לוחצים על אות ואז על סימן ניקוד.'; view.appendChild(p); return; }
    c.forEach(function (x, i) {
      var el;
      if (HEB.test(x.b)) {
        el = document.createElement('button'); el.type = 'button'; el.className = 'nk-l';
        el.setAttribute('aria-pressed', i === sel ? 'true' : 'false'); el.setAttribute('data-i', i);
      } else { el = document.createElement('span'); el.className = x.b === '\n' ? 'nk-br' : 'nk-s'; }
      el.textContent = x.b === ' ' ? ' ' : x.b + x.m;
      view.appendChild(el);
    });
  }
  function say(t) { msg.textContent = t; }
  function use(how) { if (window.toolUsed && !used) { used = true; window.toolUsed('iphone_nikud', { how: how }); } }

  ta.addEventListener('input', function () { sel = -1; render(); });
  view.addEventListener('click', function (e) {
    var b = e.target.closest('.nk-l'); if (!b) return;
    sel = +b.getAttribute('data-i'); render();
  });
  keys.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-m],button[data-act]'); if (!b) return;
    var c = split(ta.value);
    if (sel < 0 || !c[sel]) { say('קודם מקלידים מילה בתיבה, ואז לוחצים על אות.'); return; }
    var act = b.getAttribute('data-act'), m = b.getAttribute('data-m');
    if (act === 'clear') c[sel].m = '';
    else if (act === 'skip') { /* nothing, just move on */ }
    else if (VOWELS.test(m)) { VOWELS.lastIndex = 0; c[sel].m = c[sel].m.replace(VOWELS, '') + m; }
    else c[sel].m = c[sel].m.indexOf(m) >= 0 ? c[sel].m.replace(m, '') : m + c[sel].m;   // dagesh / shin dots toggle, kept before the vowel
    VOWELS.lastIndex = 0;
    ta.value = join(c);
    if (act !== 'clear' && (act === 'skip' || VOWELS.test(m || ''))) { VOWELS.lastIndex = 0; var n = firstHeb(c, sel + 1); if (n >= 0) sel = n; }
    VOWELS.lastIndex = 0;
    say(''); render(); use('mark');
  });

  $('nk-copy').addEventListener('click', function () {
    var b = this, t = ta.value;
    if (!t.trim()) { say('אין עדיין טקסט להעתיק.'); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
      b.textContent = 'הועתק ✓ עכשיו מדביקים בווטסאפ'; setTimeout(function () { b.textContent = '📋 להעתיק את הטקסט'; }, 2500);
    }, function () { ta.focus(); ta.select(); say('סימנתי את הטקסט. לוחצים עליו ובוחרים "העתק".'); });
    use('copy');
  });
  $('nk-wa').addEventListener('click', function () {
    if (!ta.value.trim()) { say('אין עדיין טקסט לשלוח.'); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(ta.value), '_blank', 'noopener'); use('wa');
  });
  $('nk-strip').addEventListener('click', function () {
    ta.value = split(ta.value).map(function (x) { return x.b; }).join(''); sel = -1; render(); say('הניקוד הוסר.');
  });
  $('nk-demo').addEventListener('click', function () { ta.value = 'שלום עולם'; sel = -1; render(); say('לוחצים על אות ואז על סימן ניקוד.'); });
  render();
})();
