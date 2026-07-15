'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'SYP';

interface Order {
  id: string;
  referenceCode: string | null;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: { id: string; snapshotTitle: string | null; quantity: number; priceAtPurchase: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:             { label: 'Pending',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  CONFIRMED:           { label: 'Confirmed',     color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  PREPARING:           { label: 'Preparing',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  READY_FOR_SHIPPING:  { label: 'Ready',         color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  SHIPPED:             { label: 'Shipped',       color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  DELIVERED:           { label: 'Delivered',     color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  CANCELLED:           { label: 'Cancelled',     color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  FAILED_PAYMENT:      { label: 'Payment Failed',color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  REFUNDED:            { label: 'Refunded',      color: '#CFA18D', bg: 'rgba(207,161,141,0.1)' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#CFA18D', bg: 'rgba(207,161,141,0.1)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}30`,
      borderRadius: 20, padding: '3px 10px',
      fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid rgba(207,161,141,0.15)',
      borderRadius: 16, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: 'var(--shadow-soft)'
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'rgba(207,161,141,0.1)',
        border: '1px solid rgba(207,161,141,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.2rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export default function AccountOverviewPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalSpent = orders
    .filter(o => ['CONFIRMED', 'PREPARING', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'].includes(o.status))
    .reduce((s, o) => s + o.totalAmount, 0);

  const recentOrders = orders.slice(0, 3);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 6 }}>
          Here's an overview of your account activity.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard icon="◉" label="Total Orders" value={loading ? '…' : orders.length} />
        <StatCard icon="✓" label="Delivered" value={loading ? '…' : orders.filter(o => o.status === 'DELIVERED').length} />
        <StatCard icon="💰" label="Total Spent" value={loading ? '…' : `${totalSpent.toLocaleString()} ${CURRENCY}`} />
      </div>

      {/* Recent orders */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recent Orders</h2>
          <Link href="/en/account/orders" style={{ fontSize: '0.8rem', color: '#CFA18D', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 70, borderRadius: 14, background: 'rgba(207,161,141,0.04)', animation: 'pulse 1.5s ease infinite' }} />
            ))}
            <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
          </div>
        ) : recentOrders.length === 0 ? (
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(207,161,141,0.15)',
            boxShadow: 'var(--shadow-soft)',
            borderRadius: 16, padding: '32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🛍️</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>No orders yet</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Start shopping to see your orders here.</div>
            <Link href="/" style={{
              display: 'inline-block', marginTop: 16, padding: '10px 20px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
              borderRadius: 10, color: 'var(--white)', fontWeight: 700,
              textDecoration: 'none', fontSize: '0.875rem',
            }}>Shop Now</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentOrders.map(order => (
              <Link key={order.id} href={`/en/account/orders/${order.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--card-bg)',
                border: '1px solid rgba(207,161,141,0.15)',
                boxShadow: 'var(--shadow-soft)',
                borderRadius: 14, padding: '14px 16px', textDecoration: 'none',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(207,161,141,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(207,161,141,0.15)')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {order.referenceCode ?? order.id.slice(0, 12) + '…'}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: '#CFA18D', fontSize: '0.9rem' }}>
                    {order.totalAmount.toLocaleString()} {order.currency}
                  </div>
                </div>
                <span style={{ color: 'rgba(207,161,141,0.4)', fontSize: '0.9rem' }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { href: '/en/account/addresses', icon: '◎', label: 'Manage Addresses' },
          { href: '/en/account/settings',  icon: '⚙', label: 'Account Settings' },
          { href: '/',                      icon: '🛍️', label: 'Continue Shopping' },
        ].map(({ href, icon, label }) => (
          <Link key={href} href={href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 8, padding: '20px 12px',
            background: 'var(--card-bg)',
            border: '1px solid rgba(207,161,141,0.15)',
            boxShadow: 'var(--shadow-soft)',
            borderRadius: 14, textDecoration: 'none',
            color: 'var(--text-secondary)', fontSize: '0.8rem',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(207,161,141,0.08)';
            (e.currentTarget as HTMLElement).style.color = '#CFA18D';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--card-bg)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }}
          >
            <span style={{ fontSize: '1.3rem' }}>{icon}</span>
            <span style={{ textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
