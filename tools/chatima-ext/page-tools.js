// כלים שעובדים על הדף הפתוח, רק אחרי לחיצה של המשתמש (activeTab): תיקון שפת מקלדת, צילום של כל העמוד,
// הקראה בקול, סידור כיוון עברית, מצב כהה ותרגום הדף. הכול במחשב, בלי שרת. נטען ב-background.js (importScripts).

// ---------- הודעה קטנה בדף ----------
function hkInstallToast() { window.__hkToast = function (msg, good, extra) {
  var old = document.getElementById('hk-toast'); if (old) old.remove();
  var d = document.createElement('div'); d.id = 'hk-toast';
  d.setAttribute('dir', 'rtl'); d.setAttribute('role', 'status');
  d.style.cssText = 'position:fixed;z-index:2147483647;bottom:18px;left:50%;transform:translateX(-50%);max-width:min(560px,92vw);background:#141210;color:#f3ead7;border:2px solid ' + (good ? '#d9b25f' : '#c0504d') + ';border-radius:12px;padding:12px 16px;font:15px/1.5 Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35);white-space:pre-wrap;word-break:break-word';
  d.textContent = msg;
  if (extra) { var b = document.createElement('div'); b.style.cssText = 'margin-top:6px;padding:6px 8px;background:#201c17;border-radius:8px;user-select:all'; b.textContent = extra; d.appendChild(b); }
  document.documentElement.appendChild(d);
  setTimeout(function () { d.remove(); }, extra ? 12000 : 6000);
}; }
function inTab(tab, func, args) {
  return chrome.scripting.executeScript({ target: { tabId: tab.id }, func: hkInstallToast }).then(function () { return chrome.scripting.executeScript({ target: { tabId: tab.id }, func: func, args: args || [] }).then(function (r) { return r && r[0] && r[0].result; }); });
}
function toastIn(tab, msg, good, extra) { return inTab(tab, function (m, g, x) { window.__hkToast(m, g, x); }, [msg, good, extra || '']).catch(function () {}); }

