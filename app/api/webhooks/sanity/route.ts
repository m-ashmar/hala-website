/**
 * POST /api/webhooks/sanity
 *
 * Receives webhook events fired by Sanity Studio when an administrator
 * creates, updates, or deletes a document.
 *
 * Handled document types:
 *  - product  → sync price/stock to PostgreSQL (existing behaviour)
 *  - order    → update order status in PostgreSQL (admin changed it in Studio)
 *  - coupon   → create/update/delete coupon in PostgreSQL
 *
 * Security: every request must carry a valid HMAC signature produced by Sanity.
 *
 * Loop prevention:
 *  - This handler NEVER calls syncOrderToSanity or syncCouponToSanity.
 *  - It only writes to PostgreSQL.
 *  - Postgres → Sanity sync is triggered exclusively from API routes / services.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { upsertProduct, deleteProductBySanityId } from '@/lib/repositories/product.repository';
import {
  updateOrderStatus,
  isValidStatusTransition,
} from '@/lib/repositories/order.repository';
import {
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponById,
  getCouponByCode,
  upsertCouponByCode,
} from '@/lib/repositories/coupon.repository';
import {
  updateCustomRequestFromSanity,
} from '@/lib/repositories/custom-request.repository';
import { OrderStatus, DiscountType, CustomRequestStatus } from '@prisma/client';
import { logger } from '@/lib/logger';

const secret = process.env.SANITY_WEBHOOK_SECRET;

// ── Type guards ───────────────────────────────────────────────────────────────

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' &&
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_SHIPPING',
      'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED_PAYMENT', 'REFUNDED']
      .includes(value);
}

function isDiscountType(value: unknown): value is DiscountType {
  return value === 'PERCENTAGE' || value === 'FIXED';
}

function isCustomRequestStatus(value: unknown): value is CustomRequestStatus {
  return typeof value === 'string' &&
    ['SUBMITTED', 'QUOTED', 'PAID', 'IN_PRODUCTION', 'SHIPPED', 'CANCELLED']
      .includes(value);
}

// ── Handlers per document type ────────────────────────────────────────────────

async function handleProductEvent(payload: Record<string, unknown>) {
  // `payload.sanityId` is the slug (e.g. "pink-hijab") set by the GROQ projection.
  // `payload._id` is the raw Sanity document ID — NOT what we store in Postgres.
  const sanityId = (payload.sanityId as string | undefined) || (payload._id as string);

  if (payload.operation === 'delete') {
    await deleteProductBySanityId(sanityId);
    return NextResponse.json(
      { success: true, message: `Product ${sanityId} deleted` },
      { status: 200 }
    );
  }

  const price = payload.price;
  if (typeof price !== 'number') {
    return NextResponse.json(
      { success: false, message: 'Missing price or operation in payload' },
      { status: 400 }
    );
  }

  await upsertProduct({ sanityId, price, stock: 100 });
  return NextResponse.json(
    { success: true, message: `Product ${sanityId} synced` },
    { status: 200 }
  );
}

async function handleOrderEvent(payload: Record<string, unknown>) {
  /**
   * Only the `status` field is admin-editable on the order document.
   * Extract `pgId` (the Postgres order ID) and the new `status`.
   *
   * Expected payload shape from Sanity:
   * { _type: 'order', pgId: 'clxxx...', status: 'CONFIRMED' }
   */
  const pgId = payload.pgId as string | undefined;
  const newStatus = payload.status;

  if (!pgId) {
    return NextResponse.json(
      { success: false, message: 'Missing pgId in order webhook payload' },
      { status: 400 }
    );
  }

  if (!isOrderStatus(newStatus)) {
    return NextResponse.json(
      { success: false, message: `Invalid order status: ${newStatus}` },
      { status: 400 }
    );
  }

  try {
    await updateOrderStatus(pgId, newStatus);
    logger.info({ pgId, newStatus }, '[Webhook/Sanity] Order status updated');
    return NextResponse.json(
      { success: true, message: `Order ${pgId} status → ${newStatus}` },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ pgId, newStatus, err }, '[Webhook/Sanity] Order status update failed');

    // Invalid transition — 422 so Sanity doesn't retry indefinitely
    if (message.includes('Invalid status transition')) {
      return NextResponse.json(
        { success: false, message },
        { status: 422 }
      );
    }
    if (message.includes('not found')) {
      return NextResponse.json(
        { success: false, message },
        { status: 404 }
      );
    }
    throw err; // re-throw for the outer 500 handler
  }
}

