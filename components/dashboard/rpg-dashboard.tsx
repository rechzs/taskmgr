"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  BookOpen02Icon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  CrownIcon,
  Dumbbell02Icon,
  Fire02Icon,
  Leaf02Icon,
  Settings02Icon,
  ShieldEnergyIcon,
  SkullIcon,
  Sword02Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { GameFxCanvas } from "@/components/dashboard/game-fx-canvas";
import { AnimatedNinja } from "@/components/dashboard/animated-ninja";
import { cn } from "@/lib/utils";
import type { Accent, DashboardState, Pillar } from "@/lib/types";

const WEEK_DAYS = [
  { short: "SEG", full: "Segunda", js: 1 },
  { short: "TER", full: "Terça", js: 2 },
  { short: "QUA", full: "Quarta", js: 3 },
  { short: "QUI", full: "Quinta", js: 4 },
  { short: "SEX", full: "Sexta", js: 5 },
  { short: "SÁB", full: "Sábado", js: 6 },
  { short: "DOM", full: "Domingo", js: 0 },
] as const;

const ACCENTS: Record<Accent, { glow: string; soft: string; text: string; bar: string }> = {
  emerald: {
    glow: "shadow-[0_0_36px_rgba(16,185,129,.2)]",
    soft: "border-emerald-400/25 bg-emerald-400/10",
    text: "text-emerald-400",
    bar: "from-emerald-500 to-teal-300",
  },
  amber: {
    glow: "shadow-[0_0_36px_rgba(245,158,11,.18)]",
    soft: "border-amber-400/25 bg-amber-400/10",
    text: "text-amber-400",
    bar: "from-amber-500 to-yellow-300",
  },
  violet: {
    glow: "shadow-[0_0_36px_rgba(139,92,246,.2)]",
    soft: "border-violet-400/25 bg-violet-400/10",
    text: "text-violet-400",
    bar: "from-violet-500 to-fuchsia-300",
  },
};

const PILLAR_ICONS = [Dumbbell02Icon, Leaf02Icon, BookOpen02Icon];
const JOURNEY_START = "2026-07-19";
const JOURNEY_END = "2026-11-01";

const RELICS = [
  { name: "Lâmina do Foco", lore: "Combo diário", rarity: "ÉPICO", tone: "emerald" },
  { name: "Máscara do Vazio", lore: "Proteção de sequência", rarity: "MÍTICO", tone: "violet" },
  { name: "Pergaminho Solar", lore: "Sabedoria acumulada", rarity: "RARO", tone: "amber" },
  { name: "Amuleto da Alma", lore: "Recuperação de falhas", rarity: "ÉPICO", tone: "emerald" },
  { name: "Orbe do Destino", lore: "Multiplicador de XP", rarity: "LENDÁRIO", tone: "violet" },
  { name: "Cálice da Ascensão", lore: "Semana perfeita", rarity: "LENDÁRIO", tone: "amber" },
] as const;

