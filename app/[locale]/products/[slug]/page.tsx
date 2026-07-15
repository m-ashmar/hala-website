import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/sanity/lib/queries';
import prisma from '@/lib/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductInfo } from '@/components/product/ProductInfo';
import { CustomizationForm } from '@/components/product/CustomizationForm';
import { ProductCard } from '@/components/product/ProductCard';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

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

  // Fetch DB ID for checkout cart sync
  const dbProduct = await prisma.productSync.findUnique({
    where: { sanityId: slug },
    select: { id: true, stock: true },
  });

  const allImages = [product.imageUrl, ...(product.galleryUrls || [])].filter(Boolean) as string[];

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
      {product.relatedProducts && product.relatedProducts.length > 0 && (
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
            {product.relatedProducts.map((related) => (
              <ProductCard
                key={related._id}
                product={related as any}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}
    </PageWrapper>
  );
}
