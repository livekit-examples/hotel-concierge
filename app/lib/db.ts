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

export async function query<T>(text: string, params?: Array<unknown>) {
  return pool.query<T>(text, params);
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
