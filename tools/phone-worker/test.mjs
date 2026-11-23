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
run('הודעה', [['m0', '5'], ['h0', '2'], ['r0', 'yes']]);
run('עזרה באימות אייפון אתגר תמונות', [['m0', '5'], ['h0', '1'], ['e0', '3'], ['s0', '2']]);
run('עזרה באימות וינדוס תיבת סימון', [['m0', '5'], ['h0', '1'], ['e0', '1'], ['s0', '1']]);
run('דף יומי', [['m0', '6']]);
run('חנוכה ירושלים', [['m0', '7'], ['c0', '1']]);
// לא הוקש כלום אחרי תשובת כלי (ימות שולחים None): לא חוזרים על התשובה, ובפעם השנייה ברצף מסיימים
{
  const v = { m0: '4', c0: '1' };
  const answer = decide(v).text;
  v.m1 = 'None'; const t1 = decide(v).text;
  v.m2 = 'None'; const t2 = decide(v).text;
  const ok = answer.includes('1,Ok,None') && !t1.includes('ירושלים') && t1.includes('לכלי נוסף') && t1.includes('=m2,')
    && t2.includes('go_to_folder=hangup') && decide({ m0: '' }).text.includes('=m1,');
  console.log('\n=== לא הוקש כלום\n[m1=None] > ' + t1 + '\n[m2=None] > ' + t2);
  if (!ok) { console.error('נכשל: לא הוקש כלום'); process.exitCode = 1; } else console.log('עבר');
}
// שלוחה 8 – חדשות (סיכום לדוגמה; בשרת מגיע מ-kelim-news)
{
  const ed = { name: 'בוקר', time: '07:00', date: { day: 'שני' }, sections: { main: [{ text: 'הריבית ירדה ל-4.5% – כך הודיע הבנק.' }, { text: 'נקודה שנייה, עם "מירכאות".' }], haredi: [{ text: 'כנס גדול בבני ברק.' }], economy: [] } };
  const v = { m0: '8' };
  console.log('\n=== חדשות\n> ' + decide(v, '', ed).text);
  console.log('> בלי שרת: ' + decide(v, '', null).text);
  // 18.11.2026: חתיכות קצרות – הראשונה read עם המתנה של שנייה, האחרונה מסתיימת בתפריט; סופרים רק פעם אחת
  const ed5 = { name: 'ערב', time: '20:00', date: { day: 'רביעי' }, sections: { main: Array.from({ length: 5 }, (_, i) => ({ text: 'נקודה ארוכה מספר ' + (i + 1) + ' עם הרבה מילים כדי לבדוק את החלוקה לחתיכות קצרות שמתחילות מיד '.repeat(2) })), haredi: [], economy: [] } };
  const w = { m0: '8' }, seen = [];
  let o = decide(w, '', ed5), steps = 0;
  while (o.text.includes('=n0_') && steps < 20) { seen.push(o); w['n0_' + steps] = 'None'; steps++; o = decide(w, '', ed5); }
  const ok8 = steps >= 2 && seen[0].event === 'news' && seen[0].text.includes(',1,No,') && seen.slice(1).every(x => !x.event) && !o.event && o.text.includes('=m1,')
    && ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'].every(n => seen.concat(o).some(x => x.text.includes('t-' + n + '.')));
  console.log('חתיכות: ' + (steps + 1));
  if (!ok8) { console.error('נכשל: חלוקת החדשות'); process.exitCode = 1; } else console.log('עבר: חלוקת החדשות');
}
// עזרה באימות "אני לא רובוט": כל 24 השילובים נענים, בלי אותיות לטיניות (הקול של ימות לא קורא אותן) ובלי ספרות שבורות
{
  let bad = 0;
  for (let d = 1; d <= 4; d++) for (let s = 1; s <= 6; s++) {
    const t = decide({ m0: '5', h0: '1', e0: String(d), s0: String(s) }).text;
    const body = t.split('t-לכלי נוסף')[0].replace(/d-\d+/g, '');
    if (!t.includes('צעד ראשון') || /[A-Za-z]{2,}/.test(body.replace(/^read=/, ''))) { bad++; console.error('נכשל: מכשיר', d, 'מצב', s); }
  }
  if (bad) process.exitCode = 1; else console.log('\nעבר: עזרה באימות, 24 שילובים');
}
