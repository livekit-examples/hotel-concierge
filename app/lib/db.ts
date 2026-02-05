import { Pool, PoolClient } from "pg";

type GlobalWithPool = typeof globalThis & { pgPool?: Pool };

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.");
}

const globalForPool = globalThis as GlobalWithPool;

const sanitizedUrl = (() => {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("channel_binding");
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    return url.toString();
  } catch {
    return connectionString;
  }
})();

export const pool =
  globalForPool.pgPool ??
  new Pool({
    connectionString: sanitizedUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool;
}

type QueryResultRows<T> = {
  rows: T[];
  rowCount: number | null;
};

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: Array<unknown>
): Promise<QueryResultRows<T>> {
  return pool.query(text, params) as Promise<QueryResultRows<T>>;
}

export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
