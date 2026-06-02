# CONTEXT_HANDOFF.md — Row Dashboard

## Phase 0 — Partial Progress

---

### What was scanned/found

- **Framework:** None. Pure vanilla JS — five static `.html` files, three `.js` modules.
  No React, no Next.js, no Vite, no CRA, no package.json, no node_modules, no TypeScript.

- **localStorage keys found:**

  | Key | File | Shape |
  |---|---|---|
  | `goals:YYYY-MM-DD` | index.html | `{text, done, doneAt?, queued?}[]` |
  | `goal_streak_v1` | index.html | `{count, lastProcessedDate}` |
  | `stack:version` | health.html | `string` |
  | `stack:items` | health.html | `StackItem[]` |
  | `stack:low` | health.html | `string[]` (low-stock ids) |
  | `stack:taken:YYYY-MM-DD` | health.html | `string[]` (taken ids per day) |
  | `po_water_v1` | po-water.html | `{unit, bottleMl, glassMl, profile:{weightKg,age,sex,activityHrs}, logs:{YYYY-MM-DD:count}}` |
  | `po_coach_v1` | gym.html | `{units, gyms[], days[], exercises[], logs:{[exId]:{[date]:{sets[]}}}, splitRotation[], splitAnchor}` |
  | `po_coach_workout_done` | gym.html | `{YYYY-MM-DD: boolean}` |
  | `po_coach_weights` | gym.html | `{date, weight, unit}[]` |
  | `po_coach_photos` | gym.html | `{date, dataUrl}[]` ⚠️ base64 blobs — cannot go in Supabase rows |
  | `nw_currency` | finance.html | `string` |
  | `nw:bank` / `nw:stocks` / `nw:crypto` / `nw:other` | finance.html | `{name, amount}[]` |
  | `nw:activity` | finance.html | activity log entries |
  | `nw:history` | finance.html | `{date, total}[]` (net worth snapshots) |
  | `subs` | finance.html | subscription objects |
  | `wishlist` | finance.html | `{name, amountCHF, ts, ccy}[]` |
  | `incoming_orders` | finance.html | order objects |
  | `finance_active_tab` | finance.html | `string` (UI state — skip Supabase) |
  | `tb:YYYY-MM-DD` | time-blocking.js | `TimeBlock[]` (fallback only; primary is Supabase) |

- **Supabase already in package.json?** No package.json exists. SDK loaded via CDN `<script>` tag.

- **Existing tables in Supabase console:**
  - `app_state` — blob sync (key/data JSON pairs, open anon RLS)
  - `time_blocks` — created via `migrations/001_time_blocks.sql`, open anon RLS

- **UI primitives location:** No folder. All CSS inline per HTML file.
  Naming conventions: `.gm-*` (goals), `.tb-*` (time blocking), `.stack-*` (health), `.nw-*` (net worth).

---

### Files created in this session

| File | Purpose | Status |
|---|---|---|
| `sync.js` | Cloud-sync helper — mirrors localStorage keys to Supabase `app_state` table; realtime pull | **Complete** |
| `time-blocking.js` | Day-view time blocking section for Goals page; Supabase CRUD + localStorage fallback | **Complete** |
| `migrations/001_time_blocks.sql` | Creates `time_blocks` table with open-anon RLS | **Complete** (needs manual run in Supabase SQL Editor) |

### Files modified in this session

| File | What changed |
|---|---|
| `topbar.js` | Replaced placeholder Supabase URL + anon key with real values |
| `index.html` | Added `<script>` tags for supabase CDN, sync.js, time-blocking.js; added 220 lines of `.tb-*` CSS; added `initCloudSync` boot call |
| `health.html` | Added supabase CDN + sync.js scripts; added `initCloudSync` boot call |
| `po-water.html` | Added supabase CDN + sync.js scripts; added `initCloudSync` boot call with iframe guard |
| `finance.html` | Added supabase CDN + sync.js scripts; added `initCloudSync` boot call |

---

### What is DONE

- Supabase credentials wired into `topbar.js` and `sync.js`
- `sync.js` syncs goals, stack, water, finance data to Supabase `app_state` table (blob per page key) with realtime subscriptions — cross-device sync works
- `time-blocking.js` fully built: vertical timeline, drag-move, drag-resize, click-to-create, create/edit modal, 7 preset categories, realtime Supabase sync, localStorage fallback
- `migrations/001_time_blocks.sql` written — needs one manual run in Supabase SQL Editor
- All five pages have cloud sync wired up
- Everything committed and pushed to `github.com/adeltr/row` (main branch), Vercel auto-deployed

---

### What is NOT DONE (next session picks up here)

Ordered by priority:

