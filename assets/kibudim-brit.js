/* כיבודים בברית מילה – הכול נשמר רק במכשיר. הקישור לשיתוף נושא את הכרטיס ב-#d= */
(function(){
'use strict';
var LG=(document.documentElement.getAttribute('lang')||'he').slice(0,2), KEY='kodesh-kibudim-brit'+(LG==='ru'||LG==='en'?'-'+LG:''), $=function(id){return document.getElementById(id);};
var SITE='https://hakelim.com/kodesh/kibudim-brit/'+(LG==='ru'||LG==='en'?LG+'/':'');
var T=null;
function X(k,he){return T&&T.m[k]!=null?T.m[k]:he;}

var KIBS=[
 {id:'kvater',t:'קוואטר (חיקו)',d:'מביא את התינוק מהאם אל הקהל'},
 {id:'kise',t:'כסא של אליהו',d:'מניח את התינוק על כסא אליהו'},
 {id:'mikise',t:'מכסא של אליהו לאבי הבן',d:'נוטל את התינוק ומוסר לאבי הבן'},
 {id:'psukim',t:'הפסוקים והברכות',d:'פסוקי הברית וברכת המילה',fix:'אבי הבן והמוהל'},
 {id:'sandak',t:'סנדק',d:'מחזיק את התינוק בשעת המילה'},
 {id:'amida',t:'עמידה לברכות',d:'מחזיק את התינוק בעמידה בשעת הברכות',tag:'מנהג אשכנז',ns:['ashkenaz','chabad']},
 {id:'kidush',t:'קידוש',d:'ברכה על הכוס'},
 {id:'besamim',t:'ברכת הבשמים',d:'ברכה על ההדסים',ns:['sfarad','teiman']},
 {id:'kria',t:'קריאת שם',d:'התפילה שבה נקרא שם התינוק'},
 {id:'shira',t:'שירה ופיוטים',d:'פיוטי ברית בזמן הסעודה',off:1},
 {id:'dvar',t:'דברי תורה',d:'בסעודת המצווה',off:1},
 {id:'zimun',t:'זימון בברכת המזון',d:'מזמן ומברך בסוף הסעודה',off:1}
];
var THEMES=[['klaf','קלף וזהב','#fbf7ee','#b08d3c'],['tchelet','תכלת','#f5f9fd','#3f72a8'],['bordo','בורדו','#fcf6f4','#7d2333'],['zayit','ירוק זית','#f7f8f1','#5e6b2e'],
 ['vered','ורוד עדין','#fdf6f7','#b0607a'],['layla','לילה וזהב','#15213a','#d4b268'],['shachor','שחור וזהב','#141414','#c9a55c'],['lavan','לבן (חוסך דיו)','#ffffff','#6b6b6b']];
var HEB='אבגדהוזחטיכלמנסעפצקרשת'.split('');
var NS={sfarad:'ספרדי ועדות המזרח',ashkenaz:'אשכנזי',teiman:'תימני',chabad:'חב"ד'};

var CHECK=[
 ['לפני הברית',[
  ['p1','לתאם עם המוהל מקום ושעה'],['p2','לשלוח הזמנה לברית'],['p3','לבחור סנדק וקוואטר ולחלק כיבודים'],
  ['p4','למלא את טופס פרטי הברית למוהל'],['p5','להזמין אוכל לסעודת המצווה'],['p6','לארוז את התיק ערב לפני']]],
 ['להביא ביום הברית',[
  ['b1','כרית לברית'],['b2','יין אדום יבש וכוס לקידוש'],['b3','2 טליתות (לאבא ולסנדק)'],
  ['b4','בשמים או הדסים','מנהג ספרדי ותימני'],['b5','סידור ודפי סדר הברית'],['b6','כסא של אליהו','אם אין במקום'],
  ['b7','תיק החתלה, טיטולים ומגבונים'],['b8','חיתולי בד'],['b9','בגד לברית משני חלקים'],['b10','בגד החלפה ושמיכה דקה'],
  ['b11','מי סוכר ומוצץ','לפי המוהל'],['b12','כרטיסי הכיבודים מודפסים']]],
 ['בית מרקחת – לטיפול אחרי הברית',[
  ['m1','עזרקאין 5%','לפי הוראות המוהל'],['m2','אלכוהול 70% וצמר גפן'],['m3','נובימול','לפי הוראות המוהל'],
  ['m4','משחה אנטיביוטית','רק אם המוהל אמר'],['m5','משחת הנקה או שמן טבעי']]],
 ['לסעודה ולאורחים',[
  ['s1','כלים חד-פעמיים ומפות'],['s2','ברכונים לברכת המזון'],['s3','שתייה ועוגות לאורחים שמגיעים מוקדם']]]
];

var DEF={mode:'parent',nusach:'sfarad',family:'',when:'',note:'אין חובה לכבד בכל הכיבודים – המוהל יכול לדאוג להכול. רק עדכנו אותו מראש אילו כיבודים מתוכננים, ומי המכובדים.',
 theme:'klaf',size:'auto',title:'כיבודים בברית המילה',sub:'',font:'frank',frame:'double',orn:'✡',num:'circle',hlabel:'מכובד:',showd:true,showbsd:true,showcr:true,edits:{},mname:'',mphone:'',kib:{},order:null,custom:[],baby:'',father:'',mother:'',hour:'09:00',after:'shacharit',checks:{},extra:[],from:''};
var S;
var TR={"ru": {"kvq": "Кватер и кватерин", "letters": "АБВГДЕЖЗИКЛМНОПРСТУФХЦ", "k": {"kvater": ["Кватер", "Приносит ребёнка от матери к гостям", null, null], "kise": ["Кресло пророка Элиягу", "Кладёт ребёнка на кресло Элиягу", null, null], "mikise": ["С кресла Элиягу – отцу", "Берёт ребёнка с кресла и передаёт отцу", null, null], "psukim": ["Стихи и благословения", "Стихи брит-милы и благословение на обрезание", "Отец и моэль", null], "sandak": ["Сандак", "Держит ребёнка во время обрезания", null, null], "amida": ["Стоя на благословениях", "Держит ребёнка стоя во время благословений", null, "Ашкеназский обычай"], "kidush": ["Кидуш", "Благословение над бокалом вина", null, null], "besamim": ["Благословение над бесамим", "Благословение над миртом", null, null], "kria": ["Наречение имени", "Молитва, в которой ребёнку дают имя", null, null], "shira": ["Песни и пиюты", "Пиюты брит-милы во время трапезы", null, null], "dvar": ["Слово Торы", "На трапезе в честь заповеди", null, null], "zimun": ["Зимун в благословении после еды", "Ведёт и произносит благословение в конце трапезы", null, null]}, "th": ["Пергамент и золото", "Лазурный", "Бордовый", "Оливковый", "Нежно-розовый", "Ночь и золото", "Чёрный и золото", "Белый (экономит чернила)"], "ns": {"sfarad": "Сефардский и восточные общины", "ashkenaz": "Ашкеназский", "teiman": "Йеменский", "chabad": "Хабад"}, "check": [["До брит-милы", [["p1", "Договориться с моэлем о месте и времени"], ["p2", "Отправить приглашение на брит-милу"], ["p3", "Выбрать сандака и кватера и распределить почести"], ["p4", "Заполнить анкету для брит-милы для моэля"], ["p5", "Заказать еду для праздничной трапезы"], ["p6", "Собрать сумку накануне вечером"]]], ["Взять в день брит-милы", [["b1", "Подушка для брит-милы"], ["b2", "Сухое красное вино и бокал для кидуша"], ["b3", "2 талита (для отца и сандака)"], ["b4", "Бсамим (ароматические травы) или мирт", "сефардский и йеменский обычай"], ["b5", "Молитвенник и листы с порядком брит-милы"], ["b6", "Кресло пророка Элиягу", "если нет на месте"], ["b7", "Сумка для малыша (для смены подгузников), подгузники и влажные салфетки"], ["b8", "Тканевые пелёнки"], ["b9", "Одежда для брит-милы из двух частей"], ["b10", "Сменная одежда и тонкое одеяльце"], ["b11", "Сахарная вода и пустышка", "по указанию моэля"], ["b12", "Распечатанные карточки почестей"]]], ["Аптечка для ухода после брит-милы", [["m1", "Эсракаин 5% (Esracain)", "по указанию моэля"], ["m2", "Спирт 70% и вата"], ["m3", "Новимол", "по указанию моэля"], ["m4", "Антибактериальная мазь", "только если сказал моэль"], ["m5", "Крем для кормящих или натуральное масло"]]], ["Для трапезы и гостей", [["s1", "Одноразовая посуда и скатерти"], ["s2", "Книжечки для благословения после еды"], ["s3", "Напитки и выпечка для гостей, которые придут раньше"]]]], "m": {"note": "Необязательно распределять все почести – моэль может позаботиться обо всём. Просто заранее сообщите ему, какие почести запланированы и кто почётные гости.", "title": "Почести на брит-миле", "hl": "Почётный гость:", "base": " · Аккуратный список почестей для семьи и гостей", "cr": "hakelim.com · бесплатный генератор карточек почестей", "who": "Имя почётного гостя", "whoa": "Кто получает почесть: ", "edit": "Изменить название и пояснение", "up": "Выше", "down": "Ниже", "del_": "Удалить", "mohelc": "Моэль: ", "copied": "Скопировано", "cpfail": "Не удалось скопировать", "fn": "Почести-на-брит-миле", "busy": "Секунду…", "png_ok": "Картинка готова – можно отправить в WhatsApp", "png_err": "Не удалось создать картинку. Проверьте интернет и попробуйте снова.", "pdf_ok": "PDF скачан – печатайте в размере A5 (или «по размеру листа» на A4)", "pdf_err": "Не удалось создать PDF. Проверьте интернет и попробуйте снова.", "txt_ok": "Почести скопированы как текст", "link_ok": "Ссылка на карточку скопирована", "need_mohel": "Сначала впишите имя моэля", "sp": "Здравствуйте! 🌸\nЯ подготовил для вас карточку почестей на брит-мила. Откройте ссылку, впишите, кто получает каждую почесть, и отправьте мне обратно:\n", "full": "\n\nПолная карточка:\n", "addd": "Добавлено мной", "rd1": "Готово: ", "rd2": " из ", "miss": "*Что ещё осталось для брит-милы:*\n", "reset": "Сбросить все отметки?", "pl1": "Выход из дома с сумкой", "pl2": "Утренняя молитва (шахарит) на месте", "pl3": "Последнее кормление перед брит-милой (по согласованию с моэлем)", "pl4": "Подготовка места: кресло Элиягу, подушка, вино и бокал", "pl5": "Моэль осматривает ребёнка и готовится", "pl6": "Раздача карточек почётным гостям", "pl7": "Брит-мила", "pl8": "Благословение над бокалом и наречение имени", "pl9": "Ми шеберах для ребёнка, и он возвращается к маме", "pl10": "Праздничная трапеза (сеудат мицва)", "pl11": "Благословение после еды и зимун", "pl12": "Потом: наблюдение и смена повязки по указаниям моэля", "tcopy": "*Расписание дня брит-милы*", "tok": "Расписание скопировано", "k1": "*Наречение имени*\n", "k2": "\n\n*Ми шеберах для ребёнка*\n", "nok": "Тексты скопированы", "f1": "Карточку прислал моэль ", "f2": " – впишите имена почётных гостей и отправьте ему обратно", "fp": "Родители прислали вам список почестей – карточка готова к печати", "p1": "Название почести:", "p2": "Короткое пояснение (можно оставить пустым):"}}, "en": {"kvq": "Kvater and Kvaterin", "letters": "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "k": {"kvater": ["Kvater", "Brings the baby from the mother to the guests", null, null], "kise": ["Elijah's chair", "Places the baby on Elijah's chair", null, null], "mikise": ["From Elijah's chair to the father", "Takes the baby from the chair and hands him to the father", null, null], "psukim": ["Verses and blessings", "The verses of the brit and the blessing of the circumcision", "The father and the mohel", null], "sandak": ["Sandak", "Holds the baby during the circumcision", null, null], "amida": ["Standing for the blessings", "Holds the baby standing during the blessings", null, "Ashkenazi custom"], "kidush": ["Kiddush", "The blessing over the cup of wine", null, null], "besamim": ["Blessing over the spices", "The blessing over the myrtle", null, null], "kria": ["Naming", "The prayer in which the baby is given his name", null, null], "shira": ["Songs and piyyutim", "Brit songs during the meal", null, null], "dvar": ["Words of Torah", "At the festive meal", null, null], "zimun": ["Zimun before Grace", "Leads and recites the blessing at the end of the meal", null, null]}, "th": ["Parchment and gold", "Sky blue", "Burgundy", "Olive green", "Soft pink", "Night and gold", "Black and gold", "White (saves ink)"], "ns": {"sfarad": "Sephardi and Mizrahi communities", "ashkenaz": "Ashkenazi", "teiman": "Yemenite", "chabad": "Chabad"}, "check": [["Before the brit", [["p1", "Agree on a place and time with the mohel"], ["p2", "Send the invitation to the brit"], ["p3", "Choose a sandak and kvater and hand out the honors"], ["p4", "Fill in the brit details form for the mohel"], ["p5", "Order food for the festive meal"], ["p6", "Pack the bag the evening before"]]], ["To bring on the day of the brit", [["b1", "A brit cushion"], ["b2", "Dry red wine and a cup for Kiddush"], ["b3", "2 tallitot (for the father and the sandak)"], ["b4", "Spices or myrtle", "Sephardi and Yemenite custom"], ["b5", "A prayer book and the pages of the order of the brit"], ["b6", "Elijah's chair", "if there is none at the venue"], ["b7", "A changing bag, diapers and wipes"], ["b8", "Cloth diapers"], ["b9", "A two-piece outfit for the brit"], ["b10", "A change of clothes and a thin blanket"], ["b11", "Sugar water and a pacifier", "as the mohel advises"], ["b12", "Printed honors cards"]]], ["Medicine cabinet – for care after the brit", [["m1", "Esracain 5%", "as the mohel instructs"], ["m2", "70% alcohol and cotton wool"], ["m3", "Novimol", "as the mohel instructs"], ["m4", "Antibiotic ointment", "only if the mohel said so"], ["m5", "Nursing cream or a natural oil"]]], ["For the meal and the guests", [["s1", "Disposable tableware and tablecloths"], ["s2", "Booklets for Grace after Meals"], ["s3", "Drinks and cakes for guests who arrive early"]]]], "m": {"note": "There is no need to hand out every honor – the mohel can take care of everything. Just let him know in advance which honors are planned and who the honorees are.", "title": "Honors at the Brit Milah", "hl": "Honoree:", "base": " · An orderly list of honors for the family and guests", "cr": "hakelim.com · a free honors card maker", "who": "Honoree's name", "whoa": "Who is honored with: ", "edit": "Change the name and the description", "up": "Move up", "down": "Move down", "del_": "Delete", "mohelc": "Mohel: ", "copied": "Copied", "cpfail": "I could not copy", "fn": "Brit-honors", "busy": "One moment…", "png_ok": "The image is ready – you can send it on WhatsApp", "png_err": "I could not create the image. Check your connection and try again.", "pdf_ok": "The PDF was downloaded – print it at A5 size (or \"fit to page\" on A4)", "pdf_err": "I could not create the PDF. Check your connection and try again.", "txt_ok": "The honors were copied as text", "link_ok": "The link to the card was copied", "need_mohel": "Please write the mohel's name first", "sp": "Hello and welcome! 🌸\nI prepared an honors card for your brit. Open the link, write who is honored with each honor, and send it back to me:\n", "full": "\n\nThe full card:\n", "addd": "Added by me", "rd1": "Ready: ", "rd2": " of ", "miss": "*What is still missing for the brit:*\n", "reset": "Clear all the marks?", "pl1": "Leave home with the bag", "pl2": "Morning prayer (Shacharit) at the venue", "pl3": "Last feeding before the brit (coordinate with the mohel)", "pl4": "Set up the place: Elijah's chair, cushion, wine and cup", "pl5": "The mohel examines the baby and prepares", "pl6": "Hand out the honors cards to the honorees", "pl7": "The brit milah", "pl8": "Blessing over the cup and naming", "pl9": "Mi Sheberach for the baby, and he goes back to his mother", "pl10": "Festive meal (seudat mitzvah)", "pl11": "Grace after Meals and zimun", "pl12": "Afterwards: follow-up and changing the dressing as the mohel instructs", "tcopy": "*Schedule for the day of the brit*", "tok": "The schedule was copied", "k1": "*The naming*\n", "k2": "\n\n*Mi Sheberach for the baby*\n", "nok": "The texts were copied", "f1": "The card came from the mohel ", "f2": " – write the names of the honorees and send it back to him", "fp": "The parents sent you the honors – the card is ready for printing", "p1": "Name of the honor:", "p2": "Short description (can be left empty):"}}};
T=TR[LG]||null;
if(T){KIBS.forEach(function(k){var x=T.k[k.id];k.t=x[0];k.d=x[1];if(x[2])k.fix=x[2];if(x[3])k.tag=x[3];});THEMES.forEach(function(t,i){t[1]=T.th[i];});NS=T.ns;CHECK=T.check;HEB=T.letters.split('');DEF.note=T.m.note;DEF.title=T.m.title;DEF.hlabel=T.m.hl;}

function load(){
 try{S=JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){S=null;}
 S=Object.assign({},DEF,S||{});
 KIBS.forEach(function(k){if(!S.kib[k.id])S.kib[k.id]={on:defOn(k,S.nusach),name:''};});
 if(!Array.isArray(S.order))S.order=KIBS.map(function(k){return k.id;});
}
function defOn(k,ns){return k.off?false:(k.ns?k.ns.indexOf(ns)>=0:true);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function track(a){try{if(window.gtag)gtag('event','kibudim_brit'+(T?'_'+LG:''),{action:a});}catch(e){}}
function msg(t){var m=$('bt-msg');m.textContent=t;clearTimeout(msg.t);msg.t=setTimeout(function(){m.textContent='';},4500);}

/* ---------- קישור לשיתוף ---------- */
function b64e(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function b64d(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(decodeURIComponent(escape(atob(s))));}
function shareData(from){
 var o={v:1,ds:{ti:S.title,su:S.sub,fo:S.font,fr:S.frame,or:S.orn,nu:S.num,hl:S.hlabel,d:S.showd,b:S.showbsd,c:S.showcr,e:S.edits},ns:S.nusach,fa:S.family,w:S.when,no:S.note,th:S.theme,sz:S.size,mn:S.mname,mp:S.mphone,k:{},o:S.order,c:S.custom,b:S.baby,f:S.father};
 Object.keys(S.kib).forEach(function(id){var k=S.kib[id];o.k[id]=[k.on?1:0,k.name||''];});
 if(from)o.fr=from;
 return SITE+'#d='+b64e(o);
}
/* קישור לכרטיס בשפה של ההורים – לחלון "לשלוח בשפה שלהם" (mohel-hodaot.js) */
window.hoSuffix=function(lg){var s=SITE;SITE='https://hakelim.com/kodesh/kibudim-brit/'+(lg==='ru'||lg==='en'?lg+'/':'');try{return shareData('mohel');}finally{SITE=s;}};
function hoFill(){var t=$('ho-src');if(!t||t.value||S.mode!=='mohel')return;
 t.value='שלום וברוכים הבאים!\nהכנתי לכם כרטיס כיבודים לברית. פותחים את הקישור, כותבים מי מכובד בכל כיבוד, ושולחים לי בחזרה.'+(S.mname?'\n'+S.mname:'');}
function readHash(){
 var m=location.hash.match(/[#&]d=([\w-]+)/); if(!m)return;
 try{
  var o=b64d(m[1]);
  if(o.ds){var d=o.ds;S.title=d.ti||S.title;S.sub=d.su||'';S.font=d.fo||S.font;S.frame=d.fr||S.frame;if(typeof d.or==='string')S.orn=d.or;S.num=d.nu||S.num;if(typeof d.hl==='string')S.hlabel=d.hl;
   S.showd=d.d!==false;S.showbsd=d.b!==false;S.showcr=d.c!==false;if(d.e)S.edits=d.e;}
  S.nusach=NS[o.ns]?o.ns:S.nusach; S.family=o.fa||''; S.when=o.w||''; if(typeof o.no==='string')S.note=o.no;
  S.theme=o.th||S.theme; S.size=o.sz||S.size; S.mname=o.mn||''; S.mphone=o.mp||'';
  if(o.k)Object.keys(o.k).forEach(function(id){S.kib[id]={on:!!o.k[id][0],name:o.k[id][1]||''};});
  if(Array.isArray(o.o))S.order=o.o; if(Array.isArray(o.c))S.custom=o.c;
  if(o.b)S.baby=o.b; if(o.f)S.father=o.f;
  S.from=o.fr||'';
  if(o.fr==='mohel')S.mode='parent';
  if(o.fr==='parent')S.mode='mohel';
  save(); track('open_link_'+(o.fr||'share'));
 }catch(e){}
 try{history.replaceState(null,'',location.pathname);}catch(e){}
}

/* ---------- רשימת הכיבודים בטופס ---------- */
function allItems(){
 var map={};KIBS.forEach(function(k){map[k.id]=k;});
 S.custom.forEach(function(c){map[c.id]={id:c.id,t:c.t,d:'',custom:1};});
 var ids=S.order.filter(function(id){return map[id];});
 Object.keys(map).forEach(function(id){if(ids.indexOf(id)<0)ids.push(id);});
 S.order=ids;
 return ids.map(function(id){var k=map[id];if(!S.kib[id])S.kib[id]={on:true,name:''};return k;});
}
function kibTitle(k){var e=S.edits[k.id];if(e&&e.t)return e.t;return k.id==='kvater'&&S.nusach==='ashkenaz'?(T?T.kvq:'קוואטר וקוואטרין'):k.t;}
function kibDesc(k){var e=S.edits[k.id];return e&&typeof e.d==='string'?e.d:(k.d||'');}
function renderForm(){
 var ol=$('bt-kib-list');
 ol.innerHTML=allItems().map(function(k,i){
  var st=S.kib[k.id], id='bt-k-'+k.id;
  return '<li class="bt-k'+(st.on?'':' off')+'" data-id="'+k.id+'">'+
   '<input type="checkbox" id="'+id+'"'+(st.on?' checked':'')+'>'+
   '<label for="'+id+'">'+esc(kibTitle(k))+(kibDesc(k)?'<small>'+esc(kibDesc(k))+'</small>':'')+'</label>'+
   (k.fix?'<span class="bt-kfix">'+esc(k.fix)+'</span>':'<input class="bt-kn" type="text" maxlength="40" placeholder="'+X('who','שם המכובד')+'" aria-label="'+X('whoa','מי מכובד ב')+esc(kibTitle(k))+'" value="'+esc(st.name)+'">')+
   '<span class="bt-mv"><button type="button" class="bt-ed" aria-label="'+X('edit','לשנות שם והסבר')+'">✎</button><button type="button" data-mv="-1" aria-label="'+X('up','להעלות')+'">▲</button><button type="button" data-mv="1" aria-label="'+X('down','להוריד')+'">▼</button></span>'+
   (k.custom?'<button type="button" class="bt-del" aria-label="'+X('del_','למחוק')+'">×</button>':'')+
  '</li>';
 }).join('');
}
$('bt-kib-list')||0;

/* ---------- הכרטיס ---------- */
function renderCard(){
 var card=$('bt-card'), items=allItems().filter(function(k){return S.kib[k.id].on;});
 card.className='bt-card t-'+S.theme+' f-'+S.font+' fr-'+S.frame+' n-'+S.num+(S.showd?'':' no-d')+' s-'+(S.size==='auto'?(items.length>10?'small':items.length<=6?'big':'mid'):S.size);
 $('bt-ct').textContent=S.title||X('title','כיבודים בברית המילה');
 $('bt-bsd').hidden=!S.showbsd;
 var oc=$('bt-orn-c'); oc.textContent=S.orn; oc.classList.toggle('empty',!S.orn);
 var sub=[];
 if(S.family)sub.push('<b>'+esc(S.family)+'</b>');
 if(S.when)sub.push(esc(S.when));
 var base=S.sub?esc(S.sub):(T?'<span lang="he" dir="rtl">זה אֵלִי וְאַנְוֵהוּ</span>'+T.m.base:'"זה אֵלִי וְאַנְוֵהוּ" · רשימה מסודרת לכיבוד המשפחה והאורחים');
 $('bt-cs').innerHTML=sub.length?(S.sub?base+'<br>':'')+sub.join(' · '):base;
 $('bt-cl').innerHTML=items.map(function(k,i){
  var st=S.kib[k.id];
  return '<li><span class="n">'+(S.num==='heb'?(HEB[i]||i+1):(i+1))+'</span><span class="t">'+esc(kibTitle(k))+(k.tag&&S.nusach!=='ashkenaz'?'<span class="tag">'+esc(k.tag)+'</span>':'')+
   (kibDesc(k)?'<small>'+esc(kibDesc(k))+'</small>':'')+'</span><span class="h">'+(k.fix?'<b class="fix">'+esc(k.fix)+'</b>':esc(S.hlabel)+'<b>'+esc(st.name)+'</b>')+'</span></li>';
 }).join('');
 $('bt-cn').textContent=S.note||'';
 var f='';
 if(S.mname||S.mphone){
  f=esc(S.mname)+(S.mname&&S.mphone?'<span class="sep">❖</span>':'')+(S.mphone?'<span class="ph">'+esc(S.mphone)+'</span>':'');
 }
 $('bt-cf').innerHTML=f+(S.showcr?'<span class="cr">'+X('cr','hakelim.com · מחולל כרטיסי כיבודים בחינם')+'</span>':'');
 fit();
}
function fit(){
 var wrap=$('bt-preview'), card=$('bt-card'); if(!wrap)return;
 var w=wrap.clientWidth||559, sc=Math.min(1,w/559);
 card.style.transform='scale('+sc+')'; wrap.style.height=Math.round(794*sc)+'px';
}

/* ---------- טקסט לווטסאפ ---------- */
function cardText(){
 var items=allItems().filter(function(k){return S.kib[k.id].on;});
 var t='*'+X('title','כיבודים בברית המילה')+'*'+(S.family?' – '+S.family:'')+'\n'+(S.when?S.when+'\n':'')+'\n';
 items.forEach(function(k,i){var st=S.kib[k.id];t+=(i+1)+'. '+kibTitle(k)+': '+(k.fix||st.name||'______')+'\n';});
 if(S.mname)t+='\n'+X('mohelc','המוהל: ')+S.mname+(S.mphone?' '+S.mphone:'');
 return t;
}
function waOpen(text,phone){
 var p=(phone||'').replace(/\D/g,''); if(p.charAt(0)==='0')p='972'+p.slice(1);
 window.open('https://wa.me/'+(p.length>=11?p:'')+'?text='+encodeURIComponent(text),'_blank','noopener');
}
function copy(t,ok){
 function done(){msg(ok||X('copied','הועתק'));}
 if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(done,fallback);}else fallback();
 function fallback(){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy');done();}catch(e){msg(X('cpfail','לא הצלחתי להעתיק'));}a.remove();}
}

/* ---------- PNG ו-PDF ---------- */
var libs={};
function lib(src){
 if(!libs[src])libs[src]=new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){libs[src]=null;rej();};document.head.appendChild(s);});
 return libs[src];
}
function snap(){
 return lib('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js').then(function(){
  return (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve());
 }).then(function(){
  var holder=document.createElement('div');
  holder.style.cssText='position:fixed;top:0;left:-10000px;width:559px;height:794px;z-index:-1';
  var c=$('bt-card').cloneNode(true); c.removeAttribute('id'); c.style.transform='none';
  holder.appendChild(c); document.body.appendChild(holder);
  var bg=getComputedStyle(c).getPropertyValue('--p').trim()||'#fbf7ee';
  return html2canvas(c,{scale:2.6,backgroundColor:bg,useCORS:true,logging:false}).then(function(cv){holder.remove();return cv;},function(e){holder.remove();throw e;});
 });
}
function fname(ext){return X('fn','כיבודים-בברית')+(S.family?'-'+S.family.replace(/[\\/:*?"<>|]/g,''):'')+'.'+ext;}
function busy(btn,on){btn.disabled=on;if(on){btn.dataset.t=btn.textContent;btn.textContent=X('busy','רגע…');}else if(btn.dataset.t){btn.textContent=btn.dataset.t;}}
$('bt-png').addEventListener('click',function(){
 var btn=this;busy(btn,true);
 snap().then(function(cv){
  cv.toBlob(function(blob){
   busy(btn,false);
   var file=new File([blob],fname('png'),{type:'image/png'});
   if(navigator.canShare&&navigator.canShare({files:[file]})&&/Android|iPhone|iPad/i.test(navigator.userAgent)){
    navigator.share({files:[file],title:X('title','כיבודים בברית המילה')}).catch(function(){});
   }else{var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},4000);}
   msg(X('png_ok','התמונה מוכנה – אפשר לשלוח בווטסאפ'));
  },'image/png');
  track('png');
 }).catch(function(){busy(btn,false);msg(X('png_err','לא הצלחתי ליצור תמונה. בדקו חיבור לאינטרנט ונסו שוב.'));});
});
$('bt-pdf').addEventListener('click',function(){
 var btn=this;busy(btn,true);
 Promise.all([snap(),lib('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')]).then(function(r){
  var pdf=new window.jspdf.jsPDF('p','mm','a5');
  pdf.addImage(r[0].toDataURL('image/jpeg',0.94),'JPEG',0,0,148,210);
  pdf.save(fname('pdf'));busy(btn,false);msg(X('pdf_ok','ה-PDF ירד – מדפיסים בגודל A5 (או "התאם לדף" ב-A4)'));track('pdf');
 }).catch(function(){busy(btn,false);msg(X('pdf_err','לא הצלחתי ליצור PDF. בדקו חיבור לאינטרנט ונסו שוב.'));});
});
$('bt-txt').addEventListener('click',function(){copy(cardText(),X('txt_ok','הכיבודים הועתקו כטקסט'));track('text');});
$('bt-link').addEventListener('click',function(){copy(shareData(S.mode==='mohel'?'mohel':'share'),X('link_ok','הקישור לכרטיס הועתק'));track('link');});
$('bt-send-parents').addEventListener('click',function(){
 if(!S.mname){msg(X('need_mohel','כתבו קודם את שם המוהל'));$('bt-mname').focus();return;}
 waOpen(X('sp','שלום וברוכים הבאים! 🌸\nהכנתי לכם כרטיס כיבודים לברית. פותחים את הקישור, כותבים מי מכובד בכל כיבוד, ושולחים לי בחזרה:\n')+shareData('mohel')+'\n\n'+S.mname);
 track('send_parents');
});
$('bt-send-mohel').addEventListener('click',function(){
 waOpen(cardText()+X('full','\n\nהכרטיס המלא:\n')+shareData('parent'),S.mphone);
 track('send_mohel');
});

/* ---------- רשימת ציוד ---------- */
function renderCheck(){
 var groups=CHECK.slice(); if(S.extra.length)groups=groups.concat([[X('addd','הוספתי'),S.extra.map(function(x){return [x.id,x.t,'',1];})]]);
 var all=0,done=0;
 $('bt-check').innerHTML=groups.map(function(g){
  return '<div class="bt-grp"><h3>'+esc(g[0])+'</h3><ul>'+g[1].map(function(it){
   all++; var on=!!S.checks[it[0]]; if(on)done++;
   return '<li><input type="checkbox" id="c-'+it[0]+'" data-c="'+it[0]+'"'+(on?' checked':'')+'><label for="c-'+it[0]+'">'+esc(it[1])+(it[2]?' <small>('+esc(it[2])+')</small>':'')+'</label>'+(it[3]?'<button type="button" class="bt-del" data-x="'+it[0]+'" aria-label="'+X('del_','למחוק')+'">×</button>':'')+'</li>';
  }).join('')+'</ul></div>';
 }).join('');
 $('bt-count').textContent=X('rd1','מוכן: ')+done+X('rd2',' מתוך ')+all;
}
function missing(){
 var t=X('miss','*מה עוד חסר לברית:*\n');
 CHECK.concat([['',S.extra.map(function(x){return [x.id,x.t];})]]).forEach(function(g){g[1].forEach(function(it){if(!S.checks[it[0]])t+='☐ '+it[1]+'\n';});});
 return t;
}
$('bt-check').addEventListener('change',function(e){var id=e.target.dataset.c;if(!id)return;if(e.target.checked)S.checks[id]=1;else delete S.checks[id];save();renderCheck();});
$('bt-check').addEventListener('click',function(e){var x=e.target.dataset&&e.target.dataset.x;if(!x)return;S.extra=S.extra.filter(function(i){return i.id!==x;});delete S.checks[x];save();renderCheck();});
function addCheck(){var v=$('bt-newc').value.trim();if(!v)return;S.extra.push({id:'x'+Date.now().toString(36),t:v});$('bt-newc').value='';save();renderCheck();}
$('bt-addc').addEventListener('click',addCheck);
$('bt-newc').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();addCheck();}});
$('bt-check-wa').addEventListener('click',function(){waOpen(missing());track('check_wa');});
$('bt-check-reset').addEventListener('click',function(){if(confirm(X('reset','לנקות את כל הסימונים?'))){S.checks={};save();renderCheck();}});

/* ---------- לוח זמנים ---------- */
function plan(){
 var sh=S.after==='shacharit';
 var L=[[sh?-105:-80,X('pl1','יציאה מהבית עם התיק')],sh?[-90,X('pl2','תפילת שחרית במקום')] : null,[-60,X('pl3','האכלה אחרונה לפני הברית (בתיאום עם המוהל)')],
  [-40,X('pl4','הכנת המקום: כסא אליהו, כרית, יין וכוס')],[-25,X('pl5','המוהל בודק את התינוק ומתכונן')],[-10,X('pl6','חלוקת כרטיסי הכיבודים למכובדים')],
  [0,X('pl7','ברית המילה'),1],[5,X('pl8','ברכה על הכוס וקריאת השם'),1],[10,X('pl9','מי שברך לרך הנימול, והתינוק חוזר לאמא')],
  [20,X('pl10','סעודת מצווה')],[75,X('pl11','ברכת המזון וזימון')],[null,X('pl12','אחר כך: מעקב והחלפת חבישה לפי הוראות המוהל')]];
 return L.filter(Boolean);
}
function hm(base,off){
 if(off===null)return '';
 var p=(base||'09:00').split(':'),m=(+p[0])*60+(+p[1]||0)+off; m=(m%1440+1440)%1440;
 return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+m%60).slice(-2);
}
function renderTimes(){
 $('bt-times').innerHTML=plan().map(function(r){return '<li'+(r[2]?' class="main"':'')+'><time>'+hm(S.hour,r[0])+'</time><span>'+esc(r[1])+'</span></li>';}).join('');
}
$('bt-time-copy').addEventListener('click',function(){
 copy(X('tcopy','*לוח זמנים ליום הברית*')+(S.family?' – '+S.family:'')+'\n'+plan().map(function(r){return (r[0]===null?'':hm(S.hour,r[0])+' – ')+r[1];}).join('\n'),X('tok','לוח הזמנים הועתק'));
 track('times');
});

/* ---------- נוסחים ---------- */
function nm(v,ph){return '<mark>'+esc(v||ph)+'</mark>';}
function txtKria(h){var b=h?nm(S.baby,'___'):(S.baby||'___'),f=h?nm(S.father,'___'):(S.father||'___');
 return 'אלוהינו ואלוהי אבותינו, קיים את הילד הזה לאביו ולאמו, ויקרא שמו בישראל '+b+' בן '+f+'. ישמח האב ביוצא חלציו, ותגל אמו בפרי בטנה, ככתוב: ישמח אביך ואמך ותגל יולדתך. … '+b+' זה הקטן גדול יהיה. כשם שנכנס לברית, כן ייכנס לתורה ולחופה ולמעשים טובים.';}
function txtMsb(h){var b=h?nm(S.baby,'___'):(S.baby||'___'),f=h?nm(S.father,'___'):(S.father||'___'),m=S.mother?(h?nm(S.mother,''):S.mother):'';
 return 'מי שברך אבותינו אברהם יצחק ויעקב, הוא יברך את הילד הרך הנימול '+b+' בן '+f+(m?' (ויש אומרים: בן '+m+')':'')+', וירפאהו רפואה שלמה. ויזכו הוריו לגדלו לתורה ולחופה ולמעשים טובים, ונאמר אמן.';}
function renderNusach(){$('bt-kria').innerHTML=txtKria(1);$('bt-msb').innerHTML=txtMsb(1);}
$('bt-nusach-copy').addEventListener('click',function(){copy(X('k1','*קריאת השם*\n')+txtKria(0)+X('k2','\n\n*מי שברך לרך הנימול*\n')+txtMsb(0),X('nok','הנוסחים הועתקו'));track('nusach');});

/* ---------- מצב הורים / מוהל ---------- */
function renderMode(){
 document.querySelectorAll('.bt-mode button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.mode===S.mode?'true':'false');});
 document.querySelectorAll('.bt-mohel-only').forEach(function(e){e.hidden=S.mode!=='mohel';});
 document.querySelectorAll('.bt-parent-only').forEach(function(e){e.hidden=S.mode!=='parent';});
 hoFill();
 var fr=$('bt-from');
 if(S.from==='mohel'&&S.mname){fr.hidden=false;fr.textContent=X('f1','הכרטיס התקבל מהמוהל ')+S.mname+X('f2',' – כתבו את שמות המכובדים ושלחו לו בחזרה');}
 else if(S.from==='parent'){fr.hidden=false;fr.textContent=X('fp','ההורים שלחו לכם את הכיבודים – הכרטיס מוכן להדפסה');}
 else fr.hidden=true;
}
document.querySelector('.bt-mode').addEventListener('click',function(e){var m=e.target.dataset&&e.target.dataset.mode;if(!m)return;S.mode=m;save();renderMode();track('mode_'+m);});

/* ---------- אירועי הטופס ---------- */
var FIELDS={'bt-title':'title','bt-sub':'sub','bt-font':'font','bt-frame':'frame','bt-orn':'orn','bt-num':'num','bt-hlabel':'hlabel','bt-mname':'mname','bt-mphone':'mphone','bt-nusach':'nusach','bt-family':'family','bt-when':'when','bt-note':'note','bt-theme':'theme','bt-size':'size',
 'bt-baby':'baby','bt-father':'father','bt-mother':'mother','bt-hour':'hour','bt-after':'after'};
function fillFields(){Object.keys(FIELDS).forEach(function(id){var e=$(id);if(e)e.value=S[FIELDS[id]]==null?'':S[FIELDS[id]];});
 CHK.forEach(function(c){$(c[0]).checked=!!S[c[1]];}); renderThemes();}
var CHK=[['bt-showd','showd'],['bt-showbsd','showbsd'],['bt-showcr','showcr']];
CHK.forEach(function(c){$(c[0]).addEventListener('change',function(){S[c[1]]=this.checked;save();renderCard();});});
function renderThemes(){
 $('bt-themes').innerHTML=THEMES.map(function(t){return '<button type="button" role="radio" aria-checked="'+(S.theme===t[0])+'" data-th="'+t[0]+'" title="'+t[1]+'"><i style="background:'+t[2]+';border-color:'+t[3]+'"><b style="background:'+t[3]+'"></b></i><span>'+t[1]+'</span></button>';}).join('');
}
$('bt-themes').addEventListener('click',function(e){var b=e.target.closest('[data-th]');if(!b)return;S.theme=b.dataset.th;save();renderThemes();renderCard();track('theme_'+S.theme);});
Object.keys(FIELDS).forEach(function(id){
 var e=$(id); if(!e)return;
 e.addEventListener(e.tagName==='SELECT'||e.type==='time'?'change':'input',function(){
  var k=FIELDS[id]; S[k]=e.value;
  if(k==='nusach'){KIBS.forEach(function(x){if(x.ns)S.kib[x.id].on=defOn(x,S.nusach);});renderForm();}
  save(); renderCard(); renderTimes(); renderNusach();
 });
});
$('bt-form').addEventListener('submit',function(e){e.preventDefault();});
var kl=$('bt-kib-list');
kl.addEventListener('change',function(e){var li=e.target.closest('.bt-k');if(!li||e.target.type!=='checkbox')return;S.kib[li.dataset.id].on=e.target.checked;li.classList.toggle('off',!e.target.checked);save();renderCard();});
kl.addEventListener('input',function(e){var li=e.target.closest('.bt-k');if(!li||!e.target.classList.contains('bt-kn'))return;S.kib[li.dataset.id].name=e.target.value;save();renderCard();});
kl.addEventListener('click',function(e){
 var li=e.target.closest('.bt-k');if(!li)return;var id=li.dataset.id;
 if(e.target.classList.contains('bt-del')){S.custom=S.custom.filter(function(c){return c.id!==id;});delete S.kib[id];S.order=S.order.filter(function(x){return x!==id;});save();renderForm();renderCard();return;}
 if(e.target.classList.contains('bt-ed')){
  var k=allItems().filter(function(x){return x.id===id;})[0]; if(!k)return;
  var t=prompt(X('p1','שם הכיבוד:'),kibTitle(k)); if(t===null)return;
  var d=prompt(X('p2','הסבר קצר (אפשר להשאיר ריק):'),kibDesc(k)); if(d===null)d=kibDesc(k);
  S.edits[id]={t:t.trim()||k.t,d:d.trim()}; save();renderForm();renderCard();track('edit');return;}
 var mv=e.target.dataset&&e.target.dataset.mv; if(!mv)return;
 var i=S.order.indexOf(id),j=i+(+mv); if(j<0||j>=S.order.length)return;
 S.order[i]=S.order[j];S.order[j]=id;save();renderForm();renderCard();
 var b=kl.querySelector('[data-id="'+id+'"] [data-mv="'+mv+'"]');if(b)b.focus();
});
function addKib(){var v=$('bt-new').value.trim();if(!v)return;var id='c'+Date.now().toString(36);S.custom.push({id:id,t:v});S.kib[id]={on:true,name:''};S.order.push(id);$('bt-new').value='';save();renderForm();renderCard();}
$('bt-add').addEventListener('click',addKib);
$('bt-new').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();addKib();}});
window.addEventListener('resize',fit);

/* ---------- הפעלה ---------- */
load(); readHash(); fillFields(); renderMode(); renderForm(); renderCard(); renderCheck(); renderTimes(); renderNusach();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
})();
