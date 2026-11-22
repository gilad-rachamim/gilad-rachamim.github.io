/* גשר – אחסון מקומי בתוך התוסף (IndexedDB). משותף לדף הצימוד ול-service worker.
 * המפתחות נשמרים כ-CryptoKey שלא ניתן לחלץ: גם קוד שרץ בתוסף לא יכול לקרוא את הבתים שלהם.
 * שום דבר מכאן לא נשלח לשרת.
 */
(function (root) {
  'use strict';
  var DB = 'hk-gesher', ST = 'kv', dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(ST); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { dbp = null; rej(r.error); };
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(ST, mode), s = t.objectStore(ST), out;
        var r = fn(s);
        if (r) r.onsuccess = function () { out = r.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
    });
  }
  root.GesherStore = {
    get: function (k) { return tx('readonly', function (s) { return s.get(k); }); },
    set: function (k, v) { return tx('readwrite', function (s) { return s.put(v, k); }); },
    del: function (k) { return tx('readwrite', function (s) { return s.delete(k); }); },
    clear: function () { return tx('readwrite', function (s) { return s.clear(); }); }
  };
})(typeof self !== 'undefined' ? self : this);
