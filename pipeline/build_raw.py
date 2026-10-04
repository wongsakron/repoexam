"""Parse all structured sources -> raw.json, and render figure crops -> imgs/*.webp"""
import json, os, re, io
import pymupdf
from PIL import Image
from qparse import load, parse_lines, HERE
from parse_books import segments, BOOKS

IMG_DIR = os.path.join(HERE, 'imgs')
os.makedirs(IMG_DIR, exist_ok=True)

# extra quiz files -> (book, chap, set label)
EXTRA = {
    '02_2569 ข้อสอบทบทวนบทที่ 11 ชุดที่ 2 (pdf)': (1, 11, 'เพิ่มเติม ชุด 2'),
    '02_2569 ข้อสอบทบทวนบทที่ 4 ชุดที่ 3': (1, 4, 'เพิ่มเติม ชุด 3'),
    '02_2569 ข้อสอบทบทวนบทที่ 5 ชุดที่ 2': (1, 5, 'เพิ่มเติม ชุด 2'),
    '02_2569 ข้อสอบทบทวนบทที่ 7 ชุดที่ 2': (1, 7, 'เพิ่มเติม ชุด 2'),
    '02_2569 ข้อสอบทบทวนบทที่ 8 ชุดพิเศษ': (1, 8, 'เพิ่มเติม ชุดพิเศษ'),
    '02_เล่ม 2 2569 ข้อสอบทบทวนบทที่ 2 ชุดที่ 5': (2, 2, 'เพิ่มเติม ชุด 5'),
    '02_เล่ม 2 2569 ข้อสอบทบทวนบทที่ 3 ชุดที่ 2 (ต่อข้อ 27)': (2, 3, 'เพิ่มเติม ชุด 2 (ต่อ)'),
}
MONTHLY = {
    '04_ข้อสอบประจำเดือนครั้งที่ 1 ม.ค. 100 ข้อ': ('M1', 'ข้อสอบประจำเดือน ม.ค. 69'),
    '04_ข้อสอบประจำเดือนครั้งที่ 2 ก.พ. 100 ข้อ': ('M2', 'ข้อสอบประจำเดือน ก.พ. 69'),
    '04_ข้อสอบประจำเดือนครั้งที่ 3 มี.ค. 100 ข้อ': ('M3', 'ข้อสอบประจำเดือน มี.ค. 69'),
    '04_ข้อสอบประจำเดือนครั้งที่ 4 เม.ย. 100 ข้อ': ('M4', 'ข้อสอบประจำเดือน เม.ย. 69'),
    '04_ข้อสอบประจำเดือนครั้งที่ 5 พ.ค. 100 ข้อ': ('M5', 'ข้อสอบประจำเดือน พ.ค. 69'),
}
FINAL = {
    '07_ข้อสอบโค้งสุดท้าย 69': ('F1', 'ข้อสอบโค้งสุดท้าย 69'),
    '03_โค้งสุดท้าย ท้องถิ่น ครู และนักวิชาการคอม': ('F2', 'โค้งสุดท้าย ท้องถิ่น/ครู/นวก.คอม'),
}
LET = 'กขคงจ'


def region_has_visual(page, p, y0, y1):
    im = dr = 0
    for b in page['imgs']:
        if b[1] < y1 and b[3] > y0 and (min(b[3], y1) - max(b[1], y0)) > 12:
            im += 1
    for b in page['draw']:
        if b[1] >= y0 - 2 and b[3] <= y1 + 2 and (b[2] - b[0] > 3 or b[3] - b[1] > 3):
            dr += 1
    return im, dr


def spans(pages, a, b):
    """page-spans between positions a=(p,y) and b=(p,y)"""
    out = []
    for p in range(a[0], b[0] + 1):
        h = pages[p]['h']
        y0 = a[1] - 3 if p == a[0] else 40
        y1 = b[1] + 1 if p == b[0] else h - 30
        if y1 - y0 > 8:
            out.append((p, y0, y1))
    return out


