import { useCallback } from 'react'
import { Box, Card, Flex, Text, TextInput, Button } from '@sanity/ui'
import { set, unset, type StringInputProps } from 'sanity'

/**
 * Colour input for the Theme settings.
 *
 * The fields were plain text expecting a hex code, which asked a shop owner to
 * know that #CFA18D is a dusty rose. This pairs a native colour swatch with the
 * hex field: pick visually, or paste a brand code if you have one. Both edit
 * the same value, so nothing is lost either way.
 *
 * The stored format stays a hex string, so no schema or front-end change is
 * needed — this is purely how the value is entered.
 */

/**
 * Swatch groups.
 *
 * The brand row comes first and is exact, so the current palette can always be
 * restored in one click without looking a code up. The rest is a general
 * palette for exploring a new look — each row runs light to dark so a full
 * theme can be assembled by staying in one column.
 */
const SWATCH_GROUPS: { title: string; colors: { hex: string; label: string }[] }[] = [
  {
    title: 'Brand (current)',
    colors: [
      { hex: '#FAF7F5', label: 'Page background' },
      { hex: '#F6EDEE', label: 'Section background' },
      { hex: '#EAD0D6', label: 'Highlight' },
      { hex: '#E3B8A7', label: 'Accent light' },
      { hex: '#CFA18D', label: 'Accent' },
      { hex: '#B07E6A', label: 'Accent dark' },
      { hex: '#6B5B55', label: 'Muted text' },
      { hex: '#3A2E2A', label: 'Text / footer' },
    ],
  },
  {
    title: 'Neutrals',
    colors: [
      { hex: '#FFFFFF', label: 'White' },
      { hex: '#FAFAF9', label: 'Off white' },
      { hex: '#F5F5F4', label: 'Stone 100' },
      { hex: '#E7E5E4', label: 'Stone 200' },
      { hex: '#A8A29E', label: 'Stone 400' },
      { hex: '#57534E', label: 'Stone 600' },
      { hex: '#292524', label: 'Stone 800' },
      { hex: '#1C1917', label: 'Stone 900' },
    ],
  },
  {
    title: 'Rose & blush',
    colors: [
      { hex: '#FFF1F2', label: 'Rose 50' },
      { hex: '#FFE4E6', label: 'Rose 100' },
      { hex: '#FECDD3', label: 'Rose 200' },
      { hex: '#FDA4AF', label: 'Rose 300' },
      { hex: '#FB7185', label: 'Rose 400' },
      { hex: '#E11D48', label: 'Rose 600' },
      { hex: '#9F1239', label: 'Rose 800' },
      { hex: '#881337', label: 'Rose 900' },
    ],
  },
  {
    title: 'Warm & gold',
    colors: [
      { hex: '#FFFBEB', label: 'Amber 50' },
      { hex: '#FEF3C7', label: 'Amber 100' },
      { hex: '#FDE68A', label: 'Amber 200' },
      { hex: '#F59E0B', label: 'Amber 500' },
      { hex: '#D97706', label: 'Amber 600' },
      { hex: '#B45309', label: 'Amber 700' },
      { hex: '#C2A878', label: 'Champagne' },
      { hex: '#8C6D46', label: 'Bronze' },
    ],
  },
  {
    title: 'Green & sage',
    colors: [
      { hex: '#F0FDF4', label: 'Green 50' },
      { hex: '#DCFCE7', label: 'Green 100' },
      { hex: '#BBF7D0', label: 'Green 200' },
      { hex: '#4ADE80', label: 'Green 400' },
      { hex: '#16A34A', label: 'Green 600' },
      { hex: '#15803D', label: 'Green 700' },
      { hex: '#A3B18A', label: 'Sage' },
      { hex: '#588157', label: 'Fern' },
    ],
  },
  {
    title: 'Blue & teal',
    colors: [
      { hex: '#F0F9FF', label: 'Sky 50' },
      { hex: '#E0F2FE', label: 'Sky 100' },
      { hex: '#7DD3FC', label: 'Sky 300' },
      { hex: '#0EA5E9', label: 'Sky 500' },
      { hex: '#0284C7', label: 'Sky 600' },
      { hex: '#14B8A6', label: 'Teal 500' },
      { hex: '#0F766E', label: 'Teal 700' },
      { hex: '#1E3A5F', label: 'Navy' },
    ],
  },
  {
    title: 'Purple & plum',
    colors: [
      { hex: '#FAF5FF', label: 'Purple 50' },
      { hex: '#F3E8FF', label: 'Purple 100' },
      { hex: '#D8B4FE', label: 'Purple 300' },
      { hex: '#A855F7', label: 'Purple 500' },
      { hex: '#7E22CE', label: 'Purple 700' },
      { hex: '#C4B5D8', label: 'Lilac' },
      { hex: '#6B4E71', label: 'Plum' },
      { hex: '#4C1D95', label: 'Violet 900' },
    ],
  },
]

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

/** The colour input needs a full 6-digit hex; shorthand and empty need widening. */
function toSwatchValue(value?: string): string {
  if (!value || !HEX_RE.test(value)) return '#CFA18D'
  if (value.length === 4) {
    // #abc -> #aabbcc
    return '#' + value.slice(1).split('').map((c) => c + c).join('')
  }
  return value
}

export function ColorPickerInput(props: StringInputProps) {
  const { value, onChange, elementProps } = props

  const commit = useCallback(
    (next: string) => onChange(next ? set(next) : unset()),
    [onChange]
  )

  return (
    <Box>
      <Flex align="center" gap={2}>
        {/* Native picker — works on every platform without a dependency. */}
        <input
          type="color"
          aria-label="Pick a colour"
          value={toSwatchValue(value)}
          onChange={(e) => commit(e.currentTarget.value.toUpperCase())}
          style={{
            width: 46,
            height: 38,
            padding: 2,
            border: '1px solid var(--card-border-color)',
            borderRadius: 4,
            background: 'transparent',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />

        {/* Hex remains editable, for pasting an exact brand colour. */}
        <Box flex={1}>
          <TextInput
            {...elementProps}
            value={value ?? ''}
            placeholder="#CFA18D"
            onChange={(e) => commit(e.currentTarget.value)}
          />
        </Box>

        {value && (
          <Button
            mode="bleed"
            tone="critical"
            text="Clear"
            onClick={() => commit('')}
            title="Use the built-in default for this colour"
          />
        )}
      </Flex>

      <Box marginTop={3}>
        {SWATCH_GROUPS.map((group) => (
          <Box key={group.title} marginBottom={3}>
            <Text size={1} muted weight="medium">
              {group.title}
            </Text>
            <Flex gap={1} marginTop={2} wrap="wrap">
              {group.colors.map((s) => {
                const selected = value?.toUpperCase() === s.hex.toUpperCase()
                return (
                  <Card
                    key={s.hex}
                    as="button"
                    type="button"
                    onClick={() => commit(s.hex)}
                    title={`${s.label} — ${s.hex}`}
                    aria-label={`${s.label} ${s.hex}`}
                    radius={2}
                    style={{
                      width: 26,
                      height: 26,
                      background: s.hex,
                      // Selected swatch gets a ring rather than a colour change,
                      // so the swatch still shows its true colour.
                      boxShadow: selected
                        ? '0 0 0 2px var(--card-bg-color), 0 0 0 4px var(--card-focus-ring-color)'
                        : 'none',
                      border: '1px solid rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                )
              })}
            </Flex>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
