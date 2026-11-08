// דף כיס לחייל: תפילת הדרך, ברכת הגומל, קריאת שמע על המיטה. הבחירות נשמרות בטלפון (localStorage).
// הדפסה: עמוד 1 = 4 עותקים של צד א, עמוד 2 = 4 עותקים של צד ב. כל העותקים זהים, לכן הדפסה דו-צדדית מתיישרת מעצמה.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('ch-form'), prev = $('ch-preview'), area = $('ch-print-area');
  if (!form) return;
  var KEY = 'kodesh-chayal';

  var SEC = {
    derech: ['תפילת הדרך',
      '<p class="i">אומרים כשיוצאים לדרך, אחרי שיצאו מהעיר. אם הדרך ארוכה, פעם אחת ביום.</p>' +
      '<p>יהי רצון מלפניך ה׳ אלוקינו ואלוקי אבותינו, שתוליכנו לשלום ותצעידנו לשלום ותדריכנו לשלום ותסמכנו לשלום, ותגיענו למחוז חפצנו לחיים ולשמחה ולשלום <em class="i">(ואם חוזרים באותו יום: ותחזירנו לשלום)</em>. ותצילנו מכף כל אויב ואורב ולסטים וחיות רעות בדרך, ומכל מיני פורעניות המתרגשות לבוא לעולם. ותשלח ברכה בכל מעשה ידינו, ותתננו לחן ולחסד ולרחמים בעיניך ובעיני כל רואינו, ותשמע קול תחנונינו, כי אל שומע תפילה ותחנון אתה. ברוך אתה ה׳, שומע תפילה.</p>'],
    gomel: ['ברכת הגומל',
      '<p class="i">מברכים בפני עשרה, אחרי שיצאו בשלום מסכנה.</p>' +
      '<p><b>המברך:</b> ברוך אתה ה׳ אלוקינו מלך העולם, הגומל לחייבים טובות, שגמלני כל טוב.</p>' +
      '<p><b>הציבור עונה:</b> אמן. מי שגמלך כל טוב, הוא יגמלך כל טוב, סלה.</p>'],
    shma: ['קריאת שמע על המיטה',
      '<p>ברוך אתה ה׳ אלוקינו מלך העולם, המפיל חבלי שינה על עיני ותנומה על עפעפי, ומאיר לאישון בת עין. ויהי רצון מלפניך ה׳ אלוקי ואלוקי אבותי, שתשכיבני לשלום ותעמידני לשלום, ואל יבהלוני רעיוני וחלומות רעים והרהורים רעים, ותהא מיטתי שלמה לפניך, והאר עיני פן אישן המוות. ברוך אתה ה׳, המאיר לעולם כולו בכבודו.</p>' +
      '<p class="big">שמע ישראל ה׳ אלוקינו ה׳ אחד.</p><p class="i">בלחש: ברוך שם כבוד מלכותו לעולם ועד.</p>' +
      '<p>ואהבת את ה׳ אלוקיך בכל לבבך ובכל נפשך ובכל מאודך. והיו הדברים האלה אשר אנכי מצוך היום על לבבך. ושננתם לבניך ודברת בם, בשבתך בביתך ובלכתך בדרך ובשכבך ובקומך. וקשרתם לאות על ידך, והיו לטוטפות בין עיניך. וכתבתם על מזוזות ביתך ובשעריך.</p>' +
      '<p>המלאך הגואל אותי מכל רע, יברך את הנערים, ויקרא בהם שמי ושם אבותי אברהם ויצחק, וידגו לרוב בקרב הארץ.</p>' +
      '<p>בשם ה׳ אלוקי ישראל: מימיני מיכאל, ומשמאלי גבריאל, ומלפני אוריאל, ומאחורי רפאל, ועל ראשי שכינת אל.</p>' +
      '<p>בידך אפקיד רוחי, פדיתה אותי ה׳ אל אמת.</p>']
  };
  var PASUK = ['כי ה׳ אלוקיכם ההולך עמכם, להלחם לכם עם אויביכם להושיע אתכם', 'דברים כ, ד'];

  var st = { sec: { derech: 1, gomel: 1, shma: 1, pasuk: 1 }, unit: '', theme: 'lavan' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function fill() {
    form.querySelectorAll('[data-sec]').forEach(function (cb) { cb.checked = !!st.sec[cb.getAttribute('data-sec')]; });
    form.querySelector('[name=unit]').value = st.unit || '';
    form.querySelectorAll('[name=theme]').forEach(function (r) { r.checked = r.value === st.theme; });
  }
  function read() {
    form.querySelectorAll('[data-sec]').forEach(function (cb) { st.sec[cb.getAttribute('data-sec')] = cb.checked ? 1 : 0; });
    st.unit = form.querySelector('[name=unit]').value;
    var r = form.querySelector('[name=theme]:checked'); st.theme = r ? r.value : 'lavan';
  }
  function block(k) { return '<section class="cs"><h3>' + SEC[k][0] + '</h3>' + SEC[k][1] + '</section>'; }
  function foot() {
    var f = '';
    if (st.sec.pasuk) f += '<p class="ps">״' + PASUK[0] + '״ <small>(' + PASUK[1] + ')</small></p>';
    if ((st.unit || '').trim()) f += '<p class="un">' + esc(st.unit) + '</p>';
    return f ? '<footer>' + f + '</footer>' : '';
  }
  // צד א: הדרך + הגומל. צד ב: קריאת שמע. אם צד אחד ריק, הכול נכנס לצד אחד.
  function sides() {
    var a = ['derech', 'gomel'].filter(function (k) { return st.sec[k]; }).map(block).join('');
    var b = st.sec.shma ? block('shma') : '';
    var out = [];
    if (a) out.push(a); if (b) out.push(b);
    return out.map(function (h, i) { return '<div class="card t-' + st.theme + '"><span class="bsd">בס״ד</span>' + h + (i === out.length - 1 ? foot() : '') + '</div>'; });
  }
  function draw() {
    var s = sides();
    if (!s.length) { prev.innerHTML = '<p class="ch-empty">סמנו לפחות תפילה אחת.</p>'; area.innerHTML = ''; return; }
    prev.innerHTML = s.join('');
    area.innerHTML = s.map(function (c) { return '<div class="sheet">' + c + c + c + c + '</div>'; }).join('');
  }

  form.addEventListener('input', function () { read(); save(); draw(); });
  form.addEventListener('change', function () { read(); save(); draw(); });
  function used(how) { if (window.toolUsed) window.toolUsed('chayal', { how: how }); }
  $('ch-print').addEventListener('click', function () { used('print'); window.print(); });
  $('ch-img').addEventListener('click', function () {
    var btn = this, label = btn.innerHTML;
    if (!window.htmlToImage) { btn.textContent = 'רגע, עוד נטען… נסו שוב'; setTimeout(function () { btn.innerHTML = label; }, 1500); return; }
    btn.textContent = 'מכין תמונה…';
    prev.classList.add('shot');
    window.htmlToImage.toBlob(prev, { pixelRatio: 2, backgroundColor: '#ffffff' }).then(function (b) {
      prev.classList.remove('shot');
      var name = 'דף לחייל.png', f = new File([b], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () {});
      else { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
      used('image'); btn.innerHTML = label;
    }).catch(function () { prev.classList.remove('shot'); btn.textContent = 'לא הצלחתי ליצור תמונה. אפשר להדפיס ולשמור PDF'; });
  });
  fill(); draw();
})();
