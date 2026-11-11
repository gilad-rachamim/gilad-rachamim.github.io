// דף ההעלאה של בוט התמלול בטלגרם (11.11.2026). טלגרם לא נותן לבוט להוריד קובץ מעל 20MB, אז הבוט שולח קישור אישי לכאן.
// הקובץ עולה בחלקים של 1.5MB ל-Worker (gilad-hub, /tb/up/<token>), שומר אותם ב-Durable Object, ושרת התמלול (RunPod) מוריד
// משם. התמלול חוזר לטלגרם, גם אם הדף נסגר. שלושה חלקים במקביל, וכל חלק מנסה שוב עד 6 פעמים (רשת סלולרית קופצת).
(function () {
  'use strict';
  var API = 'https://gilad-hub.gilad4049.workers.dev/tb/up/';
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var tok = (q.get('t') || ((location.hash.match(/t=([0-9a-fA-F]{24})/) || [])[1]) || '').toLowerCase();
  var st = $('ha-status'), info = null, file = null, dur = null, busy = false, lock = null;

  function say(html, cls) { st.hidden = false; st.className = cls || ''; st.innerHTML = html; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mb(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(1) + 'GB' : Math.max(1, Math.round(b / 1048576)) + 'MB'; }
  function hm(s) {
    s = Math.round(s);
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return h ? h + ' שעות ו-' + m + ' דקות' : (m || 1) + ' דקות';
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function used(how, extra) { try { if (window.toolUsed) window.toolUsed('tamlul_haalaa', Object.assign({ how: how }, extra || {})); } catch (e) { /* בלי מעקב */ } }
  function botLink() { return info && info.bot ? 'https://t.me/' + encodeURIComponent(info.bot) : 'https://t.me/'; }

  function call(path, init) {
    return fetch(API + tok + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j._s = r.status; return j; });
    });
  }

  if (!/^[0-9a-f]{24}$/.test(tok)) {
    say('הקישור לא שלם. פתחו אותו שוב מההודעה של בוט התמלול בטלגרם, או כתבו לבוט <b>/upload</b> וקבלו קישור חדש.', 'ha-err');
    return;
  }

  call('').then(function (j) {
    if (j._s === 200 && j.ok) {
      info = j;
      $('ha-pick').hidden = false;
      say('בחרו את ההקלטה. אפשר עד ' + mb(j.maxMB * 1048576) + ', ועד ' + Math.round(j.maxMin / 60) + ' שעות הקלטה.');
    } else if (j.error === 'used') {
      say('✅ ההקלטה מהקישור הזה כבר הועלתה. התמלול מגיע לטלגרם.<br>להקלטה נוספת: כתבו לבוט <b>/upload</b>.');
    } else if (j.error === 'expired') {
      say('הקישור כבר לא בתוקף (הוא עובד 24 שעות). כתבו לבוט התמלול <b>/upload</b>, והוא ישלח קישור חדש.', 'ha-err');
    } else if (j.error === 'soon') {
      say('העלאה של קבצים גדולים עוד לא פתוחה. נסו שוב בקרוב 🙏', 'ha-err');
    } else {
      say('משהו לא עבד. נסו לרענן את הדף.', 'ha-err');
    }
  }).catch(function () { say('אין חיבור לשרת. בדקו את האינטרנט ורעננו את הדף.', 'ha-err'); });

  // אורך ההקלטה מהדפדפן (בשביל מכסת השעות). פורמט שהדפדפן לא מכיר = בלי אורך, והשרת בודק לבד.
  function probe(f) {
    return new Promise(function (res) {
      var el = document.createElement(/^video\//.test(f.type) ? 'video' : 'audio');
      var url = URL.createObjectURL(f), done = false;
      function end(v) { if (done) return; done = true; URL.revokeObjectURL(url); res(v); }
      el.preload = 'metadata';
      el.onloadedmetadata = function () { end(isFinite(el.duration) && el.duration > 0 ? el.duration : null); };
      el.onerror = function () { end(null); };
      setTimeout(function () { end(null); }, 8000);
      el.src = url;
    });
  }

  $('ha-file').addEventListener('change', function () {
    if (busy) return;
    file = this.files && this.files[0];
    $('ha-go').hidden = true;
    if (!file) return;
    var fi = $('ha-file-info');
    fi.hidden = false;
    fi.textContent = '⏳ ' + file.name;
    if (info && file.size > info.maxMB * 1048576) {
      fi.textContent = file.name + ' · ' + mb(file.size);
      say('הקובץ גדול מ-' + mb(info.maxMB * 1048576) + '. אם זה וידאו, אפשר לשלוח רק את השמע שלו, או לחלק אותו לשני חלקים.', 'ha-err');
      return;
    }
    probe(file).then(function (d) {
      dur = d;
      fi.textContent = file.name + ' · ' + mb(file.size) + (d ? ' · ' + hm(d) : '');
      if (d && info && d > info.maxMin * 60) {
        say('ההקלטה ארוכה מ-' + Math.round(info.maxMin / 60) + ' שעות. אפשר לחלק אותה לשני חלקים, ולשלוח כל אחד בקישור משלו.', 'ha-err');
        return;
      }
      $('ha-go').hidden = false;
      say('מוכן. לוחצים "להעלות ולתמלל", ומשאירים את הדף פתוח עד שההעלאה נגמרת.');
    });
  });

  window.addEventListener('beforeunload', function (e) { if (busy) { e.preventDefault(); e.returnValue = ''; } });

  async function putPart(i, part) {
    var blob = file.slice(i * part, Math.min(file.size, (i + 1) * part));
    for (var a = 0; a < 6; a++) {
      try {
        var r = await fetch(API + tok + '/part/' + i, { method: 'PUT', body: blob, headers: { 'Content-Type': 'application/octet-stream' } });
        if (r.ok) return;
        if (r.status === 410 || r.status === 400) throw Object.assign(new Error('fatal ' + r.status), { fatal: true });
      } catch (e) { if (e.fatal) throw e; }
      await sleep(1500 * (a + 1));
    }
    throw new Error('part ' + i);
  }

  async function sendParts(list, part, total) {
    var next = 0, done = total - list.length, t0 = Date.now();
    function show() {
      var p = Math.floor(done / total * 100);
      say('📤 מעלה… ' + p + '%<div class="ha-bar"><i style="width:' + p + '%"></i></div><small>לא לסגור את הדף עד שההעלאה נגמרת.</small>');
    }
    show();
    async function worker() {
      while (next < list.length) {
        var i = list[next++];
        await putPart(i, part);
        done++;
        show();
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    return Date.now() - t0;
  }

  $('ha-go').addEventListener('click', async function () {
    if (busy || !file) return;
    busy = true;
    $('ha-go').disabled = true;
    $('ha-file').disabled = true;
    try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) { lock = null; }
    try {
      say('⏳ מתחיל…');
      var s = await call('/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, type: file.type, dur: dur ? Math.round(dur) : 0 }) });
      if (!s.ok) {
        busy = false;
        $('ha-go').disabled = false;
        $('ha-file').disabled = false;
        if (s.error === 'limit' && s.text) return say(esc(s.text).replace(/\n/g, '<br>'), 'ha-err');
        if (s.error === 'big') return say('הקובץ גדול מ-' + mb(s.maxMB * 1048576) + '.', 'ha-err');
        if (s.error === 'used') return say('✅ ההקלטה מהקישור הזה כבר הועלתה. להקלטה נוספת: כתבו לבוט <b>/upload</b>.');
        return say('משהו לא עבד בהתחלת ההעלאה. נסו שוב בעוד דקה.', 'ha-err');
      }
      var all = [];
      for (var i = 0; i < s.parts; i++) all.push(i);
      var ms = await sendParts(all, s.part, s.parts);
      var d = await call('/done', { method: 'POST' });
      if (d._s === 409 && d.missing && d.missing.length) {                 // חלק שהלך לאיבוד בדרך: שוב רק אותו
        await sendParts(d.missing, s.part, s.parts);
        d = await call('/done', { method: 'POST' });
      }
      busy = false;
      if (!d.ok) return say('ההעלאה הסתיימה, אבל שרת התמלול לא קיבל אותה. כתבו לבוט, ונבדוק מה קרה 🙏', 'ha-err');
      used('upload', { mb: Math.round(file.size / 1048576), sec: Math.round(ms / 1000) });
      $('ha-pick').hidden = true;
      say(d.shabbat
        ? '<span class="ha-ok">✅ ההקלטה הועלתה!</span><br>בשבת הבוט נח, והתמלול יגיע אליכם בטלגרם במוצאי שבת.'
        : '<span class="ha-ok">✅ ההקלטה הועלתה!</span><br>התמלול יגיע אליכם בטלגרם בעוד כמה דקות. אפשר לסגור את הדף.');
      var back = $('ha-done');
      back.hidden = false;
      back.innerHTML = '<a class="btn btn-gold btn-block" href="' + botLink() + '">חזרה לטלגרם</a>';
    } catch (e) {
      busy = false;
      $('ha-go').disabled = false;
      $('ha-file').disabled = false;
      say('ההעלאה נעצרה (כנראה האינטרנט נפל). לוחצים שוב על "להעלות ולתמלל", וזה ממשיך.', 'ha-err');
    } finally {
      try { if (lock) lock.release(); } catch (e) { /* כבר שוחרר */ }
    }
  });
})();
