import { db, withTransaction } from "@/lib/server/db";
import {
  canResendVerification,
  createEmailVerificationToken,
  getEmailVerificationExpiresAt,
  getResendRetryAfterSeconds,
  hashEmailVerificationToken,
  sendVerificationEmail
} from "@/lib/server/email-verification";
import { badRequest, json } from "@/lib/server/http";

type UserRow = {
  id: number | string;
  email: string;
  email_verified: boolean | number;
  email_verification_last_attempt_at?: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
  };

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return badRequest("email required");
  }

  const result = await db.query<UserRow>(
    `select id, email, email_verified, email_verification_last_attempt_at
     from users
     where email = $1
     limit 1`,
    [email]
  );

  const user = result.rows[0];
  if (!user || Boolean(user.email_verified)) {
    return json({
      ok: true,
      message: "如果该邮箱尚未验证，我们会发送一封新的验证邮件。"
    });
  }

  if (!canResendVerification(user.email_verification_last_attempt_at)) {
    return json(
      {
        ok: false,
        error: "too many requests",
        error_code: "verification_rate_limited",
        retry_after_seconds: getResendRetryAfterSeconds(user.email_verification_last_attempt_at)
      },
      429
    );
  }

  const verificationToken = createEmailVerificationToken();
  const verificationTokenHash = hashEmailVerificationToken(verificationToken);
  const verificationExpiresAt = getEmailVerificationExpiresAt();
  const attemptedAt = new Date().toISOString();

  await withTransaction(async (client) => {
    await client.query(
      `update users
       set email_verification_token_hash = $2,
           email_verification_expires_at = $3,
           email_verification_last_attempt_at = $4,
           email_verification_last_error = null
       where id = $1`,
      [Number(user.id), verificationTokenHash, verificationExpiresAt, attemptedAt]
    );
  });

  const sendResult = await sendVerificationEmail(String(user.email), verificationToken);

  if (sendResult.ok) {
    await db.query(
      `update users
       set email_verification_sent_at = $2,
           email_verification_last_error = null
       where id = $1`,
      [Number(user.id), new Date().toISOString()]
    );

    return json({
      ok: true,
      message: "验证邮件已重新发送，请查收邮箱。"
    });
  }

  console.error("failed to resend verification email", {
    userId: Number(user.id),
    email,
    error: sendResult.error
  });

  await db.query(
    `update users
     set email_verification_last_error = $2
     where id = $1`,
    [Number(user.id), sendResult.error || "unknown email send error"]
  );

  return json(
    {
      ok: false,
      error: "verification email send failed",
      message: "验证邮件发送失败，请稍后再试。"
    },
    503
  );
}
