-- =============================================================
-- Phase 0 full schema migration
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run
--
-- NOTE: Run ONLY this file. Skip migrations/001_time_blocks.sql —
--       this migration creates time_blocks correctly with user_id.
-- =============================================================

-- ── GOALS ─────────────────────────────────────────────────────

create table if not exists goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  text            text not null,
  done            boolean default false,
  done_at         timestamptz,
  queued          boolean default false,
  position        int default 0,
  created_at      timestamptz default now()
);

create table if not exists goal_streaks (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  count               int default 0,
  last_processed_date date
);

-- ── SUPPLEMENT STACK ──────────────────────────────────────────

create table if not exists stack_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  dose       text,
  window     text default 'anytime' check (window in ('morning','lunch','evening','anytime')),
  note       text,
  tag        text,
  ordered    boolean default true,
  low_stock  boolean default false,
  position   int default 0,
  created_at timestamptz default now()
);

create table if not exists stack_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  stack_item_id uuid not null references stack_items(id) on delete cascade,
  date          date not null,
  taken_at      timestamptz default now(),
  unique (user_id, stack_item_id, date)
);

-- ── WATER ─────────────────────────────────────────────────────

create table if not exists water_profile (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  unit                 text default 'bottle',
  bottle_ml            int default 500,
  glass_ml             int default 250,
  weight_kg            numeric,
  weight_unit          text default 'kg',
  age                  int,
  sex                  text,
  activity_hrs_per_week numeric,
  caffeine_mg_per_day  int default 200,
  substances           jsonb default '[]'::jsonb
);

create table if not exists water_logs (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  count   int default 0,
  unique (user_id, date)
);

-- ── GYM ───────────────────────────────────────────────────────

create table if not exists gym_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  units   text default 'kg'
);

create table if not exists gyms (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists workout_days (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  name     text not null,
  position int default 0
);

create table if not exists exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  day_id     uuid references workout_days(id) on delete set null,
  position   int default 0,
  created_at timestamptz default now()
);

create table if not exists exercise_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  date        date not null,
  sets        jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now(),
  unique (user_id, exercise_id, date)
);

create table if not exists workout_completion (
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  done    boolean default true,
  primary key (user_id, date)
);

create table if not exists body_weight_logs (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  weight  numeric not null,
  unit    text default 'kg',
  unique (user_id, date)
);

create table if not exists gym_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  storage_path text not null,
  created_at   timestamptz default now()
);

create table if not exists split_rotation (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  rotation jsonb,
  anchor   date
);

-- ── TIME BLOCKS ───────────────────────────────────────────────
-- Creates fresh OR updates existing table from 001_time_blocks.sql.

create table if not exists public.time_blocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  title       text not null,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  category    text,
  color       text,
  notes       text,
  linked_goal text,
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Add user_id if table already existed without it (idempotent)
alter table public.time_blocks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists time_blocks_start_time_idx on public.time_blocks (start_time);
create index if not exists time_blocks_user_date_idx on public.time_blocks (user_id, start_time);

-- ── FINANCE ───────────────────────────────────────────────────

create table if not exists finance_profile (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  currency text default 'EUR'
);

create table if not exists finance_assets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null check (category in ('bank','stocks','crypto','other')),
  name       text not null,
  amount     numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists finance_activity (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date    timestamptz default now(),
  action  text not null,
  details jsonb
);

create table if not exists finance_history (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date    date not null,
  total   numeric not null,
  unique (user_id, date)
);

create table if not exists finance_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  amount           numeric not null default 0,
  period           text default 'monthly' check (period in ('monthly','yearly','weekly')),
  renewal          date,
  entered_amount   numeric,
  entered_currency text default 'CHF',
  from_cat         text check (from_cat in ('bank','stocks','crypto','other')),
  from_account     text,
  auto_deduct      boolean default false,
  last_deducted_at timestamptz,
  created_at       timestamptz default now()
);

create table if not exists finance_wishlist (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  amount           numeric,
  entered_amount   numeric,
  entered_currency text default 'CHF',
  created_at       timestamptz default now()
);

create table if not exists finance_orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  amount           numeric default 0,
  entered_amount   numeric,
  entered_currency text default 'CHF',
  from_cat         text check (from_cat in ('bank','stocks','crypto','other')),
  from_account     text,
  date             date,
  deducted_at      timestamptz,
  pct_at_deduction numeric,
  deducted_from    jsonb,
  created_at       timestamptz default now()
);

-- ── ENABLE RLS ────────────────────────────────────────────────

