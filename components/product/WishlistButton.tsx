'use client';

import React, { useState } from 'react';
import styles from './WishlistButton.module.css';
import { useWishlist } from './WishlistContext';

interface WishlistButtonProps {
  productId: string;
}

export function WishlistButton({ productId }: WishlistButtonProps) {
  const { wishlistedIds, toggleWishlist, isLoading } = useWishlist();
  const wishlisted = wishlistedIds.has(productId);
  const [animating, setAnimating] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
    
    await toggleWishlist(productId);
  };

  return (
    <button
      id={`wishlist-${productId}`}
      className={[styles.btn, wishlisted ? styles.active : '', animating ? styles.pop : '', isLoading ? styles.loading : '']
        .filter(Boolean)
        .join(' ')}
      onClick={toggle}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={wishlisted}
      disabled={isLoading}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={wishlisted ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
