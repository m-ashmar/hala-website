import { defineField, defineType } from 'sanity'

export const homepageBannerType = defineType({
  name: 'homepageBanner',
  title: 'Homepage Banner',
  type: 'document',
  fields: [
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
      name: 'subtitle',
      title: 'Subtitle (English)',
      type: 'string',
    }),
    defineField({
      name: 'subtitleAr',
      title: 'Subtitle (Arabic)',
      type: 'string',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Primary Button Label (English)',
      type: 'string',
      description: 'Call-to-action button text (e.g. "Shop Now")',
    }),
    defineField({
      name: 'ctaLabelAr',
      title: 'Primary Button Label (Arabic)',
      type: 'string',
    }),
    defineField({
      name: 'ctaLink',
      title: 'Primary Button Link',
      type: 'string',
      description: 'URL or path (e.g. /products, /offers, or #hijab-products to scroll)',
    }),
    defineField({
      name: 'ctaLabel2',
      title: 'Secondary Button Label (English)',
      type: 'string',
      description: 'Optional second button text (e.g. "Discover Plexi")',
    }),
    defineField({
      name: 'ctaLabelAr2',
      title: 'Secondary Button Label (Arabic)',
      type: 'string',
    }),
    defineField({
      name: 'ctaLink2',
      title: 'Secondary Button Link',
      type: 'string',
      description: 'URL or section ID for the second button (e.g. #plexi-products to scroll)',
    }),
    defineField({
      name: 'backgroundImage',
      title: 'Background Image (Desktop)',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mobileImage',
      title: 'Background Image (Mobile)',
      type: 'image',
      options: { hotspot: true },
      description: 'Optional mobile-optimized version of the banner image',
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: () => true,
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first in the carousel',
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      isActive: 'isActive',
      order: 'order',
      media: 'backgroundImage',
    },
    prepare({ title, isActive, order, media }) {
      return {
        title: `${isActive ? '🟢' : '🔴'} #${order} — ${title}`,
        media,
      }
    },
  },
})
