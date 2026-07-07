'use client';

import { useCartStore } from '@/lib/stores/cart.store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const currency = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

function formatPrice(amount: number) {
  return `${amount.toLocaleString()} ${currency}`;
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, totalItems } = useCartStore();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F0D0C', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body, Inter, sans-serif)', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 24 }}>🛒</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FAF7F5', margin: '0 0 12px' }}>Your cart is empty</h1>
          <p style={{ color: 'rgba(250,247,245,0.45)', marginBottom: 32, fontSize: '0.95rem' }}>Add some beautiful products to get started</p>
          <Link href="/" style={{ display: 'inline-block', padding: '14px 32px', background: 'linear-gradient(135deg, #CFA18D, #E3B8A7)', borderRadius: 12, color: '#3A2E2A', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
            Browse Collections ←
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0F0D0C 0%, #140F0E 100%)', fontFamily: 'var(--font-body, Inter, sans-serif)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FAF7F5', margin: 0, letterSpacing: '-0.02em' }}>Your Cart</h1>
            <p style={{ color: 'rgba(250,247,245,0.4)', marginTop: 6, fontSize: '0.875rem' }}>{totalItems()} item{totalItems() !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/" style={{ fontSize: '0.85rem', color: '#CFA18D', textDecoration: 'none' }}>← Continue Shopping</Link>
        </div>

        {/* Item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {items.map((item) => (
            <div key={item.productSyncId} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, #1E1816, #1A1412)', border: '1px solid rgba(207,161,141,0.1)', borderRadius: 16, padding: '16px 20px' }}>
              {/* Product info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#FAF7F5', fontSize: '0.9rem', marginBottom: 4 }}>
                  {item.name || item.sanityId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(250,247,245,0.4)', fontFamily: 'monospace' }}>{item.sanityId}</div>
              </div>

              {/* Quantity controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(207,161,141,0.08)', border: '1px solid rgba(207,161,141,0.15)', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => updateQuantity(item.productSyncId, item.quantity - 1)}
                  style={{ width: 36, height: 36, background: 'none', border: 'none', color: '#CFA18D', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ width: 32, textAlign: 'center', color: '#FAF7F5', fontSize: '0.9rem', fontWeight: 600 }}>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productSyncId, item.quantity + 1)}
                  style={{ width: 36, height: 36, background: 'none', border: 'none', color: '#CFA18D', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>

              {/* Price */}
              <div style={{ minWidth: 100, textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#CFA18D', fontSize: '0.95rem' }}>{formatPrice(item.price * item.quantity)}</div>
                {item.quantity > 1 && <div style={{ fontSize: '0.75rem', color: 'rgba(250,247,245,0.35)' }}>{formatPrice(item.price)} each</div>}
              </div>

              {/* Remove */}
              <button onClick={() => removeItem(item.productSyncId)}
                style={{ width: 32, height: 32, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Remove item">✕</button>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div style={{ background: 'linear-gradient(135deg, #1E1816, #1A1412)', border: '1px solid rgba(207,161,141,0.15)', borderRadius: 20, padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(207,161,141,0.08)' }}>
            <span style={{ color: 'rgba(250,247,245,0.6)', fontSize: '0.9rem' }}>Subtotal ({totalItems()} items)</span>
            <span style={{ color: '#FAF7F5', fontWeight: 700, fontSize: '1.1rem' }}>{formatPrice(subtotal())}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(250,247,245,0.35)', marginBottom: 20, lineHeight: 1.6 }}>
            Payment via ShamCash transfer. You will receive the account details on the next step.
          </p>
          <button
            onClick={() => router.push('/en/checkout')}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #CFA18D, #E3B8A7)', border: 'none', borderRadius: 12, color: '#3A2E2A', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', letterSpacing: '-0.01em', transition: 'opacity 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Proceed to Checkout →
          </button>
        </div>
      </div>
    </div>
  );
}
