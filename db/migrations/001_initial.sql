CREATE TABLE IF NOT EXISTS app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  final_goal VARCHAR(80) NOT NULL DEFAULT 'UFPR',
  trophy_target SMALLINT NOT NULL DEFAULT 12 CHECK (trophy_target BETWEEN 1 AND 52),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pillars (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(30) NOT NULL,
  accent VARCHAR(16) NOT NULL,
  required_days SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6]::SMALLINT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position)
);

CREATE TABLE IF NOT EXISTS checkins (
  day DATE PRIMARY KEY,
  completed_pillar_ids SMALLINT[] NOT NULL DEFAULT ARRAY[]::SMALLINT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_awards (
  week_start DATE PRIMARY KEY,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  goal_snapshot VARCHAR(80) NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (id, final_goal, trophy_target)
VALUES (1, 'UFPR', 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pillars (name, accent, required_days, active, position)
VALUES
  ('Treino', 'emerald', ARRAY[1,2,3,4,5,6]::SMALLINT[], TRUE, 1),
  ('Dieta', 'amber', ARRAY[1,2,3,4,5,6,0]::SMALLINT[], TRUE, 2),
  ('Estudo', 'violet', ARRAY[1,2,3,4,5,6]::SMALLINT[], TRUE, 3)
ON CONFLICT (position) DO NOTHING;

CREATE INDEX IF NOT EXISTS checkins_day_idx ON checkins (day DESC);
CREATE INDEX IF NOT EXISTS weekly_awards_awarded_at_idx ON weekly_awards (awarded_at DESC);
