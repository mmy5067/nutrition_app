import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { badRequest, json, unauthorized } from "@/lib/server/http";
import { parseDateRange } from "@/lib/server/meals";

type MealItemRow = {
  id: number;
  name: string;
  quantity: string | number | null;
  unit: string | null;
  calories: string | number | null;
  protein: string | number | null;
  fat: string | number | null;
  carbs: string | number | null;
  extra: unknown;
};

type MealDayRow = {
  id: number;
  eaten_at: string | Date;
  meal_type: string | null;
  note: string | null;
  items: MealItemRow[];
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

  const result = await db.query<MealDayRow>(
    `select
       m.id,
       m.eaten_at,
       m.meal_type,
       m.note,
       coalesce(
         json_agg(
           json_build_object(
             'id', mi.id,
             'name', mi.name,
             'quantity', mi.quantity,
             'unit', mi.unit,
             'calories', mi.calories,
             'protein', mi.protein,
             'fat', mi.fat,
             'carbs', mi.carbs,
             'extra', mi.extra
           )
           order by mi.id
         ) filter (where mi.id is not null),
         '[]'::json
       ) as items
     from meals m
     left join meal_items mi on mi.meal_id = m.id
     where m.user_id = $1 and m.eaten_at >= $2 and m.eaten_at <= $3
     group by m.id
     order by m.eaten_at asc`,
    [user.id, range.start, range.end]
  );

  const meals = result.rows.map((row: MealDayRow) => ({
    id: Number(row.id),
    eaten_at: new Date(row.eaten_at).toISOString(),
    meal_type: row.meal_type,
    note: row.note,
    items: row.items.map((item: MealItemRow) => ({
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
