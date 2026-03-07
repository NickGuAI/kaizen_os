/**
 * Data Provider Factory
 *
 * Creates the appropriate data provider based on configuration.
 * Supports local PostgreSQL (via Prisma) and Supabase (with RLS).
 */

import type { PrismaClient } from '@prisma/client'
import prisma from '../lib/db'
import { DataProvider, DataProviderConfig } from './providers/types'
import { LocalPostgresProvider } from './providers/local.provider'
import { SupabaseProvider } from './providers/supabase.provider'

// Re-export types for convenience
export * from './providers/types'
export { LocalPostgresProvider } from './providers/local.provider'
export { SupabaseProvider } from './providers/supabase.provider'

function getPrismaClient(): PrismaClient {
  return prisma
}

/**
 * Create a data provider based on configuration.
 *
 * @example
 * // Local PostgreSQL (development)
 * const provider = createDataProvider({ type: 'local' })
 *
 * @example
 * // Supabase (production)
 * const provider = createDataProvider({
 *   type: 'supabase',
 *   supabaseUrl: process.env.SUPABASE_URL,
 *   supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
 * })
 */
export function createDataProvider(config: DataProviderConfig): DataProvider {
  switch (config.type) {
    case 'local':
      return new LocalPostgresProvider(getPrismaClient())

    case 'supabase':
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error('supabaseUrl and supabaseAnonKey are required for Supabase provider')
      }
      return new SupabaseProvider(config.supabaseUrl, config.supabaseAnonKey)

    default:
      throw new Error(`Unknown provider type: ${(config as any).type}`)
  }
}

/**
 * Create data provider from environment variables.
 *
 * Reads DATA_PROVIDER env var to determine provider type:
 * - 'local' or unset: Use LocalPostgresProvider with Prisma
 * - 'supabase': Use SupabaseProvider (requires SUPABASE_URL and SUPABASE_ANON_KEY)
 */
export function createDataProviderFromEnv(): DataProvider {
  const providerType = process.env.DATA_PROVIDER || 'local'

  if (providerType === 'supabase') {
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required when DATA_PROVIDER=supabase')
    }

    return createDataProvider({
      type: 'supabase',
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
    })
  }

  return createDataProvider({ type: 'local' })
}

// Default provider instance (lazy-initialized)
let defaultProvider: DataProvider | null = null

/**
 * Get the default data provider.
 * Lazily initializes based on environment configuration.
 */
export function getDataProvider(): DataProvider {
  if (!defaultProvider) {
    defaultProvider = createDataProviderFromEnv()
  }
  return defaultProvider
}
