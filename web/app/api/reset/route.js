import { tx } from '../../../lib/db';
import { handle, ok } from '../../../lib/http';

export const dynamic = 'force-dynamic';

// Clears progress, bookmarks, mock history and the answer log (settings are kept).
export const POST = handle(async () => {
  await tx((c) => c.query('TRUNCATE answers, answer_log, bookmarks, mock_results'));
  return ok();
});
