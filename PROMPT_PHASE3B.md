### LOG RUN sub-tab (default view)

**Quick log form (primary UX — mobile-first):**
- Date picker (default: today)
- Distance input (km, big numeric input)
- Duration input (HH:MM:SS format, auto-formats as user types)
- Auto-calculated pace display (updates live as distance/duration change)
- Run type dropdown (easy/long/tempo/threshold/intervals/recovery/race/fartlek/hill_repeats)
- Effort slider (1-10 with color gradient and label: 1=Recovery → 10=All-out)
- Shoe picker dropdown (from user's shoes)
- Route picker dropdown (from user's routes, or "New route")

**Expandable "More details" section:**
- Avg HR, Max HR (numeric inputs)
- Elevation gain (m)
- Cadence (steps/min)
- Temperature, humidity, conditions (sunny/rain/wind), wind speed
- Splits entry: button to add km splits [{km: 1, pace: "5:20"}, ...]
- Notes (textarea)

**"SAVE RUN" button:**
- On save:
  - Insert into running_sessions
  - Auto-compute calories_burned from weight + distance + pace
  - Check for new PRs via `checkAndUpdatePRs()`
  - Update shoe's total_km
  - Update route's times_run
  - If new PR detected → celebration toast "🏆 New 5K PR! 24:32"
  - Push calories to nutrition target adjustment (via existing Phase 2 mechanism)

**Recent runs (below form):**
- Last 5 runs as compact cards: date, distance, pace, type badge, effort dots
- Click → goes to HISTORY detail

**"Quick log same as last" button:**
- Duplicates most recent run as pre-filled template (user adjusts distance/time)

STOP after Step 3. Let me test run logging + auto-PR detection.

---

## Step 4 — HISTORY sub-tab

- List of all runs, most recent first
- Each card: date, distance (km), duration, pace, run type badge, effort dots (colored), shoes name, route name
- Click → detail view:
  - Full run info
  - Splits table (if entered): km | pace | cumulative time
  - Comparison to previous run on same route (if applicable)
  - Weather conditions
  - "Edit" / "Delete" buttons
- Filter by: run type, shoe, route, date range
- "Load more" pagination (20 per page)

STOP after Step 4.

---

## Step 5 — ANALYTICS sub-tab (the data nerd section)

### Weekly Mileage chart
- Bar chart (SVG): last 12 weeks, total km per week
- 7-day rolling average line overlay
- ACWR indicator badge (colored: green/yellow/red) next to the chart title

### ACWR gauge
- Semi-circle gauge or horizontal bar showing current ratio
- Color zones: gray (<0.8 detraining) | green (0.8-1.3 optimal) | orange (1.3-1.5 caution) | red (>1.5 danger)
- Tooltip explaining the ratio

### Pace evolution chart
- Line chart (SVG): average pace per week over last 12 weeks
- Split by run type if possible (easy pace line vs tempo pace line)
- Personal bests highlighted with markers

### Run type distribution
- Donut chart (SVG): % easy / tempo / long / intervals / race / other over last 90 days
- Guideline annotation: "Ideal: ~80% easy, ~20% hard" (polarized training principle)

### Stats cards row
- Weekly km | Monthly km | Longest run | Fastest 5k equivalent | Total km this year | Current streak

### Time of day heatmap (bonus if context allows)
- 7×24 grid showing when user runs (from start_time)

STOP after Step 5.

---

## Step 6 — RACES sub-tab

### Upcoming races
- Cards: race name, date, distance, countdown ("32 days away"), target time (A/B/C goals)
- "Race readiness" indicator (green/yellow/red) based on:
  - Weeks of consistent training
  - Recent peak weekly mileage vs race distance
  - ACWR trend
- "+ Add race" button → modal: name, date, distance, A/B/C goal times, notes

### Race time predictor
- Input: recent race/time trial (distance + time)
- Output: predicted times for 5K, 10K, Half Marathon, Marathon (Riegel formula)
- VDOT display with zone table

### PR board
- Standard distances: 1K, 1 Mile, 5K, 10K, Half Marathon, Marathon
- For each: best time, date achieved, pace, link to that run
- "No data yet" for distances without a PR

### Past races (completed)
- List of races with actual_time_sec, whether goal A/B/C was met (badge)

STOP after Step 6.

---

# ═══════════════════════════════════════════════════
# SUB-PHASE 3B-2 — SHOES, ROUTES, PLANS, INTEGRATION
# ═══════════════════════════════════════════════════

## Step 7 — SHOES sub-tab

- List of shoes as cards:
  - Name, brand/model
  - Total km / max km → wear progress bar (green → yellow at 70% → red at 90%)
  - Purchase date, cost per km
  - "Retire" button (toggles retired flag, moves to bottom grayed out)
  - Alert badge at 80% wear: "⚠️ 640/800 km — consider replacing"
- "+ Add shoe" → modal: name, brand, model, purchase date, price, max km
- Click shoe → filter run history by this shoe
- Retired shoes shown at bottom (collapsed), dimmed

STOP after Step 7.

---

## Step 8 — ROUTES sub-tab

- List of saved routes: name, distance, elevation, times run, last run date
- "+ Add route" → modal: name, distance, elevation, notes
- GPX upload (store in Supabase Storage if needed — optional for v1, just metadata is fine)
- Click route → filter run history by this route, show best time + average time
- "Run this route" button → pre-fills LOG RUN with distance + elevation

STOP after Step 8.

---

## Step 9 — Training Plans (lightweight)

### Plan list
- Cards: name, date range, target race (if linked), progress (X/Y planned runs completed)
- "+ Create plan" → modal: name, start date, end date, target race (dropdown from race_goals)

### Plan detail
- Calendar view: shows planned runs on scheduled dates
- Each planned run: date, type, target distance, target pace
- Color coding: completed (green), upcoming (blue), missed (red if past date)
- Click a planned run to link it to an actual run (dropdown of runs on that date)
- Adherence stat: "72% of planned runs completed"

### Planned workout builder (for interval sessions)
- Build structured workouts: warmup → intervals (reps × distance @ pace + recovery) → cooldown
- Save as template
- Assign to planned runs

STOP after Step 9.

---

## Step 10 — Cross-section integrations + Polish

### Nutrition integration
- After logging a run, push estimated calories to today's nutrition target:
  - Read user's weight from nutrition_profile (or body_weight_logs)
  - Calculate: `kcal = weight_kg × distance_km × 1.036`
  - Store in running_sessions.calories_burned
  - The nutrition tab should already read this (from Phase 2's smart target system) — verify it works end-to-end

### Export
- "Export to CSV" button on HISTORY: exports all runs as CSV download
- Column headers: date, distance_km, duration_sec, pace, run_type, effort, avg_hr, max_hr, elevation, cadence, shoes, route, notes

### Future integration adapter stubs
- Create `js/running-adapters/` directory with stub files:
  - `strava-adapter.js` — `// TODO: OAuth2 + /api/v3/athlete/activities`
  - `garmin-adapter.js` — `// TODO: Garmin Connect API`
  - `whoop-adapter.js` — `// TODO: WHOOP recovery/HRV data feed`
  - `apple-health-adapter.js` — `// TODO: Apple HealthKit via web bridge`
- Each exports a `RunImport` interface comment showing the normalized shape
- This means future integration = implement one adapter, no schema changes needed

### UX polish
- Pace input accepts "5:30" and "5:30/km" and "330" (seconds) — auto-parse
- "Quick log: same as last" pre-fills most recent run as template
- Mobile: LOG RUN form has big tappable inputs, numeric keyboards on distance/time
- Empty states: friendly prompts when no runs, no shoes, no routes

STOP after Step 10.

---

## Step 11 — Docs + final

- Update CHANGES.md with Phase 3B setup
- Update CONTEXT_HANDOFF.md marking Phase 3B complete
- Note Phase 4 (Polish + equivalences nutrition) is next and final

**END of Phase 3B.**

---

# DATA / DB CONVENTIONS

- Distances: numeric in km (stored). Display can be km or mi based on user pref (future).
- Pace: integer in seconds per km (stored). Display as "MM:SS/km".
- Duration: integer in seconds (stored). Display as "HH:MM:SS" or "MM:SS".
- HR: integer bpm.
- Elevation: numeric in meters.
- Splits: jsonb array of {km: number, pace_sec: number}.
- Planned workouts structure: jsonb array of segments.

---

# STEP 0 — INSPECT & PROPOSE (no code yet)

Before writing any code:

1. Read this file (PROMPT_PHASE3B.md) fully
2. Read CONTEXT_HANDOFF.md, CHANGES.md
3. Read `gym.html` to understand current RUNNING placeholder and tab structure
4. Read `js/running-analytics.js` patterns from similar computation in `js/nutrition-data.js` (computeDailyTargets)
5. Skim `js/strength-data.js` for data module pattern

Propose:
- Step-by-step plan for 3B-1 (Steps 1-6) — files to create/modify at each step
- SQL migration preview (table list + key design decisions)
- How to handle pace formatting (input parsing + display)
- ACWR computation approach (which metric: distance, duration, or weighted?)
- Confirm understanding of: VDOT, Riegel, Cameron-Hibbert formulas
- Any simplifications for v1 (e.g., skip heatmap if too complex)

WAIT for my "go" before Step 1. STOP after every step.

---

# ACCEPTANCE CRITERIA — full Phase 3B

### Regression
- [ ] Login, Goals, Objectives, Habits, Time blocking work
- [ ] INTAKE (stack, water, nutrition) works
- [ ] FINANCE works
- [ ] STRENGTH (programs, workout player, history, stats, PR) works
- [ ] STRETCHING works

### Phase 3B-1
- [ ] RUNNING tab has sub-tabs: LOG RUN | HISTORY | ANALYTICS | RACES | SHOES | ROUTES
- [ ] Can log a run with distance, duration, type, effort, shoe, route
- [ ] Pace auto-calculated and displayed
- [ ] Auto-PR detection with celebration toast
- [ ] Shoe km auto-updates after logging
- [ ] HISTORY shows all runs with filters
- [ ] ANALYTICS: weekly mileage chart, ACWR gauge, pace evolution, run type distribution, stats cards
- [ ] RACES: upcoming races with countdown + readiness, race predictor with Riegel, PR board

### Phase 3B-2
- [ ] SHOES: wear progress bar, retire, alert at 80%
- [ ] ROUTES: saved routes, "run this route" pre-fill
- [ ] Training plans with calendar view + adherence tracking
- [ ] Nutrition integration: run calories → daily target adjustment
- [ ] CSV export works
- [ ] Adapter stubs exist in js/running-adapters/

### Cross-cutting
- [ ] Mobile responsive (LOG RUN form tested at 375px)
- [ ] No console errors
- [ ] All data scoped to user_id
- [ ] Bloomberg-terminal aesthetic

---

START with STEP 0. Wait for "go". STOP after every step.