import type { MetadataRoute } from 'next';
import { getAllProducts } from '@/sanity/lib/queries';

/**
 * Sitemap.
 *
 * A commercial storefront with no sitemap is invisible to search, which for
 * this business means giving up its main free acquisition channel.
 *
 * Both locales are emitted, cross-linked with hreflang alternates so Google
 * treats /en and /ar as translations rather than duplicate content.
 */

const LOCALES = ['en', 'ar'] as const;

function baseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return raw.replace(/\/$/, '');
}

/** Static routes, with the relative priority Google should infer. */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/products', priority: 0.9, changeFrequency: 'daily' },
  { path: '/offers', priority: 0.8, changeFrequency: 'daily' },
  { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.2, changeFrequency: 'yearly' },
];

function alternatesFor(path: string) {
  return {
    languages: Object.fromEntries(
      LOCALES.map((l) => [l, `${baseUrl()}/${l}${path}`])
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    STATIC_ROUTES.map((route) => ({
      url: `${base}/${locale}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: alternatesFor(route.path),
    }))
  );

  // Product pages. A CMS outage must not break the sitemap — degrade to the
  // static routes rather than failing the whole response.
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await getAllProducts();
    productEntries = LOCALES.flatMap((locale) =>
      products.map((p) => ({
        url: `${base}/${locale}/products/${p.sanityId}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
        alternates: alternatesFor(`/products/${p.sanityId}`),
      }))
    );
  } catch (err) {
    console.error('[sitemap] Could not load products:', err);
  }

  return [...staticEntries, ...productEntries];
}
