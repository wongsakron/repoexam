"""Merge raw.json + review files + new/real questions -> questions.json (+ images map)."""
import json, os, re, glob, base64, collections
from qparse import HERE

LET = 'กขคงจ'
R = json.load(open(os.path.join(HERE, 'raw.json'), encoding='utf-8'))
DUPS = json.load(open(os.path.join(HERE, 'dups.json'), encoding='utf-8'))
BYID = {r['id']: r for r in R}

TRAIL = re.compile(r'\s+(?:ใช้|อ่าน|ศึกษา|พิจารณา|จากภาพ)[^\n]{0,80}?ตอบคำถาม[^\n]*$')


def clean_choice(c):
    c = c.strip()
    c = re.sub(r'^[กขคงจ]\s*[\.\)]\s*', '', c)       # duplicated marker "ก. ระบบ..."
    c = TRAIL.sub('', c).strip()
    return c


def clean_stem(s):
    s = TRAIL.sub('', s).strip()
    return s


def parse_reviews():
    rev = collections.defaultdict(dict)
    for f in sorted(glob.glob(os.path.join(HERE, 'rev', '*.txt'))):
        for ln_no, line in enumerate(open(f, encoding='utf-8'), 1):
            line = line.rstrip('\n')
            if not line.strip() or '|' not in line:
                continue
            qid, rest = line.split('|', 1)
            qid = qid.strip()
            d = rev[qid]
            d.setdefault('_src', os.path.basename(f))
            # whole-line directives
            m = re.match(r'^(q|ch|skip|ctx)=(.*)$', rest, re.S)
            if m:
                d[m.group(1)] = m.group(2).strip()
                continue
            if rest.strip() in ('noimg', 'nofig'):
                d[rest.strip()] = True
                continue
            m = re.match(r'^fig=(\S+)$', rest.strip())
            if m:
                d['fig'] = m.group(1)
                continue
            parts = rest.split('|')
            text_parts = []
            for p in parts:
                ps = p.strip()
                if re.fullmatch(r'\d-\d{1,2}', ps):
                    d['chap'] = ps
                elif re.fullmatch(r'a=[กขคงจ]', ps):
                    d['a'] = LET.index(ps[2])
                else:
                    text_parts.append(p.strip())
            if text_parts:
                d['e'] = (d.get('e', '') + ' ' + '|'.join(text_parts)).strip()
    return rev


def main():
    rev = parse_reviews()
    out = []
    used_imgs = set()
    problems = []
    for r in R:
        qid = r['id']
        if qid in DUPS:
            continue
        d = rev.get(qid, {})
        if 'skip' in d:
            continue
        q = {'id': qid}
        kind = r['kind']
        q['kind'] = kind
        q['lv'] = {'book': 1, 'extra': 2, 'monthly': 2, 'final': 3}[kind]
        if kind in ('book', 'extra'):
            q['b'], q['c'] = r['book'], r['chap']
        else:
            if 'chap' not in d:
                problems.append(('nochap', qid)); continue
            b, c = d['chap'].split('-')
            q['b'], q['c'] = int(b), int(c)
        q['src'] = r['src']
        q['q'] = clean_stem(d['q'] if 'q' in d else r['stem'])
        ctx = d['ctx'] if 'ctx' in d else r.get('ctx', '')
        q['ctx'] = clean_stem(ctx) if ctx else ''
        if 'ch' in d:
            q['ch'] = [x.strip() for x in d['ch'].split(';;')]
        else:
            q['ch'] = [clean_choice(c) for c in r['choices']]
        a = d.get('a', r['ans'])
        if a is None:
            problems.append(('noans', qid)); continue
        q['a'] = a
        if a >= len(q['ch']):
            problems.append(('ans_out_of_range', qid))
        e = d.get('e', '').strip()
        if not e:
            problems.append(('noexp', qid))
        q['e'] = e
        # figures
        figs = {}
        if not d.get('nofig'):
            for k in ('cimg', 'pimg', 'img'):
                if r.get(k) and not (k == 'img' and d.get('noimg')):
                    figs[k] = r[k]
            if 'fig' in d:
                src = BYID[d['fig']]
                for k in ('cimg', 'pimg', 'img'):
                    if src.get(k):
                        figs.setdefault('pimg' if k == 'img' else k, src[k])
                if not q['ctx'] and src.get('ctx'):
                    q['ctx'] = clean_stem(src['ctx'])
        # order of display: ctx image, pre image, own image
        im = [figs[k] for k in ('cimg', 'pimg', 'img') if k in figs]
        im = list(dict.fromkeys(im))
        if im:
            q['im'] = im
            used_imgs.update(im)
            # if an image already shows the shared text block, hide long ctx text
            if 'cimg' in figs:
                q['ctx_in_img'] = 1
            if r.get('img_has_choices') and 'img' in figs:
                q['ch_in_img'] = 1
        if any(not c for c in q['ch']) and not q.get('ch_in_img'):
            problems.append(('emptychoice', qid))
        q['page'] = r.get('page')
        out.append(q)
    # new / authored questions
    for f in ['new_q.jsonl'] + sorted(glob.glob(os.path.join(HERE, 'real_q', '*.jsonl'))):
        p = f if os.path.isabs(f) else os.path.join(HERE, f)
        if not os.path.exists(p):
            continue
        for line in open(p, encoding='utf-8'):
            line = line.strip()
            if not line:
                continue
            o = json.loads(line)
            if 'lv' not in o:
                o['lv'] = 1 if o.get('kind') == 'book' else 3
            if 'b' not in o:
                o['b'], o['c'] = o.pop('book'), o.pop('chap')
            if 'kind' not in o:
                o['kind'] = 'real'
            out.append(o)
    # authored practice questions (level 2) grounded in the brown books
    for p in sorted(glob.glob(os.path.join(HERE, 'lv2_q', '*.jsonl'))):
        for line in open(p, encoding='utf-8'):
            line = line.strip()
            if not line:
                continue
            o = json.loads(line)
            o.setdefault('kind', 'auth')
            o.setdefault('lv', 2)
            o.setdefault('src', 'โจทย์ฝึกจากเนื้อหาเล่มน้ำตาล (เรียบเรียงใหม่)')
            out.append(o)
    # sanity checks on every question
    seen = set()
    for q in out:
        if q['id'] in seen:
            problems.append(('dup_id', q['id']))
        seen.add(q['id'])
        if not (0 <= q['a'] < len(q['ch'])):
            problems.append(('bad_ans', q['id']))
        if not q.get('e'):
            problems.append(('noexp', q['id']))
    json.dump(out, open(os.path.join(HERE, 'questions.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(sorted(used_imgs), open(os.path.join(HERE, 'used_imgs.json'), 'w', encoding='utf-8'))
    cnt = collections.Counter((q['b'], q['c'], q['lv']) for q in out)
    print('total', len(out), 'images', len(used_imgs))
    for b in (1, 2):
        for c in range(1, 12):
            row = [cnt.get((b, c, lv), 0) for lv in (1, 2, 3)]
            if sum(row):
                print(f'  B{b} ch{c:2d}: lv1={row[0]:3d} lv2={row[1]:3d} lv3={row[2]:3d}')
    print('problems', len(problems))
    for p in problems[:80]:
        print('  ', p)
    unused = set(rev) - set(r['id'] for r in R)
    if unused:
        print('review ids not in raw:', sorted(unused)[:20])


if __name__ == '__main__':
    main()
