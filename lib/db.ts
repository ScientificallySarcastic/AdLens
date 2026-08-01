import { neon } from "@neondatabase/serverless";

// Lazy init — the app must build & run even before DATABASE_URL is set.
let _sql: ReturnType<typeof neon> | null = null;

/** Test seam: point the data layer at a plain Postgres client so migrations and
 *  stores can be exercised against a real database. Never called by app code. */
let _override: ReturnType<typeof neon> | null = null;
export function __setSqlForTests(fn: ReturnType<typeof neon> | null) {
  _override = fn;
}

export function getSql() {
  if (_override) return _override;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}
