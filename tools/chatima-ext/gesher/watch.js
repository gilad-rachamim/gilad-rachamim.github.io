/* גשר – זיהוי שדה קוד אימות שנפתח בדף (רץ בכל אתר רק אחרי שהטלפון צומד ונתתם הרשאה לכל האתרים).
 * רק אומר לתוסף "יש עכשיו שדה קוד בכרטיסייה הזאת" / "כבר אין". לא קורא שום טקסט מהדף ולא שולח אותו לשום מקום.
 * המילוי עצמו נעשה מה-service worker (gesher/link.js) כשהקוד מגיע מהטלפון.
 */
(function () {
  'use strict';
  if (window.__hkGesherWatch) return;
  window.__hkGesherWatch = true;
  var RX = /one.?time|otp|code|pin|verif|token|2fa|mfa|קוד|אימות|סיסמה חד|סיסמא חד/i;
  var NO = /search|query|chat|message|comment|email|user|login|phone|card|cvv|amount|חיפוש|הודעה|טלפון|מייל|כרטיס/i;
  var open = false, t = null;

  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; }
  function isCode(el) {
    if (el.disabled || el.readOnly) return false;
    var ty = (el.type || 'text').toLowerCase();
    if (ty !== 'text' && ty !== 'tel' && ty !== 'number') return false;
    if ((el.autocomplete || '').indexOf('one-time-code') >= 0) return visible(el);
    var w = [el.name, el.id, el.placeholder, el.getAttribute('aria-label')].join(' ');
    if (el.labels) for (var i = 0; i < el.labels.length; i++) w += ' ' + el.labels[i].textContent;
    return RX.test(w) && !NO.test(w) && visible(el);
  }
  function scan() {
    var ins = document.querySelectorAll('input');
    var now = false, singles = 0;
    for (var i = 0; i < ins.length && !now; i++) {
      var el = ins[i];
      if (el.maxLength === 1 && (el.type === 'text' || el.type === 'tel' || el.type === 'number') && visible(el)) singles++;
      else if (isCode(el)) now = true;
    }
    if (!now && singles >= 4 && singles <= 10) now = true;
    if (now !== open) {
      open = now;
      try { chrome.runtime.sendMessage({ t: 'gesher-field', open: now }); } catch (e) {}
    }
  }
  function soon() { clearTimeout(t); t = setTimeout(scan, 400); }
  scan();
  new MutationObserver(soon).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  // פוקוס בשדה קוד: מודיעים שוב, כדי שהכרטיסייה האחרונה שבה מחכים לקוד היא זו שתקבל אותו
  var lastPing = 0;
  document.addEventListener('focusin', function (e) {
    soon();
    var el = e.target;
    if (!(el instanceof HTMLInputElement) || !(isCode(el) || el.maxLength === 1) || Date.now() - lastPing < 3000) return;
    lastPing = Date.now(); open = true;
    try { chrome.runtime.sendMessage({ t: 'gesher-field', open: true }); } catch (x) {}
  }, true);
  window.addEventListener('pagehide', function () { if (open) try { chrome.runtime.sendMessage({ t: 'gesher-field', open: false }); } catch (e) {} });
})();
