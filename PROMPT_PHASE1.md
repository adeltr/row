# Phase 1 — Goals Upgrade

> Read this file ENTIRELY before starting. Then read CONTEXT_HANDOFF.md and CHANGES.md. THEN propose a plan and wait for my "go".

---

## Project context — DO NOT skip

**Stack:**
- Pure vanilla HTML/JS (NO React, NO Next.js, NO framework, NO build step)
- 5 static HTML files: index.html, health.html, po-water.html, gym.html, finance.html + auth.html
- 2 non-module JS files at root: topbar.js, time-blocking.js
- ES modules in `js/`: supabase.js, config.js, auth.js, user-menu.js, goals-data.js, stack-data.js, water-data.js, gym-data.js, finance-data.js
- Supabase backend (auth + DB + storage). Client exposed as `window.__supabase` for non-module scripts.
- Deployed on Vercel (auto-deploy from `main` branch)

**Aesthetic:**
- Dark Bloomberg-terminal look. Use existing CSS variables, fonts, spacing.
- Minimal, monospace accents, neon green/pink/teal indicators.
- Mobile-responsive.

**Auth:**
- All pages require login (auth guard at top of each protected page redirects to auth.html)
- `js/auth.js` exports `requireAuth()`, `getCurrentUser()`, `signOut()`, etc.
- Every Supabase row has `user_id`. RLS policies enforce owner-only access (auth.uid() = user_id).
- Helper pattern in data modules: `async function getUserId() { ... }` and `user_id` is included in EVERY insert/upsert.

**What works today (Phase 0 complete):**
- Login, signup, sign out
- All 5 sections (goals, stack, water, gym, finance) fully wired to Supabase
- Time blocking (day view only, in index.html)
- Storage bucket `gym-photos` with RLS

---

## CRITICAL CONSTRAINTS — non-negotiable

1. **DO NOT introduce React, Vue, Svelte, Next.js, or any framework.**
2. **DO NOT add a build step or package.json.**
3. **DO NOT break the existing Phase 0 work.** Test each change incrementally.
4. **DO NOT hardcode user_id, keys, or URLs.** Always use `getUserId()` helper or `supabase.auth.getUser()`.
5. **DO NOT auto-run SQL migrations.** Output them as files for me to run manually in Supabase SQL Editor.
6. **DO NOT delete files without confirming.** When in doubt, ask.
7. **DO NOT push to git.** I'll commit + push myself after reviewing.
8. Generate **ONE migration file** per phase (single SQL file with everything for Phase 1).
9. Match existing code style: vanilla JS, no TypeScript, no JSX, no arrow function abuse.

---

## PHASE 1 SCOPE

### 1. Top nav restructure (across ALL pages)

- **Remove** WATER from the top nav button row
- **Rename** STACK → INTAKE (the button label and link target stay on the same file `health.html` for now — Phase 2 will reorganize INTAKE into sub-tabs)
- **Final top nav order**: GOALS, INTAKE, GYM, FINANCE
- Update the nav in all 5 HTML files + auth.html

### 2. Goals section (index.html) — remove "Plan tomorrow"

- Delete the entire "PLAN TOMORROW — [date]" block in index.html
- Remove the "Add a goal for tomorrow..." input and Add button
- Clean up unused state, handlers, and CSS tied to tomorrow planning
- Keep only the "TODAY" TODO list

### 3. Time Blocking — add WEEKLY view

- Add a toggle at the top of the time blocking section: **DAY | WEEK** (default: DAY)
- DAY view = current implementation, untouched
- WEEK view layout:
  - 7 columns (Monday → Sunday, week starts Monday)
  - Same hour timeline on the left (6 AM → 12 AM, configurable later)
  - Each day column shows that day's blocks at their correct vertical position
  - Today's column has a subtle accent (existing "current" styling)
  - Current time horizontal line crosses ONLY today's column
- WEEK interactions:
  - Click empty cell in any day → create a block on that day/time (modal pre-fills date)
  - Click existing block → edit modal (reuse day-view modal)
  - Drag-resize and drag-move work within the same day (no cross-day drag in v1)
- Week navigation: `< Previous week | This week | Next week >`
- Show week range in header (e.g., "Jun 2 – Jun 8")
- Persists view preference in localStorage (UI pref, OK to use localStorage)

### 4. NEW SECTION — Monthly & Yearly Objectives

In index.html, add this section **between** the TODO list and the time blocking section.

Layout: two tabs at the top → **"This Month" | "This Year"**

**Objective fields:**
- Title (required)
- Description (optional, multiline)
- Target date (defaults to end of month/year)
- Category (free text, optional)
- Status: Active | Completed | Abandoned (dropdown)
- Progress mode: "auto" (calculated from linked todos) or "manual" (user sets %)

**Linking with daily TODOs:**
- When creating/editing a daily todo, add two dropdowns: "Link to monthly objective" and "Link to yearly objective" (both optional)
- Auto-progress = (count of completed linked todos / count of all linked todos) × 100
- Show linked todo count on each objective card: "12 / 30 todos completed"

**Cascading view:**
- Click a yearly objective → expand to show linked monthly objectives
- Click a monthly objective → expand to show linked daily todos
- Inline checkbox to mark todos complete from this view

**UI:**
- Each card has a progress bar (existing aesthetic)
- Completed objectives fade slightly + green checkmark
- "+ New objective" button at top of each tab
- Match Bloomberg-terminal dark theme

### 5. NEW SECTION — Routine Tracker

In index.html, add this section **below** the objectives section. Inspired by 75-hard / Notion habit grid trackers.

**Layout:**
- Grid: rows = dates (most recent at top), columns = habits
- Habit column headers: emoji/icon + short name
- Each cell = checkbox (checked/unchecked)
- Last column: "Completed X/Y" + thin progress bar showing day's completion %

