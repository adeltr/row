# CONTEXT_HANDOFF.md — Row Dashboard

## Phase 3A-1 — COMPLETE ✓ (needs prod test before 3A-2)

### What Phase 3A-1 adds

| Step | Deliverable | Status |
|------|---|---|
| 1 | SQL migration: 7 new tables + RLS + "Sèche Essan" seed | ✓ Done |
| 2 | `js/programs-data.js` + `js/workouts-data.js` | ✓ Done |
| 3 | gym.html: outer tabs (STRENGTH/STRETCHING/RUNNING) + strength sub-tabs | ✓ Done |
| 4 | PROGRAMS sub-tab: marketplace, detail, my programs, editor | ✓ Done |
| 5 | Workout Player: full-screen, sets table, rest timer, supersets, finish modal | ✓ Done |
| 6 | HISTORY sub-tab: paginated list + detail view | ✓ Done |
| 7 | STATS sub-tab: PR Tracker with Epley 1RM + sparklines | ✓ Done |
| 8 | CHANGES.md + CONTEXT_HANDOFF.md updated | ✓ Done |

### Architecture decisions

- `programs` table: `is_official=true, user_id=NULL` for global seed programs; users copy to own namespace
- Superset seed: two-pass SQL (insert both rows without FK, then UPDATE to link)
- `workout_logs` tracks completed sessions; `exercise_logs.sets` (JSONB) stores individual sets
- Set objects from workout player: `{ set_num, weight_kg, reps, rir, completed, timestamp }`
- Set objects from freestyle tracker: `{ weight, reps, ... }` — PR tracker handles both via `s.weight_kg ?? s.weight`
- Day-of-week: JS `getDay()` Sunday=0 → DB Monday=0 via `(jsDay + 6) % 7`
- `loadActiveBanner()` is a named async function (refactored from IIFE) — callable after setActiveProgram
- `switchStrengthTab` is wrapped twice via closure chain: base → +programs-lazy-init → +history+stats-lazy-init
- Workout player state in `_wp` object; all timers (elapsed, rest, auto-advance) use `setInterval` + clearInterval on quit
- PR tracker: Epley 1RM = `weight * (1 + reps/30)`; sparkline = last 10 sessions, oldest→newest

### What comes next — Phase 3A-2

**DO NOT start until 3A-1 is tested in prod.**

Phase 3A-2 = STRETCHING tab:
- Step 9: SQL migration (`stretch_routines`, `stretches`, `stretching_logs`, `stretch-photos` Storage bucket)
- Step 10: `js/stretching-data.js`
- Step 11: STRETCHING tab UI (check-in, routines, history calendar, streak)
- Step 12: Final docs

---

## Phase 2 — COMPLETE ✓

### Phase 2 status

| Step | Deliverable | Status |
|------|---|---|
| 1 | SQL migration: `foods`, `meal_logs`, `nutrition_profile` tables + RLS + ~140 seed foods | ✓ Done |
| 2 | `js/nutrition-data.js`: full CRUD + `computeDailyTargets` + realtime | ✓ Done |
| 3 | `health.html`: 3-tab system (STACK \| WATER \| NUTRITION), water tracker embedded, NUTRITION placeholder | ✓ Done |
| 4 | NUTRITION tab full UI: calorie ring, meal slots, food search, profile modal, weekly summary | ✓ Done |

### Phase 2 architecture decisions

- Tab bar in `health.html` — active tab persists in `localStorage('intake:active_tab')`
- Water tab lazy-inits on first visit (loads Supabase data only when tab opened)
- All water element IDs prefixed with `w` to avoid conflicts (`wWaterNum`, `wSettingsBtn`, etc.)
- `--good`, `--warn`, `--bad`, `--info` added to `:root` CSS vars (shared by water + upcoming nutrition ring)
- `po-water.html` kept as fallback (not deleted)
- `nutrition-data.js` uses `getUserId()` pattern matching all other data modules
- `computeDailyTargets()` is a pure function (no Supabase) — Mifflin-St Jeor BMR + activity multiplier + goal adjustment
- Nutrition tab lazy-inits on first visit (`_nutInited` flag), same pattern as water tab
- Meal slots default all-open on first render; open state preserved across re-renders via `openKeys` Set
- Food picker is inline per meal slot (no full-screen modal); custom food modal is separate
- Quick favorites query `meal_logs` last 30 days, tally by `food_id`, fetch top 10 via `loadFoodsById`
- Exercise kcal estimate: `exercise_logs.sets × 50 kcal` per set (rough placeholder — Phase 3 refines)
- Ring SVG: `r=50`, `stroke-dasharray=314`, `stroke-dashoffset` interpolated from 314→0 as pct 0→1
- `_nutDate` tracks viewed date; date nav disabled for future dates; all loads re-query with this date

