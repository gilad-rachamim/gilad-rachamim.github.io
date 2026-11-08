/* ברכות השחר ותפילין: נוסח, גודל אות, רקע כהה, מסך שלא נכבה. ההגדרות נשמרות בטלפון. */
(function () {
  var paper = document.getElementById("bk-paper");
  if (!paper) return;
  var KEY = "kodesh-boker";
  var st = { n: "ash", fs: 1.3, dark: false };
  try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); for (var k in s) st[k] = s[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function ev(name, p) { try { if (window.gtag) gtag("event", name, Object.assign({ tool: "boker" }, p || {})); } catch (e) {} }

  var segBtns = document.querySelectorAll("[data-set-n]");
  var darkBtn = document.getElementById("bk-dark");
  function apply() {
    paper.setAttribute("data-nusach", st.n);
    segBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-set-n") === st.n ? "true" : "false"); });
    paper.style.setProperty("--fs", st.fs + "rem");
    paper.classList.toggle("dark", !!st.dark);
    darkBtn.setAttribute("aria-pressed", st.dark ? "true" : "false");
    darkBtn.textContent = st.dark ? "☀️" : "🌙";
    darkBtn.setAttribute("aria-label", st.dark ? "רקע בהיר" : "רקע כהה");
  }
  segBtns.forEach(function (b) {
    b.addEventListener("click", function () { st.n = b.getAttribute("data-set-n"); apply(); save(); ev("boker_nusach", { nusach: st.n }); });
  });
  document.getElementById("bk-plus").addEventListener("click", function () { st.fs = Math.min(2.4, +(st.fs + 0.15).toFixed(2)); apply(); save(); });
  document.getElementById("bk-minus").addEventListener("click", function () { st.fs = Math.max(1, +(st.fs - 0.15).toFixed(2)); apply(); save(); });
  darkBtn.addEventListener("click", function () { st.dark = !st.dark; apply(); save(); });
  apply();

  // גובה הסרגל העליון של האתר והסרגל שלנו, כדי שהקפיצה לחלק לא תסתתר מתחתיהם
  var bar = document.getElementById("bk-bar");
  function measure() {
    var top = document.querySelector(".topbar");
    var h = top ? top.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty("--bk-top", h + "px");
  }
  measure(); window.addEventListener("resize", measure);
  // כשהסרגל המלא יוצא מהמסך, מופיעה שורה צפה עם הקפיצות וגודל האות
  var fl = document.createElement("div");
  fl.className = "bk-float"; fl.setAttribute("aria-hidden", "true");
  fl.innerHTML = '<button type="button" class="bk-ic" data-fs="-1" tabindex="-1" aria-label="אות קטנה יותר">א-</button><button type="button" class="bk-ic" data-fs="1" tabindex="-1" aria-label="אות גדולה יותר">א+</button>';
  var nav2 = bar.querySelector(".bk-nav").cloneNode(true);
  nav2.querySelectorAll("a").forEach(function (a) { a.tabIndex = -1; });
  fl.insertBefore(nav2, fl.firstChild);
  document.body.appendChild(fl);
  fl.querySelectorAll("[data-fs]").forEach(function (b) {
    b.addEventListener("click", function () { document.getElementById(b.getAttribute("data-fs") > 0 ? "bk-plus" : "bk-minus").click(); });
  });
  function onScroll() {
    var on = bar.getBoundingClientRect().bottom < 60;
    fl.classList.toggle("on", on); fl.setAttribute("aria-hidden", on ? "false" : "true");
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // קפיצה לחלק: מחשבים את המקום מתחת לסרגל העליון והשורה הצפה
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !paper.parentNode) return;
    var t = document.getElementById(a.getAttribute("href").slice(1));
    if (!t || !t.classList.contains("bk-sec")) return;
    e.preventDefault();
    var top = document.querySelector(".topbar");
    var off = (top ? top.getBoundingClientRect().height : 0) + 56;
    window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - off, behavior: "instant" });
    try { history.replaceState(null, "", "#" + t.id); } catch (er) {}
  });

  // סימון החלק הנוכחי בשורת הקפיצה
  var links = document.querySelectorAll(".bk-float .bk-nav a");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + e.target.id;
          a.classList.toggle("on", on);
          // גלילה מיידית (לא חלקה): גלילה חלקה כאן עוצרת את הגלילה של הדף בכרום
          if (on) a.parentNode.scrollLeft = a.offsetLeft - a.parentNode.clientWidth / 2 + a.clientWidth / 2;
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll(".bk-sec").forEach(function (s) { io.observe(s); });
  }

  // המסך לא ייכבה בזמן הקריאה (Wake Lock), רק בדפדפנים שתומכים
  var wakeBtn = document.getElementById("bk-wake");
  if ("wakeLock" in navigator) {
    wakeBtn.hidden = false;
    var lock = null, want = false;
    function setUi() { wakeBtn.setAttribute("aria-pressed", lock ? "true" : "false"); wakeBtn.textContent = lock ? "✓ המסך דולק" : "המסך לא ייכבה"; }
    function req() {
      navigator.wakeLock.request("screen").then(function (l) {
        lock = l; setUi();
        l.addEventListener("release", function () { lock = null; setUi(); });
      }).catch(function () { lock = null; setUi(); });
    }
    wakeBtn.addEventListener("click", function () {
      if (lock) { want = false; lock.release(); } else { want = true; req(); ev("boker_wake"); }
    });
    document.addEventListener("visibilitychange", function () { if (want && !lock && document.visibilityState === "visible") req(); });
  }
})();
