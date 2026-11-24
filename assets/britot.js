// יומן הבריתות שלי – כלי קודש למוהלים. הכול נשמר בטלפון (localStorage), שום פרט לא נשלח לשרת.
// בקשה של יעקב מפורום המוהלים (08.11.2026): שם ההורים, תאריך, מקום, שעה, ראיתי את התינוק, הורדתי תחבושת למחרת.
(function () {
  'use strict';
  var KEY = 'kodesh-britot', BKEY = 'kodesh-britot-backup';
  var L = (document.documentElement.getAttribute('lang') || 'he').slice(0, 2);
  var SS = {
    ru: {
      days: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
      months: { tishri: 'тишрея', tishrei: 'тишрея', heshvan: 'хешвана', cheshvan: 'хешвана', kislev: 'кислева', tevet: 'тевета', shevat: 'швата', 'adar i': 'адара I', 'adar ii': 'адара II', adar: 'адара', nisan: 'нисана', iyar: 'ияра', sivan: 'сивана', tamuz: 'тамуза', av: 'ава', elul: 'элула' },
      today: 'сегодня', tomorrow: 'завтра', yesterday: 'вчера', inN: function (n) { return 'через ' + n + ' дн.'; }, agoN: function (n) { return n + ' дн. назад'; },
      saveFail: 'Не удалось сохранить в телефоне. Сейчас лучше сделать резервную копию в файл.',
      newBrit: 'Новая брит-мила', editBrit: 'Редактирование брит-милы', needName: 'Укажите хотя бы имена родителей или имя малыша.',
      sBrit: 'Брит-мила: ', sDate: 'Дата: ', sPlace: 'Место: ', sSandak: 'Сандак: ', sPhone: 'Телефон: ', sSaw: 'Видел малыша: ', sBand: 'Снял повязку на следующий день: ', yes: 'да', notyet: 'ещё нет', sPid: 'Пидьон а-бен: ', sNotes: 'Примечания: ',
      calBand: 'Снять повязку – ', calPid: 'Пидьон а-бен – ',
      tBand: 'Снять повязку', tSaw: 'Проведать малыша', tPid: 'Пидьон а-бен', done: '✓ Отметил',
      stM: 'в этом месяце', stY: 'в этом году', stAll: 'в журнале',
      hiHello: 'Здравствуйте', hiMid: function (n) { return ', как себя чувствует ' + n + '? Хотел узнать, как он после брит-милы.'; }, baby: 'малыш',
      chipSaw: 'Видел малыша', chipBand: 'Снял повязку', toParents: 'Родителям', call: '📞 Позвонить', summary: 'Сводка', remind: '📅 Напоминание', remPid: '📅 Пидьон а-бен', edit: 'Изменить', del: 'Удалить',
      none: 'Ничего не найдено. Попробуйте другое слово.', delQ: function (n) { return 'Удалить запись о брит-миле ' + n + '? Восстановить можно только из резервной копии.'; },
      cDate: 'Дата (григорианская)', cHeb: 'Дата (еврейская)', cTime: 'Время', cBaby: 'Имя малыша', cPar: 'Родители', cPhone: 'Телефон', cPlace: 'Место', cSan: 'Сандак', cSaw: 'Видел малыша', cBand: 'Снял повязку на следующий день', cPid: 'Пидьон а-бен', cNotes: 'Примечания', no: 'нет',
      fnCsv: 'brit-', fnBak: 'brit-backup-', title: 'Мой журнал бритов',
      added: function (n) { return 'Добавлено записей из копии: ' + n + '.'; }, badFile: 'Файл не похож на резервную копию журнала.',
      linkBad: 'Ссылка неполная. Можно скопировать данные из сообщения и добавить вручную.', noDate: 'В ссылке нет даты брит-милы. Добавьте запись вручную.', already: 'Эта брит-мила уже в журнале.',
      addQ: 'Добавить эту брит-милу в журнал?\n\n', noname: 'Без имени',
      weekday: function (d, h) { return d + ', ' + h; }
    },
    en: {
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      months: { tishri: 'Tishrei', tishrei: 'Tishrei', heshvan: 'Cheshvan', cheshvan: 'Cheshvan', kislev: 'Kislev', tevet: 'Tevet', shevat: 'Shevat', 'adar i': 'Adar I', 'adar ii': 'Adar II', adar: 'Adar', nisan: 'Nisan', iyar: 'Iyar', sivan: 'Sivan', tamuz: 'Tammuz', av: 'Av', elul: 'Elul' },
      today: 'today', tomorrow: 'tomorrow', yesterday: 'yesterday', inN: function (n) { return 'in ' + n + ' days'; }, agoN: function (n) { return n + ' days ago'; },
      saveFail: 'I could not save on the phone. It is best to back up to a file now.',
      newBrit: 'New brit', editBrit: 'Editing a brit', needName: 'Enter at least the parents\' names or the baby\'s name.',
      sBrit: 'Brit: ', sDate: 'Date: ', sPlace: 'Place: ', sSandak: 'Sandek: ', sPhone: 'Phone: ', sSaw: 'Saw the baby: ', sBand: 'Removed the dressing the next day: ', yes: 'yes', notyet: 'not yet', sPid: 'Pidyon haben: ', sNotes: 'Notes: ',
      calBand: 'Remove the dressing – ', calPid: 'Pidyon haben – ',
      tBand: 'Remove the dressing', tSaw: 'See the baby', tPid: 'Pidyon haben', done: '✓ Marked',
      stM: 'this month', stY: 'this year', stAll: 'in the log',
      hiHello: 'Hello', hiMid: function (n) { return ', how is ' + n + '? I wanted to hear how he is feeling after the brit.'; }, baby: 'the baby',
      chipSaw: 'Saw the baby', chipBand: 'Removed the dressing', toParents: 'To the parents', call: '📞 Call', summary: 'Summary', remind: '📅 Reminder', remPid: '📅 Pidyon haben', edit: 'Edit', del: 'Delete',
      none: 'Nothing found. Try another word.', delQ: function (n) { return 'Delete the brit of ' + n + '? It can only be restored from a backup file.'; },
      cDate: 'Date (Gregorian)', cHeb: 'Date (Hebrew)', cTime: 'Time', cBaby: 'Baby\'s name', cPar: 'Parents', cPhone: 'Phone', cPlace: 'Place', cSan: 'Sandek', cSaw: 'Saw the baby', cBand: 'Removed the dressing the next day', cPid: 'Pidyon haben', cNotes: 'Notes', no: 'no',
      fnCsv: 'brit-', fnBak: 'brit-backup-', title: 'My brit log',
      added: function (n) { return n + ' brits added from the backup.'; }, badFile: 'The file does not look like a backup of the log.',
      linkBad: 'The link is incomplete. You can copy the details from the message and add them by hand.', noDate: 'The link has no date of the brit. Add the brit by hand.', already: 'This brit is already in the log.',
      addQ: 'Add this brit to the log?\n\n', noname: 'No name'
    }
  };
  var S = SS[L] || null;
  function x(k, he) { return S ? S[k] : he; }
  var DAYS = S ? S.days : ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var YOM = S ? '' : 'יום ';
  var fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  var MON = { tishri: 'תשרי', tishrei: 'תשרי', heshvan: 'חשוון', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shevat: 'שבט', 'adar i': 'אדר א׳', 'adar ii': 'אדר ב׳', adar: 'אדר', nisan: 'ניסן', iyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
  function gem(n) {
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'], hunds = ['', 'ק', 'ר', 'ש', 'ת'];
    var s = '';
    while (n >= 400) { s += 'ת'; n -= 400; }
    s += hunds[Math.floor(n / 100)]; n %= 100;
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else { s += tens[Math.floor(n / 10)]; s += ones[n % 10]; }
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function parse(s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function heb(d) {
    var o = {};
    fmt.formatToParts(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)).forEach(function (p) { o[p.type] = p.value; });
    var m = (o.month || '').toLowerCase();
    if (S) return (+o.day) + ' ' + (S.months[m] || m) + ' ' + o.year;
    return gem(+o.day) + ' ב' + (MON[m] || m) + ' ' + gem(+o.year % 1000);
  }
  function g(d) { return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function add(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function diff(a, b) { return Math.round((a - b) / 864e5); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(d) { var n = diff(d, today()); if (S) return n === 0 ? S.today : n === 1 ? S.tomorrow : n === -1 ? S.yesterday : n > 1 ? S.inN(n) : S.agoN(-n); return n === 0 ? 'היום' : n === 1 ? 'מחר' : n === -1 ? 'אתמול' : n > 1 ? 'בעוד ' + n + ' ימים' : 'לפני ' + (-n) + ' ימים'; }
  function intl(p) { p = (p || '').replace(/\D/g, ''); if (!p) return ''; return p.charAt(0) === '0' ? '972' + p.slice(1) : p; }
  function ev(n, p) { if (window.kelimEv) window.kelimEv(n, Object.assign({ tool: 'britot' + (S ? '_' + L : '') }, p || {})); }

  var list = [];
  function load() { try { list = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { list = []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { alert(x('saveFail', 'לא הצלחתי לשמור בטלפון. כדאי לגבות לקובץ עכשיו.')); } }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

  var $ = function (id) { return document.getElementById(id); };
  var form = $('bt-form'), box = $('bt-formbox');

  // ---------- טופס ----------
  function showHeb() {
    var d = parse(form.date.value);
    $('bt-heb').textContent = d ? YOM + DAYS[d.getDay()] + ', ' + heb(d) : '';
  }
  function openForm(b) {
    form.reset();
    form.id_.value = b ? b.id : '';
    form.date.value = b ? b.date : iso(today());
    ['baby', 'parents', 'phone', 'time', 'place', 'sandak', 'birth', 'notes'].forEach(function (k) { if (b) form[k].value = b[k] || ''; });
    ['saw', 'bandage', 'bechor'].forEach(function (k) { form[k].checked = !!(b && b[k]); });
    $('bt-form-h').textContent = b ? x('editBrit', 'עריכת ברית') : x('newBrit', 'ברית חדשה');
    box.hidden = false; showHeb();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { form.parents.focus(); }, 300);
  }
  form.date.addEventListener('input', showHeb);
  $('bt-new').addEventListener('click', function () { openForm(null); });
  $('bt-cancel').addEventListener('click', function () { box.hidden = true; });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.parents.value.trim() && !form.baby.value.trim()) { alert(x('needName', 'כתבו לפחות את שם ההורים או את שם התינוק.')); return; }
    var id = form.id_.value, old = id && list.filter(function (x) { return x.id === id; })[0];
    var b = old || { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: new Date().toISOString() };
    ['baby', 'parents', 'phone', 'time', 'place', 'sandak', 'birth', 'notes', 'date'].forEach(function (k) { b[k] = form[k].value.trim(); });
    ['saw', 'bandage', 'bechor'].forEach(function (k) { b[k] = form[k].checked; });
    if (!old) list.push(b);
    save(); box.hidden = true; render();
    if (!old && window.toolUsed) window.toolUsed('britot' + (S ? '_' + L : ''));
    var el = document.querySelector('[data-id="' + b.id + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ---------- תצוגה ----------
  function name(b) { return b.baby ? b.baby + (b.parents ? ' (' + b.parents + ')' : '') : b.parents; }
  function pidyon(b) {
    if (!b.bechor) return null;
    var birth = parse(b.birth) || add(parse(b.date), -7);
    return add(birth, 30); // היום ה-31 ללידה
  }
  function summary(b) {
    var d = parse(b.date), t = [];
    t.push(x('sBrit', 'ברית: ') + name(b));
    t.push(x('sDate', 'תאריך: ') + YOM + DAYS[d.getDay()] + ', ' + heb(d) + ' · ' + g(d) + (b.time ? ' · ' + b.time : ''));
    if (b.place) t.push(x('sPlace', 'מקום: ') + b.place);
    if (b.sandak) t.push(x('sSandak', 'סנדק: ') + b.sandak);
    if (b.phone) t.push(x('sPhone', 'טלפון: ') + b.phone);
    t.push(x('sSaw', 'ראיתי את התינוק: ') + (b.saw ? x('yes', 'כן') : x('notyet', 'עדיין לא')));
    t.push(x('sBand', 'הורדתי את התחבושת למחרת: ') + (b.bandage ? x('yes', 'כן') : x('notyet', 'עדיין לא')));
    var p = pidyon(b); if (p) t.push(x('sPid', 'פדיון הבן: ') + heb(p) + ' · ' + g(p));
    if (b.notes) t.push(x('sNotes', 'הערות: ') + b.notes);
    return t.join('\n');
  }
  function cal(title, d, details) {
    var a = iso(d).replace(/-/g, ''), z = iso(add(d, 1)).replace(/-/g, '');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + a + '/' + z + '&details=' + encodeURIComponent(details || '');
  }
  function todo() {
    var t = today(), items = [];
    list.forEach(function (b) {
      var d = parse(b.date); if (!d || d > add(t, 1)) return;
      var nm = esc(name(b));
      if (!b.bandage) items.push({ d: add(d, 1), h: '<b>' + x('tBand', 'להוריד תחבושת') + '</b> · ' + nm + ' · <span class="due">' + when(add(d, 1)) + '</span>', id: b.id, k: 'bandage' });
      if (!b.saw) items.push({ d: d, h: '<b>' + x('tSaw', 'לראות את התינוק') + '</b> · ' + nm, id: b.id, k: 'saw' });
    });
    list.forEach(function (b) {
      var p = pidyon(b); if (!p) return;
      var n = diff(p, t);
      if (n >= -1 && n <= 30) items.push({ d: p, h: '<b>' + x('tPid', 'פדיון הבן') + '</b> · ' + esc(name(b)) + ' · ' + heb(p) + ' · <span class="due">' + when(p) + '</span>', id: b.id, k: '' });
    });
    items.sort(function (a, b) { return a.d - b.d; });
    $('bt-todo').hidden = !items.length;
    $('bt-todo-list').innerHTML = items.map(function (i) {
      return '<li>' + i.h + (i.k ? ' <button class="mini" type="button" data-done="' + i.id + '" data-k="' + i.k + '">' + x('done', '✓ סימנתי') + '</button>' : '') + '</li>';
    }).join('');
  }
  function stats() {
    var t = today(), y = 0, m = 0;
    list.forEach(function (b) { var d = parse(b.date); if (!d || d > t) return; if (d.getFullYear() === t.getFullYear()) { y++; if (d.getMonth() === t.getMonth()) m++; } });
    $('bt-stats').hidden = !list.length;
    $('bt-stats').innerHTML = '<span><b>' + m + '</b> ' + x('stM', 'החודש') + '</span><span><b>' + y + '</b> ' + x('stY', 'השנה') + '</span><span><b>' + list.length + '</b> ' + x('stAll', 'ביומן') + '</span>';
  }
  function render() {
    list.sort(function (a, b) { return (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')); });
    var q = ($('bt-q').value || '').trim();
    var rows = list.filter(function (b) { return !q || JSON.stringify(b).indexOf(q) > -1; });
    $('bt-empty').hidden = !!list.length;
    $('bt-tools').hidden = !list.length;
    $('bt-list').innerHTML = rows.map(function (b) {
      var d = parse(b.date), p = pidyon(b), ph = intl(b.phone);
      var meta = [YOM + DAYS[d.getDay()] + ', ' + heb(d) + ' · ' + g(d) + (b.time ? ' · ' + esc(b.time) : '')];
      if (b.place) meta.push('📍 ' + esc(b.place));
      if (b.sandak) meta.push(x('sSandak', 'סנדק: ') + esc(b.sandak));
      if (p) meta.push(x('sPid', 'פדיון הבן: ') + heb(p) + ' · ' + g(p));
      if (b.notes) meta.push('📝 ' + esc(b.notes));
      var hi = S ? S.hiHello + (b.parents ? ' ' + b.parents.split(/[ ,]/)[0] : '') + S.hiMid(b.baby || S.baby) : 'שלום' + (b.parents ? ' ' + b.parents.split(/[ ,ו]/)[0] : '') + ', מה שלום ' + (b.baby || 'התינוק') + '? רציתי לשמוע איך הוא מרגיש אחרי הברית.';
      return '<article class="bt-card" data-id="' + b.id + '">' +
        '<h3>' + esc(b.baby || b.parents) + (b.baby && b.parents ? ' <small>' + esc(b.parents) + '</small>' : '') + '</h3>' +
        '<p class="bt-meta">' + meta.join('<br>') + '</p>' +
        '<div class="bt-chips">' +
        '<button type="button" class="chip' + (b.saw ? ' on' : '') + '" data-tog="saw">' + (b.saw ? '✓' : '○') + ' ' + x('chipSaw', 'ראיתי את התינוק') + '</button>' +
        '<button type="button" class="chip' + (b.bandage ? ' on' : '') + '" data-tog="bandage">' + (b.bandage ? '✓' : '○') + ' ' + x('chipBand', 'הורדתי תחבושת') + '</button></div>' +
        '<div class="bt-acts">' +
        (ph ? '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" data-act="parents" href="https://wa.me/' + ph + '?text=' + encodeURIComponent(hi) + '"><svg class="ic"><use href="#wa"/></svg> ' + x('toParents', 'להורים') + '</a>' +
              '<a class="btn btn-line btn-sm" data-act="call" href="tel:' + esc(b.phone) + '">' + x('call', '📞 להתקשר') + '</a>' : '') +
        '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" data-act="summary" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(summary(b)) + '"><svg class="ic"><use href="#wa"/></svg> ' + x('summary', 'סיכום') + '</a>' +
        (!b.bandage ? '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" data-act="cal" href="' + cal(x('calBand', 'להוריד תחבושת – ') + name(b), add(d, 1), summary(b)) + '">' + x('remind', '📅 תזכורת') + '</a>' : '') +
        (p ? '<a class="btn btn-line btn-sm" target="_blank" rel="noopener" data-act="pidyon" href="' + cal(x('calPid', 'פדיון הבן – ') + name(b), p, summary(b)) + '">' + x('remPid', '📅 פדיון הבן') + '</a>' : '') +
        '<button class="btn btn-line btn-sm" type="button" data-edit>' + x('edit', 'עריכה') + '</button>' +
        '<button class="btn btn-line btn-sm bt-del" type="button" data-del>' + x('del', 'מחיקה') + '</button></div></article>';
    }).join('') || (list.length ? '<p class="bt-none">' + x('none', 'לא נמצא. נסו מילה אחרת.') + '</p>' : '');
    todo(); stats(); backupNote();
  }
  function byId(id) { return list.filter(function (x) { return x.id === id; })[0]; }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('.bt-card'), b = c && byId(c.getAttribute('data-id'));
    var t = e.target.closest('[data-tog]');
    if (t && b) { var k = t.getAttribute('data-tog'); b[k] = !b[k]; save(); render(); return; }
    var dn = e.target.closest('[data-done]');
    if (dn) { var x = byId(dn.getAttribute('data-done')); if (x) { x[dn.getAttribute('data-k')] = true; save(); render(); } return; }
    if (e.target.closest('[data-edit]') && b) { openForm(b); return; }
    if (e.target.closest('[data-del]') && b) {
      if (confirm(S ? S.delQ(name(b)) : 'למחוק את הברית של ' + name(b) + '? אי אפשר לשחזר, אלא מקובץ גיבוי.')) { list = list.filter(function (x) { return x !== b; }); save(); render(); }
      return;
    }
    var a = e.target.closest('[data-act]'); if (a) ev('britot_action', { what: a.getAttribute('data-act') });
  });
  $('bt-q').addEventListener('input', render);

  // ---------- ייצוא, הדפסה וגיבוי ----------
  var COLS = [[x('cDate', 'תאריך לועזי'), function (b) { return g(parse(b.date)); }], [x('cHeb', 'תאריך עברי'), function (b) { return heb(parse(b.date)); }], [x('cTime', 'שעה'), 'time'], [x('cBaby', 'שם התינוק'), 'baby'], [x('cPar', 'שם ההורים'), 'parents'], [x('cPhone', 'טלפון'), 'phone'], [x('cPlace', 'מקום'), 'place'], [x('cSan', 'סנדק'), 'sandak'],
    [x('cSaw', 'ראיתי את התינוק'), function (b) { return b.saw ? x('yes', 'כן') : x('no', 'לא'); }], [x('cBand', 'הורדתי תחבושת למחרת'), function (b) { return b.bandage ? x('yes', 'כן') : x('no', 'לא'); }], [x('cPid', 'פדיון הבן'), function (b) { var p = pidyon(b); return p ? g(p) : ''; }], [x('cNotes', 'הערות'), 'notes']];
  function cell(b, c) { return typeof c[1] === 'function' ? c[1](b) : (b[c[1]] || ''); }
  function rowsAsc() { return list.slice().sort(function (a, b) { return (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')); }); }
  function download(name, type, data) {
    var url = URL.createObjectURL(new Blob([data], { type: type })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function stamp() { return iso(today()); }
  function table() {
    return '<table dir="' + (S ? 'ltr' : 'rtl') + '" border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;font-family:Arial;font-size:11pt"><tr>' + COLS.map(function (c) { return '<th style="background:#eee">' + c[0] + '</th>'; }).join('') + '</tr>' +
      rowsAsc().map(function (b) { return '<tr>' + COLS.map(function (c) { return '<td>' + esc(cell(b, c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  }
  $('bt-csv').addEventListener('click', function () {
    var q = function (s) { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var csv = [COLS.map(function (c) { return c[0]; }).join(',')].concat(rowsAsc().map(function (b) { return COLS.map(function (c) { return q(cell(b, c)); }).join(','); })).join('\r\n');
    download(x('fnCsv', 'בריתות-') + stamp() + '.csv', 'text/csv;charset=utf-8', '﻿' + csv); ev('britot_export', { how: 'excel' });
  });
  $('bt-doc').addEventListener('click', function () {
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page{size:landscape}body{direction:' + (S ? 'ltr' : 'rtl') + '}</style></head><body dir="' + (S ? 'ltr' : 'rtl') + '"><h2 style="font-family:Arial">' + x('title', 'יומן הבריתות שלי') + '</h2>' + table() + '</body></html>';
    download(x('fnCsv', 'בריתות-') + stamp() + '.doc', 'application/msword', '﻿' + html); ev('britot_export', { how: 'word' });
  });
  $('bt-print').addEventListener('click', function () {
    $('bt-printarea').innerHTML = '<h2>' + x('title', 'יומן הבריתות שלי') + '</h2>' + table();
    ev('britot_export', { how: 'print' }); window.print();
  });
  $('bt-backup').addEventListener('click', function () {
    download(x('fnBak', 'גיבוי-בריתות-') + stamp() + '.json', 'application/json', JSON.stringify({ v: 1, britot: list }, null, 1));
    try { localStorage.setItem(BKEY, String(Date.now())); } catch (e) {}
    ev('britot_export', { how: 'backup' }); backupNote();
  });
  $('bt-restore').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result), arr = Array.isArray(data) ? data : data.britot, n = 0;
        arr.forEach(function (b) { if (b && b.id && b.date && !byId(b.id)) { list.push(b); n++; } });
        save(); render(); alert(S ? S.added(n) : 'נוספו ' + n + ' בריתות מהגיבוי.');
      } catch (e) { alert(x('badFile', 'הקובץ לא נראה כמו גיבוי של היומן.')); }
    };
    r.readAsText(f); this.value = '';
  });
  function backupNote() {
    var last = 0; try { last = +localStorage.getItem(BKEY) || 0; } catch (e) {}
    $('bt-bnote').hidden = !(list.length >= 3 && Date.now() - last > 30 * 864e5);
  }

  // ---------- ברית שהגיעה מ"טופס פרטי הברית" (?add=…) ----------
  // ההורים ממלאים את הטופס ב-/kodesh/tofes-brit/, ובסוף ההודעה למוהל יש קישור עם הפרטים (JSON ב-base64url).
  function fromLink() {
    var m = /[?&]add=([A-Za-z0-9_-]+)/.exec(location.search);
    if (!m) return;
    var clean = function () { try { history.replaceState(null, '', location.pathname); } catch (e) {} };
    var o;
    try {
      var s = m[1].replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      o = JSON.parse(decodeURIComponent(escape(atob(s))));
    } catch (e) { clean(); alert(x('linkBad', 'הקישור לא שלם. אפשר להעתיק את הפרטים מההודעה ולהוסיף ידנית.')); return; }
    var str = function (v, n) { return String(v == null ? '' : v).trim().slice(0, n); };
    var isoOk = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : ''; };
    var b = { parents: str(o.p, 80), phone: str(o.ph, 20), place: str(o.pl, 100), sandak: str(o.s, 60), time: /^\d{2}:\d{2}$/.test(o.t || '') ? o.t : '', birth: isoOk(o.b), date: isoOk(o.d), notes: str(o.n, 500), baby: '' };
    if (!b.date && b.birth) b.date = iso(add(parse(b.birth), 7));
    if (!b.date) { clean(); alert(x('noDate', 'בקישור אין תאריך ברית. אפשר להוסיף את הברית ידנית.')); return; }
    var same = list.filter(function (x) { return x.date === b.date && (x.parents || '') === b.parents; })[0];
    clean();
    if (same) { render(); var el = document.querySelector('[data-id="' + same.id + '"]'); if (el) el.scrollIntoView({ block: 'center' }); alert(x('already', 'הברית הזאת כבר ביומן.')); return; }
    var d = parse(b.date);
    var q = x('addQ', 'להוסיף ליומן את הברית הזאת?\n\n') + (b.parents || x('noname', 'בלי שם')) + '\n' + YOM + DAYS[d.getDay()] + ', ' + heb(d) + ' · ' + g(d) + (b.time ? ' · ' + b.time : '') + (b.place ? '\n' + b.place : '');
    if (!confirm(q)) return;
    b.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    b.created = new Date().toISOString(); b.saw = false; b.bandage = false; b.bechor = false; b.from = 'tofes';
    list.push(b); save(); render();
    ev('britot_action', { what: 'add_from_tofes' });
    if (window.toolUsed) window.toolUsed('britot' + (S ? '_' + L : ''), { how: 'tofes' });
    var el2 = document.querySelector('[data-id="' + b.id + '"]');
    if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  load(); render();
  if (/[?&]new\b/.test(location.search)) openForm(null);
  fromLink();
})();
