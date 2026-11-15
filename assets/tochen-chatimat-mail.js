// חתימה למייל – מחולל חתימה מעוצבת עם לוגו, כולו בדפדפן.
// החתימה נבנית כטבלאות HTML עם עיצוב בתוך כל תגית (inline), כי כך ג׳ימייל ואאוטלוק מציגים אותה נכון.
(function () {
  'use strict';
  var KEY = 'hk_chatimat_mail_v1', TOOL = 'chatimat_mail';
  var $ = function (id) { return document.getElementById(id); };
  var FIELDS = ['closing', 'name', 'role', 'company', 'phone', 'mobile', 'email', 'site', 'address', 'slogan', 'greet',
    'fb', 'ig', 'li', 'yt', 'tt', 'logoUrl'];
  var CHECKS = ['wa', 'confid'];
  var COLORS = ['#a8842f', '#1f3a5f', '#5f5d43', '#7a1f2b', '#11706b', '#222222', '#c2410c', '#6d28d9'];
  var FONTS = { arial: 'Arial,Helvetica,sans-serif', tahoma: 'Tahoma,Geneva,sans-serif', verdana: 'Verdana,Geneva,sans-serif', georgia: 'Georgia,"Times New Roman",serif' };

  var EXAMPLES = {
    esek: { closing: 'בברכה,', name: 'נועה לוי', role: 'מעצבת גרפית', company: 'סטודיו נועה – עיצוב לעסקים', phone: '03-555-1234', mobile: '050-123-4567', wa: true,
      email: 'noa@example.co.il', site: 'www.example.co.il', address: 'רחוב הרצל 10, ראשון לציון', slogan: 'עיצוב שמביא לקוחות', fb: 'https://facebook.com/', ig: 'https://instagram.com/',
      li: '', yt: '', tt: '', greet: '', confid: false, tpl: 'klasi', color: '#a8842f', font: 'arial', dir: 'rtl', logoW: 90, logoAuto: true },
    orech: { closing: 'בכבוד רב,', name: 'עו״ד דוד כהן', role: 'שותף מייסד', company: 'כהן ושות׳, משרד עורכי דין', phone: '02-555-6789', mobile: '052-765-4321', wa: true,
      email: 'office@example.co.il', site: 'www.example.co.il', address: 'רחוב יפו 97, ירושלים', slogan: '', fb: '', ig: '', li: 'https://linkedin.com/', yt: '', tt: '',
      greet: '', confid: true, tpl: 'pas', color: '#1f3a5f', font: 'georgia', dir: 'rtl', logoW: 80, logoAuto: true },
    roeh: { closing: 'בברכה,', name: 'מיכל אברהם', role: 'רואת חשבון', company: 'אברהם – ראיית חשבון ויעוץ מס', phone: '08-555-2468', mobile: '054-111-2233', wa: true,
      email: 'michal@example.co.il', site: 'www.example.co.il', address: '', slogan: 'הדוחות שלכם בידיים טובות', fb: '', ig: '', li: 'https://linkedin.com/', yt: '', tt: '',
      greet: 'שנה טובה ומתוקה 🍎', confid: true, tpl: 'kartis', color: '#11706b', font: 'arial', dir: 'rtl', logoW: 80, logoAuto: true },
    more: { closing: 'בברכה,', name: 'רותם ישראלי', role: 'מחנכת כיתה ה׳2', company: 'בית הספר היסודי "הרימון"', phone: '', mobile: '053-222-3344', wa: true,
      email: 'rotem@example.co.il', site: '', address: '', slogan: '', fb: '', ig: '', li: '', yt: '', tt: '',
      greet: '', confid: false, tpl: 'minimali', color: '#7a1f2b', font: 'tahoma', dir: 'rtl', logoW: 70, logoAuto: false },
    en: { closing: 'Best regards,', name: 'Noa Levi', role: 'Graphic Designer', company: 'Noa Studio', phone: '+972-3-555-1234', mobile: '+972-50-123-4567', wa: true,
      email: 'noa@example.com', site: 'www.example.com', address: '10 Herzl St., Rishon LeZion, Israel', slogan: 'Design that brings clients', fb: 'https://facebook.com/', ig: 'https://instagram.com/',
      li: 'https://linkedin.com/', yt: '', tt: '', greet: '', confid: false, tpl: 'merkaz', color: '#222222', font: 'verdana', dir: 'ltr', logoW: 90, logoAuto: true }
  };

  var S;
  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') return o; } catch (e) {}
    return null;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { try { var c = JSON.parse(JSON.stringify(S)); c.logoData = ''; localStorage.setItem(KEY, JSON.stringify(c)); } catch (e2) {} } }
  function fresh(k) { var o = JSON.parse(JSON.stringify(EXAMPLES[k])); o.logoData = ''; o.logoUrl = ''; return o; }

  // ---------- עזרים ----------
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function url(s) {
    s = String(s || '').trim(); if (!s || /[\s"'<>]/.test(s)) return '';
    if (!/^https?:\/\//i.test(s)) { if (/^[a-z]+:/i.test(s)) return ''; s = 'https://' + s; }
    return s;
  }
  function digits(s) { return String(s || '').replace(/[^\d+]/g, ''); }
  function intl(s) { var d = digits(s); if (!d) return ''; if (d[0] === '+') return d.slice(1).replace(/\D/g, ''); if (d.slice(0, 2) === '00') return d.slice(2); if (d[0] === '0') return '972' + d.slice(1); return d; }
  function hexOk(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : '#a8842f'; }
  function siteText(s) { return String(s || '').replace(/^https?:\/\//i, '').replace(/\/$/, ''); }

  // לוגו מהאותיות: עיגול בצבע החתימה עם האות הראשונה של השם או העסק
  function initialsLogo() {
    var src = (S.company || S.name || '?').replace(/^(עו״ד|עו"ד|ד״ר|ד"ר|Dr\.?|Adv\.?)\s*/i, '').trim();
    var ch = (src.match(/[A-Za-zא-ת0-9]/) || ['?'])[0].toUpperCase();
    var cv = document.createElement('canvas'); cv.width = cv.height = 240; var g = cv.getContext('2d');
    g.fillStyle = hexOk(S.color); g.beginPath(); g.arc(120, 120, 116, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 6; g.beginPath(); g.arc(120, 120, 98, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffffff'; g.font = 'bold 130px Georgia, "Frank Ruhl Libre", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 120, 128);
    return cv.toDataURL('image/png');
  }
  function logoSrc(mode) {
    var u = url(S.logoUrl);
    if (u) return u;
    if (mode === 'gmail') return '';   // ג׳ימייל לא מקבל תמונה מוטמעת בחתימה (מגבלת 10,000 תווים)
    if (S.logoData) return S.logoData;
    if (S.logoAuto) return initialsLogo();
    return '';
  }

  // ---------- בניית החתימה ----------
  function build(mode) {
    var rtl = S.dir !== 'ltr', A = hexOk(S.color), F = FONTS[S.font] || FONTS.arial, al = rtl ? 'right' : 'left';
    var L = rtl ? { t: 'טל׳', m: 'נייד', e: 'מייל', w: 'אתר', a: 'כתובת', wa: 'ווטסאפ', fb: 'פייסבוק', ig: 'אינסטגרם', li: 'לינקדאין', yt: 'יוטיוב', tt: 'טיקטוק',
      conf: 'הודעה זו והקבצים המצורפים אליה מיועדים לנמען בלבד ועשויים להכיל מידע חסוי. אם קיבלתם אותה בטעות, נא להודיע לשולח ולמחוק אותה.' }
      : { t: 'T', m: 'M', e: 'E', w: 'W', a: 'A', wa: 'WhatsApp', fb: 'Facebook', ig: 'Instagram', li: 'LinkedIn', yt: 'YouTube', tt: 'TikTok',
      conf: 'This message and any attachments are intended only for the addressee and may contain confidential information. If you received it in error, please notify the sender and delete it.' };
    var link = 'color:' + A + ';text-decoration:none';
    function row(lbl, inner) { return '<span style="color:' + A + ';font-weight:bold">' + lbl + '</span>&nbsp;' + inner; }
    var items = [];
    if (S.phone) items.push(row(L.t, '<a href="tel:+' + intl(S.phone) + '" style="color:#333333;text-decoration:none"><span dir="ltr">' + e(S.phone) + '</span></a>'));
    if (S.mobile) items.push(row(L.m, '<a href="tel:+' + intl(S.mobile) + '" style="color:#333333;text-decoration:none"><span dir="ltr">' + e(S.mobile) + '</span></a>'));
    if (S.email) items.push(row(L.e, '<a href="mailto:' + e(S.email.trim()) + '" style="color:#333333;text-decoration:none">' + e(S.email.trim()) + '</a>'));
    var su = url(S.site);
    if (su) items.push(row(L.w, '<a href="' + e(su) + '" style="' + link + '">' + e(siteText(S.site)) + '</a>'));
    if (S.address) items.push(row(L.a, e(S.address)));

    var pills = [];
    function pill(href, txt, bg) { return '<a href="' + e(href) + '" style="display:inline-block;padding:3px 10px;margin:4px 0 0 4px;border-radius:12px;background:' + bg + ';color:#ffffff;font-size:12px;font-weight:bold;text-decoration:none">' + txt + '</a>'; }
    var wn = S.wa && intl(S.mobile || S.phone);
    if (wn) pills.push(pill('https://wa.me/' + wn, L.wa, '#1f9d55'));
    [['fb', L.fb], ['ig', L.ig], ['li', L.li], ['yt', L.yt], ['tt', L.tt]].forEach(function (p) { var u = url(S[p[0]]); if (u) pills.push(pill(u, p[1], A)); });

    var lg = logoSrc(mode), W = Math.max(40, Math.min(200, +S.logoW || 90));
    var logo = lg ? '<img src="' + e(lg) + '" width="' + W + '" alt="' + e(S.company || S.name || 'לוגו') + '" style="display:block;width:' + W + 'px;max-width:' + W + 'px;height:auto;border:0">' : '';

    var nameH = S.name ? '<div style="font-size:18px;font-weight:bold;color:#1a1a1a;line-height:1.3">' + e(S.name) + '</div>' : '';
    var roleH = (S.role || S.company) ? '<div style="font-size:14px;color:' + A + ';font-weight:bold;line-height:1.4">' + e(S.role) + (S.role && S.company ? ' | ' : '') + '<span style="color:#555555;font-weight:normal">' + e(S.company) + '</span></div>' : '';
    var slog = S.slogan ? '<div style="font-size:13px;color:#777777;font-style:italic;padding-top:2px">' + e(S.slogan) + '</div>' : '';
    var lines = items.map(function (x) { return '<div style="font-size:13px;color:#333333;line-height:1.6">' + x + '</div>'; }).join('');
    var pl = pills.length ? '<div style="padding-top:4px">' + pills.join('') + '</div>' : '';
    var text = nameH + roleH + '<div style="padding-top:6px">' + lines + '</div>' + slog + pl;
    var body;

    if (S.tpl === 'pas') {
      body = '<table cellpadding="0" cellspacing="0" border="0"><tr><td width="5" style="width:5px;background:' + A + ';font-size:0;line-height:0">&nbsp;</td>' +
        '<td style="padding:4px 14px;vertical-align:top;text-align:' + al + '">' + text + (logo ? '<div style="padding-top:10px">' + logo + '</div>' : '') + '</td></tr></table>';
    } else if (S.tpl === 'merkaz') {
      var one = items.join('&nbsp;&nbsp;<span style="color:#bbbbbb">|</span>&nbsp;&nbsp;');
      body = '<table cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="text-align:center;padding:4px 8px">' +
        (logo ? '<div style="padding-bottom:8px"><img src="' + e(lg) + '" width="' + W + '" alt="' + e(S.company || S.name || 'לוגו') + '" style="display:inline-block;width:' + W + 'px;height:auto;border:0"></div>' : '') +
        nameH + roleH + '<div style="height:2px;width:60px;background:' + A + ';margin:8px auto;font-size:0;line-height:0">&nbsp;</div>' +
        '<div style="font-size:13px;color:#333333;line-height:1.7">' + one + '</div>' + slog + pl + '</td></tr></table>';
    } else if (S.tpl === 'kartis') {
      body = '<table cellpadding="0" cellspacing="0" border="0" style="border:1px solid ' + A + ';border-radius:10px;border-collapse:separate">' +
        '<tr><td colspan="2" style="background:' + A + ';color:#ffffff;padding:8px 14px;border-radius:9px 9px 0 0;text-align:' + al + '"><span style="font-size:17px;font-weight:bold;color:#ffffff">' + e(S.name) + '</span>' +
        (S.role ? '<span style="font-size:13px;color:#ffffff">&nbsp;&nbsp;·&nbsp;&nbsp;' + e(S.role) + '</span>' : '') + '</td></tr><tr>' +
        (logo ? '<td style="padding:12px 14px;vertical-align:middle">' + logo + '</td>' : '') +
        '<td style="padding:10px 14px;vertical-align:top;text-align:' + al + '">' + (S.company ? '<div style="font-size:14px;font-weight:bold;color:#333333">' + e(S.company) + '</div>' : '') + lines + slog + pl + '</td></tr></table>';
    } else if (S.tpl === 'minimali') {
      body = '<table cellpadding="0" cellspacing="0" border="0"><tr>' + (logo ? '<td style="padding-' + (rtl ? 'left' : 'right') + ':10px;vertical-align:middle">' + logo + '</td>' : '') +
        '<td style="vertical-align:middle;text-align:' + al + '"><div style="font-size:15px;font-weight:bold;color:' + A + '">' + e(S.name) + '</div>' +
        ((S.role || S.company) ? '<div style="font-size:13px;color:#555555">' + e([S.role, S.company].filter(Boolean).join(' · ')) + '</div>' : '') +
        '<div style="font-size:12px;color:#555555;line-height:1.7">' + items.join('&nbsp;&nbsp;') + '</div>' + slog + pl + '</td></tr></table>';
    } else if (S.tpl === 'banner') {
      body = '<table cellpadding="0" cellspacing="0" border="0"><tr>' + (logo ? '<td style="padding-' + (rtl ? 'left' : 'right') + ':14px;vertical-align:top">' + logo + '</td>' : '') +
        '<td style="vertical-align:top;text-align:' + al + '">' + nameH + roleH + '<div style="padding-top:6px">' + lines + '</div>' + pl + '</td></tr>' +
        '<tr><td colspan="2" style="padding-top:10px"><div style="background:' + A + ';color:#ffffff;padding:7px 14px;border-radius:6px;font-size:14px;font-weight:bold;text-align:center">' + e(S.slogan || S.company || S.name) + '</div></td></tr></table>';
    } else { // klasi
      body = '<table cellpadding="0" cellspacing="0" border="0"><tr>' + (logo ? '<td style="padding-' + (rtl ? 'left' : 'right') + ':14px;vertical-align:middle">' + logo + '</td>' +
        '<td width="3" style="width:3px;background:' + A + ';font-size:0;line-height:0">&nbsp;</td>' : '') +
        '<td style="padding-' + (rtl ? 'right' : 'left') + ':' + (logo ? 14 : 0) + 'px;vertical-align:top;text-align:' + al + '">' + text + '</td></tr></table>';
    }
    var top = (S.greet ? '<div style="font-size:15px;color:' + A + ';font-weight:bold;padding-bottom:8px">' + e(S.greet) + '</div>' : '') +
      (S.closing ? '<div style="font-size:14px;color:#333333;padding-bottom:6px">' + e(S.closing) + '</div>' : '');
    var conf = S.confid ? '<div style="font-size:10px;color:#999999;line-height:1.4;padding-top:10px;max-width:520px">' + L.conf + '</div>' : '';
    return '<div dir="' + (rtl ? 'rtl' : 'ltr') + '" style="direction:' + (rtl ? 'rtl' : 'ltr') + ';text-align:' + al + ';font-family:' + F + ';color:#333333">' + top + body + conf + '</div>';
  }
  function plain() {
    var rtl = S.dir !== 'ltr', out = [];
    if (S.greet) out.push(S.greet, '');
    if (S.closing) out.push(S.closing);
    if (S.name) out.push(S.name);
    var rc = [S.role, S.company].filter(Boolean).join(' | '); if (rc) out.push(rc);
    if (S.phone) out.push((rtl ? 'טל׳ ' : 'T ') + S.phone);
    if (S.mobile) out.push((rtl ? 'נייד ' : 'M ') + S.mobile);
    if (S.email) out.push(S.email.trim());
    if (S.site) out.push(siteText(S.site));
    if (S.address) out.push(S.address);
    if (S.slogan) out.push(S.slogan);
    return out.join('\n');
  }

  // ---------- טופס ⇄ מצב ----------
  function toForm() {
    FIELDS.forEach(function (f) { var el = $('cm-' + f); if (el) el.value = S[f] || ''; });
    CHECKS.forEach(function (f) { var el = $('cm-' + f); if (el) el.checked = !!S[f]; });
    [].forEach.call(document.querySelectorAll('input[name=cm-tpl]'), function (r) { r.checked = r.value === S.tpl; });
    [].forEach.call(document.querySelectorAll('input[name=cm-dir]'), function (r) { r.checked = r.value === (S.dir || 'rtl'); });
    $('cm-font').value = S.font || 'arial';
    $('cm-color').value = hexOk(S.color);
    $('cm-logoW').value = S.logoW || 90;
    [].forEach.call(document.querySelectorAll('#cm-colors button'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.c === S.color)); });
    logoNote();
  }
  function fromForm() {
    FIELDS.forEach(function (f) { var el = $('cm-' + f); if (el) S[f] = el.value; });
    CHECKS.forEach(function (f) { var el = $('cm-' + f); if (el) S[f] = el.checked; });
    var t = document.querySelector('input[name=cm-tpl]:checked'); if (t) S.tpl = t.value;
    var d = document.querySelector('input[name=cm-dir]:checked'); if (d) S.dir = d.value;
    S.font = $('cm-font').value; S.color = hexOk($('cm-color').value); S.logoW = +$('cm-logoW').value || 90;
  }
  function logoNote() {
    var n = $('cm-logo-state');
    if (url(S.logoUrl)) n.textContent = '✓ לוגו מקישור – יופיע בכל תוכנות המייל.';
    else if (S.logoData) n.textContent = '✓ לוגו מהקובץ שבחרתם.';
    else if (S.logoAuto) n.textContent = '✓ לוגו מהאותיות (נוצר אוטומטית בצבע החתימה).';
    else n.textContent = 'בלי לוגו.';
    $('cm-logo-dl').hidden = !(S.logoData || (S.logoAuto && !url(S.logoUrl)));
  }

  var extOk = false, tExt;
  function render() {
    $('cm-prev').innerHTML = build('full');
    var g = build('gmail').length;
    var gm = $('cm-gmail-len');
    gm.textContent = 'אורך החתימה לג׳ימייל: ' + g.toLocaleString('he-IL') + ' תווים מתוך 10,000 המותרים' + (g > 10000 ? ' – ארוך מדי, כדאי להוריד שורה או רשת.' : ' ✓');
    var noLogoInGmail = !url(S.logoUrl) && (S.logoData || S.logoAuto);
    $('cm-gmail-logo').hidden = !noLogoInGmail;
    save();
    clearTimeout(tExt);
    tExt = setTimeout(function () { try { window.postMessage({ type: 'hakelim-sig-save', html: build('gmail'), name: S.name || '' }, location.origin); } catch (x) {} }, 600);
  }
  function update() { fromForm(); logoNote(); render(); }

  // ---------- העתקה ----------
  function msg(t) { var m = $('cm-msg'); m.textContent = t; }
  function copyRich(html, txt) {
    function fallback() {
      var box = document.createElement('div'); box.contentEditable = 'true'; box.innerHTML = html;
      box.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;background:#fff';
      document.body.appendChild(box);
      var r = document.createRange(); r.selectNodeContents(box); var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      var ok = false; try { ok = document.execCommand('copy'); } catch (x) {}
      s.removeAllRanges(); box.remove(); return Promise.resolve(ok);
    }
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        return navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([txt], { type: 'text/plain' }) })])
          .then(function () { return true; }, fallback);
      }
    } catch (x) {}
    return fallback();
  }
  function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return false; }); } catch (x) {}
    return Promise.resolve(false);
  }
  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how, tpl: S.tpl }); }
  function dl(name, href) { var a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 100); }

  function bind() {
    $('cm-form').addEventListener('input', function (ev) {
      if (ev.target.id === 'cm-color') [].forEach.call(document.querySelectorAll('#cm-colors button'), function (b) { b.setAttribute('aria-pressed', 'false'); });
      update();
    });
    $('cm-form').addEventListener('change', update);
    $('cm-form').addEventListener('submit', function (ev) { ev.preventDefault(); });
    var cw = $('cm-colors');
    COLORS.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.c = c; b.style.background = c; b.setAttribute('aria-label', 'צבע ' + c); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { $('cm-color').value = c; S.color = c; toForm(); update(); });
      cw.appendChild(b);
    });
    [].forEach.call(document.querySelectorAll('[data-greet]'), function (b) {
      b.addEventListener('click', function () { $('cm-greet').value = b.dataset.greet; update(); });
    });
    $('cm-logo-file').addEventListener('change', function () {
      var f = this.files && this.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) { msg('זה לא קובץ תמונה. בוחרים PNG או JPG.'); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          var w = Math.min(400, im.naturalWidth || 400), h = Math.round(w * (im.naturalHeight || 1) / (im.naturalWidth || 1));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(im, 0, 0, w, h);
          S.logoData = cv.toDataURL('image/png'); S.logoAuto = false; $('cm-logoUrl').value = ''; S.logoUrl = '';
          logoNote(); render(); used('logo'); msg('הלוגו נכנס לחתימה.');
        };
        im.onerror = function () { msg('לא הצלחתי לקרוא את התמונה. נסו PNG או JPG.'); };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
      this.value = '';
    });
    $('cm-logo-auto').addEventListener('click', function () { S.logoData = ''; S.logoUrl = ''; $('cm-logoUrl').value = ''; S.logoAuto = true; logoNote(); render(); used('logo_auto'); });
    $('cm-logo-none').addEventListener('click', function () { S.logoData = ''; S.logoUrl = ''; $('cm-logoUrl').value = ''; S.logoAuto = false; logoNote(); render(); });
    $('cm-logo-dl').addEventListener('click', function () { var src = S.logoData || initialsLogo(); dl('logo-chatima.png', src); used('logo_download'); });

    $('cm-copy-gmail').addEventListener('click', function () {
      copyRich(build('gmail'), plain()).then(function (ok) {
        msg(ok ? '✓ החתימה הועתקה. עכשיו מדביקים אותה בהגדרות של ג׳ימייל (Ctrl+V) – ההסבר כאן למטה.' : 'ההעתקה לא עבדה בדפדפן הזה. מסמנים את החתימה בתצוגה ומעתיקים ידנית.');
        if (ok) { used('copy_gmail'); $('cm-how-gmail').open = true; }
      });
    });
    $('cm-copy-full').addEventListener('click', function () {
      copyRich(build('full'), plain()).then(function (ok) {
        msg(ok ? '✓ החתימה הועתקה עם הלוגו. מדביקים בהגדרות החתימה של אאוטלוק (Ctrl+V).' : 'ההעתקה לא עבדה בדפדפן הזה. מסמנים את החתימה בתצוגה ומעתיקים ידנית.');
        if (ok) { used('copy_outlook'); $('cm-how-outlook').open = true; }
      });
    });
    $('cm-copy-text').addEventListener('click', function () {
      copyText(plain()).then(function (ok) { msg(ok ? '✓ הועתקה חתימת טקסט – מתאימה לאפליקציית ג׳ימייל ואאוטלוק בטלפון.' : 'ההעתקה לא עבדה.'); if (ok) { used('copy_text'); $('cm-how-phone').open = true; } });
    });
    $('cm-copy-html').addEventListener('click', function () {
      copyText(build('full')).then(function (ok) { msg(ok ? '✓ קוד ה-HTML של החתימה הועתק.' : 'ההעתקה לא עבדה.'); if (ok) used('copy_html'); });
    });
    $('cm-download').addEventListener('click', function () {
      var doc = '<!DOCTYPE html><html lang="' + (S.dir === 'ltr' ? 'en' : 'he') + '" dir="' + (S.dir === 'ltr' ? 'ltr' : 'rtl') + '"><head><meta charset="utf-8"><title>' + e(S.name || 'חתימה') + '</title></head><body>' + build('full') + '</body></html>';
      dl('chatima.htm', URL.createObjectURL(new Blob(['﻿' + doc], { type: 'text/html;charset=utf-8' })));
      used('download'); msg('✓ הקובץ chatima.htm ירד. אפשר לפתוח אותו בדפדפן ולהעתיק משם, או לשמור בתיקיית החתימות של אאוטלוק.');
    });
    [].forEach.call(document.querySelectorAll('[data-ex]'), function (b) {
      b.addEventListener('click', function () {
        S = fresh(b.dataset.ex); toForm(); render(); used('example_' + b.dataset.ex);
        msg('נטענה דוגמה. מחליפים את הפרטים בשלכם – הכול מתעדכן בתצוגה.');
      });
    });
    $('cm-clear').addEventListener('click', function () {
      S = fresh('esek'); FIELDS.forEach(function (f) { S[f] = ''; }); S.closing = 'בברכה,'; S.wa = true; S.confid = false; S.logoAuto = false;
      toForm(); render(); $('cm-name').focus(); msg('הטופס נוקה. ממלאים את הפרטים שלכם.');
    });
    var share = $('cm-share');
    if (share) share.addEventListener('click', function () { used('share'); });
    window.addEventListener('message', function (ev) {
      if (ev.source !== window || !ev.data || ev.data.type !== 'hakelim-sig-ext' || extOk) return;
      extOk = true; var n = $('cm-ext'); if (n) n.hidden = false;
      try { window.postMessage({ type: 'hakelim-sig-save', html: build('gmail'), name: S.name || '' }, location.origin); } catch (x) {}
    });
  }

  function init() {
    if (!$('cm-form')) return;
    S = load() || fresh('esek');
    bind(); toForm(); render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