alter table goals enable row level security;
alter table goal_streaks enable row level security;
alter table stack_items enable row level security;
alter table stack_logs enable row level security;
alter table water_profile enable row level security;
alter table water_logs enable row level security;
alter table gym_profile enable row level security;
alter table gyms enable row level security;
alter table workout_days enable row level security;
alter table exercises enable row level security;
alter table exercise_logs enable row level security;
alter table workout_completion enable row level security;
alter table body_weight_logs enable row level security;
alter table gym_photos enable row level security;
alter table split_rotation enable row level security;
alter table public.time_blocks enable row level security;
alter table finance_profile enable row level security;
alter table finance_assets enable row level security;
alter table finance_activity enable row level security;
alter table finance_history enable row level security;
alter table finance_subscriptions enable row level security;
alter table finance_wishlist enable row level security;
alter table finance_orders enable row level security;

-- ── DROP OLD OPEN-ANON time_blocks POLICIES ───────────────────

drop policy if exists "anon select" on public.time_blocks;
drop policy if exists "anon insert" on public.time_blocks;
drop policy if exists "anon update" on public.time_blocks;
drop policy if exists "anon delete" on public.time_blocks;

-- ── OWNER-ONLY POLICIES ───────────────────────────────────────

-- goals
create policy "goals_select" on goals for select using (auth.uid() = user_id);
create policy "goals_insert" on goals for insert with check (auth.uid() = user_id);
create policy "goals_update" on goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_delete" on goals for delete using (auth.uid() = user_id);

-- goal_streaks
create policy "goal_streaks_select" on goal_streaks for select using (auth.uid() = user_id);
create policy "goal_streaks_insert" on goal_streaks for insert with check (auth.uid() = user_id);
create policy "goal_streaks_update" on goal_streaks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goal_streaks_delete" on goal_streaks for delete using (auth.uid() = user_id);

-- stack_items
create policy "stack_items_select" on stack_items for select using (auth.uid() = user_id);
create policy "stack_items_insert" on stack_items for insert with check (auth.uid() = user_id);
create policy "stack_items_update" on stack_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "stack_items_delete" on stack_items for delete using (auth.uid() = user_id);

-- stack_logs
create policy "stack_logs_select" on stack_logs for select using (auth.uid() = user_id);
create policy "stack_logs_insert" on stack_logs for insert with check (auth.uid() = user_id);
create policy "stack_logs_update" on stack_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "stack_logs_delete" on stack_logs for delete using (auth.uid() = user_id);

-- water_profile
create policy "water_profile_select" on water_profile for select using (auth.uid() = user_id);
create policy "water_profile_insert" on water_profile for insert with check (auth.uid() = user_id);
create policy "water_profile_update" on water_profile for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "water_profile_delete" on water_profile for delete using (auth.uid() = user_id);

-- water_logs
create policy "water_logs_select" on water_logs for select using (auth.uid() = user_id);
create policy "water_logs_insert" on water_logs for insert with check (auth.uid() = user_id);
create policy "water_logs_update" on water_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "water_logs_delete" on water_logs for delete using (auth.uid() = user_id);

-- gym_profile
create policy "gym_profile_select" on gym_profile for select using (auth.uid() = user_id);
create policy "gym_profile_insert" on gym_profile for insert with check (auth.uid() = user_id);
create policy "gym_profile_update" on gym_profile for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gym_profile_delete" on gym_profile for delete using (auth.uid() = user_id);

-- gyms
create policy "gyms_select" on gyms for select using (auth.uid() = user_id);
create policy "gyms_insert" on gyms for insert with check (auth.uid() = user_id);
create policy "gyms_update" on gyms for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gyms_delete" on gyms for delete using (auth.uid() = user_id);

-- workout_days
create policy "workout_days_select" on workout_days for select using (auth.uid() = user_id);
create policy "workout_days_insert" on workout_days for insert with check (auth.uid() = user_id);
create policy "workout_days_update" on workout_days for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_days_delete" on workout_days for delete using (auth.uid() = user_id);

-- exercises
create policy "exercises_select" on exercises for select using (auth.uid() = user_id);
create policy "exercises_insert" on exercises for insert with check (auth.uid() = user_id);
create policy "exercises_update" on exercises for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercises_delete" on exercises for delete using (auth.uid() = user_id);

-- exercise_logs
create policy "exercise_logs_select" on exercise_logs for select using (auth.uid() = user_id);
create policy "exercise_logs_insert" on exercise_logs for insert with check (auth.uid() = user_id);
create policy "exercise_logs_update" on exercise_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercise_logs_delete" on exercise_logs for delete using (auth.uid() = user_id);

