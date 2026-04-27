import { clearSession } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export async function POST() {
  await clearSession();
  return json({ ok: true });
}
