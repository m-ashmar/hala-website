'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import AccountButton from '@/components/AccountButton';
import CartButton from '@/components/CartButton';
import ThemeToggle from '@/components/ThemeToggle';

interface NavLink {
  href: string;
  label: string;
  labelAr: string;
}

const NAV_LINKS: NavLink[] = [
  { href: '/',          label: 'Home',    labelAr: 'الرئيسية'   },
  { href: '/products',  label: 'Shop',    labelAr: 'المتجر'      },
  { href: '/offers',    label: 'Offers',  labelAr: 'العروض'      },
  { href: '/favorites', label: 'Favorites',labelAr: 'المفضلة'    },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAr = pathname?.startsWith('/ar') ?? false;
  const locale = isAr ? 'ar' : 'en';

  // localised link helper
  const localise = (href: string) =>
    href === '/' ? `/${locale}` : `/${locale}${href}`;

  // Scroll shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === '/'
      ? pathname === `/${locale}` || pathname === `/${locale}/`
      : pathname?.startsWith(`/${locale}${href}`);

  return (
    <>
      <header
        className={[styles.navbar, scrolled ? styles.scrolled : ''].filter(Boolean).join(' ')}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className={styles.inner}>
          {/* ── Logo ── */}
          <Link href={`/${locale}`} className={styles.logo} aria-label="Halahello — Home">
            <span className={styles.logoText}>Hala</span>
            <span className={styles.logoAccent}>hello</span>
          </Link>

          {/* ── Desktop nav (Hidden) ── */}
          <nav className={styles.desktopNav} aria-hidden="true" />

          {/* ── Actions (Cart + Hamburger) ── */}
          <div className={styles.actions}>
            <Link href={`/${locale}/favorites`} aria-label="Favorites" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', color: 'var(--text-primary)', transition: 'all var(--transition-base)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </Link>
            <CartButton />

            {/* Hamburger */}
            <button
              className={[styles.hamburger, menuOpen ? styles.hamburgerOpen : ''].filter(Boolean).join(' ')}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <span className={styles.bar} />
              <span className={styles.bar} />
              <span className={styles.bar} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Universal Drawer ── */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={[styles.mobileMenu, menuOpen ? styles.mobileMenuOpen : ''].filter(Boolean).join(' ')}
        aria-hidden={!menuOpen}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={localise(link.href)}
              className={[styles.mobileLink, isActive(link.href) ? styles.mobileLinkActive : ''].filter(Boolean).join(' ')}
              onClick={() => setMenuOpen(false)}
            >
              {isAr ? link.labelAr : link.label}
              <span style={{ opacity: 0.5 }}>→</span>
            </Link>
          ))}
        </nav>

        {/* ── Drawer Footer (Controls) ── */}
        <div className={styles.drawerFooter}>
          <AccountButton />
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {/* Lang toggle */}
            <Link
              href={isAr ? pathname.replace(/^\/ar/, '/en') : pathname.replace(/^\/en/, '/ar')}
              className={styles.langBtn}
              style={{ flex: 1 }}
              aria-label="Switch language"
            >
              {isAr ? 'EN' : 'AR'}
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
