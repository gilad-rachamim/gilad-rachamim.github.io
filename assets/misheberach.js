// מי שברך לגבאי (כלי קודש): בוחרים נוסח, מקלידים שמות, ומקבלים נוסח מלא עם השמות בפנים – לקריאה ליד הבימה, להדפסה ולשליחה.
// הנוסחים: אשכנז ("דעת") וספרד ("תורת אמת") דרך ספריא, עדות המזרח (שלייסבו), ומרוקאי מהסידור ששלח גילעד. השמות נכנסים במקום פב"פ, בלי לשנות אף מילה אחרת.
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
  // נוסח ספרד: סידור "תורת אמת" (נחלת הכלל), דרך ספריא. אותם שדות, נוסח אחר.
  var MBS = 'מִי שֶׁבֵּרַךְ אֲבוֹתֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקֹב', MBS_FULL = MBS + ' משֶׁה וְאַהֲרֹן דָּוִד וּשְׁלֹמֹה';
  function oleh_s() {
    var yt = v('yt'), rh = v('rh');
    return MBS + ' הוּא יְבָרֵךְ אֶת ' + N(v('name'), 'פלוני בן פלוני') + ' בַּעֲבוּר שֶׁעָלָה לַתּוֹרָה לִכְבוֹד הַמָּקוֹם לִכְבוֹד הַתּוֹרָה' +
      (v('sh') ? ' וְלִכְבוֹד הַשַּׁבָּת' : '') + (yt ? ' וְלִכְבוֹד הַרֶגֶל' : '') + (rh ? ' וְלִכְבוֹד יוֹם הַדִּין' : '') +
      ', וּבִשְׂכַר זֶה הַקָּדוֹשׁ בָּרוּךְ הוּא יִשְׁמְרֵהוּ וְיַצִּילֵהוּ מִכָּל צָרָה וְצוּקָה וּמִכָּל נֶגַע וּמַחֲלָה וְיִשְׁלַח בְּרָכָה וְהַצְלָחָה בְּכָל מַעֲשֵׂה יָדָיו' +
      (yt ? ' וְיִזְכֶּה לַעֲלוֹת לָרֶגֶל' : '') + (rh ? ' וְיִכְתְּבֵהוּ וְיַחְתְּמֵהוּ לְחַיִּים טוֹבִים בָּזֶה הַיּוֹם' : '') +
      ' עִם כָּל יִשְׂרָאֵל אֶחָיו וְנֹאמַר אָמֵן:';
  }
  var SEFARD = {
    oleh: { build: oleh_s },
    barmitzva: { build: oleh_s, after: 'אחרי שהנער מברך את הברכה האחרונה, אביו אומר: בָּרוּךְ שֶׁפְּטָרַנִי מֵעָנְשׁוֹ שֶׁלָזֶה:', note: 'בסידור תורת אמת (נוסח ספרד) אין מי שברך מיוחד לבר מצווה, ולכן מוצג מי שברך לעולה לתורה, ואחריו "ברוך שפטרני".' },
    choleh: {
      build: function () {
        var f = v('gender') === 'f';
        return MBS_FULL + ' הוּא יְבָרֵךְ אֶת ' + (f ? 'הַחוֹלַנִּית ' : 'הַחוֹלֶה ') + N(v('name'), f ? 'פלונית בת פלונית' : 'פלוני בן פלונית') + ' בַּעֲבוּר שֶׁ' + N(v('donor'), 'פלוני') + ' יִתֵּן מַתָּנָה ' + (f ? 'בַּעֲבוּרָהּ' : 'בַּעֲבוּרוֹ') +
          ', בִּשְׂכַר זֶה הַקָּדוֹשׁ בָּרוּךְ הוּא יְמַלֵּא רַחֲמִים ' + (f ? 'עָלֶיהָ לְהַחֲלִימָהּ וּלְרַפְּאֹתָהּ וּלְהַחֲזִיקָהּ וּלְהַחֲיוֹתָהּ, וְיִשְׁלַח לָהּ' : 'עָלָיו לְהַחֲלִימוֹ וּלְרַפְּאֹתוֹ וּלְהַחֲזִיקוֹ וּלְהַחֲיוֹתוֹ, וְיִשְׁלַח לוֹ') +
          ' מְהֵרָה רְפוּאָה שְׁלֵמָה מִן הַשָּׁמַיִם ' + (f ? 'לְכָל אֵבָרֶיה וּלְכָל גִּידֶיהָ' : 'לְרַמַ"ח אֵבָרָיו וּשְׁסָ"ה גִּידָיו') + ' בְּתוֹךְ שְׁאָר חוֹלֵי יִשְׂרָאֵל, רְפוּאַת הַנֶּפֶשׁ וּרְפוּאַת הַגּוּף' +
          (v('sh') ? ' שַׁבָּת הִיא מִלִזְּעוֹק וּרְפוּאָה קְרוֹבָה לָבוֹא.' : '') + (v('yt') ? ' יוֹם טוֹב הוא מִלִזְּעוֹק וּרְפוּאָה קְרוֹבָה לָבוֹא' : '') + ', הַשְׁתָּא בַּעֲגָלָא וּבִזְמַן קָרִיב. וְנֹאמַר אָמֵן:';
      }
    },
    ben: {
      build: function () {
        return MBS_FULL + ' הוּא יְבָרֵךְ אֶת הָאִשָּׁה הַיּוֹלֶדֶת ' + N(v('name'), 'פלונית בת פלוני') + ' וְאֶת בְּנָהּ הַנּוֹלָד לָהּ בְּמַזָּל טוֹב, בַּעֲבוּר שֶׁבַּעְלָהּ יִתֵּן לִצְדָקָה בַּעֲדָהּ, בִּשְׂכַר זֶה יִזְכּוּ אָבִיו וְאִמוֹ לְהַכְנִיסוֹ בִּבְרִיתוֹ שֶׁל אַבְרָהָם אָבִינוּ בְּעִתּוֹ וּבִזְמַנּוֹ וּלְגַדְּלוֹ לְתוֹרָה וּלְחֻפָּה וּלְמַעֲשִׂים טוֹבִים. וְנֹאמַר אָמֵן:';
      }
    },
    bat: {
      build: function () {
        return MBS_FULL + ' הוּא יְבָרֵךְ אֶת הָאִשָּׁה הַיּוֹלֶדֶת ' + N(v('name'), 'פלונית בת פלוני') + ' וְאֶת בִּתָּהּ הַנּוֹלְדָה לָהּ בְּמַזָּל טוֹב, וְיִקָּרֵא שְׁמָהּ בְּיִשְׂרָאֵל ' + N(v('baby'), 'פלונית בת פלוני') + ', בַּעֲבוּר שֶׁבַּעְלָהּ יִתֵּן לִצְדָקָה בַּעֲדָהּ, בִּשְׂכַר זֶה יִזְכּוּ אָבִיהָ וְאִמָהּ לְגַדְּלָה לְתוֹרָה וּלְחֻפָּה וּלְמַעֲשִׂים טוֹבִים. וְנֹאמַר אָמֵן:';
      }
    }
  };
  // מי שברך לקהל, נוסח עדות המזרח (מהדורת שלייסבו, CC0). את שם ה' כותבים ה', כי זה טקסט שנשלח ומודפס.
  KINDS.kahal = {
    label: 'לקהל (עדות המזרח)', fields: ['occ'],
    build: function () {
      return 'מִי שֶׁבֵּרַךְ אֲבוֹתֵינוּ אַבְרָהָם יִצְחָק וְיַעֲקֹב וּמֹשֶׁה וְאַהֲרֹן וְדָוִד וּשְׁלֹמֹה, וְכָל הַקְּהִלּוֹת הַקְּדוֹשׁוֹת וְהַטְּהוֹרוֹת, הוּא יְבָרֵךְ אֶת־כָּל־הַקָּהָל הַקָּדוֹשׁ הַזֶּה, גְּדוֹלִים וּקְטַנִּים, הֵם וּנְשֵׁיהֶם וּבְנֵיהֶם וְתַלְמִידֵיהֶם, וְכָל־אֲשֶׁר לָהֶם. מַלְכָּא דְעָלְמָא הוּא יְבָרֵךְ יַתְכוֹן, וִיזַכֶּה יַתְכוֹן, וְיִשְׁמַע בְּקָל צְלוֹתְכוֹן, תִּתְפָּרְקוּן וְתִשְׁתֵּזְבוּן מִכָּל צָרָה וְעַקְתָּא, וִיהֵא מֵימְרָא דַּה\' בְּסַעְדְכֶם, וְיָגֵן בַּעַדְכֶם, וְיִפְרוֹשׂ סֻכַּת שְׁלוֹמוֹ עֲלֵיכֶם, וְיִטַּע בֵּינֵיכֶם אַהֲבָה וְאַחְוָה, שָׁלוֹם וְרֵעוּת, וִיסַלֵּק שִׂנְאַת חִנָּם מִבֵּינֵיכֶם, וְיִשְׁבּוֹר עֹל הַגּוֹיִם מֵעַל צַוָּארֵיכֶם, וִיקַיֵּם בָּכֶם מִקְרָא שֶׁכָּתוּב ה\' אֱלֹהֵי אֲבוֹתֵכֶם יֹסֵף עֲלֵיכֶם כָּכֶם אֶלֶף פְּעָמִים וִיבָרֵךְ אֶתְכֶם כַּאֲשֶׁר דִּבֶּר לָכֶם:' +
        (v('rh') ? ' וְיִכְתָּבְכֶם הָאֵל בְּסֵפֶר חַיִּים טוֹבִים.' : '') + ' וְכֵן יְהִי רָצוֹן וְנֹאמַר אָמֵן:';
    },
    note: 'נוסח עדות המזרח, מהדורת שלייסבו. הסימון "ראש השנה ויום כיפור" מוסיף את המשפט של שבת תשובה.'
  };
  // נוסח מרוקאי: מילה במילה מהסידור ששלח גילעד (assets/misheberach-maroko.js, נבנה מ-tools/maroko-misheberach-source.txt).
  // השם נכנס במקום "(שם ושם משפחה)", והתוספות שבסוגריים (שבת, שבת שובה, יולדת) נכנסות רק כשמסמנים אותן.
  var MR = window.MB_MAROKO, MRT = window.MB_MAROKO_TPL;
  function mt(key) { return MRT(MR[key], false, v, function (ph) { return N(v('name'), ph); }).replace(/^\n+/, ''); }
  var MAROKO = {
    oleh: { label: 'לעולה לתורה', checks: function () { return v('short') ? ['short', 'yt', 'rh'] : ['short', 'rh']; }, name: 'שם העולה ושם המשפחה', build: function () { return mt(v('short') ? 'oleh_short' : 'oleh'); } },
    barmitzva: { label: 'לבר מצווה', checks: ['rh'], name: 'שם הנער ושם המשפחה', build: function () { return mt('barmitzva'); } },
    batmitzva: { label: 'לבת מצווה', checks: [], name: 'שם הנערה ושם המשפחה', build: function () { return mt('batmitzva'); } },
    choleh: { label: 'לחולה', gender: true, checks: ['sh'], name: 'שם החולה ושם המשפחה', build: function () { return mt(v('gender') === 'f' ? 'choleh_f' : 'choleh_m'); } },
    isha: { label: 'לאשה וליולדת', checks: ['yol'], name: 'שם האשה ושם המשפחה', build: function () { return mt('isha'); } },
    chatan: { label: 'לחתן (שבת חתן)', checks: ['rh'], name: 'שם החתן ושם המשפחה', build: function () { return mt('chatan'); }, after: function () { return 'כשהחתן חוזר למקומו, החזן אומר לו: ' + MR.lech_leshalom; } },
    kallah: { label: 'לכלה', checks: [], name: 'שם הכלה ושם המשפחה', build: function () { return mt('kallah'); } },
    tzahal: { label: 'לחיילי צה"ל', checks: [], build: function () { return mt('tzahal'); } },
    shvuyim: { label: 'לנעדרים ולשבויים', checks: [], build: function () { return mt('shvuyim'); } },
    yizkor: { label: 'יזכור לחללי צה"ל', title: 'יזכור לחללי צה"ל', checks: [], build: function () { return mt('yizkor'); } },
    hashkava: { label: 'השכבה', title: 'השכבה', gender: true, checks: function () { return v('gender') === 'f' || v('short') ? ['short'] : ['short', 'gadol']; }, name: 'שם הנפטר/ת ושם המשפחה',
      build: function () { var f = v('gender') === 'f'; return mt(v('short') ? (f ? 'hashkava_short_f' : 'hashkava_short_m') : (f ? 'hashkava_f' : 'hashkava_m')); } }
  };
  var SRC = { ashkenaz: 'סידור אשכנז, מהדורת "דעת", נחלת הכלל', sefard: 'סידור ספרד, "תורת אמת", נחלת הכלל', maroko: 'סידור כמנהג מרוקו, "שער הגבאי" (עמ\' 1247–1258), מילה במילה' };
  var LABELS = {
    oleh: ['שם העולה', 'יעקב בן אברהם'], barmitzva: ['שם הנער', 'יוסף בן יעקב'],
    choleh: ['שם החולה ושם אמו', 'משה בן שרה'], ben: ['שם היולדת ושם אביה', 'רחל בת יצחק'], bat: ['שם היולדת ושם אביה', 'רחל בת יצחק']
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isM() { return v('nusach') === 'maroko' && !!MR; }
  function K() {
    if (isM()) {
      var m = MAROKO[v('k')] || MAROKO.oleh;
      return { label: m.label, title: m.title, build: m.build, after: m.after && m.after(), note: m.note && m.note(), m: m };
    }
    var base = KINDS[v('k')] || KINDS.oleh, sf = v('nusach') === 'sefard' && SEFARD[v('k')];
    if (!sf) return base;
    return { label: base.label, fields: base.fields, build: sf.build, after: sf.after || base.after, note: sf.note };
  }
  function title(kk) { return kk.title || 'מי שברך ' + kk.label; }
  var ALL_OPTS = $('mb-k').innerHTML;
  function setKinds() {
    var sel = $('mb-k'), mode = isM() ? 'm' : 'a', cur = sel.value;
    if (sel.getAttribute('data-set') === mode) return;
    sel.innerHTML = mode === 'm' ? Object.keys(MAROKO).map(function (k) { return '<option value="' + k + '">' + MAROKO[k].label + '</option>'; }).join('') : ALL_OPTS;
    sel.setAttribute('data-set', mode);
    sel.value = cur; if (sel.selectedIndex < 0) sel.selectedIndex = 0;
  }
  function plain() { return K().build().replace(/[\u0001\u0002]/g, ''); }
  function render() {
    setKinds();
    var k = v('k') || 'oleh', kk = K(), f = kk.fields || [];
    ['short', 'yol', 'gadol'].forEach(function (c) { $('mb-' + c + '-wrap').hidden = true; });
    $('mb-sh-wrap').hidden = $('mb-yt-wrap').hidden = false;
    $('mb-rh-l').textContent = 'ראש השנה ויום כיפור'; $('mb-gender-l').textContent = 'החולה';
    $('mb-name-wrap').hidden = f.indexOf('name') < 0;
    if (LABELS[k]) { $('mb-name-l').textContent = LABELS[k][0]; $('mb-name').placeholder = LABELS[k][1]; }
    $('mb-donor-wrap').hidden = f.indexOf('donor') < 0;
    $('mb-gender-wrap').hidden = f.indexOf('gender') < 0;
    $('mb-baby-wrap').hidden = f.indexOf('baby') < 0;
    $('mb-occ-wrap').hidden = f.indexOf('occ') < 0 && f.indexOf('occ2') < 0;
    $('mb-rh-wrap').hidden = f.indexOf('occ') < 0;
    if (kk.m) {
      var m = kk.m, ch = typeof m.checks === 'function' ? m.checks() : m.checks;
      $('mb-name-wrap').hidden = !m.name; if (m.name) { $('mb-name-l').textContent = m.name; $('mb-name').placeholder = 'משה כהן'; }
      $('mb-donor-wrap').hidden = $('mb-baby-wrap').hidden = true;
      $('mb-gender-wrap').hidden = !m.gender; $('mb-gender-l').textContent = k === 'hashkava' ? 'הנפטר/ת' : 'החולה';
      ['sh', 'yt', 'rh', 'short', 'yol', 'gadol'].forEach(function (c) { $('mb-' + c + '-wrap').hidden = ch.indexOf(c) < 0; });
      $('mb-occ-wrap').hidden = !ch.length; $('mb-rh-l').textContent = 'שבת שובה';
    }
    $('mb-title').textContent = title(kk);
    $('mb-text').innerHTML = esc(kk.build()).replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>').replace(/\n/g, '<br>');
    $('mb-after').hidden = !kk.after; $('mb-after').textContent = kk.after || '';
    var ns = (k === 'kahal' && !kk.m) ? '' : (SRC[v('nusach')] || SRC.ashkenaz);
    $('mb-note').textContent = (kk.note ? kk.note + ' ' : '') + (ns ? 'הנוסח: ' + ns + '.' : '');
    try { localStorage.setItem('kodesh-misheberach', JSON.stringify({ k: k, size: $('mb-size').value, nusach: v('nusach') })); } catch (e) {}
  }
  var q = new URLSearchParams(location.search), qn = q.get('n'), qk = q.get('k');
  try { var s = JSON.parse(localStorage.getItem('kodesh-misheberach') || '{}'); if (s.nusach) $('mb-nusach').value = s.nusach; setKinds(); if (s.k) $('mb-k').value = s.k; if (s.size) $('mb-size').value = s.size; } catch (e) {}
  if (qn && SRC[qn]) $('mb-nusach').value = qn;
  setKinds();
  if (qk && (isM() ? MAROKO[qk] : KINDS[qk])) $('mb-k').value = qk;
  if ($('mb-k').selectedIndex < 0) $('mb-k').selectedIndex = 0;
  function size() { $('mb-box').style.fontSize = $('mb-size').value + 'rem'; }
  form.addEventListener('input', render); form.addEventListener('change', render);
  $('mb-size').addEventListener('change', function () { size(); render(); });
  size(); render();
  function used(how) { if (window.toolUsed) window.toolUsed('misheberach', { how: how, k: v('k'), n: v('nusach') }); }
  $('mb-copy').addEventListener('click', function () {
    var b = this, t = title(K()) + '\n\n' + plain() + (K().after ? '\n\n' + K().after : '');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; used('copy'); setTimeout(function () { b.textContent = 'להעתיק'; }, 1800); });
  });
  $('mb-wa').addEventListener('click', function (e) { e.currentTarget.href = 'https://wa.me/?text=' + encodeURIComponent(title(K()) + '\n\n' + plain() + (K().after ? '\n\n' + K().after : '')); used('wa'); });
  $('mb-print').addEventListener('click', function () { used('print'); window.print(); });
  $('mb-full').addEventListener('click', function () {
    var b = $('mb-box'); used('fullscreen');
    if (b.requestFullscreen) b.requestFullscreen().catch(function () {});
  });
})();
