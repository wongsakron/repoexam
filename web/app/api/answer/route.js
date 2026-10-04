import { tx } from '../../../lib/db';
import { BadRequest, body, handle, int, ok, qid, text } from '../../../lib/http';

export const dynamic = 'force-dynamic';

// body: { items: [{ qid, choice, correct, mode }] } — one item per answered question
export const POST = handle(async (req) => {
  const { items } = await body(req);
  if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
    throw new BadRequest('items must be a non-empty array (max 500)');
  }
  const rows = items.map((it) => ({
    qid: qid(it?.qid),
    choice: int(it?.choice, 0, 9, 'choice'),
    correct: it?.correct === true,
    mode: it?.mode == null ? 'practice' : text(it.mode, 20, 'mode'),
  }));
  await tx(async (c) => {
    for (const r of rows) {
      await c.query(
        `INSERT INTO answers (qid, last_correct, last_choice, attempts, corrects, updated_at)
         VALUES ($1, $2, $3, 1, $4, now())
         ON CONFLICT (qid) DO UPDATE SET
           last_correct = EXCLUDED.last_correct,
           last_choice  = EXCLUDED.last_choice,
           attempts     = answers.attempts + 1,
           corrects     = answers.corrects + EXCLUDED.corrects,
           updated_at   = now()`,
        [r.qid, r.correct, r.choice, r.correct ? 1 : 0],
      );
      await c.query('INSERT INTO answer_log (qid, choice, correct, mode) VALUES ($1, $2, $3, $4)', [
        r.qid,
        r.choice,
        r.correct,
        r.mode,
      ]);
    }
  });
  return ok({ ok: true, saved: rows.length });
});
