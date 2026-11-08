// בדיקה: הנוסח המרוקאי בכלי זהה מילה במילה לנוסח שהוקלד מהסידור.
// מריצים: node tools/check_maroko.js
// 1. במצב "מקור" כל נוסח מחזיר בדיוק את הטקסט שב-tools/maroko-misheberach-source.txt.
// 2. עם שם ועם כל צירוף של תוספות, כל מילה בפלט (חוץ מהשם) מופיעה בנוסח המקור, באותו סדר, ושום מילה לא שונתה.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/misheberach-maroko.js'), 'utf8'), ctx);
const MR = ctx.window.MB_MAROKO, TPL = ctx.window.MB_MAROKO_TPL;
const src = {}; let cur = null;
for (const line of fs.readFileSync(path.join(__dirname, 'maroko-misheberach-source.txt'), 'utf8').split(/\r?\n/)) {
  if (line.startsWith('## ')) { cur = line.slice(3).trim(); src[cur] = []; }
  else if (cur && line.trim()) src[cur].push(line.trim());
}
let bad = 0, runs = 0;
const words = s => s.replace(/[.,:()]/g, ' ').split(/\s+/).filter(Boolean);
const NAME = 'יעקב_בדיקה';
for (const k of Object.keys(src)) {
  const want = src[k].join('\n');
  if (!MR[k]) { console.log('חסר בכלי:', k); bad++; continue; }
  if (TPL(MR[k], true) !== want) { console.log('לא זהה למקור:', k); bad++; }
  if (/יְיָ|יי/.test(want)) { console.log('נשאר יי ולא ה\':', k); bad++; }
  const keys = ['sh', 'yt', 'rh', 'yol', 'gadol'];
  for (let mask = 0; mask < 32; mask++) {
    const opts = {}; keys.forEach((c, i) => { opts[c] = !!(mask & (1 << i)); });
    const out = TPL(MR[k], false, c => opts[c], () => NAME).replace(/^\n+/, ''); runs++;
    const sw = words(want), ow = words(out).filter(w => w !== NAME);
    let j = 0;
    for (const w of ow) { while (j < sw.length && sw[j] !== w) j++; if (j >= sw.length) { console.log('מילה שלא במקור:', k, w, opts); bad++; break; } j++; }
    if (/[{}|]/.test(out)) { console.log('נשאר סימון:', k); bad++; }
    if (/\(שם/.test(want) && out.indexOf(NAME) < 0) { console.log('השם לא נכנס:', k); bad++; }
    if (/ ,|  |\( |,,/.test(out)) { console.log('רווח או פסיק כפול:', k, JSON.stringify(opts)); bad++; }
  }
}
console.log(bad ? 'נכשל: ' + bad : 'עבר: ' + Object.keys(src).length + ' נוסחים, ' + runs + ' צירופים, הפלט זהה למקור');
process.exit(bad ? 1 : 0);
