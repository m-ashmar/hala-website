'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

interface OrderItem {
  id: string;
  snapshotTitle: string | null;
  snapshotImageUrl: string | null;
  quantity: number;
  priceAtPurchase: number;
  customization: Record<string, string> | null;
  productSync: { sanityId: string };
}

interface OrderDetail {
  id: string;
  referenceCode: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  discountAmount: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNote: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  items: OrderItem[];
  coupon: { code: string; discountType: string; discountValue: number } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; step: number }> = {
  PENDING:            { label: 'Pending Payment', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   icon: '⏳', step: 0 },
  CONFIRMED:          { label: 'Confirmed',        color: '#34d399', bg: 'rgba(52,211,153,0.12)',   icon: '✓',  step: 1 },
  PREPARING:          { label: 'Preparing',        color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   icon: '🎁', step: 2 },
  READY_FOR_SHIPPING: { label: 'Ready to Ship',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: '📦', step: 3 },
  SHIPPED:            { label: 'Shipped',          color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',   icon: '🚚', step: 4 },
  DELIVERED:          { label: 'Delivered',        color: '#4ade80', bg: 'rgba(74,222,128,0.12)',   icon: '🎉', step: 5 },
  CANCELLED:          { label: 'Cancelled',        color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '✕',  step: -1 },
  FAILED_PAYMENT:     { label: 'Payment Failed',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '✕',  step: -1 },
  REFUNDED:           { label: 'Refunded',         color: '#CFA18D', bg: 'rgba(207,161,141,0.12)', icon: '↩',  step: -1 },
};

const STEPS = [
  { key: 'CONFIRMED',         label: 'Confirmed' },
  { key: 'PREPARING',         label: 'Preparing' },
  { key: 'READY_FOR_SHIPPING',label: 'Ready' },
  { key: 'SHIPPED',           label: 'Shipped' },
  { key: 'DELIVERED',         label: 'Delivered' },
];

function OrderProgressBar({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg || cfg.step < 0) return null;
  const currentStep = cfg.step;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {STEPS.map((step, i) => {
          const done = currentStep > i;
          const active = currentStep === i + 1;
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: done || active ? 'linear-gradient(135deg, #CFA18D, #E3B8A7)' : 'rgba(207,161,141,0.08)',
                  border: done || active ? 'none' : '2px solid rgba(207,161,141,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: done || active ? '#3A2E2A' : 'rgba(250,247,245,0.2)',
                  fontSize: '0.7rem', fontWeight: 800, transition: 'all 0.3s',
                  boxShadow: active ? '0 0 0 4px rgba(207,161,141,0.15)' : 'none',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '0.65rem', whiteSpace: 'nowrap',
                  color: done || active ? '#CFA18D' : 'var(--text-secondary)',
                  fontWeight: done || active ? 600 : 400,
                }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 4px', marginBottom: 22,
                  background: done ? 'linear-gradient(90deg, #CFA18D, rgba(207,161,141,0.3))' : 'rgba(207,161,141,0.1)',
                  transition: 'background 0.4s',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid rgba(207,161,141,0.15)',
      boxShadow: 'var(--shadow-soft)',
      borderRadius: 18, padding: '20px 22px', marginBottom: 16,
    }}>
      <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 14px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Order not found');
        return r.json();
      })
      .then(d => { setOrder(d.order); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ height: 80, borderRadius: 14, background: 'rgba(207,161,141,0.04)', animation: 'pulse 1.5s ease infinite' }} />)}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>Order not found</div>
        <Link href="/en/account/orders" style={{ color: '#CFA18D', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to orders</Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: '#CFA18D', bg: 'rgba(207,161,141,0.12)', icon: '◉' };
  const subtotal = order.totalAmount + (order.discountAmount ?? 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/en/account/orders" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.8rem' }}>
          ← Back to orders
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'monospace' }}>
              {order.referenceCode ?? `#${order.id.slice(0, 12).toUpperCase()}`}
            </h1>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.color}30`, borderRadius: 24,
            padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600,
          }}>
            <span>{cfg.icon}</span> {cfg.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <OrderProgressBar status={order.status} />

      {/* Items */}
      <SectionCard title="Items Ordered">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {order.items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '12px', background: 'rgba(207,161,141,0.04)',
              borderRadius: 10, border: '1px solid rgba(207,161,141,0.06)',
            }}>
              {/* Thumbnail */}
              {item.snapshotImageUrl ? (
                <img
                  src={item.snapshotImageUrl}
                  alt={item.snapshotTitle ?? ''}
                  style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 8, background: 'rgba(207,161,141,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  🧣
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {item.snapshotTitle ?? item.productSync.sanityId}
                </div>
                {item.customization && Object.keys(item.customization).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                    {Object.entries(item.customization).map(([k, v]) => (
                      <span key={k} style={{
                        background: 'rgba(207,161,141,0.1)', border: '1px solid rgba(207,161,141,0.2)',
                        borderRadius: 5, padding: '2px 7px', fontSize: '0.68rem', color: '#CFA18D',
                      }}>
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 5 }}>
                  Qty: {item.quantity}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: '#CFA18D', fontSize: '0.9rem' }}>
                  {(item.priceAtPurchase * item.quantity).toLocaleString()} {order.currency}
                </div>
                {item.quantity > 1 && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {item.priceAtPurchase.toLocaleString()} each
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Price summary */}
        <div style={{ borderTop: '1px solid rgba(207,161,141,0.08)', marginTop: 14, paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
            <span>Subtotal</span>
            <span>{subtotal.toLocaleString()} {order.currency}</span>
          </div>
          {(order.discountAmount ?? 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4ade80', marginBottom: 6 }}>
              <span>Discount {order.coupon && `(${order.coupon.code})`}</span>
              <span>−{order.discountAmount.toLocaleString()} {order.currency}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <span>Total</span>
            <span style={{ color: '#CFA18D' }}>{order.totalAmount.toLocaleString()} {order.currency}</span>
          </div>
        </div>
      </SectionCard>

      {/* Customer info */}
      <SectionCard title="Customer Information">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Name', value: order.customerName },
            { label: 'Email', value: order.customerEmail },
            { label: 'Phone', value: order.customerPhone },
            { label: 'Note', value: order.customerNote },
          ].filter(f => f.value).map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Payment info */}
      <SectionCard title="Payment">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>Reference</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{order.referenceCode ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>Status</div>
            <div style={{ fontSize: '0.875rem', color: order.paymentStatus === 'PAID' ? '#4ade80' : '#f59e0b' }}>{order.paymentStatus}</div>
          </div>
          {order.paidAt && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 3 }}>Paid At</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{new Date(order.paidAt).toLocaleString()}</div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
