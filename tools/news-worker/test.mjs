// בדיקה במחשב: node test.mjs  (מקורות RSS אמיתיים, שבת/חג, סינון כשר, בדיקת מספרים, ריצה במצב כותרות)
import assert from 'node:assert';
import worker, { SOURCES, parseRss, kosher, numbersOk, holyNow, holyEndedAt, shabbatDue, editionText, runEdition, gershayim, tidy, FOREIGN, fixOk } from './news-worker.js';

// שבת/חג (זמן UTC; ישראל +2 בחורף)
assert.equal(holyNow(new Date('2026-11-13T10:00:00Z')), false, 'שישי בבוקר – לא שבת');
assert.equal(holyNow(new Date('2026-11-13T16:00:00Z')), true, 'שישי 18:00 – כבר שבת');
assert.equal(holyNow(new Date('2026-11-14T12:00:00Z')), true, 'שבת בצהריים');
assert.equal(holyNow(new Date('2026-11-14T18:00:00Z')), false, 'מוצ"ש 20:00 – אחרי הבדלה');
assert.equal(holyNow(new Date('2026-11-10T05:00:00Z')), false, 'יום שלישי רגיל');
assert.equal(holyNow(new Date('2027-04-22T06:00:00Z')), true, 'פסח 2027 – יום טוב ראשון');
assert.equal(holyNow(new Date('2027-07-17T17:10:00Z')), true, 'שבת בקיץ 20:10 – עדיין שבת');
console.log('✓ שבת וחג');

// מהדורת מוצאי שבת: חלון 35-100 דקות אחרי ההבדלה, ובכל שעון (חורף וקיץ) יש cron של דקה 45 בתוכו
assert.ok(holyEndedAt(new Date('2026-11-14T18:00:00Z')), 'מוצ"ש – יש הבדלה');
assert.equal(holyEndedAt(new Date('2026-11-13T10:00:00Z')), null, 'שישי – אין');
assert.equal(shabbatDue(new Date('2026-11-14T15:45:00Z')), false, 'חורף 17:45 – מוקדם מדי (הבדלה ~17:30)');
assert.equal(shabbatDue(new Date('2026-11-14T16:45:00Z')), true, 'חורף 18:45 – בחלון');
assert.equal(shabbatDue(new Date('2026-11-14T18:45:00Z')), false, 'חורף 20:45 – מאוחר מדי');
assert.equal(shabbatDue(new Date('2027-07-17T18:45:00Z')), true, 'קיץ 21:45 – בחלון');
assert.equal(shabbatDue(new Date('2027-07-17T17:45:00Z')), false, 'קיץ 20:45 – מוקדם מדי');
for (const [d, label] of [['2026-11-14', 'חורף'], ['2027-07-17', 'קיץ'], ['2027-01-09', 'חורף2']]) {
  const hits = [15, 16, 17, 18, 19].filter(h => shabbatDue(new Date(`${d}T${h}:45:00Z`)));
  assert.equal(hits.length, 1, 'בדיוק ריצה אחת במוצ"ש ' + label + ': ' + hits);
}
// זנב העברה וקבוצה
const ed0 = { name: 'בוקר', date: { day: 'שני', he: 'כ״ד' }, sections: { main: [{ text: 'נקודה אחת', sources: [] }], good: [{ text: 'חדשה טובה', sources: [] }] } };
const t1 = editionText(ed0, { wag: 'https://chat.whatsapp.com/ABCDEFGHIJ' }, 'wa');
assert.ok(t1.includes('https://chat.whatsapp.com/ABCDEFGHIJ') && t1.includes('אפשר להעביר לו'), 'זנב ההעברה וקישור הקבוצה');
assert.ok(t1.includes('חדשות טובות מהשבוע') && t1.includes('חדשה טובה'), 'קטע חדשות טובות');
assert.ok(!editionText(ed0, { wag: 'https://chat.whatsapp.com/ABCDEFGHIJ' }, 'wag').includes('chat.whatsapp.com'), 'בקבוצה עצמה אין קישור הצטרפות');
assert.ok(editionText(ed0, {}, 'tg').includes('אפשר להעביר לו'), 'זנב גם בלי קבוצה');
console.log('✓ מוצאי שבת וזנב העברה');

