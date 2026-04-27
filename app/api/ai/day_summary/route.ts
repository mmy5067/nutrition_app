import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { chatJson } from "@/lib/server/ai";
import { badRequest, json, unauthorized } from "@/lib/server/http";
import { parseDateRange } from "@/lib/server/meals";

type SummaryAiResponse = {
  summary: string;
};

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return badRequest("date required");

  const result = await db.query(
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
    db.query(
      `select
         m.id,
         m.eaten_at,
         m.meal_type,
         m.note,
         coalesce(
           json_agg(
             json_build_object(
               'name', mi.name,
               'quantity', mi.quantity,
               'unit', mi.unit,
               'calories', mi.calories,
               'protein', mi.protein,
               'fat', mi.fat,
               'carbs', mi.carbs
             )
           ) filter (where mi.id is not null),
           '[]'::json
         ) as items
       from meals m
       left join meal_items mi on mi.meal_id = m.id
       where m.user_id = $1 and m.eaten_at >= $2 and m.eaten_at <= $3
       group by m.id
       order by m.eaten_at asc`,
      [user.id, range.start, range.end]
    ),
    db.query("select height_cm, weight_kg, body_fat_pct, sex from user_profiles where user_id = $1 limit 1", [user.id])
  ]);

  if (!mealsResult.rowCount) {
    return badRequest("no meals for this day");
  }

  const totals = {
    calories: Number(totalsResult.rows[0].calories),
    protein: Number(totalsResult.rows[0].protein),
    fat: Number(totalsResult.rows[0].fat),
    carbs: Number(totalsResult.rows[0].carbs)
  };

  const parsed = await chatJson<SummaryAiResponse>(
    [
      {
        role: "system",
        content:
          "你是营养教练。请根据当天饮食、宏量营养和用户身体数据，输出一个 JSON：{\"summary\":\"...\"}。summary 控制在 200 字以内，语气直接，给出 2-3 条可执行建议。不要输出 JSON 之外的内容。"
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            date,
            profile: profileResult.rows[0] ?? null,
            totals,
            meals: mealsResult.rows
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
     values ($1, $2, $3, $4::jsonb)
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
