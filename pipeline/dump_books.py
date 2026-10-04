import json, os, glob
from qparse import HERE
os.makedirs(os.path.join(HERE,'book_txt'), exist_ok=True)
for b, pat in ((1,'01_07*'),(2,'01_08*')):
    f = glob.glob(os.path.join(HERE,'lines',pat+'.json'))[0]
    d = json.load(open(f,encoding='utf-8'))
    pages = d['pages'] if isinstance(d,dict) else d
    out = open(os.path.join(HERE,'book_txt',f'B{b}.txt'),'w',encoding='utf-8')
    for i,p in enumerate(pages):
        out.write(f'=== p{p.get("p", i+1) if isinstance(p,dict) else i+1}\n')
        lines = p['lines'] if isinstance(p,dict) else p
        for L in lines:
            t = L['t'] if isinstance(L,dict) else L
            out.write(('**' if isinstance(L,dict) and L.get('bold') else '')+t+'\n')
    out.close()
    print(b, len(pages))
