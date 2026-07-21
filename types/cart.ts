/**
 * Cart domain types.
 * Keep these pure — no imports from Next.js or Prisma.
 * This file is imported by both client (Zustand store) and server (order repository).
 */

export interface CartItem {
  /** unique identifier for this cart line (hash of productSyncId + customization) */
  id: string;
  /** matches ProductSync.id in the database */
  productSyncId: string;
  /** human-readable slug from Sanity (e.g. "hijab-rose-silk") */
  sanityId: string;
  /** product category from Sanity ("hijab" | "plexi") — used for coupon scope filtering */
  category?: string;
  /** display name derived from sanityId */
  name: string;
  /** price in the store currency (fetched from DB at checkout time) */
  price: number;
  /** quantity in cart (≥ 1) */
  quantity: number;
  /** optional image URL for cart UI */
  imageUrl?: string;
  /** Snapshot title for the order item (used if product changes later) */
  snapshotTitle?: string;
  /** Snapshot image URL */
  snapshotImageUrl?: string;
  /** Key-value pairs for selected variants and custom fields */
  customization?: Record<string, string>;
}

export interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'id'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  /** total number of individual units across all line items */
  totalItems: () => number;
  /** sum of price × quantity for all items */
  subtotal: () => number;
}

/** Payload sent to POST /api/checkout/order */
export interface CheckoutPayload {
  items: { 
    productSyncId: string; 
    quantity: number;
    snapshotTitle?: string;
    snapshotImageUrl?: string;
    customization?: Record<string, string>;
  }[];
  customer: {
    name: string;
    email: string;
    phone?: string;
    note?: string;
  };
}

/** Response from POST /api/checkout/order */
export interface CheckoutOrderResponse {
  orderId: string;
  referenceCode: string;
  totalAmount: number;
  currency: string;
  expiresAt: string; // ISO timestamp
  /** Display number shown to the customer for the ShamCash transfer */
  paymentDisplayNumber?: string;
  /** Which payment method was selected: 'shamcash' | 'stripe' */
  paymentMethod?: 'shamcash' | 'stripe';
  /** Stripe Checkout URL — only present when paymentMethod === 'stripe' */
  url?: string;
}
