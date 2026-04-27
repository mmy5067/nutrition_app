import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { unauthorized } from "@/lib/server/http";
import { json } from "@/lib/server/http";

type AdminUserRow = {
  id: number;
  email: string;
  is_admin: boolean | number;
  is_active: boolean | number;
  created_at: string | Date | null;
};

export async function GET() {
  const user = await requireUser();
  if (!user?.isAdmin) return unauthorized();

  const result = await db.query<AdminUserRow>(
    `select id, email, is_admin, is_active, created_at
     from users
     order by created_at desc
     limit 200`
  );

  return json({
    ok: true,
    users: result.rows.map((row) => ({
      id: Number(row.id),
      email: String(row.email),
      is_admin: Boolean(row.is_admin),
      is_active: Boolean(row.is_active),
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null
    }))
  });
}
