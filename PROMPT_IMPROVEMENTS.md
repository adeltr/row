# Improvements — Finance Refonte + Goals Restructure + Library Section

> Read this file ENTIRELY. Then read CONTEXT_HANDOFF.md and CHANGES.md. THEN propose a plan and wait for my "go".

> Work in incremental STEPS. STOP after each step so I can test.

> CRITICAL: Preserve the existing design system (DS+A) — same components, spacing, visual hierarchy, interactions, UX logic. Do NOT introduce new visual patterns. Reuse existing card styles, modals, tab bars, progress bars, form inputs, and color palette (gold accent, Bloomberg-terminal aesthetic, dark/light mode support).

---

## Project context

"All In" — vanilla HTML/JS + Supabase + Vercel. Bloomberg-terminal dark aesthetic with gold accent. Dark/light mode. PWA. Multi-user with RLS.

All previous phases complete (0-4). Read CONTEXT_HANDOFF.md for full architecture.

---

## CRITICAL CONSTRAINTS

1. DO NOT introduce React, Vue, or any framework. Pure vanilla HTML/JS.
2. DO NOT add a build step or package.json.
3. DO NOT break ANY existing features.
4. DO NOT create new visual patterns — reuse existing DS+A components.
5. DO NOT hardcode user_id, keys, or URLs. Use `getUserId()` helper.
6. DO NOT auto-run SQL migrations. Output as files.
7. DO NOT push to git.
8. ONE migration file for all changes.
9. Work in incremental STEPS. STOP after each step.
10. Scalable design: must handle hundreds of books, objectives, and financial transactions without performance issues. Use pagination, lazy loading, and efficient queries.

---

# ═══════════════════════════════════════════════════
# STEP 1 — SQL MIGRATION (all 3 features in one file)
# ═══════════════════════════════════════════════════

File: `supabase/migrations/[YYYYMMDD]_improvements_finance_goals_library.sql`

### 1A. Finance — Monthly Cash Flow tables

**`cash_flow_entries`**
```sql
create table if not exists cash_flow_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  month       int not null check (month between 1 and 12),
  year        int not null,
  direction   text not null check (direction in ('income','expense')),
  category    text not null,
  subcategory text,
  name        text not null,
  amount      numeric not null default 0,
  is_recurring boolean default false,
  notes       text,
  created_at  timestamptz default now()
);
```

Income categories: `'salary','scholarship','freelance','dividends','other_income'`
Expense categories: `'housing','transport','food','leisure','education','health','subscriptions','other_expense'`

**`cash_flow_monthly_snapshots`** (pre-computed monthly summaries for fast dashboard loading)
```sql
create table if not exists cash_flow_monthly_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  month           int not null,
  year            int not null,
  total_income    numeric default 0,
  total_expenses  numeric default 0,
  net_savings     numeric default 0,
  savings_rate    numeric default 0,
  breakdown       jsonb default '{}'::jsonb,
  created_at      timestamptz default now(),
  unique (user_id, month, year)
);
```

