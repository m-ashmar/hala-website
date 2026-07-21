'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CustomRequestStatus } from '@prisma/client';
import Image from 'next/image';

interface CustomRequest {
  id: string;
  title: string;
  name: string;
  email: string;
  details: string;
  imageUrls: string[];
  status: CustomRequestStatus;
  quotePrice: number | null;
  currency: string | null;
  estimatedDays: number | null;
  adminNotes: string | null;
  createdAt: string;
  requestedQuantity: number;
  orderId: string | null;
  order?: {
    id: string;
    referenceCode: string | null;
    status: string;
  } | null;
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
      padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

export default function CustomOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params?.id as string;
  const isRtl = params?.locale === 'ar';

  const [req, setReq] = useState<CustomRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    fetch(`/api/custom-requests/${requestId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setReq(d.request);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [requestId]);

  const handlePay = async () => {
    if (!req) return;
    try {
      setPaying(true);
      const res = await fetch('/api/checkout/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customRequestId: req.id, paymentMethod: 'stripe' }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initiate payment');
        setPaying(false);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while paying.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 40, width: 200, borderRadius: 8, background: 'rgba(207,161,141,0.04)', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ height: 400, borderRadius: 16, background: 'rgba(207,161,141,0.04)', animation: 'pulse 1.5s ease infinite' }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  }

  if (error || !req) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Request Not Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error || 'The custom request you are looking for does not exist.'}</p>
        <Link href={`/${params?.locale || 'en'}/account/custom-orders`} style={{ display: 'inline-block', marginTop: 20, color: 'var(--accent)', textDecoration: 'underline' }}>
          Back to Custom Orders
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/${params?.locale || 'en'}/account/custom-orders`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 24, fontSize: '0.9rem' }}>
        <span>{isRtl ? '←' : '←'}</span>
        {isRtl ? 'العودة للطلبات الخاصة' : 'Back to Custom Orders'}
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            {req.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', fontFamily: 'monospace' }}>
            Request #{req.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div style={{ 
        background: 'var(--card-bg)', border: '1px solid rgba(207,161,141,0.15)', 
        borderRadius: 16, padding: '32px', marginBottom: 24 
      }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, borderBottom: '1px solid rgba(207,161,141,0.1)', paddingBottom: 12 }}>
          {isRtl ? 'تفاصيل الطلب' : 'Request Details'}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Date Submitted</div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{new Date(req.createdAt).toLocaleDateString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Requested Quantity</div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{req.requestedQuantity}</div>
          </div>
          {req.estimatedDays && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Estimated Production Time</div>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{req.estimatedDays} days</div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Description</div>
          <div style={{ 
            color: 'var(--text-primary)', background: 'rgba(207,161,141,0.03)', 
            padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', lineHeight: 1.6 
          }}>
            {req.details}
          </div>
        </div>

        {req.imageUrls && req.imageUrls.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Attached Images</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {req.imageUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', position: 'relative', width: 120, height: 120, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(207,161,141,0.2)' }}>
                  <Image src={url} alt={`Attachment ${i + 1}`} fill style={{ objectFit: 'cover' }} unoptimized />
                </a>
              ))}
            </div>
          </div>
        )}

        {(req.adminNotes || req.quotePrice !== null) && (
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 12, padding: 24, marginTop: 40
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#b45309', marginBottom: 16 }}>
              {isRtl ? 'رد الإدارة' : 'Admin Response'}
            </h3>
            
            {req.adminNotes && (
              <div style={{ marginBottom: 20, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {req.adminNotes}
              </div>
            )}
            
            {req.quotePrice !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderTop: '1px solid rgba(245, 158, 11, 0.1)', paddingTop: 20 }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Final Quote</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {req.quotePrice.toLocaleString()} {req.currency}
                  </div>
                </div>
                
                {req.status === 'QUOTED' && (
                  <button 
                    onClick={handlePay}
                    disabled={paying}
                    style={{
                      padding: '12px 32px',
                      background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: paying ? 'not-allowed' : 'pointer',
                      opacity: paying ? 0.7 : 1,
                      fontSize: '1rem'
                    }}
                  >
                    {paying ? (isRtl ? 'جاري المعالجة...' : 'Processing...') : (isRtl ? 'ادفع الآن' : 'Pay Now')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {req.orderId && req.order && (
        <div style={{ 
          background: 'var(--card-bg)', border: '1px solid rgba(207,161,141,0.15)', 
          borderRadius: 16, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Linked Order</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Reference: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{req.order.referenceCode || `#${req.order.id.slice(0, 8)}`}</span>
            </p>
          </div>
          <Link 
            href={`/${params?.locale || 'en'}/account/orders/${req.orderId}`}
            style={{
              padding: '10px 24px',
              background: 'rgba(207,161,141,0.1)',
              color: 'var(--accent)',
              border: '1px solid rgba(207,161,141,0.2)',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            View Full Order Details
          </Link>
        </div>
      )}
    </div>
  );
}
