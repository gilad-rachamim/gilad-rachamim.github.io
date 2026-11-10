// בדיקה חיה של /read (צילום תרגיל -> שורה במחברת) מול Gemini. פעם אחת בלבד, המכסה קטנה.
// node test-read.mjs [image.jpg]   (בלי קובץ: משתמשים ב-sample-read.jpg שליד הקובץ, אם יש)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { aiRead } from './poter-worker.js';
const sec = f => { try { return fs.readFileSync(path.join(os.homedir(), '.claude/secrets', f), 'utf8').trim(); } catch (_) { return ''; } };
const GEMINI_KEYS = process.env.GEMINI_KEYS || sec('limudim-poter-gemini.txt') || sec('kelim-news-gemini.txt');
const file = process.argv[2] || new URL('./sample-read.jpg', import.meta.url);
const data = fs.readFileSync(file).toString('base64');
const t = Date.now();
console.log(JSON.stringify(await aiRead({ GEMINI_KEYS }, { mime: 'image/jpeg', data }), null, 1), (Date.now() - t) / 1000 + 's');
