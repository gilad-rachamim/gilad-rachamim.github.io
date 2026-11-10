// בדיקה במחשב: node test.mjs  (בלי רשת)
import assert from 'node:assert';
import { compile, runCheck, parseVars } from './check.js';
import worker from './poter-worker.js';

const ev = (s, env) => compile(s)(env || {});
assert.equal(ev('2x^2', { x: 3 }), 18);
assert.equal(ev('-x^2', { x: 3 }), -9);
assert.ok(Math.abs(ev('e^(ln(5))') - 5) < 1e-12);
assert.ok(Math.abs(ev('sin(30)', { $deg: true }) - 0.5) < 1e-12);
assert.ok(Math.abs(ev('\\frac{1}{2}+\\sqrt{4}') - 2.5) < 1e-12);
assert.equal(ev('(-8)^(1/3)'), -2);
assert.equal(ev('3(x+1)', { x: 1 }), 6);
assert.equal(ev('|x-5|', { x: 1 }), 4);
assert.equal(ev('ncr(5,2)'), 10);
assert.equal(ev('log(2, 8)'), 3 / 1 * 1 === 3 ? Math.log(8) / Math.log(2) : 0);
assert.equal(parseVars('x=2; y=-1/2').y, -0.5);

// הצבת פתרון: x^2-6x+ln(x) – קיצון ב-(3+sqrt(7))/2
assert.equal(runCheck({ kind: 'equal', expr: '2*x-6+1/x', expr2: '0', vars: 'x=(3+sqrt(7))/2' }).pass, true);
assert.equal(runCheck({ kind: 'equal', expr: '2*x-6+1/x', expr2: '0', vars: 'x=3' }).pass, false);
// תשובה מעוגלת
assert.equal(runCheck({ kind: 'equal', expr: 'sqrt(8)', expr2: '2.83' }).pass, true);
assert.equal(runCheck({ kind: 'equal', expr: 'sqrt(8)', expr2: '2.85' }).pass, false);
// נגזרת
assert.equal(runCheck({ kind: 'derivative', expr: 'x^3*ln(x)', expr2: '3*x^2*ln(x)+x^2', a: '0.1', b: '5' }).pass, true);
assert.equal(runCheck({ kind: 'derivative', expr: 'x^3*ln(x)', expr2: '3*x^2*ln(x)', a: '0.1', b: '5' }).pass, false);
assert.equal(runCheck({ kind: 'derivative', expr: 'e^(2*x)/(x^2+1)', expr2: '(2*e^(2*x)*(x^2+1)-2*x*e^(2*x))/(x^2+1)^2' }).pass, true);
// אינטגרל
assert.equal(runCheck({ kind: 'integral', expr: 'x^2', a: '0', b: '3', expr2: '9' }).pass, true);
assert.equal(runCheck({ kind: 'integral', expr: '1/x', a: '1', b: 'e', expr2: '1' }).pass, true);
assert.equal(runCheck({ kind: 'integral', expr: 'sin(x)', a: '0', b: 'pi', expr2: '3' }).pass, false);
// זהות
assert.equal(runCheck({ kind: 'identity', expr: 'x^2-1', expr2: '(x-1)(x+1)' }).pass, true);
// ביטוי לא מוכר – מדלגים, לא נכשלים
assert.ok(runCheck({ kind: 'equal', expr: 'foo(3)', expr2: '1' }).skip);
assert.ok(runCheck({ kind: 'equal', expr: 'x+', expr2: '1' }).skip);

// זיכרון: אותה שאלה עם רווחים שונים = אותו מפתח; רמה אחרת = מפתח אחר
const { cacheKey, geminiKeys } = await import('./poter-worker.js');
assert.equal(await cacheKey({ text: 'פתור  x^2=4 ', level: 4 }), await cacheKey({ text: 'פתור x^2=4', level: 4 }));
assert.notEqual(await cacheKey({ text: 'פתור x^2=4', level: 4 }), await cacheKey({ text: 'פתור x^2=4', level: 5 }));
assert.deepEqual(geminiKeys({ GEMINI_KEYS: 'a1, b2,c3' }), ['a1', 'b2', 'c3']);
assert.deepEqual(geminiKeys({ GEMINI_KEY: 'k' }), ['k']);

// אבטחה: מקור זר נחסם
const r = await worker.fetch(new Request('https://x/solve', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }), {});
assert.equal(r.status, 403);
console.log('✓ הכול עבר');
