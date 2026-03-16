/**
 * Auth Provider Factory
 *
 * Creates the appropriate auth provider based on configuration.
 * Supports local HMAC sessions and Supabase Auth.
 */

import { AuthProvider, AuthProviderConfig } from './types'
import { LocalAuthProvider } from './local.auth'
import { SupabaseAuthProvider } from './supabase.auth'
import prisma from '../lib/db'

// Re-export types for convenience
export * from './types'
export { LocalAuthProvider } from './local.auth'
export { SupabaseAuthProvider } from './supabase.auth'

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

/**
 * Create an auth provider based on configuration.
 *
 * @example
 * // Local HMAC sessions (development)
 * const provider = createAuthProvider({
 *   type: 'local',
 *   sessionSecret: process.env.SESSION_SECRET,
 * })
 *
 * @example
 * // Supabase Auth (production)
 * const provider = createAuthProvider({
 *   type: 'supabase',
 *   supabaseUrl: process.env.SUPABASE_URL,
 *   supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
 * })
 */
export function createAuthProvider(config: AuthProviderConfig): AuthProvider {
  switch (config.type) {
    case 'local': {
      if (!config.sessionSecret) {
        throw new Error('sessionSecret is required for local auth provider')
      }
      return new LocalAuthProvider(
        prisma,
        config.sessionSecret,
        config.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS
      )
    }

    case 'supabase': {
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error('supabaseUrl and supabaseAnonKey are required for Supabase auth provider')
      }
      return new SupabaseAuthProvider(config.supabaseUrl, config.supabaseAnonKey)
    }

    default:
      throw new Error(`Unknown auth provider type: ${(config as any).type}`)
  }
}

/**
 * Create auth provider from environment variables.
 *
 * Reads AUTH_PROVIDER env var to determine provider type:
 * - 'local' or unset: Use LocalAuthProvider (requires SESSION_SECRET)
 * - 'supabase': Use SupabaseAuthProvider (requires SUPABASE_URL and SUPABASE_ANON_KEY)
 */
export function createAuthProviderFromEnv(): AuthProvider {
  const providerType = process.env.AUTH_PROVIDER || 'local'

  if (providerType === 'supabase') {
    const url = process.env.SUPABASE_URL
    const anonKey = process.env.SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required when AUTH_PROVIDER=supabase')
    }

    return createAuthProvider({
      type: 'supabase',
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
    })
  }

  // Local auth
  const sessionSecret = process.env.SESSION_SECRET
  if (!sessionSecret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production when using local auth')
  }

  return createAuthProvider({
    type: 'local',
    sessionSecret: sessionSecret || 'dev-session-secret-change-me',
  })
}

// Default provider instance (lazy-initialized)
let defaultProvider: AuthProvider | null = null

/**
 * Get the default auth provider.
 * Lazily initializes based on environment configuration.
 */
export function getAuthProvider(): AuthProvider {
  if (!defaultProvider) {
    defaultProvider = createAuthProviderFromEnv()
  }
  return defaultProvider
}
