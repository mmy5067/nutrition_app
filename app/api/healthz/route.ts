import { json } from "@/lib/server/http";

export async function GET() {
  return json({ ok: true });
}
