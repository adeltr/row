# CONTEXT_HANDOFF.md — Row Dashboard

## UX Overhaul — COMPLETE ✓ (2026-08-14)

### What was built
Pure CSS/HTML/JS layer on top of all existing pages. Zero SQL changes, zero new modules, zero PWA manifest changes.

| Step | Deliverable | Status |
|------|---|---|
| 1 | `js/bottom-nav.js`: iOS zoom fix, global haptic, touch-action | ✓ Done |
| 2 | `index.html`: viewport, segmented controls, bottom sheet modals | ✓ Done |
| 3 | `health.html`: segmented tabs, bottom sheet for stack add, haptics | ✓ Done |
| 4 | `gym.html`: segmented tabs, bottom sheets, stch session player full-height | ✓ Done |
| 5 | `finance.html`: segmented tabs, bottom sheet modal, nav offset, 8 accordions | ✓ Done |
| 6 | `library.html`: segmented tabs, bottom sheet modals, haptics | ✓ Done |
| 7 | `auth.html`: segmented sign-in/up control, haptic | ✓ Done |
| 8 | `po-water.html`: viewport fix | ✓ Done |

### Architecture decisions

- **iOS segmented control pattern**: `background: rgba(120,120,128,0.16)`, `border-radius:10px`, `padding:3px`, active segment `background: var(--bg-card)` + `box-shadow: 0 1px 4px rgba(0,0,0,0.25)`
- **Bottom sheet pattern**: overlay `align-items:flex-end`, sheet `border-radius:20px 20px 0 0`, drag handle via `::before` pseudo-element, `animation: *-sheet-up 0.36s cubic-bezier(0.32,0.72,0,1)`, `padding-bottom: calc(20px + env(safe-area-inset-bottom))` on sheet (NOT overlay)
- **Tab slide animation**: `@keyframes *-panel-in { from { opacity:0; translateX(18px) } }`, triggered via `.tab-slide-in` class + `void el.offsetWidth` reflow reset
- **Finance accordions**: `.fin-acc-trigger` + `.fin-acc-body` pattern, `max-height:0 → 2400px` transition, state in `localStorage('fin-acc-*')`
- **Finance bottom-tabs**: `bottom: calc(62px + env(safe-area-inset-bottom)) !important` to clear global bottom nav
- **Stch session player**: `#stchDetailModal .stch-modal-inner` uses `position:fixed; top:10vh; left:0; right:0; bottom:0` with flex column layout — exercise list gets `flex:1; overflow-y:auto`
- **CSS injection order**: overrides appended at end of each `<style>` block → naturally higher cascade specificity via source order + `!important` where needed
- **No JS module changes**: all new JS is either in `bottom-nav.js` global IIFE or at end of existing `<script type="module">` blocks

---

## Improvements Phase — COMPLETE ✓ (2026-06-11)

### What was built

| Step | Deliverable | Status |
|------|---|---|
| 1 | SQL migration (`20260611_improvements_finance_goals_library.sql`): 5 new tables + RLS | ✓ Done |
| 2 | `js/cashflow-data.js`, `js/financial-advisor.js`, `js/library-data.js` | ✓ Done |
| 3 | `index.html`: Goals restructured into ROUTINE / MONTHLY / TIME BLOCKS tabs | ✓ Done |
| 4 | `finance.html`: CASH FLOW sub-tab (entries, KPIs, charts, sub auto-import) | ✓ Done |
| 5 | `finance.html`: ADVISOR sub-tab (health score gauge, rule engine, French messages) | ✓ Done |
| 6 | `library.html`: New page (queue, reading, completed, book CRUD, notes, stats) | ✓ Done |
| 7 | Cross-section integrations + docs | ✓ Done |

### New tables (all user-scoped, RLS owner-only)

| Table | Purpose |
|---|---|
| `cash_flow_entries` | Monthly income / expense line items |
| `cash_flow_monthly_snapshots` | Computed totals + breakdown per month |
| `financial_advice_logs` | Cached advisor output per month |
| `books` | Book library (queue → reading → completed) |
| `book_notes` | Typed notes per book (highlight, summary, action, question, reflection) |

`goals` table: added `linked_book_id uuid references books(id)`.

### Architecture decisions

- **Finance tab bar**: top-level `fin-tab` / `data-fin-panel` system separate from bottom `bot-tab` / `data-section`. Bottom tabs hidden when CASH FLOW or ADVISOR is active.
- **Lazy init**: `_cfInited` and `_advInited` flags — cashflow/advisor JS only runs on first tab click.
- **Subscription auto-import**: `autoImportSubs()` in cashflow checks for existing `is_recurring` entries before inserting.
- **Advisor messages**: all French, rule-based (no AI). Health score = `savingsScore×0.4 + stabilityScore×0.2 + subScore×0.2 + progressScore×0.2`.
- **Library ↔ Goals**: `LibData.loadBooksForObjective(id, which)` called for every objective in `loadObjectives()`; books shown as gold badge on objective cards.
- **Cash Flow ↔ Overview**: `refreshCfSavings()` loads current month snapshot and shows net savings (green/red) below net worth total.
- **Library pagination**: `loadBooks()` uses `.range(offset, offset+limit-1)` — default limit 50.
- **Books ↔ Objectives**: books have `linked_objective_id` (monthly) and `linked_yearly_id` (yearly) columns.

---

## Phase 3A — COMPLETE ✓ (both 3A-1 and 3A-2)

### Phase 3A-2 — Stretching tab

| Step | Deliverable | Status |
|------|---|---|
| 9 | SQL migration: `stretch_routines`, `stretches`, `stretching_logs`, `stretch-photos` bucket | ✓ Done |
| 10 | `js/stretching-data.js` — CRUD, photo upload/signed URLs, streak, realtime | ✓ Done |
| 11 | STRETCHING tab UI: check-in, routines, detail modal, stretch modal, history calendar | ✓ Done |
| 12 | CHANGES.md + CONTEXT_HANDOFF.md updated | ✓ Done |

### Phase 3A-2 architecture decisions

- `photo_url` stores the Supabase storage **path** (`{user_id}/{stretchId}.jpg`), not a public URL (bucket is private)
- Signed URLs generated on-demand via `getStretchPhotoUrl(path)` → 1-hour expiry; called async after render
- Photo upload flow: save stretch first → get ID → upload (so we always have a real ID for the path)
- Canvas compression: 1080px max width, JPEG 85% quality, before upload
- `computeCurrentStreak` is pure: takes log array, returns int; streak must include today or yesterday to be "active"
- Stretching JS lazy-inits on first tab click (`_stchInit` flag); module imported once via `getStchMod()`
- Three slide-up modals (`stch-modal-overlay`): routine editor, routine detail, stretch editor
- `stchRenderCalendar` is not called on init — only when history panel is expanded (performance)

### What comes next — Phase 3B (Running)

- RUNNING tab currently shows placeholder "Coming in Phase 3B"
- Scope: run tracking, pace analysis, training plans

---

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
