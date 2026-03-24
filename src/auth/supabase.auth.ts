/**
 * Supabase Auth Provider
 *
 * Wraps Supabase Auth for user authentication.
 * Supports both HS256 (legacy anon key) and ES256 (new publishable key) JWTs.
 * ES256 tokens are verified locally via JWKS since GoTrue's /auth/v1/user
 * endpoint doesn't yet support ES256 JWTs without a kid header.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as jose from 'jose'
import { AuthProvider, AuthResult, Session } from './types'

export class SupabaseAuthProvider implements AuthProvider {
  private client: SupabaseClient
  private supabaseUrl: string
  private jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.client = createClient(supabaseUrl, supabaseAnonKey)
    this.supabaseUrl = supabaseUrl
  }

  async signIn(email: string, password: string): Promise<AuthResult | null> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user || !data.session) {
      return null
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name,
        timezone: data.user.user_metadata?.timezone ?? null,
      },
      session: {
        userId: data.user.id,
        email: data.user.email!,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at! * 1000),
      },
    }
  }

  async signUp(email: string, password: string, name?: string): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('Sign up failed: no user returned')
    }

    // Note: Supabase may require email confirmation
    // In that case, session will be null until confirmed
    const session: Session = {
      userId: data.user.id,
      email: data.user.email!,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresAt: data.session?.expires_at
        ? new Date(data.session.expires_at * 1000)
        : undefined,
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        name,
        timezone: data.user.user_metadata?.timezone ?? null,
      },
      session,
    }
  }

  async signOut(_session: Session): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  async refreshSession(refreshToken: string): Promise<AuthResult | null> {
    const { data, error } = await this.client.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.user || !data.session) {
      return null
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name,
        timezone: data.user.user_metadata?.timezone ?? null,
      },
      session: {
        userId: data.user.id,
        email: data.user.email!,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at! * 1000),
      },
    }
  }

  async verifyToken(token: string): Promise<Session | null> {
    // Try getUser first (works for HS256 / legacy anon key tokens)
    const { data, error } = await this.client.auth.getUser(token)
    if (!error && data.user) {
      return {
        userId: data.user.id,
        email: data.user.email!,
        accessToken: token,
      }
    }

    // Fallback: verify ES256 JWT locally via JWKS.
    // New Supabase publishable keys produce ES256 JWTs that GoTrue's
    // /auth/v1/user endpoint can't verify yet (missing kid in header).
    try {
      if (!this.jwks) {
        const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', this.supabaseUrl)
        this.jwks = jose.createRemoteJWKSet(jwksUrl)
      }

      const { payload } = await jose.jwtVerify(token, this.jwks, {
        issuer: `${this.supabaseUrl}/auth/v1`,
      })

      const sub = payload.sub
      const email = (payload as Record<string, unknown>).email as string | undefined
      if (!sub) {
        return null
      }

      return {
        userId: sub,
        email: email ?? '',
        accessToken: token,
      }
    } catch (jwksError) {
      console.error('[auth] JWT verification failed:', (jwksError as Error).message)
      return null
    }
  }

  createSessionToken(_userId: string): string {
    // Supabase handles token creation internally
    // This method returns a placeholder - actual tokens come from signIn/signUp
    throw new Error(
      'Supabase Auth manages tokens internally. ' +
        'Use the accessToken from signIn/signUp response.'
    )
  }

  /**
   * Request password reset email.
   * Supabase sends an email with a reset link.
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email)
    if (error) {
      throw new Error(error.message)
    }
  }
}
