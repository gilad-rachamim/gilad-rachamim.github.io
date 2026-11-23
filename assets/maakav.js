// מעקב אחרי הברית – הכול נשמר בטלפון של ההורה (localStorage), בלי שרת ובלי התראות.
(function () {
  var KEY = 'mohel-maakav';
  var H = 3600000;
  var NAMES = { urine: 'שתן', fed: 'אכל', oil: 'שמן על התחבושת', novimol: 'נובימול', bath: 'שטיפה' };
  var st = { t0: 0, ev: [] };
  try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.t0) st = s; } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toLocalInput(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function hm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function dm(ms) { var d = new Date(ms); return d.getDate() + '.' + (d.getMonth() + 1); }
  function stamp(ms) { return dm(ms) === dm(Date.now()) ? hm(ms) : dm(ms) + ' ' + hm(ms); }
  function dur(ms) {
    var m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60);
    return h ? h + ' שעות ו-' + (m % 60) + ' דקות' : m + ' דקות';
  }
  function last(k) { var t = 0; st.ev.forEach(function (e) { if (e.k === k && e.t > t) t = e.t; }); return t; }
  function wa(text) { return 'https://wa.me/972584049049?text=' + encodeURIComponent(text); }
  function open(text) {
    var w = window.open(wa(text), '_blank');
    if (w) w.opener = null; else location.href = wa(text);
  }

  function render() {
    var has = !!st.t0;
    $('mk-start').hidden = has;
    $('mk-main').hidden = !has;
    if (!has) return;
    var now = Date.now(), el = now - st.t0;
    $('mk-clock').textContent = el < 0 ? 'הברית עוד לא התחילה' : 'עברו ' + dur(el);
    $('mk-since').textContent = 'הברית: ' + stamp(st.t0);

    var bath = $('mk-bath');
    if (el < 24 * H) bath.innerHTML = 'שטפתי מסביב<small>בלי להרטיב את התחבושת</small>';
    else bath.innerHTML = 'אמבטיה<small>אחרי הורדת התחבושת</small>';

    var box = $('mk-alerts'); box.innerHTML = '';
    function add(cls, text, btn) {
      var d = document.createElement('div'); d.className = cls;
      var p = document.createElement('div'); p.textContent = text; d.appendChild(p);
      if (btn) d.appendChild(btn);
      box.appendChild(d);
    }
    if (el >= 0 && el < 48 * H) {
      var lu = last('urine'), sinceU = now - (lu || st.t0);
      if (sinceU >= 8 * H) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-gold btn-block';
        b.innerHTML = 'לכתוב לגילעד (ווטסאפ)';
        b.addEventListener('click', function () {
          open('שלום גילעד, הברית הייתה ב-' + stamp(st.t0) + (lu ? ', השתן האחרון היה ב-' + stamp(lu) : ', ועוד לא ראינו שתן') + '. עברו ' + dur(now - (lu || st.t0)) + ' בלי שתן. מה לעשות?');
        });
        add('mk-alert strong', 'עברו ' + dur(sinceU) + ' בלי שתן. כתבו לי עכשיו, ואחזור אליכם.', b);
      } else if (sinceU >= 6 * H) {
        add('mk-alert', 'עברו ' + dur(sinceU) + ' בלי שתן. כדאי לבדוק טיטול.');
      }
      var lf = last('fed'), sinceF = now - (lf || st.t0);
      if (sinceF >= 4 * H) add('mk-info', 'עברו ' + dur(sinceF) + ' מההאכלה האחרונה. אם הוא ישן, אפשר להעיר בעדינות לאכול.');
    }
    if (new Date(st.t0).getDay() === 5 && el < 48 * H) add('mk-info', 'הברית ביום שישי: לפני כניסת שבת כדאי לוודא שהיה שתן.');

    var log = $('mk-log'); log.innerHTML = '';
    if (!st.ev.length) { var li0 = document.createElement('li'); li0.textContent = 'עוד לא סומן כלום.'; log.appendChild(li0); }
    st.ev.slice().sort(function (a, b) { return b.t - a.t; }).forEach(function (e) {
      var li = document.createElement('li');
      var sp = document.createElement('span'); sp.textContent = stamp(e.t) + ' – ' + NAMES[e.k];
      var rm = document.createElement('button'); rm.type = 'button'; rm.textContent = 'ביטול';
      rm.addEventListener('click', function () { st.ev = st.ev.filter(function (x) { return x !== e; }); save(); render(); });
      li.appendChild(sp); li.appendChild(rm); log.appendChild(li);
    });
  }

  var inp = $('mk-when');
  inp.value = toLocalInput(Date.now());
  $('mk-go').addEventListener('click', function () {
    var t = new Date(inp.value).getTime();
    st.t0 = isFinite(t) ? t : Date.now(); st.ev = st.ev.filter(function () { return true; }); save(); render();
  });
  document.querySelectorAll('[data-k]').forEach(function (b) {
    b.addEventListener('click', function () { st.ev.push({ k: b.getAttribute('data-k'), t: Date.now() }); save(); render(); });
  });
  $('mk-edit').addEventListener('click', function () { inp.value = toLocalInput(st.t0); st.t0 = 0; $('mk-start').hidden = false; $('mk-main').hidden = true; });
  $('mk-reset').addEventListener('click', function () { st = { t0: 0, ev: [] }; save(); inp.value = toLocalInput(Date.now()); render(); });
  $('mk-send').addEventListener('click', function () {
    var lines = ['שלום גילעד 🙂 סיכום המעקב אחרי הברית.', 'הברית הייתה ב-' + stamp(st.t0) + '.'];
    ['urine', 'fed', 'oil', 'novimol', 'bath'].forEach(function (k) {
      var t = st.ev.filter(function (e) { return e.k === k; }).sort(function (a, b) { return a.t - b.t; }).map(function (e) { return stamp(e.t); });
      if (t.length) lines.push(NAMES[k] + ' (' + t.length + '): ' + t.join(', '));
    });
    var b = this;
    b.setAttribute('data-ready', st.ev.length ? '1' : '0');
    b.setAttribute('data-count', String(st.ev.length));
    open(lines.join('\n'));
  });
  render();
  setInterval(render, 30000);
})();
