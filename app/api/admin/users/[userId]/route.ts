import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { badRequest, json, unauthorized } from "@/lib/server/http";

export async function DELETE(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const admin = await requireUser();
  if (!admin?.isAdmin) return unauthorized();

  const { userId } = await context.params;
  const targetUserId = Number(userId);
  if (!Number.isFinite(targetUserId)) {
    return badRequest("invalid user id");
  }

  if (targetUserId === admin.id) {
    return badRequest("cannot delete current admin");
  }

  const lookup = await db.query("select id, is_admin from users where id = $1 limit 1", [targetUserId]);
  const row = lookup.rows[0];
  if (!row) {
    return json({ ok: false, error: "user not found" }, 404);
  }

  if (Boolean(row.is_admin)) {
    return badRequest("cannot delete another admin");
  }

  const result = await db.query("delete from users where id = $1", [targetUserId]);
  return json({ ok: (result.rowCount ?? 0) > 0 });
}
