'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '@/lib/stores/cart.store';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CheckoutOrderResponse } from '@/types/cart';

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';
const POLL_INTERVAL_MS = 30_000; // check every 30 seconds

function fmt(n: number) {
  return `${n.toLocaleString()} ${CURRENCY}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = ['Customer Info', 'Payment Instructions'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {steps.map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const done = step > num;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', background: done ? 'linear-gradient(135deg, #CFA18D, #E3B8A7)' : active ? 'rgba(207,161,141,0.2)' : 'rgba(207,161,141,0.06)', border: active ? '2px solid #CFA18D' : done ? 'none' : '2px solid rgba(207,161,141,0.15)', color: done ? '#3A2E2A' : active ? '#CFA18D' : 'rgba(250,247,245,0.3)', transition: 'all 0.3s' }}>
                {done ? '✓' : num}
              </div>
              <span style={{ fontSize: '0.7rem', color: active ? '#CFA18D' : 'rgba(250,247,245,0.35)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'linear-gradient(90deg, #CFA18D, rgba(207,161,141,0.3))' : 'rgba(207,161,141,0.1)', margin: '0 8px', marginBottom: 22, transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
    <span style={{ color: isLow ? '#f87171' : '#34d399', fontWeight: 700, fontFamily: 'monospace', fontSize: '1.1rem' }}>
      {remaining}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponId = searchParams?.get('couponId') ?? undefined;
  const { items, subtotal, totalItems, clearCart } = useCartStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderData, setOrderData] = useState<CheckoutOrderResponse | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const [formError, setFormError] = useState('');

  // Customer info form state
  const [form, setForm] = useState({ name: '', email: '', phone: '', note: '' });
  const [paymentMethod, setPaymentMethod] = useState<'shamcash' | 'stripe'>('shamcash');

  const updateForm = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Redirect away if cart is empty on mount
  useEffect(() => {
    if (items.length === 0 && step === 1) router.replace('/en/cart');
  }, [items.length, step, router]);

  // ── Step 1 submit: create order ───────────────────────────────────────────
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
            snapshotImageUrl: i.snapshotImageUrl
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

      // If Stripe was selected, redirect to Stripe Checkout
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
      // Silently retry on network errors
    }
  }, [orderData, clearCart, router]);

  useEffect(() => {
    if (step !== 2 || verifyStatus !== 'pending') return;
    const id = setInterval(checkPayment, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [step, verifyStatus, checkPayment]);

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(207,161,141,0.06)', border: '1px solid rgba(207,161,141,0.15)',
    borderRadius: 10, padding: '13px 16px', color: '#FAF7F5', fontSize: '0.9rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: 'rgba(250,247,245,0.45)', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginBottom: 8,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0F0D0C 0%, #140F0E 100%)', fontFamily: 'var(--font-body, Inter, sans-serif)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-heading, serif)', fontSize: '1.5rem', fontWeight: 600, color: '#FAF7F5' }}>Halahello</div>
          <div style={{ fontSize: '0.7rem', color: '#CFA18D', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>Secure Checkout</div>
        </div>

        <StepIndicator step={step} />

        {/* ── STEP 1: Customer information ── */}
        {step === 1 && (
          <div style={{ background: 'linear-gradient(135deg, #1E1816, #1A1412)', border: '1px solid rgba(207,161,141,0.12)', borderRadius: 24, padding: '36px 32px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FAF7F5', margin: '0 0 6px' }}>Your Information</h2>
            <p style={{ color: 'rgba(250,247,245,0.4)', fontSize: '0.85rem', marginBottom: 28 }}>
              Order total: <strong style={{ color: '#CFA18D' }}>{fmt(subtotal())}</strong> · {totalItems()} item{totalItems() !== 1 ? 's' : ''}
            </p>

            <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input style={inputStyle} type="text" required minLength={2} maxLength={100}
                  placeholder="Your full name" value={form.name}
                  onChange={e => updateForm('name', e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input style={inputStyle} type="email" required placeholder="you@example.com"
                  value={form.email} onChange={e => updateForm('email', e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number <span style={{ color: 'rgba(250,247,245,0.3)', fontWeight: 400 }}>(optional)</span></label>
                <input style={inputStyle} type="tel" placeholder="e.g. 09XXXXXXXX"
                  value={form.phone} onChange={e => updateForm('phone', e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
              <div>
                <label style={labelStyle}>Note <span style={{ color: 'rgba(250,247,245,0.3)', fontWeight: 400 }}>(optional)</span></label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Any special instructions..."
                  value={form.note} onChange={e => updateForm('note', e.target.value)}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>

              {/* Payment Method Selector */}
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button type="button" onClick={() => setPaymentMethod('shamcash')} style={{ padding: '16px', background: paymentMethod === 'shamcash' ? 'rgba(207,161,141,0.15)' : 'rgba(207,161,141,0.05)', border: paymentMethod === 'shamcash' ? '2px solid #CFA18D' : '2px solid rgba(207,161,141,0.15)', borderRadius: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>💸</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FAF7F5' }}>ShamCash</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(250,247,245,0.4)', marginTop: 4 }}>Local Transfer</div>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('stripe')} style={{ padding: '16px', background: paymentMethod === 'stripe' ? 'rgba(207,161,141,0.15)' : 'rgba(207,161,141,0.05)', border: paymentMethod === 'stripe' ? '2px solid #CFA18D' : '2px solid rgba(207,161,141,0.15)', borderRadius: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>💳</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FAF7F5' }}>Credit Card</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(250,247,245,0.4)', marginTop: 4 }}>Powered by Stripe</div>
                  </button>
                </div>
              </div>

              {formError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              <button type="submit" disabled={submitting} style={{ padding: '15px', background: submitting ? 'rgba(207,161,141,0.4)' : 'linear-gradient(135deg, #CFA18D, #E3B8A7)', border: 'none', borderRadius: 12, color: '#3A2E2A', fontWeight: 700, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting
                  ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(58,46,42,0.3)', borderTopColor: '#3A2E2A', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Processing…</>
                  : paymentMethod === 'stripe' ? 'Proceed to Stripe Checkout →' : 'Continue to Payment Info →'}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: ShamCash payment instructions ── */}
        {step === 2 && orderData && (
          <div>
            {verifyStatus === 'expired' ? (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: 32, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏱️</div>
                <h2 style={{ color: '#f87171', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 12px' }}>Order Expired</h2>
                <p style={{ color: 'rgba(250,247,245,0.5)', fontSize: '0.9rem', marginBottom: 24 }}>The payment window has closed. Please start a new order.</p>
                <button onClick={() => router.push('/en/cart')} style={{ padding: '12px 28px', background: 'transparent', border: '1px solid rgba(207,161,141,0.3)', borderRadius: 10, color: '#CFA18D', cursor: 'pointer', fontSize: '0.875rem' }}>Back to Cart</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Payment card */}
                <div style={{ background: 'linear-gradient(135deg, #1E1816, #1A1412)', border: '1px solid rgba(207,161,141,0.15)', borderRadius: 24, padding: '28px 28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FAF7F5', margin: '0 0 4px' }}>Send Payment via ShamCash</h2>
                      <p style={{ color: 'rgba(250,247,245,0.4)', fontSize: '0.82rem' }}>Transfer expires in: <CountdownTimer expiresAt={orderData.expiresAt} /></p>
                    </div>
                    <div style={{ background: 'rgba(207,161,141,0.1)', border: '1px solid rgba(207,161,141,0.2)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'rgba(250,247,245,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Order</div>
                      <div style={{ color: '#CFA18D', fontWeight: 700, fontSize: '0.8rem', fontFamily: 'monospace' }}>{orderData.referenceCode}</div>
                    </div>
                  </div>

                  {/* Step-by-step instructions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { num: '1', text: 'Open your ShamCash app' },
                      { num: '2', text: <>Send exactly <strong style={{ color: '#CFA18D' }}>{fmt(orderData.totalAmount)}</strong> to account:</> },
                      { num: '3', text: <>Write the reference code in the notes: <strong style={{ color: '#FAF7F5', fontFamily: 'monospace' }}>{orderData.referenceCode}</strong></> },
                      { num: '4', text: 'Your order will be confirmed automatically after payment is detected' },
                    ].map(({ num, text }) => (
                      <div key={num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(207,161,141,0.15)', border: '1px solid rgba(207,161,141,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CFA18D', fontWeight: 700, fontSize: '0.78rem', flexShrink: 0, marginTop: 1 }}>{num}</div>
                        <p style={{ color: 'rgba(250,247,245,0.75)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Account number highlight */}
                  <div style={{ marginTop: 20, padding: '16px 20px', background: 'rgba(207,161,141,0.08)', border: '1px solid rgba(207,161,141,0.2)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(250,247,245,0.45)' }}>ShamCash Account</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 700, color: '#FAF7F5', letterSpacing: '0.05em' }}>
                      {process.env.NEXT_PUBLIC_SHAMCASH_DISPLAY_NUMBER || orderData.paymentDisplayNumber || '—'}
                    </span>
                  </div>
                </div>

                {/* Manual check button */}
                <button onClick={checkPayment} style={{ width: '100%', padding: '13px', background: 'rgba(207,161,141,0.08)', border: '1px solid rgba(207,161,141,0.2)', borderRadius: 12, color: '#CFA18D', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(207,161,141,0.15)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(207,161,141,0.08)')}
                >
                  ↻ I've sent the payment — check now
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(250,247,245,0.3)' }}>
                  We check automatically every 30 seconds · Order ID: {orderData.orderId.slice(0, 16)}…
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: rgba(250,247,245,0.2); }
      `}</style>
    </div>
  );
}
