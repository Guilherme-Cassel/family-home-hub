# Casa em Ordem

A family household web app for tracking pantry stock and recurring home maintenance. Multi-user, single household: everyone who logs in sees and edits everything, and every record keeps who did what.

The main flow is photo-based restocking: you photograph the groceries after a shopping trip, AI identifies each product, the app matches it against what's already registered, and you review everything before anything is saved.

## What it does

- **Closed access** — no sign-up screen: accounts are created by hand in the Supabase dashboard, because the app is exposed on the internet.
- **Stock** — registration, search, category filters, and consume/restock buttons right on the list. Badges for "below minimum", "expires in N days", and "expired".
- **Shopping list** — built automatically from items below their minimum quantity, plus one-off extras for ad hoc purchases.
- **Bulk entry** — by photo (AI-assisted) or by typing into a table with autocomplete.
- **Maintenance** — urgency traffic light, one-tap "mark as done", history with date and author.
- **Recipes** — suggestions based on what's in stock, prioritizing items close to expiring.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Database and auth | Supabase (Postgres + Auth), free tier |
| AI | Google Gemini (Flash model), free tier |
| Deploy | Vercel, Hobby plan |

No component library, no icon library, no fuzzy-matching library — all of that is small, custom code in `components/` and `lib/`.

---

## Running locally

Needs Node 20 or newer.

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor**, paste the contents of [`migrations.sql`](migrations.sql) (schema, RLS and functions, all in one file) and run it.
3. In **Project Settings → API**, copy the project URL and the public key.

The script is idempotent: running it again won't break anything. If you'd rather review it in parts, the same statements are split across `supabase/migrations/0001` to `0006`, in the order they should run.

### 2.1. Close open sign-up — required

The app **has no account-creation screen**, on purpose: it's exposed on the internet, and open self sign-up would let anyone in, mess with the household's data, and burn through the Gemini API quota.

**But removing the screen alone protects nothing.** The Supabase public key ships in the browser bundle by nature, and with it anyone can call the sign-up endpoint directly, bypassing the UI. The real block is in the dashboard:

**Authentication → Sign In / Providers → Email → uncheck _Allow new users to sign up_ → Save.**

As long as that stays on, sign-up remains open even with no screen for it in the app.

### 2.2. Create the family accounts

With sign-up closed, accounts are created by hand:

**Authentication → Users → Add user** → email and password → check **Auto Confirm User** (otherwise the person gets stuck waiting for a confirmation email).

The matching profile is created automatically on first login, so there's nothing else to do. The displayed name defaults to the start of the email; to pick a different one, fill in `display_name` under **User Metadata** when creating the account.

### 3. Get a Gemini key

Grab one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). No credit card required.

### 4. Set the environment variables

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same place (older projects call it *anon key*; if so, use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead) |
| `GEMINI_API_KEY` | Google AI Studio |
| `GEMINI_MODEL` | optional, defaults to `gemini-3.5-flash-lite` |
| `GEMINI_BATCH_SIZE` | optional, defaults to `6` |

`GEMINI_API_KEY` **deliberately has no** `NEXT_PUBLIC_` prefix: it only exists on the server. The file `lib/gemini.ts` is marked `server-only`, so the build fails if any client component tries to import it.

### 5. Run it

```bash
npm run dev
```

Open `http://localhost:3000` and log in with the account you created in the Supabase dashboard.

Other commands:

```bash
npm run build
```

```bash
npm run typecheck
```

```bash
npm run lint
```

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new) — Vercel detects Next.js automatically.
3. In **Settings → Environment Variables**, add the same variables from `.env.local` for both Production and Preview.
4. Deploy.

The app is mobile-first. Worth opening it on a phone and using "Add to Home Screen" so it behaves like an installed app.

---

## Limitations worth knowing

- **Supabase pauses after 7 days of inactivity** (free tier). `vercel.json` schedules a daily ping to `/api/cron/keep-alive` (Vercel Cron, not GitHub Actions — which disables inactive workflows) to prevent that. Set `CRON_SECRET` on Vercel; without it the endpoint still works, but stays open.
- **Default model `gemini-3.5-flash-lite`**: chosen from measurement, not preference — it's the fastest (5s vs. 34s for `flash` on the same 6-photo batch) and has the highest free quota (500 req/day). `GEMINI_MODEL_FALLBACK` automatically switches models if the primary one returns `503` (capacity issue on Google's side, unrelated to your quota).
- **Gemini's quota is finite**: photos are sent in batches (`GEMINI_BATCH_SIZE`, default 6) and only called on demand. Hitting the quota has its own screen with a shortcut to type items in manually.
- **Photos aren't stored**: they live only in browser memory and in the request body sent to the AI; nothing goes to Supabase Storage.
- **Recipe suggestions are AI-generated** and can have inaccurate quantities or steps — the app warns about this on screen.

---

## Structure

```
app/
  (auth)/          sign in and account creation
  (app)/           logged-in area: dashboard, stock, shopping, entry, maintenance, recipes
  api/             serverless routes that talk to Gemini
components/        custom UI kit + per-feature components
lib/
  supabase/        browser, server and proxy clients
  actions/         Server Actions shared across screens
  gemini.ts        Gemini client (server-only)
  geminiClient.ts  browser-side calls to /api
  fuzzyMatch.ts    approximate product-name matching
  jsonIA.ts        defensive parser for the model's JSON
  status.ts        rules for stock badges and the maintenance traffic light
supabase/
  migrations/      the same statements from migrations.sql, split into steps
types/             database types and the AI contract
proxy.ts           session renewal on every request
migrations.sql     full schema, to paste at once into the SQL Editor
```

### Decisions that might not be obvious

- **`proxy.ts`, not `middleware.ts`** — renamed convention in Next 16.
- **Generated columns in Postgres** (`is_below_minimum`, `next_due_date`) — PostgREST can't compare two columns in a filter, so materializing this in the database allows sorting/filtering with a simple query, no view needed.
- **Trigger on `stock_movements`** adjusts the item's balance in the database, not the application, so manual consumption, typed entry, and photo entry never drift out of sync with the history.
- **`requireUser()` in every Server Action** — Server Actions can bypass the proxy's matcher, so the session is re-validated inside each one.
- **`profiles` table** mirrors `auth.users` (unreadable by the client) so the app can show "done by so-and-so".
- **The stock registry is sent along with the photos in the AI prompt** — the numbered list lets the model point to the index of an existing item (resolved server-side, never trusted blindly), which handles cases plain fuzzy matching misses (e.g. "Whole milk" vs. "1L Milk Carton").
- **Search and filtering happen client-side** — a household has dozens of items, not thousands; filtering in memory avoids a round-trip per keystroke on mobile.
