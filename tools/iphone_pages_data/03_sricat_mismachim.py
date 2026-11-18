# -*- coding: utf-8 -*-
PAGE = {
 "slug": "sricat-mismachim",
 "tool": "iphone_sricat_mismachim",
 "crumb": "סריקת מסמכים",
 "title": "סריקת מסמכים באייפון – סורק חינמי ל-PDF, בלי אפליקציה",
 "description": "סריקת מסמכים באייפון ישר מהדפדפן: מצלמים, חותכים, מנקים לשחור-לבן ושומרים כמה דפים ב-PDF אחד. הכול נשאר בטלפון. בחינם, בלי הרשמה ובלי סימן מים.",
 "og_title": "סריקת מסמכים באייפון: סורק חינמי ל-PDF",
 "h1": "סריקת מסמכים באייפון: מצלמים, מנקים ושומרים PDF",
 "sub": "סורק שעובד ישר מהדף הזה, באייפון וגם באנדרואיד. מצלמים את הדף, חותכים את השוליים, והופכים לשחור-לבן נקי. כמה דפים נכנסים ל-PDF אחד. התמונות לא עולות לשום שרת.",
 "js": ["iphone-sorek.js"],
 "head": "<style>#sk-cv{max-width:100%;border-radius:10px;touch-action:none;display:block;margin:.5rem auto}#sk-pages{list-style:none;padding:0;display:grid;gap:.7rem}#sk-pages li{display:flex;gap:.8rem;align-items:center;border:1px solid var(--line);border-radius:12px;padding:.5rem}#sk-pages canvas{border-radius:6px;background:#fff;flex:0 0 110px}.sk-pg{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}.sk-pg b{flex:1 0 100%}.sk-in{position:absolute;width:1px;height:1px;opacity:0}.sk-up{display:block;text-align:center;padding:1.2rem 1rem;border:2px dashed var(--gold-soft);border-radius:16px;cursor:pointer;color:var(--cream);font-size:1.15rem;margin:.5rem 0}.sk-up small{display:block;color:var(--muted);font-size:.95rem;margin-top:.25rem}.sk-in:focus-visible+.sk-up,.sk-up:focus-within{outline:3px solid var(--gold)}</style>",
 "body": r'''
<section class="k-sec" aria-labelledby="sk-h1">
  <h2 id="sk-h1">שלב 1: מצלמים את הדף</h2>
  <input class="sk-in" id="sk-cam" type="file" accept="image/*" capture="environment">
  <label class="sk-up" for="sk-cam">📷 לצלם דף עכשיו<small>מניחים את הדף על משטח כהה, באור טוב, ומצלמים מלמעלה</small></label>
  <input class="sk-in" id="sk-gal" type="file" accept="image/*" multiple>
  <label class="sk-up" for="sk-gal" style="padding:.8rem 1rem;font-size:1rem">🖼 לבחור תמונות שכבר צילמתי</label>
  <p class="ip-why" id="sk-msg" role="status" aria-live="polite"></p>

  <div class="ip-out" id="sk-edit" hidden>
    <h3>שלב 2: חותכים ומנקים</h3>
    <p class="ip-why">גוררים את ארבע הנקודות הזהובות עד שרק הדף בפנים.</p>
    <canvas id="sk-cv" role="img" aria-label="התמונה שצולמה, עם מסגרת חיתוך"></canvas>
    <div class="ip-chips" id="sk-mode" role="group" aria-label="סוג הסריקה">
      <button type="button" data-m="bw" aria-pressed="true">שחור-לבן נקי</button>
      <button type="button" data-m="gray" aria-pressed="false">גווני אפור</button>
      <button type="button" data-m="color" aria-pressed="false">צבע</button>
    </div>
    <div class="actions">
      <button class="btn btn-gold" id="sk-add" type="button">✅ להוסיף את הדף</button>
      <button class="btn btn-line btn-sm" id="sk-rot" type="button">↻ לסובב</button>
      <button class="btn btn-line btn-sm" id="sk-full" type="button">בלי חיתוך</button>
      <button class="btn btn-line btn-sm" id="sk-skip" type="button">לדלג על התמונה</button>
    </div>
  </div>

  <ul id="sk-pages" aria-label="הדפים שנסרקו"></ul>

  <div class="ip-out" id="sk-out" hidden>
    <h3>שלב 3: שומרים PDF</h3>
    <p id="sk-count" class="ip-why"></p>
    <div class="ip-field"><label for="sk-name">שם הקובץ</label><input id="sk-name" type="text" value="מסמך סרוק" maxlength="60"></div>
    <div class="actions">
      <button class="btn btn-gold" id="sk-save" type="button">⬇ לשמור PDF</button>
      <button class="btn btn-line" id="sk-share" type="button" hidden>📤 לשתף (ווטסאפ, מייל, קבצים)</button>
    </div>
    <p class="ip-why">רוצים להוסיף עוד דף? פשוט מצלמים שוב למעלה. צריך לחתום על המסמך? <a class="gold" href="/kelim/machshev/chatima/">חתימה על PDF בטלפון</a>.</p>
  </div>
  <p class="ip-warn">🔒 הסריקה נעשית כולה בתוך הטלפון. התמונות וה-PDF לא נשלחים לשום שרת, ואין סימן מים.</p>
</section>

<section class="k-sec" aria-labelledby="sk-h2">
  <h2 id="sk-h2">הסורק שכבר יש לכם באייפון: בפתקים</h2>
  <ol class="ip-steps">
    <li>פותחים את <b>פתקים</b> ויוצרים פתק חדש.</li>
    <li>לוחצים על כפתור הקבצים המצורפים (מהדק או מצלמה, לפי הגרסה) ובוחרים <b>סריקת מסמכים</b>.</li>
    <li>מכוונים את המצלמה לדף. האייפון מזהה את הקצוות ומצלם לבד, או שלוחצים על כפתור הצילום.</li>
    <li>ממשיכים לדף הבא, ובסוף לוחצים <b>שמירה</b>. הסריקה נשמרת בפתק כ-PDF.</li>
  </ol>
  <p class="ip-why">לפי <a class="gold" href="https://support.apple.com/he-il/guide/iphone/iph653f28965/ios" target="_blank" rel="noopener">המדריך של אפל</a>. השמות יכולים להשתנות מעט בין גרסאות.</p>
</section>
''',
 "seo": r'''
  <h2 id="seo-h">סריקת מסמכים באייפון: שלוש דרכים, כולן בחינם</h2>
  <p>לא צריך סורק משרדי ולא צריך אפליקציה בתשלום. באייפון יש שלוש דרכים לסרוק מסמך ל-PDF: הסורק שבדף הזה, הסורק שמובנה באפליקציית פתקים, והסורק שבאפליקציית קבצים. כל אחת מתאימה למצב אחר. כאן מסבירים מתי להשתמש בכל אחת, ואיך מקבלים סריקה נקייה שנראית כמו מסורק אמיתי.</p>
  <h3>איך סורקים מסמכים דרך פתקים באייפון</h3>
  <p>פותחים פתק חדש, לוחצים על כפתור הקבצים המצורפים ובוחרים <b>סריקת מסמכים</b>. האייפון מזהה את הדף, מיישר אותו ומצלם. אפשר להמשיך לדף הבא, ובסוף <b>שמירה</b>. הסריקה נשארת בתוך הפתק. כדי לשלוח אותה, לוחצים עליה ואז על כפתור השיתוף. זו דרך מצוינת כשרוצים שהסריקה תישאר ב-iCloud עם שאר הפתקים.</p>
  <h3>מתי עדיף הסורק שבדף הזה</h3>
  <p>כשרוצים קובץ PDF ביד, מיד: לשלוח בווטסאפ, לצרף למייל או להעלות לאתר ממשלתי. כאן הקובץ יורד ישר לטלפון, עם השם שבחרתם, בלי לחפש אותו בתוך פתק. הסורק עובד גם באנדרואיד וגם במחשב עם מצלמה, אז אפשר לשלוח את הקישור להורים או לחבר שאין לו אייפון. ואפשר להוסיף לסריקה תמונות שכבר צילמתם קודם.</p>
  <h3>האם קיימת אפליקציית סורק חינם לאייפון</h3>
  <p>כן, והיא כבר אצלכם: הסורק של פתקים ושל קבצים הוא של אפל, בחינם ובלי פרסומות. רוב אפליקציות הסריקה בחנות מציעות ניסיון קצר ואז מנוי שבועי או שנתי, ולפעמים מוסיפות סימן מים. הסורק שכאן הוא חלק ממיזם של כלים בחינם: בלי הרשמה, בלי הגבלת דפים ובלי סימן מים.</p>
  <h3>איך מקבלים סריקה נקייה</h3>
  <p>שלושה דברים עושים את ההבדל. משטח כהה מתחת לדף, כדי שהקצוות יהיו ברורים. אור מהצד ולא מלמעלה, כדי שהטלפון לא יטיל צל. וצילום ישר מלמעלה. אחר כך בוחרים "שחור-לבן נקי": הכלי מסיר צללים ואור לא אחיד, ומשאיר נייר לבן וטקסט כהה. לתעודות, לתמונות ולמסמכים עם חותמת צבעונית עדיף "צבע".</p>
  <h3>איך סורקים תמונה או כמה דפים ל-PDF אחד</h3>
  <p>מצלמים דף, לוחצים "להוסיף את הדף", ומצלמים את הבא. כל הדפים מופיעים ברשימה, אפשר לשנות את הסדר או למחוק דף שיצא לא טוב. בסוף לוחצים "לשמור PDF" ומקבלים קובץ אחד בגודל A4. כבר יש לכם כמה קובצי PDF נפרדים? מאחדים אותם ב<a class="gold" href="/kelim/machshev/ichud-pdf/">כלי איחוד ה-PDF</a>.</p>
  <h3>איך סורקים באייפון 17 ובגרסאות החדשות</h3>
  <p>הסריקה בפתקים קיימת כבר שנים רבות, והיא עובדת באותה דרך גם באייפונים החדשים. מה שמשתנה בין גרסאות הוא בעיקר הצורה של הכפתור: פעם מצלמה, פעם מהדק. אם לא מוצאים אותו, הסורק שבדף הזה עובד בכל אייפון שיש בו Safari, בלי קשר לגרסה.</p>
  <h3>אחרי הסריקה: לחתום, לשלוח, לשמור</h3>
  <p>צריך לחתום על הטופס הסרוק? <a class="gold" href="/kelim/machshev/chatima/">חתימה על PDF</a> מהטלפון. צריך לשלוח אותו למקום שדורש פקס? <a class="gold" href="/kelim/machshev/fax/">לשלוח בלי פקס</a>. רוצים שהמסמכים יהיו מגובים? <a class="gold" href="/kelim/machshev/gibui/">גיבוי לטלפון</a>. וכל הכלים לבעלי אייפון: <a class="gold" href="/kelim/iphone/">כלים לאייפון</a>.</p>
  <h3>פרטיות: למה זה חשוב דווקא בסריקה</h3>
  <p>מסמכים סרוקים הם בדרך כלל הדברים הכי רגישים שיש: תעודת זהות, תלוש שכר, מסמך רפואי. לכן הסורק הזה לא מעלה כלום. התמונה נפתחת בדפדפן, החיתוך והניקוי נעשים בטלפון, וה-PDF נבנה בטלפון. אפשר לבדוק: אחרי שהדף נטען, הסורק עובד גם במצב טיסה.</p>
''',
 "faq": [
  ("איך סורקים מסמך באייפון?", "בדף הזה: מצלמים את הדף, חותכים, בוחרים שחור-לבן נקי ושומרים PDF. או באפליקציית פתקים: כפתור הקבצים המצורפים ואז 'סריקת מסמכים'."),
  ("יש סורק חינמי לאייפון בלי אפליקציה?", "כן. הסורק שבדף הזה עובד מהדפדפן, בחינם, בלי הרשמה ובלי סימן מים. גם הסורק שבפתקים של אפל הוא בחינם."),
  ("איך סורקים כמה דפים ל-PDF אחד?", "מצלמים דף ולוחצים 'להוסיף את הדף', ואז מצלמים את הבא. בסוף 'לשמור PDF' יוצר קובץ אחד עם כל הדפים."),
  ("התמונות שלי נשלחות לשרת?", "לא. החיתוך, הניקוי ובניית ה-PDF נעשים בתוך הטלפון. שום תמונה לא עולה לאינטרנט."),
  ("זה עובד גם באנדרואיד?", "כן. הסורק עובד בכל טלפון עם דפדפן ומצלמה, וגם במחשב."),
  ("איך שולחים את הסריקה בווטסאפ?", "לוחצים 'לשתף' ובוחרים ווטסאפ, או שומרים את ה-PDF ומצרפים אותו בצ'אט כמסמך."),
  ("איפה נשמר ה-PDF באייפון?", "באפליקציית קבצים, בתיקיית ההורדות. אפשר גם ללחוץ 'לשתף' ולבחור 'שמירה בקבצים' במקום אחר."),
  ("זה בחינם?", "כן. בחינם, בלי הרשמה, בלי פרסומות ובלי הגבלה על מספר הדפים."),
 ],
}
