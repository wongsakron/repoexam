const fs=require('fs');
const src=fs.readFileSync('app_check.js','utf8');
const escFn=src.match(/function esc\(s\)\{.*?\}\r?\n/s)[0];
const mdPart=src.slice(src.indexOf('/* ---------- mini markdown'),src.indexOf('/* ---------- question card'));
eval(escFn+mdPart+';global.md=md;');
const voids=new Set(['br','img','hr']);
let bad=0;
for(const f of fs.readdirSync('sum')){
  const t=fs.readFileSync('sum/'+f,'utf8');
  const r=md(t);
  const stack=[];let ok=true;
  for(const m of r.html.matchAll(/<(\/?)([a-z0-9]+)[^>]*>/g)){
    const [_,cl,tag]=m; if(voids.has(tag))continue;
    if(!cl)stack.push(tag); else { const top=stack.pop(); if(top!==tag){ok=false;console.log(f,'mismatch',top,tag);break;} }
  }
  if(stack.length){ok=false;console.log(f,'unclosed',stack.slice(-3));}
  const text=r.html.replace(/<[^>]+>/g,'');
  const left=[];
  if(/\*\*/.test(text))left.push('**');
  if(/`/.test(text))left.push('`');
  if(/(^|\n)\s*\|/.test(text))left.push('|');
  if(left.length){ok=false;console.log(f,'leftover',left, (text.match(/.{0,40}\*\*.{0,40}/)||[''])[0]);}
  if(!ok)bad++;
  console.log(f.padEnd(10),ok?'OK':'BAD','h2:',r.toc.length,'len',r.html.length);
}
console.log('bad',bad);
