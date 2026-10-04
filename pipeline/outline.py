import re, sys, os
sys.stdout.reconfigure(encoding='utf-8')
# chapter body ranges (start page of chapter, end = start of its quiz)
B1 = {1:11,2:50,3:73,4:85,5:131,6:191,7:213,8:239,9:309,10:359,11:400}
B2 = {1:11,2:45,3:116,4:159,5:201,6:235,7:249,8:295,9:336,10:366}
def pages(b):
    txt = open(f'book_txt/B{b}.txt',encoding='utf-8').read()
    parts = re.split(r'^=== p(\d+)\n', txt, flags=re.M)
    return {int(parts[i]): parts[i+1] for i in range(1,len(parts),2)}
def chapter(b, c):
    P = pages(b); S = B1 if b==1 else B2
    start = S[c]; end = S.get(c+1, max(P)+1)
    out = []
    for p in range(start, end):
        t = P.get(p,'')
        if re.search(r'ข้อสอบทบทวนบทที่', t):
            # stop at the quiz heading
            pre = t.split('ข้อสอบทบทวนบทที่')[0]
            out.append((p, pre)); break
        out.append((p, t))
    return out
if __name__ == '__main__':
    b, c, mode = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    for p, t in chapter(b, c):
        if mode == 'bold':
            for ln in t.splitlines():
                if ln.startswith('**'): print(f'p{p}: {ln[2:]}')
        else:
            print(f'=== p{p}'); print(t.replace('**',''))
