// מי שברך לגבאי (כלי קודש): בוחרים נוסח, מקלידים שמות, ומקבלים נוסח מלא עם השמות בפנים – לקריאה ליד הבימה, להדפסה ולשליחה.
// הנוסחים: סידור אשכנז, מהדורת "דעת" (נחלת הכלל), דרך ספריא. השמות נכנסים במקום פב"פ, בלי לשנות אף מילה אחרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('mb-form'); if (!form) return;
  var MB = 'מִי שֶׁבֵּרַךְ אֲבותֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקב';
  var MB_FULL = MB + ' משֶׁה וְאַהֲרן דָּוִד וּשְׁלמה';
  function v(n) { var el = form.querySelector('[name=' + n + ']'); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; }
  function N(s, ph) { return '\u0001' + (s || ph) + '\u0002'; } // סימון שם, כדי להדגיש אותו בתצוגה
  var KINDS = {
    oleh: {
      label: 'לעולה לתורה', fields: ['name', 'occ'],
      build: function () {
        var shabbat = v('sh'), yt = v('yt'), rh = v('rh');
        return MB + ' הוּא יְבָרֵךְ אֶת ' + N(v('name'), 'פלוני בן פלוני') + ' בַּעֲבוּר שֶׁעָלָה לַתּורָה לִכְבוד הַמָּקום לִכְבוד הַתּורָה' +
          (shabbat ? ' וְלִכְבוד הַשַּׁבָּת' : '') + (yt ? ' וְלִכְבוד הַרֶגֶל' : '') + (rh ? ' וְלִכְבוד יום הַדִּין' : '') +
          ', בִשכַר זֶה הַקָּדושׁ בָּרוּךְ הוּא יִשְׁמְרֵהוּ וְיַצִּילֵהוּ מִכָּל צָרָה וְצוּקָה וּמִכָּל נֶגַע וּמַחֲלָה וְיִשְׁלַח בְּרָכָה וְהַצְלָחָה בְּכָל מַעֲשה יָדָיו' +
          (yt ? ' וְיִזְכֶּה לַעֲלות לָרֶגֶל' : '') + (rh ? ' וִיִכְתְּבֵהוּ וְיַחְתְּמֵהוּ לְחַיִּים טובִים בְּיום הַדִּין הַזֶּה' : '') +
          ' עִם כָּל יִשרָאֵל אֶחָיו וְנאמַר אָמֵן:';
      }
    },
    barmitzva: {
      label: 'לבר מצווה', fields: ['name'],
      build: function () {
        return MB + ' הוּא יְבָרֵךְ אֶת ' + N(v('name'), 'פלוני בן פלוני') + ' שֶׁמָּלְאוּ לו שְׁלשׁ עֶשרֵה שָׁנָה וְהִגִּיעַ לְמִצְות, וְעָלָה לַתּורָה, לָתֵת שֶׁבַח וְהודָיָה לְה\' יִתְבָּרַךְ עַל כָּל הַטּובָה שֶׁגָּמַל אִתּו. יִשְׁמְרֵהוּ הַקָּדושׁ בָּרוּךְ הוּא וִיחַיֵּהוּ, וִיכונֵן אֶת לבּו לִהְיות שָׁלֵם עִם ה\' וְלָלֶכֶת בִּדְרָכָיו וְלִשְׁמר מִצְותָיו כָּל הַיָּמִים, וְנאמַר אָמֵן:';
      },
      after: 'אחרי שהנער מברך את הברכה האחרונה, אביו אומר: בָּרוּךְ שֶׁפְּטָרַנִי מֵעָנְשׁו שֶׁלָזֶה:'
    },
    choleh: {
      label: 'לחולה', fields: ['name', 'donor', 'gender', 'occ2'],
      build: function () {
        var f = v('gender') === 'f', tail = (v('sh') ? ' שַׁבָּת הִיא מִלִזְּעוק וּרְפוּאָה קְרובָה לָבוא,' : '') + (v('yt') ? ' יום טוב הוא מִלְזּעוק וּרְפוּאָה קְרובָה לָבוא,' : '');
        return MB_FULL + ' הוּא יְבָרֵךְ אֶת ' + (f ? 'הַחולָה ' : 'הַחולֶה ') + N(v('name'), f ? 'פלונית בת פלונית' : 'פלוני בן פלונית') + ' בַּעֲבוּר שֶׁ' + N(v('donor'), 'פלוני') + ' נודֵר צְדָקָה ' + (f ? 'בַּעֲבוּרָהּ' : 'בַּעֲבוּרו') +
          ', בִּשכַר זֶה הַקָּדושׁ בָּרוּךְ הוּא יִמָלֵא רַחֲמִים ' + (f ? 'עָלֶיהָ לְהַחֲלִימָהּ וּלְרַפְּאתָהּ וּלְהַחֲזִיקָהּ וּלְהַחֲיותָהּ, וְיִשְׁלַח לָהּ' : 'עָלָיו לְהַחֲלִימו וּלְרַפְּאתו וּלְהַחֲזִיקו וּלְהַחֲיותו, וְיִשְׁלַח לו') +
          ' מְהֵרָה רְפוּאָה שְׁלֵמָה מִן הַשָּׁמַיִם ' + (f ? 'לְכָל אֵבָרֶיהּ וּלְכָל גִּידֶיהָ' : 'לִרְמַ"ח אֵבָרָיו וּשְׁסָ"ה גִּידָיו') + ' בְּתוךְ שְׁאָר חולֵי יִשרָאֵל, רְפוּאַת הַנֶּפֶשׁ וּרְפוּאַת הַגּוּף,' + tail + ' הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב. וְנאמַר אָמֵן:';
      }
    },
    ben: {
      label: 'ליולדת בן', fields: ['name'],
      build: function () {
        return MB_FULL + ', שרָה רִבְקָה רָחֵל וְלֵאָה, הוּא יְבָרֵךְ אֶת הָאִשָּׁה הַיּולֶדֶת ' + N(v('name'), 'פלונית בת פלוני') + ' וְאֶת בְּנָהּ שֶׁנּולַד לָהּ לְמַזָּל טוב, בַּעֲבוּר שֶׁבַּעְלָהּ וְאָבִיו נודֵר צְדָקָה בַּעֲדָם, בִּשכַר זֶה יִזְכּוּ אָבִיו וְאִמו לְהַכְנִיסו בִּבְרִיתו שֶׁל אַבְרָהָם אָבִינוּ וּלְגַדְּלו לְתורָה וּלְחֻפָּה וּלְמַעֲשים טובִים. וְנאמַר אָמֵן:';
      }
    },
    bat: {
      label: 'ליולדת בת וקריאת השם', fields: ['name', 'baby'],
      build: function () {
        return MB_FULL + ', שרָה רִבְקָה רָחֵל וְלֵאָה, הוּא יְבָרֵךְ אֶת הָאִשָּׁה הַיּולֶדֶת ' + N(v('name'), 'פלונית בת פלוני') + ' וְאֶת בִּתָּהּ שֶׁנּולְדָה לָהּ לְמַזָּל טוב, וְיִקָּרֵא שְׁמָהּ בְּיִשרָאֵל ' + N(v('baby'), 'פלונית בת פלוני') + ', בַּעֲבוּר שֶׁבַּעְלָהּ וְאָבִיהָ נודֵר צְדָקָה בַּעֲדָן, בִּשכַר זֶה יִזְכּוּ אָבִיהָ וְאִמָהּ לְגַדְּלָה לְתורָה וּלְחֻפָּה וּלְמַעֲשים טובִים. וְנאמַר אָמֵן:';
      }
    },
    tzahal: {
      label: 'לחיילי צה"ל', fields: [],
      build: function () {
        return [MB.replace('אֲבותֵינוּ', 'אֲבוֹתֵינוּ').replace('וְיַעֲקב', 'וְיַעֲקֹב'), 'הוּא יְבָרֵךְ אֶת חַיָּלֵי צְבָא הֲגַנָּה לְיִשְׂרָאֵל', 'הָעוֹמְדִים עַל מִשְׁמַר אַרְצֵנוּ וְעָרֵי אֱלֹהֵינוּ', 'מִגְּבוּל הַלְּבָנוֹן וְעַד מִדְבַּר מִצְרַיִם', 'וּמִן הַיָּם הַגָּדוֹל עַד לְבוֹא הָעֲרָבָה בַּיַּבָּשָׁה בָּאֲוִיר וּבַיָּם', 'יִתֵּן ה\' אֶת אוֹיְבֵינוּ הַקָּמִים עָלֵינוּ נִגָּפִים לִפְנֵיהֶם', 'הַקָּדוֹשׁ בָּרוּךְ הוּא יִשְׁמֹר וְיַצִּיל אֶת חַיָלֵינוּ מִכָּל צָרָה וְצוּקָה וּמִכָּל נֶגַע וּמַחֲלָה', 'וְיִשְׁלַח בְּרָכָה וְהַצְלָחָה בְּכָל מַעֲשֵׂה יְדֵיהֶם', 'יַדְבֵּר שׂוֹנְאֵינוּ תַּחְתֵּיהֶם וִיעַטְרֵם בְּכֶתֶר יְשׁוּעָה וּבְעֲטֶרֶת נִצָּחוֹן', 'וִיקֻיַּם בָּהֶם הַכָּתוּב:', 'כִּי ה\' אֱלֹהֵיכֶם הַהֹלֵךְ עִמָּכֶם לְהִלָּחֵם לָכֶם עִם אֹיְבֵיכֶם לְהוֹשִׁיעַ אֶתְכֶם', 'וְנֹאמַר אָמֵן'].join('\n');
      }
    }
  };
  var LABELS = {
    oleh: ['שם העולה', 'יעקב בן אברהם'], barmitzva: ['שם הנער', 'יוסף בן יעקב'],
    choleh: ['שם החולה ושם אמו', 'משה בן שרה'], ben: ['שם היולדת ושם אביה', 'רחל בת יצחק'], bat: ['שם היולדת ושם אביה', 'רחל בת יצחק']
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function K() { return KINDS[v('k')] || KINDS.oleh; }
  function plain() { return K().build().replace(/[\u0001\u0002]/g, ''); }
  function render() {
    var k = v('k') || 'oleh', kk = K(), f = kk.fields;
    $('mb-name-wrap').hidden = f.indexOf('name') < 0;
    if (LABELS[k]) { $('mb-name-l').textContent = LABELS[k][0]; $('mb-name').placeholder = LABELS[k][1]; }
    $('mb-donor-wrap').hidden = f.indexOf('donor') < 0;
    $('mb-gender-wrap').hidden = f.indexOf('gender') < 0;
    $('mb-baby-wrap').hidden = f.indexOf('baby') < 0;
    $('mb-occ-wrap').hidden = f.indexOf('occ') < 0 && f.indexOf('occ2') < 0;
    $('mb-rh-wrap').hidden = f.indexOf('occ') < 0;
    $('mb-title').textContent = 'מי שברך ' + kk.label;
    $('mb-text').innerHTML = esc(kk.build()).replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>').replace(/\n/g, '<br>');
    $('mb-after').hidden = !kk.after; $('mb-after').textContent = kk.after || '';
    try { localStorage.setItem('kodesh-misheberach', JSON.stringify({ k: k, size: $('mb-size').value })); } catch (e) {}
  }
  try { var s = JSON.parse(localStorage.getItem('kodesh-misheberach') || '{}'); if (s.k) form.querySelector('[name=k]').value = s.k; if (s.size) $('mb-size').value = s.size; } catch (e) {}
  var qk = new URLSearchParams(location.search).get('k'); if (qk && KINDS[qk]) form.querySelector('[name=k]').value = qk;
  function size() { $('mb-box').style.fontSize = $('mb-size').value + 'rem'; }
  form.addEventListener('input', render); form.addEventListener('change', render);
  $('mb-size').addEventListener('change', function () { size(); render(); });
  size(); render();
  function used(how) { if (window.toolUsed) window.toolUsed('misheberach', { how: how, k: v('k') }); }
  $('mb-copy').addEventListener('click', function () {
    var b = this, t = 'מי שברך ' + K().label + '\n\n' + plain() + (K().after ? '\n\n' + K().after : '');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; used('copy'); setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); });
  });
  $('mb-wa').addEventListener('click', function (e) { e.currentTarget.href = 'https://wa.me/?text=' + encodeURIComponent('מי שברך ' + K().label + '\n\n' + plain()); used('wa'); });
  $('mb-print').addEventListener('click', function () { used('print'); window.print(); });
  $('mb-full').addEventListener('click', function () {
    var b = $('mb-box'); used('fullscreen');
    if (b.requestFullscreen) b.requestFullscreen().catch(function () {});
  });
})();
