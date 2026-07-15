import React from 'react';
import Image from 'next/image';
import styles from './OfferCard.module.css';
import { CountdownTimer } from './CountdownTimer';
import { CopyButton } from './CopyButton';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

export interface OfferCardPromotion {
  _id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y';
  discountValue: number;
  couponCode?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  bannerImageUrl?: string;
}

const PALETTE = [
  { bg: 'rgba(207,161,141,0.1)',  accent: '#CFA18D', border: 'rgba(207,161,141,0.2)' },
  { bg: 'rgba(96,165,250,0.08)',  accent: '#60a5fa', border: 'rgba(96,165,250,0.18)' },
  { bg: 'rgba(52,211,153,0.08)',  accent: '#34d399', border: 'rgba(52,211,153,0.18)' },
  { bg: 'rgba(167,139,250,0.08)', accent: '#a78bfa', border: 'rgba(167,139,250,0.18)' },
  { bg: 'rgba(251,191,36,0.08)',  accent: '#fbbf24', border: 'rgba(251,191,36,0.18)' },
];

export interface OfferCardProps {
  promotion: OfferCardPromotion;
  index?: number;
  locale?: string;
}

export function OfferCard({ promotion, index = 0, locale = 'en' }: OfferCardProps) {
  const isAr = locale === 'ar';
  const palette = PALETTE[index % PALETTE.length];

  const title       = isAr && promotion.titleAr       ? promotion.titleAr       : promotion.title;
  const description = isAr && promotion.descriptionAr ? promotion.descriptionAr : promotion.description;

  const discountLabel =
    promotion.discountType === 'PERCENTAGE'
      ? `${promotion.discountValue}% OFF`
      : promotion.discountType === 'FIXED'
      ? `${promotion.discountValue.toLocaleString()} ${CURRENCY} OFF`
      : isAr ? 'اشترِ والحصل على مجاني' : 'Buy X Get Y';

  return (
    <article
      className={styles.card}
      style={{
        '--card-accent': palette.accent,
        '--card-bg': palette.bg,
        '--card-border': palette.border,
      } as React.CSSProperties}
    >
      {/* Banner image */}
      {promotion.bannerImageUrl && (
        <div className={styles.banner}>
          <Image
            src={promotion.bannerImageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
          />
          <div className={styles.bannerOverlay} />
        </div>
      )}

      <div className={styles.body}>
        {/* Decorative orb */}
        <div className={styles.orb} aria-hidden="true" />

        {/* Header row */}
        <div className={styles.headerRow}>
          <div className={styles.discountBadge}>{discountLabel}</div>
          {promotion.endDate && (
            <CountdownTimer endDate={promotion.endDate} compact />
          )}
        </div>

        {/* Title + description */}
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}

        {/* Coupon code */}
        {promotion.couponCode && (
          <div className={styles.couponSection}>
            <span className={styles.couponLabel}>
              {isAr ? 'كود الخصم' : 'Promo Code'}
            </span>
            <CopyButton
              code={promotion.couponCode}
              label={isAr ? 'نسخ' : 'Copy'}
              successLabel={isAr ? '✓ تم النسخ!' : '✓ Copied!'}
            />
          </div>
        )}
      </div>
    </article>
  );
}
