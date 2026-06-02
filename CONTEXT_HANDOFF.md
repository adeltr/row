# CONTEXT_HANDOFF.md — Row Dashboard

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
