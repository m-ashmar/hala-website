'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useCartStore } from '@/lib/stores/cart.store';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { Divider } from '@/components/ui/Divider';
import { Spinner } from '@/components/ui/Spinner';
import styles from './cart.module.css';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

function fmt(amount: number, locale = 'en') {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: CURRENCY, maximumFractionDigits: 0,
  }).format(amount);
}

interface CouponResult {
  couponId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  eligibleAmount: number;
  discountAmount: number;
  fullSubtotal: number;
  finalAmount: number;
  eligibleSanityIds: string[];
  scopeLabel: string | null;
  description: string | null;
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, totalItems } = useCartStore();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const isAr = locale === 'ar';

  const [couponCode, setCouponCode]   = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const couponInputRef = useRef<HTMLInputElement>(null);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponError('');
    setCouponResult(null);
    setCouponLoading(true);
    try {
      const res = await fetch('/api/promotions/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          // Send full item context so the API can apply product/category scope
          items: items.map((i) => ({
            sanityId: i.sanityId,
            category: i.category ?? inferCategory(i.sanityId),
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponResult(data);
      } else {
        setCouponError(data.error ?? (isAr ? 'كود غير صالح' : 'Invalid coupon code.'));
      }
    } catch {
      setCouponError(isAr ? 'خطأ في الشبكة' : 'Network error. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponResult(null);
    setCouponCode('');
    setCouponError('');
  };

  const finalAmount = couponResult ? couponResult.finalAmount : subtotal();
  const eligibleSet = new Set(couponResult?.eligibleSanityIds ?? []);

  // ── Empty State ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <PageWrapper width="narrow" padTop padBottom>
        <EmptyState
          emoji="🛍️"
          title={isAr ? 'حقيبتك فارغة' : 'Your bag is empty'}
          description={
            isAr
              ? 'اكتشف مجموعات الحجاب والبليكسي المميزة وأضف قطعك المفضلة.'
              : 'Discover our curated Hijab and Plexi collections and add your favourite pieces.'
          }
          action={{ label: isAr ? 'تسوق الآن' : 'Shop Now', href: `/${locale}/products` }}
        />
      </PageWrapper>
    );
  }

  // ── Filled Cart ──────────────────────────────────────────────────────────────
  return (
    <PageWrapper width="wide" padTop padBottom>
      <div className={styles.layout} dir={isAr ? 'rtl' : 'ltr'}>

        {/* ══ LEFT — Item list ══ */}
        <section className={styles.itemsSection} aria-label={isAr ? 'قائمة المنتجات' : 'Cart items'}>
          {/* Header */}
          <div className={styles.itemsHeader}>
            <div>
              <h1 className={styles.heading}>
                {isAr ? 'حقيبة التسوق' : 'Shopping Bag'}
              </h1>
              <p className={styles.itemCount}>
                {totalItems()} {totalItems() === 1 ? (isAr ? 'منتج' : 'item') : (isAr ? 'منتجات' : 'items')}
              </p>
            </div>
            <Link href={`/${locale}/products`} className={styles.continueLink}>
              {isAr ? '← متابعة التسوق' : '← Continue Shopping'}
            </Link>
          </div>

          <Divider />

          {/* Cart rows */}
          <div className={styles.itemsList}>
            {items.map((item) => {
              const isDiscounted = couponResult !== null && eligibleSet.has(item.sanityId);
              return (
                <div
                  key={item.id}
                  className={[styles.itemRow, isDiscounted ? styles.itemRowDiscounted : ''].filter(Boolean).join(' ')}
                >
                  {/* Thumbnail */}
                  <div className={styles.thumb}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name ?? 'Product'}
                        fill
                        sizes="88px"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>
                      {item.name ?? item.sanityId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    {item.customization && Object.keys(item.customization).length > 0 && (
                      <div className={styles.customTags}>
                        {Object.entries(item.customization).map(([k, v]) => (
                          <span key={k} className={styles.customTag}>{k}: {v}</span>
                        ))}
                      </div>
                    )}
                    {/* Discount indicator */}
                    {isDiscounted && (
                      <span className={styles.discountBadge}>
                        ✓ {isAr ? 'خصم مُطبَّق' : 'Discount applied'}
                      </span>
                    )}
                    {/* Unit price on mobile */}
                    <p className={styles.unitPrice}>{fmt(item.price, locale)}</p>
                  </div>

                  {/* Quantity stepper */}
                  <div className={styles.stepper}>
                    <button
                      className={styles.stepBtn}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name ?? item.sanityId}`}
                    >−</button>
                    <span className={styles.stepQty}>{item.quantity}</span>
                    <button
                      className={styles.stepBtn}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name ?? item.sanityId}`}
                    >+</button>
                  </div>

                  {/* Line total */}
                  <div className={styles.lineTotal}>
                    <span className={styles.lineTotalAmt}>{fmt(item.price * item.quantity, locale)}</span>
                    {item.quantity > 1 && (
                      <span className={styles.lineTotalUnit}>{fmt(item.price, locale)} {isAr ? 'للقطعة' : 'each'}</span>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name ?? item.sanityId} from cart`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ RIGHT — Order summary ══ */}
        <aside className={styles.summaryBox} aria-label={isAr ? 'ملخص الطلب' : 'Order summary'}>
          <h2 className={styles.summaryTitle}>{isAr ? 'ملخص الطلب' : 'Order Summary'}</h2>

          {/* Summary rows */}
          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>{isAr ? `المجموع الفرعي (${totalItems()} منتج)` : `Subtotal (${totalItems()} items)`}</span>
              <span className={styles.summaryAmt}>{fmt(subtotal(), locale)}</span>
            </div>

            {couponResult && (
              <>
                <div className={[styles.summaryRow, styles.discountRow].join(' ')}>
                  <span>
                    {isAr ? 'خصم الكوبون' : 'Coupon discount'}
                    {couponResult.scopeLabel && (
                      <span className={styles.scopeLabel}> · {couponResult.scopeLabel}</span>
                    )}
                  </span>
                  <span className={styles.discountAmt}>− {fmt(couponResult.discountAmount, locale)}</span>
                </div>
              </>
            )}

            <div className={styles.shippingRow}>
              <span>{isAr ? 'الشحن' : 'Shipping'}</span>
              <span className={styles.freeTag}>{isAr ? 'يُحدَّد لاحقاً' : 'Calculated at checkout'}</span>
            </div>
          </div>

          <Divider />

          {/* Total */}
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>{isAr ? 'الإجمالي' : 'Total'}</span>
            <span className={styles.totalAmt}>{fmt(finalAmount, locale)}</span>
          </div>

          {/* Coupon area */}
          <div className={styles.couponSection}>
            <p className={styles.couponHeading}>{isAr ? 'كود الخصم' : 'Promo Code'}</p>

            {!couponResult ? (
              <div className={styles.couponRow}>
                <input
                  ref={couponInputRef}
                  id="cart-coupon-input"
                  type="text"
                  placeholder={isAr ? 'أدخل الكود…' : 'Enter code…'}
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  className={[styles.couponInput, couponError ? styles.couponInputError : ''].filter(Boolean).join(' ')}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  id="cart-apply-coupon-btn"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || couponLoading}
                  className={styles.couponBtn}
                >
                  {couponLoading ? <Spinner size={14} /> : (isAr ? 'تطبيق' : 'Apply')}
                </button>
              </div>
            ) : (
              <div className={styles.couponApplied}>
                <div className={styles.couponAppliedInfo}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span className={styles.couponCode}>{couponResult.code}</span>
                  <span className={styles.couponSavings}>
                    {couponResult.discountType === 'PERCENTAGE'
                      ? `${couponResult.discountValue}% off`
                      : `− ${fmt(couponResult.discountAmount, locale)}`}
                  </span>
                  {couponResult.scopeLabel && (
                    <span className={styles.scopeLabel}>{couponResult.scopeLabel}</span>
                  )}
                </div>
                <button onClick={removeCoupon} className={styles.couponRemove}>
                  {isAr ? 'إزالة' : 'Remove'}
                </button>
              </div>
            )}

            {couponError && (
              <p className={styles.couponError} role="alert">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                {couponError}
              </p>
            )}

            <Link href={`/${locale}/offers`} className={styles.viewOffers}>
              {isAr ? 'عرض جميع العروض ←' : 'View all offers →'}
            </Link>
          </div>

          {/* Notice */}
          <p className={styles.paymentNotice}>
            {isAr
              ? '💬 الدفع عبر ShamCash. ستتلقى تفاصيل الحساب في الخطوة التالية.'
              : '💬 Payment via ShamCash transfer. Account details on the next step.'}
          </p>

          {/* Checkout CTA */}
          <button
            id="cart-checkout-btn"
            className={styles.checkoutBtn}
            onClick={() => {
              const qs = new URLSearchParams();
              if (couponResult) {
                qs.set('couponId', couponResult.couponId);
                qs.set('discountAmount', String(couponResult.discountAmount));
                qs.set('finalAmount', String(couponResult.finalAmount));
              }
              router.push(`/${locale}/checkout${couponResult ? `?${qs.toString()}` : ''}`);
            }}
            aria-label={isAr ? 'الانتقال إلى الدفع' : 'Proceed to checkout'}
          >
            <span>{isAr ? 'الانتقال إلى الدفع' : 'Proceed to Checkout'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          {/* Trust signals */}
          <div className={styles.trustRow}>
            {[
              { icon: '🔒', label: isAr ? 'دفع آمن' : 'Secure Payment' },
              { icon: '✅', label: isAr ? 'جودة مضمونة' : 'Quality Guarantee' },
              { icon: '📦', label: isAr ? 'شحن سريع' : 'Fast Delivery' },
            ].map(({ icon, label }) => (
              <div key={label} className={styles.trustItem}>
                <span className={styles.trustIcon}>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PageWrapper>
  );
}

/**
 * Infer product category from its Sanity slug as a fallback.
 * Products with slugs starting with "hijab" → "hijab", "plexi" → "plexi".
 */
function inferCategory(sanityId: string): string {
  const slug = sanityId.toLowerCase();
  if (slug.startsWith('hijab')) return 'hijab';
  if (slug.startsWith('plexi')) return 'plexi';
  return 'other';
}
