import { defineField, defineType } from 'sanity'
import { ColorPickerInput } from '../components/ColorPickerInput'

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

function hexField(name: string, title: string, description: string, group: string) {
  return defineField({
    name,
    title,
    type: 'string',
    group,
    // Swatch picker + hex field. Asking a shop owner to know that #CFA18D is a
    // dusty rose is not a reasonable way to choose a colour.
    components: { input: ColorPickerInput },
    description: `${description} Pick a colour, or paste a hex code. Leave empty to use the default.`,
    validation: (Rule) =>
      Rule.custom((value) => {
        if (!value) return true
        return HEX_PATTERN.test(value) || 'Must be a hex color like #CFA18D or #FFF'
      }),
  })
}

export const themeSettingsType = defineType({
  name: 'themeSettings',
  title: 'Theme / Colors',
  type: 'document',
  groups: [
    { name: 'palette', title: 'Core Palette', default: true },
    { name: 'text', title: 'Text' },
    { name: 'footer', title: 'Footer' },
    { name: 'advanced', title: 'Advanced' },
  ],
  fields: [
    hexField('bgPrimary', 'Page Background', 'Main page background color', 'palette'),
    hexField('bgSecondary', 'Section Background', 'Alternate section background color', 'palette'),
    hexField('accent', 'Accent', 'Primary brand accent — buttons, links, highlights', 'palette'),
    hexField('accentLight', 'Accent (Light)', 'Lighter accent shade — gradients, hover states', 'palette'),
    hexField('accentDark', 'Accent (Dark)', 'Darker accent shade — used when Advanced extras are on', 'palette'),
    hexField('highlight', 'Highlight', 'Soft highlight background — text selection, badges', 'palette'),
    hexField('textPrimary', 'Primary Text', 'Headings and main body text', 'text'),
    hexField('textSecondary', 'Secondary Text', 'Muted/secondary body text', 'text'),
    hexField('footerBg', 'Footer Background', 'Footer background color', 'footer'),
    hexField('footerText', 'Footer Text', 'Footer text color', 'footer'),
    defineField({
      name: 'enableExtras',
      title: 'Enable Extended Theme',
      type: 'boolean',
      group: 'advanced',
      description: 'Turns on the richer gradient/shading treatment across buttons, cards, and the hero. Off shows a flatter, simpler look using only the core palette above.',
      initialValue: () => false,
    }),
  ],
  preview: {
    prepare() {
      return { title: '🎨 Theme / Colors' }
    },
  },
})
