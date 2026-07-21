import { defineType, defineField } from 'sanity'

export const customRequestType = defineType({
  name: 'customRequest',
  title: 'Custom Requests',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'name',
      title: 'Customer Name',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'email',
      title: 'Customer Email',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'details',
      title: 'Details',
      type: 'text',
      readOnly: true,
    }),
    defineField({
      name: 'imageUrls',
      title: 'Reference Images',
      type: 'array',
      of: [{ type: 'url' }],
      readOnly: true,
    }),
    defineField({
      name: 'requestedQuantity',
      title: 'Requested Quantity',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Submitted', value: 'SUBMITTED' },
          { title: 'Quoted', value: 'QUOTED' },
          { title: 'Paid', value: 'PAID' },
          { title: 'In Production', value: 'IN_PRODUCTION' },
          { title: 'Shipped', value: 'SHIPPED' },
          { title: 'Cancelled', value: 'CANCELLED' },
        ],
      },
    }),
    defineField({
      name: 'quotePrice',
      title: 'Quoted Price',
      type: 'number',
    }),
    defineField({
      name: 'estimatedDays',
      title: 'Estimated Days',
      type: 'number',
    }),
    defineField({
      name: 'adminNotes',
      title: 'Admin Notes',
      type: 'text',
    }),
    defineField({
      name: 'prismaId',
      title: 'Prisma ID',
      type: 'string',
      readOnly: true,
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'name',
    },
  },
})