def visual_in(pages, sp):
    im = dr = 0
    for (p, y0, y1) in sp:
        a, b = region_has_visual(pages[p], p, y0, y1)
        im += a; dr += b
    return im, dr


def render(doc, sp, key, dpi=110):
    path = os.path.join(IMG_DIR, key + '.webp')
    ims = []
    for (p, y0, y1) in sp:
        pg = doc[p]
        clip = pymupdf.Rect(30, y0, pg.rect.width - 30, y1)
        pix = pg.get_pixmap(dpi=dpi, clip=clip)
        ims.append(Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB'))
    w = max(i.width for i in ims)
    h = sum(i.height for i in ims)
    canvas = Image.new('RGB', (w, h), 'white')
    y = 0
    for i in ims:
        canvas.paste(i, (0, y)); y += i.height
    # trim white margins
    from PIL import ImageChops
    bg = Image.new('RGB', canvas.size, 'white')
    bbox = ImageChops.difference(canvas, bg).getbbox()
    if bbox:
        canvas = canvas.crop((max(0, bbox[0] - 8), max(0, bbox[1] - 6), min(w, bbox[2] + 8), min(h, bbox[3] + 6)))
    canvas.save(path, 'WEBP', quality=55, method=6)
    return key


REF_CUE = re.compile(r'นี้|ดังกล่าว|จากภาพ|จากรูป|จากแผนภาพ|ข้างต้น|จากตาราง|จากโค้ด|จากโปรแกรม|จากชุดคำสั่ง|จากข้อที่แล้ว|ต่อเนื่องจากข้อ')


def figures(q, pages, doc, idbase, ctx_cache, prev=None, state=None):
    """decide + render ctx image and own image"""
    out = {}
    if prev is None:
        prev = {'end': (q['start'][0], 60)}
    # figure sitting between previous question and this one (no text label)
    if prev is not None:
        a = tuple(prev['end'])
        b = tuple(q['ctx_start']) if (q.get('ctx_start') and q.get('ctx_end') == q['start']) else tuple(q['start'])
        if b > a:
            sp = spans(pages, (a[0], a[1] + 4), b)
            im, dr = visual_in(pages, sp)
            tall = sum(y1 - y0 for (_, y0, y1) in sp) > 70 and not q.get('ctx_start')
            if (im or dr >= 6) and sum(y1 - y0 for (_, y0, y1) in sp) > 30:
                out['pimg'] = render(doc, sp, idbase + '_pre')
                if state is not None:
                    state['last_fig'] = (out['pimg'], q['num'], 'p')
    if 'pimg' not in out and state is not None and state.get('last_fig') and not q.get('ctx_start'):
        key, n0, kind = state['last_fig']
        if q['num'] - n0 <= 6 and REF_CUE.search(q['stem']):
            out['pimg'] = key
        elif not REF_CUE.search(q['stem']):
            state['last_fig'] = None
    # shared/own context block above the question
    if q.get('ctx_start') and q.get('ctx_end'):
        ck = tuple(q['ctx_start'])
        if ck in ctx_cache:
            if ctx_cache[ck]:
                out['cimg'] = ctx_cache[ck]
        else:
            sp = spans(pages, q['ctx_start'], q['ctx_end'])
            im, dr = visual_in(pages, sp)
            codeish = sum(1 for l in q['ctx'].split('\n') if re.search(r'[=;{}()<>:]', l)) >= 2
            gap_big = any(y1 - y0 > 60 + 22 * max(1, len(q['ctx'].split('\n'))) for (p, y0, y1) in sp)
            if im or dr >= 6 or codeish or gap_big:
                ctx_cache[ck] = render(doc, sp, idbase + '_ctx')
                out['cimg'] = ctx_cache[ck]
                if state is not None:
                    state['last_fig'] = (out['cimg'], q['num'], 'c')
            else:
                ctx_cache[ck] = None
    # own stem region (question line .. first choice) and choice region
    st = tuple(q['start'])
    cs = tuple(q['choice_start']) if q.get('choice_start') else tuple(q['end'])
    if q.get('shared_choices'):
        cs = tuple(q['end'])
    en = tuple(q['end'])
    sp_stem = spans(pages, st, cs) if cs > st else []
    im, dr = visual_in(pages, sp_stem) if sp_stem else (0, 0)
    stem_lines = max(1, len(q['stem'].split('\n')))
    gap_big = any(y1 - y0 > 40 + 24 * stem_lines for (p, y0, y1) in sp_stem)
    empty_choice = any(not c.strip() for c in q['choices']) or not q['choices']
    sp_ch = spans(pages, cs, en) if (en > cs and not q.get('shared_choices')) else []
    imc, drc = visual_in(pages, sp_ch) if sp_ch else (0, 0)
    if im or dr >= 8 or gap_big or empty_choice or imc:
        endpos = en if (empty_choice or imc) else cs
        sp = spans(pages, st, endpos)
        out['img'] = render(doc, sp, idbase)
        out['img_has_choices'] = bool(empty_choice or imc)
    return out


def make(q, **kw):
    d = {'num': q['num'], 'stem': q['stem'], 'ctx': q.get('ctx', ''), 'choices': q['choices'],
         'shared_choices': q.get('shared_choices', False)}
    d.update(kw)
    return d


def main():
    raw = []
    # ---------- books
    for b in (1, 2):
        d, segs = segments(b)
        doc = pymupdf.open(d['src'])
        pages = d['pages']
        cache = {}
        for s in segs:
            qs, key = parse_lines(s['lines'])
            state = {}
            for qi, q in enumerate(qs):
                qid = f"B{b}-{s['chap']}-{s['set']}-{q['num']}"
                k = key.get(q['num'], {})
                fig = figures(q, pages, doc, qid, cache, qs[qi - 1] if qi else None, state)
                raw.append(make(q, id=qid, kind='book', book=b, chap=s['chap'],
                                src=f"เล่ม {b} ท้ายบท {s['chap']} ชุด {s['set']} ข้อ {q['num']}",
                                ans=LET.index(k['ans']) if k.get('ans') else None, kexp=k.get('exp', ''),
                                page=q['start'][0] + 1, **fig))
    # ---------- extra / monthly / final
    for groups, kind in ((EXTRA, 'extra'), (MONTHLY, 'monthly'), (FINAL, 'final')):
        for fk, meta in groups.items():
            d, flat = load(fk)
            doc = pymupdf.open(d['src'])
            pages = d['pages']
            qs, key = parse_lines(flat)
            cache = {}
            state = {}
            for qi, q in enumerate(qs):
                k = key.get(q['num'], {})
                if kind == 'extra':
                    b, ch, label = meta
                    qid = f"X{b}-{ch}-{re.sub(r'[^0-9A-Za-z]', '', label) or 's'}-{q['num']}"
                    extra = dict(book=b, chap=ch, src=f"เล่ม {b} บท {ch} ข้อสอบ{label} ข้อ {q['num']}")
                else:
                    code, label = meta
                    qid = f"{code}-{q['num']}"
                    extra = dict(book=None, chap=None, src=f"{label} ข้อ {q['num']}")
                fig = figures(q, pages, doc, qid, cache, qs[qi - 1] if qi else None, state)
                raw.append(make(q, id=qid, kind=kind, ans=LET.index(k['ans']) if k.get('ans') else None,
                                kexp=k.get('exp', ''), page=q['start'][0] + 1, file=fk, **extra, **fig))
    json.dump(raw, open(os.path.join(HERE, 'raw.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    from collections import Counter
    print(Counter(r['kind'] for r in raw))
    print('with img', sum(1 for r in raw if r.get('img')), 'with cimg', sum(1 for r in raw if r.get('cimg')), 'with pimg', sum(1 for r in raw if r.get('pimg')))
    print('no ans', Counter(r['kind'] for r in raw if r['ans'] is None))


if __name__ == '__main__':
    main()
