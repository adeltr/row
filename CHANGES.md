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