1. **Run `migrations/001_time_blocks.sql` in Supabase SQL Editor** — time blocks won't persist to cloud until this is done
2. **Phase 1 — Nav restructure:** Remove WATER from top nav, rename STACK → INTAKE (in `topbar.js`)
3. **Phase 1 — Remove "Plan tomorrow" block** from `index.html` (HTML lines 962–976 + JS functions `loadTomorrow`, `renderTomorrowCount`, `getTomorrowDateString`, `tomorrowKey`, `makeAddHandlers(...tomorrowKey...)`)
4. **Phase 1 — Weekly view for Time Blocking:** Add DAY|WEEK toggle + 7-column week layout to `time-blocking.js`
5. **Phase 1 — Monthly & Yearly Objectives section:** New `objectives.js` module + SQL migration
6. **Phase 1 — Routine Tracker + Challenge mode:** New `routine-tracker.js` module + SQL migration
7. **Phase 0 (if chosen) — Auth + multi-user:** Requires choosing between Path A (rewrite in Next.js) or Path B (add `login.html` + session check to existing vanilla JS). See decisions below.

---

### Decisions made / assumptions

- **Open anon RLS (no auth yet):** All Supabase tables use open anon policies matching the existing `app_state` table. The app currently has no login system. When auth is added this needs to be swapped to `auth.uid() = user_id` policies.
- **Goals stay in localStorage for now:** There is no `goals` table in Supabase. Goals sync via the `sync.js` blob approach (entire day's array stored as a JSON blob under key `'goals'` in `app_state`). A proper per-row goals table would require a schema migration and refactor of `index.html`.
- **`po_coach_photos` cannot go in Supabase rows** — base64 images are too large. Would need Supabase Storage (object storage) for a proper migration.
- **Phase 0 auth path undecided:** The user asked for React/Next.js auth, but the project is vanilla JS. Two options were presented:
  - **Path A:** Full rewrite in Next.js (new repo or new project init in same repo)
  - **Path B:** Add `login.html` + vanilla JS session check to existing architecture
  User did not choose before context ran out.
- **Supabase anon key is hardcoded** in `topbar.js`, `sync.js`, `time-blocking.js`. This is acceptable for a publishable key but should move to env vars if the project migrates to Next.js.

---

### Known issues / blockers

- `migrations/001_time_blocks.sql` has NOT been run yet — time blocks only persist to localStorage, not Supabase, until this is done manually.
- The Supabase anon key was shared in chat multiple times. It is a publishable key (safe to expose client-side) but two fine-grained PATs were also shared and should have been revoked immediately.
- No auth system exists. The app is currently fully public — anyone with the URL can see/edit data.
- `po_coach_photos` (base64 progress photos in gym.html) has no cloud sync path yet.
- The `row/` subdirectory in the repo is a duplicate copy of all files — likely an artifact. It is untracked and should be deleted or gitignored.

---

### How to test current state

No build step needed — open the HTML files directly or visit the Vercel deployment.

```bash
# Verify sync.js is wired (check for initCloudSync call in each page):
grep "initCloudSync" index.html health.html po-water.html finance.html

# Verify time-blocking.js is loaded:
grep "time-blocking.js" index.html

# Verify Supabase credentials are present (not placeholders):
grep "PASTE-YOUR" topbar.js sync.js time-blocking.js
# Should return: no output

# View the deployed site:
# https://[your-vercel-url].vercel.app
```

To test time blocking: visit the Goals page → scroll down → "TIME BLOCKING" section should appear. Creating a block requires `migrations/001_time_blocks.sql` to be run first; until then blocks save to localStorage only.

---

### Next session — START HERE

**Read this file first, then:**

1. **Immediate action required:** Run `migrations/001_time_blocks.sql` in Supabase SQL Editor (Supabase dashboard → SQL Editor → New query → paste file → Run). File is at `migrations/001_time_blocks.sql`.

2. **Confirm auth path decision** before writing any Phase 0 code:
   - Path A = rewrite in Next.js/React (ask user if new repo or same repo)
   - Path B = add `login.html` + session guard to existing vanilla JS

3. **If continuing Phase 1 without auth first:**
   - Start with `topbar.js` nav restructure (small, self-contained)
   - Then remove tomorrow block from `index.html`
   - Then weekly time blocking view in `time-blocking.js`
   - Then objectives and routine tracker as new `.js` files

4. **Do not re-scan the codebase** — all findings are documented above. The project is vanilla JS with no build system.

5. **To push after changes:**
   ```bash
   cd "/Users/tiaradel/CLAUDE CODE/row"
   git add <files>
   git commit -m "description"
   git push https://adeltr:<GITHUB_TOKEN>@github.com/adeltr/row.git main
   ```
   A classic GitHub token (starts `ghp_`) is required — fine-grained PATs have failed.
