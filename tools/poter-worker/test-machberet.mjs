// בדיקה חיה (רמז אחד + הוכחה אחת) מול Gemini: node test-machberet.mjs
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { aiHint, aiProof } from './poter-worker.js';
const GEMINI_KEY = process.env.GEMINI_KEY || fs.readFileSync(path.join(os.homedir(), '.claude/secrets/kelim-news-gemini.txt'), 'utf8').trim();
const env = { GEMINI_KEY };
let t = Date.now();
console.log('HINT', JSON.stringify(await aiHint(env, { mode: 'alg', question: 'x^2-5x+6=0', lines: ['x^2-5x=-6'], marks: ['ok'] })), (Date.now() - t) / 1000 + 's');
t = Date.now();
console.log('PROOF', JSON.stringify(await aiProof(env, { given: 'במשולש ABC נתון AB=AC. AD חוצה את הזווית BAC, והנקודה D על הצלע BC.', prove: 'BD=DC',
  rows: [{ claim: 'AB=AC', reason: 'נתון' }, { claim: '∠BAD=∠CAD', reason: 'הגדרה' }, { claim: 'AD=AD', reason: 'צלע משותפת' }, { claim: '△ABD≅△ACD', reason: 'חפיפת משולשים לפי צ.צ.צ' }, { claim: 'BD=DC', reason: 'במשולשים חופפים מול זוויות שוות מונחות צלעות שוות' }] })), (Date.now() - t) / 1000 + 's');
