import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_PREFIX = "scrypt";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${SCRYPT_PREFIX}$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [method, salt, digest] = storedHash.split("$");
  if (method !== SCRYPT_PREFIX || !salt || !digest) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
