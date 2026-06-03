# Phase 3A — Gym section (Programs + Workout Player + Strength + Body Weight + Stretching)

> Read this file ENTIRELY. Then read CONTEXT_HANDOFF.md, CHANGES.md, PROMPT_PHASE1.md, PROMPT_PHASE2.md. THEN propose a plan and wait for my "go".

> Work in incremental STEPS. STOP after each step so I can test. This avoids hitting the 32k output token limit.

> This phase is LARGE. Split into 2 sub-phases: **3A-1** (Programs + Workout Player + Strength + Body Weight + PR Tracker) and **3A-2** (Stretching). Do 3A-1 first, stop, let me test in prod, THEN do 3A-2.

---

## Project context

Same as previous phases (vanilla HTML/JS, Supabase backend, Bloomberg-terminal dark aesthetic, deployed on Vercel).

**What works today (Phases 0+1+2 complete):**
- Multi-user auth with RLS
- Goals, Objectives (monthly/yearly), Habits, Challenges, Day notes
- Time blocking DAY + WEEK
- INTAKE page with STACK | WATER | NUTRITION tabs
- Nutrition with food DB (~140 foods), macros, smart calorie target
- Top nav: GOALS, INTAKE, GYM, FINANCE

**Current GYM page** = `gym.html`. Currently shows a single-purpose strength tracker with workout days, exercises, sets, logs. We'll keep this as the "freestyle" workout mode but add a Programs system on top.

---

## CRITICAL CONSTRAINTS — non-negotiable

1. DO NOT introduce React, Vue, or any framework. Pure vanilla HTML/JS.
2. DO NOT add a build step or package.json.
3. DO NOT break Phases 0/1/2. Test regression at end.
4. DO NOT hardcode user_id, keys, or URLs. Use `getUserId()` helper.
5. DO NOT auto-run SQL migrations. Output them as files for manual run.
6. DO NOT delete files without confirming.
7. DO NOT push to git. I'll commit + push myself.
8. ONE migration file per sub-phase (3A-1 and 3A-2 = 2 migration files total).
9. Match existing code style: vanilla JS, no TypeScript.
10. Work in incremental STEPS. STOP after each step.

---

## PHASE 3A SCOPE — high level

Transform GYM page from single-purpose strength tracker into a 3-tab section:
**STRENGTH | STRETCHING | RUNNING**

- **STRENGTH** = freestyle quick log (existing tracker) + new Programs system + Workout Player + Body weight tracker + PR tracker
- **STRETCHING** = routines, stretches with photos, daily logs, streak (Phase 3A-2)
- **RUNNING** = placeholder for now (Phase 3B will fill it)

---

# ═══════════════════════════════════════════════════
# SUB-PHASE 3A-1 — PROGRAMS + WORKOUT PLAYER + STRENGTH
# ═══════════════════════════════════════════════════

## Step 1 — SQL migration for Programs system

File: `supabase/migrations/[YYYYMMDD]_phase3a1_programs.sql`

### Tables

**`programs`** (workout programs, can be public or private)
```sql
create table if not exists programs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,  -- NULL = official global program (admin seeded)
  name          text not null,
  description   text,
  duration_weeks int default 4,
  goal          text check (goal in ('strength','hypertrophy','cutting','recomp','endurance','general')),
  level         text check (level in ('beginner','intermediate','advanced')),
  is_public     boolean default false,  -- can other users see/copy?
  is_official   boolean default false,  -- curated by us (seed programs)
  copy_count    int default 0,
  rating_avg    numeric default 0,
  rating_count  int default 0,
  cover_image_url text,
  tags          jsonb default '[]'::jsonb,  -- ["push-pull-legs","upper-lower"]
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
```

**`program_sessions`** (sessions inside a program, e.g. "SÉANCE 1 : JAMBES")
```sql
create table if not exists program_sessions (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  name        text not null,
  order_index int default 0,
  warmup_note text,
  rest_between_exercises_sec int default 120,
  notes       text,
  created_at  timestamptz default now()
);
```