export function RpgDashboard() {
  const [today] = useState(() => toLocalDate(new Date()));
  const [weekStart] = useState(() => toLocalDate(startOfWeek(new Date())));
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [trophyCeremony, setTrophyCeremony] = useState(false);

  const loadState = useCallback(async () => {
    if (!weekStart) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/state?weekStart=${weekStart}`, { cache: "no-store" });
      if (!response.ok) throw new Error("state unavailable");
      const data = (await response.json()) as DashboardState;
      setState(data);
      const current = data.checkins.find((checkin) => checkin.day === today);
      setSelected(current?.completedPillarIds ?? []);
      if (today && !current) setCheckinOpen(true);
      return data;
    } catch {
      setError("A conexão com o dojo falhou. Verifique o banco e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [today, weekStart]);

  useEffect(() => {
    // The dashboard state is intentionally loaded when the local week changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadState();
  }, [loadState]);

  const activePillars = useMemo(() => state?.pillars.filter((pillar) => pillar.active) ?? [], [state]);
  const todayWeekday = today ? new Date(`${today}T12:00:00`).getDay() : 0;
  const todayPillars = activePillars.filter((pillar) => pillar.requiredDays.includes(todayWeekday));
  const todayCheckin = state?.checkins.find((checkin) => checkin.day === today);
  const todayScore = performanceScore(todayPillars, todayCheckin?.completedPillarIds ?? []);
  const week = useMemo(
    () => buildWeek(weekStart, today, activePillars, state?.checkins ?? []),
    [weekStart, today, activePillars, state?.checkins],
  );
  const elapsedWeek = week.filter((day) => day.date <= today && day.required > 0);
  const weeklyScore = elapsedWeek.length
    ? Math.round(elapsedWeek.reduce((sum, day) => sum + day.score, 0) / elapsedWeek.length)
    : 0;
  const xpIntoLevel = state ? state.stats.xp % 800 : 0;
  const missedToday = Boolean(todayCheckin && todayScore < 100);
  const journey = useMemo(
    () => buildJourney(JOURNEY_START, JOURNEY_END, today, activePillars, state?.checkins ?? []),
    [today, activePillars, state?.checkins],
  );

  async function saveCheckin() {
    if (!today) return;
    setSaving(true);
    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: today, completedPillarIds: selected }),
      });
      if (!response.ok) throw new Error("checkin failed");
      if (todayPillars.length > 0 && selected.length === todayPillars.length) {
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.68 },
          colors: ["#10b981", "#a78bfa", "#f59e0b", "#ffffff"],
          disableForReducedMotion: true,
        });
      }
      setCheckinOpen(false);
      const previousTrophies = state?.stats.trophies ?? 0;
      const updated = await loadState();
      if (updated && updated.stats.trophies > previousTrophies) {
        launchTrophyBurst();
        setTrophyCeremony(true);
      }
    } catch {
      setError("Não foi possível registrar a missão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !state) {
    return <LoadingDojo error={error} onRetry={loadState} />;
  }

  return (
    <main className="dojo-shell game-world min-h-svh overflow-hidden bg-background text-foreground">
      <div className="dojo-world fixed inset-0 -z-30" aria-hidden="true" />
      <div className="dojo-world-shade fixed inset-0 -z-20" aria-hidden="true" />
      <GameFxCanvas variant="world" className="fixed inset-0 -z-10" />

      <header className="game-hud sticky top-0 z-40">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
          <div className="game-logo flex items-center gap-3">
            <div className="game-logo-rune relative flex size-10 items-center justify-center text-emerald-300">
              <HugeiconsIcon icon={Sword02Icon} size={19} strokeWidth={2} />
            </div>
            <div>
              <p className="pixel-title text-sm text-emerald-100">KAGE</p>
              <p className="pixel-caption mt-1">DOJO DA DISCIPLINA</p>
            </div>
          </div>

          <div className="hud-runes hidden items-center gap-5 md:flex">
            <HeaderStat icon={Fire02Icon} label="Nível" value={String(state.stats.level).padStart(2, "0")} />
            <button type="button" onClick={() => setTrophyCeremony(true)} aria-label="Rever cerimônia dos troféus">
              <HeaderStat icon={Award01Icon} label="Troféus" value={String(state.stats.trophies).padStart(2, "0")} />
            </button>
            <div className="w-44">
              <div className="pixel-caption mb-1.5 flex justify-between">
                <span>XP</span><span>{xpIntoLevel} / 800</span>
              </div>
              <Progress value={(xpIntoLevel / 800) * 100} className="[&_[data-slot=progress-indicator]]:bg-emerald-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-lg" className="hud-settings" onClick={() => setSettingsOpen(true)} aria-label="Configurar jornada">
              <HugeiconsIcon icon={Settings02Icon} size={18} />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-10 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {error && (
          <div className="danger-scroll px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        <section className="world-stage relative min-h-[690px] overflow-hidden">
          <GameFxCanvas variant="hero" className="absolute inset-0 z-[2]" />
          <motion.div className="quest-sign absolute left-4 top-6 z-20 max-w-[25rem] p-5 sm:left-9 sm:top-10 sm:p-7" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}>
            <p className="pixel-caption text-amber-300">CAPÍTULO · 1 NOV 2026</p>
            <h1 className="pixel-heading mt-4 text-stone-50">FORJE O CAMINHO ATÉ <span>{state.settings.finalGoal}</span></h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-stone-300/70">Cada missão ergue uma nova construção no caminho do seu destino.</p>
          </motion.div>

          <AnimatedNinja wounded={missedToday} className="absolute bottom-0 left-[18%] z-10 h-[88%] w-[58%]" />
          <div className="ninja-nameplate absolute bottom-6 left-5 z-20 p-4 sm:left-9 sm:w-80">
            <div className="pixel-caption flex justify-between"><span>NINJA DA DISCIPLINA</span><span>NV {state.stats.level}</span></div>
            <div className="xp-rune mt-3"><motion.i initial={{ width: 0 }} animate={{ width: `${(xpIntoLevel / 800) * 100}%` }} /></div>
          </div>

          <aside className="performance-totem absolute right-4 top-7 z-20 w-[19rem] p-5 sm:right-8 sm:top-10">
            <PerformanceCard title="Poder diário" score={todayScore} subtitle={dailySubtitle(todayScore, Boolean(todayCheckin))} daily danger={missedToday} />
          </aside>

          <aside className="mission-shrine absolute bottom-5 right-4 z-20 w-[21rem] max-w-[calc(100%-2rem)] p-5 sm:bottom-8 sm:right-8">
            <div className="flex items-start justify-between gap-3">
              <div><p className="pixel-caption text-emerald-300">MISSÕES DE HOJE</p><h2 className="pixel-subheading mt-2">TRÊS PILARES</h2></div>
              <Button size="sm" onClick={() => setCheckinOpen(true)} className="quest-action">ABRIR</Button>
            </div>
            <div className="mt-4 space-y-2">
              {todayPillars.length ? todayPillars.map((pillar, index) => <MissionRow key={pillar.id} pillar={pillar} icon={PILLAR_ICONS[index]} completed={todayCheckin?.completedPillarIds.includes(pillar.id) ?? false} />) : <p className="rest-day py-5 text-center text-xs">DIA DE RECUPERAÇÃO</p>}
            </div>
            {todayCheckin && todayScore < 100 && <div className="curse-mark mt-3 flex items-center gap-2"><HugeiconsIcon icon={SkullIcon} size={17} /><span>PENALIDADE ATIVA · XP PERDIDO</span></div>}
          </aside>
        </section>

        <JourneyPath days={journey} today={today} goal={state.settings.finalGoal} />

        <section className="battle-camp grid gap-6 p-6 lg:p-8 xl:grid-cols-[1.45fr_.55fr]">
          <div className="battle-scroll p-5 sm:p-7">
            <div className="flex items-center justify-between gap-5">
              <div><p className="pixel-caption text-amber-300">RELATÓRIO DE BATALHA</p><h2 className="pixel-subheading mt-3">SEMANA ATUAL</h2><p className="mt-2 text-xs text-stone-500">SEGUNDA → DOMINGO</p></div>
              <div className="text-right"><p className="pixel-score">{weeklyScore}%</p><p className="pixel-caption">PODER</p></div>
            </div>
              <div className="weekly-chart">
                {week.map((day, index) => (
                  <motion.div key={day.date} className="day-column" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
                    <div className="day-score">{day.date > today ? "—" : `${day.score}%`}</div>
                    <div className="bar-track">
                      <motion.div
                        className={cn("bar-fill", day.score === 100 ? "perfect" : day.score >= 50 ? "partial" : day.date < today ? "failed" : "pending")}
                        initial={{ height: 0 }} animate={{ height: `${day.date > today ? 8 : Math.max(day.score, 8)}%` }} transition={{ duration: 0.75, delay: index * 0.07 }}
                      />
                    </div>
                    <div className={cn("day-rune", day.date === today && "today")}>{WEEK_DAYS[index].short}</div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                {activePillars.map((pillar, index) => {
                  const completed = week.reduce((count, day) => count + (day.completedIds.includes(pillar.id) ? 1 : 0), 0);
                  const required = week.filter((day) => pillar.requiredDays.includes(day.weekday) && day.date <= today).length;
                  return <PillarWeekStat key={pillar.id} pillar={pillar} icon={PILLAR_ICONS[index]} completed={completed} required={required} />;
                })}
              </div>
          </div>
          <div className="week-totem p-6"><PerformanceCard title="Poder semanal" score={weeklyScore} subtitle={weeklySubtitle(weeklyScore)} /></div>
        </section>

        <section className="relic-sanctuary p-6 sm:p-8">
          <div className="mb-7 flex items-end justify-between"><div><p className="pixel-caption text-violet-300">SANTUÁRIO ARCANO</p><h2 className="pixel-subheading mt-3">RELÍQUIAS DESPERTAS</h2></div><Badge variant="outline" className="hidden border-violet-400/25 bg-violet-400/10 text-violet-300 sm:flex">6 ARTEFATOS</Badge></div>
          <div className="relic-grid">{RELICS.map((relic, index) => <MagicRelic key={relic.name} relic={relic} index={index} unlocked={index === 0 || (state.stats.level > index)} />)}</div>
        </section>

        <section className="trophy-temple grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-amber-400">
                  <HugeiconsIcon icon={CrownIcon} size={18} />
                  <p className="pixel-caption !text-amber-400">CAMINHO DO TROFÉU FINAL</p>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
                  <h2 className="pixel-subheading mt-3">OBJETIVO: {state.settings.finalGoal}</h2>
                  <p className="pb-1 text-sm text-muted-foreground">{state.stats.trophies} de {state.settings.trophyTarget} troféus semanais</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {Array.from({ length: state.settings.trophyTarget }, (_, index) => (
                    <motion.div key={index} whileHover={{ y: -4, scale: 1.08 }} className={cn("trophy-rune", index < state.stats.trophies && "unlocked")}>
                      <HugeiconsIcon icon={Award01Icon} size={16} />
                    </motion.div>
                  ))}
                </div>
              </div>
              <button type="button" className="final-shrine-prop" onClick={() => setTrophyCeremony(true)} aria-label="Ver cerimônia do troféu"><span>{state.settings.finalGoal}</span></button>
        </section>
      </div>

      <CheckinDialog
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        pillars={todayPillars}
        selected={selected}
        onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])}
        onClear={() => setSelected([])}
        onSave={saveCheckin}
        saving={saving}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} state={state} weekStart={weekStart} onSaved={async () => { setSettingsOpen(false); await loadState(); }} />
      <TrophyCeremony open={trophyCeremony} trophyCount={state.stats.trophies} goal={state.settings.finalGoal} onClose={() => setTrophyCeremony(false)} />
    </main>
  );
}

function LoadingDojo({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#080a0a] p-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-5 flex size-16 animate-pulse items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400"><HugeiconsIcon icon={ShieldEnergyIcon} size={30} /></div>
        <p className="font-heading text-lg font-black tracking-wider">ABRINDO O DOJO</p>
        <p className="mt-2 text-sm text-white/45">Sincronizando sua jornada...</p>
        {error && <><p className="mt-5 max-w-sm text-sm text-red-300">{error}</p><Button className="mt-4" onClick={onRetry}>Tentar novamente</Button></>}
      </div>
    </main>
  );
}

function HeaderStat({ icon, label, value }: { icon: typeof Fire02Icon; label: string; value: string }) {
  return <div className="hud-stat flex items-center gap-2"><HugeiconsIcon icon={icon} size={17} className="text-emerald-300" /><div><p className="pixel-caption">{label}</p><p className="pixel-value tabular-nums">{value}</p></div></div>;
}

function MissionRow({ pillar, icon, completed }: { pillar: Pillar; icon: typeof Dumbbell02Icon; completed: boolean }) {
  const accent = ACCENTS[pillar.accent];
  return (
    <div className={cn("mission-rune group flex items-center gap-3 p-2.5 transition-all", completed && "completed")}>
      <div className={cn("mission-glyph flex size-9 items-center justify-center", accent.text)}><HugeiconsIcon icon={icon} size={18} /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{pillar.name}</p><p className="pixel-caption mt-1">+120 XP</p></div>
      <div className={cn("mission-seal flex size-7 items-center justify-center", completed && "completed")}>
        {completed ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} /> : <span>◆</span>}
      </div>
    </div>
  );
}

function PerformanceCard({ title, score, subtitle, daily = false, danger = false }: { title: string; score: number; subtitle: string; daily?: boolean; danger?: boolean }) {
  const level = score >= 90 ? "S" : score >= 75 ? "A" : score >= 50 ? "B" : score > 0 ? "C" : "F";
  return (
    <div className={cn("performance-rune h-full", danger && "danger")}>
      <div className="flex h-full items-center gap-4">
        <div className="score-crystal" style={{ "--score": `${score * 3.6}deg` } as CSSProperties}><div><span>{score}</span><small>%</small></div></div>
        <div className="min-w-0 flex-1">
          <p className="pixel-caption text-emerald-300">{title}</p>
          <div className="mt-2 flex items-center gap-2"><span className={cn("rank-gem", level === "S" && "elite", level === "F" && "failed")}>{level}</span><p className="pixel-subheading !text-sm">RANK {level}</p></div>
          <p className="mt-2 text-[11px] leading-5 text-stone-400">{subtitle}</p>
          {daily && <p className="pixel-caption mt-3 text-emerald-400">MUDA APÓS O SELO</p>}
        </div>
      </div>
    </div>
  );
}

function PillarWeekStat({ pillar, icon, completed, required }: { pillar: Pillar; icon: typeof Dumbbell02Icon; completed: number; required: number }) {
  const accent = ACCENTS[pillar.accent];
  return <div className="pillar-banner flex items-center gap-3 p-3"><HugeiconsIcon icon={icon} size={17} className={accent.text} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{pillar.name}</p><div className="xp-rune mt-2"><i className={cn("bg-gradient-to-r", accent.bar)} style={{ width: `${required ? Math.min(100, (completed / required) * 100) : 0}%` }} /></div></div><span className="pixel-caption tabular-nums">{completed}/{required}</span></div>;
}

function CheckinDialog({ open, onOpenChange, pillars, selected, onToggle, onClear, onSave, saving }: { open: boolean; onOpenChange: (open: boolean) => void; pillars: Pillar[]; selected: number[]; onToggle: (id: number) => void; onClear: () => void; onSave: () => void; saving: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="quest-scroll overflow-visible border-0 bg-transparent p-0 text-[#27180d] shadow-none sm:max-w-xl">
        <div className="scroll-rod top" aria-hidden="true" />
        <div className="scroll-paper px-8 py-10 sm:px-12">
        <DialogHeader>
          <div className="mx-auto mb-4 flex size-11 items-center justify-center text-emerald-950"><HugeiconsIcon icon={Target02Icon} size={25} /></div>
          <DialogTitle className="pixel-heading !text-lg !text-[#27180d]">RELATÓRIO DA MISSÃO</DialogTitle>
          <DialogDescription className="text-[#53391f]">Marque os pilares honrados. O pergaminho lembrará sua escolha.</DialogDescription>
        </DialogHeader>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {pillars.map((pillar, index) => {
            const chosen = selected.includes(pillar.id);
            const accent = ACCENTS[pillar.accent];
            return (
              <motion.button key={pillar.id} type="button" whileTap={{ scale: 0.94 }} onClick={() => onToggle(pillar.id)} className={cn("scroll-choice relative p-4 text-left", chosen && "chosen")}>
                <HugeiconsIcon icon={PILLAR_ICONS[index]} size={22} className={chosen ? accent.text : "text-[#604627]"} />
                <p className="mt-5 truncate text-xs font-black">{pillar.name}</p>
                <p className="pixel-caption mt-2 !text-[#70502d]">{chosen ? "HONRADA" : "PENDENTE"}</p>
                {chosen && <span className="scroll-seal absolute right-3 top-3"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} /></span>}
              </motion.button>
            );
          })}
        </div>
        <button type="button" onClick={onClear} className="mt-4 text-xs font-bold text-red-950/70 underline decoration-dashed underline-offset-4">NÃO CONCLUÍ NENHUMA MISSÃO</button>
        <DialogFooter className="mt-6">
          <Button onClick={onSave} disabled={saving} className="scroll-submit h-11 px-6">{saving ? "REGISTRANDO..." : "SELAR PERGAMINHO"}</Button>
        </DialogFooter>
        </div>
        <div className="scroll-rod bottom" aria-hidden="true" />
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ open, onOpenChange, state, weekStart, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; state: DashboardState; weekStart: string; onSaved: () => Promise<void> }) {
  const [goal, setGoal] = useState(state.settings.finalGoal);
  const [target, setTarget] = useState(state.settings.trophyTarget);
  const [pillars, setPillars] = useState(state.pillars);
  const [saving, setSaving] = useState(false);

  function updatePillar(id: number, patch: Partial<Pillar>) {
    setPillars((current) => current.map((pillar) => pillar.id === id ? { ...pillar, ...patch } : pillar));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finalGoal: goal, trophyTarget: target, pillars, weekStart }) });
      if (!response.ok) throw new Error("settings failed");
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto border-white/10 bg-popover/98 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-black">Configurar jornada</DialogTitle>
          <DialogDescription>Edite seus três pilares, dias obrigatórios e o objetivo do troféu final.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-[1fr_9rem]">
          <div className="space-y-2"><Label htmlFor="goal">Objetivo final</Label><Input id="goal" value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={80} /></div>
          <div className="space-y-2"><Label htmlFor="target">Troféus necessários</Label><Input id="target" type="number" min={1} max={52} value={target} onChange={(event) => setTarget(Math.min(52, Math.max(1, Number(event.target.value))))} /></div>
        </div>
        <div className="space-y-3">
          {pillars.map((pillar, index) => {
            const accent = ACCENTS[pillar.accent];
            return (
              <div key={pillar.id} className={cn("rounded-xl border p-4", accent.soft)}>
                <div className="flex items-center gap-3">
                  <HugeiconsIcon icon={PILLAR_ICONS[index]} size={19} className={accent.text} />
                  <Input value={pillar.name} onChange={(event) => updatePillar(pillar.id, { name: event.target.value })} maxLength={30} className="bg-background/50 font-bold" aria-label={`Nome do pilar ${index + 1}`} />
                  <Button type="button" size="sm" variant={pillar.active ? "default" : "outline"} onClick={() => updatePillar(pillar.id, { active: !pillar.active })}>{pillar.active ? "Ativo" : "Pausado"}</Button>
                </div>
                <p className="mb-2 mt-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Dias obrigatórios</p>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const required = pillar.requiredDays.includes(day.js);
                    return <button key={day.js} type="button" onClick={() => updatePillar(pillar.id, { requiredDays: required ? pillar.requiredDays.filter((value) => value !== day.js) : [...pillar.requiredDays, day.js] })} className={cn("size-9 rounded-lg border text-[9px] font-black transition-all", required ? "border-foreground bg-foreground text-background" : "border-border bg-background/40 text-muted-foreground")}>{day.short.slice(0, 1)}</button>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !goal.trim() || pillars.some((pillar) => !pillar.name.trim())}>{saving ? "Salvando..." : "Salvar jornada"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MagicRelic({ relic, index, unlocked }: { relic: (typeof RELICS)[number]; index: number; unlocked: boolean }) {
  return (
    <motion.article whileHover={{ y: -8, scale: 1.025 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className={cn("relic-card", `relic-${relic.tone}`, !unlocked && "locked")}>
      <div className="relic-stars" aria-hidden="true">{Array.from({ length: 5 }, (_, star) => <i key={star} style={{ "--star": star } as CSSProperties} />)}</div>
      <div className={cn("relic-art", `relic-art-${index + 1}`)} aria-hidden="true" />
      <div className="relic-sheen" aria-hidden="true" />
      <div className="relative z-10 border-t border-white/8 bg-black/35 p-3.5 text-white backdrop-blur-md">
        <div className="flex items-center justify-between gap-2"><p className="truncate font-heading text-sm font-black">{relic.name}</p><span className="relic-rarity">{relic.rarity}</span></div>
        <p className="mt-1 text-[10px] text-white/45">{unlocked ? relic.lore : `Desbloqueia no nível ${index + 1}`}</p>
      </div>
    </motion.article>
  );
}

type JourneyDay = {
  date: string;
  score: number;
  status: "perfect" | "partial" | "missed" | "future";
};

function JourneyPath({ days, today, goal }: { days: JourneyDay[]; today: string; goal: string }) {
  const todayIndex = Math.max(0, days.findIndex((day) => day.date === today));
  const remaining = Math.max(0, days.length - todayIndex - 1);

  return (
    <section className="journey-map overflow-hidden">
        <div className="relative z-10 flex items-end justify-between gap-5 px-6 pb-0 pt-7 sm:px-8">
          <div>
            <div className="flex items-center gap-2 text-amber-300"><HugeiconsIcon icon={Calendar03Icon} size={17} /><p className="pixel-caption !text-amber-300">MAPA DA CAMPANHA</p></div>
            <h2 className="pixel-subheading mt-3">A TRILHA ATÉ 1 DE NOVEMBRO</h2>
            <p className="mt-2 text-xs text-stone-400">Cada missão constrói um marco. Faltas deixam ruínas pelo caminho.</p>
          </div>
          <div className="hidden text-right sm:block"><p className="pixel-score text-amber-300">{remaining}</p><p className="pixel-caption">DIAS RESTANTES</p></div>
        </div>
        <div className="relative z-10 px-0 pb-5">
          <div className="journey-scroll px-6 pb-4 pt-8">
            <div className="journey-track" style={{ "--journey-days": days.length } as CSSProperties}>
              {days.map((day, index) => (
                <div key={day.date} className="journey-step" style={{ "--wave": `${Math.sin(index * 0.52) * 18}px` } as CSSProperties}>
                  {(index % 7 === 0 || index === days.length - 1) && <div className={cn("journey-landmark", `prop-${(Math.floor(index / 7) % 7) + 1}`, day.status)} aria-hidden="true" />}
                  <div className={cn("journey-stone", day.status, day.date === today && "today")} title={`${formatJourneyDate(day.date)} · ${day.score}%`}>
                    <span>{index + 1}</span>
                  </div>
                  {(index % 7 === 0 || day.date === today || index === days.length - 1) && <p className={cn("journey-date", day.date === today && "today-label")}>{day.date === today ? "HOJE" : formatJourneyDate(day.date)}</p>}
                </div>
              ))}
              <div className="journey-finish">
                <HugeiconsIcon icon={CrownIcon} size={24} />
                <div><p>1 NOV 2026</p><strong>{goal}</strong></div>
              </div>
            </div>
          </div>
          <div className="journey-legend mx-6"><span className="perfect">Vitória</span><span className="partial">Parcial</span><span className="missed">Cicatriz</span><span className="future">Não construído</span></div>
        </div>
    </section>
  );
}

function TrophyCeremony({ open, trophyCount, goal, onClose }: { open: boolean; trophyCount: number; goal: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <motion.div className="trophy-ceremony fixed inset-0 z-[100] grid place-items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label="Cerimônia de troféu">
      <div className="ceremony-sparks" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ "--spark": index } as CSSProperties} />)}</div>
      <motion.div className="ceremony-shrine" initial={{ scale: .3, y: 90, rotate: -8 }} animate={{ scale: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 130, damping: 13 }} onClick={(event) => event.stopPropagation()}>
        <div className="ceremony-prop" aria-hidden="true" />
        <motion.div className="ceremony-trophy" animate={{ y: [0, -13, 0], filter: ["brightness(1)", "brightness(1.55)", "brightness(1)"] }} transition={{ duration: 1.7, repeat: Infinity }}><HugeiconsIcon icon={Award01Icon} size={64} /></motion.div>
        <p className="pixel-caption text-amber-300">SEMANA CONQUISTADA</p>
        <h2 className="pixel-heading mt-4 text-amber-50">TROFÉU DESPERTADO</h2>
        <p className="mt-3 text-sm text-amber-100/65">{Math.max(1, trophyCount)} selo(s) no caminho de {goal}</p>
        <Button className="ceremony-button mt-6" onClick={onClose}>CONTINUAR JORNADA</Button>
      </motion.div>
    </motion.div>
  );
}

function launchTrophyBurst() {
  const colors = ["#facc15", "#fff7cc", "#34d399", "#a78bfa"];
  confetti({ particleCount: 180, spread: 110, startVelocity: 54, origin: { y: .68 }, colors, disableForReducedMotion: true });
  window.setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 70, origin: { x: 0, y: .72 }, colors, disableForReducedMotion: true }), 280);
  window.setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 70, origin: { x: 1, y: .72 }, colors, disableForReducedMotion: true }), 420);
}

function buildWeek(weekStart: string, today: string, pillars: Pillar[], checkins: DashboardState["checkins"]) {
  if (!weekStart) return [];
  return WEEK_DAYS.map((weekday, index) => {
    const date = addDays(weekStart, index);
    const requiredPillars = pillars.filter((pillar) => pillar.requiredDays.includes(weekday.js));
    const checkin = checkins.find((entry) => entry.day === date);
    return { date, weekday: weekday.js, required: requiredPillars.length, completedIds: checkin?.completedPillarIds ?? [], score: date > today ? 0 : performanceScore(requiredPillars, checkin?.completedPillarIds ?? []) };
  });
}

function buildJourney(start: string, end: string, today: string, pillars: Pillar[], checkins: DashboardState["checkins"]): JourneyDay[] {
  const totalDays = Math.max(0, Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86_400_000));
  return Array.from({ length: totalDays + 1 }, (_, index) => {
    const date = addDays(start, index);
    const weekday = new Date(`${date}T12:00:00`).getDay();
    const required = pillars.filter((pillar) => pillar.requiredDays.includes(weekday));
    const checkin = checkins.find((entry) => entry.day === date);
    const score = date > today ? 0 : performanceScore(required, checkin?.completedPillarIds ?? []);
    const status: JourneyDay["status"] = date > today ? "future" : score === 100 ? "perfect" : score > 0 ? "partial" : "missed";
    return { date, score, status };
  });
}

function performanceScore(required: Pillar[], completed: number[]) {
  if (!required.length) return 100;
  const completedSet = new Set(completed);
  return Math.round((required.filter((pillar) => completedSet.has(pillar.id)).length / required.length) * 100);
}

function dailySubtitle(score: number, checked: boolean) {
  if (!checked) return "Seu relatório de hoje ainda está pendente. A arena aguarda sua decisão.";
  if (score === 100) return "Execução impecável. Combo máximo e toda a experiência garantida.";
  if (score >= 50) return "A missão foi parcial. Retome o controle antes do próximo amanhecer.";
  return "O dia cobrou seu preço. A próxima missão vale a reconstrução da sequência.";
}

function weeklySubtitle(score: number) {
  if (score >= 90) return "Ritmo de elite. O troféu semanal está praticamente em suas mãos.";
  if (score >= 70) return "Boa cadência, mas ainda existem brechas na defesa da semana.";
  if (score >= 40) return "Zona de risco. Cada próxima missão decide o destino desta semana.";
  return "Alerta crítico. Reconstrua a sequência com uma vitória pequena ainda hoje.";
}

function startOfWeek(date: Date) { const value = new Date(date); const day = value.getDay(); value.setDate(value.getDate() - (day === 0 ? 6 : day - 1)); value.setHours(12, 0, 0, 0); return value; }
function toLocalDate(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
function addDays(date: string, amount: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + amount); return toLocalDate(value); }
function formatJourneyDate(date: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)).replace(".", "").toUpperCase(); }
