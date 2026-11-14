// תמלול מהטלפון (T-1) – הכלים של גילעד רחמים.
// הקובץ נשלח ל-Worker (gilad-hub), שמעביר לענן (RunPod, מודל עברית של ivrit.ai) ומחזיר טקסט. המפתח לא בדפדפן.
// קובץ קטן נשלח כמו שהוא; קובץ גדול נחתך בטלפון לחלקים של 2.5 דקות (WAV 16kHz) שרצים במקביל.
// בלי הגבלה (גילעד 11.11.2026). אחרי 60 דקות בחודש: קופסה עם "להמשיך לתמלל" בלחיצה אחת + ווטסאפ באהבה.
(function () {
  'use strict';
  var API = 'https://gilad-hub.gilad4049.workers.dev/tamlul';
  var RAW_MAX = 6.8e6, PIECE = 150, FREE_SEC = 3600;
  var $ = function (id) { return document.getElementById(id); };
  var root = $('tamlul');
  if (!root) return;
  var fileIn = $('tl-file'), recBtn = $('tl-rec'), status = $('tl-status'), outBox = $('tl-out'), textEl = $('tl-text'), quotaEl = $('tl-quota');

  // ---------- מכסה ----------
  function month() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); }
  function q() { var o = {}; try { o = JSON.parse(localStorage.getItem('kelim-tamlul') || '{}'); } catch (e) {} if (o.m !== month()) o = { m: month(), used: 0, free: o.free }; return o; }
  function save(o) { try { localStorage.setItem('kelim-tamlul', JSON.stringify(o)); } catch (e) {} }
  function showQuota() {
    var o = q();
    quotaEl.innerHTML = o.free ? 'ללא הגבלה. בהצלחה 💛' : 'תמלול בחינם ובלי הגבלה 💛';
  }
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-unlimited]')) {
      e.preventDefault();
      var o = q(); o.free = true; save(o); showQuota();
      $('tl-limit').hidden = true;
      if (window.kelimEv) window.kelimEv('tamlul_unlimited', {});
      if (pending) { var pb = pending; pending = null; go(pb[0], pb[1]); }   // ממשיכים מיד את ההקלטה שנעצרה
    }
  });
  showQuota();

  function say(t, busy) { status.hidden = false; status.innerHTML = (busy ? '<span class="spin" aria-hidden="true"></span> ' : '') + t; }
  function fail(t) { say('⚠️ ' + t); fileIn.disabled = false; recBtn.disabled = false; }

  // ---------- אורך ההקלטה ----------
  function duration(blob) {
    return new Promise(function (res) {
      var a = document.createElement(/video/.test(blob.type) ? 'video' : 'audio'), u = URL.createObjectURL(blob), done = false;
      var end = function (v) { if (!done) { done = true; URL.revokeObjectURL(u); res(v); } };
      a.preload = 'metadata';
      a.onloadedmetadata = function () {
        if (a.duration === Infinity) { a.currentTime = 1e7; a.ontimeupdate = function () { a.ontimeupdate = null; end(a.duration); }; }
        else end(a.duration);
      };
      a.onerror = function () { end(NaN); };
      setTimeout(function () { end(NaN); }, 8000);
      a.src = u;
    });
  }
  function b64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  // פענוח ל-16kHz מונו וחיתוך לחלקי WAV
  function pieces(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var Ctx = window.AudioContext || window.webkitAudioContext, ctx;
      try { ctx = new Ctx({ sampleRate: 16000 }); } catch (e) { ctx = new Ctx(); }
      return new Promise(function (res, rej) { ctx.decodeAudioData(buf, res, rej); }).then(function (ab) {
        var rate = ab.sampleRate, n = ab.length, ch0 = ab.getChannelData(0), ch1 = ab.numberOfChannels > 1 ? ab.getChannelData(1) : null;
        var step = rate / 16000, total = Math.floor(n / step), per = PIECE * 16000, outp = [];
        for (var s = 0; s < total; s += per) {
          var len = Math.min(per, total - s), pcm = new Int16Array(len);
          for (var i = 0; i < len; i++) {
            var k = Math.floor((s + i) * step), v = ch1 ? (ch0[k] + ch1[k]) / 2 : ch0[k];
            pcm[i] = v < -1 ? -32768 : v > 1 ? 32767 : v * 32767;
          }
          outp.push({ off: s / 16000, blob: wav(pcm) });
        }
        if (ctx.close) ctx.close();
        return outp;
      });
    });
  }
  function wav(pcm) {
    var b = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(b), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
    new Int16Array(b, 44).set(pcm);
    return new Blob([b], { type: 'audio/wav' });
  }

  // ---------- חימום השרת בענן (13.11.2026, גילעד: "חייב שהתמלול יהיה מהיר יותר") ----------
  // נמדד: שרת כבוי = 20–30 שניות של התנעה לפני כל תמלול; שרת דולק = הקלטה של 10 שניות חוזרת ב-2 שניות.
  // לכן כשרואים כוונה (לחיצה על "להקליט" או על בחירת קובץ) מעירים את השרת מראש, והוא מוכן כשהקובץ מגיע.
  // /tamlul/warm לא נספר במכסה היומית. עד שהנתיב קיים ב-Worker: חימום אחד בהקלטה שקטה קצרה דרך /run.
  var warmAt = 0, warmRoute = true, warmFallback = false;
  function warm() {
    if (Date.now() - warmAt < 20000) return;
    warmAt = Date.now();
    if (warmRoute) {
      fetch(API + '/warm', { method: 'POST' }).then(function (r) {
        if (r.status === 404) { warmRoute = false; warmAt = 0; warm(); }
      }).catch(function () {});
      return;
    }
    if (warmFallback) return;   // בלי הנתיב: רק פעם אחת בביקור, כדי לא לאכול מהמכסה
    warmFallback = true;
    b64(wav(new Int16Array(8000))).then(function (data) {
      return fetch(API + '/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64: data, lang: 'he' }) });
    }).catch(function () {});
  }
  fileIn.addEventListener('click', warm);   // גם לחיצה על התווית "לבחור קובץ" מגיעה לכאן

  // ---------- שליחה לענן ----------
  function run(blob, lang) {
    return b64(blob).then(function (data) {
      return fetch(API + '/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ b64: data, lang: lang }) });
    }).then(function (r) {
      if (r.status === 429) throw new Error('limit');
      return r.json();
    }).then(function (j) { if (!j.token) throw new Error(j.error || 'run'); return j.token; });
  }
  function poll(token, onState) {
    var t0 = Date.now();
    return new Promise(function (res, rej) {
      (function tick() {
        fetch(API + '/status/' + token).then(function (r) { return r.json(); }).then(function (j) {
          if (j.status === 'COMPLETED') return res(j.segments || []);
          if (j.status === 'FAILED' || j.status === 'CANCELLED' || j.error) return rej(new Error('failed'));
          onState(j.status);
          if (Date.now() - t0 > 20 * 60e3) return rej(new Error('timeout'));
          setTimeout(tick, Date.now() - t0 < 120e3 ? 1500 : 3000);   // בהתחלה בודקים כל שנייה וחצי: תמלול קצר חוזר תוך שניות
        }).catch(function () { if (Date.now() - t0 > 20 * 60e3) rej(new Error('net')); else setTimeout(tick, 5000); });
      })();
    });
  }

  function mmss(s) { s = Math.round(s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
  var last = [];
  function render() {
    var stamps = $('tl-stamps').checked, paras = [], cur = [], prevEnd = 0;
    last.forEach(function (s, i) {
      if (cur.length && (s.start - prevEnd > 2 || cur.length >= 6)) { paras.push(cur); cur = []; }
      cur.push(s); prevEnd = s.end;
    });
    if (cur.length) paras.push(cur);
    textEl.innerHTML = '';
    paras.forEach(function (p) {
      var el = document.createElement('p');
      el.textContent = (stamps ? '[' + mmss(p[0].start) + '] ' : '') + p.map(function (s) { return s.text; }).join(' ');
      textEl.appendChild(el);
    });
  }
  function plain() { return Array.prototype.map.call(textEl.querySelectorAll('p'), function (p) { return p.textContent; }).join('\n\n'); }
  $('tl-stamps').addEventListener('change', render);

  var pending = null;
  function go(blob, name) {
    var lang = $('tl-lang').value;
    fileIn.disabled = true; recBtn.disabled = true; outBox.hidden = true;
    say('בודק את ההקלטה…', true);
    duration(blob).then(function (sec) {
      var o = q();
      var need = isFinite(sec) ? sec : blob.size / 16000;
      if (!o.free && o.used + need > FREE_SEC) {
        pending = [blob, name];
        $('tl-limit').hidden = false; $('tl-limit').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return fail('עברתם 60 דקות החודש. לחצו "להמשיך לתמלל" והתמלול ימשיך.');
      }
      var small = blob.size <= RAW_MAX && (!isFinite(sec) || sec <= 40 * 60);
      var prep = small ? Promise.resolve([{ off: 0, blob: blob }]) : (say('מכין את ההקלטה (קובץ גדול נחתך לחלקים)…', true), pieces(blob));
      return prep.then(function (list) {
        var done = 0, all = [];
        say(list.length > 1 ? 'שולח לענן ' + list.length + ' חלקים…' : 'שולח לענן…', true);
        return Promise.all(list.map(function (p) {
          return run(p.blob, lang).then(function (tok) {
            return poll(tok, function (st) {
              say((st === 'IN_QUEUE' ? 'בתור בענן. בפעם הראשונה ההתחלה יכולה לקחת דקה-שתיים…' : 'מתמלל…') + (list.length > 1 ? ' (' + done + ' מתוך ' + list.length + ' חלקים מוכנים)' : ''), true);
            });
          }).then(function (segs) {
            done++;
            segs.forEach(function (s) { all.push({ start: s.start + p.off, end: s.end + p.off, text: s.text }); });
          });
        })).then(function () {
          all.sort(function (a, b) { return a.start - b.start; });
          last = all.filter(function (s) { return s.text; });
          if (!last.length) return fail('לא נשמע דיבור בהקלטה. אפשר לנסות קובץ אחר.');
          var o2 = q(); o2.used += need; save(o2); showQuota();
          render();
          outBox.hidden = false; status.hidden = true;
          fileIn.disabled = false; recBtn.disabled = false;
          $('tl-name').textContent = name || 'התמלול';
          outBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (window.toolUsed) window.toolUsed('tamlul', { minutes: Math.round(need / 60), lang: lang || 'auto', pieces: list.length });
        });
      });
    }).catch(function (e) {
      var m = String(e && e.message || e);
      fail(m === 'limit' ? 'הגעתם למספר הבקשות להיום. אפשר לנסות שוב מחר.'
        : /decode|EncodingError|Unable/i.test(m) ? 'לא הצלחתי לפתוח את הקובץ בטלפון. אפשר לנסות קובץ שמע אחר (mp3, m4a, ogg).'
        : 'משהו השתבש בדרך לענן. אפשר לנסות שוב בעוד רגע. אם זה חוזר, כתבו לי בווטסאפ.');
    });
  }

  fileIn.addEventListener('change', function () { var f = fileIn.files[0]; if (f) go(f, f.name.replace(/\.[^.]+$/, '')); });

  // ---------- קובץ ששותף מאפליקציה אחרת, למשל הודעה קולית מווטסאפ (share_target – ה-service worker שומר אותו רגע ב-Cache) ----------
  if (/[?&]share=1/.test(location.search) && window.caches) {
    caches.open('tamlul-share').then(function (c) {
      return c.keys().then(function (keys) {
        if (!keys.length) return null;
        return c.match(keys[0]).then(function (r) { return r.blob().then(function (b) { return { blob: b, name: decodeURIComponent(r.headers.get('x-name') || '') }; }); });
      });
    }).then(function (x) {
      caches.delete('tamlul-share');
      history.replaceState(null, '', location.pathname);
      if (!x || !x.blob.size) return;
      if (window.kelimEv) window.kelimEv('tamlul_share_in', { type: x.blob.type || '' });
      go(new File([x.blob], x.name || 'הקלטה', { type: x.blob.type }), x.name.replace(/\.[^.]+$/, ''));
    }).catch(function () {});
  }

  // ---------- הקלטה בדף ----------
  var rec = null, chunks = [], t0 = 0, timer = null;
  recBtn.addEventListener('click', function () {
    if (rec && rec.state === 'recording') { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return fail('הדפדפן הזה לא תומך בהקלטה. אפשר להקליט באפליקציה של הטלפון ולהעלות את הקובץ.');
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        clearInterval(timer);
        recBtn.textContent = '🎙 להקליט עכשיו';
        recBtn.classList.remove('on');
        go(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), 'הקלטה ' + new Date().toLocaleDateString('he-IL'));
      };
      rec.start(1000);
      t0 = Date.now();
      warm();   // השרת מתעורר בזמן שמדברים
      var keep = setInterval(function () {   // ושומרים אותו ער עד 3 דקות של הקלטה (אחר כך ההתנעה קטנה ביחס לאורך)
        if (!rec || rec.state !== 'recording' || Date.now() - t0 > 180e3) return clearInterval(keep);
        if (warmRoute) warm();
      }, 20000);
      recBtn.classList.add('on');
      timer = setInterval(function () { recBtn.textContent = '⏹ לעצור ולתמלל (' + mmss((Date.now() - t0) / 1000) + ')'; }, 500);
      recBtn.textContent = '⏹ לעצור ולתמלל (0:00)';
    }).catch(function () { fail('צריך לאשר גישה למיקרופון כדי להקליט.'); });
  });

  // ---------- מה עושים עם הטקסט ----------
  $('tl-copy').addEventListener('click', function () {
    var b = this;
    navigator.clipboard.writeText(plain()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 2000); });
  });
  $('tl-word').addEventListener('click', function () {
    var title = $('tl-name').textContent;
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' + title + '</title><style>body{direction:rtl;font-family:David,Arial;font-size:14pt;line-height:1.6}</style></head><body dir="rtl"><h1>' + title.replace(/</g, '&lt;') + '</h1>' +
      Array.prototype.map.call(textEl.querySelectorAll('p'), function (p) { return '<p>' + p.textContent.replace(/</g, '&lt;') + '</p>'; }).join('') +
      '<p style="color:#888;font-size:10pt">תומלל בכלי התמלול של הכלים של גילעד רחמים · hakelim.com/kelim/tamlul/</p></body></html>';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿', html], { type: 'application/msword' }));
    a.download = title.replace(/[\\/:*?"<>|]/g, '') + ' - תמלול.doc';
    document.body.appendChild(a); a.click(); a.remove();
    if (window.kelimEv) window.kelimEv('tamlul_export', { how: 'word' });
  });
  $('tl-pdf').addEventListener('click', function () { if (window.kelimEv) window.kelimEv('tamlul_export', { how: 'pdf' }); window.print(); });
  $('tl-wa').addEventListener('click', function () {
    var t = plain();
    if (t.length > 3500) t = t.slice(0, 3500) + '…\n(הטקסט המלא ארוך מדי להודעה אחת. אפשר להעתיק או לשמור כקובץ.)';
    this.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(t);
    if (window.kelimEv) window.kelimEv('tamlul_export', { how: 'whatsapp' });
  });
  // המשך בכלי קודש: "שיעור לעלון" או "שבוע של תוכן". הטקסט עובר דרך localStorage (אותו אתר), לא דרך הקישור.
  ['tl-alon', 'tl-shavua'].forEach(function (id) {
    var b = $(id); if (!b) return;
    b.addEventListener('click', function () {
      var to = b.dataset.to, t = plain();
      try { localStorage.setItem('kodesh-' + to + '-in', JSON.stringify({ title: '', body: t, from: 'tamlul' })); } catch (e) {}
      if (window.kelimEv) window.kelimEv('tamlul_export', { how: to });
      location.href = '/kodesh/' + to + '/';
    });
  });
})();
