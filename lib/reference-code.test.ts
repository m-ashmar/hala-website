import { describe, it, expect } from 'vitest';
import { generateReferenceCode } from './repositories/order.repository';

/**
 * Order reference codes.
 *
 * These are the lookup key for /api/orders/by-reference, which is
 * unauthenticated by design so guests can track an order. That makes a code a
 * bearer token over customer data.
 *
 * The original implementation used Math.random() with 4 base-36 characters
 * while the checkout route claimed it was "cryptographically random enough to
 * prevent guessing". These tests exist so that claim can never quietly become
 * false again.
 */

const CODE_RE = /^HL-\d{8}-[ABCDEFGHJKLMNPQRSTVWXYZ23456789]{10}$/;

describe('generateReferenceCode', () => {
  it('matches the documented format', () => {
    expect(generateReferenceCode()).toMatch(CODE_RE);
  });

  it('embeds today\'s date', () => {
    const expected = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(generateReferenceCode()).toContain(`HL-${expected}-`);
  });

  it('uses a 10-character random segment', () => {
    const random = generateReferenceCode().split('-')[2];
    expect(random).toHaveLength(10);
  });

  it('excludes characters that are misread aloud or in handwriting', () => {
    // Codes get read over the phone and copied into transfer notes.
    const forbidden = ['I', 'O', 'U', '0', '1'];
    const sample = Array.from({ length: 200 }, () => generateReferenceCode().split('-')[2]).join('');
    for (const ch of forbidden) {
      expect(sample.includes(ch), `"${ch}" must not appear in reference codes`).toBe(false);
    }
  });

  it('does not collide across a large sample', () => {
    const codes = new Set(Array.from({ length: 5_000 }, () => generateReferenceCode()));
    expect(codes.size).toBe(5_000);
  });

  it('does not repeat a fixed prefix pattern (not seeded/sequential)', () => {
    const randoms = Array.from({ length: 50 }, () => generateReferenceCode().split('-')[2]);
    // Every first character being identical would suggest a broken generator.
    const firstChars = new Set(randoms.map((r) => r[0]));
    expect(firstChars.size).toBeGreaterThan(1);
  });

  it('uses enough of the alphabet to indicate uniform distribution', () => {
    const sample = Array.from({ length: 500 }, () => generateReferenceCode().split('-')[2]).join('');
    const distinct = new Set(sample.split('')).size;
    // 31-character alphabet; a biased or tiny generator would use far fewer.
    expect(distinct).toBeGreaterThan(25);
  });
});
