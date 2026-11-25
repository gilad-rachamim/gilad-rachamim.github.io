// בדיקות יחידה לליבת מחשבון פיצויי פיטורין: node tools/test_pitzuyim.js
const assert = require('assert');
const P = require('../assets/kesef-pitzuyim.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('✓', name); };
const near = (a, b, e = 0.01) => assert.ok(Math.abs(a - b) <= e, a + ' != ' + b);

t('תקופה: שנה מלאה כולל יום סיום', () => { const p = P.period('2024-01-01', '2024-12-31'); assert.deepStrictEqual([p.y, p.m, p.d], [1, 0, 0]); near(p.years, 1); });
t('תקופה: 3 שנים, 4 חודשים, 10 ימים', () => { const p = P.period('2020-03-01', '2023-07-10'); assert.deepStrictEqual([p.y, p.m, p.d], [3, 4, 10]); });
t('תקופה: מעבר בין חודשים עם ימים', () => { const p = P.period('2023-01-31', '2023-03-15'); assert.deepStrictEqual([p.y, p.m, p.d], [0, 1, 13]); });
t('תקופה: סיום לפני התחלה', () => assert.ok(P.period('2024-02-01', '2024-01-01').error));
t('תאריך לא קיים', () => assert.ok(P.period('2024-02-31', '2024-03-01').error));

t('הודעה מוקדמת חודשי: 4 חודשים=4 ימים', () => assert.strictEqual(P.noticeDays(4, true), 4));
t('הודעה מוקדמת חודשי: 9 חודשים=13.5', () => assert.strictEqual(P.noticeDays(9, true), 13.5));
t('הודעה מוקדמת חודשי: 11 חודשים=18.5', () => assert.strictEqual(P.noticeDays(11, true), 18.5));
t('הודעה מוקדמת חודשי: שנה=30', () => assert.strictEqual(P.noticeDays(12, true), 30));
t('הודעה מוקדמת שעתי: 8 חודשים=8', () => assert.strictEqual(P.noticeDays(8, false), 8));
t('הודעה מוקדמת שעתי: שנה שנייה 14+1 לכל שני חודשים', () => { assert.strictEqual(P.noticeDays(12, false), 14); assert.strictEqual(P.noticeDays(17, false), 16); });
t('הודעה מוקדמת שעתי: שנה שלישית', () => { assert.strictEqual(P.noticeDays(24, false), 21); assert.strictEqual(P.noticeDays(30, false), 24); });
t('הודעה מוקדמת שעתי: 3 שנים=30', () => assert.strictEqual(P.noticeDays(36, false), 30));

const base = { reason: 'fired', start: '2020-01-01', end: '2024-12-31', payType: 'monthly', salary: 10000, sec14: 'none' };
t('פיטורים חודשי: 5 שנים × 10,000 = 50,000', () => { const r = P.calc(base); assert.ok(r.ok && r.eligible); near(r.full, 50000); near(r.payable, 50000); });
t('פחות משנה: אין זכאות', () => { const r = P.calc({ ...base, start: '2024-06-01', end: '2024-12-31' }); assert.ok(r.ok && !r.eligible); assert.strictEqual(r.full, 0); });
t('התפטרות רגילה: אין פיצויים', () => { const r = P.calc({ ...base, reason: 'resign' }); assert.strictEqual(r.full, 0); });
t('התפטרות בדין מפוטר: מלא', () => { const r = P.calc({ ...base, reason: 'resign_equiv' }); near(r.full, 50000); });
t('שנה וחצי חלקית: 1.5 שנים', () => { const r = P.calc({ ...base, start: '2023-01-01', end: '2024-06-30' }); near(r.period.years, 1.5, 0.001); near(r.full, 15000, 5); });
t('שעתי: 50 ₪ × 160 שעות', () => { const r = P.calc({ ...base, payType: 'hourly', hourlyRate: 50, hoursPerMonth: 160, salary: undefined }); near(r.basis, 8000); near(r.full, 40000); near(r.noticeDays, 30); });
t('משתנה: ממוצע 12 חודשים', () => { const m = [8000, 12000, 10000, 10000, 9000, 11000, 10000, 10000, 10000, 10000, 10000, 10000]; const r = P.calc({ ...base, payType: 'variable', months: m }); near(r.basis, 10000); });
t('משתנה: חודשים ריקים לא מורידים ממוצע', () => { const r = P.calc({ ...base, payType: 'variable', months: [10000, 12000, 0, 0] }); near(r.basis, 11000); });
t('שינוי היקף משרה: ממוצע 50% מול 100% אחרון', () => { const r = P.calc({ ...base, scopeChanged: true, scopeAvg: 50, scopeLast: 100 }); near(r.full, 25000); });
t('סעיף 14 מלא מתחילת העבודה: 0 לתשלום', () => { const r = P.calc({ ...base, sec14: 'full' }); near(r.payable, 0); near(r.deposited, 50000); });
t('סעיף 14 מלא מאמצע התקופה: חצי', () => { const r = P.calc({ ...base, sec14: 'full', sec14Start: '2022-07-02' }); near(r.payable, 50000 - 10000 * 2.5, 100); });
t('הפרשה 6%: משלימים כ-28%', () => { const r = P.calc({ ...base, sec14: 'six' }); near(r.payable, 50000 * (1 - 6 / 8.33), 5); });
t('הודעה מוקדמת לא ניתנה: חודש שכר', () => { const r = P.calc(base); near(r.noticePay, 10000); });
t('הודעה מוקדמת ניתנה במלואה', () => { const r = P.calc({ ...base, noticeGiven: 30 }); assert.strictEqual(r.noticePay, 0); });
t('פטור ממס: מוגבל לתקרה', () => { const r = P.calc(base); near(r.taxExempt, 13750 < 10000 ? 0 : 50000); const r2 = P.calc({ ...base, salary: 20000 }); near(r2.taxExempt, 13750 * 5, 1); near(r2.taxable, 100000 - 68750, 1); });
t('חסר שכר', () => assert.ok(P.calc({ ...base, salary: 0 }).error));
console.log(n + ' בדיקות עברו');
