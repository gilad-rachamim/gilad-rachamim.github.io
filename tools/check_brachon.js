// בדיקה: מה שהברכון מדפיס זהה מילה במילה לנוסח מספריא (tools/brachon-source.json).
// מריצים: node tools/check_brachon.js
// לכל ברכון, לכל נוסח ולכל צירוף (עם/בלי הרחמן לברית): הטקסט של כל מקטע, בלי תגיות,
// שווה בדיוק לטקסט המקור בלי תגיות, כשההבדל היחיד הוא שם ה' (יְהֹוָה / יְיָ / יי ← ה'). שום מקטע לא חסר ולא נוסף.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/brachon-data.js'), 'utf8'), ctx);
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/brachon.js'), 'utf8'), ctx);
const SRC = JSON.parse(fs.readFileSync(path.join(__dirname, 'brachon-source.json'), 'utf8'));
const W = ctx.window, BUILD = W.BRACHON_BUILD, KINDS = W.BRACHON_KINDS;
const plain = s => s.replace(/<[^>]+>/g, ' ').replace(/[ \t ]+/g, ' ').trim();
// שם ה' – כתוב כאן שוב, בנפרד מ-gen_brachon.py, כדי שהבדיקה לא תסמוך על אותו קוד
const LET = /[א-ת]/;
function fixName(w) {
  const idx = [...w].map((c, i) => LET.test(c) ? i : -1).filter(i => i >= 0), cons = idx.map(i => [...w][i]).join('');
  for (const core of ['יהוה', 'יי']) {
    if (!cons.endsWith(core)) continue;
    const pre = cons.slice(0, cons.length - core.length);
    if (pre.length <= 2 && [...pre].every(c => 'ובלכמש'.includes(c))) return [...w].slice(0, idx[pre.length]).join('') + "ה'";
  }
  return w;
}
const srcText = s => plain(s).replace(/[א-ת֑-ֽֿ-ׇ‑]+/g, fixName);
let bad = 0, n = 0, segs = 0;
// חור במקור: 4 מקטעים ריקים ברצף ומעלה = קטע שחסר בספריא (כך נעלם סוף ברכת המזון ב"תורת אמת"). בודקים כל נוסח שהברכון משתמש בו.
const used = new Set(); for (const kind of Object.keys(KINDS)) for (const nus of Object.keys(KINDS[kind].n)) for (const brit of [false, true]) BUILD(kind, nus, { brit }).secs.forEach(s => used.add(s.key));
for (const k of used) { let run = 0; for (const t of SRC[k].text) { run = (typeof t === 'string' && !plain(t)) ? run + 1 : 0; if (run === 4) { console.log('חור במקור (4+ מקטעים ריקים ברצף):', k); bad++; } } }
for (const kind of Object.keys(KINDS)) for (const nus of Object.keys(KINDS[kind].n)) for (const brit of [false, true]) {
  const b = BUILD(kind, nus, { brit }); n++;
  for (const s of b.secs) {
    const want = SRC[s.key].text.filter(t => typeof t === 'string').map(srcText).filter(Boolean);
    const got = s.segs.map(plain).filter(Boolean);
    if (want.length !== got.length) { console.log('מספר מקטעים שונה:', kind, nus, s.key, want.length, got.length); bad++; continue; }
    want.forEach((w, i) => { segs++; if (w !== got[i]) { console.log('לא זהה למקור:', kind, nus, s.key, i, '\n  מקור:', w.slice(0, 120), '\n  כלי: ', got[i].slice(0, 120)); bad++; } });
    for (const g of got) if (/יְהֹוָה|יְהוָה|יהוה|יְיָ|(^|\s)יי(\s|$)|יְ‑יָ/.test(g)) { console.log('נשאר שם ה\' מלא:', s.key, g.slice(0, 60)); bad++; }
  }
  if (!b.secs.length) { console.log('ברכון ריק:', kind, nus); bad++; }
}
console.log(bad ? 'נכשל: ' + bad : 'עבר: ' + n + ' צירופים, ' + segs + ' מקטעים, הטקסט זהה למקור (חוץ משם ה\' שנכתב ה\')');
process.exit(bad ? 1 : 0);
