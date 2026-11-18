// בדיקת הטלגרם בלי רשת: node test-tg.mjs  (שרת מדומה + fetch מדומה ל-api.telegram.org)
import assert from 'node:assert';
import worker, { Store, editionText } from './news-worker.js';

// אחסון מדומה ל-Durable Object
const mem = new Map();
const storage = {
  get: async k => mem.get(k), put: async (k, v) => { mem.set(k, v); }, delete: async k => mem.delete(k),
  list: async () => new Map(), setAlarm: async () => {}
};
const store = new Store({ storage }, {});
const env = { ADMIN_KEY: 'k', TG_TOKEN: 'T', STORE: { idFromName: () => 1, get: () => ({ fetch: (u, o) => store.fetch(new Request(u, o)) }) } };
const ctx = { waitUntil() {} };
const get = async path => (await worker.fetch(new Request('https://x' + path), env, ctx)).json();

// fetch מדומה: רושם כל קריאה לטלגרם
const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  if (url.startsWith('https://api.telegram.org/botT/')) {
    const m = url.split('/').pop();
    sent.push({ m, body: opts.body });
    const result = { getMe: { username: 'hadashot3dakot_bot' }, getChat: { title: 'החדשות ב-3 דקות' }, getChatMemberCount: 7 }[m] ?? { message_id: 42 };
    return new Response(JSON.stringify({ ok: true, result }));
  }
  return realFetch(url, opts);
};

// הגדרות: קישור ציבורי + מזהה ערוץ, עם בדיקת תקינות
assert.equal((await get('/config?key=k&tg=https://evil.com/x')).ok, false);
assert.equal((await get('/config?key=k&tgid=hadashot')).ok, false, 'בלי @ – נדחה');
assert.equal((await get('/config?key=k&tg=https://t.me/hadashot3dakot')).links.tg, 'https://t.me/hadashot3dakot');
assert.equal((await get('/config?key=k&tgid=@hadashot3dakot')).tgid, '@hadashot3dakot');
assert.equal((await get('/config?tg=https://t.me/x12345')).ok, false, 'בלי מפתח – אסור');
console.log('✓ הגדרות טלגרם');

// /latest מחזיר לדף את הקישור, לא את המזהה
await store.fetch(new Request('https://store/save', { method: 'POST', body: JSON.stringify({ at: new Date().toISOString(), name: 'בוקר', date: { day: 'רביעי', he: 'ח׳ כסלו' }, sections: { main: [{ text: 'א' }] } }) }));
const latest = await get('/latest?from=tg');
assert.equal(latest.links.tg, 'https://t.me/hadashot3dakot');
assert.equal(latest.tgid, undefined);
console.log('✓ /latest');

// הטקסט: בפייסבוק שורת טלגרם, בטלגרם עצמו לא
const ed = { name: 'ערב', date: { day: 'רביעי', he: 'ח׳ כסלו' }, sections: { main: [{ text: 'נקודה ראשונה' }] } };
const links = { tg: 'https://t.me/hadashot3dakot', wa: 'https://whatsapp.com/channel/abc' };
assert.ok(editionText(ed, links, 'fb').includes('✈️ בערוץ הטלגרם:\nhttps://t.me/hadashot3dakot'));
const tgText = editionText(ed, links, 'tg');
assert.ok(!tgText.includes('t.me/'), 'בטלגרם לא מפרסמים את הטלגרם');
assert.ok(tgText.includes('utm_source=tg') && tgText.includes('whatsapp.com/channel'));
console.log('✓ נוסח המהדורה');

// בדיקת חיבור
const chk = await get('/tg-check?key=k');
assert.deepEqual([chk.ok, chk.bot, chk.chat, chk.members], [true, 'hadashot3dakot_bot', 'החדשות ב-3 דקות', 7]);
console.log('✓ /tg-check');

// רילס: בלי מפתח פייסבוק – עולה רק לטלגרם כסרטון
sent.length = 0;
const r = await (await worker.fetch(new Request('https://x/reel?key=k&text=' + encodeURIComponent('החדשות של הערב'), { method: 'POST', body: new Uint8Array(20000) }), env, ctx)).json();
assert.equal(r.tg.id, 42);
assert.equal(sent[0].m, 'sendVideo');
assert.equal(sent[0].body.get('chat_id'), '@hadashot3dakot');
assert.equal(sent[0].body.get('caption'), 'החדשות של הערב');
const log = (await get('/stats')).posts[0];
assert.equal(log.tg, 'עלה');
console.log('✓ רילס לטלגרם');
console.log('הכול עבר');