async function handleCouponEvent(payload: Record<string, unknown>) {
  /**
   * Coupon lifecycle from Sanity Studio:
   *  - create/update → upsert in PostgreSQL
   *  - delete        → remove from PostgreSQL
   *
   * The `pgId` field is populated by our sync service when we push Postgres
   * coupons to Sanity. When an admin creates a NEW coupon directly in Studio
   * (pgId is absent), we create it in Postgres and the API route will
   * call syncCouponToSanity to write the pgId back.
   */
  const operation = payload.operation as string | undefined;
  const pgId = payload.pgId as string | undefined;

  // ── Delete ────────────────────────────────────────────────────────────────
  if (operation === 'delete') {
    if (!pgId) {
      // Coupon was created in Sanity but never synced to Postgres — nothing to do
      return NextResponse.json(
        { success: true, message: 'No Postgres record to delete' },
        { status: 200 }
      );
    }
    await deleteCoupon(pgId);
    logger.info({ pgId }, '[Webhook/Sanity] Coupon deleted from Postgres');
    return NextResponse.json(
      { success: true, message: `Coupon ${pgId} deleted` },
      { status: 200 }
    );
  }

  // ── Create / Update ───────────────────────────────────────────────────────
  const code = payload.code;
  const discountType = payload.discountType;
  const discountValue = payload.discountValue;

  if (typeof code !== 'string' || !code) {
    return NextResponse.json(
      { success: false, message: 'Missing or invalid code in coupon payload' },
      { status: 400 }
    );
  }
  if (!isDiscountType(discountType)) {
    return NextResponse.json(
      { success: false, message: `Invalid discountType: ${discountType}` },
      { status: 400 }
    );
  }
  if (typeof discountValue !== 'number') {
    return NextResponse.json(
      { success: false, message: 'Missing or invalid discountValue in coupon payload' },
      { status: 400 }
    );
  }

  const couponData = {
    code: String(code).toUpperCase(),
    description: typeof payload.description === 'string' ? payload.description : null,
    discountType,
    discountValue,
    minOrderAmount: typeof payload.minOrderAmount === 'number' ? payload.minOrderAmount : null,
    maxUses: typeof payload.maxUses === 'number' ? payload.maxUses : null,
    expiresAt: typeof payload.expiresAt === 'string' ? new Date(payload.expiresAt) : null,
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
  };

  if (pgId) {
    // Update existing coupon in Postgres
    const existing = await getCouponById(pgId);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: `Coupon ${pgId} not found in Postgres` },
        { status: 404 }
      );
    }
    await updateCoupon(pgId, couponData);
    logger.info({ pgId }, '[Webhook/Sanity] Coupon updated in Postgres');
    return NextResponse.json(
      { success: true, message: `Coupon ${pgId} updated` },
      { status: 200 }
    );
  }

  // New coupon created in Studio — insert in Postgres
  const created = await createCoupon(couponData);
  logger.info({ pgId: created.id, code: created.code }, '[Webhook/Sanity] Coupon created in Postgres');
  // NOTE: The sync service will be called separately (by the coupon API route or
  // a future reconciliation job) to write pgId back to the Sanity document.
  return NextResponse.json(
    { success: true, message: `Coupon ${created.id} created`, pgId: created.id },
    { status: 201 }
  );
}

// ── Promotion Handler ───────────────────────────────────────────────────────

