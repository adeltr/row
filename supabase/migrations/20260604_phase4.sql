-- Phase 4 migration — All In rebranding + integrations + onboarding
-- Run once in Supabase SQL Editor (safe to re-run — all idempotent).

-- ── Step 2: Gym → Nutrition integration ──────────────────────────────────────
-- Stores estimated calories burned per workout session (duration_min × 6 kcal).
alter table workout_logs add column if not exists calories_burned integer;

-- ── Step 5: Onboarding wizard ─────────────────────────────────────────────────
create table if not exists user_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  avatar_url           text,
  onboarding_completed boolean default false,
  created_at           timestamptz default now()
);

alter table user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'user_profiles' and policyname = 'user_profiles_select'
  ) then
    create policy "user_profiles_select" on user_profiles
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'user_profiles' and policyname = 'user_profiles_insert'
  ) then
    create policy "user_profiles_insert" on user_profiles
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'user_profiles' and policyname = 'user_profiles_update'
  ) then
    create policy "user_profiles_update" on user_profiles
      for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'user_profiles' and policyname = 'user_profiles_delete'
  ) then
    create policy "user_profiles_delete" on user_profiles
      for delete using (auth.uid() = user_id);
  end if;
end $$;
