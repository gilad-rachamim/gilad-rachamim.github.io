// ספריית הסקילים: כרטיסים, חיפוש, העתקה, הורדת SKILL.md והורדת זיפ ל-claude.ai.
(function () {
  var C = window.CLAUDE, S = window.CLAUDE_SKILLS || [], TOOL = 'claude_skilim';
  var list = document.getElementById('sk-list'), q = document.getElementById('sk-q'), cnt = document.getElementById('sk-count');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    var t = (q.value || '').trim().toLowerCase(), n = 0;
    list.innerHTML = S.map(function (s, i) {
      if (t && (s.title + s.desc + s.when + s.id).toLowerCase().indexOf(t) < 0) return '';
      n++;
      return '<article class="sk-card" id="sk-' + esc(s.id) + '"><h3>' + esc(s.title) + '</h3><p>' + esc(s.desc) + '</p>' +
        '<p class="sk-when"><b>מופעל:</b> ' + esc(s.when) + '</p>' +
        '<div class="sk-btns"><button class="btn btn-gold btn-sm" type="button" data-a="copy" data-i="' + i + '">להעתיק SKILL.md</button>' +
        '<button class="btn btn-line btn-sm" type="button" data-a="md" data-i="' + i + '">להוריד SKILL.md</button>' +
        '<button class="btn btn-line btn-sm" type="button" data-a="zip" data-i="' + i + '">zip ל-claude.ai</button></div>' +
        '<details><summary>לראות את הסקיל</summary><pre class="sk-pre" dir="auto">' + esc(s.md) + '</pre></details></article>';
    }).join('') || '<p class="note">לא נמצא סקיל כזה. נסו מילה אחרת, או <a class="gold" href="/kelim/claude/mecholel/">צרו סקיל משלכם</a>.</p>';
    cnt.textContent = n + ' מתוך ' + S.length;
  }
  list.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]'); if (!b) return;
    var s = S[+b.getAttribute('data-i')], a = b.getAttribute('data-a');
    if (a === 'copy') { C.copy(s.md, b); C.used(TOOL, 'copy'); }
    if (a === 'md') { C.download('SKILL.md', s.md); C.used(TOOL, 'download_md'); }
    if (a === 'zip') { C.download(s.id + '.zip', C.zip([{ name: s.id + '/SKILL.md', text: s.md }])); C.used(TOOL, 'download_zip'); }
  });
  q.addEventListener('input', render);
  var all = document.getElementById('sk-all');
  if (all) all.addEventListener('click', function () {
    C.download('skills-hebrew.zip', C.zip(S.map(function (s) { return { name: s.id + '/SKILL.md', text: s.md }; })), 'application/zip'); C.used(TOOL, 'download_all');
  });
  render();
})();
