import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  /** Products this offer is restricted to (empty = all products) */
  linkedProducts?: { sanityId: string; title?: string; imageUrl?: string }[];
  /** Categories this offer is restricted to (empty = all categories) */
  linkedCategories?: string[];
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

  // Determine scope
  const hasLinkedProducts = (promotion.linkedProducts?.length ?? 0) > 0;
  const hasLinkedCategories = (promotion.linkedCategories?.length ?? 0) > 0;
  const isScoped = hasLinkedProducts || hasLinkedCategories;

  const scopeLabel = hasLinkedCategories
    ? (isAr ? 'يُطبَّق على: ' : 'Applies to: ') +
      promotion.linkedCategories!
        .map(c => c.charAt(0).toUpperCase() + c.slice(1))
        .join(', ')
    : hasLinkedProducts
    ? (isAr
        ? `يُطبَّق على ${promotion.linkedProducts!.length} منتج محدد`
        : `Applies to ${promotion.linkedProducts!.length} selected product${promotion.linkedProducts!.length > 1 ? 's' : ''}`)
    : null;

  // Build products URL filter for the "View products" link
  const productsHref = promotion.couponCode
    ? `/${locale}/products?coupon=${encodeURIComponent(promotion.couponCode)}`
    : `/${locale}/products`;

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

        {/* Scope tag — show which products/categories apply */}
        {isScoped && scopeLabel && (
          <div className={styles.scopeTag}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
            {scopeLabel}
          </div>
        )}

        {/* Linked product thumbnails (up to 4) */}
        {hasLinkedProducts && (
          <div className={styles.linkedProducts}>
            {promotion.linkedProducts!.slice(0, 4).map((p) => (
              <div key={p.sanityId} className={styles.linkedProductThumb} title={p.title}>
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.title ?? p.sanityId}
                    fill
                    sizes="40px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className={styles.linkedProductPlaceholder}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {promotion.linkedProducts!.length > 4 && (
              <div className={styles.linkedProductMore}>
                +{promotion.linkedProducts!.length - 4}
              </div>
            )}
            <Link href={productsHref} className={styles.viewProductsLink}>
              {isAr ? 'عرض المنتجات ←' : 'View products →'}
            </Link>
          </div>
        )}

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
