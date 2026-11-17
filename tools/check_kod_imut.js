// בדיקת מנוע קוד האימות מול כל הדוגמאות: node tools/check_kod_imut.js
// עובר רק אם 100% מהקודים נמצאו נכון ואין אף קוד במלכודות.
var path = require('path');
var K = require(path.join(__dirname, '..', 'assets', 'kod-imut.js'));
var data = require(path.join(__dirname, 'data', 'kod-imut-samples.json')).samples;
var ok = 0, bad = [], codes = 0, traps = 0, links = 0;
data.forEach(function (s, i) {
  var r = K.detect(s.text);
  var got = r && r.code ? r.code : null;
  var gotLink = r && r.link ? r.link : null;
  var pass = got === s.code && (!s.link || gotLink === s.link);
  if (s.code) codes++; else if (s.link) links++; else traps++;
  if (pass) ok++; else bad.push('#' + i + ' expected ' + JSON.stringify(s.code) + (s.link ? ' link ' + s.link : '') + ' got ' + JSON.stringify(got) + (gotLink ? ' link ' + gotLink : '') + ' :: ' + s.text.slice(0, 70).replace(/\n/g, ' '));
});
console.log('codes ' + codes + ', links ' + links + ', traps ' + traps + ' -> pass ' + ok + '/' + data.length);
bad.forEach(function (b) { console.log('FAIL ' + b); });
process.exit(bad.length ? 1 : 0);
