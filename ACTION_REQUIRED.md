# Action Required — things only you can do

> **Plan status: 31 of 33 items complete.** The two remaining are
> `4.4 cookie consent` (not applicable — no analytics have been added) and
> `6.3 staging environment` (§7 below — needs a hosting environment you own).
> Full detail in `PRODUCTION_READINESS_PLAN.md`.

> Everything the codebase cannot do for itself: database migrations, external
> service sign-ups, secrets, and CMS content. Grouped by urgency.
>
> **How to read the flags:**
> | Flag | Meaning |
> | :--- | :--- |
> | 🔴 **BLOCKER** | The app is broken or unsafe until this is done |
> | 🟠 **BEFORE LAUNCH** | Not broken today, but must be done before real customers |
> | 🟡 **RECOMMENDED** | Degrades gracefully without it, but you're losing a real protection |
> | ⚪️ **OPTIONAL** | Nice to have |
>
> Anything marked *scaffolded* means the code is written and wired — it only
> needs credentials to switch on.

---

## 1. Database migrations (Supabase → SQL Editor)

Run these in order. All are **additive and safe on existing rows** — no data is
rewritten, existing records simply get `NULL` in the new columns.

Your connection is pooler-only, so `prisma migrate` cannot run — these are
hand-written to be pasted into the Supabase SQL Editor.

| # | File | Status | What breaks without it |
| :--- | :--- | :--- | :--- |
| 1 | `prisma/migrations/block1_currency_snapshot.sql` | ✅ You ran this | Card checkout |
| 2 | `prisma/migrations/block1_shipping_address.sql` | ⬜ **Pending?** | Checkout writes columns that don't exist → every order fails |
| 3 | `prisma/migrations/block3_notification_outbox.sql` | ⬜ **Pending** | Order emails and their retries |

🔴 **BLOCKER** — confirm #2 and #3 have been applied. Each file ends with a
commented-out verification query; run it and check the expected row count.

---

## 2. External services

### 2.1 Upstash Redis — rate limiting 🟡 RECOMMENDED

*Scaffolded. Falls back safely, but the protection is off without it.*

Rate limiting is currently **in-memory and per-process**. On serverless every
concurrent instance gets its own empty counter, so the "5 OTP per minute" and
"3 checkouts per minute" limits effectively **do not exist in production** —
an attacker just lands on a fresh instance. The code logs a warning at startup
when this is the case.

1. Create a free database at <https://console.upstash.com>
2. Copy the **REST** URL and token (not the Redis protocol URL)
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

No code change needed — the limiter switches over automatically.

### 2.2 Resend — transactional email 🟠 BEFORE LAUNCH

*Scaffolded. Emails are written and wired; without a key they only log.*

Without `RESEND_API_KEY`, order confirmations print to the server console
instead of being sent. Customers who pay receive nothing.

1. Sign up at <https://resend.com>, verify your sending domain
2. Set `RESEND_API_KEY`
3. Set `EMAIL_FROM` to a verified address (e.g. `Halahello <orders@yourdomain>`)
4. Set `ADMIN_EMAIL` for contact-form and custom-request notifications

### 2.3 Error monitoring 🟡 RECOMMENDED

*Scaffolded. Works with any HTTP collector — no SDK or account required to start.*

Production failures were previously invisible: everything went to the platform
log stream, where nobody sees a failed payment webhook at 2am. Errors on the
critical paths (Stripe webhook, checkout, cron jobs, coupon over-issue) now go
through one reporting seam.

Set `MONITORING_WEBHOOK_URL` to any endpoint that accepts JSON — Sentry, a
Slack or Discord incoming webhook, or your own collector. Without it errors are
still logged, just not pushed anywhere.

Because reporting is centralised in `lib/monitoring.ts`, adopting a full SDK
later (e.g. `@sentry/nextjs`) is a one-file change rather than an edit to every
call site.

### 2.4 Stripe 🟠 BEFORE LAUNCH

- `STRIPE_SECRET_KEY` — live key
- `STRIPE_WEBHOOK_SECRET` — from the webhook endpoint you create in the Stripe
  dashboard, pointing at `https://<your-domain>/api/webhooks/stripe`

⚠️ **Confirm Stripe is actually available to you in Syria before relying on
it.** That is a sanctions/compliance question, not a technical one, and it may
decide the payment strategy for you.

### 2.5 WhatsApp (Meta) — login 🔴 BLOCKER for production

- `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID`

Customer login **is** WhatsApp OTP. Without these the OTP endpoint refuses to
issue codes in production — deliberately, because the old behaviour was to fall
back to a fixed code `123456` and return it in the API response, which let
anyone sign in as any phone number.

You will also need an approved WhatsApp message template named `auth_otp`.

---

## 3. Sanity CMS

### 3.1 Publish the exchange rate 🔴 BLOCKER for card payments

Studio → **💱 Currency & Exchange Rate** → set **"SYP per 1 USD"** → Publish.

Card checkout refuses to run until this exists. That is intentional: guessing a
rate would charge the wrong amount.

Update this whenever the market rate moves — it re-prices the whole catalogue
in USD instantly. Existing orders keep the rate they were placed at.

### 3.2 Legal pages 🔴 BLOCKER before taking payments

Studio → **📄 Legal Pages**. Create one document each for:

- **Privacy Policy** → `/privacy`
- **Terms & Conditions** → `/terms`
- **Refund & Shipping Policy** → `/refund-policy`

The footer links to all three. Until a document exists the route returns a
**404 by design** — a policy page showing placeholder text would look real and
be legally worthless, so nothing is shipped rather than something fake.

⚠️ **This needs real legal text.** I can build the pages but cannot author
enforceable terms for your business. Stripe will also ask for these during
onboarding.

