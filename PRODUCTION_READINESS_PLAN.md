# Halahello — Production Readiness Plan

> **Scope:** remediation plan to take the platform from "builds and deploys" to
> "safe to take real customers' money." Derived from a full audit of auth,
> payments, order lifecycle, API authorization, dependencies, and architecture.
>
> **Not covered:** UI/UX changes (explicitly out of scope for this pass).
>
> **Companion docs:** `task.md` tracks the original feature build. This document
> tracks *fixes and hardening*. Where they overlap, this document wins.

---

## How to read this

Work is grouped into **blocks**. Blocks are ordered by risk, and each block is
independently shippable — you can stop after any block and be in a better place
than before it.

| Field | Meaning |
| :--- | :--- |
| **Why** | The concrete failure this prevents |
| **Files** | Primary touch points |
| **Done when** | Acceptance criteria — how we verify, not just "code written" |
| **Size** | S ≈ under an hour · M ≈ half a day · L ≈ 1–2 days |

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done & verified

---

## Block 0 — Stop the bleeding (security fail-opens)

**Theme:** This codebase has a systemic habit: *"if the credential isn't
configured, proceed anyway."* That turns an incomplete deploy into an insecure
one, silently. Block 0 removes that pattern everywhere it appears and adds a
guard so it can't come back.

**Ship this before the site is publicly reachable.**

### 0.1 — Fix the WhatsApp OTP authentication bypass `[x]` — **S**
- **Why:** `isMockMode()` returns true whenever `WHATSAPP_API_TOKEN` /
  `WHATSAPP_PHONE_ID` are absent. In mock mode the OTP is hardcoded `123456`
  **and returned in the HTTP response body**. Deploy without WhatsApp creds and
  anyone logs in as any phone number — including taking over an existing
  account. Full account takeover.
- **Files:** `lib/services/whatsapp.service.ts`, `app/api/auth/whatsapp/send-otp/route.ts`
- **Fix:** Mock mode requires an explicit opt-in (`WHATSAPP_MOCK === 'true'`)
  **and** `NODE_ENV !== 'production'`. Never infer it from missing credentials.
  Never return `mockCode` when `NODE_ENV === 'production'`. If creds are missing
  in production, fail the request loudly.
- **Done when:** With no WhatsApp env vars and `NODE_ENV=production`, the
  send-OTP route returns a 5xx and no code is issued; a fixed code can never be
  obtained from the API.

### 0.2 — Fix the Sanity webhook fail-open `[x]` — **S**
- **Why:** `if (secret) { ...verify... }` — when `SANITY_WEBHOOK_SECRET` is
  unset, signature verification is skipped and the request is processed. That
  endpoint writes product prices, stock, order status and coupons into Postgres.
  Unauthenticated catalogue price manipulation (set any product to 0).
- **Files:** `app/api/webhooks/sanity/route.ts` (~line 376)
- **Fix:** Missing secret must be a hard 500, never a bypass. Verify signature
  unconditionally.
- **Done when:** Unsigned POST returns 401; POST with secret unset returns 500;
  neither writes to the database.

### 0.3 — Add the missing admin auth guard `[x]` — **S**
- **Why:** `app/api/admin/sync/promotions/route.ts` has no authorization check
  at all, while every sibling admin route correctly gates on `role !== 'ADMIN'`.
  Anyone can POST and upsert coupon rows.
- **Files:** `app/api/admin/sync/promotions/route.ts`
- **Done when:** Unauthenticated and non-admin POSTs both return 403.

