"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Award01Icon, Calendar03Icon, CheckmarkCircle02Icon, ScrollIcon, Settings02Icon, Target02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { gameBus } from "@/components/game/event-bus";
import { currentWeekNumber, startOfWeek, toLocalDate, WEEK_DAYS } from "@/components/game/game-math";
import { PhaserCanvas } from "@/components/game/phaser-canvas";
import type { DashboardState, Pillar } from "@/lib/types";

export function GameShell() {
  const [today] = useState(() => toLocalDate(new Date()));
  const [weekStart] = useState(() => toLocalDate(startOfWeek(new Date())));
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missionOpen, setMissionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeScene, setActiveScene] = useState<"world" | "journey" | "trophy">("world");

  const loadState = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`/api/state?weekStart=${weekStart}`, { cache: "no-store" });
      if (!response.ok) throw new Error("state unavailable");
      const nextState = (await response.json()) as DashboardState;
      setState(nextState);
      const todayCheckin = nextState.checkins.find((checkin) => checkin.day === today);
      setSelected(todayCheckin?.completedPillarIds ?? []);
      gameBus.emit("react:state", { state: nextState, today, weekStart });
      if (!todayCheckin) setMissionOpen(true);
      setError("");
      return nextState;
    } catch {
      setError("O mundo não conseguiu sincronizar com o banco.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [today, weekStart]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadState(true), 0);
    return () => window.clearTimeout(timer);
  }, [loadState]);

  useEffect(() => {
    const unsubs = [
      gameBus.on("game:missions", () => setMissionOpen(true)),
      gameBus.on("game:settings", () => setSettingsOpen(true)),
      gameBus.on("game:error", ({ message }) => setError(message)),
      gameBus.on("game:scene", ({ scene }) => setActiveScene(scene)),
    ];
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, []);

  useEffect(() => {
    gameBus.emit("react:pause", { paused: missionOpen || settingsOpen });
  }, [missionOpen, settingsOpen]);

  const activePillars = useMemo(() => state?.pillars.filter((pillar) => pillar.active) ?? [], [state]);
  const weekday = new Date(`${today}T12:00:00`).getDay();
  const todayPillars = activePillars.filter((pillar) => pillar.requiredDays.includes(weekday));

  function closeMission(open: boolean) {
    setMissionOpen(open);
    if (!open) gameBus.emit("react:resume-world", undefined);
  }

  async function saveCheckin() {
    setSaving(true);
    try {
      const beforeTrophies = state?.stats.trophies ?? 0;
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: today, completedPillarIds: selected }),
      });
      if (!response.ok) throw new Error("checkin failed");
      const result = (await response.json()) as { ok: true; trophyAwarded?: boolean };
      setMissionOpen(false);
      const updated = await loadState();
      gameBus.emit("react:mission-saved", {
        completedPillarIds: selected,
        allComplete: todayPillars.length > 0 && todayPillars.every((pillar) => selected.includes(pillar.id)),
        trophyAwarded: Boolean(result.trophyAwarded || (updated && updated.stats.trophies > beforeTrophies)),
      });
    } catch {
      setError("O selo falhou. Tente registrar a missão novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !state) {
    return (
      <main className="game-root grid place-items-center bg-[#020606] text-[#dfffee]">
        <div className="loading-rune text-center">
          <span className="block text-3xl">◇</span>
          <p className="mt-4 font-pixel text-[10px] tracking-widest">ABRINDO O MUNDO</p>
          {error && <Button className="mt-5" onClick={() => void loadState(true)}>Tentar novamente</Button>}
        </div>
      </main>
    );
  }

  return (
    <main className="game-root">
      <PhaserCanvas />
      <div className="game-hud-minimal" data-scene={activeScene} aria-label="Informações da jornada">
        <div className="hud-objective">
          <HugeiconsIcon icon={Target02Icon} size={18} />
          <div><small>OBJETIVO FINAL</small><strong>{state.settings.finalGoal}</strong></div>
        </div>
        <div className="hud-center">
          <span><HugeiconsIcon icon={Calendar03Icon} size={16} /> SEMANA {String(currentWeekNumber(today)).padStart(2, "0")}</span>
          <span><HugeiconsIcon icon={Award01Icon} size={16} /> {String(state.stats.trophies).padStart(2, "0")}</span>
        </div>
        <div className="hud-actions">
          <Button className="hud-game-button" onClick={() => setMissionOpen(true)} aria-label="Abrir missões">
            <HugeiconsIcon icon={ScrollIcon} size={18} /><span>MISSÕES</span>
          </Button>
          <Button className="hud-game-button" onClick={() => setSettingsOpen(true)} aria-label="Abrir configurações">
            <HugeiconsIcon icon={Settings02Icon} size={18} /><span>AJUSTES</span>
          </Button>
        </div>
      </div>
      {error && <div className="game-error" role="alert">{error}</div>}
      <MissionScroll
        open={missionOpen}
        onOpenChange={closeMission}
        pillars={todayPillars}
        selected={selected}
        onToggle={(id) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])}
        onClear={() => setSelected([])}
        onSave={saveCheckin}
        saving={saving}
      />
      <SettingsScroll
        open={settingsOpen}
        onOpenChange={(open) => { setSettingsOpen(open); if (!open) gameBus.emit("react:resume-world", undefined); }}
        state={state}
        weekStart={weekStart}
        onSaved={async () => { setSettingsOpen(false); await loadState(); gameBus.emit("react:resume-world", undefined); }}
      />
    </main>
  );
}