**`financial_advice_logs`** (store generated advice so we don't recompute every load)
```sql
create table if not exists financial_advice_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  month       int not null,
  year        int not null,
  health_score int check (health_score between 0 and 100),
  insights    jsonb not null,
  actions     jsonb not null,
  created_at  timestamptz default now(),
  unique (user_id, month, year)
);
```

### 1B. Library tables

**`books`**
```sql
create table if not exists books (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  author          text,
  category        text,
  difficulty      text check (difficulty in ('easy','medium','hard','expert')),
  pages           int,
  status          text not null default 'queue' check (status in ('queue','reading','completed','abandoned')),
  priority        int default 3 check (priority between 1 and 5),
  estimated_hours numeric,
  cover_url       text,
  started_at      date,
  finished_at     date,
  rating          int check (rating between 1 and 5),
  personal_notes  text,
  key_takeaways   jsonb default '[]'::jsonb,
  current_page    int default 0,
  linked_objective_id uuid references monthly_objectives(id) on delete set null,
  linked_yearly_id    uuid references yearly_objectives(id) on delete set null,
  tags            jsonb default '[]'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

**`book_notes`** (per-book notes, quotes, citations)
```sql
create table if not exists book_notes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  book_id   uuid not null references books(id) on delete cascade,
  page      int,
  chapter   text,
  note_type text default 'note' check (note_type in ('note','quote','idea','summary')),
  content   text not null,
  created_at timestamptz default now()
);
```

### 1C. Modifications to existing tables

Add `linked_book_id` to goals for book↔goal linking:
```sql
alter table goals add column if not exists linked_book_id uuid references books(id) on delete set null;
```

### RLS

All new tables: enable RLS + owner-only policies (select/insert/update/delete with `auth.uid() = user_id`).
`book_notes`: scope through parent book ownership (exists subquery).

### Indexes
```sql
create index if not exists cash_flow_entries_user_month on cash_flow_entries (user_id, year, month);
create index if not exists books_user_status on books (user_id, status);
create index if not exists book_notes_book on book_notes (book_id);
```

STOP after Step 1. Wait for me to apply migration.

---

# ═══════════════════════════════════════════════════
# STEP 2 — DATA LAYERS (3 new files)
# ═══════════════════════════════════════════════════

### `js/cashflow-data.js`

CRUD:
- `loadEntries(month, year)` — all entries for a month
- `addEntry(fields)`, `updateEntry(id, fields)`, `deleteEntry(id)`
- `loadMonthlySnapshot(month, year)` — pre-computed totals
- `computeMonthlySnapshot(month, year)` — recalculate from entries, upsert to snapshots table
- `loadSnapshotHistory(numMonths)` — last N months for trend chart
- `subscribeCashFlow(callback)` — realtime on cash_flow_entries

Analytics (pure functions):
- `computeSavingsRate(income, expenses)` — returns percentage
- `computeCategoryBreakdown(entries)` — returns { category: total } for expenses
- `computeTopCategories(breakdown, limit)` — sorted top N expense categories
- `compareToLastMonth(currentSnapshot, previousSnapshot)` — returns deltas per metric

### `js/financial-advisor.js` (rule-based analysis engine, NO external API)

The "Financial Optimization Advisor" uses rule-based logic to analyze spending patterns:

- `analyzeMonth(entries, currentSnapshot, previousSnapshot, subscriptions)` — returns:
```javascript
  {
    healthScore: 0-100,
    insights: [
      { type: 'warning', category: 'food', message: 'Les dépenses restaurants ont augmenté de 18% ce mois.', delta: 18 },
      { type: 'alert', category: 'savings', message: 'Votre taux d\'épargne est passé de 22% à 14%.', delta: -8 },
      ...
    ],
    actions: [
      { priority: 'high', message: 'Réduire les sorties restaurant de 150$/mois', potential_savings: 150 },
      { priority: 'medium', message: 'Revoir les abonnements: 3 abonnements peu utilisés détectés', potential_savings: 120 },
      ...
    ],
    potentialMonthlySavings: 270
  }
