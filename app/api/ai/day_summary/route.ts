import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { chatJson } from "@/lib/server/ai";
import { badRequest, json, unauthorized } from "@/lib/server/http";
import { parseDateRange } from "@/lib/server/meals";

type SummaryAiResponse = {
  summary: string;
};

type DaySummaryRow = {
  summary: string;
  totals: {
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  } | null;
};

type MealRow = {
  id: number;
  eaten_at: string | Date;
  meal_type: string | null;
  note: string | null;
};

type MealItemRow = {
  meal_id: number;
  name: string;
  quantity: number | string | null;
  unit: string | null;
  calories: number | string | null;
  protein: number | string | null;
  fat: number | string | null;
  carbs: number | string | null;
};

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return badRequest("date required");

  const result = await db.query<DaySummaryRow>(
    "select summary, totals from day_summaries where user_id = $1 and date = $2 limit 1",
    [user.id, date]
  );

  const row = result.rows[0];
  if (!row) {
    return json({ ok: true, exists: false });
  }

  return json({
    ok: true,
    exists: true,
    date,
    summary: String(row.summary),
    totals: row.totals
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { date?: string };
  const date = body.date;
  if (!date) return badRequest("date required");

  let range;
  try {
    range = parseDateRange(date);
  } catch {
    return badRequest("invalid date");
  }

  const [totalsResult, mealsResult, profileResult] = await Promise.all([
    db.query(
      `select
         coalesce(sum(mi.calories), 0) as calories,
         coalesce(sum(mi.protein), 0) as protein,
         coalesce(sum(mi.fat), 0) as fat,
         coalesce(sum(mi.carbs), 0) as carbs
       from meal_items mi
       join meals m on mi.meal_id = m.id
       where m.user_id = $1 and m.eaten_at >= $2 and m.eaten_at <= $3`,
      [user.id, range.start, range.end]
    ),
    db.query<MealRow>(
      `select id, eaten_at, meal_type, note
       from meals
       where user_id = $1 and eaten_at >= $2 and eaten_at <= $3
       order by eaten_at asc`,
      [user.id, range.start, range.end]
    ),
    db.query("select height_cm, weight_kg, body_fat_pct, sex from user_profiles where user_id = $1 limit 1", [user.id])
  ]);

  if (!mealsResult.rowCount) {
    return badRequest("no meals for this day");
  }

  const mealIds = mealsResult.rows.map((row) => Number(row.id));
  const itemsResult = await db.query<MealItemRow>(
    `select meal_id, name, quantity, unit, calories, protein, fat, carbs
     from meal_items
     where meal_id in (${mealIds.map((_, index) => `$${index + 1}`).join(", ")})
     order by id asc`,
    mealIds
  );

  const itemsByMeal = new Map<number, MealItemRow[]>();
  for (const item of itemsResult.rows) {
    const mealId = Number(item.meal_id);
    const list = itemsByMeal.get(mealId) ?? [];
    list.push(item);
    itemsByMeal.set(mealId, list);
  }

  const totals = {
    calories: Number(totalsResult.rows[0].calories),
    protein: Number(totalsResult.rows[0].protein),
    fat: Number(totalsResult.rows[0].fat),
    carbs: Number(totalsResult.rows[0].carbs)
  };

  const meals = mealsResult.rows.map((meal) => ({
    ...meal,
    eaten_at: new Date(meal.eaten_at).toISOString(),
    items: (itemsByMeal.get(Number(meal.id)) ?? []).map((item) => ({
      name: item.name,
      quantity: item.quantity === null ? null : Number(item.quantity),
      unit: item.unit,
      calories: item.calories === null ? null : Number(item.calories),
      protein: item.protein === null ? null : Number(item.protein),
      fat: item.fat === null ? null : Number(item.fat),
      carbs: item.carbs === null ? null : Number(item.carbs)
    }))
  }));

  const parsed = await chatJson<SummaryAiResponse>(
    [
      {
        role: "system",
        content:
          "你是营养分析助手。请根据用户当天的饮食和身体数据，输出 JSON：{\"summary\":\"...\"}。summary 用简体中文，控制在 120 到 200 字。"
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            date,
            profile: profileResult.rows[0] ?? null,
            totals,
            meals
          },
          null,
          2
        )
      }
    ],
    500
  );

  await db.query(
    `insert into day_summaries (user_id, date, summary, totals)
     values ($1, $2, $3, $4)
     on conflict (user_id, date) do update set
       summary = excluded.summary,
       totals = excluded.totals,
       updated_at = now()`,
    [user.id, date, parsed.summary, JSON.stringify(totals)]
  );

  return json({
    ok: true,
    date,
    summary: parsed.summary,
    totals
  });
}
