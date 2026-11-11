// "השיר שלי" – עוזר המילים. Cloudflare Worker קטן עם Workers AI (חינם, בלי מפתח).
// נתיב אחד: POST /help  {task, song, line}  ->  {options:[3 הצעות]}
// משימות: next_line | rephrase | chorus | rhymes | title
// פרטיות: לא שומרים ולא רושמים את מילות השיר. נשמר רק מונה בקשות יומי (כתובת IP מגובבת, נמחק אחרי יום).
// מכסות: 40 בקשות ביום לכל כתובת, ו-DAY_CAP לכל האתר כדי להישאר בתוך המכסה החינמית של Workers AI.

// בחירת המודל (נבדק 09.11.2026 על בית + פזמון על "בוקר חדש", עם חרוז ובלי):
const MODEL = '@cf/openai/gpt-oss-120b';
// gpt-oss-120b: עברית תקינה וטבעית, שומר על התמונות של האדם, ~21 נוירונים לבקשה, 3-8 שניות.
// llama-3.3-70b: עברית קבילה אבל עם שגיאות דקדוק ("קם והתחל"), איטי יותר.
// gemma-4-26b ו-qwen3.8-27b: מודלי "חשיבה" – כל המכסה הלכה על חשיבה והתשובה חזרה ריקה.
// glm-5.3 ו-deepseek-v4: לא זמינים בתוכנית החינמית.

const ALLOWED = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const PER_IP = 40;
const DAY_CAP = 300; // כ-21 נוירונים לבקשה (נמדד); 10,000 נוירונים חינם ביום. החשבון בתוכנית החינמית – אין חיוב גם מעבר
const MAX_IN = 2000;
// שותפים במיזם: קוד אישי 'NNN-DDDDD' (אותו קוד של ההחייאה, tools/chaye-worker/partner_codes.py, הסוד PARTNER_SECRET)
// נשלח בכותרת x-kelim-partner. קוד תקין = בלי מכסה אישית (התקרה היומית לכל האתר נשארת). ביטול: REVOKED ב-[vars].
const PCODE = /^(\d{3})-?(\d{5})$/;
async function partnerOk(env, code) {
  const m = String(code || '').replace(/\s/g, '').match(PCODE);
  if (!m || !env.PARTNER_SECRET) return false;
  if (String(env.REVOKED || '').split(',').map(x => x.trim()).filter(Boolean).map(Number).includes(+m[1])) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PARTNER_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('chaye-partner:' + (+m[1]))));
  return ((sig[0] << 24 | sig[1] << 16 | sig[2] << 8 | sig[3]) >>> 0) % 100000 === +m[2];
}
const perFor = async (env, req, per) => (await partnerOk(env, req.headers.get('x-kelim-partner'))) ? 1e9 : per;
const TASKS = ['next_line', 'rephrase', 'chorus', 'rhymes', 'title'];

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-kelim-partner', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...(h || {}) } });

const SYSTEM = `את/ה עוזר/ת לכתיבת שירים בעברית באתר חינמי. האדם כותב את השיר שלו, ואת/ה רק מציע/ה.
כללים:
- עברית פשוטה, חמה ויומיומית. משפטים קצרים שאפשר לשיר.
- תמיד בדיוק 3 אפשרויות קצרות ושונות זו מזו.
- להישאר בנושא ובמילים של האדם, באותו גוף ובאותו זמן. להשתמש בתמונות מתוך התשובות שלו.
- לשמור על מספר ההברות שביקשו (בערך, ±2), ועל החרוז שביקשו. אם ביקשו "בלי חרוז" – לא לחרוז בכוח.
- לא לצטט ולא לחקות שירים קיימים, פסוקים ארוכים או מילים של זמרים. רק ניסוחים מקוריים.
- לא לשפוט, לא לתקן את הרגש, לא לייעץ ולא לטפל. בלי מילים גסות.
- להחזיר JSON בלבד, בלי שום טקסט נוסף: {"options":["...","...","..."]}`;

function clip(s, n) { return String(s == null ? '' : s).slice(0, n); }

