/* הפניות לקורס + קישור שותף (24.11.2026).
   1) כל a[data-kurs] שולח אירוע GA4 kurs_click עם placement.
   2) ?s=<קוד> נשמר 30 יום ב-localStorage ושולח shutaf_visit; כפתורי קנייה a[data-kurs-buy="kurs|kvutza|bdika|skilim|shivuk|kartis"]
      מוחלפים לקישור של אותו שותף מתוך /assets/shutafim-kurs.json. קוד לא מוכר = הקישור הרגיל.
   3) קישורים לדף הקורס נושאים את קוד השותף הלאה. */
(function () {
  var K = "kurs-s", DAY = 864e5, MAXD = 30;
  var q = new URLSearchParams(location.search), code = (q.get("s") || "").toLowerCase();
  if (code && !/^[a-z0-9_-]{2,30}$/.test(code)) code = "";
  var st = null;
  try { st = JSON.parse(localStorage.getItem(K) || "null"); } catch (e) {}
  if (st && Date.now() - st.t > MAXD * DAY) st = null;
  if (code && (!st || st.c !== code)) {
    st = { c: code, t: Date.now() };
    try { localStorage.setItem(K, JSON.stringify(st)); } catch (e) {}
    if (window.gtag) gtag("event", "shutaf_visit", { code: code });
  }
  var cur = st && st.c;
  var links = document.querySelectorAll('a[href*="/kelim/claude/kurs/"]');
  if (cur) for (var i = 0; i < links.length; i++) {
    var u = links[i].getAttribute("href");
    if (u.indexOf("s=") < 0) links[i].setAttribute("href", u + (u.indexOf("?") < 0 ? "?" : "&") + "s=" + cur);
  }
  var buys = document.querySelectorAll("[data-kurs-buy]");
  if (cur && buys.length) {
    fetch("/assets/shutafim-kurs.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (m) {
      var o = m && m[cur]; if (!o) return;
      for (var j = 0; j < buys.length; j++) { var h = o[buys[j].getAttribute("data-kurs-buy")]; if (h && /^https:\/\/payhip\.com\//.test(h)) buys[j].setAttribute("href", h); }
    }).catch(function () {});
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-kurs]");
    if (a && window.gtag) gtag("event", "kurs_click", { placement: a.getAttribute("data-kurs"), shutaf: cur || "" });
  });
  document.addEventListener("toggle", function (e) {
    var d = e.target;
    if (d && d.open && d.hasAttribute && d.hasAttribute("data-bonus-faq") && window.gtag) {
      var sm = d.querySelector("summary");
      gtag("event", "bonus_faq_open", { question: sm ? sm.textContent.slice(0, 80) : "" });
    }
  }, true);
})();
