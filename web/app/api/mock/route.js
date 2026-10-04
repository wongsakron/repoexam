import { getDb } from '../../../lib/db';
import { BadRequest, body, handle, int, ok, text } from '../../../lib/http';

export const dynamic = 'force-dynamic';

// body: { title, n, ok, used, groups } — one finished mock exam
export const POST = handle(async (req) => {
  const b = await body(req);
  const total = int(b.n, 1, 1000, 'n');
  const correct = int(b.ok, 0, total, 'ok');
  const used = b.used == null ? null : int(Math.round(b.used), 0, 86_400_000, 'used');
  const groups = b.groups == null ? null : b.groups;
  if (groups !== null && (!Array.isArray(groups) || JSON.stringify(groups).length > 10_000)) {
    throw new BadRequest('invalid groups');
  }
  const db = await getDb();
  await db.query(
    'INSERT INTO mock_results (title, total, correct, used_ms, groups) VALUES ($1, $2, $3, $4, $5)',
    [text(b.title, 200, 'title'), total, correct, used, groups === null ? null : JSON.stringify(groups)],
  );
  return ok();
});
