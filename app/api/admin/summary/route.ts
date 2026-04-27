import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { unauthorized } from "@/lib/server/http";
import { json } from "@/lib/server/http";

export async function GET() {
  const user = await requireUser();
  if (!user?.isAdmin) return unauthorized();

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [usersResult, activeResult, mealsResult, meals24hResult] = await Promise.all([
    db.query("select count(*) as count from users"),
    db.query(
      `select count(distinct user_id) as count
       from meals
       where eaten_at >= $1`,
      [weekAgo]
    ),
    db.query("select count(*) as count from meals"),
    db.query("select count(*) as count from meals where eaten_at >= $1", [dayAgo])
  ]);

  return json({
    ok: true,
    total_users: Number(usersResult.rows[0].count),
    active_users_7d: Number(activeResult.rows[0].count),
    total_meals: Number(mealsResult.rows[0].count),
    meals_24h: Number(meals24hResult.rows[0].count)
  });
}
