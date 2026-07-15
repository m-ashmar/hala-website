"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/stores/cart.store';
import type { SanityProduct } from '@/sanity/lib/queries';
import { WishlistButton } from './WishlistButton';

interface ProductsClientProps {
  products: SanityProduct[];
  dbProducts: any[];
  locale: string;
}

export default function ProductsClient({ products, dbProducts, locale }: ProductsClientProps) {
  console.log("Products:", products);
  console.log("DB Products:", dbProducts);
  const isAr = locale === 'ar';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'hijab' | 'plexi'>('all');
  const [sort, setSort] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  const addToCart = useCartStore((s) => s.addItem);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (category !== 'all') {
      result = result.filter(p => p.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => {
        const title = isAr && p.titleAr ? p.titleAr : p.title;
        return title.toLowerCase().includes(q);
      });
    }

    result = [...result]; // clone before sort
    if (sort === 'price-asc') {
      result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (sort === 'price-desc') {
      result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    }

    return result;
  }, [products, category, search, sort, isAr]);

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '120px 24px 80px', minHeight: '80vh' }}>

      {/* ── Header & Search ── */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-heading)',
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: 600,
          marginBottom: 16
        }}>
          {isAr ? 'مجموعتنا الكاملة' : 'Our Collection'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto 32px' }}>
          {isAr ? 'اكتشف أرقى تصاميم الحجاب والإكسسوارات' : 'Discover our finest hijab designs and accessories'}
        </p>

        {/* Search Bar */}
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <input
            type="text"
            placeholder={isAr ? "ابحث عن منتج..." : "Search products..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(207,161,141,0.3)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          />
        </div>
      </div>

      {/* ── Filters & Sort ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24,
        marginBottom: 48,
        paddingBottom: 24,
        borderBottom: '1px solid rgba(207,161,141,0.15)'
      }}>
        {/* Categories */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: isAr ? 'الكل' : 'All' },
            { id: 'hijab', label: isAr ? 'حجابات' : 'Hijabs' },
            { id: 'plexi', label: isAr ? 'بلكسي' : 'Plexi' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id as any)}
              style={{
                padding: '8px 24px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.9rem',
                fontWeight: category === cat.id ? 600 : 500,
                background: category === cat.id ? 'var(--accent)' : 'transparent',
                color: category === cat.id ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${category === cat.id ? 'var(--accent)' : 'rgba(207,161,141,0.3)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          style={{
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(207,161,141,0.3)',
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="default">{isAr ? 'الترتيب الافتراضي' : 'Sort by Default'}</option>
          <option value="price-asc">{isAr ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
          <option value="price-desc">{isAr ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
        </select>
      </div>

      {/* ── Product Grid ── */}
      {filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: 16 }}>
            {isAr ? 'لم يتم العثور على منتجات' : 'No products found'}
          </p>
          <button onClick={() => { setSearch(''); setCategory('all'); }} className="btn-secondary">
            {isAr ? 'مسح الفلاتر' : 'Clear Filters'}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 32 }} className="product-grid">
          {filteredProducts.map((p, i) => {
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
                  {!isOutOfStock && p.isFeatured && <span className="product-badge">{isAr ? "مميز" : "Featured"}</span>}

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
                      <button
                        onClick={() => {
                          const dbProduct = dbProducts.find((db) => db.sanityId === p.sanityId);
                          if (!dbProduct) return; // Should toast error in a full implementation
                          addToCart({
                            productSyncId: dbProduct.id,
                            sanityId: p.sanityId,
                            name: productName,
                            price: displayPrice,
                            imageUrl: p.imageUrl,
                            quantity: 1
                          });
                        }}
                        className="btn-primary"
                        style={{ flex: 1, fontSize: "0.78rem", padding: "8px 12px" }}
                      >
                        {isAr ? "أضف للسلة" : "Add to Cart"}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ padding: "20px 24px", textAlign: "center" }}>
                  <Link href={`/${locale}/products/${p.sanityId}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <h3 style={{ fontFamily: isAr ? "var(--font-arabic)" : "var(--font-heading)", fontSize: "1.05rem", fontWeight: 500, marginBottom: 4 }}>
                      {productName}
                    </h3>
                  </Link>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500, display: "block", marginBottom: 14 }}>
                    {p.category === 'hijab' ? (isAr ? 'حجاب بلكسي' : 'Premium Hijab') : (isAr ? 'إكسسوار بلكسي' : 'Premium Plexi')}
                  </span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid rgba(207,161,141,0.12)" }}>
                    <div>
                      {p.discountPrice ? (
                        <>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>{p.discountPrice} SYP</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textDecoration: "line-through", marginInlineStart: 8 }}>{p.price} SYP</span>
                        </>
                      ) : (
                        <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>{p.price} SYP</span>
                      )}
                    </div>
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
