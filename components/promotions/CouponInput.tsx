'use client';

import React, { useState } from 'react';
import styles from './CouponInput.module.css';
import { Spinner } from '@/components/ui/Spinner';

export interface CouponResult {
  valid: boolean;
  discountType?: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y';
  discountValue?: number;
  message?: string;
  couponId?: string;
}

export interface CouponInputProps {
  onApply: (code: string, result: CouponResult) => void;
  onRemove?: () => void;
  appliedCode?: string;
  locale?: string;
  disabled?: boolean;
}

export function CouponInput({
  onApply,
  onRemove,
  appliedCode,
  locale = 'en',
  disabled = false,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAr = locale === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/promotions/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data: CouponResult & { error?: string } = await res.json();

      if (!res.ok || !data.valid) {
        setError(data.error ?? data.message ?? (isAr ? 'كود غير صالح' : 'Invalid coupon code'));
        onApply(trimmed, { valid: false });
      } else {
        const savingsLabel =
          data.discountType === 'PERCENTAGE'
            ? `${data.discountValue}% off`
            : data.discountType === 'FIXED'
            ? `-${data.discountValue?.toLocaleString()} applied`
            : 'Offer applied';
        setSuccess(savingsLabel);
        onApply(trimmed, data);
      }
    } catch {
      setError(isAr ? 'حدث خطأ. حاول مرة أخرى' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode('');
    setError('');
    setSuccess('');
    onRemove?.();
  };

  if (appliedCode) {
    return (
      <div className={styles.applied}>
        <div className={styles.appliedLeft}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className={styles.appliedCode}>{appliedCode}</span>
          {success && <span className={styles.appliedSavings}>{success}</span>}
        </div>
        <button className={styles.removeBtn} onClick={handleRemove} aria-label="Remove coupon">
          {isAr ? 'إزالة' : 'Remove'}
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.inputRow}>
        <input
          id="coupon-input"
          type="text"
          className={[styles.input, error ? styles.inputError : success ? styles.inputSuccess : ''].filter(Boolean).join(' ')}
          placeholder={isAr ? 'أدخل كود الخصم' : 'Enter promo code'}
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          disabled={disabled || loading}
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
          aria-label={isAr ? 'كود الخصم' : 'Promo code'}
          aria-describedby={error ? 'coupon-error' : success ? 'coupon-success' : undefined}
        />
        <button
          type="submit"
          className={styles.applyBtn}
          disabled={disabled || loading || !code.trim()}
        >
          {loading ? <Spinner size={16} /> : (isAr ? 'تطبيق' : 'Apply')}
        </button>
      </div>

      {error && (
        <p id="coupon-error" className={styles.error} role="alert">{error}</p>
      )}
      {success && !error && (
        <p id="coupon-success" className={styles.successMsg} role="status">{success}</p>
      )}
    </form>
  );
}
