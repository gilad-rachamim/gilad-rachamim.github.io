// מסלול "קלוד קוד למתחילים": רשימת וי שנשמרת במכשיר, בורר מערכת הפעלה וכפתורי העתקה.
(function () {
  var C = window.CLAUDE, TOOL = 'claude_maslul', KEY = 'claude_maslul';
  var st = C.load(KEY, { os: /Mac/i.test(navigator.platform) ? 'mac' : /Linux/i.test(navigator.platform) ? 'linux' : 'win', done: {} });
  var CMD = {
    win: 'irm https://claude.ai/install.ps1 | iex',
    mac: 'curl -fsSL https://claude.ai/install.sh | bash',
    linux: 'curl -fsSL https://claude.ai/install.sh | bash'
  };
  var NAME = { win: 'Windows (PowerShell)', mac: 'Mac (מסוף)', linux: 'Linux או WSL' };
  function mark() {
    var boxes = document.querySelectorAll('.ms-step input[type=checkbox]'), n = 0;
    boxes.forEach(function (b) { var on = !!st.done[b.id]; b.checked = on; if (on) n++; b.closest('.ms-step').classList.toggle('ok', on); });
    document.getElementById('ms-prog').textContent = n + ' מתוך ' + boxes.length + ' שלבים';
    document.getElementById('ms-bar').style.width = Math.round(100 * n / boxes.length) + '%';
  }
  function os() {
    document.querySelectorAll('.ms-os').forEach(function (b) { var on = b.getAttribute('data-os') === st.os; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.getElementById('ms-cmd').textContent = CMD[st.os];
    document.getElementById('ms-osname').textContent = NAME[st.os];
    document.getElementById('ms-winnote').hidden = st.os !== 'win';
  }
  document.querySelectorAll('.ms-step input[type=checkbox]').forEach(function (b) {
    b.addEventListener('change', function () { st.done[b.id] = b.checked; C.save(KEY, st); mark(); C.used(TOOL, 'check'); });
  });
  document.querySelectorAll('.ms-os').forEach(function (b) { b.addEventListener('click', function () { st.os = b.getAttribute('data-os'); C.save(KEY, st); os(); C.used(TOOL, 'os_' + st.os); }); });
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy') === 'install' ? CMD[st.os] : b.getAttribute('data-copy');
      C.copy(t, b); C.used(TOOL, 'copy');
    });
  });
  var r = document.getElementById('ms-reset');
  if (r) r.addEventListener('click', function () { st.done = {}; C.save(KEY, st); mark(); });
  C.wa(document.getElementById('ms-wa'), 'מדריך קלוד קוד למתחילים בעברית, עם התקנה צעד אחר צעד. בחינם:\nhttps://hakelim.com/kelim/claude/kod-lamatchilim/');
  document.getElementById('ms-wa').addEventListener('click', function () { C.used(TOOL, 'wa'); });
  os(); mark();
})();
