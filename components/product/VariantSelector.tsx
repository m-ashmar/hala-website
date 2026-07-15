'use client';

import React from 'react';
import styles from './VariantSelector.module.css';

export interface Variant {
  id: string;
  label: string;
  labelAr?: string;
  value: string;
  color?: string;       // hex for color swatches
  image?: string;
  disabled?: boolean;
}

export interface VariantSelectorProps {
  label: string;
  labelAr?: string;
  variants: Variant[];
  selected?: string;
  onChange: (value: string) => void;
  type?: 'swatch' | 'chip' | 'color';
  locale?: string;
}

export function VariantSelector({
  label,
  labelAr,
  variants,
  selected,
  onChange,
  type = 'chip',
  locale = 'en',
}: VariantSelectorProps) {
  const isAr = locale === 'ar';
  const displayLabel = isAr && labelAr ? labelAr : label;
  const selectedVariant = variants.find((v) => v.value === selected);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>{displayLabel}</span>
        {selectedVariant && (
          <span className={styles.selected}>
            {isAr && selectedVariant.labelAr ? selectedVariant.labelAr : selectedVariant.label}
          </span>
        )}
      </div>

      <div className={[styles.group, styles[type]].filter(Boolean).join(' ')} role="group" aria-label={displayLabel}>
        {variants.map((v) => {
          const isActive = v.value === selected;
          const vLabel = isAr && v.labelAr ? v.labelAr : v.label;

          if (type === 'color' && v.color) {
            return (
              <button
                key={v.id}
                className={[styles.colorSwatch, isActive ? styles.colorActive : '', v.disabled ? styles.disabled : ''].filter(Boolean).join(' ')}
                onClick={() => !v.disabled && onChange(v.value)}
                title={vLabel}
                aria-label={vLabel}
                aria-pressed={isActive}
                disabled={v.disabled}
                style={{ '--swatch-color': v.color } as React.CSSProperties}
              />
            );
          }

          return (
            <button
              key={v.id}
              className={[styles.chip, isActive ? styles.chipActive : '', v.disabled ? styles.disabled : ''].filter(Boolean).join(' ')}
              onClick={() => !v.disabled && onChange(v.value)}
              aria-pressed={isActive}
              disabled={v.disabled}
            >
              {vLabel}
              {v.disabled && <span className={styles.strikethrough} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
