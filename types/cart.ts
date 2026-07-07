/**
 * Cart domain types.
 * Keep these pure — no imports from Next.js or Prisma.
 * This file is imported by both client (Zustand store) and server (order repository).
 */

export interface CartItem {
  /** matches ProductSync.id in the database */
  productSyncId: string;
  /** human-readable slug from Sanity (e.g. "hijab-rose-silk") */
  sanityId: string;
  /** display name derived from sanityId */
  name: string;
  /** price in the store currency (fetched from DB at checkout time) */
  price: number;
  /** quantity in cart (≥ 1) */
  quantity: number;
  /** optional image URL for cart UI */
  imageUrl?: string;
}

export interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productSyncId: string) => void;
  updateQuantity: (productSyncId: string, quantity: number) => void;
  clearCart: () => void;
  /** total number of individual units across all line items */
  totalItems: () => number;
  /** sum of price × quantity for all items */
  subtotal: () => number;
}

/** Payload sent to POST /api/checkout/order */
export interface CheckoutPayload {
  items: { productSyncId: string; quantity: number }[];
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
}
