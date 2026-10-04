"""Generic multiple-choice question parser over positioned lines."""
import re, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
LETTERS = 'กขคงจ'
Q_RE = re.compile(r'^(?:ข้อ(?:ที่)?\s*)?(\d{1,3})\s*[\.\)]\s*(.*)$')
CH_RE = re.compile(r'^\(?([กขคงจ])\s*[\.\)]\s*(.*)$')
NUM_ONLY = re.compile(r'^(\d{1,3})\s*\.?$')
KEY_INLINE = re.compile(r'^(\d{1,3})\s*[\.\)]?\s*([กขคงจ])(?:\s*[\.\)]\s*(.*)|\s*)$')
KEY_LETTER = re.compile(r'^([กขคงจ])(?:\s*[\.\)]\s*(.*)|\s*)$')
CTX_CUE = re.compile(r'ตอบคำถาม|พิจารณา|ต่อไปนี้|จากภาพ|จากรูป|กำหนด|โค้ด|code|ตาราง|สถานการณ์|โปรแกรม|ใช้ข้อมูล|ข้อความ|ข้อ\s*\d+\s*[-–]\s*\d+|print|=|\{|\}|;|<|>|def |for |while |if ', re.I)
RANGE_RE = re.compile(r'ข้อ(?:ที่)?\s*(\d+)\s*(?:[-–—]|ถึง)\s*(\d+)')
NOTE_RE = re.compile(r'^(เฉลย|ตอบ|อธิบาย|คำอธิบาย|แนวคิด|เหตุผล)')


