import { neon } from "@neondatabase/serverless";

// Lazy init — the app must build & run even before DATABASE_URL is set.
let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}
