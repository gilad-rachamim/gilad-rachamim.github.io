/* בדיקת SEO לאתר (/esek/seo/) – PageSpeed Insights v5 מהדפדפן, דוח בעברית. קידומת sx-
   אין שרת שלנו: הכתובת נשלחת רק ל-Google PageSpeed Insights, וההיסטוריה נשמרת רק בדפדפן. */
(function () {
  'use strict';
  // מפתח דפדפן ציבורי, מוגבל ל-PageSpeed Insights ולכתובות hakelim.com / gilad-rachamim.github.io (לא סוד).
  var KEY = 'AIzaSyBrvmyCbWH8lnLFuRH37HLTiqVLqC8kdH8';
  var API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  var LS = 'esek-seo-v1';
  var WA = '972584049049';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('sx-form'), inp = $('sx-url'), out = $('sx-out'), msg = $('sx-msg'), go = $('sx-go');
  if (!form) return;
  var strategy = 'mobile', busy = false, last = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem(LS) || '[]') || []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(LS, JSON.stringify(a.slice(0, 8))); } catch (e) {} }
  function used(how) { try { window.toolUsed && window.toolUsed('seo', { how: how }); } catch (e) {} }
  function d2(t) { var d = new Date(t); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function pretty(u) { try { return decodeURI(u); } catch (e) { return u; } }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }

  /* ---------- טקסטים בעברית לכל בדיקה ----------
     sev: 1 קריטי, 2 חשוב, 3 לשיפור. why = למה זה חשוב, fix = איך מתקנים, wix / wp = איפה זה בוויקס ובוורדפרס */
  var T = {
    'is-crawlable': [1, 'הדף חסום לגוגל (noindex)', 'דף שמסומן noindex, או שחסום ב-robots.txt, לא יופיע בגוגל בכלל. לפעמים זה נשאר בטעות מתקופת הבנייה.', 'להסיר את התגית noindex (וגם X-Robots-Tag בשרת) מכל דף שאמור להופיע בגוגל.', 'בהגדרות ה-SEO של הדף: להדליק "אפשר למנועי חיפוש להציג את הדף".', 'בהגדרות > קריאה: לוודא שלא מסומן "בקש ממנועי חיפוש לא לאנדקס", ובתיבת Yoast / Rank Math של הדף: "לאפשר הופעה בתוצאות".'],
    'http-status-code': [1, 'הדף מחזיר שגיאה', 'דף שמחזיר שגיאה (4xx או 5xx) יוצא מהאינדקס של גוגל, וכל מי שמגיע אליו הולך.', 'להחזיר את הדף, או להפנות אותו בהפניה קבועה (301) לדף הכי קרוב בתוכן.', 'הגדרות האתר > SEO > הפניות 301.', 'תוסף Redirection או ההפניות של Rank Math.'],
    'document-title': [1, 'אין לדף כותרת (title)', 'הכותרת היא האות הכי חזק לגוגל על מה הדף, והיא השורה הכחולה בתוצאות החיפוש.', 'לכתוב כותרת ייחודית של 30–60 תווים, שמתחילה בביטוי שאנשים מחפשים, ואחריו שם העסק.', 'בתפריט הדפים > הגדרות הדף > SEO בסיסי > "כותרת הדף".', 'בתיבת Yoast / Rank Math שמתחת לעריכת הדף > "כותרת SEO".'],
    'viewport': [1, 'הדף לא מותאם לטלפון', 'גוגל מדרג לפי גרסת הטלפון של האתר. דף שלא מותאם לטלפון נפגע מאוד.', 'להוסיף <meta name="viewport" content="width=device-width, initial-scale=1"> ולוודא שהעיצוב מתאים את עצמו למסך.', 'בוויקס זה קיים לבד. לבדוק את תצוגת הנייד בעורך.', 'לבחור תבנית רספונסיבית (כמעט כל התבניות החדשות).'],
    'meta-description': [2, 'אין תיאור לדף (meta description)', 'התיאור הוא הטקסט שמתחת לכותרת בגוגל, והוא מה שגורם לאנשים ללחוץ דווקא עליכם.', 'לכתוב תיאור של 120–155 תווים: הביטוי שמחפשים, מה מקבלים, וקריאה לפעולה.', 'הגדרות הדף > SEO בסיסי > "תיאור מטא".', 'בתיבת Yoast / Rank Math > "תיאור מטא".'],
    'canonical': [2, 'הגדרת canonical שגויה', 'ה-canonical אומר לגוגל איזו כתובת היא "המקורית". הגדרה שגויה אומרת לגוגל להציג דף אחר במקום הדף הזה.', 'לוודא שה-canonical של כל דף מפנה לכתובת המלאה והנקייה של אותו דף, ב-https.', 'הגדרות הדף > SEO > מתקדם > "כתובת קנונית".', 'בתיבת Yoast / Rank Math > מתקדם > "כתובת קנונית".'],
    'robots-txt': [2, 'קובץ robots.txt לא תקין', 'גוגל קורא את הקובץ הזה לפני כל סריקה. שורה שגויה בו יכולה לחסום חלקים מהאתר.', 'לפתוח את /robots.txt ולתקן את השורות שהבדיקה מסמנת. לוודא שאין "Disallow: /" לכל האתר.', 'הגדרות האתר > SEO > עורך robots.txt.', 'Yoast > כלים > עורך קבצים, או Rank Math > הגדרות כלליות > robots.txt.'],
    'crawlable-anchors': [2, 'קישורים שגוגל לא יכול ללכת אחריהם', 'גוגל מגלה דפים דרך קישורים רגילים (<a href>). כפתורים שעובדים רק בקוד JavaScript נשארים בלי מעבר.', 'להפוך כל קישור לתגית <a> עם href אמיתי לכתובת הדף.', 'בכפתורים: "קישור לדף" במקום פעולה.', 'לבדוק כפתורים של תוספים ותפריטים שבנויים ב-JavaScript.'],
    'hreflang': [3, 'הגדרת שפות (hreflang) שגויה', 'באתר בכמה שפות, hreflang אומר לגוגל איזו גרסה להציג לאיזה קהל. שגיאה גורמת להצגת שפה לא נכונה.', 'לתקן את קודי השפה (he, en) ולוודא שכל גרסה מפנה לכל האחרות.', 'Wix Multilingual מגדיר את זה לבד.', 'תוסף WPML / Polylang מגדיר את זה לבד.'],
    'link-text': [3, 'קישורים עם טקסט לא ברור ("לחצו כאן")', 'הטקסט של הקישור אומר לגוגל ולמשתמשים לאן הוא מוביל. "לחצו כאן" לא אומר כלום.', 'לכתוב בקישור את מה שיש בדף היעד: "המחירון שלנו", "איך מגיעים".', '', ''],
    'image-alt': [3, 'תמונות בלי טקסט חלופי (alt)', 'גוגל לא רואה תמונות. ה-alt מסביר אותן, מביא כניסות מחיפוש תמונות, ונדרש לנגישות.', 'לכתוב לכל תמונה alt קצר שמתאר אותה (בלי לדחוס מילות חיפוש).', 'לחיצה על התמונה > הגדרות > "מה רואים בתמונה?".', 'ספריית המדיה > התמונה > "טקסט חלופי".'],
    'font-size': [3, 'טקסט קטן מדי לקריאה בטלפון', 'טקסט קטן מ-12 פיקסלים קשה לקריאה בטלפון, ואנשים עוזבים.', 'גודל גופן של 16 פיקסלים לפחות לטקסט רגיל.', '', ''],
    'tap-targets': [3, 'כפתורים צפופים מדי בטלפון', 'כפתורים קטנים וצמודים גורמים ללחיצות שגויות.', 'כפתורים בגודל 48 פיקסלים לפחות, עם רווח ביניהם.', '', ''],
    'structured-data': [3, 'נתונים מובנים (Schema)', 'Schema עוזר לגוגל להבין עסק, מוצר או מאמר.', 'להוסיף JSON-LD מתאים ולבדוק אותו ב-Rich Results Test.', '', '']
  };
  /* ביצועים: מפתח בלי הסיומת -insight (Lighthouse 13 החליף חלק מהבדיקות ב"תובנות") */
  var P = {
    'render-blocking': ['קבצים שחוסמים את הצגת הדף', 'הדפדפן מחכה לקבצי CSS ו-JavaScript לפני שהוא מציג משהו.', 'לטעון סקריפטים עם defer, ולהשאיר בראש הדף רק את ה-CSS שחייבים.'],
    'render-blocking-resources': ['קבצים שחוסמים את הצגת הדף', 'הדפדפן מחכה לקבצי CSS ו-JavaScript לפני שהוא מציג משהו.', 'לטעון סקריפטים עם defer, ולהשאיר בראש הדף רק את ה-CSS שחייבים.'],
    'image-delivery': ['תמונות כבדות מדי', 'תמונות הן בדרך כלל רוב המשקל של הדף, ובטלפון זה מורגש מאוד.', 'להקטין תמונות לגודל שבו הן מוצגות, לשמור כ-WebP או AVIF, ולדחוס.'],
    'uses-optimized-images': ['תמונות לא דחוסות', 'תמונות הן בדרך כלל רוב המשקל של הדף.', 'לדחוס את התמונות (למשל ב-Squoosh) לפני ההעלאה.'],
    'modern-image-formats': ['תמונות בפורמט ישן', 'WebP ו-AVIF שוקלים הרבה פחות מ-JPG ו-PNG באותה איכות.', 'לשמור תמונות כ-WebP.'],
    'uses-responsive-images': ['תמונות גדולות מהמקום שלהן', 'הטלפון מוריד תמונה ענקית ומציג אותה קטנה.', 'להעלות תמונות בגודל שבו הן מוצגות, או להשתמש ב-srcset.'],
    'offscreen-images': ['תמונות שנטענות לפני שצריך', 'תמונות בתחתית הדף נטענות מיד ומאטות את מה שרואים למעלה.', 'להוסיף loading="lazy" לתמונות שלא בחלק העליון.'],
    'document-latency': ['השרת עונה לאט', 'כל השאר מחכה לתשובה הראשונה של השרת.', 'מטמון (cache), CDN, ואחסון טוב יותר. בוורדפרס: תוסף מטמון.'],
    'server-response-time': ['השרת עונה לאט', 'כל השאר מחכה לתשובה הראשונה של השרת.', 'מטמון (cache), CDN, ואחסון טוב יותר. בוורדפרס: תוסף מטמון.'],
    'unused-javascript': ['קוד JavaScript שלא בשימוש', 'הטלפון מוריד ומפענח קוד שלא עושה כלום בדף הזה.', 'להסיר תוספים וסקריפטים מיותרים, ולטעון קוד רק בדפים שצריכים אותו.'],
    'unused-css-rules': ['קוד CSS שלא בשימוש', 'קבצי עיצוב גדולים מעכבים את הצגת הדף.', 'להסיר CSS מיותר מתבנית ומתוספים.'],
    'cache': ['קבצים בלי זמן מטמון', 'מבקר שחוזר מוריד שוב את כל הקבצים.', 'להגדיר Cache-Control ארוך לתמונות, CSS ו-JavaScript.'],
    'uses-long-cache-ttl': ['קבצים בלי זמן מטמון', 'מבקר שחוזר מוריד שוב את כל הקבצים.', 'להגדיר Cache-Control ארוך לתמונות, CSS ו-JavaScript.'],
    'lcp-discovery': ['התמונה הראשית מתגלה מאוחר', 'הדבר הכי גדול במסך הראשון (LCP) צריך להיטען ראשון.', 'לא לשים loading="lazy" על התמונה הראשית, ולהוסיף לה fetchpriority="high".'],
    'lcp-lazy-loaded': ['התמונה הראשית נטענת בעצלות', 'התמונה הכי חשובה במסך הראשון מחכה.', 'להסיר loading="lazy" מהתמונה הראשית.'],
    'cls-culprits': ['דברים שקופצים בזמן הטעינה', 'כשהתוכן זז תוך כדי טעינה, אנשים לוחצים על הדבר הלא נכון.', 'לתת לתמונות ולמודעות רוחב וגובה קבועים מראש.'],
    'unsized-images': ['תמונות בלי רוחב וגובה', 'בלי מידות מראש, התוכן קופץ כשהתמונה נטענת.', 'להוסיף width ו-height לכל תמונה.'],
    'third-parties': ['סקריפטים של צד שלישי', 'צ\'אטים, פיקסלים ווידג\'טים מאטים את הדף.', 'להשאיר רק את מה שבאמת צריך, ולטעון אותם אחרי הדף.'],
    'third-party-summary': ['סקריפטים של צד שלישי', 'צ\'אטים, פיקסלים ווידג\'טים מאטים את הדף.', 'להשאיר רק את מה שבאמת צריך, ולטעון אותם אחרי הדף.'],
    'font-display': ['גופנים שמסתירים את הטקסט', 'הטקסט לא מופיע עד שהגופן נטען.', 'להוסיף font-display: swap לגופנים.'],
    'dom-size': ['דף עם יותר מדי רכיבים', 'עמוד ענק (למשל מבוני עמודים) כבד לטלפון.', 'לפשט את מבנה הדף ולהסיר אלמנטים מוסתרים.'],
    'uses-text-compression': ['קבצים בלי דחיסה', 'קבצי טקסט נשלחים בלי gzip או brotli.', 'להפעיל דחיסה בשרת או ב-CDN.'],
    'redirects': ['הפניות מיותרות', 'כל הפניה מוסיפה זמן המתנה לפני שהדף מתחיל.', 'לקשר ישר לכתובת הסופית.'],
    'legacy-javascript': ['קוד JavaScript ישן', 'קוד שנכתב לדפדפנים ישנים כבד יותר.', 'לעדכן את התוספים, או לבנות את הקוד לדפדפנים מודרניים.'],
    'total-byte-weight': ['הדף כבד מאוד', 'הורדה גדולה מאטה ועולה לגולשים בחבילת גלישה.', 'לדחוס תמונות ולהסיר קבצים מיותרים.'],
    'mainthread-work-breakdown': ['הטלפון עובד קשה כדי להציג את הדף', 'הרבה עבודת JavaScript מעכבת לחיצות.', 'פחות סקריפטים ותוספים.'],
    'bootup-time': ['זמן ריצה ארוך של JavaScript', 'קוד כבד מעכב את התגובה ללחיצות.', 'פחות סקריפטים, ולטעון אותם עם defer.']
  };
  var SEVN = { 1: 'קריטי', 2: 'חשוב', 3: 'לשיפור' };
  var CATS = [['seo', 'SEO', 'כמה הדף בנוי נכון לגוגל'], ['performance', 'מהירות', 'כמה מהר הדף נטען בטלפון'], ['accessibility', 'נגישות', 'כמה הדף נוח לכל אחד'], ['best-practices', 'אמינות ואבטחה', 'שיטות עבודה מומלצות']];

  function plain(md) { return String(md || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, ''); }

  /* ---------- מתשובת PageSpeed למודל קטן ---------- */
  function model(j, url, strat) {
    var lr = j.lighthouseResult || {}, A = lr.audits || {}, C = lr.categories || {};
    var m = { url: url, final: lr.finalDisplayedUrl || lr.finalUrl || url, strategy: strat, t: Date.now(), lh: lr.lighthouseVersion || '', s: {}, issues: [], pass: [], field: null, lab: {}, shot: '', stack: [] };
    CATS.forEach(function (c) { var x = C[c[0]]; if (x && x.score != null) m.s[c[0]] = Math.round(x.score * 100); });
    ['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'first-contentful-paint', 'speed-index'].forEach(function (k) {
      if (A[k]) m.lab[k] = { v: A[k].displayValue || '', sc: A[k].score };
    });
    var le = j.loadingExperience;
    if (le && le.metrics && (le.metrics.LARGEST_CONTENTFUL_PAINT_MS || le.metrics.INTERACTION_TO_NEXT_PAINT)) {
      var f = { origin: !!le.origin_fallback, all: le.overall_category || '' };
      [['lcp', 'LARGEST_CONTENTFUL_PAINT_MS'], ['inp', 'INTERACTION_TO_NEXT_PAINT'], ['cls', 'CUMULATIVE_LAYOUT_SHIFT_SCORE']].forEach(function (p) {
        var x = le.metrics[p[1]]; if (x) f[p[0]] = { p: x.percentile, c: x.category };
      });
      m.field = f;
    }
    try { m.shot = (A['final-screenshot'].details.data) || ''; } catch (e) {}
    (lr.stackPacks || []).forEach(function (s) { if (s && s.title) m.stack.push(s.title); });
    function items(a) {
      var d = a.details || {}, list = [];
      try {   // לפעמים items הוא אובייקט, או רשימה של טבלאות (type: list) – לא לתת לזה להפיל את הדוח
        var arr = Array.isArray(d.items) ? d.items : [];
        if (d.type === 'list') arr = arr.reduce(function (o, x) { return o.concat(x && Array.isArray(x.items) ? x.items : []); }, []);
        arr.slice(0, 4).forEach(function (it) {
          if (!it || typeof it !== 'object') return;
          var s = (it.node && (it.node.snippet || it.node.nodeLabel)) || it.url || (it.source && it.source.url) || it.label || '';
          if (typeof s === 'object') s = s.url || s.value || '';
          if (s) list.push(String(s).slice(0, 160));
        });
      } catch (e) {}
      return list;
    }
    var seen = {};
    function add(cat, a, sev, txt) {
      var key = cat + ':' + (txt ? txt[0] : a.id); if (seen[key]) return; seen[key] = 1;   // ישן + "תובנה" חדשה עם אותו נושא = פריט אחד
      m.issues.push({ id: a.id, cat: cat, sev: sev, ti: txt ? txt[0] : plain(a.title), why: txt ? txt[1] : '', fix: txt ? txt[2] : plain(a.description).split('. ')[0] + '.', wix: txt && txt[3] || '', wp: txt && txt[4] || '', dv: a.displayValue || '', it: items(a), lt: a.title });
    }
    function bad(a) { return a && a.score !== null && a.score < 0.9 && ['manual', 'notApplicable', 'informative', 'error'].indexOf(a.scoreDisplayMode) < 0; }
    ['seo', 'performance', 'accessibility', 'best-practices'].forEach(function (cat) {
      var c = C[cat]; if (!c) return;
      (c.auditRefs || []).forEach(function (r) { try { one(cat, r); } catch (e) {} });   // בדיקה אחת חריגה לא מפילה את הדוח
    });
    function one(cat, r) {
        var a = A[r.id]; if (!a) return;
        if (cat === 'performance') {
          if (r.group === 'metrics' || r.group === 'hidden' || r.weight > 0) return;   // מדדים מוצגים למעלה, לא כבעיות
          var sv = a.metricSavings, k0 = a.id.replace(/-insight$/, '');
          if (sv && Object.keys(sv).every(function (z) { return !sv[z]; }) && !(a.details && a.details.overallSavingsBytes > 0)) return;   // חיסכון אפסי
          if (!P[k0] && !P[a.id] && !(sv && Object.keys(sv).some(function (z) { return sv[z] > 0; }))) return;
        }
        if (bad(a)) {
          if (cat === 'seo') { var t = T[a.id]; add('seo', a, t ? t[0] : 2, t ? t.slice(1) : null); }
          else if (cat === 'performance') {
            var k = a.id.replace(/-insight$/, ''), p = P[k] || P[a.id];
            add('performance', a, (m.s.performance != null && m.s.performance < 50 && a.score < 0.5) ? 2 : 3, p ? [p[0], p[1], p[2]] : null);
          }
          else if (cat === 'accessibility') { if (a.id === 'image-alt' && T['image-alt']) add('accessibility', a, 3, T['image-alt'].slice(1)); else add('accessibility', a, 3, null); }
          else add('best-practices', a, a.id === 'is-on-https' ? 1 : 3, a.id === 'is-on-https' ? ['האתר לא מאובטח (HTTPS)', 'הדפדפן מציג "לא מאובטח", וגוגל מעדיף אתרים מאובטחים.', 'להפעיל תעודת SSL ולהפנות כל http ל-https בהפניה 301.', 'בוויקס זה פעיל לבד.', 'אצל חברת האחסון: SSL חינמי (Let\'s Encrypt).'] : null);
        } else if (cat === 'seo' && a.score === 1 && a.scoreDisplayMode !== 'manual') {
          m.pass.push(plain(a.title));   // ב-locale=he הכותרת של בדיקה שעברה היא הניסוח החיובי
        }
    }
    m.issues.sort(function (x, y) { var o = { seo: 0, performance: 1, accessibility: 2, 'best-practices': 3 }; return x.sev - y.sev || o[x.cat] - o[y.cat]; });
    var cnt = {};
    m.issues = m.issues.filter(function (x) { cnt[x.cat] = (cnt[x.cat] || 0) + 1; return x.cat === 'seo' || cnt[x.cat] <= 6; });   // לא להציף: עד 6 לכל תחום מלבד SEO
    return m;
  }

  /* ---------- תצוגה ---------- */
  function band(v) { return v == null ? 'na' : v >= 90 ? 'ok' : v >= 50 ? 'mid' : 'bad'; }
  function ring(v, name, sub) {
    var r = 34, c = 2 * Math.PI * r, off = c * (1 - (v || 0) / 100);
    return '<div class="sx-ring sx-' + band(v) + '"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="' + r + '" class="sx-rbg"/><circle cx="40" cy="40" r="' + r + '" class="sx-rfg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b>' + (v == null ? '–' : v) + '</b><span>' + esc(name) + '</span><small>' + esc(sub) + '</small></div>';
  }
  var FCAT = { FAST: ['טוב', 'ok'], AVERAGE: ['דורש שיפור', 'mid'], SLOW: ['איטי', 'bad'] };
  function fieldRow(name, val, c, what) {
    var x = FCAT[c] || ['', 'na'];
    return '<li class="sx-' + x[1] + '"><b>' + esc(name) + '</b><span class="sx-v">' + esc(val) + '</span><span class="sx-c">' + esc(x[0]) + '</span><small>' + esc(what) + '</small></li>';
  }
  function labRow(name, o, what) {
    if (!o) return '';
    var b = o.sc == null ? 'na' : o.sc >= 0.9 ? 'ok' : o.sc >= 0.5 ? 'mid' : 'bad';
    return '<li class="sx-' + b + '"><b>' + esc(name) + '</b><span class="sx-v" dir="auto">' + esc(o.v) + '</span><span class="sx-c">' + ({ ok: 'טוב', mid: 'דורש שיפור', bad: 'איטי', na: '' }[b]) + '</span><small>' + esc(what) + '</small></li>';
  }
  function issueHtml(x, i) {
    var tip = '';
    if (x.wix) tip += '<p class="sx-tip"><b>בוויקס:</b> ' + esc(x.wix) + '</p>';
    if (x.wp) tip += '<p class="sx-tip"><b>בוורדפרס:</b> ' + esc(x.wp) + '</p>';
    var its = x.it.length ? '<details class="sx-its"><summary>איפה בדף</summary><ul>' + x.it.map(function (s) { return '<li dir="ltr">' + esc(s) + '</li>'; }).join('') + '</ul></details>' : '';
    var cat = { seo: 'SEO', performance: 'מהירות', accessibility: 'נגישות', 'best-practices': 'אמינות' }[x.cat];
    return '<li class="sx-is sx-s' + x.sev + '"><div class="sx-ih"><span class="sx-sev">' + SEVN[x.sev] + '</span><span class="sx-cat">' + cat + '</span>' + (x.dv ? '<span class="sx-dv" dir="auto">' + esc(x.dv) + '</span>' : '') + '</div>' +
      '<h4>' + (i + 1) + '. ' + esc(x.ti) + '</h4>' + (x.why ? '<p><b>למה זה חשוב:</b> ' + esc(x.why) + '</p>' : '') + '<p><b>איך מתקנים:</b> ' + esc(x.fix) + '</p>' + tip + its + '</li>';
  }
  function render(m, demo) {
    var hist = load(), prev = null;
    hist.forEach(function (h) { if (!prev && h.url === m.url && h.strategy === m.strategy && h.t < m.t - 1000) prev = h; });
    var n1 = 0, n2 = 0, n3 = 0;
    m.issues.forEach(function (x) { if (x.sev === 1) n1++; else if (x.sev === 2) n2++; else n3++; });
    var h = '';
    if (demo) h += '<p class="sx-demo">👀 זו דוגמה: הבדיקה של hakelim.com מ-' + d2(m.t) + '. כתבו את הכתובת שלכם למעלה ולחצו "לבדוק".</p>';
    h += '<div class="sx-head"><div><h2 id="sx-rep-h">הדוח של ' + esc(host(m.final)) + '</h2><p class="sx-meta"><span dir="ltr">' + esc(pretty(m.final)) + '</span><br>' + (m.strategy === 'mobile' ? 'בטלפון' : 'במחשב') + ' · ' + d2(m.t) + (m.stack.length ? ' · בנוי ב-' + esc(m.stack.join(', ')) : '') + '</p></div>' +
      (m.shot ? '<img class="sx-shot" src="' + m.shot + '" alt="צילום של הדף ' + esc(host(m.final)) + ' כפי שגוגל ראה אותו">' : '') + '</div>';
    h += '<div class="sx-rings">' + CATS.map(function (c) { return ring(m.s[c[0]], c[1], c[2]); }).join('') + '</div>';
    if (prev && prev.s) {
      var dd = CATS.map(function (c) { var a = m.s[c[0]], b = prev.s[c[0]]; if (a == null || b == null || a === b) return ''; return '<span class="' + (a > b ? 'up' : 'dn') + '">' + c[1] + ' ' + (a > b ? '▲' : '▼') + Math.abs(a - b) + '</span>'; }).join('');
      if (dd) h += '<p class="sx-delta">לעומת הבדיקה הקודמת (' + d2(prev.t) + '): ' + dd + '</p>';
    }
    h += '<p class="sx-sum">' + (m.issues.length ? 'נמצאו <b>' + m.issues.length + '</b> דברים לתקן: ' + [n1 ? n1 + ' קריטיים' : '', n2 ? n2 + ' חשובים' : '', n3 ? n3 + ' לשיפור' : ''].filter(Boolean).join(', ') + '. הסדר למטה הוא סדר העבודה: מלמעלה למטה.' : 'לא נמצאו בעיות בבדיקות של גוגל לדף הזה. כל הכבוד!') + '</p>';
    // מהירות לפי גוגל
    h += '<h3>מהירות: מה שגוגל מודד (Core Web Vitals)</h3>';
    if (m.field && (m.field.lcp || m.field.inp)) {
      h += '<p class="sx-note">נתונים של גולשים אמיתיים בכרום, 28 הימים האחרונים' + (m.field.origin ? ' (לכל האתר, אין מספיק נתונים לדף הזה לבד)' : '') + '. גוגל משתמש בהם כחלק מחוויית הדף.</p><ul class="sx-cwv">' +
        (m.field.lcp ? fieldRow('LCP – טעינת התוכן הראשי', (m.field.lcp.p / 1000).toFixed(1) + ' שנ\'', m.field.lcp.c, 'טוב: עד 2.5 שניות') : '') +
        (m.field.inp ? fieldRow('INP – תגובה ללחיצה', m.field.inp.p + ' מ"ש', m.field.inp.c, 'טוב: עד 200 אלפיות שנייה') : '') +
        (m.field.cls ? fieldRow('CLS – קפיצות בדף', (m.field.cls.p / 100).toFixed(2), m.field.cls.c, 'טוב: עד 0.1') : '') + '</ul>';
    } else {
      h += '<p class="sx-note">אין עדיין מספיק גולשים בכרום כדי שגוגל יפרסם נתוני אמת לאתר הזה (זה רגיל באתר קטן). אלה המדידות במעבדה של גוגל, ' + (m.strategy === 'mobile' ? 'בטלפון ממוצע ברשת סלולרית' : 'במחשב') + ':</p>';
    }
    if (m.field && (m.field.lcp || m.field.inp)) h += '<p class="sx-note"><b>ובמעבדה של גוגל</b> (טלפון ממוצע ברשת סלולרית איטית, לכן המספרים כאן בדרך כלל גבוהים יותר):</p>';
    h += '<ul class="sx-cwv sx-lab">' + labRow('LCP – טעינת התוכן הראשי', m.lab['largest-contentful-paint'], 'טוב: עד 2.5 שניות') + labRow('CLS – קפיצות בדף', m.lab['cumulative-layout-shift'], 'טוב: עד 0.1') + labRow('TBT – זמן שהדף "תקוע"', m.lab['total-blocking-time'], 'קשור לתגובה ללחיצות. טוב: עד 200 מ"ש') + labRow('FCP – משהו ראשון על המסך', m.lab['first-contentful-paint'], 'טוב: עד 1.8 שניות') + '</ul>';
    // רשימת התיקונים
    if (m.issues.length) h += '<h3>מה לתקן, לפי סדר החשיבות</h3><ol class="sx-list">' + m.issues.map(issueHtml).join('') + '</ol>';
    if (m.pass.length) h += '<details class="sx-pass"><summary>✓ מה כבר תקין ב-SEO (' + m.pass.length + ')</summary><ul>' + m.pass.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></details>';
    h += '<div class="sx-limits"><h3>מה הבדיקה הזאת לא בודקת</h3><p>היא בודקת דף אחד, טכנית, דרך הכלים של גוגל. היא לא בודקת מה אנשים מחפשים בתחום שלכם, מי מופיע לפניכם בגוגל ולמה, אם יש לאתר מספיק תוכן, ומי מקשר אליכם. שם נמצא רוב ההפרש בין המקום העשירי לראשון. <a class="gold" href="#sx-partner-h">כאן גילעד יכול לעזור</a>.</p></div>';
    h += '<div class="sx-acts no-print"><a class="btn btn-gold" id="sx-share" href="#" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את התוצאה</a><button class="btn btn-line" type="button" id="sx-print">להדפיס / לשמור PDF</button><button class="btn btn-line" type="button" id="sx-again">לבדוק דף אחר</button></div>';
    out.innerHTML = h; out.hidden = false;
    var link = location.origin + '/esek/seo/?url=' + encodeURIComponent(m.url) + (m.strategy === 'desktop' ? '&d=1' : '');
    var txt = 'בדקתי את ' + host(m.final) + ' בבדיקת SEO חינמית בעברית: SEO ' + (m.s.seo != null ? m.s.seo : '–') + ', מהירות ' + (m.s.performance != null ? m.s.performance : '–') + ', נגישות ' + (m.s.accessibility != null ? m.s.accessibility : '–') + '. לבדוק גם את האתר שלכם:\n' + link;
    $('sx-share').href = 'https://wa.me/?text=' + encodeURIComponent(txt);
    $('sx-share').onclick = function () { used('wa'); };
    $('sx-print').onclick = function () { used('print'); window.print(); };
    $('sx-again').onclick = function () { inp.value = ''; inp.focus(); window.scrollTo({ top: form.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' }); };
    partnerLinks(demo ? '' : m.final);
  }

  function hist() {
    var a = load(), box = $('sx-hist');
    if (!box) return;
    if (!a.length) { box.hidden = true; return; }
    box.hidden = false;
    $('sx-hlist').innerHTML = a.map(function (h, i) {
      return '<li><button type="button" data-i="' + i + '"><b dir="ltr">' + esc(host(h.url)) + '</b><span>' + (h.strategy === 'mobile' ? 'טלפון' : 'מחשב') + ' · ' + d2(h.t) + ' · SEO ' + (h.s.seo != null ? h.s.seo : '–') + ' · מהירות ' + (h.s.performance != null ? h.s.performance : '–') + '</span></button></li>';
    }).join('');
  }
  $('sx-hlist') && $('sx-hlist').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    var h = load()[+b.getAttribute('data-i')]; if (!h) return;
    inp.value = h.url; setStrat(h.strategy); run();
  });
  $('sx-hclear') && $('sx-hclear').addEventListener('click', function () { save([]); try { localStorage.removeItem(LS); } catch (e) {} hist(); });

  function partnerLinks(u) {
    document.querySelectorAll('[data-sx-tier]').forEach(function (a) {
      var t = 'שלום גילעד, ' + a.getAttribute('data-sx-tier') + (u ? '\nהאתר שלי: ' + u : '');
      a.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(t);
    });
  }
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-sx-tier]'); if (a) used('partner'); });

  /* ---------- בדיקה ---------- */
  function norm(v) {
    v = String(v || '').trim().replace(/^[\s"'<]+|[\s"'>]+$/g, '');
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, '');
    try {
      var u = new URL(v);
      if (!/\./.test(u.hostname) || /^(localhost|127\.|10\.|192\.168\.)/.test(u.hostname)) return '';
      return u.href;
    } catch (e) { return ''; }
  }
  var STEPS = ['שולחים את הכתובת לגוגל…', 'גוגל פותח את הדף בטלפון וירטואלי…', 'מודדים כמה מהר הדף נטען…', 'בודקים כותרת, תיאור וקישורים…', 'בודקים נגישות ואבטחה…', 'מסדרים את הדוח בעברית…', 'עוד רגע. אתרים כבדים לוקחים עד דקה…'];
  function setStrat(s) {
    strategy = s === 'desktop' ? 'desktop' : 'mobile';
    document.querySelectorAll('#sx-strat button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-s') === strategy)); });
  }
  document.querySelectorAll('#sx-strat button').forEach(function (b) { b.addEventListener('click', function () { setStrat(b.getAttribute('data-s')); }); });

  function fail(code, text, url) {
    var m = 'הבדיקה לא הצליחה.';
    if (code === 429) m = 'יותר מדי בדיקות כרגע (מגבלה של גוגל). נסו שוב בעוד דקה.';
    else if (/FAILED_DOCUMENT_REQUEST|ERRORED_DOCUMENT_REQUEST|DNS|NO_FCP|unreachable/i.test(text)) m = 'גוגל לא הצליח לפתוח את הדף. בדקו שהכתובת נכונה ושהאתר עולה בדפדפן.';
    else if (/NOT_HTML/i.test(text)) m = 'הכתובת לא מובילה לדף אינטרנט (אולי קובץ או תמונה).';
    else if (/timeout|abort/i.test(text)) m = 'הדף לקח יותר מדי זמן להיטען אצל גוגל.';
    msg.innerHTML = esc(m) + ' <a class="gold" href="https://pagespeed.web.dev/analysis?url=' + encodeURIComponent(url) + '&form_factor=' + strategy + '" target="_blank" rel="noopener">לבדוק ישירות ב-PageSpeed של גוגל</a>, או <a class="gold" href="https://wa.me/' + WA + '?text=' + encodeURIComponent('שלום גילעד, הבדיקה באתר הכלים לא הצליחה לסרוק את האתר שלי ואשמח לעזרה: ' + url) + '" target="_blank" rel="noopener">לשלוח לגילעד</a>.';
  }
  function run() {
    if (busy) return;
    var url = norm(inp.value);
    if (!url) { msg.textContent = 'צריך כתובת של אתר, למשל: example.co.il'; inp.focus(); return; }
    inp.value = url; busy = true; go.disabled = true; msg.textContent = '';
    var prog = $('sx-prog'), i = 0;
    prog.hidden = false; $('sx-step').textContent = STEPS[0];
    var tick = setInterval(function () { i = Math.min(i + 1, STEPS.length - 1); $('sx-step').textContent = STEPS[i]; }, 6000);
    var q = API + '?url=' + encodeURIComponent(url) + '&strategy=' + strategy + '&locale=he&category=SEO&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES' + (KEY ? '&key=' + KEY : '');
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { ctl && ctl.abort(); }, 120000);
    used('check');
    fetch(q, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      return r.json().then(function (j) { return { st: r.status, j: j }; });
    }).then(function (x) {
      if (x.st !== 200 || !x.j.lighthouseResult) { fail(x.st, (x.j.error && x.j.error.message) || '', url); return; }
      var m = model(x.j, url, strategy), a = load();
      a.unshift({ url: m.url, strategy: m.strategy, t: m.t, s: m.s, n: m.issues.length });
      render(m, false);
      save(a); hist(); last = m;
      try { history.replaceState(null, '', location.pathname + '?url=' + encodeURIComponent(url) + (strategy === 'desktop' ? '&d=1' : '')); } catch (e) {}
      var t = $('sx-rep-h'); if (t) { t.setAttribute('tabindex', '-1'); window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); t.focus({ preventScroll: true }); }
    }).catch(function (e) { fail(0, String(e && (e.name + e.message)), url); })
      .then(function () { clearInterval(tick); clearTimeout(to); prog.hidden = true; busy = false; go.disabled = false; });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); run(); });

  /* ---------- כניסה לדף ---------- */
  hist(); partnerLinks('');
  var qs = new URLSearchParams(location.search), qu = qs.get('url');
  if (qs.get('d') === '1') setStrat('desktop');
  if (qu) { inp.value = qu; run(); }
  else {
    var dm = $('sx-demo-data');
    if (dm) { try { render(JSON.parse(dm.textContent), true); } catch (e) {} }
  }
  window.__sxModel = model; window.__sxRender = render; // לבדיקות
})();
