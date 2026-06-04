# Phase 4 — Polish (Rebranding "All In" + Integrations + Dark/Light + PWA + Onboarding)

> Read this file ENTIRELY. Then read CONTEXT_HANDOFF.md and CHANGES.md. THEN propose a plan and wait for my "go".

> Work in incremental STEPS. STOP after each step so I can test.

---

## Project context

Same as all previous phases (vanilla HTML/JS, Supabase backend, Bloomberg-terminal dark aesthetic, Vercel).

**Everything works (Phases 0+1+2+3A+3B complete):**
- Auth, Goals, Objectives, Habits, Challenges, Time blocking
- INTAKE (Stack, Water, Nutrition with 140 foods + macros)
- GYM: Programs marketplace, Hevy workout player, Stretching with photos, Running with ACWR/VDOT/races/shoes/routes/plans
- FINANCE
- All data multi-user with RLS

**No known bugs.** This phase is pure polish, rebranding, and integration.

---

## CRITICAL CONSTRAINTS — non-negotiable

1. DO NOT introduce React, Vue, or any framework. Pure vanilla HTML/JS.
2. DO NOT add a build step or package.json.
3. DO NOT break ANY existing features. Test regression thoroughly.
4. DO NOT hardcode user_id, keys, or URLs.
5. DO NOT auto-run SQL migrations. Output as files.
6. DO NOT push to git. I'll commit + push myself.
7. ONE migration file for Phase 4 (if schema changes needed).
8. Match existing code patterns.
9. Work in incremental STEPS. STOP after each step.

---

# ═══════════════════════════════════════════════════
# STEP 1 — REBRANDING: "ALL IN" + Design Refresh
# ═══════════════════════════════════════════════════

The app is being rebranded from "ROW" to **"ALL IN"**.

**Tagline:** "One subscription to govern them all"
**Logo concept:** A ring (anneau) — minimal, geometric, inspired by a single golden/amber ring. Think Lord of the Rings "One Ring" aesthetic but modern and minimal.

### 1A. Logo creation (SVG)

