import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './Footer.module.css';
import type { SanitySiteSettings } from '@/sanity/lib/queries';

const YEAR = new Date().getFullYear();

const DEFAULT_WHATSAPP = '+963000000000';
const DEFAULT_INSTAGRAM = 'https://instagram.com/halahello';

function toWaLink(number: string) {
  return `https://wa.me/${number.replace(/[^\d]/g, '')}`;
}

const LINKS = {
  shop: [
    { href: '/products', label: 'All Products', labelAr: 'جميع المنتجات' },
    { href: '/products?cat=hijab', label: 'Hijabs', labelAr: 'الحجابات' },
    { href: '/products?cat=plexi', label: 'Plexi Creations', labelAr: 'الأعمال البليكسية' },
    { href: '/offers', label: 'Offers', labelAr: 'العروض' },
  ],
  account: [
    { href: '/account', label: 'My Account', labelAr: 'حسابي' },
    { href: '/account/orders', label: 'My Orders', labelAr: 'طلباتي' },
    { href: '/account/addresses', label: 'Addresses', labelAr: 'عناويني' },
    { href: '/login', label: 'Sign In', labelAr: 'تسجيل الدخول' },
  ],
  info: [
    { href: '/#about', label: 'About Us', labelAr: 'من نحن' },
    { href: '/#contact', label: 'Contact', labelAr: 'تواصل معنا' },
    { href: '/#faq', label: 'FAQ', labelAr: 'الأسئلة الشائعة' },
  ],
};

const ICONS = {
  instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  whatsapp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  ),
  facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.21 10.44 22v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22C18.34 21.21 22 17.08 22 12.06Z" />
    </svg>
  ),
  tiktok: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 5.82c-.94-.98-1.46-2.28-1.46-3.65h-3.28v13.86a2.83 2.83 0 1 1-2-2.7v-3.4a6.15 6.15 0 1 0 5.27 6.1V9.06a8.13 8.13 0 0 0 4.74 1.51V7.29c-1.13 0-2.24-.36-3.27-1.47Z"/>
    </svg>
  ),
};

export interface FooterProps {
  locale?: string;
  settings?: SanitySiteSettings | null;
}

export function Footer({ locale = 'en', settings }: FooterProps) {
  const isAr = locale === 'ar';
  const localise = (href: string) =>
    href.startsWith('http') ? href : `/${locale}${href}`;

  const whatsappNumber = settings?.whatsappNumber || DEFAULT_WHATSAPP;
  const instagramUrl = settings?.instagramUrl || DEFAULT_INSTAGRAM;
  // `||` (not `??`) so an empty string from the CMS also falls back — an
  // image field with no uploaded asset yields '' and would render blank.
  const logoUrl = settings?.logoUrl?.trim() || '/logo.jpg';
  const tagline = (isAr ? settings?.taglineAr : settings?.tagline)
    || (isAr ? 'حيث الأناقة تلتقي بالإبداع' : 'Where elegance meets creativity');
  const footerText = (isAr ? settings?.footerTextAr : settings?.footerText);

  const socials = [
    { label: 'Instagram', href: instagramUrl, icon: ICONS.instagram },
    { label: 'WhatsApp', href: toWaLink(whatsappNumber), icon: ICONS.whatsapp },
    ...(settings?.facebookUrl ? [{ label: 'Facebook', href: settings.facebookUrl, icon: ICONS.facebook }] : []),
    ...(settings?.tiktokUrl ? [{ label: 'TikTok', href: settings.tiktokUrl, icon: ICONS.tiktok }] : []),
  ];

  return (
    <footer className={styles.footer} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top gradient line */}
      <div className={styles.topLine} />

      <div className={styles.inner}>
        {/* ── Brand column ── */}
        <div className={styles.brand}>
          <div className={styles.logo}>
            <span className={styles.logoImgWrap}>
              <Image src={logoUrl} alt="Halahello" width={44} height={44} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </span>
            <span className={styles.logoText}>Hala</span>
            <span className={styles.logoAccent}>hello</span>
          </div>
          <p className={styles.tagline}>{tagline}</p>
          <div className={styles.socials}>
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label={s.label}
                title={s.label}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* ── Link columns ── */}
        <div className={styles.cols}>
          {/* Shop */}
          <div className={styles.col}>
            <h3 className={styles.colHeading}>{isAr ? 'المتجر' : 'Shop'}</h3>
            <ul className={styles.colList}>
              {LINKS.shop.map((link) => (
                <li key={link.href}>
                  <Link href={localise(link.href)} className={styles.colLink}>
                    {isAr ? link.labelAr : link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className={styles.col}>
            <h3 className={styles.colHeading}>{isAr ? 'الحساب' : 'Account'}</h3>
            <ul className={styles.colList}>
              {LINKS.account.map((link) => (
                <li key={link.href}>
                  <Link href={localise(link.href)} className={styles.colLink}>
                    {isAr ? link.labelAr : link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div className={styles.col}>
            <h3 className={styles.colHeading}>{isAr ? 'معلومات' : 'Info'}</h3>
            <ul className={styles.colList}>
              {LINKS.info.map((link) => (
                <li key={link.href}>
                  <Link href={localise(link.href)} className={styles.colLink}>
                    {isAr ? link.labelAr : link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottomBar}>
        <p className={styles.copy}>
          {footerText || `© ${YEAR} Halahello. ${isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}`}&nbsp;
          <span className={styles.madeWith}>
            {isAr ? 'صُنع بـ' : 'Made with'} <span aria-label="love">♥</span> in Syria.
          </span>
        </p>
        <div className={styles.legal}>
          <Link href={localise('/privacy')} className={styles.legalLink}>
            {isAr ? 'سياسة الخصوصية' : 'Privacy'}
          </Link>
          <Link href={localise('/terms')} className={styles.legalLink}>
            {isAr ? 'الشروط والأحكام' : 'Terms'}
          </Link>
          <Link href={localise('/refund-policy')} className={styles.legalLink}>
            {isAr ? 'سياسة الاسترجاع' : 'Refunds'}
          </Link>
        </div>
      </div>
    </footer>
  );
}
