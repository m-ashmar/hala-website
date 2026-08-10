import { describe, it, expect } from 'vitest';
import {
  sypToUsdCents,
  sypToUsd,
  formatUsd,
  assertValidRate,
  CurrencyConversionError,
  STRIPE_MIN_USD_CENTS,
} from './currency';

/**
 * Regression guard for the currency model.
 *
 * The original bug: SYP prices were passed to Stripe as USD, so a 50,000 SYP
 * item (~$4) was charged as $50,000. These tests fail loudly if that class of
 * mistake returns.
 */

const RATE = 13000; // 1 USD = 13,000 SYP

describe('sypToUsdCents', () => {
  it('converts using the supplied rate, not the raw SYP figure', () => {
    // 13,000 SYP at 13,000/USD is exactly $1.00 = 100 cents.
    expect(sypToUsdCents(13_000, RATE)).toBe(100);
  });

  it('never returns the SYP amount as if it were USD (the original defect)', () => {
    const syp = 50_000;
    const cents = sypToUsdCents(syp, RATE);
    // The old code produced 50_000 * 100 = 5,000,000 cents ($50,000).
    expect(cents).not.toBe(syp * 100);
    expect(cents).toBe(385); // $3.85
  });

  it('rounds to the nearest cent', () => {
    // 1,000 / 13,000 = $0.076923… → 8 cents
    expect(sypToUsdCents(1_000, RATE)).toBe(8);
  });

  it('handles zero', () => {
    expect(sypToUsdCents(0, RATE)).toBe(0);
  });

  it('re-prices the whole catalogue when the rate changes', () => {
    const syp = 26_000;
    expect(sypToUsdCents(syp, 13_000)).toBe(200); // $2.00
    expect(sypToUsdCents(syp, 26_000)).toBe(100); // $1.00 after devaluation
  });

  it('rejects an unset or invalid rate rather than guessing', () => {
    expect(() => sypToUsdCents(1_000, undefined as unknown as number)).toThrow(
      CurrencyConversionError
    );
    expect(() => sypToUsdCents(1_000, 0)).toThrow(CurrencyConversionError);
    expect(() => sypToUsdCents(1_000, -5)).toThrow(CurrencyConversionError);
    expect(() => sypToUsdCents(1_000, NaN)).toThrow(CurrencyConversionError);
  });

  it('rejects a negative amount', () => {
    expect(() => sypToUsdCents(-1, RATE)).toThrow(CurrencyConversionError);
  });
});

describe('line-total rounding', () => {
  it('does not compound sub-cent error across quantity', () => {
    const unitSyp = 1_000; // $0.076923… each
    const qty = 10;
    // Converting the line total is the correct approach: $0.769… → 77 cents.
    const lineTotal = sypToUsdCents(unitSyp * qty, RATE);
    expect(lineTotal).toBe(77);
    // Rounding per-unit first would give 8 * 10 = 80 cents — a 3-cent overcharge.
    const naivePerUnit = sypToUsdCents(unitSyp, RATE) * qty;
    expect(naivePerUnit).toBe(80);
    expect(lineTotal).toBeLessThan(naivePerUnit);
  });
});

describe('sypToUsd / formatUsd', () => {
  it('returns a decimal USD value', () => {
    expect(sypToUsd(13_000, RATE)).toBe(1);
    expect(sypToUsd(50_000, RATE)).toBe(3.85);
  });

  it('formats for display', () => {
    expect(formatUsd(3.85)).toBe('$3.85');
    expect(formatUsd(1)).toBe('$1.00');
  });
});

describe('assertValidRate', () => {
  it('accepts a plausible rate', () => {
    expect(() => assertValidRate(13_000)).not.toThrow();
  });

  it('rejects non-numbers', () => {
    expect(() => assertValidRate('13000')).toThrow(CurrencyConversionError);
    expect(() => assertValidRate(null)).toThrow(CurrencyConversionError);
  });
});

describe('Stripe minimum', () => {
  it('flags totals below the processor minimum', () => {
    // 1,000 SYP ≈ 8 cents, under Stripe's 50-cent floor.
    expect(sypToUsdCents(1_000, RATE)).toBeLessThan(STRIPE_MIN_USD_CENTS);
    // 100,000 SYP ≈ $7.69, comfortably above it.
    expect(sypToUsdCents(100_000, RATE)).toBeGreaterThan(STRIPE_MIN_USD_CENTS);
  });
});