**`program_exercises`** (exercises within a session)
```sql
create table if not exists program_exercises (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references program_sessions(id) on delete cascade,
  name        text not null,
  order_index int default 0,
  target_sets int default 4,
  target_reps text default '10',  -- can be "10" or "8-12" or "12+12"
  rest_sec    int default 90,
  technique   text,  -- "dégressive sur 3 étapes", "5s contraction", etc.
  notes       text,
  is_superset boolean default false,
  superset_with_id uuid references program_exercises(id) on delete set null,
  video_url   text,  -- optional reference video
  created_at  timestamptz default now()
);
```

**`program_schedules`** (weekly schedule, e.g. Monday=session1, Tuesday=session2)
```sql
create table if not exists program_schedules (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references programs(id) on delete cascade,
  day_of_week  int not null check (day_of_week between 0 and 6),  -- 0=Monday
  session_id   uuid references program_sessions(id) on delete cascade,  -- NULL = rest day
  rest_label   text,  -- e.g. "Cardio Statique 45 à 60 min" or "REPOS MUSCULATION"
  created_at   timestamptz default now()
);
```

**`user_active_programs`** (which program a user is following)
```sql
create table if not exists user_active_programs (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  program_id  uuid references programs(id) on delete set null,
  started_at  date,
  current_week int default 1
);
```

**`workout_logs`** (a completed workout session — distinct from exercise_logs which only tracks individual exercises)
```sql
create table if not exists workout_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  program_id      uuid references programs(id) on delete set null,
  session_id      uuid references program_sessions(id) on delete set null,
  session_name    text,  -- snapshot in case program is deleted
  duration_min    int,
  total_volume_kg numeric,  -- sum of (weight × reps) for all sets
  notes           text,
  feeling         text check (feeling in ('great','good','ok','bad','terrible')),
  created_at      timestamptz default now()
);
```

**`program_ratings`** (community ratings)
```sql
create table if not exists program_ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  program_id  uuid not null references programs(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  unique (user_id, program_id)
);
```

### Modifications to existing tables

The existing `exercises` and `exercise_logs` tables stay for "freestyle" workouts. Add a new column to `exercise_logs` to link a log to a workout:
```sql
alter table exercise_logs add column if not exists workout_log_id uuid references workout_logs(id) on delete set null;
alter table exercise_logs add column if not exists program_exercise_id uuid references program_exercises(id) on delete set null;
```

### RLS policies

- `programs`: select if `is_public = true OR is_official = true OR auth.uid() = user_id`. Insert/update/delete only if `auth.uid() = user_id` AND `is_official = false`.
- `program_sessions`, `program_exercises`, `program_schedules`: select if user can see parent program; insert/update/delete if user owns parent program AND program is not official.
- `user_active_programs`, `workout_logs`, `program_ratings`: standard owner-only.

### Seed: my actual program (the PDF)

Seed the following program with `is_official = true`, `user_id = NULL` so all users can see and copy it:

**Program: "Sèche Essan — 7 semaines"**
- description: "Programme de sèche 7 semaines avec exemple retard jambes. 4 séances + cardio."
- duration_weeks: 7
- goal: 'cutting'
- level: 'intermediate'
- tags: ["push-pull-legs", "cutting", "french"]

**Sessions (4 séances):**

1. **SÉANCE 1 : JAMBES** (also used Thursday for double-leg week)
   - warmup_note: "5 min de rameur"
   - rest_between_exercises_sec: 120
   - Exercises (order 1→7):
     1. Leg Extension — 3×15, rest 90s, technique "5s de contraction à la 15ème rép"
     2. Hack Squat — 4×10, rest 90s, technique "Dégressive sur 3 étapes dernière série"
     3. Presse à cuisses — 4×10, rest 90s, technique "Dégressive sur 3 étapes dernière série"
     4. Fentes haltères + Leg curl (SUPERSET) — 4×(12+12), rest 90s
     5. Extension mollet debout — 4×12, rest 60s
     6. Mollets assis machine — 4×12, rest 60s
     7. Avant-bras barre flexions poignets — 4×12, rest 60s

