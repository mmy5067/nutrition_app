import { Pool } from "pg";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __nutritionDbPool: Pool | undefined;
}

export const db =
  global.__nutritionDbPool ??
  new Pool({
    connectionString: env.databaseUrl
  });

if (process.env.NODE_ENV !== "production") {
  global.__nutritionDbPool = db;
}

export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
