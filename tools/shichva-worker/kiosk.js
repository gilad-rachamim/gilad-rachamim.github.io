// קיוסק השכבה: פנקס הכנסות והוצאות, מלאי, רשימת קניות, משמרות, ספירת קופה, גבייה שכבתית וספונסרים.
// עקרונות (מהתוכנית של גילעד): האתר לא סולק ולא מחזיק כסף – זה פנקס בלבד.
//  * סכומים באגורות (מספר שלם). הפנקס לא נמחק: תיקון = ביטול עם סיבה, וכל ביטול נשאר גלוי.
//  * קבלה בצילום היא רשות. תמונה קטנה ודחוסה מהדפדפן, מוגשת רק לרכז ולגזבר.
//  * גבייה = קישור לקבוצת Bit/PayBox שהשכבה פתחה + טבלת "מי שילם" שהגזבר מסמן.
//  * ספונסרים = עסקים בלבד. שום שליחה אוטומטית מהשרת – הלקוח פותח את המייל/ווטסאפ של התלמיד.
//  * המלווה מהצוות לא רואה את הקיוסק בכלל.

const MAX_AMOUNT = 10_000_000;            // 100,000 ש"ח באגורות – תקרה לטעויות הקלדה
const MAX_RECEIPT = 380_000;              // תווי base64 (בערך 280KB)
const MAX_RECEIPTS = 300;
const SPONSOR_STATUS = ['new', 'letter', 'sent', 'talked', 'yes', 'no'];
const METHODS = ['cash', 'bit', 'other'];
const EXP_CATS = ['קנייה לקיוסק', 'ציוד', 'הדפסה ופרסום', 'אולם והגברה', 'אחר'];
export const SLOTS = ['הפסקה ראשונה', 'הפסקה שנייה', 'ערב'];

