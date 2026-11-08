// שיעור אחד, שבוע של תוכן (/kodesh/shavua/): הרב בוחר 5–7 משפטים, ומקבל תמונות לסטטוס (kcard.js), סרטון (video-engine.js),
// הודעות ליום א'–ו' עם תאריכים, ועלון (alon.js). המשפטים נכנסים מילה במילה; רק סימני ה-# וה-> יורדים.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('sv-form');
  if (!form || !window.KCard || !window.KAlon) return;
  var KEY = 'kodesh-shavua', FIELDS = ['title', 'par', 'body', 'rav', 'foot', 'start', 'theme', 'size', 'link'];
  var MIN = 5, MAX = 7, DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'], LET = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\''];
  var st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  if (!Array.isArray(st.picks)) st.picks = [];
  function f(n) { return form.querySelector('[name=' + n + ']'); }
  function val(n) { return f(n) ? f(n).value.trim() : ''; }
  FIELDS.forEach(function (n) { if (st[n] != null && f(n)) f(n).value = st[n]; });

  // תאריך ברירת מחדל: יום א' הקרוב (או היום, אם היום יום א')
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nextSunday() { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + (7 - d.getDay()) % 7); return iso(d); }
  if (!val('start')) f('start').value = nextSunday();

  // טקסט שהגיע מהעלון או מהתמלול
  try {
    var inc = JSON.parse(localStorage.getItem('kodesh-shavua-in') || 'null');
    if (inc && inc.body) {
      localStorage.removeItem('kodesh-shavua-in');
      f('body').value = inc.body; f('title').value = inc.title || '';
      if (inc.rav) f('rav').value = inc.rav;
      if (inc.par) f('par').value = inc.par;
      st.picks = [];
    }
  } catch (e) {}
  function demo() {
    var D = KAlon.DEMO;
    f('title').value = D.title; f('par').value = D.par; f('body').value = D.body; f('rav').value = D.rav;
    f('foot').value = 'קהילת אהל יצחק';
    st.picks = [];
    var s = sentences().filter(function (x) { return !x.h; });
    // לדוגמה: שני הציטוטים ועוד ארבעה משפטים מהשיעור
    [5, 8, 9, 15, 16, 20].forEach(function (i) { if (s[i]) st.picks.push(s[i].text); });
    s.forEach(function (x) { if (x.q && st.picks.indexOf(x.text) < 0 && st.picks.length < 6) st.picks.push(x.text); });
  }
  if (/[?&]dugma=1/.test(location.search)) demo();
  $('sv-demo').addEventListener('click', function (e) { e.preventDefault(); demo(); save(); refresh(); used('demo'); });

  // ---------- משפטים ----------
  function split(t) { return (t.match(/[^.!?]+[.!?]+["'״”׳)\]]*|[^.!?]+$/g) || []).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 1; }); }
  function sentences() {
    var out = [];
    KAlon.parse(val('body')).forEach(function (b) {
      if (b.t === 'h') { out.push({ h: true, text: KAlon.plain(b.text) }); return; }
      // ציטוט (>) נשאר משפט אחד שלם, גם אם יש בו כמה משפטים
      (b.t === 'q' ? [KAlon.plain(b.text)] : split(KAlon.plain(b.text))).forEach(function (s) { out.push({ text: s, q: b.t === 'q' }); });
    });
    return out.some(function (x) { return !x.h; }) ? out : [];
  }
  function picked() {
    // לפי סדר ההופעה בשיעור, כדי שהשבוע ילך עם מהלך השיעור
    var all = sentences().filter(function (x) { return !x.h; }).map(function (x) { return x.text; });
    return all.filter(function (t, i) { return st.picks.indexOf(t) > -1 && all.indexOf(t) === i; });
  }
  function drawPick() {
    var box = $('sv-pick'), list = sentences(), sel = picked();
    box.innerHTML = '';
    if (!list.length) { box.innerHTML = '<span style="opacity:.75">כאן יופיעו המשפטים של השיעור, אחרי שמדביקים אותו למעלה.</span>'; return sel; }
    var p = null;
    list.forEach(function (x) {
      if (x.h) { var h = document.createElement('h4'); h.textContent = x.text; box.appendChild(h); p = null; return; }
      if (!p) { p = document.createElement('p'); p.style.margin = '0 0 .4rem'; box.appendChild(p); }
      var s = document.createElement('span'), k = sel.indexOf(x.text);
      s.className = 's' + (k > -1 ? ' on' : ''); s.tabIndex = 0; s.setAttribute('role', 'button'); s.setAttribute('aria-pressed', k > -1);
      if (k > -1) { var i = document.createElement('i'); i.textContent = k + 1; s.appendChild(i); }
      s.appendChild(document.createTextNode(x.text));
      s.dataset.t = x.text;
      p.appendChild(s); p.appendChild(document.createTextNode(' '));
    });
    return sel;
  }
  function toggle(t) {
    var k = st.picks.indexOf(t);
    if (k > -1) st.picks.splice(k, 1);
    else if (picked().length >= MAX) { $('sv-count').textContent = 'אפשר עד ' + MAX + ' משפטים. כדי להוסיף, מבטלים קודם משפט אחר.'; return; }
    else st.picks.push(t);
    save(); refresh();
  }
  $('sv-pick').addEventListener('click', function (e) { var s = e.target.closest('.s'); if (s) toggle(s.dataset.t); });
  $('sv-pick').addEventListener('keydown', function (e) { var s = e.target.closest('.s'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(s.dataset.t); } });

  // ---------- תאריכים והודעות ----------
  function dayDate(i) { var d = new Date((val('start') || nextSunday()) + 'T12:00:00'); d.setDate(d.getDate() + i); return d; }
  function dm(d) { return d.getDate() + '.' + (d.getMonth() + 1); }
  function plan(sel) {
    // משפטים לימים א'–ה' לפי הסדר; יום ו': העלון והסרטון לשבת
    var days = [[], [], [], [], [], []];
    sel.forEach(function (t, i) { days[Math.min(4, Math.floor(i * 5 / sel.length))].push(i); });
    return days;
  }
  function q(t) { return '“' + t + '”'; }
  function message(d, idxs, sel) {
    var title = val('title') || 'השיעור', sig = val('rav'), link = val('link'), par = val('par'), lines = [];
    var src = 'מתוך השיעור "' + title + '"' + (par ? ' (' + par + ')' : '');
    if (d === 0) lines.push('שבוע טוב! 🌱', 'השבוע נלמד יחד, בכל יום משפט ' + src + '. ' + (idxs.length > 1 ? 'הראשונים:' : 'הראשון:'));
    else if (d < 5) lines.push('בוקר טוב! ☀️', (idxs.length > 1 ? 'המשפטים של היום ' : 'המשפט של היום ') + src + ':');
    else lines.push('שבת שלום! 🕯️', 'לכבוד שבת: השיעור "' + title + '" במלואו, בעלון להדפסה ובסרטון קצר עם המשפטים של השבוע.');
    lines.push('');
    idxs.forEach(function (i) { lines.push('*' + q(sel[i]) + '*'); });
    if (idxs.length) lines.push('');
    if (sig) lines.push(sig);
    if (link) lines.push(link);
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // ---------- תמונות ----------
  var imgs = []; // [{blob, url, name}]
  function imgOpts(t, i, n) {
    return { theme: val('theme'), size: val('size'), head: val('title'), body: t, sig: val('rav'), foot: val('foot'), tag: n > 1 ? (i + 1) + '/' + n : '' };
  }
  function makeImgs(sel) {
    imgs.forEach(function (x) { URL.revokeObjectURL(x.url); });
    imgs = [];
    var box = $('sv-imgs'); box.innerHTML = '';
    return sel.reduce(function (pr, t, i) {
      return pr.then(function () {
        var cv = document.createElement('canvas');
        KCard.quote(cv, imgOpts(t, i, sel.length));
        return new Promise(function (res) { cv.toBlob(function (b) { res(b); }, 'image/png'); }).then(function (b) {
          var it = { blob: b, url: URL.createObjectURL(b), name: String(i + 1).padStart(2, '0') + '-' + fname(t) + '.png' };
          imgs.push(it);
          var fig = document.createElement('figure');
          fig.innerHTML = '<img alt="">' + '<figcaption><button class="btn btn-gold btn-sm" type="button" data-sh="' + i + '">לשתף</button><button class="btn btn-line btn-sm" type="button" data-dl="' + i + '">לשמור</button></figcaption>';
          fig.querySelector('img').src = it.url; fig.querySelector('img').alt = 'תמונה ' + (i + 1) + ': ' + t;
          box.appendChild(fig);
        });
      });
    }, Promise.resolve());
  }
  function fname(t) { return String(t).replace(/[\\/:*?"<>|“”.,!?']+/g, '').trim().split(/\s+/).slice(0, 5).join('-').slice(0, 40) || 'שיעור'; }
  function download(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
  function share(files, text, how) {
    var fl = files.map(function (x) { return new File([x.blob], x.name, { type: x.blob.type }); });
    if (fl.length && navigator.canShare && navigator.canShare({ files: fl })) {
      return navigator.share({ files: fl, text: text || '' }).then(function () { used(how); }).catch(function () {});
    }
    if (!fl.length && navigator.share) return navigator.share({ text: text }).then(function () { used(how); }).catch(function () {});
    files.forEach(function (x) { download(x.blob, x.name); });
    if (text) window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    if (files.length) $('sv-tip').hidden = false;
    used(how + '_fallback');
  }
  $('sv-imgs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.dl != null) { var x = imgs[+b.dataset.dl]; download(x.blob, x.name); used('img_download'); }
    if (b.dataset.sh != null) share([imgs[+b.dataset.sh]], '', 'img_share');
  });

  // ---------- הימים ----------
  var msgs = [];
  function drawDays(sel) {
    var box = $('sv-days'), days = plan(sel);
    box.innerHTML = ''; msgs = [];
    days.forEach(function (idxs, d) {
      var m = message(d, idxs, sel), dt = dayDate(d);
      msgs.push({ d: d, text: m, idxs: idxs, date: dt });
      var card = document.createElement('div'); card.className = 'sv-day';
      var att = d < 5 ? idxs.map(function (i) { return 'תמונה ' + (i + 1); }).join(' + ') : 'העלון (PDF) והסרטון';
      card.innerHTML = '<h4>יום ' + DAYS[d] + '<small>' + dm(dt) + '</small></h4><p class="sv-msg"></p>' +
        '<div class="sv-att">📎 לצרף: ' + att + (d < 5 ? ' · ולשים בסטטוס' : '') + '</div>' +
        '<div class="share-row">' + (d < 5 ? '<button class="btn btn-gold btn-sm" type="button" data-day="' + d + '" data-how="both"><svg class="ic"><use href="#wa"/></svg> לשלוח עם התמונה</button>' : '') +
        '<button class="btn ' + (d < 5 ? 'btn-line' : 'btn-gold') + ' btn-sm" type="button" data-day="' + d + '" data-how="text"><svg class="ic"><use href="#wa"/></svg> לשלוח רק טקסט</button>' +
        '<button class="btn btn-line btn-sm" type="button" data-day="' + d + '" data-how="copy">להעתיק</button></div>';
      card.querySelector('.sv-msg').textContent = m;
      if (d < 5) idxs.forEach(function (i) { /* תמונה ממוזערת נכנסת אחרי שהתמונות מוכנות */ card.querySelector('.sv-att').dataset.i = (card.querySelector('.sv-att').dataset.i || '') + i + ','; });
      box.appendChild(card);
    });
  }
  function thumbs() {
    [].forEach.call(document.querySelectorAll('.sv-att[data-i]'), function (a) {
      a.dataset.i.split(',').filter(Boolean).forEach(function (i) { if (imgs[+i]) { var im = document.createElement('img'); im.src = imgs[+i].url; im.alt = 'תמונה ' + (+i + 1); a.insertBefore(im, a.firstChild); } });
    });
  }
  $('sv-days').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-day]'); if (!b) return;
    var m = msgs[+b.dataset.day], how = b.dataset.how;
    if (how === 'copy') {
      (navigator.clipboard ? navigator.clipboard.writeText(m.text) : Promise.reject()).then(function () { var o = b.textContent; b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = o; }, 1800); used('msg_copy'); }, function () {});
    } else if (how === 'text') {
      window.open('https://wa.me/?text=' + encodeURIComponent(m.text), '_blank', 'noopener'); used('msg_wa');
    } else {
      share(m.idxs.map(function (i) { return imgs[i]; }).filter(Boolean), m.text, 'msg_share');
    }
  });

  // ---------- סרטון ----------
  var cv = $('sv-vcanvas'), eng = null, recording = false, vres = null;
  if (window.KVideo) {
    var T = KVideo.TORAH;
    eng = KVideo.create(cv, { imgs: T.imgs, keys: T.keys, order: T.order, endCats: T.endCats, opts: function () { return { theme: 'torah', look: 'gold', size: val('size') === 'square' ? 'square' : 'story', music: 'soft' }; } });
  }
  function buildVideo(sel) {
    if (!eng) return;
    var list = [{ kind: 'title', text: val('title') || 'דבר תורה', sub: val('par') }];
    sel.forEach(function (t) { list.push({ kind: 'text', text: t }); });
    list.push({ kind: 'end', text: val('rav') || 'שבת שלום', sub: val('foot') });
    eng.setSlides(list, { extra: val('par') });
    $('sv-vinfo').textContent = list.length + ' שקופיות · כ-' + Math.round(eng.total()) + ' שניות';
  }
  function vReady() { if (!eng || recording || eng.isPlaying()) return; buildVideo(picked()); eng.size(); eng.preload().then(function () { eng.frame(1.5); }); }
  $('sv-vplay').addEventListener('click', function () {
    if (!eng || recording) return;
    var b = this;
    if (eng.isPlaying()) { eng.stop(); b.textContent = '▶ לצפות לפני'; return; }
    buildVideo(picked()); b.textContent = '■ לעצור';
    eng.preview(true).then(function () { b.textContent = '▶ לצפות לפני'; });
    used('video_preview');
  });
  $('sv-vmake').addEventListener('click', function () {
    if (!eng || recording) return;
    if (KVideo.mime() === null || !cv.captureStream) { $('sv-vinfo').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
    eng.stop(); buildVideo(picked());
    var b = this, pg = $('sv-vprog');
    recording = true; b.disabled = true; b.textContent = 'יוצר סרטון…'; pg.hidden = false; pg.value = 0; $('sv-vres').hidden = true;
    eng.record(true, function (p) { pg.value = p; }, function (h) { $('sv-vinfo').textContent = h ? 'ההקלטה עוצרת כשהדף לא על המסך. חוזרים לדף, והיא ממשיכה מאותה נקודה.' : 'ממשיכים ליצור את הסרטון…'; }).then(function (r) {
      recording = false; b.disabled = false; b.textContent = 'ליצור את הסרטון'; pg.hidden = true;
      if (!r) { $('sv-vinfo').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
      vres = { blob: r.blob, name: fname(val('title')) + '.' + r.ext };
      $('sv-video').src = URL.createObjectURL(r.blob); $('sv-vres').hidden = false;
      $('sv-vinfo').textContent = 'הסרטון מוכן (' + Math.round(r.blob.size / 1048576 * 10) / 10 + ' MB).' + (r.ext === 'mp4' ? '' : ' הוא בפורמט WebM; לווטסאפ עדיף MP4, שיוצא בכרום מעודכן או באייפון.');
      $('sv-zinfo').textContent = 'כל התמונות, ההודעות לכל יום בקובץ טקסט, והסרטון. את העלון שומרים כ-PDF מהכפתור שלו.';
      used('video_create', { fmt: r.ext });
    });
  });
  $('sv-vdl').addEventListener('click', function () { if (vres) { download(vres.blob, vres.name); used('video_download'); } });
  $('sv-vshare').addEventListener('click', function () { if (vres) share([vres], val('title'), 'video_share'); });

  // ---------- עלון ----------
  function alonData() {
    var a = {};
    try { a = JSON.parse(localStorage.getItem('kodesh-alon') || '{}') || {}; } catch (e) {}
    return {
      mode: 'alon', theme: a.theme || 'kachol', name: a.name || '', par: val('par') || a.par || '', issue: a.issue || '', rav: val('rav') || a.rav || '',
      ded: a.ded || '', foot: a.foot || val('link') || '', cols: +a.cols || 2, big: !!a.big, logo: a.logo || '',
      items: [{ title: val('title'), body: val('body') }]
    };
  }
  function drawAlon() {
    var r = KAlon.render(alonData());
    KAlon.preview($('sv-aview'));
    $('sv-ainfo').textContent = r.pages + (r.pages === 1 ? ' עמוד A4' : ' עמודי A4');
  }
  $('sv-aprint').addEventListener('click', function () { used('alon_print'); KAlon.print(alonData()); });
  $('sv-aedit').addEventListener('click', function () {
    try { localStorage.setItem('kodesh-alon-in', JSON.stringify({ title: val('title'), body: val('body'), rav: val('rav'), par: val('par') })); } catch (e) {}
    location.href = '/kodesh/alon/';
  });

  // ---------- ZIP (בלי דחיסה: התמונות והסרטון כבר דחוסים) ----------
  var CRC = (function () { var t = new Uint32Array(256); for (var i = 0; i < 256; i++) { var c = i; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  function crc(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) { // [{name, blob}]
    var enc = new TextEncoder(), now = new Date();
    var t = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), dd = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    return Promise.all(files.map(function (x) { return x.blob.arrayBuffer(); })).then(function (bufs) {
      var parts = [], central = [], off = 0;
      bufs.forEach(function (buf, i) {
        var u = new Uint8Array(buf), name = enc.encode(files[i].name), c = crc(u);
        var h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, t, true); h.setUint16(12, dd, true);
        h.setUint32(14, c, true); h.setUint32(18, u.length, true); h.setUint32(22, u.length, true); h.setUint16(26, name.length, true);
        parts.push(h.buffer, name, u);
        var cd = new DataView(new ArrayBuffer(46));
        cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
        cd.setUint16(12, t, true); cd.setUint16(14, dd, true); cd.setUint32(16, c, true); cd.setUint32(20, u.length, true); cd.setUint32(24, u.length, true);
        cd.setUint16(28, name.length, true); cd.setUint32(42, off, true);
        central.push(cd.buffer, name);
        off += 30 + name.length + u.length;
      });
      var size = central.reduce(function (a, p) { return a + p.byteLength; }, 0), end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, off, true);
      return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
    });
  }
  function weekText() {
    return msgs.map(function (m) { return '===== יום ' + DAYS[m.d] + ', ' + dm(m.date) + ' =====\n' + (m.d < 5 ? '📎 ' + m.idxs.map(function (i) { return imgs[i] ? imgs[i].name : ''; }).join(', ') + '\n' : '📎 העלון והסרטון\n') + '\n' + m.text; }).join('\n\n\n') + '\n';
  }
  $('sv-zip').addEventListener('click', function () {
    if (!imgs.length) return;
    var b = this, o = b.textContent; b.disabled = true; b.textContent = 'מכין…';
    var dir = fname(val('title')) + '/';
    var files = imgs.map(function (x) { return { name: dir + x.name, blob: x.blob }; });
    files.push({ name: dir + 'הודעות-לשבוע.txt', blob: new Blob(['﻿' + weekText()], { type: 'text/plain' }) });
    if (vres) files.push({ name: dir + vres.name, blob: vres.blob });
    zip(files).then(function (z) { download(z, fname(val('title')) + '-שבוע-של-תוכן.zip'); b.disabled = false; b.textContent = o; used('zip', { files: files.length }); });
  });

  // ---------- הכול יחד ----------
  function save() {
    FIELDS.forEach(function (n) { if (f(n)) st[n] = f(n).value; });
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
  }
  var busy = 0;
  function refresh() {
    var sel = drawPick(), n = sel.length, ok = n >= MIN;
    $('sv-count').textContent = n ? 'נבחרו ' + n + ' משפטים' + (n < MIN ? '. צריך לפחות ' + MIN + ' (לבחור עוד ' + (MIN - n) + ').' : n === MAX ? ' (המקסימום).' : '. אפשר עד ' + MAX + '.') : (val('body') ? 'לוחצים על משפט כדי לבחור אותו.' : '');
    $('sv-out').hidden = !ok;
    if (!ok) return;
    var my = ++busy;
    drawDays(sel);
    makeImgs(sel).then(function () { if (my === busy) thumbs(); });
    vReady();
    drawAlon();
  }
  var tmr;
  form.addEventListener('input', function () { save(); clearTimeout(tmr); tmr = setTimeout(refresh, 450); });
  form.addEventListener('change', function () { save(); clearTimeout(tmr); tmr = setTimeout(refresh, 100); });
  function used(how, extra) {
    if (!window.toolUsed) return;
    var o = { how: how, n: picked().length };
    if (extra) for (var k in extra) o[k] = extra[k];
    window.toolUsed('shavua', o);
  }
  save();
  Promise.all([KAlon.fontsReady(), window.KVideo ? KVideo.fontsReady() : null]).then(refresh);
})();
