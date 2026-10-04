"""Make review batches (compact text views) + duplicate list."""
import json, re, os, collections
from qparse import HERE

R = json.load(open(os.path.join(HERE, 'raw.json'), encoding='utf-8'))
LET = 'กขคงจ'
PRIO = {'book': 0, 'extra': 1, 'monthly': 2, 'final': 3}


def norm(t):
    return re.sub(r'[\s\.\,\(\)“”"\'?]', '', t.lower())


def grams(s):
    return {s[i:i + 3] for i in range(len(s) - 2)}


# ---- duplicates across different kinds (or different files)
for r in R:
    r['_n'] = norm(r['stem']) + '|' + '|'.join(sorted(norm(c) for c in r['choices']))
G = [grams(r['_n']) for r in R]
inv = collections.defaultdict(set)
for i, g in enumerate(G):
    for x in g:
        inv[x].add(i)
drop = {}
for i, g in enumerate(G):
    if len(g) < 8:
        continue
    cand = collections.Counter()
    for x in g:
        if len(inv[x]) < 300:
            for j in inv[x]:
                if j > i:
                    cand[j] += 1
    for j, c in cand.items():
        jac = c / len(g | G[j])
        a, b = R[i], R[j]
        same_src = a['id'].split('-')[0] == b['id'].split('-')[0]
        if jac >= 0.8 and not same_src and norm(a['stem']) and norm(b['stem']):
            keep, lose = (a, b) if (PRIO[a['kind']], a['ans'] is None) <= (PRIO[b['kind']], b['ans'] is None) else (b, a)
            drop[lose['id']] = keep['id']
json.dump(drop, open(os.path.join(HERE, 'dups.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('dups', len(drop))

# ---- order + batches
def order_key(r):
    k = {'book': 0, 'extra': 0, 'monthly': 2, 'final': 3}[r['kind']]
    if k == 0:
        return (0, r['book'], r['chap'], 0 if r['kind'] == 'book' else 1, R.index(r))
    return (k, R.index(r))


items = sorted([r for r in R if r['id'] not in drop], key=order_key)
os.makedirs(os.path.join(HERE, 'batches'), exist_ok=True)


def view(r):
    out = [f"[{r['id']}]" + (f" ans={LET[r['ans']]}" if r['ans'] is not None else ' ans=?') +
           (' IMG' if r.get('img') or r.get('cimg') or r.get('pimg') else '')]
    if r['ctx']:
        out.append('CTX: ' + r['ctx'].replace('\n', ' ⏎ ')[:600])
    out.append('Q: ' + r['stem'].replace('\n', ' ⏎ '))
    out.append(' '.join(f"{LET[i]}) {c}" for i, c in enumerate(r['choices'])))
    if r.get('kexp'):
        out.append('KEY: ' + r['kexp'])
    return '\n'.join(out)


# group: chunk within same chapter group, ~60 per batch
groups = collections.OrderedDict()
for r in items:
    g = f"B{r['book']}-{r['chap']:02d}" if r['kind'] in ('book', 'extra') else r['id'].split('-')[0]
    groups.setdefault(g, []).append(r)
n = 0
index = []
for g, rs in groups.items():
    size = 60
    chunks = [rs[i:i + size] for i in range(0, len(rs), size)]
    if len(chunks) > 1 and len(chunks[-1]) < 20:
        chunks[-2].extend(chunks.pop())
    for c in chunks:
        n += 1
        fn = f"{n:02d}_{g}.txt"
        open(os.path.join(HERE, 'batches', fn), 'w', encoding='utf-8').write('\n\n'.join(view(r) for r in c))
        index.append((fn, len(c)))
for fn, c in index:
    print(fn, c)
print('total', sum(c for _, c in index))
