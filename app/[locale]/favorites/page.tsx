import { getAllProducts } from '@/sanity/lib/queries';
import prisma from '@/lib/prisma';
import FavoritesClient from '@/components/product/FavoritesClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'المفضلة | Halahello' : 'Favorites | Halahello',
    description: isAr ? 'قائمة المنتجات المفضلة لديك' : 'Your favorite products',
  };
}

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const products = await getAllProducts();
  
  let dbProducts: any[] = [];
  try {
    dbProducts = await prisma.productSync.findMany({
      select: { id: true, sanityId: true, price: true, stock: true },
    });
  } catch (err) {
    console.error("Failed to fetch products from DB:", err);
  }

  return <FavoritesClient products={products} dbProducts={dbProducts} locale={locale} />;
}
