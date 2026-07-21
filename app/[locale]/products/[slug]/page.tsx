import { notFound } from 'next/navigation';
import { getProductBySlug, getAllProducts } from '@/sanity/lib/queries';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductInfo } from '@/components/product/ProductInfo';
import { CustomizationForm } from '@/components/product/CustomizationForm';
import { ProductCard, type ProductCardProduct } from '@/components/product/ProductCard';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

/* ─── ISR: revalidate product pages every 5 minutes ─── */
export const revalidate = 300;

/* ─── Pre-render all active products for both locales at build time ─── */
export async function generateStaticParams() {
  try {
    const products = await getAllProducts();
    const locales = ['en', 'ar'];
    return locales.flatMap((locale) =>
      products.map((product) => ({
        locale,
        slug: product.sanityId,
      }))
    );
  } catch {
    // If Sanity is unreachable at build time, fallback to dynamic rendering
    return [];
  }
}

interface ProductPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title = locale === 'ar' && product.titleAr ? product.titleAr : product.title;
  const description = locale === 'ar' && product.descriptionAr ? product.descriptionAr : product.description;

  return {
    title: product.metaTitle || `${title} | Halahello`,
    description: product.metaDescription || description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { locale, slug } = await params;
  const isAr = locale === 'ar';

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Fetch DB record; if it doesn't exist yet (webhook never fired / new product),
  // auto-seed it so the page works immediately after publishing in Sanity.
  let dbProduct = await prisma.productSync.findUnique({
    where: { sanityId: slug },
    select: { id: true, stock: true },
  });

  if (!dbProduct) {
    try {
      dbProduct = await prisma.productSync.upsert({
        where: { sanityId: slug },
        update: {},
        create: { sanityId: slug, price: product.price, stock: 100, isActive: true },
        select: { id: true, stock: true },
      });
    } catch {
      // Non-fatal: if DB is unreachable, dbProduct stays null and the form is hidden
    }
  }

  const allImages = [product.imageUrl, ...(product.galleryUrls || [])].filter(Boolean) as string[];

  // Map related products to the shape ProductCard expects
  const relatedCards: ProductCardProduct[] = (product.relatedProducts ?? []).map((r) => ({
    _id: r._id,
    title: r.title,
    titleAr: r.titleAr,
    slug: { current: r.sanityId },
    price: r.price,
    discountPrice: r.discountPrice,
    mainImageUrl: r.imageUrl || undefined,
    gallery: r.galleryUrls?.map((url) => ({ url })),
    isNew: r.isNew,
    isBestSeller: r.isBestSeller,
    isFeatured: r.isFeatured,
    inStock: r.isActive,
    category: r.category,
  }));

  return (
    <PageWrapper width="default" padTop padBottom>
      {/* ── Product Area ── */}
      <div className={styles.productLayout} dir={isAr ? 'rtl' : 'ltr'}>
        <div className={styles.gallerySection}>
          <ProductGallery
            images={allImages}
            productTitle={isAr && product.titleAr ? product.titleAr : product.title}
          />
        </div>

        <div className={styles.infoSection}>
          <ProductInfo product={product} locale={locale} />
          
          <div className={styles.formWrapper}>
            {dbProduct ? (
              <CustomizationForm product={product} locale={locale} dbProductId={dbProduct.id} />
            ) : (
              <EmptyState
                emoji="⚠"
                title={isAr ? 'المنتج غير متوفر' : 'Product Unavailable'}
                description={isAr ? 'حدث خطأ في مزامنة هذا المنتج. يرجى المحاولة لاحقاً.' : 'There was an issue loading this product. Please try again later.'}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Related Products ── */}
      {relatedCards.length > 0 && (
        <section className={styles.relatedSection} aria-labelledby="related-title">
          <Divider decorative />
          <div className={styles.relatedHeader}>
            <h2 id="related-title" className={styles.relatedTitle}>
              {isAr ? 'قد يعجبك أيضاً' : 'You May Also Like'}
            </h2>
            <Link href={`/${locale}/products`} className={styles.viewAll}>
              {isAr ? 'عرض الكل ←' : 'View All →'}
            </Link>
          </div>

          <div className={styles.relatedGrid}>
            {relatedCards.map((related) => (
              <ProductCard
                key={related._id}
                product={related}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}
    </PageWrapper>
  );
}
