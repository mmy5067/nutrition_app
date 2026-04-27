import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { unauthorized } from "@/lib/server/http";
import { json } from "@/lib/server/http";

type MealRow = {
  id: number;
  user_email: string;
  eaten_at: string | Date;
  meal_type: string | null;
};

type ItemCountRow = {
  meal_id: number;
  count: number | string;
};

export async function GET() {
  const user = await requireUser();
  if (!user?.isAdmin) return unauthorized();

  const mealsResult = await db.query<MealRow>(
    `select m.id, u.email as user_email, m.eaten_at, m.meal_type
     from meals m
     join users u on u.id = m.user_id
     order by m.eaten_at desc
     limit 30`
  );

  const mealIds = mealsResult.rows.map((row) => Number(row.id));
  const countsResult =
    mealIds.length > 0
      ? await db.query<ItemCountRow>(
          `select meal_id, count(*) as count
           from meal_items
           where meal_id in (${mealIds.map((_, index) => `$${index + 1}`).join(", ")})
           group by meal_id`,
          mealIds
        )
      : { rows: [] as ItemCountRow[], rowCount: 0 };

  const countMap = new Map<number, number>();
  for (const row of countsResult.rows) {
    countMap.set(Number(row.meal_id), Number(row.count));
  }

  return json({
    ok: true,
    meals: mealsResult.rows.map((row) => ({
      id: Number(row.id),
      user_email: String(row.user_email),
      eaten_at: new Date(row.eaten_at).toISOString(),
      meal_type: row.meal_type,
      item_count: countMap.get(Number(row.id)) ?? 0
    }))
  });
}
