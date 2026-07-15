"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { SanityProduct } from '@/sanity/lib/queries';
import { useWishlist } from './WishlistContext';
import { WishlistButton } from './WishlistButton';
import { useCartStore } from '@/lib/stores/cart.store';

interface FavoritesClientProps {
  products: SanityProduct[];
  dbProducts: any[];
  locale: string;
}

export default function FavoritesClient({ products, dbProducts, locale }: FavoritesClientProps) {
  const isAr = locale === 'ar';
  const { wishlistedIds, isLoading } = useWishlist();
  const addToCart = useCartStore((s) => s.addItem);

  const favoriteProducts = useMemo(() => {
    return products.filter((p) => wishlistedIds.has(p._id));
  }, [products, wishlistedIds]);

  const handleAddToCart = (p: SanityProduct, dbProduct: any) => {
    if (!dbProduct) return;
    const productName = isAr && p.titleAr ? p.titleAr : p.title;
    const price = p.discountPrice || dbProduct.price;
    
    addToCart({
      productSyncId: dbProduct.id,
      sanityId: p.sanityId,
      name: productName,
      price: price,
      quantity: 1,
      imageUrl: p.imageUrl,
    });
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
          {isAr ? 'جاري التحميل...' : 'Loading favorites...'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-heading)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {isAr ? 'المفضلة' : 'My Favorites'}
        </h1>
        <div style={{ width: 60, height: 2, background: 'var(--accent)', margin: '16px auto' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          {isAr ? 'المنتجات التي أحببتها.' : 'The products you loved most.'}
        </p>
      </div>

      {favoriteProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
            {isAr ? 'قائمتك المفضلة فارغة حالياً' : 'Your favorites list is currently empty'}
          </p>
          <Link href={`/${locale}/products`} className="btn-primary" style={{ display: 'inline-flex', padding: '12px 32px' }}>
            {isAr ? 'تصفح المنتجات' : 'Browse Products'}
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 32 }} className="product-grid">
          {favoriteProducts.map((p, i) => {
            const dbProduct = dbProducts.find((db) => db.sanityId === p.sanityId);
            const productName = isAr && p.titleAr ? p.titleAr : p.title;
            const isOutOfStock = dbProduct?.stock === 0;
            const displayPrice = p.discountPrice || (dbProduct ? dbProduct.price : p.price);

            return (
              <div key={p._id} className="product-card">
                <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
                  <Link href={`/${locale}/products/${p.sanityId}`} aria-label={productName} tabIndex={0}>
                    <Image src={p.imageUrl} alt={productName} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 50vw, 25vw" />
                  </Link>

                  {isOutOfStock && <span className="sold-out-ribbon">{isAr ? "نفد المخزون" : "Sold Out"}</span>}
                  
                  {/* Wishlist */}
                  <div style={{ position: "absolute", top: 12, [isAr ? "left" : "right"]: 12, zIndex: 3 }}>
                    <WishlistButton productId={p._id} />
                  </div>

                  {/* Hover Overlay */}
                  <div className="product-card-overlay">
                    <Link href={`/${locale}/products/${p.sanityId}`} className="btn-secondary" style={{ flex: 1, fontSize: "0.78rem", padding: "8px 12px", color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}>
                      {isAr ? "عرض" : "View"}
                    </Link>
                    {!isOutOfStock && (
                      <button onClick={() => handleAddToCart(p, dbProduct)} className="btn-primary" style={{ flex: 1, fontSize: "0.78rem", padding: "8px 12px" }}>
                        {isAr ? "أضف للسلة" : "Add to Cart"}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ padding: "16px 4px 4px" }}>
                  <Link href={`/${locale}/products/${p.sanityId}`} style={{ display: "block", textDecoration: "none" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, fontFamily: isAr ? "var(--font-arabic)" : "var(--font-body)" }}>
                      {productName}
                    </h3>
                  </Link>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {new Intl.NumberFormat(locale, { style: "currency", currency: process.env.NEXT_PUBLIC_CURRENCY || "SYP", maximumFractionDigits: 0 }).format(displayPrice)}
                    </span>
                    {p.discountPrice && (
                      <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textDecoration: "line-through" }}>
                        {new Intl.NumberFormat(locale, { style: "currency", currency: process.env.NEXT_PUBLIC_CURRENCY || "SYP", maximumFractionDigits: 0 }).format(p.price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