**Habits management:**
- Each habit has: name, emoji/icon, optional target_value (numeric, e.g., "8 glasses water"), optional unit, active (bool)
- "+ Add habit" button opens a modal
- Click column header → edit/archive habit
- Archived habits drop off grid but keep historical data

**Date range:**
- Default view: last 30 days
- Scroll / "Load more" for older dates
- "Jump to date" picker

**Challenge mode:**
- "Start a challenge" button → modal: name, duration in days, which habits are included, mode (strict/lenient)
- Active challenge shown at top: days completed, days remaining, current streak, success rate (% of days where ALL challenge habits completed)
- Strict mode: failing one day resets the streak; Lenient mode: just marks the day as missed
- Only one active challenge at a time

**Per-day notes (optional):**
- Click empty space at end of a row → add a note for that day (max 280 chars)

**Streak indicator per habit:**
- Small "🔥 12" under each habit column header showing current streak

---

## SUPABASE SCHEMA — generate ONE migration file

File path: `supabase/migrations/[YYYYMMDD]_phase1_objectives_habits.sql`

Tables to create (all with `user_id`, RLS enabled, owner-only policies for select/insert/update/delete):

- `monthly_objectives` (id, user_id, title, description, month, year, category, target_date, status, progress_mode, manual_progress, created_at, updated_at)
- `yearly_objectives` (id, user_id, title, description, year, category, target_date, status, progress_mode, manual_progress, created_at, updated_at)
- `habits` (id, user_id, name, icon, target_value, unit, active, order_index, created_at)
- `habit_logs` (id, user_id, habit_id, date, completed, value, notes, created_at) — UNIQUE on (habit_id, date)
- `day_notes` (id, user_id, date, note) — UNIQUE on (user_id, date)
- `challenges` (id, user_id, name, duration_days, start_date, end_date (generated), habit_ids uuid[], mode, status, created_at)

**Modifications to existing `goals` table:**
- ADD COLUMN `linked_monthly_id uuid references monthly_objectives(id) on delete set null`
- ADD COLUMN `linked_yearly_id uuid references yearly_objectives(id) on delete set null`

Use `create table if not exists` and explicit constraints. Generate the full owner-only policies inline (4 per table). Do NOT use `drop table` in this migration — Phase 0 tables stay intact.

---

## DATA LAYER

Create these new files in `js/`:
- `js/objectives-data.js` — CRUD + subscribe for monthly_objectives + yearly_objectives
- `js/habits-data.js` — CRUD + subscribe for habits, habit_logs, day_notes, challenges

Follow the EXACT pattern of existing data modules:
- `import { supabase } from './supabase.js';`
- `async function getUserId() { ... }` helper at the top
- Every insert/upsert includes `user_id`
- Realtime subscription functions at the bottom

Update `js/goals-data.js` to support reading/writing `linked_monthly_id` and `linked_yearly_id` on goals.

---

## STEP 0 — INSPECT & PROPOSE (no code yet)

Before writing any code, do this:

1. Read CONTEXT_HANDOFF.md and CHANGES.md fully
2. Read index.html (the current Goals section structure)
3. Read all 5 nav-containing HTML files briefly to understand the nav markup
4. Read js/supabase.js, js/auth.js, and one existing data module (js/goals-data.js) to confirm the pattern
5. Read time-blocking.js briefly to understand how blocks are rendered today (for the weekly view)

Then propose a precise plan:
- File-by-file list of what you'll create vs modify
- The SQL migration file content (preview)
- How you'll handle the day → week view toggle for time blocking
- Any risks or concerns
- Estimated number of lines/tokens for this phase

WAIT for my "go" before writing code.

---

## ACCEPTANCE CRITERIA — test BEFORE committing

- [ ] Top nav on all pages: GOALS, INTAKE, GYM, FINANCE (no WATER button)
- [ ] STACK label is now "INTAKE" (still links to health.html)
- [ ] Goals section: NO "Plan tomorrow" block, NO tomorrow input
- [ ] Time blocking: DAY / WEEK toggle works
- [ ] WEEK view: 7 columns, blocks render correctly per day, click to create works
- [ ] Week navigation (prev/this/next) works
- [ ] Can create a monthly objective with all fields
- [ ] Can link a daily todo to a monthly objective via dropdown
- [ ] Completing the todo auto-updates objective progress
- [ ] Cascading view: yearly → monthly → todos works
- [ ] Can create a habit with emoji + name
- [ ] Routine tracker grid shows last 30 days, scrolls for older
- [ ] Habit cells toggle on click
- [ ] Streak count updates correctly per habit
- [ ] Can start a challenge with selected habits
- [ ] Active challenge shows countdown + streak
- [ ] All new data persists on refresh
- [ ] All new data scoped to user_id (multi-user safe)
- [ ] Mobile responsive (test viewport ~375px)
- [ ] No console errors at any step
- [ ] Phase 0 features still work (regression test: create goal, water +1, gym exercise)

---

## DELIVERABLES

1. SQL migration: `supabase/migrations/[YYYYMMDD]_phase1_objectives_habits.sql`
2. Modified files: all HTML pages (nav), index.html (Goals section), time-blocking.js (week view)
3. New data modules: `js/objectives-data.js`, `js/habits-data.js`
4. Updated `js/goals-data.js` (linked objective IDs)
5. Update `CHANGES.md` with Phase 1 setup steps (how to run the migration, anything I need to do manually in Supabase Dashboard)
6. Update `CONTEXT_HANDOFF.md` marking Phase 1 complete + listing what's done

---

START with STEP 0. Wait for my "go"
