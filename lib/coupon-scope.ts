/**
 * Coupon scope and discount calculation.
 *
 * Single source of truth, deliberately extracted.
 *
 * The validation endpoint (/api/promotions/validate-coupon) and the checkout
 * route each had their own copy of this arithmetic, and they had drifted:
 * validation correctly restricted a discount to the items a promotion covers
 * and enforced minOrderAmount, while checkout applied the discount to the
 * WHOLE cart and ignored the minimum entirely. Its comment said as much —
 * "we trust the coupon was already scope-validated in the cart" — i.e. it
 * trusted the client.
 *
 * The effect needed no attacker: any mixed cart with a category-scoped coupon
 * silently over-discounted. A "20% off Hijabs" promotion also took 20% off
 * the plexi items.
 */

export interface ScopedItem {
  sanityId: string;
  /** Authoritative unit price. Callers must pass a server-side price. */
  price: number;
  quantity: number;
  /** Resolved product category, lowercased. Empty when unknown. */
  category?: string;
}

export interface CouponRules {
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount?: number | null;
}

export interface PromotionScope {
  /** sanityIds this promotion is limited to. Empty = no product restriction. */
  linkedSanityIds: Set<string>;
  /** Categories this promotion is limited to, lowercased. Empty = no restriction. */
  linkedCategories: Set<string>;
}

export type DiscountOutcome =
  | { ok: true; eligibleAmount: number; discountAmount: number }
  | { ok: false; reason: 'BELOW_MINIMUM'; eligibleAmount: number; minOrderAmount: number }
  | { ok: false; reason: 'NO_ELIGIBLE_ITEMS'; eligibleAmount: 0 };

/** True when the promotion restricts which items it applies to. */
export function hasScope(scope: PromotionScope): boolean {
  return scope.linkedSanityIds.size > 0 || scope.linkedCategories.size > 0;
}

/** Items a promotion actually covers. Unscoped promotions cover everything. */
export function eligibleItemsFor<T extends ScopedItem>(
  items: T[],
  scope: PromotionScope
): T[] {
  if (!hasScope(scope)) return items;
  return items.filter(
    (i) =>
      scope.linkedSanityIds.has(i.sanityId) ||
      (!!i.category && scope.linkedCategories.has(i.category.toLowerCase()))
  );
}

/**
 * Computes the discount for a cart.
 *
 * Two invariants:
 *   - the discount is calculated on the ELIGIBLE subtotal, never the full cart;
 *   - a FIXED discount is capped at the eligible subtotal, so a large coupon on
 *     a small cart can never produce a negative total.
 */
export function computeDiscount(
  items: ScopedItem[],
  coupon: CouponRules,
  scope: PromotionScope
): DiscountOutcome {
  const eligible = eligibleItemsFor(items, scope);
  const eligibleAmount = eligible.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (eligibleAmount <= 0) {
    return { ok: false, reason: 'NO_ELIGIBLE_ITEMS', eligibleAmount: 0 };
  }

  const minOrderAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
  if (eligibleAmount < minOrderAmount) {
    return { ok: false, reason: 'BELOW_MINIMUM', eligibleAmount, minOrderAmount };
  }

  const rawDiscount =
    coupon.discountType === 'PERCENTAGE'
      ? Math.round((eligibleAmount * Number(coupon.discountValue)) / 100)
      : Number(coupon.discountValue);

  // Clamp both branches, not just FIXED.
  //
  // A percentage above 100 (a typo, or a "150" meant as "15.0") otherwise
  // yields a discount larger than the items it applies to. The order total is
  // floored at zero downstream, so no customer is ever paid to shop — but the
  // recorded discountAmount would exceed the cart value, corrupting the
  // financial record and any margin reporting built on it. The invariant
  // belongs here, where it holds by construction.
  const discountAmount = Math.max(0, Math.min(rawDiscount, eligibleAmount));

  return { ok: true, eligibleAmount, discountAmount };
}
