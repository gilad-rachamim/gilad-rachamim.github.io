/* מחולל ההצצה בדף המכירה: שולח את השם, הצבע והלוגו לכלי הדוגמה שבתוך הדף (iframe באותו אתר). בלי שרת ובלי שמירה.
   מחולל קוד הטמעה (דף ההטמעה): בוחר כלי ומציג את הקוד להעתקה. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };

  var pv = $("[data-bp]");
  if (pv) {
    var fr = $("iframe", pv), st = { name: "", color: "#156556", color2: "#eb961e", phone: "", logoData: "" };
    function send() { try { fr.contentWindow.postMessage({ hkBrand: st }, location.origin); } catch (e) {} }
    fr.addEventListener("load", send);
    function bind(sel, key, ev) { var i = $(sel, pv); if (!i) return; i.addEventListener(ev || "input", function () { st[key] = i.value; send(); }); }
    bind("[data-bp-name]", "name"); bind("[data-bp-phone]", "phone"); bind("[data-bp-color]", "color");
    var lf = $("[data-bp-logo]", pv);
    if (lf) lf.addEventListener("change", function () {
      var f = lf.files && lf.files[0]; if (!f || !/^image\//.test(f.type)) return;
      var rd = new FileReader();
      rd.onload = function () {
        st.logoData = rd.result;
        var im = new Image();
        im.onload = function () {
          try {
            var c = document.createElement("canvas"), w = 48, h = Math.max(1, Math.round(48 * im.height / im.width)); c.width = w; c.height = h;
            var x = c.getContext("2d"); x.drawImage(im, 0, 0, w, h); var d = x.getImageData(0, 0, w, h).data, bins = {};
            for (var p = 0; p < d.length; p += 4) {
              if (d[p + 3] < 200) continue; var r = d[p], g = d[p + 1], b = d[p + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
              if (mx > 235 && mn > 215) continue; if (mx - mn < 40) continue;
              var k = (r >> 5) + "," + (g >> 5) + "," + (b >> 5); bins[k] = (bins[k] || 0) + 1;
            }
            var best = null, bn = 0; for (var k2 in bins) if (bins[k2] > bn) { bn = bins[k2]; best = k2; }
            if (best) { var q = best.split(",").map(function (v) { return Math.min(255, v * 32 + 16); }); var hex = "#" + q.map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join(""); st.color = hex; var ci = $("[data-bp-color]", pv); if (ci) ci.value = hex; }
          } catch (e) {}
          send();
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
  }

  var em = $("[data-em]");
  if (em) {
    var sel = $("select", em), code = $("textarea", em), view = $("iframe", em), copy = $("[data-em-copy]", em), ok = $("[data-em-ok]", em);
    function render() {
      var o = sel.options[sel.selectedIndex], slug = o.value, title = o.textContent, h = o.getAttribute("data-h") || "640";
      var src = "https://hakelim.com/kelim/b/free/" + slug + "/?embed=1";
      code.value = '<iframe src="' + src + '" data-hk-embed title="' + title + '" loading="lazy" style="width:100%;max-width:720px;height:' + h + 'px;border:0;display:block;margin:0 auto"></iframe>\n<script src="https://hakelim.com/assets/hk-embed.js" defer></script>';
      view.src = "/kelim/b/free/" + slug + "/?embed=1";
    }
    sel.addEventListener("change", render); render();
    copy.addEventListener("click", function () {
      code.select();
      var done = function () { ok.textContent = "הקוד הועתק. מדביקים באתר."; };
      if (navigator.clipboard) navigator.clipboard.writeText(code.value).then(done, function () { document.execCommand("copy"); done(); }); else { document.execCommand("copy"); done(); }
    });
  }
})();
