// סטודיו לעיצוב – עורך גרפי בדפדפן (בסגנון Canva) + עוזר שמעצב לפי מה שכותבים במילים.
// מבנה: פרויקט = גודל + עמודים; עמוד = רקע + שכבות (טקסט / תמונה / מלבן / עיגול / קו).
// הכול נשמר במכשיר: הפרויקט ב-localStorage, התמונות ב-IndexedDB. לעוזר נשלח רק הטקסט והמבנה – לא התמונות.
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
  const SIZES = [
    ['post', 'פוסט ריבוע', 1080, 1080], ['tall', 'פוסט לאורך', 1080, 1350], ['story', 'סטטוס / סטורי', 1080, 1920],
    ['wide', 'רוחב (מצגת, יוטיוב)', 1920, 1080], ['a4', 'דף A4 לאורך', 1240, 1754], ['a4l', 'דף A4 לרוחב', 1754, 1240],
    ['card', 'כרטיס ביקור', 1050, 600], ['banner', 'באנר לפייסבוק', 1640, 624]
  ];
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

  // ---------- מצב ----------
  let P = null;          // הפרויקט: {w,h,pages:[{bg,els}],cur,lib:[{id,w,h,name}]}
  let sel = null;        // מזהה השכבה הנבחרת
  let scale = 1;
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
      T({ x: 80, w: 890, y: 360, h: 100, text: '050-0000000\nexample@mail.com', size: 34, weight: 400, color: '#efe6d2', font: 'Assistant', align: 'right', lh: 1.4 })] }
  ];
  function fromTemplate(t) { return { bg: clone(t.bg), els: t.els() }; }
  function newProject(t) { t = t || TEMPLATES[0]; return { w: t.w, h: t.h, pages: [fromTemplate(t)], cur: 0, lib: [] }; }

  // ---------- ציור הקנבס ----------
  const holder = $('sd-holder'), pg = $('sd-page'), ui = $('sd-ui'), vp = $('sd-viewport');
  function fitScale() {
    const avail = Math.max(240, vp.clientWidth - 24);
    const maxH = Math.max(320, Math.min(window.innerHeight * 0.72, 900));
    scale = Math.min(avail / P.w, maxH / P.h, 1);
    holder.style.width = Math.round(P.w * scale) + 'px'; holder.style.height = Math.round(P.h * scale) + 'px';
    [pg, ui].forEach(n => { n.style.width = P.w + 'px'; n.style.height = P.h + 'px'; n.style.transform = 'scale(' + scale + ')'; });
    ui.style.setProperty('--k', 1 / scale);
  }
  function bgCss(b) {
    let s = b.grad ? 'linear-gradient(' + (b.angle || 0) + 'deg,' + b.color + ',' + b.grad + ')' : b.color;
    return s;
  }
  function renderBg() {
    const b = page().bg;
    pg.style.background = bgCss(b);
    let im = pg.querySelector(':scope > .sd-bgimg');
    if (b.img && IMG[b.img]) {
      if (!im) { im = document.createElement('div'); im.className = 'sd-bgimg'; pg.prepend(im); }
      im.style.backgroundImage = 'url("' + IMG[b.img] + '")';
      im.style.boxShadow = 'inset 0 0 0 ' + (P.w + P.h) + 'px rgba(0,0,0,' + (b.dim || 0) + ')';
    } else if (im) im.remove();
  }
  function styleEl(n, e) {
    const s = n.style;
    s.left = e.x + 'px'; s.top = e.y + 'px'; s.width = e.w + 'px';
    s.height = e.type === 'text' ? 'auto' : e.h + 'px';
    s.transform = e.rot ? 'rotate(' + e.rot + 'deg)' : '';
    s.opacity = e.opacity == null ? 1 : e.opacity;
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
      im.style.objectFit = e.fit || 'cover';
      im.style.borderRadius = Math.max(0, (e.radius || 0) - (e.sw || 0)) + 'px';
      const f = e.f || {};
      im.style.filter = 'brightness(' + (f.b == null ? 100 : f.b) + '%) contrast(' + (f.c == null ? 100 : f.c) + '%) saturate(' + (f.s == null ? 100 : f.s) + '%)' + (f.g ? ' grayscale(' + f.g + '%)' : '') + (f.bl ? ' blur(' + f.bl + 'px)' : '');
      im.style.transform = e.flip ? 'scaleX(-1)' : '';
    } else if (e.type === 'rect' || e.type === 'ellipse') {
      s.background = e.fill || 'transparent';
      s.border = e.stroke && e.sw ? e.sw + 'px solid ' + e.stroke : '';
      s.borderRadius = e.type === 'ellipse' ? '50%' : (e.radius || 0) + 'px';
    } else if (e.type === 'line') {
      s.height = (e.sw || 4) + 'px'; s.background = e.stroke; s.borderRadius = (e.sw || 4) / 2 + 'px';
    }
  }
  function render() {
    renderBg();
    const keep = new Set(page().els.map(e => e.id));
    pg.querySelectorAll(':scope > .sd-el').forEach(n => { if (!keep.has(n.dataset.id)) n.remove(); });
    page().els.forEach((e, i) => {
      let n = pg.querySelector(':scope > .sd-el[data-id="' + e.id + '"]');
      if (!n || n.dataset.type !== e.type) { if (n) n.remove(); n = document.createElement('div'); n.className = 'sd-el sd-' + e.type; n.dataset.id = e.id; n.dataset.type = e.type; if (e.type === 'text') n.dir = 'rtl'; }
      n.style.zIndex = i + 1;
      styleEl(n, e);
      pg.appendChild(n);
    });
    measure();
    drawSel();
    pagesBar();
    save();
  }
  // גובה טקסט נקבע לפי התוכן
  function measure() {
    page().els.forEach(e => {
      if (e.type !== 'text') return;
      const n = pg.querySelector('.sd-el[data-id="' + e.id + '"]');
      if (n && n.offsetHeight) e.h = n.offsetHeight;
    });
  }
  function full() { fitScale(); render(); panel(); }

  // ---------- בחירה וידיות ----------
  function drawSel() {
    ui.innerHTML = '';
    const e = sel && elById(sel);
    if (!e) return;
    const box = document.createElement('div');
    box.className = 'sd-sel';
    box.style.cssText = 'left:' + e.x + 'px;top:' + e.y + 'px;width:' + e.w + 'px;height:' + e.h + 'px;transform:rotate(' + (e.rot || 0) + 'deg)';
    const hs = e.type === 'line' ? ['w', 'e'] : e.type === 'text' ? ['nw', 'ne', 'sw', 'se', 'w', 'e'] : ['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'];
    hs.forEach(h => { const d = document.createElement('div'); d.className = 'sd-h sd-h-' + h; d.dataset.h = h; box.appendChild(d); });
    const r = document.createElement('div'); r.className = 'sd-rot'; r.dataset.h = 'rot'; r.title = 'סיבוב'; box.appendChild(r);
    ui.appendChild(box);
  }
  function select(id) { sel = id; drawSel(); panel(); }

  // ---------- גרירה / שינוי גודל / סיבוב ----------
  let drag = null;
  function toPage(ev) { const r = pg.getBoundingClientRect(); return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale }; }
  const HD = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };
  function onDown(ev) {
    if (ev.button > 0) return;
    const h = ev.target.closest('.sd-h, .sd-rot');
    const elN = ev.target.closest('.sd-el');
    const p = toPage(ev);
    if (h && sel) {
      const e = elById(sel);
      drag = { mode: h.dataset.h === 'rot' ? 'rot' : 'size', h: h.dataset.h, e, o: clone(e), p0: p };
    } else if (elN) {
      if (elN.dataset.editing === '1') return;
      const e = elById(elN.dataset.id); if (!e) return;
      if (sel !== e.id) select(e.id);
      drag = { mode: 'move', e, o: clone(e), p0: p, moved: false };
    } else {
      if (sel) select(null);
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
    if (!drag) return;
    const p = toPage(ev), e = drag.e, o = drag.o;
    const dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
    if (!drag.snapped && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) { snap(); drag.snapped = true; }
    if (!drag.snapped) return;
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
      if (corner && (e.type === 'image' || e.type === 'text' || ev.shiftKey)) {
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
  function onUp() {
    if (!drag) return;
    const was = drag; drag = null;
    guides(false, false);
    if (was.snapped) { save(); panel(); }
  }
  pg.addEventListener('pointerdown', onDown);
  ui.addEventListener('pointerdown', onDown);
  vp.addEventListener('pointerdown', ev => { if (ev.target === vp || ev.target === holder) select(null); });
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

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
    else if (k === 'Escape') select(null);
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
  function placeImage(im, selectIt) {
    const k = Math.min(P.w * 0.7 / im.w, P.h * 0.6 / im.h);
    const e = center({ id: uid(), type: 'image', src: im.id, x: 0, y: 0, w: Math.round(im.w * k), h: Math.round(im.h * k), rot: 0, opacity: 1, fit: 'cover', radius: 0, stroke: null, sw: 0, f: {} });
    snap(); page().els.push(e); if (selectIt !== false) sel = e.id; render(); panel();
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
  const SIZE_WORDS = [[/סטורי|סטטוס|סטוריז|story/i, 1080, 1920], [/A4|א4|דף להדפסה|דף מודפס|עלון/i, 1240, 1754], [/מצגת|יוטיוב|רוחב|שקופית/i, 1920, 1080],
    [/כרטיס ביקור/i, 1050, 600], [/באנר|קאבר|cover/i, 1640, 624], [/ריבוע|אינסטגרם|פוסט/i, 1080, 1080]];
  function sizeFromText(t) { for (const [re, w, h] of SIZE_WORDS) if (re.test(t)) return { w, h }; return null; }
  function aiDoc() { return { w: P.w, h: P.h, bg: page().bg, els: page().els.map(e => { const c = clone(e); delete c.f; return c; }) }; }
  function aiImages() {
    const ids = new Set(P.lib.slice(0, 8).map(i => i.id));
    page().els.forEach(e => e.type === 'image' && ids.add(e.src)); if (page().bg.img) ids.add(page().bg.img);
    return [...ids].map(id => { const i = P.lib.find(x => x.id === id); return i ? { id, w: i.w, h: i.h, name: i.name } : null; }).filter(Boolean);
  }
  let aiBusy = false;
  async function runAI(mode) {
    const box = $('sd-ai-text'), t = box.value.trim();
    if (!t) { box.focus(); status('כתבו קודם מה לעצב 🙂'); return; }
    if (aiBusy) return; aiBusy = true;
    const btns = app.querySelectorAll('[data-ai]'); btns.forEach(b => b.disabled = true);
    let size = { w: P.w, h: P.h };
    if (mode === 'new') { const s = sizeFromText(t); if (s) size = s; }
    status(mode === 'new' ? 'מעצב בשבילכם… (בערך 10–30 שניות)' : 'משנה את העיצוב…', true);
    used('ai', { mode });
    let out = null, err = '';
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 90000);
      const r = await fetch(AI_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ prompt: t, mode, size, doc: mode === 'edit' ? aiDoc() : null, images: aiImages() }) });
      clearTimeout(tm);
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.doc) out = j; else err = j.error || '';
    } catch (e) { err = ''; }
    if (out) {
      applyAiDoc(out.doc);
      status('✓ ' + (out.note || 'מוכן. אפשר להמשיך לערוך: לגרור, לשנות טקסט וצבעים, או לכתוב לעוזר מה לשנות.'));
      $('sd-ai-mode-edit').hidden = false;
    } else if (mode === 'new') {
      applyAiDoc(localDesign(t, size), true);
      status((err ? err + ' ' : 'העוזר החכם לא זמין כרגע. ') + 'הכנתי עיצוב בסיסי לפי מה שכתבתם – אפשר לערוך אותו ידנית, או לנסות את העוזר שוב עוד מעט.');
    } else status(err || 'העוזר לא זמין כרגע. אפשר לשנות ידנית: לוחצים על מה שרוצים לשנות.');
    aiBusy = false; btns.forEach(b => b.disabled = false);
  }
  function applyAiDoc(d, local) {
    snap();
    const ids = new Set();
    d.els.forEach(e => { if (!e.id || ids.has(e.id)) e.id = uid(); ids.add(e.id); if (e.type === 'image') e.f = e.f || {}; });
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
    const FILL = /(^|\s)(ב?צבעי|בצבעים?|צבעוני|בסגנון|ו?(כחול|תכלת|זהב|זהוב|אדום|צהוב|ירוק|ורוד|סגול|כתום|שחור|כהה|קלף|בז'?|טורקיז|לבן)|פוסט|סטטוס|סטורי|מודעה|מודעת|הזמנה|עיצוב|תעצב|תכין|לי|כותרת|עדין|בולט|יפה|ברכת|ברכה|עם|תמונה|התמונה|רקע)(?=[\s,.:]|$)/g;
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
    if (e.type === 'image') {
      const f = e.f || {};
      return '<h3>תמונה</h3><div class="sd-row"><button type="button" data-set="fit" data-v="cover" class="' + (e.fit !== 'contain' ? 'on' : '') + '">ממלאת את המסגרת</button><button type="button" data-set="fit" data-v="contain" class="' + (e.fit === 'contain' ? 'on' : '') + '">כל התמונה</button><button type="button" data-set="flip" data-v="' + (!e.flip) + '">היפוך</button><button type="button" data-act="round">עיגול</button></div>' +
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
    if (tab === 'tpl') return '<h3>תבניות</h3><div class="sd-tpls">' + TEMPLATES.map((t, i) => '<button type="button" data-tpl="' + i + '"><span class="sd-mini" style="aspect-ratio:' + t.w + '/' + t.h + ';background:' + bgCss(t.bg) + '"></span>' + t.n + '</button>').join('') + '</div>' +
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
    if (tab === 'size') return '<h3>גודל העיצוב</h3><p class="sd-tip">עכשיו: ' + P.w + ' × ' + P.h + '. כשמשנים גודל, כל מה שבעיצוב מסתדר מחדש בערך באותו מקום.</p><div class="sd-sizes">' +
      SIZES.map(s => '<button type="button" data-size="' + s[0] + '"' + (s[2] === P.w && s[3] === P.h ? ' class="on"' : '') + '><i style="aspect-ratio:' + s[2] + '/' + s[3] + '"></i>' + s[1] + '<small>' + s[2] + '×' + s[3] + '</small></button>').join('') + '</div>' +
      '<label class="sd-lb">גודל אחר (פיקסלים)</label><div class="sd-row"><input type="number" id="sd-cw" min="200" max="4000" value="' + P.w + '" aria-label="רוחב"> × <input type="number" id="sd-ch" min="200" max="6000" value="' + P.h + '" aria-label="גובה"><button type="button" data-size="custom">לשנות</button></div>';
    if (tab === 'file') return '<h3>הפרויקט</h3><div class="sd-row"><button type="button" data-file="new">עיצוב חדש</button><button type="button" data-file="save">לשמור כקובץ</button><button type="button" data-file="open">לפתוח קובץ</button></div>' +
      '<p class="sd-tip">העיצוב נשמר לבד בדפדפן הזה. "לשמור כקובץ" – כדי להמשיך במחשב אחר או לשמור גרסה.</p>';
    return '';
  }
  function panel() {
    const e = sel && elById(sel);
    app.querySelectorAll('.sd-tabs [data-tab]').forEach(b => b.classList.toggle('on', !e && b.dataset.tab === tab));
    side.innerHTML = e ? '<button type="button" class="sd-back" data-back="1">→ חזרה</button>' + panelFor(e) : panelTab();
  }
  app.querySelector('.sd-tabs').addEventListener('click', ev => {
    const b = ev.target.closest('[data-tab]'); if (!b) return;
    tab = b.dataset.tab; sel = null; drawSel(); panel();
    if (tab === 'ai') $('sd-ai-text').focus();
  });
  function setKey(e, key, v) {
    if (key.indexOf('f.') === 0) { e.f = e.f || {}; e.f[key.slice(2)] = +v; return; }
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
    if (d.back) { select(null); return; }
    if (d.c != null) { const key = b.parentNode.dataset.key; snap(); setKey(e, key, d.c); render(); panel(); return; }
    if (d.font && e) { snap(); e.font = d.font; render(); panel(); return; }
    if (d.set && e) { snap(); const v = d.v; e[d.set] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; render(); panel(); return; }
    if (d.act) { if (d.act === 'round' && e) { snap(); e.radius = Math.round(Math.min(e.w, e.h) / 2); render(); panel(); } else if (d.act === 'caption' && e) { addText(TEXT_PRESETS[3][1], 'כיתוב על תמונה'); const c = elById(sel); c.w = Math.min(c.w, e.w - 20); c.x = Math.round(e.x + e.w / 2 - c.w / 2); c.y = Math.round(e.y + e.h - c.h - e.h * 0.06); render(); } else act(d.act); return; }
    if (d.ex) { $('sd-ai-text').value = d.ex; $('sd-ai-text').focus(); return; }
    if (d.tpl != null) { snap(); const t = TEMPLATES[+d.tpl]; P.w = t.w; P.h = t.h; P.pages[P.cur] = fromTemplate(t); sel = null; full(); used('template', { t: t.n }); return; }
    if (d.blank) { const s = SIZES.find(x => x[0] === d.blank); snap(); P.w = s[2]; P.h = s[3]; P.pages[P.cur] = { bg: { color: '#ffffff', grad: null, angle: 0, img: null, dim: 0 }, els: [] }; sel = null; full(); return; }
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
      const s = SIZES.find(x => x[0] === d.size); resize(s[2], s[3]); panel(); return;
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

  // ---------- התחלה ----------
  async function start() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.pages && s.pages.length) P = s; } catch (e) {}
    const first = !P;
    if (!P) P = newProject(TEMPLATES[0]);
    P.lib = P.lib || [];
    P.cur = Math.min(P.cur || 0, P.pages.length - 1);
    fitScale(); render(); panel(); updUndo();
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
