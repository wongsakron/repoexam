import { getDb } from '../../../lib/db';
import { handle, ok } from '../../../lib/http';

export const dynamic = 'force-dynamic';

// Everything the client needs to restore progress, in the same shape it keeps in memory.
export const GET = handle(async () => {
  const db = await getDb();
  const [answers, bookmarks, mocks, settings] = await Promise.all([
    db.query('SELECT qid, last_correct, attempts, corrects FROM answers'),
    db.query('SELECT qid FROM bookmarks'),
    db.query('SELECT taken_at, title, total, correct FROM mock_results ORDER BY taken_at DESC LIMIT 30'),
    db.query('SELECT data FROM settings WHERE id = 1'),
  ]);
  const p = {};
  for (const r of answers.rows) p[r.qid] = [r.last_correct ? 1 : 0, r.attempts, r.corrects];
  const bm = {};
  for (const r of bookmarks.rows) bm[r.qid] = 1;
  const hist = mocks.rows.map((r) => ({
    t: new Date(r.taken_at).getTime(),
    title: r.title,
    n: r.total,
    ok: r.correct,
  }));
  return ok({ p, bm, hist, o: settings.rows[0]?.data ?? {} });
});
