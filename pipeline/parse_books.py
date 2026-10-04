import re, json, os, sys
from qparse import load, parse_lines, HERE

BOOKS = {1: '01_07 (เล่มน้ำตาล) รวมเล่มเนื้อหา - 2569 - เล่ม 1 v4 (1 มีนาคม 2569)',
         2: '01_08 (เล่มน้ำตาล) รวมเล่มเนื้อหา - 2569 - เล่ม 2 v4 (23 มิ.ย. 69)'}
QH = re.compile(r'^ข้อสอบทบทวน(?:บท|ชีต)ที่\s*(\d+)\s*(.*)$')
CHH = re.compile(r'^บทที่\s*(\d+)\s+\S')
FIRST_BODY_PAGE = 12


def segments(book):
    d, flat = load(BOOKS[book])
    heads = []
    for i, L in enumerate(flat):
        if L['p'] + 1 < FIRST_BODY_PAGE:
            continue
        t = L['t'].strip()
        if QH.match(t):
            heads.append((i, 'quiz', t))
        elif CHH.match(t) and L['b'][1] < 140:
            heads.append((i, 'chap', t))
    segs = []
    chap = 1
    for k, (i, kind, t) in enumerate(heads):
        if kind == 'chap':
            chap = int(CHH.match(t).group(1))
            continue
        end = heads[k + 1][0] if k + 1 < len(heads) else len(flat)
        m = re.search(r'ชุด(?:ที่)?\s*(\S+?)\)', t)
        segs.append({'book': book, 'chap': chap, 'title': t, 'set': m.group(1) if m else '1',
                     'lines': flat[i + 1:end], 'page': flat[i]['p'] + 1})
    return d, segs


if __name__ == '__main__':
    allq = []
    for b in (1, 2):
        d, segs = segments(b)
        for s in segs:
            qs, key = parse_lines(s['lines'])
            nk = sum(1 for q in qs if q['num'] in key)
            bad = [q['num'] for q in qs if sum(1 for c in q['choices'] if c) < 4]
            nums = [q['num'] for q in qs]
            gaps = [x for x in range(1, max(nums) + 1) if x not in nums] if nums else []
            print(f"B{b} ch{s['chap']:>2} set{s['set']:<3} p{s['page']:<4} Q={len(qs):3d} key={len(key):3d} matched={nk:3d} lt4={bad[:8]} gaps={gaps[:8]}")
            for q in qs:
                q.update({'src': f'B{b}', 'book': b, 'chap': s['chap'], 'set': s['set'],
                          'ans': key.get(q['num'], {}).get('ans'), 'exp': key.get(q['num'], {}).get('exp', '')})
                allq.append(q)
    json.dump(allq, open(os.path.join(HERE, 'book_q.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('total', len(allq), 'with ans', sum(1 for q in allq if q['ans']))
