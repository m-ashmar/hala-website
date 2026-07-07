/**
 * Cart store — Zustand with localStorage persistence.
 *
 * Design decisions:
 * - `persist` middleware writes to localStorage under the key "halahello-cart"
 * - `partialize` ensures only `items` is persisted (not functions)
 * - Actions are pure and predictable — easy to unit test
 * - `totalItems` and `subtotal` are plain functions (not derived state) to avoid
 *   Zustand selector subscription complexity in simple use cases
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, CartStore } from '@/types/cart';

const STORAGE_KEY = 'halahello-cart';

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (incoming) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.productSyncId === incoming.productSyncId
          );
          if (existing) {
            // Increment quantity if already in cart
            return {
              items: state.items.map((i) =>
                i.productSyncId === incoming.productSyncId
                  ? { ...i, quantity: i.quantity + (incoming.quantity ?? 1) }
                  : i
              ),
            };
          }
          // Add new line item
          return {
            items: [
              ...state.items,
              { ...incoming, quantity: incoming.quantity ?? 1 },
            ],
          };
        });
      },

      removeItem: (productSyncId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productSyncId !== productSyncId),
        }));
      },

      updateQuantity: (productSyncId, quantity) => {
        if (quantity < 1) {
          // Treat setting quantity to 0 as removal
          get().removeItem(productSyncId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productSyncId === productSyncId ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: () =>
        get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        // Guard for SSR environments where localStorage is not available
        typeof window !== 'undefined' ? localStorage : (undefined as any)
      ),
      // Only persist the data — not the functions
      partialize: (state) => ({ items: state.items }),
    }
  )
);
