# UX OVERHAUL — Native iOS App Feel

> Read this file ENTIRELY.
> Then read CONTEXT_HANDOFF.md and CHANGES.md.
> Then read the UX/UI skill at `skillux.md` (at project root).
> THEN propose a plan and wait for my "go".

> Work in incremental STEPS. STOP after each step so I can test on my phone.

> This is a VISUAL + INTERACTION overhaul. DO NOT change any business logic, data models, or Supabase queries. Only touch HTML structure, CSS, and JS interactions/animations.
---

## THE PROBLEM

The app currently feels like a "web dashboard viewed on a phone" — not like a real mobile app. Specific issues:
- Too much latency/jank when switching tabs and navigating
- Dense Bloomberg-terminal layout doesn't translate well to mobile
- No native-feeling transitions or animations
- Touch interactions feel "clicky" not "fluid"
- Too much content visible at once — overwhelming cognitive load
- Scrolling feels web-like, not app-like
- No haptic/tactile feedback patterns
- Modals feel like desktop popups, not mobile sheets
- Forms feel like web forms, not native inputs

## THE GOAL

Make "All In" feel like a **premium native iOS app** — the kind you'd find in the App Store top charts. Think a hybrid of:
- **Apple Health**: clean card-based layout, smooth transitions, summary → detail drill-down
- **Strava**: activity feed, big stats cards, motivational UI
- **Hevy**: workout player we already have — extend that fluidity everywhere
- **Revolut/N26**: sleek financial dashboards, buttery animations, dark luxury
- **Notion**: clean typography, subtle interactions, satisfying micro-animations

The vibe: **premium, fast, fluid, minimal, satisfying to use with one thumb.**

---

## CRITICAL CONSTRAINTS

1. **PURE VANILLA HTML/CSS/JS** — no framework, no build step, no npm
2. **DO NOT change business logic** — Supabase queries, data modules, auth flow stay identical
3. **DO NOT remove features** — everything must still work, just look/feel better
4. **ALL existing data must still load/save correctly**
5. **Dark + Light mode must both work** — use CSS variables
6. **Gold accent color preserved** — it's the brand
7. **PWA must still work** — service worker, manifest, icons unchanged
8. DO NOT push to git
9. Work in STEPS, stop after each

---

## DESIGN SYSTEM — iOS-NATIVE PRINCIPLES

### Navigation — Bottom Tab Bar (THE biggest change)

Replace the TOP nav bar with a **bottom tab bar** — this is what makes an app feel native.

```
┌─────────────────────────────────────────┐
│                                          │
│           PAGE CONTENT                   │
│           (scrollable)                   │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│  🎯    🥗    🏋️    💰    📚            │
│ Goals  Intake  Gym  Finance  Library     │
│                                          │
│  ─── (bottom tab bar, fixed) ───         │
└──────────────────────────────────────────┘
```

Implementation:
- Fixed bottom bar: `position: fixed; bottom: 0; height: 56px; z-index: 9999`
- 5 tabs with icon + small label below
- Active tab: gold accent icon + label, inactive: muted gray
- Subtle scale animation on tap (icon bounces slightly)
- Safe area padding for iPhone notch: `padding-bottom: env(safe-area-inset-bottom)`
- On desktop (>768px): keep the bottom bar OR switch to side nav — your call, but bottom bar works fine on desktop too
- The TOP of the page gets a simple header: "All In" ring logo + page title + user avatar/settings icon
- Body padding-bottom: 72px (to account for fixed bottom bar)

Since we have separate HTML files (not SPA), the bottom bar must be INJECTED into each page via a shared JS module:
- Create `js/bottom-nav.js` that injects the bar into every page
- Highlight the active tab based on current page filename
- Remove the old top nav bar code from topbar.js (or repurpose topbar.js as bottom-nav.js)

### Page Headers

Each page gets a clean iOS-style header:
```
┌──────────────────────────────────────────┐
│  💍  Goals              [avatar] [⚙️]    │
│                                          │
│  Good morning, Abbas                     │
│  Tuesday, June 3                         │
└──────────────────────────────────────────┘
```
- Greeting adapts: "Good morning" / "Good afternoon" / "Good evening"
- User's display_name from user_profiles
- Today's date
- Settings gear → opens settings sheet (theme toggle, unit preferences, profile)
- On scroll down: header collapses to just the title (iOS large title → small title behavior)