2. **SÉANCE 2 : PEC + BRAS**
   - warmup_note: "5 min de rameur"
   - Exercises:
     1. Écarté à la poulie basse — 3×15, rest 90s, "5s contraction à la 15ème rép"
     2. Développé incliné haltère — 4×10, rest 90s, "Dégressive sur 3 étapes dernière série"
     3. Développé assis machine — 4×10, rest 90s, "Dégressive sur 3 étapes dernière série"
     4. Écarté pec deck + Dips penché (SUPERSET) — 4×(12+12), rest 90s
     5. Biceps curl barre EZ + Triceps poulie supination (SUPERSET) — 4×(12+12), rest 60s
     6. Biceps poulie corde + Triceps poulie corde (SUPERSET) — 4×(12+12), rest 60s
     7. Crunch poulie corde + Relevé jambes dips (SUPERSET) — 4×(12+12), rest 60s

3. **SÉANCE 3 : DOS + BICEPS**
   - warmup_note: "5 min de rameur"
   - Exercises:
     1. Pull over corde poulie haute — 3×15, rest 90s, "5s contraction à la 15ème rép"
     2. T-bar — 4×10, rest 90s, "Dégressive sur 3 étapes dernière série"
     3. Tirage vertical prise large — 4×10, rest 90s, "Dégressive sur 3 étapes dernière série"
     4. Tirage horizontal + Tirage vertical triangle (SUPERSET) — 4×(12+12), rest 90s
     5. Curl haltère banc incliné — 4×10, rest 60s
     6. Curl haltères prise marteau unilatérale — 4×12, rest 60s

4. **SÉANCE 4 : ÉPAULES + TRICEPS**
   - warmup_note: "5 min de vélo"
   - Exercises:
     1. Oiseau poulie haute allongé — 3×15, rest 90s, "5s contraction à la 15ème rép"
     2. Développé militaire Smith Machine 110° — 4×10, rest 90s, "Dégressive sur 3 étapes dernière série"
     3. Développé assis haltères banc 90° — 4×10, rest 90s, "Dégressive sur 3 étapes dernière série"
     4. Élévation latérale supination + Shrug haltères (SUPERSET) — 4×(12+12), rest 90s
     5. Barre EZ au front banc incliné — 4×10, rest 90s
     6. Triceps poulie corde unilatéral — 4×12 (per arm), rest 60s
     7. Crunch poulie corde + Relevé jambes dips (SUPERSET) — 4×(12+12), rest 60s

**Schedule (program_schedules — 7 days, Monday=0):**
- Monday: Séance 1 (Jambes)
- Tuesday: Séance 2 (Pec + Bras)
- Wednesday: REST — rest_label: "Cardio Statique 45 à 60 min"
- Thursday: Séance 1 (Jambes) — same session as Monday (retard jambes example)
- Friday: Séance 4 (Épaules + Triceps)  ← NOTE: original PDF labels this séance 3 on Friday; I'm reordering for logical numbering
- Saturday: Séance 3 (Dos + Biceps) — rest_label: "Cardio HIIT 15-20 min"
- Sunday: REST — rest_label: "Cardio Statique 45 à 60 min"

(Use the order from the PDF planning, even if exercise numbering differs.)

STOP after Step 1. Wait for me to apply migration in Supabase SQL Editor.

---

## Step 2 — Data layer for Programs

Create new files in `js/`:

