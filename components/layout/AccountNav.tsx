'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import styles from './AccountNav.module.css';
import { Avatar } from '@/components/ui/Avatar';

export interface AccountNavUser {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  labelAr: string;
  exact?: boolean;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/account', exact: true,
    label: 'Overview', labelAr: 'نظرة عامة',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: '/account/orders',
    label: 'My Orders', labelAr: 'طلباتي',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    href: '/account/custom-orders',
    label: 'Custom Orders', labelAr: 'طلباتي الخاصة',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    href: '/account/addresses',
    label: 'Addresses', labelAr: 'عناويني',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
  },
  {
    href: '/account/settings',
    label: 'Settings', labelAr: 'الإعدادات',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
];

export interface AccountNavProps {
  user: AccountNavUser;
  locale?: string;
}

export function AccountNav({ user, locale = 'en' }: AccountNavProps) {
  const pathname = usePathname();
  const isAr = locale === 'ar';

  const isActive = (href: string, exact?: boolean) => {
    const full = `/${locale}${href}`;
    return exact
      ? pathname === full
      : pathname.startsWith(full);
  };

  const localise = (href: string) => `/${locale}${href}`;

  return (
    <aside className={styles.sidebar}>
      {/* Profile */}
      <div className={styles.profile}>
        <Avatar
          name={user.name ?? user.email ?? user.phone ?? undefined}
          size="lg"
        />
        <div className={styles.profileInfo}>
          <span className={styles.profileName}>{user.name ?? (isAr ? 'العميل' : 'Customer')}</span>
          <span className={styles.profileSub}>{user.email ?? user.phone ?? ''}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.nav} aria-label={isAr ? 'قائمة الحساب' : 'Account navigation'}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={localise(item.href)}
              className={[styles.navLink, active ? styles.navLinkActive : ''].filter(Boolean).join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{isAr ? item.labelAr : item.label}</span>
              {active && <span className={styles.navIndicator} />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className={styles.signOutWrap}>
        <button
          className={styles.signOutBtn}
          onClick={() => signOut({ callbackUrl: `/${locale}` })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>{isAr ? 'تسجيل الخروج' : 'Sign out'}</span>
        </button>
      </div>
    </aside>
  );
}
