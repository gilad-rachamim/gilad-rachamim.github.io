// בדיקה על שאלות בגרות אמיתיות (צילום של כל שאלה), כמו שה-Worker עובד:
//   node bagrut.mjs <תיקייה עם q_A1.png...> [A1,B3,...]
// מפתחות: GEMINI_KEY (או ~/.claude/secrets/kelim-news-gemini.txt).
// Workers AI (הבודק השני) דרך REST עם הכניסה של wrangler: CF_ACCOUNT + CF_TOKEN (אם חסר – בלי gpt-oss).
// התוצאות: <תיקייה>/out_<id>.json, והשוואה למפתח bagrut-key.json – ידנית.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { solve } from './poter-worker.js';

const dir = process.argv[2];
const key = JSON.parse(fs.readFileSync(new URL('./bagrut-key.json', import.meta.url), 'utf8'));
const ids = (process.argv[3] || Object.keys(key).filter(k => k !== '_').join(',')).split(',');
const GEMINI_KEY = process.env.GEMINI_KEY || fs.readFileSync(path.join(os.homedir(), '.claude/secrets/kelim-news-gemini.txt'), 'utf8').trim();
const env = { GEMINI_KEY, GEMINI_MODEL: process.env.GEMINI_MODEL };
if (process.env.CF_ACCOUNT && process.env.CF_TOKEN) {
  env.AI = { async run(model, input) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT}/ai/run/${model}`, {
      method: 'POST', headers: { authorization: 'Bearer ' + process.env.CF_TOKEN, 'content-type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(240000) });
    const j = await r.json();
    if (!r.ok) throw new Error('AI ' + r.status + ' ' + JSON.stringify(j).slice(0, 200));
    return j.result;
  } };
}
const level = id => (key[id].src.startsWith('355') ? 5 : key[id].src.startsWith('354') ? 4 : 3);

async function one(id) {
  const out = path.join(dir, `out_${id}.json`);
  if (fs.existsSync(out) && !process.env.FORCE) { console.log(id, 'כבר נפתר'); return; }
  const t0 = Date.now();
  try {
    const data = fs.readFileSync(path.join(dir, `q_${id}.png`)).toString('base64');
    const r = await solve(env, { image: { mime: 'image/png', data }, level: level(id) }, { timeout: 180000 });
    r.secs = Math.round((Date.now() - t0) / 1000);
    fs.writeFileSync(out, JSON.stringify(r, null, 1));
    const v = r.verdict || {};
    let s = `\n=== ${id} (${key[id].src}) ${r.secs}s ${v.ok ? '✓' : '⚠'} checks ${v.passed}/${v.passed + v.failed} disagree=${v.disagree} rounds=${r.rounds} ${r.models}`;
    for (const p of r.parts || []) s += `\n   ${p.label}: ${String(p.answer).replace(/\s+/g, ' ').slice(0, 200)}`;
    for (const p of (v.parts || []).filter(p => p.agree === false)) s += `\n   ! ${p.label} בודק: ${p.other} – ${p.why}`;
    s += '\n   KEY ' + Object.entries(key[id].ans).map(([k, a]) => `${k}: ${a}`).join(' | ');
    console.log(s);
  } catch (e) { console.log(`\n=== ${id} שגיאה ${String(e.message).slice(0, 200)}`); }
}
const queue = ids.slice();
await Promise.all(Array.from({ length: +(process.env.PAR || 2) }, async () => { while (queue.length) await one(queue.shift()); }));
