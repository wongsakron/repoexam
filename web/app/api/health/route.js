import { getDb } from '../../../lib/db';
import { handle, ok } from '../../../lib/http';

export const dynamic = 'force-dynamic';

// Used by the Docker healthcheck and the deploy workflow.
export const GET = handle(async () => {
  const db = await getDb();
  const { rows } = await db.query('SELECT count(*)::int AS answered FROM answers');
  return ok({ ok: true, answered: rows[0].answered });
});
