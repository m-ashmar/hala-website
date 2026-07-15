"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { WishlistButton } from "@/components/product/WishlistButton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Lang, tr } from "../translations";
import { useCartStore } from "@/lib/stores/cart.store";
import type {
  SanityProduct,
  SanityHomepageBanner,
  SanityPromotion,
  SanityTestimonial,
  SanityHeroStat,
} from "@/sanity/lib/queries";

/* ═══════════════════════════════════════════════════
   SVG ICONS — lightweight, inline, no deps
   ═══════════════════════════════════════════════════ */

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const StarIcon = ({ filled = true }: { filled?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#CFA18D" : "none"} stroke="#CFA18D" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ArrowIcon = ({ rtl, size = 18 }: { rtl: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={rtl ? { transform: "scaleX(-1)" } : {}}>
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const QuoteIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" fill="var(--accent)" fillOpacity="0.2" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" fill="var(--accent)" fillOpacity="0.2" />
  </svg>
);

const CartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "var(--accent)" : "none"} stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ═══════════════════════════════════════════════════
   SCROLL ANIMATION HOOK
   ═══════════════════════════════════════════════════ */
function useScrollAnimation(deps: unknown[] = []) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -48px 0px" }
    );
    const timer = setTimeout(() => {
      document.querySelectorAll(".fade-in-section, .fade-in-left, .fade-in-right, .reveal-stagger").forEach((el) => observer.observe(el));
    }, 80);
    return () => { clearTimeout(timer); observer.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const INSTAGRAM_URL = "https://instagram.com/halahelloo";

const STATIC_INSTAGRAM_IMAGES = [
  "/products/hijab/hijab.jpg", "/products/plexi/c1.jpg", "/products/hijab/hijab-a1.avif",
  "/products/plexi/d1.jpg", "/products/plexi/e1.jpg", "/products/hijab/hijab-b1.jpg",
  "/products/plexi/f1.webp", "/products/plexi/b2.webp", "/products/hijab/hijab-c1.jpg",
];

const DEFAULT_HERO_STATS: SanityHeroStat[] = [
  { value: "500+", valueAr: "+٥٠٠", label: "Happy Customers", labelAr: "عميلة سعيدة" },
  { value: "2",    valueAr: "٢",    label: "Collections",     labelAr: "مجموعة" },
  { value: "100%", valueAr: "١٠٠٪", label: "Handcrafted",     labelAr: "صنع يدوي" },
  { value: "∞",    valueAr: "∞",    label: "Custom Options",  labelAr: "خيار مخصص" },
];

const WHY_US_PILLARS = [
  {
    icon: "✦",
    titleEn: "Handcrafted Quality",
    titleAr: "جودة يدوية",
    descEn: "Every piece is crafted with meticulous care, ensuring unmatched quality in every stitch and detail.",
    descAr: "كل قطعة تُصنع بعناية فائقة وحرفية عالية.",
  },
  {
    icon: "◈",
    titleEn: "Custom Made Orders",
    titleAr: "طلبات مخصصة",
    descEn: "Your vision, our craft. We bring your unique style ideas to life with personalized creations.",
    descAr: "رؤيتك وفنّنا — نحوّل أفكارك إلى إبداع فريد.",
  },
  {
    icon: "◇",
    titleEn: "Premium Materials",
    titleAr: "مواد فاخرة",
    descEn: "Only the finest fabrics and premium-grade plexi materials make it into our collections.",
    descAr: "أجود الأقمشة والمواد البليكسية في كل مجموعة.",
  },
  {
    icon: "◉",
    titleEn: "Authentic Designs",
    titleAr: "تصاميم أصيلة",
    descEn: "Original designs inspired by Arabic heritage, modern elegance, and timeless femininity.",
    descAr: "تصاميم أصلية مستوحاة من التراث العربي والأناقة العصرية.",
  },
];

/* ═══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function Home() {
  /* ── State ── */
  const [lang, setLang] = useState<Lang>("en");
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [activeWhyUs, setActiveWhyUs] = useState<number | null>(null);
  const params = useParams();

  useEffect(() => {
    if (params?.locale === "ar") {
      setLang("ar");
    } else {
      setLang("en");
    }
  }, [params?.locale]);

  /* ── Data state ── */
  const [banners, setBanners] = useState<SanityHomepageBanner[]>([]);
  const [promotions, setPromotions] = useState<SanityPromotion[]>([]);
  const [heroStats, setHeroStats] = useState<SanityHeroStat[]>(DEFAULT_HERO_STATS);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [sanityProducts, setSanityProducts] = useState<SanityProduct[]>([]);
  const [sanityTestimonials, setSanityTestimonials] = useState<SanityTestimonial[]>([]);
  const [instaPosts, setInstaPosts] = useState<{ id: string; media_url: string; permalink: string; media_type: string; thumbnail_url?: string }[]>([]);

  /* ── Loading state ── */
  const [bannersLoading, setBannersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [instaLoading, setInstaLoading] = useState(true);

  /* ── Form state ── */
  const [customOrderLoading, setCustomOrderLoading] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const addItem = useCartStore((s) => s.addItem);

  /* ── Derived ── */
  const isRtl = lang === "ar";
  const T = useCallback((key: Parameters<typeof tr>[0]) => tr(key, lang), [lang]);

  /* ── Data fetching ── */

  // Products from DB (prices/stock)
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => { if (d.products) setDbProducts(d.products); })
      .catch(console.error);
  }, []);

  // Sanity products (display data)
  useEffect(() => {
    fetch("/api/sanity/products")
      .then((r) => r.json())
      .then((d) => { if (d.products) setSanityProducts(d.products); })
      .catch(console.error)
      .finally(() => setProductsLoading(false));
  }, []);

  // Banners
  useEffect(() => {
    fetch("/api/sanity/banners")
      .then((r) => r.json())
      .then((d) => { if (d.banners) setBanners(d.banners); })
      .catch(console.error)
      .finally(() => setBannersLoading(false));
  }, []);

  // Promotions
  useEffect(() => {
    fetch("/api/sanity/promotions")
      .then((r) => r.json())
      .then((d) => { if (d.promotions) setPromotions(d.promotions); })
      .catch(console.error);
  }, []);

  // Site settings (heroStats)
  useEffect(() => {
    fetch("/api/sanity/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.heroStats?.length) setHeroStats(d.settings.heroStats);
      })
      .catch(console.error);
  }, []);

  // Sanity testimonials
  useEffect(() => {
    fetch("/api/sanity/testimonials")
      .then((r) => r.json())
      .then((d) => { if (d.testimonials?.length) setSanityTestimonials(d.testimonials); })
      .catch(console.error);
  }, []);

  // Instagram feed
  useEffect(() => {
    fetch("/api/instagram/feed")
      .then((r) => r.json())
      .then((d) => { if (d.posts?.length) setInstaPosts(d.posts); })
      .catch(() => {})
      .finally(() => setInstaLoading(false));
  }, []);

  /* ── Banner auto-rotate ── */
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setCurrentBannerIndex((p) => (p + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [banners.length]);

  /* ── Testimonial auto-rotate ── */
  const testimonialData = sanityTestimonials.length > 0
    ? sanityTestimonials.map((t) => ({
        text:    isRtl && t.quoteAr  ? t.quoteAr  : t.quote,
        author:  isRtl && t.authorAr ? t.authorAr : t.author,
        product: "", // no product field in SanityTestimonial
        rating:  t.rating,
        avatarUrl: t.avatarImageUrl,
      }))
    : [
        { text: T("test1"), author: T("test1Author"), product: T("test1Product"), rating: 5, avatarUrl: undefined },
        { text: T("test2"), author: T("test2Author"), product: T("test2Product"), rating: 5, avatarUrl: undefined },
        { text: T("test3"), author: T("test3Author"), product: T("test3Product"), rating: 5, avatarUrl: undefined },
        { text: T("test4"), author: T("test4Author"), product: T("test4Product"), rating: 5, avatarUrl: undefined },
      ];

  useEffect(() => {
    const id = setInterval(() => setActiveTestimonial((p) => (p + 1) % testimonialData.length), 5500);
    return () => clearInterval(id);
  }, [testimonialData.length]);

  /* ── Side effects ── */
  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  /* ── Scroll animation observer ── */
  useScrollAnimation([sanityProducts, productsLoading, sanityTestimonials]);

  /* ── Derived product lists ── */
  const hijabProducts = sanityProducts.filter((p) => p.category === "hijab");
  const plexiProducts = sanityProducts.filter((p) => p.category === "plexi");

  /* ── Helpers ── */
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const toggleLang = useCallback(() => setLang((l) => (l === "en" ? "ar" : "en")), []);
  /* toggleLang drives RTL/LTR via document.documentElement.dir in the side-effect above */


  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleAddToCart = useCallback(
    (p: SanityProduct, dbProduct: any | undefined) => {
      const productName = isRtl && p.titleAr ? p.titleAr : p.title;
      const price = dbProduct ? dbProduct.price : p.price;
      const syncId = dbProduct ? dbProduct.id : `temp-${p.sanityId}`;
      addItem({ productSyncId: syncId, sanityId: p.sanityId, name: productName, price });
      showToast(isRtl ? "تمت الإضافة إلى السلة ✨" : "Added to cart ✨", "success");
    },
    [isRtl, addItem, showToast]
  );

  const handleCustomOrderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCustomOrderLoading(true);
    try {
      const res = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          color: fd.get("color") as string,
          occasion: fd.get("occasion") as string,
          message: fd.get("message") as string,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(T("formSuccess"), "success");
        (e.target as HTMLFormElement).reset();
      } else {
        showToast(data.error || "Something went wrong. Please try again.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setCustomOrderLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setContactLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          message: fd.get("message") as string,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(T("contactSuccess"), "success");
        (e.target as HTMLFormElement).reset();
      } else {
        showToast(data.error || "Something went wrong. Please try again.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setContactLoading(false);
    }
  };

  const navItems: [string, string][] = [
    [T("navStory"), "story"], [T("navCollections"), "brands"], [T("navHijabs"), "hijab-products"],
    [T("navPlexi"), "plexi-products"], [T("navCustom"), "custom-orders"], [T("navContact"), "contact"],
  ];

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* NOTE: The shared <Navbar /> is rendered by layout.tsx — no duplicate nav here */}

      {/* ──────────────────────────────────────────────────────────
          1. CINEMATIC HERO
          ────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      >
        {/* Background images */}
        {bannersLoading ? (
          <div style={{ position: "absolute", inset: 0, background: "var(--gradient-dark)" }} className="skeleton" />
        ) : banners.length > 0 ? (
          banners.map((banner, index) => (
            <div key={banner._id} style={{ position: "absolute", inset: 0, opacity: index === currentBannerIndex ? 1 : 0, transition: "opacity 1.2s ease-in-out", zIndex: index === currentBannerIndex ? 0 : -1 }}>
              <Image unoptimized src={banner.backgroundImageUrl} alt={banner.title || "Banner"} fill priority={index === 0} style={{ objectFit: "cover", objectPosition: "center" }} sizes="100vw" className="max-md:hidden" />
              <Image unoptimized src={banner.mobileImageUrl || banner.backgroundImageUrl} alt={banner.title || "Banner"} fill priority={index === 0} style={{ objectFit: "cover", objectPosition: "center" }} sizes="100vw" className="md:hidden" />
            </div>
          ))
        ) : (
          <div style={{ position: "absolute", inset: 0 }}>
            <Image src="/hero-bg.png" alt="Halahello" fill priority style={{ objectFit: "cover", objectPosition: "center" }} sizes="100vw" />
          </div>
        )}

        {/* Cinematic overlay */}
        <div style={{ position: "absolute", inset: 0, background: "var(--gradient-hero)", zIndex: 1 }} />

        {/* Decorative particles */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              width: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 3,
              height: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 3,
              borderRadius: "50%",
              background: "rgba(207,161,141,0.6)",
              left: `${10 + i * 11}%`,
              top: `${20 + (i % 4) * 18}%`,
              animation: `particleDrift ${5 + i * 1.5}s ease-in-out ${i * 0.8}s infinite`,
            }} />
          ))}
        </div>

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 860, padding: "0 24px", width: "100%" }}>
          {banners.length > 0 && !bannersLoading ? (
            banners.map((banner, index) => (
              <div
                key={banner._id}
                style={{ display: index === currentBannerIndex ? "block" : "none" }}
              >
                <span className="section-tag" style={{ color: "var(--accent-light)", marginBottom: 20, display: "block" }}>
                  {T("heroTag")}
                </span>
                <h1 style={{
                  fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)",
                  fontSize: "clamp(2.8rem, 8vw, 6.5rem)",
                  fontWeight: isRtl ? 700 : 600,
                  fontStyle: isRtl ? "normal" : "italic",
                  color: "#FFFFFF",
                  marginBottom: 20,
                  lineHeight: 1.02,
                  letterSpacing: isRtl ? "-0.01em" : "-0.025em",
                  animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both`,
                  textShadow: "0 2px 40px rgba(0,0,0,0.4)",
                }}>
                  {isRtl && banner.titleAr ? banner.titleAr : banner.title}
                </h1>
                {(banner.subtitle || banner.subtitleAr) && (
                  <p style={{
                    fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)",
                    fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
                    fontWeight: 400,
                    fontStyle: isRtl ? "normal" : "italic",
                    color: "rgba(255,255,255,0.80)",
                    marginBottom: 36,
                    animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both`,
                  }}>
                    {isRtl && banner.subtitleAr ? banner.subtitleAr : banner.subtitle}
                  </p>
                )}
                {(banner.ctaLabel || banner.ctaLabel2) && (
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both` }}>
                    {banner.ctaLabel && (
                      banner.ctaLink?.startsWith("#") ? (
                        <button onClick={() => scrollTo(banner.ctaLink!.substring(1))} className="btn-primary float-animation">
                          {isRtl && banner.ctaLabelAr ? banner.ctaLabelAr : banner.ctaLabel} <ArrowIcon rtl={isRtl} />
                        </button>
                      ) : (
                        <Link href={banner.ctaLink || `/${lang}/offers`} className="btn-primary float-animation">
                          {isRtl && banner.ctaLabelAr ? banner.ctaLabelAr : banner.ctaLabel} <ArrowIcon rtl={isRtl} />
                        </Link>
                      )
                    )}
                    {banner.ctaLabel2 && (
                      banner.ctaLink2?.startsWith("#") ? (
                        <button onClick={() => scrollTo(banner.ctaLink2!.substring(1))} className="btn-secondary float-animation-delay" style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
                          {isRtl && banner.ctaLabelAr2 ? banner.ctaLabelAr2 : banner.ctaLabel2}
                        </button>
                      ) : (
                        <Link href={banner.ctaLink2 || `/${lang}/offers`} className="btn-secondary float-animation-delay" style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
                          {isRtl && banner.ctaLabelAr2 ? banner.ctaLabelAr2 : banner.ctaLabel2}
                        </Link>
                      )
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <>
              <span className="section-tag" style={{ color: "var(--accent-light)", marginBottom: 20, display: "block", animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both` }}>
                {T("heroTag")}
              </span>
              <h1 style={{
                fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)",
                fontSize: "clamp(2.8rem, 8vw, 6.5rem)",
                fontWeight: isRtl ? 700 : 600,
                fontStyle: isRtl ? "normal" : "italic",
                color: "#FFFFFF",
                marginBottom: 20,
                lineHeight: 1.02,
                letterSpacing: "-0.025em",
                animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both`,
                textShadow: "0 2px 40px rgba(0,0,0,0.4)",
              }}>
                {T("heroTitle")}
              </h1>
              <p style={{
                fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)",
                fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
                fontWeight: 400,
                fontStyle: isRtl ? "normal" : "italic",
                color: "rgba(255,255,255,0.80)",
                marginBottom: 16,
                animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both`,
              }}>
                {T("heroSub")}
              </p>
              <p style={{ fontSize: "clamp(0.88rem, 1.5vw, 1rem)", color: "rgba(255,255,255,0.65)", marginBottom: 40, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.75, animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both` }}>
                {T("heroDesc")}
              </p>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both` }}>
                <button onClick={() => scrollTo("hijab-products")} className="btn-primary float-animation">
                  {T("heroBtnHijab")} <ArrowIcon rtl={isRtl} />
                </button>
                <button onClick={() => scrollTo("plexi-products")} className="btn-secondary float-animation-delay" style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
                  {T("heroBtnPlexi")}
                </button>
              </div>
            </>
          )}

          {/* ── Hero Stats Bar (from Sanity) — glassmorphism pill ── */}
          <div style={{ animation: `revealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.65s both`, marginTop: 52, display: "flex", justifyContent: "center" }}>
            <div style={{
              display: "inline-flex",
              flexWrap: "wrap",
              justifyContent: "center",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              border: "1px solid rgba(207,161,141,0.28)",
              borderRadius: "var(--radius-xl)",
              padding: "6px 8px",
              gap: 4,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}>
              {heroStats.map((stat, i) => (
                <div key={i} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "14px 28px",
                  position: "relative",
                  minWidth: 110,
                }}>
                  {/* Vertical divider between items */}
                  {i > 0 && (
                    <span style={{
                      position: "absolute", left: 0, top: "20%",
                      height: "60%", width: 1,
                      background: "rgba(207,161,141,0.25)",
                    }} />
                  )}
                  <span style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)",
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    background: "linear-gradient(135deg, #FFFFFF 0%, var(--accent-light) 50%, var(--accent) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                    {isRtl && stat.valueAr ? stat.valueAr : stat.value}
                  </span>
                  <span style={{
                    fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)",
                    fontSize: "0.68rem",
                    fontWeight: 500,
                    letterSpacing: isRtl ? 0 : "0.14em",
                    textTransform: isRtl ? "none" : "uppercase",
                    color: "rgba(255,255,255,0.60)",
                    marginTop: 6,
                    whiteSpace: "nowrap",
                  }}>
                    {isRtl && stat.labelAr ? stat.labelAr : stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Banner navigation dots */}
        {banners.length > 1 && (
          <div style={{ position: "absolute", bottom: 44, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, zIndex: 3 }}>
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBannerIndex(index)}
                aria-label={`Go to banner ${index + 1}`}
                style={{
                  width: index === currentBannerIndex ? 28 : 8, height: 8,
                  borderRadius: 4,
                  background: index === currentBannerIndex ? "var(--accent)" : "rgba(255,255,255,0.35)",
                  border: "none", cursor: "pointer", transition: "all 0.35s ease", padding: 0,
                }}
              />
            ))}
          </div>
        )}

        {/* Fade to background */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, background: "linear-gradient(to bottom, transparent, var(--bg-primary))", zIndex: 2, pointerEvents: "none" }} />
      </section>

      {/* ──────────────────────────────────────────────────────────
          2. BRAND STORY
          ────────────────────────────────────────────────────────── */}
      <section id="story" style={{ padding: "110px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }} className="brand-story-grid">
          <div className="fade-in-left" style={{ order: isRtl ? 2 : 1 }}>
            <span className="section-tag">{T("storyTag")}</span>
            <h2 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: 8, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              {T("storyTitle1")} <br />
              <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("storyTitle2")}</span>
            </h2>
            <div className="section-divider" style={{ margin: "24px 0" }} />
            <p style={{ fontSize: "1rem", lineHeight: 1.9, color: "var(--text-secondary)", marginBottom: 18 }}>{T("storyP1")}</p>
            <p style={{ fontSize: "1rem", lineHeight: 1.9, color: "var(--text-secondary)", marginBottom: 36 }}>{T("storyP2")}</p>
            <button onClick={() => scrollTo("brands")} className="btn-primary">{T("storyBtn")} <ArrowIcon rtl={isRtl} /></button>
          </div>
          <div className="fade-in-right" style={{ position: "relative", order: isRtl ? 1 : 2 }}>
            {/* Decorative background swatch */}
            <div style={{ position: "absolute", top: -24, [isRtl ? "left" : "right"]: -24, width: "100%", height: "100%", borderRadius: "var(--radius-xl)", background: "var(--gradient-warm)", zIndex: 0 }} />
            <div className="decorative-dots" style={{ position: "absolute", top: -24, [isRtl ? "left" : "right"]: -24, width: "60%", height: "60%", borderRadius: "var(--radius-xl)", zIndex: 0, opacity: 0.5 }} />
            <div style={{ position: "relative", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-hover)", aspectRatio: "4/5", zIndex: 1 }}>
              <Image src="/brand-story.png" alt="Halahello brand story" fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
            {/* Floating pull-quote card */}
            <div style={{
              position: "absolute", bottom: -24, [isRtl ? "right" : "left"]: -24, zIndex: 2,
              background: "var(--card-bg)", borderRadius: "var(--radius-md)",
              padding: "20px 24px", boxShadow: "var(--shadow-hover)",
              border: "1px solid rgba(207,161,141,0.15)", maxWidth: 220,
            }}>
              <QuoteIcon />
              <p style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "0.9rem", fontStyle: isRtl ? "normal" : "italic", color: "var(--text-primary)", lineHeight: 1.6, marginTop: 8 }}>
                {isRtl ? "حيث الأناقة تلتقي بالإبداع" : "Where elegance meets creativity"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          2.5 PROMOTIONS
          ────────────────────────────────────────────────────────── */}
      {promotions.length > 0 && (
        <section style={{ padding: "60px 24px", background: "var(--bg-secondary)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span className="section-tag">{isRtl ? "عروض حصرية" : "Exclusive Offers"}</span>
              <h2 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 600 }}>
                {isRtl ? "لا تفوّت هذه الفرصة" : "Don't miss out"}
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              {promotions.map((promo, i) => (
                <div key={promo._id} className="fade-in-section luxury-card" style={{ overflow: "hidden", transitionDelay: `${i * 100}ms` }}>
                  {promo.bannerImageUrl && (
                    <div style={{ position: "relative", height: 180, width: "100%" }}>
                      <Image src={promo.bannerImageUrl} alt={promo.title} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 50vw" />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(58,46,42,0.7), transparent)" }} />
                      <span style={{
                        position: "absolute", bottom: 16, [isRtl ? "right" : "left"]: 16,
                        background: "var(--gradient-luxury)", color: "#fff",
                        fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em",
                        textTransform: isRtl ? "none" : "uppercase",
                        padding: "5px 12px", borderRadius: "var(--radius-full)",
                      }}>
                        {promo.isFlashSale ? (isRtl ? "⚡ تخفيض سريع" : "⚡ Flash Sale") : (isRtl ? "عرض حصري" : "Limited Time")}
                      </span>
                    </div>
                  )}
                  <div style={{ padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
                      <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {isRtl && promo.titleAr ? promo.titleAr : promo.title}
                      </h3>
                      <span style={{ background: "rgba(207,161,141,0.15)", color: "var(--accent)", padding: "5px 12px", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap", border: "1px solid rgba(207,161,141,0.25)" }}>
                        {promo.discountType === "PERCENTAGE" ? `${promo.discountValue}% OFF` : `${promo.discountValue} OFF`}
                      </span>
                    </div>
                    {(promo.description || promo.descriptionAr) && (
                      <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: 18, lineHeight: 1.7 }}>
                        {isRtl && promo.descriptionAr ? promo.descriptionAr : promo.description}
                      </p>
                    )}
                    <Link href={`/${lang}/offers`} className="btn-primary" style={{ fontSize: "0.82rem", padding: "10px 20px" }}>
                      {isRtl ? "اكتشف العرض" : "View Offer"} <ArrowIcon rtl={isRtl} size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────
          3. BRAND DIVISIONS
          ────────────────────────────────────────────────────────── */}
      <section id="brands" style={{ padding: "110px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <span className="fade-in-section section-tag">{T("brandsTag")}</span>
          <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: 12, letterSpacing: "-0.02em" }}>
            {T("brandsTitle")}
          </h2>
          <div className="section-divider" />
          <p className="fade-in-section" style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 540, margin: "0 auto 64px", lineHeight: 1.8 }}>{T("brandsDesc")}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="brands-grid">
            {/* Hijab card */}
            <div className="brand-card fade-in-left">
              <div style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden", margin: "0 auto 28px", boxShadow: "var(--shadow-glow-sm)" }}>
                <Image src="/products/hijab/logo of hijab.jpg" alt="Hijab by Halahello" width={88} height={88} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
              </div>
              <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.7rem", fontWeight: 600, marginBottom: 16 }}>
                {T("hijabBy")} <span style={{ fontStyle: isRtl ? "normal" : "italic", fontWeight: 400 }}>{T("hijabByTag")}</span>
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 32, lineHeight: 1.8, fontSize: "0.95rem" }}>{T("hijabDesc")}</p>
              <button onClick={() => scrollTo("hijab-products")} className="btn-primary">
                {T("hijabBtn")} <ArrowIcon rtl={isRtl} />
              </button>
            </div>

            {/* Plexi card */}
            <div className="brand-card fade-in-right">
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--gradient-luxury)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", fontSize: "2.4rem", boxShadow: "var(--shadow-glow-sm)" }}>✦</div>
              <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.7rem", fontWeight: 600, marginBottom: 16 }}>
                {T("plexiBy")} <span style={{ fontStyle: isRtl ? "normal" : "italic", fontWeight: 400 }}>{T("plexiByTag")}</span>
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 32, lineHeight: 1.8, fontSize: "0.95rem" }}>{T("plexiDesc")}</p>
              <button onClick={() => scrollTo("plexi-products")} className="btn-secondary">
                {T("plexiBtn")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          4. HIJAB PRODUCTS
          ────────────────────────────────────────────────────────── */}
      <section id="hijab-products" style={{ padding: "110px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span className="fade-in-section section-tag">{T("hijabTag")}</span>
          <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: 12, letterSpacing: "-0.02em" }}>
            {T("hijabTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("hijabTitle2")}</span>
          </h2>
          <div className="section-divider" />
          <p className="fade-in-section" style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto" }}>{T("hijabSub")}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 28 }} className="product-grid">
          {productsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="product-card skeleton" style={{ aspectRatio: "3/4", animationDelay: `${i * 80}ms` }} aria-hidden="true" />
              ))
            : hijabProducts.length === 0
            ? <p style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--text-secondary)", padding: "80px 0", fontStyle: "italic" }}>
                {isRtl ? "لا توجد منتجات حجاب متاحة حالياً" : "No hijab products available yet. Check back soon!"}
              </p>
            : hijabProducts.map((p, i) => {
                const dbProduct = dbProducts.find((db) => db.sanityId === p.sanityId);
                const productName = isRtl && p.titleAr ? p.titleAr : p.title;
                const isOutOfStock = dbProduct?.stock === 0;

                return (
                  <div key={p._id} className="product-card fade-in-section" style={{ transitionDelay: `${i * 80}ms` }}>
                    <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
                      {/* Image */}
                      <Link href={`/${lang}/products/${p.sanityId}`} aria-label={productName} tabIndex={0}>
                        <Image src={p.imageUrl} alt={productName} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 50vw, 25vw" />
                      </Link>

                      {/* Sold-out ribbon */}
                      {isOutOfStock && (
                        <span className="sold-out-ribbon">{isRtl ? "نفد المخزون" : "Sold Out"}</span>
                      )}

                      {/* New / bestseller badge */}
                      {!isOutOfStock && p.isNew && (
                        <span className="product-badge">{isRtl ? "جديد" : "New"}</span>
                      )}
                      {!isOutOfStock && p.isBestSeller && !p.isNew && (
                        <span className="product-badge">{isRtl ? "الأكثر مبيعاً" : "Bestseller"}</span>
                      )}

                      {/* Wishlist button */}
                      <div style={{ position: "absolute", top: 12, [isRtl ? "left" : "right"]: 12, zIndex: 3 }}>
                        <WishlistButton productId={p._id} />
                      </div>

                      {/* Hover overlay */}
                      <div className="product-card-overlay">
                        <Link
                          href={`/${lang}/products/${p.sanityId}`}
                          className="btn-secondary"
                          style={{ flex: 1, fontSize: "0.78rem", padding: "8px 12px", color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}
                        >
                          {isRtl ? "عرض" : "View"}
                        </Link>
                        {!isOutOfStock && (
                          <button
                            onClick={() => handleAddToCart(p, dbProduct)}
                            className="btn-primary"
                            style={{ flex: 1, fontSize: "0.78rem", padding: "8px 12px" }}
                          >
                            <CartIcon /> {isRtl ? "أضف" : "Add"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ padding: "20px 24px", textAlign: "center" }}>
                      <Link href={`/${lang}/products/${p.sanityId}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.05rem", fontWeight: 500, marginBottom: 4, transition: "color var(--transition-base)" }}
                          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--accent)")}
                          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
                        >
                          {productName}
                        </h3>
                      </Link>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 500, letterSpacing: isRtl ? 0 : "0.08em", display: "block", marginBottom: 14 }}>
                        {T("hijabByLine")}
                      </span>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid rgba(207,161,141,0.12)" }}>
                        <div>
                          {p.discountPrice ? (
                            <>
                              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>
                                {dbProduct ? dbProduct.price : p.discountPrice} SYP
                              </span>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textDecoration: "line-through", marginInlineStart: 8 }}>
                                {p.price} SYP
                              </span>
                            </>
                          ) : (
                            <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>
                              {dbProduct ? dbProduct.price : p.price} SYP
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddToCart(p, dbProduct)}
                          className="btn-primary"
                          style={{ padding: "8px 16px", fontSize: "0.78rem" }}
                          disabled={isOutOfStock}
                        >
                          {isRtl ? "أضف" : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* View All Button */}
        {!productsLoading && hijabProducts.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 56 }}>
            <Link href={`/${lang}/products`} className="btn-secondary float-animation">
              {isRtl ? "عرض كل منتجات الحجاب" : "View All Hijab Products"} <ArrowIcon rtl={isRtl} />
            </Link>
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────
          5. PLEXI PRODUCTS
          ────────────────────────────────────────────────────────── */}
      <section id="plexi-products" style={{ padding: "110px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="fade-in-section section-tag">{T("plexiTag")}</span>
            <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {T("plexiTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("plexiTitle2")}</span>
            </h2>
            <div className="section-divider" />
            <p className="fade-in-section" style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto" }}>{T("plexiSub")}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 28 }} className="product-grid">
            {productsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="product-card skeleton" style={{ aspectRatio: "1", animationDelay: `${i * 80}ms` }} aria-hidden="true" />
                ))
              : plexiProducts.length === 0
              ? <p style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--text-secondary)", padding: "80px 0", fontStyle: "italic" }}>
                  {isRtl ? "لا توجد منتجات بليكسي متاحة حالياً" : "No plexi products available yet. Check back soon!"}
                </p>
              : plexiProducts.map((p, i) => {
                  const dbProduct = dbProducts.find((db) => db.sanityId === p.sanityId);
                  const productName = isRtl && p.titleAr ? p.titleAr : p.title;
                  const isOutOfStock = dbProduct?.stock === 0;

                  return (
                    <div key={p._id} className="product-card plexi-card fade-in-section" style={{ transitionDelay: `${i * 80}ms` }}>
                      <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden" }}>
                        <Link href={`/${lang}/products/${p.sanityId}`} aria-label={productName} tabIndex={0}>
                          <Image src={p.imageUrl} alt={productName} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 50vw, 33vw" />
                        </Link>
                        {isOutOfStock && <span className="sold-out-ribbon">{isRtl ? "نفد المخزون" : "Sold Out"}</span>}
                        {!isOutOfStock && p.isNew && <span className="product-badge">{isRtl ? "جديد" : "New"}</span>}
                        
                        {/* Wishlist button */}
                        <div style={{ position: "absolute", top: 12, [isRtl ? "left" : "right"]: 12, zIndex: 3 }}>
                          <WishlistButton productId={p._id} />
                        </div>
                        <div className="product-card-overlay">
                          <Link href={`/${lang}/products/${p.sanityId}`} className="btn-secondary" style={{ flex: 1, fontSize: "0.78rem", padding: "8px 12px", color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}>
                            {isRtl ? "عرض" : "View"}
                          </Link>
                          {!isOutOfStock && (
                            <button onClick={() => handleAddToCart(p, dbProduct)} className="btn-primary" style={{ flex: 1, fontSize: "0.78rem", padding: "8px 12px" }}>
                              <CartIcon /> {isRtl ? "أضف" : "Add"}
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: "20px 24px", textAlign: "center" }}>
                        <Link href={`/${lang}/products/${p.sanityId}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.05rem", fontWeight: 500, marginBottom: 4, transition: "color var(--transition-base)" }}
                            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--accent)")}
                            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
                          >{productName}</h3>
                        </Link>
                        <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 500, letterSpacing: isRtl ? 0 : "0.08em", display: "block", marginBottom: 14 }}>{T("plexiByLine")}</span>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid rgba(207,161,141,0.12)" }}>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>{dbProduct ? dbProduct.price : p.price} SYP</span>
                          <button onClick={() => handleAddToCart(p, dbProduct)} className="btn-secondary" style={{ padding: "8px 16px", fontSize: "0.78rem" }} disabled={isOutOfStock}>
                            {isRtl ? "أضف" : "Add"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>

          {/* View All Button */}
          {!productsLoading && plexiProducts.length > 0 && (
            <div style={{ textAlign: "center", marginTop: 56 }}>
              <Link href={`/${lang}/products`} className="btn-secondary float-animation">
                {isRtl ? "عرض كل منتجات بلكسي" : "View All Plexi Products"} <ArrowIcon rtl={isRtl} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          5.5 WHY CHOOSE US
          ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "110px 24px", background: "var(--bg-primary)", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="fade-in-section section-tag">{isRtl ? "لماذا هالاهيلو" : "Why Halahello"}</span>
            <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, letterSpacing: "-0.02em" }}>
              {isRtl ? "ما يجعلنا " : "What Makes Us "}
              <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{isRtl ? "مميزين" : "Special"}</span>
            </h2>
            <div className="section-divider" />
          </div>

          <div className="reveal-stagger" style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
            {/* Connecting Vertical Line */}
            <div style={{
              position: "absolute",
              top: 40,
              bottom: 40,
              [isRtl ? "right" : "left"]: 40,
              width: 2,
              background: "linear-gradient(to bottom, rgba(207,161,141,0.1), var(--accent), rgba(207,161,141,0.1))",
              zIndex: 0,
            }} className="max-sm:hidden" />

            <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative", zIndex: 1 }}>
              {WHY_US_PILLARS.map((pillar, i) => {
                const isActive = activeWhyUs === i;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveWhyUs(isActive ? null : i)}
                    className="luxury-card"
                    style={{ 
                      padding: "24px", 
                      cursor: "pointer",
                      border: isActive ? "1px solid var(--accent)" : "1px solid rgba(207,161,141,0.15)",
                      transition: "all var(--transition-base)",
                      transform: isActive ? "scale(1.02)" : "scale(1)",
                      boxShadow: isActive ? "0 12px 32px rgba(207, 161, 141, 0.15)" : "var(--shadow-soft)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                        background: isActive ? "var(--accent)" : "rgba(207,161,141,0.1)", 
                        color: isActive ? "#fff" : "var(--accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.4rem", transition: "all var(--transition-base)",
                      }}>
                        {pillar.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", 
                          fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)",
                          display: "flex", alignItems: "center", justifyContent: "space-between"
                        }}>
                          {isRtl ? pillar.titleAr : pillar.titleEn}
                          <span style={{ 
                            fontSize: "1.5rem", fontWeight: 300, color: "var(--accent)",
                            transform: isActive ? "rotate(45deg)" : "rotate(0deg)",
                            transition: "transform var(--transition-base)"
                          }}>+</span>
                        </h3>
                        
                        {/* Expandable Content */}
                        <div style={{
                          maxHeight: isActive ? 200 : 0,
                          opacity: isActive ? 1 : 0,
                          overflow: "hidden",
                          transition: "all 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                        }}>
                          <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.7, marginTop: 12 }}>
                            {isRtl ? pillar.descAr : pillar.descEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          6. CUSTOM ORDERS
          ────────────────────────────────────────────────────────── */}
      <section id="custom-orders" style={{ padding: "110px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <span className="fade-in-section section-tag">{T("customTag")}</span>
          <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: 12, letterSpacing: "-0.02em" }}>
            {T("customTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("customTitle2")}</span>
          </h2>
          <div className="section-divider" />
          <p className="fade-in-section" style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto", lineHeight: 1.8 }}>{T("customDesc")}</p>
        </div>
        <div className="fade-in-section luxury-card" style={{ padding: "48px 44px" }}>
          <form onSubmit={handleCustomOrderSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="custom-form-grid">
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: "0.83rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.04em" }}>{T("formName")}</label>
              <input name="name" className="form-input" type="text" placeholder={T("formNamePh")} required />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: "0.83rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.04em" }}>{T("formEmail")}</label>
              <input name="email" className="form-input" type="email" placeholder={T("formEmailPh")} required />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: "0.83rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.04em" }}>{T("formColor")}</label>
              <input name="color" className="form-input" type="text" placeholder={T("formColorPh")} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: "0.83rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.04em" }}>{T("formOccasion")}</label>
              <input name="occasion" className="form-input" type="text" placeholder={T("formOccasionPh")} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: "0.83rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.04em" }}>{T("formMsg")}</label>
              <textarea name="message" className="form-input" rows={4} placeholder={T("formMsgPh")} style={{ resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1 / -1", textAlign: "center", marginTop: 8 }}>
              <button type="submit" className="btn-primary" style={{ padding: "16px 52px", fontSize: "1rem", opacity: customOrderLoading ? 0.75 : 1, cursor: customOrderLoading ? "not-allowed" : "pointer" }} disabled={customOrderLoading}>
                {customOrderLoading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.75s linear infinite" }} />
                    {isRtl ? "جارٍ الإرسال…" : "Sending…"}
                  </span>
                ) : <>{T("formBtn")} <ArrowIcon rtl={isRtl} /></>}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          7. INSTAGRAM
          ────────────────────────────────────────────────────────── */}
      <section id="instagram" style={{ padding: "110px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <span className="fade-in-section section-tag">{T("instaTag")}</span>
            <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {T("instaTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("instaTitle2")}</span>
            </h2>
            <div className="section-divider" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="insta-grid">
            {instaLoading
              ? Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="insta-item skeleton" style={{ animationDelay: `${i * 80}ms` }} aria-hidden="true" />
                ))
              : instaPosts.length > 0
              ? instaPosts.map((post, i) => (
                  <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer"
                    className="insta-item fade-in-section" style={{ transitionDelay: `${i * 60}ms` }} aria-label="View on Instagram">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.media_type === "VIDEO" ? (post.thumbnail_url ?? post.media_url) : post.media_url}
                      alt={`Halahello Instagram post ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    <div className="insta-overlay"><InstagramIcon /></div>
                  </a>
                ))
              : STATIC_INSTAGRAM_IMAGES.map((img, i) => (
                  <a key={i} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                    className="insta-item fade-in-section" style={{ transitionDelay: `${i * 60}ms` }} aria-label="Visit Halahello on Instagram">
                    <Image src={img} alt={`Halahello ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 33vw, 20vw" />
                    <div className="insta-overlay" style={{ color: "white" }}><InstagramIcon /></div>
                  </a>
                ))
            }
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow Halahello on Instagram"
              className="btn-ghost" style={{ fontSize: "0.9rem", padding: "12px 28px" }}>
              <InstagramIcon /> @halahelloo
            </a>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          8. TESTIMONIALS
          ────────────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: "110px 24px", background: "var(--bg-primary)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="fade-in-section section-tag">{T("testTag")}</span>
            <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {T("testTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("testTitle2")}</span>
            </h2>
            <div className="section-divider" />
          </div>

          <div className="fade-in-section" style={{ position: "relative", minHeight: 280 }}>
            {testimonialData.map((tm, i) => (
              <div key={i} className="testimonial-card" style={{
                position: i === activeTestimonial ? "relative" : "absolute",
                top: 0, left: 0, right: 0,
                opacity: i === activeTestimonial ? 1 : 0,
                transform: i === activeTestimonial ? "translateY(0)" : "translateY(20px)",
                transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                pointerEvents: i === activeTestimonial ? "auto" : "none",
                textAlign: "center",
              }}>
                {/* Avatar */}
                {tm.avatarUrl ? (
                  <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", margin: "0 auto 20px", border: "3px solid var(--accent)", boxShadow: "var(--shadow-glow-sm)" }}>
                    <Image src={tm.avatarUrl} alt={tm.author} width={64} height={64} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                  </div>
                ) : (
                  <div style={{ margin: "0 auto 20px" }}><QuoteIcon /></div>
                )}

                {/* Stars */}
                <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 20 }}>
                  {[...Array(5)].map((_, j) => <StarIcon key={j} filled={j < (tm.rating || 5)} />)}
                </div>

                {/* Verified badge */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(207,161,141,0.1)", color: "var(--accent)", padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: "0.68rem", fontWeight: 700 }}>
                    <CheckIcon /> {isRtl ? "مشتري موثق" : "Verified Purchase"}
                  </span>
                </div>

                <p style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(1rem, 2vw, 1.2rem)", fontStyle: isRtl ? "normal" : "italic", lineHeight: 1.75, color: "var(--text-primary)", marginBottom: 24, maxWidth: 580, marginLeft: "auto", marginRight: "auto" }}>
                  &ldquo;{tm.text}&rdquo;
                </p>
                <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{tm.author}</p>
                {tm.product && <p style={{ fontSize: "0.83rem", color: "var(--accent)" }}>{tm.product}</p>}
              </div>
            ))}

            {/* Dots */}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 40 }}>
              {testimonialData.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  aria-label={`Show testimonial ${i + 1}`}
                  aria-current={i === activeTestimonial ? "true" : undefined}
                  style={{ width: i === activeTestimonial ? 32 : 10, height: 10, borderRadius: "var(--radius-full)", background: i === activeTestimonial ? "var(--gradient-luxury)" : "var(--highlight)", border: "none", cursor: "pointer", transition: "all 0.3s ease", padding: 0 }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          9. CTA BANNER
          ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "110px 24px", background: "linear-gradient(135deg, var(--bg-secondary), var(--highlight))", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Decorative dots */}
        <div className="decorative-dots" style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ maxWidth: 700, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 600, marginBottom: 24, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            {T("ctaTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("ctaTitle2")}</span>
          </h2>
          <p className="fade-in-section" style={{ fontSize: "1.05rem", color: "var(--text-secondary)", marginBottom: 44, lineHeight: 1.8 }}>{T("ctaDesc")}</p>
          <div className="fade-in-section" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("hijab-products")} className="btn-primary float-animation">{T("ctaBtnHijab")}</button>
            <button onClick={() => scrollTo("custom-orders")} className="btn-secondary float-animation-delay">{T("ctaBtnPlexi")}</button>
            <button onClick={() => scrollTo("contact")} className="btn-ghost">{T("ctaBtnContact")}</button>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          10. CONTACT
          ────────────────────────────────────────────────────────── */}
      <section id="contact" style={{ padding: "110px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <span className="fade-in-section section-tag">{T("contactTag")}</span>
          <h2 className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, marginBottom: 12, letterSpacing: "-0.02em" }}>
            {T("contactTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("contactTitle2")}</span>
          </h2>
          <div className="section-divider" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="contact-grid">
          {/* Form */}
          <div className="fade-in-left luxury-card" style={{ padding: "40px 36px" }}>
            <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.4rem", marginBottom: 28 }}>{T("contactFormTitle")}</h3>
            <form onSubmit={handleContactSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <input name="name" className="form-input" type="text" placeholder={T("contactNamePh")} required />
              <input name="email" className="form-input" type="email" placeholder={T("contactEmailPh")} required />
              <textarea name="message" className="form-input" rows={4} placeholder={T("contactMsgPh")} style={{ resize: "vertical" }} required />
              <button type="submit" className="btn-primary" style={{ alignSelf: isRtl ? "flex-end" : "flex-start", opacity: contactLoading ? 0.75 : 1, cursor: contactLoading ? "not-allowed" : "pointer" }} disabled={contactLoading}>
                {contactLoading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.75s linear infinite" }} />
                    {isRtl ? "جارٍ الإرسال…" : "Sending…"}
                  </span>
                ) : T("contactSendBtn")}
              </button>
            </form>
          </div>

          {/* Info */}
          <div className="fade-in-right" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="luxury-card" style={{ padding: "32px" }}>
              <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.2rem", marginBottom: 12 }}>{T("contactConnectTitle")}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 20, fontSize: "0.95rem" }}>{T("contactConnectDesc")}</p>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--accent)", fontWeight: 600, textDecoration: "none", fontSize: "0.95rem", transition: "opacity var(--transition-base)" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "0.7")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "1")}
              >
                <InstagramIcon /> @halahelloo
              </a>
            </div>
            <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="whatsapp-btn" style={{ justifyContent: "center" }}>
              <WhatsAppIcon />{T("contactWhatsapp")}
            </a>
            <div className="luxury-card" style={{ padding: "32px" }}>
              <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.2rem", marginBottom: 12 }}>{T("contactInfoTitle")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                <p>{T("contactInfo1")}</p><p>{T("contactInfo2")}</p><p>{T("contactInfo3")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          11. FOOTER
          ────────────────────────────────────────────────────────── */}
      <footer style={{ background: "var(--footer-bg)", color: "var(--footer-text)", padding: "64px 24px 32px" }}>
        {/* Top accent line */}
        <div style={{ height: 3, background: "var(--gradient-luxury)", marginBottom: 64, maxWidth: 1200, margin: "0 auto 64px", borderRadius: "var(--radius-full)" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48 }} className="footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 600 }}>Hala</span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 400, fontStyle: "italic", color: "var(--accent)" }}>hello</span>
            </div>
            <p style={{ opacity: 0.6, lineHeight: 1.8, fontSize: "0.9rem", maxWidth: 280 }}>{T("footerDesc")}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--footer-text)", transition: "all var(--transition-base)", textDecoration: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                <InstagramIcon />
              </a>
              <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--footer-text)", transition: "all var(--transition-base)", textDecoration: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#25D366"; (e.currentTarget as HTMLElement).style.borderColor = "#25D366"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                <WhatsAppIcon />
              </a>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: isRtl ? "none" : "uppercase", marginBottom: 24, opacity: 0.5, fontFamily: "var(--font-body)" }}>{T("footerExplore")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {([[T("footerHijabLink"), "hijab-products"], [T("footerPlexiLink"), "plexi-products"], [T("footerCustomLink"), "custom-orders"], [T("footerStoryLink"), "story"]] as [string, string][]).map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: "var(--footer-text)", opacity: 0.65, cursor: "pointer", fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.9rem", textAlign: isRtl ? "right" : "left", padding: 0, transition: "opacity var(--transition-base)" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "0.65")}
                >{label}</button>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: isRtl ? "none" : "uppercase", marginBottom: 24, opacity: 0.5, fontFamily: "var(--font-body)" }}>{T("footerConnect")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[["Instagram", INSTAGRAM_URL], ["WhatsApp", "https://wa.me/1234567890"], [isRtl ? "البريد" : "Email", "mailto:hello@halahello.com"]] .map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--footer-text)", opacity: 0.65, textDecoration: "none", fontSize: "0.9rem", transition: "opacity var(--transition-base)" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "0.65")}
                >{label}</a>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: isRtl ? "none" : "uppercase", marginBottom: 24, opacity: 0.5, fontFamily: "var(--font-body)" }}>{T("footerSupport")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[T("footerContactUs"), T("footerShipping"), T("footerReturns"), T("footerFaq")].map((label) => (
                <button key={label} onClick={() => scrollTo("contact")} style={{ background: "none", border: "none", color: "var(--footer-text)", opacity: 0.65, cursor: "pointer", fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.9rem", textAlign: isRtl ? "right" : "left", padding: 0, transition: "opacity var(--transition-base)" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "1")}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "0.65")}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "52px auto 0", paddingTop: 28, borderTop: "1px solid rgba(250,247,245,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <p style={{ opacity: 0.45, fontSize: "0.82rem" }}>{T("footerCopyright")}</p>
          <p style={{ opacity: 0.35, fontSize: "0.78rem", fontStyle: "italic" }}>{T("footerDesigned")}</p>
        </div>
      </footer>

      {/* ──────────────────────────────────────────────────────────
          RESPONSIVE STYLES
          ────────────────────────────────────────────────────────── */}
      <style jsx>{`
        .brand-story-grid { grid-template-columns: 1fr 1fr; }
        .brands-grid { grid-template-columns: 1fr 1fr; }
        .product-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        .insta-grid { grid-template-columns: repeat(3, 1fr); }
        .contact-grid { grid-template-columns: 1fr 1fr; }
        .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; }
        .custom-form-grid { grid-template-columns: 1fr 1fr; }
        .desktop-nav-links { display: flex; }
        .mobile-menu-btn { display: none; }

        @media (max-width: 1024px) {
          .desktop-nav-links { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }

        @media (max-width: 768px) {
          .brand-story-grid { grid-template-columns: 1fr !important; gap: 60px !important; }
          .brands-grid { grid-template-columns: 1fr !important; }
          .product-grid { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
          .insta-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .custom-form-grid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 480px) {
          .product-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .insta-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ──────────────────────────────────────────────────────────
          TOAST NOTIFICATION
          ────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, [isRtl ? "left" : "right"]: 32, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 12,
          background: toast.type === "success"
            ? "linear-gradient(135deg, #3A2E2A 0%, #6B5B55 100%)"
            : "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
          color: "white", padding: "16px 20px", borderRadius: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
          animation: "slideInToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          maxWidth: 380, fontSize: "0.9rem", lineHeight: 1.5,
        }}>
          <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{toast.type === "success" ? "✨" : "❌"}</span>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, padding: "0 0 0 8px", flexShrink: 0 }}>×</button>
        </div>
      )}
    </>
  );
}
