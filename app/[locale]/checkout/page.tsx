'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '@/lib/stores/cart.store';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CheckoutOrderResponse } from '@/types/cart';
import styles from './checkout.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';
const POLL_INTERVAL_MS = 30_000;

function fmt(n: number) {
  return `${n.toLocaleString()} ${CURRENCY}`;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = ['Customer Info', 'Payment Instructions'];
  return (
    <div className={styles.stepIndicator}>
      {steps.map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <div key={label} className={styles.stepWrapper}>
            <div className={styles.stepCircleContainer}>
              <div
                className={[
                  styles.stepCircle,
                  done ? styles.stepCircleDone : '',
                  active ? styles.stepCircleActive : '',
                ].filter(Boolean).join(' ')}
              >
                {done ? '✓' : num}
              </div>
              <span
                className={[styles.stepLabel, active ? styles.stepLabelActive : ''].filter(Boolean).join(' ')}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[styles.stepConnector, done ? styles.stepConnectorDone : ''].filter(Boolean).join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const isLow = remaining !== 'Expired' && parseInt(remaining) < 10;
  return (
    <span className={isLow ? styles.countdownLow : styles.countdownNormal}>
      {remaining}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponId = searchParams?.get('couponId') ?? undefined;
  // Discounted amounts passed from cart page as URL params
  const urlDiscountAmount = parseFloat(searchParams?.get('discountAmount') ?? '0') || 0;
  const urlFinalAmount = parseFloat(searchParams?.get('finalAmount') ?? '0') || 0;

  const { items, subtotal, totalItems, clearCart } = useCartStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderData, setOrderData] = useState<CheckoutOrderResponse | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', note: '' });
  const [paymentMethod, setPaymentMethod] = useState<'shamcash' | 'stripe'>('shamcash');

  const updateForm = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Redirect away if cart is empty
  useEffect(() => {
    if (items.length === 0 && step === 1) router.replace('/en/cart');
  }, [items.length, step, router]);

  // Compute display amounts
  const rawSubtotal = subtotal();
  const hasDiscount = couponId && urlDiscountAmount > 0;
  const displayTotal = hasDiscount ? urlFinalAmount : rawSubtotal;

  // ── Step 1: create order ───────────────────────────────────────────────────
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/checkout/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            productSyncId: i.productSyncId,
            quantity: i.quantity,
            customization: i.customization,
            snapshotTitle: i.snapshotTitle,
            snapshotImageUrl: i.snapshotImageUrl,
          })),
          customer: { name: form.name, email: form.email, phone: form.phone || undefined, note: form.note || undefined },
          paymentMethod,
          ...(couponId && { couponId }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? 'Failed to create order. Please try again.');
        return;
      }

      if (data.paymentMethod === 'stripe' && data.url) {
        window.location.href = data.url;
        return;
      }

      setOrderData(data);
      setStep(2);
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2: poll for payment confirmation ─────────────────────────────────
  const checkPayment = useCallback(async () => {
    if (!orderData) return;
    try {
      const res = await fetch(`/api/checkout/verify/${orderData.orderId}`);
      const data = await res.json();
      if (data.status === 'PROCESSING') {
        setVerifyStatus('confirmed');
        clearCart();
        router.push(`/en/checkout/success?orderId=${orderData.orderId}`);
      } else if (data.status === 'CANCELLED') {
        setVerifyStatus('expired');
      }
    } catch {
      // Silently retry
    }
  }, [orderData, clearCart, router]);

  useEffect(() => {
    if (step !== 2 || verifyStatus !== 'pending') return;
    const id = setInterval(checkPayment, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [step, verifyStatus, checkPayment]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandName}>Halahello</div>
          <div className={styles.brandSub}>Secure Checkout</div>
        </div>

        <StepIndicator step={step} />

        {/* ── STEP 1: Customer information ── */}
        {step === 1 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Your Information</h2>

            {/* Order summary with discount */}
            <div className={styles.orderSummary}>
              <div className={styles.orderSummaryRow}>
                <span>Subtotal ({totalItems()} item{totalItems() !== 1 ? 's' : ''})</span>
                <span className={styles.orderSummaryAccent}>{fmt(rawSubtotal)}</span>
              </div>
              {hasDiscount && (
                <div className={styles.orderSummaryRow}>
                  <span>Coupon discount</span>
                  <span className={styles.orderSummaryDiscount}>− {fmt(urlDiscountAmount)}</span>
                </div>
              )}
              <div className={styles.orderSummaryTotal}>
                <span>Order total</span>
                <span className={styles.orderSummaryTotalAmt}>{fmt(displayTotal)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Full Name *</label>
                <input
                  className={styles.input}
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email Address *</label>
                <input
                  className={styles.input}
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => updateForm('email', e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Phone Number
                  <span className={styles.labelOptional}>(optional)</span>
                </label>
                <input
                  className={styles.input}
                  type="tel"
                  placeholder="e.g. 09XXXXXXXX"
                  value={form.phone}
                  onChange={e => updateForm('phone', e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Note
                  <span className={styles.labelOptional}>(optional)</span>
                </label>
                <textarea
                  className={styles.textarea}
                  placeholder="Any special instructions..."
                  value={form.note}
                  onChange={e => updateForm('note', e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className={styles.paymentLabel}>Payment Method</label>
                <div className={styles.paymentGrid}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('shamcash')}
                    className={[styles.paymentOption, paymentMethod === 'shamcash' ? styles.paymentOptionActive : ''].filter(Boolean).join(' ')}
                  >
                    <div className={styles.paymentIcon}>💸</div>
                    <div className={styles.paymentName}>ShamCash</div>
                    <div className={styles.paymentHint}>Local Transfer</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={[styles.paymentOption, paymentMethod === 'stripe' ? styles.paymentOptionActive : ''].filter(Boolean).join(' ')}
                  >
                    <div className={styles.paymentIcon}>💳</div>
                    <div className={styles.paymentName}>Credit Card</div>
                    <div className={styles.paymentHint}>Powered by Stripe</div>
                  </button>
                </div>
              </div>

              {formError && (
                <div className={styles.errorBox}>{formError}</div>
              )}

              <button type="submit" disabled={submitting} className={styles.submitBtn}>
                {submitting
                  ? <><span className={styles.spinner} />Processing…</>
                  : paymentMethod === 'stripe'
                    ? 'Proceed to Stripe Checkout →'
                    : 'Continue to Payment Info →'}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: ShamCash payment instructions ── */}
        {step === 2 && orderData && (
          verifyStatus === 'expired' ? (
            <div className={styles.expiredCard}>
              <div className={styles.expiredIcon}>⏱️</div>
              <h2 className={styles.expiredTitle}>Order Expired</h2>
              <p className={styles.expiredText}>
                The payment window has closed. Please start a new order.
              </p>
              <button onClick={() => router.push('/en/cart')} className={styles.backBtn}>
                Back to Cart
              </button>
            </div>
          ) : (
            <div className={styles.paymentStack}>
              <div className={styles.card}>
                <div className={styles.paymentCardHeader}>
                  <div>
                    <h2 className={styles.paymentCardTitle}>Send Payment via ShamCash</h2>
                    <p className={styles.expiryLine}>
                      Transfer expires in: <CountdownTimer expiresAt={orderData.expiresAt} />
                    </p>
                  </div>
                  <div className={styles.orderRefBadge}>
                    <span className={styles.orderRefLabel}>Order</span>
                    <span className={styles.orderRefCode}>{orderData.referenceCode}</span>
                  </div>
                </div>

                <div className={styles.instructionList}>
                  {[
                    { num: '1', content: <span className={styles.instructionText}>Open your ShamCash app</span> },
                    {
                      num: '2', content: (
                        <p className={styles.instructionText}>
                          Send exactly <strong className={styles.instructionAccent}>{fmt(orderData.totalAmount)}</strong> to account:
                        </p>
                      )
                    },
                    {
                      num: '3', content: (
                        <p className={styles.instructionText}>
                          Write the reference code in the notes:{' '}
                          <strong className={styles.instructionMono}>{orderData.referenceCode}</strong>
                        </p>
                      )
                    },
                    {
                      num: '4', content: (
                        <p className={styles.instructionText}>
                          Your order will be confirmed automatically after payment is detected
                        </p>
                      )
                    },
                  ].map(({ num, content }) => (
                    <div key={num} className={styles.instructionRow}>
                      <div className={styles.instructionNum}>{num}</div>
                      {content}
                    </div>
                  ))}
                </div>

                <div className={styles.accountBox}>
                  <span className={styles.accountBoxLabel}>ShamCash Account</span>
                  <span className={styles.accountBoxNumber}>
                    {process.env.NEXT_PUBLIC_SHAMCASH_DISPLAY_NUMBER || orderData.paymentDisplayNumber || '—'}
                  </span>
                </div>
              </div>

              <button onClick={checkPayment} className={styles.checkBtn}>
                ↻ I&apos;ve sent the payment — check now
              </button>

              <p className={styles.pollNote}>
                We check automatically every 30 seconds · Order ID: {orderData.orderId.slice(0, 16)}…
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
