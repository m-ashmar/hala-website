'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AccountButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by waiting for mount
  if (!mounted || status === 'loading') {
    return <div style={{ minHeight: 44, minWidth: 44 }} />;
  }

  const isRtl = pathname?.startsWith('/ar');
  const locale = isRtl ? 'ar' : 'en';

  const handleClick = () => {
    if (session) {
      router.push(`/${locale}/account`);
    } else {
      router.push(`/${locale}/login`);
    }
  };

  return (
    <button
      id="account-nav-btn"
      onClick={handleClick}
      aria-label={session ? 'My Account' : 'Login'}
      title={session ? 'My Account' : 'Login'}
      style={{
        position: 'relative', background: 'none', border: 'none',
        cursor: 'pointer', padding: '8px 10px', borderRadius: 10,
        color: 'var(--text-primary, #FAF7F5)',
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'background 0.2s',
        minHeight: 44, minWidth: 44,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(207,161,141,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {/* User icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </button>
  );
}
