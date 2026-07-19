import { z } from "zod";
import { getDb } from "@/lib/db";
import type { Accent, DashboardState } from "@/lib/types";

export const dynamic = "force-dynamic";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const accentSchema = z.enum(["emerald", "amber", "violet"]);

const settingsSchema = z.object({
  finalGoal: z.string().trim().min(1).max(80),
  trophyTarget: z.number().int().min(1).max(52),
  pillars: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(30),
    accent: accentSchema,
    requiredDays: z.array(z.number().int().min(0).max(6)).max(7),
    active: z.boolean(),
    position: z.number().int().min(1).max(3),
  })).length(3),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedWeekStart = dateSchema.safeParse(url.searchParams.get("weekStart"));

    if (!parsedWeekStart.success) {
      return Response.json({ error: "weekStart inválido." }, { status: 400 });
    }

    return Response.json(await loadState(parsedWeekStart.data));
  } catch (error) {
    console.error("Failed to load dashboard state", error);
    return Response.json({ error: "Não foi possível carregar sua jornada." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = settingsSchema.parse(await request.json());
    const sql = getDb();

    await sql.begin(async (transaction) => {
      await transaction`
        UPDATE app_settings
        SET final_goal = ${payload.finalGoal},
            trophy_target = ${payload.trophyTarget},
            updated_at = NOW()
        WHERE id = 1
      `;

      for (const pillar of payload.pillars) {
        await transaction`
          UPDATE pillars
          SET name = ${pillar.name},
              accent = ${pillar.accent},
              required_days = ${transaction.array(pillar.requiredDays)}::smallint[],
              active = ${pillar.active},
              position = ${pillar.position},
              updated_at = NOW()
          WHERE id = ${pillar.id}
        `;
      }
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Configuração inválida." }, { status: 400 });
    }
    console.error("Failed to update settings", error);
    return Response.json({ error: "Não foi possível salvar as configurações." }, { status: 503 });
  }
}

export async function loadState(weekStart: string): Promise<DashboardState> {
  const sql = getDb();
  const weekEnd = addDays(weekStart, 6);

  const [settingsRows, pillarRows, checkinRows, statRows, trophyRows] = await Promise.all([
    sql<{ finalGoal: string; trophyTarget: number }[]>`
      SELECT final_goal AS "finalGoal", trophy_target AS "trophyTarget"
      FROM app_settings WHERE id = 1
    `,
    sql<{ id: number; name: string; accent: Accent; requiredDays: number[]; active: boolean; position: number }[]>`
      SELECT id, name, accent, required_days AS "requiredDays", active, position
      FROM pillars ORDER BY position
    `,
    sql<{ day: string; completedPillarIds: number[] }[]>`
      SELECT day::text AS day, completed_pillar_ids AS "completedPillarIds"
      FROM checkins
      WHERE day BETWEEN ${weekStart}::date AND ${weekEnd}::date
      ORDER BY day
    `,
    sql<{ totalCompleted: number; emptyCheckins: number }[]>`
      SELECT
        COALESCE(SUM(cardinality(completed_pillar_ids)), 0)::int AS "totalCompleted",
        COUNT(*) FILTER (WHERE cardinality(completed_pillar_ids) = 0)::int AS "emptyCheckins"
      FROM checkins
    `,
    sql<{ trophies: number }[]>`SELECT COUNT(*)::int AS trophies FROM weekly_awards`,
  ]);

  const totalCompleted = statRows[0]?.totalCompleted ?? 0;
  const emptyCheckins = statRows[0]?.emptyCheckins ?? 0;
  const xp = Math.max(0, totalCompleted * 120 - emptyCheckins * 60);

  return {
    settings: settingsRows[0] ?? { finalGoal: "UFPR", trophyTarget: 12 },
    pillars: pillarRows,
    checkins: checkinRows,
    stats: {
      trophies: trophyRows[0]?.trophies ?? 0,
      totalCompleted,
      emptyCheckins,
      xp,
      level: Math.floor(xp / 800) + 1,
    },
  };
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
