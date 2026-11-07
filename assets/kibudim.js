// טופס הכיבודים: בונה הודעה מהשדות ופותח אותה בווטסאפ של גילעד. בלי שרת ובלי שמירה.
// כפתור ולא קישור, כדי שהשמות לא יישלחו ל-Analytics: המדידה האוטומטית של GA רושמת כתובת של קישור יוצא.
(function () {
  var form = document.getElementById('kb-form');
  var send = document.getElementById('kb-send');
  var err = document.getElementById('kb-err');
  var add = document.getElementById('kb-add');
  var extra = 0;

  function val(input) { return input.value.trim(); }

  function formatDate(iso) {
    var p = iso.split('-');
    return p.length === 3 ? Number(p[2]) + '.' + Number(p[1]) + '.' + p[0] : iso;
  }

  // מחזיר את שורות ההודעה ואת מספר המכובדים. שדה ריק לא נכנס.
  function collect() {
    var details = [];
    form.querySelectorAll('[data-detail]').forEach(function (input) {
      var v = val(input);
      if (!v) return;
      details.push(input.getAttribute('data-detail') + ': ' + (input.type === 'date' ? formatDate(v) : v));
    });
    var checked = form.querySelector('[name=nusach]:checked');
    if (checked) details.push('נוסח הברית: ' + checked.value);
    var amp = form.querySelector('[name=amp]:checked');
    if (amp) details.push('ציוד הגברה: ' + amp.value);

    var honors = [];
    form.querySelectorAll('[data-honor]').forEach(function (set) {
      var title = set.getAttribute('data-honor');
      set.querySelectorAll('[data-pair]').forEach(function (pair) {
        var name = val(pair.querySelector('[data-name]'));
        var rel = val(pair.querySelector('[data-rel]'));
        if (name && rel) honors.push(title + ': ' + name + ' (' + rel + ')');
        else if (name || rel) honors.push(title + ': ' + (name || rel));
      });
    });

    var parts = ['שלום גילעד, זו רשימת הכיבודים לברית:'];
    if (details.length) parts.push('*פרטי הברית*\n' + details.join('\n'));
    if (honors.length) parts.push('*הכיבודים*\n' + honors.join('\n'));
    return {
      filled: details.length + honors.length,
      honors: honors.length,
      nusach: checked ? checked.value : '',
      text: parts.join('\n\n')
    };
  }

  // track.js קורא את הנתונים האלה בלחיצה: מספר ונוסח בלבד, בלי שמות.
  function refresh() {
    var m = collect();
    send.setAttribute('data-ready', m.filled ? '1' : '0');
    send.setAttribute('data-count', String(m.honors));
    send.setAttribute('data-nusach', m.nusach);
    if (m.filled) err.textContent = '';
  }

  add.addEventListener('click', function () {
    extra += 1;
    var pair = add.previousElementSibling.cloneNode(true);
    pair.querySelectorAll('input').forEach(function (input) {
      input.value = '';
      input.id = input.id + '-' + extra;
      pair.querySelector('label[for="' + input.id.slice(0, input.id.lastIndexOf('-')) + '"]').htmlFor = input.id;
    });
    add.parentNode.insertBefore(pair, add);
    pair.querySelector('[data-name]').focus();
  });

  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  send.addEventListener('click', function () {
    var m = collect();
    if (!m.filled) {
      err.textContent = 'עדיין לא מילאתם שום פרט.';
      return;
    }
    var url = 'https://wa.me/972584049049?text=' + encodeURIComponent(m.text);
    var w = window.open(url, '_blank');
    if (w) w.opener = null;
    else location.href = url;
  });

  refresh();
})();
