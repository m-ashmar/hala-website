import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './PromotionBanner.module.css';
import { CountdownTimer } from './CountdownTimer';

export interface PromotionBannerPromotion {
  _id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y';
  discountValue: number;
  couponCode?: string;
  endDate: string;
  bannerImageUrl?: string;
}

export interface PromotionBannerProps {
  promotion: PromotionBannerPromotion;
  locale?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export function PromotionBanner({
  promotion,
  locale = 'en',
  ctaHref = '/',
  ctaLabel,
}: PromotionBannerProps) {
  const isAr = locale === 'ar';
  const title = isAr && promotion.titleAr ? promotion.titleAr : promotion.title;
  const description = isAr && promotion.descriptionAr ? promotion.descriptionAr : promotion.description;

  const discountLabel =
    promotion.discountType === 'PERCENTAGE'
      ? `${promotion.discountValue}% OFF`
      : promotion.discountType === 'FIXED'
      ? `Save ${promotion.discountValue.toLocaleString()}`
      : 'Special Offer';

  const cta = ctaLabel ?? (isAr ? 'تسوق الآن' : 'Shop Now');

  return (
    <section className={styles.banner} aria-label={title}>
      {/* Background image */}
      {promotion.bannerImageUrl && (
        <Image
          src={promotion.bannerImageUrl}
          alt=""
          fill
          priority
          className={styles.bg}
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
      )}
      <div className={styles.overlay} />

      {/* Content */}
      <div className={styles.content}>
        {/* Eyebrow badge */}
        <div className={styles.eyebrow}>
          <span>✦</span>
          <span>{isAr ? 'عرض حصري' : 'Exclusive Offer'}</span>
          <span>✦</span>
        </div>

        {/* Discount */}
        <div className={styles.discountLabel}>{discountLabel}</div>

        {/* Title */}
        <h2 className={styles.title}>{title}</h2>

        {/* Description */}
        {description && <p className={styles.description}>{description}</p>}

        {/* Countdown */}
        {promotion.endDate && (
          <div className={styles.timer}>
            <span className={styles.timerLabel}>{isAr ? 'ينتهي خلال' : 'Ends in'}</span>
            <CountdownTimer endDate={promotion.endDate} />
          </div>
        )}

        {/* Coupon */}
        {promotion.couponCode && (
          <div className={styles.couponRow}>
            <span className={styles.couponTag}>
              {isAr ? 'الكود:' : 'Code:'} <strong>{promotion.couponCode}</strong>
            </span>
          </div>
        )}

        {/* CTA */}
        <Link href={ctaHref} className={styles.cta}>
          {cta}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
