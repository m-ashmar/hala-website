/**
 * Root layout for the embedded Sanity Studio.
 *
 * The site's root layout lives at `app/[locale]/layout.tsx` because every
 * public route is locale-prefixed. `/studio` deliberately is not, so it falls
 * outside that layout and would otherwise render with no <html>/<body> at all
 * ("Missing <html> and <body> tags in the root layout").
 *
 * Studio is a self-contained application: it must NOT inherit the storefront's
 * Navbar, Footer, theme providers or fonts, so this is intentionally bare.
 */

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Studio manages its own full-viewport layout and scrolling. */}
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
