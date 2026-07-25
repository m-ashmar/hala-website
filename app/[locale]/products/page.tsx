import { getAllProducts, getProductCategories } from '@/sanity/lib/queries';
import ProductsClient from '@/components/product/ProductsClient';
import prisma from '@/lib/prisma';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'المنتجات | Halahello' : 'Products | Halahello',
    description: isAr ? 'تصفح جميع منتجاتنا' : 'Browse all our products',
  };
}

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [productsResult, categoriesResult] = await Promise.allSettled([getAllProducts(), getProductCategories()]);
  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  if (productsResult.status === 'rejected') console.error('Failed to fetch products from Sanity:', productsResult.reason);

  let dbProducts: any[] = [];
  try {
    // Fetch pricing/stock from PostgreSQL
    dbProducts = await prisma.productSync.findMany({
      select: { id: true, sanityId: true, price: true, stock: true },
    });
  } catch (err) {
    console.error("Failed to fetch products from DB:", err);
    // Fallback to empty dbProducts if DB is asleep or unreachable
  }

  return <ProductsClient products={products} categories={categories} dbProducts={dbProducts} locale={locale} />;
}
