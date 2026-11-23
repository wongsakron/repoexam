"""Build the offline single-file HTML (everything embedded, opens via file://)."""
import json, os, base64, sys

from site_meta import HERE, STAR, GROUPS, MOF_GROUPS, load_chapters, slim_questions

OUT_DIR = os.path.join(HERE, '..', 'dist')
OUT = os.path.join(OUT_DIR, 'ติวนักวิชาการคอม กรมที่ดิน.html')


def main():
    Q = json.load(open(os.path.join(HERE, 'questions.json'), encoding='utf-8'))
    used = json.load(open(os.path.join(HERE, 'used_imgs.json')))
    img = {}
    for n in used:
        with open(os.path.join(HERE, 'imgs', n + '.webp'), 'rb') as f:
            img[n] = 'data:image/webp;base64,' + base64.b64encode(f.read()).decode()

    summ, chapters = load_chapters()
    Q = slim_questions(Q, {c['k'] for c in chapters})
    for q in Q:
        for n in q.get('im', []):
            assert n in img, (q['id'], n)

    meta = {'chapters': chapters, 'star': STAR, 'groups': GROUPS, 'mof_groups': MOF_GROUPS}

    def blk(i, obj):
        s = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        return f'<script type="application/json" id="{i}">{s}</script>'

    tpl = open(os.path.join(HERE, 'site_template.html'), encoding='utf-8').read()
    data = '\n'.join([blk('d-meta', meta), blk('d-sum', summ), blk('d-q', Q), blk('d-img', img)])
    html = tpl.replace('<!--DATA-->', data, 1)
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('wrote', os.path.normpath(OUT), round(len(html.encode('utf-8')) / 1e6, 2), 'MB',
          'questions', len(Q), 'images', len(img))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
