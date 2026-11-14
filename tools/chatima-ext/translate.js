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
  // .html5-video-player = נגן יוטיוב: את הכתוביות שלו מתרגמים בנפרד (למטה, "כתוביות ביוטיוב")
  var SKIP = 'script,style,noscript,template,code,pre,kbd,samp,textarea,input,select,option,svg,math,canvas,video,audio,iframe,object,[contenteditable=""],[contenteditable="true"],[translate="no"],.notranslate,.html5-video-player,hk-tr,hk-tr-ui,hk-tr-cap';
  var HARD = 'script,style,noscript,template,svg,math,textarea,select,input,hk-tr';
  // קישורים והדגשות בתוך משפט: נשמרים גם בתרגום (הקישור נשאר לחיץ)
  var RICH = 'a[href],b,strong,em,i,u,mark';
  // שמות של מוצרים ומונחי תכנות נשארים כמו שהם (אחרת React יוצא "להגיב" ו-Intersection Observer "צופה צומת").
  // המילון האישי גובר על הרשימה הזאת.
  // רק שמות שהמנוע הופך למילה רגילה (React "להגיב", Rust "חלודה", Flask "בקבוק"). שמות כמו Microsoft או Google
  // נשארים לתרגום, כי בעברית כותבים אותם "מיקרוסופט", "גוגל".
  var BRANDS = ['React Native', 'React', 'Next.js', 'Node.js', 'Nuxt', 'Vue', 'Vue.js', 'Angular', 'Svelte', 'SvelteKit', 'Gatsby', 'Vite', 'Webpack', 'Babel', 'ESLint', 'Prettier', 'Tailwind', 'Tailwind CSS', 'Bootstrap', 'jQuery', 'Redux', 'Zustand', 'Flutter', 'Electron', 'Deno', 'Rust', 'Kotlin', 'Ruby on Rails', 'Django', 'Flask', 'FastAPI', 'Laravel', 'Spring Boot', 'Docker', 'Kubernetes', 'Git', 'npm', 'pnpm', 'Yarn', 'Server Components', 'Server Actions', 'MDN', 'Stack Overflow', 'Visual Studio Code', 'VS Code', 'Figma', 'Vercel', 'Netlify', 'Firebase', 'Supabase', 'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'GraphQL', 'JSX', 'TSX', 'DOM', 'WebAssembly', 'WebGL', 'WebGPU', 'WebSocket', 'WebSockets', 'Intersection Observer', 'Intersection Observer API', 'Mutation Observer', 'Resize Observer', 'Service Worker', 'Service Workers', 'Web Workers', 'Web Worker', 'Web Components', 'Hook', 'Hooks', 'Shadow DOM', 'Fetch API', 'Web API', 'Web APIs', 'Raspberry Pi', 'Microsoft Teams'];
  // מילים בצורה של קוד שהן בעצם שמות מוכרים, ונכתבים בעברית ("וואטסאפ", "יוטיוב"): מתרגמים כרגיל
  var POPULAR = { YouTube: 1, WhatsApp: 1, iPhone: 1, iPad: 1, iPod: 1, TikTok: 1, LinkedIn: 1, PlayStation: 1, McDonald: 1, McDonalds: 1, OpenAI: 1, ChatGPT: 1, PayPal: 1, FedEx: 1, eBay: 1, iOS: 1, macOS: 1, SpaceX: 1, BlackRock: 1, AstraZeneca: 1, GlaxoSmithKline: 1, PepsiCo: 1, HarperCollins: 1, JetBlue: 1, DreamWorks: 1, MasterCard: 1, MasterChef: 1, SoftBank: 1, DeepMind: 1, DeepSeek: 1, MediaTek: 1, MacBook: 1, AirPods: 1, iCloud: 1, iTunes: 1, FaceTime: 1, YouGov: 1, McKinsey: 1, GoFundMe: 1 };
  var BRAND_RE = new RegExp('(^|[^\\p{L}\\p{N}_.@/-])(' + BRANDS.slice().sort(function (a, b) { return b.length - a.length; }).map(esc).join('|') + ')(?![\\p{L}\\p{N}_])', 'gu');
  // מילים שנראות כמו קוד: useState, getElementById, IntersectionObserver, fetch(), index.js
  var CODE_RE = /(^|[^\p{L}\p{N}_.])([a-z]+[A-Z][\p{L}\p{N}_]*|[A-Z][a-z]+[A-Z][\p{L}\p{N}_]*|[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\(\)|[\w-]+\.(?:js|jsx|ts|tsx|mjs|json|py|css|html|md|php|rb|go|rs|sh|yml|yaml|xml|toml))(?![\p{L}\p{N}_])/gu;
  // כפתורים, קישורים בתפריט ותוויות: במצב דו-לשוני לא מכפילים אותם (שלא יישבר העיצוב), במצב "רק תרגום" כן
  var UI = 'a,button,label,summary,option,nav,header,[role="button"],[role="tab"],[role="menuitem"],[role="option"],[role="navigation"],[role="menubar"],[role="tablist"],[role="banner"]';

  var YT = /(^|\.)youtube\.com$/.test(location.hostname);
  var S = { on: false, mode: 'bi', src: '', tgt: 'he', tr: null, pairs: {}, byBlock: new Map(), queue: [], busy: 0, done: 0, cache: {}, ckey: '', gloss: [], ghash: '', err: '' };
  var disp = new WeakMap();
  // getComputedStyle של החלון שהאלמנט שייך אליו (גם בתוך iframe מאותו אתר)
  function gcs(el) { return (el.ownerDocument && el.ownerDocument.defaultView || window).getComputedStyle(el); }
  function display(el) { var d = disp.get(el); if (d === undefined) { d = gcs(el).display; disp.set(el, d); } return d; }
  // inline-block וכו' נחשבים חלק מהשורה (כדי לא לחתוך משפט באמצע). בתוך flex/grid כרום ממילא מדווח עליהם block.
  function isInline(el) { var d = display(el); return d === 'inline' || d === 'contents' || d.indexOf('inline-') === 0; }
  function clean(t) { return t.replace(/\s+/g, ' ').trim(); }
  function base(l) { l = String(l || '').toLowerCase(); if (l === 'iw') return 'he'; return /^zh-(hant|tw|hk)/.test(l) ? 'zh-Hant' : l.split('-')[0]; }
  function name(l) { return NAMES[base(l)] || l; }

  // ---------- מה נחשב "קטע" ----------
  function blockOf(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    // עוצרים גם בראש של רכיב סגור (shadow root), שם אין "הורה"
    while (el && el.parentElement && el !== el.ownerDocument.body && isInline(el)) el = el.parentElement;
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
      if (worth(r.text)) { var m = markOf(r.nodes); r.rich = m.rich; r.marked = m.marked; out.push(r); }
    });
    out.leaf = !boundary && runs.length === 1;
    return out;
  }
  // הטקסט של הקטע עם סימנים סביב קישורים והדגשות: <x1>…</x1>. משמש רק כדי למצוא איפה הקישור נמצא בתרגום.
  function markOf(nodes) {
    var rich = [], s = '';
    function walk(n, depth) {
      if (n.nodeType === 3) { s += n.nodeValue; return; }
      if (n.nodeType !== 1 || n.matches(HARD)) return;
      if (n.localName === 'br') { s += ' '; return; }
      var k = 0;
      if (depth < 2 && rich.length < 8 && n.matches(RICH)) {
        var t = clean(textOf(n));
        if (TWO.test(t) && display(n) !== 'none') {
          var ln = n.localName;
          k = rich.push({ el: n, tag: ln === 'a' ? 'a' : ln === 'b' || ln === 'strong' ? 'b' : ln === 'u' || ln === 'mark' ? ln : 'i', text: t });
        }
      }
      if (k) s += '<x' + k + '>';
      for (var c = n.firstChild; c; c = c.nextSibling) walk(c, depth + (k ? 1 : 0));
      if (k) s += '</x' + k + '>';
    }
    nodes.forEach(function (n) { walk(n, 0); });
    return { rich: rich, marked: clean(s) };
  }
  function addBlock(b) {
    if (!b || !b.isConnected) return;
    var old = S.byBlock.get(b);
    if (b.closest(SKIP)) { if (old) drop(b); return; }
    var runs = runsOf(b), sig = runs.map(function (r) { return r.text; }).join('\u0001');
    if (old && old.sig === sig) { old.units.forEach(place); return; }     // אותו טקסט: רק לוודא שהתרגום במקום
    if (old) drop(b);
    if (!runs.length) return;
    var ui = !!b.closest(UI) || /nowrap/.test(gcs(b).whiteSpace);
    var rec = { sig: sig, units: runs.map(function (r) {
      // קטע שכולו קישור או כפתור אחד (תפריט, פירורי לחם) נחשב גם הוא "כפתור"
      var solid = r.nodes.filter(function (n) { return n.nodeType === 1 || n.nodeValue.trim(); });
      var solo = solid.length === 1 && solid[0].nodeType === 1 && solid[0].matches('a,button,[role="button"],[role="link"],[role="menuitem"],[role="tab"]');
      return { block: b, nodes: r.nodes, text: r.text, rich: r.rich, marked: r.marked, layout: null, tr: null, out: null, q: 0, leaf: runs.leaf, ui: (ui || solo) && r.text.split(' ').length < 5 };
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
    if (root.nodeType === 1 && root.closest(SKIP)) { if (root.localName === 'iframe') frame(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    var doc = root.ownerDocument || document;
    var blocks = new Set(), w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (t) { return TWO.test(t.nodeValue) ? 1 : 3; } }), t;
    while ((t = w.nextNode())) {
      var p = t.parentElement;
      if (!p || p.closest(SKIP)) continue;
      var b = blockOf(t);
      if (b) blocks.add(b);
    }
    blocks.forEach(addBlock);
    // רכיבים סגורים (shadow DOM פתוח) ומסגרות פנימיות מאותו אתר: גם הם חלק מהדף
    var all = root.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.localName === 'iframe') frame(e);
      else if (e.shadowRoot && e.localName !== 'hk-tr-ui' && !e.closest(SKIP)) addRoot(e.shadowRoot);
    }
  }

  // ---------- רכיבים סגורים ומסגרות פנימיות ----------
  // העיצוב של translate.css לא נכנס לתוך shadow root או iframe, אז מכניסים אותו בעצמנו (העתק של translate.css)
  var TRCSS = 'hk-tr{unicode-bidi:isolate!important;text-align:start!important;text-indent:0!important;text-transform:none!important;letter-spacing:normal!important;font-style:normal!important;white-space:normal!important}' +
    'hk-tr.hk-bi{display:block!important;margin:.3em 0 .15em!important;padding-inline-start:.55em!important;border-inline-start:3px solid rgba(201,162,75,.8)!important;opacity:.96}' +
    'hk-tr.hk-only,[data-hk-hide] hk-tr.hk-only{display:block!important;font-size:var(--hk-fs)!important;line-height:var(--hk-lh)!important}' +
    'hk-tr.hk-only.hk-inl,[data-hk-hide] hk-tr.hk-only.hk-inl{display:inline!important}' +
    '[data-hk-hide]{font-size:0!important;line-height:0!important;margin-block:var(--hk-mb)!important;padding:var(--hk-p)!important}' +
    '[data-hk-hide]>:not(hk-tr),[data-hk-hide]>:not(hk-tr) *{font-size:0!important}[data-hk-hide] svg,[data-hk-hide] img{font-size:var(--hk-fs)!important}' +
    'hk-tr.hk-off{display:none!important}hk-tr .hk-more{font-size:.85em;opacity:.85}';
  var roots = new Set(), gen = 1, MO = { childList: true, subtree: true, characterData: true };
  function addRoot(r) {
    if (!r || roots.has(r)) return;
    roots.add(r);
    try {
      if (r.nodeType === 11) {
        var sh = new CSSStyleSheet(); sh.replaceSync(TRCSS);
        r.adoptedStyleSheets = r.adoptedStyleSheets.concat([sh]);
      } else if (r !== document && !r.getElementById('hk-tr-css')) {
        var st = r.createElement('style'); st.id = 'hk-tr-css'; st.textContent = TRCSS; (r.head || r.documentElement).appendChild(st);
      }
    } catch (e) {}
    var top = r.nodeType === 9 ? r.body : r;
    if (!top) return;
    mo.observe(top, MO);
    scan(top);
  }
  function frame(f) {
    if (f.__hkF === gen) return;
    f.__hkF = gen;
    var my = gen;
    function go() {
      if (my !== gen || !S.on || !S.tr) return;
      try { var d = f.contentDocument; if (d && d.body && d.location.href !== 'about:blank') addRoot(d); } catch (e) {}   // מאתר אחר: כרום לא נותן להיכנס
    }
    f.addEventListener('load', go);
    go();
  }

  // ---------- הצגה ----------
  function place(u) {
    if (u.dead || u.out == null) return;
    var anchor = null;
    for (var i = u.nodes.length - 1; i >= 0; i--) if (u.nodes[i].parentNode === u.block) { anchor = u.nodes[i]; break; }
    if (!anchor) return;
    if (!u.tr) {
      u.tr = u.block.ownerDocument.createElement('hk-tr');
      u.tr.setAttribute('translate', 'no');
      u.tr.__hk = u;
    }
    u.tr.setAttribute('dir', RTL[base(S.tgt)] ? 'rtl' : 'ltr');
    u.tr.setAttribute('lang', S.tgt);
    fill(u);
    if (u.tr.previousSibling !== anchor || u.tr.parentNode !== u.block) u.block.insertBefore(u.tr, anchor.nextSibling);
    look(u);
  }
  // התרגום עם הקישורים וההדגשות במקומם. קישור בתרגום מפעיל את הקישור המקורי (כך גם אתרי React מנווטים כרגיל).
  function fill(u) {
    var key = u.out + '\u0001' + (u.layout ? JSON.stringify(u.layout.r) + JSON.stringify(u.layout.x) : '');
    if (u.tr.__key === key) return;
    u.tr.__key = key; u.tr.textContent = '';
    if (!u.layout) { u.tr.textContent = u.out; return; }
    var pos = 0, out = u.out;
    u.layout.r.forEach(function (x) {
      if (x[1] < pos) return;
      if (x[1] > pos) u.tr.appendChild(u.tr.ownerDocument.createTextNode(out.slice(pos, x[1])));
      u.tr.appendChild(richEl(u, x[0], out.slice(x[1], x[2])));
      pos = x[2];
    });
    if (pos < out.length) u.tr.appendChild(u.tr.ownerDocument.createTextNode(out.slice(pos)));
    // קישור שלא נמצא לו מקום בתוך המשפט המתורגם: מופיע בסוף, שלא ילך לאיבוד
    u.layout.x.forEach(function (x) {
      u.tr.appendChild(u.tr.ownerDocument.createTextNode(' '));
      var a = richEl(u, x[0], '↗ ' + x[1]); a.className = 'hk-more'; u.tr.appendChild(a);
    });
  }
  function richEl(u, k, text) {
    var r = u.rich[k - 1], d = u.tr.ownerDocument, e;
    if (r.tag === 'a') {
      e = d.createElement('a');
      e.href = r.el.href;
      if (r.el.target) e.target = r.el.target;
      e.rel = 'noopener';
      e.addEventListener('click', function (ev) {
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button) return;      // לשונית חדשה: כרגיל
        if (r.el.isConnected) { ev.preventDefault(); r.el.click(); }
      });
    } else e = d.createElement(r.tag);
    e.textContent = text;
    return e;
  }
  function look(u) {
    if (!u.tr) return;
    var only = S.mode === 'only' && u.leaf, b = u.block;
    if (only) {
      if (!b.hasAttribute('data-hk-hide')) {
        var cs = gcs(b);
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
  // לפני התרגום: מונחים מהמילון ושמות מוצרים מוחלפים בסימן [מספר] שהמנוע לא נוגע בו.
  // מחזיר את הטקסט עם הסימנים ואת הרשימה של מה להחזיר במקום כל סימן.
  function encode(text, src, keep) {
    var toks = [], n = 71;
    glossFor(text, src).forEach(function (h) {
      var tok = '[' + (n++) + ']';
      text = text.replace(h.re, function (m, p) { return p + tok; });
      toks.push({ tok: tok, to: h.to });
    });
    if (keep !== false) {
      [BRAND_RE, CODE_RE].forEach(function (re) {
        re.lastIndex = 0;
        text = text.replace(re, function (m, p, w) {
          if (toks.length >= 24 || POPULAR[w]) return m;
          var tok = '[' + (n++) + ']'; toks.push({ tok: tok, to: w }); return p + tok;
        });
      });
    }
    return { text: text, toks: toks };
  }
  // אחרי התרגום: הסימנים חוזרים למילים. בעברית אות היחס נצמדת עם מקף למילה לועזית: "ב-React".
  // סימן שהמנוע איבד ← null, ואז מתרגמים שוב בלי סימנים.
  function decode(out, toks) {
    for (var i = 0; i < toks.length; i++) {
      var h = toks[i], re = new RegExp('([הובכלמש]{0,3})-?\\[\\s*' + h.tok.slice(1, -1) + '\\s*\\]', 'g'), found = false;
      out = out.replace(re, function (m, pfx) {
        found = true;
        if (HEB.test(h.to)) { if (/ה$/.test(pfx) && /^ה/.test(h.to)) pfx = pfx.slice(0, -1); return pfx + h.to; }
        return pfx ? pfx + '-' + h.to : h.to;
      });
      if (!found) return null;
    }
    return out;
  }
  // לתרגם טקסט אחד, עם המילון ועם השמות שנשמרים
  function engine(tr, text, src) {
    var e = encode(text, src);
    if (!e.toks.length) return tr.translate(text).then(tidy);
    if (!TWO.test(e.text.replace(/\[\d+\]/g, ''))) return Promise.resolve(text);       // רק שמות: אין מה לתרגם
    return tr.translate(e.text).then(function (out) {
      var d = decode(out, e.toks);
      if (d != null) return tidy(d);
      var g = encode(text, src, false);                                                   // שוב, רק עם המילון
      return tr.translate(g.text).then(function (o2) { var d2 = decode(o2, g.toks); return tidy(d2 != null ? d2 : o2.replace(/\[\d+\]/g, '')); });
    });
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
    if (typeof hit === 'string') return Promise.resolve(hit);
    return engine(S.tr, text, S.src).then(function (out) {
      S.cache[text] = out; saveCache();
      return out;
    });
  }
  // איפה כל קישור או הדגשה נמצאים בתוך התרגום: מתרגמים פעם נוספת עם סימנים (<x1>…</x1>), ומחפשים את הקטע
  // שבין הסימנים בתוך התרגום הרגיל (הרגיל מדויק יותר, כי סימנים מבלבלים את המנוע). לא נמצא? מתרגמים את
  // הקישור לבד ומחפשים שוב. התוצאה נשמרת במטמון כמו התרגום.
  function stripEnds(c) {
    c = String(c || '').replace(/^[\s"'“”„«»\[]+|[\s"'“”„«».,:;!?\]]+$/g, '');
    // סוגריים מורידים רק כשהם לא סגורים בתוך הקטע (שלא ייחתך "fetch()")
    while (/^\(/.test(c) && c.indexOf(')') < 0) c = c.slice(1);
    while (/\)$/.test(c) && c.indexOf('(') < 0) c = c.slice(0, -1);
    return c.trim();
  }
  function findFree(lo, v, taken) {
    var from = 0, at;
    while ((at = lo.indexOf(v, from)) >= 0) {
      var e = at + v.length;
      if (!taken.some(function (t) { return at < t[1] && e > t[0]; })) return at;
      from = at + 1;
    }
    return -1;
  }
  function align(out, spans) {
    var lo = out.toLowerCase(), taken = [], res = [];
    spans.slice().sort(function (a, b) { return b.a - a.a; }).forEach(function (s) {
      for (var i = 0; i < s.c.length; i++) {
        var c = stripEnds(s.c[i]); if (c.length < 2) continue;
        var vars = [c]; if (/^ה[א-ת]{2}/.test(c)) vars.push(c.slice(1));
        for (var j = 0; j < vars.length; j++) {
          var at = findFree(lo, vars[j].toLowerCase(), taken);
          if (at >= 0) {
            var e = at + vars[j].length;
            while (e < out.length && /[א-ת]/.test(out[e]) && /[א-ת]/.test(out[e - 1])) e++;   // סוף המילה
            taken.push([at, e]); res.push([s.k, at, e]); return;
          }
        }
      }
    });
    return res.sort(function (a, b) { return a[1] - b[1]; });
  }
  function layoutFor(u, out) {
    var key = '\u0001' + u.marked, hit = S.cache[key];
    if (hit && hit.o === out) return Promise.resolve(hit);
    var p;
    if (u.rich.length === 1 && u.rich[0].text === u.text) p = Promise.resolve({ o: out, r: [[1, 0, out.length]], x: [] });   // כל הקטע הוא קישור אחד
    else p = engine(S.tr, u.marked, S.src).then(function (m) {
      var spans = u.rich.map(function (r, i) {
        var k = i + 1, mm = new RegExp('<x' + k + '>([\\s\\S]*?)</x' + k + '>').exec(m);
        return { k: k, a: r.tag === 'a' ? 1 : 0, c: [mm ? clean(mm[1].replace(/<\/?x\d+>/g, '')) : '', r.text] };
      });
      var res = align(out, spans);
      var miss = spans.filter(function (s) { return !res.some(function (x) { return x[0] === s.k; }); });
      if (!miss.length) return { o: out, r: res, x: [] };
      return Promise.all(miss.map(function (s) {
        return translate(u.rich[s.k - 1].text).then(function (t) { s.c.push(t); s.alone = t; }, function () {});
      })).then(function () {
        // עדיין לא נמצא: מילה לועזית מתוך הקישור שנשארה כמו שהיא בתרגום (useEffect, React) מקבלת את הקישור
      miss.forEach(function (s) {
        (u.rich[s.k - 1].text.match(/[A-Za-z][\w.$]{2,}/g) || []).sort(function (a, b) { return b.length - a.length; })
          .forEach(function (w) { if (out.indexOf(w) >= 0) s.c.push(w); });
      });
      var r2 = align(out, spans);
        var x = spans.filter(function (s) { return s.a && !r2.some(function (y) { return y[0] === s.k; }); })
          .map(function (s) { return [s.k, stripEnds(s.alone || u.rich[s.k - 1].text)]; });
        return { o: out, r: r2, x: x };
      });
    });
    return p.then(function (l) { S.cache[key] = l; saveCache(); return l; });
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
    translate(u.text).then(function (out) {
      if (!u.rich || !u.rich.length) return out;
      return layoutFor(u, out).then(function (l) { u.layout = l; return out; }, function () { return out; });
    }).then(function (out) { u.out = out; place(u); S.done++; }, function () { u.q = 0; })
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
      chrome.storage.sync.get(['glossary', 'trSites']).catch(function () { return {}; })
    ]).then(function (r) {
      var p = r[0].trPrefs || {};
      S.always = Array.isArray(r[1].trSites) && r[1].trSites.indexOf(location.origin) >= 0;
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
  // דוגמה מהתוכן עצמו (כתבה, תיאור הסרטון) ולא מהתפריטים: באתר עם תפריטים בעברית ותוכן באנגלית, התוכן קובע
  function sampleOf(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), t, s = '';
    while ((t = w.nextNode()) && s.length < 4000) { var p = t.parentElement; if (p && !p.closest(SKIP) && TWO.test(t.nodeValue)) s += t.nodeValue + ' '; }
    return clean(s);
  }
  // שפת הדף, כשמי שמשתמש בתוסף רוצה עברית: אתר עם תפריטים בעברית (יוטיוב, פייסבוק) ותוכן בלועזית הוא דף בלועזית.
  // רק דף שכמעט כולו בעברית נחשב עברי (ואז מתרגמים ממנו לאנגלית).
  function pageLang(sample) {
    if (S.tgt !== 'he') return detect(sample);
    var heb = (sample.match(HEB_G) || []).length, all = (sample.match(LET_G) || []).length || 1;
    var rest = clean(sample.replace(/\S*[֐-׿]\S*/g, ' '));
    if (heb / all > 0.85 || (rest.match(LET_G) || []).length < 80) return Promise.resolve(heb / all > 0.4 ? 'he' : detect(sample));
    return detect(rest);
  }
  function pageSample() {
    var main = (YT && document.querySelector('ytd-watch-metadata #title, ytd-watch-metadata #description')) || document.querySelector('article, main, [role="main"]');
    var s = main ? sampleOf(main) : '';
    return s.length > 150 ? s : sampleOf(document.body);
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
        if (n.nodeType === 11) { scan(n); return; }
        if (n.nodeType === 1 && !isInline(n)) addBlock(n); else addBlock(blockOf(n));
        if (n.nodeType === 1) scan(n);
      } catch (e) {}
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
    B.al = el('button'); B.al.onclick = alwaysClick;
    if (!canAlways()) B.al.classList.add('hid');
    B.x = el('button', '', '✕'); B.x.title = 'לבטל את התרגום (Alt+Shift+T)'; B.x.setAttribute('aria-label', 'לבטל את התרגום ולהחזיר את הדף כמו שהיה');
    [B.ico, B.st, B.go, B.sel, B.mode, B.glb, B.al, B.x].forEach(function (x) { top.appendChild(x); });
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
    B.al.textContent = S.always ? '📌 ✓ תמיד באתר הזה' : '📌 תמיד באתר הזה';
    B.al.setAttribute('aria-pressed', S.always ? 'true' : 'false');
    B.al.title = S.always ? 'האתר הזה מתורגם לבד בכל כניסה. לחיצה מבטלת.' : 'לתרגם לבד כל דף באתר הזה, בלי ללחוץ';
    if (YT && C.t && !msg && !S.err) sub.textContent += (sub.textContent ? ' · ' : '') + '🎬 הכתוביות מתורגמות';
    B.mode.title = S.mode === 'bi' ?'להסתיר את המקור ולהציג רק את התרגום (מעבר עם העכבר מראה את המקור)' : 'להציג את המקור ואת התרגום זה מתחת לזה';
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
  // סימון שנחתך באמצע מילה ("e Intersection Obs") מתרחב למילים שלמות, גם על המסך
  function expandSel() {
    var s = getSelection();
    if (!s || !s.rangeCount || s.isCollapsed) return s ? String(s) : '';
    var r = s.getRangeAt(0), W = /[\p{L}\p{N}\p{M}'’_]/u;
    var a = r.startContainer, ao = r.startOffset, b = r.endContainer, bo = r.endOffset, ch = false;
    if (a.nodeType === 3) {
      var t = a.nodeValue, mid = ao > 0 && W.test(t[ao - 1] || '') && W.test(t[ao] || '');
      while (mid && ao > 0 && W.test(t[ao - 1])) { ao--; ch = true; }
    }
    if (b.nodeType === 3) {
      var u = b.nodeValue, mid2 = bo < u.length && W.test(u[bo] || '') && W.test(u[bo - 1] || '');
      while (mid2 && bo < u.length && W.test(u[bo])) { bo++; ch = true; }
    }
    if (ch) {
      try { var r2 = r.cloneRange(); r2.setStart(a, ao); r2.setEnd(b, bo); s.removeAllRanges(); s.addRange(r2); } catch (e) {}
    }
    return String(s);
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
        return engine(tr, text, src0);
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
      var ed = document.activeElement && (document.activeElement.isContentEditable || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName));
      var text = ed ? '' : expandSel().trim();
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

  // ---------- כתוביות ביוטיוב ----------
  // יוטיוב מציג כל שורת כתוביות כטקסט רגיל בתוך הנגן. כל 0.2 שניות קוראים את השורה שעל המסך, מתרגמים אותה
  // (ושומרים במטמון), ומציגים את התרגום בתוך הנגן: מעל הכתוביות המקוריות, או במקומן במצב "רק תרגום".
  // אם הכתוביות כבויות – מדליקים אותן פעם אחת. עובד גם במסך מלא וגם בכתוביות אוטומטיות.
  var C = { t: 0, el: null, last: '', seq: 0, vid: '', cc: false, src: '', cache: {}, n: 0 };
  function player() { return document.querySelector('#movie_player') || document.querySelector('.html5-video-player'); }
  function capOn() { if (YT && !C.t) C.t = setInterval(capTick, 200); }
  function capOff() {
    clearInterval(C.t); C.t = 0; C.last = '';
    if (C.el) C.el.remove(); C.el = null;
    var pl = player(); if (pl) pl.removeAttribute('data-hk-cap');
  }
  function capLang(text) {
    if ((text.match(HEB_G) || []).length > (text.match(LET_G) || []).length * 0.4) return Promise.resolve('he');
    if (!('LanguageDetector' in self)) return Promise.resolve('en');
    // create() בלי שהמזהה כבר במחשב מחכה להורדה (ולפעמים ללחיצה): אז מניחים אנגלית, הנפוץ ביוטיוב
    return LanguageDetector.availability().then(function (a) {
      if (a !== 'available') return null;
      if (!C.det) C.det = LanguageDetector.create();
      return C.det.then(function (d) { return d.detect(text); });
    }).then(function (r) {
      var top = r && r[0];
      return top && top.detectedLanguage !== 'und' && top.confidence > 0.4 ? base(top.detectedLanguage) : 'en';
    }).catch(function () { return 'en'; });
  }
  function capTick() {
    var pl = player(); if (!pl || !S.on) return;
    var vid = new URLSearchParams(location.search).get('v') || location.pathname;
    if (vid !== C.vid) { C.vid = vid; C.cc = false; C.src = ''; }
    if (pl.classList.contains('ad-showing')) { if (C.el) C.el.hidden = true; C.last = ''; return; }   // בזמן פרסומת: לא נוגעים בכתוביות ולא מתרגמים
    var btn = pl.querySelector('.ytp-subtitles-button');
    if (btn && btn.getAttribute('aria-pressed') === 'true') C.cc = true;
    else if (!C.cc && btn && btn.getAttribute('aria-pressed') === 'false' && btn.offsetParent) { C.cc = true; btn.click(); }
    pl.setAttribute('data-hk-cap', S.mode);
    var lines = [].map.call(pl.querySelectorAll('.caption-window .caption-visual-line'), function (l) { return l.textContent; });
    var text = clean(lines.join(' '));
    if (text !== C.last) { C.last = text; capTranslate(text); }
    capPlace(pl);
  }
  function capTranslate(text) {
    var my = ++C.seq;
    if (!text) { capShow(''); return; }
    var hit = C.cache[text];
    if (hit != null) { capShow(hit); return; }
    (C.src ? Promise.resolve(C.src) : capLang(text).then(function (l) { if (text.length > 20) C.src = l; return l; })).then(function (src) {
      var tgt = S.tgt !== src ? S.tgt : (src === 'he' ? 'en' : 'he');
      C.tgt = tgt;
      return translator(src, tgt).then(function (tr) { return engine(tr, text, src); });
    }).then(function (out) {
      if (++C.n > 600) { C.cache = {}; C.n = 0; }
      C.cache[text] = out;
      if (my === C.seq) capShow(out);
    }, function () {});
  }
  function capShow(out) {
    var pl = player(); if (!pl) return;
    if (!C.el || !C.el.isConnected) {
      C.el = document.createElement('hk-tr-cap');
      C.el.setAttribute('translate', 'no');
      C.el.setAttribute('aria-live', 'polite');
      pl.appendChild(C.el);
    }
    C.el.hidden = !out;
    C.el.textContent = out;
    C.el.setAttribute('dir', RTL[base(C.tgt)] ? 'rtl' : 'ltr');
    C.el.setAttribute('lang', C.tgt || S.tgt);
    capPlace(pl);
  }
  function capPlace(pl) {
    if (!C.el || C.el.hidden) return;
    var pr = pl.getBoundingClientRect(), win = pl.querySelector('.caption-window');
    C.el.style.fontSize = Math.max(15, Math.min(36, pr.height / 19)) + 'px';
    var bottom;
    if (S.mode === 'bi' && win && C.last) bottom = pr.bottom - win.getBoundingClientRect().top + 6;
    else bottom = pl.classList.contains('ytp-autohide') ? pr.height * 0.05 : 62;
    C.el.style.bottom = Math.round(bottom) + 'px';
  }

  // ---------- "לתרגם תמיד את האתר הזה" ----------
  function canAlways() { return /^https?:$/.test(location.protocol); }
  function alwaysClick() {
    var msg = S.always ? { trAlways: location.origin, on: false } : { trAsk: location.origin };
    try { chrome.runtime.sendMessage(msg, function () { void chrome.runtime.lastError; }); } catch (e) {}
  }
  try {
    chrome.storage.onChanged.addListener(function (ch, area) {
      if (area === 'sync' && ch.trSites) { var l = ch.trSites.newValue; S.always = Array.isArray(l) && l.indexOf(location.origin) >= 0; bar(); }
    });
  } catch (e) {}

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
          roots.clear();
          addRoot(document);
          bar(); pump();
        });
      }, function (e) {
        if (my !== startId) return;
        var m = String(e && (e.name + e.message));
        if (/NotAllowed/i.test(m) && !byClick) { S.err = ''; bar('כדי לתרגם, מורידים פעם אחת את מנוע התרגום של כרום (במחשב, בלי שרת).'); B.go.classList.remove('hid'); return; }
        S.err = errText(e); bar();
      });
  }
  function on(auto) {
    if (S.on) return Promise.resolve('on');
    S.on = true; S.done = 0; S.queue = []; S.tr = null;
    return loadPrefs().then(function () { return pageLang(pageSample()); }).then(function (src) {
      S.src = src;
      // "לתרגם תמיד": דף שכבר בשפה שלנו (למשל דף בעברית באותו אתר) נשאר בשקט
      if (auto && S.tgt === S.src) { S.on = false; return 'same'; }
      if (S.tgt === S.src) S.tgt = S.src === 'he' ? 'en' : 'he';
      buildBar(); if (!auto) B.root.classList.remove('mini');
      start(false);
      capOn();
      return 'on';
    });
  }
  function clearPage() {
    mo.disconnect(); clearTimeout(flushT); flushT = 0; dirty.clear(); roots.clear(); gen++;
    S.byBlock.forEach(function (rec, b) { drop(b); io.unobserve(b); });
    S.byBlock.clear(); S.queue = []; S.done = 0; S.tr = null;
  }
  function off() {
    S.on = false; startId++;
    clearPage(); hideBubble(); hidePin(); hideTip(); capOff();
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
      if (c === 'auto') return S.on ? 'on' : on(true);
      if (c === 'sel') {
        var live = expandSel().trim(), txt = live || arg;
        return (S.on ? Promise.resolve() : loadPrefs()).then(function () { return showBubble(txt); }).then(function (ok) { return ok ? 'sel' : 'sel-fail'; });
      }
      return 'unknown';
    }
  };
})();
