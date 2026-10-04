import json, os
from qparse import HERE

def q_regions(q, pages):
    """list of (page, y0, y1) covering ctx/stem..end of the question"""
    sp, sy = q['ctx_start'] if q.get('ctx_start') and not q.get('shared_choices') else q['start']
    if q.get('ctx_start') and q['ctx_start'][0] <= q['start'][0]:
        sp, sy = q['ctx_start']
    ep, ey = q['end']
    out = []
    for p in range(sp, ep + 1):
        h = pages[p]['h']
        y0 = sy - 3 if p == sp else 50
        y1 = ey + 3 if p == ep else h - 40
        out.append((p, y0, y1))
    return out

def visuals(q, pages):
    imgs = draws = 0
    for (p, y0, y1) in q_regions(q, pages):
        for b in pages[p]['imgs']:
            cy = (b[1] + b[3]) / 2
            if y0 <= cy <= y1 or (b[1] < y1 and b[3] > y0 and (min(b[3], y1) - max(b[1], y0)) > 15):
                imgs += 1
        for b in pages[p]['draw']:
            if b[1] >= y0 - 2 and b[3] <= y1 + 2 and (b[2] - b[0] > 3 or b[3] - b[1] > 3):
                draws += 1
    return imgs, draws
