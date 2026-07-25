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
import { getSiteSettings } from "@/sanity/lib/queries";

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
  const settings = await getSiteSettings().catch(() => null);
  const announcementText = settings?.announcementBarActive
    ? (locale === "ar" ? settings.announcementBarAr : settings.announcementBar)
    : null;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-theme-extras={ENABLE_EXTRA_THEME_TOKENS ? "on" : "off"}
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
