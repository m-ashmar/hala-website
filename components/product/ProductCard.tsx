'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductCard.module.css';
import { Badge } from '@/components/ui/Badge';
import { WishlistButton } from './WishlistButton';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

export interface ProductCardProduct {
  _id: string;
  title: string;
  titleAr?: string;
  slug?: { current: string };
  price: number;
  discountPrice?: number;
  mainImageUrl?: string;
  gallery?: { url: string; alt?: string }[];
  isNew?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  category?: string;
}

export interface ProductCardProps {
  product: ProductCardProduct;
  locale?: string;
  priority?: boolean;
}

function fmt(price: number, locale = 'en') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(price);
}

export function ProductCard({ product, locale = 'en', priority = false }: ProductCardProps) {
  const isAr = locale === 'ar';
  const [hovered, setHovered] = useState(false);

  const title = isAr && product.titleAr ? product.titleAr : product.title;
  const href = `/${locale}/products/${product.slug?.current || product._id}`;

  const hasDiscount =
    product.discountPrice != null && product.discountPrice < product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
    : 0;

  // Second gallery image for hover swap
  const hoverImage = product.gallery?.[1]?.url;
  const mainImage = product.mainImageUrl;

  return (
    <article
      className={styles.card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image ── */}
      <Link href={href} className={styles.imageLink} tabIndex={-1} aria-hidden="true">
        <div className={styles.imageWrap}>
          {mainImage ? (
            <>
              <Image
                src={mainImage}
                alt={title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={[styles.img, styles.imgMain, hovered && hoverImage ? styles.imgFade : ''].filter(Boolean).join(' ')}
                priority={priority}
              />
              {hoverImage && (
                <Image
                  src={hoverImage}
                  alt={`${title} — alternate view`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className={[styles.img, styles.imgHover, hovered ? styles.imgHoverVisible : ''].filter(Boolean).join(' ')}
                />
              )}
            </>
          ) : (
            <div className={styles.placeholder} aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}

          {/* Discount badge */}
          {hasDiscount && (
            <div className={styles.discountBadge}>−{discountPct}%</div>
          )}

          {/* Quick overlay */}
          <div className={styles.overlay}>
            <span className={styles.quickView}>View Product</span>
          </div>
        </div>
      </Link>

      {/* ── Wishlist ── */}
      <div className={styles.wishlistWrap}>
        <WishlistButton productId={product._id} />
      </div>

      {/* ── Info ── */}
      <div className={styles.info}>
        {/* Badges row */}
        <div className={styles.badges}>
          {product.isNew && <Badge variant="accent" size="sm">New</Badge>}
          {product.isBestSeller && <Badge variant="warning" size="sm">Best Seller</Badge>}
          {product.inStock === false && <Badge variant="danger" size="sm">Out of Stock</Badge>}
        </div>

        <Link href={href} className={styles.titleLink}>
          <h3 className={styles.title}>{title}</h3>
        </Link>

        {/* Price */}
        <div className={styles.priceRow}>
          <span className={styles.price}>
            {fmt(hasDiscount ? product.discountPrice! : product.price, locale)}
          </span>
          {hasDiscount && (
            <span className={styles.originalPrice}>{fmt(product.price, locale)}</span>
          )}
        </div>
      </div>
    </article>
  );
}