### 0.4 — Close the env-validation holes `[x]` — **S**
- **Why:** Every fail-open above is caused by an *unvalidated* environment
  variable. `lib/env.ts` validates only `DATABASE_URL`, `NEXTAUTH_SECRET`,
  `BLOB_READ_WRITE_TOKEN` — and omits `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `SANITY_WEBHOOK_SECRET`, `WHATSAPP_API_TOKEN`,
  `NEXT_PUBLIC_SANITY_PROJECT_ID`. The safety net is missing exactly the wires
  that matter. This item is what stops Block 0 regressing.
- **Files:** `lib/env.ts`
- **Fix:** Add all payment/CMS/auth-integration vars, **required in production,
  optional in development**. Resolve the `NEXTAUTH_SECRET` vs `AUTH_SECRET`
  naming mismatch (NextAuth v5 uses `AUTH_SECRET`; `.env.local` currently has
  the latter while `env.ts` demands the former).
- **Done when:** Booting with `NODE_ENV=production` and any payment/CMS secret
  missing throws at startup with a message naming the variable.

### 0.5 — Add `.env.example` + document required vars `[x]` — **S**
- **Why:** There is no `.env.example`. Nothing tells a deployer which variables
  exist, so an incomplete deploy is the default outcome.
- **Files:** `.env.example` (new), `production_checklist.md`
- **Done when:** Every var read anywhere in the codebase appears in
  `.env.example` with a comment and a safe placeholder.

---

## Block 1 — Transaction correctness

**Theme:** Today, a completed purchase either charges the wrong amount or
can't be fulfilled. These are the money-and-goods blockers.

### 1.1 — Fix the Stripe currency mismatch `[x]` — **M**
- **Why:** `const stripeCurrency = 'usd'; // Adjust to real currency` combined
  with `unit_amount: priceAtPurchase * 100`, while prices are authored in SYP.
  A 50,000 SYP item (~$4) is charged as **$50,000 USD**. Chargebacks, fraud
  flags, terminated Stripe account.
- **Files:** `app/api/checkout/order/route.ts` (~line 227)
- **Fix:** Decide the pricing model explicitly (see decision note below), then
  make currency a single validated source of truth rather than a literal.
- **✅ Decision made:** option (b), implemented without dual data entry —
  products stay priced once in SYP, an admin sets **SYP per 1 USD** in Sanity
  (Currency & Exchange Rate), and USD is derived from it. Changing the rate
  re-prices the catalogue instantly. The rate is snapshotted onto each order
  so historical orders and refunds never shift.
- **Original options considered:**
  - **(a)** Prices are SYP → Stripe needs a SYP→USD conversion rate, and Stripe
    does not settle SYP. Requires a rate source and a rounding policy.
  - **(b)** Stripe customers are charged in USD from a separate USD price field
    on the product (dual pricing).
  - **(c)** Stripe is dropped and ShamCash is the only rail.
- **Done when:** A test checkout for a known SYP price produces a Stripe session
  whose amount matches the intended real-world charge, verified in the Stripe
  dashboard.

### 1.2 — Add shipping addresses to the order pipeline `[x]` — **L**
- **Why:** `Order` has **no address fields**. Checkout collects only name,
  email, phone, note. The `Address` model exists with a full account UI but has
  **no relation to `Order`**. You can take payment and have no idea where to
  ship. The core transaction is incomplete.
- **Files:** `prisma/schema.prisma`, `app/api/checkout/order/route.ts`,
  `lib/repositories/order.repository.ts`, `lib/services/checkout.service.ts`,
  `app/[locale]/checkout/page.tsx`, admin order views
- **Fix:** Add a **snapshot** of the shipping address onto `Order` (not just a
  FK — the address must survive the customer editing or deleting it later).
  Optionally keep `shippingAddressId` alongside for account convenience. Extend
  the Zod checkout schema, persist through both ShamCash and Stripe paths, and
  surface it in admin.
- **Done when:** A completed order in both payment paths stores a full,
  immutable shipping address that renders in the admin order view.

### 1.3 — Guard against a currency/price-model regression `[x]` — **S**
- **Why:** 1.1 is easy to silently undo.
- **Done when:** A unit test asserts the Stripe line-item amount for a known
  product price, and fails if the currency literal changes.

---

## Block 2 — Close the operational loop

