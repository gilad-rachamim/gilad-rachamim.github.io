// מודעת אזכרה ושלושים (כלי קודש): שלושים, אזכרה שנתית, הקמת מצבה, ימי השבעה → תמונה שקטה וטקסט לווטסאפ.
(function () {
  'use strict';
  var KINDS = {
    shloshim: { head: 'אזכרה', line: 'במלאות שלושים לפטירת' },
    shana: { head: 'אזכרה', line: 'במלאות שנה לפטירת' },
    yahrzeit: { head: 'אזכרה', line: 'ביום השנה לפטירת' },
    matzeva: { head: 'הקמת מצבה', line: 'על קבר' },
    shiva: { head: 'ימי השבעה', line: 'המשפחה יושבת שבעה על פטירת' }
  };
  var $ = function (id) { return document.getElementById(id); };
  function K(api) { return KINDS[api.val('k')] || KINDS.shloshim; }
  function invite(api) { return api.val('k') === 'shiva' ? '' : 'נתכנס'; }
  window.KCard.init({
    form: 'az-form', canvas: 'az-canvas', key: 'kodesh-azkara', tool: 'azkara', theme: 'stone', printSize: 'a5',
    keep: ['theme', 'size'],
    ids: { share: 'az-share', dl: 'az-dl', text: 'az-text', wa: 'az-wa', tip: 'az-tip', print: 'az-print' },
    onChange: function (api) {
      var sh = api.val('k') === 'shiva';
      $('az-date-l').textContent = sh ? 'עד מתי' : 'מתי';
      $('az-date').placeholder = sh ? 'עד יום שלישי בבוקר, ט"ו בכסלו' : 'יום שלישי, ט"ו בכסלו';
      $('az-place-l').textContent = sh ? 'כתובת בית האבל' : 'איפה';
      $('az-place').placeholder = sh ? 'רחוב הרצל 10, ירושלים' : 'בית העלמין הר המנוחות, ירושלים';
    },
    fname: function (api) { return K(api).head + (api.val('name') ? '-' + api.val('name') : ''); },
    draw: function (api, th, W, H, M) {
      var s = H > W * 1.3 ? 1.2 : 1, sh = api.val('k') === 'shiva';
      var when = [api.val('date'), api.val('time') ? (sh ? 'שעות ביקור: ' : 'בשעה ') + api.val('time') : ''].filter(Boolean).join(' · ');
      api.stack([
        [K(api).head, '700', 70 * s, 'serif', th.title, 26 * s],
        [K(api).line, '400', 38 * s, 'sans', th.text, 14 * s],
        [api.val('name') || 'שם הנפטר/ת ז"ל', '700', 66 * s, 'serif', th.title, 10 * s],
        api.val('rel') ? [api.val('rel'), '400', 34 * s, 'sans', th.sub, 10 * s] : null,
        ['—', '400', 30, 'sans', th.frame, 24 * s],
        invite(api) && (when || api.val('place')) ? [invite(api), '400', 34 * s, 'sans', th.sub, 8 * s] : null,
        when ? [when, '700', 40 * s, 'sans', th.text, 10 * s] : null,
        api.val('place') ? [api.val('place'), '400', 38 * s, 'sans', th.text, 14 * s] : null,
        api.val('note') ? [api.val('note'), 'italic 400', 32 * s, 'sans', th.sub, 14 * s] : null,
        api.val('family') ? ['', '400', 10, 'sans', th.text, 20 * s] : null,
        api.val('family') ? [api.val('family'), '700', 44 * s, 'serif', th.title, 26 * s] : null,
        ['תנצב"ה', '600', 34 * s, 'serif', th.sub, 0]
      ], W, M + 70, H - M - 70, W - 2 * M - 110);
    },
    text: function (api) {
      var sh = api.val('k') === 'shiva';
      var t = '*' + K(api).head + '*\n\n' + K(api).line + '\n*' + (api.val('name') || '') + '*' + (api.val('rel') ? '\n' + api.val('rel') : '') + '\n';
      if (api.val('date') || api.val('time')) t += '\n🕯️ ' + [api.val('date'), api.val('time') ? (sh ? 'שעות ביקור: ' : 'בשעה ') + api.val('time') : ''].filter(Boolean).join(' · ');
      if (api.val('place')) t += '\n📍 ' + api.val('place') + '\nניווט: https://waze.com/ul?q=' + encodeURIComponent(api.val('place'));
      if (api.val('note')) t += '\n\n' + api.val('note');
      if (api.val('family')) t += '\n\n' + api.val('family');
      return t + '\n\nתנצב"ה';
    }
  });
})();
