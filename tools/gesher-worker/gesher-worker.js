// גשר טלפון↔מחשב – ממסר עיוור. מיזם הכלים של גילעד רחמים.
// השרת מעביר מסגרות בינאריות מוצפנות בין שני המכשירים של אותו צימוד ("חדר"), ולא יכול לפתוח אותן.
// מה נשמר בחדר: תאריך יצירה, שימוש אחרון, גיבוב (SHA-256) של אסימוני הגישה, מונה מסגרות יומי. בלי תוכן, בלי תור, בלי לוג.
// הפרוטוקול: PROTOCOL.md
//
//   POST   /pair            {room, ph}  -> {ok}       פתיחת חדר לצימוד (תוקף 3 דקות; עד 30 בשעה לכתובת)
//   GET    /r/:room/ws?tok=             -> WebSocket   tok = אסימון צימוד (לפני חיבור) או אסימון המכשיר (אחרי)
//   DELETE /r/:room?tok=                -> {ok}       ניתוק: מוחק את החדר
// מסגרות טקסט (בקרה): לקוח -> {t:'seal', hPc, hPhone} (רק בזמן צימוד) ; שרת -> {t:'peer', on}, {t:'sealed'}, {t:'err', e}
// "ping" -> "pong" עונה Cloudflare בלי להעיר את החדר (חיסכון).
const PAIR_MS = 3 * 60e3, IDLE_MS = 90 * 24 * 3600e3, MAX_FRAME = 300 * 1024, MAX_PER_DAY = 20000;
const ROOM_RE = /^[A-Za-z0-9_-]{22}$/, TOK_RE = /^[A-Za-z0-9_-]{43}$/, HASH_RE = /^[0-9a-f]{64}$/;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      const m = url.pathname.match(/^\/r\/([A-Za-z0-9_-]{22})(\/ws)?$/);
      if (url.pathname === '/' || url.pathname === '/ping') res = json({ ok: true, name: 'kelim-gesher', v: 1 });
      else if (url.pathname === '/pair' && req.method === 'POST') {
        const b = await req.json().catch(() => ({}));
        if (!ROOM_RE.test(b.room || '') || !HASH_RE.test(b.ph || '')) res = json({ error: 'bad' }, 400);
        else {
          const ip = req.headers.get('CF-Connecting-IP') || 'x';
          const rl = await env.ROOM.get(env.ROOM.idFromName('rl:' + ip)).fetch('https://do/rl', { method: 'POST' });
          if (rl.status === 429) res = json({ error: 'יותר מדי ניסיונות צימוד. נסו שוב בעוד שעה.' }, 429);
          else res = await env.ROOM.get(env.ROOM.idFromName('r:' + b.room)).fetch('https://do/create', { method: 'POST', body: JSON.stringify({ ph: b.ph }) });
        }
      } else if (m && m[2]) {
        if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
        return env.ROOM.get(env.ROOM.idFromName('r:' + m[1])).fetch(req);
      } else if (m && req.method === 'DELETE') {
        res = await env.ROOM.get(env.ROOM.idFromName('r:' + m[1])).fetch('https://do/delete?tok=' + encodeURIComponent(url.searchParams.get('tok') || ''), { method: 'POST' });
      } else res = json({ error: 'not found' }, 404);
    } catch (e) {
      res = json({ error: 'שגיאה פנימית' }, 500);
    }
    res = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

