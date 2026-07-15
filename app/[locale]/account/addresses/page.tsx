'use client';

import { useEffect, useState } from 'react';

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  country: string;
  isDefault: boolean;
}

const LABEL_ICONS: Record<string, string> = { HOME: '🏠', WORK: '💼', OTHER: '📍' };

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-secondary)',
  border: '1px solid rgba(207,161,141,0.15)', borderRadius: 10,
  padding: '12px 14px', color: 'var(--text-primary)', fontSize: '0.875rem',
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.7rem', fontWeight: 600,
  color: 'var(--text-secondary)', letterSpacing: '0.08em',
  textTransform: 'uppercase', marginBottom: 6,
};

const EMPTY_FORM = {
  label: 'HOME' as 'HOME' | 'WORK' | 'OTHER',
  fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', country: 'Syria', isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/account/addresses')
      .then(r => r.json())
      .then(d => { setAddresses(d.addresses ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setForm({
      label: addr.label as 'HOME' | 'WORK' | 'OTHER',
      fullName: addr.fullName, phone: addr.phone,
      addressLine1: addr.addressLine1, addressLine2: addr.addressLine2 ?? '',
      city: addr.city, country: addr.country, isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const url = editingId ? `/api/account/addresses/${editingId}` : '/api/account/addresses';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, addressLine2: form.addressLine2 || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save address');
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
      load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.6rem)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Addresses</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 6 }}>Manage your saved delivery addresses.</p>
        </div>
        <button
          onClick={openNew}
          style={{
            padding: '10px 20px', background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            border: 'none', borderRadius: 10, color: 'var(--white)', fontWeight: 700,
            fontSize: '0.875rem', cursor: 'pointer', transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          + Add Address
        </button>
      </div>

      {/* Form panel */}
      {showForm && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid rgba(207,161,141,0.2)', borderRadius: 18,
          boxShadow: 'var(--shadow-card)',
          padding: '24px', marginBottom: 24, animation: 'slideDown 0.25s ease',
        }}>
          <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
            {editingId ? 'Edit Address' : 'New Address'}
          </h3>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: '0.85rem', marginBottom: 16 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Label selector */}
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['HOME', 'WORK', 'OTHER'] as const).map(lbl => (
                  <button key={lbl} type="button" onClick={() => setForm(f => ({ ...f, label: lbl }))}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                      background: form.label === lbl ? 'rgba(207,161,141,0.15)' : 'transparent',
                      border: form.label === lbl ? '1px solid rgba(207,161,141,0.35)' : '1px solid rgba(207,161,141,0.12)',
                      color: form.label === lbl ? '#CFA18D' : 'var(--text-secondary)',
                      fontSize: '0.8rem', transition: 'all 0.18s',
                    }}>
                    {LABEL_ICONS[lbl]} {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input style={inputStyle} required minLength={2} value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
              <div>
                <label style={labelStyle}>Phone *</label>
                <input style={inputStyle} required type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Address Line 1 *</label>
              <input style={inputStyle} required minLength={5} value={form.addressLine1} placeholder="Street, building, floor..."
                onChange={e => setForm(f => ({ ...f, addressLine1: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
            </div>
            <div>
              <label style={labelStyle}>Address Line 2 <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional)</span></label>
              <input style={inputStyle} value={form.addressLine2} placeholder="Apartment, suite..."
                onChange={e => setForm(f => ({ ...f, addressLine2: e.target.value }))}
                onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>City *</label>
                <input style={inputStyle} required value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input style={inputStyle} value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="isDefault" checked={form.isDefault}
                onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: '#CFA18D', cursor: 'pointer' }} />
              <label htmlFor="isDefault" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Set as default address
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" disabled={submitting} style={{
                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                background: submitting ? 'rgba(207,161,141,0.3)' : 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                color: 'var(--white)', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem',
              }}>
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Address'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} style={{
                padding: '12px 20px', borderRadius: 10, background: 'transparent',
                border: '1px solid rgba(207,161,141,0.15)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.875rem',
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Address cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 100, borderRadius: 14, background: 'rgba(207,161,141,0.04)', animation: 'pulse 1.5s ease infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      ) : addresses.length === 0 ? (
        <div style={{
          background: 'var(--card-bg)',
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid rgba(207,161,141,0.15)', borderRadius: 16, padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📍</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>No saved addresses</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Add a delivery address to speed up checkout.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {addresses.map(addr => (
            <div key={addr.id} style={{
              background: 'var(--card-bg)',
              border: addr.isDefault ? '1px solid rgba(207,161,141,0.3)' : '1px solid rgba(207,161,141,0.15)',
              boxShadow: 'var(--shadow-soft)',
              borderRadius: 16, padding: '18px 20px',
              position: 'relative', transition: 'border-color 0.2s',
            }}>
              {addr.isDefault && (
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(207,161,141,0.15)', border: '1px solid rgba(207,161,141,0.3)',
                  borderRadius: 6, padding: '2px 8px', fontSize: '0.65rem',
                  color: '#CFA18D', fontWeight: 600,
                }}>Default</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: '1.1rem' }}>{LABEL_ICONS[addr.label] ?? '📍'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{addr.label}</span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: 4 }}>{addr.fullName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {addr.addressLine1}<br />
                {addr.addressLine2 && <>{addr.addressLine2}<br /></>}
                {addr.city}, {addr.country}<br />
                {addr.phone}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => openEdit(addr)} style={{
                  flex: 1, padding: '8px', background: 'rgba(207,161,141,0.08)',
                  border: '1px solid rgba(207,161,141,0.15)', borderRadius: 8,
                  color: '#CFA18D', cursor: 'pointer', fontSize: '0.775rem', fontWeight: 600,
                }}>Edit</button>
                <button onClick={() => handleDelete(addr.id)} disabled={deletingId === addr.id} style={{
                  padding: '8px 12px', background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8,
                  color: '#f87171', cursor: 'pointer', fontSize: '0.775rem',
                }}>
                  {deletingId === addr.id ? '…' : '🗑'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