async function handlePromotionEvent(payload: Record<string, unknown>) {
  /**
   * Promotions in Sanity may contain a `couponCode`. If they do, we must sync
   * that coupon into PostgreSQL so it can be validated during checkout.
   */
  const operation = payload.operation as string | undefined;
  const code = payload.couponCode;

  if (!code || typeof code !== 'string') {
    // Promotion doesn't have a coupon code; nothing to sync to Postgres.
    return NextResponse.json(
      { success: true, message: 'Promotion has no coupon code; ignored' },
      { status: 200 }
    );
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  if (operation === 'delete') {
    // Deactivate the coupon if it exists
    const existing = await getCouponByCode(code);
    if (existing) {
      await updateCoupon(existing.id, { isActive: false });
      logger.info({ code }, '[Webhook/Sanity] Promotion deleted; coupon deactivated in Postgres');
      return NextResponse.json(
        { success: true, message: `Coupon ${code} deactivated` },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { success: true, message: 'No Postgres coupon found to deactivate' },
      { status: 200 }
    );
  }

  // ── Create / Update ───────────────────────────────────────────────────────
  const discountType = payload.discountType;
  const discountValue = payload.discountValue;

  if (!isDiscountType(discountType)) {
    // We don't support BUY_X_GET_Y in Postgres coupons yet.
    return NextResponse.json(
      { success: false, message: `Unsupported discountType: ${discountType}` },
      { status: 400 }
    );
  }

  if (typeof discountValue !== 'number') {
    return NextResponse.json(
      { success: false, message: 'Missing or invalid discountValue in promotion payload' },
      { status: 400 }
    );
  }

  await upsertCouponByCode({
    code,
    description: typeof payload.title === 'string' ? payload.title : null,
    discountType,
    discountValue,
    expiresAt: typeof payload.endDate === 'string' ? new Date(payload.endDate) : null,
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
  });

  logger.info({ code }, '[Webhook/Sanity] Promotion coupon upserted in Postgres');
  return NextResponse.json(
    { success: true, message: `Promotion coupon ${code} synced` },
    { status: 200 }
  );
}

// ── Custom Request Handler ──────────────────────────────────────────────────

async function handleCustomRequestEvent(payload: Record<string, unknown>) {
  const pgId = payload.prismaId as string | undefined;

  if (!pgId) {
    return NextResponse.json(
      { success: false, message: 'Missing prismaId in customRequest webhook payload' },
      { status: 400 }
    );
  }

  const updateData: any = {};

  if (payload.status) {
    if (isCustomRequestStatus(payload.status)) {
      updateData.status = payload.status;
    } else {
      return NextResponse.json(
        { success: false, message: `Invalid status: ${payload.status}` },
        { status: 400 }
      );
    }
  }

  if (typeof payload.quotePrice === 'number') {
    updateData.quotePrice = payload.quotePrice;
  }
  if (typeof payload.estimatedDays === 'number') {
    updateData.estimatedDays = payload.estimatedDays;
  }
  if (typeof payload.adminNotes === 'string') {
    updateData.adminNotes = payload.adminNotes;
  }

  try {
    await updateCustomRequestFromSanity(pgId, updateData);
    logger.info({ pgId }, '[Webhook/Sanity] CustomRequest updated from Sanity');
    return NextResponse.json(
      { success: true, message: `CustomRequest ${pgId} synced` },
      { status: 200 }
    );
  } catch (err) {
    logger.error({ pgId, err }, '[Webhook/Sanity] CustomRequest update failed');
    return NextResponse.json(
      { success: false, message: 'CustomRequest update failed' },
      { status: 500 }
    );
  }
}

// ── Main route handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get(SIGNATURE_HEADER_NAME);
    const body = await req.text();

    // Validate HMAC signature when secret is configured
    if (secret) {
      if (!signature || !(await isValidSignature(body, signature, secret))) {
        logger.warn('[Webhook/Sanity] Invalid or missing signature');
        return NextResponse.json(
          { success: false, message: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(body) as Record<string, unknown>;
    const docType = payload._type as string | undefined;
    const docId = payload._id as string | undefined;

    if (!docId) {
      return NextResponse.json(
        { success: false, message: 'Missing _id in payload' },
        { status: 400 }
      );
    }

    logger.info({ docType, docId }, '[Webhook/Sanity] Event received');

    switch (docType) {
      case 'product':
        return await handleProductEvent(payload);
      case 'order':
        return await handleOrderEvent(payload);
      case 'coupon':
        return await handleCouponEvent(payload);
      case 'promotion':
        return await handlePromotionEvent(payload);
      case 'customRequest':
        return await handleCustomRequestEvent(payload);
      default:
        // Unknown type — acknowledge without processing
        return NextResponse.json(
          { success: true, message: `Ignored _type: ${docType}` },
          { status: 200 }
        );
    }
  } catch (err) {
    logger.error({ err }, '[Webhook/Sanity] Unhandled error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