// אסימון בפורמט base64url -> בתים -> SHA-256 hex (כמו בלקוחות)
async function tokHash(tok) {
  let s = tok.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  const d = await crypto.subtle.digest('SHA-256', b);
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); } catch (e) {}
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/rl') return this.rateLimit();
    if (url.pathname === '/create') {
      const b = await req.json();
      if (await this.ctx.storage.get('room')) return json({ error: 'exists' }, 409);
      await this.ctx.storage.put('room', { at: Date.now(), used: Date.now(), ph: b.ph, sealed: false, day: 0, n: 0 });
      await this.ctx.storage.setAlarm(Date.now() + PAIR_MS);
      return json({ ok: true });
    }
    const room = await this.ctx.storage.get('room');
    if (url.pathname === '/delete') {
      const tok = url.searchParams.get('tok') || '';
      if (!room || !room.sealed || !TOK_RE.test(tok)) return json({ error: 'no' }, 403);
      const h = await tokHash(tok);
      if (h !== room.hPc && h !== room.hPhone) return json({ error: 'no' }, 403);
      for (const w of this.ctx.getWebSockets()) try { w.close(4003, 'unpaired'); } catch (e) {}
      await this.ctx.storage.deleteAll();
      return json({ ok: true });
    }
    // WebSocket
    if (!room) {
      // החדר נמחק (ניתוק / צימוד חדש מהצד השני / 90 יום): מקבלים וסוגרים מיד ב-4003 – דפדפן לא רואה קוד 404,
      // וכך גם מכשיר שהיה כבוי בזמן המחיקה יודע שהצימוד נגמר ומודיע למשתמש.
      const gone = new WebSocketPair();
      gone[1].accept();
      gone[1].close(4003, 'unpaired');
      return new Response(null, { status: 101, webSocket: gone[0] });
    }
    const tok = url.searchParams.get('tok') || '';
    if (!TOK_RE.test(tok)) return new Response('tok', { status: 403 });
    const h = await tokHash(tok);
    let role = null;
    if (room.sealed) role = h === room.hPc ? 'pc' : h === room.hPhone ? 'phone' : null;
    else if (h === room.ph && Date.now() - room.at < PAIR_MS) role = 'pair';
    if (!role) return new Response('tok', { status: 403 });

    const sockets = this.ctx.getWebSockets();
    if (role === 'pair') {
      if (sockets.length >= 2) return new Response('full', { status: 409 });
    } else {
      // חיבור קודם של אותו מכשיר (רענון / רשת שהתחלפה) נסגר
      for (const w of sockets) if ((w.deserializeAttachment() || {}).role === role) try { w.close(4000, 'replaced'); } catch (e) {}
    }
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ role });
    room.used = Date.now();
    await this.ctx.storage.put('room', room);
    const others = this.others(pair[1]);
    pair[1].send(JSON.stringify({ t: 'peer', on: others.length > 0 }));
    for (const w of others) try { w.send(JSON.stringify({ t: 'peer', on: true })); } catch (e) {}
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  others(ws) {
    const me = ws.deserializeAttachment() || {};
    return this.ctx.getWebSockets().filter(w => {
      if (w === ws || w.readyState > 1) return false;
      const a = w.deserializeAttachment() || {};
      return me.role === 'pair' ? a.role === 'pair' : a.role !== me.role && a.role !== 'pair';
    });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg === 'string') {
      if (msg.length > 1000) return;
      let m; try { m = JSON.parse(msg); } catch (e) { return; }
      const role = (ws.deserializeAttachment() || {}).role;
      if (m && m.t === 'seal' && role === 'pair') {
        const room = await this.ctx.storage.get('room');
        if (!room || room.sealed || !HASH_RE.test(m.hPc || '') || !HASH_RE.test(m.hPhone || '') || m.hPc === m.hPhone) return ws.send(JSON.stringify({ t: 'err', e: 'seal' }));
        room.sealed = true; room.hPc = m.hPc; room.hPhone = m.hPhone; delete room.ph; room.used = Date.now();
        await this.ctx.storage.put('room', room);
        await this.ctx.storage.setAlarm(Date.now() + 24 * 3600e3);
        for (const w of this.ctx.getWebSockets()) try { w.send(JSON.stringify({ t: 'sealed' })); w.close(4002, 'sealed'); } catch (e) {}
      }
      return;
    }
    // בינארי: מעבירים כמו שהוא לצד השני, בלי לפתוח
    if (msg.byteLength > MAX_FRAME) return ws.send(JSON.stringify({ t: 'err', e: 'size' }));
    const room = await this.ctx.storage.get('room');
    if (!room) return;
    const day = Math.floor(Date.now() / 86400e3);
    if (room.day !== day) { room.day = day; room.n = 0; }
    if (++room.n > MAX_PER_DAY) return ws.send(JSON.stringify({ t: 'err', e: 'quota' }));
    room.used = Date.now();
    await this.ctx.storage.put('room', room);
    const to = this.others(ws);
    if (!to.length) return ws.send(JSON.stringify({ t: 'peer', on: false }));
    for (const w of to) try { w.send(msg); } catch (e) {}
  }
  async webSocketClose(ws) { this.left(ws); }
  async webSocketError(ws) { this.left(ws); }
  left(ws) {
    try { ws.close(); } catch (e) {}
    for (const w of this.others(ws)) try { w.send(JSON.stringify({ t: 'peer', on: false })); } catch (e) {}
  }

  async rateLimit() {
    const now = Date.now();
    let r = (await this.ctx.storage.get('rl')) || { s: now, n: 0 };
    if (now - r.s > 3600e3) r = { s: now, n: 0 };
    r.n++;
    await this.ctx.storage.put('rl', r);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + 2 * 3600e3);
    return r.n > 30 ? json({ error: 'rate' }, 429) : json({ ok: true });
  }
  async alarm() {
    const room = await this.ctx.storage.get('room');
    const now = Date.now();
    const dead = !room || (!room.sealed && now - room.at >= PAIR_MS) || (room.sealed && now - room.used > IDLE_MS);
    if (dead) {
      for (const w of this.ctx.getWebSockets()) try { w.close(4001, 'expired'); } catch (e) {}
      await this.ctx.storage.deleteAll();
    } else await this.ctx.storage.setAlarm(now + 24 * 3600e3);
  }
}

function json(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8' } }); }
