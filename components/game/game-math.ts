import type { Checkin, Pillar } from "@/lib/types";

export const JOURNEY_START = "2026-07-19";
export const JOURNEY_END = "2026-11-01";
export const GAME_TIME_ZONE = "America/Sao_Paulo";
export const WEEK_DAYS = [
  { short: "SEG", full: "Segunda", js: 1 },
  { short: "TER", full: "Terça", js: 2 },
  { short: "QUA", full: "Quarta", js: 3 },
  { short: "QUI", full: "Quinta", js: 4 },
  { short: "SEX", full: "Sexta", js: 5 },
  { short: "SÁB", full: "Sábado", js: 6 },
  { short: "DOM", full: "Domingo", js: 0 },
] as const;

export function toLocalDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: GAME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function startOfWeek(date: Date) {
  const copy = new Date(`${toLocalDate(date)}T12:00:00Z`);
  const day = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() - ((day + 6) % 7));
  return copy;
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string) {
  return Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000);
}

export function journeyDayState(day: string, today: string, pillars: Pillar[], checkins: Checkin[]) {
  const checkin = checkins.find((entry) => entry.day === day);
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const required = pillars.filter((pillar) => pillar.active && pillar.requiredDays.includes(weekday));
  const done = checkin?.completedPillarIds.filter((id) => required.some((pillar) => pillar.id === id)).length ?? 0;
  if (day > today) return "future" as const;
  if (!required.length) return "rest" as const;
  if (done === required.length) return "perfect" as const;
  if (checkin) return "missed" as const;
  return day < today ? "missed" as const : "current" as const;
}

export function currentWeekNumber(today: string) {
  return Math.max(1, Math.min(16, Math.floor(daysBetween(JOURNEY_START, today) / 7) + 1));
}
