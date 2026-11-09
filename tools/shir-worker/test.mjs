// בדיקה במחשב: node test.mjs  (בלי רשת – בודק בניית הנחיה ופענוח תשובות)
import assert from 'node:assert';
import worker, { buildPrompt, parseOptions } from './shir-worker.js';

const p = buildPrompt('next_line', { topic: 'בוקר חדש', rhyme: 'no', sections: [{ name: 'בית 1', lines: ['פותח את החלון'] }] }, { text: 'פותח את החלון', syllables: 7 });
assert.match(p[1].content, /בלי חרוזים/); assert.match(p[1].content, /7 הברות/);
assert.deepEqual(parseOptions({ response: '{"options":["א ב","ג ד","ה ו"]}' }), ['א ב', 'ג ד', 'ה ו']);
assert.deepEqual(parseOptions({ output: [{ content: [{ type: 'output_text', text: 'סתם {"options":["שורה","עוד שורה","שלישית"]}' }] }] }), ['שורה', 'עוד שורה', 'שלישית']);
assert.deepEqual(parseOptions({ response: '1. אחת\n2. שתיים\n3. שלוש\n4. ארבע' }), ['אחת', 'שתיים', 'שלוש']);
assert.deepEqual(parseOptions({ response: 'no hebrew' }), []);
const r = await worker.fetch(new Request('https://x/help', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }), {});
assert.equal(r.status, 403);
console.log('✓ הכול עבר');