-- workout_completion
create policy "workout_completion_select" on workout_completion for select using (auth.uid() = user_id);
create policy "workout_completion_insert" on workout_completion for insert with check (auth.uid() = user_id);
create policy "workout_completion_update" on workout_completion for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_completion_delete" on workout_completion for delete using (auth.uid() = user_id);

-- body_weight_logs
create policy "body_weight_logs_select" on body_weight_logs for select using (auth.uid() = user_id);
create policy "body_weight_logs_insert" on body_weight_logs for insert with check (auth.uid() = user_id);
create policy "body_weight_logs_update" on body_weight_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "body_weight_logs_delete" on body_weight_logs for delete using (auth.uid() = user_id);

-- gym_photos
create policy "gym_photos_select" on gym_photos for select using (auth.uid() = user_id);
create policy "gym_photos_insert" on gym_photos for insert with check (auth.uid() = user_id);
create policy "gym_photos_update" on gym_photos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gym_photos_delete" on gym_photos for delete using (auth.uid() = user_id);

-- split_rotation
create policy "split_rotation_select" on split_rotation for select using (auth.uid() = user_id);
create policy "split_rotation_insert" on split_rotation for insert with check (auth.uid() = user_id);
create policy "split_rotation_update" on split_rotation for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "split_rotation_delete" on split_rotation for delete using (auth.uid() = user_id);

-- time_blocks
create policy "time_blocks_select" on public.time_blocks for select using (auth.uid() = user_id);
create policy "time_blocks_insert" on public.time_blocks for insert with check (auth.uid() = user_id);
create policy "time_blocks_update" on public.time_blocks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "time_blocks_delete" on public.time_blocks for delete using (auth.uid() = user_id);

-- finance_profile
create policy "finance_profile_select" on finance_profile for select using (auth.uid() = user_id);
create policy "finance_profile_insert" on finance_profile for insert with check (auth.uid() = user_id);
create policy "finance_profile_update" on finance_profile for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "finance_profile_delete" on finance_profile for delete using (auth.uid() = user_id);

-- finance_assets
create policy "finance_assets_select" on finance_assets for select using (auth.uid() = user_id);
create policy "finance_assets_insert" on finance_assets for insert with check (auth.uid() = user_id);
create policy "finance_assets_update" on finance_assets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "finance_assets_delete" on finance_assets for delete using (auth.uid() = user_id);

-- finance_activity
create policy "finance_activity_select" on finance_activity for select using (auth.uid() = user_id);
create policy "finance_activity_insert" on finance_activity for insert with check (auth.uid() = user_id);
create policy "finance_activity_update" on finance_activity for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "finance_activity_delete" on finance_activity for delete using (auth.uid() = user_id);

-- finance_history
create policy "finance_history_select" on finance_history for select using (auth.uid() = user_id);
create policy "finance_history_insert" on finance_history for insert with check (auth.uid() = user_id);
create policy "finance_history_update" on finance_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "finance_history_delete" on finance_history for delete using (auth.uid() = user_id);

-- finance_subscriptions
create policy "finance_subscriptions_select" on finance_subscriptions for select using (auth.uid() = user_id);
create policy "finance_subscriptions_insert" on finance_subscriptions for insert with check (auth.uid() = user_id);
create policy "finance_subscriptions_update" on finance_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "finance_subscriptions_delete" on finance_subscriptions for delete using (auth.uid() = user_id);

-- finance_wishlist
create policy "finance_wishlist_select" on finance_wishlist for select using (auth.uid() = user_id);
create policy "finance_wishlist_insert" on finance_wishlist for insert with check (auth.uid() = user_id);
create policy "finance_wishlist_update" on finance_wishlist for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "finance_wishlist_delete" on finance_wishlist for delete using (auth.uid() = user_id);

-- finance_orders
create policy "finance_orders_select" on finance_orders for select using (auth.uid() = user_id);
create policy "finance_orders_insert" on finance_orders for insert with check (auth.uid() = user_id);
create policy "finance_orders_update" on finance_orders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "finance_orders_delete" on finance_orders for delete using (auth.uid() = user_id);

-- ── STORAGE BUCKET: gym-photos ────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gym-photos',
  'gym-photos',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;

-- Objects scoped to auth.uid() as first path segment: {user_id}/{filename}
create policy "gym_photos_storage_select" on storage.objects
  for select using (
    bucket_id = 'gym-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gym_photos_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'gym-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gym_photos_storage_update" on storage.objects
  for update using (
    bucket_id = 'gym-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "gym_photos_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'gym-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── TRIGGER: updated_at for time_blocks ───────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists time_blocks_updated_at on public.time_blocks;
create trigger time_blocks_updated_at
  before update on public.time_blocks
  for each row execute function public.set_updated_at();
