// דף לבית לפני מילואים: הכול נשמר בטלפון (localStorage), יוצא כדף להדפסה, כטקסט לווטסאפ או כתמונה.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('bt-form'), card = $('bt-card'), box = $('bt-contacts');
  if (!form) return;
  var KEY = 'kelim-miluim-bait';
  var EM = [['מד"א', '101'], ['משטרה', '100'], ['כיבוי', '102'], ['ער"ן', '1201'], ['נט"ל', '*3362']];
  var st = { name: '', dates: '', kids: '', pay: '', c: [['', ''], ['', ''], ['', '']] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var PH = ['מי? (למשל: סבתא רחל)', 'טלפון'];
  function rows() {
    box.innerHTML = st.c.map(function (c, i) {
      return '<div class="bt-c"><input type="text" maxlength="40" data-c="' + i + '" data-k="0" placeholder="' + PH[0] + '" value="' + esc(c[0]) + '" aria-label="שם"><input type="tel" maxlength="20" dir="ltr" style="text-align:right" data-c="' + i + '" data-k="1" placeholder="' + PH[1] + '" value="' + esc(c[1]) + '" aria-label="טלפון"><button class="x" type="button" data-del="' + i + '" aria-label="למחוק">×</button></div>';
    }).join('');
  }
  function fill() { ['name', 'dates', 'kids', 'pay'].forEach(function (k) { form.querySelector('[name=' + k + ']').value = st[k] || ''; }); rows(); }
  function read() {
    ['name', 'dates', 'kids', 'pay'].forEach(function (k) { st[k] = form.querySelector('[name=' + k + ']').value; });
    box.querySelectorAll('[data-c]').forEach(function (el) { st.c[+el.getAttribute('data-c')][+el.getAttribute('data-k')] = el.value; });
  }
  var text = '';
  function draw() {
    var cs = st.c.filter(function (c) { return (c[0] || '').trim() || (c[1] || '').trim(); });
    var title = (st.name || '').trim() ? esc(st.name) + ' במילואים' : 'בזמן המילואים';
    card.innerHTML = '<h3>' + title + '</h3>' + ((st.dates || '').trim() ? '<p class="sub2">' + esc(st.dates) + '</p>' : '<p class="sub2">כל מה שצריך לדעת בבית</p>') +
      (cs.length ? '<h4>למי מתקשרים</h4><table>' + cs.map(function (c) { return '<tr><td>' + esc(c[0]) + '</td><td class="p">' + esc(c[1]) + '</td></tr>'; }).join('') + '</table>' : '') +
      ((st.kids || '').trim() ? '<h4>מי אוסף ומי מסיע</h4><p class="nt">' + esc(st.kids) + '</p>' : '') +
      ((st.pay || '').trim() ? '<h4>תשלומים ודברים לזכור</h4><p class="nt">' + esc(st.pay) + '</p>' : '') +
      '<h4>חירום</h4><div class="em">' + EM.map(function (e) { return '<span>' + e[0] + ' <b>' + e[1] + '</b></span>'; }).join('') + '</div>' +
      '<p class="ft">נחזור בשלום, בעזרת ה׳ ❤</p>';
    text = ((st.name || '').trim() ? st.name.trim() + ' במילואים' : 'בזמן המילואים') +((st.dates || '').trim() ? ' (' + st.dates + ')' : '') + '\n\n' +
      (cs.length ? 'למי מתקשרים:\n' + cs.map(function (c) { return '▫️ ' + c[0] + ' ' + c[1]; }).join('\n') + '\n\n' : '') +
      ((st.kids || '').trim() ? 'מי אוסף ומי מסיע:\n' + st.kids + '\n\n' : '') +
      ((st.pay || '').trim() ? 'תשלומים ודברים לזכור:\n' + st.pay + '\n\n' : '') +
      'חירום: ' + EM.map(function (e) { return e[0] + ' ' + e[1]; }).join(' · ');
    $('bt-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
  }
  form.addEventListener('input', function () { read(); save(); draw(); });
  box.addEventListener('click', function (e) {
    var d = e.target.closest('[data-del]'); if (!d) return;
    read(); st.c.splice(+d.getAttribute('data-del'), 1); if (!st.c.length) st.c.push(['', '']); save(); rows(); draw();
  });
  $('bt-addc').addEventListener('click', function () { read(); st.c.push(['', '']); save(); rows(); draw(); var l = box.querySelectorAll('input[data-k="0"]'); l[l.length - 1].focus(); });
  function used(how) { if (window.toolUsed) window.toolUsed('miluim_bait', { how: how }); }
  $('bt-print').addEventListener('click', function () { used('print'); window.print(); });
  $('bt-wa').addEventListener('click', function () { used('wa'); });
  $('bt-img').addEventListener('click', function () {
    var btn = this, label = btn.textContent;
    if (!window.htmlToImage) { btn.textContent = 'רגע, עוד נטען… נסו שוב'; setTimeout(function () { btn.textContent = label; }, 1500); return; }
    btn.textContent = 'מכין תמונה…';
    window.htmlToImage.toBlob(card, { pixelRatio: 2, backgroundColor: '#fffdf7' }).then(function (b) {
      var name = 'דף לבית.png', f = new File([b], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {});
      else { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
      used('image'); btn.textContent = label;
    }).catch(function () { btn.textContent = 'לא הצלחתי. אפשר להדפיס ולשמור PDF'; });
  });
  fill(); draw();
})();
