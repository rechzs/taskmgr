import type { DashboardState } from "@/lib/types";

export type GameSnapshot = {
  state: DashboardState;
  today: string;
  weekStart: string;
};

export type GameEvents = {
  "game:ready": { scene: "WorldScene" };
  "game:missions": { source: "altar" | "hud" };
  "game:settings": { source: "world" | "hud" };
  "game:error": { message: string };
  "game:scene": { scene: "world" | "journey" | "trophy" };
  "react:state": GameSnapshot;
  "react:mission-saved": {
    completedPillarIds: number[];
    allComplete: boolean;
    trophyAwarded: boolean;
  };
  "react:open-journey": undefined;
  "react:open-trophy": { trophyCount: number; goal: string };
  "react:pause": { paused: boolean };
  "react:resume-world": undefined;
};

type Handler<T> = (detail: T) => void;

class TypedEventBus {
  private listeners = new Map<keyof GameEvents, Set<Handler<never>>>();
  private snapshot: GameSnapshot | null = null;

  emit<K extends keyof GameEvents>(event: K, detail: GameEvents[K]) {
    if (event === "react:state") this.snapshot = detail as GameSnapshot;
    this.listeners.get(event)?.forEach((handler) => handler(detail as never));
  }

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>) {
    const handlers = this.listeners.get(event) ?? new Set<Handler<never>>();
    handlers.add(handler as Handler<never>);
    this.listeners.set(event, handlers);
    return () => {
      handlers.delete(handler as Handler<never>);
      if (!handlers.size) this.listeners.delete(event);
    };
  }

  getSnapshot() {
    return this.snapshot;
  }
}

export const gameBus = new TypedEventBus();
