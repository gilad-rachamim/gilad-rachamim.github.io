# -*- coding: utf-8 -*-
"""Shared HTML blocks for the /kelim/android/ call pages (not a page itself)."""

# The maker + version picker. android-sicha.js fills it from /assets/android-sicha-data.json.
# data-brand preselects one maker (and hides the others) – used by the Xiaomi page.
def PICKER(h2_id, title, brand=""):
    return r'''
<section class="k-sec" aria-labelledby="%(id)s">
  <h2 id="%(id)s">%(title)s</h2>
  <div id="as-pick" data-brand="%(brand)s">
    <div class="ip-chips" id="as-brands" role="group" aria-label="בחירת יצרן הטלפון"></div>
    <div class="ip-field" id="as-var-wrap" hidden><label for="as-var">איזה דגם או גרסה?</label><select id="as-var"></select></div>
  </div>
  <div class="ip-out" id="as-how" hidden aria-live="polite"></div>
  <noscript><p class="ip-warn">כדי לראות את ההוראות לפי הטלפון שלכם צריך להפעיל JavaScript. בינתיים: אפליקציית <b>טלפון</b> ← ⋮ ← <b>הגדרות</b> ← לחפש <b>הקלטת שיחות</b>.</p></noscript>
  <p class="ip-why">לא יודעים איזה טלפון או גרסה יש לכם? <b>הגדרות</b> ← <b>אודות הטלפון</b> (בשיאומי: <b>אודות הטלפון</b> ← <b>גרסת HyperOS</b> או <b>MIUI</b>).</p>
</section>
''' % {"id": h2_id, "title": title, "brand": brand}


# Upload → transcription (the shared tamlul.js engine; same ids as /kelim/tamlul/).
def TAMLUL(h2_id, title, donate):
    return r'''
<section class="k-sec" aria-labelledby="%(id)s">
  <h2 id="%(id)s">%(title)s</h2>
  <div class="tool" id="tamlul">
    <div class="panel tl-pick">
      <label class="up" for="tl-file">📂 לבחור הקלטת שיחה מהטלפון<small>מתיקיית ההקלטות, מ"הקבצים שלי" או מההורדות</small></label>
      <input id="tl-file" type="file" accept="audio/*,video/*,.opus,.ogg,.m4a,.mp3,.wav,.aac,.amr,.3ga,.webm,.mp4">
      <button class="btn btn-line btn-block" id="tl-rec" type="button">🎙 להקליט עכשיו (במכשיר שני, ברמקול)</button>
      <div class="field"><label for="tl-lang">שפת השיחה</label>
        <select id="tl-lang"><option value="he">עברית</option><option value="en">אנגלית</option><option value="ar">ערבית</option><option value="ru">רוסית</option><option value="fr">צרפתית</option><option value="">לזהות לבד</option></select></div>
    </div>
    <p class="ip-why">💡 באנדרואיד אפשר גם בלי לפתוח את הדף: בהקלטה לוחצים <b>שיתוף</b> ובוחרים <b>הכלים של גילעד</b> (אחרי שהתקנתם את האתר או את האפליקציה). הקלטת שיחה מגיעה ישר ל<a class="gold" href="/kelim/android/yoman-sichot/">יומן השיחות</a>.</p>
    <p id="tl-quota"></p>
    <div id="tl-status" role="status" aria-live="polite" hidden></div>
    <div class="res" id="tl-limit" hidden>
      <h3>עברתם 60 דקות תמלול החודש 💛</h3>
      <p class="note">התמלול בחינם ובלי הגבלה. לחצו להמשיך ותמללו כמה שצריך.</p>
      <div class="tl-acts"><a class="btn btn-gold btn-sm" href="#" data-unlimited>להמשיך לתמלל</a><a class="btn btn-line btn-sm" href="/kelim/#litmoch" data-donate="%(donate)s">להיות שותף</a></div>
    </div>
    <div id="tl-print">
      <div class="res" id="tl-out" hidden>
        <h3 id="tl-name">התמלול</h3>
        <label class="check tl-stamps-row"><input type="checkbox" id="tl-stamps"> <span>להראות זמנים בתחילת כל פסקה</span></label>
        <div id="tl-text" dir="auto"></div>
        <div class="tl-acts">
          <button class="btn btn-gold btn-sm" id="tl-copy" type="button">להעתיק</button>
          <button class="btn btn-line btn-sm" id="tl-word" type="button">לשמור כוורד</button>
          <button class="btn btn-line btn-sm" id="tl-pdf" type="button">לשמור כ-PDF</button>
          <a class="btn btn-line btn-sm" id="tl-wa" href="#" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח בווטסאפ</a>
        </div>
      </div>
    </div>
  </div>
  <details class="ip-block"><summary><b>כבר יש לכם תמלול?</b> (למשל מבוט התמלול בטלגרם) מדביקים ומקבלים סיכום, משימות ותזכורות</summary>
    <div class="ip-field"><label for="as-paste">הטקסט של השיחה</label><textarea id="as-paste" rows="6" dir="auto"></textarea></div>
    <button class="btn btn-line btn-sm" id="as-paste-go" type="button">לסכם ולמצוא משימות</button>
  </details>
</section>
''' % {"id": h2_id, "title": title, "donate": donate}


