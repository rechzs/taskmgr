import type { Checkin, Pillar } from "@/lib/types";
import { addDays, journeyDayState } from "./game-math.ts";

export type PillarRole = "training" | "diet" | "study";
export type BuildingState = "off" | "active" | "complete" | "rest";
export type AtmosphereState = "neutral" | "warm" | "cold" | "calm";
export type NinjaState = "idle" | "idle_wind" | "victory" | "failure" | "meditation";

export type WorldProjection = {
  dayState: ReturnType<typeof journeyDayState>;
  atmosphere: AtmosphereState;
  ninja: NinjaState;
  completedRequired: number;
  requiredCount: number;
  perfectDay: boolean;
  pathTransforms: number;
  buildings: Record<PillarRole, BuildingState>;
};

const ROLES: PillarRole[] = ["training", "diet", "study"];

export function roleForPillar(pillar: Pick<Pillar, "position">): PillarRole {
  return ROLES[Math.max(0, Math.min(2, pillar.position - 1))];
}

export function deriveWorldState(today: string, pillars: Pillar[], checkins: Checkin[]): WorldProjection {
  const current = checkins.find((entry) => entry.day === today);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const required = pillars.filter((pillar) => pillar.active && pillar.requiredDays.includes(weekday));
  const completed = new Set(current?.completedPillarIds ?? []);
  const completedRequired = required.filter((pillar) => completed.has(pillar.id)).length;
  const dayState = journeyDayState(today, today, pillars, checkins);
  const perfectDay = required.length > 0 && completedRequired === required.length;

  const buildings = Object.fromEntries(ROLES.map((role) => [role, "rest"])) as Record<PillarRole, BuildingState>;
  pillars.filter((pillar) => pillar.active).forEach((pillar) => {
    const role = roleForPillar(pillar);
    if (!pillar.requiredDays.includes(weekday)) buildings[role] = "rest";
    else if (completed.has(pillar.id)) buildings[role] = "complete";
    else buildings[role] = current ? "off" : "active";
  });

  const hasFailure = Boolean(current && required.length && completedRequired < required.length);
  return {
    dayState,
    atmosphere: perfectDay ? "warm" : hasFailure ? "cold" : required.length ? "neutral" : "calm",
    ninja: perfectDay ? "victory" : hasFailure ? "failure" : required.length ? "idle_wind" : "meditation",
    completedRequired,
    requiredCount: required.length,
    perfectDay,
    pathTransforms: countPathTransforms(today, pillars, checkins),
    buildings,
  };
}

export function countPathTransforms(throughDay: string, pillars: Pillar[], checkins: Checkin[]) {
  return checkins.reduce((total, checkin) => {
    if (checkin.day > throughDay) return total;
    const weekday = new Date(`${checkin.day}T12:00:00Z`).getUTCDay();
    const requiredIds = new Set(
      pillars.filter((pillar) => pillar.active && pillar.requiredDays.includes(weekday)).map((pillar) => pillar.id),
    );
    return total + checkin.completedPillarIds.filter((id) => requiredIds.has(id)).length;
  }, 0);
}

export function isPerfectWeek(weekStart: string, pillars: Pillar[], checkins: Checkin[]) {
  let requiredCount = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(weekStart, offset);
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    const required = pillars.filter((pillar) => pillar.active && pillar.requiredDays.includes(weekday));
    requiredCount += required.length;
    if (!required.length) continue;
    const completed = new Set(checkins.find((entry) => entry.day === day)?.completedPillarIds ?? []);
    if (required.some((pillar) => !completed.has(pillar.id))) return false;
  }
  return requiredCount > 0;
}
