import type { MetadataRoute } from 'next';

/**
 * robots.txt
 *
 * Keeps crawlers out of anything private or transactional. /studio, /admin and
 * /account are behind auth, but there is no reason to advertise them, and
 * /checkout and /cart are per-session pages that carry no search value.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  ).replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/studio',
          '/studio/',
          '/en/admin',
          '/ar/admin',
          '/en/account',
          '/ar/account',
          '/en/checkout',
          '/ar/checkout',
          '/en/cart',
          '/ar/cart',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
