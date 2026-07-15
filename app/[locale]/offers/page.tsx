'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OfferCard, OfferCardPromotion } from '@/components/promotions/OfferCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Divider } from '@/components/ui/Divider';
import { PageWrapper } from '@/components/layout/PageWrapper';
import styles from './offers.module.css';

export default function OffersPage() {
  const pathname = usePathname();
  const isAr = pathname?.startsWith('/ar') ?? false;
  const locale = isAr ? 'ar' : 'en';

  const [promotions, setPromotions] = useState<OfferCardPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/promotions')
      .then((r) => r.json())
      .then((d) => {
        setPromotions(d.promotions ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError(isAr ? 'فشل تحميل العروض. حاول مرة أخرى.' : 'Failed to load offers. Please try again.');
        setLoading(false);
      });
  }, [isAr]);

  return (
    <PageWrapper width="default" padTop padBottom>
      {/* ── Page header ── */}
      <div className={styles.header}>
        <div className={styles.eyebrow}>
          <span>✦</span>
          {isAr ? 'عروض حصرية' : 'Exclusive Offers'}
          <span>✦</span>
        </div>
        <h1 className={styles.title}>
          {isAr ? 'العروض والخصومات' : 'Deals & Promotions'}
        </h1>
        <p className={styles.subtitle}>
          {isAr
            ? 'انسخ كود الخصم واستخدمه عند الدفع. معظم العروض لا تتطلب حساباً.'
            : 'Copy a promo code and paste it at checkout. No account required for most offers.'}
        </p>
      </div>

      {/* ── Skeletons ── */}
      {loading && (
        <div className={styles.grid}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" height={280} />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className={styles.errorBox} role="alert">
          <span>⚠</span> {error}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && promotions.length === 0 && (
        <EmptyState
          emoji="🎁"
          title={isAr ? 'لا توجد عروض نشطة حالياً' : 'No active offers right now'}
          description={
            isAr
              ? 'تحقق مرة أخرى قريباً — نضيف عروضاً وخصومات حصرية بانتظام.'
              : 'Check back soon — we regularly add new promotions and exclusive discounts.'
          }
          action={{ label: isAr ? 'تسوق الآن' : 'Shop Now', href: `/${locale}/products` }}
        />
      )}

      {/* ── Offer cards ── */}
      {!loading && !error && promotions.length > 0 && (
        <div className={styles.grid}>
          {promotions.map((promo, i) => (
            <OfferCard key={promo._id} promotion={promo} index={i} locale={locale} />
          ))}
        </div>
      )}

      {/* ── How it works ── */}
      {!loading && !error && (
        <>
          <div className={styles.howItWorks}>
            <h2 className={styles.howTitle}>
              {isAr ? 'كيفية استخدام كود الخصم' : 'How to use a promo code'}
            </h2>
            <div className={styles.steps}>
              {[
                { en: 'Copy the promo code by clicking on it above.', ar: 'انسخ كود الخصم بالنقر عليه أعلاه.' },
                { en: 'Add your favourite items to the cart and proceed to checkout.', ar: 'أضف المنتجات إلى السلة وانتقل إلى الدفع.' },
                { en: 'Enter the code in the "Promo Code" field in your cart.', ar: 'أدخل الكود في حقل "كود الخصم" في سلتك.' },
                { en: 'Your discount will be applied instantly before payment.', ar: 'سيُطبَّق الخصم تلقائياً قبل الدفع.' },
              ].map(({ en, ar }, i) => (
                <div key={i} className={styles.step}>
                  <div className={styles.stepNum}>{i + 1}</div>
                  <p className={styles.stepText}>{isAr ? ar : en}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className={styles.cta}>
            <Divider decorative />
            <Link href={`/${locale}/products`} className="btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
              {isAr ? 'تسوق الآن وادخر ←' : 'Shop Now & Save →'}
            </Link>
          </div>
        </>
      )}
    </PageWrapper>
  );
}
