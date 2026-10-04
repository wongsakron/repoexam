import re
h=open('site_test.html',encoding='utf-8').read()
err='''<script>window.__E=[];window.onerror=function(m,s,l,c){window.__E.push(m+' @'+l+':'+c);document.title='ERR';var d=document.createElement('pre');d.id='ERR';d.style.cssText='background:red;color:#fff;padding:8px;white-space:pre-wrap';d.textContent='JS ERROR: '+m+' @'+l+':'+c;document.body.insertBefore(d,document.body.firstChild);};</script>'''
h=h.replace('<div id="app"></div>',err+'<div id="app"></div>',1)
h=h.replace('load();applyPrefs();route();','load();applyPrefs();route();window.__T={startPrac:startPrac,startMock:startMock,buildMock:buildMock,submitMock:submitMock,Q:Q,BYID:BYID,ACT:ACT,S:S,save:save};',1)
scen=r'''<script>
(function(){
var t=(location.search.match(/t=([a-z0-9_]+)/)||[])[1];if(!t)return;
var T=window.__T;var full=t;t=t.replace(/_(dark|light)$/,'');
function clk(sel){var e=document.querySelector(sel);if(!e)throw new Error('missing '+sel);e.click();}
function later(fn,ms){setTimeout(function(){try{fn();}catch(e){window.onerror(e.message,'',0,0);}},ms||60);}
if(/_dark$/.test(full))document.documentElement.setAttribute('data-theme','dark');if(/_light$/.test(full))document.documentElement.setAttribute('data-theme','light');
later(function(){
 if(t==='quizcode'){
   var ids=T.Q.filter(function(q){return q.b===2&&q.c===2&&q.ctx&&/print|printf|for/.test(q.ctx);}).slice(0,3).map(function(q){return q.id;});
   T.startPrac(ids,'ทดสอบโค้ด','#/ch/2-2',null);
   later(function(){var q=T.BYID[ids[0]];clk('[data-ch="'+((q.a+1)%q.ch.length)+'"]');},80);
 }
 if(t==='quizimg'){
   var ids=T.Q.filter(function(q){return q.im&&q.ch_in_img;}).slice(0,2).map(function(q){return q.id;});
   T.startPrac(ids,'ทดสอบภาพ','#/',null);
   later(function(){var q=T.BYID[ids[0]];clk('[data-ch="'+q.a+'"]');},80);
 }
 if(t==='quizfresh'){location.hash='#/ch/1-8';later(function(){clk('[data-act=lv][data-lv="3"]');},80);}
 if(t==='result'){
   location.hash='#/ch/2-9';
   later(function(){clk('[data-set="n:10"]');later(function(){clk('[data-act=lv][data-lv="2"]');later(function(){
     var k=0;(function step(){ if(k>=10)return; var q=document.querySelector('[data-ch="0"]'); if(q){clk(k%3?'[data-ch="0"]':'[data-ch="1"]');} later(function(){clk('[data-act=next]');k++;later(step,40);},40);})();
   },150);},80);},80);
 }
 if(t==='mockrun'){
   var ids=T.buildMock(50);T.startMock(ids,'จำลองสอบกรมที่ดิน 50 ข้อ',60);
   later(function(){clk('[data-ch="2"]');clk('[data-act=mflag]');clk('[data-act=mnext]');later(function(){clk('[data-ch="0"]');clk('[data-act=mgrid]');},60);},80);
 }
 if(t==='mockres'){
   var ids=T.buildMock(25);T.startMock(ids,'จำลองสอบกรมที่ดิน 25 ข้อ',30);
   later(function(){ ids.forEach(function(id,j){ if(j<22) MOCKSET(id,j);}); },60);
   function MOCKSET(id,j){ /* answer via clicking */ }
   later(function(){
     var n=0;(function step(){ if(n>=22){ T.submitMock(true); return;} var q=document.querySelectorAll('[data-ch]'); var pick=n%2?0:1; clk('[data-ch="'+pick+'"]'); clk('[data-act=mnext]'); n++; later(step,20);})();
   },120);
 }
 if(t==='search'){location.hash='#/search';later(function(){var i=document.getElementById('sq');i.value='subnet';i.dispatchEvent(new Event('input'));later(function(){var d=document.querySelector('details.item');if(d)d.open=true;},400);},80);}
 if(t==='mockcount'){
   var out=[];for(var r=0;r<5;r++){var ids=T.buildMock(100);var c={};ids.forEach(function(id){var q=T.BYID[id];c[q.lv]=(c[q.lv]||0)+1;});out.push(ids.length+' uniq '+new Set(ids).size+' lv '+JSON.stringify(c));}
   document.body.insertAdjacentHTML('afterbegin','<pre id="OUT">'+out.join('\n')+'</pre>');
 }
},120);
})();
</script>'''
h=h.replace('</body>',scen+'</body>',1)
open('site_t.html','w',encoding='utf-8',newline='\n').write(h)
print('ok')
