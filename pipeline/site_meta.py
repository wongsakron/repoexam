"""Shared site metadata used by both the offline single-file build and the web export."""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))

# chapters that map to the กรมที่ดิน syllabus
STAR = ['1-1', '1-4', '1-5', '1-7', '1-8', '1-9', '1-11',
        '2-1', '2-2', '2-3', '2-5', '2-7', '2-9', '2-10', '2-11']

# mock exam areas; weights must sum to 100 and every chapter must appear exactly once
GROUPS = [
    {'name': 'วิเคราะห์และออกแบบระบบ / ฐานข้อมูล', 'chs': ['2-5', '2-3'], 'w': 20},
    {'name': 'การเขียนโปรแกรม / โครงสร้างข้อมูล', 'chs': ['2-1', '2-2', '2-4'], 'w': 20},
    {'name': 'ความปลอดภัยข้อมูลและเครือข่าย', 'chs': ['1-4', '1-7', '1-8', '1-11', '2-11'], 'w': 20},
    {'name': 'กฎหมายคอมพิวเตอร์ / ความมั่นคงไซเบอร์', 'chs': ['2-9'], 'w': 15},
    {'name': 'เทคโนโลยีใหม่และความรู้ทั่วไป', 'chs': ['1-1', '1-5', '1-9', '2-6', '2-7', '2-10'], 'w': 20},
    {'name': 'อื่นๆ (ไฟล์ กราฟิก เลขฐาน สื่อการสอน วิทยาการคำนวณ)', 'chs': ['1-2', '1-3', '1-6', '1-10', '2-8'], 'w': 5},
]


def load_chapters():
    """Return (summaries dict, chapter list) from sum/B{b}-{c}.md."""
    summ, chapters = {}, []
    for b, nc in ((1, 11), (2, 11)):
        for c in range(1, nc + 1):
            t = open(os.path.join(HERE, 'sum', f'B{b}-{c}.md'), encoding='utf-8').read()
            lines = t.split('\n')
            title = re.sub(r'^#\s*บทที่\s*\d+\s*', '', lines[0]).strip()
            note = lines[1][1:].strip() if lines[1].startswith('>') else ''
            summ[f'{b}-{c}'] = t
            chapters.append({'k': f'{b}-{c}', 'b': b, 'c': c, 'title': title, 'note': note})
    keys = {c['k'] for c in chapters}
    assert sorted(k for g in GROUPS for k in g['chs']) == sorted(keys), 'groups must cover every chapter once'
    assert sum(g['w'] for g in GROUPS) == 100
    return summ, chapters


def slim_questions(Q, keys):
    """Drop fields the pages do not use and sanity-check chapter keys."""
    for q in Q:
        if not q.get('ctx'):
            q.pop('ctx', None)
        if q.get('page') is None or q['kind'] not in ('book', 'extra'):
            q.pop('page', None)
        assert f"{q['b']}-{q['c']}" in keys, q['id']
    return Q
