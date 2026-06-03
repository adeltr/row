# Phase 2 — Intake Section (Stack + Water + Nutrition)

> Read this file ENTIRELY. Then read CONTEXT_HANDOFF.md, CHANGES.md, and PROMPT_PHASE1.md for context. THEN propose a plan and wait for my "go".

---

## Project context — DO NOT skip

Same as Phase 1 (vanilla HTML/JS, Supabase backend, Bloomberg-terminal dark aesthetic, deployed on Vercel).

**What works today (Phases 0 + 1 complete):**
- Login, signup, sign out, multi-user with RLS
- All sections wired to Supabase (goals, stack/intake, water, gym, finance)
- Objectives (monthly/yearly) + cascading to daily todos
- Routine tracker with habits, streaks, challenges
- Time blocking DAY + WEEK views
- Top nav: GOALS, INTAKE, GYM, FINANCE

**Current INTAKE page** = `health.html` (renamed in Phase 1 from STACK). Currently shows only the supplement stack tracker.

---

## CRITICAL CONSTRAINTS — non-negotiable

1. **DO NOT introduce React, Vue, or any framework.** Pure vanilla HTML/JS.
2. **DO NOT add a build step or package.json.**
3. **DO NOT break Phases 0 and 1.** Test regression: goals, water, gym, finance, objectives, habits, time blocking all still work.
4. **DO NOT hardcode user_id, keys, or URLs.** Use `getUserId()` helper.
5. **DO NOT auto-run SQL migrations.** Output them as files for me to run manually.
6. **DO NOT delete files without confirming.**
7. **DO NOT push to git.** I'll commit + push myself.
8. **ONE migration file** for Phase 2.
9. Match existing code style: vanilla JS, no TypeScript, no JSX.

---

## PHASE 2 SCOPE — high level

Transform the INTAKE page (`health.html`) from a single-purpose supplement tracker into a 3-tab section: **STACK | WATER | NUTRITION**

The current water page (`po-water.html`) should remain functional for backward compat, but the new WATER tab inside INTAKE should be the primary destination.

---

## 1. INTAKE page restructure (`health.html`)

Add a tab bar at the top of the content area: **STACK | WATER | NUTRITION** (default: STACK)
- Persist active tab in localStorage (`intake:active_tab`)
- Tab switching: instant client-side, no page reload

### 1.1 STACK tab
- Keep existing supplement tracker UNCHANGED.

