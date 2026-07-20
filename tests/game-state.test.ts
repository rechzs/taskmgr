import test from "node:test";
import assert from "node:assert/strict";
import { countPathTransforms, deriveWorldState, isPerfectWeek } from "../components/game/game-state.ts";
import { startOfWeek, toLocalDate } from "../components/game/game-math.ts";
import type { Checkin, Pillar } from "../lib/types.ts";

const pillars: Pillar[] = [
  { id: 1, name: "Treino", accent: "amber", requiredDays: [0, 1, 2, 3, 4, 5, 6], active: true, position: 1 },
  { id: 2, name: "Dieta", accent: "emerald", requiredDays: [0, 1, 2, 3, 4, 5, 6], active: true, position: 2 },
  { id: 3, name: "Estudo", accent: "violet", requiredDays: [0, 1, 2, 3, 4, 5, 6], active: true, position: 3 },
];

test("concluir uma missão altera o edifício correspondente e avança o caminho", () => {
  const checkins: Checkin[] = [{ day: "2026-07-20", completedPillarIds: [1] }];
  const world = deriveWorldState("2026-07-20", pillars, checkins);
  assert.equal(world.buildings.training, "complete");
  assert.equal(world.buildings.diet, "off");
  assert.equal(world.pathTransforms, 1);
});

test("concluir as três missões cria dia perfeito", () => {
  const world = deriveWorldState("2026-07-20", pillars, [{ day: "2026-07-20", completedPillarIds: [1, 2, 3] }]);
  assert.equal(world.perfectDay, true);
  assert.equal(world.ninja, "victory");
  assert.equal(world.atmosphere, "warm");
});

test("concluir todas as missões da semana satisfaz a condição de troféu", () => {
  const checkins: Checkin[] = Array.from({ length: 7 }, (_, offset) => {
    const day = String(20 + offset).padStart(2, "0");
    return { day: `2026-07-${day}`, completedPillarIds: [1, 2, 3] };
  });
  assert.equal(isPerfectWeek("2026-07-20", pillars, checkins), true);
  assert.equal(isPerfectWeek("2026-07-20", pillars, checkins.slice(0, 6)), false);
});

test("falha registrada esfria o cenário, apaga edifícios e altera a postura", () => {
  const world = deriveWorldState("2026-07-20", pillars, [{ day: "2026-07-20", completedPillarIds: [] }]);
  assert.equal(world.atmosphere, "cold");
  assert.equal(world.ninja, "failure");
  assert.deepEqual(Object.values(world.buildings), ["off", "off", "off"]);
});

test("o caminho avança exatamente pelo número de missões obrigatórias persistidas", () => {
  const checkins: Checkin[] = [
    { day: "2026-07-20", completedPillarIds: [1, 2] },
    { day: "2026-07-21", completedPillarIds: [1, 2, 3, 999] },
  ];
  assert.equal(countPathTransforms("2026-07-21", pillars, checkins), 5);
});

test("recarregar o mesmo snapshot reconstrói o mesmo estado do mundo", () => {
  const checkins: Checkin[] = [{ day: "2026-07-20", completedPillarIds: [1, 3] }];
  const beforeReload = deriveWorldState("2026-07-20", pillars, checkins);
  const afterReload = deriveWorldState("2026-07-20", structuredClone(pillars), structuredClone(checkins));
  assert.deepEqual(afterReload, beforeReload);
});

test("o dia do jogo respeita São Paulo durante a fronteira UTC", () => {
  const afterUtcMidnight = new Date("2026-07-20T00:30:00.000Z");
  assert.equal(toLocalDate(afterUtcMidnight), "2026-07-19");
  assert.equal(toLocalDate(startOfWeek(afterUtcMidnight)), "2026-07-13");
});
