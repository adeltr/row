-- ============================================================
-- Phase 3A-1: Programs + Workout Player
-- Drop any partial tables from a failed first run, then recreate.
-- ============================================================

drop table if exists program_ratings cascade;
drop table if exists workout_logs cascade;
drop table if exists user_active_programs cascade;
drop table if exists program_schedules cascade;
drop table if exists program_exercises cascade;
drop table if exists program_sessions cascade;
drop table if exists programs cascade;

-- ── programs ─────────────────────────────────────────────────

create table if not exists programs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,  -- NULL = official/global
  name            text not null,
  description     text,
  duration_weeks  int default 4,
  goal            text check (goal in ('strength','hypertrophy','cutting','recomp','endurance','general')),
  level           text check (level in ('beginner','intermediate','advanced')),
  is_public       boolean default false,
  is_official     boolean default false,
  copy_count      int default 0,
  rating_avg      numeric default 0,
  rating_count    int default 0,
  cover_image_url text,
  tags            jsonb default '[]'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table programs enable row level security;

create policy "programs_select" on programs
  for select using (is_public = true or is_official = true or auth.uid() = user_id);

create policy "programs_insert" on programs
  for insert with check (auth.uid() = user_id and is_official = false);

create policy "programs_update" on programs
  for update using (auth.uid() = user_id and is_official = false)
  with check (auth.uid() = user_id and is_official = false);

create policy "programs_delete" on programs
  for delete using (auth.uid() = user_id and is_official = false);

-- ── program_sessions ─────────────────────────────────────────

create table if not exists program_sessions (
  id                          uuid primary key default gen_random_uuid(),
  program_id                  uuid not null references programs(id) on delete cascade,
  name                        text not null,
  order_index                 int default 0,
  warmup_note                 text,
  rest_between_exercises_sec  int default 120,
  notes                       text,
  created_at                  timestamptz default now()
);

alter table program_sessions enable row level security;

create policy "program_sessions_select" on program_sessions
  for select using (
    exists (
      select 1 from programs p
      where p.id = program_id
        and (p.is_public = true or p.is_official = true or p.user_id = auth.uid())
    )
  );

