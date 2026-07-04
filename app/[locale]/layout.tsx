import type { Metadata } from "next";
import { Playfair_Display, Inter, Noto_Sans_Arabic } from "next/font/google";
import "../globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${notoArabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
