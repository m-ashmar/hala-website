import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../env'

/**
 * Read-only client — safe for use in Server Components and client bundles.
 * useCdn: false ensures newly published content appears immediately.
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: 'published',
})

/**
 * Write-enabled client — SERVER SIDE ONLY.
 * Never import this in client components or pages.
 * Used exclusively by lib/services/sanity-sync.service.ts.
 *
 * Requires SANITY_API_TOKEN (Editor or above) to be set.
 */
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