### 1.2 WATER tab
- Embed the water tracker UI inline (don't iframe).
- Functionally same as `po-water.html`:
  - Daily counter (1/7 style ring)
  - +/- buttons
  - Profile (weight, age, sex, activity → target)
  - Substances tracker
- Reuse `js/water-data.js` for all data ops.
- Keep `po-water.html` as a fallback page (don't delete).

### 1.3 NUTRITION tab — the big new feature

A full daily nutrition tracker with smart calorie targeting.

**Daily view:**
- Date selector at top (default: today)
- 4 meal slots: Breakfast, Lunch, Dinner, Snacks (collapsible, each can have multiple food entries)
- Add food: search input → autocomplete from food DB → portion size → quick add
- Each entry shows: food name, portion (g/ml or count), kcal, protein/carbs/fat
- Edit/delete inline

**Target ring (top of tab):**
- Big circular progress: "Target X kcal — Consumed Y kcal — Remaining Z kcal"
- 3 macro bars below: Protein / Carbs / Fat with percentage of target
- Color coding: green (on track), orange (close), red (over)

**Smart target calculation:**
- User profile: weight_kg, height_cm, age, sex, activity_level (sedentary/light/moderate/active/very_active), goal (lose/maintain/gain)
- Base TDEE via Mifflin-St Jeor + activity multiplier
- Adjust per goal: lose = -500 kcal, maintain = 0, gain = +300 kcal
- **Activity bonus from gym/running:**
  - Pull from `exercise_logs` of the day → estimate kcal burned (simple: sets × 50 kcal as placeholder; we'll refine when Phase 3 builds the running module)
  - Add this to today's target ONLY if goal is maintain/gain. For lose mode, add 50% (partial rebate to keep deficit).
- Show breakdown when user clicks the ring: "Base 2200 + Activity 320 = 2520 kcal target"

**Food database:**
- Searchable list with ~200 common foods pre-seeded (French + international staples — pain, riz, pâtes, poulet, etc.)
- Each food: name, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, default_portion_g
- Custom foods: user can add their own (marked is_custom=true, user_id set)
- Global foods (is_custom=false, user_id=NULL) visible to everyone via RLS exception
- Search: case-insensitive, matches name and aliases (jsonb field)

**Quick favorites:**
- Auto-track most-used foods per user (last 30 days)
- Show top 10 as quick-add buttons at top of food picker

**Weekly summary (collapsible card below daily view):**
- Last 7 days: avg kcal, avg protein/carbs/fat
- Mini chart (no library — pure SVG): weekly trend of calories vs target
- Weight trend overlay (if body_weight_logs has data this week)

**Profile setup:**
- "Setup nutrition profile" modal if no profile exists
- Editable later via gear icon

---

## 2. Top nav cleanup

WATER button was already removed in Phase 1. Verify it stays out. The INTAKE button now leads to the new 3-tab INTAKE page.

---

## 3. SUPABASE SCHEMA — generate ONE migration file

File: `supabase/migrations/[YYYYMMDD]_phase2_nutrition.sql`

### Tables

**`foods` (food database — partially shared)**
```sql
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- NULL = global food
  name text not null,
  aliases jsonb default '[]'::jsonb,
  calories_per_100g numeric not null,
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  fiber_g numeric default 0,
  default_portion_g numeric default 100,
  is_custom boolean default false,
  created_at timestamptz default now()
);
```

RLS: select allowed if `user_id IS NULL OR auth.uid() = user_id`. Insert/update/delete only if `auth.uid() = user_id`.

**`meal_logs` (daily food entries)**
```sql
create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')),
  food_id uuid references foods(id) on delete set null,
  custom_name text,        -- if food deleted or quick-add without DB entry
  quantity_g numeric not null,
  calories numeric not null,    -- snapshot at time of log (in case food data changes)
  protein_g numeric default 0,
  carbs_g numeric default 0,
  fat_g numeric default 0,
  fiber_g numeric default 0,
  notes text,
  created_at timestamptz default now()
);
```

**`nutrition_profile`**
```sql
create table if not exists nutrition_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weight_kg numeric,
  height_cm numeric,
  age int,
  sex text check (sex in ('male', 'female', 'other')),
  activity_level text default 'moderate' check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text default 'maintain' check (goal in ('lose', 'maintain', 'gain')),
  protein_target_g numeric,    -- optional override
  carbs_target_g numeric,
  fat_target_g numeric,
  updated_at timestamptz default now()
);
```

### Pre-seed foods
Include `INSERT INTO foods` for ~200 common French/international foods (with `user_id = NULL`). Examples:
- Pain blanc, pain complet, baguette
- Riz blanc, riz complet, quinoa, pâtes
- Poulet, dinde, bœuf haché 5%, saumon, thon
- Œuf, yaourt nature, fromage blanc 0%, lait demi-écrémé
- Pomme, banane, orange, fraise
- Brocoli, épinard, salade, carotte, tomate
- Amandes, noix, huile d'olive, beurre
- Café noir, thé, eau

Approximate values are fine (sourced from generic food databases like CIQUAL or USDA). Document the source in CHANGES.md.

### RLS policies
- Enable on all 3 tables
- `foods`: select policy = `(user_id IS NULL OR auth.uid() = user_id)`; insert/update/delete = `auth.uid() = user_id`
- `meal_logs` and `nutrition_profile`: standard owner-only (select/insert/update/delete with `auth.uid() = user_id`)

---

## 4. DATA LAYER

Create `js/nutrition-data.js` following the EXACT pattern of existing data modules:
- `import { supabase } from './supabase.js';`
- `async function getUserId() { ... }` helper
- Every insert/upsert includes `user_id`
- Realtime subscriptions on meal_logs

Functions to implement:
- `loadProfile()`, `upsertProfile(fields)`
- `loadFoods(query, limit)` — searches global + user's custom foods
- `addCustomFood(fields)`, `updateFood(id, fields)`, `deleteFood(id)` (only custom)
- `loadDailyLogs(dateStr)` — all meal_logs for a date
- `addMealLog(fields)`, `updateMealLog(id, fields)`, `deleteMealLog(id)`
- `getTopUsedFoods(limit)` — for quick favorites
- `loadWeeklyTotals(weekStartStr)` — for the weekly summary
- `computeDailyTargets(profile, activityKcal)` — pure function, no Supabase (Mifflin-St Jeor + activity)
- `subscribeNutrition(callback)` — realtime for meal_logs

Update `js/water-data.js` if needed to expose any helpers reused by the new WATER tab.

---

## 5. STEP 0 — INSPECT & PROPOSE (no code yet)

Before writing any code:

1. Read PROMPT_PHASE2.md (this file) and PROMPT_PHASE1.md fully
2. Read CONTEXT_HANDOFF.md and CHANGES.md
3. Read `health.html` (the current INTAKE page) and `po-water.html` (the water page) to understand the markup and existing patterns
4. Read `js/water-data.js` and `js/stack-data.js` for data pattern
5. Read the Phase 1 routine tracker section in `index.html` to see how complex new sections were added (for inspiration on the nutrition tab structure)

Then propose a precise plan:
- File-by-file list of what you'll create vs modify
- The SQL migration content (preview, including the seed foods list)
- How you'll integrate the new tab system into `health.html` without breaking the stack
- The food autocomplete UX (no external libs)
- Approximate scope: lines of code per file

WAIT for my "go" before writing code.

---

## ACCEPTANCE CRITERIA — test BEFORE committing

- [ ] INTAKE page has 3 tabs: STACK | WATER | NUTRITION
- [ ] Active tab persists on refresh
- [ ] STACK tab still works (regression)
- [ ] WATER tab: +/-, profile, substances all work — same data as `po-water.html`
- [ ] Profile setup modal appears on first nutrition visit
- [ ] Can fill in weight, height, age, sex, activity, goal
- [ ] Target ring shows correct calorie target based on profile
- [ ] Can search foods, autocomplete works
- [ ] Can add a food entry to any meal slot
- [ ] Macros update in real time as entries are added/removed
- [ ] Can add a custom food (saved with is_custom=true)
- [ ] Custom food appears in search for THIS user only
- [ ] Quick favorites show top 10 used foods
- [ ] Weekly summary shows last 7 days
- [ ] Calorie target increases when there are gym logs same day (test by logging an exercise)
- [ ] All data persists on refresh
- [ ] All data scoped to user_id (multi-user safe)
- [ ] Mobile responsive (~375px viewport)
- [ ] No console errors
- [ ] Regression: all Phase 0/1 features still work

---

## DELIVERABLES

1. SQL migration: `supabase/migrations/[YYYYMMDD]_phase2_nutrition.sql` (3 tables + ~200 seed foods + RLS)
2. Modified `health.html` (3-tab structure, embedded water tracker, new nutrition tab UI)
3. New `js/nutrition-data.js`
4. Possibly minor updates to `topbar.js` or `index.html` if integration requires it (but minimize changes)
5. Update `CHANGES.md` with Phase 2 setup steps
6. Update `CONTEXT_HANDOFF.md` marking Phase 2 complete

---

START with STEP 0. Wait for my "go".