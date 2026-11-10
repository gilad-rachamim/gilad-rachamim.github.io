// מחולל הודעה לברית – גילעד רחמים המוהל
// שני מצבים באותו קובץ: המחולל (/mohel/hazmana/) ודף האורחים (/mohel/hazmana/v/#d=...).
// ההזמנה מצוירת על canvas (אותו ציור בתצוגה, בתמונה להורדה ובדף האורחים).
// הפרטים לא יוצאים מהטלפון, חוץ מטופס ההרשמה (שם/טלפון/מייל) שנשלח לצינור הלידים.
(function () {
  'use strict';
  var W = 1080, H = 1350;
  var SERIF = '"Frank Ruhl Libre", "David Libre", serif', SANS = '"Assistant", system-ui, sans-serif';
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var GILAD_WA = '972584049049';
  var GUIDE = '/mohel/madrich/hamadrich-lekrat-huledet-haben.pdf';
  // אישורי הגעה: Worker ב-Cloudflare (tools/rsvp-worker). מקומית – wrangler dev על 8787.
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:8787' : 'https://mohel-rsvp.gilad4049.workers.dev';
  var EV_STORE = 'mohel-hazmana-ev';

  function ev(name, params) { if (window.gtag) window.gtag('event', name, params || {}); }
  function api(path, body, method) {
    var o = { method: method || (body ? 'POST' : 'GET'), headers: {} };
    if (body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
    return fetch(API + path, o).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
  }

  // ---------- תאריך עברי (כמו במחשבון מועד הברית) ----------
  var enFmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  var MONTHS = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function hebrew(d) {
    var o = {};
    enFmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    var mon = MONTHS[(o.month || '').toLowerCase()] || o.month;
    return gem(parseInt(o.day, 10)) + ' ב' + mon + ' ' + gem(parseInt(o.year, 10) % 1000);
  }
  function parseDate(s) { // 'YYYY-MM-DD' → Date בצהריים (שעון מקומי), כדי שלא ייפול על יום אחר
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null;
  }
  function greg(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  // fm: heb / greg / both
  function dateText(d, fm) {
    if (fm === 'greg') return greg(d);
    if (fm === 'heb') return hebrew(d);
    return hebrew(d) + ' (' + greg(d) + ')';
  }
  function hm(t) { return (t || '').replace(/^0(\d)/, '$1'); } // 09:15 → 9:15

  // ---------- איזו שמחה: ברית מילה / זבד הבת / פדיון הבן ----------
  // k = brit (ברירת מחדל) / zeved / pidyon. כל מה שתלוי בסוג יושב כאן, כדי שהציור, הוואטסאפ, היומן, המודעה ודף האורחים ישתמשו באותו מקור.
  var KINDS = {
    brit: {
      slug: 'brit', full: 'ברית המילה', title: 'ברית המילה', the: 'הברית', name: 'ברית מילה', lead: 'מחולל הודעה לברית', born: 'נולד',
      open: ['בשבח והודיה לה׳ יתברך', 'אנו שמחים לבשר על הולדת בננו', 'ונשמח לשתף אתכם בשמחת הכנסתו בבריתו של אברהם אבינו'],
      wa: ['בשבח והודיה לה׳ יתברך, אנו שמחים לבשר על הולדת בננו 🎉', 'ברית המילה תתקיים בעזרת ה׳ '],
      seudah: 'לאחר הברית תתקיים סעודת מצווה', bless: 'שיגדל לתורה, לחופה ולמעשים טובים', baby: 'לתינוק',
      verses: ['', 'וּבַיּוֹם הַשְּׁמִינִי יִמּוֹל בְּשַׂר עָרְלָתוֹ', 'אַשְׁרֵי תִּבְחַר וּתְקָרֵב יִשְׁכֹּן חֲצֵרֶיךָ', 'כְּשֵׁם שֶׁנִּכְנַס לַבְּרִית כֵּן יִכָּנֵס לְתוֹרָה וּלְחֻפָּה וּלְמַעֲשִׂים טוֹבִים', 'הַמַּלְאָךְ הַגֹּאֵל אֹתִי מִכָּל רָע יְבָרֵךְ אֶת הַנְּעָרִים'],
      srcs: ['', 'ויקרא יב, ג', 'תהלים סה, ה', 'מנוסח הברכה בברית', 'בראשית מח, טז']
    },
    zeved: {
      slug: 'zeved', full: 'זבד הבת', title: 'זבד הבת', sub: 'וקריאת השם', the: 'זבד הבת', name: 'זבד הבת', lead: 'מחולל הודעה לזבד הבת', born: 'נולדה',
      open: ['בשמחה ובהודיה לה׳ יתברך', 'אנו שמחים לבשר על הולדת בתנו', 'ונשמח לשתף אתכם בשמחת'],
      wa: ['בשמחה ובהודיה לה׳ יתברך, אנו שמחים לבשר על הולדת בתנו 🎀', 'נשמח לשתף אתכם בזבד הבת וקריאת השם, בעזרת ה׳ '],
      seudah: 'קידוש וסעודה לאחר התפילה', bless: 'שתגדל לתורה, לחופה ולמעשים טובים', baby: 'לתינוקת',
      verses: ['', 'זְבָדַנִי אֱלֹהִים אֹתִי זֵבֶד טוֹב', 'בְּרוּכָה אַתְּ לַה׳ בִּתִּי', 'כָּל כְּבוּדָּה בַת מֶלֶךְ פְּנִימָה'],
      srcs: ['', 'בראשית ל, כ', 'רות ג, י', 'תהלים מה, יד']
    },
    pidyon: {
      slug: 'pidyon', full: 'פדיון הבן', title: 'פדיון הבן', the: 'הפדיון', name: 'פדיון הבן', lead: 'מחולל הודעה לפדיון הבן', born: 'נולד',
      open: ['בשמחה ובהודיה לה׳ יתברך', 'על הולדת בננו בכורנו', 'נשמח לשתף אתכם במצוות'],
      wa: ['בשמחה ובהודיה לה׳ יתברך על הולדת בננו בכורנו 🎉', 'נשמח לשתף אתכם במצוות פדיון הבן, שתתקיים בעזרת ה׳ '],
      seudah: 'לאחר הפדיון, סעודת מצווה', bless: 'שיגדל לתורה, לחופה ולמעשים טובים', baby: 'לתינוק',
      verses: ['', 'קַדֶּשׁ לִי כָל בְּכוֹר', 'וְכֹל בְּכוֹר אָדָם בְּבָנֶיךָ תִּפְדֶּה'],
      srcs: ['', 'שמות יג, ב', 'שמות יג, יג']
    }
  };
  function kindOf(d) { return KINDS[d && d.k] || KINDS.brit; }

  // ---------- הנוסח ----------
  function whenText(d) {
    var dt = parseDate(d.dt);
    if (!dt) return 'ביום ___';
    return (dt.getDay() === 6 ? 'בשבת קודש, ' : 'ביום ' + DAYS[dt.getDay()] + ', ') + dateText(dt, d.fm);
  }
  function prayerName(d) { return d.shp === 'mincha' ? 'מנחה' : d.shp === 'arvit' ? 'ערבית' : 'שחרית'; }
  function timeText(d) {
    var t = d.tm ? 'בשעה ' + hm(d.tm) : 'בשעה ___', K = kindOf(d);
    if (!d.sh) return t;
    var pray = 'תפילת ' + prayerName(d) + (d.k === 'zeved' ? ' וקריאת השם' : '') + ' ' + hm(d.sh);
    return pray + ' · ' + (d.k === 'zeved' ? 'הקידוש' : K.the) + ' ' + hm(d.tm || '___');
  }
  // שלום זכר: ליל השבת שלפני הברית (יום שישי האחרון לפני יום הברית)
  function szText(d) {
    var dt = parseDate(d.dt);
    if (!dt) return '';
    var fri = new Date(dt); fri.setDate(dt.getDate() - (((dt.getDay() - 5) + 7) % 7 || 7));
    var sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    var when = d.fm === 'greg' ? 'ביום שישי בערב, ' + greg(fri) : d.fm === 'heb' ? 'בליל שבת קודש, ' + hebrew(sat) : 'בליל שבת קודש, ' + hebrew(sat) + ' (' + greg(fri) + ')';
    return 'שלום זכר ' + when + szMore(d);
  }
  function szMore(d) { return (d.szt ? ', בשעה ' + hm(d.szt) : '') + (d.szp ? ', ב' + stripB(d.szp) : ''); }
  function stripB(s) { return s.replace(/^ב(?=בית|אולם|בית\s)/, ''); }
  function signText(d) {
    var par = (d.par || '').trim(), fam = (d.fam || '').trim();
    if (par && fam) return par + ' ' + fam;
    if (fam) return 'משפחת ' + fam;
    return par;
  }
  function seudahText(d) { return kindOf(d).seudah + (d.sep ? ' ב' + stripB(d.sep) : ''); }
  function kohenText(d) { return d.k === 'pidyon' && d.kh ? 'הכהן: ' + d.kh.trim() : ''; }

  // רשימת השורות לציור. size ביחידות של הקנבס המלא (1080).
  function blocks(d, th) {
    var b = [], K = kindOf(d);
    var T = th.titleFont, B = th.bodyFont;
    var v = +d.vs || 0, verse = K.verses[v];
    if (verse) { b.push({ t: verse, size: 36, w: 400, f: SERIF, c: th.accent, gap: 0 }); b.push({ t: K.srcs[v], size: 24, w: 400, f: SANS, c: th.muted, gap: 6 }); }
    b.push({ t: K.open[0], size: 40, w: 500, f: B, c: th.text, gap: verse ? 40 : 0 });
    b.push({ t: K.open[1], size: 40, w: 400, f: B, c: th.text, gap: 10 });
    b.push({ t: K.open[2], size: 40, w: 400, f: B, c: th.text, gap: 6 });
    b.push({ t: K.title, size: 120, w: 700, f: T, c: th.title, gap: 36, lh: 1.15 });
    if (K.sub) b.push({ t: K.sub, size: 52, w: 600, f: T, c: th.title, gap: 0, lh: 1.2 });
    b.push({ sep: true, gap: 10 });
    b.push({ t: d.k === 'brit' ? 'תתקיים בעזרת ה׳' : 'שתתקיים בעזרת ה׳', size: 38, w: 400, f: B, c: th.text, gap: 18 });
    b.push({ t: whenText(d), size: 50, w: 600, f: B, c: th.strong, gap: 8 });
    b.push({ t: timeText(d), size: 46, w: 600, f: B, c: th.strong, gap: 6 });
    b.push({ t: d.pl ? stripB(d.pl) : 'המקום ___', size: 46, w: 500, f: B, c: th.text, gap: 30 });
    if (d.ad) b.push({ t: d.ad, size: 34, w: 400, f: SANS, c: th.muted, gap: 4 });
    if (kohenText(d)) b.push({ t: kohenText(d), size: 34, w: 400, f: B, c: th.text, gap: 24 });
    if (d.se) b.push({ t: seudahText(d), size: 34, w: 400, f: B, c: th.text, gap: 28 });
    if (d.sz && d.k === 'brit') { // בשתי שורות, כדי שהשבירה תיפול במקום טבעי
      var more = szMore(d).replace(/^, /, '');
      b.push({ t: szText(d).slice(0, szText(d).length - szMore(d).length), size: 34, w: 400, f: B, c: th.text, gap: d.se ? 8 : 28 });
      if (more) b.push({ t: more, size: 34, w: 400, f: B, c: th.text, gap: 0 });
    }
    var sign = signText(d);
    if (sign) b.push({ t: sign, size: 50, w: 600, f: T, c: th.title, gap: 46 });
    if (d.gp) b.push({ t: d.gp, size: 32, w: 400, f: B, c: th.muted, gap: 10 });
    return b;
  }

  // ---------- עיצובים ----------
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function diamond(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill(); }
  function star8(ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 16; i++) { var a = Math.PI / 8 * i, rr2 = i % 2 ? r * 0.55 : r; ctx.lineTo(x + rr2 * Math.cos(a), y + rr2 * Math.sin(a)); }
    ctx.closePath();
  }
  function leaf(ctx, x, y, len, ang, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.28, 0, 0); ctx.fill();
    ctx.restore();
  }
  function sprig(ctx, x, y, ang, scale) { // ענף עם עלים ופרחים קטנים
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
    ctx.strokeStyle = '#8fa58b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(120, 30, 260, 10); ctx.stroke();
    for (var i = 0; i < 6; i++) {
      var t = 30 + i * 40;
      leaf(ctx, t, 8 + i * 1.5, 70 - i * 6, -0.9 + (i % 2) * 0.15, i % 2 ? '#a9bda4' : '#9db39a');
      leaf(ctx, t + 18, 12, 62 - i * 6, 0.85, '#b7c8b2');
    }
    var fl = [[80, -40], [175, -30], [250, 36], [140, 58]];
    fl.forEach(function (p, k) {
      for (var j = 0; j < 5; j++) { var a = j * 2 * Math.PI / 5; ctx.fillStyle = k % 2 ? '#efc9c2' : '#e7b7b0'; ctx.beginPath(); ctx.arc(p[0] + 13 * Math.cos(a), p[1] + 13 * Math.sin(a), 11, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#d9a35c'; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 7); ctx.fill();
    });
    ctx.restore();
  }

  var THEMES = {
    zahav: {
      name: 'קלאסי זהב', titleFont: SERIF, bodyFont: SERIF,
      title: '#dcbb74', text: '#efe6d2', strong: '#fbf5e7', muted: '#a99c82', accent: '#c9a55c', box: [130, 150, 130, 150],
      bg: function (ctx) {
        ctx.fillStyle = '#16130f'; ctx.fillRect(0, 0, W, H);
        var g = ctx.createRadialGradient(W * 0.75, 0, 50, W * 0.75, 0, 1100); g.addColorStop(0, 'rgba(201,165,92,.22)'); g.addColorStop(1, 'rgba(201,165,92,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#c9a55c'; ctx.lineWidth = 3; ctx.strokeRect(46, 46, W - 92, H - 92);
        ctx.lineWidth = 1.5; ctx.strokeRect(62, 62, W - 124, H - 124);
        ctx.fillStyle = '#c9a55c';
        [[46, 46], [W - 46, 46], [46, H - 46], [W - 46, H - 46]].forEach(function (p) { diamond(ctx, p[0], p[1], 14); });
      },
      sep: function (ctx, y) {
        var g = ctx.createLinearGradient(W / 2 - 220, 0, W / 2 + 220, 0); g.addColorStop(0, 'rgba(201,165,92,0)'); g.addColorStop(0.5, '#c9a55c'); g.addColorStop(1, 'rgba(201,165,92,0)');
        ctx.fillStyle = g; ctx.fillRect(W / 2 - 220, y, 440, 2); ctx.fillStyle = '#c9a55c'; diamond(ctx, W / 2, y + 1, 8);
      }
    },
    modern: {
      name: 'מודרני נקי', titleFont: SANS, bodyFont: SANS,
      title: '#111111', text: '#2a2a2a', strong: '#111111', muted: '#7a7a7a', accent: '#a8843f', box: [200, 150, 160, 150], creditY: H - 116, bsd: [W / 2, 145, 'center'],
      bg: function (ctx) {
        ctx.fillStyle = '#fbfaf7'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#111'; ctx.fillRect(W / 2 - 40, 84, 80, 4); ctx.fillRect(W / 2 - 40, H - 88, 80, 4);
      },
      sep: function (ctx, y) { ctx.fillStyle = '#a8843f'; ctx.fillRect(W / 2 - 60, y, 120, 3); }
    },
    yerushalmi: {
      name: 'ירושלמי', titleFont: SERIF, bodyFont: SERIF,
      title: '#7a5426', text: '#4a3a24', strong: '#3a2c18', muted: '#7d6a4c', accent: '#8a6a3a', box: [250, 150, 130, 150], bsd: [W / 2, 182, 'center'],
      bg: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f1e6cc'); g.addColorStop(1, '#e3d1aa');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // אבן ירושלמית: נדבכים חלשים
        ctx.strokeStyle = 'rgba(122,84,38,.08)'; ctx.lineWidth = 2;
        for (var row = 0, y = 0; y < H; row++, y += 90) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          for (var x = (row % 2) * 90; x < W; x += 180) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 90); ctx.stroke(); }
        }
        // קשת
        ctx.fillStyle = 'rgba(251,245,231,.82)';
        var L = 70, R = W - 70, top = 70, bot = H - 70, cx = W / 2;
        ctx.beginPath(); ctx.moveTo(L, bot); ctx.lineTo(L, 380); ctx.quadraticCurveTo(L, top, cx, top); ctx.quadraticCurveTo(R, top, R, 380); ctx.lineTo(R, bot); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(L + 16, bot - 16); ctx.lineTo(L + 16, 384); ctx.quadraticCurveTo(L + 16, top + 16, cx, top + 16); ctx.quadraticCurveTo(R - 16, top + 16, R - 16, 384); ctx.lineTo(R - 16, bot - 16); ctx.closePath();
        ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#8a6a3a'; diamond(ctx, cx, top + 50, 10);
      },
      sep: function (ctx, y) { ctx.fillStyle = '#8a6a3a'; ctx.fillRect(W / 2 - 150, y, 300, 2); diamond(ctx, W / 2 - 160, y + 1, 6); diamond(ctx, W / 2 + 160, y + 1, 6); }
    },
    prachim: {
      name: 'פרחוני עדין', titleFont: SERIF, bodyFont: SERIF,
      title: '#a2645d', text: '#4b4a45', strong: '#34332f', muted: '#86837a', accent: '#8fa58b', box: [230, 150, 210, 150], bsd: [W / 2, 130, 'center'],
      bg: function (ctx) {
        ctx.fillStyle = '#fdf8f3'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(162,100,93,.35)'; ctx.lineWidth = 2; rr(ctx, 50, 50, W - 100, H - 100, 40); ctx.stroke();
        sprig(ctx, W - 60, 70, Math.PI * 0.8, 1.15);
        sprig(ctx, 60, H - 70, -Math.PI * 0.2, 1.15);
      },
      sep: function (ctx, y) {
        ctx.fillStyle = '#e7b7b0';
        for (var j = 0; j < 5; j++) { var a = j * 2 * Math.PI / 5; ctx.beginPath(); ctx.arc(W / 2 + 9 * Math.cos(a), y + 9 * Math.sin(a), 8, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#d9a35c'; ctx.beginPath(); ctx.arc(W / 2, y, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#9db39a'; ctx.fillRect(W / 2 - 170, y - 1, 140, 2); ctx.fillRect(W / 2 + 30, y - 1, 140, 2);
      }
    },
    sfaradi: {
      name: 'ספרדי', titleFont: SERIF, bodyFont: SERIF,
      title: '#e6c27a', text: '#efe6d6', strong: '#fff8ea', muted: '#b9c4c0', accent: '#e6c27a', box: [170, 170, 190, 170], creditY: H - 132, bsd: [W - 140, 168, 'right'],
      bg: function (ctx) {
        var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0e4552'); g.addColorStop(1, '#0a2f3a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        // מסגרת של כוכבי שמונה, כמו אריחים
        ctx.strokeStyle = '#d6b066'; ctx.lineWidth = 2;
        var step = 66, m = 66;
        for (var x = m; x <= W - m + 1; x += (W - 2 * m) / Math.round((W - 2 * m) / step)) { star8(ctx, x, m, 20); ctx.stroke(); star8(ctx, x, H - m, 20); ctx.stroke(); }
        for (var y = m; y <= H - m + 1; y += (H - 2 * m) / Math.round((H - 2 * m) / step)) { star8(ctx, m, y, 20); ctx.stroke(); star8(ctx, W - m, y, 20); ctx.stroke(); }
        ctx.lineWidth = 1.5; ctx.strokeRect(112, 112, W - 224, H - 224);
        ctx.fillStyle = 'rgba(214,176,102,.12)';
        [[112, 112], [W - 112, 112], [112, H - 112], [W - 112, H - 112]].forEach(function (p) { star8(ctx, p[0], p[1], 34); ctx.fill(); });
      },
      sep: function (ctx, y) { ctx.fillStyle = '#e6c27a'; star8(ctx, W / 2, y, 14); ctx.fill(); ctx.fillRect(W / 2 - 180, y - 1, 150, 2); ctx.fillRect(W / 2 + 30, y - 1, 150, 2); }
    }
  };
  var ORDER = ['zahav', 'modern', 'yerushalmi', 'prachim', 'sfaradi'];

  // ---------- ציור ----------
  function wrap(ctx, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function draw(canvas, d) {
    var th = THEMES[d.st] || THEMES.zahav;
    var px = canvas.width / W;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(px, 0, 0, px, 0, 0);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    th.bg(ctx);
    var box = th.box, maxW = W - box[1] - box[3], top = box[0], availH = H - box[0] - box[2];
    var bsd = th.bsd || [W - 100, 118, 'right'];
    ctx.textAlign = bsd[2]; ctx.fillStyle = th.muted; ctx.font = '400 30px ' + SERIF; ctx.fillText('בס״ד', bsd[0], bsd[1]);
    ctx.textAlign = 'center';
    var bl = blocks(d, th), k = 1, laid, total;
    for (var tries = 0; tries < 14; tries++) { // מקטינים עד שהכול נכנס
      total = 0; laid = [];
      bl.forEach(function (b, i) {
        var gap = (i ? b.gap : 0) * k;
        if (b.sep) { laid.push({ sep: true, y: total + gap + 14 * k }); total += gap + 30 * k; return; }
        var size = b.size * k;
        ctx.font = b.w + ' ' + size + 'px ' + b.f;
        var lines = wrap(ctx, b.t, maxW), lh = size * (b.lh || 1.4);
        laid.push({ b: b, size: size, lines: lines, y: total + gap, lh: lh });
        total += gap + lines.length * lh;
      });
      if (total <= availH) break;
      k *= 0.94;
    }
    // שורת קרדיט עדינה בתחתית: כל העברה של התמונה מביאה עוד הורים
    ctx.font = '400 22px ' + SANS; ctx.fillStyle = th.muted; ctx.globalAlpha = 0.75;
    ctx.fillText('הודעה כזאת בחינם: hakelim.com/mohel/hazmana', W / 2, th.creditY || H - 92);
    ctx.globalAlpha = 1;
    var y0 = top + (availH - total) / 2;
    laid.forEach(function (l) {
      if (l.sep) { th.sep(ctx, y0 + l.y); return; }
      ctx.font = l.b.w + ' ' + l.size + 'px ' + l.b.f;
      ctx.fillStyle = l.b.c;
      l.lines.forEach(function (line, j) { ctx.fillText(line, W / 2, y0 + l.y + l.lh * j + l.size * 0.95); });
    });
  }
  var fontsReady = (document.fonts && document.fonts.load) ? Promise.all([
    document.fonts.load('700 40px "Frank Ruhl Libre"'), document.fonts.load('400 40px "Frank Ruhl Libre"'),
    document.fonts.load('400 40px "Assistant"'), document.fonts.load('700 40px "Assistant"')
  ]).catch(function () {}) : Promise.resolve();

  // ---------- קישורים: Waze, מפות, יומן, דף אורחים ----------
  function enc(d) {
    var bytes = new TextEncoder().encode(JSON.stringify(d)), bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function dec(s) {
    var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  var PUB = ['k', 'dt', 'tm', 'sh', 'shp', 'pl', 'ad', 'fm', 'par', 'fam', 'gp', 'vs', 'se', 'sep', 'sz', 'szt', 'szp', 'st', 'kh'];
  function pubOf(d) { var o = {}; PUB.forEach(function (k) { if (d[k] && !(k === 'k' && d[k] === 'brit')) o[k] = d[k]; }); return o; }
  // האירוע שנוצר ב-Worker (מזהה קצר + טוקן ניהול), נשמר בטלפון של ההורים
  var evt = null;
  try { evt = JSON.parse(localStorage.getItem(EV_STORE) || 'null'); } catch (e) {}
  function shortUrl(id, gid) { return location.origin + '/mohel/hazmana/v/?e=' + id + (gid ? '&g=' + gid : ''); }
  function adminUrl(e) { return location.origin + '/mohel/hazmana/m/?e=' + e.id + '&t=' + e.tok; }
  function hashUrl(d) { return location.origin + '/mohel/hazmana/v/#d=' + enc(pubOf(d)); }
  // קישור לאורחים: קצר כשיש אירוע ברשת ופרטיו מעודכנים, אחרת הקישור הארוך (עובד גם בלי רשת)
  function guestUrl(d) {
    return (evt && evt.sig === JSON.stringify(pubOf(d))) ? shortUrl(evt.id) : hashUrl(d);
  }
  function placeQuery(d) { return [stripB(d.pl || ''), d.ad || ''].filter(String).join(', '); }
  function wazeUrl(d) { return 'https://waze.com/ul?q=' + encodeURIComponent(placeQuery(d)) + '&navigate=yes'; }
  function mapsUrl(d) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(placeQuery(d)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // שעה בישראל → UTC (בלי ספריות: בודקים את ההפרש של Asia/Jerusalem באותו רגע)
  function israelToUtc(dt, tm) {
    var p = dt.split('-').map(Number), t = (tm || '10:00').split(':').map(Number);
    var guess = Date.UTC(p[0], p[1] - 1, p[2], t[0], t[1]);
    var f = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    var o = {}; f.formatToParts(new Date(guess)).forEach(function (x) { o[x.type] = x.value; });
    var asIl = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute);
    return new Date(guess - (asIl - guess));
  }
  function utcStamp(x) { return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()) + 'T' + pad(x.getUTCHours()) + pad(x.getUTCMinutes()) + '00Z'; }
  function calTitle(d) { var s = signText(d); return kindOf(d).name + (s ? ' – ' + s : ''); }
  function calTimes(d) { var a = israelToUtc(d.dt, d.sh || d.tm); return [a, new Date(a.getTime() + (d.sh ? 3 : 2) * 3600e3)]; }
  function calDetails(d) { return timeText(d) + '\n' + guestUrl(d) + '\n\nהודעה כזאת לשמחה שלכם, בחינם: ' + location.origin + '/mohel/hazmana/?utm_source=calendar&utm_medium=hazmana'; }
  function gcalUrl(d) {
    var t = calTimes(d);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(calTitle(d)) +
      '&dates=' + utcStamp(t[0]) + '/' + utcStamp(t[1]) + '&location=' + encodeURIComponent(placeQuery(d)) +
      '&details=' + encodeURIComponent(calDetails(d));
  }
  function icsData(d) {
    var t = calTimes(d), esc = function (s) { return s.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n'); };
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//gilad-rachamim//hazmana//HE', 'BEGIN:VEVENT',
      'UID:' + Date.now() + '@hakelim.com', 'DTSTAMP:' + utcStamp(new Date()),
      'DTSTART:' + utcStamp(t[0]), 'DTEND:' + utcStamp(t[1]),
      'SUMMARY:' + esc(calTitle(d)), 'LOCATION:' + esc(placeQuery(d)), 'DESCRIPTION:' + esc(calDetails(d)),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  }
  function waText(d) {
    var dt = parseDate(d.dt), L = [], K = kindOf(d);
    L.push('בס״ד');
    L.push(K.wa[0]);
    L.push(K.wa[1] + whenText(d) + ', ' + timeText(d) + '.');
    L.push('📍 ' + placeQuery(d));
    if (kohenText(d)) L.push(kohenText(d) + '.');
    if (d.se) L.push(seudahText(d) + '.');
    if (d.sz && d.k === 'brit' && dt) L.push(szText(d) + '.');
    L.push('');
    L.push('ניווט: ' + wazeUrl(d));
    L.push('ההודעה המלאה והוספה ליומן: ' + guestUrl(d));
    var s = signText(d); if (s) { L.push(''); L.push(s); }
    return L.join('\n');
  }

  // ---------- מודעה לבית הכנסת (A4 לאורך, עם QR) ----------
  var PH = Math.round(W * 1.4142); // יחס A4
  var qrCache = {};
  function qrCanvas(url, size) {
    if (!window.QRCode) return null;
    var key = url + '|' + size;
    if (qrCache[key]) return qrCache[key];
    var div = document.createElement('div');
    new window.QRCode(div, { text: url, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.L });
    var c = div.querySelector('canvas');
    if (c) qrCache[key] = c;
    return c;
  }
  // מחזיר את מלבן ה-QR (ביחידות הקנבס) כדי שה-PDF יוכל לשים עליו קישור
  function drawPoster(canvas, d, url) {
    var th = THEMES[d.st] || THEMES.zahav;
    var px = canvas.width / W;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(px, 0, 0, px, 0, 0);
    ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
    var H0 = H; H = PH; try { th.bg(ctx); } finally { H = H0; } // הרקעים מציירים לפי H – לרגע הוא גובה A4
    var bsd = th.bsd || [W - 100, 118, 'right'];
    ctx.textAlign = bsd[2]; ctx.fillStyle = th.muted; ctx.font = '400 30px ' + SERIF; ctx.fillText('בס״ד', bsd[0], bsd[1]);
    ctx.textAlign = 'center';
    var B = th.bodyFont, T = th.titleFont, b = [], K = kindOf(d);
    b.push({ t: K.name, size: 170, w: 700, f: T, c: th.title, gap: 0, lh: 1.1 });
    if (K.sub) b.push({ t: K.sub, size: 64, w: 600, f: T, c: th.title, gap: 0, lh: 1.2 });
    b.push({ sep: true, gap: 16 });
    b.push({ t: K.open[0] + ', ' + K.open[1], size: 36, w: 400, f: B, c: th.text, gap: 24 });
    b.push({ t: K.open[2] + (d.k === 'brit' ? '' : ' ' + K.full), size: 36, w: 400, f: B, c: th.text, gap: 6 });
    b.push({ t: whenText(d), size: 62, w: 700, f: B, c: th.strong, gap: 44 });
    b.push({ t: timeText(d), size: 54, w: 600, f: B, c: th.strong, gap: 10 });
    b.push({ t: d.pl ? stripB(d.pl) : 'המקום ___', size: 54, w: 500, f: B, c: th.text, gap: 30 });
    if (d.ad) b.push({ t: d.ad, size: 38, w: 400, f: SANS, c: th.muted, gap: 6 });
    if (kohenText(d)) b.push({ t: kohenText(d), size: 36, w: 400, f: B, c: th.text, gap: 24 });
    if (d.se) b.push({ t: seudahText(d), size: 36, w: 400, f: B, c: th.text, gap: 28 });
    var sign = signText(d);
    if (sign) b.push({ t: sign, size: 58, w: 600, f: T, c: th.title, gap: 44 });
    if (d.gp) b.push({ t: d.gp, size: 32, w: 400, f: B, c: th.muted, gap: 10 });
    var qs = 300, box = th.box, maxW = W - box[1] - box[3], top = box[0] + 20, qrTop = PH - box[2] - qs - 90, availH = qrTop - top - 40;
    var k = 1, laid, total;
    for (var tries = 0; tries < 14; tries++) {
      total = 0; laid = [];
      b.forEach(function (x, i) {
        var gap = (i ? x.gap : 0) * k;
        if (x.sep) { laid.push({ sep: true, y: total + gap + 14 * k }); total += gap + 30 * k; return; }
        var size = x.size * k;
        ctx.font = x.w + ' ' + size + 'px ' + x.f;
        var lines = wrap(ctx, x.t, maxW), lh = size * (x.lh || 1.35);
        laid.push({ b: x, size: size, lines: lines, y: total + gap, lh: lh });
        total += gap + lines.length * lh;
      });
      if (total <= availH) break;
      k *= 0.94;
    }
    var y0 = top + (availH - total) / 2;
    laid.forEach(function (l) {
      if (l.sep) { th.sep(ctx, y0 + l.y); return; }
      ctx.font = l.b.w + ' ' + l.size + 'px ' + l.b.f; ctx.fillStyle = l.b.c;
      l.lines.forEach(function (line, j) { ctx.fillText(line, W / 2, y0 + l.y + l.lh * j + l.size * 0.95); });
    });
    // QR על רקע לבן, עם כיתוב
    var qx = W / 2 - qs / 2, qy = qrTop;
    ctx.fillStyle = '#fff'; rr(ctx, qx - 16, qy - 16, qs + 32, qs + 32, 18); ctx.fill();
    var qc = qrCanvas(url, qs);
    if (qc) ctx.drawImage(qc, qx, qy, qs, qs);
    ctx.font = '600 34px ' + SANS; ctx.fillStyle = th.strong; ctx.fillText('סורקים: ניווט ואישור הגעה', W / 2, qy + qs + 66);
    ctx.font = '400 22px ' + SANS; ctx.fillStyle = th.muted; ctx.globalAlpha = 0.75;
    ctx.fillText('מודעה כזאת בחינם: hakelim.com/mohel/hazmana', W / 2, PH - (th.creditY ? H - th.creditY : 92)); // אותו מרחק מהמסגרת כמו בתמונה
    ctx.globalAlpha = 1;
    return { x: qx - 16, y: qy - 16, w: qs + 32, h: qs + 32 };
  }

  // ---------- PDF (jsPDF מ-cdnjs; הטקסט העברי נשאר תמונה, הקישורים הם annotations) ----------
  var CREDIT_URL = 'https://hakelim.com/mohel/hazmana/?utm_source=pdf&utm_medium=hazmana';
  function jsPdf() { return window.jspdf && window.jspdf.jsPDF ? new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }) : null; }
  // שורת כפתורים מצוירת (עברית על קנבס), עם המלבן של כל כפתור כדי לשים עליו קישור
  function linkStrip(th, bgColor, items) {
    var c = document.createElement('canvas'); c.width = W; c.height = 130;
    var ctx = c.getContext('2d'); ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, 130);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 30px ' + SANS;
    var gap = 24, pad = 44, widths = items.map(function (it) { return ctx.measureText(it.label).width + pad * 2; });
    var total = widths.reduce(function (a, b) { return a + b; }, 0) + gap * (items.length - 1), x = W / 2 + total / 2, rects = [];
    items.forEach(function (it, i) {
      var w = widths[i]; x -= w;
      ctx.strokeStyle = th.accent; ctx.lineWidth = 3; rr(ctx, x, 25, w, 80, 40); ctx.stroke();
      ctx.fillStyle = th.strong; ctx.fillText(it.label, x + w / 2, 66);
      rects.push({ x: x, y: 25, w: w, h: 80, url: it.url });
      x -= gap;
    });
    return { canvas: c, rects: rects };
  }
  function pixelAt(canvas, x, y) { var p = canvas.getContext('2d').getImageData(x, y, 1, 1).data; return 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')'; }
  function messagePdf(canvas, d) {
    var doc = jsPdf(); if (!doc) return null;
    var th = THEMES[d.st] || THEMES.zahav, px = canvas.width / W;
    var mx = 20, my = 12, iw = 170, ih = iw * H / W, s = iw / W; // מ"מ לכל יחידת קנבס
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', mx, my, iw, ih);
    doc.link(mx, my + (th.creditY || H - 92) * s - 7, iw, 9, { url: CREDIT_URL }); // שורת הקרדיט בתמונה
    var strip = linkStrip(th, pixelAt(canvas, Math.round(canvas.width / 2), canvas.height - 10 * px), [
      { label: 'ניווט ב-Waze', url: wazeUrl(d) }, { label: 'ליומן גוגל', url: gcalUrl(d) }, { label: 'הקישור לאורחים', url: guestUrl(d) }]);
    var sy = my + ih + 4, sh = 130 * s;
    doc.addImage(strip.canvas.toDataURL('image/jpeg', 0.92), 'JPEG', mx, sy, iw, sh);
    strip.rects.forEach(function (r) { doc.link(mx + r.x * s, sy + r.y * s, r.w * s, r.h * s, { url: r.url }); });
    return doc;
  }
  function posterPdf(d, url) {
    var doc = jsPdf(); if (!doc) return null;
    var c = document.createElement('canvas'); c.width = 1240; c.height = Math.round(1240 * PH / W);
    var q = drawPoster(c, d, url), s = 210 / W;
    doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
    doc.link(q.x * s, q.y * s, q.w * s, q.h * s, { url: url });
    doc.link(0, 297 - 10, 210, 9, { url: CREDIT_URL });
    return doc;
  }

  // ---------- עזרים לממשק ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function copy(text, btn) {
    var done = function () { var o = btn.innerHTML; btn.textContent = 'הועתק ✓'; setTimeout(function () { btn.innerHTML = o; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done(); }
  }
  function fileName(d) { return kindOf(d).slug + '-' + (d.dt || 'hazmana') + '.png'; }
  function firstName(n) { return (n || '').trim().split(/\s+/)[0]; }

  // משותף לדף הניהול (assets/rsvp-admin.js)
  window.__hz = { hebrew: hebrew, greg: greg, parseDate: parseDate, hm: hm, szText: szText, waText: waText, israelToUtc: israelToUtc,
    guestUrl: guestUrl, shortUrl: shortUrl, hashUrl: hashUrl, dec: dec, draw: draw, drawPoster: drawPoster, fontsReady: fontsReady, api: api, API: API,
    whenText: whenText, timeText: timeText, signText: signText, placeQuery: placeQuery, wazeUrl: wazeUrl, stripB: stripB, copy: copy, ev: ev, firstName: firstName, kindOf: kindOf, KINDS: KINDS };

  // =========================================================
  // דף האורחים
  // =========================================================
  var guest = $('#hz-guest');
  if (guest) {
    var q = new URLSearchParams(location.search), eid = q.get('e') || '', gid = q.get('g') || '';
    var gd = null;
    if (eid) {
      api('/ev/' + encodeURIComponent(eid) + (gid ? '?g=' + encodeURIComponent(gid) : '')).then(function (j) { showGuest(j.d, j); }, function () { $('#hz-missing').hidden = false; });
    } else {
      try { gd = dec((location.hash.match(/d=([^&]+)/) || [])[1] || ''); } catch (e) {}
      if (!gd || !gd.dt) { $('#hz-missing').hidden = false; return; }
      showGuest(gd, null);
    }
    return;
  }
  function showGuest(gd, srv) {
    if (!gd || !gd.dt) { $('#hz-missing').hidden = false; return; }
    var gc = $('#hz-guest-canvas'), K = kindOf(gd);
    var bd = parseDate(gd.dt), today = new Date(); today.setHours(0, 0, 0, 0);
    var after = bd && bd < today;
    // טקסטים לפי סוג השמחה (ברירת המחדל ב-HTML היא ברית)
    document.title = K.name + ' – ההודעה, ניווט והוספה ליומן';
    gc.setAttribute('aria-label', 'ההודעה על ' + K.full);
    $('#g-ics').setAttribute('download', K.slug + '.ics');
    if (gd.k && gd.k !== 'brit') {
      $('#hz-after h2').textContent = K.full + ' כבר התקיים. מזל טוב!';
      $('#hz-after .note').textContent = K.bless + '. ואם גם אצלכם בדרך שמחה:';
      $('#hz-after .btn-gold').textContent = 'הזמנה מעוצבת לכל שמחה של תינוק, בחינם';
      $('#hz-after .btn-gold').href = '/mohel/hazmana/kol-simcha/?utm_source=guest_after&utm_medium=hazmana';
      $('#hz-after .btn-line').hidden = true;
      $('#r-bl').placeholder = K.bless; $('#gb-bl').placeholder = K.bless;
      $('label[for=r-bl]').firstChild.textContent = 'ברכה ' + K.baby + ' ';
      $('#gb-form h3').textContent = 'ברכה ' + K.baby;
      $('#hz-rsvp .privacy').firstChild.textContent = 'השם והתשובה נראים רק למשפחה, ונמחקים מעצמם 30 יום אחרי השמחה. ';
      var cr = $('.hz-credit'); if (cr) { cr.firstChild.textContent = 'רוצים הודעה כזאת לשמחה שלכם? '; cr.querySelector('a').href = '/mohel/hazmana/?k=' + K.slug + '&utm_source=guest&utm_medium=hazmana'; }
    }
    if (after) { $('#hz-after').hidden = false; ['#g-nav', '#g-gcal', '#g-ics'].forEach(function (s) { $(s).hidden = true; }); ev('hazmana_guest_after', { kind: K.slug }); }
    fontsReady.then(function () { draw(gc, gd); });
    if (gd.pl || gd.ad) { $('#g-waze').href = wazeUrl(gd); $('#g-maps').href = mapsUrl(gd); } else { $('#g-nav').hidden = true; }
    $('#g-gcal').href = gcalUrl(gd);
    $('#g-ics').href = icsData(gd);
    guest.hidden = false;
    [['#g-waze', 'waze'], ['#g-maps', 'maps'], ['#g-gcal', 'gcal'], ['#g-ics', 'ics']].forEach(function (x) {
      $(x[0]).addEventListener('click', function () { ev('hazmana_guest_click', { action: x[1] }); });
    });
    if (srv && !after) rsvpBlock(gd, srv);
    if (srv) giftBlock(gd, srv, after);
  }
  // "מתנה להורים": קישור Bit / PayBox שההורים הדביקו בלוח. אנחנו לא נוגעים בכסף, רק פותחים את הקישור.
  function giftKind(u) {
    var h = ''; try { h = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return null; }
    var name = /paybox/i.test(h) ? 'PayBox' : /(^|\.)bit(pay)?\.co\.il$|bitpay/i.test(h) ? 'Bit' : '';
    return { host: h, name: name };
  }
  function giftBlock(gd, srv, after) {
    var box = $('#hz-gift'), eid = new URLSearchParams(location.search).get('e');
    var k = srv.gift ? giftKind(srv.gift) : null;
    if (!k && !after) return; // לפני הברית ובלי קישור: הברכה נכתבת בטופס "מגיעים?"
    var sign = signText(gd);
    if (k) {
      $('#gf-btn').href = srv.gift;
      $('#gf-btn').textContent = '🎁 מתנה להורים' + (k.name ? ' ב-' + k.name : '');
      $('#gf-host').innerHTML = 'התשלום נעשה ישירות מול ההורים, בלי עמלה ובלי תיווך. נפתח באתר <bdi dir="ltr">' + k.host.replace(/[&<>"]/g, '') + '</bdi>';
      $('#gf-txt').textContent = after ? 'לא הספקתם להגיע? ' + (sign ? sign + ' ישמחו' : 'ההורים ישמחו') + ' גם במתנה ובברכה.' : 'רוצים לשמח את ההורים? אפשר לשלוח מתנה ישר מהטלפון.';
      $('#gf-btn').addEventListener('click', function () { ev('rsvp_gift_click', { provider: k.name || k.host, after: after ? 1 : 0 }); });
    } else {
      ['#gf-btn', '#gf-host'].forEach(function (s) { $(s).hidden = true; });
      $('#hz-gift h2').textContent = 'ברכה ' + kindOf(gd).baby;
      $('#gf-txt').textContent = (sign ? sign + ' ישמחו' : 'ההורים ישמחו') + ' לקרוא ברכה מכם.';
    }
    if (after) { // אחרי הברית אין "מגיעים?", אז הברכה נשלחת כאן
      var f = $('#gb-form'), KEY = 'mohel-bracha-' + eid, mine = null;
      try { mine = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      if (srv.g) f.elements.n.value = srv.g.n;
      var done = function (m) { f.hidden = true; $('#gb-done').hidden = false; $('#gb-done').textContent = 'תודה! הברכה נשלחה להורים 💛'; };
      if (mine) done(mine); else f.hidden = false;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!f.reportValidity()) return;
        var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'שולח…'; $('#gb-err').hidden = true;
        var body = { n: f.elements.n.value.trim(), bl: f.elements.bl.value.trim(), bid: mine && mine.bid, website: f.elements.website.value };
        api('/ev/' + encodeURIComponent(eid) + '/bracha', body).then(function (j) {
          mine = { bid: j.bid }; try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (err) {}
          done(mine); ev('rsvp_bracha', { after: 1 });
        }, function (err) { $('#gb-err').textContent = err.message || 'לא הצלחנו לשלוח. נסו שוב.'; $('#gb-err').hidden = false; }).then(function () { btn.disabled = false; btn.textContent = 'שליחת הברכה להורים'; });
      });
    }
    box.hidden = false;
  }
  // "מגיעים? כמה?" – רק כשההודעה נפתחה מהקישור הקצר (יש אירוע ב-Worker)
  function rsvpBlock(gd, srv) {
    var box = $('#hz-rsvp'), f = $('#r-form'), done = $('#r-done'), eid = new URLSearchParams(location.search).get('e'), gid = srv.g ? new URLSearchParams(location.search).get('g') : '';
    var KEY = 'mohel-rsvp-' + eid + (gid ? '-' + gid : ''), mine = null;
    try { mine = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var sign = signText(gd);
    $('#r-hi').textContent = srv.g ? 'שלום ' + srv.g.n + '! ' + (sign ? sign + ' ישמחו' : 'המשפחה תשמח') + ' לדעת אם תגיעו.' : (sign ? sign + ' ישמחו' : 'המשפחה תשמח') + ' לדעת אם תגיעו.';
    if (srv.g) f.elements.n.value = srv.g.n;
    var a = srv.a || mine;
    function fill(a) { if (!a) return; f.elements.n.value = a.n || f.elements.n.value; f.elements.note.value = a.note || ''; f.elements.bl.value = a.bl || ''; f.elements.c.value = a.c || 1; var r = f.querySelector('input[name=ok][value="' + (a.ok ? 1 : 0) + '"]'); if (r) r.checked = true; }
    function showDone(a) { f.hidden = true; done.hidden = false; $('#r-done-txt').textContent = a.ok ? 'תודה! נרשם: ' + (a.c > 1 ? a.c + ' מגיעים' : 'מגיעים') + '. נתראה בשמחה 🎉' : 'תודה שעדכנתם. נתראה בשמחות הבאות.'; }
    function toggleCount() { var ok = f.querySelector('input[name=ok]:checked'); $('#r-cwrap').hidden = !(ok && ok.value === '1'); }
    f.addEventListener('change', toggleCount);
    if (a) { fill(a); showDone(a); } else toggleCount();
    $('#r-edit').addEventListener('click', function () { done.hidden = true; f.hidden = false; toggleCount(); f.elements.n.focus(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = f.querySelector('input[name=ok]:checked');
      if (!ok) { $('#r-err').textContent = 'סמנו אם אתם מגיעים'; $('#r-err').hidden = false; return; }
      if (!f.reportValidity()) return;
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'שולח…';
      $('#r-err').hidden = true;
      var body = { g: gid, aid: mine && mine.aid, n: f.elements.n.value.trim(), c: f.elements.c.value, ok: ok.value === '1' ? 1 : 0, note: f.elements.note.value.trim(), bl: f.elements.bl.value.trim(), website: f.elements.website.value };
      api('/ev/' + encodeURIComponent(eid) + '/rsvp', body).then(function (j) {
        var saved = { aid: j.aid, n: body.n, c: +body.c, ok: body.ok, note: body.note, bl: body.bl };
        try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (err) {}
        mine = saved; showDone(saved); ev('rsvp_answer', { ok: body.ok, count: +body.c, personal: gid ? 1 : 0, bracha: body.bl ? 1 : 0 });
      }, function (err) { $('#r-err').textContent = err.message || 'לא הצלחנו לשלוח. נסו שוב.'; $('#r-err').hidden = false; }).then(function () { btn.disabled = false; btn.textContent = 'שליחת התשובה'; });
    });
    box.hidden = false;
  }

  // =========================================================
  // המחולל
  // =========================================================
  var form = $('#hz-form');
  if (!form) return;
  var big = $('#hz-canvas');
  var data = {};
  var STORE = 'mohel-hazmana';

  function read() {
    var d = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'radio') { if (el.checked) d[el.name] = el.value; }
      else if (el.type === 'checkbox') d[el.name] = el.checked ? 1 : 0;
      else d[el.name] = el.value.trim();
    });
    var st = document.querySelector('input[name="st"]:checked');
    d.st = st ? st.value : 'zahav';
    return d;
  }
  function restore() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
    if (!s) return;
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in s)) return;
      if (el.type === 'radio') el.checked = el.value === s[el.name];
      else if (el.type === 'checkbox') el.checked = !!s[el.name];
      else el.value = s[el.name];
    });
    var st = document.querySelector('input[name="st"][value="' + s.st + '"]');
    if (st) st.checked = true;
  }
  function toggles() {
    $('#hz-se-more').hidden = !form.elements.se.checked;
    $('#hz-sz-more').hidden = !form.elements.sz.checked || data.k !== 'brit';
    songs();
  }
  // פס השירים בסיום: רק לברית, כי הרשימות נבנו לברית. למחולל אין בחירת נוסח, ולכן הרמז היחיד הוא העיצוב הספרדי.
  function songs() {
    var sf = data.st === 'sfaradi';
    $('#hz-songs').hidden = data.k !== 'brit';
    $('#hz-songs-all').hidden = sf;
    $('#hz-songs-sf').hidden = !sf;
    $('#a-songs-pl').hidden = !sf;
    $('#a-songs').textContent = sf ? 'לכל הסגנונות' : 'לשירים לברית';
  }
  // ---------- איזו שמחה: כל מה שבדף תלוי בסוג ----------
  // טקסטים לכל סוג: [תאריך, שעה, תפילה לפני, כותרת H1, הערה בטופס ההרשמה, "תודה" אחרי ההרשמה, כפתור ווטסאפ לגילעד, שם הסעודה]
  var UI = {
    brit: ['תאריך הברית', 'שעת הברית', 'תפילה לפני הברית', 'הזמנה לברית מילה, בחינם ותוך דקה',
      'השאירו שם וטלפון, ותקבלו את ההזמנה: תמונה, טקסט לווטסאפ וקישור לאורחים. במתנה תקבלו גם את המדריך להורים לקראת הברית.',
      'תודה! המדריך להורים מחכה לכם למטה.', 'לתאם את הברית עם גילעד', 'סעודת מצווה אחרי הברית',
      'ממלאים מתי ואיפה, בוחרים עיצוב, ושולחים לכל המשפחה בווטסאפ. בלי תשלום. משאירים פרטים פעם אחת, ומקבלים במתנה גם את המדריך להורים לקראת הברית.'],
    zeved: ['תאריך זבד הבת', 'שעת הקידוש או הסעודה', 'תפילה וקריאת השם לפני', 'הזמנה לזבד הבת, בחינם ותוך דקה',
      'השאירו שם וטלפון, ותקבלו את ההזמנה: תמונה, טקסט לווטסאפ וקישור לאורחים עם ניווט, יומן ואישורי הגעה.',
      'תודה! ההזמנה שלכם מוכנה.', 'להכיר את גילעד, מוהל בירושלים', 'קידוש וסעודה אחרי התפילה',
      'ממלאים מתי ואיפה, בוחרים עיצוב, ושולחים לכל המשפחה בווטסאפ. בלי תשלום. משאירים פרטים פעם אחת, ומקבלים את ההזמנה, קישור לאורחים ואישורי הגעה.'],
    pidyon: ['תאריך הפדיון', 'שעת הפדיון', 'תפילה לפני הפדיון', 'הזמנה לפדיון הבן, בחינם ותוך דקה',
      'השאירו שם וטלפון, ותקבלו את ההזמנה: תמונה, טקסט לווטסאפ וקישור לאורחים. במתנה תקבלו גם את המדריך להורים, עם הפרק על פדיון הבן.',
      'תודה! המדריך להורים מחכה לכם למטה.', 'שאלה על הפדיון? גילעד בווטסאפ', 'סעודת מצווה אחרי הפדיון',
      'ממלאים מתי ואיפה, בוחרים עיצוב, ושולחים לכל המשפחה בווטסאפ. בלי תשלום. משאירים פרטים פעם אחת, ומקבלים במתנה גם את המדריך להורים, עם הפרק על פדיון הבן.']
  };
  var lastKind = null, wantDefaults = false;
  function applyKind() {
    var k = data.k || 'brit', K = KINDS[k], u = UI[k];
    if (k === lastKind) return;
    var switched = lastKind !== null, defaults = switched || wantDefaults; lastKind = k; wantDefaults = false;
    $('label[for=hz-dt]').textContent = u[0];
    $('label[for=hz-tm]').textContent = u[1];
    $('#hz-sh-label').firstChild.textContent = u[2] + ' ';
    $('#hz-sh-arvit').hidden = k === 'brit';
    if (k === 'brit' && form.elements.shp.value === 'arvit') form.elements.shp.value = 'shacharit';
    $('#hz-kh-wrap').hidden = k !== 'pidyon';
    $('#hz-sz-wrap').hidden = k !== 'brit';
    $('#hz-se-label').textContent = u[7];
    // הפסוקים של הסוג הזה
    var vs = form.elements.vs, cur = vs.value;
    vs.innerHTML = '';
    K.verses.forEach(function (v, i) { var o = document.createElement('option'); o.value = i; o.textContent = i ? v.replace(/[֑-ׇ]/g, '') : 'בלי פסוק'; vs.appendChild(o); });
    vs.value = defaults ? (k === 'zeved' ? '1' : '0') : (cur < K.verses.length ? cur : '0');
    if (defaults && k !== 'brit' && !form.elements.se.checked) form.elements.se.checked = true; // בנוסח המאושר יש סעודה
    var h1 = $('.hero h1'); if (h1) h1.textContent = u[3];
    var sub = $('.hero .sub'); if (sub) sub.textContent = u[8];
    $('#hz-reg .note').textContent = u[4];
    $('#hz-reg [name="מקור"]').value = K.lead;
    $('#r-email-opt').textContent = k === 'zeved' ? '(לא חובה)' : '(לא חובה, לשם יישלח המדריך)';
    $('#hz-thanks').textContent = u[5];
    $('#a-guide').hidden = k === 'zeved';
    $('#a-gilad').lastChild.textContent = ' ' + u[6];
    $('#hz-poster-note').textContent = k === 'brit' ? 'דף A4 באותו עיצוב, עם קוד QR: מי שסורק מנווט ומסמן "מגיעים". תולים בלוח המודעות, בבית הכנסת או בעבודה.' : 'דף A4 באותו עיצוב, עם קוד QR: מי שסורק מנווט ומסמן "מגיעים". תולים בבית הכנסת, בעבודה או בבניין.';
    $('#hz-rsvp-panel .small').textContent = 'הלוח פרטי: רק מי שיש לו את הקישור שלו רואה את הרשימה. שמרו אותו. הנתונים נמחקים מעצמם 30 יום אחרי ' + (k === 'brit' ? 'הברית' : 'השמחה') + '.';
    document.title = u[3] + ' | גילעד רחמים המוהל';
    if (switched) ev('hazmana_kind', { kind: k });
  }
  var timer = null, cached = null;
  function render() {
    data = read();
    applyKind();
    data = read(); // הפסוק והסעודה יכולים להתחלף עם הסוג
    toggles();
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) {}
    clearTimeout(timer);
    timer = setTimeout(function () {
      fontsReady.then(function () {
        draw(big, data);
        cached = null; big.toBlob(function (b) { cached = b; }, 'image/png');
        document.querySelectorAll('.hz-mini canvas').forEach(function (c) {
          var dd = Object.assign({}, data, { st: c.getAttribute('data-st') });
          draw(c, dd);
        });
        if (poster && !acts.hidden) drawPoster(poster, data, guestUrl(data));
      });
    }, 120);
  }
  restore();
  // ?k=zeved / ?k=pidyon (מהדף "לכל שמחה") קובע את הסוג גם אם נשמר אחר בטלפון
  try {
    var qk = new URLSearchParams(location.search).get('k'), rk = qk && KINDS[qk] && form.querySelector('input[name="k"][value="' + qk + '"]');
    if (rk && !rk.checked) { rk.checked = true; wantDefaults = true; } // סוג אחר ממה שנשמר: גם הפסוק והסעודה של הסוג הזה
  } catch (e) {}
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  document.querySelectorAll('input[name="st"]').forEach(function (r) {
    r.addEventListener('change', function () { render(); ev('hazmana_style', { style: r.value }); });
  });
  render();

  // ---------- הרשמה (פעם אחת, נשמרת בטלפון – אותו מפתח כמו טופס המדריך) ----------
  var reg = $('#hz-reg'), acts = $('#hz-acts'), poster = $('#hz-poster');
  function registered() { try { return !!JSON.parse(localStorage.getItem('mohel-lead') || 'null'); } catch (e) { return false; } }
  function showActs() { reg.hidden = true; acts.hidden = false; if (poster) fontsReady.then(function () { drawPoster(poster, data, guestUrl(data)); }); }
  if (registered()) showActs();

  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem('mohel-utm') || '{}'); var q = new URLSearchParams(location.search); ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); }); } catch (e) {}

  function detailsOk() {
    var bad = ['dt', 'tm', 'pl'].filter(function (k) { return !form.elements[k].value; });
    if (!bad.length) return true;
    form.reportValidity();
    form.elements[bad[0]].focus();
    return false;
  }

  reg.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!detailsOk()) return;
    if (!reg.reportValidity()) return;
    if ($('.hp input', reg).value) return; // בוט
    var btn = $('button[type=submit]', reg);
    btn.disabled = true; btn.textContent = 'רגע…';
    var fd = new FormData(reg), K = kindOf(data);
    var dt = parseDate(data.dt);
    fd.set('מקור', K.lead);
    fd.set('מועד הלידה', K.born + ' – ' + K.name + ' ' + (dt ? greg(dt) + ' ' + hm(data.tm) : ''));
    fd.set('עיר', placeQuery(data));
    fd.set('_page', location.pathname);
    Object.keys(utm).forEach(function (k) { fd.set(k, utm[k]); });
    var lead = { n: fd.get('שם'), p: fd.get('טלפון'), e: fd.get('email'), d: 'הזמנה ל' + K.name, c: placeQuery(data), t: Date.now() };
    try { localStorage.setItem('mohel-lead', JSON.stringify(lead)); } catch (err) {}
    ev('generate_lead', { page: location.pathname, source: 'hazmana', kind: K.slug });
    var finish = function () { showActs(); $('#hz-thanks').hidden = false; $('#hz-thanks').focus(); };
    var t = setTimeout(finish, 6000);
    fetch(reg.action, { method: 'POST', body: fd, mode: 'no-cors', keepalive: true }).catch(function () {}).then(function () { clearTimeout(t); finish(); });
  });

  // ---------- פעולות ----------
  function blob() { return cached ? Promise.resolve(cached) : new Promise(function (res) { big.toBlob(res, 'image/png'); }); }
  function download(b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName(data); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  function act(id, fn) { $(id).addEventListener('click', function (e) { if (!detailsOk()) { e.preventDefault(); return; } fn(e); }); }

  act('#a-share', function () {
    ev('hazmana_share', { style: data.st, kind: data.k });
    var go = function (b) {
      var file = new File([b], fileName(data), { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: waText(data) }).catch(function () {});
      } else {
        download(b);
        window.open('https://wa.me/?text=' + encodeURIComponent(waText(data)), '_blank');
      }
    };
    // שיתוף חייב לקרות מיד אחרי הלחיצה (בייחוד באייפון), לכן משתמשים בתמונה שכבר מוכנה
    if (cached) go(cached); else blob().then(go);
  });
  act('#a-down', function () { ev('hazmana_download', { style: data.st, kind: data.k }); blob().then(download); });
  act('#a-pdf', function () {
    ev('hazmana_pdf', { style: data.st, kind: data.k });
    var doc = messagePdf(big, data);
    if (doc) doc.save(kindOf(data).slug + '-' + (data.dt || 'hazmana') + '.pdf'); else alert('ה-PDF לא נטען. בדקו את החיבור לאינטרנט ונסו שוב.');
  });
  act('#a-poster', function () {
    ev('hazmana_print', { style: data.st, kind: data.k });
    var doc = posterPdf(data, guestUrl(data));
    if (doc) doc.save('modaa-' + kindOf(data).slug + '-' + (data.dt || 'hazmana') + '.pdf'); else alert('ה-PDF לא נטען. בדקו את החיבור לאינטרנט ונסו שוב.');
  });
  act('#a-text', function (e) { ev('hazmana_copy_text'); copy(waText(data), e.currentTarget); });
  act('#a-wa', function (e) { ev('hazmana_wa_text'); e.currentTarget.href = 'https://wa.me/?text=' + encodeURIComponent(waText(data)); });
  act('#a-link', function (e) { ev('hazmana_copy_link'); copy(guestUrl(data), e.currentTarget); });
  act('#a-view', function (e) { e.currentTarget.href = guestUrl(data); });
  act('#a-gcal', function (e) { ev('hazmana_calendar', { kind: 'google' }); e.currentTarget.href = gcalUrl(data); });
  act('#a-ics', function (e) { ev('hazmana_calendar', { kind: 'ics' }); e.currentTarget.href = icsData(data); });
  act('#a-gilad', function (e) {
    var dt = parseDate(data.dt), K = kindOf(data);
    ev('hazmana_gilad', { kind: K.slug });
    if (data.k === 'zeved') { e.currentTarget.href = '/mohel/?utm_source=hazmana_zeved&utm_medium=hazmana'; return; }
    var msg = data.k === 'pidyon' ? 'שלום גילעד, הכנתי באתר הודעה לפדיון הבן. יש לי שאלה: '
      : 'שלום גילעד, הכנתי באתר הזמנה לברית' + (dt ? ' ב' + whenText(data).replace(/^ב/, '') + ' ' + timeText(data) : '') + (data.pl ? ', ב' + stripB(data.pl) : '') + '. אשמח לתאם איתך את הברית.';
    e.currentTarget.href = 'https://wa.me/' + GILAD_WA + '?text=' + encodeURIComponent(msg);
  });
  $('#a-guide').href = GUIDE;

  // ---------- אישורי הגעה: יצירת האירוע ב-Worker ועדכונו כשהפרטים משתנים ----------
  var evBusy = null, evTimer = null;
  function detailsReady() { return data.dt && data.tm && data.pl; }
  function ensureEvent() {
    if (!registered() || !detailsReady() || evBusy) return;
    var sig = JSON.stringify(pubOf(data));
    if (evt && evt.sig === sig) return;
    var pub = pubOf(data);
    evBusy = (evt ? api('/ev/' + evt.id + '/update?t=' + encodeURIComponent(evt.tok), { d: pub }).then(function () { return evt; })
                  : api('/ev', { d: pub }).then(function (j) { ev('rsvp_create', { style: data.st, kind: data.k }); return { id: j.id, tok: j.tok }; }))
      .then(function (e) {
        evt = { id: e.id, tok: e.tok, sig: sig };
        try { localStorage.setItem(EV_STORE, JSON.stringify(evt)); } catch (err) {}
        showRsvpPanel();
        if (poster && !acts.hidden) fontsReady.then(function () { drawPoster(poster, data, guestUrl(data)); }); // ה-QR עובר לקישור הקצר
      }, function (err) {
        // אירוע שנמחק (30 יום אחרי הברית) או טוקן לא תקין: מתחילים אירוע חדש
        if (evt && /404|403/.test(err.message)) { evt = null; try { localStorage.removeItem(EV_STORE); } catch (e2) {} }
      }).then(function () { evBusy = null; });
  }
  function showRsvpPanel() {
    var p = $('#hz-rsvp-panel'); if (!p) return;
    p.hidden = !evt;
    if (evt) { $('#a-dash').href = adminUrl(evt); $('#a-short').textContent = shortUrl(evt.id).replace(/^https?:\/\//, ''); }
  }
  form.addEventListener('input', function () { clearTimeout(evTimer); evTimer = setTimeout(ensureEvent, 1500); });
  form.addEventListener('change', function () { clearTimeout(evTimer); evTimer = setTimeout(ensureEvent, 1500); });
  if (registered()) { showRsvpPanel(); ensureEvent(); }
  reg.addEventListener('submit', function () { setTimeout(ensureEvent, 0); });
  $('#a-dash').addEventListener('click', function () { ev('rsvp_dashboard', { from: 'generator' }); });
  $('#a-short-copy').addEventListener('click', function (e) { if (evt) copy(shortUrl(evt.id), e.currentTarget); });

  // לבדיקות מקומיות
  window.__hz.read = read;
  window.__hz.ensureEvent = ensureEvent;
  window.__hz.messagePdf = function () { return messagePdf(big, data); };
  window.__hz.posterPdf = function () { return posterPdf(data, guestUrl(data)); };
})();
