// בדיקת איכות החיפוש: שאילתות יומיומיות מול הקטלוג האמיתי; עוברת אם אחד מהיעדים המצופים בשלוש התוצאות הראשונות.
// הרצה: node tools/check_search.mjs   (דורש assets/catalog.json אחרי בנייה; נכשלת אם פחות מ-90% עוברים)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = fs.readFileSync(path.join(root, 'assets/catalog.json'), 'utf8');
const stub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : stub()), apply: () => stub(), set: () => true });
let eng = null;
globalThis.window = globalThis;
globalThis.__hkTest = (e) => { eng = e; };
globalThis.location = { pathname: '/kelim/' };
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.matchMedia = () => ({ matches: false });
globalThis.fetch = async () => ({ json: async () => JSON.parse(catalog) });
globalThis.document = { documentElement: { lang: 'he' }, getElementById: () => stub(), querySelector: () => null, addEventListener() {} };
await import(pathToFileURL(path.join(root, 'assets/search.js')).href);
await eng.load();

// [שאילתה, [יעדים מקובלים: מתחילים באחת מהכתובות האלה]]
const Q = [
  ['הקובץ גדול מדי', ['/kelim/machshev/pdf/', '/kelim/machshev/tmuna/', '/kelim/machshev/video/']],
  ['אין לי מדפסת לחתום', ['/kelim/machshev/chatima/']],
  ['מתי נכנסת שבת', ['/kodesh/shabat/']],
  ['קשה לי עכשיו', ['/nefesh/rega/']],
  ['להזמין לברית', ['/kelim/eruim/hazmana/', '/kodesh/simcha/', '/kodesh/tofes-brit/']],
  ['כמה אקבל נטו', ['/kesef/bruto-neto/']],
  ['נרות חנוכה', ['/kodesh/chanuka/nerot/']],
  ['תימלול', ['/kelim/tamlul/']],
  ['להמיר הקלטה לטקסט', ['/kelim/tamlul/']],
  ['מחשבון משכנתא', ['/kesef/halvaa/']],
  ['כמה אני בן', ['/kesef/gil/']],
  ['סביבון', ['/kodesh/chanuka/sevivon/']],
  ['שירים לחנוכה', ['/kodesh/chanuka/shirim/', '/kodesh/chanuka/shiron/']],
  ['לחבר כמה קבצי pdf', ['/kelim/machshev/ichud-pdf/']],
  ['קוד qr', ['/esek/qr/', '/kodesh/qr/']],
  ['סיסמה חזקה', ['/kelim/machshev/sisma/']],
  ['לתרגם מאנגלית', ['/kelim/tochen/tirgum/']],
  ['זמני היום', ['/kodesh/zmanim/']],
  ['איך מניחים תפילין', ['/kodesh/tefillin/', '/kodesh/boker/']],
  ['ברכת המזון', ['/kodesh/birkat-hamazon/']],
  ['תהילים', ['/kodesh/tehillim/']],
  ['גימטריה של שם', ['/kodesh/gimatria/']],
  ['חישוב מעמ', ['/kesef/maam/']],
  ['איזה תאריך עברי היום', ['/kodesh/taarich-ivri/', '/kodesh/luach-ivri/']],
  ['מעקב לחץ דם', ['/kelim/briut/madadim/']],
  ['לא לשכוח לקחת תרופות', ['/kelim/briut/tizkorot/', '/kelim/briut/trufot/']],
  ['לכתוב קורות חיים', ['/kelim/avoda/korot/']],
  ['מתי תאריך הלידה שלי', ['/kelim/herayon/']],
  ['שם לתינוק', ['/kelim/shemot/']],
  ['מי חייב למי בטיול', ['/kelim/tiyulim/hotzaot/']],
  ['להקריא טקסט בקול', ['/kelim/tochen/hakraa/']],
  ['לקצר קישור ארוך', ['/kelim/machshev/kitzur-kishurim/']],
  ['הג׳ימייל מלא', ['/kelim/machshev/gmail/', '/kelim/machshev/achsun-google/']],
  ['פרשת השבוע', ['/kodesh/parasha/']],
  ['מתי היארצייט', ['/kodesh/yahrzeit/', '/kelim/kehila/azkarot/']],
  ['מודעת אבל', ['/kodesh/azkara/']],
  ['ריבית דריבית', ['/kesef/ribit-dribit/']],
  ['כמה שווה דולר', ['/kelim/cheshbon/shaar/']],
  ['להקליט שיחה באנדרואיד', ['/kelim/android/']],
  ['הכרום איטי', ['/kelim/machshev/chrome-iti/']],
  ['מחקתי מייל בטעות', ['/kelim/machshev/gmail/shichzur/']],
  ['כמה קלוריות לאכול', ['/kelim/briut/kaloriot/']],
  ['כמה מילים יש בטקסט', ['/kelim/tochen/sfirat-milim/']],
  ['לוח הכפל', ['/limudim/luach-hakefel/']],
  ['הכנה לגיבוש', ['/kelim/miluim/gibush/']],
  ['מכתב התפטרות', ['/kelim/tochen/mail/hitpatrut/']],
  ['לשלוח וואטסאפ למספר שלא שמור', ['/kelim/machshev/whatsapp-lo-shamur/', '/kelim/tochen/kishur-wa/']],
  ['ברכה לחג', ['/kelim/kesharim/bracha-lechag/']],
  ['מחשבון משכנתה', ['/kesef/halvaa/']],
  ['תרגום קולי', ['/kelim/tochen/tirgum/koli/']],
];
let ok = 0; const bad = [];
for (const [q, want] of Q) {
  const got = eng.search(q, 'he').slice(0, 3).map((x) => x[1].u);
  const hit = got.some((u) => want.some((w) => u.startsWith(w)));
  if (hit) ok++; else bad.push(q + '  →  ' + (got.join(' , ') || '(ריק)'));
}
const pct = Math.round(ok * 1000 / Q.length) / 10;
console.log(`עברו ${ok} מתוך ${Q.length} (${pct}%)`);
bad.forEach((b) => console.log('  ✗ ' + b));
process.exit(pct >= 90 ? 0 : 1);
