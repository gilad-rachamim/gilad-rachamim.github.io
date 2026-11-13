// תרגום דפים של "הכלים של גילעד רחמים": מנוע התרגום שמובנה בכרום (Translator API) – עובד בתוך המחשב,
// בלי שרת ובלי לשלוח את הדף לשום מקום.
// למה זה חלק יותר מגוגל טרנסלייט: לא נוגעים בטקסט המקורי של הדף. גוגל טרנסלייט מחליף את הטקסט עצמו,
// ואתרים שבנויים ב-React "מאבדים" את הטקסט שלהם ונשברים. כאן כל תרגום נוסף כאלמנט חדש (hk-tr) ליד הקטע,
// עם כיוון משלו (ימין/שמאל), והמקור נשאר שלם. מתרגמים רק מה שעל המסך (IntersectionObserver), ושומרים במטמון.
// נטען לדף רק אחרי לחיצה של המשתמש (activeTab), מתוך background.js.
(function () {
  if (window.__hkTr) return;

  var NAMES = { he: 'עברית', en: 'אנגלית', ar: 'ערבית', ru: 'רוסית', fr: 'צרפתית', es: 'ספרדית', de: 'גרמנית', it: 'איטלקית', pt: 'פורטוגזית', uk: 'אוקראינית', am: 'אמהרית', tr: 'טורקית', pl: 'פולנית', nl: 'הולנדית', zh: 'סינית', ja: 'יפנית', ko: 'קוריאנית', hi: 'הינדית', fa: 'פרסית', ro: 'רומנית', hu: 'הונגרית', cs: 'צ׳כית', el: 'יוונית', sv: 'שוודית', th: 'תאית', vi: 'וייטנאמית', id: 'אינדונזית' };
  var TARGETS = ['he', 'en', 'ar', 'ru', 'fr', 'es', 'de', 'am', 'uk'];
  var RTL = { he: 1, ar: 1, fa: 1, ur: 1, yi: 1 };
  var HEB = /[֐-׿]/, HEB_G = /[֐-׿]/g, LET_G = /\p{L}/gu, TWO = /\p{L}{2}/u;
  // לא מתרגמים: קוד, שדות כתיבה, מה שהאתר סימן "לא לתרגם", והחלקים שלנו
  var SKIP = 'script,style,noscript,template,code,pre,kbd,samp,textarea,input,select,option,svg,math,canvas,video,audio,iframe,object,[contenteditable=""],[contenteditable="true"],[translate="no"],.notranslate,hk-tr,hk-tr-ui';
  var HARD = 'script,style,noscript,template,svg,math,textarea,select,input,hk-tr';
  // כפתורים, קישורים בתפריט ותוויות: במצב דו-לשוני לא מכפילים אותם (שלא יישבר העיצוב), במצב "רק תרגום" כן
  var UI = 'a,button,label,summary,option,nav,header,[role="button"],[role="tab"],[role="menuitem"],[role="option"],[role="navigation"],[role="menubar"],[role="tablist"],[role="banner"]';

  var S = { on: false, mode: 'bi', src: '', tgt: 'he', tr: null, pairs: {}, byBlock: new Map(), queue: [], busy: 0, done: 0, cache: {}, ckey: '', gloss: [], ghash: '', err: '' };
  var disp = new WeakMap();
  function display(el) { var d = disp.get(el); if (d === undefined) { d = getComputedStyle(el).display; disp.set(el, d); } return d; }
  // inline-block וכו' נחשבים חלק מהשורה (כדי לא לחתוך משפט באמצע). בתוך flex/grid כרום ממילא מדווח עליהם block.
  function isInline(el) { var d = display(el); return d === 'inline' || d === 'contents' || d.indexOf('inline-') === 0; }
  function clean(t) { return t.replace(/\s+/g, ' ').trim(); }
  function base(l) { l = String(l || '').toLowerCase(); if (l === 'iw') return 'he'; return /^zh-(hant|tw|hk)/.test(l) ? 'zh-Hant' : l.split('-')[0]; }
  function name(l) { return NAMES[base(l)] || l; }

  // ---------- מה נחשב "קטע" ----------
  function blockOf(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    while (el && el !== document.body && el !== document.documentElement && isInline(el)) el = el.parentElement;
    return el;
  }
  function textOf(n) {
    if (n.nodeType === 3) return n.nodeValue;
    if (n.nodeType !== 1 || n.matches(HARD)) return '';
    if (n.localName === 'br') return ' ';
    var s = '';
    for (var c = n.firstChild; c; c = c.nextSibling) s += textOf(c);
    return s;
  }
  function inTarget(t) {
    var letters = (t.match(LET_G) || []).length;
    if (S.tgt === 'he') return (t.match(HEB_G) || []).length > letters * 0.5;
    if (S.src === 'he') return !HEB.test(t);
    return false;
  }
  function worth(t) {
    if (t.length < 2 || !TWO.test(t)) return false;
    if (!/\s/.test(t) && /[./@:_#=]/.test(t)) return false;       // כתובת, מייל, קוד
    return !inTarget(t);
  }
  // קטע = רצף של טקסט ותגיות "בתוך שורה" (קישור, הדגשה) בתוך בלוק. בלוק עם כמה רצפים נותן כמה קטעים.
  function runsOf(block) {
    var runs = [], cur = null, boundary = false;
    for (var n = block.firstChild; n; n = n.nextSibling) {
      var inl;
      if (n.nodeType === 3) inl = true;
      else if (n.nodeType === 1) { if (n.localName === 'hk-tr') continue; inl = n.localName === 'br' || isInline(n); }
      else continue;
      if (!inl) {
        cur = null;
        // ילד בלי טקסט (אייקון, קישור עוגן) לא הופך את הקטע ל"מורכב"
        if (n.nodeType === 1 && display(n) !== 'none' && TWO.test(textOf(n))) boundary = true;
        continue;
      }
      if (!cur) { cur = { nodes: [] }; runs.push(cur); }
      cur.nodes.push(n);
    }
    var out = [];
    runs.forEach(function (r) {
      r.text = clean(r.nodes.map(textOf).join(''));
      if (worth(r.text)) out.push(r);
    });
    out.leaf = !boundary && runs.length === 1;
    return out;
  }
  function addBlock(b) {
    if (!b || !b.isConnected) return;
    var old = S.byBlock.get(b);
    if (b.closest(SKIP)) { if (old) drop(b); return; }
    var runs = runsOf(b), sig = runs.map(function (r) { return r.text; }).join('\u0001');
    if (old && old.sig === sig) { old.units.forEach(place); return; }     // אותו טקסט: רק לוודא שהתרגום במקום
    if (old) drop(b);
    if (!runs.length) return;
    var ui = !!b.closest(UI) || /nowrap/.test(getComputedStyle(b).whiteSpace);
    var rec = { sig: sig, units: runs.map(function (r) {
      // קטע שכולו קישור או כפתור אחד (תפריט, פירורי לחם) נחשב גם הוא "כפתור"
      var solid = r.nodes.filter(function (n) { return n.nodeType === 1 || n.nodeValue.trim(); });
      var solo = solid.length === 1 && solid[0].nodeType === 1 && solid[0].matches('a,button,[role="button"],[role="link"],[role="menuitem"],[role="tab"]');
      return { block: b, nodes: r.nodes, text: r.text, tr: null, out: null, q: 0, leaf: runs.leaf, ui: (ui || solo) && r.text.split(' ').length < 5 };
    }) };
    S.byBlock.set(b, rec);
    io.observe(b);
  }
  function drop(b) {
    var rec = S.byBlock.get(b); if (!rec) return;
    rec.units.forEach(function (u) { u.dead = 1; if (u.tr) u.tr.remove(); });
    b.removeAttribute('data-hk-hide');
    S.byBlock.delete(b);
  }
  function scan(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === 3) { addBlock(blockOf(root)); return; }
    if (root.nodeType !== 1 || root.closest(SKIP)) return;
    var blocks = new Set(), w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (t) { return TWO.test(t.nodeValue) ? 1 : 3; } }), t;
    while ((t = w.nextNode())) {
      var p = t.parentElement;
      if (!p || p.closest(SKIP)) continue;
      blocks.add(blockOf(t));
    }
    blocks.forEach(addBlock);
  }

  // ---------- הצגה ----------
  function place(u) {
    if (u.dead || u.out == null) return;
    var anchor = null;
    for (var i = u.nodes.length - 1; i >= 0; i--) if (u.nodes[i].parentNode === u.block) { anchor = u.nodes[i]; break; }
    if (!anchor) return;
    if (!u.tr) {
      u.tr = document.createElement('hk-tr');
      u.tr.setAttribute('translate', 'no');
      u.tr.__hk = u;
    }
    u.tr.setAttribute('dir', RTL[base(S.tgt)] ? 'rtl' : 'ltr');
    u.tr.setAttribute('lang', S.tgt);
    if (u.tr.textContent !== u.out) u.tr.textContent = u.out;
    if (u.tr.previousSibling !== anchor || u.tr.parentNode !== u.block) u.block.insertBefore(u.tr, anchor.nextSibling);
    look(u);
  }
  function look(u) {
    if (!u.tr) return;
    var only = S.mode === 'only' && u.leaf, b = u.block;
    if (only) {
      if (!b.hasAttribute('data-hk-hide')) {
        var cs = getComputedStyle(b);
        b.style.setProperty('--hk-fs', cs.fontSize);
        b.style.setProperty('--hk-lh', cs.lineHeight);
        // רווחים שמוגדרים לפי גודל הכתב (em) היו נעלמים כשהמקור מוסתר: שומרים אותם בפיקסלים
        b.style.setProperty('--hk-mb', cs.marginTop + ' ' + cs.marginBottom);
        b.style.setProperty('--hk-p', cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft);
        b.setAttribute('data-hk-hide', '');
      }
      var wide = !u.ui && /^(block|list-item|flow-root|table-cell)$/.test(display(b));
      u.tr.className = wide ? 'hk-only' : 'hk-only hk-inl';
    } else {
      b.removeAttribute('data-hk-hide');
      // כפתורים וקישורי תפריט שתורגמו במצב "רק תרגום" לא מוכפלים כשחוזרים לשתי השפות
      u.tr.className = u.ui ? 'hk-bi hk-off' : 'hk-bi';
    }
  }
  function restyleAll() {
    S.byBlock.forEach(function (rec, b) {
      if (!b.isConnected) { drop(b); return; }
      rec.units.forEach(function (u) { if (u.out != null) look(u); });
      io.unobserve(b); io.observe(b);       // מצב "רק תרגום": לתרגם גם כפתורים שעל המסך
    });
  }

  // ---------- מילון אישי ----------
  // כל שורה: מונח במקור = איך לתרגם אותו. לפני התרגום המונח מוחלף בסימן [מספר], ואחריו הסימן מוחלף במילה שבחרתם.
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function glossFor(text, src) {
    var hits = [];
    S.gloss.forEach(function (g) {
      var from = g.a, to = g.b;
      if (HEB.test(g.a) && !HEB.test(g.b)) { from = g.b; to = g.a; }           // שורה שנכתבה הפוך
      if ((src || S.src) === 'he' && !HEB.test(from)) { var x = from; from = to; to = x; }   // דף עברי: מעברית ללועזית
      if (!from || !to) return;
      var re = new RegExp('(^|[^\\p{L}])(' + esc(from) + ')(?![\\p{L}])', 'giu');
      if (re.test(text)) hits.push({ re: re, to: to });
    });
    return hits;
  }
  function pre(text, hits) {
    hits.forEach(function (h, i) { h.tok = '[' + (71 + i) + ']'; text = text.replace(h.re, function (m, p) { return p + h.tok; }); });
    return text;
  }
  function post(out, hits) {
    hits.forEach(function (h) {
      var re = new RegExp('([הובכלמש]{0,3})-?' + esc(h.tok), 'g');
      out = out.replace(re, function (m, pfx) {
        if (HEB.test(h.to) && pfx) { if (/ה$/.test(pfx) && /^ה/.test(h.to)) pfx = pfx.slice(0, -1); return pfx + h.to; }
        return pfx + h.to;
      });
    });
    return out;
  }

  // המנוע מוסיף לפעמים ניקוד למילה בודדת ("לְחַפֵּשׂ"). בעברית רגילה בלי ניקוד.
  function tidy(out) { return HEB.test(out) ? out.replace(/[֑-ׇֽֿׁׂׅׄ]/g, '') : out; }

  // ---------- תרגום ----------
  function translator(src, tgt, onProg) {
    var k = src + '>' + tgt;
    if (S.pairs[k]) return S.pairs[k];
    if (!('Translator' in self)) return Promise.reject(new Error('noapi'));
    var p = Translator.availability({ sourceLanguage: src, targetLanguage: tgt }).then(function (a) {
      if (a === 'unavailable') throw new Error('unavailable');
      return Translator.create({ sourceLanguage: src, targetLanguage: tgt, monitor: function (m) { m.addEventListener('downloadprogress', function (e) { if (onProg) onProg(e.loaded); }); } });
    });
    S.pairs[k] = p;
    p.catch(function () { delete S.pairs[k]; });
    return p;
  }
  function translate(text) {
    var hit = S.cache[text];
    if (hit != null) return Promise.resolve(hit);
    var hits = glossFor(text, S.src);
    return S.tr.translate(pre(text, hits)).then(function (out) {
      out = tidy(post(out, hits));
      S.cache[text] = out; saveCache();
      return out;
    });
  }
  function enqueue(u) {
    if (u.q || u.out != null || u.dead) return;
    if (S.mode === 'bi' && u.ui) return;
    u.q = 1; S.queue.push(u); pump();
  }
  function pump() {
    while (S.on && S.tr && S.busy < 2 && S.queue.length) run(S.queue.shift());
    bar();
  }
  function run(u) {
    if (u.dead || !u.block.isConnected) return;
    S.busy++;
    translate(u.text).then(function (out) { u.out = out; place(u); S.done++; }, function () { u.q = 0; })
      .then(function () { S.busy--; pump(); });
  }
  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (e) {
      if (!e.isIntersecting) return;
      var rec = S.byBlock.get(e.target);
      // טקסט נסתר (רק לקוראי מסך) לא צריך תרגום על המסך
      if (rec && (e.boundingClientRect.width < 3 || e.boundingClientRect.height < 3)) { io.unobserve(e.target); return; }
      if (rec) rec.units.forEach(enqueue);
      io.unobserve(e.target);
    });
  }, { rootMargin: '700px 0px' });

  // ---------- מטמון (נשמר במחשב, כדי שדף שחוזרים אליו יתורגם מיד) ----------
  var saveT = 0;
  function saveCache() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      var keys = Object.keys(S.cache);
      if (keys.length > 4000) keys.slice(0, keys.length - 3000).forEach(function (k) { delete S.cache[k]; });
      var o = {}; o[S.ckey] = S.cache;
      try { chrome.storage.local.set(o); } catch (e) {}
    }, 1500);
  }
  function loadCache() {
    S.ckey = 'trc:' + S.src + '>' + S.tgt + ':' + S.ghash;
    return chrome.storage.local.get(S.ckey).then(function (o) { S.cache = o[S.ckey] || {}; }, function () { S.cache = {}; });
  }
  function loadPrefs() {
    return Promise.all([
      chrome.storage.local.get('trPrefs').catch(function () { return {}; }),
      chrome.storage.sync.get('glossary').catch(function () { return {}; })
    ]).then(function (r) {
      var p = r[0].trPrefs || {};
      S.mode = p.mode === 'only' ? 'only' : 'bi';
      S.tgt = p.tgt || 'he';
      S.gloss = Array.isArray(r[1].glossary) ? r[1].glossary.filter(function (g) { return g && g.a && g.b; }) : [];
      S.ghash = String(S.gloss.map(function (g) { return g.a + '=' + g.b; }).join('|').split('').reduce(function (h, c) { return (h * 31 + c.charCodeAt(0)) | 0; }, 7));
    });
  }
  function savePrefs() { try { chrome.storage.local.set({ trPrefs: { mode: S.mode, tgt: S.tgt } }); } catch (e) {} }

  // ---------- זיהוי שפת הדף ----------
  function detect(sample) {
    var lang = base(document.documentElement.lang);
    var heb = (sample.match(HEB_G) || []).length, all = (sample.match(LET_G) || []).length || 1;
    if (heb / all > 0.4) return Promise.resolve('he');
    if (!('LanguageDetector' in self)) return Promise.resolve(lang && lang !== 'he' ? lang : 'en');
    return LanguageDetector.availability().then(function (a) {
      if (a !== 'available') return lang && lang !== 'he' ? lang : 'en';
      return LanguageDetector.create().then(function (d) { return d.detect(sample); }).then(function (r) {
        var top = r && r[0];
        return top && top.detectedLanguage !== 'und' && top.confidence > 0.5 ? base(top.detectedLanguage) : (lang || 'en');
      });
    }).catch(function () { return lang || 'en'; });
  }
  function pageSample() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), t, s = '';
    while ((t = w.nextNode()) && s.length < 4000) { var p = t.parentElement; if (p && !p.closest(SKIP) && TWO.test(t.nodeValue)) s += t.nodeValue + ' '; }
    return clean(s);
  }

  // ---------- המעקב אחרי שינויים בדף (אתרי React, גלילה אינסופית) ----------
  var dirty = new Set(), flushT = 0;
  function ours(n) { return n && n.nodeType === 1 && (n.localName === 'hk-tr' || n.localName === 'hk-tr-ui'); }
  var mo = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'characterData') { dirty.add(m.target); return; }
      var add = [].slice.call(m.addedNodes), rem = [].slice.call(m.removedNodes);
      if (add.concat(rem).every(ours)) return;                 // רק התרגומים שלנו זזו
      if (m.target.closest && m.target.closest('hk-tr,hk-tr-ui')) return;
      dirty.add(m.target);
      add.forEach(function (n) { if (!ours(n)) dirty.add(n); });
    });
    if (dirty.size && !flushT) flushT = setTimeout(flush, 250);
  });
  function flush() {
    flushT = 0; disp = new WeakMap();
    var list = Array.from(dirty); dirty.clear();
    list.forEach(function (n) {
      if (!n.isConnected) return;
      try {
      if (n.nodeType === 1 && !isInline(n)) addBlock(n); else addBlock(blockOf(n));
      if (n.nodeType === 1) scan(n);
      } catch (e) { S.ferr = String(e && e.stack || e).slice(0, 300); }
    });
  }

  // ---------- פס הבקרה בפינה (Shadow DOM, שעיצוב האתר לא ישפיע עליו) ----------
  var host = null, R = null;
  var CSS = ':host{all:initial}*{box-sizing:border-box;font-family:"Segoe UI",Arial,sans-serif}' +
    '.bar{position:fixed;z-index:2147483646;bottom:14px;left:14px;direction:rtl;background:#141210;color:#f3ead7;border:2px solid #d9b25f;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.35);font-size:14px;line-height:1.4;max-width:min(430px,calc(100vw - 28px))}' +
    '.top{display:flex;align-items:center;gap:6px;padding:7px 9px;flex-wrap:wrap}.st{flex:1;min-width:120px}.st small{display:block;color:#bdb3a0;font-size:12px}' +
    'button,select{font:inherit;font-size:13px;background:transparent;color:#f3ead7;border:1px solid #4a3d24;border-radius:9px;padding:4px 8px;cursor:pointer}button:hover,select:hover{border-color:#d9b25f}' +
    'button.gold{background:#d9b25f;color:#141210;border-color:#d9b25f;font-weight:700}select{background:#201c17}' +
    'button:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #e9c977;outline-offset:1px}' +
    '.mini .top>:not(.ico){display:none}.ico{border:0;font-size:18px;padding:2px 4px}' +
    '.gl{border-top:1px solid #4a3d24;padding:8px 9px}.gl textarea{width:100%;min-height:96px;background:#0d0c0a;color:#f3ead7;border:1px solid #4a3d24;border-radius:8px;font:13px/1.5 Consolas,"Segoe UI",monospace;padding:6px;direction:ltr;text-align:left}' +
    '.gl p{margin:0 0 6px;font-size:12.5px;color:#bdb3a0}.row{display:flex;gap:6px;margin-top:6px}' +
    '.bub{position:fixed;z-index:2147483647;direction:rtl;background:#141210;color:#f3ead7;border:2px solid #d9b25f;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.35);padding:9px 11px;font-size:15px;line-height:1.55;max-width:min(440px,calc(100vw - 20px));max-height:50vh;overflow:auto}' +
    '.bub .t{white-space:pre-wrap;unicode-bidi:isolate;text-align:start}.bub .o{color:#bdb3a0;font-size:12.5px;margin-bottom:5px;unicode-bidi:isolate;text-align:start;white-space:pre-wrap}.bub .row{justify-content:flex-start}' +
    '.pin{position:fixed;z-index:2147483647;width:30px;height:30px;border-radius:50%;background:#d9b25f;color:#141210;border:0;font-size:16px;padding:0;box-shadow:0 3px 12px rgba(0,0,0,.3)}' +
    '.hid{display:none!important}';
  function ensureHost() {
    if (host && host.isConnected) return;
    host = document.createElement('hk-tr-ui');
    host.setAttribute('translate', 'no');
    R = host.attachShadow({ mode: 'open' });
    try { var sh = new CSSStyleSheet(); sh.replaceSync(CSS); R.adoptedStyleSheets = [sh]; }
    catch (e) { var st = document.createElement('style'); st.textContent = CSS; R.appendChild(st); }
    document.documentElement.appendChild(host);
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var B = null;
  function buildBar() {
    ensureHost();
    if (B && B.root.isConnected) return;
    B = {};
    B.root = el('div', 'bar'); B.root.setAttribute('role', 'region'); B.root.setAttribute('aria-label', 'תרגום הדף');
    var top = el('div', 'top');
    B.ico = el('button', 'ico', '🌐'); B.ico.title = 'להקטין / להגדיל'; B.ico.setAttribute('aria-label', 'להקטין או להגדיל את פס התרגום');
    B.st = el('div', 'st'); B.st.setAttribute('role', 'status'); B.st.setAttribute('aria-live', 'polite');
    B.sel = el('select'); B.sel.setAttribute('aria-label', 'לתרגם לשפה');
    B.mode = el('button');
    B.go = el('button', 'gold hid', '⬇ להוריד את מנוע התרגום (פעם אחת)');
    B.glb = el('button', '', '📖 מילון'); B.glb.setAttribute('aria-expanded', 'false');
    B.x = el('button', '', '✕'); B.x.title = 'לבטל את התרגום (Alt+Shift+T)'; B.x.setAttribute('aria-label', 'לבטל את התרגום ולהחזיר את הדף כמו שהיה');
    [B.ico, B.st, B.go, B.sel, B.mode, B.glb, B.x].forEach(function (x) { top.appendChild(x); });
    B.root.appendChild(top);
    // המילון
    B.gl = el('div', 'gl hid');
    B.gl.appendChild(el('p', '', 'מילון אישי: מונח בכל שורה, ככה: Torah = תורה. התרגום ישתמש תמיד במילה שבחרתם (גם הפוך, מעברית לאנגלית).'));
    B.ta = el('textarea'); B.ta.setAttribute('aria-label', 'המילון האישי'); B.ta.placeholder = 'Torah = תורה\nmohel = מוהל\nRebbe = הרבי';
    B.gl.appendChild(B.ta);
    var r = el('div', 'row'); B.save = el('button', 'gold', 'לשמור ולתרגם מחדש'); r.appendChild(B.save); B.gl.appendChild(r);
    B.root.appendChild(B.gl);
    R.appendChild(B.root);

    TARGETS.forEach(function (l) { var o = el('option', '', 'ל' + name(l)); o.value = l; B.sel.appendChild(o); });
    B.ico.onclick = function () { B.root.classList.toggle('mini'); B.gl.classList.add('hid'); };
    B.x.onclick = function () { off(); };
    B.mode.onclick = function () { S.mode = S.mode === 'bi' ? 'only' : 'bi'; savePrefs(); restyleAll(); bar(); };
    B.sel.onchange = function () { S.tgt = B.sel.value; savePrefs(); restart(); };
    B.go.onclick = function () { start(true); };
    B.glb.onclick = function () {
      var open = B.gl.classList.toggle('hid') === false;
      B.glb.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { B.ta.value = S.gloss.map(function (g) { return g.a + ' = ' + g.b; }).join('\n'); B.ta.focus(); }
    };
    B.save.onclick = function () {
      var list = B.ta.value.split('\n').map(function (l) { var m = l.split(/\s*[=:→←]\s*/); return m.length >= 2 && m[0].trim() && m[1].trim() ? { a: m[0].trim(), b: m.slice(1).join(' ').trim() } : null; }).filter(Boolean).slice(0, 300);
      chrome.storage.sync.set({ glossary: list }).catch(function () { return chrome.storage.local.set({ glossary: list }); }).then(function () { B.gl.classList.add('hid'); restart(); });
    };
  }
  function bar(msg) {
    if (!S.on) return;
    buildBar();
    var dir = name(S.src) + ' ← ' + name(S.tgt);
    var waiting = S.queue.length + S.busy;
    B.st.textContent = '';
    B.st.appendChild(document.createTextNode(msg || (S.err ? S.err : '🌐 ' + dir)));
    var sub = el('small', '', S.tr ? (waiting ? 'מתרגם… (' + S.done + ' קטעים)' : S.done ? 'תורגמו ' + S.done + ' קטעים. גוללים, וממשיך לבד' : 'מתרגם מה שעל המסך') : '');
    if (!msg && !S.err) B.st.appendChild(sub);
    B.sel.value = S.tgt;
    B.mode.textContent = S.mode === 'bi' ? '📄 רק תרגום' : '📑 שתי השפות';
    B.mode.title = S.mode === 'bi' ? 'להסתיר את המקור ולהציג רק את התרגום (מעבר עם העכבר מראה את המקור)' : 'להציג את המקור ואת התרגום זה מתחת לזה';
  }

  // ---------- המקור במעבר עכבר, במצב "רק תרגום" ----------
  var tip = null;
  function showTip(tr) {
    var u = tr.__hk; if (!u) return;
    ensureHost();
    if (!tip) { tip = el('div', 'bub'); tip.setAttribute('role', 'tooltip'); R.appendChild(tip); }
    tip.textContent = ''; var o = el('div', 't', u.text); o.setAttribute('dir', 'auto'); tip.appendChild(o);
    tip.classList.remove('hid');
    var rc = tr.getBoundingClientRect(), h = tip.offsetHeight;
    tip.style.top = Math.max(6, rc.top - h - 8 < 6 ? rc.bottom + 8 : rc.top - h - 8) + 'px';
    tip.style.left = Math.max(6, Math.min(innerWidth - tip.offsetWidth - 6, rc.left)) + 'px';
  }
  function hideTip() { if (tip) tip.classList.add('hid'); }
  document.addEventListener('mouseover', function (e) {
    var t = e.target && e.target.closest && e.target.closest('hk-tr');
    if (t && S.on && S.mode === 'only') showTip(t); else hideTip();
  }, true);

  // ---------- תרגום של טקסט מסומן ----------
  var pin = null, bub = null;
  function pairFor(text) {
    if (HEB.test(text) && (text.match(HEB_G) || []).length > (text.match(LET_G) || []).length * 0.4) return Promise.resolve(['he', S.tgt !== 'he' ? S.tgt : 'en']);
    return detect(text).then(function (src) { var t = S.tgt === src ? (src === 'he' ? 'en' : 'he') : (S.on ? S.tgt : 'he'); if (src === t) t = 'en'; return [src, t]; });
  }
  function selRect() {
    var s = getSelection(); if (!s || !s.rangeCount) return null;
    var r = s.getRangeAt(0).getBoundingClientRect();
    return r && (r.width || r.height) ? r : null;
  }
  function showBubble(text, rect) {
    text = String(text || '').trim().slice(0, 3000);
    if (!text) return Promise.resolve(false);
    ensureHost(); hidePin();
    if (!bub) { bub = el('div', 'bub'); bub.setAttribute('role', 'dialog'); bub.setAttribute('aria-label', 'תרגום הטקסט המסומן'); R.appendChild(bub); }
    bub.textContent = ''; bub.classList.remove('hid');
    var o = el('div', 'o', text.length > 200 ? text.slice(0, 200) + '…' : text); o.setAttribute('dir', 'auto');
    var t = el('div', 't', 'מתרגם…');
    var row = el('div', 'row'), cp = el('button', '', '📋 להעתיק'), sp = el('button', '', '🔊 להקריא'), cl = el('button', '', '✕');
    cl.setAttribute('aria-label', 'לסגור');
    row.appendChild(cp); row.appendChild(sp); row.appendChild(cl);
    bub.appendChild(o); bub.appendChild(t); bub.appendChild(row);
    var at = rect || selRect();
    function pos() {
      var h = bub.offsetHeight, w = bub.offsetWidth;
      var top = at ? (at.bottom + 10 + h < innerHeight ? at.bottom + 10 : Math.max(6, at.top - h - 10)) : 20;
      var left = at ? Math.max(6, Math.min(innerWidth - w - 6, at.left)) : Math.max(6, (innerWidth - w) / 2);
      bub.style.top = top + 'px'; bub.style.left = left + 'px';
    }
    pos();
    cl.onclick = hideBubble;
    var tgt = 'he';
    return pairFor(text).then(function (p) {
      tgt = p[1];
      var src0 = p[0];
      return translator(p[0], p[1], function (x) { t.textContent = 'מוריד את מנוע התרגום, פעם אחת: ' + Math.round(x * 100) + '%'; }).then(function (tr) {
        var hits = glossFor(text, src0);
        return tr.translate(pre(text, hits)).then(function (out) { return tidy(post(out, hits)); });
      });
    }).then(function (out) {
      t.textContent = out; t.setAttribute('dir', RTL[tgt] ? 'rtl' : 'ltr'); t.setAttribute('lang', tgt);
      cp.onclick = function () { navigator.clipboard.writeText(out).then(function () { cp.textContent = '✓ הועתק'; }, function () {}); };
      sp.onclick = function () { try { speechSynthesis.cancel(); var ut = new SpeechSynthesisUtterance(out); ut.lang = tgt === 'he' ? 'he-IL' : tgt; speechSynthesis.speak(ut); } catch (e) {} };
      pos(); return true;
    }, function (e) {
      t.textContent = errText(e);
      // בפעם הראשונה כרום מבקש לחיצה כדי להוריד את מנוע השפה: לחיצה על הכפתור הזה מספיקה
      if (/NotAllowed/i.test(String(e && (e.name + e.message)))) {
        var dl = el('button', '', '⬇ להוריד את מנוע התרגום (פעם אחת)');
        dl.onclick = function () { showBubble(text, at); };
        row.insertBefore(dl, row.firstChild);
      }
      pos(); return false;
    });
  }
  function hideBubble() { if (bub) bub.classList.add('hid'); }
  function hidePin() { if (pin) pin.classList.add('hid'); }
  // כשהתרגום פועל בדף: מסמנים טקסט ← מופיע עיגול 🌐 קטן ליד הסימון, ולחיצה עליו מתרגמת
  document.addEventListener('mouseup', function (e) {
    if (!S.on || (e.composedPath && e.composedPath().indexOf(host) >= 0)) return;
    setTimeout(function () {
      var s = getSelection(), text = s ? String(s).trim() : '';
      var ed = document.activeElement && (document.activeElement.isContentEditable || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName));
      if (!text || text.length > 3000 || !TWO.test(text) || ed) { hidePin(); return; }
      var r = selRect(); if (!r) return;
      ensureHost();
      if (!pin) {
        pin = el('button', 'pin', '🌐'); pin.title = 'לתרגם את המסומן'; pin.setAttribute('aria-label', 'לתרגם את הטקסט המסומן');
        pin.onmousedown = function (ev) { ev.preventDefault(); };
        pin.onclick = function () { showBubble(pin.__t, pin.__r); };
        R.appendChild(pin);
      }
      pin.__t = text; pin.__r = r;
      pin.style.top = Math.min(innerHeight - 36, r.bottom + 6) + 'px';
      pin.style.left = Math.max(6, Math.min(innerWidth - 36, r.right - 15)) + 'px';
      pin.classList.remove('hid');
    }, 10);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hideBubble(); hidePin(); hideTip(); } }, true);
  // בגלילה העיגול זז עם הסימון (ולא נעלם), וחלונית המקור נסגרת
  var rafP = 0;
  document.addEventListener('scroll', function () {
    hideTip();
    if (!pin || pin.classList.contains('hid') || rafP) return;
    rafP = requestAnimationFrame(function () {
      rafP = 0;
      var r = selRect();
      if (!r || r.bottom < 0 || r.top > innerHeight) { hidePin(); return; }
      pin.__r = r;
      pin.style.top = Math.min(innerHeight - 36, r.bottom + 6) + 'px';
      pin.style.left = Math.max(6, Math.min(innerWidth - 36, r.right - 15)) + 'px';
    });
  }, { passive: true, capture: true });

  // ---------- הפעלה וכיבוי ----------
  function errText(e) {
    var m = String(e && (e.message || e.name) || e);
    if (/noapi/.test(m)) return 'התרגום צריך כרום בגרסה 138 ומעלה. מעדכנים: תפריט ⋮ ← עזרה ← מידע על Google Chrome.';
    if (/unavailable|NotSupported/i.test(m)) return 'כרום עוד לא יודע לתרגם בין השפות האלה. אפשר לבחור שפה אחרת.';
    if (/NotAllowed|activation|gesture/i.test(m)) return 'צריך ללחוץ פעם אחת כדי להוריד את מנוע התרגום.';
    if (/quota|space|disk/i.test(m)) return 'אין מספיק מקום פנוי במחשב בשביל מנוע התרגום.';
    return 'התרגום לא הצליח בדף הזה (' + m.slice(0, 60) + ').';
  }
  var startId = 0;
  function start(byClick) {
    var my = ++startId;
    S.err = ''; bar('🌐 מכין את התרגום…');
    B.go.classList.add('hid');
    return translator(S.src, S.tgt, function (x) { bar('⬇ מוריד את מנוע התרגום, פעם אחת: ' + Math.round(x * 100) + '%'); })
      .then(function (tr) {
        if (my !== startId || !S.on) return;
        S.tr = tr;
        return loadCache().then(function () {
          disp = new WeakMap();
          scan(document.body);
          mo.observe(document.body, { childList: true, subtree: true, characterData: true });
          bar(); pump();
        });
      }, function (e) {
        if (my !== startId) return;
        var m = String(e && (e.name + e.message));
        if (/NotAllowed/i.test(m) && !byClick) { S.err = ''; bar('כדי לתרגם, מורידים פעם אחת את מנוע התרגום של כרום (במחשב, בלי שרת).'); B.go.classList.remove('hid'); return; }
        S.err = errText(e); bar();
      });
  }
  function on() {
    if (S.on) return Promise.resolve('on');
    S.on = true; S.done = 0; S.queue = []; S.tr = null;
    return loadPrefs().then(function () { return detect(pageSample()); }).then(function (src) {
      S.src = src;
      if (S.tgt === S.src) S.tgt = S.src === 'he' ? 'en' : 'he';
      buildBar(); B.root.classList.remove('mini');
      start(false);
      return 'on';
    });
  }
  function clearPage() {
    mo.disconnect(); clearTimeout(flushT); flushT = 0; dirty.clear();
    S.byBlock.forEach(function (rec, b) { drop(b); io.unobserve(b); });
    S.byBlock.clear(); S.queue = []; S.done = 0; S.tr = null;
  }
  function off() {
    S.on = false; startId++;
    clearPage(); hideBubble(); hidePin(); hideTip();
    if (B && B.root) B.root.remove(); B = null;
    return 'off';
  }
  function restart() {
    clearPage();
    loadPrefs().then(function () {
      if (S.tgt === S.src) { S.err = 'הדף כבר ב' + name(S.src) + '. בוחרים שפה אחרת.'; bar(); return; }
      start(false);
    });
  }

  window.__hkTr = {
    cmd: function (c, arg) {
      if (c === 'toggle') return S.on ? off() : on();
      if (c === 'sel') {
        var txt = arg || String(getSelection() || '');
        return (S.on ? Promise.resolve() : loadPrefs()).then(function () { return showBubble(txt); }).then(function (ok) { return ok ? 'sel' : 'sel-fail'; });
      }
      if (c === 'scan') { disp = new WeakMap(); scan(document.body); return S.byBlock.size; }
      if (c === 'dbg') return { on: S.on, busy: S.busy, q: S.queue.length, blocks: S.byBlock.size, done: S.done, ferr: S.ferr, dirty: dirty.size, flushT: !!flushT, tr: !!S.tr, src: S.src, tgt: S.tgt };
      return 'unknown';
    }
  };
})();
