export type Accent = "emerald" | "amber" | "violet";

export type Pillar = {
  id: number;
  name: string;
  accent: Accent;
  requiredDays: number[];
  active: boolean;
  position: number;
};

export type Checkin = {
  day: string;
  completedPillarIds: number[];
};

export type DashboardState = {
  settings: {
    finalGoal: string;
    trophyTarget: number;
  };
  pillars: Pillar[];
  checkins: Checkin[];
  stats: {
    trophies: number;
    totalCompleted: number;
    emptyCheckins: number;
    xp: number;
    level: number;
  };
};
