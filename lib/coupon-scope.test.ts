import { describe, it, expect } from 'vitest';
import { computeDiscount, eligibleItemsFor, hasScope } from './coupon-scope';

/**
 * Coupon scope rules.
 *
 * The defect these pin: the checkout route applied discounts to the FULL cart
 * subtotal and ignored minOrderAmount, while the validation endpoint scoped
 * correctly. A "20% off Hijabs" promotion therefore also took 20% off plexi
 * items on any mixed cart — no attacker required, just a normal customer.
 */

const HIJAB = { sanityId: 'hijab-silk', price: 100_000, quantity: 1, category: 'hijab' };
const PLEXI = { sanityId: 'plexi-frame', price: 400_000, quantity: 1, category: 'plexi' };

const noScope = { linkedSanityIds: new Set<string>(), linkedCategories: new Set<string>() };
const hijabOnly = { linkedSanityIds: new Set<string>(), linkedCategories: new Set(['hijab']) };
const productOnly = { linkedSanityIds: new Set(['hijab-silk']), linkedCategories: new Set<string>() };

const pct = (v: number) => ({ discountType: 'PERCENTAGE' as const, discountValue: v });
const fixed = (v: number) => ({ discountType: 'FIXED' as const, discountValue: v });

describe('scope detection', () => {
  it('treats an empty scope as covering everything', () => {
    expect(hasScope(noScope)).toBe(false);
    expect(eligibleItemsFor([HIJAB, PLEXI], noScope)).toHaveLength(2);
  });

  it('restricts by category', () => {
    expect(eligibleItemsFor([HIJAB, PLEXI], hijabOnly)).toEqual([HIJAB]);
  });

  it('restricts by explicit product', () => {
    expect(eligibleItemsFor([HIJAB, PLEXI], productOnly)).toEqual([HIJAB]);
  });

  it('matches category case-insensitively', () => {
    const upper = { ...HIJAB, category: 'HIJAB' };
    expect(eligibleItemsFor([upper, PLEXI], hijabOnly)).toEqual([upper]);
  });
});

describe('scoped discounts', () => {
  it('discounts ONLY the eligible items, not the whole cart', () => {
    // Cart is 500,000 total; only the 100,000 hijab is eligible.
    const out = computeDiscount([HIJAB, PLEXI], pct(20), hijabOnly);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.eligibleAmount).toBe(100_000);
    expect(out.discountAmount).toBe(20_000); // 20% of 100,000

    // The original defect produced 20% of the FULL 500,000 = 100,000.
    expect(out.discountAmount).not.toBe(100_000);
  });

  it('discounts the full cart when the promotion has no scope', () => {
    const out = computeDiscount([HIJAB, PLEXI], pct(20), noScope);
    expect(out.ok && out.discountAmount).toBe(100_000);
  });

  it('caps a FIXED discount at the ELIGIBLE amount, not the cart total', () => {
    // A 250,000 coupon scoped to hijabs, on a cart with only 100,000 of them.
    const out = computeDiscount([HIJAB, PLEXI], fixed(250_000), hijabOnly);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.discountAmount).toBe(100_000); // capped at eligible, not 250,000
  });

  it('rejects when no cart item matches the scope', () => {
    const out = computeDiscount([PLEXI], pct(20), hijabOnly);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe('NO_ELIGIBLE_ITEMS');
  });

  it('treats unknown categories as ineligible under a category scope', () => {
    // Category resolution failed (CMS unreachable). Failing closed loses the
    // customer a discount; failing open would give away margin.
    const unknown = { ...HIJAB, category: undefined };
    const out = computeDiscount([unknown], pct(20), hijabOnly);
    expect(out.ok).toBe(false);
  });
});

describe('minimum order amount', () => {
  it('is measured against the ELIGIBLE subtotal, not the cart total', () => {
    // 500,000 cart, but only 100,000 eligible — a 200,000 minimum must fail.
    const out = computeDiscount(
      [HIJAB, PLEXI],
      { ...pct(20), minOrderAmount: 200_000 },
      hijabOnly
    );
    expect(out.ok).toBe(false);
    if (out.ok || out.reason !== 'BELOW_MINIMUM') throw new Error('expected BELOW_MINIMUM');
    expect(out.minOrderAmount).toBe(200_000);
  });

  it('passes when the eligible subtotal meets the minimum', () => {
    const out = computeDiscount(
      [HIJAB, PLEXI],
      { ...pct(20), minOrderAmount: 100_000 },
      hijabOnly
    );
    expect(out.ok).toBe(true);
  });
});

describe('invariants', () => {
  it('never produces a discount larger than the eligible amount', () => {
    for (const value of [50, 100, 150, 1000]) {
      const out = computeDiscount([HIJAB], pct(value), noScope);
      if (out.ok) expect(out.discountAmount).toBeLessThanOrEqual(out.eligibleAmount * 1);
    }
    const out = computeDiscount([HIJAB], fixed(9_999_999), noScope);
    expect(out.ok && out.discountAmount).toBe(HIJAB.price);
  });

  it('accounts for quantity', () => {
    const out = computeDiscount([{ ...HIJAB, quantity: 3 }], pct(10), noScope);
    expect(out.ok && out.eligibleAmount).toBe(300_000);
    expect(out.ok && out.discountAmount).toBe(30_000);
  });
});
