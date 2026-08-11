/**
 * Seeds the content types that were empty, so every section of the site
 * renders and the CMS -> site loop can be demonstrated.
 *
 * Safe to re-run: every document uses a fixed _id and createOrReplace, so this
 * updates rather than duplicating.
 *
 * To remove everything it created:
 *   npx tsx scripts/dev/seed-demo-content.ts --undo
 */

import { createClient } from 'next-sanity';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_TOKEN are required');
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-07-07',
  token,
  useCdn: false,
});

/** Every document this script owns, so --undo is exact. */
const SEEDED_IDS = [
  'themeSettings',
  'currencySettings',
  'cat-hijab-scarves',
  'cat-hijab-pins',
  'cat-plexi-keychains',
  'cat-plexi-decor',
  'faq-shipping',
  'faq-custom',
  'faq-returns',
  'testimonial-1',
  'testimonial-2',
  'legal-privacy',
  'legal-terms',
  'legal-refund',
];

const today = new Date().toISOString().slice(0, 10);

const docs = [
  // ── Theme: the current brand palette, made editable ──────────────────────
  {
    _id: 'themeSettings',
    _type: 'themeSettings',
    bgPrimary: '#FAF7F5',
    bgSecondary: '#F6EDEE',
    accent: '#CFA18D',
    accentLight: '#E3B8A7',
    accentDark: '#B07E6A',
    highlight: '#EAD0D6',
    textPrimary: '#3A2E2A',
    textSecondary: '#6B5B55',
    footerBg: '#3A2E2A',
    footerText: '#FAF7F5',
    enableExtras: false,
  },

  // ── Currency: unblocks card checkout ─────────────────────────────────────
  {
    _id: 'currencySettings',
    _type: 'currencySettings',
    sypPerUsd: 13000,
    showUsdPrices: true,
    rateNote: 'Seeded for demo — update to the live market rate',
  },

  // ── Product categories, per division ─────────────────────────────────────
  {
    _id: 'cat-hijab-scarves',
    _type: 'productCategory',
    title: 'Silk Scarves',
    titleAr: 'أوشحة حرير',
    slug: { _type: 'slug', current: 'silk-scarves' },
    division: 'hijab',
    order: 1,
    isActive: true,
  },
  {
    _id: 'cat-hijab-pins',
    _type: 'productCategory',
    title: 'Pins & Accessories',
    titleAr: 'دبابيس وإكسسوارات',
    slug: { _type: 'slug', current: 'pins-accessories' },
    division: 'hijab',
    order: 2,
    isActive: true,
  },
  {
    _id: 'cat-plexi-keychains',
    _type: 'productCategory',
    title: 'Keychains',
    titleAr: 'ميداليات',
    slug: { _type: 'slug', current: 'keychains' },
    division: 'plexi',
    order: 1,
    isActive: true,
  },
  {
    _id: 'cat-plexi-decor',
    _type: 'productCategory',
    title: 'Home & Event Decor',
    titleAr: 'ديكور المنزل والمناسبات',
    slug: { _type: 'slug', current: 'home-event-decor' },
    division: 'plexi',
    order: 2,
    isActive: true,
  },

  // ── FAQ ──────────────────────────────────────────────────────────────────
  {
    _id: 'faq-shipping',
    _type: 'faq',
    question: 'How long does delivery take?',
    questionAr: 'كم تستغرق مدة التوصيل؟',
    answer:
      'Ready-made pieces are dispatched within 1-2 working days and usually arrive within 3-5 days inside Syria. Custom plexi orders are made to order, so allow 7-14 days depending on the design.',
    answerAr:
      'يتم شحن القطع الجاهزة خلال يوم إلى يومي عمل وتصل عادةً خلال ٣-٥ أيام داخل سوريا. أما الطلبات المخصصة فتُصنع حسب الطلب وتستغرق من ٧ إلى ١٤ يوماً حسب التصميم.',
    category: 'shipping',
    order: 1,
    isActive: true,
  },
  {
    _id: 'faq-custom',
    _type: 'faq',
    question: 'Can I order a custom plexi piece?',
    questionAr: 'هل يمكنني طلب قطعة بليكسي مخصصة؟',
    answer:
      'Yes. Use the Custom Orders form to describe what you would like and attach any inspiration images. We reply with a quote, and production begins once you approve and pay.',
    answerAr:
      'نعم. استخدم نموذج الطلبات المخصصة لوصف ما تريد مع إرفاق صور مرجعية. سنرد عليك بعرض سعر، ويبدأ التنفيذ بعد الموافقة والدفع.',
    category: 'products',
    order: 2,
    isActive: true,
  },
  {
    _id: 'faq-returns',
    _type: 'faq',
    question: 'What is your returns policy?',
    questionAr: 'ما هي سياسة الإرجاع لديكم؟',
    answer:
      'Ready-made items can be returned within 7 days if unused and in their original packaging. Custom pieces are made specifically for you and cannot be returned unless they arrive damaged or differ from what was agreed.',
    answerAr:
      'يمكن إرجاع القطع الجاهزة خلال ٧ أيام إذا كانت غير مستخدمة وبعبوتها الأصلية. أما القطع المخصصة فتُصنع خصيصاً لك ولا يمكن إرجاعها إلا إذا وصلت تالفة أو مخالفة للمتفق عليه.',
    category: 'returns',
    order: 3,
    isActive: true,
  },

  // ── Testimonials ─────────────────────────────────────────────────────────
  {
    _id: 'testimonial-1',
    _type: 'testimonial',
    quote:
      'The silk hijab is even more beautiful in person, and it arrived beautifully wrapped. It has become the one I reach for every week.',
    quoteAr:
      'الحجاب الحريري أجمل على الطبيعة، ووصل بتغليف أنيق جداً. أصبح خياري الأول كل أسبوع.',
    author: 'Layla A.',
    authorAr: 'ليلى ع.',
    rating: 5,
    isActive: true,
    order: 1,
  },
  {
    _id: 'testimonial-2',
    _type: 'testimonial',
    quote:
      'I ordered a custom plexi piece for my sister’s wedding. They understood exactly what I wanted and it was the detail everyone asked about.',
    quoteAr:
      'طلبت قطعة بليكسي مخصصة لعرس أختي. فهموا تماماً ما أردته وكانت التفصيل الذي سأل عنه الجميع.',
    author: 'Nour H.',
    authorAr: 'نور ح.',
    rating: 5,
    isActive: true,
    order: 2,
  },

  // ── Legal pages ──────────────────────────────────────────────────────────
  // Placeholder wording, clearly marked. These exist so the routes resolve and
  // the footer links work; they are NOT enforceable terms.
  {
    _id: 'legal-privacy',
    _type: 'legalPage',
    slug: 'privacy',
    title: 'Privacy Policy',
    titleAr: 'سياسة الخصوصية',
    lastUpdated: today,
    body: `PLACEHOLDER — REPLACE BEFORE LAUNCH:
This wording is a structural placeholder so the page renders. It has not been reviewed by a lawyer and is not adequate for a live shop.

What we collect:

We collect the name, email address, phone number and delivery address you provide when placing an order, and the contents of any message you send us. Payment card details are handled by our payment provider and never reach our servers.

How we use it:

Your information is used to process and deliver your order, to contact you about it, and to respond to enquiries. We do not sell it.

Your rights:

You may request a copy of the information we hold about you, or ask us to delete it, by contacting us.`,
    bodyAr: `نص مؤقت — يجب استبداله قبل الإطلاق:
هذه الصياغة مؤقتة لغرض عرض الصفحة فقط، ولم تراجَع قانونياً وليست كافية لمتجر فعلي.

ما نجمعه:

نجمع الاسم والبريد الإلكتروني ورقم الهاتف وعنوان التوصيل الذي تقدمه عند الطلب، ومحتوى أي رسالة ترسلها إلينا. تُعالَج بيانات البطاقة لدى مزود الدفع ولا تصل إلى خوادمنا.

كيف نستخدمها:

تُستخدم معلوماتك لتنفيذ طلبك وتوصيله والتواصل معك بشأنه والرد على استفساراتك. لا نبيعها.

حقوقك:

يمكنك طلب نسخة من المعلومات التي نحتفظ بها عنك أو طلب حذفها بالتواصل معنا.`,
  },
  {
    _id: 'legal-terms',
    _type: 'legalPage',
    slug: 'terms',
    title: 'Terms & Conditions',
    titleAr: 'الشروط والأحكام',
    lastUpdated: today,
    body: `PLACEHOLDER — REPLACE BEFORE LAUNCH:
This wording is a structural placeholder so the page renders. It has not been reviewed by a lawyer and is not adequate for a live shop.

Orders:

Placing an order is an offer to buy. An order is confirmed once payment has been received and we have sent confirmation.

Pricing:

Prices are shown in Syrian Pounds. Card payments are charged in US Dollars using the exchange rate in effect at the time of the order, which is shown before you pay.

Custom orders:

Custom pieces begin production only after a quote is approved and paid. Because they are made specifically for you, they cannot be cancelled once production has begun.`,
    bodyAr: `نص مؤقت — يجب استبداله قبل الإطلاق:
هذه الصياغة مؤقتة لغرض عرض الصفحة فقط، ولم تراجَع قانونياً وليست كافية لمتجر فعلي.

الطلبات:

تقديم الطلب يُعد عرضاً للشراء، ويُعتبر الطلب مؤكداً عند استلام الدفعة وإرسالنا للتأكيد.

الأسعار:

تُعرض الأسعار بالليرة السورية. تُحصَّل مدفوعات البطاقة بالدولار الأمريكي وفق سعر الصرف المعتمد وقت الطلب، والذي يظهر لك قبل الدفع.

الطلبات المخصصة:

يبدأ تنفيذ القطع المخصصة بعد الموافقة على عرض السعر ودفعه. ولأنها تُصنع خصيصاً لك، لا يمكن إلغاؤها بعد بدء التنفيذ.`,
  },
  {
    _id: 'legal-refund',
    _type: 'legalPage',
    slug: 'refund-policy',
    title: 'Refund & Shipping Policy',
    titleAr: 'سياسة الاسترجاع والشحن',
    lastUpdated: today,
    body: `PLACEHOLDER — REPLACE BEFORE LAUNCH:
This wording is a structural placeholder so the page renders. It has not been reviewed by a lawyer and is not adequate for a live shop.

Shipping:

Ready-made items are dispatched within 1-2 working days. Delivery inside Syria usually takes 3-5 days.

Returns:

Ready-made items may be returned within 7 days of delivery if unused and in original packaging. Return shipping is the customer's responsibility unless the item arrived damaged or incorrect.

Refunds:

Approved refunds are issued to the original payment method within 14 days of us receiving the returned item. Custom pieces are non-refundable unless they arrive damaged or differ from what was agreed.`,
    bodyAr: `نص مؤقت — يجب استبداله قبل الإطلاق:
هذه الصياغة مؤقتة لغرض عرض الصفحة فقط، ولم تراجَع قانونياً وليست كافية لمتجر فعلي.

الشحن:

تُشحن القطع الجاهزة خلال يوم إلى يومي عمل، ويستغرق التوصيل داخل سوريا عادةً من ٣ إلى ٥ أيام.

الإرجاع:

يمكن إرجاع القطع الجاهزة خلال ٧ أيام من الاستلام إذا كانت غير مستخدمة وبعبوتها الأصلية. تكاليف إرجاع الشحن على العميل ما لم تصل القطعة تالفة أو خاطئة.

الاسترداد:

تُعاد المبالغ المعتمدة إلى وسيلة الدفع الأصلية خلال ١٤ يوماً من استلامنا للقطعة المرتجعة. القطع المخصصة غير قابلة للاسترداد إلا إذا وصلت تالفة أو مخالفة للمتفق عليه.`,
  },
];

async function main() {
  const undo = process.argv.includes('--undo');

  if (undo) {
    console.log('Removing seeded demo content...');
    const tx = SEEDED_IDS.reduce((t, id) => t.delete(id), client.transaction());
    await tx.commit();
    console.log(`Deleted ${SEEDED_IDS.length} documents.`);
    return;
  }

  console.log(`Seeding ${docs.length} documents into ${projectId}/${dataset}...`);
  const tx = docs.reduce((t, doc) => t.createOrReplace(doc), client.transaction());
  await tx.commit();

  for (const d of docs) console.log(`  ✓ ${d._type.padEnd(18)} ${d._id}`);
  console.log('\nDone. Undo with: npx tsx scripts/dev/seed-demo-content.ts --undo');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
