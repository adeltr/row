-- Phase 1 migration: Monthly/Yearly Objectives, Habits, Routine Tracker
-- Run in Supabase Dashboard → SQL Editor. Do NOT drop existing tables.

-- ── Monthly Objectives ────────────────────────────────────────────────────────

create table if not exists monthly_objectives (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  title            text        not null,
  description      text,
  month            int         not null check (month between 1 and 12),
  year             int         not null,
  category         text,
  target_date      date,
  status           text        not null default 'Active'
                               check (status in ('Active','Completed','Abandoned')),
  progress_mode    text        not null default 'auto'
                               check (progress_mode in ('auto','manual')),
  manual_progress  int         default 0 check (manual_progress between 0 and 100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table monthly_objectives enable row level security;

create policy "mo_select" on monthly_objectives
  for select using (auth.uid() = user_id);
create policy "mo_insert" on monthly_objectives
  for insert with check (auth.uid() = user_id);
create policy "mo_update" on monthly_objectives
  for update using (auth.uid() = user_id);
create policy "mo_delete" on monthly_objectives
  for delete using (auth.uid() = user_id);

-- ── Yearly Objectives ─────────────────────────────────────────────────────────

create table if not exists yearly_objectives (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  title            text        not null,
  description      text,
  year             int         not null,
  category         text,
  target_date      date,
  status           text        not null default 'Active'
                               check (status in ('Active','Completed','Abandoned')),
  progress_mode    text        not null default 'auto'
                               check (progress_mode in ('auto','manual')),
  manual_progress  int         default 0 check (manual_progress between 0 and 100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table yearly_objectives enable row level security;

create policy "yo_select" on yearly_objectives
  for select using (auth.uid() = user_id);
create policy "yo_insert" on yearly_objectives
  for insert with check (auth.uid() = user_id);
create policy "yo_update" on yearly_objectives
  for update using (auth.uid() = user_id);
create policy "yo_delete" on yearly_objectives
  for delete using (auth.uid() = user_id);

-- ── Habits ────────────────────────────────────────────────────────────────────

create table if not exists habits (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  icon         text,
  target_value numeric,
  unit         text,
  active       boolean     not null default true,
  order_index  int         not null default 0,
  created_at   timestamptz not null default now()
);

alter table habits enable row level security;

create policy "habits_select" on habits
  for select using (auth.uid() = user_id);
create policy "habits_insert" on habits
  for insert with check (auth.uid() = user_id);
create policy "habits_update" on habits
  for update using (auth.uid() = user_id);
create policy "habits_delete" on habits
  for delete using (auth.uid() = user_id);

-- ── Habit Logs ────────────────────────────────────────────────────────────────

create table if not exists habit_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  habit_id   uuid        not null references habits(id) on delete cascade,
  date       date        not null,
  completed  boolean     not null default false,
  value      numeric,
  notes      text,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

alter table habit_logs enable row level security;

create policy "habit_logs_select" on habit_logs
  for select using (auth.uid() = user_id);
create policy "habit_logs_insert" on habit_logs
  for insert with check (auth.uid() = user_id);
create policy "habit_logs_update" on habit_logs
  for update using (auth.uid() = user_id);
create policy "habit_logs_delete" on habit_logs
  for delete using (auth.uid() = user_id);

-- ── Day Notes ─────────────────────────────────────────────────────────────────

create table if not exists day_notes (
  id      uuid    primary key default gen_random_uuid(),
  user_id uuid    not null references auth.users(id) on delete cascade,
  date    date    not null,
  note    text    not null,
  unique (user_id, date)
);

alter table day_notes enable row level security;

create policy "day_notes_select" on day_notes
  for select using (auth.uid() = user_id);
create policy "day_notes_insert" on day_notes
  for insert with check (auth.uid() = user_id);
create policy "day_notes_update" on day_notes
  for update using (auth.uid() = user_id);
create policy "day_notes_delete" on day_notes
  for delete using (auth.uid() = user_id);

-- ── Challenges ────────────────────────────────────────────────────────────────

create table if not exists challenges (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  name          text        not null,
  duration_days int         not null check (duration_days > 0),
  start_date    date        not null,
  end_date      date        generated always as (start_date + (duration_days - 1) * interval '1 day') stored,
  habit_ids     uuid[]      not null default '{}',
  mode          text        not null default 'strict'
                            check (mode in ('strict','lenient')),
  status        text        not null default 'active'
                            check (status in ('active','completed','abandoned')),
  created_at    timestamptz not null default now()
);

alter table challenges enable row level security;

create policy "challenges_select" on challenges
  for select using (auth.uid() = user_id);
create policy "challenges_insert" on challenges
  for insert with check (auth.uid() = user_id);
create policy "challenges_update" on challenges
  for update using (auth.uid() = user_id);
create policy "challenges_delete" on challenges
  for delete using (auth.uid() = user_id);

-- ── Modify goals table ────────────────────────────────────────────────────────

alter table goals
  add column if not exists linked_monthly_id uuid
    references monthly_objectives(id) on delete set null;

alter table goals
  add column if not exists linked_yearly_id uuid
    references yearly_objectives(id) on delete set null;
