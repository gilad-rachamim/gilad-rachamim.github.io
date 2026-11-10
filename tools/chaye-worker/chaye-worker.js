// "תמונה שמתעוררת" – שכבת ההחייאה בענן ל-/kelim/tochen/chaye/ (Cloudflare Worker).
// הדפדפן שולח תמונה אחת (JPEG כ-data URL) וסגנון תנועה; ה-Worker שולח אותה ל-Runpod Public Endpoint
// (Pruna Video, תמונה→סרטון, 0.10$ לסרטון של 5 שניות ב-720p) עם הוראת תנועה קבועה מראש, ומחזיר מזהה עבודה.
// נתיבים:  POST /animate {image, style}  → {id, left}
//          GET  /status/<id>              → {status: 'wait'|'done'|'fail'}
//          GET  /video/<id>               → קובץ ה-MP4 (דרך ה-Worker, כדי שאפשר יהיה לשמור ולשתף)
// כסף: מכסה לכתובת ביום (PER_IP) ותקרה לכל האתר ביום (DAY_CAP, משתנה ב-wrangler.toml).
// פרטיות: לא שומרים את התמונה ולא את הסרטון. Runpod מחזיק את הסרטון בקישור סודי עד 7 ימים.
// הוראות התנועה קבועות (אין טקסט חופשי), כדי שלא ישתמשו בכלי לזיופים.

const ALLOWED = ['https://gilad-rachamim.github.io'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const EP = 'p-video';
const MAX_IMG = 2_500_000; // תווים ב-data URL
const ID = /^[a-z0-9-]{10,80}$/i;

const KEEP = ' Keep the faces, bodies, clothes and the whole scene exactly as in the photo. No new people, no text, no morphing. Realistic, natural, soft cinematic light.';
export const STYLES = {
  smile: 'The people in the photo look at each other and smile warmly, with small natural head and shoulder movements, blinking and gentle breathing. They stay where they are. Very slow, subtle camera push-in.' + KEEP,
  wave: 'The people in the photo smile at the camera and gently wave hello, relaxed and natural. They stay where they are. Slow subtle camera movement.' + KEEP,
  joy: 'A joyful moment: the people in the photo laugh together and lean warmly toward each other, happy atmosphere. They stay where they are. Gentle camera movement.' + KEEP,
  nature: 'Gentle life comes into the scene: a soft breeze moves leaves, plants and fabric, clouds drift slowly, light shimmers softly. Slow cinematic camera glide.' + KEEP
};

function cors(origin) {
  const ok = ALLOWED.includes(origin) || LOCAL.test(origin || '');
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type', vary: 'origin' } : null;
}
const json = (o, status, h) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', ...(h || {}) } });
const day = () => new Date().toISOString().slice(0, 10);

function rp(env, path, init) {
  return fetch(`https://api.runpod.ai/v2/${EP}/${path}`, {
    ...(init || {}),
    headers: { authorization: 'Bearer ' + env.RUNPOD_KEY, 'content-type': 'application/json', 'user-agent': 'kelim-chaye/1.0' }
  });
}

async function allow(env, ip) {
  if (!env.QUOTA) return { ok: true, left: 0 };
  const who = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + day())))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
  const r = await env.QUOTA.get(env.QUOTA.idFromName('q')).fetch('https://q/', { method: 'POST',
    body: JSON.stringify({ day: day(), who, per: +env.PER_IP || 2, cap: +env.DAY_CAP || 20 }) });
  return r.json();
}

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('origin'));
    const url = new URL(req.url);
    const p = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: h ? 204 : 403, headers: h || {} });
    if (p === '/ping') return json({ ok: true, key: !!env.RUNPOD_KEY }, 200, h || {});
    if (!h) return json({ error: 'origin' }, 403);
    if (!env.RUNPOD_KEY) return json({ error: 'השירות עוד לא מוכן.' }, 503, h);

    if (req.method === 'POST' && p === '/animate') {
      let b;
      try { b = await req.json(); } catch (_) { return json({ error: 'בקשה לא תקינה' }, 400, h); }
      const img = String(b.image || '');
      if (!/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(img) || img.length > MAX_IMG) return json({ error: 'התמונה לא תקינה או גדולה מדי.' }, 400, h);
      const prompt = STYLES[b.style] || STYLES.smile;
      const q = await allow(env, req.headers.get('cf-connecting-ip') || '0');
      if (!q.ok) return json({ error: q.all ? 'הגענו לתקרה של היום לכל האתר. ההחייאה חוזרת מחר בבוקר – ובינתיים הסרטון בתלת-ממד עובד בלי הגבלה.' : 'אפשר ליצור עד ' + (+env.PER_IP || 2) + ' סרטוני החייאה ביום לכל משתמש. נסו שוב מחר – ובינתיים הסרטון בתלת-ממד עובד בלי הגבלה.' }, 429, h);
      const r = await rp(env, 'run', { method: 'POST', body: JSON.stringify({ input: {
        prompt, image: img, duration: 5, resolution: '720p', fps: 24, save_audio: false, prompt_upsampling: false } }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) return json({ error: 'שירות הענן לא זמין כרגע. נסו שוב בעוד כמה דקות.', detail: String(j.error || r.status).slice(0, 120) }, 502, h);
      return json({ id: j.id, left: q.left }, 200, h);
    }

    const m = p.match(/^\/(status|video)\/([^/]+)$/);
    if (req.method === 'GET' && m && ID.test(m[2])) {
      const r = await rp(env, 'status/' + m[2]);
      const j = await r.json().catch(() => ({}));
      const st = j.status, out = j.output || {};
      const vid = typeof out === 'object' ? (out.result || out.video_url || '') : '';
      if (m[1] === 'status') {
        if (st === 'COMPLETED' && vid) return json({ status: 'done' }, 200, h);
        if (st === 'IN_QUEUE' || st === 'IN_PROGRESS') return json({ status: 'wait', queue: st === 'IN_QUEUE' }, 200, h);
        return json({ status: 'fail', error: 'יצירת הסרטון נכשלה. אפשר לנסות שוב.' }, 200, h);
      }
      if (!vid || !/^https:\/\/[a-z0-9.-]+\.runpod\.(ai|io)\//i.test(vid)) return json({ error: 'not ready' }, 404, h);
      const v = await fetch(vid);
      if (!v.ok) return json({ error: 'gone' }, 410, h);
      return new Response(v.body, { headers: { ...h, 'content-type': 'video/mp4', 'cache-control': 'private, max-age=3600' } });
    }
    return json({ error: 'not found' }, 404, h);
  }
};

export class Quota {
  constructor(state) { this.s = state.storage; }
  async fetch(request) {
    const b = await request.json();
    let d = (await this.s.get('d')) || {};
    if (d.day !== b.day) d = { day: b.day, all: 0, who: {} };
    const n = d.who[b.who] || 0;
    if (d.all >= b.cap) return Response.json({ ok: false, all: true });
    if (n >= b.per) return Response.json({ ok: false });
    d.who[b.who] = n + 1; d.all++;
    await this.s.put('d', d);
    return Response.json({ ok: true, left: b.per - n - 1 });
  }
}
