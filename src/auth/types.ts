/**
 * Auth Provider Types
 *
 * Abstraction layer for authentication supporting local HMAC sessions and Supabase Auth.
 */

/**
 * Authenticated user session information
 */
export interface Session {
  userId: string
  email: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
}

/**
 * Result of successful authentication
 */
export interface AuthResult {
  user: {
    id: string
    email: string
    name?: string
    timezone?: string | null
  }
  session: Session
}

/**
 * Auth provider configuration
 */
export interface AuthProviderConfig {
  type: 'local' | 'supabase'
  /** Session secret for HMAC signing (local only) */
  sessionSecret?: string
  /** Session TTL in milliseconds (local only) */
  sessionTtlMs?: number
  /** Supabase URL (supabase only) */
  supabaseUrl?: string
  /** Supabase anon key (supabase only) */
  supabaseAnonKey?: string
}

/**
 * Auth Provider Interface
 *
 * Provides authentication operations abstracting the underlying implementation.
 * - LocalAuthProvider: HMAC-signed session cookies
 * - SupabaseAuthProvider: Supabase Auth with JWT
 */
export interface AuthProvider {
  /**
   * Sign in with email and password.
   * Returns session info on success, null on invalid credentials.
   */
  signIn(email: string, password: string): Promise<AuthResult | null>

  /**
   * Sign up a new user with email and password.
   * Returns session info on success, throws on failure.
   */
  signUp(email: string, password: string, name?: string): Promise<AuthResult>

  /**
   * Sign out the current user.
   */
  signOut(session: Session): Promise<void>

  /**
   * Verify a token/cookie and return session info.
   * Returns null if token is invalid or expired.
   */
  verifyToken(token: string): Promise<Session | null>

  /**
   * Request password reset email.
   * (Supabase only - local mode doesn't support this)
   */
  resetPassword?(email: string): Promise<void>

  /**
   * Refresh the session using a refresh token.
   * (Supabase only - local mode doesn't support this)
   */
  refreshSession?(refreshToken: string): Promise<AuthResult | null>

  /**
   * Create session token from user info.
   * Used after successful sign in to create cookie value.
   */
  createSessionToken(userId: string): string
}
