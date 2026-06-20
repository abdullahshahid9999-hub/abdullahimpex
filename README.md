# Inventory & Billing System — M Riaz Trading / Abdullah Impex

An inventory, sales, and invoicing system for a spinning-machinery parts
trading business, with two switchable company identities for billing.

## Modules

- **Stock** — products with code, name, size (2 or 3 part dimensions, e.g.
  `25*26*88` or `12*55`), unit (ft / set / nos / mtr), quantity, purchase
  rate, sale rate, description. Search by code, or by name + size.
- **Purchases** — bring stock in from a supplier at a given rate. Stock
  quantities update automatically and atomically.
- **Sales** — search a customer, sell stock items. Stock quantities are
  deducted automatically; you can't oversell what isn't in stock.
- **Invoices** — tenure-wise (e.g. monthly) sales-tax invoices. **The
  company profile (M Riaz Trading or Abdullah Impex) is only chosen here**,
  at invoice creation — everywhere else in the app always shows/uses M Riaz
  Trading by default. Generates a PDF matching your existing invoice format.
- **Suppliers** / **Customers** — simple contact records used by the above.
- **Dashboard** — stock value, low-stock alerts, this month's sales/purchases,
  recent invoices.
- **Settings** — edit either company's letterhead details, and a tucked-away
  **data export/backup** tool (pick modules + a date range, download as
  Excel) — kept off the main dashboard on purpose.

## Architecture

This is a monorepo with two genuinely separate, separately-deployed apps:

```
/database   SQL schema + atomic stock-update functions (run once in Supabase)
/backend    Node/Express API — the ONLY thing holding database credentials
/frontend   React (Vite) single-page app — talks only to the backend API
```

**Why this split matters for security:** the frontend never touches the
database directly and never sees the Supabase service-role key. It only
calls your backend over HTTPS with a login token. The backend verifies that
token on every request, then uses the secret service-role key to do the
actual database work. Row Level Security is enabled on every table with no
policies defined, so even a leaked anonymous key gets zero direct access —
the backend is the only door in.

## One-time setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's ready, open **SQL Editor** → New query, paste the entire
   contents of `database/schema.sql`, and run it. This creates all tables,
   locks them down with RLS, and seeds your two company profiles (M Riaz
   Trading with your real details; Abdullah Impex with placeholder details
   you can edit later from Settings).
3. Go to **Project Settings → API** and note down:
   - `Project URL` → this is `SUPABASE_URL`
   - `anon public` key → this is `VITE_SUPABASE_ANON_KEY`
   - `service_role` key (click "Reveal") → this is `SUPABASE_SERVICE_ROLE_KEY`
     — **keep this secret, it only ever goes in the backend's environment.**

### 2. Create your two admin logins

In Supabase: **Authentication → Users → Add user**. Create one user per
partner (email + password). No extra setup needed — both have full access,
there are no roles to configure.

### 3. Backend — local setup

```bash
cd backend
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGINS
npm install
npm run dev
```

Runs on `http://localhost:4000`.

### 4. Frontend — local setup

```bash
cd frontend
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

Runs on `http://localhost:5173`. Sign in with one of the accounts you made.

## Deploying (Vercel + Supabase)

Supabase is already "live" once you ran the schema — there's nothing extra
to deploy there. You'll create **two** Vercel projects from this same repo:

### Deploy the backend

1. In Vercel: **Add New Project** → import this GitHub repo.
2. Set **Root Directory** to `backend`.
3. Add environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ALLOWED_ORIGINS` (leave this blank for now — you'll fill it in after the
   frontend is deployed).
4. Deploy. Note the resulting URL, e.g. `https://abdullahimpex-backend.vercel.app`.

### Deploy the frontend

1. **Add New Project** again → same repo, **Root Directory** = `frontend`.
2. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   and `VITE_API_URL` = the backend URL from the step above.
3. Deploy. Note this URL too, e.g. `https://abdullahimpex.vercel.app`.

### Connect them

Go back to the **backend** Vercel project → Settings → Environment
Variables → set `ALLOWED_ORIGINS` to your frontend's URL (no trailing
slash) → redeploy the backend. This is what allows your frontend's browser
requests through.

That's it — visit your frontend URL and sign in.

## Notes

- **Abdullah Impex's details are placeholders.** Real NTN, address, and
  contact info should be entered under Settings → Abdullah Impex → Edit,
  whenever you're ready. Nothing else needs to change.
- **The default company is always M Riaz Trading.** The only place you can
  switch to Abdullah Impex is the "New invoice" screen.
- **Backups:** Settings → Data export & backup. Pick which modules to
  include and an optional date range, then download an `.xlsx` file. This
  is manual/on-demand by design, not automatic.
- **Rotate your GitHub token.** If a personal access token was ever shared
  outside of GitHub's own UI (e.g. pasted into a chat), revoke it from
  GitHub → Settings → Developer settings → Personal access tokens, and
  generate a new one if you need it again.
