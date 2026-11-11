// מדמה שיחות לימות המשיח: כל צעד מוסיף את מה ש"הוקש" ומדפיס את מה שהשרת עונה.
import { _decide as decide } from './phone-worker.js';
function run(title, steps) {
  console.log('\n=== ' + title);
  const v = { ApiPhone: '0500000000', ApiDID: '0790000000', ApiExtension: '', ApiCallId: 'x' };
  let out = decide(v).text; console.log('> ' + out);
  for (const [k, val] of steps) { v[k] = val; out = decide(v).text; console.log(`[${k}=${val}] > ` + out); }
}
run('זמני היום ירושלים', [['m0', '1'], ['c0', '1']]);
run('תאריך + חגים', [['m0', '2']]);
run('ברית', [['m0', '3'], ['k0', '1'], ['d0', '07112026'], ['a0', '2']]);
run('בר מצווה אדר', [['m0', '3'], ['k0', '2'], ['d0', '05032014'], ['a0', '1']]);
run('יארצייט', [['m0', '3'], ['k0', '4'], ['d0', '01012020'], ['a0', '2']]);
run('תאריך לא תקין', [['m0', '3'], ['k0', '1'], ['d0', '99999999']]);
run('שבת בני ברק ואחר כך סבב שני', [['m0', '4'], ['c0', '2'], ['m1', '1'], ['c1', '7'], ['m2', '0']]);
run('הודעה', [['m0', '5'], ['r0', 'yes']]);
run('דף יומי', [['m0', '6']]);
run('חנוכה ירושלים', [['m0', '7'], ['c0', '1']]);
// שלוחה 8 – חדשות (סיכום לדוגמה; בשרת מגיע מ-kelim-news)
{
  const ed = { name: 'בוקר', time: '07:00', date: { day: 'שני' }, sections: { main: [{ text: 'הריבית ירדה ל-4.5% – כך הודיע הבנק.' }, { text: 'נקודה שנייה, עם "מירכאות".' }], haredi: [{ text: 'כנס גדול בבני ברק.' }], economy: [] } };
  const v = { m0: '8' };
  console.log('\n=== חדשות\n> ' + decide(v, '', ed).text);
  console.log('> בלי שרת: ' + decide(v, '', null).text);
}
