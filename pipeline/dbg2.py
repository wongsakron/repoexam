import sys
from parse_books import segments
from qparse import parse_lines
b, ch, st = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
d, segs = segments(b)
s = [s for s in segs if s['chap'] == ch and s['set'] == st][0]
qs, key = parse_lines(s['lines'])
for q in qs[-2:]:
    print('Q', q['num'], 'stem=', repr(q['stem'][:300]), '\n  choices=', [c[:150] for c in q['choices']], '\n  ctx=', repr(q['ctx'][:200]), q['shared_choices'], '\n  extra=', repr(q['extra'][:200]))
# print raw lines near last question
last = qs[-1]
for k, L in enumerate(s['lines']):
    if (L['p'], L['b'][1]) >= tuple(last['start']):
        for L2 in s['lines'][k:k + int(sys.argv[4]) if len(sys.argv) > 4 else k + 25]:
            print('   ', L2['p'] + 1, int(L2['b'][0]), int(L2['b'][1]), int(L2['b'][2]), L2['t'][:100])
        break
