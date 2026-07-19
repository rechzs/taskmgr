"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Award01Icon,
  BookOpen02Icon,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ThemeToggle } from "@/components/theme-toggle";
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
      await loadState();
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
    <main className="dojo-shell min-h-svh overflow-hidden bg-background text-foreground">
      <div className="dojo-grid fixed inset-0 -z-20" aria-hidden="true" />
      <ParticleField />

      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative flex size-9 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
              <HugeiconsIcon icon={Sword02Icon} size={19} strokeWidth={2} />
              <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
            </div>
            <div>
              <p className="font-heading text-sm font-black tracking-[0.18em]">KAGE</p>
              <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Dojo de performance</p>
            </div>
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <HeaderStat icon={Fire02Icon} label="Nível" value={String(state.stats.level).padStart(2, "0")} />
            <HeaderStat icon={Award01Icon} label="Troféus" value={String(state.stats.trophies).padStart(2, "0")} />
            <div className="w-44">
              <div className="mb-1.5 flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>XP</span><span>{xpIntoLevel} / 800</span>
              </div>
              <Progress value={(xpIntoLevel / 800) * 100} className="[&_[data-slot=progress-indicator]]:bg-emerald-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="icon-lg" className="rounded-full bg-background/60" onClick={() => setSettingsOpen(true)} aria-label="Configurar jornada">
              <HugeiconsIcon icon={Settings02Icon} size={18} />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {error && (
          <div className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <Card className="ninja-card relative min-h-[500px] overflow-hidden border-white/10 bg-card/70 shadow-2xl shadow-black/25 backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
              <div className="absolute left-5 top-5 z-20 sm:left-7 sm:top-7">
                <Badge variant="outline" className="border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                  <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-400" />
                  MISSÃO ATIVA
                </Badge>
                <h1 className="mt-4 max-w-md font-heading text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Domine o dia.<br /><span className="text-muted-foreground">Forje o destino.</span>
                </h1>
              </div>

              <div className={cn("ninja-stage absolute inset-x-0 bottom-0 top-28", missedToday && "is-wounded")}>
                <div className="ninja-aura" />
                <div className="ninja-halo ninja-halo-one" />
                <div className="ninja-halo ninja-halo-two" />
                <div className="ninja-orbit ninja-orbit-one" />
                <div className="ninja-orbit ninja-orbit-two" />
                <div className="wind-stream wind-stream-one" />
                <div className="wind-stream wind-stream-two" />
                <div className="wind-stream wind-stream-three" />
                {Array.from({ length: 7 }, (_, index) => <span key={index} className={`spirit-flame spirit-flame-${index + 1}`} />)}
                <motion.div
                  className="ninja-character"
                  animate={{ y: [0, -10, 0], rotate: [0, -0.8, 0.6, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Image src="/ninja.png" alt="Ninja guardião da jornada" width={1254} height={1254} priority />
                </motion.div>
                <div className="ninja-ground" />
              </div>

              <div className="absolute bottom-5 left-5 z-20 w-[calc(100%-2.5rem)] sm:bottom-7 sm:left-7 sm:w-72">
                <div className="rounded-xl border border-white/10 bg-black/45 p-4 text-white shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                    <span>Classe atual</span><span>NV. {state.stats.level}</span>
                  </div>
                  <p className="mt-1 font-heading text-lg font-black">Ninja da Disciplina</p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div className="h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-violet-400" initial={{ width: 0 }} animate={{ width: `${(xpIntoLevel / 800) * 100}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 right-6 hidden text-right sm:block">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Próximo rank</p>
                <p className="font-heading text-sm font-black">Lâmina Fantasma</p>
              </div>
            </Card>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
            <PerformanceCard title="Performance diária" score={todayScore} subtitle={dailySubtitle(todayScore, Boolean(todayCheckin))} daily danger={missedToday} />
            <Card className="border-white/10 bg-card/70 backdrop-blur-xl">
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <p className="quest-label">Missões de hoje</p>
                  <CardTitle className="mt-1 font-heading text-2xl font-black">Os três pilares</CardTitle>
                </div>
                <Button size="sm" onClick={() => setCheckinOpen(true)} className="bg-emerald-400 text-black hover:bg-emerald-300">
                  Fazer check-in
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayPillars.length ? todayPillars.map((pillar, index) => (
                  <MissionRow key={pillar.id} pillar={pillar} icon={PILLAR_ICONS[index]} completed={todayCheckin?.completedPillarIds.includes(pillar.id) ?? false} />
                )) : (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Dia de recuperação. Nenhuma missão obrigatória.</div>
                )}
                {todayCheckin && todayScore < 100 && (
                  <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-red-300">
                    <HugeiconsIcon icon={SkullIcon} size={18} />
                    <div><p className="text-xs font-bold uppercase tracking-wider">Penalidade ativa</p><p className="text-xs text-red-300/75">Disciplina incompleta · XP potencial perdido</p></div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
          <Card className="border-white/10 bg-card/70 backdrop-blur-xl">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <p className="quest-label">Relatório de batalha</p>
                <CardTitle className="mt-1 font-heading text-2xl font-black">Semana atual</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Segunda → Domingo</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-3xl font-black tabular-nums">{weeklyScore}%</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">performance</p>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <PerformanceCard title="Performance semanal" score={weeklyScore} subtitle={weeklySubtitle(weeklyScore)} />
        </section>

        <section>
          <Card className="magic-arsenal overflow-hidden border-violet-400/15 bg-card/70 backdrop-blur-xl">
            <CardHeader className="flex-row items-end justify-between space-y-0">
              <div>
                <p className="quest-label">Inventário arcano</p>
                <CardTitle className="mt-1 font-heading text-2xl font-black">Relíquias da jornada</CardTitle>
                <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">Artefatos despertam conforme sua disciplina cresce. Cada peça carrega metal, runas e energia do seu progresso.</p>
              </div>
              <Badge variant="outline" className="hidden border-violet-400/25 bg-violet-400/10 text-violet-300 sm:flex">6 ARTEFATOS</Badge>
            </CardHeader>
            <CardContent className="relic-grid">
              {RELICS.map((relic, index) => <MagicRelic key={relic.name} relic={relic} index={index} unlocked={index === 0 || (state.stats.level > index)} />)}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="trophy-vault overflow-hidden border-amber-400/20 bg-card/70 backdrop-blur-xl">
            <CardContent className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-amber-400">
                  <HugeiconsIcon icon={CrownIcon} size={18} />
                  <p className="quest-label !text-amber-400">Caminho do troféu final</p>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
                  <h2 className="font-heading text-3xl font-black tracking-tight">Objetivo: {state.settings.finalGoal}</h2>
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
              <div className="final-trophy relative mx-auto flex size-36 items-center justify-center lg:mx-0">
                <div className="absolute inset-0 animate-pulse rounded-full bg-amber-400/15 blur-2xl" />
                <div className="relative flex size-24 items-center justify-center rounded-[2rem] border border-amber-300/30 bg-gradient-to-br from-amber-300 via-amber-500 to-orange-700 text-black shadow-[0_0_45px_rgba(245,158,11,.35)]">
                  <HugeiconsIcon icon={Award01Icon} size={48} strokeWidth={1.8} />
                </div>
                <span className="absolute bottom-0 rounded-full border border-amber-400/25 bg-black/70 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">Troféu final</span>
              </div>
            </CardContent>
          </Card>
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
  return <div className="flex items-center gap-2"><HugeiconsIcon icon={icon} size={17} className="text-emerald-400" /><div><p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="font-heading text-sm font-black tabular-nums">{value}</p></div></div>;
}

function MissionRow({ pillar, icon, completed }: { pillar: Pillar; icon: typeof Dumbbell02Icon; completed: boolean }) {
  const accent = ACCENTS[pillar.accent];
  return (
    <div className={cn("group flex items-center gap-3 rounded-xl border p-3 transition-all", completed ? accent.soft : "border-white/8 bg-white/[.025]")}> 
      <div className={cn("flex size-10 items-center justify-center rounded-lg border bg-black/10", accent.soft, accent.text)}><HugeiconsIcon icon={icon} size={19} /></div>
      <div className="min-w-0 flex-1"><p className="truncate font-heading text-sm font-black">{pillar.name}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">+120 XP</p></div>
      <div className={cn("flex size-7 items-center justify-center rounded-full border", completed ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/15 text-muted-foreground")}>
        {completed ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} /> : <span className="size-1.5 rounded-full bg-current" />}
      </div>
    </div>
  );
}

function PerformanceCard({ title, score, subtitle, daily = false, danger = false }: { title: string; score: number; subtitle: string; daily?: boolean; danger?: boolean }) {
  const level = score >= 90 ? "S" : score >= 75 ? "A" : score >= 50 ? "B" : score > 0 ? "C" : "F";
  return (
    <Card className={cn("overflow-hidden border-white/10 bg-card/70 backdrop-blur-xl", danger && "border-red-400/25")}>
      <CardContent className="flex h-full min-h-48 items-center gap-5 p-5 sm:p-6">
        <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as CSSProperties}>
          <div><span>{score}</span><small>%</small></div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="quest-label">{title}</p>
          <div className="mt-2 flex items-center gap-2"><span className={cn("rank-badge", level === "S" && "elite", level === "F" && "failed")}>{level}</span><p className="font-heading text-xl font-black">Rank {level}</p></div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{subtitle}</p>
          {daily && <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">Atualiza após o check-in</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function PillarWeekStat({ pillar, icon, completed, required }: { pillar: Pillar; icon: typeof Dumbbell02Icon; completed: number; required: number }) {
  const accent = ACCENTS[pillar.accent];
  return <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3"><HugeiconsIcon icon={icon} size={17} className={accent.text} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{pillar.name}</p><div className="mt-1 h-1 overflow-hidden rounded-full bg-white/8"><div className={cn("h-full bg-gradient-to-r", accent.bar)} style={{ width: `${required ? Math.min(100, (completed / required) * 100) : 0}%` }} /></div></div><span className="text-[10px] tabular-nums text-muted-foreground">{completed}/{required}</span></div>;
}

function CheckinDialog({ open, onOpenChange, pillars, selected, onToggle, onClear, onSave, saving }: { open: boolean; onOpenChange: (open: boolean) => void; pillars: Pillar[]; selected: number[]; onToggle: (id: number) => void; onClear: () => void; onSave: () => void; saving: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-emerald-400/20 bg-[#0d1110]/96 p-0 text-white shadow-[0_0_80px_rgba(16,185,129,.14)] sm:max-w-lg">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
        <DialogHeader className="p-6 pb-2">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-400"><HugeiconsIcon icon={Target02Icon} size={22} /></div>
          <DialogTitle className="font-heading text-2xl font-black">Relatório da missão</DialogTitle>
          <DialogDescription className="text-white/50">Quais pilares você honrou hoje? Selecione todos os concluídos.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 px-6 py-4 sm:grid-cols-3">
          {pillars.map((pillar, index) => {
            const chosen = selected.includes(pillar.id);
            const accent = ACCENTS[pillar.accent];
            return (
              <motion.button key={pillar.id} type="button" whileTap={{ scale: 0.96 }} onClick={() => onToggle(pillar.id)} className={cn("relative rounded-xl border p-4 text-left transition-all", chosen ? cn(accent.soft, accent.glow) : "border-white/10 bg-white/[.025] hover:bg-white/[.05]")}>
                <HugeiconsIcon icon={PILLAR_ICONS[index]} size={22} className={accent.text} />
                <p className="mt-5 truncate font-heading text-sm font-black">{pillar.name}</p>
                <p className="mt-1 text-[9px] uppercase tracking-wider text-white/35">{chosen ? "Concluída" : "Pendente"}</p>
                {chosen && <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-emerald-400 text-black"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} /></span>}
              </motion.button>
            );
          })}
        </div>
        <button type="button" onClick={onClear} className="mx-6 rounded-lg border border-red-400/15 bg-red-400/5 px-3 py-2 text-xs text-red-300/75 transition-colors hover:bg-red-400/10">Hoje não concluí nenhuma missão</button>
        <DialogFooter className="mt-2 border-white/8 bg-black/25 p-5">
          <Button onClick={onSave} disabled={saving} className="h-10 bg-emerald-400 px-5 text-black hover:bg-emerald-300">{saving ? "Registrando..." : "Selar relatório"}</Button>
        </DialogFooter>
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

function ParticleField() {
  return <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <span key={index} className={cn("dojo-particle", index % 3 === 1 && "violet", index % 5 === 0 && "ember", index % 7 === 0 && "large")} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 11) * -1.15}s`, animationDuration: `${6 + (index % 7)}s` }} />)}</div>;
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

function buildWeek(weekStart: string, today: string, pillars: Pillar[], checkins: DashboardState["checkins"]) {
  if (!weekStart) return [];
  return WEEK_DAYS.map((weekday, index) => {
    const date = addDays(weekStart, index);
    const requiredPillars = pillars.filter((pillar) => pillar.requiredDays.includes(weekday.js));
    const checkin = checkins.find((entry) => entry.day === date);
    return { date, weekday: weekday.js, required: requiredPillars.length, completedIds: checkin?.completedPillarIds ?? [], score: date > today ? 0 : performanceScore(requiredPillars, checkin?.completedPillarIds ?? []) };
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
