// "מתאים לדף הזה": לפי האתר שפתוח, אילו כלים באתר hakelim.com יעזרו עכשיו.
// רק לפי שם האתר (hostname) – בלי לקרוא את תוכן הדף.
(function (root) {
  var RULES = [
    [/(^|\.)mail\.google\.com$|outlook\.(live|office)\.com$/, ['/kelim/machshev/chatima/', '/kelim/machshev/pdf/', '/kelim/machshev/fax/', '/kelim/tochen/tirgum/mismachim/', '/kelim/kesharim/hodaot/']],
    [/(^|\.)web\.whatsapp\.com$/, ['/kelim/tochen/wa/', '/kelim/tamlul/whatsapp/', '/kelim/kesharim/hodaot/', '/kelim/machshev/tmuna/', '/kelim/machshev/video/', '/kelim/machshev/mi-mitkasher/']],
    [/(^|\.)youtube\.com$|(^|\.)youtu\.be$|vimeo\.com$/, ['/kelim/tamlul/sirton/', '/kelim/tochen/tirgum/youtube/', '/kelim/machshev/video/', '/kelim/tamlul/shiur/']],
    [/(^|\.)calendar\.google\.com$/, ['/kelim/kesharim/yomulda/', '/kelim/briut/tizkorot/', '/kelim/machshev/tizkoret/', '/kodesh/luach/', '/kelim/eruim/sfira/']],
    [/(^|\.)(drive|docs)\.google\.com$|dropbox\.com$|onedrive\.live\.com$/, ['/kelim/machshev/pdf/', '/kelim/machshev/chatima/', '/kelim/machshev/tzilumim/', '/kelim/tochen/tirgum/mismachim/', '/kelim/machshev/tmuna/']],
    [/(^|\.)photos\.google\.com$|(^|\.)(facebook|instagram|tiktok)\.com$/, ['/kelim/tochen/gdalim/', '/kelim/tochen/studio/', '/kelim/machshev/tmuna/', '/kelim/tochen/chaye/', '/kelim/tochen/matzeget/', '/kelim/machshev/video/']],
    [/(^|\.)gov\.il$|btl\.gov\.il$|(^|\.)(misim|mof)\.gov\.il$/, ['/kelim/machshev/fax/', '/kelim/machshev/tzilumim/', '/kelim/machshev/chatima/', '/kelim/machshev/pdf/', '/kelim/shikum/tik/', '/kelim/cheshbon/osek/']],
    [/(^|\.)(linkedin|alljobs|drushim|jobmaster|glassdoor|indeed)\./, ['/kelim/avoda/korot/', '/kelim/avoda/misrot/', '/kelim/avoda/reayon/', '/kelim/tichnut/reayon-tech/']],
    [/(^|\.)(github|gitlab|stackoverflow|npmjs)\.|(^|\.)developer\.mozilla\.org$|(^|\.)(chatgpt|claude|gemini\.google)\./, ['/kelim/tichnut/shgiot/', '/kelim/tichnut/json/', '/kelim/tichnut/regex/', '/kelim/tichnut/git/', '/kelim/tichnut/base64/', '/kelim/tochen/tirgum/atar/']],
    [/(^|\.)(bank|leumi|poalim|discountbank|mizrahi-tefahot|isracard|max|cal-online)\./, ['/kelim/cheshbon/mikdamot/', '/kelim/cheshbon/shaar/', '/kelim/tiyulim/hotzaot/', '/kelim/machshev/sisma/']],
    [/(^|\.)(sefaria\.org|hebrewbooks\.org|daf-yomi\.com|yeshiva\.org\.il)$/, ['/kodesh/luach/', '/kodesh/gimatria/', '/kelim/tamlul/shiur/', '/kelim/tochen/tirgum/atar/']],
    [/(^|\.)(booking|airbnb|waze|maps\.google)\.|(^|\.)google\.[a-z.]+$/, ['/kelim/tiyulim/maslul/', '/kelim/tiyulim/hotzaot/', '/kelim/tiyulim/tziyud/', '/kelim/tiyulim/ochel/']]
  ];
  var PDF = ['/kelim/machshev/chatima/', '/kelim/machshev/pdf/', '/kelim/tochen/tirgum/mismachim/', '/kelim/machshev/fax/'];
  var BASE = ['/kelim/machshev/chatima/', '/kelim/machshev/tmuna/', '/kelim/tamlul/', '/kelim/machshev/pdf/', '/kelim/tochen/tirgum/', '/kelim/machshev/sisma/'];
  function suggest(url, tools, n) {
    var by = {}; (tools || []).forEach(function (t) { by[t.u] = t; });
    var list = null, host = '';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {}
    if (/\.pdf($|[?#])/i.test(url || '')) list = PDF;
    for (var i = 0; !list && i < RULES.length; i++) if (RULES[i][0].test(host)) list = RULES[i][1];
    var out = [], seen = {};
    (list || []).concat(BASE).forEach(function (u) { if (by[u] && !seen[u] && !by[u].h) { seen[u] = 1; out.push(by[u]); } });
    return { matched: !!list, tools: out.slice(0, n || 6) };
  }
  root.HKSuggest = suggest;
})(typeof self !== 'undefined' ? self : this);
