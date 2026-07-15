import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './OrderCard.module.css';
import { OrderStatusBadge } from './OrderStatusBadge';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

function fmt(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: CURRENCY, maximumFractionDigits: 0,
  }).format(value);
}

export interface OrderCardItem {
  id: string;
  snapshotTitle: string | null;
  snapshotImageUrl: string | null;
  quantity: number;
  priceAtPurchase: number;
}

export interface OrderCardData {
  id: string;
  referenceCode: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: OrderCardItem[];
}

export interface OrderCardProps {
  order: OrderCardData;
  locale?: string;
  href?: string;
}

export function OrderCard({ order, locale = 'en', href }: OrderCardProps) {
  const isAr = locale === 'ar';
  const date = new Date(order.createdAt).toLocaleDateString(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const previewItems = order.items.slice(0, 3);
  const extra = order.items.length - 3;

  const inner = (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.ref}>
            {order.referenceCode ?? `#${order.id.slice(0, 8).toUpperCase()}`}
          </span>
          <span className={styles.date}>{date}</span>
        </div>
        <OrderStatusBadge status={order.status} locale={locale} size="sm" />
      </div>

      {/* Item thumbnails */}
      <div className={styles.thumbs}>
        {previewItems.map((item) => (
          <div key={item.id} className={styles.thumb}>
            {item.snapshotImageUrl ? (
              <Image
                src={item.snapshotImageUrl}
                alt={item.snapshotTitle ?? 'Product'}
                fill
                sizes="56px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className={styles.thumbPlaceholder} />
            )}
            {item.quantity > 1 && (
              <span className={styles.qty}>×{item.quantity}</span>
            )}
          </div>
        ))}
        {extra > 0 && (
          <div className={[styles.thumb, styles.thumbExtra].join(' ')}>
            +{extra}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.itemCount}>
          {order.items.length} {order.items.length === 1 ? (isAr ? 'منتج' : 'item') : (isAr ? 'منتجات' : 'items')}
        </span>
        <span className={styles.total}>{fmt(order.totalAmount, locale)}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className={styles.link}>{inner}</Link>;
  }
  return inner;
}
