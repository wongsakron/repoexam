(function(){
'use strict';
var ROOT=document.getElementById('app'),V=ROOT.getAttribute('data-v')||'0';
function getJSON(u){return fetch(u,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(u+' HTTP '+r.status);return r.json();});}
Promise.all(['meta','sum','q'].map(function(n){return getJSON('/data/'+n+'.json?v='+V);}))
  .then(function(d){main(d[0],d[1],d[2]);})
  .catch(function(e){ROOT.innerHTML='<div class="boot"><div>โหลดข้อสอบไม่สำเร็จ<br><small>'+String(e&&e.message||e).replace(/[<>&]/g,'')+'</small><br><button onclick="location.reload()">ลองใหม่</button></div></div>';});

function main(META,SUM,Q){
var CH=META.chapters, CHK={}, STAR={}, GROUPS=META.groups, GOF={};
CH.forEach(function(c){CHK[c.k]=c;});
META.star.forEach(function(k){STAR[k]=1;});
GROUPS.forEach(function(g,i){g.chs.forEach(function(k){GOF[k]=i;});});
var MOFG=META.mof_groups||[], GOFM={};
MOFG.forEach(function(g,i){g.chs.forEach(function(k){GOFM[k]=i;});});
var LVNAME={1:'ด่าน 1 · พื้นฐาน',2:'ด่าน 2 · ฝึกฝน',3:'ด่าน 3 · ของจริง'};
var LVSHORT={1:'ด่าน 1',2:'ด่าน 2',3:'ด่าน 3'};
var LVDESC3={1:'ข้อระดับง่าย ทวนนิยาม ตัวเลข และศัพท์สำคัญจากคู่มือเตรียมสอบ',2:'ข้อระดับกลาง เปรียบเทียบเทคโนโลยีที่คล้ายกัน คำนวณ และจับคู่แนวคิด',3:'ข้อระดับยาก วิเคราะห์สถานการณ์จำลองและกับดักที่ออกสอบบ่อย'};
var LVDESC={1:'ข้อสอบท้ายบทในเล่มน้ำตาล ใช้เช็กว่าอ่านแล้วจำได้',2:'ข้อสอบเพิ่มเติม ข้อสอบประจำเดือน และโจทย์ฝึกที่เรียบเรียงจากเนื้อหา',3:'ข้อสอบจริงหลายสนาม (สพฐ. กทม. อาชีวะ ท้องถิ่น) และข้อสอบโค้งสุดท้าย'};
var KINDNAME={book:'ท้ายบท',extra:'เพิ่มเติมในเล่ม',monthly:'ประจำเดือน',auth:'โจทย์ฝึก',real:'ข้อสอบจริง',final:'โค้งสุดท้าย'};
var BYID={}, BYCH={};
CH.forEach(function(c){BYCH[c.k]={1:[],2:[],3:[]};});
Q.forEach(function(q,i){q._i=i;q._k=q.b+'-'+q.c;BYID[q.id]=q;if(BYCH[q._k])BYCH[q._k][q.lv].push(q);});

/* ---------- storage: PostgreSQL via /api, localStorage as offline cache ---------- */
var KEY='ltd-cs-quiz-v1',QKEY='ltd-cs-queue-v1';
var S={p:{},bm:{},hist:[],o:{n:20,ord:'rand',only:'all',fs:0,theme:'auto',font:1}};
function applyState(o){if(o&&typeof o==='object'){if(o.p)S.p=o.p;if(o.bm)S.bm=o.bm;if(o.hist)S.hist=o.hist;if(o.o)for(var k in o.o)S.o[k]=o.o[k];}}
function load(){try{var t=localStorage.getItem(KEY);if(t)applyState(JSON.parse(t));}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function record(q,c){var ok=c===q.a;var r=S.p[q.id]||[0,0,0];r[0]=ok?1:0;r[1]++;if(ok)r[2]++;S.p[q.id]=r;return ok;}
// every change is queued and sent in order; if the server is unreachable it is retried later
var QUEUE=[],NET={online:null,busy:false};
try{QUEUE=JSON.parse(localStorage.getItem(QKEY)||'[]')||[];}catch(e){QUEUE=[];}
function qsave(){try{localStorage.setItem(QKEY,JSON.stringify(QUEUE));}catch(e){}}
function api(path,body){QUEUE.push({path:path,body:body});qsave();flush();}
function flush(){
  if(NET.busy||!QUEUE.length)return;
  NET.busy=true;var op=QUEUE[0];
  fetch('/api/'+op.path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(op.body)})
    .then(function(r){if(r.status>=500)throw new Error('HTTP '+r.status);QUEUE.shift();qsave();NET.busy=false;setNet(true);flush();})
    .catch(function(){NET.busy=false;setNet(false);});
}
function netText(){
  if(QUEUE.length)return '⚠️ มีข้อมูลรอส่งขึ้นเซิร์ฟเวอร์ '+QUEUE.length+' รายการ ระบบจะส่งให้เองเมื่อเชื่อมต่อได้';
  if(NET.online===false)return '⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตอนนี้ใช้ข้อมูลในเครื่องไปก่อน';
  return '☁️ ความคืบหน้าบันทึกลงฐานข้อมูลบนเซิร์ฟเวอร์แล้ว เปิดจากเครื่องไหนก็เห็นเหมือนกัน';
}
function setNet(ok){NET.online=ok;var el=document.getElementById('netst');if(el)el.textContent=netText();}
setInterval(flush,15000);
window.addEventListener('online',flush);
function isDone(q){return !!S.p[q.id];}
function isWrong(q){var r=S.p[q.id];return !!r&&r[0]===0;}
function stat(list){var d=0,ok=0;for(var i=0;i<list.length;i++){var r=S.p[list[i].id];if(r){d++;if(r[0])ok++;}}return {n:list.length,d:d,ok:ok};}
function pct(a,b){return b?Math.round(a/b*100):0;}
function chAll(k){var B=BYCH[k];return B[1].concat(B[2],B[3]);}

/* ---------- helpers ---------- */
var app=document.getElementById('app');
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function go(h){if(location.hash===h)route();else location.hash=h;}
function toast(msg){var t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove();},2200);}
function top(back,title,extra){return '<div class="top"><a class="back" href="'+back+'" aria-label="ย้อนกลับ">‹</a><div class="tt">'+esc(title)+'</div>'+(extra||'')+'</div>';}
function bk(b){return b===3?'ชุดคลัง':'เล่ม '+b;}
function chapLabel(q){return bk(q.b)+' บท '+q.c;}
function srcLabel(q){return q.src+(q.page?' · หน้า '+q.page:'');}
function fmt(ms){ms=Math.max(0,ms);var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);s=s%60;var p=function(x){return (x<10?'0':'')+x;};return (h?h+':'+p(m):m)+':'+p(s);}
function bar(cls,f){return '<span class="bar '+cls+'"><i style="width:'+(f*100).toFixed(1)+'%"></i></span>';}
function kindsLine(list){var c={};list.forEach(function(q){c[q.kind]=(c[q.kind]||0)+1;});return Object.keys(c).map(function(k){return KINDNAME[k]+' '+c[k];}).join(' · ');}
function preview(q){var t=(q.q||'').replace(/\s+/g,' ');return t.length>150?t.slice(0,150)+'…':t;}

