# Phase 3A-1 — Programs + Workout Player + History + Stats (2026-06-03)

## SQL migration
File: `supabase/migrations/20260603_phase3a1_programs.sql`  
Run in Supabase SQL Editor — idempotent (safe to re-run).  
New tables: `programs`, `program_sessions`, `program_exercises`, `program_schedules`, `user_active_programs`, `workout_logs`, `program_ratings`.  
Seeded official program: **"Sèche Essan — 7 semaines"** (`is_official=true`, 4 sessions, 8 superset pairs).

## New JS modules
- `js/programs-data.js` — full programs CRUD + schedule + copy + active program
- `js/workouts-data.js` — workout log start/finish, set logging, previous performance, history

## gym.html restructure
- 3 outer tabs: **STRENGTH | STRETCHING | RUNNING** (localStorage `gym:active_tab`)
- STRENGTH has 4 sub-tabs: **PROGRAMS | FREESTYLE | HISTORY | STATS** (localStorage `gym:strength_tab`)
- Active program banner shows today's session + Start Workout button
- All sub-tabs lazy-init on first visit

## PROGRAMS sub-tab
- Marketplace grid with goal/level/sort filters and search
- Program detail: sessions expandable, schedule mini-calendar, Copy + Set Active + Edit
- My Programs list with edit/delete/set-active
- Program editor: create/edit program, session editor overlay with exercises + weekly schedule

