// דף התוצאה של "צילום של כל העמוד": מציג את התמונה, ומוריד כ-PNG או כ-PDF (עמודים בגודל A4), הכול במחשב.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var shot = null;
  function fileName(ext) {
    var t = (shot && shot.title || 'צילום').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60) || 'צילום';
    return t + '.' + ext;
  }
  function save(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }
  function toBlob(url) { return fetch(url).then(function (r) { return r.blob(); }); }

  // PDF פשוט: כל עמוד הוא חתיכה של התמונה (JPEG) ברוחב העמוד, ביחס של A4
  function makePdf(img) {
    var W = img.naturalWidth, H = img.naturalHeight, pageH = Math.round(W * 1.4142), parts = [];
    for (var y = 0; y < H; y += pageH) {
      var h = Math.min(pageH, H - y), c = document.createElement('canvas');
      c.width = W; c.height = h;
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, h); g.drawImage(img, 0, -y);
      parts.push({ h: h, url: c.toDataURL('image/jpeg', 0.88) });
    }
    var enc = new TextEncoder(), chunks = [], offs = [], len = 0;
    function add(x) { var b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; }
    function obj(n, body) { offs[n] = len; add(n + ' 0 obj\n'); body(); add('\nendobj\n'); }
    var ptW = 595.28, scale = ptW / W, n = parts.length;
    add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    var kids = []; for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
    obj(1, function () { add('<< /Type /Catalog /Pages 2 0 R >>'); });
    obj(2, function () { add('<< /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >>'); });
    parts.forEach(function (p, i) {
      var pg = 3 + i * 3, im = pg + 1, ct = pg + 2, ph = (p.h * scale).toFixed(2);
      var bin = atob(p.url.split(',')[1]), bytes = new Uint8Array(bin.length);
      for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
      var cs = 'q ' + ptW.toFixed(2) + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
      obj(pg, function () { add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + ptW.toFixed(2) + ' ' + ph + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>'); });
      obj(im, function () { add('<< /Type /XObject /Subtype /Image /Width ' + W + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bytes.length + ' >>\nstream\n'); add(bytes); add('\nendstream'); });
      obj(ct, function () { add('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'); });
    });
    var total = 3 + n * 3, xref = len;
    add('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (var j = 1; j < total; j++) add(String(offs[j]).padStart(10, '0') + ' 00000 n \n');
    add('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  chrome.storage.local.get('shot').then(function (o) {
    shot = o.shot;
    if (!shot) { $('meta').textContent = 'אין צילום. לוחצים על כפתור התוסף ← "צילום של כל העמוד".'; return; }
    $('img').src = shot.img;
    $('img').onload = function () {
      var im = $('img');
      $('meta').textContent = (shot.title || '') + ' · ' + im.naturalWidth + '×' + im.naturalHeight + (shot.cut ? ' · העמוד ארוך מאוד, צולם החלק העליון שלו' : '');
    };
    document.title = 'צילום: ' + (shot.title || '');
  });
  $('png').addEventListener('click', function () { toBlob(shot.img).then(function (b) { save(b, fileName('png')); }); });
  $('pdf').addEventListener('click', function () {
    $('pdf').disabled = true; $('pdf').textContent = 'מכין PDF…';
    setTimeout(function () {
      try { save(makePdf($('img')), fileName('pdf')); } catch (e) { $('meta').textContent = 'לא הצלחתי להכין PDF. אפשר להוריד כתמונה.'; }
      $('pdf').disabled = false; $('pdf').textContent = '📄 להוריד כ-PDF';
    }, 30);
  });
  $('copy').addEventListener('click', function () {
    var btn = this;
    toBlob(shot.img).then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); })
      .then(function () { btn.textContent = '✓ הועתק'; }, function () { btn.textContent = 'לא הצלחתי להעתיק'; })
      .then(function () { setTimeout(function () { btn.textContent = '📋 להעתיק את התמונה'; }, 1800); });
  });
})();
