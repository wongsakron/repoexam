import sys
from parse_books import segments
b, ch, st = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
a, z = int(sys.argv[4]), int(sys.argv[5])
d, segs = segments(b)
s = [s for s in segs if s['chap'] == ch and s['set'] == st][0]
for k, L in enumerate(s['lines'][a:z], a):
    print(k, L['p'] + 1, int(L['b'][0]), int(L['b'][1]), L['t'][:110])
