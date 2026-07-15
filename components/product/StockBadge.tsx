import React from 'react';
import styles from './StockBadge.module.css';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface StockBadgeProps {
  status: StockStatus;
  quantity?: number;
  lowThreshold?: number;
  locale?: string;
}

export function StockBadge({
  status,
  quantity,
  lowThreshold = 5,
  locale = 'en',
}: StockBadgeProps) {
  const isAr = locale === 'ar';

  const config: Record<StockStatus, { label: string; labelAr: string; class: string; dot: string }> = {
    in_stock:     { label: 'In Stock',     labelAr: 'متوفر',         class: styles.inStock,    dot: styles.dotGreen  },
    low_stock:    { label: 'Few Left',     labelAr: 'كمية محدودة',   class: styles.lowStock,   dot: styles.dotAmber  },
    out_of_stock: { label: 'Out of Stock', labelAr: 'غير متوفر',     class: styles.outOfStock, dot: styles.dotRed    },
  };

  const resolved: StockStatus =
    quantity != null
      ? quantity === 0
        ? 'out_of_stock'
        : quantity <= lowThreshold
        ? 'low_stock'
        : 'in_stock'
      : status;

  const { label, labelAr, class: cls, dot } = config[resolved];

  return (
    <span className={[styles.badge, cls].join(' ')}>
      <span className={[styles.dot, dot].join(' ')} />
      {isAr ? labelAr : label}
      {resolved === 'low_stock' && quantity != null && (
        <span className={styles.qty}>({quantity} left)</span>
      )}
    </span>
  );
}
