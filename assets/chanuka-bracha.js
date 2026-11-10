// כרטיס ברכה לחנוכה – /kodesh/chanuka/bracha/
// מצייר על canvas (1080x1350, מתאים לווטסאפ), בלי תמונות מבחוץ: חנוכייה, נרות וסביבון מצוירים בקוד.
(function () {
  'use strict';
  var TOOL = 'chanuka_bracha', KEY = 'kodesh-chanuka-bracha';
  function $(id) { return document.getElementById(id); }
  var W = 1080, Hh = 1350;
  var THEMES = {
    zahav: { bg1: '#141a2e', bg2: '#060912', ink: '#f6ecd2', acc: '#e0b860', soft: 'rgba(224,184,96,.35)', name: 'זהב בלילה' },
    shelleg: { bg1: '#fbf6ea', bg2: '#efe3c6', ink: '#1d2a4a', acc: '#a77a22', soft: 'rgba(167,122,34,.35)', name: 'לבן וזהב' },
    tchelet: { bg1: '#163a6b', bg2: '#0a1c3a', ink: '#ffffff', acc: '#9fd0ff', soft: 'rgba(159,208,255,.35)', name: 'תכלת' }
  };
  var st = { theme: 'zahav', greet: 'חנוכה שמח!', line: 'שיהיה לכם חג של אור, שמחה וניסים', sign: '', art: 'chanukiya' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || '{}'); for (var k in sv) if (k in st) st[k] = sv[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, theme: st.theme, greet: st.greet, art: st.art }); }

  var serif = (getComputedStyle(document.documentElement).getPropertyValue('--serif') || '').trim() || '"Frank Ruhl Libre", David, serif';
  var sans = (getComputedStyle(document.documentElement).getPropertyValue('--sans') || '').trim() || 'Assistant, Arial, sans-serif';

  function flame(g, x, y, s) {
    var gr = g.createRadialGradient(x, y + s * .35, 1, x, y + s * .2, s * 1.1);
    gr.addColorStop(0, '#fff8d6'); gr.addColorStop(.45, '#ffc04a'); gr.addColorStop(1, 'rgba(226,98,15,0)');
    g.fillStyle = 'rgba(255,190,80,.12)'; g.beginPath(); g.arc(x, y + s * .2, s * 1.05, 0, 7); g.fill();
    g.fillStyle = gr; g.beginPath();
    g.moveTo(x, y - s); g.bezierCurveTo(x + s * .7, y - s * .1, x + s * .55, y + s * .75, x, y + s * .8);
    g.bezierCurveTo(x - s * .55, y + s * .75, x - s * .7, y - s * .1, x, y - s); g.fill();
  }
  function chanukiya(g, T, cx, top) {
    g.strokeStyle = T.acc; g.fillStyle = T.acc; g.lineWidth = 12; g.lineCap = 'round';
    var arm = [300, 240, 180, 120]; // רוחב חצי קשת לכל זוג
    for (var i = 0; i < 4; i++) {
      g.beginPath(); g.moveTo(cx - arm[i], top + 40); g.quadraticCurveTo(cx - arm[i], top + 40 + arm[i] * .95, cx, top + 40 + arm[i] * .95);
      g.quadraticCurveTo(cx + arm[i], top + 40 + arm[i] * .95, cx + arm[i], top + 40); g.stroke();
    }
    g.beginPath(); g.moveTo(cx, top + 10); g.lineTo(cx, top + 420); g.stroke();
    g.fillRect(cx - 120, top + 415, 240, 18); g.fillRect(cx - 70, top + 395, 140, 22);
    var xs = [-300, -240, -180, -120, 120, 180, 240, 300];
    xs.forEach(function (dx) { g.fillRect(cx + dx - 22, top + 30, 44, 14); flame(g, cx + dx, top - 12, 26); });
    g.fillRect(cx - 22, top - 2, 44, 14); flame(g, cx, top - 44, 28); // השמש גבוה יותר
  }
  function candles(g, T, cx, top) {
    var cols = ['#e05a5a', '#f2b84b', '#5aa0e0', '#7ac77a', '#c784e0', '#f2b84b', '#e05a5a', '#5aa0e0'];
    for (var i = 0; i < 8; i++) {
      var x = cx - 350 + i * 100, h = 190 + (i % 3) * 25, y = top + 360 - h;
      g.fillStyle = cols[i]; g.fillRect(x - 18, y, 36, h);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 12, y + 8, 8, h - 16);
      g.strokeStyle = '#333'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 14); g.stroke();
      flame(g, x, y - 42, 26);
    }
    g.fillStyle = T.acc; g.fillRect(cx - 420, top + 360, 840, 20);
  }
  function sevivon(g, T, cx, top) {
    g.save(); g.translate(cx, top + 200); g.rotate(-0.18);
    g.fillStyle = T.acc; g.fillRect(-12, -250, 24, 90);
    g.beginPath(); g.moveTo(-150, -160); g.lineTo(150, -160); g.lineTo(150, 60); g.lineTo(0, 230); g.lineTo(-150, 60); g.closePath(); g.fill();
    g.fillStyle = T.bg2; g.font = 'bold 190px ' + serif; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('נ', 0, -40);
    g.restore();
    [[-330, 40], [330, 120], [-300, 330], [310, 380]].forEach(function (p, i) { flame(g, cx + p[0], top + p[1], 18 + i * 3); });
  }
  function wrapLines(g, text, maxW) {
    var words = text.split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function draw(c) {
    var g = c.getContext('2d'), T = THEMES[st.theme];
    var bg = g.createLinearGradient(0, 0, 0, Hh); bg.addColorStop(0, T.bg1); bg.addColorStop(1, T.bg2);
    g.fillStyle = bg; g.fillRect(0, 0, W, Hh);
    g.strokeStyle = T.soft; g.lineWidth = 4; g.strokeRect(36, 36, W - 72, Hh - 72);
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = T.ink; g.font = '600 34px ' + sans; g.fillText('בס"ד', W - 110, 96);
    if (st.art === 'candles') candles(g, T, W / 2, 170); else if (st.art === 'sevivon') sevivon(g, T, W / 2, 170); else chanukiya(g, T, W / 2, 230);
    g.fillStyle = T.acc; g.font = 'bold 128px ' + serif; g.fillText(st.greet, W / 2, 820);
    g.fillStyle = T.ink; g.font = '48px ' + serif;
    var lines = wrapLines(g, st.line, W - 220).slice(0, 3), y = 920;
    lines.forEach(function (l) { g.fillText(l, W / 2, y); y += 66; });
    if (st.sign.trim()) { g.fillStyle = T.acc; g.font = 'bold 56px ' + serif; g.fillText(st.sign.trim(), W / 2, Math.max(y + 60, 1140)); }
    g.globalAlpha = .6; g.fillStyle = T.ink; g.font = '26px ' + sans; g.fillText('כרטיס משלכם בחינם: hakelim.com/kodesh/chanuka', W / 2, Hh - 70); g.globalAlpha = 1;
  }
  var view = $('br-canvas');
  function render() { draw(view); }

  function bindChoice(name, key) {
    document.querySelectorAll('input[name=' + name + ']').forEach(function (r) {
      r.checked = r.value === st[key];
      r.addEventListener('change', function () { if (r.checked) { st[key] = r.value; save(); render(); } });
    });
  }
  bindChoice('br-theme', 'theme'); bindChoice('br-art', 'art'); bindChoice('br-greet', 'greet');
  var line = $('br-line'), sign = $('br-sign');
  line.value = st.line; sign.value = st.sign;
  line.addEventListener('input', function () { st.line = line.value; save(); render(); });
  sign.addEventListener('input', function () { st.sign = sign.value; save(); render(); waLink(); });
  document.querySelectorAll('[data-line]').forEach(function (b) {
    b.addEventListener('click', function () { line.value = st.line = b.getAttribute('data-line'); save(); render(); });
  });

  function say(t) { $('br-msg').textContent = t; }
  $('br-share').onclick = function () {
    var c = document.createElement('canvas'); c.width = W; c.height = Hh; draw(c);
    c.toBlob(function (b) {
      if (!b) { say('לא הצלחתי לשמור. אפשר לצלם מסך'); return; }
      var name = 'chanuka-sameach.png', file;
      try { file = new File([b], name, { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: st.greet }).catch(function () {});
        used('share');
      } else {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        say('התמונה ירדה. שולחים אותה בווטסאפ כמו כל תמונה.');
        used('download');
      }
    }, 'image/png');
  };
  function waLink() {
    var t = st.greet + ' 🕎\n' + (st.sign.trim() ? st.sign.trim() + '\n' : '') + '\nרוצים לשלוח כרטיס ברכה משלכם? בחינם:\n' + location.origin + '/kodesh/chanuka/bracha/';
    $('br-wa').href = 'https://wa.me/?text=' + encodeURIComponent(t);
  }
  $('br-wa').addEventListener('click', function () { used('wa'); });
  // הגופן נטען אחרי הדף – מציירים שוב כשהוא מוכן
  render(); waLink();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  setTimeout(render, 800);
})();
