/* תפריט ממותג לעסק עם הזמנה בוואטסאפ. הנתונים: <script type="application/json" id="hk-menu"> (נוצר ב-tools/make_gift.py menu).
   ההזמנה נשלחת מהטלפון של הלקוח ישירות לוואטסאפ של העסק; שום דבר לא נשמר אצלנו. */
(function () {
  "use strict";
  var M = JSON.parse(document.getElementById("hk-menu").textContent);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function ga(name, p) { try { if (window.gtag) gtag("event", name, Object.assign({ brand: M.slug }, p || {})); } catch (e) { } }
  function nis(n) { return n + " ₪"; }
  var sizes = M.sizes || [];
  var cart = [];
  try { cart = JSON.parse(sessionStorage.getItem("bm-" + M.slug) || "[]"); } catch (e) { }
  function save() { try { sessionStorage.setItem("bm-" + M.slug, JSON.stringify(cart)); } catch (e) { } }

  // ---------- תפריט ----------
  var root = $("#bm-menu"), nav = $("#bm-nav");
  M.sections.forEach(function (sec, si) {
    var s = el("section", "bm-sec"); s.id = "s" + si;
    s.appendChild(el("h2", "", (sec.icon ? sec.icon + " " : "") + sec.title));
    if (sec.hint) s.appendChild(el("p", "hint", sec.hint));
    var card = el("div", "bm-card");
    sec.items.forEach(function (it) {
      var multi = Array.isArray(it.p);
      var row = el("div", "bm-it" + (multi ? " sz" : ""));
      var t = el("div", "t"); t.appendChild(el("b", "", it.n)); if (it.d) t.appendChild(el("small", "", it.d));
      row.appendChild(t);
      if (multi) {
        var g = el("div", "bm-szs");
        it.p.forEach(function (p, i) {
          var b = el("button"); b.type = "button";
          b.appendChild(el("span", "", sizes[i] || "")); b.appendChild(el("b", "", nis(p)));
          b.setAttribute("aria-label", it.n + " " + (sizes[i] || "") + " " + p + " שקלים, להוסיף להזמנה");
          b.addEventListener("click", function () { pick(sec, it, i); });
          g.appendChild(b);
        });
        row.appendChild(g);
      } else {
        row.appendChild(el("span", "bm-pr", nis(it.p)));
        var a = el("button", "bm-add", "+"); a.type = "button"; a.setAttribute("aria-label", "להוסיף " + it.n + " להזמנה");
        a.addEventListener("click", function () { add({ n: it.n, s: "", tops: [], price: it.p }); toast(a); });
        row.appendChild(a);
      }
      card.appendChild(row);
    });
    s.appendChild(card); root.appendChild(s);
    var l = el("a", "", sec.title); l.href = "#s" + si; nav.appendChild(l);
  });
  if (M.toppings && M.toppings.length) {
    var ts = el("section", "bm-sec"); ts.id = "tops";
    ts.appendChild(el("h2", "", "➕ תוספות לפיצה"));
    ts.appendChild(el("p", "hint", "בוחרים פיצה וגודל, ומוסיפים את התוספות בלחיצה."));
    var tc = el("div", "bm-card");
    M.toppings.forEach(function (g) {
      tc.appendChild(el("div", "bm-tp", g.title + ": " + g.p.map(function (p, i) { return (sizes[i] || "") + " " + nis(p); }).join(" · ")));
      var w = el("div", "bm-tops"); g.items.forEach(function (n) { w.appendChild(el("span", "", n)); }); tc.appendChild(w);
    });
    ts.appendChild(tc); root.appendChild(ts);
    var tl = el("a", "", "תוספות"); tl.href = "#tops"; nav.appendChild(tl);
  }

  // ---------- חלון ----------
  var ov = $("#bm-ov"), sh = $("#bm-sh"), lastFocus = null;
  function open() { lastFocus = document.activeElement; ov.classList.add("on"); document.body.style.overflow = "hidden"; var x = $(".bm-x", sh); if (x) x.focus(); }
  function close() { ov.classList.remove("on"); document.body.style.overflow = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  function head(title, sub) {
    sh.textContent = "";
    var x = el("button", "bm-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "סגירה"); x.addEventListener("click", close); sh.appendChild(x);
    sh.appendChild(el("h3", "", title)); if (sub) sh.appendChild(el("p", "", sub));
  }

  // בחירת גודל ותוספות
  function pick(sec, it, i) {
    var base = it.p[i], chosen = [];
    if (!sec.toppings || !M.toppings || !M.toppings.length) { add({ n: it.n, s: sizes[i] || "", tops: [], price: base }); return showCartHint(); }
    head(it.n + " · " + (sizes[i] || ""), "רוצים תוספות? מסמנים וממשיכים. אפשר גם בלי.");
    var go = el("button", "bm-go"); go.type = "button";
    function total() { return base + chosen.reduce(function (s, c) { return s + c.p; }, 0); }
    function upd() { go.textContent = "להוסיף להזמנה · " + nis(total()); }
    M.toppings.forEach(function (g) {
      sh.appendChild(el("h4", "", g.title + " (" + nis(g.p[i]) + " לתוספת)"));
      var w = el("div", "bm-ch");
      g.items.forEach(function (n) {
        var lb = el("label"), cb = el("input"); cb.type = "checkbox";
        cb.addEventListener("change", function () {
          if (cb.checked) chosen.push({ n: n, p: g.p[i] }); else chosen = chosen.filter(function (c) { return c.n !== n; });
          upd();
        });
        lb.appendChild(cb); lb.appendChild(el("span", "", n)); w.appendChild(lb);
      });
      sh.appendChild(w);
    });
    go.addEventListener("click", function () { add({ n: it.n, s: sizes[i] || "", tops: chosen.map(function (c) { return c.n; }), price: total() }); close(); });
    upd(); sh.appendChild(go); open();
  }

  // ---------- עגלה ----------
  function key(o) { return o.n + "|" + o.s + "|" + o.tops.join(","); }
  function add(o) {
    var k = key(o), f = cart.filter(function (c) { return key(c) === k; })[0];
    if (f) f.q++; else { o.q = 1; cart.push(o); }
    save(); bar(); ga("menu_add", { item: o.n });
  }
  function sum() { return cart.reduce(function (s, c) { return s + c.price * c.q; }, 0); }
  function count() { return cart.reduce(function (s, c) { return s + c.q; }, 0); }
  var barBtn = $("#bm-bar button");
  function bar() {
    var n = count();
    barBtn.disabled = !n;
    barBtn.textContent = "";
    barBtn.appendChild(el("span", "", n ? "ההזמנה שלי (" + n + ")" : "בחרו מנות מהתפריט"));
    barBtn.appendChild(el("span", "", n ? nis(sum()) + " ←" : ""));
  }
  function toast(b) { b.textContent = "✓"; setTimeout(function () { b.textContent = "+"; }, 700); }
  function showCartHint() { barBtn.animate && barBtn.animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 350 }); }
  barBtn.addEventListener("click", showCart);

  var form = { name: "", how: "איסוף עצמי", addr: "", note: "" };
  function showCart() {
    head("ההזמנה שלי", "בודקים, ממלאים שם, ושולחים בוואטסאפ אל " + M.name + ".");
    cart.forEach(function (c) {
      var ln = el("div", "bm-ln"), t = el("div", "t");
      t.appendChild(el("b", "", c.n + (c.s ? " · " + c.s : "")));
      if (c.tops.length) t.appendChild(el("small", "", "תוספות: " + c.tops.join(", ")));
      ln.appendChild(t);
      var q = el("div", "bm-q");
      var m = el("button", "", "−"); m.type = "button"; m.setAttribute("aria-label", "להפחית " + c.n);
      var p = el("button", "", "+"); p.type = "button"; p.setAttribute("aria-label", "להוסיף " + c.n);
      m.addEventListener("click", function () { c.q--; if (c.q < 1) cart.splice(cart.indexOf(c), 1); save(); bar(); cart.length ? showCart() : close(); });
      p.addEventListener("click", function () { c.q++; save(); bar(); showCart(); });
      q.appendChild(m); q.appendChild(el("b", "", String(c.q))); q.appendChild(p); ln.appendChild(q);
      ln.appendChild(el("b", "", nis(c.price * c.q)));
      sh.appendChild(ln);
    });
    var tot = el("div", "bm-tot"); tot.appendChild(el("span", "", "סך הכול")); tot.appendChild(el("span", "", nis(sum()))); sh.appendChild(tot);
    function field(label, k, ph, area) {
      var lb = el("label", "bm-f", label), i = el(area ? "textarea" : "input"); if (!area) i.type = "text"; else i.rows = 2;
      i.value = form[k]; i.placeholder = ph || ""; i.addEventListener("input", function () { form[k] = i.value; });
      lb.appendChild(i); sh.appendChild(lb); return lb;
    }
    field("שם", "name", "על שם מי ההזמנה");
    sh.appendChild(el("h4", "", "איך מקבלים?"));
    var w = el("div", "bm-ch"), addrF;
    ["איסוף עצמי", "משלוח"].forEach(function (h) {
      var lb = el("label"), r = el("input"); r.type = "radio"; r.name = "bm-how"; r.checked = form.how === h;
      r.addEventListener("change", function () { form.how = h; addrF.style.display = h === "משלוח" ? "" : "none"; });
      lb.appendChild(r); lb.appendChild(el("span", "", h)); w.appendChild(lb);
    });
    sh.appendChild(w);
    addrF = field("כתובת למשלוח", "addr", "רחוב, מספר, קומה"); addrF.style.display = form.how === "משלוח" ? "" : "none";
    field("הערות", "note", "בלי בצל, חצי-חצי, שעת איסוף...", true);
    var go = el("button", "bm-go wa", "לשלוח את ההזמנה בוואטסאפ"); go.type = "button";
    go.addEventListener("click", function () { ga("menu_order_wa", { value: sum(), items: count() }); window.open(waLink(), "_blank", "noopener"); });
    sh.appendChild(go);
    sh.appendChild(el("p", "bm-note", "ההזמנה נשלחת מהטלפון שלכם ישירות אל " + M.name + ". המחיר הסופי, דמי משלוח וזמן ההכנה מאושרים מולם."));
    open(); ga("menu_cart_open");
  }
  function waLink() {
    var L = ["שלום " + M.name + ", אשמח להזמין:"];
    cart.forEach(function (c) {
      L.push("• " + c.q + " × " + c.n + (c.s ? " (" + c.s + ")" : "") + (c.tops.length ? " + " + c.tops.join(", ") : "") + " – " + nis(c.price * c.q));
    });
    L.push("סך הכול: " + nis(sum()));
    L.push("");
    if (form.name.trim()) L.push("שם: " + form.name.trim());
    L.push(form.how + (form.how === "משלוח" && form.addr.trim() ? ": " + form.addr.trim() : ""));
    if (form.note.trim()) L.push("הערות: " + form.note.trim());
    return "https://wa.me/" + M.whatsapp + "?text=" + encodeURIComponent(L.join("\n"));
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-bm]"); if (a) ga("menu_" + a.getAttribute("data-bm"));
  });
  bar();
})();
