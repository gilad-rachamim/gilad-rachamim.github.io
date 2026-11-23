/* מקלדת עברית באנגלית (/kodesh/mikledet/en/): הקלדה פונטית, פריסה ישראלית, ניקוד ואותיות סופיות.
   הטקסט נשאר במכשיר (localStorage בלבד). הנתונים משותפים עם tools/mikledet_en.js שמצייר את המקשים בזמן הבנייה. */
(function (root) {
  'use strict';
  // פריסה ישראלית תקנית: קוד המקש הפיזי → אות
  var IL = [
    [['KeyQ', '/', 'Q'], ['KeyW', "'", 'W'], ['KeyE', 'ק', 'E'], ['KeyR', 'ר', 'R'], ['KeyT', 'א', 'T'], ['KeyY', 'ט', 'Y'], ['KeyU', 'ו', 'U'], ['KeyI', 'ן', 'I'], ['KeyO', 'ם', 'O'], ['KeyP', 'פ', 'P']],
    [['KeyA', 'ש', 'A'], ['KeyS', 'ד', 'S'], ['KeyD', 'ג', 'D'], ['KeyF', 'כ', 'F'], ['KeyG', 'ע', 'G'], ['KeyH', 'י', 'H'], ['KeyJ', 'ח', 'J'], ['KeyK', 'ל', 'K'], ['KeyL', 'ך', 'L'], ['Semicolon', 'ף', ';']],
    [['KeyZ', 'ז', 'Z'], ['KeyX', 'ס', 'X'], ['KeyC', 'ב', 'C'], ['KeyV', 'ה', 'V'], ['KeyB', 'נ', 'B'], ['KeyN', 'מ', 'N'], ['KeyM', 'צ', 'M'], ['Comma', 'ת', ','], ['Period', 'ץ', '.'], ['Slash', '.', '/']]
  ];
  // הקלדה פונטית: אות לטינית → אות עברית (Shift למקרים המיוחדים)
  var PH = { a: 'א', b: 'ב', g: 'ג', d: 'ד', h: 'ה', v: 'ו', w: 'ו', o: 'ו', u: 'ו', z: 'ז', x: 'ח', y: 'י', i: 'י', j: 'י', k: 'כ', c: 'כ', l: 'ל', m: 'מ', n: 'נ', s: 'ס', e: 'ע', f: 'פ', p: 'פ', q: 'ק', r: 'ר', t: 'ת',
    T: 'ט', S: 'ש', C: 'צ', K: 'ק', H: 'ח' };
  // צירופים: אות קודמת + האות שהוקלדה → אות אחת
  var DI = { 'סh': 'ש', 'כh': 'ח', 'תz': 'צ', 'תs': 'צ' };
  var NAMES = { 'א': 'Alef', 'ב': 'Bet', 'ג': 'Gimel', 'ד': 'Dalet', 'ה': 'Hei', 'ו': 'Vav', 'ז': 'Zayin', 'ח': 'Chet', 'ט': 'Tet', 'י': 'Yud', 'כ': 'Kaf', 'ך': 'Final Kaf', 'ל': 'Lamed', 'מ': 'Mem', 'ם': 'Final Mem', 'נ': 'Nun', 'ן': 'Final Nun', 'ס': 'Samech', 'ע': 'Ayin', 'פ': 'Pei', 'ף': 'Final Pei', 'צ': 'Tzadi', 'ץ': 'Final Tzadi', 'ק': 'Kuf', 'ר': 'Reish', 'ש': 'Shin', 'ת': 'Tav' };
  var NIKUD = [['ָ', 'Kamatz'], ['ַ', 'Patach'], ['ֵ', 'Tzere'], ['ֶ', 'Segol'], ['ִ', 'Chirik'], ['ֹ', 'Cholam'], ['ֻ', 'Kubutz'], ['ְ', 'Sheva'], ['ֲ', 'Chataf patach'], ['ֱ', 'Chataf segol'], ['ֳ', 'Chataf kamatz'], ['ּ', 'Dagesh'], ['ׁ', 'Shin dot'], ['ׂ', 'Sin dot']];
  var EXTRA = [['׳', 'Geresh'], ['״', 'Gershayim'], ['־', 'Maqaf (Hebrew hyphen)'], ['₪', 'Shekel sign']];
  var FIN = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' }, UNFIN = {};
  Object.keys(FIN).forEach(function (k) { UNFIN[FIN[k]] = k; });
  var HEBL = /[א-ת]/, MARK = /[֑-ׇ]/;

  // אותיות סופיות: בסוף מילה – סופית; באמצע מילה – רגילה. הניקוד לא שובר מילה.
  function finals(s) {
    var out = s.split('');
    for (var i = 0; i < out.length; i++) {
      var c = out[i], j = i + 1;
      if (!FIN[c] && !UNFIN[c]) continue;
      while (j < out.length && MARK.test(out[j])) j++;
      var endOfWord = j >= out.length || !HEBL.test(out[j]);
      if (endOfWord && FIN[c]) out[i] = FIN[c];
      else if (!endOfWord && UNFIN[c]) out[i] = UNFIN[c];
    }
    return out.join('');
  }
  function stripNikud(s) { return s.replace(/[֑-ׇ]/g, function (m) { return m === '־' ? m : ''; }); }

  var core = { IL: IL, PH: PH, DI: DI, NAMES: NAMES, NIKUD: NIKUD, EXTRA: EXTRA, finals: finals, stripNikud: stripNikud };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  var doc = root.document, t = doc.getElementById('mk-t');
  if (!t) return;
  var KEY = 'mikledet-en', st = { mode: 'ph', fin: true, size: 1.6 };
  try { var sv = JSON.parse(root.localStorage.getItem(KEY) || 'null'); if (sv) { st.mode = sv.mode || st.mode; st.fin = sv.fin !== false; st.size = sv.size || st.size; if (typeof sv.text === 'string') t.value = sv.text; } } catch (e) {}
  var ilByCode = {};
  IL.forEach(function (r) { r.forEach(function (k) { ilByCode[k[0]] = k[1]; }); });
  var usedOnce = false, lastC = -1; // lastC: מקום הסמן אחרי c, כי רק ch הוא ח (kh נשאר כה, כמו בחנוכה)
  function used(how) { if (!usedOnce && root.toolUsed) { usedOnce = true; root.toolUsed('mikledet_en', { how: how }); } }
  function save() { try { root.localStorage.setItem(KEY, JSON.stringify({ mode: st.mode, fin: st.fin, size: st.size, text: t.value.slice(0, 20000) })); } catch (e) {} }
  function count() {
    var n = doc.getElementById('mk-n'), s = t.value, l = (s.match(/[א-ת]/g) || []).length, w = (s.trim().match(/\S+/g) || []).length;
    if (n) n.textContent = l + ' Hebrew letters · ' + w + ' words';
  }
  // הכנסת טקסט במקום הסמן; execCommand שומר את ביטול הפעולה (Ctrl+Z)
  function ins(s, back) {
    t.focus();
    if (back) { var p = t.selectionStart; if (t.selectionStart === t.selectionEnd && p > 0) t.setSelectionRange(p - back, p); }
    var ok = false;
    try { ok = doc.execCommand('insertText', false, s); } catch (e) {}
    if (!ok) { t.setRangeText(s, t.selectionStart, t.selectionEnd, 'end'); }
    after();
  }
  function after() {
    if (st.fin && st.mode !== 'off') {
      var a = t.selectionStart, v = finals(t.value);
      if (v !== t.value) { t.value = v; t.setSelectionRange(a, a); }
    }
    count(); save(); used(st.mode);
  }
  t.addEventListener('keydown', function (e) {
    if (st.mode === 'off' || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    var ch = null, back = 0;
    if (st.mode === 'il') ch = ilByCode[e.code] || null;
    else if (e.key && e.key.length === 1) {
      var prev = t.selectionStart === t.selectionEnd ? t.value.charAt(t.selectionStart - 1) : '';
      var lower = e.key.toLowerCase();
      var unf = UNFIN[prev] || prev;
      var cOk = unf !== 'כ' || lastC === t.selectionStart;
      if (DI[unf + lower] && cOk && /[a-z]/i.test(e.key) && !e.shiftKey) { ch = DI[unf + lower]; back = 1; }
      else ch = PH[e.key] || (e.shiftKey ? PH[lower] : null) || null;
    }
    if (ch) { e.preventDefault(); ins(ch, back); lastC = e.key === 'c' ? t.selectionStart : -1; }
  });
  t.addEventListener('input', function () { if (st.mode === 'off' && st.fin) { var a = t.selectionStart, v = finals(t.value); if (v !== t.value) { t.value = v; t.setSelectionRange(a, a); } } count(); save(); });

  // מקלדת על המסך: mousedown עם preventDefault כדי שהסמן לא יאבד
  doc.querySelectorAll('[data-k]').forEach(function (b) {
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-k');
      if (k === 'BS') {
        t.focus();
        var ok = false; try { ok = doc.execCommand('delete'); } catch (e) {}
        if (!ok) { var p = t.selectionStart; if (t.selectionStart !== t.selectionEnd) t.setRangeText('', t.selectionStart, t.selectionEnd, 'end'); else if (p > 0) t.setRangeText('', p - 1, p, 'end'); }
        after();
      } else ins(k === 'SP' ? ' ' : k === 'NL' ? '\n' : k);
    });
  });

  function setMode(m) {
    st.mode = m;
    doc.querySelectorAll('#mk-mode [data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === m)); });
    var h = doc.getElementById('mk-hint');
    if (h) h.textContent = m === 'ph' ? 'Type the sounds in English letters, mostly without vowels: sh-l-o-m gives שלום. Use sh for ש, ch for ח, tz for צ.'
      : m === 'il' ? 'Your keyboard now types like an Israeli keyboard: the key T is א, A is ש, C is ב. The letters are shown on the keys below.'
      : 'Typing is not changed. Use the keys below, or your own Hebrew keyboard.';
    save();
  }
  doc.querySelectorAll('#mk-mode [data-m]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-m')); t.focus(); }); });
  var fin = doc.getElementById('mk-fin');
  if (fin) { fin.checked = st.fin; fin.addEventListener('change', function () { st.fin = fin.checked; if (st.fin) after(); save(); }); }

  // בטלפון: המקלדת של המכשיר מסתירה את המקשים שלנו, אז כברירת מחדל לא פותחים אותה
  var phone = root.matchMedia && root.matchMedia('(pointer: coarse)').matches, own = doc.getElementById('mk-own');
  function setOwn(on) { t.setAttribute('inputmode', on ? 'text' : 'none'); if (own) own.setAttribute('aria-pressed', String(on)); }
  if (phone) { setOwn(false); if (own) own.hidden = false; }
  if (own) own.addEventListener('click', function () { var on = t.getAttribute('inputmode') === 'none'; setOwn(on); t.blur(); t.focus(); });

  function size(d) { st.size = Math.max(1, Math.min(3.2, Math.round((st.size + d) * 10) / 10)); t.style.fontSize = st.size + 'rem'; save(); }
  size(0);
  var act = {
    copy: function (b) {
      var s = t.value; if (!s) return;
      var done = function () { var o = b.textContent; b.textContent = 'Copied ✓'; setTimeout(function () { b.textContent = o; }, 1600); };
      if (root.navigator.clipboard) root.navigator.clipboard.writeText(s).then(done, function () { t.select(); doc.execCommand('copy'); done(); });
      else { t.select(); doc.execCommand('copy'); done(); }
      used('copy');
    },
    clear: function () { if (!t.value || root.confirm('Clear all the text?')) { t.value = ''; count(); save(); t.focus(); } },
    nonikud: function () { t.value = stripNikud(t.value); count(); save(); },
    big: function () { size(0.2); }, small: function () { size(-0.2); },
    google: function () { root.open('https://www.google.com/search?q=' + encodeURIComponent(t.value.trim()), '_blank', 'noopener'); used('google'); },
    translate: function () { root.open('https://translate.google.com/?sl=iw&tl=en&op=translate&text=' + encodeURIComponent(t.value.trim()), '_blank', 'noopener'); used('translate'); },
    wa: function () { root.open('https://wa.me/?text=' + encodeURIComponent(t.value), '_blank', 'noopener'); used('wa'); },
    mail: function () { root.location.href = 'mailto:?body=' + encodeURIComponent(t.value); used('mail'); }
  };
  doc.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function () { act[b.getAttribute('data-act')](b); }); });
  setMode(st.mode); count();
})(typeof window !== 'undefined' ? window : this);