def looks_like_code(pending):
    return sum(1 for x in pending if re.search(r'[=;{}()<>]', x['t'])) >= max(1, len(pending) // 2)


def _norm(t):
    return re.sub(r'\d+', '#', re.sub(r'\s+', '', t))


def load(key, drop_repeated=True):
    d = json.load(open(os.path.join(HERE, 'lines', key + '.json'), encoding='utf-8'))
    if drop_repeated and len(d['pages']) >= 3:
        from collections import Counter
        cnt = Counter()
        for pg in d['pages']:
            for k in {_norm(L['t']) for L in pg['lines'] if L['b'][1] < 90 or L['b'][1] > pg['h'] - 60}:
                cnt[k] += 1
        rep = {k for k, c in cnt.items() if c >= max(3, 0.4 * len(d['pages']))}
        rep.discard('#')
        for pg in d['pages']:
            pg['lines'] = [L for L in pg['lines'] if not (
                ((L['b'][1] < 90 or L['b'][1] > pg['h'] - 60) and _norm(L['t']) in rep) or
                ((L['b'][1] < 48 or L['b'][1] > pg['h'] - 48) and re.fullmatch(r'\|?#', _norm(L['t']))))]
    flat = []
    for pi, pg in enumerate(d['pages']):
        for L in pg['lines']:
            L = dict(L)
            L['p'] = pi
            L['pw'] = pg['w']
            flat.append(L)
    return d, flat


def split_inline_choices(text, start_letter, max_total=5):
    """'ก. 3 ข. 5 ค. 7 ง. 9' -> ['3','5','7','9'].  A later marker is accepted only if its letter
    comes after the previous marker's letter (so 'ผสมผสานระหว่าง ก. - ค.' is not split) and 'จ'
    only when literally typed."""
    parts = [text]
    last = LETTERS.index(start_letter) if start_letter in LETTERS else 0
    pat = re.compile(r'\s+\(?([กขคงจ])\s*[\.\)](?![ก-ฮ]\.)\s*')
    while len(parts) < max_total:
        cur = parts[-1]
        found = None
        for m in pat.finditer(cur):
            if LETTERS.index(m.group(1)) > last:
                found = m
                break
        if not found:
            break
        parts[-1] = cur[:found.start()].strip()
        parts.append(cur[found.end():].strip())
        last = LETTERS.index(found.group(1))
    return parts


class Q:
    def __init__(self, num, text, L):
        self.num = num
        self.stem = [text] if text else []
        self.choices = {}
        self.choice_red = {}
        self.order = []
        self.start = (L['p'], L['b'][1])
        self.choice_start = None
        self.end = (L['p'], L['b'][3])
        self.extra = []
        self.red_lines = []
        self.ctx = ''
        self.ctx_start = None
        self.ctx_end = None
        self.shared_choices = False
        self.last_x1 = L['b'][2]
        self.pw = L.get('pw', 595)

    def wrapped(self, L):
        """True if L looks like a wrapped continuation of the previous line."""
        return (L['p'] == self.end[0] and 0 <= L['b'][1] - self.end[1] < 14 and self.last_x1 > self.pw * 0.72) or                (L['p'] == self.end[0] + 1 and self.last_x1 > self.pw * 0.72 and L['b'][1] < 120)

    def add_choice(self, letter, text, L):
        if self.shared_choices:  # own choices override shared block
            self.choices, self.choice_red, self.order = {}, {}, []
            self.shared_choices = False
        for tx in split_inline_choices(text, letter, 5 - len(self.order)):
            lt = LETTERS[len(self.order)]
            self.choices[lt] = tx
            self.choice_red[lt] = L['red']
            self.order.append(lt)
        if self.choice_start is None:
            self.choice_start = (L['p'], L['b'][1])
        self.end = (L['p'], L['b'][3])
        self.last_x1 = L['b'][2]

    def expected_letter(self):
        if self.shared_choices:
            return 'ก'
        return LETTERS[len(self.order)] if len(self.order) < 5 else None

    def to_dict(self):
        letters = [l for l in LETTERS if l in self.choices]
        return {'num': self.num, 'stem': '\n'.join(self.stem).strip(),
                'choices': [self.choices[l].strip() for l in letters],
                'choice_red': [self.choice_red.get(l, 0) for l in letters],
                'start': self.start, 'choice_start': self.choice_start, 'end': self.end,
                'extra': '\n'.join(self.extra).strip(), 'red_lines': self.red_lines,
                'ctx': self.ctx, 'ctx_start': self.ctx_start, 'ctx_end': self.ctx_end, 'shared_choices': self.shared_choices}


def build_ctx(pending):
    text_lines, ch, order = [], {}, []
    for x in pending:
        m = CH_RE.match(x['t'].strip())
        if m and len(order) < 5 and (order or m.group(1) == 'ก'):
            for tx in split_inline_choices(m.group(2).strip(), m.group(1), 5 - len(order)):
                lt = LETTERS[len(order)]
                ch[lt] = tx; order.append(lt)
        elif order and len(order) >= 1 and not m and x is not pending[0] and len(x['t']) < 80 and ch:
            # continuation of a shared choice
            ch[order[-1]] += ' ' + x['t']
        else:
            text_lines.append(x['t'])
    if len(order) < 3:
        # not a real shared-choice block; keep everything as text
        return '\n'.join(x['t'] for x in pending), None
    return '\n'.join(text_lines), ch


def parse_lines(lines, allow_key=True, max_num=400):
    """Returns (questions:list[dict], key:dict[num]->{'ans':letter,'exp':str})"""
    qs = []
    cur = None
    key = {}
    mode = 'q'
    last_key = None
    pending = []
    shared = None  # (text, start, until, choices)
    i = 0
    n = len(lines)
    while i < n:
        L = lines[i]
        t = L['t'].strip()
        nxt = lines[i + 1]['t'].strip() if i + 1 < n else ''
        # ---- enter key mode
        if allow_key and mode == 'q':
            if re.match(r'^เฉลย', t) and (cur is None or len(cur.order) >= 2 or cur.shared_choices) and len(qs) >= 2:
                mode = 'k'; i += 1; continue
            if NUM_ONLY.match(t) and int(NUM_ONLY.match(t).group(1)) == 1 and KEY_LETTER.match(nxt) and len(qs) >= 3:
                mode = 'k'
        if mode == 'k':
            m = KEY_INLINE.match(t)
            if m and int(m.group(1)) <= max_num:
                last_key = int(m.group(1))
                key[last_key] = {'ans': m.group(2), 'exp': (m.group(3) or '').strip()}
                i += 1; continue
            m = NUM_ONLY.match(t)
            if m and KEY_LETTER.match(nxt):
                last_key = int(m.group(1))
                m2 = KEY_LETTER.match(nxt)
                key[last_key] = {'ans': m2.group(1), 'exp': (m2.group(2) or '').strip()}
                i += 2; continue
            if t in ('ข้อ', 'ข้อที่', 'เฉลย', 'ข้อ เฉลย', 'คำอธิบาย') or re.match(r'^เฉลย', t):
                i += 1; continue
            if last_key is not None:
                key[last_key]['exp'] = (key[last_key]['exp'] + ' ' + t).strip()
            i += 1; continue
        # ---- question mode
        mq = Q_RE.match(t)
        if mq:
            num = int(mq.group(1))
            ok = False
            if cur is None:
                ok = num <= 3 or not qs
            elif num == cur.num + 1 and (len(cur.order) >= 2 or cur.shared_choices):
                ok = True
            elif num == cur.num + 1 and shared and num <= shared[2]:
                ok = True
            elif num > cur.num and num <= cur.num + 3 and len(cur.order) >= 4:
                ok = True  # skipped numbers (e.g. image-only question)
            if ok:
                rest = mq.group(2).strip()
                mrest = CH_RE.match(rest)
                cur = Q(num, '', L) if (mrest and mrest.group(1) == 'ก') else Q(num, rest, L)
                # pending lines -> shared context for upcoming question(s), or notes for previous one
                if pending and qs and not CTX_CUE.search(' '.join(x['t'] for x in pending)) and not looks_like_code(pending):
                    qs[-1].extra.extend(x['t'] for x in pending)
                    pending = []
                if pending:
                    text, ch = build_ctx(pending)
                    start = (pending[0]['p'], pending[0]['b'][1])
                    m = RANGE_RE.search(' '.join(x['t'] for x in pending))
                    until = int(m.group(2)) if m and int(m.group(1)) <= num <= int(m.group(2)) else num
                    shared = (text, start, until, ch, cur.start)
                    pending = []
                if shared and num <= shared[2]:
                    cur.ctx, cur.ctx_start, cur.ctx_end = shared[0], shared[1], shared[4]
                    if shared[3]:
                        cur.choices = dict(shared[3]); cur.order = list(shared[3].keys())
                        cur.choice_red = {k: 0 for k in cur.order}
                        cur.shared_choices = True
                else:
                    shared = None
                if mrest and mrest.group(1) == 'ก':
                    cur.add_choice('ก', mrest.group(2).strip(), L)
                qs.append(cur)
                i += 1; continue
        mc = CH_RE.match(t)
        if cur is not None and mc and not pending and (
                (cur.shared_choices and mc.group(1) == 'ก') or
                (not cur.shared_choices and len(cur.order) < 4 and (cur.order or mc.group(1) in 'กข')) or
                (not cur.shared_choices and len(cur.order) == 4 and mc.group(1) == 'จ')):
            if not (mc.group(1) == 'จ' and len(cur.order) == 4 and lines[i]['p'] == cur.end[0] and lines[i]['b'][1] - cur.end[1] > 40):
                cur.add_choice(mc.group(1), mc.group(2).strip(), L)
                i += 1; continue
        if cur is None and mode == 'q' and (pending or re.search(r'ตอบคำถาม|ต่อไปนี้|พิจารณา|ใช้ข้อมูล|ใช้โค้ด', t)):
            pending.append(L)
            i += 1; continue
        if cur is not None and (pending or (RANGE_RE.search(t) and re.search(r'ตอบ|ใช้', t))):
            pending.append(L)
            i += 1; continue
        if cur is not None:
            if cur.order and not cur.shared_choices:
                ll = cur.order[-1]
                close = cur.wrapped(L)
                if NOTE_RE.match(t) or (L['red'] > 0.5 and not pending and cur.choice_red.get(ll, 0) < 0.5 and len(cur.order) >= 4 and not close):
                    cur.extra.append(t)
                    if L['red'] > 0.5:
                        cur.red_lines.append(t)
                elif (len(cur.order) < 4 and not pending and not CH_RE.match(t)) or (close and not pending and len(t) < 200):
                    cur.choices[ll] = (cur.choices[ll] + ' ' + t).strip()
                    cur.choice_red[ll] = max(cur.choice_red.get(ll, 0), L['red'])
                    cur.end = (L['p'], L['b'][3]); cur.last_x1 = L['b'][2]
                else:
                    pending.append(L)
            elif cur.shared_choices:
                # question text continuation (stem) for shared-choice questions
                if not pending and cur.wrapped(L):
                    cur.stem.append(t); cur.end = (L['p'], L['b'][3]); cur.last_x1 = L['b'][2]
                else:
                    pending.append(L)
            else:
                cur.stem.append(t)
                cur.end = (L['p'], L['b'][3]); cur.last_x1 = L['b'][2]
        i += 1
    # questions with no choices right after a shared-choice question inherit that block
    for a, b in zip(qs, qs[1:]):
        if not b.order and a.shared_choices:
            b.choices, b.order, b.choice_red = dict(a.choices), list(a.order), dict(a.choice_red)
            b.shared_choices = True
            b.ctx, b.ctx_start, b.ctx_end = a.ctx, a.ctx_start, a.ctx_end
    return [q.to_dict() for q in qs], key
