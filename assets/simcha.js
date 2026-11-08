// R3 – הזמנה לכל שמחה (כלי קודש): בר/בת מצווה, שלום זכר, סיום מסכת, חנוכת בית ועוד → תמונה לווטסאפ + טקסט.
// ברית, זבד הבת ופדיון הבן נשארים במחולל הקיים (/mohel/hazmana/?k=...), עם קישורים בראש הדף.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('sm-form'), cv = $('sm-canvas');
  if (!form || !cv) return;
  var ctx = cv.getContext('2d');
  var KINDS = {
    bar: { head: 'בר מצווה', top: 'בשבח והודיה לה\' יתברך', line: 'נשמח לראותכם בשמחת בר המצווה של בננו', label: 'שם הבן', ph: 'יוסף נ"י' },
    bat: { head: 'בת מצווה', top: 'בשבח והודיה לה\' יתברך', line: 'נשמח לראותכם בשמחת בת המצווה של בתנו', label: 'שם הבת', ph: 'מרים תחי\'' },
    zachar: { head: 'שלום זכר', top: 'בשבח והודיה לה\' יתברך', line: 'נשמח לראותכם בשלום זכר לכבוד הולדת בננו', label: 'שם או כינוי (לא חובה)', ph: '' },
    siyum: { head: 'סיום מסכת', top: 'הדרן עלך', line: 'נשמח לראותכם בסעודת מצווה לכבוד סיום', label: 'מה מסיימים', ph: 'מסכת ברכות' },
    bayit: { head: 'חנוכת הבית', top: 'מזמור שיר חנוכת הבית לדוד', line: 'נשמח לראותכם בשמחת חנוכת ביתנו החדש', label: 'שורה נוספת (לא חובה)', ph: 'וקביעת מזוזות' },
    sheva: { head: 'שבע ברכות', top: 'קול ששון וקול שמחה, קול חתן וקול כלה', line: 'נשמח לראותכם בסעודת שבע ברכות לכבוד', label: 'שמות החתן והכלה', ph: 'יוסף ורחל' },
    chatan: { head: 'שבת חתן', top: 'בשבח והודיה לה\' יתברך', line: 'נשמח לראותכם בשבת העלייה לתורה של החתן', label: 'שם החתן', ph: 'יוסף נ"י' },
    other: { head: 'הזמנה', top: 'בשבח והודיה לה\' יתברך', line: 'נשמח לראותכם בשמחתנו', label: 'שם השמחה', ph: 'שבע ברכות' }
  };
  var THEMES = {
    night: { bg1: '#0e1628', bg2: '#1b2a4a', frame: '#d4b062', title: '#e6c57e', text: '#eef0f6', sub: '#d4b062', foot: '#9aa6bf' },
    parch: { bg1: '#f6efdd', bg2: '#ead9b4', frame: '#8a6a2a', title: '#6b4f1a', text: '#241d14', sub: '#8a6a2a', foot: '#6b5d45' },
    black: { bg1: '#16130f', bg2: '#2a2219', frame: '#c9a55c', title: '#dcbb74', text: '#f5eedf', sub: '#c9a55c', foot: '#a99c82' },
    sky: { bg1: '#eaf3fb', bg2: '#cfe2f3', frame: '#2a5d8f', title: '#1e4670', text: '#14273b', sub: '#2a5d8f', foot: '#4c6680' }
  };
  var SIZES = { square: [1080, 1080], story: [1080, 1920] };
  var SERIF = '"Frank Ruhl Libre", "David Libre", David, serif', SANS = '"Assistant", Arial, sans-serif';
  var KEEP = ['hosts', 'theme', 'size'];

  function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; }
  function kind() { var r = form.querySelector('input[name=k]:checked'); return r ? r.value : 'bar'; }
  function K() { return KINDS[kind()] || KINDS.bar; }
  function headText() { return kind() === 'other' ? (val('name') || 'הזמנה') : K().head; }
  function lines() {
    var k = kind(), out = [], name = val('name');
    if (k === 'other') out.push(K().line);
    else if (k === 'siyum') out.push(K().line + (name ? ' ' + name : ''));
    else if (k === 'bayit') { out.push(K().line); if (name) out.push(name); }
    else { out.push(K().line); if (name) out.push('@@' + name); }
    return out;
  }
  function wrap(text, font, maxW) {
    ctx.font = font;
    var words = text.split(/\s+/).filter(Boolean), out = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    if (line) out.push(line);
    return out;
  }

  function draw() {
    var th = THEMES[val('theme')] || THEMES.night, sz = SIZES[val('size')] || SIZES.square, W = sz[0], H = sz[1], k = K();
    cv.width = W; cv.height = H;
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var M = 60, maxW = W - 2 * M - 100;
    ctx.strokeStyle = th.frame; ctx.lineWidth = 3; ctx.strokeRect(M / 2, M / 2, W - M, H - M);
    ctx.lineWidth = 1; ctx.strokeRect(M / 2 + 10, M / 2 + 10, W - M - 20, H - M - 20);
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = th.sub; ctx.font = '600 28px ' + SANS;
    ctx.fillText('בס"ד', W - M - 20, M + 45);
    ctx.textAlign = 'center';
    // רשימת שורות: [טקסט, גופן, צבע, ריווח אחרי]
    var rows = [], s = H > W ? 1.15 : 1;
    rows.push([k.top, '600 ' + Math.round(34 * s) + 'px ' + SERIF, th.sub, 30 * s]);
    wrap(headText(), '700 ' + Math.round(92 * s) + 'px ' + SERIF, maxW).forEach(function (l) { rows.push([l, '700 ' + Math.round(92 * s) + 'px ' + SERIF, th.title, 20 * s]); });
    rows.push(['—', '400 30px ' + SANS, th.frame, 30 * s]);
    lines().forEach(function (t) {
      if (t.indexOf('@@') === 0) wrap(t.slice(2), '700 ' + Math.round(64 * s) + 'px ' + SERIF, maxW).forEach(function (l) { rows.push([l, '700 ' + Math.round(64 * s) + 'px ' + SERIF, th.title, 20 * s]); });
      else wrap(t, '400 ' + Math.round(40 * s) + 'px ' + SANS, maxW).forEach(function (l) { rows.push([l, '400 ' + Math.round(40 * s) + 'px ' + SANS, th.text, 14 * s]); });
    });
    var when = [val('date'), val('time') ? 'בשעה ' + val('time') : ''].filter(Boolean).join(' · ');
    if (when || val('place')) rows.push(['', '400 20px ' + SANS, th.text, 26 * s]);
    if (when) wrap(when, '700 ' + Math.round(42 * s) + 'px ' + SANS, maxW).forEach(function (l) { rows.push([l, '700 ' + Math.round(42 * s) + 'px ' + SANS, th.text, 14 * s]); });
    if (val('place')) wrap(val('place'), '400 ' + Math.round(40 * s) + 'px ' + SANS, maxW).forEach(function (l) { rows.push([l, '400 ' + Math.round(40 * s) + 'px ' + SANS, th.text, 14 * s]); });
    if (val('note')) { rows.push(['', '400 20px ' + SANS, th.text, 10 * s]); wrap(val('note'), 'italic 400 ' + Math.round(34 * s) + 'px ' + SANS, maxW).forEach(function (l) { rows.push([l, 'italic 400 ' + Math.round(34 * s) + 'px ' + SANS, th.sub, 12 * s]); }); }
    if (val('hosts')) { rows.push(['', '400 20px ' + SANS, th.text, 30 * s]); rows.push([val('hosts'), '700 ' + Math.round(48 * s) + 'px ' + SERIF, th.title, 10]); }
    function sizeOf(f) { return parseInt(f.match(/(\d+)px/)[1], 10); }
    var total = rows.reduce(function (a, r) { return a + (r[0] ? sizeOf(r[1]) * 1.15 : 0) + r[3]; }, 0);
    var y = Math.max(M + 80, (H - total) / 2);
    rows.forEach(function (r) {
      if (r[0]) { var fs = sizeOf(r[1]); ctx.font = r[1]; ctx.fillStyle = r[2]; ctx.fillText(r[0], W / 2, y + fs); y += fs * 1.15; }
      y += r[3];
    });
    ctx.fillStyle = th.foot; ctx.font = '400 22px ' + SANS;
    ctx.fillText('נוצר בחינם בכלי קודש', W / 2, H - M - 30);
  }

  function setKind() {
    var k = K();
    $('sm-name-l').textContent = k.label;
    $('sm-name').placeholder = k.ph;
    draw();
  }

  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('600 40px "Frank Ruhl Libre"'), document.fonts.load('400 40px "Assistant"'), document.fonts.load('700 40px "Assistant"')]).catch(function () {}) : Promise.resolve();
  try { var st = JSON.parse(localStorage.getItem('kodesh-simcha') || '{}'); KEEP.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && st[k]) el.value = st[k]; }); } catch (e) {}
  var qk = new URLSearchParams(location.search).get('k');
  if (qk && KINDS[qk]) { var r = form.querySelector('input[name=k][value="' + qk + '"]'); if (r) r.checked = true; }
  function upd(e) {
    var o = {}; KEEP.forEach(function (k) { o[k] = val(k); });
    try { localStorage.setItem('kodesh-simcha', JSON.stringify(o)); } catch (er) {}
    if (e && e.target && e.target.name === 'k') setKind(); else draw();
  }
  form.addEventListener('input', upd);
  form.addEventListener('change', upd);
  fontsReady.then(setKind);

  function blob() { return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); }
  function fname() { return ('הזמנה-' + headText()).replace(/[\\/:*?"<>|\s]+/g, '-') + '.png'; }
  function used(how) { if (window.toolUsed) window.toolUsed('simcha', { how: how, k: kind(), theme: val('theme') }); }
  function download(b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); }
  function text() {
    var t = '*' + headText() + '*\n\n' + lines().map(function (l) { return l.replace(/^@@/, ''); }).join(' ') + '\n';
    if (val('date') || val('time')) t += '\n📅 ' + [val('date'), val('time') ? 'בשעה ' + val('time') : ''].filter(Boolean).join(' · ');
    if (val('place')) t += '\n📍 ' + val('place') + '\nניווט: https://waze.com/ul?q=' + encodeURIComponent(val('place'));
    if (val('note')) t += '\n\n' + val('note');
    if (val('hosts')) t += '\n\n' + val('hosts');
    return t;
  }
  $('sm-dl').addEventListener('click', function () { blob().then(function (b) { download(b); used('download'); }); });
  $('sm-share').addEventListener('click', function () {
    blob().then(function (b) {
      var f = new File([b], fname(), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        navigator.share({ files: [f], text: text() }).then(function () { used('share'); }).catch(function () {});
      } else { download(b); used('download_fallback'); $('sm-tip').hidden = false; }
    });
  });
  $('sm-wa').addEventListener('click', function (e) { e.currentTarget.href = 'https://wa.me/?text=' + encodeURIComponent(text()); used('wa_text'); });
  $('sm-text').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(text()) : Promise.reject()).then(function () { b.textContent = 'הטקסט הועתק ✓'; used('copy_text'); });
  });
})();
