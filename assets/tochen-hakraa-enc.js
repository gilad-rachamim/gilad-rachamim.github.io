/* הקראה בקול אנושי – המרת קול גולמי ל-MP3 ברקע (Web Worker), כדי שהדף לא ייתקע בזמן ההמרה.
   מקבל: {id, pcm: ArrayBuffer של Int16, sr}. מחזיר: {id, blob} או {id, error}. */
importScripts('/assets/vendor/lamejs/lame.min.js');
self.onmessage = function (e) {
  var d = e.data;
  try {
    var s = new Int16Array(d.pcm), enc = new self.lamejs.Mp3Encoder(1, d.sr || 24000, 48), out = [], B = 1152;
    for (var i = 0; i < s.length; i += B) {
      var b = enc.encodeBuffer(s.subarray(i, i + B));
      if (b.length) out.push(new Uint8Array(b));
    }
    var f = enc.flush();
    if (f.length) out.push(new Uint8Array(f));
    self.postMessage({ id: d.id, blob: new Blob(out, { type: 'audio/mpeg' }), sec: s.length / (d.sr || 24000) });
  } catch (err) {
    self.postMessage({ id: d.id, error: String(err && err.message || err) });
  }
};
