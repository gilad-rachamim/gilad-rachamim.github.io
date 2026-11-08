// משיעור כתוב לסרטון (כלי קודש): הממשק של הדף. המנוע עצמו (שקופיות, תמונות, ציור, מוזיקה, הקלטה) ב-video-engine.js.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('vd-form'), cv = $('vd-canvas');
  if (!form || !cv || !window.KVideo) return;
  function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; }
  var T = KVideo.TORAH;
  var eng = KVideo.create(cv, {
    imgs: T.imgs, keys: T.keys, order: T.order, endCats: T.endCats,
    opts: function () { return { theme: 'torah', look: val('look'), size: val('size'), music: 'soft' }; }
  });
  var KEEP = ['rav', 'foot', 'size', 'pace', 'music', 'look'];
  var recording = false, result = null;

  function build() {
    var body = val('body') || $('vd-body').placeholder;
    var list = [{ kind: 'title', text: val('title') || 'דבר תורה', sub: val('par') }];
    KVideo.split(body).forEach(function (s) { list.push({ kind: 'text', text: s }); });
    list.push({ kind: 'end', text: val('rav') || 'שבוע טוב ובשורות טובות', sub: val('foot') });
    eng.setSlides(list, { pace: parseFloat(val('pace')) || 1, extra: val('par') });
    renderList();
    var secs = Math.round(eng.total());
    $('vd-info').textContent = list.length + ' שקופיות · כ-' + secs + ' שניות' + (secs > 60 ? ' · בסטטוס של ווטסאפ סרטון ארוך מדקה מתחלק לחלקים' : '');
  }

  function renderList() {
    var ol = $('vd-slides'); ol.innerHTML = '';
    eng.slides().forEach(function (sl, i) {
      var li = document.createElement('li'), im = document.createElement('img'), sp = document.createElement('span');
      im.src = '/assets/video/' + sl.img + '.jpg'; im.alt = 'להחליף את התמונה של שקופית ' + (i + 1); im.loading = 'lazy'; im.title = 'להחליף תמונה';
      im.addEventListener('click', function () {
        eng.nextImg(sl).then(function () { im.src = '/assets/video/' + sl.img + '.jpg'; return eng.preload(); }).then(function () { eng.frame(sl.start + 1.2); });
      });
      sp.textContent = sl.text;
      var sm = document.createElement('small'); sm.textContent = (i + 1) + ' · ' + (sl.kind === 'title' ? 'פתיחה' : sl.kind === 'end' ? 'סיום' : Math.round(sl.dur) + ' שנ\'');
      sp.prepend(sm);
      li.appendChild(im); li.appendChild(sp); ol.appendChild(li);
    });
  }

  $('vd-play').addEventListener('click', function () {
    var b = this;
    if (eng.isPlaying() && !recording) { eng.stop(); b.textContent = '▶ לצפות לפני'; return; }
    if (recording) return;
    build();
    b.textContent = '■ לעצור';
    eng.preview(val('music') !== 'none').then(function () { b.textContent = '▶ לצפות לפני'; });
    used('preview');
  });

  $('vd-make').addEventListener('click', function () {
    if (recording) return;
    if (!val('body')) { form.reportValidity(); return; }
    if (KVideo.mime() === null || !cv.captureStream) { $('vd-info').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
    eng.stop(); build();
    var b = this, pg = $('vd-prog');
    recording = true; b.disabled = true; b.textContent = 'יוצר סרטון…';
    $('vd-result').hidden = true; pg.hidden = false; pg.value = 0;
    eng.record(val('music') !== 'none', function (p) { pg.value = p; }, function (h) { $('vd-info').textContent = h ? 'ההקלטה עוצרת כשהדף לא על המסך. חוזרים לדף, והיא ממשיכה מאותה נקודה.' : 'ממשיכים ליצור את הסרטון…'; }).then(function (r) {
      recording = false; b.disabled = false; b.textContent = 'ליצור את הסרטון'; pg.hidden = true;
      if (!r) { $('vd-info').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
      result = r;
      $('vd-video').src = URL.createObjectURL(r.blob);
      $('vd-result').hidden = false;
      $('vd-fmt').textContent = r.ext === 'mp4' ? 'הסרטון בפורמט MP4, מתאים לווטסאפ.' : 'הסרטון נשמר בפורמט WebM. ווטסאפ בטלפון מעדיף MP4: כדאי ליצור אותו בכרום מעודכן או באייפון, או להמיר באתר המרה.';
      $('vd-info').textContent = 'הסרטון מוכן (' + Math.round(r.blob.size / 1048576 * 10) / 10 + ' MB). אפשר לצפות, לשמור ולשתף.';
      $('vd-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
      used('create', { fmt: r.ext, slides: eng.slides().length, secs: Math.round(eng.total()) });
    });
  });

  function fname() { return (val('title') || 'שיעור').replace(/[\\/:*?"<>|]/g, '').slice(0, 40) + '.' + (result ? result.ext : 'mp4'); }
  function download() { var x = document.createElement('a'); x.href = URL.createObjectURL(result.blob); x.download = fname(); document.body.appendChild(x); x.click(); x.remove(); }
  $('vd-dl').addEventListener('click', function () { if (result) { download(); used('download'); } });
  $('vd-share').addEventListener('click', function () {
    if (!result) return;
    var f = new File([result.blob], fname(), { type: result.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], text: val('title') }).then(function () { used('share'); }).catch(function () {});
    } else { download(); $('vd-tip').hidden = false; used('download_fallback'); }
  });
  $('vd-shuffle').addEventListener('click', function () {
    eng.shuffle(); build(); eng.preload().then(function () { eng.frame(eng.slides()[0] ? 1.5 : 0); });
  });

  function used(how, extra) {
    if (!window.toolUsed) return;
    var o = { how: how, size: val('size'), music: val('music') };
    if (extra) for (var k in extra) o[k] = extra[k];
    window.toolUsed('video', o);
  }

  // שמירת העדפות + תצוגה חיה
  try { var s = JSON.parse(localStorage.getItem('kodesh-video') || '{}'); KEEP.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && s[k]) el.value = s[k]; }); } catch (e) {}
  var tmr;
  function upd() {
    var o = {}; KEEP.forEach(function (k) { o[k] = val(k); });
    try { localStorage.setItem('kodesh-video', JSON.stringify(o)); } catch (e) {}
    if (eng.isPlaying() || recording) return;
    clearTimeout(tmr);
    tmr = setTimeout(function () { build(); eng.size(); eng.preload().then(function () { eng.frame(1.5); }); }, 250);
  }
  form.addEventListener('input', upd);
  form.addEventListener('change', upd);
  KVideo.fontsReady().then(function () { build(); eng.size(); return eng.preload(); }).then(function () { eng.frame(1.5); });

  // קרדיטים: רק התמונות של הסט התורני
  KVideo.credits($('vd-credits'), function (c) { return !!T.imgs[c.cat]; });
})();
