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

/** Presets drawn from the current brand palette, for one-click restore. */
const BRAND_SWATCHES = [
  { hex: '#FAF7F5', label: 'Page background' },
  { hex: '#F6EDEE', label: 'Section background' },
  { hex: '#CFA18D', label: 'Accent' },
  { hex: '#E3B8A7', label: 'Accent light' },
  { hex: '#B07E6A', label: 'Accent dark' },
  { hex: '#EAD0D6', label: 'Highlight' },
  { hex: '#3A2E2A', label: 'Text / footer' },
  { hex: '#6B5B55', label: 'Muted text' },
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
        <Text size={1} muted>
          Brand palette
        </Text>
        <Flex gap={1} marginTop={2} wrap="wrap">
          {BRAND_SWATCHES.map((s) => (
            <Card
              key={s.hex}
              as="button"
              type="button"
              onClick={() => commit(s.hex)}
              title={`${s.label} — ${s.hex}`}
              radius={2}
              style={{
                width: 26,
                height: 26,
                background: s.hex,
                border:
                  value?.toUpperCase() === s.hex
                    ? '2px solid var(--card-focus-ring-color)'
                    : '1px solid rgba(0,0,0,0.15)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </Flex>
      </Box>
    </Box>
  )
}
