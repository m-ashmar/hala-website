'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface WishlistContextType {
  wishlistedIds: Set<string>;
  toggleWishlist: (productId: string) => Promise<void>;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlistedIds: new Set(),
  toggleWishlist: async () => {},
  isLoading: true,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    async function loadWishlist() {
      try {
        const res = await fetch('/api/wishlist');
        if (res.ok) {
          // Logged in
          const data = await res.json();
          setWishlistedIds(new Set(data.productIds));
        } else {
          // Guest or error, load from local storage
          const stored = localStorage.getItem('hala_wishlist');
          if (stored) {
            const parsed = JSON.parse(stored);
            setWishlistedIds(new Set(parsed));
          }
        }
      } catch (error) {
        console.error('Failed to load wishlist', error);
        // Fallback to local storage
        const stored = localStorage.getItem('hala_wishlist');
        if (stored) {
          setWishlistedIds(new Set(JSON.parse(stored)));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadWishlist();
  }, []);

  const toggleWishlist = async (productId: string) => {
    const isAdding = !wishlistedIds.has(productId);

    // Optimistic UI update
    setWishlistedIds((prev) => {
      const next = new Set(prev);
      if (isAdding) next.add(productId);
      else next.delete(productId);
      
      // Always sync to localStorage as a fallback
      localStorage.setItem('hala_wishlist', JSON.stringify(Array.from(next)));
      
      return next;
    });

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, action: isAdding ? 'add' : 'remove' }),
      });

      // If user is not authenticated, that's fine, we already updated localStorage
      if (!res.ok && res.status !== 401) {
        console.error('Failed to sync wishlist with server');
        // Revert UI on unexpected error? (Omitted for simplicity, rely on optimistic success)
      }
    } catch (error) {
      console.error('Failed to sync wishlist', error);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistedIds, toggleWishlist, isLoading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
