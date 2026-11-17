// גשר – דף רקע שקוף ללוח (service worker לא יכול לגעת בלוח בעצמו).
// 1. gesher-copy: כותב טקסט ללוח (קוד אימות / טקסט שהגיע מהטלפון).
// 2. gesher-clip-watch: כשהמתג "העתקות מהמחשב לטלפון" דלוק – בודק את הלוח כל שנייה,
//    ורק כשהוא השתנה שולח את הטקסט החדש ל-service worker. שום דבר לא נשמר ולא נכתב ללוג.
var watching = false, last = null, timer = null, closeT = null;
var t = document.getElementById('t');

function readClip() {
  t.value = '';
  t.focus();
  document.execCommand('paste');
  var v = t.value;
  t.value = '';
  return v;
}

function tick() {
  var v;
  try { v = readClip(); } catch (e) { return; }
  if (last === null) { last = v; return; }        // מה שהיה בלוח לפני שהדלקנו – לא שולחים
  if (v === last || !v) return;
  last = v;
  chrome.runtime.sendMessage({ t: 'gesher-clip-local', text: v }).catch(function () {});
}

chrome.runtime.onMessage.addListener(function (m) {
  if (!m) return;
  if (m.t === 'gesher-copy') {
    var s = String(m.text || '');
    t.value = s;
    t.select();
    document.execCommand('copy');
    t.value = '';
    last = s;                                     // מה שכתבנו בעצמנו לא חוזר לטלפון
    clearTimeout(closeT);
    if (!watching) closeT = setTimeout(function () { window.close(); }, 500);
    return;
  }
  if (m.t === 'gesher-clip-watch') {
    clearTimeout(closeT);
    var was = watching;
    watching = !!m.on;
    if (watching && was) return;
    clearInterval(timer);
    if (watching) { last = null; tick(); timer = setInterval(tick, 1000); }
    else closeT = setTimeout(function () { window.close(); }, 500);
  }
});
