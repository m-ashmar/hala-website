import { defineField, defineType } from 'sanity'

export const productType = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'media', title: 'Media' },
    { name: 'pricing', title: 'Pricing & Stock' },
    { name: 'variants', title: 'Variants & Customization' },
    { name: 'relations', title: 'Related & SEO' },
  ],
  fields: [
    // ── Identity ──────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title (English)',
      type: 'string',
      group: 'content',
      description: 'Product name shown on the website in English',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'titleAr',
      title: 'Title (Arabic)',
      type: 'string',
      group: 'content',
      description: 'Product name in Arabic',
    }),
    defineField({
      name: 'sanityId',
      title: 'Product Slug / Sanity ID',
      type: 'slug',
      group: 'content',
      description: 'Must match the ID in the database (e.g. hijab-rose-silk). Used for DB sync.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Division',
      type: 'string',
      group: 'content',
      description: 'Which top-level brand line this product belongs to',
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
      name: 'subCategory',
      title: 'Category',
      type: 'reference',
      group: 'content',
      description: 'The specific category within the division above (e.g. Silk Scarves, Keychains). Only categories matching the selected division are shown.',
      to: [{ type: 'productCategory' }],
      options: {
        filter: ({ document }) => {
          const division = (document as { category?: string })?.category
          return division ? { filter: 'division == $division', params: { division } } : {}
        },
      },
    }),
    defineField({
      name: 'description',
      title: 'Description (English)',
      type: 'text',
      group: 'content',
      rows: 4,
    }),
    defineField({
      name: 'descriptionAr',
      title: 'Description (Arabic)',
      type: 'text',
      group: 'content',
      rows: 4,
    }),
    defineField({
      name: 'deliveryInfo',
      title: 'Delivery Information (English)',
      type: 'text',
      group: 'content',
      rows: 2,
      description: 'Shown on the product detail page (e.g. "Ships within 3-5 business days")',
    }),
    defineField({
      name: 'deliveryInfoAr',
      title: 'Delivery Information (Arabic)',
      type: 'text',
      group: 'content',
      rows: 2,
    }),
    defineField({
      name: 'returnPolicy',
      title: 'Return Policy (English)',
      type: 'text',
      group: 'content',
      rows: 2,
    }),
    defineField({
      name: 'returnPolicyAr',
      title: 'Return Policy (Arabic)',
      type: 'text',
      group: 'content',
      rows: 2,
    }),

    // ── Media ─────────────────────────────────────────────────
    defineField({
      name: 'image',
      title: 'Main Product Image',
      type: 'image',
      group: 'media',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'gallery',
      title: 'Image Gallery',
      type: 'array',
      group: 'media',
      description: 'Additional images shown in the product detail gallery (up to 10)',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (Rule) => Rule.max(10),
    }),

    // ── Pricing ───────────────────────────────────────────────
    defineField({
      name: 'price',
      title: 'Price (SYP)',
      type: 'number',
      group: 'pricing',
      description: 'The base price in Syrian Pounds. This will automatically sync to the database.',
      validation: (Rule) => Rule.required().min(0),
    }),
    defineField({
      name: 'discountPrice',
      title: 'Sale Price (SYP)',
      type: 'number',
      group: 'pricing',
      description: 'Optional sale/discount price. When set, shown as the active price with a strikethrough on the original.',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'isActive',
      title: 'Active / Visible on Website',
      type: 'boolean',
      group: 'pricing',
      initialValue: () => true,
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured Product',
      type: 'boolean',
      group: 'pricing',
      description: 'Show in the Featured Products section on the homepage',
      initialValue: () => false,
    }),
    defineField({
      name: 'isBestSeller',
      title: 'Best Seller',
      type: 'boolean',
      group: 'pricing',
      description: 'Show "Best Seller" badge on the product card',
      initialValue: () => false,
    }),
    defineField({
      name: 'isNew',
      title: 'New Arrival',
      type: 'boolean',
      group: 'pricing',
      description: 'Show "New" badge on the product card',
      initialValue: () => false,
    }),

    // ── Variants & Customization ──────────────────────────────
    defineField({
      name: 'specifications',
      title: 'Specifications',
      type: 'array',
      group: 'variants',
      description: 'Key/value pairs shown in the specifications table on the product page',
      of: [
        {
          type: 'object',
          name: 'spec',
          fields: [
            defineField({ name: 'key', title: 'Key (English)', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'keyAr', title: 'Key (Arabic)', type: 'string' }),
            defineField({ name: 'value', title: 'Value (English)', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'valueAr', title: 'Value (Arabic)', type: 'string' }),
          ],
          preview: { select: { title: 'key', subtitle: 'value' } },
        },
      ],
    }),
    defineField({
      name: 'variants',
      title: 'Product Variants',
      type: 'array',
      group: 'variants',
      description: 'Size, color, or other variant groups the customer can choose from',
      of: [
        {
          type: 'object',
          name: 'variantGroup',
          fields: [
            defineField({
              name: 'type',
              title: 'Variant Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Size', value: 'SIZE' },
                  { title: 'Color', value: 'COLOR' },
                  { title: 'Material', value: 'MATERIAL' },
                  { title: 'Style', value: 'STYLE' },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'options',
              title: 'Options',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'variantOption',
                  fields: [
                    defineField({ name: 'label', title: 'Label (English)', type: 'string', validation: (Rule) => Rule.required() }),
                    defineField({ name: 'labelAr', title: 'Label (Arabic)', type: 'string' }),
                    defineField({ name: 'value', title: 'Value (slug-safe)', type: 'string', validation: (Rule) => Rule.required() }),
                    defineField({ name: 'hexColor', title: 'Hex Color (for COLOR type)', type: 'string', description: 'e.g. #FF5733' }),
                    defineField({ name: 'inStock', title: 'In Stock', type: 'boolean', initialValue: () => true }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'value' } },
                },
              ],
            }),
          ],
          preview: { select: { title: 'type' } },
        },
      ],
    }),
    defineField({
      name: 'customizationFields',
      title: 'Customization Fields',
      type: 'array',
      group: 'variants',
      description: 'Optional fields the customer fills in when ordering (e.g. name to engrave, color preference)',
      of: [
        {
          type: 'object',
          name: 'customField',
          fields: [
            defineField({
              name: 'fieldType',
              title: 'Field Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Text Input', value: 'TEXT' },
                  { title: 'Color Picker', value: 'COLOR' },
                  { title: 'Size Select', value: 'SIZE' },
                  { title: 'File Upload', value: 'FILE' },
                  { title: 'Notes / Textarea', value: 'NOTE' },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'label', title: 'Label (English)', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'labelAr', title: 'Label (Arabic)', type: 'string' }),
            defineField({ name: 'placeholder', title: 'Placeholder (English)', type: 'string' }),
            defineField({ name: 'placeholderAr', title: 'Placeholder (Arabic)', type: 'string' }),
            defineField({ name: 'required', title: 'Required', type: 'boolean', initialValue: () => false }),
          ],
          preview: { select: { title: 'label', subtitle: 'fieldType' } },
        },
      ],
    }),

    // ── Relations & SEO ───────────────────────────────────────
    defineField({
      name: 'relatedProducts',
      title: 'Related Products',
      type: 'array',
      group: 'relations',
      description: 'Up to 4 products shown in the "You may also like" section',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      validation: (Rule) => Rule.max(4),
    }),
    defineField({
      name: 'metaTitle',
      title: 'SEO Title',
      type: 'string',
      group: 'relations',
      description: 'Override the page <title> tag for SEO. Defaults to product title if empty.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'SEO Meta Description',
      type: 'text',
      group: 'relations',
      rows: 2,
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      media: 'image',
      isFeatured: 'isFeatured',
      isBestSeller: 'isBestSeller',
    },
    prepare({ title, category, media, isFeatured, isBestSeller }) {
      const badges = [
        isFeatured ? '⭐' : '',
        isBestSeller ? '🏆' : '',
      ].filter(Boolean).join(' ')
      return {
        title: `${badges ? badges + ' ' : ''}${title}`,
        subtitle: category === 'hijab' ? '🧕 Hijab by Halahello' : '✦ Plexi by Halahello',
        media,
      }
    },
  },
})