```

Rules to implement:
1. **Spending increase detection**: if category increased >15% vs last month → warning
2. **Savings rate monitoring**: if <20% → alert, if <10% → critical
3. **Subscription analysis**: cross-reference with `finance_subscriptions` table — flag subscriptions that cost >5% of total income
4. **Category benchmarks**: housing >35% of income → warning, food >20% → warning
5. **Recurring expense detection**: if same amount appears 3+ months → flag as recurring
6. **Health score**: weighted composite of savings rate (40%), spending stability (20%), subscription efficiency (20%), emergency fund progress (20%)
7. **Trend analysis**: if total expenses trending up over 3 consecutive months → warning
8. **Action prioritization**: sort by potential_savings descending

**Language: French** — all insight messages and action suggestions in French.

- `saveAdvice(month, year, analysis)` — store in financial_advice_logs
- `loadAdvice(month, year)` — retrieve stored advice (cache, avoid recomputing)

### `js/library-data.js`

CRUD:
- `loadBooks({ status, category, sortBy, limit, offset })` — filtered, paginated
- `addBook(fields)`, `updateBook(id, fields)`, `deleteBook(id)`
- `updateReadingProgress(bookId, currentPage)` — also computes % from pages
- `loadBookDetail(bookId)` — book + all notes
- `addBookNote(bookId, fields)`, `updateBookNote(id, fields)`, `deleteBookNote(id)`
- `loadBookStats()` — total read, reading, queue counts + pages read this year
- `searchBooks(query)` — search by title, author, tags
- `linkBookToObjective(bookId, objectiveId, yearlyId)` — update linked IDs
- `subscribeBooks(callback)` — realtime

Follow EXACT same pattern as other data modules: getUserId() helper, user_id in every insert.

STOP after Step 2.

---

# ═══════════════════════════════════════════════════
# STEP 3 — GOALS SECTION RESTRUCTURE (index.html)
# ═══════════════════════════════════════════════════

### Current Goals page structure (too crowded):
- TODO list (daily goals)
- Monthly & Yearly Objectives
- Time Blocking (day/week)
- Routine Tracker (habits, challenges)

### New structure — 3 sub-tabs inside GOALS:

```
GOALS page → [ ROUTINE | MONTHLY | TIME BLOCKS ]
```

**ROUTINE sub-tab** (default):
- Daily habits grid (the existing routine tracker)
- Morning routine section
- Evening routine section
- Streaks display
- Challenge banner
- Day notes
- The daily TODO list moves here too (daily goals are part of routine)

**MONTHLY sub-tab**:
- Monthly objectives (existing, moved here)
- Yearly objectives (existing, moved here)
- Cascading view: yearly → monthly → daily todos
- Progress bars per objective
- KPIs: objectives completed this month, completion rate, streak of months with all objectives met
- Milestones view: timeline of completed objectives over the year

**TIME BLOCKS sub-tab**:
- Time blocking day/week view (existing, moved here)
- Deep work indicator: blocks tagged as "deep work" are highlighted differently
- Focus sessions counter: total deep work hours this week
- Weekly planning view (existing week view)

### Implementation:
- Reuse the EXACT tab bar pattern from health.html (STACK|WATER|NUTRITION) and gym.html (STRENGTH|STRETCHING|RUNNING)
- Move existing HTML blocks into tab containers — DO NOT rewrite the features, just reorganize
- Persist active tab in localStorage: `goals:active_tab`
- The daily progress ring at the top of the page stays ABOVE the tabs (always visible)
- Keep all existing functionality — this is a REORGANIZATION, not a rewrite

STOP after Step 3. Test:
- [ ] 3 tabs visible: ROUTINE | MONTHLY | TIME BLOCKS
- [ ] ROUTINE: daily todos + habits + streaks all work
- [ ] MONTHLY: objectives + cascading view work
- [ ] TIME BLOCKS: day/week views work
- [ ] Tab persists on refresh
- [ ] No regression on any existing Goals feature

---

# ═══════════════════════════════════════════════════
# STEP 4 — FINANCE SECTION: MONTHLY CASH FLOW
# ═══════════════════════════════════════════════════

### Add new sub-tabs to Finance page (finance.html)

Current finance page has: net worth tracker, subscriptions, wishlist, orders.

Add a tab bar at the top (same pattern as INTAKE/GYM):
```
FINANCE → [ OVERVIEW | CASH FLOW | ADVISOR ]
```

**OVERVIEW sub-tab** (default):
- Move existing finance content here: net worth tracker, assets, activity log
- Subscriptions, wishlist, orders stay here too
- Everything works exactly as before, just wrapped in a tab container

**CASH FLOW sub-tab** — new:

**Header:**
- Month/year selector (< June 2026 >) with prev/next navigation
- Currency display (from finance_profile)

**Income section:**
- Card titled "REVENUS"
- List of income entries for the month
- Each row: category icon + name + amount
- "+ Add income" button → modal with: category dropdown (salary/scholarship/freelance/dividends/other), name, amount, recurring toggle, notes
- Total income displayed prominently

**Expenses section:**
- Card titled "DÉPENSES"
- List of expense entries grouped by category
- Each category: collapsible header showing category name + icon + subtotal
- Inside: individual entries with name + amount + edit/delete
- "+ Add expense" button → modal with: category dropdown (housing/transport/food/leisure/education/health/subscriptions/other), name, amount, recurring toggle, notes
- Total expenses displayed prominently

**KPI cards row (below income/expenses):**
- Revenus totaux (with trend arrow vs last month)
- Dépenses totales (with trend arrow)
- Épargne nette (income - expenses, green if positive, red if negative)
- Taux d'épargne (%, with color: green >20%, orange 10-20%, red <10%)
- Évolution vs mois précédent (delta in $ and %)

**Charts section:**
- **Donut chart (SVG)**: répartition des dépenses par catégorie (housing, transport, food, etc.) with legend
- **Bar chart (SVG)**: cash flow mensuel — last 6 months, income bars vs expense bars side by side, net savings line overlay
- **Top catégories**: horizontal bar chart showing top 5 expense categories sorted by amount

**Auto-sync with subscriptions:**
- When loading a new month, check `finance_subscriptions` table
- Auto-populate recurring subscription amounts into expenses (category: subscriptions)
- Show "Auto-imported from subscriptions" label on these entries

### Category icons mapping:
```
salary → 💰, scholarship → 🎓, freelance → 💻, dividends → 📈, other_income → ➕
housing → 🏠, transport → 🚗, food → 🍽️, leisure → 🎮, education → 📚, health → ❤️, subscriptions → 📋, other_expense → 📦
```

STOP after Step 4. Test:
- [ ] Finance has 3 tabs: OVERVIEW | CASH FLOW | ADVISOR
- [ ] OVERVIEW: all existing finance features work (regression)
- [ ] CASH FLOW: can add income + expenses for current month
- [ ] Month navigation works (prev/next)
- [ ] KPIs calculate correctly
- [ ] Donut chart shows expense breakdown
- [ ] Bar chart shows 6-month trend
- [ ] Recurring entries carry over from subscriptions

---

# ═══════════════════════════════════════════════════
# STEP 5 — FINANCIAL OPTIMIZATION ADVISOR
# ═══════════════════════════════════════════════════

**ADVISOR sub-tab** in Finance:

### Layout:

**Health Score (top, big card):**
- Large circular gauge (0-100), gold accent
- Score label: "Excellent" (>80) / "Bon" (60-80) / "À améliorer" (40-60) / "Attention" (<40)
- Color: green >80, gold 60-80, orange 40-60, red <40
- Last computed date

**"Analyser ce mois" button:**
- Triggers `analyzeMonth()` from `js/financial-advisor.js`
- Shows loading spinner while computing
- Results saved to `financial_advice_logs`

**Insights section:**
- List of insight cards, each with:
  - Type icon: ⚠️ warning, 🚨 alert, ✅ positive, 💡 tip
  - Category badge
  - Message text (French)
  - Delta indicator (↑18%, ↓8%, etc.)
- Sorted by severity (alerts first, then warnings, then tips)

**Actions prioritaires section:**
- Numbered list of recommended actions
- Each with: priority badge (haute/moyenne/basse), message, potential savings amount
- "Économies potentielles: 270$/mois" total at bottom
- Gold accent on high-priority actions

**Tendances section (charts):**
- Line chart: savings rate over last 6 months (with 20% target line)
- Bar chart: expense category comparison this month vs last month (side by side bars)

**Historical advice:**
- Collapsible: "Voir les analyses précédentes"
- List of past months with their health scores
- Click → show that month's insights and actions

### Rule engine details (in `js/financial-advisor.js`):

All messages in FRENCH. Examples:

```javascript
// Spending increase
"Les dépenses {category} ont augmenté de {delta}% ce mois ({amount}$ vs {prevAmount}$)."

