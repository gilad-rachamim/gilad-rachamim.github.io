// סטודיו לעיצוב – עורך גרפי בדפדפן (בסגנון Canva) + עוזר שמעצב לפי מה שכותבים במילים.
// מבנה: פרויקט = גודל + עמודים; עמוד = רקע + שכבות (טקסט / תמונה / מלבן / עיגול / קו / סמל).
// הכול נשמר במכשיר: הפרויקט ב-localStorage, התמונות ב-IndexedDB. לעוזר נשלח הטקסט, המבנה, וגרסה קטנה (512px) של התמונות שבשימוש –
// רק כשלוחצים על העוזר, והשרת לא שומר אותן. הסרת רקע רצה כולה בטלפון/במחשב (studio-bg-worker.js), בלי לשלוח את התמונה לשום מקום.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const app = $('sd-app');
  if (!app) return;
  const AI_URL = 'https://kelim-studio.gilad4049.workers.dev/design';
  const KEY = 'kelim-studio-v1';
  const FONTS = ['Assistant', 'Heebo', 'Rubik', 'Varela Round', 'Secular One', 'Suez One', 'Frank Ruhl Libre',
    'David Libre', 'Bellefair', 'Noto Rashi Hebrew', 'Amatic SC', 'Karantina'];
  const SWATCH = ['#ffffff', '#000000', '#16130f', '#4a4a4a', '#9e9e9e', '#efe6d2', '#c9a55c', '#5f5d43', '#1e3a5f', '#2f6fd6',
    '#14b8a6', '#2e7d32', '#f5c518', '#ff8a00', '#e53935', '#d81b60', '#7b3fbf', '#8d6e63'];
  // לאן העיצוב מיועד: גודל + "אזור בטוח" (איפה האפליקציה מכסה בכפתורים ובשם) + הסבר לעוזר
  // safe: חלקים מהקנבס שמכוסים – t למעלה, b למטה, r ימין (כפתורי לייק/שיתוף ברילס), circle = פרופיל עגול
  const DEST = [
    { id: 'wa', n: 'סטטוס בווטסאפ', ic: '🟢', w: 1080, h: 1920, safe: { t: 0.1, b: 0.12 }, ai: 'סטטוס בווטסאפ (מסך מלא לאורך; למעלה שם השולח ולמטה שורת התגובה – להשאיר שם רק רקע)' },
    { id: 'igpost', n: 'פוסט באינסטגרם', ic: '📷', w: 1080, h: 1350, ai: 'פוסט באינסטגרם לאורך 4:5 (הכי בולט בפיד)' },
    { id: 'square', n: 'פוסט ריבוע', ic: '⬛', w: 1080, h: 1080, ai: 'פוסט ריבוע לאינסטגרם, פייסבוק או קבוצת ווטסאפ' },
    { id: 'story', n: 'סטורי (אינסטגרם / פייסבוק)', ic: '⭕', w: 1080, h: 1920, safe: { t: 0.14, b: 0.2 }, ai: 'סטורי באינסטגרם/פייסבוק (14% עליונים ו-20% תחתונים מכוסים בשם ובשורת התגובה – בלי טקסט שם)' },
    { id: 'reels', n: 'רילס / טיקטוק / שורטס', ic: '🎬', w: 1080, h: 1920, safe: { t: 0.12, b: 0.26, r: 0.15 }, ai: 'שער (תמונת פתיחה) לרילס/טיקטוק/שורטס, או שכבת כותרת מעל סרטון. 12% עליונים, 26% תחתונים ו-15% מצד ימין מכוסים בכפתורים ובכיתוב – הכותרת במרכז, גדולה ובולטת' },
    { id: 'fbpost', n: 'פוסט בפייסבוק', ic: '👍', w: 1080, h: 1350, ai: 'פוסט בפייסבוק לאורך' },
    { id: 'fblink', n: 'תמונה רחבה לפייסבוק / קישור', ic: '🔗', w: 1200, h: 630, ai: 'תמונה רחבה לפוסט בפייסבוק או לתצוגה של קישור (טקסט קצר וגדול)' },
    { id: 'cover', n: 'קאבר לפייסבוק', ic: '🖼️', w: 1640, h: 624, safe: { b: 0.28, l: 0.24 }, ai: 'תמונת קאבר לדף פייסבוק (בטלפון החלק התחתון-שמאלי מכוסה בתמונת הפרופיל – לשים את הטקסט במרכז ולמעלה)' },
    { id: 'profile', n: 'תמונת פרופיל', ic: '👤', w: 1080, h: 1080, safe: { circle: 1 }, ai: 'תמונת פרופיל עגולה (רק העיגול שבמרכז נראה – הכול בתוכו, מעט טקסט או בלי)' },
    { id: 'yt', n: 'תמונה ממוזערת ליוטיוב', ic: '▶️', w: 1280, h: 720, safe: { b: 0.14, l: 0.2 }, ai: 'תמונה ממוזערת לסרטון ביוטיוב (2-5 מילים ענקיות, ניגודיות חזקה; בפינה התחתונה-שמאלית מופיע משך הסרטון)' },
    { id: 'slide', n: 'מצגת / מסך רחב', ic: '🖥️', w: 1920, h: 1080, ai: 'שקופית במצגת או מסך רחב' },
    { id: 'a4', n: 'דף להדפסה A4', ic: '📄', w: 1240, h: 1754, ai: 'דף מודפס בגודל A4 לאורך (מודעה לתלייה, עלון) – שוליים של לפחות 6%' },
    { id: 'a4l', n: 'A4 לרוחב', ic: '📄', w: 1754, h: 1240, ai: 'דף מודפס A4 לרוחב' },
    { id: 'card', n: 'כרטיס ביקור', ic: '💳', w: 1050, h: 600, ai: 'כרטיס ביקור להדפסה' }
  ];
  const SIZES = DEST.map(d => [d.id, d.n, d.w, d.h]);
  const destOf = () => DEST.find(d => d.id === P.dest) || null;
  const PALETTES = [
    { n: 'לבן חוסך דיו', bg: '#ffffff', grad: null, t: '#16130f', b: '#3d3d3d', a: '#c9a55c' },
    { n: 'ירוק זית', bg: '#5f5d43', grad: '#3f3e2b', t: '#fbf5e7', b: '#efe6d2', a: '#dcbb74' },
    { n: 'קלף', bg: '#efe6d2', grad: '#e2d3b0', t: '#3b2a12', b: '#4a3b26', a: '#8a6a2c' },
    { n: 'לילה וזהב', bg: '#16130f', grad: '#2a2218', t: '#dcbb74', b: '#efe6d2', a: '#c9a55c' },
    { n: 'כחול ים', bg: '#0f2e4f', grad: '#1e5a8a', t: '#ffffff', b: '#d6e6f5', a: '#f5c518' },
    { n: 'שמש', bg: '#ffd84d', grad: '#ff9f43', t: '#2b1600', b: '#3d2300', a: '#ffffff' },
    { n: 'ורוד', bg: '#ffe4ee', grad: '#ffc2d6', t: '#8e1846', b: '#5c1030', a: '#d81b60' },
    { n: 'טורקיז', bg: '#0d4d4d', grad: '#14807a', t: '#ffffff', b: '#d5f5f0', a: '#ffd166' }
  ];
  const AI_EXAMPLES = [
    'פוסט לשיעור תורה ביום שלישי ב-20:30 בבית הכנסת, כחול וזהב, כותרת "ערב של אמונה"',
    'ברכת יום הולדת שמח לנועה בת 7, צבעוני ושמח',
    'מודעת מבצע: 20% הנחה על כל החנות עד סוף החודש, אדום וצהוב בולט',
    'סטטוס "שבת שלום" עדין בצבעי קלף וזהב',
    'תוסיף כיתוב לבן גדול על התמונה: "רגעים של אור", עם רקע כהה שקוף מאחורי הטקסט'
  ];

  // סמלים (SVG פשוט, viewBox 24) – נצבעים בצבע לבחירה (currentColor)
  const ST = (d, w) => '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  const ICONS = {
    phone: ['טלפון', '<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>'],
    pin: ['מיקום', '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>'],
    clock: ['שעון', '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>' + ST('M12 7v5l3.2 3.2')],
    calendar: ['לוח שנה', '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke-linecap="round"/></g>'],
    heart: ['לב', '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>'],
    magen: ['מגן דוד', ST('M12 2.5l8.3 14.4H3.7zM12 21.5L3.7 7.1h16.6z', 1.6)],
    candles: ['נרות', '<rect x="5.5" y="11" width="4" height="11" rx="1"/><rect x="14.5" y="11" width="4" height="11" rx="1"/><path d="M7.5 2.5c1.6 2.1 2.2 3.3 2.2 4.4a2.2 2.2 0 0 1-4.4 0c0-1.1.6-2.3 2.2-4.4zM16.5 2.5c1.6 2.1 2.2 3.3 2.2 4.4a2.2 2.2 0 0 1-4.4 0c0-1.1.6-2.3 2.2-4.4z"/>'],
    book: ['ספר', ST('M2.5 5.5c3-1.3 6.3-1.1 9.5 1 3.2-2.1 6.5-2.3 9.5-1v13.5c-3-1.3-6.3-1.1-9.5 1-3.2-2.1-6.5-2.3-9.5-1zM12 6.5v13.5')],
    gift: ['מתנה', '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8C10.5 4 6 4 6.6 6.6 7 8 12 8 12 8zm0 0c1.5-4 6-4 5.4-1.4C17 8 12 8 12 8z"/></g>'],
    cup: ['כוס קידוש', ST('M6.5 3h11c0 5.5-2.4 8.5-5.5 8.5S6.5 8.5 6.5 3zM12 11.5V19M8 21h8')],
    star: ['כוכב', '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>'],
    flower: ['פרח', '<circle cx="12" cy="6.3" r="3.6"/><circle cx="17.7" cy="12" r="3.6"/><circle cx="12" cy="17.7" r="3.6"/><circle cx="6.3" cy="12" r="3.6"/><circle cx="12" cy="12" r="2.4" fill="#ffffff" fill-opacity=".8"/>'],
    sun: ['שמש', '<circle cx="12" cy="12" r="4.5"/>' + ST('M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8', 2)],
    crown: ['כתר', '<path d="M3 17.5L2 7l5.5 4.5L12 4l4.5 7.5L22 7l-1 10.5z"/><rect x="3" y="19" width="18" height="2.5" rx="1"/>'],
    balloon: ['בלון', '<path d="M12 2c3.9 0 7 3.1 7 7.2 0 4.3-3.6 7.8-7 7.8s-7-3.5-7-7.8C5 5.1 8.1 2 12 2zM12 17l-1.3 2h2.6z"/>' + ST('M12 19c0 1.6-1.6 1.6-1.6 3', 1.2)],
    music: ['תו', ST('M9 18V5l11-2v13') + '<circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'],
    home: ['בית', ST('M3 11l9-8 9 8M5.5 9.5V21H10v-6h4v6h4.5V9.5')],
    mail: ['מייל', '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/></g>'],
    chat: ['הודעה', '<path d="M4 3.5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9.5L4.5 21.5v-4H4a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2z"/>'],
    user: ['אדם', '<circle cx="12" cy="8" r="4.2"/><path d="M3.8 21c0-4.6 3.7-7.3 8.2-7.3s8.2 2.7 8.2 7.3z"/>'],
    check: ['וי', ST('M4.5 12.5l4.8 4.8L19.5 7', 2.6)],
    arrow: ['חץ', ST('M20 12H5M11 5.5L4.5 12l6.5 6.5', 2.2)],
    pomegranate: ['רימון', '<path d="M12 6.5c5 0 8.5 3.4 8.5 7.8S16.7 22 12 22s-8.5-3.3-8.5-7.7S7 6.5 12 6.5z"/><path d="M9 7.2L8.3 3.5l2.2 1.6L12 2.5l1.5 2.6 2.2-1.6-.7 3.7z"/>']
  };
  function iconSvg(name) { const i = ICONS[name] || ICONS.star; return '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + i[1] + '</svg>'; }
  // מסגרות בצורות לתמונה (clip-path – נשמר גם בייצוא)
  const MASKS = [['', 'בלי'], ['circle', 'עיגול'], ['heart', 'לב'], ['arch', 'קשת'], ['hex', 'משושה'], ['star', 'כוכב'], ['diamond', 'יהלום'], ['blob', 'כתם']];
  function maskCss(e) {
    const w = e.w, h = e.h, m = e.mask;
    if (!m) return '';
    if (m === 'circle') return 'ellipse(50% 50% at 50% 50%)';
    if (m === 'hex') return 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';
    if (m === 'diamond') return 'polygon(50% 0,100% 50%,50% 100%,0 50%)';
    if (m === 'star') { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.4 : 0.5; p.push((50 + r * 100 * Math.cos(a)).toFixed(1) + '% ' + (52 + r * 100 * Math.sin(a)).toFixed(1) + '%'); } return 'polygon(' + p.join(',') + ')'; }
    if (m === 'arch') { const rx = w / 2, ry = Math.min(h, w / 2); return 'inset(0 round ' + rx + 'px ' + rx + 'px 0 0 / ' + ry + 'px ' + ry + 'px 0 0)'; }
    const sx = w / 100, sy = h / 100, f = (x, y) => (x * sx).toFixed(1) + ' ' + (y * sy).toFixed(1);
    if (m === 'heart') return 'path("M ' + f(50, 97) + ' C ' + f(20, 74) + ' ' + f(0, 55) + ' ' + f(0, 31) + ' C ' + f(0, 13) + ' ' + f(13, 2) + ' ' + f(28, 2) + ' C ' + f(39, 2) + ' ' + f(46, 9) + ' ' + f(50, 18) + ' C ' + f(54, 9) + ' ' + f(61, 2) + ' ' + f(72, 2) + ' C ' + f(87, 2) + ' ' + f(100, 13) + ' ' + f(100, 31) + ' C ' + f(100, 55) + ' ' + f(80, 74) + ' ' + f(50, 97) + ' Z")';
    if (m === 'blob') return 'path("M ' + f(52, 2) + ' C ' + f(78, 0) + ' ' + f(99, 18) + ' ' + f(98, 46) + ' C ' + f(97, 74) + ' ' + f(80, 99) + ' ' + f(50, 98) + ' C ' + f(20, 97) + ' ' + f(1, 78) + ' ' + f(2, 50) + ' C ' + f(3, 22) + ' ' + f(24, 4) + ' ' + f(52, 2) + ' Z")';
    return '';
  }

  // ---------- מצב ----------
  let P = null;          // הפרויקט: {w,h,pages:[{bg,els}],cur,lib:[{id,w,h,name}]}
  let sel = null;        // מזהה השכבה הנבחרת
  let scale = 1;
  let zoom = 1;          // זום של התצוגה בלבד (צביטה בטלפון / כפתורי + −)
  let cropId = null;     // שכבת התמונה שנמצאת עכשיו במצב חיתוך
  const IMG = {};        // id -> dataURL (מטמון בזיכרון)
  const hist = [], fut = [];
  let tab = 'ai';
  const uid = () => Math.random().toString(36).slice(2, 9);
  const page = () => P.pages[P.cur];
  const elById = id => page().els.find(e => e.id === id);
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const used = (how, x) => { try { window.toolUsed && window.toolUsed('studio', Object.assign({ how }, x || {})); } catch (e) {} };

  // ---------- IndexedDB לתמונות ----------
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res) => {
      try {
        const r = indexedDB.open('kelim-studio', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('img');
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
    return dbp;
  }
  async function imgPut(id, data) {
    IMG[id] = data;
    const d = await db(); if (!d) return;
    try { d.transaction('img', 'readwrite').objectStore('img').put(data, id); } catch (e) {}
  }
  async function imgGet(id) {
    if (IMG[id]) return IMG[id];
    const d = await db(); if (!d) return null;
    return new Promise(res => {
      try { const q = d.transaction('img').objectStore('img').get(id); q.onsuccess = () => { if (q.result) IMG[id] = q.result; res(q.result || null); }; q.onerror = () => res(null); }
      catch (e) { res(null); }
    });
  }
  async function loadAllImages() { for (const i of P.lib) await imgGet(i.id); }

  // ---------- שמירה והיסטוריה ----------
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }, 250);
  }
  function snap() { hist.push(JSON.stringify(P)); if (hist.length > 80) hist.shift(); fut.length = 0; updUndo(); }
  function undo() { if (!hist.length) return; fut.push(JSON.stringify(P)); P = JSON.parse(hist.pop()); sel = null; full(); updUndo(); }
  function redo() { if (!fut.length) return; hist.push(JSON.stringify(P)); P = JSON.parse(fut.pop()); sel = null; full(); updUndo(); }
  function updUndo() { $('sd-undo').disabled = !hist.length; $('sd-redo').disabled = !fut.length; }
  // שינוי רציף (גרירה, סליידר): צילום אחד בתחילת הרצף
  let burst = 0;
  function snapOnce() { const now = Date.now(); if (now - burst > 700) snap(); burst = now; }

  // ---------- תבניות ----------
  function T(o) { return Object.assign({ id: uid(), type: 'text', x: 80, y: 80, w: 920, h: 100, rot: 0, opacity: 1, font: 'Assistant', size: 60, weight: 700, color: '#111111', align: 'center', lh: 1.25, ls: 0, bg: null, pad: 0, radius: 0, stroke: null, sw: 0, shadow: false }, o); }
  function S(type, o) { return Object.assign({ id: uid(), type, x: 0, y: 0, w: 200, h: 200, rot: 0, opacity: 1, fill: '#c9a55c', stroke: null, sw: 0, radius: 0 }, o); }
  function I(icon, o) { return Object.assign({ id: uid(), type: 'icon', icon, x: 0, y: 0, w: 120, h: 120, rot: 0, opacity: 1, fill: '#c9a55c' }, o); }
  const BG = (color, grad, angle) => ({ color, grad: grad || null, angle: angle || 160, img: null, dim: 0 });
  const TEMPLATES = [
    { n: 'שיעור / ערב', w: 1080, h: 1350, bg: { color: '#0f2e4f', grad: '#1b4f7d', angle: 160, img: null, dim: 0 }, els: () => [
      S('rect', { x: 50, y: 50, w: 980, h: 1250, fill: null, stroke: '#c9a55c', sw: 4, radius: 24 }),
      T({ y: 170, h: 60, text: 'הזמנה לשיעור', size: 44, weight: 600, color: '#dcbb74', font: 'Heebo' }),
      T({ y: 260, h: 300, text: 'ערב של\nאמונה', size: 140, weight: 400, color: '#ffffff', font: 'Suez One', lh: 1.05 }),
      S('line', { x: 390, y: 610, w: 300, h: 4, stroke: '#c9a55c', sw: 4 }),
      T({ y: 670, h: 70, text: 'עם הרב דוד כהן', size: 54, weight: 500, color: '#d6e6f5', font: 'Heebo' }),
      T({ x: 190, y: 860, w: 700, h: 170, text: 'יום שלישי · 20:30\nבית הכנסת המרכזי', size: 50, weight: 700, color: '#0f2e4f', bg: '#dcbb74', pad: 24, radius: 20, font: 'Heebo' }),
      T({ y: 1150, h: 50, text: 'הכניסה חופשית · כיבוד קל', size: 36, weight: 400, color: '#d6e6f5', font: 'Heebo' })] },
    { n: 'יום הולדת', w: 1080, h: 1080, bg: { color: '#ffe4ee', grad: '#ffd6a5', angle: 135, img: null, dim: 0 }, els: () => [
      S('ellipse', { x: -120, y: -120, w: 420, h: 420, fill: '#ff8fab', opacity: 0.45 }),
      S('ellipse', { x: 820, y: 800, w: 400, h: 400, fill: '#ffd166', opacity: 0.6 }),
      S('ellipse', { x: 860, y: 90, w: 120, h: 120, fill: '#7bdff2', opacity: 0.7 }),
      T({ y: 250, h: 200, text: 'יום הולדת שמח', size: 170, weight: 700, color: '#d81b60', font: 'Amatic SC', lh: 1 }),
      T({ y: 480, h: 180, text: 'נועה', size: 190, weight: 400, color: '#7b3fbf', font: 'Secular One', lh: 1 }),
      T({ y: 700, h: 70, text: 'בת 7! מאחלים לך שמחה, בריאות והמון חיוכים', size: 46, weight: 600, color: '#5c1030', font: 'Varela Round' })] },
    { n: 'מבצע', w: 1080, h: 1080, bg: { color: '#e53935', grad: '#b71c1c', angle: 160, img: null, dim: 0 }, els: () => [
      S('rect', { x: -60, y: 760, w: 1200, h: 200, fill: '#f5c518', rot: -6 }),
      T({ y: 110, h: 90, text: 'רק החודש', size: 70, weight: 800, color: '#ffffff', font: 'Rubik' }),
      T({ y: 220, h: 330, text: '20%\nהנחה', size: 210, weight: 900, color: '#f5c518', font: 'Rubik', lh: 0.85, shadow: true }),
      T({ y: 600, h: 80, text: 'על כל החנות', size: 64, weight: 700, color: '#ffffff', font: 'Rubik' }),
      T({ y: 805, h: 80, text: 'עד סוף החודש · בחנות ובאתר', size: 56, weight: 800, color: '#7a0c0c', font: 'Rubik', rot: -6 })] },
    { n: 'שבת שלום', w: 1080, h: 1920, bg: { color: '#efe6d2', grad: '#e0cfa6', angle: 180, img: null, dim: 0 }, els: () => [
      S('rect', { x: 70, y: 70, w: 940, h: 1780, fill: null, stroke: '#8a6a2c', sw: 3, radius: 0 }),
      S('rect', { x: 95, y: 95, w: 890, h: 1730, fill: null, stroke: '#8a6a2c', sw: 1.5, radius: 0 }),
      T({ y: 640, h: 360, text: 'שבת\nשלום', size: 210, weight: 700, color: '#3b2a12', font: 'Frank Ruhl Libre', lh: 1 }),
      S('line', { x: 390, y: 1050, w: 300, h: 3, stroke: '#8a6a2c', sw: 3 }),
      T({ y: 1100, h: 70, text: 'ומבורך', size: 64, weight: 400, color: '#6b5428', font: 'Bellefair' })] },
    { n: 'ציטוט', w: 1080, h: 1080, bg: { color: '#5f5d43', grad: '#3f3e2b', angle: 160, img: null, dim: 0 }, els: () => [
      T({ y: 150, h: 200, text: '״', size: 260, weight: 700, color: '#dcbb74', font: 'Frank Ruhl Libre', lh: 1 }),
      T({ x: 120, w: 840, y: 360, h: 300, text: 'אם אין אני לי מי לי,\nוכשאני לעצמי מה אני,\nואם לא עכשיו אימתי', size: 64, weight: 500, color: '#fbf5e7', font: 'Frank Ruhl Libre', lh: 1.4 }),
      S('line', { x: 440, y: 740, w: 200, h: 3, stroke: '#dcbb74', sw: 3 }),
      T({ y: 790, h: 60, text: 'הלל, פרקי אבות', size: 42, weight: 400, color: '#dcbb74', font: 'Assistant' })] },
    { n: 'כרטיס ביקור', w: 1050, h: 600, bg: { color: '#16130f', grad: null, angle: 0, img: null, dim: 0 }, els: () => [
      S('rect', { x: 0, y: 520, w: 1050, h: 80, fill: '#5f5d43' }),
      T({ x: 80, w: 890, y: 140, h: 100, text: 'ישראל ישראלי', size: 84, weight: 700, color: '#dcbb74', font: 'Frank Ruhl Libre', align: 'right' }),
      T({ x: 80, w: 890, y: 250, h: 50, text: 'צלם אירועים', size: 40, weight: 400, color: '#efe6d2', font: 'Assistant', align: 'right' }),
      T({ x: 80, w: 890, y: 360, h: 100, text: '050-0000000\nexample@mail.com', size: 34, weight: 400, color: '#efe6d2', font: 'Assistant', align: 'right', lh: 1.4 })] },
    // ---- חגים ----
    { g: 'חגים ושבת', n: 'ראש השנה', w: 1080, h: 1350, bg: BG('#5a0f1c', '#8e1b2c'), els: () => [
      S('rect', { x: 50, y: 50, w: 980, h: 1250, fill: null, stroke: '#dcbb74', sw: 3, radius: 30 }),
      I('pomegranate', { x: 440, y: 140, w: 200, h: 200, fill: '#dcbb74' }),
      T({ y: 390, text: 'שנה טובה\nומתוקה', size: 150, weight: 400, color: '#fbf5e7', font: 'Suez One', lh: 1.05 }),
      S('line', { x: 390, y: 760, w: 300, h: 4, stroke: '#dcbb74', sw: 4 }),
      T({ y: 810, text: 'כתיבה וחתימה טובה', size: 66, weight: 500, color: '#dcbb74', font: 'Frank Ruhl Libre' }),
      T({ y: 1120, text: 'משפחת ישראלי', size: 46, weight: 400, color: '#f3d9b1', font: 'Heebo' })] },
    { g: 'חגים ושבת', n: 'סוכות', w: 1080, h: 1080, bg: BG('#1f4d2b', '#2e7d32'), els: () => [
      S('rect', { x: 0, y: 0, w: 1080, h: 64, fill: '#a1887f' }),
      S('ellipse', { x: -40, y: 20, w: 260, h: 90, fill: '#81c784', opacity: 0.8 }), S('ellipse', { x: 230, y: 30, w: 300, h: 90, fill: '#66bb6a', opacity: 0.8 }),
      S('ellipse', { x: 540, y: 18, w: 280, h: 95, fill: '#81c784', opacity: 0.8 }), S('ellipse', { x: 820, y: 30, w: 300, h: 90, fill: '#66bb6a', opacity: 0.8 }),
      I('sun', { x: 470, y: 170, w: 140, h: 140, fill: '#ffe082' }),
      T({ y: 340, text: 'חג סוכות\nשמח', size: 160, weight: 400, color: '#fff8e1', font: 'Secular One', lh: 1 }),
      T({ y: 700, text: 'מועדים לשמחה, חגים וזמנים לששון', size: 50, weight: 600, color: '#ffe082', font: 'Heebo' }),
      T({ y: 900, text: 'משפחת ישראלי', size: 42, weight: 400, color: '#c8e6c9', font: 'Heebo' })] },
    { g: 'חגים ושבת', n: 'חנוכה', w: 1080, h: 1350, bg: BG('#0d2a52', '#1e5a8a'), els: () => [
      S('ellipse', { x: -100, y: 1030, w: 420, h: 420, fill: '#f5c518', opacity: 0.12 }),
      S('ellipse', { x: 800, y: -90, w: 380, h: 380, fill: '#ffffff', opacity: 0.08 }),
      I('candles', { x: 415, y: 130, w: 250, h: 250, fill: '#f5c518' }),
      T({ y: 430, text: 'חנוכה שמח', size: 160, weight: 400, color: '#ffffff', font: 'Suez One' }),
      T({ y: 660, text: 'נס גדול היה פה', size: 74, weight: 500, color: '#f5c518', font: 'Frank Ruhl Libre' }),
      T({ y: 1150, text: 'מאירים יחד · משפחת ישראלי', size: 44, weight: 400, color: '#d6e6f5', font: 'Heebo' })] },
    { g: 'חגים ושבת', n: 'פורים', w: 1080, h: 1080, bg: BG('#6a1b9a', '#ff8a00', 135), els: () => [
      I('balloon', { x: 70, y: 690, w: 150, h: 150, fill: '#ff80ab' }), I('balloon', { x: 860, y: 110, w: 130, h: 130, fill: '#80d8ff' }),
      I('crown', { x: 430, y: 80, w: 220, h: 220, fill: '#ffd54f' }),
      T({ y: 320, text: 'פורים\nשמח!', size: 200, weight: 700, color: '#ffffff', font: 'Amatic SC', lh: 0.95, shadow: true }),
      T({ y: 770, text: 'משלוח מנות באהבה', size: 64, weight: 400, color: '#fff3c4', font: 'Varela Round' }),
      T({ y: 900, text: 'מאת: משפחת ישראלי', size: 42, weight: 600, color: '#ffffff', font: 'Heebo' })] },
    { g: 'חגים ושבת', n: 'פסח', w: 1080, h: 1350, bg: BG('#f7f1e3', '#e8dcc0', 180), els: () => [
      S('rect', { x: 60, y: 60, w: 960, h: 1230, fill: null, stroke: '#1e3a5f', sw: 4, radius: 0 }),
      I('cup', { x: 440, y: 170, w: 200, h: 200, fill: '#7a1c2b' }),
      T({ y: 410, text: 'חג פסח\nכשר ושמח', size: 140, weight: 700, color: '#1e3a5f', font: 'Frank Ruhl Libre', lh: 1.05 }),
      S('line', { x: 390, y: 760, w: 300, h: 4, stroke: '#c9a55c', sw: 4 }),
      T({ x: 120, w: 840, y: 810, text: 'מעבדות לחירות, מאפלה לאור גדול', size: 54, weight: 500, color: '#7a1c2b', font: 'Frank Ruhl Libre' }),
      T({ y: 1130, text: 'משפחת ישראלי', size: 44, weight: 400, color: '#4a3b26', font: 'Heebo' })] },
    { g: 'חגים ושבת', n: 'שבועות', w: 1080, h: 1080, bg: BG('#ffffff', '#e8f5e9', 180), els: () => [
      I('flower', { x: 80, y: 80, w: 150, h: 150, fill: '#f48fb1', opacity: 0.85 }), I('flower', { x: 850, y: 110, w: 130, h: 130, fill: '#ffd54f' }),
      I('flower', { x: 110, y: 850, w: 120, h: 120, fill: '#ce93d8' }), I('flower', { x: 830, y: 820, w: 160, h: 160, fill: '#f48fb1' }),
      I('book', { x: 440, y: 160, w: 200, h: 200, fill: '#2e7d32' }),
      T({ y: 400, text: 'חג שבועות שמח', size: 116, weight: 400, color: '#1b5e20', font: 'Secular One' }),
      T({ y: 560, text: 'זמן מתן תורתנו', size: 72, weight: 500, color: '#2e7d32', font: 'Frank Ruhl Libre' }),
      T({ y: 720, text: 'משפחת ישראלי', size: 44, weight: 400, color: '#33691e', font: 'Heebo' })] },
    { g: 'חגים ושבת', n: 'זמני שבת', w: 1080, h: 1920, bg: BG('#16130f', '#2a2218', 180), els: () => [
      I('candles', { x: 440, y: 390, w: 200, h: 200, fill: '#dcbb74' }),
      T({ y: 640, text: 'שבת שלום', size: 170, weight: 700, color: '#dcbb74', font: 'Frank Ruhl Libre' }),
      T({ y: 860, text: 'פרשת השבוע', size: 58, weight: 400, color: '#efe6d2', font: 'Bellefair' }),
      T({ x: 190, w: 700, y: 1000, text: 'כניסת השבת  __:__\nיציאת השבת  __:__', size: 56, weight: 700, color: '#16130f', bg: '#dcbb74', pad: 30, radius: 24, font: 'Heebo', lh: 1.5 }),
      T({ y: 1330, text: 'שבת של מנוחה ושמחה', size: 52, weight: 400, color: '#efe6d2', font: 'Bellefair' })] },
    { g: 'חגים ושבת', n: 'חג שמח', w: 1080, h: 1080, bg: BG('#fff8e1', '#ffe0b2', 160), els: () => [
      S('ellipse', { x: -140, y: -140, w: 440, h: 440, fill: '#ffcc80', opacity: 0.5 }), S('ellipse', { x: 820, y: 800, w: 420, h: 420, fill: '#ffab91', opacity: 0.45 }),
      I('star', { x: 480, y: 190, w: 120, h: 120, fill: '#ff8a00' }),
      T({ y: 340, text: 'חג שמח', size: 200, weight: 400, color: '#bf360c', font: 'Suez One' }),
      T({ y: 610, text: 'מועדים לשמחה', size: 72, weight: 500, color: '#e65100', font: 'Frank Ruhl Libre' }),
      T({ y: 860, text: 'משפחת ישראלי', size: 44, weight: 400, color: '#6d4c41', font: 'Heebo' })] },
    // ---- שמחות ----
    { g: 'שמחות ואירועים', n: 'הזמנה לברית', w: 1080, h: 1350, bg: BG('#f4efe4', '#e7dcc5', 180), els: () => [
      S('rect', { x: 50, y: 50, w: 980, h: 1250, fill: null, stroke: '#a8823a', sw: 3, radius: 0 }),
      S('rect', { x: 72, y: 72, w: 936, h: 1206, fill: null, stroke: '#a8823a', sw: 1.5, radius: 0 }),
      I('magen', { x: 465, y: 120, w: 150, h: 150, fill: '#a8823a' }),
      T({ y: 300, text: 'בשעה טובה ומוצלחת', size: 52, weight: 500, color: '#a8823a', font: 'Frank Ruhl Libre' }),
      T({ y: 380, text: 'הזמנה לברית', size: 130, weight: 700, color: '#1e3a5f', font: 'Frank Ruhl Libre' }),
      T({ x: 140, w: 800, y: 580, text: 'בשמחה ובהודיה לה׳ יתברך, אנו שמחים להזמינכם להשתתף בשמחת הכנסת בננו בבריתו של אברהם אבינו', size: 46, weight: 500, color: '#3b2a12', font: 'Assistant', lh: 1.5 }),
      S('line', { x: 440, y: 830, w: 200, h: 3, stroke: '#a8823a', sw: 3 }),
      T({ x: 170, w: 740, y: 880, text: 'יום ראשון · 9:00 בבוקר\nבית הכנסת המרכזי', size: 50, weight: 700, color: '#1e3a5f', font: 'Heebo', lh: 1.45 }),
      T({ y: 1110, text: 'נשמח לראותכם · משפחת ישראלי', size: 44, weight: 400, color: '#6b5428', font: 'Assistant' })] },
    { g: 'שמחות ואירועים', n: 'בר מצווה', w: 1080, h: 1350, bg: BG('#0f2e4f', '#16243a'), els: () => [
      S('rect', { x: 50, y: 50, w: 980, h: 1250, fill: null, stroke: '#c9a55c', sw: 4, radius: 24 }),
      I('magen', { x: 465, y: 120, w: 150, h: 150, fill: '#c9a55c' }),
      T({ y: 300, text: 'בשמחה רבה', size: 50, weight: 500, color: '#dcbb74', font: 'Heebo' }),
      T({ y: 370, text: 'בר מצווה', size: 150, weight: 400, color: '#ffffff', font: 'Suez One' }),
      T({ y: 580, text: 'יוסף', size: 110, weight: 700, color: '#dcbb74', font: 'Frank Ruhl Libre' }),
      T({ x: 140, w: 800, y: 760, text: 'אנו שמחים להזמינכם להשתתף בשמחת בר המצווה של בננו היקר', size: 46, weight: 400, color: '#d6e6f5', font: 'Assistant', lh: 1.45 }),
      T({ x: 190, w: 700, y: 940, text: 'יום חמישי · 19:00\nאולמי הגן', size: 50, weight: 700, color: '#0f2e4f', bg: '#dcbb74', pad: 24, radius: 20, font: 'Heebo' }),
      T({ y: 1180, text: 'משפחת ישראלי', size: 44, weight: 400, color: '#d6e6f5', font: 'Heebo' })] },
    { g: 'שמחות ואירועים', n: 'בת מצווה', w: 1080, h: 1350, bg: BG('#fff0f5', '#ffd6e5', 170), els: () => [
      S('ellipse', { x: -150, y: -150, w: 460, h: 460, fill: '#f8bbd0', opacity: 0.6 }), S('ellipse', { x: 800, y: 1080, w: 420, h: 420, fill: '#f8bbd0', opacity: 0.6 }),
      I('flower', { x: 455, y: 120, w: 170, h: 170, fill: '#d81b60' }),
      T({ y: 320, text: 'בשמחה רבה', size: 50, weight: 500, color: '#b0835a', font: 'Heebo' }),
      T({ y: 390, text: 'בת מצווה', size: 150, weight: 400, color: '#8e1846', font: 'Secular One' }),
      T({ y: 590, text: 'נועה', size: 140, weight: 700, color: '#d81b60', font: 'Amatic SC', lh: 1 }),
      T({ x: 140, w: 800, y: 780, text: 'אנו שמחים להזמינכם להשתתף בשמחת בת המצווה של בתנו היקרה', size: 46, weight: 400, color: '#5c1030', font: 'Assistant', lh: 1.45 }),
      T({ x: 190, w: 700, y: 960, text: 'יום שני · 19:30\nאולם השמחות', size: 48, weight: 700, color: '#ffffff', bg: '#d81b60', pad: 24, radius: 60, font: 'Heebo' }),
      T({ y: 1190, text: 'משפחת ישראלי', size: 44, weight: 400, color: '#8e1846', font: 'Heebo' })] },
    { g: 'שמחות ואירועים', n: 'חתונה', w: 1080, h: 1350, bg: BG('#ffffff', '#f6f1e7', 180), els: () => [
      S('rect', { x: 60, y: 60, w: 960, h: 1230, fill: null, stroke: '#c9a55c', sw: 2, radius: 40 }),
      T({ x: 90, w: 880, y: 95, text: 'בס״ד', size: 32, weight: 400, color: '#8a6a2c', font: 'Frank Ruhl Libre', align: 'right' }),
      T({ y: 210, text: 'בשמחה רבה ובהודיה לה׳', size: 46, weight: 500, color: '#8a6a2c', font: 'Frank Ruhl Libre' }),
      T({ y: 300, text: 'יוסף\nונועה', size: 150, weight: 400, color: '#3b2a12', font: 'Bellefair', lh: 1.05 }),
      S('line', { x: 440, y: 650, w: 200, h: 2, stroke: '#c9a55c', sw: 2 }),
      T({ x: 140, w: 800, y: 700, text: 'מתכבדים להזמינכם להשתתף בשמחת נישואיהם', size: 50, weight: 500, color: '#3b2a12', font: 'Frank Ruhl Libre' }),
      T({ y: 860, text: 'יום חמישי\nקבלת פנים 19:00 · חופה 20:00\nאולמי הגן', size: 46, weight: 500, color: '#4a3b26', font: 'Heebo', lh: 1.5 }),
      T({ x: 120, w: 840, y: 1140, text: 'קול ששון וקול שמחה, קול חתן וקול כלה', size: 40, weight: 400, color: '#8a6a2c', font: 'Frank Ruhl Libre' })] },
    { g: 'שמחות ואירועים', n: 'מזל טוב לבת', w: 1080, h: 1080, bg: BG('#fce4ec', '#f8bbd0', 160), els: () => [
      I('heart', { x: 465, y: 150, w: 150, h: 150, fill: '#d81b60' }),
      T({ y: 330, text: 'מזל טוב!', size: 180, weight: 700, color: '#ad1457', font: 'Amatic SC', lh: 1 }),
      T({ y: 570, text: 'להולדת הבת', size: 82, weight: 400, color: '#6a1b4d', font: 'Secular One' }),
      T({ x: 140, w: 800, y: 720, text: 'מאחלים שתגדל בבריאות, בשמחה ובאהבה', size: 46, weight: 400, color: '#6a1b4d', font: 'Varela Round', lh: 1.4 }),
      T({ y: 900, text: 'משפחת ישראלי', size: 42, weight: 600, color: '#ad1457', font: 'Heebo' })] },
    { g: 'שמחות ואירועים', n: 'אזכרה', w: 1080, h: 1350, bg: BG('#2b2b2b', '#3d3d3d', 180), els: () => [
      I('candles', { x: 465, y: 140, w: 150, h: 150, fill: '#efe6d2' }),
      T({ y: 340, text: 'אזכרה', size: 120, weight: 700, color: '#efe6d2', font: 'Frank Ruhl Libre' }),
      T({ y: 510, text: 'לזכר ולעילוי נשמת', size: 52, weight: 400, color: '#d9d9d9', font: 'Frank Ruhl Libre' }),
      T({ y: 600, text: 'ישראל בן אברהם ז״ל', size: 84, weight: 700, color: '#ffffff', font: 'Frank Ruhl Libre' }),
      S('line', { x: 440, y: 750, w: 200, h: 2, stroke: '#9e9e9e', sw: 2 }),
      T({ x: 120, w: 840, y: 800, text: 'במלאת שנה לפטירתו נתכנס לעלות על קברו\nיום ראשון · 16:00 · בית העלמין', size: 44, weight: 400, color: '#d9d9d9', font: 'Assistant', lh: 1.55 }),
      T({ y: 1150, text: 'תנצב״ה', size: 50, weight: 400, color: '#9e9e9e', font: 'Frank Ruhl Libre' })] }
  ];
  TEMPLATES.forEach(t => { t.g = t.g || (t.n === 'שבת שלום' ? 'חגים ושבת' : 'כללי'); });
  function fromTemplate(t) { return { bg: clone(t.bg), els: t.els() }; }
  function newProject(t) { t = t || TEMPLATES[0]; return { w: t.w, h: t.h, pages: [fromTemplate(t)], cur: 0, lib: [] }; }

  // ---------- ציור הקנבס ----------
  const holder = $('sd-holder'), pg = $('sd-page'), ui = $('sd-ui'), vp = $('sd-viewport');
  let baseScale = 1;
  const sheetMode = () => app.classList.contains('sd-sheet-on');
  function fitScale() {
    const avail = Math.max(240, vp.clientWidth - 24);
    const maxH = Math.max(300, Math.min(window.innerHeight * (sheetMode() ? 0.5 : 0.72), 900));
    baseScale = Math.min(avail / P.w, maxH / P.h, 1);
    scale = baseScale * zoom;
    holder.style.width = Math.round(P.w * scale) + 'px'; holder.style.height = Math.round(P.h * scale) + 'px';
    [pg, ui].forEach(n => { n.style.width = P.w + 'px'; n.style.height = P.h + 'px'; n.style.transform = 'scale(' + scale + ')'; });
    ui.style.setProperty('--k', 1 / scale);
    // בזום: גובה התצוגה קבוע, ומזיזים בתוכה (גלילה / אצבע)
    vp.style.height = zoom > 1 ? Math.round(P.h * baseScale + 24) + 'px' : '';
    vp.classList.toggle('zoomed', zoom > 1);
    const z = $('sd-zoom-v'); if (z) z.textContent = Math.round(zoom * 100) + '%';
  }
  function bgCss(b) {
    let s = b.grad ? 'linear-gradient(' + (b.angle || 0) + 'deg,' + b.color + ',' + b.grad + ')' : b.color;
    return s;
  }
  function paintBg(root, b, W, H) {
    root.style.background = bgCss(b);
    let im = root.querySelector(':scope > .sd-bgimg');
    if (b.img && IMG[b.img]) {
      if (!im) { im = document.createElement('div'); im.className = 'sd-bgimg'; root.prepend(im); }
      im.style.backgroundImage = 'url("' + IMG[b.img] + '")';
      im.style.boxShadow = 'inset 0 0 0 ' + (W + H) + 'px rgba(0,0,0,' + (b.dim || 0) + ')';
    } else if (im) im.remove();
  }
  function renderBg() { paintBg(pg, page().bg, P.w, P.h); }
  // מיקום התמונה בתוך המסגרת (חיתוך): crop = {z: זום, cx, cy: מרכז החלק הנראה, 0-1 מתוך התמונה}
  function cropBox(e) {
    const iw = e.iw, ih = e.ih; if (!iw || !ih) return null;
    const c = e.crop || {}, z = Math.max(1, c.z || 1);
    const s = Math.max(e.w / iw, e.h / ih) * z, W = iw * s, H = ih * s;
    const hx = e.w / 2 / W, hy = e.h / 2 / H;
    let cx = c.cx == null ? 0.5 : c.cx, cy = c.cy == null ? 0.5 : c.cy;
    cx = Math.min(1 - hx, Math.max(hx, cx)); cy = Math.min(1 - hy, Math.max(hy, cy));
    if (e.flip) cx = 1 - cx;
    return { left: e.w / 2 - cx * W, top: e.h / 2 - cy * H, w: W, h: H, s };
  }
  function styleEl(n, e) {
    const s = n.style;
    s.left = e.x + 'px'; s.top = e.y + 'px'; s.width = e.w + 'px';
    s.height = e.type === 'text' ? 'auto' : e.h + 'px';
    s.transform = e.rot ? 'rotate(' + e.rot + 'deg)' : '';
    s.opacity = e.opacity == null ? 1 : e.opacity;
    s.display = e.hide ? 'none' : '';
    s.pointerEvents = e.lock ? 'none' : '';
    const mk = e.type === 'image' ? maskCss(e) : '';
    s.clipPath = mk; s.webkitClipPath = mk;
    if (e.type === 'text') {
      s.fontFamily = '"' + e.font + '", Assistant, sans-serif'; s.fontSize = e.size + 'px'; s.fontWeight = e.weight;
      s.color = e.color; s.textAlign = e.align; s.lineHeight = e.lh; s.letterSpacing = (e.ls || 0) + 'px';
      s.background = e.bg || 'transparent'; s.padding = (e.pad || 0) + 'px'; s.borderRadius = (e.radius || 0) + 'px';
      s.webkitTextStroke = e.stroke && e.sw ? e.sw + 'px ' + e.stroke : '';
      s.textShadow = e.shadow ? '0 ' + Math.round(e.size / 18) + 'px ' + Math.round(e.size / 7) + 'px rgba(0,0,0,.45)' : '';
      if (n.dataset.editing !== '1') n.textContent = e.text;
    } else if (e.type === 'image') {
      s.borderRadius = (e.radius || 0) + 'px';
      s.border = e.stroke && e.sw ? e.sw + 'px solid ' + e.stroke : '';
      let im = n.firstChild;
      if (!im) { im = document.createElement('img'); im.alt = ''; im.draggable = false; n.appendChild(im); }
      if (IMG[e.src] && im.getAttribute('src') !== IMG[e.src]) im.src = IMG[e.src];
      if (!e.iw && im.naturalWidth) { e.iw = im.naturalWidth; e.ih = im.naturalHeight; }
      const cb = e.fit !== 'contain' && e.crop ? cropBox(e) : null;
      const is = im.style;
      if (cb) {
        is.position = 'absolute'; is.maxWidth = 'none'; is.left = cb.left + 'px'; is.top = cb.top + 'px'; is.width = cb.w + 'px'; is.height = cb.h + 'px'; is.objectFit = 'fill';
        is.borderRadius = '0';
      } else {
        is.position = ''; is.left = ''; is.top = ''; is.width = ''; is.height = ''; is.maxWidth = '';
        is.objectFit = e.fit || 'cover';
        is.borderRadius = Math.max(0, (e.radius || 0) - (e.sw || 0)) + 'px';
      }
      const f = e.f || {};
      is.filter = 'brightness(' + (f.b == null ? 100 : f.b) + '%) contrast(' + (f.c == null ? 100 : f.c) + '%) saturate(' + (f.s == null ? 100 : f.s) + '%)' + (f.g ? ' grayscale(' + f.g + '%)' : '') + (f.bl ? ' blur(' + f.bl + 'px)' : '');
      is.transform = e.flip ? 'scaleX(-1)' : '';
    } else if (e.type === 'icon') {
      s.color = e.fill || '#c9a55c';
      if (n.dataset.icon !== e.icon) { n.innerHTML = iconSvg(e.icon); n.dataset.icon = e.icon; }
    } else if (e.type === 'rect' || e.type === 'ellipse') {
      s.background = e.fill || 'transparent';
      s.border = e.stroke && e.sw ? e.sw + 'px solid ' + e.stroke : '';
      s.borderRadius = e.type === 'ellipse' ? '50%' : (e.radius || 0) + 'px';
    } else if (e.type === 'line') {
      s.height = (e.sw || 4) + 'px'; s.background = e.stroke; s.borderRadius = (e.sw || 4) / 2 + 'px';
    }
  }
  function paintEls(root, els) {
    const keep = new Set(els.map(e => e.id));
    root.querySelectorAll(':scope > .sd-el').forEach(n => { if (!keep.has(n.dataset.id)) n.remove(); });
    els.forEach((e, i) => {
      let n = root.querySelector(':scope > .sd-el[data-id="' + e.id + '"]');
      if (!n || n.dataset.type !== e.type) { if (n) n.remove(); n = document.createElement('div'); n.className = 'sd-el sd-' + e.type; n.dataset.id = e.id; n.dataset.type = e.type; if (e.type === 'text') n.dir = 'rtl'; }
      n.style.zIndex = i + 1;
      styleEl(n, e);
      root.appendChild(n);
    });
  }
  function render() {
    renderBg();
    paintEls(pg, page().els);
    measure();
    drawSel();
    pagesBar();
    if (tab === 'layers' && !sel && !layersDragging) layersList();
    save();
  }
  // תצוגה מוקטנת של עיצוב (לתבניות ולשלוש ההצעות של העוזר) – אותו ציור, בקטן
  function thumb(doc, maxW, maxH) {
    const k = Math.min(maxW / doc.w, maxH / doc.h);
    const box = document.createElement('span'); box.className = 'sd-thumb';
    box.style.width = Math.round(doc.w * k) + 'px'; box.style.height = Math.round(doc.h * k) + 'px';
    const inner = document.createElement('span'); inner.className = 'sd-thumb-in';
    inner.style.width = doc.w + 'px'; inner.style.height = doc.h + 'px'; inner.style.transform = 'scale(' + k + ')';
    box.appendChild(inner);
    paintBg(inner, doc.bg, doc.w, doc.h);
    paintEls(inner, doc.els.map(e => Object.assign({}, e, { lock: false })));
    return box;
  }
  // גובה טקסט נקבע לפי התוכן
  function measure() {
    page().els.forEach(e => {
      if (e.type !== 'text' || e.hide) return;
      const n = pg.querySelector('.sd-el[data-id="' + e.id + '"]');
      if (n && n.offsetHeight) e.h = n.offsetHeight;
    });
  }
  function full() { fitScale(); render(); panel(); }

  // ---------- בחירה וידיות ----------
  function drawSel() {
    ui.innerHTML = '';
    const e = sel && elById(sel);
    if (!e) { drawSafe(); return; }
    const box = document.createElement('div');
    box.className = 'sd-sel';
    box.style.cssText = 'left:' + e.x + 'px;top:' + e.y + 'px;width:' + e.w + 'px;height:' + e.h + 'px;transform:rotate(' + (e.rot || 0) + 'deg)';
    if (e.lock || e.hide) { box.classList.add('sd-sel-lock'); ui.appendChild(box); drawSafe(); return; }
    if (cropId === e.id) {
      // מצב חיתוך: רואים את כל התמונה בעמעום, וגוררים אותה בתוך המסגרת
      const cb = cropBox(e);
      if (cb) { const g = document.createElement('div'); g.className = 'sd-crop-ghost'; g.style.cssText = 'left:' + cb.left + 'px;top:' + cb.top + 'px;width:' + cb.w + 'px;height:' + cb.h + 'px;background-image:url("' + (IMG[e.src] || '') + '")' + (e.flip ? ';transform:scaleX(-1)' : ''); box.appendChild(g); }
      box.classList.add('sd-sel-crop');
    }
    const hs = e.type === 'line' ? ['w', 'e'] : e.type === 'text' ? ['nw', 'ne', 'sw', 'se', 'w', 'e'] : ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];
    hs.forEach(h => { const d = document.createElement('div'); d.className = 'sd-h sd-h-' + h; d.dataset.h = h; box.appendChild(d); });
    const r = document.createElement('div'); r.className = 'sd-rot'; r.dataset.h = 'rot'; r.title = 'סיבוב'; box.appendChild(r);
    ui.appendChild(box);
    drawSafe();
  }
  function select(id) { if (cropId && cropId !== id) cropId = null; sel = id; drawSel(); panel(); if (id) sheetOpen(true); }

  // ---------- גרירה / שינוי גודל / סיבוב ----------
  let drag = null;
  function toPage(ev) { const r = pg.getBoundingClientRect(); return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale }; }
  const HD = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
  // צביטה בשתי אצבעות = זום של התצוגה; אצבע אחת על מקום ריק = הזזת התצוגה
  const touches = new Map();
  let pinch = null;
  function pinchInfo() { const [a, b] = [...touches.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function setZoom(z, cx, cy) {
    z = Math.min(5, Math.max(1, z));
    if (Math.abs(z - zoom) < 0.001) return;
    const r0 = holder.getBoundingClientRect();
    const vr = vp.getBoundingClientRect();
    if (cx == null) { cx = vr.left + vr.width / 2; cy = vr.top + Math.min(vr.height, window.innerHeight) / 2; }
    const px = (cx - r0.left) / scale, py = (cy - r0.top) / scale;
    zoom = z; fitScale(); drawSel();
    const r1 = holder.getBoundingClientRect();
    vp.scrollLeft += r1.left + px * scale - cx; vp.scrollTop += r1.top + py * scale - cy;
  }
  function onDown(ev) {
    if (ev.button > 0) return;
    if (ev.pointerType === 'touch') {
      touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (touches.size === 2) {
        // אצבע שנייה: מבטלים גרירה שהתחילה, ועוברים לזום
        if (drag && drag.snapped) { Object.assign(drag.e, drag.o); render(); }
        drag = null;
        const pi = pinchInfo(); pinch = { d0: pi.d, z0: zoom, x: pi.x, y: pi.y };
        ev.preventDefault(); return;
      }
      if (touches.size > 2) return;
    }
    const h = ev.target.closest('.sd-h, .sd-rot');
    const elN = ev.target.closest('.sd-el');
    const p = toPage(ev);
    const cur = sel && elById(sel);
    if (h && cur && !cur.lock) {
      drag = { mode: h.dataset.h === 'rot' ? 'rot' : 'size', h: h.dataset.h, e: cur, o: clone(cur), p0: p };
    } else if (cropId && cur && cur.id === cropId && (elN && elN.dataset.id === cropId || ev.target.closest('.sd-sel-crop'))) {
      drag = { mode: 'crop', e: cur, o: clone(cur), p0: p, cb: cropBox(cur) };
    } else if (elN) {
      if (elN.dataset.editing === '1') return;
      const e = elById(elN.dataset.id); if (!e || e.lock) return;
      if (sel !== e.id) select(e.id);
      drag = { mode: 'move', e, o: clone(e), p0: p, moved: false };
    } else {
      if (sel) select(null);
      // מקום ריק: גרירה מזיזה את התצוגה (בזום) או גוללת את הדף (במגע)
      if (zoom > 1 || ev.pointerType === 'touch') { drag = { mode: 'pan', c0: { x: ev.clientX, y: ev.clientY }, last: { x: ev.clientX, y: ev.clientY } }; ev.preventDefault(); }
      return;
    }
    ev.preventDefault();
    try { (ev.target).setPointerCapture(ev.pointerId); } catch (_) {}
  }
  function guides(gx, gy) {
    ui.querySelectorAll('.sd-guide').forEach(n => n.remove());
    if (gx) { const g = document.createElement('div'); g.className = 'sd-guide sd-gx'; g.style.left = P.w / 2 + 'px'; ui.appendChild(g); }
    if (gy) { const g = document.createElement('div'); g.className = 'sd-guide sd-gy'; g.style.top = P.h / 2 + 'px'; ui.appendChild(g); }
  }
  function onMove(ev) {
    if (ev.pointerType === 'touch' && touches.has(ev.pointerId)) {
      touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && touches.size >= 2) {
        const pi = pinchInfo();
        setZoom(pinch.z0 * pi.d / Math.max(10, pinch.d0), pi.x, pi.y);
        vp.scrollLeft -= pi.x - pinch.x; vp.scrollTop -= pi.y - pinch.y; pinch.x = pi.x; pinch.y = pi.y;
        ev.preventDefault(); return;
      }
    }
    if (!drag) return;
    if (drag.mode === 'pan') {
      const dx = ev.clientX - drag.last.x, dy = ev.clientY - drag.last.y; drag.last = { x: ev.clientX, y: ev.clientY };
      const sl = vp.scrollLeft, st = vp.scrollTop;
      vp.scrollLeft -= dx; vp.scrollTop -= dy;
      if (vp.scrollTop === st && dy) window.scrollBy(0, -dy);
      if (vp.scrollLeft === sl && dx && zoom === 1) { /* בלי זום אין לאן לזוז לצדדים */ }
      return;
    }
    const p = toPage(ev), e = drag.e, o = drag.o;
    const dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
    if (!drag.snapped && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) { snap(); drag.snapped = true; }
    if (!drag.snapped) return;
    if (drag.mode === 'crop') {
      const cb = drag.cb; if (!cb) return;
      const t = -(o.rot || 0) * Math.PI / 180;
      const lx = dx * Math.cos(t) - dy * Math.sin(t), ly = dx * Math.sin(t) + dy * Math.cos(t);
      const c0 = o.crop || {};
      e.crop = { z: c0.z || 1, cx: (c0.cx == null ? 0.5 : c0.cx) - (o.flip ? -1 : 1) * lx / cb.w, cy: (c0.cy == null ? 0.5 : c0.cy) - ly / cb.h };
      const hx = e.w / 2 / cb.w, hy = e.h / 2 / cb.h;
      e.crop.cx = Math.min(1 - hx, Math.max(hx, e.crop.cx)); e.crop.cy = Math.min(1 - hy, Math.max(hy, e.crop.cy));
      const n = pg.querySelector('.sd-el[data-id="' + e.id + '"]'); if (n) styleEl(n, e);
      drawSel(); return;
    }
    if (drag.mode === 'move') {
      let x = o.x + dx, y = o.y + dy, gx = false, gy = false;
      const tol = 8 / scale;
      if (Math.abs(x + o.w / 2 - P.w / 2) < tol) { x = P.w / 2 - o.w / 2; gx = true; }
      if (Math.abs(y + o.h / 2 - P.h / 2) < tol) { y = P.h / 2 - o.h / 2; gy = true; }
      e.x = Math.round(x); e.y = Math.round(y); guides(gx, gy);
    } else if (drag.mode === 'rot') {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
      for (const s of [0, 90, 180, 270, -90, -180, 360]) if (Math.abs(a - s) < 4) a = s;
      if (a > 180) a -= 360;
      e.rot = Math.round(a);
    } else {
      const [hx, hy] = HD[drag.h];
      const t = -(o.rot || 0) * Math.PI / 180;
      const lx = dx * Math.cos(t) - dy * Math.sin(t), ly = dx * Math.sin(t) + dy * Math.cos(t);
      let nw = hx ? Math.max(12, o.w + hx * lx) : o.w, nh = hy ? Math.max(8, o.h + hy * ly) : o.h;
      const corner = hx && hy;
      if (corner && (e.type === 'image' || e.type === 'text' || e.type === 'icon' || ev.shiftKey)) {
        const k = Math.abs(lx) > Math.abs(ly) ? nw / o.w : nh / o.h;
        nw = Math.max(12, o.w * k); nh = Math.max(8, o.h * k);
      }
      if (e.type === 'text') {
        if (corner) { const k = nw / o.w; e.size = Math.max(6, Math.round(o.size * k)); e.pad = Math.round((o.pad || 0) * k); e.sw = Math.round((o.sw || 0) * k * 10) / 10; }
        nh = o.h;
      }
      if (e.type === 'line') nh = o.h;
      const vx = (nw - o.w) / 2 * hx, vy = (nh - o.h) / 2 * hy;
      const r = (o.rot || 0) * Math.PI / 180;
      const cx = o.x + o.w / 2 + vx * Math.cos(r) - vy * Math.sin(r), cy = o.y + o.h / 2 + vx * Math.sin(r) + vy * Math.cos(r);
      e.w = Math.round(nw); e.h = Math.round(nh); e.x = Math.round(cx - nw / 2); e.y = Math.round(cy - nh / 2);
    }
    const n = pg.querySelector('.sd-el[data-id="' + e.id + '"]');
    if (n) { styleEl(n, e); if (e.type === 'text') e.h = n.offsetHeight; }
    drawSel(); guides(drag.mode === 'move' && Math.abs(e.x + e.w / 2 - P.w / 2) < 0.6, drag.mode === 'move' && Math.abs(e.y + e.h / 2 - P.h / 2) < 0.6);
  }
  function onUp(ev) {
    if (ev && touches.has(ev.pointerId)) { touches.delete(ev.pointerId); if (touches.size < 2) pinch = null; }
    if (!drag) return;
    const was = drag; drag = null;
    if (was.mode === 'pan') return;
    guides(false, false);
    if (was.snapped) { save(); panel(); }
  }
  pg.addEventListener('pointerdown', onDown);
  ui.addEventListener('pointerdown', onDown);
  vp.addEventListener('pointerdown', ev => { if (ev.target === vp) { if (ev.pointerType === 'touch') { touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); if (touches.size === 2) { const pi = pinchInfo(); pinch = { d0: pi.d, z0: zoom, x: pi.x, y: pi.y }; } } select(null); } });
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  // Ctrl + גלגלת (או צביטה במשטח המגע) = זום
  vp.addEventListener('wheel', ev => { if (!ev.ctrlKey) return; ev.preventDefault(); setZoom(zoom * (ev.deltaY < 0 ? 1.12 : 1 / 1.12), ev.clientX, ev.clientY); }, { passive: false });

  // עריכת טקסט ישירות על הקנבס: לחיצה כפולה
  pg.addEventListener('dblclick', ev => {
    const n = ev.target.closest('.sd-text'); if (!n) return;
    startEdit(n);
  });
  function startEdit(n) {
    const e = elById(n.dataset.id); if (!e) return;
    snap();
    n.dataset.editing = '1'; n.contentEditable = 'true'; n.focus();
    const r = document.createRange(); r.selectNodeContents(n); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    ui.innerHTML = '';
    const done = () => {
      n.removeEventListener('blur', done);
      n.contentEditable = 'false'; delete n.dataset.editing;
      e.text = n.innerText.replace(/\n$/, '') || ' ';
      render(); panel();
    };
    n.addEventListener('blur', done);
    n.addEventListener('input', () => { e.h = n.offsetHeight; });
  }

  // מקלדת
  document.addEventListener('keydown', ev => {
    const t = ev.target;
    if (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) { if (ev.key === 'Escape' && t.isContentEditable) t.blur(); return; }
    const k = ev.key, mod = ev.ctrlKey || ev.metaKey;
    if (mod && (k === 'z' || k === 'Z' || k === 'ז') && !ev.shiftKey) { ev.preventDefault(); undo(); return; }
    if (mod && (k === 'y' || k === 'ט' || ((k === 'z' || k === 'Z') && ev.shiftKey))) { ev.preventDefault(); redo(); return; }
    const e = sel && elById(sel); if (!e) return;
    if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); act('del'); }
    else if (mod && (k === 'd' || k === 'ג')) { ev.preventDefault(); act('dup'); }
    else if (k === 'Escape') { if (cropId) { cropId = null; drawSel(); panel(); } else select(null); }
    else if (k === 'Enter' && e.type === 'text') { ev.preventDefault(); const n = pg.querySelector('.sd-el[data-id="' + e.id + '"]'); n && startEdit(n); }
    else if (k.indexOf('Arrow') === 0) {
      ev.preventDefault(); snapOnce();
      const st = ev.shiftKey ? 10 : 1;
      if (k === 'ArrowLeft') e.x -= st; if (k === 'ArrowRight') e.x += st; if (k === 'ArrowUp') e.y -= st; if (k === 'ArrowDown') e.y += st;
      render();
    }
  });

  // ---------- פעולות על שכבה ----------
  function act(a) {
    const els = page().els, i = els.findIndex(x => x.id === sel); if (i < 0) return;
    const e = els[i];
    snap();
    if (a === 'del') { els.splice(i, 1); sel = null; }
    else if (a === 'dup') { const c = clone(e); c.id = uid(); c.x += 30; c.y += 30; els.splice(i + 1, 0, c); sel = c.id; }
    else if (a === 'up' && i < els.length - 1) { els.splice(i, 1); els.splice(i + 1, 0, e); }
    else if (a === 'down' && i > 0) { els.splice(i, 1); els.splice(i - 1, 0, e); }
    else if (a === 'top') { els.splice(i, 1); els.push(e); }
    else if (a === 'bottom') { els.splice(i, 1); els.unshift(e); }
    else if (a === 'cx') e.x = Math.round(P.w / 2 - e.w / 2);
    else if (a === 'cy') e.y = Math.round(P.h / 2 - e.h / 2);
    else if (a === 'bgimg' && e.type === 'image') { page().bg.img = e.src; page().bg.dim = page().bg.dim || 0.2; els.splice(i, 1); sel = null; }
    else if (a === 'lock') { e.lock = !e.lock; if (e.lock) cropId = null; }
    else if (a === 'hide') { e.hide = !e.hide; }
    else if (a === 'crop') { if (cropId === e.id) cropId = null; else { cropId = e.id; e.fit = 'cover'; e.crop = e.crop || { z: 1, cx: 0.5, cy: 0.5 }; } }
    else if (a === 'cropreset') { delete e.crop; cropId = null; }
    render(); panel();
  }
  function addEl(e) { snap(); page().els.push(e); sel = e.id; render(); panel(); used('add', { what: e.type }); }
  function center(e) { e.x = Math.round(P.w / 2 - e.w / 2); e.y = Math.round(P.h / 2 - e.h / 2); return e; }
  const U = () => P.w / 1080; // יחידה יחסית לגודל הקנבס
  const TEXT_PRESETS = [
    ['כותרת', () => T({ text: 'כותרת גדולה', size: Math.round(110 * U()), weight: 800, font: 'Rubik', color: autoInk() })],
    ['תת-כותרת', () => T({ text: 'תת-כותרת', size: Math.round(64 * U()), weight: 600, font: 'Heebo', color: autoInk() })],
    ['טקסט רגיל', () => T({ text: 'כאן כותבים את הפרטים.\nאפשר כמה שורות.', size: Math.round(42 * U()), weight: 400, font: 'Assistant', color: autoInk(), lh: 1.4 })],
    ['כיתוב על תמונה', () => { const e = T({ text: 'כיתוב לתמונה', size: Math.round(54 * U()), weight: 700, font: 'Heebo', color: '#ffffff', bg: 'rgba(0,0,0,.55)', pad: Math.round(18 * U()), radius: Math.round(12 * U()) }); e.bg = '#000000'; e.opacity = 1; e.boxA = 0.55; return e; }],
    ['כתוביות לסרטון', () => T({ text: 'ככה נראות כתוביות', size: Math.round(52 * U()), weight: 800, font: 'Heebo', color: '#ffffff', stroke: '#000000', sw: Math.max(2, Math.round(6 * U())), shadow: true })],
    ['ציטוט', () => T({ text: '״משפט יפה שרוצים להבליט״', size: Math.round(60 * U()), weight: 500, font: 'Frank Ruhl Libre', color: autoInk(), lh: 1.35 })],
    ['תווית', () => T({ text: 'חדש!', size: Math.round(44 * U()), weight: 800, font: 'Rubik', color: '#ffffff', bg: '#e53935', pad: Math.round(16 * U()), radius: Math.round(60 * U()), w: Math.round(260 * U()) })],
    ['כתב יד', () => T({ text: 'באהבה גדולה', size: Math.round(100 * U()), weight: 700, font: 'Amatic SC', color: autoInk() })]
  ];
  function autoInk() { const b = page().bg; return (b.img || lum(b.color) < 0.45) ? '#ffffff' : '#16130f'; }
  function lum(h) { if (!h || h[0] !== '#') return 1; const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
  function addText(fn, label) {
    const e = fn();
    e.w = Math.min(e.w, Math.round(P.w * 0.84)); if (label === 'תווית') e.w = Math.round(260 * U());
    e.h = Math.round(e.size * e.lh * e.text.split('\n').length + 2 * e.pad);
    if (e.boxA) { e.bg = hexA(e.bg, e.boxA); delete e.boxA; }
    center(e);
    if (label === 'כיתוב על תמונה' || label === 'כתוביות לסרטון') e.y = Math.round(P.h * 0.82 - e.h / 2);
    addEl(e);
  }
  // צבע עם שקיפות נשמר כ-rgba (תיבת רקע לכיתוב)
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  // ---------- תמונות ----------
  function readFile(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }
  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
  async function shrink(src, type) {
    const im = await loadImg(src);
    const max = 2200, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    const png = /png|gif|webp|svg/.test(type);
    if (!png) { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
    x.drawImage(im, 0, 0, w, h);
    return { data: png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88), w, h };
  }
  async function addImageFiles(files, asBg) {
    const list = [...files].filter(f => /^image\//.test(f.type));
    const pdfs = [...files].filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    for (const f of pdfs) await openPdf(f);
    let last = null;
    for (const f of list) {
      try {
        const r = await shrink(await readFile(f), f.type);
        const id = 'i' + uid();
        await imgPut(id, r.data);
        P.lib.unshift({ id, w: r.w, h: r.h, name: f.name.replace(/\.[^.]+$/, '').slice(0, 30) });
        last = { id, w: r.w, h: r.h };
        if (!asBg) placeImage(last, list.length === 1);
      } catch (e) { status('לא הצלחתי לפתוח את התמונה ' + f.name); }
    }
    if (asBg && last) { snap(); page().bg.img = last.id; page().bg.dim = page().bg.dim || 0; render(); panel(); }
    if (list.length) { save(); used('image', { n: list.length }); if (tab === 'img') panel(); }
  }
  function placeImage(im, selectIt, frac) {
    const k = Math.min(P.w * (frac || 0.7) / im.w, P.h * (frac || 0.6) / im.h);
    const e = center({ id: uid(), type: 'image', src: im.id, x: 0, y: 0, w: Math.round(im.w * k), h: Math.round(im.h * k), iw: im.w, ih: im.h, rot: 0, opacity: 1, fit: 'cover', radius: 0, stroke: null, sw: 0, f: {} });
    snap(); page().els.push(e); if (selectIt !== false) sel = e.id; render(); panel();
    return e;
  }

  // ---------- הסרת רקע (כולה במכשיר) ----------
  let bgw = null, bgBusy = false;
  const bgWaiters = {};
  function bgWorker() {
    if (bgw) return bgw;
    bgw = new Worker('/assets/studio-bg-worker.js', { type: 'module' });
    bgw.onmessage = ev => {
      const m = ev.data || {};
      if (m.type === 'progress') { if (m.stage === 'run') status('מזהה מה ברקע ומה בתמונה… (כמה שניות)', true); else if (!m.cached) status('מוריד את הכלי להסרת רקע (רק בפעם הראשונה): ' + Math.round(m.p * 100) + '%', true); }
      else if (m.type === 'mask' && bgWaiters[m.id]) { bgWaiters[m.id].res(m.mask); delete bgWaiters[m.id]; }
      else if (m.type === 'error') { Object.keys(bgWaiters).forEach(k => { bgWaiters[k].rej(new Error(m.msg)); delete bgWaiters[k]; }); }
    };
    bgw.onerror = () => { Object.keys(bgWaiters).forEach(k => { bgWaiters[k].rej(new Error('worker')); delete bgWaiters[k]; }); bgw = null; };
    return bgw;
  }
  async function removeBg(e) {
    if (bgBusy || !e || e.type !== 'image') return;
    bgBusy = true;
    status('מכין את הסרת הרקע…', true);
    try {
      const src = await imgGet(e.src); if (!src) throw new Error('img');
      const im = await loadImg(src);
      const iw = im.naturalWidth, ih = im.naturalHeight, N = 1024;
      const c = document.createElement('canvas'); c.width = N; c.height = N;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, N, N); x.drawImage(im, 0, 0, N, N);
      const px = x.getImageData(0, 0, N, N).data, input = new Float32Array(3 * N * N);
      for (let i = 0, j = 0; i < N * N; i++, j += 4) { input[i] = px[j] / 255 - 0.5; input[N * N + i] = px[j + 1] / 255 - 0.5; input[2 * N * N + i] = px[j + 2] / 255 - 0.5; }
      const id = uid();
      const mask = await new Promise((res, rej) => { bgWaiters[id] = { res, rej }; bgWorker().postMessage({ type: 'run', id, input }, [input.buffer]); });
      // המסכה (1024×1024) הופכת לשקיפות בגודל המקורי
      const mc = document.createElement('canvas'); mc.width = N; mc.height = N;
      const mx = mc.getContext('2d'), md = mx.createImageData(N, N);
      for (let i = 0; i < N * N; i++) { const a = Math.min(1, Math.max(0, (mask[i] - 0.08) / 0.84)); md.data[i * 4 + 3] = Math.round(a * 255); }
      mx.putImageData(md, 0, 0);
      const out = document.createElement('canvas'); out.width = iw; out.height = ih;
      const ox = out.getContext('2d'); ox.drawImage(im, 0, 0); ox.globalCompositeOperation = 'destination-in'; ox.imageSmoothingQuality = 'high'; ox.drawImage(mc, 0, 0, iw, ih);
      // חותכים את השוליים השקופים
      const ad = ox.getImageData(0, 0, iw, ih).data;
      let x0 = iw, y0 = ih, x1 = -1, y1 = -1;
      for (let yy = 0; yy < ih; yy++) for (let xx = 0; xx < iw; xx++) if (ad[(yy * iw + xx) * 4 + 3] > 10) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      if (x1 < 0) throw new Error('empty');
      const pad = 2; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(iw - 1, x1 + pad); y1 = Math.min(ih - 1, y1 + pad);
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const fin = document.createElement('canvas'); fin.width = bw; fin.height = bh; fin.getContext('2d').drawImage(out, x0, y0, bw, bh, 0, 0, bw, bh);
      const nid = 'i' + uid(), data = fin.toDataURL('image/png');
      await imgPut(nid, data);
      const it = P.lib.find(i => i.id === e.src);
      P.lib.unshift({ id: nid, w: bw, h: bh, name: ((it && it.name) || 'תמונה').slice(0, 20) + ' – בלי רקע' });
      // השכבה מקבלת את התמונה החתוכה, באותו מקום ובאותו גודל
      snap();
      const k = Math.max(e.w / iw, e.h / ih), offX = (e.w - iw * k) / 2, offY = (e.h - ih * k) / 2;
      const ncx = e.x + offX + (x0 + bw / 2) * k, ncy = e.y + offY + (y0 + bh / 2) * k;
      e.src = nid; e.iw = bw; e.ih = bh; e.w = Math.round(bw * k); e.h = Math.round(bh * k); e.x = Math.round(ncx - e.w / 2); e.y = Math.round(ncy - e.h / 2);
      delete e.crop; e.mask = ''; e.radius = 0; e.fit = 'cover'; cropId = null;
      render(); panel(); save();
      status('✓ הרקע הוסר. התמונה החדשה (שקופה) נשמרה גם ב"התמונות שלי". לא אהבתם? "בטל" מחזיר.');
      used('bg_remove');
    } catch (err) {
      status(/empty/.test(err && err.message) ? 'לא מצאתי בתמונה הזו דמות או חפץ ברורים. נסו תמונה שבה הנושא בולט מהרקע.' : 'הסרת הרקע לא הצליחה במכשיר הזה. נסו שוב, או בדפדפן Chrome מעודכן.');
    }
    bgBusy = false;
  }

  // ---------- QR וסמלים ----------
  let qrType = 'link', iconColor = null;
  function qrText(type, v, msg) {
    v = String(v || '').trim(); if (!v) return '';
    if (type === 'link') { if (!/^[a-z]+:/i.test(v)) v = 'https://' + v; try { return new URL(v).href; } catch (e) { return encodeURI(v); } }
    const d = v.replace(/[^\d+]/g, '');
    if (type === 'tel') return 'tel:' + d;
    const intl = d.replace(/^\+/, '').replace(/^0/, '972');
    return 'https://wa.me/' + intl + (msg ? '?text=' + encodeURIComponent(msg) : '');
  }
  async function addQr(type, v, msg, color) {
    const text = qrText(type, v, msg);
    if (!text) { status('כתבו קודם את הקישור או המספר.'); return; }
    if (!window.QRCode) await loadScript('/assets/vendor/qrcodejs/qrcode-1.0.0.min.js');
    const tmp = document.createElement('div'); tmp.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(tmp);
    try {
      new window.QRCode(tmp, { text, width: 640, height: 640, colorDark: color || '#000000', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
      const cv = tmp.querySelector('canvas'); if (!cv) throw new Error('qr');
      const m = 48, out = document.createElement('canvas'); out.width = cv.width + 2 * m; out.height = cv.height + 2 * m;
      const x = out.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, out.width, out.height); x.drawImage(cv, m, m);
      const id = 'q' + uid(); await imgPut(id, out.toDataURL('image/png'));
      const item = { id, w: out.width, h: out.height, name: 'QR ' + ({ link: 'קישור', tel: 'טלפון', wa: 'ווטסאפ' })[type], qr: 1 };
      P.lib.unshift(item);
      // QR נכנס קטן לפינה השמאלית התחתונה, כדי לא לכסות את הטקסט
      const e = placeImage(item, true, 0.22); e.fit = 'contain'; e.name = item.name;
      e.x = Math.round(P.w * 0.07); e.y = Math.round(P.h - e.h - P.h * 0.06); render(); panel();
      used('qr', { t: type });
    } catch (err) { status('לא הצלחתי ליצור את הקוד. בדקו שהקישור קצר יחסית.'); }
    tmp.remove();
  }
  function addIcon(name) {
    const u = U(), s = Math.round(180 * u);
    const e = center(I(name, { w: s, h: s, fill: iconColor || (page().bg.img || lum(page().bg.color) < 0.45 ? '#ffffff' : '#c9a55c') }));
    e.name = ICONS[name][0];
    addEl(e);
  }
  // מסמך PDF: כל עמוד נהיה עמוד בעיצוב, עם המסמך כרקע – ואפשר לכתוב עליו
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function openPdf(f) {
    status('פותח את המסמך…');
    try {
      if (!window.pdfjsLib) { await loadScript('/assets/vendor/pdfjs/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/vendor/pdfjs/pdf.worker.min.js'; }
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false }).promise;
      const n = Math.min(doc.numPages, 30);
      snap();
      const pages = [];
      let W = 1240, H = 1754;
      for (let i = 1; i <= n; i++) {
        status('פותח עמוד ' + i + ' מתוך ' + n + '…');
        const pgp = await doc.getPage(i);
        const v1 = pgp.getViewport({ scale: 1 });
        const k = 1240 / v1.width, v = pgp.getViewport({ scale: k });
        const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
        const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height);
        await pgp.render({ canvasContext: cx, viewport: v }).promise;
        const id = 'i' + uid(); await imgPut(id, c.toDataURL('image/jpeg', 0.9));
        if (i === 1) { W = c.width; H = c.height; }
        pages.push({ bg: { color: '#ffffff', grad: null, angle: 0, img: id, dim: 0 }, els: [] });
        P.lib.unshift({ id, w: c.width, h: c.height, name: f.name.replace(/\.[^.]+$/, '').slice(0, 24) + ' עמ׳ ' + i });
      }
      P.w = W; P.h = H; P.pages = pages; P.cur = 0; sel = null;
      full(); status('המסמך נפתח (' + n + ' עמודים). עכשיו מוסיפים טקסט, חתימה או תמונה מעליו.' + (doc.numPages > 30 ? ' נפתחו 30 העמודים הראשונים.' : ''));
      used('pdf', { pages: n });
    } catch (e) { status('לא הצלחתי לפתוח את המסמך. מסמך וורד – שומרים קודם כ-PDF.'); }
  }

  // ---------- עמודים ----------
  function pagesBar() {
    const b = $('sd-pages'); if (!b) return;
    b.innerHTML = '<button type="button" data-pg="prev" ' + (P.cur ? '' : 'disabled') + ' aria-label="עמוד קודם">›</button>' +
      '<span>עמוד ' + (P.cur + 1) + ' מתוך ' + P.pages.length + '</span>' +
      '<button type="button" data-pg="next" ' + (P.cur < P.pages.length - 1 ? '' : 'disabled') + ' aria-label="עמוד הבא">‹</button>' +
      '<button type="button" data-pg="add">+ עמוד</button><button type="button" data-pg="copy">שכפול עמוד</button>' +
      (P.pages.length > 1 ? '<button type="button" data-pg="del">מחיקת עמוד</button>' : '');
  }
  $('sd-pages').addEventListener('click', ev => {
    const a = ev.target.closest('[data-pg]'); if (!a) return;
    const k = a.dataset.pg;
    if (k === 'prev' && P.cur > 0) P.cur--;
    else if (k === 'next' && P.cur < P.pages.length - 1) P.cur++;
    else if (k === 'add') { snap(); P.pages.splice(P.cur + 1, 0, { bg: { color: '#ffffff', grad: null, angle: 0, img: null, dim: 0 }, els: [] }); P.cur++; }
    else if (k === 'copy') { snap(); const c = clone(page()); c.els.forEach(e => e.id = uid()); P.pages.splice(P.cur + 1, 0, c); P.cur++; }
    else if (k === 'del') { if (!confirm('למחוק את העמוד הזה?')) return; snap(); P.pages.splice(P.cur, 1); P.cur = Math.max(0, P.cur - 1); }
    sel = null; render(); panel();
  });

  // ---------- גודל ----------
  function resize(w, h) {
    snap();
    const sx = w / P.w, sy = h / P.h, k = Math.min(sx, sy);
    P.pages.forEach(p => p.els.forEach(e => {
      const cx = (e.x + e.w / 2) * sx, cy = (e.y + e.h / 2) * sy;
      e.w = Math.round(e.w * k); e.h = Math.round(e.h * k);
      if (e.type === 'text') { e.size = Math.max(6, Math.round(e.size * k)); e.pad = Math.round((e.pad || 0) * k); }
      if (e.sw) e.sw = Math.max(1, Math.round(e.sw * k * 10) / 10);
      if (e.type === 'line') e.h = e.sw;
      e.x = Math.round(cx - e.w / 2); e.y = Math.round(cy - e.h / 2);
    }));
    P.w = w; P.h = h; full();
  }

  // ---------- ערכות צבע ----------
  function applyPalette(pl) {
    snap();
    const p = page();
    p.bg.color = pl.bg; p.bg.grad = pl.grad; if (!p.bg.angle) p.bg.angle = 160;
    const texts = p.els.filter(e => e.type === 'text');
    const big = texts.reduce((m, e) => Math.max(m, e.size), 0);
    texts.forEach(e => {
      if (e.bg && !/^rgba/.test(e.bg)) { e.bg = pl.a; e.color = lum(pl.a) < 0.5 ? '#ffffff' : '#16130f'; }
      else if (!e.bg) e.color = e.size >= big * 0.8 ? pl.t : pl.b;
    });
    p.els.forEach(e => {
      if (e.type === 'rect' || e.type === 'ellipse') { if (e.fill) e.fill = pl.a; if (e.stroke) e.stroke = pl.a; }
      if (e.type === 'line') e.stroke = pl.a;
    });
    render(); panel(); used('palette', { p: pl.n });
  }

  // ---------- עוזר העיצוב במילים ----------
  const DEST_WORDS = [['reels', /רילס|ריל\b|טיקטוק|טיק טוק|שורטס|reels|tiktok|shorts/i], ['wa', /סטטוס/], ['story', /סטורי|story/i],
    ['yt', /ממוזערת|thumbnail|תמונה ליוטיוב|יוטיוב/i], ['profile', /פרופיל/], ['cover', /קאבר|cover|באנר/i], ['card', /כרטיס ביקור/],
    ['a4', /A4|א4|להדפסה|מודפס|עלון|לתלות/i], ['slide', /מצגת|שקופית/], ['fbpost', /פייסבוק/], ['igpost', /אינסטגרם|אינסטה/i], ['square', /ריבוע/]];
  function destFromText(t) { for (const [id, re] of DEST_WORDS) if (re.test(t)) return DEST.find(d => d.id === id); return null; }
  function setDest(id) {
    const d = DEST.find(x => x.id === id); if (!d) return;
    if (P.w !== d.w || P.h !== d.h) resize(d.w, d.h); else snap();
    P.dest = d.id; full(); destBar(); used('dest', { d: d.id });
  }
  function destBar() {
    const b = $('sd-dest'); if (!b) return;
    b.innerHTML = DEST.slice(0, 11).map(d => '<button type="button" data-dest="' + d.id + '"' + (P.dest === d.id ? ' class="on"' : '') + '>' + d.ic + ' ' + d.n + '</button>').join('');
  }
  // אזורים שהאפליקציה מכסה – מסומנים על המסך בלבד (לא נכנסים לתמונה שנשמרת)
  function drawSafe() {
    ui.querySelectorAll('.sd-safe').forEach(n => n.remove());
    const d = destOf(); if (!d || !d.safe || d.w !== P.w || d.h !== P.h) return;
    const s = d.safe, add = (css, txt) => { const n = document.createElement('div'); n.className = 'sd-safe'; n.style.cssText = css; if (txt) n.textContent = txt; ui.prepend(n); };
    if (s.circle) { add('left:0;top:0;width:100%;height:100%;border-radius:0;background:radial-gradient(circle at center,transparent ' + (P.w / 2 - 2) + 'px,rgba(255,0,90,.28) ' + (P.w / 2) + 'px)', ''); return; }
    if (s.t) add('left:0;top:0;width:100%;height:' + s.t * 100 + '%', 'כאן האפליקציה מכסה');
    if (s.b) add('left:0;bottom:0;width:100%;height:' + s.b * 100 + '%', 'כאן האפליקציה מכסה');
    if (s.r) add('right:0;top:' + (s.t || 0) * 100 + '%;width:' + s.r * 100 + '%;height:' + (100 - ((s.t || 0) + (s.b || 0)) * 100) + '%', '');
    if (s.l) add('left:0;bottom:0;width:' + s.l * 100 + '%;height:' + ((s.b || 0.3) * 100 + 10) + '%', '');
  }
  function aiDoc() { return { w: P.w, h: P.h, bg: page().bg, els: page().els.filter(e => !e.hide).map(e => { const c = clone(e); delete c.f; delete c.lock; delete c.iw; delete c.ih; delete c.name; return c; }) }; }
  function aiImages() {
    const ids = new Set(P.lib.filter(i => !i.qr).slice(0, 8).map(i => i.id));
    page().els.forEach(e => e.type === 'image' && ids.add(e.src)); if (page().bg.img) ids.add(page().bg.img);
    return [...ids].map(id => { const i = P.lib.find(x => x.id === id); return i ? { id, w: i.w, h: i.h, name: i.name } : null; }).filter(Boolean);
  }
  // העוזר "רואה" את התמונות: גרסה קטנה (עד 512px, JPEG) של עד 3 תמונות – אלה שבעיצוב, ואם אין, האחרונות שהועלו
  async function aiImagesWithData() {
    const list = aiImages();
    const usedIds = new Set(page().els.filter(e => e.type === 'image' && !e.hide).map(e => e.src)); if (page().bg.img) usedIds.add(page().bg.img);
    const pick = list.filter(i => usedIds.has(i.id) && !(P.lib.find(x => x.id === i.id) || {}).qr);
    list.forEach(i => { if (pick.length < 2 && !pick.includes(i)) pick.push(i); });
    for (const i of pick.slice(0, 3)) {
      try {
        const src = await imgGet(i.id); if (!src) continue;
        const im = await loadImg(src), k = Math.min(1, 512 / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        i.data = c.toDataURL('image/jpeg', 0.72).split(',')[1];
      } catch (e) {}
    }
    return list;
  }
  let aiBusy = false;
  async function runAI(mode) {
    const box = $('sd-ai-text'), t = box.value.trim();
    if (!t) { box.focus(); status('כתבו קודם מה לעצב 🙂'); return; }
    if (aiBusy) return; aiBusy = true;
    const btns = app.querySelectorAll('[data-ai]'); btns.forEach(b => b.disabled = true);
    let size = { w: P.w, h: P.h };
    let dest = destOf();
    if (mode === 'new') { const d = destFromText(t); if (d) { dest = d; P.dest = d.id; size = { w: d.w, h: d.h }; destBar(); } }
    status(mode === 'new' ? 'מעצב בשבילכם 3 הצעות… (לוקח בערך חצי דקה עד דקה)' : 'משנה את העיצוב…', true);
    used('ai', { mode });
    choices(null);
    let out = null, err = '';
    try {
      const images = await aiImagesWithData();
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 120000);
      const r = await fetch(AI_URL, { method: 'POST', headers: (function (h) { try { var c = localStorage.getItem('kelim-partner'); if (c) h['x-kelim-partner'] = c; } catch (e) {} return h; })({ 'content-type': 'application/json' }), signal: ctl.signal,
        body: JSON.stringify({ prompt: t, mode, size, dest: dest ? dest.ai : '', doc: mode === 'edit' ? aiDoc() : null, images, variants: mode === 'new' ? 3 : 1 }) });
      clearTimeout(tm);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.doc) out = j; else err = j.error || '';
    } catch (e) { err = ''; }
    if (out) {
      const opts = (Array.isArray(out.options) && out.options.length ? out.options : [{ doc: out.doc, note: out.note }]).filter(o => o && o.doc && o.doc.els && o.doc.els.length);
      applyAiDoc(clone(opts[0].doc));
      if (opts.length > 1) { choices(opts, 0); status('✓ הכנתי ' + opts.length + ' הצעות. הראשונה כבר על המסך – לחצו על אחרת כדי להחליף.'); }
      else status('✓ ' + (opts[0].note || out.note || 'מוכן. אפשר להמשיך לערוך: לגרור, לשנות טקסט וצבעים, או לכתוב לעוזר מה לשנות.'));
      $('sd-ai-mode-edit').hidden = false;
    } else if (mode === 'new') {
      applyAiDoc(localDesign(t, size), true);
      status((err ? err + ' ' : 'העוזר החכם לא זמין כרגע. ') + 'הכנתי עיצוב בסיסי לפי מה שכתבתם – אפשר לערוך אותו ידנית, או לנסות את העוזר שוב עוד מעט.');
    } else status(err || 'העוזר לא זמין כרגע. אפשר לשנות ידנית: לוחצים על מה שרוצים לשנות.');
    aiBusy = false; btns.forEach(b => b.disabled = false);
  }
  // שלוש ההצעות של העוזר – תמונות קטנות לבחירה, לחיצה טוענת לעורך
  let CH = null;
  function choices(opts, on) {
    const box = $('sd-choices'); if (!box) return;
    CH = opts;
    if (!opts) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '<div class="sd-ch-h"><b>בחרו הצעה:</b><button type="button" class="sd-ch-x" data-chx="1" aria-label="לסגור את ההצעות">✕</button></div><div class="sd-ch-row"></div>';
    const row = box.querySelector('.sd-ch-row');
    opts.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.ch = i; b.className = i === on ? 'on' : '';
      b.setAttribute('aria-label', 'הצעה ' + (i + 1));
      b.appendChild(thumb(o.doc, 150, 190));
      const cap = document.createElement('span'); cap.className = 'sd-ch-n'; cap.textContent = 'הצעה ' + (i + 1); b.appendChild(cap);
      row.appendChild(b);
    });
  }
  $('sd-choices').addEventListener('click', ev => {
    if (ev.target.closest('[data-chx]')) { choices(null); return; }
    const b = ev.target.closest('[data-ch]'); if (!b || !CH) return;
    const i = +b.dataset.ch, o = CH[i];
    applyAiDoc(clone(o.doc));
    $('sd-choices').querySelectorAll('[data-ch]').forEach(x => x.classList.toggle('on', x === b));
    status('✓ הצעה ' + (i + 1) + (o.note ? ': ' + o.note : '') + ' – אפשר להמשיך לערוך.');
    used('ai_pick', { i });
  });
  function applyAiDoc(d, local) {
    snap();
    const ids = new Set();
    d.els.forEach(e => { if (!e.id || ids.has(e.id)) e.id = uid(); ids.add(e.id); if (e.type === 'image') { e.f = e.f || {}; const li = P.lib.find(x => x.id === e.src); if (li) { e.iw = li.w; e.ih = li.h; } } });
    P.w = d.w; P.h = d.h;
    P.pages[P.cur] = { bg: d.bg, els: d.els };
    sel = null; full();
    if (!local) used('ai_ok');
  }
  // גיבוי בלי רשת: עיצוב פשוט מתוך המילים (כותרת, שורות, צבעים לפי מילים)
  const COLOR_WORDS = [[/זהב|זהוב/, '#c9a55c'], [/כחול|תכלת|ים/, '#1e5a8a'], [/אדום/, '#e53935'], [/צהוב/, '#f5c518'], [/ירוק/, '#2e7d32'],
    [/ורוד/, '#ff8fab'], [/סגול/, '#7b3fbf'], [/כתום/, '#ff8a00'], [/שחור|כהה|לילה/, '#16130f'], [/קלף|בז/, '#efe6d2'], [/טורקיז/, '#14807a']];
  function localDesign(t, size) {
    const W = size.w, H = size.h, u = W / 1080;
    let pl = PALETTES[3];
    if (/שבת|חג|ברכה|קודש|תורה|שיעור/.test(t)) pl = PALETTES[2];
    if (/הולדת|ילד|שמח|מסיבה/.test(t)) pl = PALETTES[6];
    if (/מבצע|הנחה|sale|חנות/.test(t)) pl = { bg: '#e53935', grad: '#b71c1c', t: '#f5c518', b: '#ffffff', a: '#f5c518' };
    if (/אזכרה|אבל|לזכר|נפטר/.test(t)) pl = { bg: '#2b2b2b', grad: '#3d3d3d', t: '#efe6d2', b: '#d9d9d9', a: '#9e9e9e' };
    const cs = COLOR_WORDS.filter(([re]) => re.test(t)).map(x => x[1]);
    if (cs.length) { pl = Object.assign({}, pl, { bg: cs[0], grad: null }); const ink = lum(cs[0]) < 0.5 ? '#ffffff' : '#16130f'; pl.t = cs[1] && Math.abs(lum(cs[1]) - lum(cs[0])) > 0.3 ? cs[1] : ink; pl.b = ink; pl.a = cs[1] || pl.t; }
    const q = t.match(/["״“”']([^"״“”']{2,80})["״“”']/);
    let title = q ? q[1] : '';
    const m = t.match(/כותרת[:\s]+([^,.\n]+)/); if (!title && m) title = m[1].trim();
    const FILL = /(^|\s)(ב?צבעי|בצבעים?|צבעוני|בסגנון|ו?(כחול|תכלת|זהב|זהוב|אדום|צהוב|ירוק|ורוד|סגול|כתום|שחור|כהה|קלף|בז'?|טורקיז|לבן)|שער|ל?רילס|ל?טיקטוק|ל?שורטס|ל?יוטיוב|ל?אינסטגרם|ל?פייסבוק|ל?ווטסאפ|ל?פוסט|ל?סטטוס|ל?סטורי|מודעה|מודעת|הזמנה|עיצוב|תעצב|תכין|לי|כותרת|עדין|בולט|יפה|ברכת|ברכה|עם|תמונה|התמונה|רקע)(?=[\s,.:]|$)/g;
    let rest = t.replace(q ? q[0] : '', ' ').replace(FILL, ' ').replace(FILL, ' ').replace(/\s*,\s*(,\s*)+/g, ', ').replace(/\s+/g, ' ').replace(/^[\s,.:-]+|[\s,.:-]+$/g, '').trim();
    if (!title) { const parts = rest.split(/[,.\n]/).map(s => s.trim()).filter(Boolean); title = parts.shift() || 'הכותרת שלכם'; rest = parts.join(' · '); }
    const font = /שבת|חג|קודש|תורה|אזכרה/.test(t) ? 'Frank Ruhl Libre' : /הולדת|ילד/.test(t) ? 'Secular One' : 'Rubik';
    const els = [
      S('rect', { x: Math.round(46 * u), y: Math.round(46 * u), w: W - Math.round(92 * u), h: H - Math.round(92 * u), fill: null, stroke: pl.a, sw: Math.max(2, Math.round(4 * u)), radius: Math.round(20 * u) }),
      T({ x: Math.round(100 * u), w: W - Math.round(200 * u), y: Math.round(H * 0.3), h: Math.round(260 * u), text: title, size: Math.round((title.length > 18 ? 90 : 130) * u), weight: 800, font, color: pl.t, lh: 1.1 }),
      S('line', { x: Math.round(W / 2 - 120 * u), y: Math.round(H * 0.3 + 300 * u), w: Math.round(240 * u), h: Math.max(2, Math.round(4 * u)), stroke: pl.a, sw: Math.max(2, Math.round(4 * u)) })];
    if (rest && rest.length > 2) els.push(T({ x: Math.round(120 * u), w: W - Math.round(240 * u), y: Math.round(H * 0.3 + 360 * u), h: Math.round(200 * u), text: rest.slice(0, 160), size: Math.round(46 * u), weight: 500, font: 'Heebo', color: pl.b, lh: 1.4 }));
    const imgs = aiImages();
    const bg = { color: pl.bg, grad: pl.grad, angle: 160, img: null, dim: 0 };
    if (imgs.length && /תמונה|על התמונה|רקע/.test(t)) { bg.img = imgs[0].id; bg.dim = 0.45; els.forEach(e => { if (e.type === 'text') e.color = '#ffffff'; }); }
    return { w: W, h: H, bg, els };
  }

  // ---------- ייצוא ----------
  let fontCss = null;
  async function shot(type) {
    if (!window.htmlToImage) throw new Error('lib');
    const prev = sel; select(null);
    await (document.fonts && document.fonts.ready);
    if (fontCss == null) { try { fontCss = await window.htmlToImage.getFontEmbedCSS(pg); } catch (e) { fontCss = ''; } }
    const opt = { width: P.w, height: P.h, pixelRatio: 1, cacheBust: false, fontEmbedCSS: fontCss || undefined,
      style: { transform: 'none', left: '0', top: '0' }, backgroundColor: page().bg.color };
    const c = await window.htmlToImage.toCanvas(pg, opt);
    if (prev) select(prev);
    return c;
  }
  function fname(ext) {
    const t = (page().els.filter(e => e.type === 'text').sort((a, b) => b.size - a.size)[0] || {}).text || 'עיצוב';
    return t.replace(/\s+/g, ' ').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 30) + '.' + ext;
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  const toBlob = (c, t, q) => new Promise(r => c.toBlob(r, t, q));
  async function exportAs(kind, btn) {
    const label = btn && btn.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = 'מכין…'; }
    try {
      if (kind === 'png' || kind === 'jpg' || kind === 'share') {
        const c = await shot();
        const b = await toBlob(c, kind === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
        const name = fname(kind === 'jpg' ? 'jpg' : 'png');
        if (kind === 'share') {
          const f = new File([b], name, { type: b.type });
          if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f] }); } catch (e) {} }
          else { download(b, name); status('התמונה ירדה למחשב. בווטסאפ: מצרפים אותה מהתיקייה "הורדות".'); }
        } else download(b, name);
        used(kind);
      } else if (kind === 'pdf') {
        if (!window.jspdf) await loadScript('/assets/vendor/jspdf/jspdf-2.5.1.umd.min.js');
        const cur = P.cur;
        const doc = new window.jspdf.jsPDF({ unit: 'px', format: [P.w, P.h], orientation: P.w > P.h ? 'l' : 'p', hotfixes: ['px_scaling'], compress: true });
        for (let i = 0; i < P.pages.length; i++) {
          P.cur = i; render();
          if (btn) btn.textContent = 'עמוד ' + (i + 1) + '/' + P.pages.length + '…';
          const c = await shot();
          if (i) doc.addPage([P.w, P.h], P.w > P.h ? 'l' : 'p');
          doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, P.w, P.h);
        }
        P.cur = cur; render();
        download(doc.output('blob'), fname('pdf'));
        used('pdf_out', { pages: P.pages.length });
      } else if (kind === 'print') {
        const imgs = [];
        const cur = P.cur;
        for (let i = 0; i < P.pages.length; i++) { P.cur = i; render(); imgs.push((await shot()).toDataURL('image/jpeg', 0.92)); }
        P.cur = cur; render();
        const box = $('sd-print'); box.innerHTML = imgs.map(s => '<img src="' + s + '" alt="">').join('');
        document.body.classList.add('sd-printing');
        used('print');
        setTimeout(() => { window.print(); }, 200);
      }
    } catch (e) { status('הייצוא לא הצליח. נסו שוב, או צלמו מסך.'); }
    if (btn) { btn.disabled = false; btn.innerHTML = label; }
  }
  window.addEventListener('afterprint', () => { document.body.classList.remove('sd-printing'); $('sd-print').innerHTML = ''; });

  // שמירה כקובץ פרויקט (עם התמונות) ופתיחה – כדי להמשיך במחשב אחר
  async function saveFile() {
    const imgs = {};
    const usedIds = new Set(); P.pages.forEach(p => { if (p.bg.img) usedIds.add(p.bg.img); p.els.forEach(e => e.src && usedIds.add(e.src)); });
    for (const id of usedIds) imgs[id] = await imgGet(id);
    const blob = new Blob([JSON.stringify({ kelimStudio: 1, P: Object.assign({}, P, { lib: P.lib.filter(i => usedIds.has(i.id)) }), imgs })], { type: 'application/json' });
    download(blob, fname('studio.json').replace('.studio.json', '') + '.studio.json'); used('save_file');
  }
  async function openFile(f) {
    try {
      const j = JSON.parse(await f.text());
      if (!j.kelimStudio || !j.P) throw 0;
      snap();
      for (const id in j.imgs) if (j.imgs[id]) await imgPut(id, j.imgs[id]);
      const lib = P.lib; P = j.P; P.lib = (P.lib || []).concat(lib.filter(i => !(P.lib || []).some(x => x.id === i.id)));
      sel = null; full(); status('הפרויקט נפתח.');
    } catch (e) { status('זה לא קובץ פרויקט של הסטודיו.'); }
  }

  // ---------- לוח צד ----------
  const side = $('sd-panel');
  function status(t, busy) { const s = $('sd-status'); s.textContent = t || ''; s.classList.toggle('busy', !!busy); s.hidden = !t; }
  function swatches(key, cur, allowNone) {
    return '<div class="sd-sw" data-key="' + key + '">' + (allowNone ? '<button type="button" class="none' + (!cur ? ' on' : '') + '" data-c="" title="בלי">∅</button>' : '') +
      SWATCH.map(c => '<button type="button" style="background:' + c + '" data-c="' + c + '"' + (cur === c ? ' class="on"' : '') + ' title="' + c + '"></button>').join('') +
      '<label class="pick" title="צבע אחר"><input type="color" data-key="' + key + '" value="' + (cur && cur[0] === '#' ? cur : '#000000') + '"></label></div>';
  }
  function range(key, label, val, min, max, step, unit) {
    return '<label class="sd-rg"><span>' + label + ' <b data-out="' + key + '">' + Math.round(val * 100) / 100 + (unit || '') + '</b></span><input type="range" data-key="' + key + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + val + '"></label>';
  }
  function layerTools(e) {
    return '<div class="sd-row sd-layer">' +
      '<button type="button" data-act="dup">שכפול</button><button type="button" data-act="del" class="danger">מחיקה</button>' +
      '<button type="button" data-act="top">הכי קדימה</button><button type="button" data-act="up">קדימה</button><button type="button" data-act="down">אחורה</button><button type="button" data-act="bottom">הכי אחורה</button>' +
      '<button type="button" data-act="cx">מרכז ↔</button><button type="button" data-act="cy">מרכז ↕</button>' +
      '<button type="button" data-act="lock">' + (e.lock ? '🔓 לשחרר נעילה' : '🔒 לנעול') + '</button><button type="button" data-act="hide">' + (e.hide ? '👁 להציג' : '🚫 להסתיר') + '</button>' +
      (e.type === 'image' ? '<button type="button" data-act="bgimg">להפוך לרקע</button>' : '') + '</div>' +
      range('opacity', 'שקיפות', e.opacity == null ? 1 : e.opacity, 0.05, 1, 0.05) + range('rot', 'סיבוב', e.rot || 0, -180, 180, 1, '°');
  }
  function panelFor(e) {
    if (e.type === 'text') {
      return '<h3>טקסט</h3><textarea data-key="text" rows="3" dir="rtl">' + esc(e.text) + '</textarea>' +
        '<label class="sd-lb">גופן</label><div class="sd-fonts">' + FONTS.map(f => '<button type="button" data-font="' + f + '" style="font-family:\'' + f + '\'"' + (e.font === f ? ' class="on"' : '') + '>' + (f === 'Amatic SC' || f === 'Karantina' ? 'כתב שמח' : 'אבגד הוזח') + '<small>' + f + '</small></button>').join('') + '</div>' +
        range('size', 'גודל', e.size, 8, Math.round(P.w / 3), 1) +
        '<div class="sd-row"><button type="button" data-set="weight" data-v="' + (e.weight >= 700 ? 400 : 800) + '" class="' + (e.weight >= 700 ? 'on' : '') + '"><b>מודגש</b></button>' +
        ['right', 'center', 'left'].map(a => '<button type="button" data-set="align" data-v="' + a + '" class="' + (e.align === a ? 'on' : '') + '">' + { right: 'ימין', center: 'מרכז', left: 'שמאל' }[a] + '</button>').join('') +
        '<button type="button" data-set="shadow" data-v="' + (!e.shadow) + '" class="' + (e.shadow ? 'on' : '') + '">צל</button></div>' +
        '<label class="sd-lb">צבע הטקסט</label>' + swatches('color', e.color) +
        '<label class="sd-lb">מלבן מאחורי הטקסט</label>' + swatches('bg', e.bg, true) +
        (e.bg ? range('bgA', 'שקיפות המלבן', bgAlpha(e.bg), 0.1, 1, 0.05) + range('pad', 'ריווח בתוך המלבן', e.pad || 0, 0, 120, 1) + range('radius', 'עיגול פינות', e.radius || 0, 0, 200, 1) : '') +
        '<label class="sd-lb">קו מתאר לאותיות (טוב לכתוביות)</label>' + swatches('stroke', e.stroke, true) +
        (e.stroke ? range('sw', 'עובי הקו', e.sw || 0, 0, 30, 0.5) : '') +
        range('lh', 'מרווח בין שורות', e.lh, 0.8, 2.2, 0.05) + range('ls', 'מרווח בין אותיות', e.ls || 0, -10, 40, 0.5) +
        range('weightR', 'עובי', e.weight, 300, 900, 100) +
        '<p class="sd-tip">טיפ: לחיצה כפולה על הטקסט בעיצוב – כותבים ישר עליו.</p>' + layerTools(e);
    }
    if (e.lock) return '<h3>' + esc(layerName(e)) + ' – נעול</h3><p class="sd-tip">השכבה נעולה: היא לא זזה ולא נבחרת בלחיצה על העיצוב. כדי לשנות אותה – משחררים את הנעילה.</p>' + layerTools(e);
    if (e.type === 'icon') {
      return '<h3>סמל: ' + esc(ICONS[e.icon] ? ICONS[e.icon][0] : '') + '</h3><label class="sd-lb">צבע</label>' + swatches('fill', e.fill) +
        '<label class="sd-lb">להחליף סמל</label><div class="sd-icons">' + Object.keys(ICONS).map(k => '<button type="button" data-swapicon="' + k + '" title="' + ICONS[k][0] + '"' + (e.icon === k ? ' class="on"' : '') + '>' + iconSvg(k) + '</button>').join('') + '</div>' + layerTools(e);
    }
    if (e.type === 'image') {
      const f = e.f || {};
      const inCrop = cropId === e.id, cz = (e.crop && e.crop.z) || 1;
      const head = '<h3>תמונה</h3>' +
        '<div class="sd-row sd-big"><button type="button" class="sd-gold" data-rmbg="1">✂️ להסיר רקע</button>' +
        '<button type="button" data-act="crop" class="' + (inCrop ? 'on' : '') + '">' + (inCrop ? '✓ סיום חיתוך' : '⬚ חיתוך והזזה') + '</button></div>' +
        (inCrop ? '<p class="sd-tip">גוררים את התמונה בתוך המסגרת כדי לבחור מה רואים. הידיות בפינות משנות את המסגרת.</p>' + range('crop.z', 'זום בתוך המסגרת', cz, 1, 5, 0.05, '×') + '<div class="sd-row"><button type="button" data-act="cropreset">לבטל את החיתוך</button></div>' : '') +
        '<label class="sd-lb">מסגרת בצורה</label><div class="sd-masks">' + MASKS.map(m => '<button type="button" data-mask="' + m[0] + '"' + ((e.mask || '') === m[0] ? ' class="on"' : '') + '><i class="mk-' + (m[0] || 'none') + '"></i>' + m[1] + '</button>').join('') + '</div>';
      return head + '<label class="sd-lb">איך התמונה ממלאת את המסגרת</label><div class="sd-row"><button type="button" data-set="fit" data-v="cover" class="' + (e.fit !== 'contain' ? 'on' : '') + '">ממלאת את המסגרת</button><button type="button" data-set="fit" data-v="contain" class="' + (e.fit === 'contain' ? 'on' : '') + '">כל התמונה</button><button type="button" data-set="flip" data-v="' + (!e.flip) + '">היפוך</button><button type="button" data-act="round">עיגול</button></div>' +
        range('radius', 'עיגול פינות', e.radius || 0, 0, Math.round(Math.min(e.w, e.h) / 2), 1) +
        '<label class="sd-lb">מסגרת</label>' + swatches('stroke', e.stroke, true) + (e.stroke ? range('sw', 'עובי המסגרת', e.sw || 0, 0, 60, 1) : '') +
        '<label class="sd-lb">שיפור התמונה</label>' + range('f.b', 'בהירות', f.b == null ? 100 : f.b, 40, 180, 1, '%') + range('f.c', 'ניגודיות', f.c == null ? 100 : f.c, 40, 180, 1, '%') +
        range('f.s', 'רוויית צבע', f.s == null ? 100 : f.s, 0, 220, 1, '%') + range('f.g', 'שחור-לבן', f.g || 0, 0, 100, 1, '%') + range('f.bl', 'טשטוש', f.bl || 0, 0, 20, 0.5) +
        '<div class="sd-row"><button type="button" data-act="caption">+ כיתוב על התמונה</button></div>' + layerTools(e);
    }
    const isLine = e.type === 'line';
    return '<h3>' + ({ rect: 'מלבן', ellipse: 'עיגול', line: 'קו' })[e.type] + '</h3>' +
      (isLine ? '<label class="sd-lb">צבע</label>' + swatches('stroke', e.stroke) + range('sw', 'עובי', e.sw || 4, 1, 60, 1)
        : '<label class="sd-lb">מילוי</label>' + swatches('fill', e.fill, true) + '<label class="sd-lb">מסגרת</label>' + swatches('stroke', e.stroke, true) +
        (e.stroke ? range('sw', 'עובי המסגרת', e.sw || 0, 0, 60, 1) : '') + (e.type === 'rect' ? range('radius', 'עיגול פינות', e.radius || 0, 0, Math.round(Math.min(e.w, e.h) / 2), 1) : '')) + layerTools(e);
  }
  function bgAlpha(c) { const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(c || ''); return m ? +m[1] : 1; }
  function toHex(c) { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') : c; }
  function panelTab() {
    if (tab === 'ai') return '<h3>עוזר העיצוב</h3><p class="sd-tip">כתבו למעלה, במילים שלכם, מה לעצב או מה לשנות. אפשר גם לצרף תמונות קודם (בלשונית "תמונות"), והעוזר ישתמש בהן.</p>' +
      '<label class="sd-lb">רעיונות לנסות</label><div class="sd-chips">' + AI_EXAMPLES.map(x => '<button type="button" data-ex="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>';
    if (tab === 'tpl') return '<h3>תבניות</h3>' + [...new Set(TEMPLATES.map(t => t.g))].map(g => '<label class="sd-lb">' + g + '</label><div class="sd-tpls">' +
        TEMPLATES.map((t, i) => t.g !== g ? '' : '<button type="button" data-tpl="' + i + '"><span class="sd-tt" data-tt="' + i + '"></span>' + t.n + '</button>').join('') + '</div>').join('') +
      '<label class="sd-lb">דף ריק</label><div class="sd-row">' + SIZES.map(s => '<button type="button" data-blank="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>';
    if (tab === 'text') return '<h3>הוספת טקסט</h3><div class="sd-tpres">' + TEXT_PRESETS.map((t, i) => '<button type="button" data-tp="' + i + '" class="tp' + i + '">' + t[0] + '</button>').join('') + '</div>' +
      '<label class="sd-lb">סמלים</label><div class="sd-row sd-sym">' + ['✡', '❤', '★', '✓', '☎', '📍', '🕯️', '🎉', '🎂', '🌸', '📖', '✨'].map(s => '<button type="button" data-sym="' + s + '">' + s + '</button>').join('') + '</div>';
    if (tab === 'img') return '<h3>תמונות ומסמכים</h3><div class="sd-row"><button type="button" class="btn btn-gold btn-sm" data-pick="img">+ להוסיף תמונה</button><button type="button" class="btn btn-line btn-sm" data-pick="bg">תמונה כרקע</button><button type="button" class="btn btn-line btn-sm" data-pick="pdf">לפתוח מסמך PDF</button></div>' +
      '<p class="sd-tip">אפשר גם לגרור קבצים לכאן, או להדביק תמונה (Ctrl+V). מסמך PDF נפתח עמוד-עמוד, ואפשר לכתוב עליו, להוסיף חתימה או כיתוב ולשמור שוב כ-PDF.</p>' +
      (P.lib.length ? '<label class="sd-lb">התמונות שלי (לחיצה מוסיפה לעיצוב)</label><div class="sd-lib">' + P.lib.slice(0, 40).map(i => '<button type="button" data-lib="' + i.id + '" title="' + esc(i.name) + '"><img alt="" src="' + (IMG[i.id] || '') + '"></button>').join('') + '</div>' : '');
    if (tab === 'shape') return '<h3>צורות וקישוטים</h3><div class="sd-shapes">' +
      [['rect', 'מלבן'], ['round', 'מלבן מעוגל'], ['ellipse', 'עיגול'], ['line', 'קו'], ['frame', 'מסגרת לדף'], ['band', 'פס רחב'], ['bubble', 'עיגול שקוף']].map(s => '<button type="button" data-shape="' + s[0] + '"><i class="sh-' + s[0] + '"></i>' + s[1] + '</button>').join('') + '</div>';
    if (tab === 'bg') {
      const b = page().bg;
      return '<h3>רקע</h3><label class="sd-lb">ערכות צבע מוכנות (משנות את כל העיצוב)</label><div class="sd-pal">' + PALETTES.map((p, i) => '<button type="button" data-pal="' + i + '"><span style="background:linear-gradient(135deg,' + p.bg + ' 50%,' + p.a + ' 50%)"></span>' + p.n + '</button>').join('') + '</div>' +
        '<label class="sd-lb">צבע רקע</label>' + swatches('bg.color', b.color) +
        '<label class="sd-lb">מעבר צבע (צבע שני)</label>' + swatches('bg.grad', b.grad, true) + (b.grad ? range('bg.angle', 'כיוון המעבר', b.angle || 0, 0, 360, 5, '°') : '') +
        '<div class="sd-row"><button type="button" class="btn btn-line btn-sm" data-pick="bg">תמונת רקע</button>' + (b.img ? '<button type="button" data-bgx="1">להסיר את תמונת הרקע</button>' : '') + '</div>' +
        (b.img ? range('bg.dim', 'הכהיית התמונה (כדי שהטקסט ייקרא)', b.dim || 0, 0, 0.85, 0.05) : '');
    }
    if (tab === 'size') return '<h3>גודל העיצוב</h3><p class="sd-tip">עכשיו: ' + P.w + ' × ' + P.h + '. כשמשנים גודל, כל מה שבעיצוב מסתדר מחדש בערך באותו מקום. בסטטוס, בסטורי וברילס מסומן בוורוד איפה האפליקציה מכסה – לא לשים שם טקסט (הסימון לא נשמר בתמונה).</p><div class="sd-sizes">' +
      SIZES.map(s => '<button type="button" data-size="' + s[0] + '"' + (P.dest === s[0] ? ' class="on"' : '') + '><i style="aspect-ratio:' + s[2] + '/' + s[3] + '"></i>' + s[1] + '<small>' + s[2] + '×' + s[3] + '</small></button>').join('') + '</div>' +
      '<label class="sd-lb">גודל אחר (פיקסלים)</label><div class="sd-row"><input type="number" id="sd-cw" min="200" max="4000" value="' + P.w + '" aria-label="רוחב"> × <input type="number" id="sd-ch" min="200" max="6000" value="' + P.h + '" aria-label="גובה"><button type="button" data-size="custom">לשנות</button></div>';
    if (tab === 'layers') return '<h3>שכבות</h3><p class="sd-tip">למעלה = הכי קדימה. גוררים ב-⋮⋮ לשינוי סדר. 🔒 נועל במקום, 👁 מסתיר.</p><ul class="sd-layers" id="sd-layers"></ul>';
    if (tab === 'qr') {
      const ph = { link: 'למשל: hakelim.com', tel: 'למשל: 050-1234567', wa: 'מספר הווטסאפ, למשל 050-1234567' }[qrType];
      return '<h3>קוד QR</h3><p class="sd-tip">מצלמים את הקוד בטלפון – והוא פותח קישור, מחייג או פותח צ׳אט בווטסאפ.</p>' +
        '<div class="sd-row">' + [['link', 'קישור'], ['tel', 'טלפון'], ['wa', 'ווטסאפ']].map(q => '<button type="button" data-qrt="' + q[0] + '"' + (qrType === q[0] ? ' class="on"' : '') + '>' + q[1] + '</button>').join('') + '</div>' +
        '<input type="' + (qrType === 'link' ? 'url' : 'tel') + '" id="sd-qr-v" class="sd-in" dir="ltr" placeholder="' + ph + '" aria-label="' + ph + '">' +
        (qrType === 'wa' ? '<input type="text" id="sd-qr-m" class="sd-in" dir="rtl" placeholder="הודעה שתופיע מוכנה (לא חובה)" aria-label="הודעה מוכנה">' : '') +
        '<label class="sd-lb">צבע הקוד (כהה – כדי שייסרק טוב)</label><div class="sd-sw" data-key="qrc">' + ['#000000', '#16130f', '#1e3a5f', '#5f5d43', '#7a1c2b', '#4a148c'].map(c => '<button type="button" style="background:' + c + '" data-qrc="' + c + '"' + ((window.__sdQrc || '#000000') === c ? ' class="on"' : '') + '></button>').join('') + '</div>' +
        '<div class="sd-row"><button type="button" class="sd-gold" data-qradd="1">+ להוסיף QR לעיצוב</button></div>' +
        '<h3 style="margin-top:18px">סמלים</h3><label class="sd-lb">צבע לסמלים חדשים</label><div class="sd-sw">' + ['', '#ffffff', '#16130f', '#c9a55c', '#1e3a5f', '#2e7d32', '#e53935', '#d81b60', '#7b3fbf', '#ff8a00'].map(c => '<button type="button" ' + (c ? 'style="background:' + c + '"' : 'class="none' + (!iconColor ? ' on' : '') + '" title="אוטומטי"') + ' data-icc="' + c + '"' + (c && iconColor === c ? ' class="on"' : '') + '>' + (c ? '' : 'A') + '</button>').join('') + '</div>' +
        '<div class="sd-icons" style="margin-top:8px">' + Object.keys(ICONS).map(k => '<button type="button" data-icon="' + k + '" title="' + ICONS[k][0] + '" style="color:' + (iconColor || '#c9a55c') + '">' + iconSvg(k) + '<small>' + ICONS[k][0] + '</small></button>').join('') + '</div>';
    }
    if (tab === 'file') return '<h3>הפרויקט</h3><div class="sd-row"><button type="button" data-file="new">עיצוב חדש</button><button type="button" data-file="save">לשמור כקובץ</button><button type="button" data-file="open">לפתוח קובץ</button></div>' +
      '<p class="sd-tip">העיצוב נשמר לבד בדפדפן הזה. "לשמור כקובץ" – כדי להמשיך במחשב אחר או לשמור גרסה.</p>';
    return '';
  }
  function panel() {
    const e = sel && elById(sel);
    app.querySelectorAll('.sd-tabs [data-tab]').forEach(b => { const on = !e && b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    side.innerHTML = e ? '<button type="button" class="sd-back" data-back="1">→ חזרה</button>' + panelFor(e) : panelTab();
    if (!e && tab === 'tpl') side.querySelectorAll('[data-tt]').forEach(n => { const t = TEMPLATES[+n.dataset.tt]; n.replaceWith(thumb({ w: t.w, h: t.h, bg: t.bg, els: t.els() }, 92, 112)); });
    if (!e && tab === 'layers') layersList();
  }
  // ---------- רשימת שכבות ----------
  const TYPE_N = { text: 'טקסט', image: 'תמונה', rect: 'מלבן', ellipse: 'עיגול', line: 'קו', icon: 'סמל' };
  function layerName(e) {
    if (e.name) return e.name;
    if (e.type === 'text') return (e.text || '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'טקסט';
    if (e.type === 'icon') return 'סמל: ' + (ICONS[e.icon] ? ICONS[e.icon][0] : '');
    if (e.type === 'image') { const i = P.lib.find(x => x.id === e.src); return i ? i.name : 'תמונה'; }
    return TYPE_N[e.type] || e.type;
  }
  let layersDragging = false, sortable = null;
  function layersList() {
    const ul = $('sd-layers'); if (!ul) return;
    const els = page().els;
    ul.innerHTML = els.length ? '' : '<li class="sd-tip">אין עדיין שכבות בעמוד הזה.</li>';
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      const li = document.createElement('li'); li.dataset.lid = e.id; li.className = (e.hide ? 'hid ' : '') + (e.lock ? 'lck' : '');
      const pv = document.createElement('span'); pv.className = 'sd-lpv';
      if (e.type === 'image') pv.innerHTML = '<img alt="" src="' + (IMG[e.src] || '') + '">';
      else if (e.type === 'icon') { pv.innerHTML = iconSvg(e.icon); pv.style.color = e.fill; }
      else if (e.type === 'text') { pv.textContent = 'א'; pv.style.cssText = 'font-family:"' + e.font + '";color:' + e.color + ';background:' + (e.bg || (lum(e.color) > 0.6 ? '#3a3530' : '#efe6d2')); }
      else pv.innerHTML = '<i style="background:' + (e.fill || e.stroke || '#999') + ';border-radius:' + (e.type === 'ellipse' ? '50%' : e.type === 'line' ? '2px' : '3px') + (e.type === 'line' ? ';height:4px' : '') + '"></i>';
      li.innerHTML = '<span class="sd-grip" aria-hidden="true">⋮⋮</span>';
      li.appendChild(pv);
      const nm = document.createElement('button'); nm.type = 'button'; nm.className = 'sd-lname'; nm.dataset.lsel = e.id; nm.textContent = layerName(e); li.appendChild(nm);
      li.insertAdjacentHTML('beforeend', '<button type="button" class="sd-lb2" data-lhide="' + e.id + '" title="' + (e.hide ? 'להציג' : 'להסתיר') + '" aria-label="' + (e.hide ? 'להציג' : 'להסתיר') + '">' + (e.hide ? '🚫' : '👁') + '</button>' +
        '<button type="button" class="sd-lb2" data-llock="' + e.id + '" title="' + (e.lock ? 'לשחרר נעילה' : 'לנעול') + '" aria-label="' + (e.lock ? 'לשחרר נעילה' : 'לנעול') + '">' + (e.lock ? '🔒' : '🔓') + '</button>');
      ul.appendChild(li);
    }
    const mk = () => {
      if (sortable) { try { sortable.destroy(); } catch (e) {} }
      sortable = window.Sortable.create(ul, { handle: '.sd-grip', animation: 150, delay: 0, touchStartThreshold: 3,
        onStart: () => { layersDragging = true; },
        onEnd: () => {
          layersDragging = false;
          const order = [...ul.querySelectorAll('[data-lid]')].map(n => n.dataset.lid).reverse();
          const els2 = order.map(id => elById(id)).filter(Boolean);
          if (els2.length !== page().els.length || els2.every((x, i) => x === page().els[i])) return;
          snap(); page().els = els2; render(); used('layers', { how: 'reorder' });
        } });
    };
    if (window.Sortable) mk(); else loadScript('/assets/vendor/sortablejs/Sortable-1.15.2.min.js').then(() => { if ($('sd-layers') === ul) mk(); }).catch(() => {});
  }
  app.querySelector('.sd-tabs').addEventListener('click', ev => {
    const b = ev.target.closest('[data-tab]'); if (!b) return;
    tab = b.dataset.tab; sel = null; cropId = null; drawSel(); panel(); sheetOpen(true);
    if (tab === 'ai' && !sheetMode()) $('sd-ai-text').focus();
  });
  function setKey(e, key, v) {
    if (key.indexOf('f.') === 0) { e.f = e.f || {}; e.f[key.slice(2)] = +v; return; }
    if (key === 'crop.z') { e.crop = Object.assign({ cx: 0.5, cy: 0.5 }, e.crop || {}, { z: +v }); drawSel(); return; }
    if (key.indexOf('bg.') === 0) { const b = page().bg, k = key.slice(3); b[k] = (k === 'color' || k === 'grad') ? (v || null) : +v; if (k === 'color' && !v) b.color = '#ffffff'; return; }
    if (!e) return;
    if (key === 'bgA') { e.bg = hexA(toHex(e.bg), +v); return; }
    if (key === 'weightR') { e.weight = +v; return; }
    if (key === 'text') { e.text = v; return; }
    if (['color', 'fill', 'stroke', 'bg'].includes(key)) {
      if (key === 'bg' && v && e.bg && /^rgba/.test(e.bg)) { e.bg = hexA(v, bgAlpha(e.bg)); return; }
      e[key] = v || null;
      if (key === 'stroke' && v && !e.sw) e.sw = e.type === 'text' ? Math.max(2, Math.round(e.size / 14)) : 4;
      if (key === 'bg' && v && !e.pad) e.pad = Math.round(e.size * 0.35);
      return;
    }
    e[key] = +v;
    if (key === 'sw' && e.type === 'line') e.h = +v;
  }
  side.addEventListener('input', ev => {
    const t = ev.target, key = t.dataset.key; if (!key) return;
    const e = sel && elById(sel);
    snapOnce();
    setKey(e, key, t.type === 'color' || key === 'text' ? t.value : t.value);
    const o = side.querySelector('[data-out="' + key + '"]'); if (o) o.textContent = t.value;
    render();
    if (t.type === 'color') { /* לעדכן את הדגשת הדוגמיות */ }
  });
  side.addEventListener('change', ev => { const t = ev.target; if (t.type === 'color' || (t.dataset.key && /^(bg|stroke)$/.test(t.dataset.key))) panel(); });
  const pickers = { img: $('sd-file-img'), bg: $('sd-file-bg'), pdf: $('sd-file-pdf'), open: $('sd-file-open') };
  side.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const d = b.dataset, e = sel && elById(sel);
    if (d.back) { cropId = null; select(null); return; }
    if (d.rmbg && e) { removeBg(e); return; }
    if (d.mask != null && e) { snap(); e.mask = d.mask; if (d.mask) { e.radius = 0; if (d.mask === 'circle' || d.mask === 'heart' || d.mask === 'star' || d.mask === 'hex' || d.mask === 'diamond' || d.mask === 'blob') { const s = Math.min(e.w, e.h); if (Math.abs(e.w - e.h) > 2) { const cx = e.x + e.w / 2, cy = e.y + e.h / 2; e.w = e.h = s; e.x = Math.round(cx - s / 2); e.y = Math.round(cy - s / 2); e.fit = 'cover'; } } } render(); panel(); used('mask', { m: d.mask }); return; }
    if (d.swapicon && e) { snap(); e.icon = d.swapicon; delete e.name; render(); panel(); return; }
    if (d.icon) { addIcon(d.icon); return; }
    if (d.icc != null) { iconColor = d.icc || null; panel(); return; }
    if (d.qrt) { qrType = d.qrt; panel(); return; }
    if (d.qrc) { window.__sdQrc = d.qrc; panel(); return; }
    if (d.qradd) { const v = $('sd-qr-v') && $('sd-qr-v').value, m = $('sd-qr-m') && $('sd-qr-m').value; addQr(qrType, v, m, window.__sdQrc || '#000000'); return; }
    if (d.lsel) { const x = elById(d.lsel); if (x) select(x.id); return; }
    if (d.lhide || d.llock) { const x = elById(d.lhide || d.llock); if (!x) return; snap(); if (d.lhide) x.hide = !x.hide; else x.lock = !x.lock; if (x.lock && cropId === x.id) cropId = null; render(); layersList(); used('layers', { how: d.lhide ? 'hide' : 'lock' }); return; }
    if (d.c != null) { const key = b.parentNode.dataset.key; snap(); setKey(e, key, d.c); render(); panel(); return; }
    if (d.font && e) { snap(); e.font = d.font; render(); panel(); return; }
    if (d.set && e) { snap(); const v = d.v; e[d.set] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; render(); panel(); return; }
    if (d.act) { if (d.act === 'round' && e) { snap(); e.radius = Math.round(Math.min(e.w, e.h) / 2); render(); panel(); } else if (d.act === 'caption' && e) { addText(TEXT_PRESETS[3][1], 'כיתוב על תמונה'); const c = elById(sel); c.w = Math.min(c.w, e.w - 20); c.x = Math.round(e.x + e.w / 2 - c.w / 2); c.y = Math.round(e.y + e.h - c.h - e.h * 0.06); render(); } else act(d.act); return; }
    if (d.ex) { $('sd-ai-text').value = d.ex; $('sd-ai-text').focus(); return; }
    if (d.tpl != null) { snap(); const t = TEMPLATES[+d.tpl]; P.w = t.w; P.h = t.h; P.pages[P.cur] = fromTemplate(t); sel = null; full(); used('template', { t: t.n }); return; }
    if (d.blank) { const s = SIZES.find(x => x[0] === d.blank); snap(); P.w = s[2]; P.h = s[3]; P.dest = s[0]; destBar(); P.pages[P.cur] = { bg: { color: '#ffffff', grad: null, angle: 0, img: null, dim: 0 }, els: [] }; sel = null; full(); return; }
    if (d.tp != null) { const t = TEXT_PRESETS[+d.tp]; addText(t[1], t[0]); return; }
    if (d.sym) { const e2 = T({ text: d.sym, size: Math.round(140 * U()), w: Math.round(200 * U()), weight: 400, color: autoInk(), lh: 1.1 }); e2.h = Math.round(e2.size * 1.1); addEl(center(e2)); return; }
    if (d.pick) { pickers[d.pick].click(); return; }
    if (d.lib) { const i = P.lib.find(x => x.id === d.lib); if (i) imgGet(i.id).then(() => placeImage(i)); return; }
    if (d.shape) {
      const u = U(), a = page().bg.img || lum(page().bg.color) < 0.45 ? '#ffffff' : '#c9a55c';
      const m = {
        rect: () => center(S('rect', { w: Math.round(400 * u), h: Math.round(260 * u), fill: a })),
        round: () => center(S('rect', { w: Math.round(400 * u), h: Math.round(260 * u), fill: a, radius: Math.round(40 * u) })),
        ellipse: () => center(S('ellipse', { w: Math.round(300 * u), h: Math.round(300 * u), fill: a })),
        line: () => center(S('line', { w: Math.round(400 * u), h: Math.max(2, Math.round(5 * u)), sw: Math.max(2, Math.round(5 * u)), stroke: a, fill: null })),
        frame: () => S('rect', { x: Math.round(40 * u), y: Math.round(40 * u), w: P.w - Math.round(80 * u), h: P.h - Math.round(80 * u), fill: null, stroke: a, sw: Math.max(2, Math.round(5 * u)), radius: Math.round(16 * u) }),
        band: () => S('rect', { x: 0, y: Math.round(P.h * 0.72), w: P.w, h: Math.round(P.h * 0.16), fill: a }),
        bubble: () => center(S('ellipse', { w: Math.round(420 * u), h: Math.round(420 * u), fill: a, opacity: 0.3 }))
      };
      const n = m[d.shape]();
      if (d.shape === 'frame' || d.shape === 'band') { snap(); page().els.unshift(n); sel = n.id; render(); panel(); } else addEl(n);
      return;
    }
    if (d.pal != null) { applyPalette(PALETTES[+d.pal]); return; }
    if (d.bgx) { snap(); page().bg.img = null; render(); panel(); return; }
    if (d.size) {
      if (d.size === 'custom') { const w = Math.round(+$('sd-cw').value), h = Math.round(+$('sd-ch').value); if (w >= 200 && w <= 4000 && h >= 200 && h <= 6000) resize(w, h); return; }
      setDest(d.size); return;
    }
    if (d.file === 'new') { if (!confirm('להתחיל עיצוב חדש? העיצוב הנוכחי יימחק מהדפדפן (אפשר לבטל עם "בטל")')) return; snap(); const lib = P.lib; P = newProject(); P.pages[0] = { bg: { color: '#ffffff', grad: null, angle: 0, img: null, dim: 0 }, els: [] }; P.lib = lib; sel = null; full(); return; }
    if (d.file === 'save') { saveFile(); return; }
    if (d.file === 'open') { pickers.open.click(); return; }
  });
  pickers.img.addEventListener('change', function () { addImageFiles(this.files, false); this.value = ''; });
  pickers.bg.addEventListener('change', function () { addImageFiles(this.files, true); this.value = ''; });
  pickers.pdf.addEventListener('change', function () { addImageFiles(this.files, false); this.value = ''; });
  pickers.open.addEventListener('change', function () { if (this.files[0]) openFile(this.files[0]); this.value = ''; });
  // גרירת קבצים והדבקה
  ['dragover', 'drop'].forEach(t => app.addEventListener(t, ev => {
    if (!ev.dataTransfer || ![...ev.dataTransfer.types].includes('Files')) return;
    ev.preventDefault();
    if (t === 'drop') addImageFiles(ev.dataTransfer.files, false);
  }));
  document.addEventListener('paste', ev => {
    if (/INPUT|TEXTAREA/.test(ev.target.tagName) || ev.target.isContentEditable) return;
    const fs = [...(ev.clipboardData && ev.clipboardData.files || [])]; if (fs.length) { ev.preventDefault(); addImageFiles(fs, false); }
  });

  // סרגל עליון
  $('sd-undo').addEventListener('click', undo);
  $('sd-redo').addEventListener('click', redo);
  app.querySelectorAll('[data-out-kind]').forEach(b => b.addEventListener('click', () => exportAs(b.dataset.outKind, b)));
  app.querySelectorAll('[data-ai]').forEach(b => b.addEventListener('click', () => runAI(b.dataset.ai)));
  $('sd-ai-text').addEventListener('keydown', ev => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) runAI(P.pages[P.cur].els.length && !$('sd-ai-mode-edit').hidden ? 'edit' : 'new'); });

  $('sd-dest').addEventListener('click', ev => { const b = ev.target.closest('[data-dest]'); if (b) setDest(b.dataset.dest); });

  // ---------- זום ולוח תחתון בטלפון ----------
  $('sd-zoom').addEventListener('click', ev => {
    const b = ev.target.closest('[data-zm]'); if (!b) return;
    const k = b.dataset.zm;
    if (k === 'in') setZoom(zoom * 1.4); else if (k === 'out') setZoom(zoom / 1.4); else { zoom = 1; fitScale(); drawSel(); }
  });
  const sideBox = $('sd-side');
  function sheetOpen(open) {
    if (!sheetMode()) return;
    sideBox.classList.toggle('closed', !open);
    $('sd-grab').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  $('sd-grab').addEventListener('click', () => sheetOpen(sideBox.classList.contains('closed')));
  // בטלפון: לוח האפשרויות נצמד לתחתית המסך (כמו בקנבה) – רק כשהעורך על המסך
  const narrow = window.matchMedia('(max-width:860px)');
  let appVisible = false;
  function updSheet() {
    const on = narrow.matches && appVisible;
    if (on === sheetMode()) return;
    app.classList.toggle('sd-sheet-on', on);
    if (on) sideBox.classList.toggle('closed', !sel);
    fitScale(); drawSel();
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { es.forEach(x => { appVisible = x.isIntersecting; }); updSheet(); }, { rootMargin: '-10% 0px -30% 0px' }).observe($('sd-viewport'));
  if (narrow.addEventListener) narrow.addEventListener('change', updSheet);

  // ---------- התחלה ----------
  async function start() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.pages && s.pages.length) P = s; } catch (e) {}
    const first = !P;
    if (!P) P = newProject(TEMPLATES[0]);
    P.lib = P.lib || [];
    P.cur = Math.min(P.cur || 0, P.pages.length - 1);
    fitScale(); render(); panel(); updUndo(); destBar();
    if (!first) $('sd-ai-mode-edit').hidden = false;
    await loadAllImages(); render(); if (tab === 'img') panel();
    if (document.fonts) { document.fonts.ready.then(() => render()); document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => render()); }
    // טעינת הגופנים מראש, כדי שהגובה של הטקסט יהיה נכון
    if (document.fonts && document.fonts.load) FONTS.forEach(f => { document.fonts.load('700 20px "' + f + '"', 'אב').catch(() => {}); });
  }
  let rT = 0;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { fitScale(); drawSel(); }, 120); });
  start();
})();
