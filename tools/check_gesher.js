// בדיקת ההצפנה של "גשר" מול וקטורים קבועים – אותו קובץ נבדק גם ב-Java (kelim-android/gesher-test).
//   node tools/check_gesher.js           בדיקה
//   node tools/check_gesher.js --write   יצירת הווקטורים מחדש (רק כשמשנים את הפרוטוקול בכוונה)
const fs = require('fs'), path = require('path'), nodeCrypto = require('crypto');
const G = require('./chatima-ext/gesher/crypto.js');
const FILE = path.join(__dirname, 'data', 'gesher-vectors.json');
const hex = G.hex, unhex = h => new Uint8Array(Buffer.from(h, 'hex'));

async function compute(v) {
  const pcKey = await G.importPrivate(unhex(v.pcD), unhex(v.pcPub));
  const phKey = await G.importPrivate(unhex(v.phoneD), unhex(v.phonePub));
  const room = unhex(v.room), secret = unhex(v.secret);
  const pt = await G.pairToken(secret);
  const out = {
    pairToken: G.b64u(pt), pairTokenHash: await G.sha256Hex(pt),
    helloMac: hex(await G.helloMac(secret, room, unhex(v.pcPub), unhex(v.phonePub)))
  };
  const a = await G.deriveRaw(pcKey, unhex(v.phonePub), room), b = await G.deriveRaw(phKey, unhex(v.pcPub), room);
  if (hex(a.okm) !== hex(b.okm)) throw new Error('two sides disagree');
  out.z = hex(a.z); out.okm = hex(a.okm);
  const s = await G.deriveSession(pcKey, unhex(v.phonePub), room);
  out.tokPc = s.tokPc; out.tokPhone = s.tokPhone; out.hPc = s.hPc; out.hPhone = s.hPhone;
  out.frames = [];
  for (const f of v.messages) {
    const key = f.dir === 1 ? s.k12 : s.k21;
    const frame = await G.seal(key, room, f.dir, f.ctr, f.obj);
    out.frames.push(hex(frame));
    const back = await G.open(key, room, f.dir, frame, null);
    if (JSON.stringify(back.obj) !== JSON.stringify(f.obj) || back.ctr !== String(f.ctr)) throw new Error('roundtrip');
  }
  return { s, out };
}

(async () => {
  if (process.argv.includes('--write')) {
    const mk = () => { const e = nodeCrypto.createECDH('prime256v1'); e.generateKeys(); return { d: e.getPrivateKey('hex').padStart(64, '0'), pub: e.getPublicKey('hex') }; };
    const pc = mk(), ph = mk();
    const v = {
      note: 'וקטורי בדיקה ל"גשר". נבדק ב-node (tools/check_gesher.js) וב-Java (kelim-android/gesher-test). לא לשנות ידנית.',
      pcD: pc.d, pcPub: pc.pub, phoneD: ph.d, phonePub: ph.pub,
      room: nodeCrypto.randomBytes(16).toString('hex'), secret: nodeCrypto.randomBytes(16).toString('hex'),
      messages: [
        { dir: 2, ctr: '1763400000000000', obj: { type: 'otp', id: 'a1', code: '482913', src: 'sms', app: 'Messages', from: 'Bank Leumi', at: 1763400000000 } },
        { dir: 1, ctr: '1763400000000001', obj: { type: 'ack', id: 'a1' } },
        { dir: 2, ctr: '1763400000000002', obj: { type: 'otp', id: 'a2', code: '7319', src: 'whatsapp', app: 'WhatsApp', from: 'קופת חולים', at: 1763400001000 } }
      ]
    };
    const { out } = await compute(v);
    v.expect = out;
    fs.writeFileSync(FILE, JSON.stringify(v, null, 2) + '\n');
    console.log('written', FILE);
    return;
  }
  const v = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const { s, out } = await compute(v);
  let ok = 0, bad = 0;
  const eq = (name, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { bad++; console.log('FAIL', name); } };
  for (const k of Object.keys(v.expect)) eq(k, out[k], v.expect[k]);
  // שידור חוזר נדחה, מסגרת שהשתנתה נדחית, כיוון לא נכון נדחה
  const room = unhex(v.room), f0 = unhex(v.expect.frames[0]);
  const rej = async (name, fn) => { try { await fn(); bad++; console.log('FAIL (accepted)', name); } catch (e) { ok++; } };
  await rej('replay', () => G.open(s.k21, room, 2, f0, v.messages[0].ctr));
  const t = f0.slice(); t[t.length - 1] ^= 1;
  await rej('tamper', () => G.open(s.k21, room, 2, t, null));
  await rej('wrong-dir', () => G.open(s.k12, room, 1, f0, null));
  const otherRoom = room.slice(); otherRoom[0] ^= 1;
  await rej('wrong-room', () => G.open(s.k21, otherRoom, 2, f0, null));
  console.log(`gesher vectors: ${ok}/${ok + bad}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
