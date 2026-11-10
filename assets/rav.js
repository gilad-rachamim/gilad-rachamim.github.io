// האתר של הרב (כלי קודש): העורך /kodesh/atar/ והדף האישי /kodesh/r/.
// כל ההגדרות יושבות בתוך הקישור: #z= (JSON דחוס, deflate) או #d= (בלי דחיסה). אין שרת שמחזיק את הדף.
// קישור קצר (#k=XXXXXX): אותו קוד נשמר ב-Worker של כרטיס הביקור (tools/kartis-worker, KV), ואם הוא לא עונה – הקישור הארוך.
// השיעורים מיוטיוב: Worker gilad-hub, מסלול /yt/feed (ל-RSS של יוטיוב אין CORS). פרשה וזמני שבת: @hebcal/core 6.14.7.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KART = 'https://kartis.gilad4049.workers.dev', YT = 'https://gilad-hub.gilad4049.workers.dev/yt/feed?c=';
  try { KART = localStorage.getItem('kartis-api') || KART; YT = localStorage.getItem('rav-yt-api') || YT; } catch (e) {}

  // ---------- נוסח לפי סוג הדף ----------
  var KINDS = {
    rav: { l: 'רב', ask: 'שאלה לרב', askT: 'יש לכם שאלה בהלכה, או צריכים עצה? כתבו לרב ישירות בווטסאפ.', wa: 'שלום הרב, ', les: 'השיעורים האחרונים של הרב', wk: 'מערכת השיעורים השבועית', next: 'השיעור הבא', ph: 'הרב' },
    rabanit: { l: 'רבנית', ask: 'שאלה לרבנית', askT: 'שאלה, התייעצות או בקשה? כתבו לרבנית ישירות בווטסאפ.', wa: 'שלום הרבנית, ', les: 'השיעורים האחרונים של הרבנית', wk: 'מערכת השיעורים השבועית', next: 'השיעור הבא', ph: 'הרבנית' },
    bk: { l: 'בית כנסת', ask: 'פנייה לגבאי', askT: 'שאלה על תפילות, שיעורים, אירועים או תרומות? כתבו לגבאי בווטסאפ.', wa: 'שלום, אני פונה מהאתר של בית הכנסת: ', les: 'שיעורים אחרונים מבית הכנסת', wk: 'תפילות ושיעורים קבועים', next: 'השיעור הבא בבית הכנסת', ph: 'בית הכנסת' },
    yeshiva: { l: 'ישיבה', ask: 'פנייה לישיבה', askT: 'רישום, ביקור או שאלה? כתבו לנו בווטסאפ.', wa: 'שלום, אני פונה מהאתר של הישיבה: ', les: 'שיעורים אחרונים מהישיבה', wk: 'סדר השיעורים הקבוע', next: 'השיעור הבא', ph: 'הישיבה' },
    org: { l: 'ארגון', ask: 'צרו קשר', askT: 'שאלה, הצטרפות או התנדבות? כתבו לנו בווטסאפ.', wa: 'שלום, אני פונה מהאתר: ', les: 'השיעורים והסרטונים האחרונים', wk: 'הפעילות הקבועה', next: 'המפגש הבא', ph: 'הארגון' }
  };
  var THEMES = [['laila', 'לילה וזהב', '#0e1628', '#d4b062'], ['even', 'אבן ירושלמית', '#f5efe3', '#8a5f1e'], ['tchelet', 'תכלת', '#0c2436', '#8cc8ef'], ['zayit', 'זית', '#16231a', '#cdb66a'], ['bordo', 'בורדו', '#2a1219', '#e3b866']];
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var DAYS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  // d: 0–6 = יום בשבוע, 'a' = א'–ה', 'w' = א'–ו'
  function dayList(d) { return d === 'a' ? [0, 1, 2, 3, 4] : d === 'w' ? [0, 1, 2, 3, 4, 5] : [+d]; }
  function dayName(d) { return d === 'a' ? "א'–ה'" : d === 'w' ? "א'–ו'" : 'יום ' + DAYS[+d]; }
  // [קואורדינטות, שם, דקות הדלקת נרות לפני השקיעה] – כמו בדף לבית הכנסת ובלוח השבועי
  var CITIES = [['31.778,35.235', 'ירושלים', 40], ['32.08,34.78', 'תל אביב', 20], ['32.79,34.99', 'חיפה', 30], ['31.25,34.79', 'באר שבע', 20], ['32.965,35.496', 'צפת', 20], ['32.79,35.53', 'טבריה', 20], ['29.557,34.952', 'אילת', 20], ['31.89,34.81', 'רחובות', 20], ['32.17,34.84', 'הרצליה', 20], ['32.32,34.85', 'נתניה', 20], ['31.8,34.65', 'אשדוד', 20], ['31.67,34.57', 'אשקלון', 20], ['32.09,34.88', 'פתח תקווה', 20], ['32.08,34.83', 'בני ברק', 20], ['31.9,35.0', 'מודיעין', 20], ['31.71,35.0', 'בית שמש', 30], ['31.53,35.1', 'חברון וקריית ארבע', 20], ['32.3,35.2', 'שומרון', 20], ['31.35,34.3', 'עוטף עזה', 20], ['33.2,35.57', 'קריית שמונה', 20], ['32.7,35.3', 'נצרת עילית ועפולה', 20]];

  // ---------- קידוד הקישור ----------
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(s) { s = atob(s.replace(/-/g, '+').replace(/_/g, '/')); var b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (a) { return new Uint8Array(a); }); }
  function enc(o) { return b64(new TextEncoder().encode(JSON.stringify(o))); }
  function dec(s) { return JSON.parse(new TextDecoder().decode(unb64(s))); }
  function encZ(o) {
    var bytes = new TextEncoder().encode(JSON.stringify(o));
    if (!window.CompressionStream) return Promise.resolve('d=' + b64(bytes));
    return pipe(bytes, new CompressionStream('deflate-raw')).then(function (z) { return 'z=' + b64(z); }).catch(function () { return 'd=' + b64(bytes); });
  }
  function decZ(s) { return pipe(unb64(s), new DecompressionStream('deflate-raw')).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); }); }
  var PAGE = location.origin + '/kodesh/r/';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function pad(n) { return ('0' + n).slice(-2); }
  function hm(d) { return d && !isNaN(d) ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : ''; }
  function ev(name, extra) { if (window.kelimEv) window.kelimEv(name, Object.assign({ tool: 'rav_atar' }, extra || {})); }
  function safeUrl(u) { u = String(u || '').trim(); if (!u) return ''; if (/^data:image\/(jpeg|png|webp);base64,[\w+/=]+$/.test(u)) return u; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; }
  function chUrl(c) { c = String(c || '').trim(); if (!c) return ''; if (/^@/.test(c)) return 'https://www.youtube.com/' + c; if (/^UC[\w-]{22}$/.test(c)) return 'https://www.youtube.com/channel/' + c; return safeUrl(c); }

  // ---------- המערכת השבועית: מתי המופע הבא ----------
  function nextOf(s, now) {
    var m = String(s.h || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    var best = null;
    dayList(s.d).forEach(function (wd) {
      var d = new Date(now); d.setHours(+m[1], +m[2], 0, 0);
      d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7));
      if (d.getTime() + (s.len || 60) * 60000 <= now.getTime()) d.setDate(d.getDate() + 7);
      if (!best || d < best) best = d;
    });
    return best;
  }
  function upcoming(o, now) {
    var list = (o.s || []).map(function (s) { var at = nextOf(s, now); return at ? { s: s, at: at } : null; }).filter(Boolean);
    list.sort(function (a, b) { return a.at - b.at; });
    return list[0] || null;
  }
  function icsFor(o, s, at) {
    var len = s.len || 60;
    var st = new Date(at), en = new Date(at.getTime() + len * 60000);
    var f = function (d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; };
    var esc2 = function (t) { return String(t || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); };
    var where = s.p || o.addr || '';
    var l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kodesh//rav//HE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:rav-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '@hakelim.com',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;TZID=Asia/Jerusalem:' + f(st), 'DTEND;TZID=Asia/Jerusalem:' + f(en),
      'RRULE:FREQ=WEEKLY;BYDAY=' + dayList(s.d).map(function (x) { return DAYS_ICS[x]; }).join(','),
      'SUMMARY:' + esc2(s.t + ' – ' + o.name)];
    if (where) l.push('LOCATION:' + esc2(where));
    l.push('DESCRIPTION:' + esc2('השיעור הקבוע. כל הפרטים והשיעורים המוקלטים: ' + (o._url || PAGE)));
    l.push('BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc2(s.t), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
    return l.join('\r\n');
  }
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name.replace(/[\\/:*?"<>|]/g, '');
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function waze(q) { return 'https://waze.com/ul?q=' + encodeURIComponent(q) + '&navigate=yes'; }

  // ---------- זמני שבת ופרשה ----------
  function shabbatBox(o) {
    var H = window.hebcal;
    if (!H || !o.city) return '';
    var ll = String(o.city).split(',').map(Number);
    if (ll.length !== 2 || isNaN(ll[0])) return '';
    var city = CITIES.filter(function (c) { return c[0] === o.city; })[0], mins = city ? city[2] : 20, pname = city ? city[1] : (o.pname || 'המקום');
    var now = new Date(), fri = new Date(now);
    fri.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7)); fri.setHours(12, 0, 0, 0);
    if (now.getDay() === 6) fri.setDate(fri.getDate() - 1);
    var sat = new Date(fri); sat.setDate(fri.getDate() + 1);
    var loc = new H.Location(ll[0], ll[1], true, 'Asia/Jerusalem', pname, 'IL', undefined, 0);
    var candle = '', havdala = '', parsha = '';
    try {
      H.HebrewCalendar.calendar({ start: fri, end: sat, il: true, location: loc, candlelighting: true, candleLightingMins: mins, havdalahDeg: 8.5 }).forEach(function (e) {
        var desc = e.getDesc();
        if (desc === 'Candle lighting' && !candle) candle = hm(e.eventTime);
        else if (desc === 'Havdalah') havdala = hm(e.eventTime);
      });
      var hs = new H.HDate(sat), sd = H.getSedra(hs.getFullYear(), true).lookup(hs);
      parsha = sd.chag ? '' : 'פרשת ' + sd.parsha.map(function (p) { return H.Locale.gettext(p, 'he-x-NoNikud'); }).join('-');
    } catch (e) { return ''; }
    var hd = new H.HDate(sat).renderGematriya(true);
    return '<section class="rv-sec rv-sh"><h2>שבת שלום</h2>' + (parsha ? '<p class="ps">' + esc(parsha) + '</p>' : '') +
      '<p class="rv-muted">' + esc(hd) + ' · ' + sat.getDate() + '.' + (sat.getMonth() + 1) + '</p><dl>' +
      (candle ? '<dt>הדלקת נרות</dt><dd>' + candle + '</dd>' : '') + (havdala ? '<dt>צאת השבת</dt><dd>' + havdala + '</dd>' : '') +
      '</dl><p class="rv-muted" style="margin-top:.5rem">לפי ' + esc(pname) + ' · הדלקת נרות ' + mins + ' דקות לפני השקיעה · צאת השבת 8.5°</p></section>';
  }

  // ---------- יוטיוב ----------
  function ago(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var days = Math.floor((Date.now() - d) / 864e5);
    if (days < 1) return 'היום';
    if (days === 1) return 'אתמול';
    if (days < 7) return 'לפני ' + days + ' ימים';
    if (days < 14) return 'לפני שבוע';
    if (days < 31) return 'לפני ' + Math.floor(days / 7) + ' שבועות';
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function cleanT(t) { return String(t || '').replace(/\s*#\S+/g, '').trim(); }
  function ytBlock(o, j, K) {
    var ch = chUrl(o.yt), h = '';
    if (j.videos && j.videos.length) {
      h += '<section class="rv-sec" id="rv-les"><h2>' + esc(K.les) + '</h2>' + (j.title ? '<p class="rv-muted" style="margin:-.35rem 0 .7rem">מתוך הערוץ ביוטיוב: ' + esc(j.title) + '</p>' : '') + '<div class="rv-vids">' + j.videos.slice(0, o.n || 6).map(function (v) {
        return '<button class="rv-v" type="button" data-play="' + esc(v.id) + '"><span class="th"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/' + esc(v.id) + '/mqdefault.jpg"></span><span class="tt">' + esc(cleanT(v.t)) + '</span><span class="dd">' + esc(ago(v.d)) + '</span></button>';
      }).join('') + '</div><div class="rv-acts"><a class="rv-btn l sm" href="' + esc(ch) + '/videos" target="_blank" rel="noopener">לכל השיעורים בערוץ ←</a></div></section>';
    }
    if (o.sh !== 0 && j.shorts && j.shorts.length) {
      h += '<section class="rv-sec"><h2>קצרים</h2><div class="rv-shorts">' + j.shorts.slice(0, 10).map(function (v) {
        return '<a class="rv-s" href="https://www.youtube.com/shorts/' + esc(v.id) + '" target="_blank" rel="noopener" data-ev="short"><span class="th"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg"></span><span>' + esc(cleanT(v.t)) + '</span></a>';
      }).join('') + '</div></section>';
    }
    return h;
  }
  function liveBlock(j) {
    if (j.live) return '<a class="rv-live" href="https://www.youtube.com/watch?v=' + esc(j.live.id) + '" target="_blank" rel="noopener" data-ev="live"><i class="rv-dot"></i><span><b>בשידור חי עכשיו</b><span>' + esc(cleanT(j.live.t)) + '</span></span></a>';
    if (j.soon) { var d = new Date(j.soon.at); return '<a class="rv-live soon" href="https://www.youtube.com/watch?v=' + esc(j.soon.id) + '" target="_blank" rel="noopener"><i class="rv-dot"></i><span><b>שידור חי ב' + (d.toDateString() === new Date().toDateString() ? 'היום' : 'יום ' + DAYS[d.getDay()]) + ' ב-' + hm(d) + '</b><span>' + esc(cleanT(j.soon.t)) + '</span></span></a>'; }
    return '';
  }
  var ytCache = {};
  function loadYt(c) {
    if (ytCache[c]) return ytCache[c];
    ytCache[c] = fetch(YT + encodeURIComponent(c)).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); });
    ytCache[c].catch(function () { delete ytCache[c]; });
    return ytCache[c];
  }

  // ---------- הדף ----------
  function initials(n) { n = String(n || '').replace(/^(הרב|הרבנית|רב|רבנית|בית הכנסת|ישיבת|ישיבה)\s+/, ''); return n.trim().charAt(0) || '✡'; }
  function render(el, o, opt) {
    opt = opt || {};
    var K = KINDS[o.k] || KINDS.rav, now = new Date(), phone = intl(o.ph);
    var img = safeUrl(o.img);
    var h = '<div class="rv" data-th="' + esc(o.th || 'laila') + '"><div class="rv-in"><span class="rv-bsd">בס"ד</span>' +
      (o.demo ? '<p class="rv-demo">דף לדוגמה: השם, הטלפון והמערכת בדויים. השיעורים מגיעים מערוץ ציבורי ביוטיוב. <a href="/kodesh/atar/">לבנות דף כזה ←</a></p>' : '') + '<header class="rv-hero">' +
      (img ? '<img class="rv-ph" alt="" src="' + esc(img) + '">' : '<span class="rv-ph ini" data-ph>' + esc(initials(o.name)) + '</span>') +
      '<h1>' + esc(o.name) + '</h1>' + (o.sub ? '<p class="rv-sub">' + esc(o.sub) + '</p>' : '') + (o.intro ? '<p class="rv-intro">' + esc(o.intro).replace(/\n/g, '<br>') + '</p>' : '') +
      '<div class="rv-acts">' + (phone ? '<a class="rv-btn p" href="https://wa.me/' + phone + '?text=' + encodeURIComponent(K.wa) + '" target="_blank" rel="noopener" data-ev="wa">💬 ' + esc(K.ask) + '</a>' : '') +
      (o.yt ? '<a class="rv-btn l" href="#rv-les">▶️ שיעורים</a>' : '') + ((o.s || []).length ? '<a class="rv-btn l" href="#rv-wk">🗓️ מערכת שבועית</a>' : '') + '</div></header>' +
      '<div data-live></div>';
    var nx = upcoming(o, now);
    if (nx) {
      var s = nx.s, where = s.p || o.addr || '';
      h += '<section class="rv-sec rv-next"><h2>' + esc(K.next) + '</h2><p class="t">' + esc(s.t) + '</p><p class="w">' + esc(dayName(s.d)) + ' · ' + esc(s.h) + (where ? ' · ' + esc(where) : '') + '</p>' +
        '<div data-cd data-at="' + nx.at.getTime() + '" data-len="' + (s.len || 60) + '"></div><div class="rv-acts">' +
        '<button class="rv-btn p sm" type="button" data-ics="' + o.s.indexOf(s) + '">🗓️ להוסיף ליומן</button>' + (where ? '<a class="rv-btn l sm" href="' + waze(where) + '" target="_blank" rel="noopener" data-ev="waze">🧭 ניווט בוויז</a>' : '') + '</div></section>';
    }
    h += '<div data-yt>' + (o.yt ? '<section class="rv-sec" id="rv-les"><h2>' + esc(K.les) + '</h2><p class="rv-muted">טוענים את השיעורים מיוטיוב…</p></section>' : '') + '</div>';
    if ((o.s || []).length) {
      var rows = o.s.map(function (s, i) { return { s: s, i: i, at: nextOf(s, now) }; }).filter(function (x) { return x.at; });
      rows.sort(function (a, b) { var da = a.s.d === 'a' || a.s.d === 'w' ? -1 : +a.s.d, db = b.s.d === 'a' || b.s.d === 'w' ? -1 : +b.s.d; return da - db || a.s.h.localeCompare(b.s.h); });
      h += '<section class="rv-sec" id="rv-wk"><h2>' + esc(K.wk) + '</h2><ul class="rv-week">' + rows.map(function (x) {
        var s = x.s, where = s.p || o.addr || '';
        return '<li><span class="d">' + esc(dayName(s.d)) + '<small>' + esc(s.h) + '</small></span><span class="n"><b>' + esc(s.t) + '</b>' + (s.p ? '<span>' + esc(s.p) + '</span>' : '') + '</span><span class="a"><button class="rv-ic" type="button" data-ics="' + x.i + '" aria-label="להוסיף ליומן: ' + esc(s.t) + '" title="להוסיף ליומן">🗓️</button>' +
          (where ? '<a class="rv-ic" href="' + waze(where) + '" target="_blank" rel="noopener" data-ev="waze" aria-label="ניווט בוויז" title="ניווט בוויז">🧭</a>' : '') + '</span></li>';
      }).join('') + '</ul><p class="rv-muted" style="margin-top:.6rem">🗓️ מכניס את השיעור ליומן בטלפון כאירוע קבוע בכל שבוע, עם תזכורת חצי שעה לפני.</p></section>';
    }
    h += '<div data-sh>' + shabbatBox(o) + '</div>';
    if (phone) h += '<section class="rv-sec rv-ask"><h2>' + esc(K.ask) + '</h2><p>' + esc(K.askT) + '</p><a class="rv-btn p" href="https://wa.me/' + phone + '?text=' + encodeURIComponent(K.wa) + '" target="_blank" rel="noopener" data-ev="wa">💬 לכתוב בווטסאפ</a>' +
      (o.call ? ' <a class="rv-btn l" href="tel:+' + phone + '" data-ev="call">📞 להתקשר</a>' : '') + '</section>';
    var extra = '';
    if (o.addr) extra += '<a class="rv-btn l sm" href="' + waze(o.addr) + '" target="_blank" rel="noopener" data-ev="waze">📍 ' + esc(o.addr) + '</a>';
    if (o.site) extra += '<a class="rv-btn l sm" href="' + esc(safeUrl(o.site)) + '" target="_blank" rel="noopener">🌐 אתר</a>';
    if (o.mail) extra += '<a class="rv-btn l sm" href="mailto:' + esc(o.mail) + '">✉️ מייל</a>';
    if (o.yt) extra += '<a class="rv-btn l sm" href="' + esc(chUrl(o.yt)) + '" target="_blank" rel="noopener">▶️ הערוץ ביוטיוב</a>';
    h += '<footer class="rv-foot">' + (extra ? '<div class="rv-acts">' + extra + '</div>' : '') +
      '<div class="rv-acts"><button class="rv-btn l sm" type="button" data-share>↗️ לשתף את הדף</button>' + (opt.pub ? '<button class="rv-btn l sm" type="button" data-qr>🔳 קוד QR לדף</button>' : '') + '</div><div data-qrbox></div>' +
      '<p class="rv-cred">דף חינמי מ<a href="/kodesh/atar/">כלי קודש</a> · רוצים אתר כזה? בונים תוך כמה דקות, בלי הרשמה</p></footer></div></div>';
    el.innerHTML = h;
    el._o = o;
    tick(el);
    if (o.yt) {
      var c = o.yt;
      loadYt(c).then(function (j) {
        if (el._o !== o) return;
        var box = el.querySelector('[data-yt]');
        box.innerHTML = ytBlock(o, j, K) || '<section class="rv-sec" id="rv-les"><h2>' + esc(K.les) + '</h2><p class="rv-muted">עוד אין שיעורים בערוץ.</p></section>';
        el.querySelector('[data-live]').innerHTML = liveBlock(j);
        var ph = el.querySelector('[data-ph]');
        if (ph && j.img && o.yi !== 0) { var im = document.createElement('img'); im.className = 'rv-ph'; im.alt = ''; im.src = j.img; ph.replaceWith(im); }
      }).catch(function () {
        if (el._o !== o) return;
        el.querySelector('[data-yt]').innerHTML = '<section class="rv-sec" id="rv-les"><h2>' + esc(K.les) + '</h2><p>לא הצלחנו לטעון כרגע את השיעורים.</p><div class="rv-acts"><a class="rv-btn l sm" href="' + esc(chUrl(c)) + '" target="_blank" rel="noopener">לשיעורים בערוץ ביוטיוב ←</a></div></section>';
      });
    }
    if (!window.hebcal && o.city) { var sc = document.querySelector('script[data-hebcal]'); if (sc) sc.addEventListener('load', function () { if (el._o === o) el.querySelector('[data-sh]').innerHTML = shabbatBox(o); }, { once: true }); }
  }
  // ספירה לאחור לשיעור הבא
  function tick(el) {
    var cd = el.querySelector('[data-cd]');
    if (!cd) return;
    var at = +cd.getAttribute('data-at'), len = +cd.getAttribute('data-len'), ms = at - Date.now();
    if (ms <= 0) { cd.innerHTML = ms > -len * 60000 ? '<p class="rv-now">🔴 השיעור מתקיים עכשיו</p>' : ''; return; }
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    var box = function (n, l) { return '<div><b>' + n + '</b><span>' + l + '</span></div>'; };
    cd.innerHTML = '<div class="rv-cd" role="timer" aria-label="הזמן עד השיעור">' + (d ? box(d, d === 1 ? 'יום' : 'ימים') : '') + box(hh, 'שעות') + box(pad(mm), 'דקות') + (d ? '' : box(pad(ss), 'שניות')) + '</div>';
  }
  setInterval(function () { document.querySelectorAll('.rv').forEach(function (r) { if (r.parentNode && r.parentNode._o) tick(r.parentNode); }); }, 1000);

  function bindView(el) {
    el.addEventListener('click', function (e) {
      var o = el._o; if (!o) return;
      var t = e.target.closest('[data-play],[data-ics],[data-share],[data-qr],[data-ev]');
      if (!t) return;
      if (t.hasAttribute('data-play')) {
        var id = t.getAttribute('data-play');
        if (t.classList.contains('on')) return;
        t.classList.add('on');
        t.querySelector('.th').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0" title="שיעור" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
        ev('rav_play');
      } else if (t.hasAttribute('data-ics')) {
        var s = o.s[+t.getAttribute('data-ics')];
        if (s) { download((s.t || 'shiur') + '.ics', icsFor(o, s, nextOf(s, new Date())), 'text/calendar;charset=utf-8'); ev('rav_ics'); }
      } else if (t.hasAttribute('data-share')) {
        var url = o._url || location.href, text = o.name + (o.sub ? ' · ' + o.sub : '');
        if (navigator.share) navigator.share({ title: o.name, text: text, url: url }).catch(function () {});
        else window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + url), '_blank');
        ev('rav_share');
      } else if (t.hasAttribute('data-qr')) {
        var qb = el.querySelector('[data-qrbox]');
        if (qb.innerHTML) { qb.innerHTML = ''; return; }
        qb.innerHTML = '<div class="rv-qr"></div><p class="rv-muted">צלמו את הקוד כדי לפתוח את הדף. להדפסה כשלט: <a href="/kodesh/qr/" style="color:var(--racc)">שלט QR</a></p>';
        if (window.QRCode) new window.QRCode(qb.querySelector('.rv-qr'), { text: o._url || location.href, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.L });
      } else ev('rav_' + t.getAttribute('data-ev'));
    });
  }

  // ======================= הדף הציבורי =======================
  var view = $('rv-view');
  if (view) {
    bindView(view);
    var show = function (o, url) {
      if (!o || !o.name) throw new Error('bad');
      o._url = url || location.href;
      document.title = o.name + (o.sub ? ' · ' + o.sub : '');
      render(view, o, { pub: true });
      ev('rav_view', { kind: o.k || 'rav' });
    };
    var fail = function () { view.innerHTML = '<div class="rv"><div class="rv-in"><p class="rv-wait">לא הצלחנו לפתוח את הדף. בדקו שיש אינטרנט ונסו שוב, או בקשו קישור חדש.<br><br><a class="rv-btn p" href="/kodesh/atar/">לבנות אתר כזה בחינם</a></p></div></div>'; };
    var hsh = location.hash, m;
    if ((m = hsh.match(/#k=([0-9A-Za-z]{6})/))) {
      fetch(KART + '/s/' + m[1]).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (j) {
        var o = dec(j.d);
        if (o.t !== 'r') { location.replace('/kodesh/kartis/#k=' + m[1]); return; }
        show(o, PAGE + '#k=' + m[1]);
      }).catch(fail);
    } else if ((m = hsh.match(/#z=([\w-]+)/))) decZ(m[1]).then(function (o) { show(o); }).catch(fail);
    else if ((m = hsh.match(/#d=([\w-]+)/))) { try { show(dec(m[1])); } catch (e) { fail(); } }
    else location.replace('/kodesh/atar/');
    return;
  }

  // ======================= העורך =======================
  var form = $('ra-form'), prev = $('ra-prev');
  if (!form) return;
  bindView(prev);
  var rowsEl = $('ra-rows'), KEY = 'kodesh-atar';
  $('ra-city').innerHTML = '<option value="">בלי זמני שבת</option>' + CITIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('');
  $('ra-ths').innerHTML = THEMES.map(function (t, i) { return '<label><input type="radio" name="th" value="' + t[0] + '"' + (i ? '' : ' checked') + '><span><i style="background:' + t[2] + ';border-color:' + t[3] + '"></i>' + t[1] + '</span></label>'; }).join('');
  var dayOpts = DAYS.map(function (d, i) { return '<option value="' + i + '">יום ' + d + '</option>'; }).join('') + '<option value="a">א\'–ה\' (כל יום חול)</option><option value="w">א\'–ו\'</option>';
  function addRow(s) {
    s = s || { d: '0', h: '20:30', t: '', p: '' };
    var r = document.createElement('div');
    r.className = 'ra-row';
    r.innerHTML = '<select aria-label="יום" data-f="d">' + dayOpts + '</select><input type="time" aria-label="שעה" data-f="h" step="300"><input class="full" type="text" maxlength="70" aria-label="שם השיעור" placeholder="שם השיעור: דף יומי, גמרא, הלכה, שיעור לנשים" data-f="t"><input class="full" type="text" maxlength="70" aria-label="מקום (לא חובה)" placeholder="מקום (לא חובה): בית הכנסת, זום, כתובת" data-f="p"><button class="x" type="button" data-del>להסיר</button>';
    r.querySelector('[data-f=d]').value = String(s.d);
    r.querySelector('[data-f=h]').value = s.h || '';
    r.querySelector('[data-f=t]').value = s.t || '';
    r.querySelector('[data-f=p]').value = s.p || '';
    rowsEl.appendChild(r);
    return r;
  }
  rowsEl.addEventListener('click', function (e) { if (e.target.closest('[data-del]')) { e.target.closest('.ra-row').remove(); upd(); } });
  $('ra-add').addEventListener('click', function () { addRow().querySelector('[data-f=t]').focus(); upd(); });

  var img = '';
  function read() {
    var o = { t: 'r' }, v = function (n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; };
    var k = form.querySelector('[name=k]:checked'); if (k && k.value !== 'rav') o.k = k.value;
    var th = form.querySelector('[name=th]:checked'); if (th && th.value !== 'laila') o.th = th.value;
    ['name', 'sub', 'intro', 'yt', 'ph', 'city', 'addr', 'site', 'mail'].forEach(function (n) { var x = v(n); if (x) o[n] = x; });
    var iu = v('imgurl'); if (img) o.img = img; else if (iu) o.img = iu;
    if (!$('ra-shorts').checked) o.sh = 0;
    if (!$('ra-yi').checked) o.yi = 0;
    if ($('ra-call').checked) o.call = 1;
    var s = [];
    rowsEl.querySelectorAll('.ra-row').forEach(function (r) {
      var g = function (f) { return r.querySelector('[data-f=' + f + ']').value.trim(); };
      var d = g('d'), h = g('h'), t = g('t'), p = g('p');
      if (!t || !/^\d{1,2}:\d{2}$/.test(h)) return;
      var it = { d: /^[0-6]$/.test(d) ? +d : d, h: h, t: t }; if (p) it.p = p; s.push(it);
    });
    if (s.length) o.s = s;
    return o;
  }
  function fill(o) {
    ['name', 'sub', 'intro', 'yt', 'ph', 'city', 'addr', 'site', 'mail'].forEach(function (n) { var el = form.querySelector('[name=' + n + ']'); if (el && o[n] != null) el.value = o[n]; });
    var k = form.querySelector('[name=k][value=' + (o.k || 'rav') + ']'); if (k) k.checked = true;
    var th = form.querySelector('[name=th][value=' + (o.th || 'laila') + ']'); if (th) th.checked = true;
    if (o.img && /^data:/.test(o.img)) { img = o.img; } else if (o.img) form.querySelector('[name=imgurl]').value = o.img;
    $('ra-shorts').checked = o.sh !== 0;
    $('ra-yi').checked = o.yi !== 0;
    $('ra-call').checked = !!o.call;
    rowsEl.innerHTML = '';
    (o.s || []).forEach(addRow);
    picPrev();
  }
  function picPrev() { var p = $('ra-picprev'); p.hidden = !img; if (img) p.src = img; $('ra-picdel').hidden = !img; }
  // תמונה מהטלפון: מוקטנת לעיגול קטן כדי שהקישור יישאר קצר
  $('ra-pic').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var u = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      var S = 112, c = document.createElement('canvas'); c.width = c.height = S;
      var m = Math.min(im.width, im.height), x = c.getContext('2d');
      x.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, S, S);
      var q = 0.7; img = c.toDataURL('image/jpeg', q);
      while (img.length > 2600 && q > 0.3) { q -= 0.1; img = c.toDataURL('image/jpeg', q); }
      URL.revokeObjectURL(u); picPrev(); upd();
    };
    im.src = u;
  });
  $('ra-picdel').addEventListener('click', function () { img = ''; $('ra-pic').value = ''; picPrev(); upd(); });

  var tm = null;
  function upd() {
    var o = read();
    try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    clearTimeout(tm);
    tm = setTimeout(function () {
      if (o.name) render(prev, o); else prev.innerHTML = '<p class="rv-wait" style="color:var(--muted)">כותבים שם, והדף נבנה כאן.</p>';
    }, 350);
    $('ra-ready').hidden = true;
  }
  form.addEventListener('input', upd);
  form.addEventListener('change', upd);
  var DEMO = { t: 'r', name: 'הרב אליעזר בן-דוד', sub: 'רב קהילת "אור החיים", חיפה', intro: 'ברוכים הבאים. כאן תמצאו את השיעורים, את המערכת השבועית, ודרך פשוטה לשאול כל שאלה.', yt: '@HarEtzion-TheGush', yi: 0, ph: '050-0000000', city: '32.79,34.99', addr: 'רחוב הנביאים 10, חיפה', s: [{ d: 'a', h: '06:15', t: 'דף יומי לפני שחרית', p: 'בית הכנסת' }, { d: 1, h: '20:30', t: 'שיעור בהלכות שבת' }, { d: 3, h: '20:00', t: 'שיעור לנשים: פרשת השבוע', p: 'אולם הקהילה' }, { d: 6, h: '16:30', t: 'שיעור בין מנחה לערבית' }] };
  $('ra-demo').addEventListener('click', function () { img = ''; form.reset(); fill(DEMO); upd(); });
  try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.name) fill(saved); else fill({ s: [{ d: 0, h: '20:30', t: '' }] }); } catch (e) { fill({}); }
  // עריכה של דף קיים: /kodesh/atar/#z=...
  var me = location.hash.match(/#([zd])=([\w-]+)/);
  if (me) (me[1] === 'z' ? decZ(me[2]) : Promise.resolve(dec(me[2]))).then(function (o) { img = ''; form.reset(); fill(o); upd(); }).catch(function () {});
  upd();

  function shortLink(o) {
    var d = enc(o);
    if (d.length > 4000 || !window.fetch) return Promise.resolve('');
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(KART + '/s', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ d: d }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { clearTimeout(t); return j && /^[0-9A-Za-z]{6}$/.test(j.k) ? PAGE + '#k=' + j.k : ''; })
      .catch(function () { clearTimeout(t); return ''; });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var o = read(), btn = form.querySelector('[type=submit]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'בונים את הקישור…';
    Promise.all([encZ(o), shortLink(o)]).then(function (r) {
      var long = PAGE + '#' + r[0], url = r[1] || long, edit = location.origin + '/kodesh/atar/#' + r[0];
      btn.disabled = false; btn.textContent = label;
      $('ra-link').value = url;
      $('ra-open').href = url;
      $('ra-edit').value = edit;
      $('ra-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(o.name + ' – השיעורים, המערכת השבועית ושאלות לרב, בקישור אחד:\n' + url);
      $('ra-ok').textContent = r[1] ? 'קישור קצר. אפשר גם להדפיס אותו כקוד QR.' : 'הקישור ארוך יותר (התמונה מהטלפון או שאין חיבור לשרת), אבל עובד בדיוק אותו דבר.';
      var qb = $('ra-qr'); qb.innerHTML = '';
      if (window.QRCode && url.length < 1200) { new window.QRCode(qb, { text: url, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.L }); $('ra-qrwrap').hidden = false; } else $('ra-qrwrap').hidden = true;
      $('ra-ready').hidden = false;
      $('ra-ready').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.toolUsed) window.toolUsed('rav_atar', { kind: o.k || 'rav', has_yt: !!o.yt, lessons: (o.s || []).length, short: !!r[1] });
    });
  });
  $('ra-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText($('ra-link').value) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק את הקישור'; }, 2500); }).catch(function () { $('ra-link').select(); });
  });
  $('ra-qrdl').addEventListener('click', function () {
    var c = $('ra-qr').querySelector('canvas'); if (!c) return;
    var a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'qr-atar.png'; document.body.appendChild(a); a.click(); a.remove();
  });
})();