// Savings rate drop
"Votre taux d'épargne est passé de {prev}% à {current}%."

// Subscription alert
"Vous pourriez économiser environ {amount}$/mois sur les abonnements sous-utilisés."

// Category over benchmark
"Le logement représente {pct}% de vos revenus (recommandé: max 35%)."

// Positive trend
"Bravo ! Vos dépenses alimentaires ont baissé de {delta}% ce mois."

// Emergency fund
"À votre rythme d'épargne actuel, vous atteindrez 3 mois de dépenses de réserve dans {months} mois."
```

STOP after Step 5. Test:
- [ ] ADVISOR tab shows health score gauge
- [ ] "Analyser ce mois" button works (needs some cash flow entries first)
- [ ] Insights display with correct French messages
- [ ] Actions show with potential savings
- [ ] Charts render correctly
- [ ] Analysis saved and retrievable on next visit

---

# ═══════════════════════════════════════════════════
# STEP 6 — LIBRARY SECTION (new page)
# ═══════════════════════════════════════════════════

### New page: `library.html`

### Top nav update
Add LIBRARY to the top nav on ALL pages:
```
GOALS | INTAKE | GYM | FINANCE | LIBRARY
```
(5 nav items now — on mobile with the icon approach: 🎯 🥗 🏋️ 💰 📚)

### Library page structure — 3 sub-tabs:
```
LIBRARY → [ READING QUEUE | CURRENTLY READING | COMPLETED ]
```

### READING QUEUE sub-tab (default):

**Add book form (top):**
- "Quick add" input: title → autocomplete/search (optional, can just type)
- "+ Add book" button → full modal:
  - Title (required), Author, Category (dropdown: finance, tech, strategy, philosophy, science, fiction, self-help, business, other)
  - Difficulty (easy/medium/hard/expert), Pages, Estimated hours
  - Priority (1-5 stars)
  - Tags (comma-separated)
  - Link to objective (dropdown from monthly_objectives)
  - Link to yearly objective (dropdown from yearly_objectives)
  - Notes

**Queue list:**
- Cards sorted by priority (highest first), then by added date
- Each card: title, author, category badge, difficulty badge, priority stars, pages, estimated hours
- Tags as small chips
- Linked objective shown as small badge: "🎯 CFA Prep" or "📅 Learn ML"
- Actions: "📖 Start reading" (moves to currently reading), ✏️ edit, 🗑️ delete
- Filter by: category, difficulty, tag
- Sort by: priority, date added, pages, title

### CURRENTLY READING sub-tab:

**Active books (cards, larger than queue):**
- Book title + author
- Progress bar: current_page / pages (with %)
- "Update progress" input: page number → save → progress bar updates
- Started date + days reading
- Quick notes input (collapsed, expand on click)
- Actions: "✅ Mark as completed" (moves to completed, prompts for rating + takeaways), "⏸️ Back to queue"

**Reading stats card:**
- Books in progress count
- Pages read today (if tracked)
- Average reading pace (pages/day since started)

### COMPLETED sub-tab:

**Completed books list:**
- Cards with: title, author, category badge, rating (⭐ 1-5), finished date
- "Key takeaways" preview (first 2 lines, expandable)
- Personal notes preview
- Linked objective badge
- Click → detail view (modal):
  - Full book info
  - All notes/quotes/ideas organized by type
  - Summary section
  - "Re-read" button (moves back to queue)

**Stats section (top of completed tab):**
- Total books completed (all time + this year)
- Total pages read
- Favorite category (most books in)
- Average rating given
- Reading pace: books per month average

**Charts:**
- Bar chart: books completed per month (last 12 months)
- Donut: books by category
- Reading streak: consecutive weeks with at least 1 book finished (if applicable)

### Book detail/notes modal (accessible from any tab):

When clicking a book title → full detail modal:
- All metadata
- **Notes tab**: chronological list of all notes, filterable by type (note/quote/idea/summary)
- "+ Add note" button: type selector (note/quote/idea/summary), page number (optional), chapter (optional), content
- Notes are editable and deletable
- "Export notes" button → copies all notes to clipboard as formatted text

### Objective linking UX:
- When viewing a monthly or yearly objective (in Goals → MONTHLY), show linked books:
  - "📚 3 books linked" expandable showing book titles + status
- When completing a book, if it's linked to an objective, show: "This book contributes to: [objective name]"

STOP after Step 6. Test:
- [ ] LIBRARY appears in top nav on all pages (📚 on mobile)
- [ ] 3 tabs: READING QUEUE | CURRENTLY READING | COMPLETED
- [ ] Can add a book with all fields
- [ ] Can link book to monthly/yearly objective
- [ ] Queue sorted by priority
- [ ] "Start reading" moves to currently reading
- [ ] Progress bar updates when logging pages
- [ ] "Mark completed" prompts for rating + takeaways
- [ ] Completed tab shows stats + charts
- [ ] Book detail modal with notes CRUD
- [ ] Filter and sort work on queue
- [ ] Mobile responsive

---

# ═══════════════════════════════════════════════════
# STEP 7 — CROSS-SECTION INTEGRATIONS + DOCS
# ═══════════════════════════════════════════════════

### Integration: Library ↔ Goals
- In Goals → MONTHLY, on objective cards, show linked books count + titles
- In Library, linked objective badge on book cards
- Completing a book that's linked to an objective → auto-increment objective progress if objective is in auto-progress mode

### Integration: Cash Flow ↔ Finance Overview
- Monthly net worth change should factor in cash flow net savings
- Subscription expenses auto-imported into cash flow

### Integration: Cash Flow ↔ Nutrition
- If "food" category in cash flow exceeds budget AND nutrition logs show eating out frequently → advisor insight: "Préparer plus de repas maison pourrait réduire vos dépenses alimentaires"

### Update docs:
- CHANGES.md: document all new features + migration steps
- CONTEXT_HANDOFF.md: update architecture, table list, feature list
- README.md: add Library + Cash Flow + Advisor to feature list

STOP after Step 7. Final testing before commit.

---

# STEP 0 — INSPECT & PROPOSE (no code yet)

Before writing any code:

1. Read this file fully
2. Read CONTEXT_HANDOFF.md, CHANGES.md
3. Read `index.html` (Goals section structure) — understand what needs to be reorganized
4. Read `finance.html` — understand current finance structure
5. Skim `health.html` and `gym.html` for tab bar implementation pattern to reuse

Propose:
- Step-by-step plan with file lists
- SQL migration preview
- How to reorganize Goals without breaking existing features
- How to create library.html following existing page patterns
- Financial advisor rule engine approach
- Risks and any simplifications for v1

WAIT for my "go" before Step 1. STOP after every step.

---

# ACCEPTANCE CRITERIA

### Finance
- [ ] Finance has 3 tabs: OVERVIEW | CASH FLOW | ADVISOR
- [ ] OVERVIEW: all existing features work (regression)
- [ ] CASH FLOW: add income/expenses, monthly navigation, KPIs, charts
- [ ] Subscriptions auto-import into cash flow
- [ ] ADVISOR: health score gauge, insights in French, prioritized actions, potential savings
- [ ] Historical advice viewable

### Goals Restructure
- [ ] Goals has 3 sub-tabs: ROUTINE | MONTHLY | TIME BLOCKS
- [ ] ROUTINE: daily todos + habits + streaks + challenges + day notes
- [ ] MONTHLY: objectives (monthly + yearly) + cascading view + milestones
- [ ] TIME BLOCKS: day/week views + focus stats
- [ ] ALL existing functionality preserved (zero regression)

### Library
- [ ] New LIBRARY nav item on all pages
- [ ] 3 tabs: READING QUEUE | CURRENTLY READING | COMPLETED
- [ ] Full book CRUD with all metadata fields
- [ ] Reading progress tracking
- [ ] Notes/quotes/ideas per book
- [ ] Stats + charts on completed tab
- [ ] Book ↔ objective linking works both ways
- [ ] Filter, sort, search functional
- [ ] Scalable: handles 100+ books without lag

### Cross-cutting
- [ ] Mobile responsive (375px) — all new features
- [ ] Dark + light mode — all new features
- [ ] Gold accent consistent on new elements
- [ ] No console errors
- [ ] All data scoped to user_id
- [ ] Existing features: login, intake, gym, running, stretching ALL still work

---

START with STEP 0. Wait for "go". STOP after every step.