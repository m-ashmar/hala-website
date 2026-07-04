"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Lang, tr } from "../translations";

/* ═══════════════════════════════════════════════════
   SVG Icons
   ═══════════════════════════════════════════════════ */
const InstagramIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#CFA18D" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ArrowIcon = ({ rtl }: { rtl: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={rtl ? { transform: "scaleX(-1)" } : {}}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const QuoteIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CFA18D" strokeWidth="1" opacity="0.4">
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" fill="#CFA18D" fillOpacity="0.15" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" fill="#CFA18D" fillOpacity="0.15" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

/* ═══════════════════════════════════════════════════
   Scroll Animation Hook
   ═══════════════════════════════════════════════════ */
function useScrollAnimation() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".fade-in-section, .fade-in-left, .fade-in-right").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ═══════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════ */
const INSTAGRAM_URL = "https://instagram.com/halahelloo";

const hijabProducts = [
  { nameKey: "prodHijab1" as const, image: "/products/hijab/hijab-a1.avif" },
  { nameKey: "prodHijab2" as const, image: "/products/hijab/hijab-b1.jpg" },
  { nameKey: "prodHijab3" as const, image: "/products/hijab/hijab-c1.jpg" },
  { nameKey: "prodHijab4" as const, image: "/products/hijab/hijab-d.PNG" },
];

const plexiProducts = [
  { nameKey: "prodPlexi1" as const, image: "/products/plexi/a1.webp" },
  { nameKey: "prodPlexi2" as const, image: "/products/plexi/a2.webp" },
  { nameKey: "prodPlexi3" as const, image: "/products/plexi/a3.webp" },
  { nameKey: "prodPlexi4" as const, image: "/products/plexi/a4.webp" },
  { nameKey: "prodPlexi5" as const, image: "/products/plexi/a5.webp" },
  { nameKey: "prodPlexi6" as const, image: "/products/plexi/b1.webp" },
];

const instagramImages = [
  "/products/hijab/hijab.jpg", "/products/plexi/c1.jpg", "/products/hijab/hijab-a1.avif",
  "/products/plexi/d1.jpg", "/products/plexi/e1.jpg", "/products/hijab/hijab-b1.jpg",
  "/products/plexi/f1.webp", "/products/plexi/b2.webp", "/products/hijab/hijab-c1.jpg",
];

