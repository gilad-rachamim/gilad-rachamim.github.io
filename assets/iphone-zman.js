/* "A code a friend holds" for Screen Time. Everything happens on the device:
   the code is drawn with crypto.getRandomValues, put only in the link hash (never sent to a server). */
(function () {
  function $(id) { return document.getElementById(id); }
  var used = false;
  function use(how) { if (window.toolUsed && !used) { used = true; window.toolUsed('iphone_zman_masach', { how: how }); } }
  function enc(code) { return (parseInt(code, 10) * 7 + 1234567).toString(36); }
  function dec(k) { var n = (parseInt(k, 36) - 1234567) / 7; if (!(n >= 0 && n <= 9999) || n % 1) return ''; return ('000' + n).slice(-4); }
  function draw() {
    var a = new Uint16Array(1), n;
    do { crypto.getRandomValues(a); n = a[0]; } while (n >= 60000);
    var c = ('000' + (n % 10000)).slice(-4);
    // avoid codes that are too easy to guess
    if (/^(\d)\1{3}$/.test(c) || c === '1234' || c === '4321' || c === '0000') return draw();
    return c;
  }

  // the inline head script already moved the code out of the address bar (so analytics never sees it)
  var m = /[#&]k=([0-9a-z]+)/i.exec(location.hash || '');
  var code = dec(m ? m[1] : (window.__ipk || ''));
  var owner = $('ip-owner'), friend = $('ip-friend');

  if (code && friend) {
    friend.hidden = false; if (owner) owner.hidden = true;
    var box = $('ip-code'), tog = $('ip-code-tog'), shown = false;
    function paint() { box.textContent = shown ? code.split('').join(' ') : '• • • •'; tog.textContent = shown ? 'להסתיר את הקוד' : 'להציג את הקוד'; tog.setAttribute('aria-pressed', shown ? 'true' : 'false'); }
    tog.addEventListener('click', function () { shown = !shown; paint(); use('friend_show'); });
    paint();
    try { friend.scrollIntoView({ block: 'start' }); } catch (e) {}
    return;
  }

  var gen = $('ip-gen'); if (!gen) return;
  var out = $('ip-share'), link = '';
  function msg() { return 'ביקשתי ממך לשמור לי קוד לזמן מסך באייפון. הקוד נמצא בקישור הזה, אל תגלה לי אותו 🙂\n' + link; }
  gen.addEventListener('click', function () {
    link = 'https://hakelim.com/kelim/iphone/zman-masach/#k=' + enc(draw());
    out.hidden = false;
    $('ip-wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg());
    $('ip-native').hidden = !navigator.share;
    gen.textContent = '🎲 להגריל קוד אחר';
    $('ip-done').textContent = 'הקוד הוגרל ונמצא בתוך הקישור. הוא לא מוצג לכם.';
    use('draw');
  });
  $('ip-native').addEventListener('click', function () { navigator.share({ text: msg() }).catch(function () {}); });
  $('ip-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(msg()) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }, function () { b.textContent = 'לא הצלחתי להעתיק'; });
  });
})();
