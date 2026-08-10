import { LegalPageView, buildLegalMetadata } from '@/components/layout/LegalPageView';

// Content is CMS-authored; revalidate hourly so policy edits go live without a deploy.
export const revalidate = 3600;

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params) {
  const { locale } = await params;
  return buildLegalMetadata('terms', locale, 'Terms & Conditions');
}

export default async function Page({ params }: Params) {
  const { locale } = await params;
  return <LegalPageView slug="terms" locale={locale} />;
}
