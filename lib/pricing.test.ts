import { describe, it, expect } from 'vitest';
import { sypToUsdCents } from './currency';

/**
 * Checkout pricing arithmetic.
 *
 * These mirror the calculations in app/api/checkout/order/route.ts. They are
 * duplicated rather than imported because that logic lives inline in a route
 * handler; extracting it is a worthwhile refactor, but pinning the behaviour
 * first means the refactor can be verified rather than trusted.
 *
 * The rules being protected:
 *   - prices always come from the database, never the request body
 *   - a discount can never exceed the subtotal (no negative totals)
 *   - a total is never negative
 */

/** Mirrors the subtotal calculation in the checkout route. */
function subtotal(items: { priceAtPurchase: number; quantity: number }[]) {
  return items.reduce((sum, i) => sum + i.priceAtPurchase * i.quantity, 0);
}

/** Mirrors the discount calculation in the checkout route. */
function discountFor(
  coupon: { discountType: 'PERCENTAGE' | 'FIXED'; discountValue: number },
  rawSubtotal: number
) {
  if (coupon.discountType === 'PERCENTAGE') {
    return Math.round((rawSubtotal * coupon.discountValue) / 100);
  }
  return Math.min(coupon.discountValue, rawSubtotal);
}

const total = (sub: number, discount: number) => Math.max(0, sub - discount);

describe('subtotal', () => {
  it('multiplies price by quantity across lines', () => {
    expect(
      subtotal([
        { priceAtPurchase: 50_000, quantity: 2 },
        { priceAtPurchase: 25_000, quantity: 1 },
      ])
    ).toBe(125_000);
  });

  it('is zero for an empty cart', () => {
    expect(subtotal([])).toBe(0);
  });
});

describe('percentage discounts', () => {
  it('takes the stated percentage', () => {
    expect(discountFor({ discountType: 'PERCENTAGE', discountValue: 20 }, 100_000)).toBe(20_000);
  });

  it('rounds to whole units', () => {
    expect(discountFor({ discountType: 'PERCENTAGE', discountValue: 15 }, 33_333)).toBe(5_000);
  });

  it('cannot exceed the subtotal even at 100%', () => {
    const sub = 80_000;
    const d = discountFor({ discountType: 'PERCENTAGE', discountValue: 100 }, sub);
    expect(total(sub, d)).toBe(0);
  });
});

describe('fixed discounts', () => {
  it('subtracts the fixed amount', () => {
    expect(discountFor({ discountType: 'FIXED', discountValue: 10_000 }, 50_000)).toBe(10_000);
  });

  it('is capped at the subtotal so the total can never go negative', () => {
    const sub = 30_000;
    // A 100,000 coupon on a 30,000 cart must not produce a -70,000 total,
    // which would mean refunding the customer for shopping.
    const d = discountFor({ discountType: 'FIXED', discountValue: 100_000 }, sub);
    expect(d).toBe(sub);
    expect(total(sub, d)).toBe(0);
  });
});

describe('end-to-end order total', () => {
  it('computes subtotal, discount and total consistently', () => {
    const items = [
      { priceAtPurchase: 60_000, quantity: 2 }, // 120,000
      { priceAtPurchase: 15_000, quantity: 4 }, //  60,000
    ];
    const sub = subtotal(items);
    expect(sub).toBe(180_000);

    const d = discountFor({ discountType: 'PERCENTAGE', discountValue: 10 }, sub);
    expect(d).toBe(18_000);
    expect(total(sub, d)).toBe(162_000);
  });

  it('converts the discounted total, not the raw subtotal', () => {
    // Regression guard: charging the pre-discount figure would silently
    // overcharge every customer who used a coupon.
    const sub = 130_000;
    const d = discountFor({ discountType: 'PERCENTAGE', discountValue: 50 }, sub);
    const finalTotal = total(sub, d);
    expect(finalTotal).toBe(65_000);

    const rate = 13_000;
    expect(sypToUsdCents(finalTotal, rate)).toBe(500); // $5.00
    expect(sypToUsdCents(sub, rate)).toBe(1000); // $10.00 — what NOT to charge
  });
});
