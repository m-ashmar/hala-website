import React from 'react';
import styles from './PriceDisplay.module.css';
import { sypToUsd, formatUsd } from '@/lib/currency';

const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

export interface PriceDisplayProps {
  price: number;
  discountPrice?: number;
  currency?: string;
  locale?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSavings?: boolean;
  /**
   * SYP per 1 USD, from Sanity (Currency & Exchange Rate). When provided,
   * the converted USD price is shown alongside the SYP price. Products are
   * priced once in SYP; this derives the USD figure rather than duplicating it.
   */
  sypPerUsd?: number;
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
  sypPerUsd,
}: PriceDisplayProps) {
  const hasDiscount = discountPrice != null && discountPrice < price;
  const savings = hasDiscount ? price - discountPrice! : 0;
  const pct = hasDiscount ? Math.round((savings / price) * 100) : 0;

  const effectivePrice = hasDiscount ? discountPrice! : price;
  // Only shown when a valid rate is configured; never guess one.
  let usdLabel: string | null = null;
  if (typeof sypPerUsd === 'number' && sypPerUsd > 0) {
    try {
      usdLabel = formatUsd(sypToUsd(effectivePrice, sypPerUsd));
    } catch {
      usdLabel = null;
    }
  }

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
      {usdLabel && (
        <span className={styles.usd} title="Approximate card price">
          ≈ {usdLabel}
        </span>
      )}
      {showSavings && hasDiscount && (
        <span className={styles.savings}>
          You save {fmt(savings, locale, currency)}
        </span>
      )}
    </div>
  );
}