## Workout Player (Step 5)
- Full-screen overlay — `#wpOverlay`
- Exercise card with sets table (# | PREV | KG | REPS | ✓) — Hevy-style
- Previous performance pre-filled from last session
- Rest timer with green→yellow→red color shift, −30s / SKIP / +30s, vibration on complete
- Superset support: auto-switches to partner exercise, rest only after both done
- Auto-advance countdown (5s) after last set, with "Stay" option
- Finish modal: duration / sets / volume stats, feeling picker, notes, Save
- Entry from banner "Start Workout" and from "▶ Start" in session detail

## HISTORY sub-tab (Step 6)
- Paginated list of past workouts: date, session name, feeling emoji, duration, volume
- Detail view: all exercises with per-set weight/reps
- "Load more" pagination (20 per page)

## STATS sub-tab — PR Tracker (Step 7)
- Weight tracker was already present (from prior phase)
- PR Tracker: Epley 1RM (`weight × (1 + reps/30)`) per exercise
- Sortable: TOP 1RM / RECENT / A→Z
- SVG sparkline for each exercise (last 10 sessions)
- Handles both freestyle (`s.weight`) and workout-player (`s.weight_kg`) set formats

---

# Phase 2 Step 4 — NUTRITION tab full UI (2026-06-03)

Full nutrition tracker built inside `health.html` NUTRITION tab:
- Calorie ring: SVG circle progress, color-coded (green/amber/red vs target). Circumference r=50, dash=314.
- 3 macro bars: Protein (green), Carbs (blue), Fat (amber), each with % of target fill.
- Target breakdown panel (collapsible): BMR → TDEE → goal adj → gym bonus.
- Date navigator: prev/next day with localStorage-persisted `_nutDate`; next-day disabled when today.
- 4 meal slots (Breakfast/Lunch/Dinner/Snacks): collapsible, open state preserved across renders.
- Inline food picker per meal: search input → async `loadFoods()` autocomplete dropdown (debounced 220ms) → portion input → preview → confirm.
- "Add custom food" flow: from dropdown → modal → auto-selects new food in picker.
- Quick favorites: top 10 used foods (last 30 days) as chip buttons — clicking opens picker in first open meal.
- Weekly summary: SVG bar chart (7 days, target line, color-coded bars) + day labels + avg kcal/P/C/F.
- Nutrition profile modal: weight/height/age/sex/activity/goal + optional macro overrides.
- Smart target: Mifflin-St Jeor BMR + multiplier + goal adj + gym activity bonus (exercise_logs × 50 kcal/set).
- All data via `nutrition-data.js`. Realtime subscription on `meal_logs`. No profile → setup modal auto-opens.
- New modals: `nutProfileModalBg`, `nutCustomFoodModalBg`. Both close on background click.
- `_nutInited` lazy-init flag — nutrition JS only runs on first tab switch.
- No new files created in Step 4 — all UI added to `health.html`.

Food data source: pre-seeded `foods` table (SQL migration Step 1). ~140 global foods (CIQUAL/USDA approximate values).

---

# Phase 2 Step 3 — INTAKE tab restructure (2026-06-03)

Phase 2 Step 3 done — `health.html` now has STACK | WATER | NUTRITION tabs. NUTRITION tab is placeholder, Step 4 will build the full UI in next session.

Steps 1–3 complete. Step 4 (nutrition tab UI) not started.

---

# Phase 1 Setup Guide

## What Phase 1 adds

- Top nav: WATER removed, STACK renamed to INTAKE. Final order: GOALS · INTAKE · GYM · FINANCE.
- Goals page: "Plan Tomorrow" section removed. Only the TODAY list remains.
- Time Blocking: DAY / WEEK toggle. Week view shows 7 columns with per-day block placement and weekly navigation.
- Monthly & Yearly Objectives: new section between the TODO list and time blocking. Tabs for This Month / This Year, cascading expand (yearly → monthly → todos), auto-progress from linked todos.
- Routine Tracker: habit grid (last 30 days by default), streak indicators, challenge mode.

## Phase 1 one-time setup

### 1. Run the migration SQL

In Supabase Dashboard → SQL Editor → New query, paste the entire contents of:

```
supabase/migrations/20260602_phase1_objectives_habits.sql
```

Click **Run**. This creates:
- `monthly_objectives` table + RLS
- `yearly_objectives` table + RLS
- `habits` table + RLS
- `habit_logs` table + RLS (unique per habit+date)
- `day_notes` table + RLS
- `challenges` table + RLS
- Adds `linked_monthly_id` and `linked_yearly_id` columns to the existing `goals` table

### 2. No other dashboard changes needed

No new Storage buckets, no new Auth settings. Just run the migration and deploy.

---

# Phase 0 Setup Guide

## What Phase 0 does

Connects every page in the dashboard to Supabase for multi-user auth and cloud persistence. All data that was in localStorage is now in Supabase tables with row-level security (RLS), so each user only sees their own data.

---

## One-time setup steps

### 1. Create a Supabase project

Go to https://supabase.com → New project. Note your **Project URL** and **anon key** (Settings → API).

### 2. Configure credentials

```bash
cp js/config.example.js js/config.js
```

Edit `js/config.js` and fill in your values:

```js
export const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
export const SUPABASE_ANON_KEY = 'your_anon_key_here';
```

The anon key is safe to commit — Supabase security comes from RLS, not key secrecy.

### 3. Run the migration SQL

In Supabase Dashboard → SQL Editor → New query, paste the entire contents of:

```
supabase/migrations/20260602_phase0_full_schema.sql
```

Click **Run**. This creates all tables, enables RLS, and sets owner-only policies.

> Do NOT run `migrations/001_time_blocks.sql` — the full schema migration already handles time_blocks correctly with user_id.

### 4. Configure Supabase Auth

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `http://localhost:PORT` (or your deployed URL)
- **Redirect URLs**: same URL

In Authentication → Email → uncheck **Confirm email** (so users can sign in without email verification during development).

### 5. Set up Storage bucket for gym photos

In Supabase Dashboard → Storage → Create new bucket:

- **Name**: `gym-photos`
- **Public**: OFF (private — signed URLs are used)

Then run this in SQL Editor to add the storage policy:

```sql
create policy "gym_photos_all" on storage.objects
  for all using (bucket_id = 'gym-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'gym-photos' and auth.uid()::text = (storage.foldername(name))[1]);
```

### 6. Serve the project

Open the files via a local HTTP server (not `file://` — ESM imports require HTTP):

```bash
# Python
python3 -m http.server 8080

# Or any static file server
npx serve .
```

Then open `http://localhost:8080`.

---

## Files changed in Phase 0

| File | Change |
|------|--------|
| `js/config.js` | New — Supabase credentials (gitignored) |
| `js/config.example.js` | New — template for config.js |
| `js/supabase.js` | New — singleton Supabase client, exposes `window.__supabase` |
| `js/auth.js` | New — `requireAuth()` guard, redirects to auth.html if not logged in |
| `auth.html` | New — sign in / sign up page |
| `js/user-menu.js` | New — avatar + sign out dropdown |
| `js/goals-data.js` | New — goals CRUD + realtime |
| `js/stack-data.js` | New — supplement stack CRUD + realtime |
| `js/water-data.js` | New — water profile + daily log + realtime |
| `js/gym-data.js` | New — exercises, logs, weights, photos, split rotation + realtime |
| `js/finance-data.js` | New — assets, activity, history, subs, wishlist, orders |
| `index.html` | Refactored — auth guard, Supabase-backed goals |
| `health.html` | Refactored — auth guard, Supabase-backed supplement stack |
| `po-water.html` | Refactored — auth guard, Supabase-backed water tracking |
| `gym.html` | Refactored — auth guard, Supabase-backed gym data + Storage photos |
| `finance.html` | Refactored — auth guard, Supabase-backed finance data |
| `topbar.js` | Updated — reads from `window.__rowProgress`, water+1 writes to Supabase |
| `time-blocking.js` | Updated — uses `window.__supabase` instead of hardcoded credentials |
| `sync.js` | Deleted — replaced by per-table data modules |
| `supabase/migrations/20260602_phase0_full_schema.sql` | New — complete schema |

---

## Architecture notes

- All pages use `<script type="module">` with top-level `await requireAuth()` as the first gatekeeper
- `window.__supabase` is exposed for non-module scripts (topbar.js, time-blocking.js)
- `window.__rowProgress` carries live progress counts; pages dispatch `rowprogress` CustomEvent when counts change
- Gym photos are stored in Supabase Storage (`gym-photos` bucket); URLs are signed
- Gym gyms/days config stays in localStorage (config-level, not user data)
- Finance tab preference (`finance_active_tab`) and currency selection (`nw_currency`) stay in localStorage (UI prefs)
