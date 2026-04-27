import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { hashEmailVerificationToken } from "@/lib/server/email-verification";

type VerificationRow = {
  id: number | string;
  email_verified: boolean | number;
  email_verification_expires_at?: string | null;
};

function redirectWithStatus(request: Request, status: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("verification", status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return redirectWithStatus(request, "invalid");
  }

  const tokenHash = hashEmailVerificationToken(token);
  const result = await db.query<VerificationRow>(
    `select id, email_verified, email_verification_expires_at
     from users
     where email_verification_token_hash = $1
     limit 1`,
    [tokenHash]
  );

  const user = result.rows[0];
  if (!user) {
    return redirectWithStatus(request, "invalid");
  }

  if (Boolean(user.email_verified)) {
    return redirectWithStatus(request, "success");
  }

  const expiresAt = user.email_verification_expires_at ? Date.parse(String(user.email_verification_expires_at)) : NaN;
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return redirectWithStatus(request, "expired");
  }

  await db.query(
    `update users
     set email_verified = true,
         email_verified_at = $2,
         email_verification_token_hash = null,
         email_verification_expires_at = null,
         email_verification_sent_at = null,
         email_verification_last_attempt_at = null,
         email_verification_last_error = null
     where id = $1`,
    [Number(user.id), new Date().toISOString()]
  );

  return redirectWithStatus(request, "success");
}
