import prisma from '../prisma';

export type ProductType = 'hijab' | 'plexi';

export interface ProductWithMeta {
  id: string;
  sanityId: string;
  price: number;
  stock: number;
  isActive: boolean;
}

/**
 * Returns all active products, optionally filtered by type prefix on sanityId.
 * Convention: sanityId format = "hijab-slug" or "plexi-slug"
 */
export async function getActiveProducts(type?: ProductType): Promise<ProductWithMeta[]> {
  // deletedAt as well as isActive: retiring a product sets both, and relying on
  // a single flag means one code path re-enabling isActive silently resurrects
  // a product that was deleted from the CMS.
  const where: {
    isActive: boolean;
    deletedAt: null;
    sanityId?: { startsWith: string };
  } = { isActive: true, deletedAt: null };
  if (type) {
    where.sanityId = { startsWith: type };
  }
  return prisma.productSync.findMany({
    where,
    select: { id: true, sanityId: true, price: true, stock: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getProductBySanityId(sanityId: string): Promise<ProductWithMeta | null> {
  return prisma.productSync.findUnique({
    where: { sanityId },
    select: { id: true, sanityId: true, price: true, stock: true, isActive: true },
  });
}

/**
 * Syncs a product from Sanity into Postgres.
 *
 * **Stock is never overwritten on update.** Sanity owns price; Postgres owns
 * stock, because stock is decremented by orders and Sanity has no stock field
 * at all.
 *
 * The webhook previously called this with a hardcoded `stock: 100`, so every
 * product edit in the CMS — even changing a title — reset that product's
 * inventory to 100 and erased every sale since. Beyond losing the count, it
 * caused overselling: a product with 3 left would silently accept 100 orders.
 *
 * `initialStock` therefore applies only when the row is first created.
 */
export async function upsertProduct(data: {
  sanityId: string;
  price: number;
  /** Only used when creating the row for the first time. Ignored on update. */
  initialStock?: number;
}): Promise<ProductWithMeta> {
  return prisma.productSync.upsert({
    where: { sanityId: data.sanityId },
    // Clear the retirement flags on update. Deleting a product in Sanity soft
    // deletes it here; republishing the same slug must bring it back. Without
    // this the row would be updated with a fresh price while remaining
    // invisible to every read path — a product that looks published in the CMS
    // and cannot be bought.
    update: {
      price: data.price,
      deletedAt: null,
      isActive: true,
    },
    create: {
      sanityId: data.sanityId,
      price: data.price,
      stock: data.initialStock ?? 0,
    },
    select: { id: true, sanityId: true, price: true, stock: true, isActive: true },
  });
}

/**
 * Retires a product when it is deleted in Sanity.
 *
 * Soft delete, not a hard one. OrderItem.productSyncId is a required foreign
 * key with no onDelete rule, so Postgres defaults to RESTRICT: hard-deleting a
 * product that has ever been ordered raises a constraint violation. That
 * surfaced as the Sanity webhook failing with a 500 and retrying forever,
 * while the row stayed put — and had the constraint not existed, it would have
 * silently destroyed the order history instead.
 *
 * ProductSync already carries `deletedAt` and `isActive`, and every read path
 * filters on them, so retiring the row removes it from the storefront while
 * leaving past orders intact and reportable.
 *
 * Idempotent: re-deleting an already-retired product is a no-op.
 */
export async function deleteProductBySanityId(sanityId: string): Promise<void> {
  await prisma.productSync.updateMany({
    where: { sanityId, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
}
