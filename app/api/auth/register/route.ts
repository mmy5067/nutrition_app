import { db, withTransaction } from "@/lib/server/db";
import { createSession } from "@/lib/server/auth";
import { hashPassword } from "@/lib/server/passwords";
import { badRequest, json } from "@/lib/server/http";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return badRequest("email/password required");
  }

  const existing = await db.query("select id from users where email = $1 limit 1", [email]);
  if (existing.rowCount) {
    return badRequest("email already registered", 409);
  }

  const inserted = await withTransaction(async (client) => {
    const result = await client.query(
      "insert into users (email, password_hash, is_active, is_admin) values ($1, $2, true, false) returning id, email",
      [email, hashPassword(password)]
    );

    return result.rows[0];
  });

  await createSession({
    userId: Number(inserted.id),
    email: String(inserted.email)
  });

  return json({ ok: true, user_id: Number(inserted.id) });
}
