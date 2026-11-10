// חדרים חיים למשחקי הקלפים – Cloudflare Worker + Durable Object (חינמי). מחובר ל-assets/chashiva-cards.js.
// השרת רק "מעביר הודעות" בתוך חדר: מי שפתח את החדר מחזיק את המשחק בטלפון שלו ושולח לכל שחקן רק את מה שמותר לו לראות.
// השרת לא שומר קלפים, לא שומר שמות אחרי שהחדר נסגר, ואין בו כסף או נקודות.
//
//   POST /r                          -> {id}      פתיחת חדר (עד 20 בשעה לכתובת)
//   GET  /r/:id/ws?pid=&name=&g=     -> WebSocket
//     שרת -> לקוח: {t:'hello'|'members', host, members:[{pid,name,on}]}, {t:'msg', from, d}
//     לקוח -> שרת: {t:'to', to: pid | '*', d}
// חדר נמחק לבד 24 שעות אחרי שנפתח.
const ORIGINS = ['https://gilad-rachamim.github.io', 'https://hakelim.com', 'https://www.hakelim.com'];
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
const MAX_MEMBERS = 8, MAX_MSG = 60000, KEEP_MS = 24 * 3600e3;

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const ws = url.pathname.match(/^\/r\/([a-z0-9]{4,10})\/ws$/);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'chashiva-live', v: 1 });
      else if (ws) {
        if (origin && !allowed(origin, env)) return new Response('origin', { status: 403 });
        if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
        return env.ROOM.get(env.ROOM.idFromName('r:' + ws[1])).fetch(req);
      } else if (url.pathname === '/r' && req.method === 'POST') {
        const ip = req.headers.get('CF-Connecting-IP') || 'x';
        const r = await env.ROOM.get(env.ROOM.idFromName('rl:' + ip)).fetch('https://do/rl', { method: 'POST' });
        if (r.status === 429) res = json({ error: 'נפתחו יותר מדי חדרים ברצף. נסו שוב בעוד שעה.' }, 429);
        else {
          const id = shortId(5);
          await env.ROOM.get(env.ROOM.idFromName('r:' + id)).fetch('https://do/create', { method: 'POST' });
          res = json({ id });
        }
      } else res = json({ error: 'not found' }, 404);
    } catch (e) {
      res = json({ error: 'שגיאה פנימית' }, 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

export class Room {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/rl') return this.rateLimit();
    if (url.pathname === '/create') {
      await this.ctx.storage.put('room', { at: Date.now(), host: '', names: {} });
      await this.ctx.storage.setAlarm(Date.now() + KEEP_MS);
      return json({ ok: true });
    }
    const room = await this.ctx.storage.get('room');
    if (!room) return new Response('החדר לא נמצא', { status: 404 });
    const pid = clean(url.searchParams.get('pid'), 16), name = clean(url.searchParams.get('name'), 14) || 'שחקן';
    if (pid.length < 6) return new Response('pid', { status: 400 });
    const others = this.ctx.getWebSockets().map(w => w.deserializeAttachment() || {});
    if (!others.some(o => o.pid === pid) && new Set(others.map(o => o.pid)).size >= MAX_MEMBERS) return new Response('החדר מלא', { status: 409 });
    // חיבור קודם של אותו שחקן (רענון) נסגר
    for (const w of this.ctx.getWebSockets()) { const a = w.deserializeAttachment() || {}; if (a.pid === pid) try { w.close(4000, 'replaced'); } catch (e) {} }
    if (!room.host) room.host = pid;
    room.names[pid] = name;
    await this.ctx.storage.put('room', room);
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ pid, name });
    pair[1].send(JSON.stringify({ t: 'hello', you: pid, ...(await this.members(room, pid)) }));
    await this.broadcastMembers(room, pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async members(room, joining) {
    const on = new Set(this.ctx.getWebSockets().map(w => (w.deserializeAttachment() || {}).pid));
    if (joining) on.add(joining);
    return { host: room.host, members: Object.keys(room.names).map(p => ({ pid: p, name: room.names[p], on: on.has(p) })) };
  }
  async broadcastMembers(room, except) {
    const m = JSON.stringify({ t: 'members', ...(await this.members(room)) });
    for (const w of this.ctx.getWebSockets()) if (w !== except) try { w.send(m); } catch (e) {}
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_MSG) return;
    let m; try { m = JSON.parse(msg); } catch (e) { return; }
    if (!m || m.t !== 'to') return;
    const from = (ws.deserializeAttachment() || {}).pid;
    const out = JSON.stringify({ t: 'msg', from, d: m.d });
    for (const w of this.ctx.getWebSockets()) {
      if (w === ws) continue;
      const a = w.deserializeAttachment() || {};
      if (m.to === '*' || m.to === a.pid) try { w.send(out); } catch (e) {}
    }
  }
  async webSocketClose(ws) { await this.left(ws); }
  async webSocketError(ws) { await this.left(ws); }
  async left(ws) {
    const room = await this.ctx.storage.get('room'); if (!room) return;
    try { ws.close(); } catch (e) {}
    const m = JSON.stringify({ t: 'members', ...(await this.members(room)) });
    for (const w of this.ctx.getWebSockets()) if (w !== ws) try { w.send(m); } catch (e) {}
  }

  async rateLimit() {
    const now = Date.now();
    let r = (await this.ctx.storage.get('rl')) || { s: now, n: 0 };
    if (now - r.s > 3600e3) r = { s: now, n: 0 };
    r.n++;
    await this.ctx.storage.put('rl', r);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + 2 * 3600e3);
    return r.n > 20 ? json({ error: 'rate' }, 429) : json({ ok: true });
  }
  async alarm() {
    for (const w of this.ctx.getWebSockets()) try { w.close(4001, 'expired'); } catch (e) {}
    await this.ctx.storage.deleteAll();
  }
}

function allowed(o, env) { return ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) || (env.EXTRA_ORIGINS || '').split(',').includes(o); }
function corsHeaders(o, env) { return { 'Access-Control-Allow-Origin': allowed(o, env) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type', Vary: 'Origin' }; }
function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
function clean(s, n) { return String(s || '').replace(/[<>"'`\u0000-\u001f]/g, '').trim().slice(0, n); }
function shortId(n) { const b = crypto.getRandomValues(new Uint8Array(n)); let s = ''; for (const x of b) s += ALPHA[x % ALPHA.length]; return s; }
