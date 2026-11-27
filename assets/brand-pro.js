/* ערכת "פרו" לדף מתנה ממותג: פס וואטסאפ קבוע שמציג את הסכום, פנייה עם כל פרטי החישוב, וכפתור דוגמה.
   נטען לפני brand.js (שמשתמש ב-window.hkResult כשבונה את קישור הוואטסאפ). אין שרת ואין שמירת פרטים. */
(function () {
  "use strict";
  var res = document.getElementById("zk-res");
  function $(id) { return document.getElementById(id); }
  function txt(e) { return e ? (e.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function date(v) { var p = String(v || "").split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : ""; }
  function total() { return res ? txt(res.querySelector(".pz-big")) : ""; }
  var demo = false;
  // מה שנשלח לעסק: הנתונים שהגולש הזין והתוצאה, בלי הסברי החישוב
  if (res) window.hkResult = function () {
    if (!total()) return "";
    var r = $("zk-reason"), l = [];
    if (demo) l.push("(חישוב דוגמה)");
    l.push("הנתונים שלי:");
    if (r && r.selectedIndex >= 0) l.push("• " + r.options[r.selectedIndex].text);
    l.push("• עבדתי מ-" + date($("zk-start").value) + " עד " + date($("zk-end").value));
    l.push("• שכר חודשי ברוטו: " + Number(String($("zk-sal").value).replace(/,/g, "")).toLocaleString("he-IL") + " ₪");
    l.push("", "התוצאה: " + total());
    [].forEach.call(res.querySelectorAll("tr"), function (tr) {
      if (tr.cells.length > 1) l.push("• " + txt(tr.cells[0]) + ": " + txt(tr.cells[tr.cells.length - 1]));
    });
    return l.join("\n");
  };
  var bar = document.querySelector(".pro-bar a.pro-wa");
  function sync() {
    // הסברי החישוב מקופלים, כדי שהסכום והכפתור יישארו על המסך
    [].forEach.call(res.querySelectorAll("div.pz-steps"), function (s) {
      var d = document.createElement("details"); d.className = "pz-steps";
      var m = document.createElement("summary"); m.textContent = "איך חישבנו?"; d.appendChild(m);
      while (s.firstChild) { if (s.firstChild.nodeName === "B") s.removeChild(s.firstChild); else d.appendChild(s.firstChild); }
      s.parentNode.replaceChild(d, s);
    });
    var label = total() ? "יצא לי " + total() + " · לשלוח לבדיקה" : bar && bar.getAttribute("data-idle");
    if (bar && bar.textContent !== label) bar.textContent = label;
  }
  if (res) { new MutationObserver(sync).observe(res, { childList: true }); sync(); }
  // כל כפתורי הוואטסאפ של הדף עוברים דרך כפתור הפנייה הראשי (שנושא את התוצאה ונמדד)
  [].forEach.call(document.querySelectorAll("a.pro-wa"), function (a) {
    a.addEventListener("click", function (e) {
      var main = document.querySelector(".hk-lead a.hk-wa");
      if (main) { e.preventDefault(); main.click(); }
    });
  });
  var tool = $("zk");
  if (tool && res) {
    var b = document.createElement("button"); b.type = "button"; b.className = "pro-demo"; b.textContent = "👀 לראות דוגמה בלחיצה";
    tool.insertBefore(b, tool.firstChild);
    b.addEventListener("click", function () {
      var end = new Date(), y = end.getFullYear(), p = function (n) { return (n < 10 ? "0" : "") + n; };
      var md = "-" + p(end.getMonth() + 1) + "-" + p(Math.min(end.getDate(), 28));
      $("zk-start").value = (y - 5) + md; $("zk-end").value = y + md; $("zk-sal").value = "12000";
      $("zk-used").value = "45"; $("zk-paid").value = "4";
      ["zk-start", "zk-end", "zk-sal", "zk-used", "zk-paid"].forEach(function (id) {
        $(id).dispatchEvent(new Event("input", { bubbles: true }));
        $(id).dispatchEvent(new Event("change", { bubbles: true }));
      });
      demo = true;
      res.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    tool.addEventListener("input", function (e) { if (e.isTrusted) demo = false; });
  }
})();
