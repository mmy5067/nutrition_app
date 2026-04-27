import { db, withTransaction } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { badRequest, json, unauthorized } from "@/lib/server/http";
import { toNumberOrNull } from "@/lib/server/meals";

type ItemInput = {
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  extra?: unknown;
};

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    eaten_at?: string;
    meal_type?: string | null;
    note?: string | null;
    items?: ItemInput[];
  };

  if (!body.eaten_at) {
    return badRequest("eaten_at required");
  }

  const eatenAt = new Date(body.eaten_at);
  if (Number.isNaN(eatenAt.getTime())) {
    return badRequest("invalid eaten_at format");
  }

  const result = await withTransaction(async (client) => {
    const meal = await client.query(
      "insert into meals (user_id, eaten_at, meal_type, note) values ($1, $2, $3, $4) returning id",
      [user.id, eatenAt.toISOString(), body.meal_type ?? null, body.note ?? null]
    );

    const mealId = Number(meal.rows[0].id);

    for (const item of body.items ?? []) {
      await client.query(
        `insert into meal_items
         (meal_id, name, quantity, unit, calories, protein, fat, carbs, extra)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          mealId,
          (item.name || "").trim() || "未命名",
          toNumberOrNull(item.quantity),
          item.unit ?? null,
          toNumberOrNull(item.calories),
          toNumberOrNull(item.protein),
          toNumberOrNull(item.fat),
          toNumberOrNull(item.carbs),
          item.extra ? JSON.stringify(item.extra) : null
        ]
      );
    }

    return mealId;
  });

  return json({ ok: true, meal_id: result });
}
