'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CustomRequestStatus } from '@prisma/client';

interface CustomRequest {
  id: string;
  title: string;
  status: CustomRequestStatus;
  quotePrice: number | null;
  currency: string | null;
  createdAt: string;
  orderId: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBMITTED:     { label: 'Submitted', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  QUOTED:        { label: 'Quoted',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  PAID:          { label: 'Paid',      color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  IN_PRODUCTION: { label: 'In Production', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  SHIPPED:       { label: 'Shipped',   color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  CANCELLED:     { label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

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

export default function CustomOrdersPage() {
  const params = useParams();
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/custom-requests/user')
      .then(r => r.json())
      .then(d => { setRequests(d.requests ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handlePay = async (id: string) => {
    try {
      setPayingId(id);
      const res = await fetch('/api/checkout/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customRequestId: id, paymentMethod: 'stripe' }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initiate payment');
        setPayingId(null);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while paying.');
      setPayingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.6rem)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          My Custom Orders
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 6 }}>
          {requests.length} request{requests.length !== 1 ? 's' : ''} submitted
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 110, borderRadius: 16, background: 'rgba(207,161,141,0.04)', animation: 'pulse 1.5s ease infinite' }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      ) : requests.length === 0 ? (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid rgba(207,161,141,0.15)',
          boxShadow: 'var(--shadow-soft)',
          borderRadius: 16, padding: '48px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎨</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.05rem', marginBottom: 6 }}>
            No custom requests yet
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Submit a request to have our artisans create a unique piece for you.
          </div>
          <Link href="/en#custom-orders" style={{
            display: 'inline-block', marginTop: 20, padding: '10px 24px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            borderRadius: 10, color: 'var(--white)', fontWeight: 700,
            textDecoration: 'none', fontSize: '0.875rem',
          }}>Request Custom Order</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(req => (
            <div
              key={req.id}
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--card-bg)',
                border: '1px solid rgba(207,161,141,0.15)',
                borderRadius: 16, padding: '18px 20px',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {req.title || `Request #${req.id.slice(0, 8)}`}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {new Date(req.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {req.quotePrice ? (
                    <div style={{ fontWeight: 700, color: '#CFA18D', fontSize: '1.1rem' }}>
                      {req.quotePrice.toLocaleString()} {req.currency || 'SYP'}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Pending Quote
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                {req.status === 'QUOTED' && req.quotePrice && (
                  <button 
                    onClick={() => handlePay(req.id)}
                    disabled={payingId === req.id}
                    style={{
                      padding: '8px 24px',
                      background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: payingId === req.id ? 'not-allowed' : 'pointer',
                      opacity: payingId === req.id ? 0.7 : 1,
                    }}
                  >
                    {payingId === req.id ? 'Processing...' : 'Pay Now'}
                  </button>
                )}
                
                {req.orderId ? (
                  <Link 
                    href={`/${params?.locale || 'en'}/account/orders/${req.orderId}`}
                    style={{
                      padding: '8px 24px',
                      background: 'rgba(207,161,141,0.1)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(207,161,141,0.2)',
                      borderRadius: '8px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                    }}
                  >
                    View Order
                  </Link>
                ) : (
                  <Link 
                    href={`/${params?.locale || 'en'}/account/custom-orders/${req.id}`}
                    style={{
                      padding: '8px 24px',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      border: '1px solid rgba(207,161,141,0.2)',
                      borderRadius: '8px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    View Details
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
