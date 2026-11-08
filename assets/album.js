// אלבום תמונות להדפסה (כלי קודש): בר מצווה, בת מצווה, חתונה, ברית ולכל שמחה.
// התמונות לא עולות לשום שרת: הן נקראות בדפדפן, מוקטנות בדפדפן (canvas), ומודפסות מהדפדפן ל-PDF.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('al-form'); if (!form) return;
  function v(n) { var el = form.elements[n]; if (!el) return ''; if (el.type === 'checkbox') return el.checked; if (el.length && !el.tagName) { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return ''; } return (el.value || '').trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ev(name, p) { if (window.gtag) window.gtag('event', name, p || {}); }
  var EVENTS = {
    barmitzva: ['בר המצווה של', 'מזל טוב! שתזכה לגדול לתורה ולמעשים טובים, ולהיות תמיד גאווה למשפחה.'],
    batmitzva: ['בת המצווה של', 'מזל טוב! שתזכי לגדול באמונה, בשמחה ובמידות טובות, ולהאיר כל מקום שאת נמצאת בו.'],
    chatuna: ['החתונה של', 'שתזכו לבנות בית נאמן בישראל, בית של אהבה, שלום ושמחה.'],
    brit: ['ברית המילה של', 'כשם שנכנס לברית, כן ייכנס לתורה, לחופה ולמעשים טובים.'],
    other: ['', '']
  };
  var SIZES = { land: [297, 210, 'A4 לרוחב'], port: [210, 297, 'A4 לאורך'], sq: [210, 210, 'ריבוע 21 על 21'] };
  var photos = []; // {url, w, h, cap}
  var cover = 0;

  // הקטנה בדפדפן: עד 2400 פיקסלים בצד הארוך, כדי שה-PDF לא יהיה ענק. הקובץ המקורי לא יוצא מהמחשב.
  function load(file) {
    return new Promise(function (ok) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 2400, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        if (k >= 1 && file.size < 3e6) return ok({ url: url, w: img.naturalWidth, h: img.naturalHeight, cap: '' });
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); ok({ url: b ? URL.createObjectURL(b) : url, w: c.width, h: c.height, cap: '' }); }, 'image/jpeg', 0.88);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(null); };
      img.src = url;
    });
  }
  function addFiles(list) {
    var files = Array.prototype.filter.call(list, function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    $('al-status').textContent = 'טוען ' + files.length + ' תמונות...';
    Promise.all(files.map(load)).then(function (res) {
      res.forEach(function (p) { if (p) photos.push(p); });
      $('al-status').textContent = photos.length + ' תמונות באלבום. הן נשארות רק במחשב או בטלפון שלך.';
      ev('album_photos', { count: photos.length });
      thumbs(); render();
    });
  }
  $('al-files').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  var drop = $('al-drop');
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('on'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('on'); }); });
  drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });

  function thumbs() {
    var box = $('al-thumbs');
    box.innerHTML = photos.map(function (p, i) {
      return '<li' + (i === cover ? ' class="cov"' : '') + '><img src="' + p.url + '" alt="תמונה ' + (i + 1) + '"><div class="t-btns">' +
        '<button type="button" data-a="prev" data-i="' + i + '" aria-label="להזיז קדימה">→</button>' +
        '<button type="button" data-a="cover" data-i="' + i + '" aria-label="לשער">' + (i === cover ? '★' : '☆') + '</button>' +
        '<button type="button" data-a="next" data-i="' + i + '" aria-label="להזיז אחורה">←</button>' +
        '<button type="button" data-a="del" data-i="' + i + '" aria-label="להסיר">✕</button></div>' +
        '<input type="text" maxlength="60" placeholder="כיתוב (לא חובה)" data-cap="' + i + '" value="' + esc(p.cap) + '"></li>';
    }).join('');
    $('al-tools').hidden = !photos.length;
  }
  $('al-thumbs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]'); if (!b) return;
    var i = +b.dataset.i, a = b.dataset.a, j;
    if (a === 'del') { URL.revokeObjectURL(photos[i].url); photos.splice(i, 1); if (cover >= photos.length) cover = 0; else if (i < cover) cover--; }
    if (a === 'cover') cover = i;
    if (a === 'prev' || a === 'next') {
      j = a === 'prev' ? i - 1 : i + 1; if (j < 0 || j >= photos.length) return;
      var t = photos[i]; photos[i] = photos[j]; photos[j] = t;
      if (cover === i) cover = j; else if (cover === j) cover = i;
    }
    thumbs(); render();
  });
  $('al-thumbs').addEventListener('input', function (e) { var i = e.target.dataset.cap; if (i == null) return; photos[i].cap = e.target.value; render(); });
  $('al-clear').addEventListener('click', function () { photos.forEach(function (p) { URL.revokeObjectURL(p.url); }); photos = []; cover = 0; thumbs(); render(); $('al-status').textContent = ''; });

  function cell(p, cls) {
    return '<figure class="' + (cls || '') + '"><div class="ph"><img src="' + p.url + '" alt=""></div>' + (p.cap ? '<figcaption>' + esc(p.cap) + '</figcaption>' : '') + '</figure>';
  }
  var pageStyle = document.createElement('style'); document.head.appendChild(pageStyle);
  function render() {
    var evk = v('event'), E = EVENTS[evk] || EVENTS.other, size = SIZES[v('size')] || SIZES.land;
    var title = v('title') || E[0], names = v('names'), date = v('date'), ded = v('ded');
    if (!form.dataset.dedTouched) { form.elements.ded.placeholder = E[1] || 'משפט לסיום האלבום'; }
    var book = $('al-book');
    book.className = 'al-book st-' + (v('st') || 'lavan') + ' sz-' + v('size') + (v('fit') ? ' fit' : '');
    book.style.setProperty('--ar', size[0] + '/' + size[1]);
    var cp = photos[cover], rest = photos.filter(function (_, i) { return i !== cover; });
    var html = '<section class="al-page al-cover' + (cp ? '' : ' nophoto') + '">' + (cp ? '<div class="cv-ph"><img src="' + cp.url + '" alt=""></div>' : '') +
      '<div class="cv-txt"><span class="bsd">בס"ד</span>' + (title ? '<p class="cv-t">' + esc(title) + '</p>' : '') +
      '<h2>' + esc(names || 'השמות כאן') + '</h2>' + (date ? '<p class="cv-d">' + esc(date) + '</p>' : '') + '</div></section>';
    // חלוקה לעמודים לפי התבנית
    var lay = v('layout'), seq = lay === 'mix' ? [1, 2, 3, 4, 2, 1, 3, 4] : [+lay], k = 0, i = 0, pages = 0;
    while (i < rest.length) {
      var n = Math.min(seq[k % seq.length], rest.length - i); k++;
      html += '<section class="al-page al-g al-g' + n + '">' + rest.slice(i, i + n).map(function (p, j) { return cell(p, n === 3 && j === 0 ? 'big' : ''); }).join('') + '</section>';
      i += n; pages++;
    }
    if (!rest.length) html += '<section class="al-page al-g al-g4 empty"><figure><div class="ph"></div></figure><figure><div class="ph"></div></figure><figure><div class="ph"></div></figure><figure><div class="ph"></div></figure><p class="al-empty-t">כאן יופיעו התמונות שלכם</p></section>';
    var endTxt = ded || E[1];
    if (endTxt || v('endpage')) html += '<section class="al-page al-end"><div class="end-in"><div class="orn" aria-hidden="true"></div><p>' + esc(endTxt).replace(/\n/g, '<br>') + '</p>' + (names ? '<p class="end-n">' + esc(names) + '</p>' : '') + '<div class="orn" aria-hidden="true"></div></div></section>';
    book.innerHTML = html;
    pageStyle.textContent = '@page{size:' + size[0] + 'mm ' + size[1] + 'mm;margin:0}@media print{.al-page{width:' + size[0] + 'mm;height:' + size[1] + 'mm}}';
    $('al-count').textContent = (pages + 1 + (endTxt ? 1 : 0)) + ' עמודים · ' + size[2];
  }
  form.addEventListener('input', function (e) { if (e.target.name === 'ded') form.dataset.dedTouched = '1'; render(); });
  form.addEventListener('change', render);
  $('al-printbtn').addEventListener('click', function () {
    if (!photos.length && !confirm('עוד לא הוספתם תמונות. להדפיס בכל זאת?')) return;
    ev('album_print', { event: v('event'), style: v('st'), size: v('size'), layout: v('layout'), photos: photos.length });
    // מחכים שכל התמונות ייטענו לפני ההדפסה
    var imgs = Array.prototype.slice.call($('al-book').querySelectorAll('img'));
    Promise.all(imgs.map(function (im) { return im.complete ? 0 : new Promise(function (r) { im.onload = im.onerror = r; }); })).then(function () { window.print(); });
  });
  render();
})();