### `js/programs-data.js`
- `loadPublicPrograms({ goal, level, tags, sortBy })` — browse marketplace
- `loadOfficialPrograms()` — curated by us
- `loadMyPrograms()` — programs I created
- `loadProgramFull(programId)` — program + sessions + exercises + schedule (single query joined)
- `copyProgramToMine(programId)` — duplicates a public program into user's own (so they can edit it)
- `createProgram(fields)` — creates a new private program
- `updateProgram(id, fields)`, `deleteProgram(id)`
- `addSession(programId, fields)`, `updateSession`, `deleteSession`, `reorderSessions(programId, orderedIds)`
- `addExercise(sessionId, fields)`, `updateExercise`, `deleteExercise`, `reorderExercises`
- `linkSuperset(exerciseId1, exerciseId2)` — sets superset_with_id on both
- `setSchedule(programId, dayOfWeek, sessionIdOrNull, restLabel)`
- `setActiveProgram(programId)` — sets user_active_programs
- `getActiveProgram()` — returns the user's current active program with today's session
- `rateProgram(programId, rating, comment)`, `loadRatings(programId)`

### `js/workouts-data.js`
- `startWorkout(programId, sessionId)` — returns a draft workout_log id (status=draft)
- `logExerciseSet(workoutLogId, programExerciseId, exerciseName, setNumber, weightKg, reps, rir, notes)` — uses exercise_logs (or create a sets table — see below)
- `getPreviousPerformance(exerciseName, userId)` — last set for this exercise (for autocomplete)
- `finishWorkout(workoutLogId, fields)` — sets duration_min, total_volume_kg, feeling, notes
- `loadWorkoutHistory(limit, offset)` — list past workouts
- `loadWorkoutDetail(workoutLogId)` — full detail with all sets

### Note on sets storage
The existing `exercise_logs` uses `sets jsonb` (array of sets per day per exercise). For the workout player, we'll use the same. Each set object: `{ set_num, weight_kg, reps, rir, completed, rest_taken_sec, timestamp }`.

When user finishes a set in the workout player, append to the `sets` jsonb of the matching `exercise_logs` row (upsert by user_id + exercise_id + date).

Follow EXACT pattern of existing data modules:
- `import { supabase } from './supabase.js';`
- `async function getUserId() { ... }` helper
- Every insert/upsert includes `user_id`
- Realtime subscriptions where useful

STOP after Step 2.

---

## Step 3 — GYM page restructure with tabs

Add tab bar: **STRENGTH | STRETCHING | RUNNING** (default: STRENGTH).
- Persist active tab in localStorage (`gym:active_tab`)

**STRENGTH tab** layout (BIG section, split into sub-zones):

```
┌─────────────────────────────────────────────┐
│  ACTIVE PROGRAM BANNER (top)                │
│  "Sèche Essan — Week 3/7" + today's session │
│  [START TODAY'S WORKOUT] button             │
└─────────────────────────────────────────────┘

[ PROGRAMS ] [ FREESTYLE ] [ HISTORY ] [ STATS ]
  ↑ sub-tabs inside STRENGTH

PROGRAMS sub-tab: Browse marketplace + my programs
FREESTYLE sub-tab: existing quick-log strength tracker (untouched)
HISTORY sub-tab: list of past workouts
STATS sub-tab: body weight graph + PR tracker
```

**STRETCHING tab**: empty placeholder "Coming in next step"
**RUNNING tab**: empty placeholder "Coming in Phase 3B"

STOP after Step 3. Let me test:
- Tabs switch correctly
- FREESTYLE still works (regression test on existing tracker)
- PROGRAMS, HISTORY, STATS show placeholders for now

---

## Step 4 — PROGRAMS sub-tab UI (marketplace + my programs)

### Marketplace view (default)
- Header: "Discover Programs"
- Filters: goal (chips), level (chips), search bar
- Sort: Popular (copy_count desc), Top Rated, Newest
- Grid of program cards: cover image (or generated placeholder), name, description, duration, goal badge, level badge, ⭐ rating, 📋 copy count
- Click card → program detail modal/page