Create `icons/logo.svg` — the All In ring logo:
- A single circle/ring shape (not a filled circle — an actual ring/anneau with a hole in the middle)
- Stroke-based, elegant, with a subtle gradient or glow effect
- Primary color: warm gold/amber on dark bg (#d4a853 or similar), dark gold on light bg
- Inside or around the ring: subtle "ALL IN" text or just the ring alone
- Create multiple sizes:
  - `icons/logo.svg` (scalable vector, primary)
  - `icons/logo-small.svg` (simplified for small sizes, favicon-like)
- The ring should have a subtle animated glow/pulse effect when used on the auth page (CSS animation, not JS)

### 1B. Auth page redesign (`auth.html`)

Complete visual overhaul of the login/signup page. This is the FIRST thing users see — it must be striking.

**Layout:**
- Centered card on a dark background
- Large ring logo at the top (animated subtle pulse/glow)
- "ALL IN" title in bold, clean typography below the ring
- Tagline: "One subscription to govern them all" in smaller muted text
- Login form below: email + password inputs, Login/Sign Up toggle
- Forgot password link
- Clean, minimal, luxurious feel — think high-end fintech or luxury app login (Revolut, N26, Amex style)

**Visual effects:**
- Background: very subtle dark radial gradient (not flat black) — from center outward
- Ring logo: gentle gold glow animation (CSS `@keyframes` with `box-shadow` or `filter: drop-shadow`)
- Form inputs: dark bg with subtle border, gold/amber accent on focus
- Buttons: gold/amber primary color, dark text
- Smooth transitions on toggle between Login and Sign Up modes

**Color palette (global accent refresh):**
- Primary accent: gold/amber (#d4a853 or #c9a84c)
- Secondary accent: keep existing green (#00ff88) for positive/success indicators
- Error: keep red (#ff4444)
- Gold becomes the new "brand color" — used for ring logo, primary buttons, active tab indicators, progress rings
- Dark mode: gold on dark
- Light mode: darker gold on light

### 1C. Global design refresh (ALL pages)

**Navigation bar:**
- Replace any "ROW" or app name reference with "ALL IN"
- Add the small ring logo (logo-small.svg) at the far left of the nav bar
- Nav items stay: GOALS | INTAKE | GYM | FINANCE

**Typography refresh (subtle, don't break layout):**
- Keep Bloomberg-terminal monospace accents for data/numbers/stats/timer
- Use cleaner sans-serif for headings and body text
- Import Google Font: `Inter` or `Space Grotesk` (both work with terminal aesthetics)
- Font stack: `'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif` for body
- Monospace stays for: numbers, stats, timer, data values, code-like content

**Accent color update:**
- Primary interactive elements (buttons, toggles, active tab indicators, progress rings) → gold/amber
- Keep green for success (✓ completed, streaks, goals met)
- Keep red for errors/warnings/danger
- Replace pink/teal accents with gold where it makes sense (don't change everything at once — focus on primary accent)

**Cards & containers:**
- Rounded corners: `border-radius: 8px` (consistent everywhere)
- Subtle shadow in light mode, subtle border glow in dark mode
- Consistent padding across all cards

**Progress rings & bars:**
- Goals page progress ring → gold/amber fill
- Nutrition target ring → gold/amber
- Habit completion → gold/amber percentage arc
- Any other progress indicators → gold/amber

**Page titles:**
- Update `<title>` tags on ALL HTML pages:
  - `auth.html` → "All In — Sign In"
  - `index.html` → "All In | Goals"
  - `health.html` → "All In | Intake"
  - `gym.html` → "All In | Gym"
  - `finance.html` → "All In | Finance"
  - `po-water.html` → "All In | Water"

### 1D. Favicon + PWA icons

- Create favicon from ring logo: `favicon.svg` and `favicon.ico` (16x16, 32x32)
- PWA icons (used in Step 4 PWA setup):
  - `icons/icon-192.png` — ring logo on dark bg
  - `icons/icon-512.png` — same, larger
  - `icons/icon-maskable-512.png` — with safe zone padding
- Add to ALL HTML `<head>`:
```html
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
```

### 1E. Update all text references

- Any hardcoded "ROW" or "Dashboard" → "All In"
- `README.md` → "All In — One subscription to govern them all"
- `manifest.json` (created in Step 4) → name: "All In", short_name: "All In"
- BUILD_DASHBOARD.md, CHANGES.md headers → update branding

### Design constraints
- Gold accent = accent only, NOT background color. Don't overwhelm.
- Bloomberg-terminal data-dense feel PRESERVED — adding luxury, not removing density
- Ring logo must work at 16px (favicon) → keep it simple
- ALL changes must work in BOTH dark and light modes (Step 3 adds the toggle)
- Mobile auth page: ring logo max 120px; desktop: max 180px

STOP after Step 1. Test:
- [ ] Auth page: new design with ring logo, glow animation, gold accents
- [ ] All pages: ring logo in nav, gold accent color, updated titles
- [ ] Favicon appears in browser tab
- [ ] Typography clean (Inter or Space Grotesk loaded)
- [ ] Progress rings gold/amber
- [ ] Mobile responsive auth page
- [ ] No regressions on any page

---

# ═══════════════════════════════════════════════════
# STEP 2 — Cross-section integrations
# ═══════════════════════════════════════════════════

### 2A. Running → Nutrition (calories burned → daily target)

When a run is logged, push calories to the nutrition system:

**Logic:**
- After `addRun()` in `js/running-data.js`, calculate calories if not already set:
  - Read user weight from `nutrition_profile.weight_kg` OR latest `body_weight_logs`
  - `calories_burned = weight_kg × distance_km × 1.036` (Cameron-Hibbert formula)
  - Store in `running_sessions.calories_burned`
- In NUTRITION target calculation (`computeDailyTargets` in `js/nutrition-data.js`):
  - Query today's `running_sessions` for total `calories_burned`
  - Add to activity bonus:
    - Goal = maintain → target += running_kcal (100% rebate)
    - Goal = gain → target += running_kcal (100% rebate)
    - Goal = lose → target += running_kcal × 0.5 (50% partial rebate, keep deficit)
  - Show in target breakdown: "Base 2200 + Gym 150 + Running 450 = 2800 kcal"

### 2B. Gym → Nutrition (workout calories → daily target)

Similar to running but for strength workouts:

**Logic:**
- After `finishWorkout()` in `js/workouts-data.js`, estimate calories:
  - Simple: `duration_min × 6 kcal` (moderate intensity weight training average)
  - Store in `workout_logs.calories_burned` (add column if not exists)
- In `computeDailyTargets`:
  - Query today's `workout_logs` for total calories_burned
  - Add to activity bonus with same goal-based logic as running
- Target ring now shows: "Base + Gym + Running = Total"

### 2C. Body Weight → Nutrition (auto-adjust TDEE)

When user logs new body weight, nutrition target auto-updates:

**Logic:**
- After `addBodyWeight()` in `js/strength-data.js`, check if `nutrition_profile` exists
- If yes, update `nutrition_profile.weight_kg` to match new weight
- Next `computeDailyTargets()` call uses latest weight automatically
- Subtle notification in NUTRITION: "Target updated — new weight: 78.5kg"
- Also affects run calorie estimation (depends on weight)

### Schema changes
```sql
alter table workout_logs add column if not exists calories_burned integer;
```

STOP after Step 2. Test:
- [ ] Log a run → NUTRITION target increases by estimated calories
- [ ] Log a gym workout → NUTRITION target increases
- [ ] Log body weight → nutrition_profile.weight_kg updates automatically
- [ ] Target ring breakdown shows "Base + Gym + Running = Total"
- [ ] Goal = lose → only 50% of activity calories added
- [ ] Goal = maintain/gain → 100% added

---

# ═══════════════════════════════════════════════════
# STEP 3 — Dark Mode / Light Mode toggle
# ═══════════════════════════════════════════════════

The app is currently dark theme only. Add a light mode alternative with toggle.

### 3A. CSS custom properties approach

Create theme variables in each HTML file (or a shared `<style>` block loaded by each page):

```css
:root, [data-theme="dark"] {
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-tertiary: #1e1e1e;
  --bg-card: #1a1a1a;
  --text-primary: #e8e8e8;
  --text-secondary: #999;
  --text-tertiary: #666;
  --border: #2a2a2a;
  --accent-gold: #d4a853;
  --accent-gold-hover: #b8943f;
  --accent-gold-glow: #f0d48a;
  --accent-green: #00ff88;
  --accent-red: #ff4444;
  --accent-blue: #4488ff;
  --shadow: 0 2px 8px rgba(0,0,0,0.3);
  /* ... extract ALL hardcoded colors */
}

[data-theme="light"] {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f0f0f0;
  --bg-card: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #555;
  --text-tertiary: #888;
  --border: #e0e0e0;
  --accent-gold: #b8943f;
  --accent-gold-hover: #9a7a30;
  --accent-gold-glow: #d4a853;
  --accent-green: #00aa55;
  --accent-red: #cc3333;
  --accent-blue: #2266cc;
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
}
```

### 3B. FULL color audit

**Audit ALL CSS** in every HTML file + topbar.js + time-blocking.js:
- Replace EVERY hardcoded color (`#0a0a0a`, `#141414`, `rgb(...)`, `rgba(...)`, color names) with CSS variables
- Don't miss: SVG fill/stroke colors, canvas drawing, box-shadows, scrollbar styling, selection colors, placeholder colors, focus outlines
- This is the BIGGEST part of this step — be thorough and systematic

### 3C. Theme toggle UI

- Add toggle icon (🌙/☀️) in the top-right of nav bar (next to user menu) on ALL pages
- On click: toggle `data-theme` attribute on `<html>` between "dark" and "light"
- Persist in localStorage: `theme:preference`
- On page load: read from localStorage + apply BEFORE first paint (inline `<script>` in `<head>`)
- Default: respect `prefers-color-scheme` media query if no localStorage value
- The gold accent should work beautifully in both modes

### 3D. Light mode design guidelines

- Keep Bloomberg-terminal TYPOGRAPHY (monospace for data)
- Light mode = professional, clean, slightly gray backgrounds (not pure white #fff — use #f5f5f5)
- Cards get subtle shadows instead of dark borders
- Charts/graphs: adjust colors for readability on light bg
- Progress rings: same gold, works on both backgrounds
- Auth page ring glow: adjust for light bg (darker shadow instead of light glow)

### 3E. Apply across ALL pages
- index.html, health.html, po-water.html, gym.html, finance.html, auth.html
- topbar.js rendered content
- time-blocking.js rendered content
- Any modals, overlays, toasts

STOP after Step 3. Test EVERY page in both modes:
- [ ] Toggle icon visible and functional on all 6 pages
- [ ] Dark mode: everything looks correct (same as before, but with gold accent)
- [ ] Light mode: readable, professional, no dark-colored text on dark backgrounds
- [ ] Charts/graphs readable in both modes
- [ ] Auth page: ring glow works in both modes
- [ ] Navigate between pages → theme persists
- [ ] Refresh → theme persists
- [ ] Mobile: toggle accessible
- [ ] No hardcoded colors leaking (use DevTools to spot)

---

# ═══════════════════════════════════════════════════
# STEP 4 — PWA (Progressive Web App)
# ═══════════════════════════════════════════════════

Make the app installable on mobile as a native-feeling app.

### 4A. Web App Manifest

Create `manifest.json` at root:
```json
{
  "name": "All In",
  "short_name": "All In",
  "description": "One subscription to govern them all — goals, nutrition, gym, finance",
  "start_url": "/index.html",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 4B. Icons

Use the ring logo from Step 1:
- `icons/icon-192.png` — ring logo centered on dark bg
- `icons/icon-512.png` — same, larger
- `icons/icon-maskable-512.png` — with safe zone padding (ring centered in inner 80% circle)
- Generate via canvas helper script, or create as SVG → convert with a simple HTML page that renders to canvas → toBlob

### 4C. Service Worker

Create `sw.js` at root — MINIMAL, cache shell only:

```javascript
const CACHE_NAME = 'allin-v1';
const SHELL_ASSETS = [
  '/', '/index.html', '/health.html', '/gym.html', '/finance.html',
  '/po-water.html', '/auth.html', '/topbar.js', '/time-blocking.js',
  '/manifest.json', '/favicon.svg'
  // + all js/*.js files
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL_ASSETS)));
});

self.addEventListener('fetch', e => {
  // Network-first for Supabase (NEVER cache API responses)
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

### 4D. Registration (ALL HTML pages)

In each HTML `<head>`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0a0a0a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

At bottom of each page (or shared script):
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### 4E. iOS-specific
- `<link rel="apple-touch-icon">` for iOS home screen icon
- `apple-mobile-web-app-status-bar-style: black-translucent` for immersive
- Optional splash screens for common iPhone sizes

### 4F. Dynamic theme_color
When user toggles light mode → update `<meta name="theme-color">` content to light bg color (#f5f5f5).

STOP after Step 4. Test:
- [ ] On iPhone/Android: "Add to Home Screen" option appears
- [ ] Install → app opens standalone (no browser chrome)
- [ ] Ring logo icon appears on home screen
- [ ] Navigate between pages works in standalone
- [ ] Offline: app shell loads (data needs network, that's fine)
- [ ] Theme toggle works in standalone mode
- [ ] Theme color matches current mode (dark/light status bar)

---

# ═══════════════════════════════════════════════════
# STEP 5 — Onboarding Wizard
# ═══════════════════════════════════════════════════

When a user signs up and logs in for the FIRST time, guide them through a setup wizard.

### Detection

- Query `user_profiles.onboarding_completed` (new table below)
- If false or row doesn't exist → show onboarding
- If true → skip to dashboard
- Also check: if `nutrition_profile` exists, user is NOT new (backward compat for existing accounts)

### Wizard flow (5 screens, full-page modal overlay)

**Screen 1: Welcome**
- Large ring logo with glow animation
- "Welcome to All In 👋"
- "Let's set up your dashboard in 2 minutes"
- Name input → stored in `user_profiles.display_name`
- [Continue →]

**Screen 2: Body & Nutrition Profile**
- Weight (kg), Height (cm), Age, Sex
- Activity level (sedentary → very active) with visual descriptions and icons
- Goal: Lose / Maintain / Gain (cards with descriptions)
- "We'll use this to calculate your daily calorie target"
- [Continue →]
- → Saves to `nutrition_profile`

**Screen 3: Gym Setup**
- "Do you follow a workout program?"
  - Yes → show seeded programs (Sèche Essan + any public) → copy + set active
  - No → "No worries, log freestyle or create a program later"
- "What unit do you prefer?" → kg / lbs toggle
- [Continue →]
- → Saves to `gym_profile`, optionally `user_active_programs`

**Screen 4: Running (optional)**
- "Do you run?" toggle
  - Yes →
    - "Add your first pair of shoes" (name, brand)
    - "What's your most recent 5K or 10K time?" (for VDOT estimation)
  - No → section stays collapsed
- [Continue →]
- → Saves to `running_shoes`, `pace_zones`

**Screen 5: Goals & Habits**
- "Set your first monthly objective" (title + description) → optional
- "Pick daily habits to track" — pre-defined suggestions with emojis:
  - 💧 Drink 8 glasses of water
  - 🏋️ Work out
  - 📚 Read 30 minutes
  - 🧘 Stretch
  - 😴 Sleep 8 hours
  - 🥗 Hit calorie target
  - ✏️ Custom: ___
- [Finish setup →]
- → Saves to `monthly_objectives`, `habits`
- → Sets `user_profiles.onboarding_completed = true`

**After wizard:**
- Redirect to dashboard (index.html)
- One-time welcome banner at top: "You're all set! Welcome to All In. 💍"
- Banner auto-dismisses after 5 seconds or on click

### Design
- Full-screen overlay (not a separate page — stays on index.html)
- Progress dots at top (1/5, 2/5, etc.) in gold
- "All In" branding + ring logo at top of each screen
- Dark/light mode support (uses CSS variables from Step 3)
- Mobile-first (most users onboard on phone)
- Each screen has a "Skip" option (nothing mandatory)
- Smooth slide transitions between screens
- Gold accent on all CTAs and progress indicators

### Schema
```sql
create table if not exists user_profiles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  avatar_url           text,
  onboarding_completed boolean default false,
  created_at           timestamptz default now()
);
alter table user_profiles enable row level security;
create policy "user_profiles_select" on user_profiles for select using (auth.uid() = user_id);
create policy "user_profiles_insert" on user_profiles for insert with check (auth.uid() = user_id);
create policy "user_profiles_update" on user_profiles for update using (auth.uid() = user_id);
create policy "user_profiles_delete" on user_profiles for delete using (auth.uid() = user_id);
```

STOP after Step 5. Test:
- [ ] Create NEW account (incognito) → onboarding wizard appears with ring logo
- [ ] Complete all 5 screens → data saved correctly in Supabase
- [ ] After completing → dashboard loads, wizard doesn't reappear on refresh
- [ ] Existing accounts (your main account) → NO wizard
- [ ] Skip buttons work on each screen
- [ ] Progress dots advance correctly
- [ ] Gold accent consistent throughout wizard
- [ ] Mobile responsive (test at 375px)
- [ ] Works in both dark and light mode

---

# ═══════════════════════════════════════════════════
# STEP 6 — Final polish & documentation
# ═══════════════════════════════════════════════════

### UX polish pass
- Verify ALL pages render correctly in dark AND light mode
- Verify PWA works on iOS Safari and Android Chrome
- Verify onboarding is smooth on mobile
- Check all empty states have friendly prompts (no blank screens)
- Verify cross-section integrations show correct numbers
- Test with completely fresh account: signup → onboarding → use every feature
- Check that the gold accent is consistent everywhere (no leftover pink/teal in primary positions)

### Display name integration
- If user has `display_name` in `user_profiles`, show it in:
  - User menu (top-right): "Abbas" instead of email
  - Onboarding welcome-back banner: "Welcome back, Abbas"
  - Optional: greeting on Goals page "Good morning, Abbas"

### Update docs

**CHANGES.md** — Phase 4 summary:
- "All In" rebranding (logo, auth page, gold accent, typography)
- Cross-section integrations (nutrition ↔ running ↔ gym ↔ body weight)
- Dark/Light mode toggle
- PWA (installable, service worker, icons)
- Onboarding wizard (5-screen setup flow)
- Migration steps for Phase 4

**CONTEXT_HANDOFF.md:**
- Mark Phase 4 complete
- Mark ENTIRE PROJECT as **v1.0 complete**
- Full feature list
- Architecture overview
- Table count + data flow diagram (text-based)

**README.md** — complete rewrite:
```markdown
# 💍 All In

**One subscription to govern them all.**

All In is a personal life dashboard that unifies goals, nutrition, gym training, running, stretching, habits, time blocking, and finance tracking in one app.

## Features
- 🎯 Goals & Objectives (daily/monthly/yearly with cascading progress)
- 📋 Habit Tracker (streaks, challenges, 75-hard style)
- ⏰ Time Blocking (day + week views)
- 🥗 Nutrition (140+ food database, macros, smart calorie target)
- 💊 Supplement Stack tracker
- 💧 Water tracker
- 🏋️ Workout Programs (marketplace, Hevy-style workout player)
- 🧘 Stretching (routines with photos, streak tracking)
- 🏃 Running (ACWR, VDOT, race predictor, training plans, shoes, routes)
- 💰 Finance (net worth tracker, subscriptions, wishlist)
- 🌙 Dark / Light mode
- 📱 PWA (installable on phone)
- 👋 Guided onboarding for new users
- 🔐 Multi-user with row-level security

## Tech Stack
- Pure vanilla HTML/JS (no framework, no build step)
- Supabase (auth, database, storage, realtime)
- Vercel (hosting, auto-deploy)

## Setup
1. Clone the repo
2. Create a Supabase project at supabase.com
3. Copy `js/config.example.js` → `js/config.js`, paste your Supabase URL + anon key
4. Run all SQL migrations in order (supabase/migrations/) via Supabase SQL Editor
5. Create Storage buckets: `gym-photos`, `stretch-photos`
6. Configure Auth: add your domain to Redirect URLs
7. Deploy to Vercel (connect GitHub repo)

## License
MIT
```

STOP after Step 6. Final review before marking project v1.0 complete.

---

# STEP 0 — INSPECT & PROPOSE (no code yet)

Before writing any code:

1. Read this file (PROMPT_PHASE4.md) fully
2. Read CONTEXT_HANDOFF.md, CHANGES.md
3. Skim ALL HTML files — note where hardcoded colors exist (for theme audit in Step 3)
4. Note current color values used for accents, backgrounds, borders, text
5. Read `js/nutrition-data.js` computeDailyTargets — understand current activity bonus logic
6. Read `js/running-data.js` addRun and `js/workouts-data.js` finishWorkout
7. Check if `workout_logs` already has a `calories_burned` column

Propose:
- Step-by-step plan with file lists per step
- Auth page design approach (layout, animation technique)
- Color audit strategy (how to find ALL hardcoded colors systematically)
- PWA icon generation method (canvas? SVG export? manual creation?)
- Onboarding detection method (DB flag vs localStorage)
- Estimated scope per step
- Any simplifications for v1

WAIT for my "go" before Step 1. STOP after every step.

---

# ACCEPTANCE CRITERIA — complete Phase 4

### Rebranding
- [ ] App is called "All In" everywhere (titles, nav, readme, manifest)
- [ ] Ring logo visible: auth page (large + animated), nav bar (small), favicon, PWA icon
- [ ] Auth page: striking redesign with gold accents, glow ring, luxury feel
- [ ] Gold/amber accent color on primary buttons, active tabs, progress rings
- [ ] Typography: Inter or Space Grotesk loaded, monospace preserved for data
- [ ] Consistent border-radius: 8px on cards

### Integrations
- [ ] Log a run → NUTRITION target increases by estimated calories
- [ ] Log a gym workout → NUTRITION target increases
- [ ] Log body weight → nutrition_profile.weight_kg updates
- [ ] Target ring breakdown: "Base + Gym + Running = Total"
- [ ] Goal-based adjustment: lose=50%, maintain/gain=100%

### Dark/Light Mode
- [ ] Toggle visible (🌙/☀️) in nav on ALL pages
- [ ] Clicking toggles between dark and light
- [ ] Theme persists across pages and refresh
- [ ] ALL pages render correctly in light mode (no hardcoded dark colors)
- [ ] Charts/graphs/SVGs readable in both modes
- [ ] Auth page ring glow adapts to both modes
- [ ] Respects system preference as default

### PWA
- [ ] manifest.json with correct "All In" branding and ring icons
- [ ] Service worker registered on all pages
- [ ] "Add to Home Screen" appears on mobile
- [ ] App opens standalone (no browser chrome)
- [ ] Ring icon on home screen
- [ ] Theme color updates with dark/light toggle

### Onboarding
- [ ] Fresh signup → wizard appears with ring logo and gold accents
- [ ] 5 screens: Welcome → Nutrition → Gym → Running → Goals/Habits
- [ ] Skip buttons on each screen
- [ ] After completion → dashboard, no wizard on refresh
- [ ] Existing accounts → no wizard
- [ ] Display name shown in user menu after onboarding
- [ ] Mobile responsive + works in both themes

### Regression (ALL previous phases)
- [ ] Login, signup, sign out
- [ ] Goals, objectives, habits, challenges, time blocking
- [ ] INTAKE (stack, water, nutrition)
- [ ] GYM (programs, workout player, stretching, running)
- [ ] FINANCE
- [ ] Multi-user isolation

---

START with STEP 0. Wait for "go". STOP after every step.