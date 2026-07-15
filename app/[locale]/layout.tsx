import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, Tajawal } from "next/font/google";
import "../globals.css";
import Providers from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastProvider } from "@/components/ui/Toast";
import { WishlistProvider } from "@/components/product/WishlistContext";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${dmSans.variable} ${tajawal.variable}`}
    >
      <body>
        <Providers>
          <WishlistProvider>
            <ToastProvider>
              <Navbar />
              <main id="main-content" className="page-enter">
                {children}
              </main>
              <Footer />
            </ToastProvider>
          </WishlistProvider>
        </Providers>
      </body>
    </html>
  );
}
