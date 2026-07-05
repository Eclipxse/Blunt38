import pg from "pg";
import { env } from "../env.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function postgresEnabled() {
  if (env.storageDriver !== "postgres") return false;
  if (!env.databaseUrl) {
    throw new Error("STORAGE_DRIVER=postgres requires DATABASE_URL in .env.");
  }
  return true;
}

export function getPool() {
  if (!postgresEnabled()) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseUrl?.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true
    });

    pool.on("error", (error) => {
      console.error("Postgres pool background error:", error);
    });
  }

  return pool;
}

export async function query<T extends pg.QueryResultRow>(text: string, values: unknown[] = []) {
  const activePool = getPool();
  if (!activePool) throw new Error("Postgres is not enabled.");
  return activePool.query<T>(text, values);
}
