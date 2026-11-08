// סיפור בהמשכים (כלי קודש): סיפור מחולק לפרקים, וכל פרק נעשה סרטון קצר משלו.
// שני מצבים: לילדים (צבעוני, גופן גדול, מנגינה עליזה, תמונות של חיות, בית וטבע) ותורני (המראה של "משיעור כתוב לסרטון").
// הסיפורים של המשתמש נשמרים ב-localStorage (kodesh-sipur), כדי לחזור ולהוסיף פרק.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('vd-form'), cv = $('vd-canvas');
  if (!form || !cv || !window.KVideo) return;
  var LIB = window.SIPUR_LIB || [];
  var KEY = 'kodesh-sipur', PREFS = ['size', 'pace', 'music', 'look'];
  function val(n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; }
  function setVal(n, v) { var el = form.querySelector('[name=' + n + ']'); if (el) el.value = v == null ? '' : v; }

  var data = { stories: [], prefs: {}, last: null };
  try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.stories) data = d; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  var st = null, ch = 0, recording = false, result = null;
  function mode() { return st && st.mode === 'torah' ? 'torah' : 'kids'; }

  var engines = {};
  function eng() {
    var m = mode();
    if (!engines[m]) {
      var S = m === 'kids' ? KVideo.KIDS : KVideo.TORAH;
      engines[m] = KVideo.create(cv, {
        imgs: S.imgs, keys: S.keys, order: S.order, endCats: S.endCats, credit: 'נוצר בחינם בכלי קודש · סיפור בהמשכים',
        opts: function () { return { theme: m, look: val('look'), size: val('size'), music: m === 'kids' ? 'kids' : 'soft' }; }
      });
    }
    return engines[m];
  }

  // ---------- ספרייה והסיפורים שלי ----------
  function renderLib() {
    var box = $('sp-lib'); box.innerHTML = '';
    LIB.forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.id = s.id;
      b.setAttribute('aria-pressed', st && st.lib === s.id ? 'true' : 'false');
      var tag = document.createElement('span'); tag.className = 'tag' + (s.mode === 'torah' ? ' t' : ''); tag.textContent = s.mode === 'torah' ? 'תורני' : 'לילדים';
      var t = document.createElement('b'); t.textContent = s.title;
      var sm = document.createElement('small'); sm.textContent = s.about + ' · ' + s.chapters.length + ' פרקים';
      b.appendChild(tag); b.appendChild(t); b.appendChild(sm);
      b.addEventListener('click', function () { openLib(s.id, 0); used('open_lib', { story: s.id }); });
      box.appendChild(b);
    });
  }
  function renderMine() {
    var sel = $('sp-mine'); sel.innerHTML = '';
    var o0 = document.createElement('option'); o0.value = ''; o0.textContent = data.stories.length ? 'בוחרים סיפור שלי…' : 'עוד אין סיפורים שלכם';
    sel.appendChild(o0);
    data.stories.forEach(function (s) {
      var o = document.createElement('option'); o.value = s.id;
      o.textContent = (s.title || 'סיפור בלי שם') + ' · ' + s.chapters.length + ' פרקים';
      if (st && st.id === s.id) o.selected = true;
      sel.appendChild(o);
    });
    $('sp-del').hidden = !(st && st.id);
  }
  function copy(s) { return JSON.parse(JSON.stringify(s)); }
  function openLib(id, c) {
    var s = LIB.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    st = copy(s); st.lib = s.id; delete st.id; st.planned = '';
    open(c || 0);
  }
  function openMine(id, c) {
    var s = data.stories.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    st = s; open(c || 0);
  }
  function open(c) {
    ch = Math.max(0, Math.min(c, st.chapters.length - 1));
    setVal('title', st.title); setVal('mode', st.mode); setVal('text', st.chapters[ch] || '');
    setVal('planned', st.planned || ''); setVal('sign', st.sign || '');
    data.last = st.id ? { mine: st.id, ch: ch } : { lib: st.lib, ch: ch }; save();
    renderLib(); renderMine(); renderTabs(); refresh();
  }
  // שינוי בסיפור מהספרייה נשמר כעותק של המשתמש
  function own() {
    if (st.id) return;
    var s = copy(st); delete s.lib; delete s.about;
    s.id = 's' + Date.now().toString(36); s.from = st.lib;
    data.stories.unshift(s); st = s; renderLib(); renderMine();
  }
  function newStory() {
    st = { id: 's' + Date.now().toString(36), title: '', mode: 'kids', sign: '', planned: '', chapters: [''] };
    data.stories.unshift(st); open(0); $('sp-title').focus();
    used('new_story');
  }

  // ---------- פרקים ----------
  function renderTabs() {
    var box = $('sp-tabs'); box.innerHTML = '';
    st.chapters.forEach(function (_, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'פרק ' + (i + 1);
      b.setAttribute('aria-pressed', i === ch ? 'true' : 'false');
      b.addEventListener('click', function () { if (i !== ch) { ch = i; open(i); } });
      box.appendChild(b);
    });
    var add = document.createElement('button'); add.type = 'button'; add.className = 'add'; add.textContent = '+ פרק חדש';
    add.addEventListener('click', function () { own(); st.chapters.push(''); save(); open(st.chapters.length - 1); $('sp-text').focus(); used('add_chapter'); });
    box.appendChild(add);
    if (st.chapters.length > 1 && !st.chapters[st.chapters.length - 1].trim()) {
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'add'; rm.textContent = 'להסיר את הפרק הריק';
      rm.addEventListener('click', function () { st.chapters.pop(); save(); open(Math.min(ch, st.chapters.length - 1)); });
      box.appendChild(rm);
    }
    $('sp-text-label').textContent = 'הטקסט של פרק ' + (ch + 1);
  }
  function count() { var p = parseInt(st.planned, 10); return Math.max(st.chapters.length, p > 0 ? p : 0); }

  // ---------- שקופיות ----------
  function build() {
    var e = eng(), n = count(), last = ch >= n - 1;
    var body = (st.chapters[ch] || '').trim() || $('sp-text').placeholder;
    var list = [{ kind: 'title', text: st.title || 'סיפור בהמשכים', sub: n > 1 ? 'פרק ' + (ch + 1) + ' מתוך ' + n : '' }];
    e.split(body, mode() === 'kids' ? 110 : 130).forEach(function (s) { list.push({ kind: 'text', text: s }); });
    list.push({ kind: 'end', text: n > 1 && !last ? 'המשך יבוא…' : 'סוף', sub: st.sign || '' });
    e.setSlides(list, { pace: parseFloat(val('pace')) || 1, extra: st.title });
    renderList();
    var secs = Math.round(e.total());
    $('vd-info').textContent = 'פרק ' + (ch + 1) + (n > 1 ? ' מתוך ' + n : '') + ' · ' + list.length + ' שקופיות · כ-' + secs + ' שניות' + (secs > 60 ? ' · בסטטוס של ווטסאפ סרטון ארוך מדקה מתחלק לחלקים' : '');
  }
  function renderList() {
    var ol = $('vd-slides'), e = eng(); ol.innerHTML = '';
    e.slides().forEach(function (sl, i) {
      var li = document.createElement('li'), im = document.createElement('img'), sp = document.createElement('span');
      im.src = '/assets/video/' + sl.img + '.jpg'; im.alt = 'להחליף את התמונה של שקופית ' + (i + 1); im.loading = 'lazy'; im.title = 'להחליף תמונה';
      im.addEventListener('click', function () {
        e.nextImg(sl).then(function () { im.src = '/assets/video/' + sl.img + '.jpg'; return e.preload(); }).then(function () { e.frame(sl.start + 1.2); });
      });
      sp.textContent = sl.text;
      var sm = document.createElement('small'); sm.textContent = (i + 1) + ' · ' + (sl.kind === 'title' ? 'פתיחה' : sl.kind === 'end' ? 'סיום' : Math.round(sl.dur) + ' שנ\'');
      sp.prepend(sm);
      li.appendChild(im); li.appendChild(sp); ol.appendChild(li);
    });
  }
  function refresh() {
    if (!st || recording || eng().isPlaying()) return;
    build(); var e = eng(); e.size(); e.preload().then(function () { e.frame(1.5); });
  }

  // ---------- כפתורים ----------
  $('vd-play').addEventListener('click', function () {
    var b = this, e = eng();
    if (e.isPlaying() && !recording) { e.stop(); b.textContent = '▶ לצפות לפני'; return; }
    if (recording) return;
    build(); b.textContent = '■ לעצור';
    e.preview(val('music') !== 'none').then(function () { b.textContent = '▶ לצפות לפני'; });
    used('preview');
  });
  $('vd-make').addEventListener('click', function () {
    if (recording) return;
    if (!(st.chapters[ch] || '').trim()) { $('vd-info').textContent = 'כותבים קודם את הטקסט של הפרק.'; $('sp-text').focus(); return; }
    if (KVideo.mime() === null || !cv.captureStream) { $('vd-info').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
    var e = eng(); e.stop(); build();
    var b = this, pg = $('vd-prog');
    recording = true; b.disabled = true; b.textContent = 'יוצר סרטון…';
    $('vd-result').hidden = true; pg.hidden = false; pg.value = 0;
    e.record(val('music') !== 'none', function (p) { pg.value = p; }, function (h) { $('vd-info').textContent = h ? 'ההקלטה עוצרת כשהדף לא על המסך. חוזרים לדף, והיא ממשיכה מאותה נקודה.' : 'ממשיכים ליצור את הסרטון…'; }).then(function (r) {
      recording = false; b.disabled = false; b.textContent = 'ליצור סרטון לפרק הזה'; pg.hidden = true;
      if (!r) { $('vd-info').textContent = 'הדפדפן הזה לא יודע ליצור סרטון. נסו בכרום, בטלפון אנדרואיד או במחשב.'; return; }
      result = r;
      $('vd-video').src = URL.createObjectURL(r.blob);
      $('vd-result').hidden = false;
      $('vd-fmt').textContent = r.ext === 'mp4' ? 'הסרטון בפורמט MP4, מתאים לווטסאפ.' : 'הסרטון נשמר בפורמט WebM. ווטסאפ בטלפון מעדיף MP4: כדאי ליצור אותו בכרום מעודכן או באייפון, או להמיר באתר המרה.';
      $('vd-info').textContent = 'הסרטון של פרק ' + (ch + 1) + ' מוכן (' + Math.round(r.blob.size / 1048576 * 10) / 10 + ' MB). אפשר לצפות, לשמור ולשתף.';
      $('vd-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
      used('create', { fmt: r.ext, mode: mode(), story: st.lib || st.from || 'own', chapter: ch + 1, secs: Math.round(eng().total()) });
    });
  });
  function fname() { return ((st.title || 'סיפור') + ' - פרק ' + (ch + 1)).replace(/[\\/:*?"<>|]/g, '').slice(0, 50) + '.' + (result ? result.ext : 'mp4'); }
  function download() { var x = document.createElement('a'); x.href = URL.createObjectURL(result.blob); x.download = fname(); document.body.appendChild(x); x.click(); x.remove(); }
  $('vd-dl').addEventListener('click', function () { if (result) { download(); used('download'); } });
  $('vd-share').addEventListener('click', function () {
    if (!result) return;
    var f = new File([result.blob], fname(), { type: result.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], text: (st.title || '') + ' · פרק ' + (ch + 1) }).then(function () { used('share'); }).catch(function () {});
    } else { download(); $('vd-tip').hidden = false; used('download_fallback'); }
  });
  $('vd-shuffle').addEventListener('click', function () { var e = eng(); e.shuffle(); build(); e.preload().then(function () { e.frame(1.5); }); });
  $('sp-new').addEventListener('click', newStory);
  $('sp-mine').addEventListener('change', function () { if (this.value) openMine(this.value, 0); });
  $('sp-del').addEventListener('click', function () {
    if (!st || !st.id) return;
    if (!confirm('למחוק את הסיפור "' + (st.title || 'בלי שם') + '" מהטלפון? אי אפשר לשחזר.')) return;
    data.stories = data.stories.filter(function (x) { return x.id !== st.id; }); save();
    if (data.stories.length) openMine(data.stories[0].id, 0); else openLib(LIB[0].id, 0);
  });

  function used(how, extra) {
    if (!window.toolUsed) return;
    var o = { how: how, mode: st ? mode() : '' };
    if (extra) for (var k in extra) o[k] = extra[k];
    window.toolUsed('sipur', o);
  }

  // שינויים בטופס: תוכן הסיפור נשמר, וההעדפות נשמרות בנפרד
  var tmr;
  function onEdit(ev) {
    var n = ev.target && ev.target.name;
    if (!st) return;
    if (n === 'title' || n === 'mode' || n === 'text' || n === 'planned' || n === 'sign') {
      var nv = val(n), cur = n === 'text' ? (st.chapters[ch] || '') : (st[n] == null ? '' : String(st[n]));
      if (nv !== cur.trim()) {
        own();
        if (n === 'text') st.chapters[ch] = ev.target.value; else st[n] = nv;
        save();
        if (n === 'title' || n === 'text') renderMine();
        if (n === 'planned' || n === 'text') renderTabs();
      }
    }
    if (PREFS.indexOf(n) > -1) { data.prefs = {}; PREFS.forEach(function (k) { data.prefs[k] = val(k); }); save(); }
    clearTimeout(tmr); tmr = setTimeout(refresh, 250);
  }
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);

  PREFS.forEach(function (k) { if (data.prefs[k]) setVal(k, data.prefs[k]); });
  // פתיחה: ?s=מזהה&p=פרק (קישור לסיפור מהספרייה), אחרת מה שהיה פתוח בפעם הקודמת, אחרת הסיפור הראשון
  var q = new URLSearchParams(location.search), qs = q.get('s'), qp = Math.max(0, (parseInt(q.get('p'), 10) || 1) - 1);
  KVideo.fontsReady(['700 40px "Varela Round"', '400 40px "Varela Round"']).then(function () {
    if (qs && LIB.some(function (x) { return x.id === qs; })) openLib(qs, qp);
    else if (data.last && data.last.mine && data.stories.some(function (x) { return x.id === data.last.mine; })) openMine(data.last.mine, data.last.ch);
    else if (data.last && data.last.lib && LIB.some(function (x) { return x.id === data.last.lib; })) openLib(data.last.lib, data.last.ch);
    else openLib(LIB[0].id, 0);
  });

  KVideo.credits($('vd-credits'), function (c) { return !!(KVideo.KIDS.imgs[c.cat] || KVideo.TORAH.imgs[c.cat]); });
})();
