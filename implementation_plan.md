# Three Issues + Architecture Improvement

## Architecture Decision: Hybrid Order Creation ✅

**My recommendation agrees with your Option 2, with a ShamCash exception.**

### Stripe Flow (New — create order in webhook)
```
User clicks "Stripe Checkout"
        ↓
Create Stripe Session (metadata: couponId, items, customer)
  ← NO order in Prisma yet ←
        ↓
User pays on Stripe
        ↓
Stripe fires checkout.session.completed webhook
        ↓
Create Order in Prisma (status: CONFIRMED, paymentStatus: PAID)
        ↓
Sync to Sanity
        ↓
Return 200 to Stripe
```

### ShamCash Flow (Keep as-is — reference code needed before payment)
```
User clicks "ShamCash Checkout"
        ↓
Create Order in Prisma (status: PENDING) + referenceCode
        ↓
Customer transfers money with referenceCode in notes
        ↓
Poll API or manual check → confirm payment
        ↓
Update Order → CONFIRMED in Prisma + Sanity
```

> [!IMPORTANT]
> The ShamCash flow cannot use Option 2 — the reference code must exist before the customer sends money. This is correct architecture.

---

## Bug 1 — Stripe Payment Status Not Updating

**Root cause:** The Stripe webhook handler (`/api/webhooks/stripe`) IS correctly implemented — it calls `confirmOrderPayment()` on `checkout.session.completed`. But the webhook only works if Stripe can reach the endpoint. In local development, Stripe **cannot reach `localhost`** unless you use the Stripe CLI to forward webhooks.

**Fix required:**
- Confirm `STRIPE_WEBHOOK_SECRET` in `.env` matches the CLI/dashboard secret
- Add a **`/api/checkout/stripe-return`** fallback handler that verifies payment directly from the `?session_id=` query param on the success page — this catches cases where the webhook is slow or misconfigured

Also: with the new architecture, `checkout.session.completed` must now **create the order** (not just update it), so the webhook handler needs to be extended.

---

## Bug 2 — Orders Page Shows Nothing

**Root cause:** The `/api/orders` endpoint requires `session?.user?.id` — it only returns orders linked to a logged-in user's `userId`. But orders created via the current checkout flow are **guest orders** (`userId: null`) because the checkout never sets `userId` even when a session exists.

**Fix:** In `POST /api/checkout/order`, read the session and set `userId` on the order if the user is authenticated.

---

## Proposed Changes

### ─── Stripe Architecture Refactor ───

#### [MODIFY] [checkout/order/route.ts](file:///f:/halahello_website/app/api/checkout/order/route.ts)
- For `paymentMethod === 'stripe'`:
  - Do **NOT** create a Prisma order before the session
  - Instead, create the Stripe session with rich metadata: `{ couponId, discountAmount, items (JSON), customer (JSON) }`
  - Return `{ paymentMethod: 'stripe', url: session.url }` — no orderId yet

#### [MODIFY] [webhooks/stripe/route.ts](file:///f:/halahello_website/app/api/webhooks/stripe/route.ts)
- On `checkout.session.completed`:
  - **Create** the Prisma order from session metadata (if no `orderId` in metadata = new Stripe flow)
  - Mark `status: CONFIRMED`, `paymentStatus: PAID`, `paidAt: now`
  - Sync to Sanity
- Keep backward-compat: if `orderId` IS in metadata (old flow), update existing order

#### [NEW] [checkout/stripe-return/route.ts](file:///f:/halahello_website/app/api/checkout/stripe-return/route.ts)
- `GET ?session_id=xxx` — verifies the session with Stripe directly and creates/confirms the order
- Used as a fallback on the success page for local dev where webhook can't reach localhost

#### [MODIFY] [checkout/success/page.tsx](file:///f:/halahello_website/app/[locale]/checkout/success/page.tsx)
- On mount, call `/api/checkout/stripe-return?session_id=xxx` if `?session_id` is in the URL
- This ensures the order is created even if the webhook was slow

---

### ─── Bug 2: Attach userId to Orders ───

#### [MODIFY] [checkout/order/route.ts](file:///f:/halahello_website/app/api/checkout/order/route.ts)
- Read `auth()` session at the start of the handler
- Pass `userId: session?.user?.id` to `createPendingOrder()`

---

### ─── Orders Page: Show Shipping Progress ───

#### [MODIFY] [account/orders/page.tsx](file:///f:/halahello_website/app/[locale]/account/orders/page.tsx)
- Already well-built — just needs orders to be correctly linked to `userId`
- Add a visual **progress bar** for the shipping stages using the existing `PROGRESS_STEPS` and `STATUS_CONFIG`
- Show "No account yet? Find order by reference code" option for guest orders

#### [NEW] [api/orders/by-reference/route.ts](file:///f:/halahello_website/app/api/orders/by-reference/route.ts)
- `GET ?code=HL-20260721-XXXX` — lets guest users look up their order by reference code

---

## Verification Plan

### Manual
1. Place a Stripe order → abandon → no ghost order in DB ✅
2. Place a Stripe order → complete payment → order appears in Sanity as CONFIRMED ✅
3. Logged-in user places order → appears in `/account/orders` ✅
4. Guest user enters reference code → sees order status ✅

### Automated
- `npx tsc --noEmit` — zero errors

---

## Open Questions

> [!IMPORTANT]
> **Do you want to proceed with the full Stripe architecture refactor (Option 2)?**
> This requires changes to the checkout flow, webhook handler, and success page.
> It will eliminate ghost orders but is a significant change.
>
> Or do you want just the **two bug fixes** (payment status + orders page) without the architecture change for now?
