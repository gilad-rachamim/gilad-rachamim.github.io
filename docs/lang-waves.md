# גלי תרגום – רוסית ואנגלית

תוכנית: `claude-plans/2026-11-24-tirgum-rusit-anglit.md` (OneDrive).

## גל 1 – כלי המוהלים (חי 24.11.2026, PR 833)

9 דפים × ru/en = 18 דפים, תחת `src/pages/kodesh/<section>/<lang>/`:
mohalim (מרכז), mohalim/bli-atar, kibudim-brit, kibudim-yechida, tofes-brit, britot,
britot-meyuchadot, hachlama, kartis-mohel.

- שער מקום ראשון: 18/18 (`first_place_gate.py check`).
- `lang_check --built`: 8 תחומים, 0 שגיאות.
- הגהת רוסית: שני סבבים – `docs/lang-review-wave1.md` (כל השורות טופלו או נדחו בנימוק).
- קובצי Word: `kodesh/britot/yoman-britot-{ru,en}.docx`, `kodesh/tofes-brit/tofes-brit-{ru,en}.docx`,
  `kodesh/hachlama/hodaot-hachlama-{ru,en}.docx` (נבנים ב-`tools/lang_docx.py`).

### נשאר בעברית עד גל 2
- קובצי ההדפסה וה-PDF של bli-atar.
- דפי ההורים הקצרים: `/mohel/hazmana/nusach/`, `/mohel/hachana/tekes/`, `/mohel/hachana/yom/` ושאר דפי `/mohel/`.

### לגילעד להחליט
- משחה: "בכל החתלה" (kibudim-brit) מול "פעמיים ביום, שלושה ימים" (hachlama) – סתירה במקור העברי.
- kartis-mohel: "הקישור נשאר אותו קישור" מול "שינוי = קישור חדש".
- נוסח הברכה «Пусть вы вырастите его…» ב-hachlama RU.
- טעות הקלדה בדף העברי של hachlama: "פנטן פלוס" ← "בפנטן פלוס".

### לקחים לגל הבא
- להעתיק את `<style>` של ה-head העברי לדפי ru/en (בלעדיו kartis-mohel גלש ל-1100px במובייל).
- בעת כתיבה מחדש של ה-meta: `json.dumps(..., ensure_ascii=False, indent=1)` + CRLF, אחרת כל ה-JSON נשטח.
- עברית בתוך `<option>` או placeholder לא ניתנת לסימון `lang="he"` – תעתיק.
- החלפות אוטומטיות: להגן על h1/title/description, ולבדוק משפטים שנשברו (סבב 2 מצא 6).

## גל 2 – דפי ההורים של אתר הברית (24.11.2026)
23 דפים × ru/en תחת `/mohel/ru/` ו-`/mohel/en/`: checklist, dapim, moed, madrich, shirim, brit-mila, מרכז `hachana` + 12 דפי משנה
(achrei, brit-yitzchak, keev, kniyot, moed, mohel, pidyon, pratim, sandak, shalom-zachar, tekes, yom), `hazmana` + brachot, nusach, kol-simcha.
- מסגרת האתר (`MOHEL_SITE_FRAME` ב-build.py) ברוסית ובאנגלית; קישור לדף שעוד לא תורגם מקבל "(иврит)"/"(Hebrew)".
- JS עם מפות שפה: checklist, hazmana, moed, nusach, pratim, spotify. העברית יוצאת זהה.
- הגהה: `docs/lang-review-wave2.md` (רוסית שני סבבים, אנגלית סקירה קצרה).
- בדפי גל 1 (hachlama, kibudim-brit, tofes-brit, mohalim) הסימון "(иврит)/(Hebrew)" הוחלף בקישורים לתרגומים.

### נשאר בעברית אחרי גל 2
- דף הבית `/mohel/`, `/mohel/kibudim/` ושאר דפי `/mohel/` שלא ברשימה.
- דפי ההזמנה לאורחים ולניהול (`/v/`, `/m/`), טופס הלידים (lead.js), דף התודה, ה-PDF ומיילי הטיפים של המדריך.
- הזמנה ברוסית/אנגלית: השפה נשמרת ב-`d.lg`, אבל ה-Worker של אישורי ההגעה (`tools/rsvp-worker`) לא שומר `lg` – צריך להוסיף ל-PUB ולפרוס (מחכה ל"כן" של גילעד).

### לקחים
- ספירת FAQ לפי ה-LD העברי: `<details>` במקום שאינו שאלה בעברית לא נספר – להוסיף שאלות בסוף.
- השער סופר מילים בדף הבנוי, נמוך בכ-50–100 מהטיוטה – לכוון ל-1,000.

## גל 3 – לא התחיל
