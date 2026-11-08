// פלייר לשיעור או לערב לימוד (כלי קודש): נושא, מעביר, מתי ואיפה → תמונה לקבוצה ודף A5 להדפסה.
(function () {
  'use strict';
  var KINDS = { shiur: 'שיעור', kavua: 'שיעור קבוע', erev: 'ערב לימוד', harzaa: 'הרצאה', siyum: 'סיום וסעודת מצווה', limud: 'לימוד לעילוי נשמת' };
  function kind(api) { return api.val('k') === 'other' ? api.val('kother') : (KINDS[api.val('k')] || 'שיעור'); }
  var $ = function (id) { return document.getElementById(id); };
  window.KCard.init({
    form: 'si-form', canvas: 'si-canvas', key: 'kodesh-shiur', tool: 'shiur', theme: 'night', printSize: 'a5',
    keep: ['by', 'place', 'contact', 'theme', 'size'],
    ids: { share: 'si-share', dl: 'si-dl', text: 'si-text', wa: 'si-wa', tip: 'si-tip', print: 'si-print' },
    onChange: function (api) { $('si-kother-wrap').hidden = api.val('k') !== 'other'; },
    fname: function (api) { return kind(api) + (api.val('topic') ? '-' + api.val('topic') : ''); },
    draw: function (api, th, W, H, M) {
      var s = H > W * 1.3 ? 1.2 : 1;
      var when = [api.val('day'), api.val('time') ? 'בשעה ' + api.val('time') : ''].filter(Boolean).join(' · ');
      api.stack([
        [kind(api) || 'שיעור', '600', 40 * s, 'sans', th.sub, 18 * s],
        [api.val('topic') || 'נושא השיעור', '700', 84 * s, 'serif', th.title, 22 * s],
        api.val('sub') ? [api.val('sub'), '400', 38 * s, 'sans', th.text, 20 * s] : null,
        ['—', '400', 30, 'sans', th.frame, 20 * s],
        api.val('by') ? ['מוסר השיעור', '400', 30 * s, 'sans', th.sub, 4 * s] : null,
        api.val('by') ? [api.val('by'), '700', 52 * s, 'serif', th.title, 30 * s] : null,
        when ? [when, '700', 42 * s, 'sans', th.text, 10 * s] : null,
        api.val('place') ? [api.val('place'), '400', 40 * s, 'sans', th.text, 18 * s] : null,
        api.val('note') ? [api.val('note'), 'italic 400', 34 * s, 'sans', th.sub, 18 * s] : null,
        api.val('contact') ? [api.val('contact'), '600', 32 * s, 'sans', th.text, 0] : null
      ], W, M + 70, H - M - 70, W - 2 * M - 110);
    },
    text: function (api) {
      var t = '*' + (kind(api) || 'שיעור') + ': ' + api.val('topic') + '*';
      if (api.val('sub')) t += '\n' + api.val('sub');
      if (api.val('by')) t += '\n\nמוסר השיעור: ' + api.val('by');
      if (api.val('day') || api.val('time')) t += '\n📅 ' + [api.val('day'), api.val('time') ? 'בשעה ' + api.val('time') : ''].filter(Boolean).join(' · ');
      if (api.val('place')) t += '\n📍 ' + api.val('place') + '\nניווט: https://waze.com/ul?q=' + encodeURIComponent(api.val('place'));
      if (api.val('note')) t += '\n\n' + api.val('note');
      if (api.val('contact')) t += '\n' + api.val('contact');
      return t + '\n\nמוזמנים! 📖';
    }
  });
})();
