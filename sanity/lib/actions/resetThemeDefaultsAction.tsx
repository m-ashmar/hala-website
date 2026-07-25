import { useCallback, useState } from 'react'
import { useDocumentOperation } from 'sanity'
import type { DocumentActionComponent } from 'sanity'

/**
 * The site's original color values, straight from app/globals.css'
 * :root block. This is the "off" state of the extras layer — the
 * exact palette the site launched with.
 */
export const DEFAULT_THEME_VALUES = {
  bgPrimary: '#FAF7F5',
  bgSecondary: '#F6EDEE',
  accent: '#CFA18D',
  accentLight: '#E3B8A7',
  accentDark: '#B07E6A',
  textPrimary: '#3A2E2A',
  textSecondary: '#6B5B55',
  highlight: '#EAD0D6',
  footerBg: '#3A2E2A',
  footerText: '#FAF7F5',
  enableExtras: false,
}

export const ResetThemeDefaultsAction: DocumentActionComponent = (props) => {
  const { id, type, onComplete } = props
  const { patch } = useDocumentOperation(id, type)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleConfirm = useCallback(() => {
    patch.execute([{ set: DEFAULT_THEME_VALUES }])
    setDialogOpen(false)
    onComplete()
  }, [patch, onComplete])

  return {
    label: 'Reset to Defaults',
    icon: () => '↺',
    tone: 'caution',
    onHandle: () => setDialogOpen(true),
    dialog: dialogOpen && {
      type: 'confirm',
      onCancel: () => setDialogOpen(false),
      onConfirm: handleConfirm,
      message:
        "Reset every color on this page back to Halahello's original palette? This overwrites whatever is currently set here. You'll still need to Publish afterward for it to go live.",
    },
  }
}
