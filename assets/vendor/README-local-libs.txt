Local copies of libraries that used to load from cdnjs / jsdelivr (09.11.2026).
Why: filtered "kosher" browsers (whitelist filters) often open only the site itself,
so a tool that needs a CDN would silently break. Files are unmodified; SHA-512 matches the old SRI.
- hebcal-bundle/hebcal-core-6.14.7.min.js  @hebcal/core 6.14.7 GPL-2.0-or-later https://github.com/hebcal/hebcal-es6
- html-to-image/html-to-image-1.11.11.js   MIT https://github.com/bubkoo/html-to-image
- sortablejs/Sortable-1.15.2.min.js        MIT https://github.com/SortableJS/Sortable
- jspdf/jspdf-2.5.1.umd.min.js             MIT https://github.com/parallax/jsPDF
- qrcodejs/qrcode-1.0.0.min.js             MIT https://github.com/davidshimjs/qrcodejs
- xlsx/xlsx-0.18.5.full.min.js             Apache-2.0 https://github.com/SheetJS/sheetjs
- sqljs/sql-wasm-1.10.3.js + .wasm         MIT https://github.com/sql-js/sql.js (SQLite in WebAssembly, for /kelim/tichnut/sql/)
- onnxruntime-web/ort.wasm.min.mjs + ort-wasm-simd-threaded.mjs/.wasm  onnxruntime-web 1.22.0  MIT https://github.com/microsoft/onnxruntime (10.11.2026, background removal in /kelim/tochen/studio/)
- isnet/isnet-general-use-q8.onnx          ISNet general-use (DIS, https://github.com/xuebinqin/DIS) Apache-2.0; from the rembg release, dynamically quantized to uint8 with onnxruntime.quantization (178MB -> 46MB). Not cached by sw.js; studio-bg-worker.js keeps it in Cache Storage.
