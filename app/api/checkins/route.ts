import { z } from "zod";
import { getDb } from "@/lib/db";
import { JOURNEY_END, JOURNEY_START, toLocalDate } from "@/components/game/game-math";

export const dynamic = "force-dynamic";

const checkinSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completedPillarIds: z.array(z.number().int().positive()).max(3),
});

export async function POST(request: Request) {
  try {
    const payload = checkinSchema.parse(await request.json());
    const today = toLocalDate(new Date());
    if (payload.day < JOURNEY_START || payload.day > today || payload.day > JOURNEY_END) {
      return Response.json({ error: "O dia informado está fora da jornada disponível." }, { status: 400 });
    }
    const sql = getDb();
    const dayOfWeek = new Date(`${payload.day}T12:00:00Z`).getUTCDay();
    const pillars = await sql<{ id: number; requiredDays: number[] }[]>`
      SELECT id, required_days AS "requiredDays"
      FROM pillars
      WHERE active = TRUE
      ORDER BY position
    `;
    const validIds = new Set(
      pillars.filter((pillar) => pillar.requiredDays.includes(dayOfWeek)).map((pillar) => pillar.id),
    );
    const completed = [...new Set(payload.completedPillarIds)].filter((id) => validIds.has(id));

    await sql`
      INSERT INTO checkins (day, completed_pillar_ids)
      VALUES (${payload.day}::date, ${sql.array(completed)}::smallint[])
      ON CONFLICT (day) DO UPDATE
      SET completed_pillar_ids = EXCLUDED.completed_pillar_ids,
          updated_at = NOW()
    `;

    const trophyAwarded = dayOfWeek === 0
      ? await reconcileWeeklyAward(payload.day, pillars)
      : false;

    return Response.json({ ok: true, trophyAwarded });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Check-in inválido." }, { status: 400 });
    }
    console.error("Failed to save check-in", error);
    return Response.json({ error: "Não foi possível registrar o check-in." }, { status: 503 });
  }
}

async function reconcileWeeklyAward(sunday: string, pillars: { id: number; requiredDays: number[] }[]) {
  const sql = getDb();
  const weekStart = addDays(sunday, -6);
  const rows = await sql<{ day: string; completedPillarIds: number[] }[]>`
    SELECT day::text AS day, completed_pillar_ids AS "completedPillarIds"
    FROM checkins
    WHERE day BETWEEN ${weekStart}::date AND ${sunday}::date
  `;
  const byDay = new Map(rows.map((row) => [row.day, new Set(row.completedPillarIds)]));
  let required = 0;
  let completed = 0;
  const existing = await sql<{ awarded: boolean }[]>`
    SELECT EXISTS(
      SELECT 1 FROM weekly_awards WHERE week_start = ${weekStart}::date
    ) AS awarded
  `;

  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(weekStart, offset);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    for (const pillar of pillars) {
      if (pillar.requiredDays.includes(weekday)) {
        required += 1;
        if (byDay.get(day)?.has(pillar.id)) completed += 1;
      }
    }
  }

  if (required > 0 && completed === required) {
    await sql`
      INSERT INTO weekly_awards (week_start, score, goal_snapshot)
      SELECT ${weekStart}::date, 100, final_goal FROM app_settings WHERE id = 1
      ON CONFLICT (week_start) DO UPDATE SET score = 100
    `;
    return !(existing[0]?.awarded ?? false);
  } else {
    await sql`DELETE FROM weekly_awards WHERE week_start = ${weekStart}::date`;
    return false;
  }
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
