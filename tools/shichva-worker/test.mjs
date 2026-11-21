// בדיקת מסלול האישור מקצה לקצה מול wrangler dev --local (ברירת מחדל http://127.0.0.1:8791).
// node test.mjs [base]   – בלי בינה (ai=0) כדי לא לבזבז מכסה; node test.mjs base ai  – גם הגבאי.
const BASE = process.argv[2] || 'http://127.0.0.1:8791';
const WITH_AI = process.argv[3] === 'ai';
const O = { origin: 'http://localhost:5000', 'content-type': 'application/json' };
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
async function call(path, tok, body, method) {
  const r = await fetch(BASE + path, { method: method || (body ? 'POST' : 'GET'), headers: { ...O, ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { s: r.status, ...j };
}

const g = await call('/grade/create', null, { name: 'מחזור בדיקה', rakaz_name: 'רכז', hachtara: '2027-03-21', melave_name: 'המלווה' });
ok(g.token, 'פתיחת שכבה');
const R = g.token;
let st = await call('/state', R);
ok(st.tasks.length === 14, 'נזרעו 14 משימות: ' + st.tasks.length);
ok(st.tasks.find(t => t.title === 'הזמנת אולם').due === '2027-02-09', 'יעד אולם = 40 יום לפני');
ok(/^\d{6}$/.test(st.grade.join_code) && /^\d{8}$/.test(st.grade.admin_code) && /^\d{7}$/.test(st.grade.melave_code), 'שלושה קודים');

const a = await call('/join', null, { code: st.grade.join_code, name: 'תלמיד א', klass: 'יב1' });
const b = await call('/join', null, { code: st.grade.join_code, name: 'תלמיד ב', klass: 'יב2' });
const c3 = await call('/join', null, { code: st.grade.join_code, name: 'תלמיד ג', klass: 'יב2' });
const mel = await call('/join', null, { code: st.grade.melave_code, name: 'המלווה' });
ok(a.role === 'chaver' && mel.role === 'melave', 'הצטרפות תלמיד ומלווה');
ok((await call('/join', null, { code: '000000', name: 'x' })).s === 404, 'קוד שגוי נדחה');

const cc = await call('/committee/create', R, { name: 'ממים', about: 'מם ליום' });
ok(cc.id, 'ועדה חדשה');
ok((await call('/committee/create', a.token, { name: 'x' })).s === 403, 'רק רכז פותח ועדה');
for (const t of [a.token, b.token, c3.token]) await call('/committee/join', t, { id: cc.id });
st = await call('/state', R);
const meA = st.members.find(m => m.name === 'תלמיד א');
await call('/committee/head', R, { id: cc.id, member: meA.id });
// קישור הצטרפות אישי לוועדה
const d = await call('/join', null, { code: st.grade.join_code, name: 'תלמיד ד', committee: cc.id });
st = await call('/state', R);
ok(st.committees[0].members.length === 4, 'קישור ועדה אישי מצרף לוועדה (4 חברים)');

const p = await call('/product/create', b.token, { committee_id: cc.id, kind: 'meme', title: 'מם על הקימה', data: { top: 'אני ב-6:59', bottom: 'השעון מקדים' }, light: { light: 'green', why: 'בדיקה' } });
ok(p.id, 'טיוטה נוצרה');
let melSt = await call('/state', mel.token);
ok(!melSt.products.some(x => x.id === p.id), 'המלווה לא רואה טיוטה');
ok(melSt.members.length === 0 && melSt.tasks.length === 0, 'המלווה לא רואה רשימת חברים ומשימות');
const p2 = await call('/product/create', b.token, { committee_id: cc.id, kind: 'text', title: 'הוא כל כך מכוער', body: '' });
ok(p2.light && p2.light.light === 'red', 'רמזור אדום למילה פוגענית');

// הצבעה: רוב פשוט (3 מתוך 4)
await call('/product/vote', b.token, { id: p.id });
await call('/product/vote', c3.token, { id: p.id });
let v = await call('/product/vote', d.token, { id: p.id });
ok(v.liked && v.votes === 3, 'רוב פשוט -> אהבנו');
ok((await call('/product/send', b.token, { id: p.id })).s === 403, 'רק ראש הוועדה שולח לאחראי');
ok((await call('/product/send', a.token, { id: p.id })).ok, 'ראש הוועדה שלח לאחראי הראשי');
ok((await call('/product/head', R, { id: p.id, action: 'back' })).s === 400, 'החזרה בלי הערה נדחית');
ok((await call('/product/head', R, { id: p.id, action: 'back', note: 'לקצר את השורה התחתונה' })).ok, 'הוחזר לוועדה עם הערה');
st = await call('/state', R);
let pr = st.products.find(x => x.id === p.id);
ok(pr.state === 'draft' && pr.history.some(h => h.note === 'לקצר את השורה התחתונה'), 'חזר לטיוטה וההערה בהיסטוריה');
await call('/product/edit', b.token, { id: p.id, data: { top: 'אני ב-6:59', bottom: 'מקדים' }, light: { light: 'green', why: 'x' } });
await call('/product/like', a.token, { id: p.id });
await call('/product/send', a.token, { id: p.id });
ok((await call('/product/head', R, { id: p.id, action: 'up', note: 'מוכן' })).ok, 'הועלה למלווה');
melSt = await call('/state', mel.token);
ok(melSt.products.some(x => x.id === p.id && x.state === 'melave'), 'המלווה רואה את מה שהועלה');
ok((await call('/product/melave', R, { id: p.id, action: 'ok' })).s === 403, 'רק המלווה מאשר');
ok((await call('/product/melave', mel.token, { id: p.id, action: 'ok', note: 'יפה' })).ok, 'המלווה אישר');
st = await call('/state', a.token);
ok(st.products.find(x => x.id === p.id).state === 'approved', 'מצב סופי: אושר');

// מם על איש צוות: אחרי אהבנו – אוטומטית למלווה
const ps = await call('/product/create', b.token, { committee_id: cc.id, kind: 'meme', title: 'הר"מ', about_staff: true, data: { top: 'עוד חמש דקות', bottom: '40 דקות אחר כך' }, light: { light: 'yellow', why: 'x' } });
await call('/product/like', a.token, { id: ps.id });
melSt = await call('/state', mel.token);
ok(melSt.products.some(x => x.id === ps.id && x.state === 'melave'), 'מם על איש צוות עבר אוטומטית למלווה');
ok((await call('/product/melave', mel.token, { id: ps.id, action: 'replace', note: 'נחליף בתמונה אחרת' })).ok, 'המלווה: להחליף עם הערה');

// משימות + שינוי תאריך הכתרה מזיז יעדים
const t0 = st.tasks.find(t => t.title === 'הזמנת אולם');
await call('/task/update', a.token, { id: t0.id, done: true, owner: 'תלמיד א' });
await call('/grade/update', R, { hachtara: '2027-03-28' });
st = await call('/state', R);
ok(st.tasks.find(t => t.id === t0.id).due === '2027-02-16' && st.progress > 0, 'תאריך חדש הזיז את היעדים, אחוז התקדמות ' + st.progress);
const nt = await call('/task/create', a.token, { title: 'משימה חדשה', due: '2027-03-01', committee_id: cc.id });
ok(nt.id, 'משימה חדשה');

// אלבום בלי R2
const al = await fetch(BASE + '/album/upload', { method: 'POST', headers: { origin: O.origin, authorization: 'Bearer ' + a.token }, body: new FormData() });
ok(al.status === 503, 'אלבום בלי R2 -> storage_off');

// הדגמה
const demo = await call('/join', null, { code: 'הדגמה', name: 'מבקר', role: 'melave' });
const ds = await call('/state', demo.token);
ok(ds.grade.demo && ds.products.length === 2 && ds.products.every(x => ['melave', 'approved', 'replace'].includes(x.state)), 'הדגמה: המלווה רואה רק 2 מוצרים שהועלו');
const dr = await call('/join', null, { code: 'הדגמה', name: 'מבקר', role: 'rakaz' });
const drs = await call('/state', dr.token);
ok(drs.products.length === 5 && drs.committees.length === 3 && !drs.grade.admin_code, 'הדגמה כרכז: 5 מוצרים, 3 ועדות, בלי קודים אמיתיים');

// ---- קיוסק ----
{
  const K = (path, tok, body) => call(path, tok, body, body === undefined ? 'GET' : 'POST');
  ok((await K('/kiosk/state', mel.token)).s === 403, 'קיוסק: המלווה חסום');
  const it = await K('/kiosk/item', R, { name: 'במבה', price: 300, min_stock: 3 });
  ok(it.id, 'קיוסק: מוצר חדש');
  ok((await K('/kiosk/item', a.token, { name: 'x', price: 1 })).s === 403, 'קיוסק: תלמיד רגיל לא מוסיף מוצר');
  ok((await K('/kiosk/sale', a.token, { item_id: it.id, qty: 1 })).s === 409, 'קיוסק: אי אפשר למכור בלי מלאי');
  const ex = await K('/kiosk/expense', R, { amount: 6000, item_id: it.id, qty: 20, method: 'cash' });
  ok(ex.id, 'קיוסק: קנייה נרשמה');
  ok((await K('/kiosk/expense', a.token, { amount: 100 })).s === 403, 'קיוסק: תלמיד רגיל לא רושם הוצאה');
  ok((await K('/kiosk/expense', R, { amount: -5 })).s === 400, 'קיוסק: סכום שלילי נדחה');
  const sale = await K('/kiosk/sale', a.token, { item_id: it.id, qty: 4, method: 'cash' });
  ok(sale.amount === 1200, 'קיוסק: מכירה 4×3 ש"ח = 1200 אגורות');
  let ks = await K('/kiosk/state', R);
  ok(ks.items[0].stock === 16 && ks.items[0].cost === 300, 'קיוסק: מלאי 16 ועלות 3 ש"ח ליחידה');
  ok(ks.cash === 1200 - 6000 && ks.total.profit === -4800, 'קיוסק: קופה ורווח נכונים');
  await K('/kiosk/sale', a.token, { item_id: it.id, qty: 13 });
  ks = await K('/kiosk/state', R);
  ok(ks.low.length === 1, 'קיוסק: התראת "נגמר" כשהמלאי מתחת לרף');
  ok((await K('/kiosk/shop', a.token, { action: 'low' })).added === 1, 'קיוסק: הרשימה התמלאה ממה שנגמר');
  ok((await K('/kiosk/void', R, { id: sale.id })).s === 400, 'קיוסק: ביטול דורש סיבה');
  ok((await K('/kiosk/void', R, { id: sale.id, reason: 'נרשם בטעות' })).ok, 'קיוסק: ביטול עם סיבה');
  ok((await K('/kiosk/void', R, { id: sale.id, reason: 'שוב' })).s === 409, 'קיוסק: אי אפשר לבטל פעמיים');
  ks = await K('/kiosk/state', R);
  ok(ks.items[0].stock === 7 && ks.tx.some(t => t.voided && t.void_reason), 'קיוסק: ביטול החזיר מלאי והשאיר עקבות');
  const cnt = await K('/kiosk/count', R, { counted: 100 });
  ok(cnt.diff === 100 - cnt.expected, 'קיוסק: ספירת קופה מחשבת פער');
  ok((await K('/kiosk/receipt/save', R, { tx: ex.id, mime: 'image/jpeg', data: 'A'.repeat(400) })).ok, 'קיוסק: קבלה נשמרה');
  const rr = await fetch(BASE + '/kiosk/receipt?tx=' + ex.id, { headers: { ...O, authorization: 'Bearer ' + R } });
  ok(rr.status === 200 && rr.headers.get('content-type') === 'image/jpeg', 'קיוסק: קבלה מוגשת לגזבר/רכז');
  const rr2 = await fetch(BASE + '/kiosk/receipt?tx=' + ex.id, { headers: { ...O, authorization: 'Bearer ' + a.token } });
  ok(rr2.status === 403, 'קיוסק: תלמיד רגיל לא רואה קבלות');
  const co = await K('/kiosk/coll', R, { title: 'דמי ערב', per_head: 5000, link: 'https://example.com/pay' });
  ok(co.id, 'גבייה: נפתחה');
  ok((await K('/kiosk/coll', R, { title: 'x', per_head: 1, link: 'javascript:alert(1)' })).s === 400, 'גבייה: רק קישור https');
  st = await call('/state', R);
  await K('/kiosk/paid', R, { coll_id: co.id, member_id: st.members[1].id, paid: true });
  ks = await K('/kiosk/state', R);
  ok(ks.coll[0].paid.length === 1, 'גבייה: סימון "שילם"');
  const sp = await K('/kiosk/sponsor', a.token, { business: 'פיצה הכיכר', package: 'לוגו בחוברת' });
  ok(sp.id, 'ספונסר נוסף');
  await K('/kiosk/sponsor', a.token, { id: sp.id, business: 'פיצה הכיכר', status: 'sent' });
  ks = await K('/kiosk/state', R);
  ok(ks.sponsors[0].status === 'sent', 'ספונסר: עדכון סטטוס');
  const sh = await K('/kiosk/shift', a.token, { action: 'take', day: '2027-01-10', slot: ks.slots[0] });
  ok(sh.ok, 'משמרת נתפסה');
}

if (WITH_AI) {
  const L = await call('/ai', a.token, { task: 'light', text: 'כשהמבחן במתמטיקה נדחה בפעם השלישית' });
  ok(['green', 'yellow', 'red'].includes(L.light), 'גבאי – רמזור: ' + L.light + ' ' + L.why);
  const C = await call('/ai', a.token, { task: 'captions', desc: 'תלמיד ישן על הגמרא בבית המדרש בבוקר' });
  ok(C.captions && C.captions.length >= 3, 'גבאי – כיתובים: ' + JSON.stringify(C.captions && C.captions[0]));
  const P = await call('/ai', a.token, { task: 'parody', lyrics: 'אני ואתה נשנה את העולם\nאני ואתה אז יבואו כולם', topic: 'הקימה לשחרית' });
  ok(P.lines && P.lines.length >= 2, 'גבאי – פרודיה: ' + JSON.stringify(P.lines && P.lines[0]));
  const E = await call('/ai', a.token, { task: 'edit', template: 'טריילר', words: 'טריילר מצחיק לערב ההכתרה', seconds: 30, photos: [{ note: 'כיתה ט' }, { note: 'טיול' }, { note: 'שבת' }] });
  ok(E.scenes && E.scenes.length >= 2, 'גבאי – תסריט עריכה: ' + (E.scenes && E.scenes.length) + ' סצנות');
  const AD = await call('/ai', a.token, { task: 'ad', about: 'הקיוסק של י"ב, במבה ושתייה קרה', offer: '1+1 בהפסקה השנייה', tone: 'funny' });
  ok(AD.headline && AD.weekly, 'גבאי – מודעה: ' + AD.headline);
  const SL = await call('/ai', a.token, { task: 'sponsor_letter', business: 'פיצה הכיכר', package: 'לוגו בחוברת ותודה בערב', sender: 'דני' });
  ok(SL.letter && SL.subject, 'גבאי – מכתב ספונסר: ' + SL.subject);
}
console.log(fails ? `\n${fails} FAIL` : '\nALL OK');
process.exit(fails ? 1 : 0);
