import { getDb } from '../../../lib/db';
import { body, handle, ok, qid } from '../../../lib/http';

export const dynamic = 'force-dynamic';

// body: { qid, on }
export const POST = handle(async (req) => {
  const b = await body(req);
  const id = qid(b.qid);
  const db = await getDb();
  if (b.on === true) {
    await db.query('INSERT INTO bookmarks (qid) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
  } else {
    await db.query('DELETE FROM bookmarks WHERE qid = $1', [id]);
  }
  return ok();
});
