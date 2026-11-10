/* הפותר – שאלות בגרות במתמטיקה עם דרך מלאה ובדיקה (/limudim/poter/)
   השרת: Cloudflare Worker limudim-poter (tools/poter-worker). כאן רק קלט, המתנה ותצוגה. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('pt-app')) return;

  var API = 'https://limudim-poter.gilad4049.workers.dev';
  try { // בדיקה מקומית: ?api=http://127.0.0.1:8899
    var qa = new URLSearchParams(location.search).get('api');
    if (qa && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(qa)) API = qa;
  } catch (_) {}

  var usedOnce = {};
  function used(action) { if (usedOnce[action]) return; usedOnce[action] = 1; if (window.toolUsed) window.toolUsed('poter', { action: action }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- רמה ----------
  var level = +(store('pt-lv') || 5);
  var lvBtns = document.querySelectorAll('#pt-app .cx-lv button');
  function setLv(n) {
    level = n; store('pt-lv', String(n));
    for (var i = 0; i < lvBtns.length; i++) { var on = +lvBtns[i].getAttribute('data-lv') === n; lvBtns[i].classList.toggle('on', on); lvBtns[i].setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  for (var i = 0; i < lvBtns.length; i++) lvBtns[i].addEventListener('click', function () { setLv(+this.getAttribute('data-lv')); });
  setLv(level);

  // ---------- צילום ----------
  var image = null; // {mime, data}
  function loadImage(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var max = 1800, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      var d = c.toDataURL('image/jpeg', 0.88);
      image = { mime: 'image/jpeg', data: d.split(',')[1] };
      $('pt-imgp').src = d; $('pt-img').hidden = false;
      URL.revokeObjectURL(url); used('photo');
    };
    img.onerror = function () { showErr('לא הצלחתי לפתוח את התמונה. אפשר לנסות צילום אחר, או להקליד את השאלה.'); };
    img.src = url;
  }
  $('pt-file').addEventListener('change', function () { loadImage(this.files && this.files[0]); this.value = ''; });
  $('pt-imgx').addEventListener('click', function () { image = null; $('pt-img').hidden = true; $('pt-imgp').removeAttribute('src'); });
  $('pt-q').addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var j = 0; j < items.length; j++) if (items[j].kind === 'file' && /^image\//.test(items[j].type)) { e.preventDefault(); loadImage(items[j].getAsFile()); return; }
  });

  // ---------- קול ----------
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false;
  var mic = $('pt-mic'), micNote = $('pt-mic-note');
  if (!SR) { mic.hidden = true; }
  mic.addEventListener('click', function () {
    if (listening) { rec && rec.stop(); return; }
    rec = new SR(); rec.lang = 'he-IL'; rec.interimResults = false; rec.continuous = true;
    var ta = $('pt-q');
    rec.onresult = function (e) {
      for (var k = e.resultIndex; k < e.results.length; k++) if (e.results[k].isFinal) {
        var t = e.results[k][0].transcript.trim();
        ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t;
      }
    };
    rec.onend = function () { listening = false; mic.setAttribute('aria-pressed', 'false'); mic.textContent = '🎤 להגיד בקול'; micNote.hidden = true; };
    rec.onerror = function (e) { if (e.error === 'not-allowed') { micNote.hidden = false; micNote.textContent = 'צריך לאשר גישה למיקרופון בדפדפן.'; } };
    try { rec.start(); } catch (_) { return; }
    listening = true; mic.setAttribute('aria-pressed', 'true'); mic.textContent = '⏹ לסיים להקליט';
    micNote.hidden = false; micNote.textContent = 'מקשיב… אומרים את השאלה לאט, כולל הסעיפים. למשל: "נתונה הפונקציה אף של איקס שווה איקס בריבוע פחות ארבע".';
    used('voice');
  });

  // ---------- שליחה ----------
  var timers = [];
  function stage(n) {
    var lis = document.querySelectorAll('#pt-stages li');
    for (var k = 0; k < lis.length; k++) { var s = +lis[k].getAttribute('data-s'); lis[k].className = s < n ? 'done' : s === n ? 'now' : ''; }
    $('pt-stage').textContent = ['קורא את השאלה…', 'פותר סעיף אחרי סעיף…', 'מציב ובודק במחשבון…', 'בודק שני פותר מחדש ומשווה…', 'מתקן ובודק שוב…'][n] || '';
  }
  function busy(on) {
    $('pt-wait').hidden = !on; $('pt-go').disabled = on;
    timers.forEach(clearTimeout); timers = [];
    if (on) {
      stage(0);
      [[5000, 1], [60000, 2], [70000, 3], [170000, 4]].forEach(function (t) { timers.push(setTimeout(function () { stage(t[1]); }, t[0])); });
    }
  }
  function showErr(msg) { var e = $('pt-err'); e.hidden = !msg; e.textContent = msg || ''; }

  $('pt-go').addEventListener('click', function () {
    var text = $('pt-q').value.trim();
    showErr('');
    if (!text && !image) { showErr('צריך להקליד שאלה, לצלם אותה או להגיד אותה בקול.'); $('pt-q').focus(); return; }
    if (listening && rec) rec.stop();
    busy(true); $('pt-out').innerHTML = '';
    used('solve');
    fetch(API + '/solve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text, image: image, level: level }) })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }, function () { return { s: r.status, j: {} }; }); })
      .then(function (x) {
        busy(false);
        if (x.s === 429) return showErr('הגעתם ל-12 השאלות של היום. מחר אפשר להמשיך. ככה השירות נשאר חינמי לכולם.');
        if (x.s !== 200) return showErr(x.j && x.j.busy ? 'הפותר עמוס כרגע, או שהמכסה החינמית של היום נגמרה. אפשר לנסות שוב בעוד כמה דקות, ואם זה חוזר – מחר בבוקר.' : 'משהו השתבש. אפשר לנסות שוב בעוד רגע.');
        render(x.j);
      })
      .catch(function () { busy(false); showErr('אין חיבור לשרת. בודקים את האינטרנט ומנסים שוב.'); });
  });

  function demo(scroll) {
    showErr(''); used('demo');
    fetch('/assets/limudim-poter-demo.json').then(function (r) { return r.json(); }).then(function (j) { render(j, true, scroll); }).catch(function () { showErr('הדוגמה לא נטענה.'); });
  }
  $('pt-demo').addEventListener('click', function () { demo(true); });
  if (/[?&]demo=1/.test(location.search)) demo(false); // קישור ישיר לדוגמה

  // ---------- תצוגה ----------
  function tex(el, s) {
    if (window.katex) { try { window.katex.render(String(s), el, { throwOnError: false, displayMode: false, output: 'html' }); return; } catch (_) {} }
    el.textContent = s;
  }
  function verdictHtml(v) {
    if (!v) return '';
    if (v.ok) return '<div class="pt-badge ok"><b>✓ נבדק</b><span>בודק שני הגיע לאותן תשובות' + (v.passed ? ', ו-' + v.passed + ' בדיקות במחשבון יצאו נכונות' : '') + '.</span></div>';
    var why = [];
    if (v.disagree) why.push('הבודק השני לא הסכים ב-' + (v.disagree === 1 ? 'סעיף אחד' : v.disagree + ' סעיפים'));
    if (v.failed) why.push((v.failed === 1 ? 'בדיקה אחת' : v.failed + ' בדיקות') + ' במחשבון לא יצאו');
    return '<div class="pt-badge warn"><b>⚠️ כדאי לבדוק עם המורה</b><span>' + esc(why.join(', ') || 'לא הצלחנו לבדוק את כל הסעיפים') + '. ליד הסעיף מסומן מה בדיוק.</span></div>';
  }

  function render(d, demo, scroll) {
    var out = $('pt-out'); out.innerHTML = '';
    if (!d || d.readable === false) {
      showErr('לא הצלחתי לקרוא את השאלה. ' + (d && d.question_text ? d.question_text : 'אפשר לצלם שוב באור טוב, או להקליד אותה.'));
      return;
    }
    var vparts = {}, checks = d.checks || [];
    ((d.verdict && d.verdict.parts) || []).forEach(function (p) { vparts[p.label] = p; });
    var sheet = document.createElement('article'); sheet.className = 'cx-sheet pt-sheet';
    var h = (demo ? '<p class="pt-demo-tag">דוגמה – 35482 קיץ 2024, שאלה 5</p>' : '') + verdictHtml(d.verdict);
    if (d.topic) h += '<p class="pt-topic">' + esc(d.topic) + '</p>';
    h += '<details class="pt-qtext"' + (image ? '' : '') + '><summary>השאלה כפי שהפותר הבין אותה</summary><p>' + esc(d.question_text).replace(/\n/g, '<br>') + '</p></details>';
    if ((d.given || []).length) h += '<h3>נתון</h3><ul class="pt-given">' + d.given.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>';
    sheet.innerHTML = h;

    (d.parts || []).forEach(function (p) {
      var sec = document.createElement('section'); sec.className = 'pt-part';
      var vp = vparts[p.label];
      var mark = vp ? (vp.agree === false ? '<span class="pt-mk warn" title="הבודק השני לא הסכים">⚠️</span>' : (vp.checks_bad ? '<span class="pt-mk warn">⚠️</span>' : '<span class="pt-mk ok" title="נבדק">✓</span>')) : '';
      sec.innerHTML = '<h3>סעיף ' + esc(p.label) + ' ' + mark + '</h3>' + (p.ask ? '<p class="pt-ask">' + esc(p.ask) + '</p>' : '');
      var ol = document.createElement('ol'); ol.className = 'cx-steps';
      (p.steps || []).forEach(function (s) {
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(s.say || ''));
        if (s.math) { var m = document.createElement('div'); m.className = 'pt-math'; m.setAttribute('dir', 'ltr'); tex(m, s.math); li.appendChild(m); }
        ol.appendChild(li);
      });
      sec.appendChild(ol);
      var ans = document.createElement('div'); ans.className = 'cx-ans pt-ans';
      ans.innerHTML = '<span>תשובה:</span> <b dir="auto"></b>'; ans.querySelector('b').textContent = p.answer || '';
      sec.appendChild(ans);
      if (vp && vp.agree === false) {
        var w = document.createElement('p'); w.className = 'pt-dis';
        w.textContent = 'הבודק השני קיבל: ' + (vp.other || '—') + (vp.why ? '. ' + vp.why : '');
        sec.appendChild(w);
      }
      var mine = checks.filter(function (c) { return String(c.part) === String(p.label); });
      if (mine.length) {
        var ul = document.createElement('ul'); ul.className = 'pt-checks';
        mine.forEach(function (c) {
          var li = document.createElement('li');
          li.className = c.pass === true ? 'ok' : c.pass === false ? 'bad' : 'skip';
          li.textContent = (c.pass === true ? '✓ ' : c.pass === false ? '✗ ' : '– ') + (c.what || 'בדיקה במחשבון') + (c.pass === false ? ' (לא יצא)' : c.skip ? ' (לא נבדק)' : '');
          ul.appendChild(li);
        });
        var cap = document.createElement('p'); cap.className = 'pt-chcap'; cap.textContent = 'בדיקות במחשבון:';
        sec.appendChild(cap); sec.appendChild(ul);
      }
      sheet.appendChild(sec);
    });
    if (d.tip) { var tp = document.createElement('p'); tp.className = 'note pt-tip'; tp.textContent = '💡 ' + d.tip; sheet.appendChild(tp); }
    out.appendChild(sheet);

    var act = document.createElement('div'); act.className = 'btns pt-act';
    act.innerHTML = '<button type="button" class="btn" id="pt-again">שאלה חדשה</button><button type="button" class="btn" id="pt-print">להדפיס</button>';
    out.appendChild(act);
    $('pt-again').addEventListener('click', function () { $('pt-q').value = ''; $('pt-imgx').click(); out.innerHTML = ''; $('pt-q').focus(); window.scrollTo({ top: $('pt-in').offsetTop - 20, behavior: 'smooth' }); });
    $('pt-print').addEventListener('click', function () { used('print'); window.print(); });
    if (d.cached) { var cf = document.createElement('p'); cf.className = 'note'; cf.textContent = '⚡ מישהו כבר שאל את השאלה הזאת, אז הפתרון הבדוק הגיע מיד (ולא נספר במכסה שלכם).'; out.appendChild(cf); }
    if (typeof d.left === 'number') { var lf = document.createElement('p'); lf.className = 'note'; lf.textContent = 'נשארו לכם היום ' + d.left + ' שאלות.'; out.appendChild(lf); }
    if (scroll !== false) sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();
