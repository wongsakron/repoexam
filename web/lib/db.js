import pg from 'pg';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS answers (
  qid          text PRIMARY KEY,
  last_correct boolean     NOT NULL,
  last_choice  smallint,
  attempts     integer     NOT NULL DEFAULT 0,
  corrects     integer     NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS answer_log (
  id          bigserial PRIMARY KEY,
  qid         text        NOT NULL,
  choice      smallint    NOT NULL,
  correct     boolean     NOT NULL,
  mode        text        NOT NULL DEFAULT 'practice',
  answered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS answer_log_answered_at ON answer_log (answered_at);
CREATE TABLE IF NOT EXISTS bookmarks (
  qid        text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mock_results (
  id       bigserial PRIMARY KEY,
  taken_at timestamptz NOT NULL DEFAULT now(),
  title    text        NOT NULL,
  total    integer     NOT NULL,
  correct  integer     NOT NULL,
  used_ms  integer,
  groups   jsonb
);
CREATE TABLE IF NOT EXISTS settings (
  id   smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb    NOT NULL DEFAULT '{}'::jsonb
);
`;

// one pool per process (survives hot reloads in dev)
const g = globalThis;
const pool =
  g.__examPool ||
  (g.__examPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 }));

let ready = null;

/** Returns the pool once the schema exists (created on first use, idempotent). */
export function getDb() {
  if (!ready) {
    ready = pool.query(SCHEMA).then(
      () => pool,
      (err) => {
        ready = null;
        throw err;
      },
    );
  }
  return ready;
}

/** Runs fn(client) inside a transaction. */
export async function tx(fn) {
  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
