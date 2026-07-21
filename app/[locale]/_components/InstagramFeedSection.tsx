"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const INSTAGRAM_URL = "https://instagram.com/halahelloo";
const STATIC_INSTAGRAM_IMAGES = [
  "/products/hijab/hijab.jpg", "/products/plexi/c1.jpg", "/products/hijab/hijab-a1.avif",
  "/products/plexi/d1.jpg", "/products/plexi/e1.jpg", "/products/hijab/hijab-b1.jpg",
  "/products/plexi/f1.webp", "/products/plexi/b2.webp", "/products/hijab/hijab-c1.jpg",
];

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

interface Post {
  id: string;
  media_url: string;
  permalink: string;
  media_type: string;
  thumbnail_url?: string;
}

interface Props {
  isRtl: boolean;
  T: (key: "instaTag" | "instaTitle1" | "instaTitle2") => string;
}

export default function InstagramFeedSection({ isRtl, T }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/instagram/feed")
      .then((r) => r.json())
      .then((d) => { if (d.posts?.length) setPosts(d.posts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
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
          {loading
            ? Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="insta-item skeleton" style={{ animationDelay: `${i * 80}ms` }} aria-hidden="true" />
              ))
            : posts.length > 0
            ? posts.map((post, i) => (
                <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer"
                  className="insta-item fade-in-section" style={{ transitionDelay: `${i * 60}ms` }} aria-label="View on Instagram">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.media_type === "VIDEO" ? (post.thumbnail_url ?? post.media_url) : post.media_url}
                    alt={`Halahello Instagram post ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    loading="lazy"
                  />
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
  );
}
