-- Migration 001: time_blocks table
-- Run this in the Supabase SQL editor for your project.
-- RLS mirrors the open-anon pattern used by the existing app_state table.

create table if not exists public.time_blocks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  start_time  timestamptz not null,
  end_time    timestamptz not null,
  category    text,
  color       text,
  notes       text,
  linked_goal text,      -- stores the goal text string (goals live in localStorage)
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast date-range queries
create index if not exists time_blocks_start_time_idx on public.time_blocks (start_time);

-- Enable RLS
alter table public.time_blocks enable row level security;

-- Open anon policies (matches existing app_state approach — personal dashboard, no auth)
create policy "anon select" on public.time_blocks
  for select to anon using (true);

create policy "anon insert" on public.time_blocks
  for insert to anon with check (true);

create policy "anon update" on public.time_blocks
  for update to anon using (true) with check (true);

create policy "anon delete" on public.time_blocks
  for delete to anon using (true);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger time_blocks_updated_at
  before update on public.time_blocks
  for each row execute function public.set_updated_at();
