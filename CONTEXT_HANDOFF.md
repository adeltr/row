# CONTEXT_HANDOFF.md — Row Dashboard

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
