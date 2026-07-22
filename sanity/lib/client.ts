import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId } from '../env'

/**
 * Lazily creates the Sanity client on first use.
 * This prevents build-time failures when env vars aren't available.
 */
let _client: ReturnType<typeof createClient> | null = null
let _writeClient: ReturnType<typeof createClient> | null = null

/**
 * Read-only client — safe for use in Server Components and client bundles.
 * useCdn: false ensures newly published content appears immediately.
 */
export const client = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (!_client) {
      _client = createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        perspective: 'published',
      })
    }
    const value = (_client as any)[prop]
    return typeof value === 'function' ? value.bind(_client) : value
  },
})

/**
 * Write-enabled client — SERVER SIDE ONLY.
 * Never import this in client components or pages.
 * Used exclusively by lib/services/sanity-sync.service.ts.
 *
 * Requires SANITY_API_TOKEN (Editor or above) to be set.
 */
export const writeClient = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (!_writeClient) {
      _writeClient = createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: process.env.SANITY_API_TOKEN,
      })
    }
    const value = (_writeClient as any)[prop]
    return typeof value === 'function' ? value.bind(_writeClient) : value
  },
})
