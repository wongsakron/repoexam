// Small helpers shared by the API route handlers.

export class BadRequest extends Error {}

const NO_STORE = { 'Cache-Control': 'no-store' };

export function ok(data = { ok: true }) {
  return Response.json(data, { headers: NO_STORE });
}

/** Wraps a handler: 400 for invalid input, 500 (logged) for anything else. */
export function handle(fn) {
  return async (req) => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof BadRequest) {
        return Response.json({ error: err.message }, { status: 400, headers: NO_STORE });
      }
      console.error(err);
      return Response.json({ error: 'server error' }, { status: 500, headers: NO_STORE });
    }
  };
}

export async function body(req, maxBytes = 2_000_000) {
  const text = await req.text();
  if (text.length > maxBytes) throw new BadRequest('payload too large');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new BadRequest('invalid JSON');
  }
}

const QID = /^[A-Za-z0-9_-]{1,40}$/;

export function qid(v) {
  if (typeof v !== 'string' || !QID.test(v)) throw new BadRequest('invalid qid');
  return v;
}

export function int(v, min, max, name) {
  if (!Number.isInteger(v) || v < min || v > max) throw new BadRequest(`invalid ${name}`);
  return v;
}

export function text(v, maxLen, name) {
  if (typeof v !== 'string' || v.length > maxLen) throw new BadRequest(`invalid ${name}`);
  return v;
}
