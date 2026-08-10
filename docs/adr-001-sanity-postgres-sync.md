# ADR-001 — Sanity ↔ Postgres ownership

**Status:** accepted · **Date:** 2026-08-10

## Context

The platform keeps data in two systems, and several entities exist in both:

- **Sanity** — the CMS the owner works in daily
- **Postgres** — the transactional store behind checkout, orders and auth

Sync runs in both directions, which is inherent drift risk. Without a stated
owner per field, a Sanity edit and a Postgres write can silently disagree and
the "winner" becomes whichever happened to run last.

## Decision

**Every field has exactly one owning system. The other side is a read-only
mirror of it.**

| Entity | Owner | Direction | Notes |
| :--- | :--- | :--- | :--- |
| **Product content** (title, images, description, variants, SEO) | Sanity | Sanity → Postgres | Postgres stores only what checkout needs |
| **Product price / stock / isActive** | Sanity | Sanity → Postgres via webhook | `ProductSync` is the checkout-time source of truth; a stale mirror sells at the wrong price |
| **Product categories** | Sanity | Sanity only | Never mirrored |
| **Orders** | **Postgres** | Postgres → Sanity | Sanity copy is for admin visibility. The one exception is `status`, which the webhook accepts back — validated against the state machine |
| **Order money fields** (totals, charged amount, exchange rate, shipping address) | **Postgres** | Postgres → Sanity | Never writable from Sanity. These are financial records |
| **Coupons** | Shared | Both | Definition authored in Sanity; `usedCount` owned by Postgres and pushed up |
| **Users** | **Postgres** | Postgres → Sanity | Auth data. Sanity copy is read-only |
| **Custom requests** | Both | Both | Customer submits to Postgres; admin quotes in Sanity |
| **Site / theme / currency settings** | Sanity | Sanity only | Read at request time, never mirrored |

### Rules

1. **Money is never authored in Sanity.** Totals, charged amounts, exchange
   rates and shipping addresses are written once by the transaction that
   creates them and are immutable thereafter.
2. **Order status is the only field flowing Sanity → Postgres for orders**, and
   it is validated with `isValidStatusTransition` — an invalid payload is
   rejected rather than applied.
3. **The Sanity webhook must be signed.** It writes prices, stock and status
   into Postgres. An unsigned request is rejected; a missing
   `SANITY_WEBHOOK_SECRET` is a hard failure, never a bypass.
4. **Sync failures must be observable.** Postgres → Sanity sync is
   fire-and-forget so a CMS outage cannot fail a payment, but failures are
   reported through `lib/monitoring.ts` rather than swallowed.

## Known weak point

`lib/prisma.ts` uses a Prisma `$extends` hook that fires a Sanity sync on
**every** user create/update. This is implicit coupling in the data layer:
it is invisible at the call site, has no retry, and swallowed its errors until
monitoring was added.

It works, but a write to Postgres silently performing network I/O to a third
party is the wrong shape. The intended replacement is the same outbox pattern
now used for email (`NotificationLog`): record the intent transactionally,
drain it from a job. Not urgent — user records are low-volume and a missed sync
is cosmetic — but it should not be copied to other entities.

## Consequences

- A field's owner is now answerable without reading the sync code.
- Financial data cannot be edited from the CMS, which is the point.
- Drift is still possible on `Product` if the webhook is misconfigured; that is
  why the signature check fails closed.
