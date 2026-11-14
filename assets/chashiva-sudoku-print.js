// סודוקו להדפסה – /kelim/chashiva/sudoku/lehadpasa/ (13.11.2026)
// מייצר דפי A4 עם 1, 2, 4 או 6 לוחות, ברמה שבוחרים, ועם דף פתרונות בסוף. גם 4×4 ו-6×6 לילדים.
// משתמש במחוללים של chashiva-sudoku.js (window.SDGEN) ושל chashiva-sudoku-kids.js (window.SDKIDS).
// ההדפסה נעשית מתוך iframe נקי, כך שבדף המודפס יש רק הלוחות (בלי תפריטים).
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_sudoku_print';
  function $(id) { return document.getElementById(id); }
  if (!$('pr-sheets') || !window.SDGEN || !window.SDKIDS) return;

  var S = { N: 9, lv: 'beinoni', per: 4, pages: 1, sol: true, pics: false };
  var LV9 = [['kal', 'קל'], ['beinoni', 'בינוני'], ['kashe', 'קשה'], ['mumche', 'קשה מאוד']];
  var LVK = [['kal', 'קל'], ['kashe', 'מאתגר']];
  var boards = [], busy = false;
  var pre = ($('pr-sheets').getAttribute('data-n') || '');
  if (pre === '4' || pre === '6') { S.N = +pre; S.lv = 'kal'; S.per = 6; }

  function lvName() { var L = S.N === 9 ? LV9 : LVK; for (var i = 0; i < L.length; i++) if (L[i][0] === S.lv) return L[i][1]; return ''; }
  function chipRow(id, items, cur, key) {
    $(id).innerHTML = items.map(function (it) { return '<button type="button" data-v="' + it[0] + '" aria-pressed="' + (String(cur) === String(it[0])) + '">' + it[1] + '</button>'; }).join('');
    $(id).querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        var val = b.getAttribute('data-v'); S[key] = /^\d+$/.test(val) ? +val : val;
        if (key === 'N') { S.lv = S.N === 9 ? 'beinoni' : 'kal'; if (S.N !== 9 && S.per < 4) S.per = 6; }
        ui(); make();
      };
    });
  }
  function ui() {
    chipRow('pr-size', [[9, '9×9 רגיל'], [6, '6×6 לילדים'], [4, '4×4 לקטנים']], S.N, 'N');
    chipRow('pr-lv', S.N === 9 ? LV9 : LVK, S.lv, 'lv');
    chipRow('pr-per', [[1, 'לוח אחד גדול'], [2, '2 בדף'], [4, '4 בדף'], [6, '6 בדף']], S.per, 'per');
    chipRow('pr-pages', [[1, 'דף 1'], [2, '2 דפים'], [3, '3 דפים'], [5, '5 דפים']], S.pages, 'pages');
    $('pr-sol').checked = S.sol;
    $('pr-pics-row').hidden = S.N === 9; $('pr-pics').checked = S.pics;
  }

  // ---------- ציור לוח כ-SVG ----------
  function svg(P, sol, label) {
    var N = P.N || 9, bw = P.bw || 3, bh = P.bh || 3, c = 10, W = N * c, h = '';
    h += '<svg viewBox="-1 -1 ' + (W + 2) + ' ' + (W + 2) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">';
    h += '<rect x="0" y="0" width="' + W + '" height="' + W + '" fill="#fff"/>';
    for (var i = 0; i < N * N; i++) {
      var d = sol ? P.sol[i] : P.give[i]; if (!d) continue;
      var r = Math.floor(i / N), col = i % N, given = !!P.give[i];
      var t = (S.pics && N < 9) ? window.SDKIDS.PICS[d - 1] : d;
      h += '<text x="' + (col * c + c / 2) + '" y="' + (r * c + c / 2 + 0.3) + '" font-size="' + ((S.pics && N < 9) ? 6.2 : 6.6) + '" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-weight="' + (given ? 700 : 400) + '" fill="' + (given ? '#000' : '#555') + '">' + t + '</text>';
    }
    for (var k = 0; k <= N; k++) {
      var thickV = k % bw === 0, thickH = k % bh === 0;
      h += '<line x1="' + k * c + '" y1="0" x2="' + k * c + '" y2="' + W + '" stroke="#000" stroke-width="' + (thickV ? 0.7 : 0.18) + '"/>';
      h += '<line x1="0" y1="' + k * c + '" x2="' + W + '" y2="' + k * c + '" stroke="#000" stroke-width="' + (thickH ? 0.7 : 0.18) + '"/>';
    }
    return h + '</svg>';
  }
  function one() {
    var seed = 'print-' + S.N + '-' + S.lv + '-' + Date.now() + '-' + Math.random();
    if (S.N === 9) { var P = window.SDGEN.generate(seed, S.lv); P.N = 9; P.bw = 3; P.bh = 3; return P; }
    return window.SDKIDS.gen(S.N, seed, window.SDKIDS.CLUES[S.N][S.lv]);
  }

  function sheetsHtml(forPrint) {
    var out = '', per = S.per, total = boards.length, title = 'סודוקו ' + (S.N === 9 ? '' : S.N + '×' + S.N + ' ') + '· ' + lvName();
    for (var p = 0; p < total / per; p++) {
      out += '<section class="pr-sheet pr-per' + per + '"><header><b>' + title + '</b><span>שם: ____________</span></header><div class="pr-grid">';
      for (var j = p * per; j < Math.min(total, (p + 1) * per); j++) out += '<figure>' + svg(boards[j], false, 'לוח ' + (j + 1)) + '<figcaption>לוח ' + (j + 1) + '</figcaption></figure>';
      out += '</div><footer>עוד לוחות בחינם: hakelim.com/kelim/chashiva/sudoku/lehadpasa</footer></section>';
    }
    if (S.sol) {
      out += '<section class="pr-sheet pr-sol"><header><b>פתרונות · ' + title + '</b></header><div class="pr-grid">';
      boards.forEach(function (P, j) { out += '<figure>' + svg(P, true, 'פתרון לוח ' + (j + 1)) + '<figcaption>פתרון ' + (j + 1) + '</figcaption></figure>'; });
      out += '</div><footer>hakelim.com · הכלים של גילעד רחמים</footer></section>';
    }
    return out;
  }
  function render() { $('pr-sheets').innerHTML = sheetsHtml(false); }
  function make() {
    if (busy) return; busy = true; boards = [];
    var need = S.per * S.pages, btns = [$('pr-make'), $('pr-print')];
    btns.forEach(function (b) { b.disabled = true; });
    (function step() {
      if (boards.length >= need) { busy = false; btns.forEach(function (b) { b.disabled = false; }); $('pr-status').textContent = 'מוכן: ' + need + ' לוחות' + (S.sol ? ' + דף פתרונות' : '') + '.'; render(); return; }
      $('pr-status').textContent = 'מכין לוח ' + (boards.length + 1) + ' מתוך ' + need + '…';
      boards.push(one()); setTimeout(step, 0);
    })();
  }
  var CSS = '@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;direction:rtl;color:#000}' +
    '.pr-sheet{page-break-after:always;break-after:page;height:270mm;display:flex;flex-direction:column}.pr-sheet:last-child{page-break-after:auto;break-after:auto}' +
    'header{display:flex;justify-content:space-between;font-size:14pt;margin-bottom:5mm}footer{margin-top:auto;font-size:9pt;color:#444;text-align:center}' +
    '.pr-grid{display:grid;gap:8mm;justify-items:center;align-items:start}.pr-per1 .pr-grid{grid-template-columns:1fr}.pr-per1 svg{width:170mm}' +
    '.pr-per2 .pr-grid{grid-template-columns:1fr}.pr-per2 svg{width:108mm}.pr-per4 .pr-grid{grid-template-columns:1fr 1fr}.pr-per4 svg{width:84mm}' +
    '.pr-per6 .pr-grid{grid-template-columns:1fr 1fr}.pr-per6 svg{width:68mm}.pr-sol .pr-grid{grid-template-columns:repeat(4,1fr);gap:4mm}.pr-sol svg{width:42mm}' +
    'figure{margin:0;text-align:center}figcaption{font-size:10pt;margin-top:1mm}';
  function doPrint() {
    if (!boards.length) return;
    var f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-10px;top:-10px';
    document.body.appendChild(f);
    var d = f.contentWindow.document;
    d.open(); d.write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>סודוקו להדפסה – hakelim.com</title><style>' + CSS + '</style></head><body>' + sheetsHtml(true) + '</body></html>'); d.close();
    setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(function () { f.remove(); }, 2000); }, 250);
    if (CH && CH.used) CH.used(TOOL, 'print', { n: S.N, lv: S.lv, per: S.per, pages: S.pages, sol: S.sol });
  }
  $('pr-make').onclick = make;
  $('pr-print').onclick = doPrint;
  $('pr-sol').onchange = function () { S.sol = this.checked; render(); };
  $('pr-pics').onchange = function () { S.pics = this.checked; render(); };
  ui(); make();
})();
