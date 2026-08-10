import { notFound } from 'next/navigation';
import { getLegalPage } from '@/sanity/lib/queries';

/**
 * Shared renderer for the legal pages (/privacy, /terms, /refund-policy).
 *
 * Content is authored in Sanity, not hardcoded: the wording is a legal matter
 * for the business to own and revise, and it must be changeable without a
 * deploy. If a page has not been written yet, the route 404s rather than
 * showing placeholder text — a policy page that looks real but is not is
 * worse than an honest 404.
 */

/** Renders plain text: blank lines split paragraphs, trailing ':' marks a heading. */
function renderBody(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const isHeading = block.length < 120 && block.endsWith(':') && !block.includes('. ');
      if (isHeading) {
        return (
          <h2
            key={i}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.35rem',
              fontWeight: 600,
              marginTop: 36,
              marginBottom: 12,
            }}
          >
            {block.replace(/:$/, '')}
          </h2>
        );
      }
      return (
        <p
          key={i}
          style={{
            color: 'var(--text-secondary)',
            lineHeight: 1.85,
            marginBottom: 18,
            fontSize: '0.98rem',
          }}
        >
          {block}
        </p>
      );
    });
}

export async function LegalPageView({
  slug,
  locale,
}: {
  slug: 'privacy' | 'terms' | 'refund-policy';
  locale: string;
}) {
  const page = await getLegalPage(slug).catch(() => null);
  if (!page) notFound();

  const isAr = locale === 'ar';
  const title = (isAr && page.titleAr) || page.title;
  const body = (isAr && page.bodyAr) || page.body;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ maxWidth: 780, margin: '0 auto', padding: '140px 24px 100px', minHeight: '70vh' }}
    >
      <h1
        style={{
          fontFamily: isAr ? 'var(--font-arabic)' : 'var(--font-heading)',
          fontSize: 'clamp(2rem, 4vw, 2.8rem)',
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {title}
      </h1>

      {page.lastUpdated && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 36 }}>
          {isAr ? 'آخر تحديث: ' : 'Last updated: '}
          {new Date(page.lastUpdated).toLocaleDateString(isAr ? 'ar' : 'en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      )}

      <div className="section-divider" style={{ margin: '0 0 32px 0' }} />

      {renderBody(body)}
    </div>
  );
}

/** Shared metadata builder so each route stays a thin wrapper. */
export async function buildLegalMetadata(
  slug: 'privacy' | 'terms' | 'refund-policy',
  locale: string,
  fallbackTitle: string
) {
  const page = await getLegalPage(slug).catch(() => null);
  const isAr = locale === 'ar';
  const title = (page && ((isAr && page.titleAr) || page.title)) || fallbackTitle;
  return {
    title: `${title} | Halahello`,
    // Policy pages carry no unique marketing value and should not compete in search.
    robots: { index: true, follow: true },
  };
}