export async function handle(p, m, req, env, me, g, H) {
  const { bad, json, clean, rid, today, date } = H;
  if (me.role === 'melave') bad('forbidden', 403);
  const money = me.role === 'rakaz' || me.role === 'gizbar';
  const needMoney = () => { if (!money) bad('forbidden', 403); };
  const db = env.DB;
  const amount = v => { const n = Math.round(+v); return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? n : bad('amount'); };
  const qty = v => { const n = Math.round(+v); return Number.isFinite(n) && n > 0 && n <= 5000 ? n : bad('qty'); };
  const meth = v => METHODS.includes(v) ? v : 'cash';
  const url = v => { const s = String(v || '').trim().slice(0, 300); if (!s) return ''; return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : bad('link'); };

  if (p === '/kiosk/state' && m === 'GET') return json(await snapshot(db, g, me, money));
  if (p === '/kiosk/receipt' && m === 'GET') {
    needMoney();
    const id = new URL(req.url).searchParams.get('tx') || '';
    const r = await db.prepare('SELECT mime,data FROM k_receipt WHERE tx_id=? AND grade_id=?').bind(id, g.id).first() || bad('receipt', 404);
    const bin = Uint8Array.from(atob(r.data), c => c.charCodeAt(0));
    return new Response(bin, { headers: { 'Content-Type': r.mime, 'Cache-Control': 'no-store' } });
  }
  if (m !== 'POST') bad('not found', 404);

  // קבלה: גוף גדול יותר מהרגיל, לכן נקרא כאן
  if (p === '/kiosk/receipt/save') {
    needMoney();
    const t = await req.text();
    if (t.length > MAX_RECEIPT + 2000) bad('too_long', 413);
    let b; try { b = JSON.parse(t); } catch (e) { bad('bad_json'); }
    const tx = await db.prepare('SELECT id FROM k_tx WHERE id=? AND grade_id=?').bind(String(b.tx || ''), g.id).first() || bad('tx', 404);
    const mime = b.mime === 'image/png' ? 'image/png' : b.mime === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const data = String(b.data || '');
    if (!/^[A-Za-z0-9+/=]{100,}$/.test(data) || data.length > MAX_RECEIPT) bad('receipt');
    const n = await db.prepare('SELECT COUNT(*) c FROM k_receipt WHERE grade_id=?').bind(g.id).first();
    if (n.c >= MAX_RECEIPTS) bad('receipts_full', 409);
    await db.prepare('INSERT OR REPLACE INTO k_receipt (tx_id,grade_id,mime,data,created) VALUES (?,?,?,?,?)').bind(tx.id, g.id, mime, data, Date.now()).run();
    return json({ ok: true });
  }

  const b = JSON.parse((await req.text()) || '{}');
  const now = Date.now();
  const by = { id: me.id, name: me.name };

  switch (p) {
    case '/kiosk/item': {
      needMoney();
      const name = clean(b.name, 40) || bad('name');
      const price = Math.round(+b.price); if (!(price >= 0 && price <= 100000)) bad('price');
      const min = Math.max(0, Math.min(999, Math.round(+b.min_stock || 0)));
      const track = b.track === false || b.track === 0 ? 0 : 1;
      if (b.id) {
        const it = await db.prepare('SELECT id FROM k_items WHERE id=? AND grade_id=?').bind(String(b.id), g.id).first() || bad('item', 404);
        await db.prepare('UPDATE k_items SET name=?,price=?,min_stock=?,track=?,active=? WHERE id=?').bind(name, price, min, track, b.active === false ? 0 : 1, it.id).run();
        return json({ id: it.id });
      }
      const n = await db.prepare('SELECT COUNT(*) c FROM k_items WHERE grade_id=?').bind(g.id).first();
      if (n.c >= 60) bad('too_many', 409);
      const id = rid(10);
      await db.prepare('INSERT INTO k_items (id,grade_id,name,price,cost,stock,min_stock,track,active,created) VALUES (?,?,?,?,0,0,?,?,1,?)').bind(id, g.id, name, price, min, track, now).run();
      return json({ id });
    }
    case '/kiosk/sale': {
      const it = await db.prepare('SELECT * FROM k_items WHERE id=? AND grade_id=? AND active=1').bind(String(b.item_id || ''), g.id).first() || bad('item', 404);
      const q = qty(b.qty || 1);
      if (it.track) {
        const r = await db.prepare('UPDATE k_items SET stock=stock-? WHERE id=? AND stock>=?').bind(q, it.id, q).run();
        if (!r.meta.changes) bad('no_stock', 409);
      }
      const id = rid(12);
      await db.prepare('INSERT INTO k_tx (id,grade_id,kind,date,amount,item_id,item_name,qty,category,method,note,sale_id,by_id,by_name,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, g.id, 'income', today(), it.price * q, it.id, it.name, q, 'מכירה', meth(b.method), clean(b.note, 120), '', by.id, by.name, now).run();
      return json({ id, amount: it.price * q });
    }
    case '/kiosk/expense': {
      needMoney();
      const a = amount(b.amount);
      let it = null, q = 0;
      if (b.item_id) {
        it = await db.prepare('SELECT * FROM k_items WHERE id=? AND grade_id=?').bind(String(b.item_id), g.id).first() || bad('item', 404);
        q = qty(b.qty);
      }
      const cat = EXP_CATS.includes(b.category) ? b.category : (it ? 'קנייה לקיוסק' : 'אחר');
      const id = rid(12);
      const st = [db.prepare('INSERT INTO k_tx (id,grade_id,kind,date,amount,item_id,item_name,qty,category,method,note,sale_id,by_id,by_name,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, g.id, 'expense', date(b.date) || today(), a, it ? it.id : '', it ? it.name : '', q, cat, meth(b.method), clean(b.note, 120), '', by.id, by.name, now)];
      if (it) {
        st.push(db.prepare('UPDATE k_items SET stock=stock+?, cost=? WHERE id=?').bind(q, Math.round(a / q), it.id));
        st.push(db.prepare('DELETE FROM k_shop WHERE grade_id=? AND name=?').bind(g.id, it.name)); // קנינו – יורד מרשימת הקניות
      }
      await db.batch(st);
      return json({ id });
    }
    case '/kiosk/income': {
      needMoney();
      const a = amount(b.amount);
      const id = rid(12);
      await db.prepare('INSERT INTO k_tx (id,grade_id,kind,date,amount,item_id,item_name,qty,category,method,note,sale_id,by_id,by_name,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, g.id, 'income', date(b.date) || today(), a, '', '', 0, clean(b.category, 30) || 'תרומה או גבייה', meth(b.method), clean(b.note, 120), '', by.id, by.name, now).run();
      return json({ id });
    }
    case '/kiosk/void': {
      needMoney();
      const why = clean(b.reason, 120); if (why.length < 2) bad('reason');
      const t = await db.prepare('SELECT * FROM k_tx WHERE id=? AND grade_id=?').bind(String(b.id || ''), g.id).first() || bad('tx', 404);
      if (t.voided) bad('already', 409);
      const st = [db.prepare('UPDATE k_tx SET voided=1, void_reason=?, void_by=? WHERE id=?').bind(why, me.name, t.id)];
      if (t.item_id && t.qty) st.push(db.prepare('UPDATE k_items SET stock=MAX(0, stock+?) WHERE id=? AND grade_id=?').bind(t.kind === 'income' ? t.qty : -t.qty, t.item_id, g.id));
      await db.batch(st);
      return json({ ok: true });
    }
    case '/kiosk/count': {
      needMoney();
      const counted = Math.round(+b.counted); if (!(counted >= 0 && counted <= MAX_AMOUNT)) bad('amount');
      const exp = await cashBalance(db, g.id);
      await db.prepare('INSERT INTO k_count (id,grade_id,ts,counted,expected,diff,by_name,note) VALUES (?,?,?,?,?,?,?,?)').bind(rid(10), g.id, now, counted, exp, counted - exp, me.name, clean(b.note, 120)).run();
      return json({ expected: exp, diff: counted - exp });
    }
    case '/kiosk/shop': {
      if (b.action === 'add') {
        const name = clean(b.name, 40) || bad('name');
        const n = await db.prepare('SELECT COUNT(*) c FROM k_shop WHERE grade_id=?').bind(g.id).first();
        if (n.c >= 80) bad('too_many', 409);
        await db.prepare('INSERT INTO k_shop (id,grade_id,name,qty,done,created) VALUES (?,?,?,?,0,?)').bind(rid(10), g.id, name, clean(b.qty, 20), now).run();
      } else if (b.action === 'done') {
        await db.prepare('UPDATE k_shop SET done=? WHERE id=? AND grade_id=?').bind(b.done ? 1 : 0, String(b.id || ''), g.id).run();
      } else if (b.action === 'del') {
        await db.prepare('DELETE FROM k_shop WHERE id=? AND grade_id=?').bind(String(b.id || ''), g.id).run();
      } else if (b.action === 'low') { // מוסיף לרשימה את כל מה שנגמר
        const low = await db.prepare('SELECT name,min_stock,stock FROM k_items WHERE grade_id=? AND active=1 AND track=1 AND stock<=min_stock').bind(g.id).all();
        const have = new Set((await db.prepare('SELECT name FROM k_shop WHERE grade_id=? AND done=0').bind(g.id).all()).results.map(x => x.name));
        const add = low.results.filter(x => !have.has(x.name));
        if (add.length) await db.batch(add.map(x => db.prepare('INSERT INTO k_shop (id,grade_id,name,qty,done,created) VALUES (?,?,?,?,0,?)').bind(rid(10), g.id, x.name, '', now)));
        return json({ added: add.length });
      } else bad('action');
      return json({ ok: true });
    }
    case '/kiosk/shift': {
      const day = date(b.day) || bad('day');
      const slot = SLOTS.includes(b.slot) ? b.slot : bad('slot');
      if (b.action === 'take') {
        const target = money && b.member_id ? await db.prepare('SELECT id,name FROM members WHERE id=? AND grade_id=? AND role!=\'melave\'').bind(String(b.member_id), g.id).first() || bad('member', 404) : me;
        const ex = await db.prepare('SELECT 1 FROM k_shift WHERE grade_id=? AND day=? AND slot=? AND member_id=?').bind(g.id, day, slot, target.id).first();
        if (!ex) {
          const n = await db.prepare('SELECT COUNT(*) c FROM k_shift WHERE grade_id=? AND day=? AND slot=?').bind(g.id, day, slot).first();
          if (n.c >= 4) bad('full', 409);
          await db.prepare('INSERT INTO k_shift (id,grade_id,day,slot,member_id,name) VALUES (?,?,?,?,?,?)').bind(rid(10), g.id, day, slot, target.id, target.name).run();
        }
      } else if (b.action === 'leave') {
        const who = money && b.member_id ? String(b.member_id) : me.id;
        await db.prepare('DELETE FROM k_shift WHERE grade_id=? AND day=? AND slot=? AND member_id=?').bind(g.id, day, slot, who).run();
      } else bad('action');
      return json({ ok: true });
    }
    case '/kiosk/coll': {
      needMoney();
      if (b.action === 'delete') {
        const c = await db.prepare('SELECT id FROM k_coll WHERE id=? AND grade_id=?').bind(String(b.id || ''), g.id).first() || bad('coll', 404);
        await db.batch([db.prepare('DELETE FROM k_paid WHERE coll_id=?').bind(c.id), db.prepare('DELETE FROM k_coll WHERE id=?').bind(c.id)]);
        return json({ ok: true });
      }
      const title = clean(b.title, 60) || bad('title');
      const per = Math.round(+b.per_head); if (!(per >= 0 && per <= 1000000)) bad('amount');
      const link = url(b.link), due = date(b.due);
      if (b.id) {
        const c = await db.prepare('SELECT id FROM k_coll WHERE id=? AND grade_id=?').bind(String(b.id), g.id).first() || bad('coll', 404);
        await db.prepare('UPDATE k_coll SET title=?,per_head=?,link=?,due=? WHERE id=?').bind(title, per, link, due, c.id).run();
        return json({ id: c.id });
      }
      const n = await db.prepare('SELECT COUNT(*) c FROM k_coll WHERE grade_id=?').bind(g.id).first();
      if (n.c >= 20) bad('too_many', 409);
      const id = rid(10);
      await db.prepare('INSERT INTO k_coll (id,grade_id,title,per_head,link,due,created) VALUES (?,?,?,?,?,?,?)').bind(id, g.id, title, per, link, due, now).run();
      return json({ id });
    }
    case '/kiosk/paid': {
      needMoney();
      const c = await db.prepare('SELECT id FROM k_coll WHERE id=? AND grade_id=?').bind(String(b.coll_id || ''), g.id).first() || bad('coll', 404);
      const mm = await db.prepare('SELECT id FROM members WHERE id=? AND grade_id=? AND role!=\'melave\'').bind(String(b.member_id || ''), g.id).first() || bad('member', 404);
      if (b.paid) await db.prepare('INSERT OR REPLACE INTO k_paid (coll_id,member_id,ts) VALUES (?,?,?)').bind(c.id, mm.id, now).run();
      else await db.prepare('DELETE FROM k_paid WHERE coll_id=? AND member_id=?').bind(c.id, mm.id).run();
      return json({ ok: true });
    }
    case '/kiosk/sponsor': {
      if (b.action === 'delete') {
        needMoney();
        await db.prepare('DELETE FROM k_sponsor WHERE id=? AND grade_id=?').bind(String(b.id || ''), g.id).run();
        return json({ ok: true });
      }
      const business = clean(b.business, 60) || bad('name');
      const contact = clean(b.contact, 80), pack = clean(b.package, 40), note = clean(b.note, 200);
      const status = SPONSOR_STATUS.includes(b.status) ? b.status : 'new';
      if (b.id) {
        const s = await db.prepare('SELECT id FROM k_sponsor WHERE id=? AND grade_id=?').bind(String(b.id), g.id).first() || bad('sponsor', 404);
        await db.prepare('UPDATE k_sponsor SET business=?,contact=?,package=?,status=?,note=?,updated=? WHERE id=?').bind(business, contact, pack, status, note, now, s.id).run();
        return json({ id: s.id });
      }
      const n = await db.prepare('SELECT COUNT(*) c FROM k_sponsor WHERE grade_id=?').bind(g.id).first();
      if (n.c >= 20) bad('sponsor_max', 409);
      const id = rid(10);
      await db.prepare('INSERT INTO k_sponsor (id,grade_id,business,contact,package,status,note,updated) VALUES (?,?,?,?,?,?,?,?)').bind(id, g.id, business, contact, pack, status, note, now).run();
      return json({ id });
    }
  }
  bad('not found', 404);
}

async function cashBalance(db, gid) {
  const r = await db.prepare("SELECT COALESCE(SUM(CASE kind WHEN 'income' THEN amount ELSE -amount END),0) s FROM k_tx WHERE grade_id=? AND voided=0 AND method='cash'").bind(gid).first();
  return r.s;
}

async function snapshot(db, g, me, money) {
  const [items, tx, shop, shifts, counts, coll, paid, spons, months, top, rec, members] = await Promise.all([
    db.prepare('SELECT id,name,price,cost,stock,min_stock,track,active FROM k_items WHERE grade_id=? ORDER BY active DESC, name').bind(g.id).all(),
    db.prepare('SELECT id,kind,date,amount,item_name,qty,category,method,note,by_name,voided,void_reason,void_by,created FROM k_tx WHERE grade_id=? ORDER BY date DESC, created DESC LIMIT 300').bind(g.id).all(),
    db.prepare('SELECT id,name,qty,done FROM k_shop WHERE grade_id=? ORDER BY done, created').bind(g.id).all(),
    db.prepare('SELECT id,day,slot,member_id,name FROM k_shift WHERE grade_id=? AND day>=? ORDER BY day, slot').bind(g.id, shiftDay(-1)).all(),
    db.prepare('SELECT ts,counted,expected,diff,by_name,note FROM k_count WHERE grade_id=? ORDER BY ts DESC LIMIT 8').bind(g.id).all(),
    db.prepare('SELECT id,title,per_head,link,due FROM k_coll WHERE grade_id=? ORDER BY created DESC').bind(g.id).all(),
    db.prepare('SELECT p.coll_id c, p.member_id m FROM k_paid p JOIN k_coll c ON c.id=p.coll_id WHERE c.grade_id=?').bind(g.id).all(),
    db.prepare('SELECT id,business,contact,package,status,note,updated FROM k_sponsor WHERE grade_id=? ORDER BY updated DESC').bind(g.id).all(),
    db.prepare("SELECT substr(date,1,7) mo, COALESCE(SUM(CASE kind WHEN 'income' THEN amount END),0) inc, COALESCE(SUM(CASE kind WHEN 'expense' THEN amount END),0) exp FROM k_tx WHERE grade_id=? AND voided=0 GROUP BY mo ORDER BY mo DESC LIMIT 12").bind(g.id).all(),
    db.prepare("SELECT item_name n, SUM(qty) q, SUM(amount) a FROM k_tx WHERE grade_id=? AND voided=0 AND kind='income' AND item_id!='' GROUP BY item_name ORDER BY q DESC LIMIT 5").bind(g.id).all(),
    db.prepare('SELECT tx_id FROM k_receipt WHERE grade_id=?').bind(g.id).all(),
    db.prepare("SELECT id,name FROM members WHERE grade_id=? AND role!='melave' ORDER BY name").bind(g.id).all()
  ]);
  const cash = await cashBalance(db, g.id);
  const hasRec = new Set(rec.results.map(r => r.tx_id));
  const low = items.results.filter(i => i.active && i.track && i.stock <= i.min_stock).map(i => ({ id: i.id, name: i.name, stock: i.stock }));
  const tot = months.results.reduce((a, r) => ({ inc: a.inc + r.inc, exp: a.exp + r.exp }), { inc: 0, exp: 0 });
  return {
    money, cash, low, slots: SLOTS, cats: EXP_CATS,
    items: items.results,
    tx: tx.results.map(t => ({ ...t, receipt: money && hasRec.has(t.id) })),
    shop: shop.results, shifts: shifts.results, counts: money ? counts.results : [],
    coll: coll.results.map(c => ({ ...c, paid: paid.results.filter(x => x.c === c.id).map(x => x.m) })),
    members: members.results,
    sponsors: spons.results,
    months: months.results, top: top.results, total: { ...tot, profit: tot.inc - tot.exp }
  };
}
function shiftDay(d) { return new Date(Date.now() + d * 864e5).toISOString().slice(0, 10); }

// נתוני הדגמה לקיוסק (נקראים מתוך seedDemo, שמתאפס כל לילה)
export function demoRows(db, gid, now) {
  const D = i => new Date(now - i * 864e5).toISOString().slice(0, 10);
  const ins = (id, kind, d, a, item, q, cat, meth, by) => db.prepare('INSERT INTO k_tx (id,grade_id,kind,date,amount,item_id,item_name,qty,category,method,note,sale_id,by_id,by_name,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, gid, kind, d, a, item ? item[0] : '', item ? item[1] : '', q, cat, meth, '', '', 'd-rakaz', by, now);
  const IT = [['d-i1', 'במבה', 300, 120, 14, 8], ['d-i2', 'שתייה קרה', 400, 180, 3, 6], ['d-i3', 'שוקולד', 500, 250, 22, 5], ['d-i4', 'פיצה משולש', 800, 350, 0, 4]];
  const st = IT.map(([id, n, pr, c, s, mn]) => db.prepare('INSERT INTO k_items (id,grade_id,name,price,cost,stock,min_stock,track,active,created) VALUES (?,?,?,?,?,?,?,1,1,?)').bind(id, gid, n, pr, c, s, mn, now));
  st.push(ins('d-t1', 'expense', D(9), 24000, ['d-i1', 'במבה'], 100, 'קנייה לקיוסק', 'cash', 'אריאל (דוגמה)'));
  st.push(ins('d-t2', 'expense', D(8), 18000, ['d-i3', 'שוקולד'], 40, 'קנייה לקיוסק', 'cash', 'אריאל (דוגמה)'));
  st.push(ins('d-t3', 'income', D(6), 3900, ['d-i1', 'במבה'], 13, 'מכירה', 'cash', 'נועם (דוגמה)'));
  st.push(ins('d-t4', 'income', D(5), 4000, ['d-i3', 'שוקולד'], 8, 'מכירה', 'cash', 'יאיר (דוגמה)'));
  st.push(ins('d-t5', 'income', D(2), 2400, ['d-i2', 'שתייה קרה'], 6, 'מכירה', 'bit', 'נועם (דוגמה)'));
  st.push(ins('d-t6', 'expense', D(1), 5500, null, 0, 'הדפסה ופרסום', 'cash', 'אריאל (דוגמה)'));
  st.push(db.prepare("UPDATE k_tx SET voided=1, void_reason='נרשם פעמיים בטעות', void_by='אריאל (דוגמה)' WHERE id='d-t5'"));
  st.push(db.prepare('INSERT INTO k_shop (id,grade_id,name,qty,done,created) VALUES (?,?,?,?,0,?)').bind('d-s1', gid, 'שתייה קרה', '2 מארזים', now));
  st.push(db.prepare('INSERT INTO k_shift (id,grade_id,day,slot,member_id,name) VALUES (?,?,?,?,?,?)').bind('d-sh1', gid, D(-1), SLOTS[0], 'd-noam', 'נועם (דוגמה)'));
  st.push(db.prepare('INSERT INTO k_shift (id,grade_id,day,slot,member_id,name) VALUES (?,?,?,?,?,?)').bind('d-sh2', gid, D(-1), SLOTS[1], 'd-yair', 'יאיר (דוגמה)'));
  st.push(db.prepare('INSERT INTO k_coll (id,grade_id,title,per_head,link,due,created) VALUES (?,?,?,?,?,?,?)').bind('d-k1', gid, 'דמי השתתפות בערב ההכתרה', 5000, '', '', now));
  for (const m of ['d-noam', 'd-yair']) st.push(db.prepare('INSERT INTO k_paid (coll_id,member_id,ts) VALUES (?,?,?)').bind('d-k1', m, now));
  st.push(db.prepare('INSERT INTO k_sponsor (id,grade_id,business,contact,package,status,note,updated) VALUES (?,?,?,?,?,?,?,?)').bind('d-sp1', gid, 'פיצה הכיכר (דוגמה)', 'בעלים', 'לוגו בחוברת', 'letter', '', now));
  st.push(db.prepare('INSERT INTO k_sponsor (id,grade_id,business,contact,package,status,note,updated) VALUES (?,?,?,?,?,?,?,?)').bind('d-sp2', gid, 'מכולת השכונה (דוגמה)', '', 'תודה על המסך', 'new', '', now));
  return st;
}
