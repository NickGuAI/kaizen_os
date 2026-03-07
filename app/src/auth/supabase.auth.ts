/**
 * Supabase Auth Provider
 *
 * Wraps Supabase Auth for user authentication.
 * Uses JWT tokens instead of HMAC-signed cookies.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { AuthProvider, AuthResult, Session } from './types'

export class SupabaseAuthProvider implements AuthProvider {
  private client: SupabaseClient

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.client = createClient(supabaseUrl, supabaseAnonKey)
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
    // Get user from JWT
    const { data, error } = await this.client.auth.getUser(token)

    if (error || !data.user) {
      return null
    }

    return {
      userId: data.user.id,
      email: data.user.email!,
      accessToken: token,
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