// ---------- 1. "כתבתי באנגלית במקום בעברית" (ולהפך) ----------
// מקלדת עברית תקנית: כל מקש באנגלית ← האות שעליו בעברית
function fixLayoutInPage() {
  var toast = window.__hkToast;
  var EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,./`", HE = "/'קראטוןםפ][שדגכעיחלךף,זסבהנמצתץ.;";
  function conv(t) {
    var lat = (t.match(/[a-z]/gi) || []).length, heb = (t.match(/[א-ת]/g) || []).length;
    var from = lat >= heb ? EN : HE, to = lat >= heb ? HE : EN, out = '';
    for (var i = 0; i < t.length; i++) {
      var c = t[i], k = from === EN ? c.toLowerCase() : c, j = from.indexOf(k);
      out += j >= 0 ? to[j] : c;
    }
    return out;
  }
  var el = document.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
  // שדה טקסט רגיל
  if (el && (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && /^(text|search|email|url|tel|)$/i.test(el.type)))) {
    var a = el.selectionStart, b = el.selectionEnd;
    if (a == null || a === b) { a = 0; b = el.value.length; }
    var fixed = conv(el.value.slice(a, b));
    el.setRangeText(fixed, a, b, 'select');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return 'field';
  }
  // תיבת כתיבה של ג׳ימייל, ווטסאפ ווב וכו׳
  var ce = el && el.isContentEditable ? el : null;
  var sel = window.getSelection();
  if (ce) {
    if (!sel.rangeCount || sel.isCollapsed) { var r = document.createRange(); r.selectNodeContents(ce); sel.removeAllRanges(); sel.addRange(r); }
    var txt = sel.toString();
    if (txt) document.execCommand('insertText', false, conv(txt));
    return 'editable';
  }
  // טקסט מסומן בדף: מציגים את התיקון ומעתיקים
  var t = sel ? sel.toString() : '';
  if (!t.trim()) { toast('מסמנים את הטקסט שנכתב בשפה הלא נכונה, ואז שוב Alt+Shift+H או לחיצה ימנית.', false); return 'none'; }
  var f = conv(t), copied = false;
  try { var ta = document.createElement('textarea'); ta.value = f; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); copied = document.execCommand('copy'); ta.remove(); } catch (e) {}
  toast(copied ? 'התיקון הועתק. אפשר להדביק:' : 'התיקון:', true, f);
  return 'page';
}

// ---------- 4. סידור כיוון עברית ----------
function rtlInPage() {
  var toast = window.__hkToast;
  if (window.__hkRtl) {   // לחיצה שנייה: מחזירים כמו שהיה
    window.__hkRtl.disconnect(); window.__hkRtl = null;
    document.querySelectorAll('[data-hk-rtl]').forEach(function (e) { e.removeAttribute('dir'); e.style.textAlign = ''; e.removeAttribute('data-hk-rtl'); });
    toast('הכיוון חזר לקדמותו.', true); return 'off';
  }
  var HE = /[֐-׿]/, n = 0;
  function own(e) { for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.nodeValue.trim()) return c.nodeValue; return ''; }
  function fix(root) {
    if (!root.querySelectorAll) return;
    var list = [root].concat([].slice.call(root.querySelectorAll('p,li,div,td,th,h1,h2,h3,h4,h5,h6,blockquote,dd,dt,label,span,textarea,input,[contenteditable="true"],[role="textbox"]')));
    list.forEach(function (e) {
      if (e.hasAttribute('data-hk-rtl') || e.closest('pre,code,kbd')) return;
      var editable = e.tagName === 'TEXTAREA' || e.tagName === 'INPUT' || e.isContentEditable;
      var text = editable ? (e.value || e.textContent || '') : own(e);
      if (!(editable || text) || (text && !HE.test(text))) return;
      if (e.getAttribute('dir') === 'rtl') return;
      e.setAttribute('dir', 'auto'); e.setAttribute('data-hk-rtl', '1');
      if (getComputedStyle(e).display !== 'inline') e.style.textAlign = 'start';
      n++;
    });
  }
  fix(document.body);
  var ob = new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (x) { if (x.nodeType === 1) fix(x); else if (x.parentElement) fix(x.parentElement); }); }); });
  ob.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.__hkRtl = ob;
  toast('העברית בדף מסודרת מימין לשמאל (' + n + ' קטעים), גם בהודעות חדשות. לחיצה נוספת מחזירה.', true);
  return 'on';
}

// ---------- 6. מצב כהה ----------
function darkInPage() {
  var toast = window.__hkToast;
  var s = document.getElementById('hk-dark');
  if (s) { s.remove(); toast('מצב כהה כבוי.', true); return 'off'; }
  s = document.createElement('style'); s.id = 'hk-dark';
  s.textContent = 'html{filter:invert(.9) hue-rotate(180deg)!important;background:#fff!important}img,video,picture,canvas,iframe,svg image,[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important}#hk-toast{filter:invert(1) hue-rotate(180deg)!important}';
  document.documentElement.appendChild(s);
  toast('מצב כהה פועל בדף הזה. לחיצה נוספת מכבה.', true);
  return 'on';
}

// ---------- 3. הקראה בקול ----------
var speakingTab = null;
function setStopVisible(v) { chrome.contextMenus.update('speak-stop', { visible: v }, function () { void chrome.runtime.lastError; }); }
function speak(tab, text) {
  text = (text || '').trim().slice(0, 30000);
  if (!text) return toastIn(tab, 'מסמנים טקסט בדף, ואז "להקריא בקול".', false).then(function () { return { ok: false, err: 'no text' }; });
  var heb = /[֐-׿]/.test(text);
  function voices() { return new Promise(function (res) { chrome.tts.getVoices(res); }); }
  // רשימת הקולות נטענת לפעמים באיחור: אם היא ריקה מחכים רגע ובודקים שוב
  return voices().then(function (l) { return l.length ? l : wait(1200).then(voices); }).then(function (voices) {
    var want = heb ? /^(he|iw)/i : /^en/i;
    var v = voices.filter(function (x) { return want.test(x.lang || ''); });
    if (!v.length && heb && voices.length) {
      toastIn(tab, 'אין במחשב קול שמדבר עברית. מוסיפים אותו פעם אחת: הגדרות Windows ← זמן ושפה ← דיבור ← הוספת קולות ← עברית. אחר כך מפעילים מחדש את כרום.', false);
      return { ok: false, err: 'no hebrew voice' };
    }
    return chrome.storage.local.get('ttsRate').then(function (o) {
      chrome.tts.stop();
      var best = v.filter(function (x) { return !x.remote; })[0] || v[0];
      chrome.tts.speak(text, {
        lang: heb ? 'he-IL' : 'en-US', voiceName: best && best.voiceName, rate: o.ttsRate || 1,
        onEvent: function (e) {
          if (e.type === 'start') { speakingTab = tab.id; setStopVisible(true); }
          if (/^(end|interrupted|cancelled|error)$/.test(e.type)) { speakingTab = null; setStopVisible(false); }
        }
      });
      return { ok: true };
    });
  });
}
function selectedText(tab) { return inTab(tab, function () { return String(window.getSelection() || ''); }); }

// ---------- 2. צילום של כל העמוד ----------
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function fullShot(tab) {
  var info, bitmaps = [], MAX_PX = 30000;
  return inTab(tab, function () {
    var se = document.scrollingElement || document.documentElement;
    return { h: Math.max(se.scrollHeight, document.body ? document.body.scrollHeight : 0), vh: innerHeight, dpr: devicePixelRatio || 1, x: scrollX, y: scrollY, title: document.title, url: location.href };
  }).then(function (i) {
    info = i;
    var H = Math.min(info.h, Math.floor(MAX_PX / info.dpr)), ys = [];
    for (var y = 0; y < H; y += info.vh) ys.push(Math.min(y, Math.max(0, H - info.vh)));
    info.H = H; info.cut = info.h > H;
    var chain = Promise.resolve();
    ys.forEach(function (y, k) {
      chain = chain.then(function () {
        return inTab(tab, function (y, k) {
          // אחרי הצילום הראשון מסתירים כותרות ופסים "דבוקים", שלא יחזרו בכל חתיכה
          if (k === 1) document.querySelectorAll('body *').forEach(function (e) {
            var p = getComputedStyle(e).position;
            if (p === 'fixed' || p === 'sticky') { e.setAttribute('data-hk-vis', e.style.visibility || '-'); e.style.setProperty('visibility', 'hidden', 'important'); }
          });
          var t = document.getElementById('hk-toast'); if (t) t.remove();
          window.scrollTo(0, y); return window.scrollY;
        }, [y, k]);
      }).then(function (realY) {
        return wait(k === 0 ? 250 : 550).then(function () { return chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }); })
          .then(function (url) { return fetch(url).then(function (r) { return r.blob(); }).then(createImageBitmap); })
          .then(function (bm) { bitmaps.push({ bm: bm, y: realY }); });
      });
    });
    return chain;
  }).then(function () {
    return inTab(tab, function (x, y) {
      document.querySelectorAll('[data-hk-vis]').forEach(function (e) { var v = e.getAttribute('data-hk-vis'); e.style.visibility = v === '-' ? '' : v; e.removeAttribute('data-hk-vis'); });
      window.scrollTo(x, y);
    }, [info.x, info.y]);
  }).then(function () {
    var w = bitmaps[0].bm.width;
    var cv = new OffscreenCanvas(w, Math.round(info.H * info.dpr)), g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    bitmaps.forEach(function (b) { g.drawImage(b.bm, 0, Math.round(b.y * info.dpr)); });
    return cv.convertToBlob({ type: 'image/png' });
  }).then(function (blob) {
    return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(blob); });
  }).then(function (dataUrl) {
    return chrome.storage.local.set({ shot: { img: dataUrl, title: info.title, url: info.url, cut: info.cut, at: Date.now() } });
  }).then(function () {
    return chrome.tabs.create({ url: chrome.runtime.getURL('shot.html'), index: tab.index + 1 });
  }).then(function () { return { ok: true }; });
}

// ---------- 7. תרגום הדף ותרגום של טקסט מסומן (translate.js, במנוע התרגום שבתוך כרום) ----------
function trInTab(tab, cmd, arg) {
  var target = { tabId: tab.id };
  return chrome.scripting.executeScript({ target: target, func: function () { return !!window.__hkTr; } })
    .then(function (r) {
      if (r && r[0] && r[0].result) return;
      return chrome.scripting.insertCSS({ target: target, files: ['translate.css'] }).catch(function () {})
        .then(function () { return chrome.scripting.executeScript({ target: target, files: ['translate.js'] }); });
    })
    .then(function () { return chrome.scripting.executeScript({ target: target, func: function (c, a) { return window.__hkTr.cmd(c, a); }, args: [cmd, arg || ''] }); })
    .then(function (r) { return { ok: true, r: r && r[0] && r[0].result }; });
}

// ---------- מה כל פריט עושה ----------
var PAGE_ACTS = {
  fix: function (tab) { return inTab(tab, fixLayoutInPage).then(function (r) { return { ok: true, r: r }; }); },
  speak: function (tab, info) {
    return (info && info.selectionText ? Promise.resolve(info.selectionText) : selectedText(tab)).then(function (t) { return speak(tab, t); });
  },
  'speak-stop': function () { chrome.tts.stop(); setStopVisible(false); return Promise.resolve({ ok: true }); },
  shot: function (tab) { return fullShot(tab); },
  rtl: function (tab) { return inTab(tab, rtlInPage).then(function (r) { return { ok: true, r: r }; }); },
  dark: function (tab) { return inTab(tab, darkInPage).then(function (r) { return { ok: true, r: r }; }); },
  translate: function (tab) { return trInTab(tab, 'toggle'); },
  'tr-sel': function (tab, info) { return trInTab(tab, 'sel', info && info.selectionText || ''); }
};
