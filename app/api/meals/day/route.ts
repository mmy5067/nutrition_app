import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { badRequest, json, unauthorized } from "@/lib/server/http";
import { parseDateRange } from "@/lib/server/meals";

type MealRow = {
  id: number;
  eaten_at: string | Date;
  meal_type: string | null;
  note: string | null;
};

type MealItemRow = {
  id: number;
  meal_id: number;
  name: string;
  quantity: string | number | null;
  unit: string | null;
  calories: string | number | null;
  protein: string | number | null;
  fat: string | number | null;
  carbs: string | number | null;
  extra: unknown;
};

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return badRequest("date required");

  let range;
  try {
    range = parseDateRange(date);
  } catch {
    return badRequest("invalid date");
  }

  const mealsResult = await db.query<MealRow>(
    `select id, eaten_at, meal_type, note
     from meals
     where user_id = $1 and eaten_at >= $2 and eaten_at <= $3
     order by eaten_at asc`,
    [user.id, range.start, range.end]
  );

  const mealIds = mealsResult.rows.map((row) => Number(row.id));
  const itemsResult =
    mealIds.length > 0
      ? await db.query<MealItemRow>(
          `select id, meal_id, name, quantity, unit, calories, protein, fat, carbs, extra
           from meal_items
           where meal_id in (${mealIds.map((_, index) => `$${index + 1}`).join(", ")})
           order by id asc`,
          mealIds
        )
      : { rows: [] as MealItemRow[], rowCount: 0 };

  const itemsByMeal = new Map<number, MealItemRow[]>();
  for (const item of itemsResult.rows) {
    const mealId = Number(item.meal_id);
    const list = itemsByMeal.get(mealId) ?? [];
    list.push(item);
    itemsByMeal.set(mealId, list);
  }

  const meals = mealsResult.rows.map((row) => ({
    id: Number(row.id),
    eaten_at: new Date(row.eaten_at).toISOString(),
    meal_type: row.meal_type,
    note: row.note,
    items: (itemsByMeal.get(Number(row.id)) ?? []).map((item) => ({
      id: Number(item.id),
      name: String(item.name),
      quantity: item.quantity === null ? null : Number(item.quantity),
      unit: item.unit ? String(item.unit) : null,
      calories: item.calories === null ? null : Number(item.calories),
      protein: item.protein === null ? null : Number(item.protein),
      fat: item.fat === null ? null : Number(item.fat),
      carbs: item.carbs === null ? null : Number(item.carbs),
      extra: item.extra ?? null
    }))
  }));

  return json({ ok: true, date, meals });
}
