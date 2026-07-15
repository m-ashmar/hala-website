'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

interface OrderItem {
  id: string;
  snapshotTitle: string | null;
  snapshotImageUrl: string | null;
  quantity: number;
  priceAtPurchase: number;
}

interface Order {
  id: string;
  referenceCode: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; step: number }> = {
  PENDING:             { label: 'Pending Payment', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   step: 0 },
  CONFIRMED:           { label: 'Confirmed',        color: '#34d399', bg: 'rgba(52,211,153,0.1)',  step: 1 },
  PREPARING:           { label: 'Preparing',        color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  step: 2 },
  READY_FOR_SHIPPING:  { label: 'Ready to Ship',    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', step: 3 },
  SHIPPED:             { label: 'Shipped',          color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  step: 4 },
  DELIVERED:           { label: 'Delivered',        color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  step: 5 },
  CANCELLED:           { label: 'Cancelled',        color: '#f87171', bg: 'rgba(248,113,113,0.1)', step: -1 },
  FAILED_PAYMENT:      { label: 'Payment Failed',   color: '#f87171', bg: 'rgba(248,113,113,0.1)', step: -1 },
  REFUNDED:            { label: 'Refunded',         color: '#CFA18D', bg: 'rgba(207,161,141,0.1)', step: -1 },
};

const PROGRESS_STEPS = ['Confirmed', 'Preparing', 'Ready to Ship', 'Shipped', 'Delivered'];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#CFA18D', bg: 'rgba(207,161,141,0.1)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}30`, borderRadius: 20,
      padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_SHIPPING', 'SHIPPED'].includes(o.status);
    if (filter === 'delivered') return o.status === 'DELIVERED';
    if (filter === 'cancelled') return ['CANCELLED', 'FAILED_PAYMENT', 'REFUNDED'].includes(o.status);
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.6rem)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          My Orders
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 6 }}>
          {orders.length} order{orders.length !== 1 ? 's' : ''} placed
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['all', 'active', 'delivered', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
              background: filter === f ? 'rgba(207,161,141,0.15)' : 'transparent',
              border: filter === f ? '1px solid rgba(207,161,141,0.3)' : '1px solid rgba(207,161,141,0.1)',
              color: filter === f ? '#CFA18D' : 'var(--text-secondary)',
              fontSize: '0.8rem', fontWeight: filter === f ? 600 : 400,
              transition: 'all 0.18s', textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? `All (${orders.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Order list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 110, borderRadius: 16, background: 'rgba(207,161,141,0.04)', animation: 'pulse 1.5s ease infinite' }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid rgba(207,161,141,0.15)',
          boxShadow: 'var(--shadow-soft)',
          borderRadius: 16, padding: '48px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📦</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.05rem', marginBottom: 6 }}>
            {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {filter === 'all' && 'Place your first order to see it here.'}
          </div>
          {filter === 'all' && (
            <Link href="/" style={{
              display: 'inline-block', marginTop: 20, padding: '10px 24px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              borderRadius: 10, color: 'var(--white)', fontWeight: 700,
              textDecoration: 'none', fontSize: '0.875rem',
            }}>Shop Now</Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(order => (
            <Link
              key={order.id}
              href={`/en/account/orders/${order.id}`}
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--card-bg)',
                border: '1px solid rgba(207,161,141,0.15)',
                borderRadius: 16, padding: '18px 20px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(207,161,141,0.3)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-soft)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(207,161,141,0.15)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {order.referenceCode ?? `#${order.id.slice(0, 8).toUpperCase()}`}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#CFA18D', fontSize: '1rem' }}>
                    {order.totalAmount.toLocaleString()} {order.currency}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Item preview thumbnails */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {order.items.slice(0, 4).map((item, i) => (
                  <div key={item.id} style={{
                    fontSize: '0.75rem', color: 'var(--text-secondary)',
                    background: 'rgba(207,161,141,0.06)',
                    border: '1px solid rgba(207,161,141,0.08)',
                    borderRadius: 6, padding: '3px 8px',
                    maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    ×{item.quantity} {item.snapshotTitle ?? 'Item'}
                    {i === 3 && order.items.length > 4 && <span style={{ color: '#CFA18D' }}> +{order.items.length - 4} more</span>}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <span style={{ fontSize: '0.8rem', color: '#CFA18D' }}>View details →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
