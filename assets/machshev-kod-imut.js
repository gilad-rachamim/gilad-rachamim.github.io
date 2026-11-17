/* קוד אימות – דף הכלי. המנוע: /assets/kod-imut.js (KodImut.detect).
 * פרטיות: ההודעה והקוד לא נשלחים לשום מקום ולא נשמרים. ל-GA הולך רק "השתמשו בכלי" ואיך (הדבקה/שיתוף/מיקרופון), בלי תוכן. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var text = $('ki-text'), box = $('ki-result'), codeEl = $('ki-code'), label = $('ki-label'), from = $('ki-from');
  var copyBtn = $('ki-copy'), linkA = $('ki-link'), copied = $('ki-copied');
  var current = null, lastSent = 0;
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) document.documentElement.classList.add('ios');

  function used(how) {
    var now = Date.now();
    if (now - lastSent < 20000) return; // אירוע אחד בכל 20 שניות, בלי תוכן
    lastSent = now;
    if (window.toolUsed) window.toolUsed('kod_imut', { how: how });
  }

  function copy(code, auto) {
    if (!code) return;
    var done = function (ok) {
      copied.textContent = ok ? '✓ הקוד ' + code + ' הועתק – מדביקים אותו בשדה' : 'לוחצים "להעתיק את הקוד"';
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () { done(true); }, function () { if (!auto) fallback(); else done(false); });
        return;
      }
    } catch (e) {}
    fallback();
    function fallback() {
      try {
        var t = document.createElement('textarea'); t.value = code; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select(); var ok = document.execCommand('copy'); document.body.removeChild(t); done(ok);
      } catch (e) { done(false); }
    }
  }

  function show(src, how, autoCopy) {
    box.classList.remove('demo');
    var r = window.KodImut ? window.KodImut.detect(src) : null;
    current = r && r.code ? r.code : null;
    copied.textContent = '';
    if (r && r.code) {
      label.textContent = r.confidence === 'high' ? 'הקוד שלכם:' : 'נראה שזה הקוד:';
      codeEl.textContent = r.code; codeEl.className = 'ki-code';
      from.textContent = r.sender ? 'מאת ' + r.sender : '';
      copyBtn.hidden = false;
    } else if (r && r.link) {
      label.textContent = 'בהודעה יש קישור אימות:';
      codeEl.textContent = 'אין קוד – יש קישור'; codeEl.className = 'ki-code none';
      from.textContent = 'בודקים שהקישור באמת מהאתר שביקשתם ממנו, ורק אז פותחים.';
      copyBtn.hidden = true;
    } else {
      label.textContent = '';
      codeEl.textContent = src.trim() ? 'לא מצאתי קוד בהודעה הזאת' : 'מחכה להודעה';
      codeEl.className = 'ki-code none';
      from.textContent = src.trim() ? 'אפשר להדביק את כל ההודעה, או להקליד רק את הקוד.' : '';
      copyBtn.hidden = true;
    }
    if (r && r.link) { linkA.href = r.link; linkA.hidden = false; } else { linkA.hidden = true; linkA.href = '#'; }
    if (current && how) used(how);
    if (current && autoCopy) copy(current, true);
    return r;
  }

  // הדבקה בלחיצה
  $('ki-paste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { text.focus(); copied.textContent = 'לוחצים לחיצה ארוכה בתיבה ← "הדבק"'; return; }
    navigator.clipboard.readText().then(function (t) {
      if (!t || !t.trim()) { copied.textContent = 'הלוח ריק. מעתיקים קודם את ההודעה עם הקוד.'; return; }
      text.value = t; show(t, 'paste', true);
    }, function () { text.focus(); copied.textContent = 'הדפדפן לא נתן לקרוא את הלוח. לחיצה ארוכה בתיבה ← "הדבק".'; });
  });

  var typing;
  text.addEventListener('input', function () {
    clearTimeout(typing);
    typing = setTimeout(function () { show(text.value, 'type', false); }, 250);
  });
  text.addEventListener('paste', function () { setTimeout(function () { show(text.value, 'paste', true); }, 0); });

  copyBtn.addEventListener('click', function () { copy(current || codeEl.textContent.trim(), false); });
  $('ki-clear').addEventListener('click', function () { text.value = ''; show('', null, false); text.focus(); });
  linkA.addEventListener('click', function () { used('link'); });

  // מיקרופון – קוד בשיחה קולית על רמקול
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var mic = $('ki-mic'), micNote = $('ki-mic-note'), rec = null, heard = '';
  if (SR) {
    mic.hidden = false;
    mic.addEventListener('click', function () {
      if (rec) { rec.stop(); return; }
      heard = '';
      rec = new SR();
      rec.lang = /^en/i.test(navigator.language || '') ? 'en-US' : 'he-IL';
      rec.continuous = true; rec.interimResults = true;
      mic.classList.add('on'); mic.textContent = '⏹ להפסיק להקשיב';
      micNote.hidden = false; micNote.textContent = 'מקשיב… שימו את השיחה על רמקול, קרוב לטלפון.';
      rec.onresult = function (e) {
        var all = '';
        for (var i = 0; i < e.results.length; i++) all += e.results[i][0].transcript + ' ';
        heard = all;
        var r = window.KodImut.detect(all);
        if (r && r.code) { text.value = all.trim(); show(all, 'mic', true); try { rec.stop(); } catch (x) {} }
      };
      rec.onerror = function (e) {
        micNote.textContent = e.error === 'not-allowed' ? 'צריך לאשר גישה למיקרופון (בסמל המנעול ליד הכתובת).' : 'לא הצלחתי לשמוע. נסו שוב, קרוב יותר לרמקול.';
      };
      rec.onend = function () {
        rec = null; mic.classList.remove('on'); mic.textContent = '🎤 להקשיב לקוד';
        if (!current && heard.trim()) { text.value = heard.trim(); show(heard, null, false); }
        if (current) micNote.textContent = 'שמעתי את הקוד. הקול לא נשמר.';
      };
      try { rec.start(); } catch (x) { micNote.textContent = 'המיקרופון לא זמין כרגע.'; }
    });
  } else {
    micNote.hidden = false;
    micNote.textContent = 'הקשבה לקוד קולי עובדת בכרום ובספארי. בדפדפן הזה – מקלידים את הקוד או מדביקים.';
  }

  // קוד לבוני אתרים
  var dev = $('ki-dev-copy');
  if (dev) dev.addEventListener('click', function () {
    var t = $('ki-dev-1').textContent;
    try { navigator.clipboard.writeText(t); dev.textContent = '✓ הועתק'; } catch (e) {}
  });

  // הגיע משיתוף: מה-service worker (POST) או מכתובת ?text= (נשמר ב-sessionStorage ונמחק מהכתובת עוד לפני המעקב)
  function fromShare(t, how) {
    if (!t || !t.trim()) return false;
    text.value = t.trim(); show(t, how, true);
    return true;
  }
  var got = false;
  try {
    var s = sessionStorage.getItem('kod-share-text');
    if (s !== null) { sessionStorage.removeItem('kod-share-text'); got = fromShare(s, 'share'); }
  } catch (e) {}
  if (!got && /[?&]share=1/.test(location.search) && 'caches' in window) {
    caches.open('kod-share').then(function (c) {
      return c.match('/kod-share/0').then(function (r) {
        return r ? r.text().then(function (t) { fromShare(t, 'share'); }) : null;
      }).then(function () { return caches.delete('kod-share'); });
    }).catch(function () {});
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
  }
  if (!got) box.classList.add('demo');
})();
