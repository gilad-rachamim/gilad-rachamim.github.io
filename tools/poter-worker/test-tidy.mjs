// בדיקה במחשב: node test-tidy.mjs  – ניקוי LaTeX ואותיות סעיפים (בלי רשת)
import assert from 'node:assert';
import { plainMath, normLabel, cleanReadLine, tidyRead } from './poter-worker.js';

assert.equal(plainMath('r = \\frac{1}{\\sqrt{3}} \\quad (\\approx 0.58)'), 'r = 1/√3 (≈ 0.58)');
assert.equal(plainMath('$a=\\frac{5}{2}$'), 'a=5/2');
assert.equal(plainMath('(3, e^{6}) – מינימום'), '(3, e⁶) – מינימום');
assert.equal(plainMath('x \\neq \\ln(4)'), 'x ≠ ln(4)');
assert.equal(plainMath('270^\\circ - \\theta'), '270° - θ');
assert.equal(plainMath('\\left(0, \\frac{1-b}{9}\\right)'), '(0, (1-b)/9)');
assert.equal(plainMath('f_{max}=a'), 'fmax=a');
assert.equal(plainMath('x^{2x}'), 'x^(2x)');
assert.equal(plainMath('e^{1.5}'), 'e^(1.5)');
assert.equal(plainMath('e^1.5'), 'e^(1.5)');
assert.equal(plainMath('x^12'), 'x¹²');
assert.equal(plainMath('בלי שום דבר'), 'בלי שום דבר');
assert.deepEqual(['a', 'B1', 'ב(1)', 'סעיף ג', 'b2', 'D', 'ב1', 'ג.', 'ה (ii)'].map(normLabel), ['א', 'ב(1)', 'ב(1)', 'ג', 'ב(2)', 'ד', 'ב(1)', 'ג', 'ה(2)']);
// /read – העתקת תרגיל מצילום לשורה של המחברת
assert.equal(cleanReadLine('$\\frac{x+1}{x-2}=3$'), '(x+1)/(x-2)=3');
assert.equal(cleanReadLine('\\sqrt{x+2}=x'), 'sqrt(x+2)=x');
assert.equal(cleanReadLine('e^{2x}=5'), 'e^(2x)=5');
assert.equal(cleanReadLine('x^{2}-5x+6=0'), 'x^2-5x+6=0');
assert.equal(cleanReadLine('2\\sin(x) \\le 1'), '2sin(x) <= 1');
assert.equal(cleanReadLine('3x  +  4 = 10'), '3x + 4 = 10');
const tr = tidyRead({ readable: true, items: [{ line: 'x^2=4', ask: 'פתרו', label: '1' }, { line: '' }, { line: 'שלום' }] });
assert.equal(tr.items.length, 1); assert.equal(tr.readable, true); assert.equal(tr.items[0].ask, 'פתרו');
assert.equal(tidyRead({ readable: true, items: [] }).readable, false);
assert.equal(tidyRead(null).readable, false);
console.log('✓ ניקוי עבר');
