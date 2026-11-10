// בדיקה חיה של "הראו לי את הצעד הבא" (/hint עם level=next) מול Gemini. פעם אחת בלבד.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { aiHint } from './poter-worker.js';
const sec = f => { try { return fs.readFileSync(path.join(os.homedir(), '.claude/secrets', f), 'utf8').trim(); } catch (_) { return ''; } };
const GEMINI_KEYS = process.env.GEMINI_KEYS || sec('limudim-poter-gemini.txt') || sec('kelim-news-gemini.txt');
const t = Date.now();
console.log(JSON.stringify(await aiHint({ GEMINI_KEYS }, { mode: 'alg', level: 'next', question: '2sin(x)-1=0', lines: [], marks: [] })), (Date.now() - t) / 1000 + 's');
