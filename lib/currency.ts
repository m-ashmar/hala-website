/**
 * Currency conversion.
 *
 * Pricing model: products are authored once in SYP. Card payments (Stripe)
 * settle in USD, converted with an admin-controlled rate from Sanity
 * (`currencySettings.sypPerUsd`).
 *
 * Two rules make this safe:
 *
 *  1. Conversion happens **server-side only**, from the rate fetched at
 *     checkout time. A client must never supply a rate or a converted amount.
 *
 *  2. The rate used is **snapshotted onto the order**. Editing the rate later
 *     re-prices the live catalogue but must never rewrite what an existing
 *     order was worth — otherwise refunds and accounting silently drift.
 */

/** Stripe's minimum chargeable amount, in USD cents. */
export const STRIPE_MIN_USD_CENTS = 50;

export class CurrencyConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyConversionError';
  }
}

/**
 * Validates an exchange rate before it is used for money.
 * Throws rather than falling back to a default — a wrong rate silently
 * applied is far worse than a checkout that refuses to proceed.
 */
export function assertValidRate(rate: unknown): asserts rate is number {
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new CurrencyConversionError(
      'Exchange rate is not configured. Set "SYP per 1 USD" in Sanity Studio → Currency & Exchange Rate.'
    );
  }
}

/**
 * Converts a SYP amount to USD cents (the unit Stripe charges in).
 *
 * Rounds to the nearest cent. Rounding is applied to the *total per line*,
 * not per unit, so quantity never compounds a sub-cent error.
 */
export function sypToUsdCents(sypAmount: number, sypPerUsd: number): number {
  assertValidRate(sypPerUsd);
  if (!Number.isFinite(sypAmount) || sypAmount < 0) {
    throw new CurrencyConversionError(`Invalid SYP amount: ${sypAmount}`);
  }
  return Math.round((sypAmount / sypPerUsd) * 100);
}

/** Converts a SYP amount to a USD decimal value, for display. */
export function sypToUsd(sypAmount: number, sypPerUsd: number): number {
  return sypToUsdCents(sypAmount, sypPerUsd) / 100;
}

/** Formats a USD amount for display, e.g. 12.5 → "$12.50". */
export function formatUsd(usdAmount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(usdAmount);
}
