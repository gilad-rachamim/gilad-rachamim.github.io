// עורך הודעות לווטסאפ: עוטף בחירה בסימני העיצוב של ווטסאפ (*מודגש* _נטוי_ ~חוצה~ ```קוד```), רשימות וציטוט,
// ותצוגה מקדימה. הטיוטה נשמרת בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ta = $('we-text');
  if (!ta) return;
  var KEY = 'kelim-wa-editor';
  var EMO = ['🙂', '😊', '🙏', '❤️', '👍', '🎉', '✅', '📌', '📅', '⏰', '📍', '🕯️', '✡️', '🔥', '⭐', '👇', '➡️', '❗'];
  try { ta.value = localStorage.getItem(KEY) || ''; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, ta.value); } catch (e) {} }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  $('we-emo').innerHTML = EMO.map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join('');
  function render(t) {
    var h = esc(t);
    h = h.replace(/```([\s\S]+?)```/g, '<code>$1</code>');
    h = h.replace(/(^|[\s(])\*(\S(?:[^*\n]*\S)?)\*(?=$|[\s).,!?:])/gm, '$1<b>$2</b>');
    h = h.replace(/(^|[\s(])_(\S(?:[^_\n]*\S)?)_(?=$|[\s).,!?:])/gm, '$1<i>$2</i>');
    h = h.replace(/(^|[\s(])~(\S(?:[^~\n]*\S)?)~(?=$|[\s).,!?:])/gm, '$1<s>$2</s>');
    h = h.replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>');
    return h;
  }
  function draw() {
    var t = ta.value;
    var d = new Date();
    $('we-prev').innerHTML = (t.trim() ? render(t) : '<span style="opacity:.85">ההודעה תופיע כאן</span>') + '<span class="tm">' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ✓✓</span>';
    $('we-cnt').textContent = t.length + ' תווים';
    $('we-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(t);
  }
  function setSel(text, s, e) { ta.setRangeText(text, s, e, 'end'); ta.focus(); save(); draw(); }
  // עטיפה: ווטסאפ דורש שהסימן ייצמד למילה, לכן מוציאים רווחים מהקצוות אל מחוץ לסימנים
  function wrap(m) {
    var s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
    if (!sel) { ta.setRangeText(m + m, s, e, 'end'); ta.selectionStart = ta.selectionEnd = s + m.length; ta.focus(); return; }
    var lead = sel.match(/^\s*/)[0], trail = sel.match(/\s*$/)[0], core = sel.trim();
    if (m !== '```') core = core.split('\n').map(function (l) { return l.trim() ? m + l.trim() + m : l; }).join('\n');
    else core = m + core + m;
    setSel(lead + core + trail, s, e);
  }
  // רשימה / מספור / ציטוט על כל השורות שבבחירה
  function lines(kind) {
    var v = ta.value, s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1, e = v.indexOf('\n', ta.selectionEnd); if (e < 0) e = v.length;
    var n = 0, out = v.slice(s, e).split('\n').map(function (l) {
      if (!l.trim()) return l;
      l = l.replace(/^(• |\d+\. |> )/, '');
      n++; return (kind === '1' ? n + '. ' : kind) + l;
    }).join('\n');
    setSel(out, s, e);
  }
  document.querySelector('.we-bar').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-w')) wrap(b.getAttribute('data-w')); else lines(b.getAttribute('data-l'));
  });
  $('we-emo').addEventListener('click', function (e) { var b = e.target.closest('[data-e]'); if (b) setSel(b.getAttribute('data-e'), ta.selectionStart, ta.selectionEnd); });
  ta.addEventListener('input', function () { save(); draw(); });
  $('we-wa').addEventListener('click', function () { if (window.toolUsed) window.toolUsed('wa_editor', { how: 'wa', len: ta.value.length }); });
  $('we-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); }).catch(function () { ta.select(); });
    if (window.toolUsed) window.toolUsed('wa_editor', { how: 'copy' });
  });
  $('we-clear').addEventListener('click', function () { if (!ta.value || confirm('למחוק את ההודעה?')) { ta.value = ''; save(); draw(); } });
  draw();
})();
