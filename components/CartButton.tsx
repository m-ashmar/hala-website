'use client';

import { useCartStore } from '@/lib/stores/cart.store';
import { useRouter } from 'next/navigation';

/**
 * CartButton — shows cart item count badge in the navbar.
 * Renders nothing until hydrated (avoids SSR mismatch with localStorage).
 */
export default function CartButton() {
  const router = useRouter();
  const totalItems = useCartStore(s => s.totalItems());

  return (
    <button
      id="cart-nav-btn"
      onClick={() => router.push('/en/cart')}
      title={`Cart (${totalItems} items)`}
      style={{
        position: 'relative', background: 'none', border: 'none',
        cursor: 'pointer', padding: '8px 10px', borderRadius: 10,
        color: 'var(--text-primary, #FAF7F5)',
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(207,161,141,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {/* Cart icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      {/* Badge */}
      {totalItems > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          minWidth: 18, height: 18, borderRadius: '50%',
          background: 'linear-gradient(135deg, #CFA18D, #E3B8A7)',
          color: '#3A2E2A', fontSize: '0.65rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', lineHeight: 1,
        }}>
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  );
}
