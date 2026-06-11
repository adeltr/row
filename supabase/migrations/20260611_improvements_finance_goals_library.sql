-- ============================================================
-- Phase: Improvements — Finance Cash Flow + Library + Goals
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1A. FINANCE — Monthly Cash Flow
-- ─────────────────────────────────────────────────────────────

create table if not exists cash_flow_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  month        int not null check (month between 1 and 12),
  year         int not null,
  direction    text not null check (direction in ('income','expense')),
  category     text not null,
  subcategory  text,
  name         text not null,
  amount       numeric not null default 0,
  is_recurring boolean default false,
  notes        text,
  created_at   timestamptz default now()
);

create table if not exists cash_flow_monthly_snapshots (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  month          int not null,
  year           int not null,
  total_income   numeric default 0,
  total_expenses numeric default 0,
  net_savings    numeric default 0,
  savings_rate   numeric default 0,
  breakdown      jsonb default '{}'::jsonb,
  created_at     timestamptz default now(),
  unique (user_id, month, year)
);

create table if not exists financial_advice_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  month        int not null,
  year         int not null,
  health_score int check (health_score between 0 and 100),
  insights     jsonb not null default '[]'::jsonb,
  actions      jsonb not null default '[]'::jsonb,
  created_at   timestamptz default now(),
  unique (user_id, month, year)
);

-- ─────────────────────────────────────────────────────────────
-- 1B. LIBRARY
-- ─────────────────────────────────────────────────────────────

create table if not exists books (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  author              text,
  category            text,
  difficulty          text check (difficulty in ('easy','medium','hard','expert')),
  pages               int,
  status              text not null default 'queue' check (status in ('queue','reading','completed','abandoned')),
  priority            int default 3 check (priority between 1 and 5),
  estimated_hours     numeric,
  cover_url           text,
  started_at          date,
  finished_at         date,
  rating              int check (rating between 1 and 5),
  personal_notes      text,
  key_takeaways       jsonb default '[]'::jsonb,
  current_page        int default 0,
  linked_objective_id uuid references monthly_objectives(id) on delete set null,
  linked_yearly_id    uuid references yearly_objectives(id) on delete set null,
  tags                jsonb default '[]'::jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists book_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  book_id    uuid not null references books(id) on delete cascade,
  page       int,
  chapter    text,
  note_type  text default 'note' check (note_type in ('note','quote','idea','summary')),
  content    text not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 1C. ALTER existing tables
-- ─────────────────────────────────────────────────────────────

alter table goals add column if not exists linked_book_id uuid references books(id) on delete set null;

-- ─────────────────────────────────────────────────────────────
-- RLS — cash_flow_entries
-- ─────────────────────────────────────────────────────────────

alter table cash_flow_entries enable row level security;

create policy "cfe_select" on cash_flow_entries for select using (auth.uid() = user_id);
create policy "cfe_insert" on cash_flow_entries for insert with check (auth.uid() = user_id);
create policy "cfe_update" on cash_flow_entries for update using (auth.uid() = user_id);
create policy "cfe_delete" on cash_flow_entries for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- RLS — cash_flow_monthly_snapshots
-- ─────────────────────────────────────────────────────────────

alter table cash_flow_monthly_snapshots enable row level security;

create policy "cfms_select" on cash_flow_monthly_snapshots for select using (auth.uid() = user_id);
create policy "cfms_insert" on cash_flow_monthly_snapshots for insert with check (auth.uid() = user_id);
create policy "cfms_update" on cash_flow_monthly_snapshots for update using (auth.uid() = user_id);
create policy "cfms_delete" on cash_flow_monthly_snapshots for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- RLS — financial_advice_logs
-- ─────────────────────────────────────────────────────────────

alter table financial_advice_logs enable row level security;

create policy "fal_select" on financial_advice_logs for select using (auth.uid() = user_id);
create policy "fal_insert" on financial_advice_logs for insert with check (auth.uid() = user_id);
create policy "fal_update" on financial_advice_logs for update using (auth.uid() = user_id);
create policy "fal_delete" on financial_advice_logs for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- RLS — books
-- ─────────────────────────────────────────────────────────────

alter table books enable row level security;

create policy "books_select" on books for select using (auth.uid() = user_id);
create policy "books_insert" on books for insert with check (auth.uid() = user_id);
create policy "books_update" on books for update using (auth.uid() = user_id);
create policy "books_delete" on books for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- RLS — book_notes (scoped through parent book ownership)
-- ─────────────────────────────────────────────────────────────

alter table book_notes enable row level security;

create policy "bn_select" on book_notes for select
  using (exists (select 1 from books where books.id = book_notes.book_id and books.user_id = auth.uid()));

create policy "bn_insert" on book_notes for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from books where books.id = book_notes.book_id and books.user_id = auth.uid())
  );

create policy "bn_update" on book_notes for update
  using (exists (select 1 from books where books.id = book_notes.book_id and books.user_id = auth.uid()));

create policy "bn_delete" on book_notes for delete
  using (exists (select 1 from books where books.id = book_notes.book_id and books.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

create index if not exists cash_flow_entries_user_month on cash_flow_entries (user_id, year, month);
create index if not exists books_user_status on books (user_id, status);
create index if not exists book_notes_book on book_notes (book_id);
