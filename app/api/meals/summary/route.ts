import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { badRequest, json, unauthorized } from "@/lib/server/http";
import { parseDateRange } from "@/lib/server/meals";

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

  const result = await db.query(
    `select
       coalesce(sum(mi.calories), 0) as total_calories,
       coalesce(sum(mi.protein), 0) as total_protein,
       coalesce(sum(mi.fat), 0) as total_fat,
       coalesce(sum(mi.carbs), 0) as total_carbs
     from meal_items mi
     join meals m on mi.meal_id = m.id
     where m.user_id = $1 and m.eaten_at >= $2 and m.eaten_at <= $3`,
    [user.id, range.start, range.end]
  );

  const row = result.rows[0];
  return json({
    ok: true,
    date,
    total_calories: Number(row.total_calories),
    total_protein: Number(row.total_protein),
    total_fat: Number(row.total_fat),
    total_carbs: Number(row.total_carbs)
  });
}
