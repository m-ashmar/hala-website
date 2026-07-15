import React from 'react';
import styles from './PriceDisplay.module.css';

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

export interface PriceDisplayProps {
  price: number;
  discountPrice?: number;
  currency?: string;
  locale?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSavings?: boolean;
}

function fmt(value: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PriceDisplay({
  price,
  discountPrice,
  currency = DEFAULT_CURRENCY,
  locale = 'en',
  size = 'md',
  showSavings = false,
}: PriceDisplayProps) {
  const hasDiscount = discountPrice != null && discountPrice < price;
  const savings = hasDiscount ? price - discountPrice! : 0;
  const pct = hasDiscount ? Math.round((savings / price) * 100) : 0;

  return (
    <div className={[styles.wrap, styles[size]].filter(Boolean).join(' ')}>
      <span className={[styles.price, hasDiscount ? styles.discounted : ''].filter(Boolean).join(' ')}>
        {fmt(hasDiscount ? discountPrice! : price, locale, currency)}
      </span>
      {hasDiscount && (
        <span className={styles.original}>{fmt(price, locale, currency)}</span>
      )}
      {hasDiscount && (
        <span className={styles.pctBadge}>−{pct}%</span>
      )}
      {showSavings && hasDiscount && (
        <span className={styles.savings}>
          You save {fmt(savings, locale, currency)}
        </span>
      )}
    </div>
  );
}
