import { defineField, defineType } from 'sanity'

export const productCategoryType = defineType({
  name: 'productCategory',
  title: 'Product Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title (English)',
      type: 'string',
      description: 'e.g. "Silk Scarves", "Pins", "Keychains", "Wall Art"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'titleAr',
      title: 'Title (Arabic)',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'division',
      title: 'Division',
      type: 'string',
      description: 'Which brand line this category belongs to',
      options: {
        list: [
          { title: 'Hijab by Halahello', value: 'hijab' },
          { title: 'Plexi by Halahello', value: 'plexi' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Category Image / Icon',
      type: 'image',
      options: { hotspot: true },
      description: 'Optional — shown on category filter chips',
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first within the same division',
      initialValue: () => 10,
    }),
    defineField({
      name: 'isActive',
      title: 'Active / Show on Website',
      type: 'boolean',
      initialValue: () => true,
    }),
  ],
  orderings: [
    {
      title: 'Division then Order',
      name: 'divisionOrder',
      by: [
        { field: 'division', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      division: 'division',
      media: 'image',
      isActive: 'isActive',
    },
    prepare({ title, division, media, isActive }) {
      return {
        title: `${isActive ? '🟢' : '🔴'} ${title}`,
        subtitle: division === 'hijab' ? '🧕 Hijab by Halahello' : '✦ Plexi by Halahello',
        media,
      }
    },
  },
})
