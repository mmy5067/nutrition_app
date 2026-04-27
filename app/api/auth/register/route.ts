import { db, withTransaction } from "@/lib/server/db";
import {
  createEmailVerificationToken,
  getEmailVerificationExpiresAt,
  hashEmailVerificationToken,
  sendVerificationEmail
} from "@/lib/server/email-verification";
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

  const verificationToken = createEmailVerificationToken();
  const verificationTokenHash = hashEmailVerificationToken(verificationToken);
  const verificationExpiresAt = getEmailVerificationExpiresAt();
  const attemptedAt = new Date().toISOString();

  const inserted = await withTransaction(async (client) => {
    const result = await client.query(
      `insert into users (
        email,
        password_hash,
        is_active,
        is_admin,
        email_verified,
        email_verification_token_hash,
        email_verification_expires_at,
        email_verification_last_attempt_at
      ) values ($1, $2, true, false, false, $3, $4, $5)
      returning id, email`,
      [email, hashPassword(password), verificationTokenHash, verificationExpiresAt, attemptedAt]
    );

    return result.rows[0];
  });

  const sendResult = await sendVerificationEmail(email, verificationToken);

  if (sendResult.ok) {
    await db.query(
      `update users
       set email_verification_sent_at = $2,
           email_verification_last_error = null
       where id = $1`,
      [Number(inserted.id), new Date().toISOString()]
    );

    return json({
      ok: true,
      user_id: Number(inserted.id),
      email_sent: true,
      message: "注册成功，请查收验证邮件后登录。"
    });
  }

  console.error("failed to send verification email after registration", {
    userId: Number(inserted.id),
    email,
    error: sendResult.error
  });

  await db.query(
    `update users
     set email_verification_last_error = $2
     where id = $1`,
    [Number(inserted.id), sendResult.error || "unknown email send error"]
  );

  return json(
    {
      ok: true,
      user_id: Number(inserted.id),
      email_sent: false,
      message: "注册成功，但验证邮件发送失败，请稍后重新发送验证邮件。"
    },
    202
  );
}