### Program detail view
- Header: name, description, goal/level/duration badges
- Author: "By [user] / Official"
- Schedule preview: 7-day mini calendar showing which session each day
- Sessions list: each session expandable showing exercises
- Buttons:
  - "Copy to my programs" (clones it private)
  - "Set as active" (if it's mine or official)
  - "Rate" (if I've copied/used it)
- Ratings & comments below

### My Programs view (toggle)
- List of programs I've created or copied
- Each: name, ✏️ edit, 🗑️ delete, "Set active" button
- "+ Create new program" button at top → goes to editor

### Program editor
- Edit name, description, goal, level, duration, public/private toggle, cover image upload
- Sessions section: list with reorder, add, delete
- Click a session → session editor:
  - Name, warmup note, rest between exercises
  - Exercises list with reorder
  - Add exercise: name, target sets, target reps (text "10" or "8-12" or "12+12"), rest, technique, notes
  - Mark as superset: link 2 exercises together
- Schedule section: 7-day weekly assignment — dropdown per day (session or rest with label)

STOP after Step 4.

---

## Step 5 — Workout Player (Hevy-inspired) ⭐ key feature

When user clicks "START TODAY'S WORKOUT" (or starts any session manually), open the **workout player view** — this is the most important UX of the gym.

### Workout Player layout

Full-screen modal or dedicated view (not just a panel).

**Header:**
- Session name + program name
- Current exercise index "Exercise 3/7"
- Elapsed time (live counter from start)
- "Quit workout" button (X)

**Current Exercise card (BIG, focus area):**
- Exercise name
- Technique hint (e.g., "Dégressive sur 3 étapes dernière série")
- Target: "4 sets × 10 reps · 90s rest"
- **Sets table** — Hevy-style:
  - Columns: Set # | Previous (last time) | Weight (kg) | Reps | ✓
  - Previous column shows last performance: "70kg × 8" (call `getPreviousPerformance`)
  - User types weight & reps for current set
  - Click ✓ → set is logged, timer starts
  - Optional RIR input (Reps In Reserve, 0-5) for autoregulation
- **Add set** button (if user wants more sets than planned)
- **Skip set** / **Skip exercise** options (small text links)
- Notes input for this exercise (collapsible)

**Rest Timer (appears after ✓):**
- Big countdown (e.g., "01:30")
- Background color shifts: green → yellow → red as time runs out
- Vibration / sound at 0 (browser API + optional sound file)
- "Skip rest" / "+ 30s" / "- 30s" buttons
- Auto-collapses when 0, ready for next set

**Supersets:**
- If exercise has `superset_with_id`, display BOTH exercises together
- Toggle between them after each set instead of just incrementing set
- Rest only after completing BOTH movements (the pair counts as 1 set)
- Visual marker (e.g., "🔗 Superset with [other exercise]")

**Bottom navigation:**
- "Previous exercise" / "Next exercise" buttons
- Or swipe left/right on mobile (touch events)

**Auto-progress to next exercise:**
- After last set of current exercise, auto-suggest moving to next
- 5-second countdown before auto-advance (with "Stay here" button)

### Finishing workout
- "Finish workout" button always visible at the bottom (collapsed)
- On click:
  - Show summary modal: duration, total volume (sum of weight × reps), exercises completed, sets completed
  - Optional: how do you feel? (great/good/ok/bad/terrible — emoji buttons)
  - Optional final notes
  - "Save workout" → creates workout_log row + saves all sets in exercise_logs
  - Confetti animation or similar reward

### Data flow
- `startWorkout()` creates a workout_log row (status implicit = draft)
- For each set logged: append to `exercise_logs.sets` (jsonb), upsert by (user_id, exercise_id, date)
- Sets capture: weight, reps, rir, completed, timestamp
- `finishWorkout()` finalizes the workout_log with duration, volume, feeling

### Autocomplete logic
- On exercise card open: query `getPreviousPerformance(exerciseName)` — last `exercise_logs` for this exercise name
- Pre-fill the FIRST set with last session's last set's weight + reps as placeholder (greyed out, replaceable)
- Show "Previous" column showing the last session's same-numbered set

### Mobile-first
- Workout player is THE primary mobile UX of the app
- Big tappable buttons, big text inputs (especially the weight/reps inputs)
- Numeric keyboard on weight/reps
- Sticky timer at the bottom of viewport

STOP after Step 5. This is the BIG step — test thoroughly before continuing.

---

## Step 6 — HISTORY sub-tab

Show list of past workouts:
- Card per workout: date, session name, duration, total volume, exercises count, feeling emoji
- Sort by date desc
- Click → detail view with all sets per exercise + comparison to previous time (volume up/down %)
- Filter by program or date range

STOP after Step 6.

---

## Step 7 — STATS sub-tab (body weight + PR tracker)

### Body weight tracker
- "Log today's weight" input + Save (defaults to today, can backdate)
- Line chart (pure SVG, no libs): last 90 days
  - 7-day moving average overlay
  - X-axis: dates
  - Y-axis: weight with padding
- Stats card: current, 7d avg, 30d avg, total change ↑/↓, all-time low/high
- Recent entries list (last 14 days) — inline edit + delete

### PR Tracker
- For each exercise with logs:
  - Exercise name
  - Best estimated 1RM (Epley: `weight * (1 + reps/30)`)
  - Tiny SVG sparkline of 1RM evolution (last 10 sessions)
  - Last performed date
  - For bw=true exercises, show max reps instead
- Sortable by name / best 1RM / most recent
- Click an exercise → full history graph + all logs

STOP after Step 7.

---

## Step 8 — Update CHANGES.md and CONTEXT_HANDOFF.md

- Document migration steps
- Mark Phase 3A-1 complete in CONTEXT_HANDOFF.md
- Note that Phase 3A-2 (stretching) is next sub-phase

**END of Phase 3A-1. Commit, push, test in prod, then start Phase 3A-2.**

---

# ═══════════════════════════════════════════════════
# SUB-PHASE 3A-2 — STRETCHING (do AFTER 3A-1 is merged & tested)
# ═══════════════════════════════════════════════════

## Step 9 — SQL migration for stretching

File: `supabase/migrations/[YYYYMMDD]_phase3a2_stretching.sql`

Tables:
- `stretch_routines` (id, user_id, name, description, created_at)
- `stretches` (id, routine_id FK cascade, name, description, duration_sec, photo_url, order_index, created_at)
- `stretching_logs` (id, user_id, routine_id FK set null, date, duration_min, notes, created_at)

Storage bucket: `stretch-photos` (private), policies scoped to `auth.uid()::text` as first folder segment.

RLS:
- `stretch_routines`, `stretching_logs`: owner-only.
- `stretches`: scoped through parent routine ownership (using `exists` subquery).

STOP after Step 9.

---

## Step 10 — Stretching data layer

Create `js/stretching-data.js`:
- `loadRoutines()`, `loadRoutineWithStretches(routineId)`
- `addRoutine`, `updateRoutine`, `deleteRoutine`
- `addStretch(routineId, fields)`, `updateStretch`, `deleteStretch`, `reorderStretches(routineId, orderedIds)`
- `uploadStretchPhoto(stretchId, file)` — client-side compress to 1080px max width, upload to Storage, update photo_url
- `deleteStretchPhoto(stretchId)`
- `loadStretchingLogs(startDate, endDate)`, `addStretchingLog(fields)`
- `computeCurrentStreak(logs)` — consecutive days from today
- `subscribeStretching(callback)`

STOP after Step 10.

---

## Step 11 — STRETCHING tab UI

Inside the STRETCHING tab of GYM:

### Top: Today's check-in
- "Did you stretch today?" card
- Dropdown: pick a routine
- Optional: duration_min input, notes
- "Log session" button
- On success: "✓ Logged X min with routine Y" + undo (5s window)
- Streak counter: "🔥 X day streak"

### Routines list
- All user's routines as cards
- Each: name, description, stretch count, "▶ Start" (UI only)
- "+ New routine" → modal

### Routine detail (modal or slide-in)
- Editable name + description
- Stretches list with reorder (up/down arrows), edit, delete
- "+ Add stretch" → modal with name, description, duration, photo upload
- Photo preview after upload

### History (collapsible)
- Last 30 days calendar showing logged days (green dots)
- Click a day → show that day's logs
- Total minutes this week / month

STOP after Step 11.

---

## Step 12 — Final docs

- Update CHANGES.md
- Mark Phase 3A complete (both 3A-1 and 3A-2) in CONTEXT_HANDOFF.md
- Note Phase 3B (Running) is next

**END of Phase 3A.**

---

# DATA / DB CONVENTIONS

- Dates: `date` type, local YYYY-MM-DD strings (no timezone).
- Timestamps: `timestamptz`.
- Weights: kg by default, user `gym_profile.units` controls display.
- Aliases & complex data: jsonb.
- Photo/file URLs: store full URL from Supabase.

---

# STEP 0 — INSPECT & PROPOSE (no code yet)

Before writing any code:

1. Read PROMPT_PHASE3A.md (this file) fully
2. Read CONTEXT_HANDOFF.md, CHANGES.md, PROMPT_PHASE1.md, PROMPT_PHASE2.md
3. Read `gym.html` end-to-end (focus on structure)
4. Read `js/gym-data.js` to understand existing strength data layer
5. Skim `health.html` to see Phase 2's tab implementation pattern
6. Skim `js/nutrition-data.js` for data module pattern

Propose:
- Step-by-step plan
- SQL migration preview for Step 1
- How to NOT break the existing strength tracker (regression risk!)
- Confirm understanding of: superset logic, autocomplete from previous performance, workout player state management

WAIT for my "go" before Step 1. STOP after every step.

---

# ACCEPTANCE CRITERIA — full Phase 3A

### Regression (must still work)
- [ ] Login, signup, sign out
- [ ] Goals, objectives, habits, time blocking
- [ ] INTAKE (stack, water, nutrition)
- [ ] FINANCE
- [ ] Existing freestyle strength tracker (now under STRENGTH → FREESTYLE sub-tab)

### Phase 3A-1
- [ ] GYM page has 3 tabs: STRENGTH | STRETCHING | RUNNING
- [ ] STRENGTH has sub-tabs: PROGRAMS | FREESTYLE | HISTORY | STATS
- [ ] Active program banner shows today's session
- [ ] Programs marketplace browsable with filters
- [ ] Can copy a public program, edit it as my own
- [ ] Can create program from scratch
- [ ] Can set active program & schedule
- [ ] Workout player: shows current exercise, sets table, previous performance
- [ ] Logging a set starts the rest timer
- [ ] Supersets work (toggle between paired exercises)
- [ ] Finish workout creates workout_log + saves all sets
- [ ] HISTORY shows past workouts with detail
- [ ] STATS: body weight graph + PR tracker
- [ ] My seeded "Sèche Essan" program is visible to all users as official

### Phase 3A-2
- [ ] STRETCHING tab functional: routines, stretches, photos
- [ ] Photo upload works (compressed, in Storage bucket)
- [ ] Streak counter updates correctly
- [ ] History calendar shows logged days

### Cross-cutting
- [ ] Mobile responsive (workout player ESPECIALLY tested at 375px)
- [ ] No console errors
- [ ] All data scoped to user_id (multi-user safe)
- [ ] Bloomberg-terminal aesthetic preserved

---

START with STEP 0. Wait for "go". STOP after every step.