# Summary, tasks, reminders and "save to the call journal". Filled by android-sicha.js.
def SUMMARY(h2_id, title):
    return r'''
<section class="k-sec" id="as-sum" hidden aria-labelledby="%(id)s">
  <h2 id="%(id)s">%(title)s</h2>
  <div class="ip-out">
    <h3>📝 הסיכום</h3>
    <ul class="k-list" id="as-sum-list"></ul>
    <div class="actions"><button class="btn btn-gold btn-sm" id="as-sum-copy" type="button">להעתיק את הסיכום</button><a class="btn btn-line btn-sm" id="as-sum-wa" href="#" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לעצמי בווטסאפ</a></div>
    <p class="ip-why">הסיכום בוחר את המשפטים החשובים מהשיחה: מה סוכם, מה צריך לעשות, סכומים ותאריכים. הוא לא ממציא ולא משנה מילים.</p>
  </div>
  <div class="ip-out">
    <h3>✅ משימות מהשיחה</h3>
    <p id="as-task-none" class="ip-why" hidden>לא מצאתי בשיחה משפט של "צריך", "לשלוח" או "לבדוק". אפשר להוסיף משימה בעצמכם.</p>
    <ul class="ip-list" id="as-tasks"></ul>
    <div class="actions"><button class="btn btn-line btn-sm" id="as-task-add" type="button">➕ להוסיף משימה</button></div>
  </div>
  <div class="ip-out">
    <h3>⏰ תזכורות ליומן גוגל</h3>
    <p id="as-rem-none" class="ip-why" hidden>לא מצאתי בשיחה תאריך או שעה. אפשר להוסיף תזכורת בעצמכם.</p>
    <ul class="ip-list" id="as-rem"></ul>
    <div class="actions"><button class="btn btn-line btn-sm" id="as-rem-add" type="button">➕ להוסיף תזכורת</button><button class="btn btn-gold btn-sm" id="as-rem-all" type="button" hidden>📅 את כולן ליומן (קובץ)</button></div>
    <p class="ip-why">"ליומן גוגל" פותח את היומן עם הפרטים מוכנים, ורק לוחצים "שמירה". "קובץ יומן" מתאים לכל יומן אחר בטלפון.</p>
  </div>
  <div class="ip-out as-save">
    <h3>📒 לשמור ביומן השיחות שלי</h3>
    <div class="ip-field"><label for="as-who">עם מי דיברתם?</label><input id="as-who" type="text" autocomplete="off" placeholder="למשל: יוסי מהמוסך"></div>
    <div class="ip-field"><label for="as-tags">תגיות (מופרדות בפסיק)</label><input id="as-tags" type="text" autocomplete="off" placeholder="רכב, תשלום"></div>
    <label class="check"><input type="checkbox" id="as-keep-audio"> <span>לשמור גם את ההקלטה עצמה בטלפון (תופס מקום)</span></label>
    <div class="actions"><button class="btn btn-gold btn-sm" id="as-save" type="button">לשמור ביומן</button><a class="btn btn-line btn-sm" href="/kelim/android/yoman-sichot/">לפתוח את היומן</a></div>
    <p class="ip-why" id="as-saved" role="status" aria-live="polite"></p>
  </div>
  <p class="ip-warn">🔒 הסיכום, המשימות והיומן נשמרים רק בטלפון שלכם. ההקלטה עוברת לשרת התמלול רק כדי להפוך לטקסט, ולא נשמרת שם.</p>
</section>
''' % {"id": h2_id, "title": title}