export function buildPrompt(task, song, line) {
  song = song || {};
  const rhyme = { yes: 'עם חרוזים (סוף שורה זוגית חורז עם הקודמת)', chorus: 'חרוזים רק בפזמון', no: 'בלי חרוזים' }[song.rhyme] || 'עם חרוזים';
  const parts = (Array.isArray(song.sections) ? song.sections : []).slice(0, 8).map(s =>
    `[${clip(s.name, 20)}]\n` + (Array.isArray(s.lines) ? s.lines : []).slice(0, 8).map(l => clip(l, 120)).join('\n')).join('\n\n');
  const ans = (Array.isArray(song.answers) ? song.answers : []).slice(0, 6).map(a => '- ' + clip(a, 200)).join('\n');
  const head = `נושא: ${clip(song.topic, 120)}\nלמי: ${clip(song.forWhom, 60)}\nאווירה: ${clip(song.mood, 40)}\nחרוזים: ${rhyme}\n` +
    (ans ? `מה האדם סיפר:\n${ans}\n` : '') + (parts ? `השיר עד עכשיו:\n${parts}\n` : '');
  const L = line || {};
  const syl = L.syllables ? ` בערך ${Math.max(3, Math.min(20, +L.syllables || 8))} הברות.` : '';
  const sec = clip(L.section, 20);
  const asks = {
    next_line: `הצע 3 שורות שיבואו אחרי השורה "${clip(L.text, 160)}"${sec ? ` ב${sec}` : ''}.${syl}${L.rhymeWith ? ` השורה צריכה לחרוז עם "${clip(L.rhymeWith, 40)}".` : ''}`,
    rephrase: `הצע 3 ניסוחים אחרים לשורה "${clip(L.text, 160)}", באותה משמעות.${syl}`,
    chorus: `הצע 3 פזמונים קצרים (כל פזמון 2-4 שורות, השורות מופרדות ב-" / "), מתוך מה שהאדם סיפר. הפזמון הוא הלב של השיר – המשפט הכי חשוב.`,
    rhymes: `הצע 3 מילים או צירופים קצרים בעברית שחורזים עם "${clip(L.word || L.text, 40)}" ומתאימים לנושא.`,
    title: `הצע 3 שמות קצרים לשיר (2-4 מילים).`
  };
  return [{ role: 'system', content: SYSTEM }, { role: 'user', content: head + '\n' + asks[task] }];
}

export function parseOptions(raw) {
  let t = typeof raw === 'string' ? raw : (raw && (raw.response || raw.output_text)) || '';
  if (!t && raw && Array.isArray(raw.output)) { // מבנה Responses של gpt-oss
    for (const o of raw.output) for (const c of (o.content || [])) if (c.type === 'output_text') t += c.text;
  }
  if (!t && raw && raw.choices) t = raw.choices[0]?.message?.content || '';
  if (typeof t === 'object') t = JSON.stringify(t);
  let arr = null;
  const m = String(t).match(/\{[\s\S]*\}/);
  if (m) { try { arr = JSON.parse(m[0]).options; } catch (_) {} }
  if (!Array.isArray(arr)) {
    const a = String(t).match(/\[[\s\S]*\]/);
    if (a) { try { arr = JSON.parse(a[0]); } catch (_) {} }
  }
  if (!Array.isArray(arr)) arr = String(t).split('\n').map(s => s.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim()).filter(Boolean);
  return arr.map(s => String(s).replace(/^["'״]+|["'״]+$/g, '').trim()).filter(s => s && /[֐-׿]/.test(s)).slice(0, 3);
}

async function ipHash(ip, day) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(day + '|' + ip + '|shir'));
  return [...new Uint8Array(b)].slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
}

export async function runModel(env, messages, model) {
  const m = model || MODEL;
  if (m.includes('gpt-oss')) return env.AI.run(m, { instructions: messages[0].content, input: messages[1].content, reasoning: { effort: 'low' } });
  return env.AI.run(m, { messages, max_tokens: 600, temperature: 0.8 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const h = cors(origin);
    if (request.method === 'OPTIONS') return h ? new Response('', { headers: h }) : new Response('', { status: 403 });
    if (url.pathname === '/ping') return json({ ok: true, model: MODEL }, 200, h || {});
    if (url.pathname !== '/help' || request.method !== 'POST') return json({ name: 'השיר שלי – עוזר המילים', page: 'https://hakelim.com/kelim/shir/milim/' }, 200);
    if (!h) return json({ error: 'origin' }, 403);
    const text = await request.text();
    if (text.length > MAX_IN) return json({ error: 'too_long' }, 413, h);
    let body; try { body = JSON.parse(text); } catch (_) { return json({ error: 'bad_json' }, 400, h); }
    const task = body.task;
    if (!TASKS.includes(task)) return json({ error: 'task' }, 400, h);

    const day = new Date().toISOString().slice(0, 10);
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    const stub = env.QUOTA.get(env.QUOTA.idFromName('q'));
    const q = await (await stub.fetch('https://q/take', { method: 'POST', body: JSON.stringify({ day, who: await ipHash(ip, day), per: await perFor(env, request, PER_IP), cap: DAY_CAP }) })).json();
    if (!q.ok) return json({ error: 'quota', rest: true }, 429, h);

    try {
      const raw = await runModel(env, buildPrompt(task, body.song, body.line));
      const options = parseOptions(raw);
      if (!options.length) return json({ error: 'empty' }, 502, h);
      return json({ options }, 200, h);
    } catch (e) {
      return json({ error: 'ai', rest: /limit|quota|neuron|capacity/i.test(String(e)) }, 503, h);
    }
  }
};

// מונה יומי בלבד: {day, all, who:{hash:count}}. בלי מילים, בלי כתובות גלויות.
export class Quota {
  constructor(state) { this.s = state.storage; }
  async fetch(request) {
    const b = await request.json();
    let d = (await this.s.get('d')) || {};
    if (d.day !== b.day) d = { day: b.day, all: 0, who: {} };
    const n = d.who[b.who] || 0;
    if (n >= b.per || d.all >= b.cap) return Response.json({ ok: false });
    d.who[b.who] = n + 1; d.all++;
    await this.s.put('d', d);
    return Response.json({ ok: true, left: b.per - n - 1 });
  }
}
