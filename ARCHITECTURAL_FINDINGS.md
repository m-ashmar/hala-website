# Architectural findings — for discussion, not patching

> Issues found during the full-system audit that are **structural**, not bugs.
>
> Each one could be papered over in an afternoon. None should be, because the
> patch would become the next problem. They need a decision first.
>
> Ordered by how much they will cost if left alone.
>
> Everything that *was* a straightforward defect has already been fixed and
> pushed — see the commit history. This file is only what remains.

---

## A1 — Two payment rails, two code paths, one set of rules

**Severity: high · the root cause of most defects found in this audit**

Seven defects were found across three review passes. **Six of them were the
same shape:** a rule was implemented on one payment path and not its sibling.

| Defect | Fixed on | Missing on |
| :--- | :--- | :--- |
| SYP charged as USD | main checkout | custom-request checkout |
| Collision-safe reference codes | main checkout | Stripe fulfilment, custom checkout |
| Restock on cancel/refund | cron, Stripe webhook | admin status change |
| Coupon scope + minimum | validate endpoint | checkout |
| Charge snapshot recorded | main checkout | custom-request order |
| CSRF origin check | 9 routes | 11 routes |

This is not carelessness. It is the predictable outcome of a shape where
**order creation exists in four places** — `createPendingOrder`,
`fulfillStripeCheckout`, `fulfillCustomRequestPayment` and the ShamCash branch
of the main route — each assembling an `Order` by hand from slightly different
inputs. Adding a rule means remembering all four. Nobody remembers all four.

**The fix is not another sweep.** It is a single order-creation seam that every
path must pass through: one function that takes a validated cart, a customer, a
shipping address and a payment intent, and returns an order. Currency
conversion, coupon scoping, reference-code generation and the charge snapshot
live inside it, so no caller can forget them because no caller can perform them.

**Why I did not do it now:** it touches every checkout path at once, and the
end-to-end payment flows have never been exercised against real Stripe keys or
a live database. Restructuring code whose behaviour has not been observed is
how you turn six known bugs into an unknown number. This should follow the
first real test run, not precede it.

**Decision needed:** do this before or after the first live payment test?
My recommendation: after, and with the money-path tests already in place as the
safety net.

---

## A2 — Sanity ↔ Postgres is bidirectional with no conflict rule

**Severity: high · silent data drift**

Products, orders and coupons live in both systems and sync both ways.
`docs/adr-001-sanity-postgres-sync.md` now records which system owns which
field, but that is documentation, not enforcement. Nothing in the code stops a
Sanity edit and a Postgres write from disagreeing; the last writer wins, and
there is no record that a conflict occurred.

The most exposed field is **price**. Sanity owns it, and it reaches Postgres
through a webhook. If that webhook fails — and it now correctly fails closed on
a bad signature — Postgres keeps serving the old price at checkout while the
CMS shows the new one. **The shop sells at yesterday's price and nothing says so.**

**Options:**
- **(a)** Make Postgres a pure cache: checkout reads price from Sanity at order
  time. Correct, but adds a CMS call to the critical path and couples checkout
  availability to Sanity uptime.
- **(b)** Keep the mirror, add a staleness signal: store `syncedAt`, and alert
  when a product has not synced within N minutes. Cheap, and makes the failure
  visible rather than silent.
- **(c)** Reconciliation job: periodically diff Sanity against Postgres and
  report drift.

**My recommendation: (b) now, (c) later.** (a) trades a silent correctness
problem for a loud availability one.

---

## A3 — Prisma `$extends` performs network I/O on every user write

**Severity: medium · hidden coupling**

`lib/prisma.ts` attaches a query extension that fires a Sanity sync on every
`user.create` and `user.update`. This is invisible at the call site: a
`prisma.user.update(...)` anywhere in the codebase silently makes a third-party
HTTP request.

It is fire-and-forget with no retry and no dead-letter, so a Sanity outage
means user records quietly stop syncing. Errors were swallowed entirely until
monitoring was added in Block 3.

The email outbox (`NotificationLog`) already demonstrates the right pattern in
this codebase: record the intent transactionally, drain it from a scheduled job.

**Not urgent** — users are low-volume and a missed sync is cosmetic. But this
pattern must not be copied to orders or products, where a missed sync is not
cosmetic.

**Decision needed:** move user sync onto the outbox pattern, or accept it and
document that no other entity may use `$extends` this way?

---

## A4 — ShamCash payment matching cannot page

**Severity: medium · fails silently, and only at scale**

`findPaymentForOrder` fetches one page of 100 transactions from the start of
the order's creation day. Past roughly 100 transactions in a day, a genuine
payment falls outside the window and is never matched: the customer pays,
verification keeps reporting PENDING, and the order expires.

This is invisible at low volume and becomes systematic as the business grows —
the worst failure profile, because it arrives exactly when order volume makes
it expensive.

The endpoint accepts a `cursor`, but the client's response type is a bare array
with no next-cursor returned, so paging cannot be implemented without the
provider's documentation. **I have not guessed at the contract.** The condition
is now reported through monitoring: a full page with no match is the exact
signature of a truncated window.

**Decision needed:** obtain the ShamCash pagination contract, or narrow the
window using `end_at` and a tighter `start_at` than day granularity. The second
is possible today if the API accepts full ISO timestamps — the type says it
does, but that is unverified.

---

## A5 — Guest checkout is half-built

**Severity: low · but it is a product decision, not a bug**

The middleware forces login on `/checkout`, while the checkout API fully
supports guest orders: `userId` is optional throughout, and orders store
`customerName`/`customerEmail` precisely so a guest order works.

So the capability exists, is tested by its own code paths, and is switched off
by one line of routing. Meanwhile `/api/orders/by-reference` exists specifically
to let guests track an order they were never allowed to place.

**Decision needed:** enable guest checkout, or remove the guest-supporting code?
Carrying both costs nothing today but guarantees that one of them rots.

---

## A6 — 207 hardcoded bilingual strings

**Severity: low · a growing tax**

`next-intl` is installed and load-bearing for routing, but its translation
layer is unused. Real translation happens through a 224-line hand-rolled table
plus **207 inline ternaries** of the form `isAr ? 'حجابات' : 'Hijabs'` scattered
through components.

No translator can reach those strings, and a third language means editing 207
JSX expressions by hand.

This is not urgent and not dangerous. It is deliberately excluded from the
hardening work because migrating it is a large, purely cosmetic refactor with
real regression risk across every page — exactly the kind of change that should
not ride along with security fixes.

**Decision needed:** schedule the migration as its own piece of work, or accept
two languages as the permanent ceiling?

---

## Not architectural, but needs a human

**Product pages fail the build when Sanity is unreachable.**
`app/[locale]/products/[slug]/page.tsx` prerenders from Sanity, so a CMS outage
during a deploy fails the entire build. `generateStaticParams` already degrades
gracefully; the page render does not.

Arguably correct — better to block a deploy than ship 404s. But it means CMS
availability gates your ability to ship unrelated code. Worth a conscious
choice rather than an accident.