assert.equal(kosher('הממשלה אישרה את התקציב'), true);
assert.equal(kosher('חשד לתקיפה מינית בעיר'), false);
assert.equal(kosher('אדם נרצח בקטטה'), false);
assert.equal(kosher('פיגוע דקירה: מחבל נוטרל'), true);
assert.equal(kosher('ידיעה', 'https://www.ynet.co.il/sport/article/x'), false);
assert.equal(numbersOk('המחיר עלה ב-5%', 'מחיר הלחם עלה ב-5% מחר'), true);
assert.equal(numbersOk('המחיר עלה ב-7%', 'מחיר הלחם עלה ב-5% מחר'), false);
assert.equal(numbersOk('1,200 שקל', 'סכום של 1200 שקל'), true);
console.log('✓ סינון ומספרים');

// גרשיים (זצ"ל נקטע ל"זצ" לפני התיקון), שפה זרה, ותיקון של הבודק
assert.equal(gershayim('הגאון זצ"ל בחב"ד'), 'הגאון זצ״ל בחב״ד');
assert.equal(gershayim('אמר "שלום" לכולם'), 'אמר "שלום" לכולם');
assert.equal(tidy('לפי דיווח בבחדרי חרדים, נפתח'), 'לפי דיווח באתר בחדרי חרדים, נפתח');
assert.equal(FOREIGN.test('ועל פי דיווחים זденти פגיעות'), true);
assert.equal(FOREIGN.test('צה״ל, 5% ו-ynet'), false);
assert.equal(fixOk('הכנסת ה-26 נפתחת בטקס שבו 120 חברי הכנסת מצהירים אמונים.', 'הכנסת ה-26 נפתחת 120 חברי הכנסת'), true);
assert.equal(fixOk('הכנסת ה-27 נפתחת בטקס חגיגי ומרשים מאוד.', 'הכנסת ה-26'), false);
assert.equal(fixOk('אבל בקהילת חב', 'x'), false);
console.log('✓ גרשיים, שפה זרה ותיקונים');

// מקורות אמיתיים
let total = 0;
for (const s of SOURCES) {
  try {
    const r = await fetch(s[3], { headers: { 'user-agent': 'Mozilla/5.0 (kelim-news)' } });
    const items = parseRss(await r.text(), s);
    const kept = items.filter(x => kosher(x.title + ' ' + x.desc, x.link));
    total += kept.length;
    console.log(`${r.status} ${s[1]}: ${items.length} ידיעות, ${kept.length} עברו סינון. דוגמה: ${kept[0]?.title?.slice(0, 60)}`);
  } catch (e) { console.log('✗', s[1], e.message); }
}
assert.ok(total > 10, 'מעט מדי ידיעות'); // ברשת סלולרית חלק מהאתרים לא עונים מ-Node; בשרת כולם עונים

// ריצה מלאה במצב כותרות עם אחסון מדומה
const mem = {};
const fakeStore = { fetch: async (url, init) => {
  const path = new URL(url).pathname, body = init?.body ? JSON.parse(init.body) : null;
  if (path === '/latest') return Response.json(mem.latest || {});
  if (path === '/save') { mem.latest = body; return Response.json({ ok: true }); }
  return Response.json({});
} };
const env = { STORE: { idFromName: () => 1, get: () => fakeStore }, ADMIN_KEY: 't' };
const r = await runEdition(env, { force: true });
console.log(JSON.stringify(r));
assert.equal(mem.latest.mode, 'titles');
assert.ok(mem.latest.sections.main.length >= 1);
console.log(mem.latest.name, mem.latest.date, mem.latest.sections.main.map(x => x.text.slice(0, 50)));
const res = await worker.fetch(new Request('https://x/latest'), env, { waitUntil() {} });
assert.equal(res.headers.get('access-control-allow-origin'), '*');
console.log('✓ הכול עבר');
