"""Extract positioned text lines (with red/bold flags), images and drawing boxes from every PDF.
Output: lines/<key>.json  ->  {"pages":[{"w":..,"h":..,"lines":[...],"imgs":[[x0,y0,x1,y1],..],"draw":[[..]..]}]}
"""
import pymupdf, json, os, sys, glob, re

ROOT = r'C:\Users\ggwd4\Downloads\000 ไฟล์ติว กลุ่ม 2568 (V2)'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lines')
os.makedirs(OUT, exist_ok=True)

HEADER_PATTERNS = [
    re.compile(r'^เตรียมสอบคอมพิวเตอร์ 25\d\d โดย'),
    re.compile(r'^หน้า\s*\S+$'),
    re.compile(r'^Facebook & YouTube ครูผู้ช่วยวันธรรมดา'),
]

def is_red(c):
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    return r > 150 and g < 90 and b < 90

def extract(path):
    d = pymupdf.open(path)
    pages = []
    for p in d:
        lines = []
        dd = p.get_text('dict')
        for b in dd['blocks']:
            if b['type'] != 0:
                continue
            for l in b['lines']:
                spans = [s for s in l['spans'] if s['text'].strip()]
                if not spans:
                    continue
                t = ''.join(s['text'] for s in l['spans']).strip()
                t = re.sub(r'\s+', ' ', t)
                if any(hp.search(t) for hp in HEADER_PATTERNS):
                    continue
                nchar = sum(len(s['text'].strip()) for s in spans)
                red = sum(len(s['text'].strip()) for s in spans if is_red(s['color']))
                bold = sum(len(s['text'].strip()) for s in spans if s['flags'] & 16)
                x0, y0, x1, y1 = l['bbox']
                lines.append({'t': t, 'b': [round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1)],
                              'red': round(red / nchar, 2), 'bold': round(bold / nchar, 2)})
        # sort by y then x (group lines whose y-centers are within 3pt)
        lines.sort(key=lambda L: (round((L['b'][1] + L['b'][3]) / 2 / 4), L['b'][0]))
        imgs = []
        for info in p.get_image_info():
            x0, y0, x1, y1 = info['bbox']
            if (x1 - x0) > 8 and (y1 - y0) > 8:
                imgs.append([round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1)])
        draws = []
        try:
            for dr in p.get_drawings():
                r = dr['rect']
                draws.append([round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1)])
        except Exception:
            pass
        pages.append({'w': p.rect.width, 'h': p.rect.height, 'lines': lines, 'imgs': imgs, 'draw': draws})
    return pages

def key_for(path):
    rel = os.path.relpath(path, ROOT)
    folder = rel.split(os.sep)[0][:2]
    name = os.path.splitext(os.path.basename(path))[0].strip()
    return folder + '_' + name

if __name__ == '__main__':
    files = (glob.glob(ROOT + r'\01*\0[78]*.pdf') + glob.glob(ROOT + r'\02*\*.pdf') +
             glob.glob(ROOT + r'\04*\*.pdf') + glob.glob(ROOT + r'\05*\*.pdf') +
             glob.glob(ROOT + r'\07*\*.pdf') + glob.glob(ROOT + r'\03*\โค้ง*.pdf'))
    index = {}
    for f in files:
        k = key_for(f)
        pages = extract(f)
        json.dump({'src': f, 'pages': pages}, open(os.path.join(OUT, k + '.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        index[k] = f
        print(len(pages), k)
    json.dump(index, open(os.path.join(OUT, '_index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
