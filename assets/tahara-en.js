/* Mikvah calendar and niddah (veset) calculator in English: /kodesh/tahara/en/
   Calculation module: assets/tahara-core.js (same rules and sources as the Hebrew tools, docs/tahara-rules.md).
   Everything runs in the browser; nothing is saved or sent. A calculation aid, not a halachic ruling. */
(function () {
  'use strict';
  var H, C;
  var METHODS = [
    ['sephardi_ovadia', 'Sephardic (Rabbi Ovadia Yosef)'],
    ['morocco', 'Moroccan custom'],
    ['ben_ish_chai', 'Ben Ish Chai / Rabbi Mordechai Eliyahu'],
    ['ashkenaz', 'Ashkenazi (Shulchan Aruch, Rema, Shach)'],
    ['chabad', 'Chabad (Shulchan Aruch HaRav)']
  ];
  var ALERT = {
    hefsek_yom_tov: 'The hefsek tahara falls on a Yom Tov. Ask a rabbi how to do it.',
    hefsek_shabbat: 'The hefsek tahara falls on Shabbat. Ask a rabbi how to do it.',
    postponed_yom_kippur: 'The seventh clean day ends on Yom Kippur, so immersion moves to the next night.',
    postponed_tisha_bav: 'The seventh clean day ends on Tisha B\'Av, so immersion moves to the next night.',
    leil_shabbat: 'The mikvah night is a Friday night (Shabbat). Ask a rabbi about your custom.',
    motzei_shabbat: 'The mikvah night is Saturday night, after Shabbat ends. Plan the preparations ahead.',
    yom_tov: 'The mikvah night is the night of a Yom Tov. Ask a rabbi.'
  };
  var UNV = {
    min_days: 'The number of waiting days before the hefsek was not verified for this custom in the sources used here, so it is shown as the stricter count. Ask a rabbi.',
    leil_shabbat: 'Immersion on a Friday night was not verified for this custom. Ask a rabbi.'
  };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function gd(g) { return DOW[g.getDay()] + ', ' + MON[g.getMonth()] + ' ' + g.getDate() + ', ' + g.getFullYear(); }
  function hd(abs) { return new H.HDate(abs).render('en'); }
  // day onah: that daytime. night onah: the night that begins the evening before the Hebrew date's daytime.
  function when(d) {
    if (d.onah === 'night') return 'Night: evening of ' + gd(d.gregEve) + ' (after nightfall) &middot; ' + esc(hd(d.abs));
    return 'Day: ' + gd(d.greg) + ' &middot; ' + esc(hd(d.abs));
  }
  function preset(id) { return C.PRESETS[id] || C.PRESETS.sephardi_ovadia; }
  function opts(sel) {
    sel.innerHTML = METHODS.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('');
  }
  function today() { var n = new Date(); return C.ymd(n); }

  function runMikvah() {
    var out = $('tm-out'), v = $('tm-start').value;
    if (!v) { out.innerHTML = '<p class="tm-hint">Choose the day the period began, and the result appears here.</p>'; return; }
    var p = preset($('tm-method').value), start = C.absFromYmd(v), hv = $('tm-hefsek').value;
    var r = C.mikveh(start, p, hv ? C.absFromYmd(hv) : null);
    var h = '<dl class="tm-res">' +
      '<div><dt>Earliest hefsek tahara</dt><dd><b>' + gd(r.earliestHefsek.greg) + '</b><span>Day ' + r.minDays + ' counting the first day of bleeding as day 1 &middot; ' + esc(hd(r.earliestHefsek.abs)) + '</span></dd></div>' +
      (r.hefsekLate ? '<div><dt>Your hefsek tahara</dt><dd><b>' + gd(r.hefsek.greg) + '</b><span>' + esc(hd(r.hefsek.abs)) + '</span></dd></div>' : '') +
      '<div><dt>Seven clean days</dt><dd><b>' + gd(r.cleanFirst.greg) + ' to ' + gd(r.cleanLast.greg) + '</b><span>Counted from the day after the hefsek tahara</span></dd></div>' +
      '<div class="tm-key"><dt>Mikvah night</dt><dd><b>Evening of ' + gd(r.tevila.gregEve) + '</b><span>After nightfall &middot; the night that begins ' + esc(hd(r.tevila.abs)) + '</span></dd></div>' +
      '</dl>';
    var notes = [];
    r.alerts.forEach(function (a) { if (ALERT[a]) notes.push(ALERT[a]); });
    (p.unverified || []).forEach(function (u) { if (UNV[u]) notes.push(UNV[u]); });
    if (notes.length) h += '<ul class="tm-warn">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    h += '<p class="tm-note">Dates assume the bleeding stopped and the hefsek tahara and every one of the seven days were kept as your rabbi taught you. If anything differs, ask a rabbi.</p>';
    out.innerHTML = h;
  }

  function runVeset() {
    var out = $('tv-out'), v = $('tv-last').value;
    if (!v) { out.innerHTML = '<p class="tm-hint">Enter the start of the last period, and the days to be careful appear here.</p>'; return; }
    var p = preset($('tv-method').value), s = [];
    var pv = $('tv-prev').value;
    if (pv) s.push({ abs: C.absFromYmd(pv), onah: $('tv-prev-onah').value });
    s.push({ abs: C.absFromYmd(v), onah: $('tv-last-onah').value });
    var m = C.summary(s, p);
    if (!m) { out.innerHTML = ''; return; }
    var rows = [];
    rows.push(['Onah beinonit (the 30th day)', when(m.beinonit), 'Day 30 counting the day of the period as day 1.']);
    if (m.chodesh.list.length === 1) rows.push(['Veset hachodesh (same Hebrew date next month)', when(m.chodesh.list[0]), m.sameDay ? 'Same day as the 30th day in this month.' : 'Counted by the Hebrew date, not by number of days.']);
    else if (m.chodesh.list.length) rows.push(['Veset hachodesh (same Hebrew date next month)', m.chodesh.list.map(when).join('<br>'), 'The period began on the 30th of the Hebrew month and the next month has only 29 days. Both dates are shown, and a rabbi should be asked.']);
    if (m.haflaga) rows.push(['Veset haflagah (same interval again)', when(m.haflaga), 'The interval between the last two periods was ' + m.haflaga.len + ' days, counting both days.']);
    var h = '<p class="tm-from">From the period that began: <b>' + when(m.last) + '</b></p><ul class="tm-days">' +
      rows.map(function (r) { return '<li><b>' + r[0] + '</b><span class="tm-when">' + r[1] + '</span><small>' + r[2] + '</small></li>'; }).join('') + '</ul>';
    var extra = [];
    if (p.orZarua) extra.push('Or zarua: the onah just before each of these ' + (p.orZarua === 'recommended' ? 'is recommended as a stricter practice' : 'is also kept') + ' in your custom (' + when(m.notes.orZarua).replace(/<[^>]+>/g, '') + ' before the 30th day).');
    if (p.beinonit === '31') extra.push('Ashkenazi custom: the 31st day is kept in addition to the 30th, so a full month shows two days to be careful.');
    if (p.beinonit === '24h') extra.push('Chabad custom: the whole 24 hours of the 30th day.');
    if (extra.length) h += '<ul class="tm-warn">' + extra.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    h += '<p class="tm-note">These are the times to be careful about and to check for a flow, according to the custom you chose. A woman with a fixed veset, who is pregnant or nursing, or who uses hormonal medication follows different rules: ask a rabbi.</p>';
    out.innerHTML = h;
  }

  function init() {
    if (!window.hebcal || !window.TaharaCore) return setTimeout(init, 60);
    H = window.hebcal; C = window.TaharaCore;
    opts($('tm-method')); opts($('tv-method'));
    var t = today();
    ['tm-start', 'tm-hefsek', 'tv-last', 'tv-prev'].forEach(function (id) { $(id).max = id === 'tm-hefsek' ? '' : t; });
    ['tm-start', 'tm-hefsek', 'tm-method'].forEach(function (id) { $(id).addEventListener('input', runMikvah); });
    ['tv-last', 'tv-prev', 'tv-method', 'tv-last-onah', 'tv-prev-onah'].forEach(function (id) { $(id).addEventListener('input', runVeset); });
    $('tm-reset').addEventListener('click', function () { $('tm-start').value = ''; $('tm-hefsek').value = ''; runMikvah(); });
    $('tv-reset').addEventListener('click', function () { $('tv-last').value = ''; $('tv-prev').value = ''; runVeset(); });
    runMikvah(); runVeset();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
