// ממיר בסיסים וביטים: עשרוני / בינארי / הקסה / אוקטלי, משלים ל-2 לפי רוחב, ופירוק float לפי IEEE-754. עם BigInt.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_bits', $ = function (id) { return document.getElementById(id); };
  var st = T.load(KEY, { v: '-42', base: '10', w: '8', f: '0.1' });
  var RX = { 10: /^-?\d+$/, 2: /^-?[01]+$/, 16: /^-?[0-9a-f]+$/i, 8: /^-?[0-7]+$/ };
  function parse(v, b) {
    v = v.replace(/[\s_]/g, '').replace(/^(-?)0[xbo]/i, '$1');
    if (!RX[b].test(v)) return null;
    var neg = v[0] === '-'; if (neg) v = v.slice(1);
    var p = { 10: '', 2: '0b', 16: '0x', 8: '0o' }[b], n = BigInt(p + v);
    return neg ? -n : n;
  }
  function group(s, k) { var out = []; for (var i = s.length; i > 0; i -= k) out.unshift(s.slice(Math.max(0, i - k), i)); return out.join(' '); }
  function ints() {
    var n = parse(st.v, +st.base), w = BigInt(st.w), box = $('bt-out');
    if (n === null) { box.innerHTML = '<p class="note bad">המספר לא מתאים לבסיס ' + st.base + '.</p>'; return; }
    var mod = 1n << w, min = -(1n << (w - 1n)), maxS = (1n << (w - 1n)) - 1n, maxU = mod - 1n;
    var bits = ((n % mod) + mod) % mod; // הייצוג בזיכרון (משלים ל-2)
    var b = bits.toString(2).padStart(Number(w), '0');
    var signed = bits > maxS ? bits - mod : bits;
    var warn = n < min || n > maxU ? '⚠️ ' + n + ' לא נכנס ב-' + st.w + ' ביט – זה מה שיישאר אחרי גלישה (overflow).' : (n < 0 ? 'מספר שלילי נשמר כמשלים ל-2: הופכים את כל הביטים ומוסיפים 1.' : '');
    box.innerHTML =
      '<div class="bt-bits" dir="ltr">' + b.split('').map(function (c, i) { return '<i class="' + (i === 0 ? 'sg ' : '') + (c === '1' ? 'on' : '') + '" title="ביט ' + (Number(w) - 1 - i) + '">' + c + '</i>'; }).join('') + '</div>' +
      '<p class="note">הביט השמאלי (בצבע) הוא ביט הסימן כשהמספר עם סימן.</p>' +
      row('עשרוני', n.toString()) + row('בינארי', '0b' + group(b, 4)) + row('הקסה', '0x' + group(bits.toString(16).toUpperCase().padStart(Number(w) / 4, '0'), 2)) +
      row('אוקטלי', '0o' + bits.toString(8)) + row('כ-unsigned', bits.toString()) + row('כ-signed', signed.toString()) +
      row('הטווח ב-' + st.w + ' ביט', 'signed: ' + min + ' … ' + maxS + '   unsigned: 0 … ' + maxU) +
      (warn ? '<p class="bt-warn">' + warn + '</p>' : '');
  }
  function row(k, v) { return '<div class="bt-row"><span>' + k + '</span><code dir="ltr">' + v + '</code></div>'; }
  function flt() {
    var x = parseFloat(st.f), box = $('bt-fout');
    if (!isFinite(x) && !/^-?(inf|nan)/i.test(st.f)) { box.innerHTML = '<p class="note bad">הקלידו מספר, למשל 0.1 או -6.25</p>'; return; }
    var dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, x);
    var u = dv.getUint32(0), b = u.toString(2).padStart(32, '0'), s = b[0], e = b.slice(1, 9), m = b.slice(9);
    var ev = parseInt(e, 2), stored = dv.getFloat32(0);
    var kind = ev === 0 ? (parseInt(m, 2) ? 'denormal (קרוב מאוד ל-0)' : 'אפס') : ev === 255 ? (parseInt(m, 2) ? 'NaN' : 'אינסוף') : 'רגיל';
    box.innerHTML = '<div class="bt-bits fl" dir="ltr"><i class="s">' + s + '</i>' + e.split('').map(function (c) { return '<i class="e">' + c + '</i>'; }).join('') +
      m.split('').map(function (c) { return '<i class="m">' + c + '</i>'; }).join('') + '</div>' +
      '<p class="bt-leg"><span class="s">סימן</span> <span class="e">מעריך (8)</span> <span class="m">שבר (23)</span></p>' +
      row('סימן', s === '1' ? '1 (שלילי)' : '0 (חיובי)') + row('מעריך', e + ' = ' + ev + (kind === 'רגיל' ? ' → 2^' + (ev - 127) : '')) +
      row('סוג', kind) + row('הקסה', '0x' + u.toString(16).toUpperCase().padStart(8, '0')) +
      row('מה באמת נשמר', stored.toPrecision(12).replace(/0+$/, '').replace(/\.$/, '')) +
      (stored !== x ? '<p class="bt-warn">ב-float אי אפשר לשמור את ' + st.f + ' בדיוק – נשמר הכי קרוב. זו הסיבה ש-0.1 + 0.2 != 0.3.</p>' : '');
  }
  function fill() { $('bt-v').value = st.v; $('bt-base').value = st.base; $('bt-w').value = st.w; $('bt-f').value = st.f; }
  function read() { st.v = $('bt-v').value.trim(); st.base = $('bt-base').value; st.w = $('bt-w').value; st.f = $('bt-f').value.trim(); }
  function all() { ints(); flt(); T.save(KEY, st); }
  fill(); all();
  $('bt-form').addEventListener('input', function () { read(); all(); });
  $('bt-form').addEventListener('change', function () { T.used('tichnut_bits', 'add'); });
  $('bt-form').addEventListener('submit', function (e) { e.preventDefault(); });
})();
