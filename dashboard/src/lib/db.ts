import pg from "pg";

import { getEnv } from "@/lib/env";

let pool: pg.Pool | undefined;

export function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: getEnv().databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
  }

  return pool;
}

export async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}
