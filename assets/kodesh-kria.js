/* דפי קריאה בכלי קודש (ברכת המזון, תפילת הדרך, תהילים): נוסח, גודל אות, רקע כהה, מסך שלא נכבה,
   ושורה צפה עם קפיצה לחלקים. ההגדרות נשמרות בטלפון. בתהילים: מה קוראים היום (יום בחודש העברי ויום בשבוע).
   הטקסט עצמו כתוב ב-HTML (נבנה ע"י tools/make_dapei_kria.py), כאן רק התצוגה. */
(function () {
  var paper = document.getElementById("kr-paper");
  if (!paper) return;
  var TOOL = paper.getAttribute("data-tool") || "kria";
  var KEY = "kodesh-kria-" + (paper.getAttribute("data-key") || TOOL);
  var FSKEY = "kodesh-kria-fs";
  var segBtns = document.querySelectorAll("[data-set-n]");
  var NUS = [].map.call(segBtns, function (b) { return b.getAttribute("data-set-n"); });
  var st = { n: paper.getAttribute("data-nusach") || "", dark: false };
  var fs = 1.3;
  try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); for (var k in s) st[k] = s[k]; } catch (e) {}
  try { var f = parseFloat(localStorage.getItem(FSKEY)); if (f >= 1 && f <= 2.4) fs = f; } catch (e) {}
  if (NUS.length && NUS.indexOf(st.n) < 0) st.n = NUS[0];
  // קישור עם ?n=sef או #sef פותח ישר בנוסח הזה
  var want = (location.search.match(/[?&]n=(ash|sef|em)\b/) || [])[1];
  if (want && NUS.indexOf(want) >= 0) st.n = want;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); localStorage.setItem(FSKEY, String(fs)); } catch (e) {}
  }
  function ev(name, p) { try { if (window.gtag) gtag("event", name, Object.assign({ tool: TOOL }, p || {})); } catch (e) {} }

  var darkBtn = document.getElementById("kr-dark");
  function apply() {
    if (st.n) paper.setAttribute("data-nusach", st.n);
    segBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-set-n") === st.n ? "true" : "false"); });
    paper.style.setProperty("--fs", fs + "rem");
    paper.classList.toggle("dark", !!st.dark);
    if (darkBtn) {
      darkBtn.setAttribute("aria-pressed", st.dark ? "true" : "false");
      darkBtn.textContent = st.dark ? "☀️" : "🌙";
      darkBtn.setAttribute("aria-label", st.dark ? "רקע בהיר" : "רקע כהה");
    }
    var lab = document.getElementById("kr-nlabel");
    if (lab) {
      var cur = [].filter.call(segBtns, function (b) { return b.getAttribute("data-set-n") === st.n; })[0];
      lab.textContent = cur ? cur.textContent : "";
    }
  }
  segBtns.forEach(function (b) {
    b.addEventListener("click", function () { st.n = b.getAttribute("data-set-n"); apply(); save(); ev("kria_nusach", { nusach: st.n }); });
  });
  var plus = document.getElementById("kr-plus"), minus = document.getElementById("kr-minus");
  if (plus) plus.addEventListener("click", function () { fs = Math.min(2.4, +(fs + 0.15).toFixed(2)); apply(); save(); });
  if (minus) minus.addEventListener("click", function () { fs = Math.max(1, +(fs - 0.15).toFixed(2)); apply(); save(); });
  if (darkBtn) darkBtn.addEventListener("click", function () { st.dark = !st.dark; apply(); save(); });
  apply();

  // גובה הסרגל העליון של האתר, כדי שהקפיצה לחלק לא תסתתר מתחתיו
  var bar = document.getElementById("kr-bar");
  function measure() {
    var top = document.querySelector(".topbar");
    document.documentElement.style.setProperty("--bk-top", (top ? top.getBoundingClientRect().height : 0) + "px");
  }
  measure(); window.addEventListener("resize", measure);
  // כשהסרגל יוצא מהמסך: שורה צפה עם הקפיצות וגודל האות
  if (bar) {
    var fl = document.createElement("div");
    fl.className = "bk-float"; fl.setAttribute("aria-hidden", "true");
    fl.innerHTML = '<button type="button" class="bk-ic" data-fs="-1" tabindex="-1" aria-label="אות קטנה יותר">א-</button><button type="button" class="bk-ic" data-fs="1" tabindex="-1" aria-label="אות גדולה יותר">א+</button>';
    var nav = bar.querySelector(".bk-nav");
    if (nav) {
      var nav2 = nav.cloneNode(true);
      nav2.querySelectorAll("a").forEach(function (a) { a.tabIndex = -1; });
      fl.insertBefore(nav2, fl.firstChild);
    } else {
      var sp = document.createElement("span"); sp.className = "kr-fl-title"; sp.id = "kr-nlabel2";
      sp.textContent = (document.querySelector("h1") || {}).textContent || "";
      fl.insertBefore(sp, fl.firstChild);
    }
    document.body.appendChild(fl);
    fl.querySelectorAll("[data-fs]").forEach(function (b) {
      b.addEventListener("click", function () { (b.getAttribute("data-fs") > 0 ? plus : minus).click(); });
    });
    var onScroll = function () {
      var on = bar.getBoundingClientRect().bottom < 60;
      fl.classList.toggle("on", on); fl.setAttribute("aria-hidden", on ? "false" : "true");
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  // קפיצה לחלק: מחשבים את המקום מתחת לסרגל העליון והשורה הצפה
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var t = document.getElementById(a.getAttribute("href").slice(1));
    if (!t || !t.classList.contains("bk-sec")) return;
    e.preventDefault();
    var top = document.querySelector(".topbar");
    var off = (top ? top.getBoundingClientRect().height : 0) + 56;
    window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - off, behavior: "instant" });
    try { history.replaceState(null, "", "#" + t.id); } catch (er) {}
  });

  // המסך לא ייכבה בזמן הקריאה (Wake Lock), רק בדפדפנים שתומכים
  var wakeBtn = document.getElementById("kr-wake");
  if (wakeBtn && "wakeLock" in navigator) {
    wakeBtn.hidden = false;
    var lock = null, wantLock = false;
    var setUi = function () { wakeBtn.setAttribute("aria-pressed", lock ? "true" : "false"); wakeBtn.textContent = lock ? "✓ המסך דולק" : "המסך לא ייכבה"; };
    var req = function () {
      navigator.wakeLock.request("screen").then(function (l) {
        lock = l; setUi();
        l.addEventListener("release", function () { lock = null; setUi(); });
      }).catch(function () { lock = null; setUi(); });
    };
    wakeBtn.addEventListener("click", function () {
      if (lock) { wantLock = false; lock.release(); } else { wantLock = true; req(); ev("kria_wake"); }
    });
    document.addEventListener("visibilitychange", function () { if (wantLock && !lock && document.visibilityState === "visible") req(); });
  }

  // תהילים: מה קוראים היום. הלוח עצמו כתוב בדף (data-yom / data-week), כאן רק מסמנים את היום.
  var today = document.getElementById("kr-today");
  if (today) {
    var d = new Date(), day = 0;
    try { day = parseInt(new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric" }).format(d), 10) || 0; } catch (e) {}
    var wd = d.getDay() + 1;
    var y = day && document.querySelector('[data-yom="' + day + '"]');
    var w = document.querySelector('[data-week="' + wd + '"]');
    [y, w].forEach(function (el) { if (el) el.classList.add("kr-now"); });
    var out = [];
    if (y) out.push('<a href="' + y.getAttribute("data-href") + '">' + y.getAttribute("data-label") + "</a>");
    if (w) out.push('<a href="' + w.getAttribute("data-href") + '">' + w.getAttribute("data-label") + "</a>");
    if (out.length) { today.innerHTML = "<b>היום:</b> " + out.join(" · "); today.hidden = false; }
  }
})();
