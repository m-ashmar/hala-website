'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/stores/cart.store';

interface OrderDetail {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  customerName: string | null;
  customerEmail: string | null;
  referenceCode: string | null;
  paidAt: string | null;
  items: { quantity: number; priceAtPurchase: number; productSync: { sanityId: string } }[];
}

function fmt(n: number, currency: string) {
  return `${n.toLocaleString()} ${currency}`;
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }
    
    // Clear cart immediately upon landing on the success page
    clearCart();
    fetch(`/api/checkout/verify/${orderId}`)
      .then(r => r.json())
      .then(d => {
        // The verify endpoint returns minimal data; fetch full order from admin endpoint
        // For now use the verification response directly
        setOrder(d);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0F0D0C 0%, #140F0E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body, Inter, sans-serif)', padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%' }}>

        {loading ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '3px solid rgba(207,161,141,0.2)', borderTopColor: '#CFA18D', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ color: 'rgba(250,247,245,0.4)' }}>Loading your order…</p>
          </div>
        ) : !orderId ? (
          // No order ID — generic success (shouldn't normally happen)
          <div style={{ textAlign: 'center', background: 'linear-gradient(135deg, #1E1816, #1A1412)', border: '1px solid rgba(207,161,141,0.12)', borderRadius: 24, padding: 48 }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>✅</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FAF7F5', margin: '0 0 12px' }}>Order Placed!</h1>
            <p style={{ color: 'rgba(250,247,245,0.5)', marginBottom: 28 }}>Your order has been received. We'll reach out shortly to confirm.</p>
            <Link href="/" style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg, #CFA18D, #E3B8A7)', borderRadius: 10, color: '#3A2E2A', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>Back to Home</Link>
          </div>
        ) : (
          <div style={{ background: 'linear-gradient(135deg, #1E1816, #1A1412)', border: '1px solid rgba(207,161,141,0.12)', borderRadius: 24, padding: '40px 36px' }}>
            {/* Success header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '2px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px' }}>✓</div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FAF7F5', margin: '0 0 8px', letterSpacing: '-0.01em' }}>Payment Confirmed!</h1>
              <p style={{ color: 'rgba(250,247,245,0.45)', fontSize: '0.875rem' }}>Your order is now being processed</p>
            </div>

            {/* Order details */}
            <div style={{ borderTop: '1px solid rgba(207,161,141,0.08)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Order reference */}
              {order?.referenceCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(250,247,245,0.4)' }}>Reference Code</span>
                  <span style={{ color: '#CFA18D', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>{order.referenceCode}</span>
                </div>
              )}

              {/* Order ID */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(250,247,245,0.4)' }}>Order ID</span>
                <span style={{ color: 'rgba(250,247,245,0.6)', fontFamily: 'monospace', fontSize: '0.78rem' }}>{orderId?.slice(0, 20)}…</span>
              </div>

              {/* Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(250,247,245,0.4)' }}>Status</span>
                <span style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: '2px 12px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {order?.status ?? 'PROCESSING'}
                </span>
              </div>
            </div>

            {/* What happens next */}
            <div style={{ marginTop: 28, padding: '18px 20px', background: 'rgba(207,161,141,0.06)', border: '1px solid rgba(207,161,141,0.1)', borderRadius: 12 }}>
              <p style={{ fontSize: '0.78rem', color: 'rgba(250,247,245,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>What happens next</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['We verify your ShamCash transfer', 'Our team prepares your order', 'You receive a confirmation email', 'Order is shipped to your address'].map((step, i) => (
                  <div key={step} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(207,161,141,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#CFA18D', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: '0.85rem', color: 'rgba(250,247,245,0.6)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: 28, padding: '13px', background: 'linear-gradient(135deg, #CFA18D, #E3B8A7)', borderRadius: 12, color: '#3A2E2A', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
              Continue Shopping ←
            </Link>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
