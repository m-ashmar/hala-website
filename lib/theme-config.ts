/**
 * Fallback used only until an admin sets "Enable Extended Theme" in
 * Sanity Studio (Theme / Colors). Once that document exists, its value
 * always wins — see enableExtras handling in app/[locale]/layout.tsx.
 *
 * When true, layers the extended design tokens (accent-dark, card-bg alias,
 * and the luxury/warm/dark/hero/card gradients) on top of the base palette.
 * When false, those tokens fall back to flat colors from the original
 * palette so the site renders with the original Halahello coloring.
 */
export const ENABLE_EXTRA_THEME_TOKENS = false;
