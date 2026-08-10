import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Product sync ownership rules.
 *
 * The defect these pin: the Sanity webhook called upsertProduct with a
 * hardcoded `stock: 100`, and upsertProduct wrote that on UPDATE. So every
 * product edit in the CMS — even changing a title — reset that product's
 * inventory to 100. It erased the record of every sale since, and caused
 * overselling: a product with 3 units left would silently accept 100 orders.
 *
 * Ownership is: Sanity owns price, Postgres owns stock. Stock is decremented
 * by orders and has no counterpart in Sanity at all.
 */

const upsertMock = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    productSync: {
      upsert: (args: unknown) => {
        upsertMock(args);
        return Promise.resolve({
          id: 'p1',
          sanityId: 'hijab-silk',
          price: 1,
          stock: 1,
          isActive: true,
        });
      },
      updateMany: () => Promise.resolve({ count: 1 }),
    },
  },
}));

const { upsertProduct } = await import('./repositories/product.repository');

beforeEach(() => upsertMock.mockClear());

describe('upsertProduct', () => {
  it('never writes stock on UPDATE', async () => {
    await upsertProduct({ sanityId: 'hijab-silk', price: 50_000, initialStock: 100 });

    const args = upsertMock.mock.calls[0][0] as { update: Record<string, unknown> };
    expect(args.update).not.toHaveProperty('stock');
  });

  it('still syncs price on UPDATE — Sanity owns it', async () => {
    await upsertProduct({ sanityId: 'hijab-silk', price: 50_000 });

    const args = upsertMock.mock.calls[0][0] as { update: Record<string, unknown> };
    expect(args.update.price).toBe(50_000);
  });

  it('applies initialStock only on CREATE', async () => {
    await upsertProduct({ sanityId: 'hijab-silk', price: 50_000, initialStock: 25 });

    const args = upsertMock.mock.calls[0][0] as { create: Record<string, unknown> };
    expect(args.create.stock).toBe(25);
  });

  it('creates with zero stock when none is given', async () => {
    // Publishing in the CMS must not make unavailable goods sellable.
    await upsertProduct({ sanityId: 'hijab-silk', price: 50_000 });

    const args = upsertMock.mock.calls[0][0] as { create: Record<string, unknown> };
    expect(args.create.stock).toBe(0);
  });

  it('clears retirement flags on UPDATE so a republished product returns', async () => {
    await upsertProduct({ sanityId: 'hijab-silk', price: 50_000 });

    const args = upsertMock.mock.calls[0][0] as { update: Record<string, unknown> };
    expect(args.update.deletedAt).toBeNull();
    expect(args.update.isActive).toBe(true);
  });
});
