// נגישות – משותף לכל דפי התוסף (נטען ב-<head> של כל דף).
// 1. גודל טקסט: רגיל / גדול / גדול מאוד, נשמר ב-chrome.storage (hkTextSize) ומוחל בכל הדפים מיד.
// 2. שם נגיש לכפתור שיש בו רק סמל (לפי ה-title שלו), ואימוג׳י בתחילת כפתור או כותרת לא מוקרא.
// 3. ניווט במקשי החצים בין לשוניות (role=tablist), כמו שקוראי מסך מצפים.
(function () {
  'use strict';
  var KEY = 'hkTextSize', SIZES = ['m', 'l', 'xl'];
  var NAMES = { m: 'רגיל', l: 'גדול', xl: 'גדול מאוד' };
  var root = document.documentElement;

  function apply(v) {
    if (SIZES.indexOf(v) < 0) v = 'm';
    root.setAttribute('data-hk-size', v);
    var bs = document.querySelectorAll('.hk-size button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-v') === v ? 'true' : 'false');
  }
  // קודם מהזיכרון המהיר של הדף (בלי הבהוב), ואז מ-chrome.storage שהוא המקור
  try { apply(localStorage.getItem(KEY) || 'm'); } catch (e) { apply('m'); }
  var hasStore = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  if (hasStore) {
    try {
      chrome.storage.local.get(KEY, function (o) { var v = (o && o[KEY]) || 'm'; apply(v); try { localStorage.setItem(KEY, v); } catch (e) {} });
      chrome.storage.onChanged.addListener(function (ch, area) {
        if (area === 'local' && ch[KEY]) { var v = ch[KEY].newValue || 'm'; apply(v); try { localStorage.setItem(KEY, v); } catch (e) {} }
      });
    } catch (e) {}
  }
  function save(v) {
    apply(v);
    try { localStorage.setItem(KEY, v); } catch (e) {}
    if (hasStore) try { var o = {}; o[KEY] = v; chrome.storage.local.set(o); } catch (e) {}
    var st = document.getElementById('hk-size-st');
    if (st) st.textContent = 'גודל הטקסט: ' + NAMES[v];
  }

  // ---------- בורר גודל הטקסט ----------
  function sizeControl() {
    var box = document.querySelector('[data-hk-size-ctl]');
    if (!box) {
      var h = document.querySelector('body > header, #pick > header, main > h1');
      if (!h) return;
      box = document.createElement('div'); box.className = 'hk-size'; box.setAttribute('data-hk-size-ctl', '');
      if (h.tagName === 'H1') { box.classList.add('hk-size-corner'); h.parentNode.insertBefore(box, h); } else h.appendChild(box);
    }
    if (box.firstChild) return;
    box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'גודל הטקסט');
    var cur = root.getAttribute('data-hk-size') || 'm';
    SIZES.forEach(function (v, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-v', v);
      b.className = 'hk-sz hk-sz-' + v; b.textContent = 'א';
      b.setAttribute('aria-label', 'גודל טקסט ' + NAMES[v]); b.title = 'גודל טקסט ' + NAMES[v];
      b.setAttribute('aria-pressed', v === cur ? 'true' : 'false');
      b.addEventListener('click', function () { save(v); });
      box.appendChild(b);
    });
    var st = document.createElement('span'); st.id = 'hk-size-st'; st.className = 'hk-sr'; st.setAttribute('role', 'status'); box.appendChild(st);
  }

  // ---------- שמות נגישים ואימוג׳י ----------
  var LETTER = /[A-Za-z֐-׿0-9]/;
  var LEAD = /^\s*((?:\p{Extended_Pictographic}|[←-⇿⌀-⏿─-➿⬀-⯿])(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*/u;
  var SEL = 'button, summary, h1, h2, h3, [role=tab], a.btn, .feat a, .go a';
  function fix(el) {
    if (el.closest('#doc, [contenteditable], .note')) return;
    var tag = el.tagName;
    // כפתור בלי טקסט קריא: לוקחים את השם מה-title
    if ((tag === 'BUTTON' || el.getAttribute('role') === 'tab') && !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
      if (!LETTER.test(el.textContent || '') && el.title) el.setAttribute('aria-label', el.title);
    }
    // סמל בתחילת הטקסט: מסתירים אותו מקורא המסך, אם נשאר טקסט אמיתי אחריו
    var t = el.firstChild;
    if (!t || t.nodeType !== 3) return;
    var m = LEAD.exec(t.nodeValue);
    if (!m) return;
    var rest = t.nodeValue.slice(m[0].length) + (el.textContent || '').slice(t.nodeValue.length);
    if (!LETTER.test(rest)) return;
    var sp = document.createElement('span'); sp.setAttribute('aria-hidden', 'true'); sp.className = 'hk-emo';
    sp.textContent = m[0];
    t.nodeValue = t.nodeValue.slice(m[0].length);
    el.insertBefore(sp, t);
  }
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches && node.matches(SEL)) fix(node);
    var list = node.querySelectorAll ? node.querySelectorAll(SEL) : [];
    for (var i = 0; i < list.length; i++) fix(list[i]);
  }

  // ---------- לשוניות: חצים, Home ו-End ----------
  document.addEventListener('keydown', function (e) {
    var tab = e.target && e.target.closest && e.target.closest('[role=tab]');
    if (!tab) return;
    var list = tab.closest('[role=tablist]'); if (!list) return;
    var tabs = [].filter.call(list.querySelectorAll('[role=tab]'), function (x) { return !x.disabled && !x.hidden; });
    var i = tabs.indexOf(tab), n = -1, rtl = getComputedStyle(list).direction === 'rtl';
    if (e.key === 'ArrowLeft') n = rtl ? i + 1 : i - 1;
    else if (e.key === 'ArrowRight') n = rtl ? i - 1 : i + 1;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    else return;
    e.preventDefault();
    n = (n + tabs.length) % tabs.length;
    tabs[n].focus(); tabs[n].click();
  });
  function roving() {
    var lists = document.querySelectorAll('[role=tablist]');
    for (var i = 0; i < lists.length; i++) {
      var tabs = lists[i].querySelectorAll('[role=tab]'), any = false;
      for (var j = 0; j < tabs.length; j++) if (tabs[j].getAttribute('aria-selected') === 'true') any = true;
      for (j = 0; j < tabs.length; j++) tabs[j].tabIndex = (tabs[j].getAttribute('aria-selected') === 'true' || (!any && j === 0)) ? 0 : -1;
    }
  }

  function start() {
    sizeControl();
    apply(root.getAttribute('data-hk-size'));
    scan(document.body); roving();
    var pend = false;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) scan(m.addedNodes[j].nodeType === 3 ? m.target : m.addedNodes[j]);
      }
      if (!pend) { pend = true; requestAnimationFrame(function () { pend = false; roving(); }); }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
