/**
 * Homepage — async Server Component (Phase 12)
 *
 * All Sanity data is fetched server-side using parallel Promise.allSettled.
 * No client-side API calls for Sanity content — zero network waterfalls.
 * The interactive HomeClient island receives all data as props.
 */
import { Suspense } from "react";
import { getAllProducts, getHomepageBanners, getFeaturedPromotions, getTestimonials, getSiteSettings } from "@/sanity/lib/queries";
import prisma from "@/lib/prisma";
import HomeClient from "./_components/HomeClient";
import type { Metadata } from "next";

/* ─── ISR: revalidate this page every 60 seconds ─── */
export const revalidate = 60;

/* ─── SEO metadata ─── */
export const metadata: Metadata = {
  title: "Halahello — Elegant Hijabs & Custom Plexi Creations",
  description:
    "Discover Halahello — a premium fashion brand offering elegant handmade hijabs and custom plexi creations. Where elegance meets creativity.",
  keywords: ["hijab", "plexi", "fashion", "halahello", "handmade", "elegant", "modest fashion", "حجاب", "بليكسي"],
  openGraph: {
    title: "Halahello — Elegant Hijabs & Custom Plexi Creations",
    description: "Premium handmade hijabs & custom plexi art. Where elegance meets creativity.",
    type: "website",
  },
};

/* ─── Page skeleton shown during streaming ─── */
function HomeSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Hero skeleton */}
      <div className="skeleton" style={{ minHeight: "100vh", width: "100%" }} />
    </div>
  );
}

/* ─── Main async Server Component ─── */
export default async function Home() {
  /* Fetch all Sanity data in parallel — one round-trip, server-side */
  const [
    bannersResult,
    promotionsResult,
    sanityProductsResult,
    testimonialsResult,
    settingsResult,
    dbProductsResult,
  ] = await Promise.allSettled([
    getHomepageBanners(),
    getFeaturedPromotions(),
    getAllProducts(),
    getTestimonials(),
    getSiteSettings(),
    prisma.productSync.findMany({
      select: { id: true, sanityId: true, price: true, stock: true },
    }),
  ]);

  /* Safely extract values — fall back to empty arrays/null on error */
  const banners       = bannersResult.status       === "fulfilled" ? bannersResult.value       : [];
  const promotions    = promotionsResult.status    === "fulfilled" ? promotionsResult.value    : [];
  const sanityProducts = sanityProductsResult.status === "fulfilled" ? sanityProductsResult.value : [];
  const testimonials  = testimonialsResult.status  === "fulfilled" ? testimonialsResult.value  : [];
  const settings      = settingsResult.status      === "fulfilled" ? settingsResult.value      : null;
  const dbProducts    = dbProductsResult.status    === "fulfilled" ? dbProductsResult.value    : [];

  const heroStats = settings?.heroStats ?? [];

  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeClient
        banners={banners}
        promotions={promotions}
        sanityProducts={sanityProducts}
        dbProducts={dbProducts}
        testimonials={testimonials}
        heroStats={heroStats}
      />
    </Suspense>
  );
}