/* ---------- mini markdown ---------- */
function inline(s){
  s=esc(s);var codes=[];
  s=s.replace(/`([^`]+)`/g,function(m,c){codes.push(c);return '\u0000'+(codes.length-1)+'\u0000';});
  s=s.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
  s=s.replace(/\u0000(\d+)\u0000/g,function(m,i){return '<code>'+codes[+i]+'</code>';});
  return s;
}
function md(src){
  var lines=String(src||'').replace(/\r/g,'').split('\n'),h='',toc=[],stack=[];
  function closeAll(){while(stack.length)h+='</li></'+stack.pop().tag+'>';}
  function item(tag,ind,content,num){
    while(stack.length&&stack[stack.length-1].ind>ind)h+='</li></'+stack.pop().tag+'>';
    var tp=stack[stack.length-1],li='<li'+(num?' value="'+num+'"':'')+'>';
    if(tp&&tp.ind===ind){
      if(tp.tag!==tag){h+='</li></'+stack.pop().tag+'><'+tag+'>'+li;stack.push({tag:tag,ind:ind});}
      else h+='</li>'+li;
    }else{h+='<'+tag+'>'+li;stack.push({tag:tag,ind:ind});}
    h+=inline(content);
  }
  function cells(r){return r.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(function(x){return x.trim();});}
  function isSep(r){return /^[\s|:\-]+$/.test(r)&&r.indexOf('-')>=0;}
  for(var i=0;i<lines.length;i++){
    var L=lines[i],m;
    if(/^\s*$/.test(L)){closeAll();continue;}
    if(/^\s*\|/.test(L)){
      closeAll();var rows=[];
      while(i<lines.length&&/^\s*\|/.test(lines[i])){rows.push(lines[i]);i++;}
      i--;var t='<div class="tbl"><table>',st=0;
      if(rows.length>1&&isSep(rows[1])){t+='<thead><tr>'+cells(rows[0]).map(function(c){return '<th>'+inline(c)+'</th>';}).join('')+'</tr></thead>';st=2;}
      t+='<tbody>';
      for(var r=st;r<rows.length;r++){if(isSep(rows[r]))continue;t+='<tr>'+cells(rows[r]).map(function(c){return '<td>'+inline(c)+'</td>';}).join('')+'</tr>';}
      h+=t+'</tbody></table></div>';continue;
    }
    if((m=L.match(/^(#{1,3})\s+(.*)$/))){
      closeAll();
      if(m[1].length===1)continue;
      if(m[1].length===2){var id='s'+toc.length;toc.push({id:id,t:m[2]});h+='<h2 id="'+id+'">'+inline(m[2])+'</h2>';}
      else h+='<h3>'+inline(m[2])+'</h3>';
      continue;
    }
    if((m=L.match(/^>\s?(.*)$/))){closeAll();h+='<p class="note">'+inline(m[1])+'</p>';continue;}
    if((m=L.match(/^(\s*)[-*]\s+(.*)$/))){item('ul',m[1].length,m[2]);continue;}
    if((m=L.match(/^(\s*)(\d+)[.)]\s+(.*)$/))){item('ol',m[1].length,m[3],m[2]);continue;}
    closeAll();h+='<p>'+inline(L)+'</p>';
  }
  closeAll();
  return {html:h,toc:toc};
}

/* ---------- question card ---------- */
function isCode(t){return /[{};]\s*$|^ {2,}\S|^\t|\bdef |print\s*\(|#include|<\?php|System\.out|printf\s*\(|<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>/m.test(t);}
function qHTML(q,st){
  var h='';
  if(!st.mock)h+='<div class="qmeta"><span class="tag lv'+q.lv+'">'+LVSHORT[q.lv]+'</span><span class="tag">'+esc(chapLabel(q))+'</span><span class="tag">'+esc(KINDNAME[q.kind]||'')+'</span></div>';
  h+='<div class="stem">'+esc(q.q)+'</div>';
  if(q.ctx&&!q.ctx_in_img)h+='<div class="ctx'+(isCode(q.ctx)?' code':'')+'">'+esc(q.ctx)+'</div>';
  if(q.im)h+='<div class="figs">'+q.im.map(function(n){return '<img src="/img/'+encodeURIComponent(n)+'.webp?v='+V+'" alt="ภาพประกอบโจทย์" loading="lazy">';}).join('')+'</div>';
  h+='<div class="choices">';
  q.ch.forEach(function(c,i){
    var cls='ch';
    if(st.reveal){if(i===q.a)cls+=' right';else if(i===st.chosen)cls+=' wrong';else cls+=' dim';}
    else if(st.chosen===i)cls+=' sel';
    h+='<button class="'+cls+'" data-ch="'+i+'"'+(st.reveal?' disabled':'')+'><span class="ct">'+(c?esc(c):'<i>ตัวเลือกที่ '+(i+1)+' (ดูในภาพ)</i>')+'</span></button>';
  });
  h+='</div>';
  if(st.reveal){
    var has=typeof st.chosen==='number',ok=has&&st.chosen===q.a;
    var head=has?(ok?'✓ ถูกต้อง · ':'✗ ยังไม่ถูก · '):(st.mock?'ไม่ได้ตอบ · ':'');
    h+='<div class="exp '+(has?(ok?'ok':'no'):'')+'"><div class="eh">'+head+'เฉลย '+(q.ch[q.a]?esc(q.ch[q.a]):'ตัวเลือกที่ '+(q.a+1))+'</div><div class="et">'+esc(q.e)+'</div><div class="src">ที่มา: '+esc(srcLabel(q))+' · <a href="#/read/'+q._k+'">อ่านสรุปบทนี้</a></div></div>';
  }
  return h;
}
function reviewItem(q,num,chosen,mock){
  var has=typeof chosen==='number',mk=has?(chosen===q.a?'<span class="mk ok">✓</span>':'<span class="mk no">✗</span>'):(mock?'<span class="mk no">–</span>':'');
  return '<details class="item"><summary><span class="num">'+num+'</span>'+mk+'<span class="pv">'+esc(preview(q))+'</span></summary><div class="card q">'+qHTML(q,{chosen:has?chosen:undefined,reveal:true,mock:mock})+'</div></details>';
}

/* ---------- views ---------- */
var SES=null, MOCK=null, SETS=null, lastSearch='';

function viewHome(){
  var all=stat(Q),wrongN=Q.filter(isWrong).length,bmN=Object.keys(S.bm).length,last=S.hist[0];
  var h='<div class="wrap">';
  h+='<header class="hero"><div class="hk">เตรียมสอบจากเล่มน้ำตาล 1–2</div><h1>นักวิชาการคอมพิวเตอร์<br>กรมที่ดิน</h1>'+
     '<div class="hstats"><div><b>'+all.d.toLocaleString()+'</b><span>ข้อที่ทำแล้ว<br>จาก '+all.n.toLocaleString()+' ข้อ</span></div>'+
     '<div><b>'+pct(all.ok,all.d)+'%</b><span>ตอบถูก<br>(ครั้งล่าสุด)</span></div>'+
     '<div><b>'+wrongN+'</b><span>ข้อผิด<br>ที่ยังค้าง</span></div></div></header>';
  if(MOCK&&MOCK.state==='run')h+='<a class="btn pri full" style="margin:0 0 14px" href="#/mock">⏱️ มีการสอบที่ทำค้างอยู่ · กลับไปทำต่อ</a>';
  h+='<nav class="quick">'+
     '<a class="qa" href="#/mock"><span class="qi">⏱️</span><b>จำลองสอบกรมที่ดิน</b><small>'+(last?'ครั้งล่าสุด '+pct(last.ok,last.n)+'%':'สุ่มตามสัดส่วนหลักสูตร')+'</small></a>'+
     '<a class="qa" href="#/sets"><span class="qi">📝</span><b>ชุดข้อสอบจริง</b><small>ทำทีละสนาม ครบทั้งชุด</small></a>'+
     '<a class="qa" href="#/review"><span class="qi">🔁</span><b>ทบทวนข้อผิด</b><small>ผิด '+wrongN+' · เก็บไว้ '+bmN+'</small></a>'+
     '<a class="qa" href="#/search"><span class="qi">🔎</span><b>ค้นหาข้อสอบ</b><small>ค้นจากโจทย์และเฉลย</small></a></nav>';
  h+='<details class="card guide"'+(all.d?'':' open')+'><summary>วิธีใช้และลำดับการอ่านที่แนะนำ</summary><ol>'+
     '<li>เริ่มจากบทที่มี <span class="star">⭐</span> ก่อน เพราะตรงกับหลักสูตรสอบกรมที่ดิน</li>'+
     '<li>กด <b>อ่านสรุปเนื้อหา</b> ของบทนั้น ในสรุปมีเลขหน้าของเล่มให้เปิดอ่านต่อ</li>'+
     '<li>ทำ <b>ด่าน 1 → ด่าน 2 → ด่าน 3</b> ตอบแล้วจะเห็นเฉลยและคำอธิบายทันที</li>'+
     '<li>เข้า <b>ทบทวนข้อผิด</b> ทุกวัน จนข้อผิดที่ค้างเหลือศูนย์</li>'+
     '<li>ช่วงใกล้สอบ ให้ทำ <b>จำลองสอบกรมที่ดิน</b> แบบจับเวลา</li></ol>'+
     '<p class="warnbox">หลักสูตรสอบยังมีหัวข้อ <b>ความรู้เกี่ยวกับกรมที่ดิน</b> ซึ่งไม่มีอยู่ในไฟล์ติวชุดนี้ ควรอ่านเพิ่มจากเว็บไซต์กรมที่ดิน เช่น อำนาจหน้าที่ วิสัยทัศน์ และภารกิจของกรม</p>'+
     '<p class="muted" style="font-size:.88rem;margin:0">ความคืบหน้าบันทึกลงฐานข้อมูลบนเซิร์ฟเวอร์ เปิดจากมือถือหรือคอมเครื่องไหนก็เห็นความคืบหน้าเดียวกัน</p></details>';
  h+='<div class="row2" style="margin:14px 0 0"><button class="chip'+(S.o.fs?' on':'')+'" data-act="fs">⭐ แสดงเฉพาะบทในหลักสูตรกรมที่ดิน</button></div>';
  [1,2,3].forEach(function(b){
    var list=CH.filter(function(c){return c.b===b&&(!S.o.fs||STAR[c.k]);});
    var cnt=0;CH.forEach(function(c){if(c.b===b)cnt+=chAll(c.k).length;});
    h+='<div class="sec"><h2>'+(b===3?'ชุด 3 · แนวสอบกระทรวงการคลัง':'เล่ม '+b)+'</h2><small>'+cnt.toLocaleString()+' ข้อ</small></div>';
    if(b===3&&MOFG.length)h+='<a class="btn full" style="margin:0 0 10px" href="#/mockmof">⏱️ จำลองสอบกระทรวงการคลัง · สุ่มตามสัดส่วน 7 หมวด</a>';
    list.forEach(function(c){h+=chapCard(c);});
  });
  h+='<div class="foot"><b>ตั้งค่า</b>'+
     '<div class="row"><span class="muted" style="width:90px">ธีม</span><div class="seg">'+segBtn('theme','auto','ตามเครื่อง')+segBtn('theme','light','สว่าง')+segBtn('theme','dark','มืด')+'</div></div>'+
     '<div class="row"><span class="muted" style="width:90px">ขนาดตัวอักษร</span><div class="seg">'+segBtn('font',0,'เล็ก')+segBtn('font',1,'ปกติ')+segBtn('font',2,'ใหญ่')+segBtn('font',3,'ใหญ่มาก')+'</div></div>'+
     '<div class="row"><button class="btn sm" data-act="exp">สำรองความคืบหน้า (ไฟล์)</button><button class="btn sm" data-act="imp">นำเข้าความคืบหน้า</button><button class="btn sm danger" data-act="reset">ล้างความคืบหน้าทั้งหมด</button></div>'+
     '<p id="netst" class="muted" style="font-size:.85rem">'+esc(netText())+'</p>'+
     '<p class="muted" style="font-size:.8rem">ข้อสอบรวม '+Q.length.toLocaleString()+' ข้อ ได้แก่ '+kindsLine(Q)+' · เรียบเรียงจากไฟล์ติวกลุ่ม 2568 (V2)</p></div>';
  app.innerHTML=h+'</div>';
}
function segBtn(k,v,label){return '<button class="'+(String(S.o[k])===String(v)?'on':'')+'" data-set="'+k+':'+v+'">'+label+'</button>';}
function chapCard(c){
  var B=BYCH[c.k],st=[1,2,3].map(function(l){return stat(B[l]);}),tot=0,done=0;
  st.forEach(function(s){tot+=s.n;done+=s.d;});
  return '<a class="chap" href="#/ch/'+c.k+'"><div class="cnum">'+c.c+'</div><div class="cbody"><div class="ctitle">'+esc(c.title)+(STAR[c.k]?' <span class="star" title="อยู่ในหลักสูตรกรมที่ดิน">⭐</span>':'')+'</div>'+
    '<div class="bars">'+st.map(function(s,i){return bar('l'+(i+1),s.n?s.d/s.n:0);}).join('')+'</div>'+
    '<div class="cmeta">'+tot+' ข้อ · ทำแล้ว '+pct(done,tot)+'%</div></div><span class="chev">›</span></a>';
}
function viewChap(k){
  var c=CHK[k];if(!c){go('#/');return;}
  var B=BYCH[k],wrong=chAll(k).filter(isWrong),idx=CH.indexOf(c),prev=CH[idx-1],next=CH[idx+1];
  var h=top('#/',''+bk(c.b)+' · บทที่ '+c.c)+'<div class="wrap">';
  h+='<h1 class="ch1">'+esc(c.title)+'</h1>'+(STAR[k]?'<div class="badge-star">⭐ อยู่ในหลักสูตรสอบกรมที่ดิน</div>':'')+'<p class="note">'+inline(c.note)+'</p>';
  h+='<a class="btn read-btn" href="#/read/'+k+'">📖 อ่านสรุปเนื้อหาบทนี้</a>';
  [1,2,3].forEach(function(l){
    var s=stat(B[l]),f=firstUndone(B[l]),attr=' data-k="'+k+'" data-lv="'+l+'"'+(s.n?'':' disabled');
    var main=!s.n?'<button class="btn pri" disabled>ไม่มีข้อสอบ</button>':
      s.d===0?'<button class="btn pri" data-act="lv"'+attr+'>เริ่ม'+LVSHORT[l]+' (ข้อ 1–'+s.n+')</button>':
      f<0?'<button class="btn pri" data-act="lvre"'+attr+'>ทำครบแล้ว · เริ่มใหม่ข้อ 1</button>':
      '<button class="btn pri" data-act="lv"'+attr+'>ทำต่อจากข้อ '+(f+1)+'</button>';
    h+='<div class="lvcard l'+l+'"><div class="lvh"><b>'+LVNAME[l]+'</b><span>'+s.n+' ข้อ</span></div><p>'+(c.b===3?LVDESC3:LVDESC)[l]+'</p>'+
       (s.n?'<div class="kinds">'+esc(kindsLine(B[l]))+'</div>':'')+
       '<div class="lvp">'+bar('l'+l,s.n?s.d/s.n:0)+'<small>ทำแล้ว '+s.d+'/'+s.n+(s.d?' · ถูก '+pct(s.ok,s.d)+'%':'')+'</small></div>'+
       '<div class="lvbtns">'+main+'<button class="btn" data-act="lvpick"'+attr+'>☰ เลือกข้อ</button></div></div>';
  });
  h+='<div class="row2"><button class="btn" data-act="lv" data-k="'+k+'" data-lv="0">ทำทุกด่านต่อกัน ('+chAll(k).length+' ข้อ)</button>'+(wrong.length?'<button class="btn" data-act="wrongch" data-k="'+k+'">🔁 ทบทวนข้อผิด ('+wrong.length+')</button>':'')+'</div>';
  h+='<div class="cnav">'+(prev?'<a class="btn sm" href="#/ch/'+prev.k+'">‹ '+bk(prev.b)+' บท '+prev.c+'</a>':'')+(next?'<a class="btn sm" href="#/ch/'+next.k+'">'+bk(next.b)+' บท '+next.c+' ›</a>':'')+'</div>';
  app.innerHTML=h+'</div>';
}
function viewRead(k){
  var c=CHK[k];if(!c){go('#/');return;}
  var r=md(SUM[k]),idx=CH.indexOf(c),next=CH[idx+1];
  var h=top('#/ch/'+k,'สรุปเนื้อหา · '+bk(c.b)+' บท '+c.c)+'<div class="wrap">';
  h+='<h1 class="ch1">บทที่ '+c.c+' '+esc(c.title)+'</h1>'+(STAR[k]?'<div class="badge-star">⭐ อยู่ในหลักสูตรสอบกรมที่ดิน</div>':'');
  if(r.toc.length)h+='<div class="toc">'+r.toc.map(function(t){return '<button data-sc="'+t.id+'">'+esc(t.t.replace(/\*\*/g,''))+'</button>';}).join('')+'</div>';
  h+='<article class="md">'+r.html+'</article>';
  h+='<div class="row2" style="margin-top:22px"><button class="btn pri" data-act="lv" data-k="'+k+'" data-lv="1">อ่านจบแล้ว เริ่มด่าน 1</button><a class="btn" href="#/ch/'+k+'">ไปหน้าบทนี้</a></div>';
  if(next)h+='<div class="cnav"><a class="btn sm" href="#/read/'+next.k+'">สรุปบทถัดไป: '+bk(next.b)+' บท '+next.c+' ›</a></div>';
  app.innerHTML=h+'</div>';
}

/* ---------- practice session ---------- */
// every level is done in full, in book order; re-entering resumes at the first question not yet answered
function firstUndone(list){for(var i=0;i<list.length;i++)if(!isDone(list[i]))return i;return -1;}
function startLevel(k,lv,mode){ // mode: undefined = resume, 'restart' = from question 1, 'pick' = open the question grid
  var c=CHK[k],pool=lv?BYCH[k][lv]:chAll(k);
  if(!pool.length){toast('ไม่มีข้อสอบ');return;}
  var at=0;
  if(mode!=='restart'){var f=firstUndone(pool);at=f<0?0:f;}
  startPrac(pool.map(function(q){return q.id;}),''+bk(c.b)+' บท '+c.c+' · '+(lv?LVSHORT[lv]:'ทุกด่าน'),'#/ch/'+k,function(){startLevel(k,lv,'restart');},at,mode==='pick');
  if(at>0&&mode!=='pick')toast('ทำต่อจากข้อ '+(at+1)+' · กด "เลือกข้อ" เพื่อไปข้อไหนก็ได้');
}
function startPrac(ids,title,back,redo,at,grid){SES={ids:ids,i:at||0,ans:{},title:title,back:back,redo:redo,grid:!!grid};go('#/quiz');}
function pracGrid(){
  var h='<div class="card" id="pgrid"><div class="legend"><span class="lg ok">■ ถูก</span><span class="lg no">■ ผิด</span><span>□ ยังไม่ทำ</span><span>(ผลครั้งล่าสุด · แตะเลขเพื่อไปข้อนั้น)</span></div><div class="grid">';
  SES.ids.forEach(function(id,j){var r=S.p[id],cls=r?(r[0]?'ok':'no'):'';h+='<button class="'+cls+(j===SES.i?' cur':'')+'" data-act="pjump" data-i="'+j+'">'+(j+1)+'</button>';});
  return h+'</div></div>';
}
function viewQuiz(){
  if(!SES){go('#/');return;}
  var q=BYID[SES.ids[SES.i]],c=SES.ans[q.id],rev=c!==undefined,n=SES.ids.length,last=SES.i+1>=n;
  var done=0,okc=0;SES.ids.forEach(function(id){var a=SES.ans[id];if(a!==undefined){done++;if(a===BYID[id].a)okc++;}});
  var h='<div class="qbar"><a class="x" href="'+SES.back+'" aria-label="ออกจากแบบฝึก">✕</a><div class="qt">'+esc(SES.title)+'</div><div class="qc">'+(SES.i+1)+'/'+n+'</div></div>'+
    '<div class="prog"><i style="width:'+((SES.i+1)/n*100)+'%"></i></div><div class="wrap qwrap">'+
    '<div class="qnav"><button class="btn sm" data-act="pgrid">'+(SES.grid?'ซ่อนตารางข้อ':'☰ เลือกข้อ')+'</button><span class="score">รอบนี้ตอบ '+done+' · ถูก '+okc+'</span></div>';
  if(SES.grid)h+=pracGrid();
  h+='<div class="card q">'+qHTML(q,{chosen:c,reveal:rev})+'</div>'+
    '<div class="qtools"><button class="lnk" data-act="bm">'+(S.bm[q.id]?'★ เก็บไว้ทบทวนแล้ว':'☆ เก็บไว้ทบทวน')+'</button><button class="lnk" data-act="pfinish">จบและดูผล</button></div></div>'+
    '<div class="actbar"><button class="btn" data-act="pprev"'+(SES.i?'':' disabled')+'>← ก่อนหน้า</button>'+
    '<button class="btn'+(rev?' pri':'')+'" data-act="next">'+(last?'ดูผลคะแนน':rev?'ข้อต่อไป →':'ข้าม →')+'</button></div>';
  app.innerHTML=h;
}
function pracChoose(i){
  var q=BYID[SES.ids[SES.i]];if(SES.ans[q.id]!==undefined||i>=q.ch.length)return;
  SES.ans[q.id]=i;var ok=record(q,i);save();
  api('answer',{items:[{qid:q.id,choice:i,correct:ok,mode:'practice'}]});
  viewQuiz();
  var e=document.querySelector('.exp');if(e)e.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function pracNext(){if(SES.i+1<SES.ids.length){SES.i++;viewQuiz();window.scrollTo(0,0);}else go('#/result');}
function viewResult(){
  if(!SES){go('#/');return;}
  var ok=0,done=0,wrong=[];
  SES.ids.forEach(function(id){var a=SES.ans[id];if(a!==undefined){done++;if(a===BYID[id].a)ok++;else wrong.push(id);}});
  var p=pct(ok,done),msg=p>=80?'ยอดเยี่ยม พร้อมไปด่านต่อไป':p>=60?'ผ่านเกณฑ์ ทบทวนข้อผิดอีกนิด':'ควรกลับไปอ่านสรุปบทนี้อีกรอบ';
  var h=top(SES.back,'ผลคะแนน')+'<div class="wrap"><div class="card res"><div class="muted">'+esc(SES.title)+'</div><div class="big">'+ok+'<small> / '+done+'</small></div><div class="msg '+(p>=60?'pass':'fail')+'">'+p+'% · '+msg+'</div></div>';
  h+='<div class="row2">'+(wrong.length?'<button class="btn pri" data-act="redowrong">ทำข้อผิดอีกรอบ ('+wrong.length+')</button>':'')+(SES.redo?'<button class="btn" data-act="redo">เริ่มใหม่ตั้งแต่ข้อ 1</button>':'')+'<a class="btn" href="'+SES.back+'">กลับ</a></div>';
  if(wrong.length){h+='<div class="sec"><h2>ข้อที่ตอบผิด</h2></div>';wrong.forEach(function(id,j){h+=reviewItem(BYID[id],SES.ids.indexOf(id)+1,SES.ans[id],false);});}
  app.innerHTML=h+'</div>';
}

/* ---------- review / bookmarks ---------- */
function viewReview(tab){
  tab=tab==='bm'?'bm':'wrong';
  var list=tab==='bm'?Q.filter(function(q){return S.bm[q.id];}):Q.filter(isWrong);
  var wN=Q.filter(isWrong).length,bN=Object.keys(S.bm).length;
  var h=top('#/','ทบทวน')+'<div class="wrap"><div class="tabs"><a class="chip'+(tab==='wrong'?' on':'')+'" href="#/review">ข้อที่ยังผิด ('+wN+')</a><a class="chip'+(tab==='bm'?' on':'')+'" href="#/review/bm">★ ที่เก็บไว้ ('+bN+')</a></div>';
  if(!list.length){h+='<div class="empty">'+(tab==='bm'?'ยังไม่มีข้อที่เก็บไว้ กด ☆ ระหว่างทำข้อสอบเพื่อเก็บข้อที่อยากกลับมาดู':'ยังไม่มีข้อผิดค้างอยู่ เก่งมาก')+'</div>';app.innerHTML=h+'</div>';return;}
  h+='<p class="muted" style="font-size:.9rem">'+(tab==='wrong'?'ข้อที่ตอบผิดในครั้งล่าสุด ถ้าตอบถูกในรอบทบทวน ข้อนั้นจะหายไปจากรายการนี้':'ข้อที่กดเก็บไว้ระหว่างทำ')+'</p>';
  h+='<button class="btn pri full" data-act="revall" data-tab="'+tab+'">ทำทั้งหมดเรียงตามลำดับ ('+list.length+' ข้อ)</button>';
  var byc={};list.forEach(function(q){(byc[q._k]=byc[q._k]||[]).push(q);});
  h+='<div class="sec"><h2>แยกตามบท</h2></div><div class="row2">';
  CH.forEach(function(c){if(byc[c.k])h+='<button class="chip" data-act="revch" data-tab="'+tab+'" data-k="'+c.k+'">'+bk(c.b)+' บท '+c.c+' · '+byc[c.k].length+'</button>';});
  h+='</div><div class="sec"><h2>รายการ</h2><small>แตะเพื่อดูเฉลย</small></div>';
  list.slice(0,150).forEach(function(q,j){h+=reviewItem(q,j+1,undefined,false);});
  if(list.length>150)h+='<p class="muted">แสดง 150 ข้อแรก</p>';
  app.innerHTML=h+'</div>';
}
function revList(tab,k){var l=tab==='bm'?Q.filter(function(q){return S.bm[q.id];}):Q.filter(isWrong);return k?l.filter(function(q){return q._k===k;}):l;}

/* ---------- exam sets ---------- */
function buildSets(){
  if(SETS)return SETS;
  var map={};SETS=[];
  Q.forEach(function(q){
    if(q.kind==='book'||q.kind==='auth')return;
    var name=q.src.replace(/\s*ข้อ\s*\d+.*$/,'').trim(),key=q.kind+'|'+name;
    if(!map[key]){map[key]={kind:q.kind,name:name,ids:[]};SETS.push(map[key]);}
    map[key].ids.push(q.id);
  });
  var num=function(id){var m=BYID[id].src.match(/ข้อ\s*(\d+)/);return m?+m[1]:BYID[id]._i;};
  var yr=function(s){var m=s.name.match(/25\d\d/);return m?+m[0]:0;};
  SETS.forEach(function(s){s.ids.sort(function(a,b){return num(a)-num(b);});});
  var order={real:0,final:1,monthly:2,extra:3};
  SETS.sort(function(a,b){return order[a.kind]-order[b.kind]||yr(b)-yr(a)||a.name.localeCompare(b.name,'th');});
  return SETS;
}
function viewSets(){
  var sets=buildSets(),h=top('#/','ชุดข้อสอบ')+'<div class="wrap"><p class="muted" style="font-size:.9rem;margin-top:14px">ทำทีละชุดตามลำดับข้อเดิม เลือก <b>ฝึก</b> เพื่อดูเฉลยทันที หรือ <b>จับเวลา</b> เพื่อทำแบบสอบจริง (1.2 นาทีต่อข้อ)</p>';
  var titles={real:'ข้อสอบจริง (หลายสนาม)',final:'ข้อสอบโค้งสุดท้าย',monthly:'ข้อสอบประจำเดือน',extra:'ข้อสอบเพิ่มเติมในเล่ม'},cur='';
  sets.forEach(function(s,i){
    if(s.kind!==cur){cur=s.kind;h+='<div class="sec"><h2>'+titles[cur]+'</h2></div>';}
    var st=stat(s.ids.map(function(id){return BYID[id];}));
    h+='<div class="setrow"><div><b>'+esc(s.name)+'</b><small>'+st.n+' ข้อ · ทำแล้ว '+pct(st.d,st.n)+'%'+(st.d?' · ถูก '+pct(st.ok,st.d)+'%':'')+'</small></div><div class="setbtn"><button class="btn sm" data-act="setp" data-i="'+i+'">ฝึก</button><button class="btn sm pri" data-act="setm" data-i="'+i+'">จับเวลา</button></div></div>';
  });
  app.innerHTML=h+'</div>';
}

/* ---------- search ---------- */
function viewSearch(){
  app.innerHTML=top('#/','ค้นหาข้อสอบ')+'<div class="wrap"><input id="sq" type="search" placeholder="พิมพ์คำค้น เช่น OSI, Subnet, มาตรา 14, Normalization" value="'+esc(lastSearch)+'" autocomplete="off"><div id="sr"></div></div>';
  var inp=document.getElementById('sq'),tm=null;
  inp.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(function(){lastSearch=inp.value;doSearch();},220);});
  doSearch();
  if(!lastSearch)inp.focus();
}
var SR=[];
function doSearch(){
  var box=document.getElementById('sr');if(!box)return;
  var terms=lastSearch.toLowerCase().split(/\s+/).filter(Boolean);
  if(!terms.length){box.innerHTML='<p class="muted">ค้นได้จากคำในโจทย์ ตัวเลือก และคำอธิบายเฉลย ใส่หลายคำได้โดยเว้นวรรค</p>';SR=[];return;}
  SR=[];
  for(var i=0;i<Q.length;i++){var q=Q[i];if(!q._h)q._h=(q.q+' '+(q.ctx||'')+' '+q.ch.join(' ')+' '+q.e).toLowerCase();
    if(terms.every(function(t){return q._h.indexOf(t)>=0;}))SR.push(q);}
  var h='<p class="muted">พบ '+SR.length+' ข้อ'+(SR.length>60?' (แสดง 60 ข้อแรก)':'')+'</p>';
  if(SR.length)h+='<button class="btn pri full" data-act="srquiz">ทำข้อที่ค้นเจอเป็นแบบฝึก ('+Math.min(SR.length,50)+' ข้อ)</button>';
  SR.slice(0,60).forEach(function(q,j){h+=reviewItem(q,j+1,undefined,false);});
  box.innerHTML=h;
}

/* ---------- mock exam ---------- */
function wsample(pool,n,wf){return pool.map(function(q){return {q:q,k:Math.pow(Math.random(),1/wf(q))};}).sort(function(a,b){return b.k-a.k;}).slice(0,n).map(function(x){return x.q;});}
function buildMock(n,G){
  G=G||GROUPS;
  var counts=G.map(function(g){return Math.floor(n*g.w/100);}),sum=counts.reduce(function(a,b){return a+b;},0);
  var order=G.map(function(g,i){return {i:i,f:n*g.w/100-counts[i]};}).sort(function(a,b){return b.f-a.f;});
  for(var j=0;sum<n;j++,sum++)counts[order[j%order.length].i]++;
  var W={1:1,2:1.6,3:2.2},ids=[];
  G.forEach(function(g,gi){
    var pool=[];g.chs.forEach(function(k){pool=pool.concat(chAll(k));});
    ids=ids.concat(wsample(pool,counts[gi],function(q){return W[q.lv]*(isDone(q)?0.6:1);}).map(function(q){return q.id;}));
  });
  return shuffle(ids);
}
function startMock(ids,title,min,back,kind){MOCK={kind:kind||'ltd',ids:ids,i:0,ans:{},flag:{},title:title,dur:min*60000,start:Date.now(),end:Date.now()+min*60000,state:'run',grid:false,back:back||'#/mock',rv:'wrong'};go('#/mock');}
function viewMock(){
  if(MOCK&&MOCK.state==='run')return mockRun();
  if(MOCK&&MOCK.state==='done')return mockResult();
  var h=top('#/','จำลองสอบกรมที่ดิน')+'<div class="wrap"><h1 class="ch1">จำลองสอบ นักวิชาการคอมพิวเตอร์ กรมที่ดิน</h1>'+
    '<p>ระบบจะสุ่มข้อสอบตามสัดส่วนของหลักสูตร โดยให้น้ำหนักกับข้อสอบจริงและข้อที่ยังไม่เคยทำมากกว่า ระหว่างทำจะไม่เฉลย ส่งคำตอบแล้วจึงเห็นคะแนนแยกตามหมวด</p>'+
    '<div class="tbl"><table class="gt"><thead><tr><th>หมวด</th><th>บทในเล่ม</th><th>สัดส่วน</th></tr></thead><tbody>'+
    GROUPS.map(function(g){return '<tr><td>'+esc(g.name)+'</td><td>'+g.chs.map(function(k){var c=CHK[k];return 'ล.'+c.b+' บ.'+c.c;}).join(', ')+'</td><td>'+g.w+'%</td></tr>';}).join('')+'</tbody></table></div>'+
    '<div class="sizes">'+[[25,30],[50,60],[100,120]].map(function(s){return '<button class="btn'+(s[0]===50?' pri':'')+'" data-act="mstart" data-n="'+s[0]+'" data-min="'+s[1]+'"><span>'+s[0]+' ข้อ</span><small>เวลา '+s[1]+' นาที</small></button>';}).join('')+'</div>'+
    '<p class="warnbox">ข้อสอบจริงของกรมที่ดินยังมีส่วน <b>ความรู้เกี่ยวกับกรมที่ดิน</b> ซึ่งไม่มีในคลังนี้ ชุดจำลองนี้จึงวัดได้เฉพาะส่วนความรู้คอมพิวเตอร์</p>';
  if(S.hist.length){h+='<div class="sec"><h2>ประวัติการสอบ</h2></div><div class="card hist">'+S.hist.slice(0,15).map(function(r){var d=new Date(r.t);return '<div><span>'+d.toLocaleDateString('th-TH',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})+' · '+esc(r.title)+'</span><b>'+r.ok+'/'+r.n+' ('+pct(r.ok,r.n)+'%)</b></div>';}).join('')+'</div>';}
  app.innerHTML=h+'</div>';
}
function viewMockMof(){
  if(MOCK&&MOCK.state==='run'){go('#/mock');return;}
  var h=top('#/','จำลองสอบกระทรวงการคลัง')+'<div class="wrap"><h1 class="ch1">จำลองสอบ นักวิชาการคอมพิวเตอร์ กระทรวงการคลัง</h1>'+
    '<p>สุ่มข้อสอบจากชุด 3 ตามสัดส่วน 7 หมวดในคู่มือเตรียมสอบ (สนามจริงเป็นปรนัย 100 ข้อ 200 คะแนน) ให้น้ำหนักข้อยากและข้อที่ยังไม่เคยทำมากกว่า ระหว่างทำจะไม่เฉลย</p>'+
    '<div class="tbl"><table class="gt"><thead><tr><th>หมวด</th><th>สัดส่วน</th></tr></thead><tbody>'+
    MOFG.map(function(g){return '<tr><td>'+esc(g.name)+'</td><td>'+g.w+'%</td></tr>';}).join('')+'</tbody></table></div>'+
    '<div class="sizes">'+[[25,30],[50,60],[100,120]].map(function(s){return '<button class="btn'+(s[0]===100?' pri':'')+'" data-act="mstart" data-g="mof" data-n="'+s[0]+'" data-min="'+s[1]+'"><span>'+s[0]+' ข้อ</span><small>เวลา '+s[1]+' นาที</small></button>';}).join('')+'</div>';
  app.innerHTML=h+'</div>';
}
function mockRun(){
  var M=MOCK,q=BYID[M.ids[M.i]],n=M.ids.length,answered=Object.keys(M.ans).length,rem=M.end-Date.now();
  var h='<div class="qbar"><a class="x" href="#/" aria-label="ไปหน้าหลัก (เวลายังเดินอยู่)">✕</a><div class="qt">'+esc(M.title)+'</div><div id="timer" class="timer'+(rem<300000?' warn':'')+'">'+fmt(rem)+'</div></div>'+
    '<div class="prog"><i style="width:'+(answered/n*100)+'%"></i></div><div class="wrap qwrap"><div class="mhead"><span>ข้อ '+(M.i+1)+' / '+n+'</span><span>ตอบแล้ว '+answered+' · ติดธง '+Object.keys(M.flag).length+'</span></div>'+
    '<div class="card q">'+qHTML(q,{chosen:M.ans[q.id],mock:true})+'</div>'+
    '<div class="row2"><button class="btn" data-act="mflag">'+(M.flag[q.id]?'⚑ ติดธงแล้ว':'⚐ ติดธงไว้ดูอีกที')+'</button><button class="btn" data-act="mgrid">'+(M.grid?'ซ่อนภาพรวม':'ภาพรวมข้อสอบ')+'</button></div>';
  if(M.grid){
    h+='<div class="card" id="gridcard"><div class="legend"><span>■ ตอบแล้ว</span><span style="color:var(--star)">▢ ติดธง</span></div><div class="grid">'+M.ids.map(function(id,j){return '<button class="'+(M.ans[id]!==undefined?'a ':'')+(M.flag[id]?'f ':'')+(j===M.i?'cur':'')+'" data-act="mjump" data-i="'+j+'">'+(j+1)+'</button>';}).join('')+'</div>'+
       '<button class="btn danger full" data-act="msubmit">ส่งคำตอบ (ตอบแล้ว '+answered+'/'+n+')</button></div>';
  }
  h+='</div><div class="actbar"><button class="btn" data-act="mprev"'+(M.i?'':' disabled')+'>← ก่อนหน้า</button><button class="btn pri" data-act="mnext">'+(M.i+1<n?'ถัดไป →':'ตรวจทานและส่ง')+'</button></div>';
  app.innerHTML=h;
}
function mockChoose(i){var M=MOCK,q=BYID[M.ids[M.i]];if(i>=q.ch.length)return;if(M.ans[q.id]===i)delete M.ans[q.id];else M.ans[q.id]=i;mockRun();}
function submitMock(timeout){
  var M=MOCK;if(!M||M.state!=='run')return;
  var un=M.ids.length-Object.keys(M.ans).length;
  if(!timeout&&!confirm(un?'ยังไม่ได้ตอบ '+un+' ข้อ ต้องการส่งคำตอบเลยหรือไม่?':'ส่งคำตอบ?'))return;
  var mof=M.kind==='mof',G=mof?MOFG:GROUPS,GO=mof?GOFM:GOF;
  var g=G.map(function(x){return {name:x.name,n:0,ok:0};}),ok=0;
  var items=[];
  M.ids.forEach(function(id){var q=BYID[id],a=M.ans[id],gi=GO[q._k];g[gi].n++;if(a!==undefined){var c=record(q,a);items.push({qid:id,choice:a,correct:c,mode:'mock'});if(c){ok++;g[gi].ok++;}}});
  M.res={ok:ok,n:M.ids.length,used:Math.min(Date.now(),M.end)-M.start,groups:g,timeout:!!timeout};
  M.state='done';
  S.hist.unshift({t:Date.now(),title:M.title,n:M.ids.length,ok:ok});S.hist=S.hist.slice(0,30);save();
  if(items.length)api('answer',{items:items});
  api('mock',{title:M.title,n:M.ids.length,ok:ok,used:M.res.used,groups:g});
  if(timeout)toast('หมดเวลา ระบบส่งคำตอบให้แล้ว');
  if(location.hash!=='#/mock')go('#/mock');else{mockResult();window.scrollTo(0,0);}
}
function mockResult(){
  var M=MOCK,r=M.res,p=pct(r.ok,r.n);
  var h=top('#/','ผลการจำลองสอบ')+'<div class="wrap"><div class="card res"><div class="muted">'+esc(M.title)+'</div><div class="big">'+r.ok+'<small> / '+r.n+'</small></div>'+
    '<div class="msg '+(p>=60?'pass':'fail')+'">'+p+'% · '+(p>=60?'ผ่านเกณฑ์ 60%':'ยังไม่ถึงเกณฑ์ 60%')+'</div><div class="muted" style="font-size:.88rem;margin-top:4px">ใช้เวลา '+fmt(r.used)+(r.timeout?' (หมดเวลา)':'')+'</div></div>';
  h+='<div class="tbl"><table class="gt"><thead><tr><th>หมวด</th><th>คะแนน</th></tr></thead><tbody>'+r.groups.filter(function(g){return g.n;}).map(function(g){return '<tr><td>'+esc(g.name)+'<div class="gbar"><i style="width:'+pct(g.ok,g.n)+'%"></i></div></td><td>'+g.ok+'/'+g.n+' ('+pct(g.ok,g.n)+'%)</td></tr>';}).join('')+'</tbody></table></div>';
  var wrongIds=M.ids.filter(function(id){return M.ans[id]!==BYID[id].a;});
  h+='<div class="row2">'+(wrongIds.length?'<button class="btn pri" data-act="mwrong">ฝึกข้อผิด ('+wrongIds.length+')</button>':'')+'<button class="btn" data-act="mnew">สอบใหม่</button><a class="btn" href="#/">หน้าหลัก</a></div>';
  h+='<div class="tabs"><button class="chip'+(M.rv==='wrong'?' on':'')+'" data-act="mrv" data-v="wrong">ข้อผิด/ไม่ได้ตอบ ('+wrongIds.length+')</button><button class="chip'+(M.rv==='all'?' on':'')+'" data-act="mrv" data-v="all">ทุกข้อ ('+M.ids.length+')</button></div>';
  M.ids.forEach(function(id,j){if(M.rv==='all'||wrongIds.indexOf(id)>=0)h+=reviewItem(BYID[id],j+1,M.ans[id],true);});
  app.innerHTML=h+'</div>';
}

/* ---------- router ---------- */
var lastRoute='';
function route(){
  var hsh=location.hash.replace(/^#\/?/,''),parts=hsh.split('/');
  var keep=hsh===lastRoute;lastRoute=hsh;
  switch(parts[0]){
    case 'ch':viewChap(parts[1]);break;
    case 'read':viewRead(parts[1]);break;
    case 'quiz':viewQuiz();break;
    case 'result':viewResult();break;
    case 'review':viewReview(parts[1]);break;
    case 'sets':viewSets();break;
    case 'search':viewSearch();break;
    case 'mock':viewMock();break;
    case 'mockmof':viewMockMof();break;
    default:viewHome();
  }
  if(!keep)window.scrollTo(0,0);
}
var ACT={
  fs:function(){S.o.fs=S.o.fs?0:1;save();api('settings',{o:S.o});route();},
  lv:function(t){startLevel(t.dataset.k,+t.dataset.lv);},
  lvre:function(t){startLevel(t.dataset.k,+t.dataset.lv,'restart');},
  lvpick:function(t){startLevel(t.dataset.k,+t.dataset.lv,'pick');},
  pgrid:function(){SES.grid=!SES.grid;viewQuiz();if(SES.grid){var g=document.getElementById('pgrid');if(g)g.scrollIntoView({behavior:'smooth',block:'nearest'});}},
  pjump:function(t){SES.i=+t.dataset.i;SES.grid=false;viewQuiz();window.scrollTo(0,0);},
  pprev:function(){if(SES.i>0){SES.i--;viewQuiz();window.scrollTo(0,0);}},
  pfinish:function(){go('#/result');},
  wrongch:function(t){var k=t.dataset.k,l=chAll(k).filter(isWrong);startPrac(l.map(function(q){return q.id;}),'ทบทวนข้อผิด · '+bk(CHK[k].b)+' บท '+CHK[k].c,'#/ch/'+k,null);},
  next:function(){pracNext();},
  bm:function(){var q=BYID[SES.ids[SES.i]];if(S.bm[q.id])delete S.bm[q.id];else S.bm[q.id]=1;save();api('bookmark',{qid:q.id,on:!!S.bm[q.id]});viewQuiz();},
  redo:function(){if(SES&&SES.redo)SES.redo();},
  redowrong:function(){var w=SES.ids.filter(function(id){var a=SES.ans[id];return a!==undefined&&a!==BYID[id].a;});startPrac(w,'ทำข้อผิดอีกรอบ',SES.back,null);},
  revall:function(t){var l=revList(t.dataset.tab);startPrac(l.map(function(q){return q.id;}),t.dataset.tab==='bm'?'ทบทวนข้อที่เก็บไว้':'ทบทวนข้อผิดทั้งหมด','#/review'+(t.dataset.tab==='bm'?'/bm':''),null);},
  revch:function(t){var k=t.dataset.k,l=revList(t.dataset.tab,k);startPrac(l.map(function(q){return q.id;}),'ทบทวน · '+bk(CHK[k].b)+' บท '+CHK[k].c,'#/review'+(t.dataset.tab==='bm'?'/bm':''),null);},
  setp:function(t){var s=buildSets()[+t.dataset.i];startPrac(s.ids.slice(),s.name,'#/sets',null);},
  setm:function(t){var s=buildSets()[+t.dataset.i];if(MOCK&&MOCK.state==='run'&&!confirm('มีการสอบที่ยังทำค้างอยู่ จะเริ่มชุดใหม่แทนหรือไม่?'))return;startMock(s.ids.slice(),s.name,Math.max(5,Math.round(s.ids.length*1.2)),'#/sets');},
  srquiz:function(){startPrac(SR.slice(0,50).map(function(q){return q.id;}),'ข้อที่ค้นเจอ: '+lastSearch,'#/search',null);},
  mstart:function(t){var n=+t.dataset.n;if(t.dataset.g==='mof')startMock(buildMock(n,MOFG),'จำลองสอบกระทรวงการคลัง '+n+' ข้อ',+t.dataset.min,'#/mockmof','mof');else startMock(buildMock(n),'จำลองสอบกรมที่ดิน '+n+' ข้อ',+t.dataset.min);},
  mflag:function(){var id=MOCK.ids[MOCK.i];if(MOCK.flag[id])delete MOCK.flag[id];else MOCK.flag[id]=1;mockRun();},
  mgrid:function(){MOCK.grid=!MOCK.grid;mockRun();if(MOCK.grid){var g=document.getElementById('gridcard');if(g)g.scrollIntoView({behavior:'smooth',block:'nearest'});}},
  mjump:function(t){MOCK.i=+t.dataset.i;mockRun();window.scrollTo(0,0);},
  mprev:function(){if(MOCK.i>0){MOCK.i--;mockRun();window.scrollTo(0,0);}},
  mnext:function(){if(MOCK.i+1<MOCK.ids.length){MOCK.i++;mockRun();window.scrollTo(0,0);}else{MOCK.grid=true;mockRun();var g=document.getElementById('gridcard');if(g)g.scrollIntoView({behavior:'smooth',block:'center'});}},
  msubmit:function(){submitMock(false);},
  mrv:function(t){MOCK.rv=t.dataset.v;mockResult();},
  mnew:function(){var back=MOCK.back;MOCK=null;go(back);},
  mwrong:function(){var M=MOCK,w=M.ids.filter(function(id){return M.ans[id]!==BYID[id].a;});startPrac(w,'ฝึกข้อผิดจากการจำลองสอบ','#/mock',null);},
  exp:function(){try{var b=new Blob([JSON.stringify(S)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='ความคืบหน้า-ติวกรมที่ดิน.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},800);}catch(e){toast('สำรองไม่สำเร็จในเบราว์เซอร์นี้');}},
  imp:function(){
    if(!confirm('การนำเข้าจะแทนที่ความคืบหน้าปัจจุบันทั้งหมด ต้องการทำต่อหรือไม่?'))return;
    var inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
    inp.onchange=function(){var f=inp.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var o=JSON.parse(r.result);if(!o||typeof o.p!=='object')throw 0;S.p=o.p;S.bm=o.bm||{};S.hist=o.hist||[];if(o.o)for(var k in o.o)S.o[k]=o.o[k];save();api('import',{p:S.p,bm:S.bm,hist:S.hist,o:S.o});applyPrefs();toast('นำเข้าความคืบหน้าแล้ว');route();}catch(e){toast('ไฟล์ไม่ถูกต้อง');}};r.readAsText(f);};
    inp.click();
  },
  reset:function(){if(confirm('ล้างความคืบหน้า ข้อที่เก็บไว้ และประวัติการสอบทั้งหมด?')){S.p={};S.bm={};S.hist=[];save();api('reset',{});toast('ล้างแล้ว');route();}}
};
app.addEventListener('click',function(e){
  var t=e.target.closest('[data-ch],[data-act],[data-set],[data-sc]');if(!t)return;
  if(t.dataset.ch!==undefined){
    var i=+t.dataset.ch;
    if(location.hash.indexOf('#/quiz')===0&&SES)pracChoose(i);
    else if(location.hash.indexOf('#/mock')===0&&MOCK&&MOCK.state==='run')mockChoose(i);
    return;
  }
  if(t.dataset.sc){var el=document.getElementById(t.dataset.sc);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(t.dataset.set){var kv=t.dataset.set.split(':'),k=kv[0],v=kv[1];S.o[k]=(k==='n'&&v!=='all')||k==='font'?+v:v;save();api('settings',{o:S.o});if(k==='theme'||k==='font')applyPrefs();route();return;}
  var a=ACT[t.dataset.act];if(a)a(t);
});
document.addEventListener('keydown',function(e){
  if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;
  var h=location.hash,n=parseInt(e.key,10);
  if(h.indexOf('#/quiz')===0&&SES){
    if(n>=1&&n<=6){pracChoose(n-1);e.preventDefault();}
    else if(e.key==='ArrowRight'||(e.key==='Enter'&&SES.ans[SES.ids[SES.i]]!==undefined)){pracNext();e.preventDefault();}
    else if(e.key==='ArrowLeft'){ACT.pprev();e.preventDefault();}
  }else if(h.indexOf('#/mock')===0&&MOCK&&MOCK.state==='run'){
    if(n>=1&&n<=6){mockChoose(n-1);e.preventDefault();}
    else if(e.key==='ArrowRight')ACT.mnext();else if(e.key==='ArrowLeft')ACT.mprev();
  }
});
function applyPrefs(){
  var r=document.documentElement;
  if(S.o.theme==='light'||S.o.theme==='dark')r.setAttribute('data-theme',S.o.theme);else r.removeAttribute('data-theme');
  r.style.setProperty('--fs',[14.5,16,17.5,19][S.o.font]+'px');
}
setInterval(function(){
  if(!MOCK||MOCK.state!=='run')return;
  var rem=MOCK.end-Date.now();
  if(rem<=0){submitMock(true);return;}
  var el=document.getElementById('timer');if(el){el.textContent=fmt(rem);if(rem<300000)el.classList.add('warn');}
},1000);
window.addEventListener('beforeunload',function(e){if(MOCK&&MOCK.state==='run'){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',route);
// start from the local cache, then take the server copy unless local changes are still waiting to be sent
load();applyPrefs();
fetch('/api/state',{cache:'no-store'})
  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(function(st){
    if(!QUEUE.length){S.p={};S.bm={};S.hist=[];applyState(st);save();}
    NET.online=true;applyPrefs();route();flush();
  })
  .catch(function(){NET.online=false;route();toast('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ใช้ข้อมูลในเครื่องไปก่อน');});
}
})();
