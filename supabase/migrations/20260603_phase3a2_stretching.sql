-- ══════════════════════════════════════════════════════════════════
-- Phase 3A-2 — Stretching
-- ══════════════════════════════════════════════════════════════════

-- ── stretch_routines ──────────────────────────────────────────────
create table if not exists stretch_routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

alter table stretch_routines enable row level security;

create policy "stretch_routines_owner" on stretch_routines
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── stretches ─────────────────────────────────────────────────────
create table if not exists stretches (
  id           uuid primary key default gen_random_uuid(),
  routine_id   uuid not null references stretch_routines(id) on delete cascade,
  name         text not null,
  description  text,
  duration_sec int default 30,
  photo_url    text,
  order_index  int default 0,
  created_at   timestamptz default now()
);

alter table stretches enable row level security;

-- select: user owns parent routine
create policy "stretches_select" on stretches
  for select using (
    exists (
      select 1 from stretch_routines r
      where r.id = stretches.routine_id
        and r.user_id = auth.uid()
    )
  );

-- insert/update/delete: user owns parent routine
create policy "stretches_insert" on stretches
  for insert with check (
    exists (
      select 1 from stretch_routines r
      where r.id = stretches.routine_id
        and r.user_id = auth.uid()
    )
  );

create policy "stretches_update" on stretches
  for update using (
    exists (
      select 1 from stretch_routines r
      where r.id = stretches.routine_id
        and r.user_id = auth.uid()
    )
  );

create policy "stretches_delete" on stretches
  for delete using (
    exists (
      select 1 from stretch_routines r
      where r.id = stretches.routine_id
        and r.user_id = auth.uid()
    )
  );

-- ── stretching_logs ───────────────────────────────────────────────
create table if not exists stretching_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  routine_id  uuid references stretch_routines(id) on delete set null,
  date        date not null,
  duration_min int,
  notes       text,
  created_at  timestamptz default now()
);

alter table stretching_logs enable row level security;

create policy "stretching_logs_owner" on stretching_logs
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Storage bucket: stretch-photos ────────────────────────────────
-- Run in Supabase dashboard → Storage if bucket doesn't exist yet.
-- The bucket must be created manually (private) with these policies:

-- insert policy (authenticated, path must start with auth.uid()::text):
--   bucket_id = 'stretch-photos'
--   AND (storage.foldername(name))[1] = auth.uid()::text

-- select policy:
--   bucket_id = 'stretch-photos'
--   AND (storage.foldername(name))[1] = auth.uid()::text

-- update/delete policy: same condition as select

-- SQL for storage policies (run after creating bucket):
insert into storage.buckets (id, name, public)
values ('stretch-photos', 'stretch-photos', false)
on conflict (id) do nothing;

create policy "stretch_photos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'stretch-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "stretch_photos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'stretch-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "stretch_photos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'stretch-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "stretch_photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'stretch-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