Formatting: blank lines separate paragraphs; a short line ending in a colon is
rendered as a heading.

### 3.3 Site settings 🟠 BEFORE LAUNCH

Studio → **⚙️ Site Settings**. Real values here replace the placeholder
fallbacks currently compiled into the site:

- **WhatsApp number** — until set, the site shows a placeholder number
- **Instagram / Facebook / TikTok URLs**
- **Logo** — falls back to the bundled `/logo.jpg`
- **Support email**, **tagline**, **footer text**

### 3.4 Webhook secret 🔴 BLOCKER if you use Sanity webhooks

The Sanity → Postgres webhook now **rejects unsigned requests**. It previously
accepted them, meaning anyone could POST and set your product prices to zero.

`SANITY_WEBHOOK_SECRET` must match the secret configured on the webhook in
Sanity exactly, or the endpoint returns 500 and sync silently stops.
Setup steps are in `production_checklist.md`.

### 3.5 Redeploy after schema changes ⚪️ NOTE

The Studio menu is **defined in code**, so new panels only appear after the
site is redeployed. If a panel is missing online but present locally, the
deploy is simply behind.

---

## 4. Environment variables

Full annotated list with placeholders: **`.env.example`**.

`lib/env.ts` validates these at boot and **refuses to start in production** if
any required one is missing — it names the offender. This is deliberate: every
security hole found in the audit was caused by a missing secret silently
disabling the protection that depended on it.

**Required in production:**
```
DATABASE_URL              DIRECT_URL
AUTH_SECRET               BLOB_READ_WRITE_TOKEN
STRIPE_SECRET_KEY         STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_SANITY_PROJECT_ID   NEXT_PUBLIC_SANITY_DATASET
SANITY_WEBHOOK_SECRET
WHATSAPP_API_TOKEN        WHATSAPP_PHONE_ID
CRON_SECRET
```

**Recommended:**
```
UPSTASH_REDIS_REST_URL    UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY            EMAIL_FROM              ADMIN_EMAIL
SANITY_API_TOKEN
```

⚠️ `WHATSAPP_MOCK=true` is **rejected in production** and will prevent boot.
It belongs in local development only.

---

## 5. Scheduled jobs (Vercel Cron)

Configured in `vercel.json`, active automatically on deploy:

| Job | Schedule | Purpose |
| :--- | :--- | :--- |
| `/api/cron/expire-orders` | hourly | Cancels unpaid orders past their window |
| `/api/cron/retry-notifications` | every 15 min | Retries failed order emails |

🟠 Both require `CRON_SECRET`. In production they **refuse to run** without it
(they mutate order state and must not be publicly triggerable).

---

## 6. Scaffolded — awaiting credentials

Anything here is fully implemented in code and switches on with a secret.
*(This section grows as work continues.)*

| Item | Env var(s) | Behaviour without it |
| :--- | :--- | :--- |
| Rate limiting | `UPSTASH_REDIS_*` | In-memory; ineffective on serverless |
| Email delivery | `RESEND_API_KEY` | Logs to console instead of sending |
| ShamCash verification | `SHAMCASH_API_TOKEN` | Orders stay PENDING; admin must "Mark as Paid" manually |
| Instagram feed | `INSTAGRAM_ACCESS_TOKEN` | Falls back to static images |
| Error monitoring | `MONITORING_WEBHOOK_URL` | Errors logged locally but not pushed anywhere |

---

## 7. CI / staging ⚪️ OPTIONAL

`.github/workflows/ci.yml` runs typecheck, lint, tests, build and a dependency
audit on every push and PR. It works with no configuration.

Two deliberate choices:

- **Lint does not block.** There is pre-existing lint debt (mostly `any`
  types, 76 errors) that predates this work. Failing on it today would block
  every PR. It reports, and should be made blocking once the baseline is clean.
- **Only *critical* advisories fail the build.** The remaining high-severity
  ones live in the Sanity CLI toolchain and need an upstream fix (see §8).

**Still to do — staging environment 🟡 RECOMMENDED.** Payment and webhook
changes currently have nowhere to be exercised except production. A staging
deploy with Stripe *test* keys and a separate Sanity dataset would let the
end-to-end runs listed in §9 happen safely.

---

## 8. Known limitations & accepted risks

- **4 high-severity npm advisories remain**, all inside the Sanity **CLI**
  toolchain (`@sanity/cli`, `@sanity/runtime-cli`, `adm-zip`, `js-yaml`).
  These are build tooling, not code that serves customer requests. Clearing
  them requires downgrading `sanity` to 5.14.1, a breaking change. Revisit when
  Sanity ships a patched CLI.
- **`next-auth` is a beta release** (`5.0.0-beta.32`). There is no stable v5
  yet. It is now pinned exactly so it cannot drift on a fresh install.
- **Stripe minimum charge is $0.50.** Low-value SYP orders fall below it and
  are rejected at checkout with a clear message rather than an opaque
  processor error.
- **Local development needs `WHATSAPP_MOCK=true`** in `.env.local` to log in.
  Login is intentionally broken without it, so an unconfigured deploy cannot
  silently accept a fixed code.

---

## 9. Verification I could not perform

Honest list of what remains untested, because this environment has no database,
no Stripe keys and no email provider:

- A real Stripe checkout end-to-end, and confirming the charged amount in the
  Stripe dashboard (the plan's acceptance criterion for the currency fix)
- A full OTP login round-trip (reaches the database write, then stops)
- Order confirmation emails actually arriving
- Webhook delivery from Stripe and Sanity against a live endpoint
- Cron jobs firing on Vercel's scheduler

Logic for all of the above is unit-tested and verified as far as the
environment allows; each needs one real run once credentials are in place.
