import { requireUser } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return json({ authenticated: false });
  }

  return json({
    authenticated: true,
    email: user.email,
    user_id: user.id,
    is_admin: user.isAdmin
  });
}
