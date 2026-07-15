'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

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

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      boxShadow: 'var(--shadow-soft)',
      border: '1px solid rgba(207,161,141,0.15)', borderRadius: 18,
      padding: '24px', marginBottom: 20,
    }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setProfile({ name: d.user.name ?? '', email: d.user.email ?? '' });
        }
        setLoadingProfile(false);
      })
      .catch(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name, email: profile.email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setProfileSuccess('Profile updated successfully!');
      // Refresh the session to pick up new name
      await update({ name: data.user.name });
    } catch (e: any) {
      setProfileError(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const user = session?.user;
  // whatsappPhone is in the JWT session via our callback — cast to access it
  const whatsappPhone = (user as any)?.whatsappPhone as string | undefined;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.6rem)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Account Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 6 }}>Manage your personal information and preferences.</p>
      </div>

      {/* Profile section */}
      <SectionCard title="Personal Information" subtitle="Update your name and email address.">
        {loadingProfile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2].map(i => <div key={i} style={{ height: 44, borderRadius: 8, background: 'rgba(207,161,141,0.04)', animation: 'pulse 1.5s ease infinite' }} />)}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {profileSuccess && (
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '10px 14px', color: '#4ade80', fontSize: '0.85rem' }}>
                ✓ {profileSuccess}
              </div>
            )}
            {profileError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: '0.85rem' }}>
                {profileError}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input style={inputStyle} value={profile.name} required minLength={2}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" value={profile.email} placeholder="Optional"
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                  onFocus={e => (e.target.style.borderColor = 'rgba(207,161,141,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(207,161,141,0.15)')} />
              </div>
            </div>
            <div>
              <button type="submit" disabled={savingProfile} style={{
                padding: '11px 24px', background: savingProfile ? 'rgba(207,161,141,0.3)' : 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                border: 'none', borderRadius: 10, color: 'var(--white)',
                fontWeight: 700, cursor: savingProfile ? 'not-allowed' : 'pointer', fontSize: '0.875rem',
              }}>
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* WhatsApp / phone */}
      <SectionCard title="Authentication" subtitle="Your login method and verified identity.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg-secondary)', border: '1px solid rgba(207,161,141,0.08)',
            borderRadius: 12, padding: '14px 16px',
          }}>
            <span style={{ fontSize: '1.3rem' }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>WhatsApp</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {whatsappPhone ?? '—'}
              </div>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 8, padding: '3px 10px', fontSize: '0.7rem', color: '#4ade80', fontWeight: 600,
            }}>
              ✓ Verified
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Account info */}
      <SectionCard title="Account Details">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          {[
            { label: 'Account ID', value: user?.id ? `${user.id.slice(0, 8)}…` : '—' },
            { label: 'Role', value: user?.role ?? 'CUSTOMER' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--bg-secondary)', border: '1px solid rgba(207,161,141,0.06)',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: label === 'Account ID' ? 'monospace' : 'inherit' }}>{value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Danger zone */}
      <div style={{
        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
        borderRadius: 18, padding: '22px 24px',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f87171', margin: '0 0 6px' }}>Danger Zone</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 16 }}>
          Need to delete your account? Contact our support team via WhatsApp.
        </p>
        <a
          href="https://wa.me/963000000000"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', background: 'transparent',
            border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9,
            color: '#f87171', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600,
          }}
        >
          💬 Contact Support
        </a>
      </div>
    </div>
  );
}
