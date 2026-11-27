/* שכבת מיתוג לכלי ממותג לעסק. אין שרת ואין שמירת פרטים: הגולש שולח את התוצאה בעצמו לוואטסאפ של העסק (wa.me).
   מצבים: brand (כלי ממותג), gift (מתנה: שם וטלפון בלבד), free (הטמעה חינם עם קרדיט), hub (דף מרכז).
   ?embed=1 מסתיר את הכותרת העליונה ומדווח גובה להורה (hk-embed.js). ?preview=1 מקבל מיתוג חי מ-postMessage (מחולל ההצצה). */
(function () {
  "use strict";
  var B = {};
  try { B = JSON.parse(document.getElementById("hk-brand").textContent); } catch (e) {}
  var Q = new URLSearchParams(location.search);
  var embed = Q.get("embed") === "1";
  var preview = Q.get("preview") === "1";
  var body = document.body;
  var logoUrl = "";

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function lum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return 0;
    var n = parseInt(m[1], 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ga(name, extra) {
    try { if (window.gtag) { var p = { brand: B.slug || "", tool: body.getAttribute("data-tool") || "", plan: B.plan || "" }; for (var k in extra) p[k] = extra[k]; window.gtag("event", name, p); } } catch (e) {}
  }
  function telDigits(s) { return String(s || "").replace(/[^\d+]/g, ""); }

  function resultText() {
    var node = document.querySelector("[data-brand-result]") || document.querySelector("main [aria-live]") || document.querySelector("main .res,main .result");
    var t = node ? (node.innerText || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
    return t.slice(0, 700);
  }
  function waLink() {
    var h1 = document.querySelector("main h1");
    var lines = [(B.msg || "שלום, השתמשתי בכלי באתר שלכם ורציתי להמשיך."), ""];
    if (h1) lines.push(h1.textContent.trim());
    var r = window.hkResult ? window.hkResult() : resultText(); if (r) { lines.push(""); lines.push(r); }
    var num = String(B.whatsapp || "").replace(/\D/g, "");
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  function build() {
    var old = document.querySelectorAll(".hk-top,.hk-lead,.hk-credit,.hk-note,.hk-disc"); old.forEach(function (n) { n.remove(); });
    var mode = B.mode || "brand";
    body.classList.add("hk-brand-on");
    if (mode === "brand" || mode === "hub") {
      body.classList.add("hk-brand");
      body.classList.remove("hk-gift");
      body.style.setProperty("--hk-c", B.color || "#1d4e89");
      body.style.setProperty("--hk-c2", B.color2 || "#f2b705");
      body.style.setProperty("--hk-on", lum(B.color) > 0.42 ? "#111" : "#fff");
    } else if (mode === "gift") body.classList.add("hk-gift");
    else if (mode === "free") body.classList.add("hk-free");

    var main = document.getElementById("main");
    // סרטון ההדגמה של האתר מוזרק אחרי הטעינה: מסירים אותו מדף של לקוח
    function dropVid() { var v = main && main.querySelectorAll(".dv-sec"); for (var i = 0; v && i < v.length; i++) v[i].parentNode.removeChild(v[i]); }
    dropVid(); try { new MutationObserver(dropVid).observe(main, { childList: true }); } catch (e) { }
    var top = null;
    if (mode !== "free") {
      top = el("div", "hk-top");
      var lu = logoUrl || B.logo_url || "";
      if (lu && mode !== "gift") { var im = el("img"); im.src = lu; im.alt = ""; top.appendChild(im); }
      top.appendChild(el("b", "", B.name || ""));
      if (B.phone) { var t = el("a", "hk-tel", B.phone); t.href = "tel:" + telDigits(B.phone); top.appendChild(t); }
      body.insertBefore(top, body.firstChild);
    }
    if (B.demo) { var d = el("p", "hk-note", "זה עסק לדוגמה, בדוי. כך ייראה הכלי אצלכם, והכפתור למטה שולח את ההודעה אל גילעד."); main.parentNode.insertBefore(d, main); }

    var tool = main.querySelector(".tool") || main;
    if (mode === "brand" && B.whatsapp) {
      var lead = el("section", "hk-lead"); lead.setAttribute("aria-label", "פנייה לעסק");
      lead.appendChild(el("p", "", B.cta || "רוצים שנטפל בזה בשבילכם? שלחו לנו."));
      var a = el("a", "hk-wa", "שלחו לי את התוצאה בוואטסאפ"); a.href = waLink(); a.target = "_blank"; a.rel = "noopener";
      a.addEventListener("click", function () { a.href = waLink(); ga("brand_wa_click"); });
      a.addEventListener("focus", function () { a.href = waLink(); });
      a.addEventListener("mouseover", function () { a.href = waLink(); });
      lead.appendChild(a);
      lead.appendChild(el("small", "", "ההודעה נשלחת ישירות מהטלפון שלכם אל " + (B.name || "העסק") + ". אנחנו לא שומרים פרטים."));
      main.appendChild(lead);
    }
    if (B.disclaimer) main.appendChild(el("p", "hk-disc", B.disclaimer));

    var credit = el("p", "hk-credit");
    var origin = B.canonical || "https://hakelim.com/kelim/";
    var kind = B.credit || "small";
    if (mode === "free") {
      credit.appendChild(document.createTextNode("הכלי הזה בחינם, באדיבות "));
      var l1 = el("a", "", "מיזם הכלים של גילעד רחמים"); l1.href = origin; l1.target = "_blank"; l1.rel = "noopener"; l1.setAttribute("data-hk-credit", "1");
      credit.appendChild(l1); credit.appendChild(document.createTextNode(" · hakelim.com"));
    } else {
      credit.appendChild(document.createTextNode(kind === "gift" ? "נבנה באהבה במיזם הכלים · " : "נבנה במיזם הכלים · "));
      var l2 = el("a", "", "hakelim.com"); l2.href = origin; l2.target = "_blank"; l2.rel = "noopener"; l2.setAttribute("data-hk-credit", "1");
      credit.appendChild(l2);
    }
    main.parentNode.insertBefore(credit, main.nextSibling);
    sendHeight();
  }

  function sendHeight() {
    if (!embed || window.parent === window) return;
    var h = Math.max(document.documentElement.scrollHeight, body.scrollHeight);
    try { window.parent.postMessage({ hkH: h, hkSlug: B.slug || "" }, "*"); } catch (e) {}
  }

  build();
  ga("brand_view", { mode: B.mode || "brand", embed: embed ? 1 : 0 });
  document.addEventListener("click", function (e) { var c = e.target.closest && e.target.closest("[data-hk-credit]"); if (c) ga("brand_credit_click"); });
  if (embed) {
    if (window.ResizeObserver) new ResizeObserver(sendHeight).observe(document.documentElement);
    window.addEventListener("load", sendHeight); setInterval(sendHeight, 1500);
  }
  if (preview) {
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || !e.data || !e.data.hkBrand) return;
      var n = e.data.hkBrand;
      ["name", "color", "color2", "phone", "whatsapp"].forEach(function (k) { if (n[k]) B[k] = n[k]; });
      if (n.logoData) logoUrl = n.logoData;
      build();
    });
  }
})();
