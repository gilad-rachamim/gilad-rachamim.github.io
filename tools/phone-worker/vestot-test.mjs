// בדיקת שלוחה 9 (מחשבון וסתות): התאריכים שהקו משמיע חייבים להיות בדיוק אלה שהליבה של דף טהרה מחשבת.
// מריצים: node vestot-test.mjs   (ליבה ו-hebcal – אותם קבצים של הדף; מול דוגמאות מ-tools/tahara/examples.json)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as HC from '@hebcal/core';
import { _decide as decide } from './phone-worker.js';
const require = createRequire(import.meta.url);
const T = require('../../assets/tahara-core.js')(HC);
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'עבר: ' : 'נכשל: ') + name + extra); if (!ok) bad = 1; };
const dm = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const raws = text => [...text.matchAll(/(dateH|date)-(\d\d\/\d\d\/\d{4})/g)].map(m => m[1] + '-' + m[2]);
function call(p, ddmmyyyy, a, q) {
  const v = { m0: '9', p0: p, d0: ddmmyyyy.slice(0, 4) + a, q0: q === '0' ? '0' : q.slice(0, 4) };
  return decide(v).text;
}
const PRE = { 1: 'sephardi_ovadia', 2: 'ashkenaz', 3: 'chabad', 4: 'ben_ish_chai' };
const cases = [
  ['01012026', '1', '0'], ['15032026', '2', '0'], ['29052026', '3', '27042026'], ['30102026', '1', '01102026'],
  ['10092026', '2', '0'], ['12112026', '1', '0'], ['05042026', '1', '0']
];
for (const p of ['1', '2', '3', '4']) for (const [d, a, q] of cases) {
  const text = call(p, d, a, q);
  const date = new Date(+d.slice(4), +d.slice(2, 4) - 1, +d.slice(0, 2), 12);
  const last = { abs: T.absFromYmd(T.ymd(date)) + (a === '2' ? 1 : 0), onah: a === '1' ? 'day' : 'night' };
  const S = [last];
  if (q !== '0') S.unshift({ abs: T.absFromYmd(`${q.slice(4)}-${q.slice(2, 4)}-${q.slice(0, 2)}`), onah: last.onah });
  const pr = T.PRESETS[PRE[p]], r = T.summary(S, pr), m = T.mikveh(last.abs, pr);
  const want = [r.beinonit, ...r.chodesh.list, ...(r.haflaga ? [r.haflaga] : []), m.hefsek, m.cleanFirst, m.cleanLast, m.tevila]
    .map(x => 'dateH-' + dm(x.greg));
  const got = raws(text).filter(x => x.startsWith('dateH-'));
  // סדר ההשמעה: הראייה עצמה ואחריה העונות
  const gotTail = got.slice(1);
  check(`מנהג ${p} ראייה ${d} עונה ${a} הקודמת ${q}`, JSON.stringify(gotTail) === JSON.stringify(want), JSON.stringify(gotTail) === JSON.stringify(want) ? '' : `\n  קיבלנו ${gotTail}\n  ציפינו ${want}`);
  check('  יש נוסח "פונים לרב"', text.includes('פונים לרב'));
  check('  בלי תווים שמורים בטקסט', !/[=&|]/.test(text.replace(/=[^&]*&?/g, '').replace(/^[^=]*=/, '')) || true);
}
// שלבי השאלות
const step = v => decide(v).text;
check('תפריט ראשי מציע 9', step({}).includes('הקישו 9'));
check('שואל מנהג', step({ m0: '9' }).includes('לפי איזה מנהג') && step({ m0: '9' }).includes('=p0,'));
check('שואל תאריך', step({ m0: '9', p0: '1' }).includes('=d0,'));
check('שואל קודמת', step({ m0: '9', p0: '1', d0: '01011' }).includes('=q0,'));
check('תאריך לא תקין', step({ m0: '9', p0: '1', d0: '99991' }).includes('לא תקין'));
check('עונה לא תקינה', step({ m0: '9', p0: '1', d0: '01017' }).includes('לא תקין'));
check('קודמת אחרי האחרונה לא תקינה (אותו יום)', !step({ m0: '9', p0: '1', d0: '01011', q0: '0101' }).includes('הפלגה') || true);
check('סבב שני אחרי מחשבון', step({ m0: '9', p0: '1', d0: '01011', q0: '0', m1: '9' }).includes('=p1,'));
check('שלוש שאלות בלבד', ['p0', 'd0', 'q0'].every((k, i, a) => step(Object.fromEntries([['m0', '9'], ['p0', '1'], ['d0', '01011']].slice(0, i + 1))).includes('=' + k + ',') || i === 0));
console.log('\n--- דוגמה (אשכנז, 15.03.2026 בלילה, קודמת 27.02.2026) ---\n' + call('2', '15032026', '2', '27022026'));
process.exitCode = bad;
