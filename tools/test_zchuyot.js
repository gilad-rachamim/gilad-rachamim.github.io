const Z=require('../assets/kesef-zchuyot.js');let f=0;
function t(n,c){if(!c){f++;console.log('FAIL',n);}}
t('vac6 k1',Z.vacDays(1,6)===14);t('vac6 k14',Z.vacDays(14,6)===24);t('vac5 k1',Z.vacDays(1,5,true)===12);
t('vac5 ext k6',Z.vacDays(6,5,true)===17);t('vac5 law k6',Z.vacDays(6,5,false)===14);t('vac5 ext k9',Z.vacDays(9,5,true)===23);
let v=Z.vacation({start:'2023-01-01',end:'2024-12-31',week:5,ext:true,used:10,salary:10000});
t('vac 2y',v.accrued===24&&v.balance===14);t('vac payout',Math.abs(v.payout-14*10000/21.67)<1);
v=Z.vacation({start:'2024-07-01',end:'2024-12-31',week:6,used:0,dayValue:400});t('vac partial',v.accrued>6&&v.accrued<8);
t('vac err',Z.vacation({start:'2024-02-01',end:'2024-01-01'}).error);
t('hv days',Z.havraDays(1)===5&&Z.havraDays(2)===6&&Z.havraDays(4)===7&&Z.havraDays(11)===8&&Z.havraDays(16)===9&&Z.havraDays(20)===10);
let h=Z.havra({start:'2024-01-01',end:'2024-06-30'});t('hv <12m',!h.eligible&&h.total===0);
h=Z.havra({start:'2023-01-01',end:'2024-12-31'});t('hv 2y',h.days===11&&Math.abs(h.total-11*451.5)<1);
h=Z.havra({start:'2023-01-01',end:'2024-12-31',weeklyHours:21});t('hv half',Math.abs(h.total-11*451.5/2)<1);
h=Z.havra({start:'2023-01-01',end:'2024-12-31',paidYears:1});t('hv paid',h.days===6);
let o=Z.overtime({week:5,hours:[10,8.6,8.6,8.6,8.6,0,0],rate:50});
t('ot 5d',Math.abs(o.h125-2.4)<1e-9&&o.h150===0&&Math.abs(o.gross-2.4*50*1.25)<0.01);
o=Z.overtime({week:5,hours:[12,0,0,0,0,0,0],rate:100});t('ot tiers',Math.abs(o.h125-2)<1e-9&&Math.abs(o.h150-1.4)<1e-9);
o=Z.overtime({week:6,hours:[7,7,7,7,7,7,0],rate:100});t('ot none6',o.gross===0);
o=Z.overtime({week:6,hours:[0,0,0,0,0,0,9],rate:100});t('ot shabbat',o.s150===8&&o.s175===1);
o=Z.overtime({week:5,hours:[8,8,8,8,8,0,0],rate:0});t('ot norate',!!o.error);
console.log(f?f+' failed':'all ok');process.exit(f?1:0)
