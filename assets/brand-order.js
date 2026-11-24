/* טופס הזמנה לכלי ממותג: בונה הודעת וואטסאפ מוכנה אל גילעד. בלי שרת, בלי שמירה, בלי חיוב. */
(function () {
  "use strict";
  var f = document.querySelector("[data-order]"); if (!f) return;
  var $ = function (s) { return f.querySelector(s); };
  var go = $("[data-o-go]"), sum = $("[data-o-sum]");
  var plans = { "290": "כלי ממותג אחד (290 ₪)", "590": "ערכת כלים לאתר (590 ₪)", "990": "עסק דיגיטלי (990 ₪)" };
  function upd() {
    var tools = [].map.call(f.querySelectorAll("input[name=tool]:checked"), function (i) { return i.value; });
    var plan = $("[data-o-plan]").value, max = plan === "290" ? 1 : 3;
    var name = $("[data-o-name]").value.trim(), tel = $("[data-o-phone]").value.trim();
    var msg = "היי גילעד, הגעתי מהדף של " + (f.getAttribute("data-o-from") || "מחשבון לרואי חשבון") + " ואשמח להצצה בצבעים שלי.\n" +
      "חבילה: " + plans[plan] + "\nכלים: " + (tools.join(", ") || "עוד לא בחרתי") +
      "\nשם המשרד: " + (name || "—") + "\nוואטסאפ לפניות: " + (tel || "—") +
      "\nאתר: " + $("[data-o-site]").value + "\nצבע: " + $("[data-o-color]").value +
      "\n(אשלח לוגו בהמשך השיחה)" + (src ? "\n[" + src + "]" : "");
    go.href = "https://wa.me/972584049049?text=" + encodeURIComponent(msg);
    sum.textContent = tools.length > max ? "בחבילה הזו נכללים עד " + (max === 1 ? "כלי אחד" : "שלושה כלים") + ". אפשר להמשיך, ונתאם בשיחה." : (tools.length === 0 ? "עוד לא נבחרו כלים, " : tools.length === 1 ? "נבחר כלי אחד, " : "נבחרו " + tools.length + " כלים, ") + plans[plan] + ".";
  }
  var src = ""; try { src = new URLSearchParams(location.search).get("utm_source") || ""; } catch (e) {}
  go.addEventListener("click", function () {
    try {
      if (window.gtag) window.gtag("event", "brand_order_click", {
        plan: $("[data-o-plan]").value, tools: f.querySelectorAll("input[name=tool]:checked").length,
        site: $("[data-o-site]").value, source: src || "direct"
      });
    } catch (e) {}
  });
  f.addEventListener("input", upd); f.addEventListener("change", upd); upd();
})();
