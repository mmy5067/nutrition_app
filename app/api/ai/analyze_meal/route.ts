import { requireUser } from "@/lib/server/auth";
import { chatJson } from "@/lib/server/ai";
import { badRequest, json, unauthorized } from "@/lib/server/http";
import { withTransaction } from "@/lib/server/db";

type AiItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
};

type AiResponse = {
  ok: boolean;
  error?: string;
  comment?: string;
  meal_type_inferred?: string | null;
  items: AiItem[];
};

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as {
    text?: string;
    meal_type?: string | null;
    note?: string | null;
    eaten_at?: string | null;
  };

  const text = body.text?.trim();
  if (!text) return badRequest("text required");

  const eatenAt = body.eaten_at ? new Date(body.eaten_at) : new Date();
  if (Number.isNaN(eatenAt.getTime())) {
    return badRequest("invalid eaten_at format");
  }

  const parsed = await chatJson<AiResponse>(
    [
      {
        role: "system",
        content:
          "你是营养记录助手。请从用户描述中提取本餐食物，并只返回合法 JSON。结构为 {\"ok\":true,\"items\":[{\"name\":\"\",\"quantity\":0,\"unit\":\"g\",\"calories\":0,\"protein\":0,\"fat\":0,\"carbs\":0}],\"comment\":\"一句简短反馈\",\"meal_type_inferred\":\"早餐/午餐/晚餐/加餐/夜宵/不确定\"}。如果无法判断，quantity 和营养字段可为 null。不要输出 JSON 之外的任何文字。"
      },
      {
        role: "user",
        content: `描述：${text}\n时间：${eatenAt.toISOString()}\nmeal_type：${body.meal_type || "NULL"}`
      }
    ],
    700
  );

  if (!parsed.ok || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    return badRequest(parsed.error || "AI did not return valid items");
  }

  const mealId = await withTransaction(async (client) => {
    const mealResult = await client.query(
      "insert into meals (user_id, eaten_at, meal_type, note) values ($1, $2, $3, $4) returning id",
      [user.id, eatenAt.toISOString(), body.meal_type || parsed.meal_type_inferred || null, body.note ?? null]
    );

    const createdMealId = Number(mealResult.rows[0].id);

    for (const item of parsed.items) {
      await client.query(
        `insert into meal_items
         (meal_id, name, quantity, unit, calories, protein, fat, carbs, extra)
         values ($1, $2, $3, $4, $5, $6, $7, $8, null)`,
        [
          createdMealId,
          item.name,
          item.quantity,
          item.unit,
          item.calories,
          item.protein,
          item.fat,
          item.carbs
        ]
      );
    }

    return createdMealId;
  });

  return json({
    ok: true,
    meal: {
      id: mealId,
      eaten_at: eatenAt.toISOString(),
      meal_type: body.meal_type || parsed.meal_type_inferred || null,
      note: body.note ?? null,
      items: parsed.items
    },
    comment: parsed.comment || ""
  });
}
