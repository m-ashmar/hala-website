import { defineField, defineType } from 'sanity'

/**
 * Sanity Order document.
 *
 * PostgreSQL is the source of truth for all transactional data.
 * This document is a synchronized projection of the Postgres Order record.
 *
 * Document ID convention: "order-{postgresOrderId}"
 * This ensures idempotent upserts — no duplicate documents.
 *
 * Read-only fields: all except `status`.
 * Administrators change order status here; the Sanity webhook propagates
 * the change back to Postgres via POST /api/webhooks/sanity.
 */

// Valid order status transitions enforced on the Postgres side.
// Exposed here purely as labels for the Studio dropdown.
const ORDER_STATUS_OPTIONS = [
  { title: '⏳ Pending', value: 'PENDING' },
  { title: '✅ Confirmed', value: 'CONFIRMED' },
  { title: '🔧 Preparing', value: 'PREPARING' },
  { title: '📦 Ready for Shipping', value: 'READY_FOR_SHIPPING' },
  { title: '🚚 Shipped', value: 'SHIPPED' },
  { title: '🎉 Delivered', value: 'DELIVERED' },
  { title: '❌ Cancelled', value: 'CANCELLED' },
  { title: '💳 Failed Payment', value: 'FAILED_PAYMENT' },
  { title: '↩️ Refunded', value: 'REFUNDED' },
]

const PAYMENT_STATUS_OPTIONS = [
  { title: 'Pending', value: 'PENDING' },
  { title: 'Paid', value: 'PAID' },
  { title: 'Failed', value: 'FAILED' },
  { title: 'Refunded', value: 'REFUNDED' },
]

export const orderType = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  groups: [
    { name: 'status', title: 'Status & Management', default: true },
    { name: 'customer', title: 'Customer' },
    { name: 'items', title: 'Order Items' },
    { name: 'payment', title: 'Payment & Totals' },
  ],
  fields: [
    // ── Internal reference (hidden) ──────────────────────────────────────────
    defineField({
      name: 'pgId',
      title: 'PostgreSQL Order ID',
      type: 'string',
      description: 'Internal Postgres ID — do not edit.',
      readOnly: true,
      hidden: true,
    }),

    defineField({
      name: 'referenceCode',
      title: 'Reference Code',
      type: 'string',
      description: 'Customer payment reference (e.g. HL-20260707-A3F2)',
      readOnly: true,
      group: 'status',
    }),

    // ── Status (admin-editable) ──────────────────────────────────────────────
    defineField({
      name: 'status',
      title: 'Order Status',
      type: 'string',
      group: 'status',
      description:
        'Change this to update the order status. The change will be synced to PostgreSQL automatically via webhook.',
      options: {
        list: ORDER_STATUS_OPTIONS,
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'paymentStatus',
      title: 'Payment Status',
      type: 'string',
      group: 'status',
      options: {
        list: PAYMENT_STATUS_OPTIONS,
        layout: 'radio',
      },
      readOnly: true,
      description: 'Managed by the payment gateway — do not change manually.',
    }),

    // ── Customer ─────────────────────────────────────────────────────────────
    defineField({
      name: 'customerName',
      title: 'Customer Name',
      type: 'string',
      readOnly: true,
      group: 'customer',
    }),

    defineField({
      name: 'customerEmail',
      title: 'Customer Email',
      type: 'string',
      readOnly: true,
      group: 'customer',
    }),

    defineField({
      name: 'customerPhone',
      title: 'WhatsApp / Phone',
      type: 'string',
      readOnly: true,
      group: 'customer',
    }),

    defineField({
      name: 'customerNote',
      title: 'Customer Note',
      type: 'text',
      rows: 3,
      readOnly: true,
      group: 'customer',
    }),

    // ── Payment & Totals ─────────────────────────────────────────────────────
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      readOnly: true,
      group: 'payment',
    }),

    defineField({
      name: 'totalAmount',
      title: 'Total Amount',
      type: 'number',
      readOnly: true,
      group: 'payment',
    }),

    defineField({
      name: 'discountAmount',
      title: 'Discount Amount',
      type: 'number',
      readOnly: true,
      group: 'payment',
    }),

    defineField({
      name: 'couponCode',
      title: 'Coupon Code Used',
      type: 'string',
      readOnly: true,
      group: 'payment',
    }),

    defineField({
      name: 'shippingCost',
      title: 'Shipping Cost',
      type: 'number',
      readOnly: true,
      group: 'payment',
    }),

    defineField({
      name: 'pgCreatedAt',
      title: 'Order Date',
      type: 'datetime',
      readOnly: true,
      group: 'payment',
    }),

    // ── Order Items ──────────────────────────────────────────────────────────
    defineField({
      name: 'items',
      title: 'Order Items',
      type: 'array',
      group: 'items',
      readOnly: true,
      of: [
        {
          type: 'object',
          name: 'orderItem',
          fields: [
            defineField({
              name: 'productTitle',
              title: 'Product (Sanity ID)',
              type: 'string',
              readOnly: true,
            }),
            defineField({
              name: 'snapshotTitle',
              title: 'Title at Purchase',
              type: 'string',
              readOnly: true,
            }),
            defineField({
              name: 'snapshotImageUrl',
              title: 'Image at Purchase',
              type: 'url',
              readOnly: true,
            }),
            defineField({
              name: 'quantity',
              title: 'Quantity',
              type: 'number',
              readOnly: true,
            }),
            defineField({
              name: 'unitPrice',
              title: 'Unit Price',
              type: 'number',
              readOnly: true,
            }),
            defineField({
              name: 'customization',
              title: 'Customization',
              type: 'text',
              rows: 2,
              readOnly: true,
              description: 'JSON string of customization fields chosen by customer',
            }),
          ],
          preview: {
            select: {
              title: 'snapshotTitle',
              subtitle: 'quantity',
              media: 'snapshotImageUrl',
            },
            prepare({ title, subtitle }) {
              return {
                title: title ?? 'Unknown product',
                subtitle: `Qty: ${subtitle}`,
              }
            },
          },
        },
      ],
    }),
  ],

  preview: {
    select: {
      referenceCode: 'referenceCode',
      status: 'status',
      customerName: 'customerName',
      totalAmount: 'totalAmount',
      currency: 'currency',
    },
    prepare({ referenceCode, status, customerName, totalAmount, currency }) {
      const statusEmoji: Record<string, string> = {
        PENDING: '⏳',
        CONFIRMED: '✅',
        PREPARING: '🔧',
        READY_FOR_SHIPPING: '📦',
        SHIPPED: '🚚',
        DELIVERED: '🎉',
        CANCELLED: '❌',
        FAILED_PAYMENT: '💳',
        REFUNDED: '↩️',
      }
      const emoji = statusEmoji[status] ?? '📋'
      return {
        title: `${emoji} ${referenceCode ?? 'No Reference'}`,
        subtitle: `${customerName ?? 'Guest'} — ${totalAmount?.toLocaleString() ?? '?'} ${currency ?? ''}`,
      }
    },
  },

  orderings: [
    {
      title: 'Newest First',
      name: 'createdAtDesc',
      by: [{ field: 'pgCreatedAt', direction: 'desc' }],
    },
    {
      title: 'Status',
      name: 'statusAsc',
      by: [{ field: 'status', direction: 'asc' }],
    },
  ],
})
