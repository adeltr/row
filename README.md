# Personal Dashboard

A set of small, self-contained HTML apps that share a top bar.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRowanThistlebrooke%2FYTdashh1)

One click → Vercel signs you in, copies the repo to your GitHub, and deploys it. ~30 seconds to a live URL.

## How to use

Open any `.html` file directly in your browser — no build step, no install.

| File | What it is |
|---|---|
| [index.html](index.html) | Goals tracker — Day Ring, Goal Ticker, To Do list, Routine Tracker, Monthly/Yearly Objectives, Time Blocking |
| [health.html](health.html) | Supplement stack + Water + Nutrition tracker |
| [finance.html](finance.html) | Net Worth, Subscriptions, Wish List, Orders, **Cash Flow**, **Financial Advisor** |
| [library.html](library.html) | **Book library** — queue, reading progress, completions, notes, stats |
| [gym.html](gym.html) | Strength (programs + workout player + history + stats), Stretching, Running |
| [po-water.html](po-water.html) | Water intake tracker |
| [topbar.js](topbar.js) | Shared top bar — Goals, Intake, Gym, Finance, Library + theme toggle |

All data synced to Supabase (Postgres + RLS). Auth via Supabase Auth. No build step.

## Building from scratch

[BUILD_DASHBOARD.md](BUILD_DASHBOARD.md) is the prompt I gave Claude to generate `index.html` — paste it into Claude if you want to rebuild that page yourself.
