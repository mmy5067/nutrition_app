import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { env } from "./env";
import { hashPassword } from "./passwords";

type QueryResult<T> = {
  rows: T[];
  rowCount: number;
};

type Queryable = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
};

type SqliteState = {
  db: DatabaseSync;
  initialized: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __nutritionDbPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __nutritionSqliteState: SqliteState | undefined;
}

const sqliteSchema = `
  pragma foreign_keys = on;

  create table if not exists users (
    id integer primary key autoincrement,
    email text not null unique,
    password_hash text not null,
    is_active integer not null default 1,
    is_admin integer not null default 0,
    created_at text not null default current_timestamp
  );

  create table if not exists meals (
    id integer primary key autoincrement,
    user_id integer not null references users(id) on delete cascade,
    eaten_at text not null,
    meal_type text,
    note text,
    created_at text not null default current_timestamp,
    updated_at text not null default current_timestamp
  );

  create index if not exists ix_meals_user_id on meals(user_id);
  create index if not exists ix_meals_eaten_at on meals(eaten_at);

  create table if not exists meal_items (
    id integer primary key autoincrement,
    meal_id integer not null references meals(id) on delete cascade,
    name text not null,
    quantity real,
    unit text,
    calories real,
    protein real,
    fat real,
    carbs real,
    extra text
  );

  create index if not exists ix_meal_items_meal_id on meal_items(meal_id);

  create table if not exists user_profiles (
    id integer primary key autoincrement,
    user_id integer not null unique references users(id) on delete cascade,
    height_cm real,
    weight_kg real,
    body_fat_pct real,
    birthday text,
    sex text,
    extra text,
    updated_at text not null default current_timestamp
  );

  create table if not exists day_summaries (
    id integer primary key autoincrement,
    user_id integer not null references users(id) on delete cascade,
    date text not null,
    summary text not null,
    totals text,
    created_at text not null default current_timestamp,
    updated_at text not null default current_timestamp,
    unique (user_id, date)
  );

  create index if not exists ix_day_summaries_user_id on day_summaries(user_id);
`;

function isPostgresUrl(url: string) {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function isSelectStatement(sql: string) {
  return /^\s*(select|with)\b/i.test(sql);
}

function toSqliteFilename(url: string) {
  const relativePath = url.replace(/^sqlite:(\/\/)?/, "");
  return path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), relativePath);
}

function normalizeSqlForSqlite(sql: string) {
  return sql
    .replace(/\$\d+/g, "?")
    .replace(/::jsonb/g, "")
    .replace(/::json/g, "")
    .replace(/\bnow\(\)/gi, "CURRENT_TIMESTAMP");
}

function getSqliteState() {
  if (!global.__nutritionSqliteState) {
    const filename = toSqliteFilename(env.databaseUrl);
    mkdirSync(path.dirname(filename), { recursive: true });
    const sqlite = new DatabaseSync(filename);
    sqlite.exec("pragma foreign_keys = on;");
    global.__nutritionSqliteState = {
      db: sqlite,
      initialized: false
    };
  }

  return global.__nutritionSqliteState;
}

function initializeSqlite(state: SqliteState) {
  if (state.initialized) {
    return;
  }

  state.db.exec(sqliteSchema);
  const adminEmail = env.adminEmail;
  const adminExists = state.db
    .prepare("select id from users where email = ? limit 1")
    .get(adminEmail) as { id?: number } | undefined;

  if (!adminExists?.id) {
    state.db
      .prepare(
        "insert into users (email, password_hash, is_active, is_admin) values (?, ?, 1, 1)"
      )
      .run(adminEmail, hashPassword(env.adminPassword));
  } else {
    state.db
      .prepare("update users set is_admin = 1, is_active = 1 where email = ?")
      .run(adminEmail);
  }

  state.initialized = true;
}

function mapSqliteRow(row: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "totals" || key === "extra" || key === "items") {
      if (typeof value === "string" && value.trim()) {
        try {
          mapped[key] = JSON.parse(value);
          continue;
        } catch {}
      }
    }

    mapped[key] = value;
  }

  return mapped;
}

class SqliteClient implements Queryable {
  constructor(private readonly sqlite: DatabaseSync) {}

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const normalized = normalizeSqlForSqlite(sql);
    const statement = this.sqlite.prepare(normalized);

    if (isSelectStatement(normalized)) {
      const rows = statement.all(...params).map((row) => mapSqliteRow(row as Record<string, unknown>)) as T[];
      return {
        rows,
        rowCount: rows.length
      };
    }

    if (/\breturning\b/i.test(normalized)) {
      const rows = statement.all(...params).map((row) => mapSqliteRow(row as Record<string, unknown>)) as T[];
      return {
        rows,
        rowCount: rows.length
      };
    }

    const result = statement.run(...params);
    return {
      rows: [],
      rowCount: Number(result.changes ?? 0)
    };
  }
}

class PostgresClient implements Queryable {
  constructor(private readonly pool: Pool) {}

  query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.pool.query<T>(sql, params);
  }
}

function createDb() {
  if (isPostgresUrl(env.databaseUrl)) {
    const pool =
      global.__nutritionDbPool ??
      new Pool({
        connectionString: env.databaseUrl
      });

    if (process.env.NODE_ENV !== "production") {
      global.__nutritionDbPool = pool;
    }

    return {
      kind: "postgres" as const,
      client: new PostgresClient(pool)
    };
  }

  const state = getSqliteState();
  initializeSqlite(state);
  return {
    kind: "sqlite" as const,
    client: new SqliteClient(state.db)
  };
}

const driver = createDb();

export const db = driver.client;
export const dbKind = driver.kind;

export async function withTransaction<T>(fn: (client: Queryable) => Promise<T>) {
  if (dbKind === "postgres") {
    const pool = global.__nutritionDbPool!;
    const client = await pool.connect();
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

  const state = getSqliteState();
  initializeSqlite(state);
  const client = new SqliteClient(state.db);
  await client.query("BEGIN");
  try {
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
