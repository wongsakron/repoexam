import re, sys, glob, os, json
T = os.path.join(os.path.dirname(__file__), '..', 'txt')
def load_book(prefix):
    f = glob.glob(os.path.join(T, prefix + '*.txt'))[0]
    pages = re.split(r'\n=====PAGE (\d+)=====\n', open(f, encoding='utf-8').read())
    out = []  # list of (page, line)
    for i in range(1, len(pages), 2):
        pg = int(pages[i]); body = pages[i+1]
        for ln in body.split('\n'):
            s = ln.strip()
            if not s: continue
            if s.startswith('เตรียมสอบคอมพิวเตอร์ 2569 โดย'): continue
            if re.fullmatch(r'หน้า\s*\S+', s): continue
            if s.startswith('Facebook & YouTube ครูผู้ช่วยวันธรรมดา'): continue
            out.append((pg, s))
    return out
