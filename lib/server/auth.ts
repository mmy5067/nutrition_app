import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import { db } from "./db";

const COOKIE_NAME = "nt_session";
const secret = new TextEncoder().encode(env.sessionSecret);

type SessionPayload = {
  userId: number;
  email: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, secret);
    return {
      userId: Number(verified.payload.sub),
      email: String(verified.payload.email || "")
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.userId) {
    return null;
  }

  const result = await db.query(
    "select id, email, is_active, is_admin from users where id = $1 limit 1",
    [session.userId]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    return null;
  }

  return {
    id: Number(user.id),
    email: String(user.email),
    isAdmin: Boolean(user.is_admin)
  };
}
