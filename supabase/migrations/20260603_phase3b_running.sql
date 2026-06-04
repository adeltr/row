-- Phase 3B — Running module
-- Idempotent: safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)

-- ── running_shoes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS running_shoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  brand         TEXT,
  model         TEXT,
  purchase_date DATE,
  price         NUMERIC(8,2),
  max_km        NUMERIC(8,2) DEFAULT 800,
  total_km      NUMERIC(10,3) DEFAULT 0,
  retired       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE running_shoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='running_shoes' AND policyname='running_shoes_owner'
  ) THEN
    CREATE POLICY running_shoes_owner ON running_shoes
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── running_routes ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS running_routes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  distance_km  NUMERIC(8,3),
  elevation_m  NUMERIC(8,1),
  notes        TEXT,
  times_run    INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE running_routes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='running_routes' AND policyname='running_routes_owner'
  ) THEN
    CREATE POLICY running_routes_owner ON running_routes
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── running_sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS running_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  distance_km      NUMERIC(8,3) NOT NULL,
  duration_sec     INTEGER NOT NULL,
  pace_sec_per_km  INTEGER,          -- auto-computed: duration_sec / distance_km
  run_type         TEXT NOT NULL DEFAULT 'easy'
                   CHECK (run_type IN ('easy','long','tempo','threshold','intervals',
                                       'recovery','race','fartlek','hill_repeats')),
  effort           SMALLINT CHECK (effort BETWEEN 1 AND 10),
  avg_hr           SMALLINT,
  max_hr           SMALLINT,
  elevation_m      NUMERIC(8,1),
  cadence          SMALLINT,
  temperature      NUMERIC(5,1),
  humidity         SMALLINT,
  conditions       TEXT CHECK (conditions IN ('sunny','cloudy','rain','wind','snow','indoor') OR conditions IS NULL),
  wind_speed_kmh   NUMERIC(5,1),
  splits           JSONB DEFAULT '[]',   -- [{km:1, pace_sec:310}, ...]
  notes            TEXT,
  shoe_id          UUID REFERENCES running_shoes(id) ON DELETE SET NULL,
  route_id         UUID REFERENCES running_routes(id) ON DELETE SET NULL,
  calories_burned  INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE running_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='running_sessions' AND policyname='running_sessions_owner'
  ) THEN
    CREATE POLICY running_sessions_owner ON running_sessions
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS running_sessions_user_date
  ON running_sessions (user_id, started_at DESC);

-- ── personal_records_running ───────────────────────────────────────────────
-- distance_label: '1K' | '1mile' | '5K' | '10K' | 'HalfMarathon' | 'Marathon'
CREATE TABLE IF NOT EXISTS personal_records_running (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distance_label TEXT NOT NULL,
  time_sec       INTEGER NOT NULL,
  session_id     UUID REFERENCES running_sessions(id) ON DELETE SET NULL,
  set_at         DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, distance_label)
);

ALTER TABLE personal_records_running ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='personal_records_running' AND policyname='pr_running_owner'
  ) THEN
    CREATE POLICY pr_running_owner ON personal_records_running
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── race_goals ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS race_goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  race_date      DATE NOT NULL,
  distance_km    NUMERIC(8,3) NOT NULL,
  goal_a_sec     INTEGER,
  goal_b_sec     INTEGER,
  goal_c_sec     INTEGER,
  actual_time_sec INTEGER,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE race_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='race_goals' AND policyname='race_goals_owner'
  ) THEN
    CREATE POLICY race_goals_owner ON race_goals
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── training_plans ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  race_goal_id UUID REFERENCES race_goals(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='training_plans' AND policyname='training_plans_owner'
  ) THEN
    CREATE POLICY training_plans_owner ON training_plans
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── planned_runs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planned_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  run_date          DATE NOT NULL,
  run_type          TEXT,
  distance_km       NUMERIC(8,3),
  pace_target_sec   INTEGER,
  actual_session_id UUID REFERENCES running_sessions(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE planned_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='planned_runs' AND policyname='planned_runs_owner'
  ) THEN
    CREATE POLICY planned_runs_owner ON planned_runs
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
