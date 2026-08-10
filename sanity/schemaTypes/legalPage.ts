import { defineField, defineType } from 'sanity'

/**
 * Legal pages (Privacy Policy, Terms, Refund Policy).
 *
 * Content lives in the CMS rather than the codebase for two reasons: the
 * wording is a legal matter for the business to author and revise, and it
 * must be changeable without a deploy.
 *
 * The footer already links to /privacy and /terms — those routes returned 404
 * until these documents existed. Stripe also asks for them during onboarding.
 */
export const legalPageType = defineType({
  name: 'legalPage',
  title: 'Legal Page',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Page',
      type: 'string',
      description: 'Which legal page this is. One document per page.',
      options: {
        list: [
          { title: 'Privacy Policy  (/privacy)', value: 'privacy' },
          { title: 'Terms & Conditions  (/terms)', value: 'terms' },
          { title: 'Refund & Shipping Policy  (/refund-policy)', value: 'refund-policy' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title (English)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'titleAr',
      title: 'Title (Arabic)',
      type: 'string',
    }),
    defineField({
      name: 'body',
      title: 'Content (English)',
      type: 'text',
      rows: 24,
      description:
        'Full policy text. Blank lines separate paragraphs. A line ending in a colon is rendered as a heading.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'bodyAr',
      title: 'Content (Arabic)',
      type: 'text',
      rows: 24,
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'date',
      description: 'Shown to customers, and expected on a policy page.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug', updated: 'lastUpdated' },
    prepare({ title, slug, updated }) {
      return {
        title: `📄 ${title ?? slug}`,
        subtitle: `/${slug}${updated ? ` — updated ${updated}` : ''}`,
      }
    },
  },
})
