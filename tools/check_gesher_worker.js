#!/usr/bin/env node
// בדיקת שרת הגשר (tools/gesher-worker) מקצה לקצה: שני מכשירים מדומים – "מחשב" ו"טלפון" – בתוך node.
// הרצה: (בתיקייה tools/gesher-worker)  npx wrangler dev --local --port 8797
//        ואז:                          node tools/check_gesher_worker.js http://127.0.0.1:8797
// בודק: צימוד מלא, הודעת קוד מוצפנת טלפון→מחשב + אישור, לקוח שלישי נדחה, אסימון שגוי נדחה,
//        QR שני אחרי צימוד נדחה, תור "אין צד שני", החלפת חיבור של אותו מכשיר, ניתוק מוחק את החדר.
'use strict';
const G = require('./chatima-ext/gesher/crypto.js');

const BASE = (process.argv[2] || 'http://127.0.0.1:8797').replace(/\/$/, '');
const WSBASE = BASE.replace(/^http/, 'ws');
let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  — ' + extra : '')); }
}
const enc = new TextEncoder(), dec = new TextDecoder();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// לקוח WebSocket עם תור הודעות שאפשר לחכות לו
function connect(room, tok) {
  return new Promise(resolve => {
    const ws = new WebSocket(WSBASE + '/r/' + G.b64u(room) + '/ws?tok=' + tok);
    ws.binaryType = 'arraybuffer';
    const c = { ws, q: [], waiters: [], closed: null, opened: false };
    ws.onopen = () => { c.opened = true; resolve(c); };
    ws.onmessage = e => {
      const m = typeof e.data === 'string' ? { text: e.data, j: safeJson(e.data) } : { bin: new Uint8Array(e.data) };
      const w = c.waiters.findIndex(x => x.pred(m));
      if (w >= 0) { const x = c.waiters.splice(w, 1)[0]; clearTimeout(x.t); x.res(m); } else c.q.push(m);
    };
    ws.onclose = e => { c.closed = { code: e.code, reason: e.reason }; for (const x of c.waiters.splice(0)) { clearTimeout(x.t); x.res(null); } if (!c.opened) resolve(c); };
    ws.onerror = () => {};
  });
}
function safeJson(s) { try { return JSON.parse(s); } catch (e) { return null; } }
function next(c, pred, ms = 4000) {
  const i = c.q.findIndex(pred);
  if (i >= 0) return Promise.resolve(c.q.splice(i, 1)[0]);
  if (c.closed) return Promise.resolve(null);
  return new Promise(res => { const x = { pred, res, t: setTimeout(() => { c.waiters.splice(c.waiters.indexOf(x), 1); res(null); }, ms) }; c.waiters.push(x); });
}
const isJ = t => m => m && m.j && m.j.t === t;
const isPeer = on => m => m && m.j && m.j.t === 'peer' && m.j.on === on;
const isBin = m => m && m.bin;
function waitClose(c, ms = 4000) {
  return new Promise(async res => { const t0 = Date.now(); while (!c.closed && Date.now() - t0 < ms) await sleep(30); res(c.closed); });
}
// ניסיון התחברות שאמור להידחות: מחזיר את קוד ה-HTTP דרך fetch רגיל (WebSocket ב-node לא מוסר את הסטטוס)
// (fetch לא מרשה לשלוח את הכותרת Upgrade, לכן http/https של node)
function httpStatus(room, tok) {
  const u = new URL(BASE + '/r/' + G.b64u(room) + '/ws?tok=' + tok);
  const mod = require(u.protocol === 'https:' ? 'https' : 'http');
  return new Promise(resolve => {
    const req = mod.request(u, { headers: { Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' } });
    req.on('upgrade', (res, sock) => { sock.destroy(); resolve(101); });
    req.on('response', res => { res.resume(); resolve(res.statusCode); });
    req.on('error', e => resolve('ERR ' + e.message));
    req.setTimeout(5000, () => { req.destroy(); resolve('timeout'); });
    req.end();
  });
}

async function pairDevices() {
  // ---- המחשב: יוצר חדר + סוד, מציג QR ----
  const room = G.random(16), secret = G.random(32);
  const pc = await G.newKeyPair();
  const pt = G.b64u(await G.pairToken(secret));
  const ph = await G.sha256Hex(G.unb64u(pt));
  const r = await fetch(BASE + '/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ room: G.b64u(room), ph }) });
  const pairRes = { status: r.status, body: await r.json() };
  const qr = { v: 1, r: G.b64u(room), s: G.b64u(secret), k: G.b64u(pc.pub), n: 'מחשב בדיקה', w: BASE };
  return { room, secret, pc, pt, ph, pairRes, qr };
}

(async () => {
  console.log('שרת: ' + BASE);
  const root = await fetch(BASE + '/').then(r => r.json()).catch(e => ({ error: e.message }));
  ok(root.name === 'kelim-gesher', 'השרת עונה ב-/', JSON.stringify(root));

  // ---- קלטים שגויים ----
  let r = await fetch(BASE + '/pair', { method: 'POST', body: '{"room":"x","ph":"y"}' });
  ok(r.status === 400, 'POST /pair עם קלט שגוי → 400', r.status);
  r = await fetch(BASE + '/nothing');
  ok(r.status === 404, 'נתיב לא קיים → 404', r.status);
  r = await fetch(BASE + '/pair', { method: 'OPTIONS' });
  ok(r.status === 204 && r.headers.get('access-control-allow-origin') === '*', 'CORS פתוח (התוסף לא צריך הרשאת מארח)');

  // ===== צימוד =====
  console.log('\nצימוד:');
  const P = await pairDevices();
  ok(P.pairRes.status === 200 && P.pairRes.body.ok, 'POST /pair פותח חדר', JSON.stringify(P.pairRes));
  r = await fetch(BASE + '/pair', { method: 'POST', body: JSON.stringify({ room: P.qr.r, ph: P.ph }) });
  ok(r.status === 409, 'אותו חדר פעמיים → 409', r.status);
  { const s = await httpStatus(P.room, G.b64u(G.random(32))); ok(s === 403, 'אסימון צימוד שגוי → 403', s); }
  { const s = await httpStatus(G.random(16), P.pt); ok(s === 404, 'חדר שלא קיים → 404', s); }

  const pcPair = await connect(P.room, P.pt);
  ok(pcPair.opened, 'המחשב מתחבר עם אסימון הצימוד');
  ok(!!(await next(pcPair, isPeer(false))), 'המחשב מקבל "הטלפון עוד לא מחובר"');

  // ---- הטלפון סורק את ה-QR ----
  const q = P.qr, room = G.unb64u(q.r), secret = G.unb64u(q.s), pcPub = G.unb64u(q.k);
  const phone = await G.newKeyPair();
  const phonePair = await connect(room, G.b64u(await G.pairToken(secret)));
  ok(phonePair.opened, 'הטלפון מתחבר עם אסימון הצימוד מתוך ה-QR');
  ok(!!(await next(pcPair, isPeer(true))), 'המחשב מקבל "הטלפון מחובר"');

  { const s = await httpStatus(room, P.pt); ok(s === 409, 'לקוח שלישי בזמן צימוד → 409', s); }

  // hello: גלוי (המפתחות ציבוריים), עם mac שמוכיח שהטלפון ראה את הסוד
  const mac = await G.helloMac(secret, room, pcPub, phone.pub);
  phonePair.ws.send(enc.encode(JSON.stringify({ type: 'hello', pub: G.b64u(phone.pub), mac: G.b64u(mac), name: 'טלפון בדיקה' })));
  const h = await next(pcPair, isBin);
  ok(!!h, 'ה-hello של הטלפון הגיע למחשב');
  const hello = JSON.parse(dec.decode(h.bin));
  const gotPhonePub = G.unb64u(hello.pub);
  const expect = await G.helloMac(P.secret, P.room, P.pc.pub, gotPhonePub);
  ok(G.sameBytes(expect, G.unb64u(hello.mac)), 'המחשב אימת את ה-mac של הטלפון');
  // mac מזויף נדחה אצל המחשב (בדיקת הלקוח, לא השרת)
  const fake = await G.helloMac(G.random(32), P.room, P.pc.pub, gotPhonePub);
  ok(!G.sameBytes(fake, G.unb64u(hello.mac)), 'mac מזויף לא עובר אימות');

  const sPc = await G.deriveSession(P.pc.privateKey, gotPhonePub, P.room);
  const sPhone = await G.deriveSession(phone.privateKey, pcPub, room);
  ok(sPc.tokPc === sPhone.tokPc && sPc.tokPhone === sPhone.tokPhone, 'שני הצדדים גזרו את אותם אסימונים');

  // seal עם גיבובים לא תקינים נדחה
  pcPair.ws.send(JSON.stringify({ t: 'seal', hPc: 'zz', hPhone: sPc.hPhone }));
  ok(!!(await next(pcPair, isJ('err'))), 'seal שגוי → err');
  pcPair.ws.send(JSON.stringify({ t: 'seal', hPc: sPc.hPc, hPhone: sPc.hPhone }));
  ok(!!(await next(pcPair, isJ('sealed'))) && !!(await next(phonePair, isJ('sealed'))), 'שני הצדדים קיבלו sealed');
  const c1 = await waitClose(pcPair), c2 = await waitClose(phonePair);
  ok(c1 && c1.code === 4002 && c2 && c2.code === 4002, 'חיבורי הצימוד נסגרו (4002)', JSON.stringify([c1, c2]));

  // ===== אחרי צימוד =====
  console.log('\nאחרי צימוד:');
  { const s = await httpStatus(room, P.pt); ok(s === 403, 'QR ישן (אסימון צימוד) אחרי צימוד → 403', s); }
  { const s = await httpStatus(room, G.b64u(G.random(32))); ok(s === 403, 'אסימון שגוי → 403', s); }
  r = await fetch(BASE + '/pair', { method: 'POST', body: JSON.stringify({ room: q.r, ph: P.ph }) });
  ok(r.status === 409, 'ניסיון לפתוח מחדש חדר מצומד → 409', r.status);

  // רק הטלפון מחובר: שולח קוד → "אין צד שני"
  let ctrPhone = '0', lastAtPc = null;
  let phoneWs = await connect(room, sPhone.tokPhone);
  ok(phoneWs.opened, 'הטלפון מתחבר עם האסימון שלו');
  ok(!!(await next(phoneWs, isPeer(false))), 'הטלפון יודע שהמחשב לא מחובר');
  ctrPhone = G.nextCtr(ctrPhone);
  phoneWs.ws.send(await G.seal(sPhone.k21, room, G.DIR_PHONE_TO_PC, ctrPhone, { type: 'otp', id: 'a1', code: '000000', src: 'sms', from: 'בדיקה', at: Date.now() }));
  ok(!!(await next(phoneWs, isPeer(false))), 'שליחה כשהמחשב מנותק → peer:false (התור נשאר אצל הטלפון)');

  const pcWs = await connect(P.room, sPc.tokPc);
  ok(pcWs.opened, 'המחשב מתחבר עם האסימון שלו');
  ok(!!(await next(pcWs, isPeer(true))) && !!(await next(phoneWs, isPeer(true))), 'שני הצדדים יודעים שהשני מחובר');

  // קוד אמיתי טלפון → מחשב
  ctrPhone = G.nextCtr(ctrPhone);
  const otp = { type: 'otp', id: 'b2', code: '483920', src: 'sms', app: 'com.google.android.apps.messaging', from: 'בנק בדיקה', at: Date.now() };
  const frame = await G.seal(sPhone.k21, room, G.DIR_PHONE_TO_PC, ctrPhone, otp);
  phoneWs.ws.send(frame);
  const got = await next(pcWs, isBin);
  ok(!!got && G.sameBytes(got.bin, frame), 'המסגרת עברה בשרת בלי שינוי בייט אחד');
  const opened = await G.open(sPc.k21, P.room, G.DIR_PHONE_TO_PC, got.bin, lastAtPc);
  lastAtPc = opened.ctr;
  ok(opened.obj.code === '483920' && opened.obj.src === 'sms', 'המחשב פתח את הקוד: ' + opened.obj.code + ' (מ-' + opened.obj.src + ')');
  let replay = false; try { await G.open(sPc.k21, P.room, G.DIR_PHONE_TO_PC, got.bin, lastAtPc); } catch (e) { replay = e.message === 'replay'; }
  ok(replay, 'שליחה חוזרת של אותה מסגרת נדחית (replay)');
  // אישור מחשב → טלפון
  pcWs.ws.send(await G.seal(sPc.k12, P.room, G.DIR_PC_TO_PHONE, G.nextCtr('0'), { type: 'ack', id: 'b2' }));
  const ack = await next(phoneWs, isBin);
  const ackObj = ack && (await G.open(sPhone.k12, room, G.DIR_PC_TO_PHONE, ack.bin, null)).obj;
  ok(ackObj && ackObj.type === 'ack' && ackObj.id === 'b2', 'הטלפון קיבל אישור (ack)');

  // מסגרת גדולה מדי
  phoneWs.ws.send(new Uint8Array(301 * 1024));
  const big = await next(phoneWs, isJ('err'));
  ok(big && big.j.e === 'size', 'מסגרת מעל 300KB → err size');

  // ping/pong אוטומטי
  phoneWs.ws.send('ping');
  ok(!!(await next(phoneWs, m => m && m.text === 'pong')), 'ping → pong');

  // חיבור חדש של הטלפון סוגר את הקודם
  const phoneWs2 = await connect(room, sPhone.tokPhone);
  const repl = await waitClose(phoneWs);
  ok(phoneWs2.opened && repl && repl.code === 4000, 'חיבור חדש של אותו מכשיר מחליף את הקודם (4000)', JSON.stringify(repl));
  phoneWs = phoneWs2;
  ctrPhone = G.nextCtr(ctrPhone);
  phoneWs.ws.send(await G.seal(sPhone.k21, room, G.DIR_PHONE_TO_PC, ctrPhone, { type: 'otp', id: 'c3', code: '771204', src: 'whatsapp', at: Date.now() }));
  const got2 = await next(pcWs, isBin);
  const o2 = got2 && await G.open(sPc.k21, P.room, G.DIR_PHONE_TO_PC, got2.bin, lastAtPc);
  ok(o2 && o2.obj.code === '771204', 'אחרי החלפת חיבור הקודים ממשיכים להגיע');

  // "מחשב קבוע": keep מצד מאומת לא שובר את החיבור, והקודים ממשיכים לעבור
  phoneWs.ws.send(JSON.stringify({ t: 'keep', on: true }));
  ctrPhone = G.nextCtr(ctrPhone);
  phoneWs.ws.send(await G.seal(sPhone.k21, room, G.DIR_PHONE_TO_PC, ctrPhone, { type: 'otp', id: 'k4', code: '552211', src: 'sms', at: Date.now() }));
  const got3 = await next(pcWs, isBin);
  const o3 = got3 && await G.open(sPc.k21, P.room, G.DIR_PHONE_TO_PC, got3.bin, o2 && o2.ctr);
  ok(o3 && o3.obj.code === '552211', 'אחרי keep:true הקודים ממשיכים לעבור');

  // מסגרת שהשתנתה בדרך לא נפתחת (מבחן ללקוח)
  const tampered = new Uint8Array(frame); tampered[tampered.length - 1] ^= 1;
  let bad = false; try { await G.open(sPc.k21, P.room, G.DIR_PHONE_TO_PC, tampered, null); } catch (e) { bad = true; }
  ok(bad, 'מסגרת ששונתה בדרך לא נפתחת');

  // ===== ניתוק =====
  console.log('\nניתוק:');
  r = await fetch(BASE + '/r/' + q.r + '?tok=' + G.b64u(G.random(32)), { method: 'DELETE' });
  ok(r.status === 403, 'מחיקה עם אסימון שגוי → 403', r.status);
  r = await fetch(BASE + '/r/' + q.r + '?tok=' + sPhone.tokPhone, { method: 'DELETE' });
  ok(r.status === 200, 'הטלפון מנתק (DELETE) → 200', r.status);
  const d1 = await waitClose(pcWs), d2 = await waitClose(phoneWs);
  ok(d1 && d1.code === 4003 && d2 && d2.code === 4003, 'שני החיבורים נסגרו (4003)', JSON.stringify([d1, d2]));
  { const s = await httpStatus(room, sPc.tokPc); ok(s === 404, 'אחרי ניתוק החדר לא קיים → 404', s); }

  console.log('\n' + (fail ? '✗' : '✓') + ' ' + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('תקלה: ' + (e && e.stack || e)); process.exit(2); });
