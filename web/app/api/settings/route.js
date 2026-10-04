import { getDb } from '../../../lib/db';
import { BadRequest, body, handle, ok } from '../../../lib/http';

export const dynamic = 'force-dynamic';

// body: { o } — UI preferences (theme, font size, quiz options)
export const POST = handle(async (req) => {
  const { o } = await body(req);
  if (!o || typeof o !== 'object' || Array.isArray(o) || JSON.stringify(o).length > 4000) {
    throw new BadRequest('invalid settings');
  }
  const db = await getDb();
  await db.query(
    `INSERT INTO settings (id, data) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify(o)],
  );
  return ok();
});
