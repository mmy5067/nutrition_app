import { db } from "@/lib/server/db";
import { createSession } from "@/lib/server/auth";
import { verifyPassword } from "@/lib/server/passwords";
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

  const result = await db.query(
    "select id, email, password_hash, is_active, email_verified from users where email = $1 limit 1",
    [email]
  );

  const user = result.rows[0];
  if (!user || !verifyPassword(password, String(user.password_hash))) {
    return badRequest("invalid credentials", 401);
  }

  if (!user.is_active) {
    return badRequest("user inactive", 403);
  }

  if (!user.email_verified) {
    return json(
      {
        ok: false,
        error: "email not verified",
        error_code: "email_not_verified"
      },
      403
    );
  }

  await createSession({
    userId: Number(user.id),
    email: String(user.email)
  });

  return json({ ok: true, user_id: Number(user.id) });
}