**Theme:** Right now an order can be paid for and then nothing further can
happen to it. No status changes, no customer communication, no inventory
correction. The business cannot actually run on this.

### 2.1 — Admin order status management `[ ]` — **M**
- **Why:** `/api/admin/orders` is **GET-only**. There is no way to mark an order
  SHIPPED or DELIVERED, and no way to manually confirm a ShamCash payment when
  auto-verification fails. The `OrderStatus` enum has
  PREPARING / READY_FOR_SHIPPING / SHIPPED / DELIVERED and **none are
  reachable**. Orders enter the system and freeze.
- **Files:** `app/api/admin/orders/route.ts` (+ `[id]` route to create),
  `lib/repositories/order.repository.ts` (`isValidStatusTransition` already
  exists — reuse it), admin orders UI
- **Fix:** Add `PATCH /api/admin/orders/[id]` — admin-guarded, validating
  transitions against the existing state machine. Include a manual
  "mark as paid" path for ShamCash.
- **Done when:** An admin can walk an order PENDING → DELIVERED, invalid
  transitions are rejected 4xx, and every change syncs to Sanity.

### 2.2 — Order confirmation & status emails `[ ]` — **M**
- **Why:** The email service works but is wired only to the contact form and
  custom requests. **A customer who pays receives nothing.** No confirmation, no
  receipt, no shipping notice. This is the single biggest trust gap.
- **Files:** `lib/services/email.service.ts`,
  `lib/services/checkout.service.ts`, `app/api/webhooks/stripe/route.ts`,
  `lib/repositories/order.repository.ts`
- **Fix:** Add order-confirmation (on payment confirmed) and status-change
  (shipped/delivered) templates, bilingual EN/AR. Send from the same place
  the order transitions, not from the route handler, so both payment paths are
  covered. Failures must not roll back the order.
- **Done when:** Paying via both rails sends a confirmation containing the
  reference code, line items, total and shipping address; email failure is
  logged without affecting order state.

### 2.3 — Record coupon usage `[ ]` — **S**
- **Why:** `incrementCouponUsage()` is defined at
  `lib/repositories/coupon.repository.ts:128` and **never called anywhere**.
  `usedCount` stays 0 forever, so `maxUses` never triggers — a "first 50
  customers" promo runs unlimited. The `CouponUsage` table is never written, so
  per-customer limits are impossible.
- **Files:** `lib/repositories/coupon.repository.ts`,
  `lib/services/checkout.service.ts`, `lib/repositories/order.repository.ts`
- **Fix:** Increment inside the same transaction that confirms the order, and
  write a `CouponUsage` row so per-user limits become enforceable.
- **Done when:** A coupon with `maxUses: 1` is rejected on the second order, and
  `CouponUsage` has one row per redemption.

### 2.4 — Restore stock on cancel and refund `[ ]` — **S**
- **Why:** `cancelOrder()` and `markOrderRefunded()` only flip status. Stock is
  decremented on confirm and **never returned**. Every refund permanently
  destroys inventory.
- **Files:** `lib/repositories/order.repository.ts`
- **Fix:** Restock inside a transaction, and make it idempotent so a repeated
  refund webhook can't double-restock.
- **Done when:** Refunding a confirmed order returns exact quantities; replaying
  the webhook does not inflate stock.

### 2.5 — Expire stale pending orders `[ ]` — **S**
- **Why:** `getExpiredPendingOrders()` is documented as *"Used by a cleanup
  job"* — that job does not exist and the function is never called. Expired
  orders linger indefinitely.
- **Files:** `vercel.json` (new) or equivalent scheduler, new cron route
- **Done when:** Orders past `expiresAt` are auto-cancelled on a schedule.

---

## Block 3 — Infrastructure hardening

