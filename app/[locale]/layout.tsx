import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Tajawal } from "next/font/google";
import "../globals.css";
import Providers from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { WishlistProvider } from "@/components/product/WishlistContext";
import { ENABLE_EXTRA_THEME_TOKENS } from "@/lib/theme-config";
import { AnnouncementBar, ANNOUNCEMENT_BAR_HEIGHT } from "@/components/layout/AnnouncementBar";
import { getSiteSettings, getThemeSettings, type SanityThemeSettings } from "@/sanity/lib/queries";

/* ─── Admin-editable color overrides ───
   Maps Sanity themeSettings fields to the CSS custom properties they
   control (see app/globals.css). Only fields the admin actually set
   are applied — everything else falls through to the CSS defaults. */
const THEME_CSS_VARS: Record<keyof Omit<SanityThemeSettings, "_id" | "enableExtras">, string> = {
  bgPrimary: "--bg-primary",
  bgSecondary: "--bg-secondary",
  accent: "--accent",
  accentLight: "--accent-light",
  accentDark: "--accent-dark",
  textPrimary: "--text-primary",
  textSecondary: "--text-secondary",
  highlight: "--highlight",
  footerBg: "--footer-bg",
  footerText: "--footer-text",
};

function buildThemeStyle(theme: SanityThemeSettings | null): React.CSSProperties {
  if (!theme) return {};
  const style: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(THEME_CSS_VARS)) {
    const value = theme[key as keyof typeof THEME_CSS_VARS];
    if (typeof value === "string" && value.trim()) style[cssVar] = value.trim();
  }
  return style as React.CSSProperties;
}

/* ─── Premium Font Stack ─── */

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["300", "400", "500", "700"],
});

/* ─── SEO Metadata ─── */

export const metadata: Metadata = {
  title: "Halahello — Elegant Hijabs & Custom Plexi Creations",
  description:
    "Discover Halahello — a premium fashion brand offering elegant handmade hijabs and custom plexi creations. Where elegance meets creativity.",
  keywords: [
    "hijab",
    "plexi",
    "fashion",
    "halahello",
    "handmade",
    "elegant",
    "modest fashion",
    "حجاب",
    "بليكسي",
  ],
  openGraph: {
    title: "Halahello — Elegant Hijabs & Custom Plexi Creations",
    description: "Premium handmade hijabs & custom plexi art. Where elegance meets creativity.",
    type: "website",
    locale: "en_US",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const [settingsResult, themeResult] = await Promise.allSettled([getSiteSettings(), getThemeSettings()]);
  const settings = settingsResult.status === "fulfilled" ? settingsResult.value : null;
  const theme = themeResult.status === "fulfilled" ? themeResult.value : null;
  const announcementText = settings?.announcementBarActive
    ? (locale === "ar" ? settings.announcementBarAr : settings.announcementBar)
    : null;
  const enableExtras = theme?.enableExtras ?? ENABLE_EXTRA_THEME_TOKENS;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-theme-extras={enableExtras ? "on" : "off"}
      style={buildThemeStyle(theme)}
      className={`${cormorant.variable} ${dmSans.variable} ${tajawal.variable}`}
    >
      <body>
        <Providers>
          <WishlistProvider>
            <ToastProvider>
              <AnnouncementBar text={announcementText} isAr={locale === "ar"} />
              <Navbar logoUrl={settings?.logoUrl} offsetTop={announcementText ? ANNOUNCEMENT_BAR_HEIGHT : 0} />
              <main id="main-content" className="page-enter">
                {children}
              </main>
              <Footer locale={locale} settings={settings} />
            </ToastProvider>
          </WishlistProvider>
        </Providers>
      </body>
    </html>
  );
}
