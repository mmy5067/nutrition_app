import { getSession } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return json({ authenticated: false });
  }

  return json({
    authenticated: true,
    email: session.email,
    user_id: session.userId
  });
}
