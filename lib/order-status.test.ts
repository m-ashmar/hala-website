import { describe, it, expect } from 'vitest';
import { isValidStatusTransition } from './repositories/order.repository';
import type { OrderStatus } from '@prisma/client';

/**
 * The order state machine is now reachable from the admin UI (Block 2.1),
 * so invalid transitions are a real risk rather than a theoretical one.
 * These lock the rules down.
 */

const s = (v: string) => v as OrderStatus;

describe('isValidStatusTransition — happy path', () => {
  it('allows the full fulfilment walk', () => {
    const walk: [string, string][] = [
      ['PENDING', 'CONFIRMED'],
      ['CONFIRMED', 'PREPARING'],
      ['PREPARING', 'READY_FOR_SHIPPING'],
      ['READY_FOR_SHIPPING', 'SHIPPED'],
      ['SHIPPED', 'DELIVERED'],
      ['DELIVERED', 'REFUNDED'],
    ];
    for (const [from, to] of walk) {
      expect(isValidStatusTransition(s(from), s(to)), `${from} → ${to}`).toBe(true);
    }
  });

  it('is idempotent for a no-op transition', () => {
    expect(isValidStatusTransition(s('SHIPPED'), s('SHIPPED'))).toBe(true);
  });
});

describe('isValidStatusTransition — illegal moves', () => {
  it('cannot skip fulfilment stages', () => {
    expect(isValidStatusTransition(s('PENDING'), s('SHIPPED'))).toBe(false);
    expect(isValidStatusTransition(s('CONFIRMED'), s('DELIVERED'))).toBe(false);
  });

  it('cannot move backwards', () => {
    expect(isValidStatusTransition(s('SHIPPED'), s('PREPARING'))).toBe(false);
    expect(isValidStatusTransition(s('DELIVERED'), s('SHIPPED'))).toBe(false);
  });

  it('treats CANCELLED, REFUNDED and FAILED_PAYMENT as terminal', () => {
    for (const terminal of ['CANCELLED', 'REFUNDED', 'FAILED_PAYMENT']) {
      for (const target of ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED']) {
        expect(
          isValidStatusTransition(s(terminal), s(target)),
          `${terminal} → ${target} must be rejected`
        ).toBe(false);
      }
    }
  });

  it('cannot cancel an order that already shipped', () => {
    expect(isValidStatusTransition(s('SHIPPED'), s('CANCELLED'))).toBe(false);
    expect(isValidStatusTransition(s('DELIVERED'), s('CANCELLED'))).toBe(false);
  });

  it('allows cancelling while still in the pre-shipping stages', () => {
    for (const from of ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_SHIPPING']) {
      expect(isValidStatusTransition(s(from), s('CANCELLED')), from).toBe(true);
    }
  });
});