### 3.1 — Make rate limiting real `[ ]` — **M**
- **Why:** `lib/rate-limit.ts` is an in-memory `Map`, per-process. On serverless
  every concurrent instance gets its own empty store, so the 5/min OTP, 3/min
  checkout and 10/min upload limits **effectively do not exist in production**.
  The file's own comment says it needs Redis.
- **Files:** `lib/rate-limit.ts`, all five calling routes
- **Fix:** Back it with Vercel KV / Upstash Redis, keeping the same interface so
  call sites are unchanged. Also delete the broken legacy `rateLimit()` default
  export — it constructs a fresh limiter per call and therefore never limits.
- **Done when:** Limits hold across concurrent instances, verified by exceeding
  a limit against a deployed preview.

### 3.2 — Rate-limit OTP *verification* `[ ]` — **S**
- **Why:** Sending is limited; verifying is not. The 6-digit code is
  brute-forceable.
- **Files:** `auth.ts` (whatsapp provider `authorize`)
- **Done when:** Repeated wrong codes for a phone number lock out temporarily.

### 3.3 — Patch dependency vulnerabilities `[ ]` — **M**
- **Why:** 25 vulnerabilities — **2 critical, 14 high**. The critical ones are
  in `next-auth`/`@auth/core`, and one reads *"Configuration errors can cause
  existence-based auth checks to fail open."* Every admin check here is
  existence-based (`session?.user?.role !== 'ADMIN'`) — a direct hit. Also
  Next.js request smuggling, `sharp`/libvips, `undici` desync.
- **Fix:** `npm audit fix`, then handle breaking ones deliberately.
- **Done when:** Zero critical/high in `npm audit --omit=dev`; build + auth
  flows re-verified after upgrade.

### 3.4 — Get off `next-auth` beta `[ ]` — **M**
- **Why:** `^5.0.0-beta.31` — beta software guarding money and PII, with a caret
  that permits auto-upgrading to arbitrary future betas.
- **Fix:** Move to a stable release; failing that, pin exactly (no caret).
- **Done when:** Version is stable or exactly pinned; login + admin gating
  re-verified.

### 3.5 — Strengthen order reference codes `[ ]` — **S**
- **Why:** `Math.random()` with 4 base-36 chars. The checkout file's own comment
  claims "cryptographically random enough to prevent guessing" — it is not.
  `/api/orders/by-reference` is unauthenticated and returns order contents, so
  codes are brute-forceable into a customer-data leak. No collision handling on
  a `@unique` column either.
- **Files:** `lib/repositories/order.repository.ts`
- **Fix:** `crypto.randomBytes`, longer code, retry on unique violation.
- **Done when:** Codes are CSPRNG-derived with ≥8 random chars and collisions
  are handled.

### 3.6 — Fix the custom-request duplicate-order race `[ ]` — **S**
- **Why:** `stripe-return` and the Stripe webhook both create an order for
  `type=custom_request` behind a non-atomic `if (!order)` check. Standard
  checkout is protected by a unique `stripeSessionId`; this path is not. Two
  orders for one payment.
- **Files:** `app/api/checkout/stripe-return/route.ts`,
  `app/api/webhooks/stripe/route.ts`
- **Done when:** Firing both concurrently yields exactly one order.

### 3.7 — Make stock deduction atomic `[ ]` — **S**
- **Why:** `confirmOrderPayment` comments claim "row-level locking via
  SELECT ... FOR UPDATE", but Prisma `findUnique` does not lock. Check-then-act
  under concurrency can oversell into negative stock.
- **Files:** `lib/repositories/order.repository.ts`
- **Fix:** Conditional update (`updateMany` with `stock: { gte: qty }`) and treat
  a zero-count result as insufficient stock.
- **Done when:** Concurrent confirms cannot drive stock below zero.

### 3.8 — Security headers & image optimization `[ ]` — **S**
- **Why:** Missing CSP, HSTS, Permissions-Policy. `images.unoptimized: true`
  disables Next's image pipeline entirely — `hero-bg.png` 500KB,
  `brand-story.png` 570KB, `logo.jpg` 423KB ship raw, which is expensive on
  regional mobile data.
