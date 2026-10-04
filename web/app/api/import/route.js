import { tx } from '../../../lib/db';
import { BadRequest, body, handle, ok, qid, text } from '../../../lib/http';

export const dynamic = 'force-dynamic';

// body: the exported progress file { p, bm, hist, o } — replaces progress, bookmarks and mock history
export const POST = handle(async (req) => {
  const b = await body(req, 5_000_000);
  if (!b.p || typeof b.p !== 'object') throw new BadRequest('missing p');

  const ids = [], last = [], att = [], cor = [];
  for (const [k, v] of Object.entries(b.p)) {
    if (!Array.isArray(v) || v.length < 3) throw new BadRequest('invalid progress entry');
    const a = Math.max(0, Math.trunc(Number(v[1]) || 0));
    ids.push(qid(k));
    last.push(Number(v[0]) === 1);
    att.push(a);
    cor.push(Math.min(a, Math.max(0, Math.trunc(Number(v[2]) || 0))));
  }
  const bm = Object.keys(b.bm && typeof b.bm === 'object' ? b.bm : {}).map(qid);
  const hist = Array.isArray(b.hist) ? b.hist.slice(0, 200) : [];

  await tx(async (c) => {
    await c.query('TRUNCATE answers, bookmarks, mock_results');
    if (ids.length) {
      await c.query(
        `INSERT INTO answers (qid, last_correct, attempts, corrects)
         SELECT * FROM unnest($1::text[], $2::boolean[], $3::int[], $4::int[])`,
        [ids, last, att, cor],
      );
    }
    if (bm.length) {
      await c.query('INSERT INTO bookmarks (qid) SELECT unnest($1::text[])', [bm]);
    }
    for (const h of hist) {
      const n = Math.trunc(Number(h?.n));
      const k = Math.trunc(Number(h?.ok));
      if (!(n > 0 && k >= 0 && k <= n)) continue;
      const t = Number(h.t);
      await c.query('INSERT INTO mock_results (taken_at, title, total, correct) VALUES ($1, $2, $3, $4)', [
        Number.isFinite(t) ? new Date(t) : new Date(),
        text(String(h.title ?? ''), 200, 'title'),
        n,
        k,
      ]);
    }
    if (b.o && typeof b.o === 'object' && !Array.isArray(b.o) && JSON.stringify(b.o).length <= 4000) {
      await c.query(
        `INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [JSON.stringify(b.o)],
      );
    }
  });
  return ok({ ok: true, answers: ids.length, bookmarks: bm.length });
});