### Cards — the Primary UI Element

EVERYTHING becomes a card. Replace flat sections with elevated cards.

```css
.card {
  background: var(--bg-card);
  border-radius: 16px;           /* more rounded than before */
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: var(--shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:active {
  transform: scale(0.98);        /* subtle press feedback */
}
```

Card types:
- **Summary card**: big stat number + label + trend arrow (like Apple Health)
- **Action card**: icon + title + subtitle + chevron right (drill-down)
- **Progress card**: progress ring or bar + label + percentage
- **List card**: grouped list items with separators (like iOS Settings)

### Sub-tabs — Segmented Control (iOS style)

Replace the plain text tabs (STACK | WATER | NUTRITION) with iOS segmented controls:

```css
.segmented-control {
  display: flex;
  background: var(--bg-tertiary);
  border-radius: 10px;
  padding: 3px;
  margin: 16px;
}
.segmented-control button {
  flex: 1;
  padding: 8px 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}
.segmented-control button.active {
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

Apply to ALL tab bars: Goals (ROUTINE|MONTHLY|TIME BLOCKS), Intake (STACK|WATER|NUTRITION), Gym (STRENGTH|STRETCHING|RUNNING), Finance (OVERVIEW|CASH FLOW|ADVISOR), Library (QUEUE|READING|COMPLETED).

### Modals → Bottom Sheets

Replace ALL modals (centered floating boxes) with **bottom sheets** that slide up from the bottom:

```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); /* iOS spring curve */
  z-index: 10000;
  max-height: 85vh;
  overflow-y: auto;
}
.bottom-sheet.open {
  transform: translateY(0);
}
.bottom-sheet-handle {
  width: 36px;
  height: 5px;
  background: var(--text-tertiary);
  border-radius: 3px;
  margin: 0 auto 16px;
}
.bottom-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 9999;
}
.bottom-sheet-backdrop.open {
  opacity: 1;
}
```

Features:
- Drag handle at top (the small gray bar)
- Swipe down to dismiss (touch events: track deltaY, dismiss if >100px)
- Backdrop tap to dismiss
- iOS spring animation curve
- Full-width on mobile, max-width: 500px centered on desktop

### Transitions Between Tabs

When switching tabs/sub-tabs, content should NOT just appear/disappear. Add slide transitions:

```css
.tab-content {
  animation: slideIn 0.25s ease;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

For bottom sheet drill-downs (tap card → detail):
```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Scroll Behavior

- `scroll-behavior: smooth` globally
- `-webkit-overflow-scrolling: touch` on all scrollable containers
- Pull-to-refresh visual indicator (optional but native-feeling)
- Momentum scrolling everywhere
- Snap scrolling on horizontal carousels (habit grid, weekly view):
```css
  .scroll-snap-container {
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .scroll-snap-item {
    scroll-snap-align: start;
  }
```

### Typography — Tighter, Cleaner

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.4;
}

/* iOS-style type scale */
.title-large { font-size: 34px; font-weight: 700; letter-spacing: -0.5px; }
.title-medium { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
.title-small { font-size: 17px; font-weight: 600; }
.body { font-size: 15px; font-weight: 400; }
.caption { font-size: 13px; font-weight: 500; color: var(--text-secondary); }
.stat-number { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
```

Keep monospace ONLY for: timer countdown, pace values, weight numbers in workout player.

### Haptic Feedback Patterns (for supported devices)

```javascript
function haptic(style = 'light') {
  if (navigator.vibrate) {
    const patterns = { light: 10, medium: 20, heavy: 30, success: [10, 50, 10] };
    navigator.vibrate(patterns[style] || 10);
  }
}
```

Use on:
- Tab switches: `haptic('light')`
- Set logged in workout player: `haptic('success')`
- Habit checked: `haptic('light')`
- Goal completed: `haptic('success')`
- Delete actions: `haptic('heavy')`

### Loading States

Replace any "loading..." text with skeleton screens:

```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

Show skeleton cards while data loads from Supabase. Replace instantly when data arrives.

### Micro-interactions

- Buttons: slight scale on press (`transform: scale(0.96)` on `:active`)
- Checkboxes (habits): satisfying check animation (scale up briefly, then settle)
- Progress rings: animate from 0 to current value on load (CSS `stroke-dashoffset` animation)
- Numbers: count-up animation when stats load (e.g., "2,450 kcal" counts up from 0)
- Toast notifications: slide in from top, auto-dismiss after 3s, swipe to dismiss

### Color Refinements

Keep the gold accent but refine the palette for iOS feel:

```css
:root, [data-theme="dark"] {
  --bg-primary: #000000;         /* true black for OLED */
  --bg-secondary: #1c1c1e;      /* iOS dark secondary */
  --bg-tertiary: #2c2c2e;       /* iOS dark tertiary */
  --bg-card: #1c1c1e;
  --text-primary: #ffffff;
  --text-secondary: #8e8e93;    /* iOS gray */
  --text-tertiary: #636366;
  --separator: rgba(84,84,88,0.65); /* iOS separator */
  --accent-gold: #d4a853;
  --accent-green: #30d158;      /* iOS green */
  --accent-red: #ff453a;        /* iOS red */
  --accent-blue: #0a84ff;       /* iOS blue */
  --accent-orange: #ff9f0a;     /* iOS orange */
}

[data-theme="light"] {
  --bg-primary: #f2f2f7;        /* iOS light bg */
  --bg-secondary: #ffffff;
  --bg-tertiary: #e5e5ea;
  --bg-card: #ffffff;
  --text-primary: #000000;
  --text-secondary: #8e8e93;
  --text-tertiary: #aeaeb2;
  --separator: rgba(60,60,67,0.29);
  --accent-gold: #b8943f;
  --accent-green: #34c759;
  --accent-red: #ff3b30;
  --accent-blue: #007aff;
  --accent-orange: #ff9500;
}
```

### Performance Optimizations

1. **Lazy load tab content**: only render the active tab's DOM. Other tabs = empty containers filled on switch.
2. **Debounce scroll events**: any scroll-based UI (header collapse, parallax) must be debounced at 16ms
3. **CSS containment**: add `contain: layout style paint` on card containers to help browser optimize rendering
4. **Reduce reflows**: batch DOM updates, use `requestAnimationFrame` for animations
5. **Image lazy loading**: `loading="lazy"` on all `<img>` tags (stretch photos, book covers)
6. **Minimize paint**: use `transform` and `opacity` for animations (GPU-accelerated), never animate `width`, `height`, `top`, `left`
7. **Font loading**: `font-display: swap` on Inter import to prevent FOIT

---

## STEPS — work incrementally

### Step 1 — Foundation: Bottom nav + Page headers + CSS system

- Create `js/bottom-nav.js` (replaces top nav)
- Create the iOS color variables + typography scale
- Create base CSS classes: .card, .segmented-control, .bottom-sheet, .skeleton, etc.
- Apply new page header to ALL pages
- Remove old top nav
- Bottom nav injected on all pages with active state

Test: navigate between all 5 sections using bottom nav on mobile.

### Step 2 — Goals page overhaul

- Segmented control for ROUTINE | MONTHLY | TIME BLOCKS
- Cards for: daily progress, habit tracker, objectives, time blocks
- Bottom sheets for: add goal, add habit, edit objective
- Slide transitions on tab switch
- Skeleton loading
- Collapsing header on scroll

### Step 3 — Intake page overhaul

- Segmented control for STACK | WATER | NUTRITION
- Nutrition: target ring as hero card, meal slots as action cards
- Food search: bottom sheet with instant search
- Stack: supplement cards with check animation
- Water: big tappable +/- buttons, ring animation

### Step 4 — Gym page overhaul

- Segmented control for STRENGTH | STRETCHING | RUNNING
- Strength sub-tabs as segmented control
- Workout player: already good but add haptics + smoother transitions
- Programs: card grid with press feedback
- Running log: big stat cards (distance, pace, time)
- Stretching: routine cards with photo thumbnails

### Step 5 — Finance page overhaul

- Segmented control for OVERVIEW | CASH FLOW | ADVISOR
- Net worth as hero number card
- Asset categories as expandable list cards
- Cash flow: income/expense summary cards + charts
- Advisor: health score as animated gauge card

### Step 6 — Library page overhaul

- Segmented control for QUEUE | READING | COMPLETED
- Book cards with cover placeholder, metadata, progress bar
- Reading progress: big ring with page count
- Bottom sheet for add/edit book
- Stats cards on completed tab

### Step 7 — Auth page + Onboarding + Settings

- Auth: keep ring logo design, refine for iOS feel (rounded input fields, bigger buttons)
- Onboarding: full-screen cards with swipe navigation (not just next button)
- Settings sheet: accessible from header gear icon, iOS-style grouped list

### Step 8 — Performance pass + Polish

- Lazy load all tab content
- Skeleton screens everywhere
- CSS containment on heavy sections
- Test on real iPhone: 60fps scrolling, no jank
- Haptic feedback on all key interactions
- Count-up animations on stats
- Final visual audit: every page, both themes, 375px

### Step 9 — Docs

- Update CHANGES.md
- Update CONTEXT_HANDOFF.md
- Note: "v2.0 — native iOS UX overhaul"

---

## STEP 0 — INSPECT & PROPOSE (no code yet)

Before any code:

1. Read this file fully
2. Read the UX/UI skill at [SKILL_PATH]
3. Read CONTEXT_HANDOFF.md
4. Skim ALL HTML files to understand current structure
5. Identify: how many modals exist across all pages? How many tab bars? How many forms?
6. List every file that will need changes

Propose:
- Step-by-step plan with specific file changes
- Approach for bottom nav injection (shared JS module)
- How to convert modals → bottom sheets without breaking functionality
- Performance strategy
- Any risks (especially around not breaking workout player, nutrition tracker, etc.)

WAIT for my "go" before Step 1. STOP after every step.

---

## ACCEPTANCE CRITERIA

### Navigation
- [ ] Bottom tab bar visible on ALL pages, fixed at bottom
- [ ] Active tab highlighted with gold accent
- [ ] Safe area padding for iPhone notch/home indicator
- [ ] Smooth tab switch with haptic feedback

### Cards & Layout
- [ ] All content in rounded cards (16px radius)
- [ ] Press feedback on interactive cards (scale 0.98)
- [ ] Summary cards with big stat numbers
- [ ] No raw/flat content outside cards

### Bottom Sheets
- [ ] ALL modals converted to bottom sheets
- [ ] Drag handle visible
- [ ] Swipe down to dismiss
- [ ] Backdrop tap to dismiss
- [ ] iOS spring animation

### Transitions
- [ ] Tab content slides in (not just appears)
- [ ] Bottom sheets slide up smoothly
- [ ] Progress rings animate on load

### Typography
- [ ] iOS type scale applied (34/22/17/15/13px)
- [ ] Inter font loaded with swap
- [ ] Monospace only on data values

### Performance
- [ ] 60fps scroll on real iPhone
- [ ] Skeleton screens during loading
- [ ] No layout shift when data arrives
- [ ] Lazy tab content loading

### Theme
- [ ] Dark mode uses iOS dark palette (true black #000)
- [ ] Light mode uses iOS light palette (#f2f2f7)
- [ ] Gold accent preserved and prominent
- [ ] Both modes look polished

### Mobile Specific
- [ ] Everything works at 375px
- [ ] Touch targets ≥ 44px
- [ ] No horizontal overflow anywhere
- [ ] Smooth momentum scrolling
- [ ] Haptic feedback on key actions

### Regression
- [ ] ALL features still work: goals, habits, nutrition, gym, running, stretching, finance, library
- [ ] Workout player still fluid
- [ ] Auth + onboarding still work
- [ ] PWA still installable
- [ ] Multi-user data isolation intact

---

START with STEP 0. Wait for "go". STOP after every step.