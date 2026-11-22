// כלי עזר משותפים לתחום "קלוד": שמירה במכשיר, העתקה, הורדת קובץ, זיפ קטן בדפדפן, מדידה.
(function () {
  var C = window.CLAUDE = {
    load: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    save: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    used: function (tool, how) { try { if (window.toolUsed) window.toolUsed(tool, { how: how }); } catch (e) {} },
    wa: function (a, text) { a.href = 'https://wa.me/?text=' + encodeURIComponent(text); },
    copy: function (text, btn, label) {
      var done = function () { if (btn) { var o = label || btn.getAttribute('data-l') || btn.textContent; btn.setAttribute('data-l', o); btn.textContent = 'הועתק ✓'; setTimeout(function () { btn.textContent = o; }, 1500); } };
      try { navigator.clipboard.writeText(text).then(done, function () { C.fallback(text); done(); }); }
      catch (e) { C.fallback(text); done(); }
    },
    fallback: function (text) {
      var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t);
    },
    download: function (name, data, type) {
      var b = data instanceof Blob ? data : new Blob([data], { type: type || 'text/markdown;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    },
    // זיפ ללא דחיסה (store): מספיק לקובץ טקסט אחד, ו-claude.ai מקבל אותו.
    zip: function (files) {
      var enc = new TextEncoder(), tbl = [], i, j, c;
      for (i = 0; i < 256; i++) { c = i; for (j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tbl[i] = c >>> 0; }
      function crc(b) { var x = 0xFFFFFFFF; for (var k = 0; k < b.length; k++) x = tbl[(x ^ b[k]) & 255] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0; }
      function u16(n) { return [n & 255, (n >>> 8) & 255]; }
      function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }
      var parts = [], central = [], offset = 0;
      files.forEach(function (f) {
        var name = enc.encode(f.name), data = enc.encode(f.text), cs = crc(data);
        var local = [0x50, 0x4b, 3, 4].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(cs), u32(data.length), u32(data.length), u16(name.length), u16(0));
        parts.push(new Uint8Array(local), name, data);
        central.push([0x50, 0x4b, 1, 2].concat(u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(cs), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)), name);
        offset += local.length + name.length + data.length;
      });
      var cdSize = 0, cd = [];
      central.forEach(function (x) { var u = x instanceof Uint8Array ? x : new Uint8Array(x); cd.push(u); cdSize += u.length; });
      var end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0].concat(u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0)));
      return new Blob(parts.concat(cd, [end]), { type: 'application/zip' });
    }
  };
})();