/* ═══════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════ */
export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const isRtl = lang === "ar";
  const T = (key: Parameters<typeof tr>[0]) => tr(key, lang);

  useScrollAnimation();

  // Set html dir and lang
  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActiveTestimonial((p) => (p + 1) % 4), 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleLang = () => setLang((l) => (l === "en" ? "ar" : "en"));

  const navItems: [string, string][] = [
    [T("navStory"), "story"], [T("navCollections"), "brands"], [T("navHijabs"), "hijab-products"],
    [T("navPlexi"), "plexi-products"], [T("navCustom"), "custom-orders"], [T("navContact"), "contact"],
  ];

  const testimonials = [
    { text: T("test1"), author: T("test1Author"), product: T("test1Product") },
    { text: T("test2"), author: T("test2Author"), product: T("test2Product") },
    { text: T("test3"), author: T("test3Author"), product: T("test3Product") },
    { text: T("test4"), author: T("test4Author"), product: T("test4Product") },
  ];

  return (
    <>
      {/* ── Navigation ── */}
      <nav className={`navbar ${navScrolled ? "scrolled" : ""}`}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => scrollTo("hero")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-heading)", fontSize: "1.6rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.02em" }}>
            {isRtl ? "هالاهيلو" : "Halahello"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="hidden md:flex">
            {navItems.map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)", letterSpacing: isRtl ? "0" : "0.04em", textTransform: isRtl ? "none" as const : "uppercase" as const, transition: "color 0.3s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>{label}</button>
            ))}
            <button onClick={toggleLang} className="lang-toggle"><GlobeIcon />{isRtl ? "EN" : "عربي"}</button>
          </div>
          <div className="md:hidden" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={toggleLang} className="lang-toggle"><GlobeIcon />{isRtl ? "EN" : "عربي"}</button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", padding: 8 }}>{mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}</button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div style={{ position: "fixed", inset: 0, top: 60, background: "rgba(250,247,245,0.98)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, zIndex: 999 }}>
            {navItems.map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.4rem", color: "var(--text-primary)", fontWeight: 500 }}>{label}</button>
            ))}
          </div>
        )}
      </nav>

      {/* ── 1. HERO ── */}
      <section id="hero" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Image src="/hero-bg.png" alt="HalaHello" fill priority style={{ objectFit: "cover", objectPosition: "center" }} sizes="100vw" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(250,247,245,0.88) 0%, rgba(246,237,238,0.75) 40%, rgba(250,247,245,0.6) 100%)", zIndex: 1 }} />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 800, padding: "0 24px" }}>
          <span style={{ display: "inline-block", fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.8rem", fontWeight: 500, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", marginBottom: 12 }}>{T("heroTag")}</span>
          <h1 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 20, lineHeight: 1.05, letterSpacing: "-0.02em" }}>{T("heroTitle")}</h1>
          <p style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)", fontWeight: 400, fontStyle: isRtl ? "normal" : "italic", color: "var(--text-secondary)", marginBottom: 12, letterSpacing: "0.02em" }}>{T("heroSub")}</p>
          <p style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)", color: "var(--text-secondary)", marginBottom: 40, maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>{T("heroDesc")}</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("hijab-products")} className="btn-primary float-animation">{T("heroBtnHijab")} <ArrowIcon rtl={isRtl} /></button>
            <button onClick={() => scrollTo("plexi-products")} className="btn-secondary float-animation-delay">{T("heroBtnPlexi")}</button>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 120, background: "linear-gradient(to bottom, transparent, var(--bg-primary))", zIndex: 2 }} />
      </section>

      {/* ── 2. BRAND STORY ── */}
      <section id="story" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="brand-story-grid">
          <div className="fade-in-left" style={{ order: isRtl ? 2 : 1 }}>
            <span style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", display: "block", marginBottom: 16 }}>{T("storyTag")}</span>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, marginBottom: 24, lineHeight: 1.15 }}>{T("storyTitle1")} <br /><span style={{ fontStyle: isRtl ? "normal" : "italic", color: "var(--accent)" }}>{T("storyTitle2")}</span></h2>
            <div className="section-divider" style={{ margin: "0 0 24px 0" }} />
            <p style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--text-secondary)", marginBottom: 16 }}>{T("storyP1")}</p>
            <p style={{ fontSize: "1rem", lineHeight: 1.85, color: "var(--text-secondary)", marginBottom: 32 }}>{T("storyP2")}</p>
            <button onClick={() => scrollTo("brands")} className="btn-primary">{T("storyBtn")}</button>
          </div>
          <div className="fade-in-right" style={{ position: "relative", order: isRtl ? 1 : 2 }}>
            <div style={{ position: "absolute", top: -20, [isRtl ? "left" : "right"]: -20, width: "100%", height: "100%", borderRadius: "var(--radius-lg)", background: "linear-gradient(135deg, var(--highlight), var(--bg-secondary))", zIndex: 0 }} />
            <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-card)", aspectRatio: "4/5", zIndex: 1 }}>
              <Image src="/brand-story.png" alt="Halahello brand story" fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. BRAND DIVISIONS ── */}
      <section id="brands" style={{ padding: "100px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <span className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", display: "block", marginBottom: 16 }}>{T("brandsTag")}</span>
          <h2 className="fade-in-section" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, marginBottom: 12 }}>{T("brandsTitle")}</h2>
          <div className="section-divider" />
          <p className="fade-in-section" style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto 60px", lineHeight: 1.7 }}>{T("brandsDesc")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="brands-grid">
            <div className="brand-card fade-in-left">
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, var(--highlight), var(--bg-secondary))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", overflow: "hidden" }}>
                <Image src="/products/hijab/logo of hijab.jpg" alt="Hijab by Halahello" width={80} height={80} style={{ objectFit: "cover", borderRadius: "50%" }} />
              </div>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: 16 }}>{T("hijabBy")} <span style={{ fontStyle: isRtl ? "normal" : "italic", fontWeight: 400 }}>{T("hijabByTag")}</span></h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.7, fontSize: "0.95rem" }}>{T("hijabDesc")}</p>
              <button onClick={() => scrollTo("hijab-products")} className="btn-primary">{T("hijabBtn")}</button>
            </div>
            <div className="brand-card fade-in-right">
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent-light))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "2rem" }}>✦</div>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: 16 }}>{T("plexiBy")} <span style={{ fontStyle: isRtl ? "normal" : "italic", fontWeight: 400 }}>{T("plexiByTag")}</span></h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.7, fontSize: "0.95rem" }}>{T("plexiDesc")}</p>
              <button onClick={() => scrollTo("plexi-products")} className="btn-secondary">{T("plexiBtn")}</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. HIJAB PRODUCTS ── */}
      <section id="hijab-products" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", display: "block", marginBottom: 16 }}>{T("hijabTag")}</span>
          <h2 className="fade-in-section" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, marginBottom: 12 }}>{T("hijabTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic" }}>{T("hijabTitle2")}</span></h2>
          <div className="section-divider" />
          <p className="fade-in-section" style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto" }}>{T("hijabSub")}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }} className="product-grid">
          {hijabProducts.map((p, i) => (
            <div key={p.nameKey} className="product-card fade-in-section" style={{ transitionDelay: `${i * 100}ms` }}>
              <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
                <Image src={p.image} alt={tr(p.nameKey, lang)} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 25vw" />
              </div>
              <div style={{ padding: "20px 24px", textAlign: "center" }}>
                <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.1rem", fontWeight: 500, marginBottom: 4 }}>{tr(p.nameKey, lang)}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 500, letterSpacing: "0.05em" }}>{T("hijabByLine")}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. PLEXI PRODUCTS ── */}
      <section id="plexi-products" style={{ padding: "100px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", display: "block", marginBottom: 16 }}>{T("plexiTag")}</span>
            <h2 className="fade-in-section" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, marginBottom: 12 }}>{T("plexiTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic" }}>{T("plexiTitle2")}</span></h2>
            <div className="section-divider" />
            <p className="fade-in-section" style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto" }}>{T("plexiSub")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 28 }} className="product-grid">
            {plexiProducts.map((p, i) => (
              <div key={p.nameKey} className="product-card plexi-card fade-in-section" style={{ transitionDelay: `${i * 100}ms` }}>
                <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden" }}>
                  <Image src={p.image} alt={tr(p.nameKey, lang)} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <div style={{ padding: "20px 24px", textAlign: "center" }}>
                  <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.1rem", fontWeight: 500, marginBottom: 4 }}>{tr(p.nameKey, lang)}</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 500, letterSpacing: "0.05em" }}>{T("plexiByLine")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CUSTOM ORDERS ── */}
      <section id="custom-orders" style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", display: "block", marginBottom: 16 }}>{T("customTag")}</span>
          <h2 className="fade-in-section" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, marginBottom: 12 }}>{T("customTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic" }}>{T("customTitle2")}</span></h2>
          <div className="section-divider" />
          <p className="fade-in-section" style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>{T("customDesc")}</p>
        </div>
        <div className="fade-in-section" style={{ background: "var(--white)", borderRadius: "var(--radius-lg)", padding: "48px 40px", boxShadow: "var(--shadow-card)", border: "1px solid rgba(207,161,141,0.1)" }}>
          <form onSubmit={(e) => { e.preventDefault(); alert(T("formSuccess")); }} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="custom-form-grid">
            <div><label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>{T("formName")}</label><input className="form-input" type="text" placeholder={T("formNamePh")} required /></div>
            <div><label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>{T("formEmail")}</label><input className="form-input" type="email" placeholder={T("formEmailPh")} required /></div>
            <div><label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>{T("formColor")}</label><input className="form-input" type="text" placeholder={T("formColorPh")} /></div>
            <div><label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>{T("formOccasion")}</label><input className="form-input" type="text" placeholder={T("formOccasionPh")} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>{T("formMsg")}</label><textarea className="form-input" rows={4} placeholder={T("formMsgPh")} style={{ resize: "vertical" }} /></div>
            <div style={{ gridColumn: "1 / -1", textAlign: "center", marginTop: 12 }}><button type="submit" className="btn-primary" style={{ padding: "16px 48px", fontSize: "1rem" }}>{T("formBtn")} <ArrowIcon rtl={isRtl} /></button></div>
          </form>
        </div>
      </section>

      {/* ── 7. INSTAGRAM ── */}
      <section id="instagram" style={{ padding: "100px 24px", background: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <span className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", display: "block", marginBottom: 16 }}>{T("instaTag")}</span>
            <h2 className="fade-in-section" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, marginBottom: 12 }}>{T("instaTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic" }}>{T("instaTitle2")}</span></h2>
            <div className="section-divider" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }} className="insta-grid">
            {instagramImages.map((img, i) => (
              <a key={i} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="insta-item fade-in-section" style={{ transitionDelay: `${i * 80}ms` }}>
                <Image src={img} alt={`Halahello Instagram ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 33vw, 20vw" />
                <div className="insta-overlay"><span style={{ color: "white" }}><InstagramIcon /></span></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: "100px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", display: "block", marginBottom: 16 }}>{T("testTag")}</span>
          <h2 className="fade-in-section" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, marginBottom: 12 }}>{T("testTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic" }}>{T("testTitle2")}</span></h2>
          <div className="section-divider" />
        </div>
        <div className="fade-in-section" style={{ position: "relative", minHeight: 260 }}>
          {testimonials.map((tm, i) => (
            <div key={i} className="testimonial-card" style={{ position: i === activeTestimonial ? "relative" : "absolute", top: 0, left: 0, right: 0, opacity: i === activeTestimonial ? 1 : 0, transform: i === activeTestimonial ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s ease-out", pointerEvents: i === activeTestimonial ? "auto" : "none", textAlign: "center" }}>
              <div style={{ marginBottom: 16 }}><QuoteIcon /></div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 20 }}>{[...Array(5)].map((_, j) => <StarIcon key={j} />)}</div>
              <p style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.2rem", fontStyle: isRtl ? "normal" : "italic", lineHeight: 1.7, color: "var(--text-primary)", marginBottom: 24, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>&ldquo;{tm.text}&rdquo;</p>
              <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{tm.author}</p>
              <p style={{ fontSize: "0.85rem", color: "var(--accent)" }}>{tm.product}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 36 }}>
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)} style={{ width: i === activeTestimonial ? 28 : 10, height: 10, borderRadius: "var(--radius-full)", background: i === activeTestimonial ? "linear-gradient(135deg, var(--accent), var(--accent-light))" : "var(--highlight)", border: "none", cursor: "pointer", transition: "all 0.3s ease" }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. CTA ── */}
      <section style={{ padding: "100px 24px", background: "linear-gradient(135deg, var(--bg-secondary), var(--highlight))", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 className="fade-in-section" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 600, marginBottom: 24, lineHeight: 1.2 }}>{T("ctaTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic" }}>{T("ctaTitle2")}</span></h2>
          <p className="fade-in-section" style={{ fontSize: "1.05rem", color: "var(--text-secondary)", marginBottom: 40, lineHeight: 1.7 }}>{T("ctaDesc")}</p>
          <div className="fade-in-section" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("hijab-products")} className="btn-primary">{T("ctaBtnHijab")}</button>
            <button onClick={() => scrollTo("custom-orders")} className="btn-secondary">{T("ctaBtnPlexi")}</button>
            <button onClick={() => scrollTo("contact")} className="btn-secondary">{T("ctaBtnContact")}</button>
          </div>
        </div>
      </section>

      {/* ── 10. CONTACT ── */}
      <section id="contact" style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span className="fade-in-section" style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: isRtl ? "0" : "0.2em", textTransform: isRtl ? "none" as const : "uppercase" as const, color: "var(--accent)", display: "block", marginBottom: 16 }}>{T("contactTag")}</span>
          <h2 className="fade-in-section" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 600, marginBottom: 12 }}>{T("contactTitle1")} <span style={{ fontStyle: isRtl ? "normal" : "italic" }}>{T("contactTitle2")}</span></h2>
          <div className="section-divider" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="contact-grid">
          <div className="fade-in-left" style={{ background: "var(--white)", borderRadius: "var(--radius-lg)", padding: "40px 36px", boxShadow: "var(--shadow-card)", border: "1px solid rgba(207,161,141,0.1)" }}>
            <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.4rem", marginBottom: 24 }}>{T("contactFormTitle")}</h3>
            <form onSubmit={(e) => { e.preventDefault(); alert(T("contactSuccess")); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <input className="form-input" type="text" placeholder={T("contactNamePh")} required />
              <input className="form-input" type="email" placeholder={T("contactEmailPh")} required />
              <textarea className="form-input" rows={4} placeholder={T("contactMsgPh")} style={{ resize: "vertical" }} required />
              <button type="submit" className="btn-primary" style={{ alignSelf: isRtl ? "flex-end" : "flex-start" }}>{T("contactSendBtn")}</button>
            </form>
          </div>
          <div className="fade-in-right" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ background: "var(--white)", borderRadius: "var(--radius-lg)", padding: "32px", boxShadow: "var(--shadow-soft)", border: "1px solid rgba(207,161,141,0.08)" }}>
              <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.2rem", marginBottom: 12 }}>{T("contactConnectTitle")}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20, fontSize: "0.95rem" }}>{T("contactConnectDesc")}</p>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--accent)", fontWeight: 500, textDecoration: "none", fontSize: "0.95rem" }}><InstagramIcon /> @halahelloo</a>
            </div>
            <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" className="whatsapp-btn" style={{ justifyContent: "center" }}><WhatsAppIcon />{T("contactWhatsapp")}</a>
            <div style={{ background: "var(--white)", borderRadius: "var(--radius-lg)", padding: "32px", boxShadow: "var(--shadow-soft)", border: "1px solid rgba(207,161,141,0.08)" }}>
              <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.2rem", marginBottom: 12 }}>{T("contactInfoTitle")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                <p>{T("contactInfo1")}</p><p>{T("contactInfo2")}</p><p>{T("contactInfo3")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. FOOTER ── */}
      <footer style={{ background: "var(--footer-bg)", color: "var(--footer-text)", padding: "60px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40 }} className="footer-grid">
          <div>
            <h3 style={{ fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.8rem", fontWeight: 600, marginBottom: 16, color: "var(--footer-text)" }}>{isRtl ? "هالاهيلو" : "Halahello"}</h3>
            <p style={{ opacity: 0.7, lineHeight: 1.7, fontSize: "0.9rem", maxWidth: 280 }}>{T("footerDesc")}</p>
          </div>
          <div>
            <h4 style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: isRtl ? "none" as const : "uppercase" as const, marginBottom: 20, opacity: 0.6 }}>{T("footerExplore")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {([[T("footerHijabLink"), "hijab-products"], [T("footerPlexiLink"), "plexi-products"], [T("footerCustomLink"), "custom-orders"], [T("footerStoryLink"), "story"]] as [string, string][]).map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: "var(--footer-text)", opacity: 0.7, cursor: "pointer", fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.9rem", textAlign: isRtl ? "right" : "left", padding: 0, transition: "opacity 0.3s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: isRtl ? "none" as const : "uppercase" as const, marginBottom: 20, opacity: 0.6 }}>{T("footerConnect")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--footer-text)", opacity: 0.7, textDecoration: "none", fontSize: "0.9rem", transition: "opacity 0.3s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}>Instagram</a>
              <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" style={{ color: "var(--footer-text)", opacity: 0.7, textDecoration: "none", fontSize: "0.9rem", transition: "opacity 0.3s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}>{isRtl ? "واتساب" : "WhatsApp"}</a>
              <a href="mailto:hello@halahello.com" style={{ color: "var(--footer-text)", opacity: 0.7, textDecoration: "none", fontSize: "0.9rem", transition: "opacity 0.3s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}>{isRtl ? "البريد" : "Email"}</a>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.15em", textTransform: isRtl ? "none" as const : "uppercase" as const, marginBottom: 20, opacity: 0.6 }}>{T("footerSupport")}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[T("footerContactUs"), T("footerShipping"), T("footerReturns"), T("footerFaq")].map((label) => (
                <button key={label} onClick={() => scrollTo("contact")} style={{ background: "none", border: "none", color: "var(--footer-text)", opacity: 0.7, cursor: "pointer", fontFamily: isRtl ? "var(--font-arabic)" : "var(--font-body)", fontSize: "0.9rem", textAlign: isRtl ? "right" : "left", padding: 0, transition: "opacity 0.3s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "48px auto 0", paddingTop: 24, borderTop: "1px solid rgba(250,247,245,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <p style={{ opacity: 0.5, fontSize: "0.82rem" }}>{T("footerCopyright")}</p>
          <p style={{ opacity: 0.4, fontSize: "0.78rem", fontStyle: "italic" }}>{T("footerDesigned")}</p>
        </div>
      </footer>

      {/* ── Responsive Styles ── */}
      <style jsx>{`
        .brand-story-grid { grid-template-columns: 1fr 1fr; }
        .brands-grid { grid-template-columns: 1fr 1fr; }
        .product-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
        .insta-grid { grid-template-columns: repeat(3, 1fr); }
        .contact-grid { grid-template-columns: 1fr 1fr; }
        .footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; }
        .custom-form-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 768px) {
          .brand-story-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .brands-grid { grid-template-columns: 1fr !important; }
          .product-grid { grid-template-columns: 1fr 1fr !important; gap: 16px !important; }
          .insta-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .custom-form-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .product-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
