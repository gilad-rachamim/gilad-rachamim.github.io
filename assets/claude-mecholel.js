// מחולל SKILL.md ו-CLAUDE.md: טופס בעברית, תוצאה חיה, העתקה והורדה. הכול בדפדפן.
(function () {
  var C = window.CLAUDE, TOOL = 'claude_mecholel', $ = function (id) { return document.getElementById(id); };
  var KEY = 'claude_mecholel', st = C.load(KEY, null);
  var EX = {
    mode: 'skill', name: 'סיכום-פגישה', desc: 'מסכם פגישה לנקודות, החלטות ומשימות', trig: 'תסכם פגישה, סיכום פגישה, מה הוחלט',
    steps: 'לקרוא את התמלול או ההערות עד הסוף\nלכתוב משפט אחד על נושא הפגישה\nלרשום החלטות ומשימות עם שם אחראי ותאריך\nלשאול אם משהו לא ברור לפני שמשלימים מידע',
    no: 'לא להמציא החלטות שלא נאמרו\nלא לכתוב יותר מחצי עמוד',
    proj: 'אתר חנות קטן', lang: 'עברית', cmds: 'npm run dev\nnpm test', rules: 'לשמור שינויים קטנים\nלהסביר בעברית פשוטה', avoid: 'לא למחוק קבצים בלי לשאול\nלא לגעת בקובצי env'
  };
  if (!st) st = EX;
  var F = ['name', 'desc', 'trig', 'steps', 'no', 'proj', 'lang', 'cmds', 'rules', 'avoid'];
  function lines(s) { return (s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function slug(s) {
    var m = (s || '').toLowerCase().replace(/[^a-z0-9֐-׿\s-]/g, '').trim().replace(/\s+/g, '-');
    return m || 'my-skill';
  }
  function skill() {
    var n = slug(st.name), L = [];
    var d = (st.desc || '').trim().replace(/"/g, "'").replace(/\n/g, ' ');
    var t = lines(st.trig.replace(/,/g, '\n')).map(function (x) { return "'" + x.replace(/'/g, '') + "'"; }).join(', ');
    L.push('---', 'name: ' + n, 'description: "' + d + (t ? ". TRIGGER on Hebrew: " + t + '.' : '') + '"', '---', '');
    L.push('# ' + (st.name || n), '', '## מתי להפעיל', st.when || (t ? 'כשהמשתמש אומר: ' + t.replace(/'/g, '') : 'כשמבקשים את זה.'), '');
    var s = lines(st.steps); if (s.length) { L.push('## שלבים'); s.forEach(function (x, i) { L.push((i + 1) + '. ' + x); }); L.push(''); }
    var no = lines(st.no); if (no.length) { L.push('## מה אסור'); no.forEach(function (x) { L.push('- ' + x); }); L.push(''); }
    return L.join('\n');
  }
  function claudemd() {
    var L = ['# ' + (st.proj || 'הפרויקט'), '', '## שפה', 'לדבר איתי ב' + (st.lang || 'עברית') + ', קצר ופשוט.', ''];
    var c = lines(st.cmds); if (c.length) { L.push('## פקודות חשובות'); c.forEach(function (x) { L.push('- `' + x + '`'); }); L.push(''); }
    var r = lines(st.rules); if (r.length) { L.push('## כללי עבודה'); r.forEach(function (x) { L.push('- ' + x); }); L.push(''); }
    var a = lines(st.avoid); if (a.length) { L.push('## מה אסור'); a.forEach(function (x) { L.push('- ' + x); }); L.push(''); }
    return L.join('\n');
  }
  function out() { return st.mode === 'skill' ? skill() : claudemd(); }
  function paint() {
    document.querySelectorAll('.mc-tab').forEach(function (b) { var on = b.getAttribute('data-m') === st.mode; b.setAttribute('aria-selected', on); b.classList.toggle('on', on); });
    $('mc-skill').hidden = st.mode !== 'skill'; $('mc-md').hidden = st.mode !== 'md';
    $('mc-out').textContent = out();
    $('mc-file').textContent = st.mode === 'skill' ? 'SKILL.md' : 'CLAUDE.md';
    $('mc-where').textContent = st.mode === 'skill'
      ? 'שומרים בתיקייה בשם הסקיל: ‎~/.claude/skills/' + slug(st.name) + '/SKILL.md ‎(לכל הפרויקטים) או ‎.claude/skills/' + slug(st.name) + '/SKILL.md ‎(לפרויקט אחד). ב-claude.ai: מעלים זיפ בהגדרות.'
      : 'שומרים בשורש הפרויקט בשם CLAUDE.md. קלוד קוד קורא אותו בתחילת כל שיחה בתיקייה.';
    $('mc-zip').hidden = st.mode !== 'skill';
    C.wa($('mc-wa'), (st.mode === 'skill' ? 'מחולל סקיל לקלוד בעברית, בחינם:' : 'מחולל CLAUDE.md בעברית, בחינם:') + '\nhttps://hakelim.com/kelim/claude/mecholel/');
    C.save(KEY, st);
  }
  F.forEach(function (f) {
    var el = $('mc-' + f); if (!el) return; el.value = st[f] || '';
    el.addEventListener('input', function () { st[f] = el.value; paint(); });
  });
  document.querySelectorAll('.mc-tab').forEach(function (b) { b.addEventListener('click', function () { st.mode = b.getAttribute('data-m'); paint(); C.used(TOOL, 'tab_' + st.mode); }); });
  $('mc-copy').addEventListener('click', function () { C.copy(out(), $('mc-copy')); C.used(TOOL, 'copy_' + st.mode); });
  $('mc-dl').addEventListener('click', function () { C.download(st.mode === 'skill' ? 'SKILL.md' : 'CLAUDE.md', out()); C.used(TOOL, 'download_' + st.mode); });
  $('mc-zip').addEventListener('click', function () { var n = slug(st.name); C.download(n + '.zip', C.zip([{ name: n + '/SKILL.md', text: skill() }]), 'application/zip'); C.used(TOOL, 'zip'); });
  $('mc-reset').addEventListener('click', function () { st = JSON.parse(JSON.stringify(EX)); F.forEach(function (f) { var el = $('mc-' + f); if (el) el.value = st[f]; }); paint(); });
  $('mc-wa').addEventListener('click', function () { C.used(TOOL, 'wa'); });
  paint();
})();
