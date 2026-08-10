'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paymentIntentId: string | null;
  createdAt: string;
  user: { name: string | null; email: string | null } | null;
  items: { quantity: number; priceAtPurchase: number; productSync: { sanityId: string } }[];
  // Shipping snapshot — null on orders placed before addresses were captured.
  shippingFullName: string | null;
  shippingPhone: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingCountry: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#CFA18D', CONFIRMED: '#60a5fa', PREPARING: '#a78bfa',
  READY_FOR_SHIPPING: '#22d3ee', SHIPPED: '#fbbf24',
  DELIVERED: '#34d399', CANCELLED: '#f87171',
  FAILED_PAYMENT: '#f87171', REFUNDED: '#94a3b8',
};

/**
 * Mirrors VALID_TRANSITIONS in lib/repositories/order.repository.ts.
 * Only used to decide which buttons to offer — the server revalidates every
 * transition, so this is a convenience, not the enforcement point.
 */
const NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'FAILED_PAYMENT'],
  CONFIRMED: ['PREPARING', 'CANCELLED', 'REFUNDED'],
  PREPARING: ['READY_FOR_SHIPPING', 'CANCELLED', 'REFUNDED'],
  READY_FOR_SHIPPING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  FAILED_PAYMENT: [],
  REFUNDED: [],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/orders').then(r => r.json()).then(d => setOrders(d.orders)).finally(() => setLoading(false));
  }, []);

  /** Applies a status change or manual payment confirmation, then patches local state. */
  const mutateOrder = async (
    orderId: string,
    body: { status?: string; markPaid?: boolean }
  ) => {
    setUpdating(orderId);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? 'Update failed');
        return;
      }
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, ...data.order } : o)));
    } catch {
      setActionError('Network error — please try again.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div style={{ padding: '40px 48px' }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FAF7F5', margin: 0, letterSpacing: '-0.02em' }}>Orders</h1>
        <p style={{ color: 'rgba(250,247,245,0.45)', marginTop: 6, fontSize: '0.9rem' }}>
          {orders.length} total orders · ${orders.reduce((s, o) => s + o.totalAmount, 0).toFixed(2)} revenue
        </p>
      </div>

      {orders.length === 0 && !loading ? (
        <div style={{ background: 'linear-gradient(135deg, #1E1816, #1A1412)', border: '1px solid rgba(207,161,141,0.1)', borderRadius: 20, padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>◉</div>
          <div style={{ color: '#FAF7F5', fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>No orders yet</div>
          <div style={{ color: 'rgba(250,247,245,0.4)', fontSize: '0.9rem' }}>Orders will appear here once customers complete checkout (Phase 4)</div>
        </div>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #1E1816, #1A1412)', border: '1px solid rgba(207,161,141,0.1)', borderRadius: 20, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(207,161,141,0.08)' }}>
                {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(250,247,245,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '20px 24px' }}><div style={{ height: 20, background: 'rgba(207,161,141,0.06)', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} /></td></tr>
                ))
              ) : orders.map((o, i) => (
                <>
                  <tr key={o.id}
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    style={{ borderBottom: i < orders.length - 1 ? '1px solid rgba(207,161,141,0.05)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(207,161,141,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(250,247,245,0.5)' }}>#{o.id.slice(0, 12)}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ color: '#FAF7F5', fontWeight: 500, fontSize: '0.9rem' }}>{o.user?.name ?? 'Guest'}</div>
                      <div style={{ color: 'rgba(250,247,245,0.4)', fontSize: '0.8rem' }}>{o.user?.email ?? '—'}</div>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'rgba(250,247,245,0.6)', fontSize: '0.88rem' }}>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                    <td style={{ padding: '16px 24px', color: '#FAF7F5', fontWeight: 700, fontSize: '0.95rem' }}>${o.totalAmount.toFixed(2)}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: `${STATUS_COLOR[o.status]}18`, color: STATUS_COLOR[o.status], border: `1px solid ${STATUS_COLOR[o.status]}30` }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'rgba(250,247,245,0.4)', fontSize: '0.85rem' }}>
                      {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr key={`${o.id}-expanded`}>
                      <td colSpan={6} style={{ padding: '0 24px 16px', background: 'rgba(207,161,141,0.03)' }}>
                        <div style={{ borderTop: '1px solid rgba(207,161,141,0.08)', paddingTop: 16 }}>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(250,247,245,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Order Items</div>
                          {o.items.map((item, j) => (
                            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(250,247,245,0.7)', fontSize: '0.85rem', padding: '6px 0', borderBottom: j < o.items.length - 1 ? '1px solid rgba(207,161,141,0.06)' : 'none' }}>
                              <span>{item.productSync.sanityId} × {item.quantity}</span>
                              <span style={{ color: '#CFA18D', fontWeight: 600 }}>${(item.priceAtPurchase * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          {/* Shipping destination — required to fulfil the order */}
                          <div style={{ fontSize: '0.75rem', color: 'rgba(250,247,245,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '18px 0 10px' }}>Ship To</div>
                          {o.shippingAddressLine1 ? (
                            <div style={{ color: 'rgba(250,247,245,0.7)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                              <div style={{ color: '#FAF7F5', fontWeight: 600 }}>{o.shippingFullName}</div>
                              <div>{o.shippingPhone}</div>
                              <div>{o.shippingAddressLine1}</div>
                              {o.shippingAddressLine2 && <div>{o.shippingAddressLine2}</div>}
                              <div>{[o.shippingCity, o.shippingCountry].filter(Boolean).join(', ')}</div>
                            </div>
                          ) : (
                            <div style={{ color: 'rgba(250,247,245,0.35)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                              No address on file — placed before shipping addresses were collected.
                            </div>
                          )}
                          {o.paymentIntentId && (
                            <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'rgba(250,247,245,0.3)', fontFamily: 'monospace' }}>
                              Payment: {o.paymentIntentId}
                            </div>
                          )}

                          {/* ── Fulfilment actions ── */}
                          <div style={{ fontSize: '0.75rem', color: 'rgba(250,247,245,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '18px 0 10px' }}>Actions</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {o.paymentStatus !== 'PAID' && (
                              <button
                                onClick={() => mutateOrder(o.id, { markPaid: true })}
                                disabled={updating === o.id}
                                title="Confirm a ShamCash transfer that automatic verification did not match. Deducts stock."
                                style={{
                                  padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                                  background: 'rgba(52,211,153,0.12)', color: '#34d399',
                                  border: '1px solid rgba(52,211,153,0.35)',
                                  cursor: updating === o.id ? 'not-allowed' : 'pointer',
                                  opacity: updating === o.id ? 0.5 : 1,
                                }}
                              >
                                Mark as Paid
                              </button>
                            )}

                            {(NEXT_STATUSES[o.status] ?? []).map(next => (
                              <button
                                key={next}
                                onClick={() => mutateOrder(o.id, { status: next })}
                                disabled={updating === o.id}
                                style={{
                                  padding: '7px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                                  background: 'rgba(207,161,141,0.1)',
                                  color: STATUS_COLOR[next] ?? '#FAF7F5',
                                  border: `1px solid ${STATUS_COLOR[next] ?? 'rgba(207,161,141,0.3)'}40`,
                                  cursor: updating === o.id ? 'not-allowed' : 'pointer',
                                  opacity: updating === o.id ? 0.5 : 1,
                                }}
                              >
                                → {next.replace(/_/g, ' ')}
                              </button>
                            ))}

                            {(NEXT_STATUSES[o.status] ?? []).length === 0 && o.paymentStatus === 'PAID' && (
                              <span style={{ color: 'rgba(250,247,245,0.35)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                                Final state — no further transitions.
                              </span>
                            )}
                          </div>

                          {actionError && updating === null && (
                            <div style={{ marginTop: 10, color: '#f87171', fontSize: '0.8rem' }}>{actionError}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
