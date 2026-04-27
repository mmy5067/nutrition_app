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

function needsNutritionBackfill(items: AiItem[]) {
  if (!items.length) return true;

  return items.every(
    (item) =>
      item.calories === null &&
      item.protein === null &&
      item.fat === null &&
      item.carbs === null
  );
}

async function backfillNutrition(items: AiItem[]) {
  const result = await chatJson<{ items: AiItem[] }>(
    [
      {
        role: "system",
        content:
          "你是营养估算助手。请根据食物名称、数量和单位，为每一项估算 calories、protein、fat、carbs。除非信息极度不足，否则必须返回数字。只输出 JSON：{\"items\":[...]}。"
      },
      {
        role: "user",
        content: JSON.stringify({ items }, null, 2)
      }
    ],
    700
  );

  return Array.isArray(result.items) ? result.items : items;
}

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
          "你是营养记录助手。请把用户输入的一段餐食描述，转换成 JSON：{\"ok\":true,\"items\":[{\"name\":\"\",\"quantity\":0,\"unit\":\"g\",\"calories\":0,\"protein\":0,\"fat\":0,\"carbs\":0}],\"comment\":\"...\",\"meal_type_inferred\":\"早餐/午餐/晚餐/加餐/夜宵/未分类\"}。你需要优先给出热量和三大营养素的合理估算，只有在完全无法判断时才允许用 null。"
      },
      {
        role: "user",
        content: `餐食描述: ${text}\n记录时间: ${eatenAt.toISOString()}\n用户指定类型: ${body.meal_type || "NULL"}`
      }
    ],
    700
  );

  if (!parsed.ok || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    return badRequest(parsed.error || "AI did not return valid items");
  }

  const items = needsNutritionBackfill(parsed.items)
    ? await backfillNutrition(parsed.items)
    : parsed.items;

  const mealId = await withTransaction(async (client) => {
    const mealResult = await client.query(
      "insert into meals (user_id, eaten_at, meal_type, note) values ($1, $2, $3, $4) returning id",
      [user.id, eatenAt.toISOString(), body.meal_type || parsed.meal_type_inferred || null, body.note ?? null]
    );

    const createdMealId = Number(mealResult.rows[0].id);

    for (const item of items) {
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
      items
    },
    comment: parsed.comment || ""
  });
}
