import { defineField, defineType } from 'sanity'

/**
 * Currency / exchange-rate settings.
 *
 * Pricing model: products are authored once, in SYP. Customers paying by card
 * (Stripe) are charged in USD, converted using the rate set here. There is
 * deliberately no second price field per product — changing this one rate
 * re-prices the whole catalogue in USD immediately.
 *
 * The rate in effect is snapshotted onto every order at purchase time, so
 * editing it never rewrites the value of orders already placed.
 */
export const currencySettingsType = defineType({
  name: 'currencySettings',
  title: 'Currency & Exchange Rate',
  type: 'document',
  fields: [
    defineField({
      name: 'sypPerUsd',
      title: 'Exchange rate — SYP per 1 USD',
      type: 'number',
      description:
        'How many Syrian Pounds equal 1 US Dollar. For example, if 1 USD = 13,000 SYP, enter 13000. ' +
        'Card prices are calculated from this, so update it whenever the market rate moves.',
      validation: (Rule) =>
        Rule.required()
          .positive()
          .custom((value) =>
            typeof value === 'number' && value < 1
              ? 'This should be SYP per 1 USD (a large number, e.g. 13000) — not USD per SYP.'
              : true
          ),
    }),
    defineField({
      name: 'showUsdPrices',
      title: 'Show USD prices on the website',
      type: 'boolean',
      description:
        'When on, products display the converted USD price alongside the SYP price.',
      initialValue: () => true,
    }),
    defineField({
      name: 'rateNote',
      title: 'Internal note',
      type: 'string',
      description:
        'Optional — for your own reference, e.g. "market rate 12 Aug" or the source used.',
    }),
  ],
  preview: {
    select: { rate: 'sypPerUsd', note: 'rateNote' },
    prepare({ rate, note }) {
      return {
        title: '💱 Currency & Exchange Rate',
        subtitle: rate ? `1 USD = ${Number(rate).toLocaleString()} SYP${note ? ` — ${note}` : ''}` : 'Rate not set',
      }
    },
  },
})
