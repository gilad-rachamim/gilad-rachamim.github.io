(function(){
  var f=document.querySelector('[data-dm-form]'); if(!f) return;
  var err=f.querySelector('[data-dm-err]'), ok=document.querySelector('[data-dm-ok]');
  function ev(n){try{if(window.gtag)gtag('event',n,{page_path:location.pathname});}catch(e){}}
  f.addEventListener('submit',function(e){
    e.preventDefault(); err.textContent='';
    var d=new FormData(f), name=(d.get('name')||'').trim(), phone=(d.get('phone')||'').replace(/[^\d+]/g,''), mail=(d.get('email')||'').trim();
    if(name.length<2){err.textContent='נא למלא שם מלא.';return;}
    if(!/^(\+972|0)\d{8,9}$/.test(phone)){err.textContent='נא למלא מספר טלפון תקין, למשל 050-0000000.';return;}
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){err.textContent='נא למלא כתובת מייל תקינה.';return;}
    var ep=f.getAttribute('data-endpoint');
    if(ep){ /* משרד אמיתי: Apps Script. בדוגמה data-endpoint ריק ולכן לא נשלח דבר */
      try{fetch(ep,{method:'POST',mode:'no-cors',body:new URLSearchParams({name:name,phone:phone,email:mail,consent:d.get('consent')?'1':''})});}catch(x){}
    }
    ev('demo_lead_submit'); f.style.display='none'; ok.style.display='block'; ok.scrollIntoView({block:'center'});
  });
  var dl=document.querySelector('[data-dm-dl]'); if(dl) dl.addEventListener('click',function(){ev('demo_guide_download');});
})();
