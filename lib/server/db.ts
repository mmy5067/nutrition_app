import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync, SQLInputValue } from "node:sqlite";
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
  // eslint-disable-next-line no-var
  var __nutritionPostgresInitialized: boolean | undefined;
}

const sqliteSchema = `
  pragma foreign_keys = on;

  create table if not exists users (
    id integer primary key autoincrement,
    email text not null unique,
    password_hash text not null,
    is_active integer not null default 1,
    is_admin integer not null default 0,
    email_verified integer not null default 0,
    email_verified_at text,
    email_verification_token_hash text,
    email_verification_expires_at text,
    email_verification_sent_at text,
    email_verification_last_attempt_at text,
    email_verification_last_error text,
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

const sqliteMigrationStatements = [
  "alter table users add column email_verified integer not null default 0",
  "alter table users add column email_verified_at text",
  "alter table users add column email_verification_token_hash text",
  "alter table users add column email_verification_expires_at text",
  "alter table users add column email_verification_sent_at text",
  "alter table users add column email_verification_last_attempt_at text",
  "alter table users add column email_verification_last_error text",
  "create index if not exists ix_users_email_verification_token_hash on users(email_verification_token_hash)"
];

const postgresSchemaStatements = [
  `
  create table if not exists users (
    id bigserial primary key,
    email text not null unique,
    password_hash text not null,
    is_active boolean not null default true,
    is_admin boolean not null default false,
    email_verified boolean not null default false,
    email_verified_at timestamptz,
    email_verification_token_hash text,
    email_verification_expires_at timestamptz,
    email_verification_sent_at timestamptz,
    email_verification_last_attempt_at timestamptz,
    email_verification_last_error text,
    created_at timestamptz not null default now()
  )
  `,
  "alter table users add column if not exists email_verified boolean not null default false",
  "alter table users add column if not exists email_verified_at timestamptz",
  "alter table users add column if not exists email_verification_token_hash text",
  "alter table users add column if not exists email_verification_expires_at timestamptz",
  "alter table users add column if not exists email_verification_sent_at timestamptz",
  "alter table users add column if not exists email_verification_last_attempt_at timestamptz",
  "alter table users add column if not exists email_verification_last_error text",
  "create index if not exists ix_users_email_verification_token_hash on users(email_verification_token_hash)",
  `
  create table if not exists meals (
    id bigserial primary key,
    user_id bigint not null references users(id) on delete cascade,
    eaten_at timestamptz not null,
    meal_type text,
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )
  `,
  "create index if not exists ix_meals_user_id on meals(user_id)",
  "create index if not exists ix_meals_eaten_at on meals(eaten_at)",
  `
  create table if not exists meal_items (
    id bigserial primary key,
    meal_id bigint not null references meals(id) on delete cascade,
    name text not null,
    quantity double precision,
    unit text,
    calories double precision,
    protein double precision,
    fat double precision,
    carbs double precision,
    extra jsonb
  )
  `,
  "create index if not exists ix_meal_items_meal_id on meal_items(meal_id)",
  `
  create table if not exists user_profiles (
    id bigserial primary key,
    user_id bigint not null unique references users(id) on delete cascade,
    height_cm double precision,
    weight_kg double precision,
    body_fat_pct double precision,
    birthday text,
    sex text,
    extra jsonb,
    updated_at timestamptz not null default now()
  )
  `,
  `
  create table if not exists day_summaries (
    id bigserial primary key,
    user_id bigint not null references users(id) on delete cascade,
    date text not null,
    summary text not null,
    totals jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, date)
  )
  `,
  "create index if not exists ix_day_summaries_user_id on day_summaries(user_id)"
];

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

function mapSqliteParams(sql: string, params: unknown[]) {
  const ordered: unknown[] = [];
  sql.replace(/\$(\d+)/g, (_, index) => {
    ordered.push(params[Number(index) - 1]);
    return "?";
  });
  return ordered;
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
  for (const statement of sqliteMigrationStatements) {
    try {
      state.db.exec(statement);
    } catch {}
  }

  const adminEmail = env.adminEmail;
  const adminExists = state.db
    .prepare("select id from users where email = ? limit 1")
    .get(adminEmail) as { id?: number } | undefined;

  if (!adminExists?.id) {
    state.db
      .prepare(
        "insert into users (email, password_hash, is_active, is_admin, email_verified, email_verified_at) values (?, ?, 1, 1, 1, CURRENT_TIMESTAMP)"
      )
      .run(adminEmail, hashPassword(env.adminPassword));
  } else {
    state.db
      .prepare(
        "update users set is_admin = 1, is_active = 1, email_verified = 1, email_verified_at = coalesce(email_verified_at, CURRENT_TIMESTAMP) where email = ?"
      )
      .run(adminEmail);
  }

  state.initialized = true;
}

async function initializePostgres(pool: Pool) {
  if (global.__nutritionPostgresInitialized) {
    return;
  }

  for (const statement of postgresSchemaStatements) {
    await pool.query(statement);
  }

  await pool.query(
    `
    insert into users (email, password_hash, is_active, is_admin, email_verified, email_verified_at)
    values ($1, $2, true, true, true, now())
    on conflict (email)
    do update set
      is_active = true,
      is_admin = true,
      email_verified = true,
      email_verified_at = coalesce(users.email_verified_at, now())
    `,
    [env.adminEmail, hashPassword(env.adminPassword)]
  );

  global.__nutritionPostgresInitialized = true;
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
    const orderedParams = mapSqliteParams(sql, params);
    const statement = this.sqlite.prepare(normalized);

    if (isSelectStatement(normalized)) {
      const rows = statement
        .all(...orderedParams as SQLInputValue[])
        .map((row) => mapSqliteRow(row as Record<string, unknown>)) as T[];
      return {
        rows,
        rowCount: rows.length
      };
    }

    if (/\breturning\b/i.test(normalized)) {
      const rows = statement
        .all(...orderedParams as SQLInputValue[])
        .map((row) => mapSqliteRow(row as Record<string, unknown>)) as T[];
      return {
        rows,
        rowCount: rows.length
      };
    }

    const result = statement.run(...orderedParams as SQLInputValue[]);
    return {
      rows: [],
      rowCount: Number(result.changes ?? 0)
    };
  }
}

class PostgresClient implements Queryable {
  constructor(private readonly pool: Pool) {}

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    await initializePostgres(this.pool);
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
    await initializePostgres(pool);
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
