'use client';

import { useState } from 'react';
import { SanityProduct } from '@/sanity/lib/queries';
import styles from './ProductInfo.module.css';
import { PriceDisplay } from './PriceDisplay';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';

interface ProductInfoProps {
  product: SanityProduct;
  locale: string;
}

export function ProductInfo({ product, locale }: ProductInfoProps) {
  const isAr = locale === 'ar';

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    specs: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const title = isAr && product.titleAr ? product.titleAr : product.title;
  const description = isAr && product.descriptionAr ? product.descriptionAr : product.description;
  const deliveryInfo = isAr && product.deliveryInfoAr ? product.deliveryInfoAr : product.deliveryInfo;
  const returnPolicy = isAr && product.returnPolicyAr ? product.returnPolicyAr : product.returnPolicy;

  return (
    <div className={styles.container}>
      {/* Badges */}
      <div className={styles.badges}>
        {product.isNew && <Badge variant="accent" size="sm">{isAr ? 'جديد' : 'New'}</Badge>}
        {product.isBestSeller && <Badge variant="warning" size="sm">{isAr ? 'الأكثر مبيعاً' : 'Best Seller'}</Badge>}
        {product.isFeatured && <Badge variant="info" size="sm">{isAr ? 'مميز' : 'Featured'}</Badge>}
      </div>

      <h1 className={styles.title}>{title}</h1>

      <div className={styles.priceContainer}>
        <PriceDisplay
          price={product.price}
          discountPrice={product.discountPrice}
          locale={locale}
          size="lg"
          showSavings={true}
        />
      </div>

      {description && <p className={styles.description}>{description}</p>}

      <Divider decorative />

      <div className={styles.accordion}>
        {/* Specifications */}
        {product.specifications && product.specifications.length > 0 && (
          <div className={styles.accordionItem}>
            <button
              className={styles.accordionHeader}
              onClick={() => toggleSection('specs')}
              aria-expanded={openSections['specs']}
            >
              {isAr ? 'المواصفات' : 'Specifications'}
              <span className={[styles.accordionIcon, openSections['specs'] ? styles.open : ''].join(' ')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>
            {openSections['specs'] && (
              <div className={styles.accordionContent}>
                <ul className={styles.specList}>
                  {product.specifications.map((spec, i) => (
                    <li key={i} className={styles.specItem}>
                      <span className={styles.specKey}>
                        {isAr && spec.keyAr ? spec.keyAr : spec.key}
                      </span>
                      <span className={styles.specValue}>
                        {isAr && spec.valueAr ? spec.valueAr : spec.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Delivery Info */}
        {deliveryInfo && (
          <div className={styles.accordionItem}>
            <button
              className={styles.accordionHeader}
              onClick={() => toggleSection('delivery')}
              aria-expanded={openSections['delivery']}
            >
              {isAr ? 'معلومات التوصيل' : 'Delivery Information'}
              <span className={[styles.accordionIcon, openSections['delivery'] ? styles.open : ''].join(' ')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>
            {openSections['delivery'] && (
              <div className={styles.accordionContent}>
                <p className={styles.textBlock}>{deliveryInfo}</p>
              </div>
            )}
          </div>
        )}

        {/* Return Policy */}
        {returnPolicy && (
          <div className={styles.accordionItem}>
            <button
              className={styles.accordionHeader}
              onClick={() => toggleSection('return')}
              aria-expanded={openSections['return']}
            >
              {isAr ? 'سياسة الاسترجاع' : 'Return Policy'}
              <span className={[styles.accordionIcon, openSections['return'] ? styles.open : ''].join(' ')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>
            {openSections['return'] && (
              <div className={styles.accordionContent}>
                <p className={styles.textBlock}>{returnPolicy}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