- **Files:** `next.config.ts`
- **Done when:** Headers present in prod responses; images served optimized.

### 3.9 — Migrate `middleware.ts` → `proxy.ts` `[ ]` — **S**
- **Why:** Deprecated in Next 16; warns on every build.
- **Done when:** Build is warning-free and route protection still works.

### 3.10 — Error monitoring `[ ]` — **S**
- **Why:** No Sentry or equivalent. Production failures are invisible; today
  errors land in `console.error` and vanish.
- **Done when:** Unhandled server errors surface in a dashboard with alerts.

---

## Block 4 — Trust, compliance & discoverability

### 4.1 — Privacy Policy & Terms pages `[ ]` — **S**
- **Why:** The footer **links to `/privacy` and `/terms` and both 404.** Also a
  Stripe onboarding requirement, and expected by customers handing over card
  details.
- **Files:** new routes under `app/[locale]/`, `components/layout/Footer.tsx`
- **Note:** Needs real legal content — placeholder text is not adequate.
- **Done when:** Both render bilingually and the footer links resolve.

### 4.2 — Refund & shipping policy `[ ]` — **S**
- **Why:** `product.returnPolicy` exists per-product but there's no site-level
  policy page. Required for payment-processor compliance.

### 4.3 — `sitemap.ts` and `robots.ts` `[ ]` — **S**
- **Why:** Neither exists. A commercial storefront invisible to search is
  leaving its primary free acquisition channel on the table.
- **Done when:** Both resolve and include localized product URLs.

### 4.4 — Cookie/analytics consent (if analytics added) `[ ]` — **S**
- **Why:** Required if you introduce analytics for EU/diaspora visitors.

---

## Block 5 — Codebase integrity

**Theme:** Several parallel implementations were started and abandoned. They
make the codebase read as more complete than it is, and they cost real bytes.

### 5.1 — Resolve the dead i18n stack `[ ]` — **M**
- **Why:** `next-intl` is fully installed and configured (plugin, `i18n.ts`,
  `messages/en.json`, `messages/ar.json`, middleware) and used by **zero
  components**. Real translation runs through a hand-rolled 224-line
  `app/translations.ts` plus **207 inline hardcoded ternaries**
  (`isAr ? 'حجابات' : 'Hijabs'`). No translator can reach those, and a third
  language means editing 207 JSX expressions.
- **Decision required:** adopt `next-intl` properly, or delete it and formalize
  the custom approach. Either is defensible; having both is not.
- **Done when:** One system remains; hardcoded ternaries are migrated into it.

### 5.2 — Remove dead dependencies & scripts `[ ]` — **S**
- **Why:** `styled-components` is imported **nowhere** yet ships as a runtime
  CSS-in-JS dependency. `pg` is redundant alongside Prisma. Tailwind v4 is
  loaded for use in only 4 files. Root-level debug scripts are committed —
  including `delete_all_data.ts`, which wipes **both** Postgres and Sanity and
  carries a hardcoded production project-ID fallback (`kdwvh4r8`) so it works
  even with no env configured.
- **Fix:** Drop `styled-components` and `pg`; decide on Tailwind; move debug
  scripts to `scripts/` (gitignored) or delete; at minimum add a hard
  confirmation guard to `delete_all_data.ts`.
- **Done when:** `npm ls styled-components` is empty, build still passes, and no
  destructive script is runnable without an explicit confirmation flag.

### 5.3 — Document the Sanity ↔ Postgres sync contract `[ ]` — **S**
- **Why:** Bidirectional sync across two sources of truth for products, orders
  and coupons is inherent drift risk. Worse, `lib/prisma.ts` uses a `$extends`
  hook firing a hidden Sanity sync on **every** user create/update —
  fire-and-forget, errors swallowed, no retry or dead-letter.
