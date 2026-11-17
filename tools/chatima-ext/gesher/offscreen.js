// גשר – דף רקע שקוף שרק מעתיק את הקוד ללוח (service worker לא יכול לכתוב ללוח בעצמו).
chrome.runtime.onMessage.addListener(function (m) {
  if (!m || m.t !== 'gesher-copy') return;
  var t = document.getElementById('t');
  t.value = String(m.text || '');
  t.select();
  document.execCommand('copy');
  t.value = '';
  setTimeout(function () { window.close(); }, 500);
});
