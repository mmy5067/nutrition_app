import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { json, unauthorized } from "@/lib/server/http";

export async function DELETE(_request: Request, context: { params: Promise<{ mealId: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { mealId } = await context.params;
  const result = await db.query("delete from meals where id = $1 and user_id = $2", [mealId, user.id]);

  if (!result.rowCount) {
    return json({ ok: false, error: "meal not found" }, 404);
  }

  return json({ ok: true });
}