function MissionScroll({ open, onOpenChange, pillars, selected, onToggle, onClear, onSave, saving }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pillars: Pillar[];
  selected: number[];
  onToggle: (id: number) => void;
  onClear: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="game-scroll max-h-[92dvh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <div className="scroll-rod" aria-hidden="true" />
        <DialogHeader className="relative z-10 text-center">
          <p className="scroll-kicker">ALTAR DAS MISSÕES</p>
          <DialogTitle className="font-pixel text-base text-[#2c1b0e] sm:text-xl">SELO DO DIA</DialogTitle>
          <DialogDescription className="text-[#5e4025]">Marque o que foi cumprido. O mundo responderá ao seu registro.</DialogDescription>
        </DialogHeader>
        <div className="relative z-10 grid gap-3 py-3">
          {pillars.length ? pillars.map((pillar, index) => {
            const checked = selected.includes(pillar.id);
            return (
              <button key={pillar.id} type="button" className={`mission-choice ${checked ? "chosen" : ""}`} onClick={() => onToggle(pillar.id)} aria-pressed={checked}>
                <span className="mission-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex-1 text-left"><strong>{pillar.name}</strong><small>Juramento obrigatório de hoje</small></span>
                <span className="mission-seal-mark">{checked ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} /> : "◇"}</span>
              </button>
            );
          }) : <p className="py-8 text-center font-pixel text-[9px] text-[#654929]">DIA DE RECUPERAÇÃO</p>}
        </div>
        <DialogFooter className="relative z-10 -mx-1 -mb-1 border-[#6e4a28]/30 bg-transparent p-2">
          <Button variant="ghost" className="text-[#593519] hover:bg-[#8e5e2c]/15" onClick={onClear}>Nenhuma cumprida</Button>
          <Button className="seal-button" onClick={onSave} disabled={saving}>{saving ? "SELANDO..." : "CONFIRMAR COM SELO"}</Button>
        </DialogFooter>
        <div className="scroll-rod bottom" aria-hidden="true" />
      </DialogContent>
    </Dialog>
  );
}

function SettingsScroll({ open, onOpenChange, state, weekStart, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: DashboardState;
  weekStart: string;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(state);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/state?weekStart=${weekStart}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: draft.settings, finalGoal: draft.settings.finalGoal, trophyTarget: draft.settings.trophyTarget, pillars: draft.pillars }),
      });
      if (!response.ok) throw new Error("settings failed");
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  function updatePillar(id: number, update: Partial<Pillar>) {
    setDraft((current) => ({ ...current, pillars: current.pillars.map((pillar) => pillar.id === id ? { ...pillar, ...update } : pillar) }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="settings-scroll max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <p className="scroll-kicker !text-emerald-300">CÂMARA DE ESTRATÉGIA</p>
          <DialogTitle className="font-pixel text-sm text-emerald-50 sm:text-lg">CONFIGURAR JORNADA</DialogTitle>
          <DialogDescription>As inscrições só podem ser alteradas neste formulário.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Label className="grid gap-2 text-xs text-emerald-100">Objetivo final
            <Input value={draft.settings.finalGoal} maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, settings: { ...current.settings, finalGoal: event.target.value } }))} />
          </Label>
          {draft.pillars.map((pillar) => (
            <fieldset key={pillar.id} className="pillar-fieldset">
              <legend>PILAR {pillar.position}</legend>
              <div className="flex items-center gap-3">
                <Input value={pillar.name} maxLength={30} onChange={(event) => updatePillar(pillar.id, { name: event.target.value })} />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={pillar.active} onChange={(event) => updatePillar(pillar.id, { active: event.target.checked })} /> Ativo</label>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {WEEK_DAYS.map((day) => {
                  const checked = pillar.requiredDays.includes(day.js);
                  return <button type="button" key={day.js} className={`day-toggle ${checked ? "active" : ""}`} onClick={() => updatePillar(pillar.id, { requiredDays: checked ? pillar.requiredDays.filter((value) => value !== day.js) : [...pillar.requiredDays, day.js] })}>{day.short}</button>;
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <DialogFooter><Button onClick={save} disabled={saving || !draft.settings.finalGoal.trim()}>{saving ? "GRAVANDO..." : "GRAVAR INSCRIÇÕES"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