create policy "program_sessions_insert" on program_sessions
  for insert with check (
    exists (
      select 1 from programs p
      where p.id = program_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

create policy "program_sessions_update" on program_sessions
  for update using (
    exists (
      select 1 from programs p
      where p.id = program_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

create policy "program_sessions_delete" on program_sessions
  for delete using (
    exists (
      select 1 from programs p
      where p.id = program_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

-- ── program_exercises ────────────────────────────────────────

create table if not exists program_exercises (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references program_sessions(id) on delete cascade,
  name             text not null,
  order_index      int default 0,
  target_sets      int default 4,
  target_reps      text default '10',
  rest_sec         int default 90,
  technique        text,
  notes            text,
  is_superset      boolean default false,
  superset_with_id uuid references program_exercises(id) on delete set null,
  video_url        text,
  created_at       timestamptz default now()
);

alter table program_exercises enable row level security;

create policy "program_exercises_select" on program_exercises
  for select using (
    exists (
      select 1 from program_sessions ps
      join programs p on p.id = ps.program_id
      where ps.id = session_id
        and (p.is_public = true or p.is_official = true or p.user_id = auth.uid())
    )
  );

create policy "program_exercises_insert" on program_exercises
  for insert with check (
    exists (
      select 1 from program_sessions ps
      join programs p on p.id = ps.program_id
      where ps.id = session_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

create policy "program_exercises_update" on program_exercises
  for update using (
    exists (
      select 1 from program_sessions ps
      join programs p on p.id = ps.program_id
      where ps.id = session_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

create policy "program_exercises_delete" on program_exercises
  for delete using (
    exists (
      select 1 from program_sessions ps
      join programs p on p.id = ps.program_id
      where ps.id = session_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

-- ── program_schedules ────────────────────────────────────────

create table if not exists program_schedules (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references programs(id) on delete cascade,
  day_of_week  int not null check (day_of_week between 0 and 6),  -- 0=Monday
  session_id   uuid references program_sessions(id) on delete cascade,
  rest_label   text,
  created_at   timestamptz default now(),
  unique (program_id, day_of_week)
);

alter table program_schedules enable row level security;

create policy "program_schedules_select" on program_schedules
  for select using (
    exists (
      select 1 from programs p
      where p.id = program_id
        and (p.is_public = true or p.is_official = true or p.user_id = auth.uid())
    )
  );

create policy "program_schedules_insert" on program_schedules
  for insert with check (
    exists (
      select 1 from programs p
      where p.id = program_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

create policy "program_schedules_update" on program_schedules
  for update using (
    exists (
      select 1 from programs p
      where p.id = program_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

create policy "program_schedules_delete" on program_schedules
  for delete using (
    exists (
      select 1 from programs p
      where p.id = program_id
        and p.user_id = auth.uid()
        and p.is_official = false
    )
  );

-- ── user_active_programs ─────────────────────────────────────

create table if not exists user_active_programs (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  program_id   uuid references programs(id) on delete set null,
  started_at   date,
  current_week int default 1
);

alter table user_active_programs enable row level security;

create policy "user_active_programs_all" on user_active_programs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── workout_logs ─────────────────────────────────────────────

create table if not exists workout_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  program_id       uuid references programs(id) on delete set null,
  session_id       uuid references program_sessions(id) on delete set null,
  session_name     text,
  duration_min     int,
  total_volume_kg  numeric,
  notes            text,
  feeling          text check (feeling in ('great','good','ok','bad','terrible')),
  created_at       timestamptz default now()
);

alter table workout_logs enable row level security;

create policy "workout_logs_all" on workout_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── program_ratings ──────────────────────────────────────────

create table if not exists program_ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  program_id  uuid not null references programs(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  unique (user_id, program_id)
);

alter table program_ratings enable row level security;

create policy "program_ratings_select" on program_ratings
  for select using (
    exists (
      select 1 from programs p
      where p.id = program_id
        and (p.is_public = true or p.is_official = true or p.user_id = auth.uid())
    )
  );

create policy "program_ratings_insert" on program_ratings
  for insert with check (auth.uid() = user_id);

create policy "program_ratings_update" on program_ratings
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "program_ratings_delete" on program_ratings
  for delete using (auth.uid() = user_id);

-- ── exercise_logs modifications ──────────────────────────────

alter table exercise_logs
  add column if not exists workout_log_id uuid references workout_logs(id) on delete set null;

alter table exercise_logs
  add column if not exists program_exercise_id uuid references program_exercises(id) on delete set null;

-- ── Seed: Sèche Essan — 7 semaines ──────────────────────────
-- Two-pass pattern for supersets:
--   Pass 1: insert both rows with superset_with_id = NULL
--   Pass 2: update both rows to link them to each other

do $$
declare
  prog_id uuid;
  s1_id   uuid;  -- SÉANCE 1 : JAMBES
  s2_id   uuid;  -- SÉANCE 2 : PEC + BRAS
  s3_id   uuid;  -- SÉANCE 3 : DOS + BICEPS
  s4_id   uuid;  -- SÉANCE 4 : ÉPAULES + TRICEPS
  -- superset pair IDs
  e1_4a uuid; e1_4b uuid;
  e2_4a uuid; e2_4b uuid;
  e2_5a uuid; e2_5b uuid;
  e2_6a uuid; e2_6b uuid;
  e2_7a uuid; e2_7b uuid;
  e3_4a uuid; e3_4b uuid;
  e4_4a uuid; e4_4b uuid;
  e4_7a uuid; e4_7b uuid;
begin
  if exists (select 1 from programs where name = 'Sèche Essan — 7 semaines' and is_official = true) then
    return;
  end if;

  insert into programs (name, description, duration_weeks, goal, level, is_public, is_official, tags, user_id)
  values (
    'Sèche Essan — 7 semaines',
    'Programme de sèche 7 semaines avec exemple retard jambes. 4 séances + cardio.',
    7, 'cutting', 'intermediate', true, true,
    '["push-pull-legs","cutting","french"]'::jsonb,
    null
  ) returning id into prog_id;

  -- ── sessions ─────────────────────────────────────────────
  insert into program_sessions (program_id, name, order_index, warmup_note, rest_between_exercises_sec)
  values (prog_id, 'SÉANCE 1 : JAMBES', 0, '5 min de rameur', 120)
  returning id into s1_id;

  insert into program_sessions (program_id, name, order_index, warmup_note, rest_between_exercises_sec)
  values (prog_id, 'SÉANCE 2 : PEC + BRAS', 1, '5 min de rameur', 120)
  returning id into s2_id;

  insert into program_sessions (program_id, name, order_index, warmup_note, rest_between_exercises_sec)
  values (prog_id, 'SÉANCE 3 : DOS + BICEPS', 2, '5 min de rameur', 120)
  returning id into s3_id;

  insert into program_sessions (program_id, name, order_index, warmup_note, rest_between_exercises_sec)
  values (prog_id, 'SÉANCE 4 : ÉPAULES + TRICEPS', 3, '5 min de vélo', 120)
  returning id into s4_id;

  -- ── SÉANCE 1 : JAMBES ────────────────────────────────────
  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s1_id, 'Leg Extension', 0, 3, '15', 90, '5s de contraction à la 15ème rép');

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s1_id, 'Hack Squat', 1, 4, '10', 90, 'Dégressive sur 3 étapes dernière série');

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s1_id, 'Presse à cuisses', 2, 4, '10', 90, 'Dégressive sur 3 étapes dernière série');

  -- superset: Fentes haltères + Leg curl
  e1_4a := gen_random_uuid(); e1_4b := gen_random_uuid();
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e1_4a, s1_id, 'Fentes haltères', 3, 4, '12', 90, true);
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e1_4b, s1_id, 'Leg curl', 4, 4, '12', 90, true);
  update program_exercises set superset_with_id = e1_4b where id = e1_4a;
  update program_exercises set superset_with_id = e1_4a where id = e1_4b;

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec)
  values (s1_id, 'Extension mollet debout', 5, 4, '12', 60);

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec)
  values (s1_id, 'Mollets assis machine', 6, 4, '12', 60);

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec)
  values (s1_id, 'Avant-bras barre flexions poignets', 7, 4, '12', 60);

  -- ── SÉANCE 2 : PEC + BRAS ────────────────────────────────
  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s2_id, 'Écarté à la poulie basse', 0, 3, '15', 90, '5s contraction à la 15ème rép');

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s2_id, 'Développé incliné haltère', 1, 4, '10', 90, 'Dégressive sur 3 étapes dernière série');

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s2_id, 'Développé assis machine', 2, 4, '10', 90, 'Dégressive sur 3 étapes dernière série');

  -- superset: Écarté pec deck + Dips penché
  e2_4a := gen_random_uuid(); e2_4b := gen_random_uuid();
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e2_4a, s2_id, 'Écarté pec deck', 3, 4, '12', 90, true);
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e2_4b, s2_id, 'Dips penché', 4, 4, '12', 90, true);
  update program_exercises set superset_with_id = e2_4b where id = e2_4a;
  update program_exercises set superset_with_id = e2_4a where id = e2_4b;

  -- superset: Biceps curl barre EZ + Triceps poulie supination
  e2_5a := gen_random_uuid(); e2_5b := gen_random_uuid();
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e2_5a, s2_id, 'Biceps curl barre EZ', 5, 4, '12', 60, true);
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e2_5b, s2_id, 'Triceps poulie supination', 6, 4, '12', 60, true);
  update program_exercises set superset_with_id = e2_5b where id = e2_5a;
  update program_exercises set superset_with_id = e2_5a where id = e2_5b;

  -- superset: Biceps poulie corde + Triceps poulie corde
  e2_6a := gen_random_uuid(); e2_6b := gen_random_uuid();
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e2_6a, s2_id, 'Biceps poulie corde', 7, 4, '12', 60, true);
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e2_6b, s2_id, 'Triceps poulie corde', 8, 4, '12', 60, true);
  update program_exercises set superset_with_id = e2_6b where id = e2_6a;
  update program_exercises set superset_with_id = e2_6a where id = e2_6b;

  -- superset: Crunch poulie corde + Relevé jambes dips
  e2_7a := gen_random_uuid(); e2_7b := gen_random_uuid();
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e2_7a, s2_id, 'Crunch poulie corde', 9, 4, '12', 60, true);
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e2_7b, s2_id, 'Relevé jambes dips', 10, 4, '12', 60, true);
  update program_exercises set superset_with_id = e2_7b where id = e2_7a;
  update program_exercises set superset_with_id = e2_7a where id = e2_7b;

  -- ── SÉANCE 3 : DOS + BICEPS ──────────────────────────────
  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s3_id, 'Pull over corde poulie haute', 0, 3, '15', 90, '5s de contraction à la 15ème rép');

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s3_id, 'T-bar', 1, 4, '10', 90, 'Dégressive sur 3 étapes dernière série');

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s3_id, 'Tirage vertical prise large', 2, 4, '10', 90, 'Dégressive sur 3 étapes dernière série');

  -- superset: Tirage horizontal + Tirage vertical triangle
  e3_4a := gen_random_uuid(); e3_4b := gen_random_uuid();
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e3_4a, s3_id, 'Tirage horizontal', 3, 4, '12', 90, true);
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e3_4b, s3_id, 'Tirage vertical triangle', 4, 4, '12', 90, true);
  update program_exercises set superset_with_id = e3_4b where id = e3_4a;
  update program_exercises set superset_with_id = e3_4a where id = e3_4b;

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec)
  values (s3_id, 'Curl haltère banc incliné', 5, 4, '10', 60);

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec)
  values (s3_id, 'Curl haltères prise marteau unilatérale', 6, 4, '12', 60);

  -- ── SÉANCE 4 : ÉPAULES + TRICEPS ─────────────────────────
  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s4_id, 'Oiseau poulie haute allongé', 0, 3, '15', 90, '5s de contraction à la 15ème rép');

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s4_id, 'Développé militaire Smith Machine 110°', 1, 4, '10', 90, 'Dégressive sur 3 étapes dernière série');

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec, technique)
  values (s4_id, 'Développé assis haltères banc 90°', 2, 4, '10', 90, 'Dégressive sur 3 étapes dernière série');

  -- superset: Élévation latérale supination + Shrug haltères
  e4_4a := gen_random_uuid(); e4_4b := gen_random_uuid();
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e4_4a, s4_id, 'Élévation latérale supination', 3, 4, '12', 90, true);
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e4_4b, s4_id, 'Shrug haltères', 4, 4, '12', 90, true);
  update program_exercises set superset_with_id = e4_4b where id = e4_4a;
  update program_exercises set superset_with_id = e4_4a where id = e4_4b;

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec)
  values (s4_id, 'Barre EZ au front banc incliné', 5, 4, '10', 90);

  insert into program_exercises (session_id, name, order_index, target_sets, target_reps, rest_sec)
  values (s4_id, 'Triceps poulie corde unilatéral', 6, 4, '12', 60);

  -- superset: Crunch poulie corde + Relevé jambes dips
  e4_7a := gen_random_uuid(); e4_7b := gen_random_uuid();
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e4_7a, s4_id, 'Crunch poulie corde', 7, 4, '12', 60, true);
  insert into program_exercises (id, session_id, name, order_index, target_sets, target_reps, rest_sec, is_superset)
  values (e4_7b, s4_id, 'Relevé jambes dips', 8, 4, '12', 60, true);
  update program_exercises set superset_with_id = e4_7b where id = e4_7a;
  update program_exercises set superset_with_id = e4_7a where id = e4_7b;

  -- ── schedule ─────────────────────────────────────────────
  insert into program_schedules (program_id, day_of_week, session_id)
  values (prog_id, 0, s1_id);  -- Monday: Jambes

  insert into program_schedules (program_id, day_of_week, session_id)
  values (prog_id, 1, s2_id);  -- Tuesday: Pec + Bras

  insert into program_schedules (program_id, day_of_week, session_id, rest_label)
  values (prog_id, 2, null, 'Cardio Statique 45 à 60 min');  -- Wednesday: rest + cardio

  insert into program_schedules (program_id, day_of_week, session_id)
  values (prog_id, 3, s1_id);  -- Thursday: Jambes (retard)

  insert into program_schedules (program_id, day_of_week, session_id)
  values (prog_id, 4, s4_id);  -- Friday: Épaules + Triceps

  insert into program_schedules (program_id, day_of_week, session_id, rest_label)
  values (prog_id, 5, s3_id, 'Cardio HIIT 15-20 min');  -- Saturday: Dos + Biceps + HIIT

  insert into program_schedules (program_id, day_of_week, session_id, rest_label)
  values (prog_id, 6, null, 'Cardio Statique 45 à 60 min');  -- Sunday: rest + cardio

end $$;