- **Done when:** An ADR states which system owns which field, and sync failures
  are at minimum logged as alerts rather than swallowed.

---

## Block 6 — Quality gates

### 6.1 — Tests on the money paths `[ ]` — **L**
- **Why:** Vitest is fully configured (`vitest.config.ts`, `vitest.setup.ts`,
  `npm test` script) and there is **not one test file**. Every fix in Blocks 1–3
  is silently regressable.
- **Priority order:** checkout pricing/currency → coupon validation and usage
  limits → stock deduction/restock → auth guards on admin routes → webhook
  idempotency.
- **Done when:** `npm test` runs a meaningful suite covering the above.

### 6.2 — CI pipeline `[ ]` — **S**
- **Why:** No `.github/workflows`. Nothing prevents a broken or insecure commit
  from reaching production.
- **Done when:** Push runs typecheck + lint + tests + build, and blocks merge on
  failure.

### 6.3 — Staging environment `[ ]` — **S**
- **Why:** Payment and webhook changes are being verified against production
  credentials or not at all.
- **Done when:** A staging deploy exists with Stripe test keys and a separate
  Sanity dataset.

---

## Block 7 — Suggested features (post-hardening)

Not defects — genuine gaps for a competitive storefront. Ordered by
business value per unit of effort.

| # | Feature | Why it matters | Size |
| :--- | :--- | :--- | :--- |
| 7.1 | **Shipping cost & zones** | `shippingSettings` schema and `getShippingSettings()` exist with **zero usage**. Total is `subtotal − discount` — no shipping fee, no tax. Every delivery silently eats margin. | M |
| 7.2 | **Order tracking page for guests** | Guests can order but have no clean way to follow status. `by-reference` exists; needs a real page (pair with 3.5). | M |
| 7.3 | **Abandoned cart recovery** | `CheckoutDraft` already captures everything needed. Highest-ROI revenue feature available — the data is already being written. | M |
| 7.4 | **Inventory alerts** | Owner has no low-stock signal; stockouts are discovered by customers. | S |
| 7.5 | **Product reviews** | Testimonials are CMS-curated, not per-product or verified. Reviews drive conversion and SEO. | L |
| 7.6 | **Analytics** | No measurement of funnel, drop-off or product performance. Currently flying blind on every decision. | S |
| 7.7 | **Custom-request quote automation** | Quoting is fully manual and doesn't scale past low volume — the highest-margin line is the least scalable. | L |
| 7.8 | **Multi-currency / price revaluation** | Prices are fixed floats. In a high-inflation currency this is a margin problem within weeks. Related to 1.1. | L |
| 7.9 | **Wishlist → back-in-stock notifications** | `Wishlist` model exists; notifying on restock converts existing demand. | M |

---

## Open decisions needed from you

These block specific items and I should not guess at them:

1. **Currency model (1.1)** — SYP with conversion, dual SYP/USD pricing, or drop
   Stripe? Also worth confirming Stripe availability for Syria, which is a
   sanctions/compliance question rather than a technical one.
2. **i18n direction (5.1)** — adopt `next-intl` or formalize the custom system?
3. **Guest checkout** — middleware currently forces login for `/checkout` while
   the API fully supports guests. Which is intended?
4. **Legal content (4.1, 4.2)** — needs real policy text; I can scaffold the
   pages but not author enforceable terms.

---

## Suggested execution order

```
Block 0  ──► before the site is publicly reachable
Block 1  ──► before accepting a single real payment
Block 2  ──► before onboarding real customers
Block 3  ──► within the first weeks of live traffic
Block 4  ──► alongside Stripe onboarding (they will ask)
Block 5  ──► opportunistically, low risk
Block 6  ──► start during Block 1; it protects everything after it
Block 7  ──► once the above is stable
```

**Minimum viable "real-life ready" = Blocks 0, 1, 2, plus 4.1.**
That is the honest floor for taking money from a stranger.