---

## Phase 1 — COMPLETE ✓

### Phase 1 deliverables

| # | Deliverable | Status |
|---|---|---|
| 1 | SQL migration (objectives, habits, challenges, day_notes, goals ALTER) | ✓ Done |
| 2 | topbar.js: WATER removed, STACK→INTAKE | ✓ Done |
| 3 | js/goals-data.js: linked_monthly_id / linked_yearly_id support | ✓ Done |
| 4 | js/objectives-data.js: monthly/yearly objective CRUD + realtime | ✓ Done |
| 5 | js/habits-data.js: habits, habit_logs, day_notes, challenges CRUD + realtime | ✓ Done |
| 6 | index.html: Plan Tomorrow removed, Objectives section, Routine Tracker | ✓ Done |
| 7 | time-blocking.js: DAY/WEEK toggle, week view, week navigation | ✓ Done |
| 8 | CHANGES.md + CONTEXT_HANDOFF.md updated | ✓ Done |

### Architecture decisions made in Phase 1

- Objectives auto-progress is computed client-side (N parallel queries for linked goals — personal scale)
- Yearly cascade shows all monthly objectives for the year (no explicit yearly→monthly FK needed)
- Week view uses a single Supabase query for the full Mon–Sun range; Store.weekBlocks is separate from Store.blocks
- `openModal(block, defaultStartMins, targetDateStr)` — 3rd param lets week view pass the column's date
- Challenge streak is computed client-side from habit_logs at render time
- Routine tracker grid columns set via `grid-template-columns` in JS (variable number of habits)
- `_currentView` and `_currentWeekMonday` are module-level vars in time-blocking.js (IIFE scope)

---

## Phase 0 — COMPLETE ✓

All 13 deliverables finished. See CHANGES.md for full setup instructions.

---

## Phase 0 deliverables status

| # | Deliverable | Status |
|---|---|---|
| 1 | Migration SQL (all tables, RLS, policies, Storage bucket) | ✓ Done |
| 2 | js/config.js + js/config.example.js | ✓ Done |
| 3 | js/supabase.js + js/auth.js + auth.html + js/user-menu.js | ✓ Done |
| 4 | All 5 data modules (goals, stack, water, gym, finance) | ✓ Done |
| 5 | Refactor index.html | ✓ Done |
| 6 | Refactor health.html | ✓ Done |
| 7 | Refactor po-water.html | ✓ Done |
| 8 | Refactor gym.html | ✓ Done |
| 9 | Refactor finance.html | ✓ Done |
| 10 | Update topbar.js | ✓ Done |
| 11 | Update time-blocking.js | ✓ Done |
| 12 | Delete sync.js | ✓ Done |
| 13 | CHANGES.md + CONTEXT_HANDOFF.md | ✓ Done |

---

## Architecture decisions made in Phase 0

- All pages: `<script type="module">` with `await requireAuth()` as the first gatekeeper
- `window.__supabase` exposed for non-module scripts (topbar.js, time-blocking.js)
- `window.__rowProgress` + `rowprogress` CustomEvent for topbar live count updates
- Supabase ESM client via `https://esm.sh/@supabase/supabase-js@2`
- RLS on every table: `auth.uid() = user_id`
- Gym photos → Supabase Storage bucket `gym-photos` (private, signed URLs)
- Gym gyms/days config → stays in localStorage (config-level, string IDs)
- Finance UI prefs (`finance_active_tab`, `nw_currency`) → stay in localStorage
- finance.html uses in-memory CACHE with explicit Supabase calls at each mutation point
- finance_subscriptions/orders/wishlist: corrected schema to match app field names

---

## Finance data format mapping (snake_case ↔ camelCase)

| App field | Supabase column | Table |
|---|---|---|
| `fromCat` | `from_cat` | subscriptions, orders |
| `fromAccount` | `from_account` | subscriptions, orders |
| `autoDeduct` | `auto_deduct` | subscriptions |
| `lastDeductedAt` | `last_deducted_at` | subscriptions |
| `renewal` | `renewal` | subscriptions |
| `deductedAt` | `deducted_at` | orders |
| `pctAtDeduction` | `pct_at_deduction` | orders |
| `deductedFrom` | `deducted_from` (jsonb) | orders |

---

## Known issues / next steps

- Topbar shows "—/—" for categories not set by the current page (goals only on index.html, stack+water only on health.html). Consider loading all counts on each page, or a shared realtime channel.
- time-blocking.js has a localStorage caching layer that could be removed (data now always in Supabase).
- The old `row/row/` directory (nested copy of the project) can be deleted if not needed.
- finance.html: activity log entries are append-only; there's no UI to clear them.
