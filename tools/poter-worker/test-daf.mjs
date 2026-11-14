// בדיקה במחשב: node test-daf.mjs [קובץ-תיאור] [קובץ-פלט] [דף-קיים.json "מה לשנות"]   (צריך מפתח: ~/.claude/secrets/limudim-poter-gemini.txt)
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import dns from 'node:dns';
import { gemini } from './poter-worker.js';
import { DAF_RULES, DAF_SCHEMA, dafPrompt, dafEditPrompt, tidyDaf } from './daf.js';
dns.setDefaultResultOrder('ipv4first');
const env = { GEMINI_KEYS: readFileSync(homedir() + '/.claude/secrets/limudim-poter-gemini.txt', 'utf8').trim() };
const text = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : 'כיתה ח, דף חזרה על משוואות, 20 דקות';
const t0 = Date.now();
const doc = process.argv[4] ? tidyDaf(JSON.parse(readFileSync(process.argv[4], 'utf8'))) : null;
const prompt = doc ? dafEditPrompt({ text, doc, change: process.argv[5] }) : dafPrompt({ text });
const r = await gemini(env, DAF_RULES, [{ text: prompt }], DAF_SCHEMA, { timeout: 170000 });
const out = tidyDaf(r.data);
console.log(r.model, ((Date.now() - t0) / 1000).toFixed(0) + 's', out.blocks.length, 'blocks');
writeFileSync(process.argv[3] || 'daf-out.json', JSON.stringify(out, null, 1));
