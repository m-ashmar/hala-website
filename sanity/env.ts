// Use fallback empty strings so this module can be imported during Next.js
// build without throwing. The real values must be set as env vars on the
// deployment platform (Vercel). Requests will fail at runtime if missing.

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-07-07'

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || ''

export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
