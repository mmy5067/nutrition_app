import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { badRequest, json, unauthorized } from "@/lib/server/http";
import { toNumberOrNull } from "@/lib/server/meals";

function serializeProfile(row?: Record<string, unknown>) {
  if (!row) {
    return {
      height_cm: null,
      weight_kg: null,
      body_fat_pct: null,
      birthday: null,
      sex: null
    };
  }

  return {
    height_cm: row.height_cm === null ? null : Number(row.height_cm),
    weight_kg: row.weight_kg === null ? null : Number(row.weight_kg),
    body_fat_pct: row.body_fat_pct === null ? null : Number(row.body_fat_pct),
    birthday: row.birthday ? String(row.birthday) : null,
    sex: row.sex ? String(row.sex) : null
  };
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const result = await db.query("select * from user_profiles where user_id = $1 limit 1", [user.id]);
  return json({ ok: true, profile: serializeProfile(result.rows[0]) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const birthday = body.birthday ? String(body.birthday) : null;

  if (birthday && Number.isNaN(new Date(birthday).getTime())) {
    return badRequest("invalid birthday");
  }

  await db.query(
    `insert into user_profiles (user_id, height_cm, weight_kg, body_fat_pct, birthday, sex)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id) do update set
       height_cm = excluded.height_cm,
       weight_kg = excluded.weight_kg,
       body_fat_pct = excluded.body_fat_pct,
       birthday = excluded.birthday,
       sex = excluded.sex,
       updated_at = now()`,
    [
      user.id,
      toNumberOrNull(body.height_cm),
      toNumberOrNull(body.weight_kg),
      toNumberOrNull(body.body_fat_pct),
      birthday,
      body.sex ? String(body.sex).trim() : null
    ]
  );

  const result = await db.query("select * from user_profiles where user_id = $1 limit 1", [user.id]);
  return json({ ok: true, profile: serializeProfile(result.rows[0]) });
}
