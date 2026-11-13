// בדיקה במחשב: node test.mjs  (בלי רשת – בונה הנחיה, מפענח תשובות, בודק מקור ומטמון)
import assert from 'node:assert';
import worker, { buildPrompt, parseOut } from './machol-worker.js';

const p = buildPrompt({ topic: 'דינוזאורים', n: 10, clues: true, have: ['טירקס'], clueFor: ['מאובן'], tool: 'machol_tashbetz' });
assert.match(p[1].content, /דינוזאורים/); assert.match(p[1].content, /כמה מילים חדשות: 10/); assert.match(p[1].content, /טירקס/); assert.match(p[1].content, /מאובן/);

const raw = { output: [{ content: [{ type: 'output_text', text: 'הנה: {"items":[{"w":"מאובן","c":"שריד קדום באבן"},{"w":"טירקס","c":"כפול"},{"w":"שני מילים","c":"x"},{"w":"ביצה","c":"ממנה בקע הגור"},{"w":"זנב","c":"יש לדינוזאור זנב ארוך"},{"w":"א","c":"קצר מדי"}],"clues":{"מאובן":"נמצא בסלע","זר":"לא ביקשו"}}' }] }] };
const o = parseOut(raw, { n: 10, clues: true, have: ['טירקס'], clueFor: ['מאובן'] });
assert.deepEqual(o.items.map(x => x.w), ['מאובן', 'ביצה']);            // בלי כפילות, בלי שתי מילים, בלי הגדרה שמגלה, בלי אות אחת
assert.deepEqual(o.clues, { 'מאובן': 'נמצא בסלע' });                 // רק מה שביקשו
assert.equal(parseOut({ response: 'no json' }, { n: 5 }).items.length, 0);
const en = parseOut({ response: '{"items":[{"w":"DOG","c":"כלב"},{"w":"cat","c":"חתול"}]}' }, { n: 5, clues: true });
assert.deepEqual(en.items.map(x => x.w), ['DOG', 'cat']);

const r = await worker.fetch(new Request('https://x/words', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }), {});
assert.equal(r.status, 403);
const r2 = await worker.fetch(new Request('https://x/words', { method: 'POST', headers: { origin: 'https://hakelim.com' }, body: '{"n":0,"clueFor":[]}' }), {});
assert.equal(r2.status, 200);
// רק מילים מהמילון: 'מאסודקוס' המומצאת בחוץ, 'ביצה' בפנים, אנגלית לא נבדקת
const d = parseOut({ response: '{"items":[{"w":"מאסודקוס","c":"דינוזאור"},{"w":"ביצה","c":"ממנה בקע הגור"},{"w":"DINO","c":"דינוזאור"}]}' }, { n: 5, clues: true, dict: new Set(['ביצה']) });
assert.deepEqual(d.items.map(x => x.w), ['ביצה', 'DINO']);
console.log('✓ הכול עבר');
