#!/usr/bin/env node
// "טלפון מדומה" לבדיקת התוסף לפני שיש אפליקציה: מצמד את עצמו לפי קישור ה-QR, ושולח קודים מוצפנים.
//   node tools/gesher_fake_phone.js pair "<קישור ה-QR>" <קובץ-מצב.json>
//   node tools/gesher_fake_phone.js send <קובץ-מצב.json> <קוד> [sms|whatsapp|mail|app] [שולח]
// קובץ המצב מכיל מפתחות בדיקה בלבד – למחוק אחרי הבדיקה.
'use strict';
const fs = require('fs');
const G = require('./chatima-ext/gesher/crypto.js');
const enc = new TextEncoder(), dec = new TextDecoder();

function sock(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url); ws.binaryType = 'arraybuffer';
    const c = { ws, q: [], w: [], closed: null };
    ws.onopen = () => res(c);
    ws.onerror = () => rej(new Error('ws error'));
    ws.onmessage = e => { const m = typeof e.data === 'string' ? { j: JSON.parse(e.data) } : { bin: new Uint8Array(e.data) }; const i = c.w.findIndex(x => x.p(m)); if (i >= 0) c.w.splice(i, 1)[0].r(m); else c.q.push(m); };
    ws.onclose = e => { c.closed = e.code; c.w.splice(0).forEach(x => x.r(null)); };
  });
}
function next(c, p, ms = 15000) {
  const i = c.q.findIndex(p); if (i >= 0) return Promise.resolve(c.q.splice(i, 1)[0]);
  return new Promise(r => { const x = { p, r }; c.w.push(x); setTimeout(() => { const k = c.w.indexOf(x); if (k >= 0) { c.w.splice(k, 1); r(null); } }, ms); });
}

async function pair(link, file) {
  const q = JSON.parse(dec.decode(G.unb64u(link.split('#')[1])));
  const room = G.unb64u(q.r), secret = G.unb64u(q.s), pcPub = G.unb64u(q.k);
  const me = await G.newKeyPair();
  const c = await sock(q.w.replace(/^http/, 'ws') + '/r/' + q.r + '/ws?tok=' + G.b64u(await G.pairToken(secret)));
  const mac = await G.helloMac(secret, room, pcPub, me.pub);
  c.ws.send(enc.encode(JSON.stringify({ type: 'hello', pub: G.b64u(me.pub), mac: G.b64u(mac), name: 'טלפון מדומה' })));
  if (!(await next(c, m => m.j && m.j.t === 'sealed'))) throw new Error('לא התקבל sealed');
  const s = await G.deriveSession(me.privateKey, pcPub, room);
  // לשמירה בקובץ צריך את המפתחות כבתים: גוזרים שוב עם okm
  const raw = await G.deriveRaw(me.privateKey, pcPub, room);
  fs.writeFileSync(file, JSON.stringify({ w: q.w, room: q.r, pc: q.n, tokPhone: s.tokPhone, k12: G.b64u(raw.okm.slice(0, 32)), k21: G.b64u(raw.okm.slice(32, 64)), ctr: '0' }));
  console.log('צומד ל: ' + q.n);
  process.exit(0);
}

async function send(file, code, src, from) {
  const st = JSON.parse(fs.readFileSync(file, 'utf8'));
  const room = G.unb64u(st.room);
  const imp = b => crypto.subtle.importKey('raw', G.unb64u(b), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const k21 = await imp(st.k21), k12 = await imp(st.k12);
  const c = await sock(st.w.replace(/^http/, 'ws') + '/r/' + st.room + '/ws?tok=' + st.tokPhone);
  const peer = await next(c, m => m.j && m.j.t === 'peer');
  if (!peer.j.on) { await next(c, m => m.j && m.j.t === 'peer' && m.j.on, 8000); }
  st.ctr = G.nextCtr(st.ctr);
  fs.writeFileSync(file, JSON.stringify(st));
  const id = 't' + Date.now();
  c.ws.send(await G.seal(k21, room, G.DIR_PHONE_TO_PC, st.ctr, { type: 'otp', id, code, src: src || 'sms', from: from || 'בנק הבדיקות', at: Date.now() }));
  const a = await next(c, m => m.bin, 15000);
  if (!a) { console.log('לא התקבל אישור מהמחשב'); process.exit(1); }
  const o = (await G.open(k12, room, G.DIR_PC_TO_PHONE, a.bin, null)).obj;
  console.log(JSON.stringify(o));
  process.exit(o.type === 'ack' && o.id === id ? 0 : 1);
}

const [cmd, a, b, c2, d] = process.argv.slice(2);
(cmd === 'pair' ? pair(a, b) : cmd === 'send' ? send(a, b, c2, d) : Promise.reject(new Error('pair | send'))).catch(e => { console.error(e.message); process.exit(2); });
