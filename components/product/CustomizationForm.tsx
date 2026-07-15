'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/stores/cart.store';
import { SanityProduct } from '@/sanity/lib/queries';
import styles from './CustomizationForm.module.css';

interface CustomizationFormProps {
  product: SanityProduct;
  locale: string;
  dbProductId: string; // ProductSync.id from the database
}

export function CustomizationForm({ product, locale, dbProductId }: CustomizationFormProps) {
  const isAr = locale === 'ar';
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);

  // Initialize default variants
  // To keep it simple, we don't auto-select to force the user to choose, 
  // or we could auto-select the first in-stock option.

  const handleVariantSelect = (type: string, value: string) => {
    setSelectedVariants((prev) => ({ ...prev, [type]: value }));
  };

  const handleCustomFieldChange = (label: string, value: string) => {
    setCustomFields((prev) => ({ ...prev, [label]: value }));
  };

  const handleAddToCart = () => {
    // Validate required custom fields
    if (product.customizationFields) {
      for (const field of product.customizationFields) {
        if (field.required && !customFields[field.label]) {
          alert(isAr ? `يرجى إدخال ${field.labelAr || field.label}` : `Please enter ${field.label}`);
          return;
        }
      }
    }

    // Validate variants
    if (product.variants) {
      for (const variantGroup of product.variants) {
        if (!selectedVariants[variantGroup.type]) {
          alert(isAr ? `يرجى اختيار ${variantGroup.type}` : `Please select a ${variantGroup.type.toLowerCase()}`);
          return;
        }
      }
    }

    setIsAdding(true);

    const customizationData = {
      ...selectedVariants,
      ...customFields,
    };

    const title = isAr && product.titleAr ? product.titleAr : product.title;

    addItem({
      productSyncId: dbProductId,
      sanityId: product.sanityId,
      name: title,
      price: product.discountPrice ?? product.price,
      quantity,
      imageUrl: product.imageUrl,
      snapshotTitle: product.title, // always store English as base snapshot
      snapshotImageUrl: product.imageUrl,
      customization: Object.keys(customizationData).length > 0 ? customizationData : undefined,
    });

    // Provide visual feedback
    setTimeout(() => {
      setIsAdding(false);
      // Optional: open cart drawer here
      alert(isAr ? 'تمت الإضافة إلى السلة' : 'Added to cart');
    }, 400);
  };

  return (
    <div className={styles.container}>
      {/* Variants Selection */}
      {product.variants?.map((variantGroup, idx) => {
        const isColor = variantGroup.type === 'COLOR';

        return (
          <div key={idx} className={styles.fieldGroup}>
            <h3 className={styles.sectionTitle}>
              {variantGroup.type}
              <span className={styles.requiredAsterisk}>*</span>
            </h3>
            
            <div className={isColor ? styles.colorOptions : styles.variantOptions}>
              {variantGroup.options.map((opt, optIdx) => {
                const label = isAr && opt.labelAr ? opt.labelAr : opt.label;
                const isActive = selectedVariants[variantGroup.type] === opt.value;

                if (isColor) {
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      className={`${styles.colorBtn} ${isActive ? styles.active : ''}`}
                      style={{ backgroundColor: opt.hexColor || '#ccc' }}
                      title={label}
                      disabled={!opt.inStock}
                      onClick={() => handleVariantSelect(variantGroup.type, opt.value)}
                      aria-label={`Select color ${label}`}
                    />
                  );
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    className={`${styles.variantBtn} ${isActive ? styles.active : ''}`}
                    disabled={!opt.inStock}
                    onClick={() => handleVariantSelect(variantGroup.type, opt.value)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Custom Fields */}
      {product.customizationFields?.map((field, idx) => {
        const label = isAr && field.labelAr ? field.labelAr : field.label;
        const placeholder = isAr && field.placeholderAr ? field.placeholderAr : field.placeholder;

        return (
          <div key={idx} className={styles.field}>
            <label className={styles.label}>
              {label}
              {field.required && <span className={styles.requiredAsterisk}>*</span>}
            </label>

            {field.fieldType === 'TEXT' && (
              <input
                type="text"
                className={styles.input}
                placeholder={placeholder || ''}
                value={customFields[field.label] || ''}
                onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                required={field.required}
              />
            )}

            {field.fieldType === 'NOTE' && (
              <textarea
                className={styles.textarea}
                placeholder={placeholder || ''}
                value={customFields[field.label] || ''}
                onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                required={field.required}
              />
            )}

            {field.fieldType === 'COLOR' && (
              <input
                type="color"
                style={{ width: '60px', height: '40px', padding: '0', cursor: 'pointer' }}
                value={customFields[field.label] || '#000000'}
                onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
                required={field.required}
              />
            )}

            {/* Extend SIZE/FILE if needed */}
          </div>
        );
      })}

      {/* Quantity & Add to Cart */}
      <div className={styles.fieldGroup} style={{ marginTop: '0.5rem' }}>
        <label className={styles.label}>{isAr ? 'الكمية' : 'Quantity'}</label>
        <div className={styles.quantitySelector}>
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className={styles.qtyValue}>{quantity}</span>
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          className={styles.addToCartBtn}
          onClick={handleAddToCart}
          disabled={isAdding || !product.isActive}
        >
          {isAdding
            ? (isAr ? 'جاري الإضافة...' : 'Adding...')
            : !product.isActive
            ? (isAr ? 'غير متوفر' : 'Out of Stock')
            : (isAr ? 'أضف إلى السلة' : 'Add to Cart')}
        </button>
      </div>
    </div>
  );
}
