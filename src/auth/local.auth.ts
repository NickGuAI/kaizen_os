/**
 * Local Auth Provider
 *
 * Implements authentication using HMAC-signed session cookies.
 * Uses Argon2id for password hashing (compatible with existing authService).
 */

import crypto from 'crypto'
import argon2 from 'argon2'
import { PrismaClient } from '@prisma/client'
import { AuthProvider, AuthResult, Session } from './types'

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

interface SessionPayload {
  userId: string
  issuedAt: number
}

/**
 * Convert userId for Prisma query.
 * Handles both pre-migration (INT) and post-migration (UUID) schemas.
 * Pre-migration: User.id is Int, so numeric strings must be converted.
 * Post-migration: User.id is String (UUID), use as-is.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toUserIdForPrisma(userId: string): string | null {
  if (!UUID_RE.test(userId)) {
    return null
  }
  return userId
}

export class LocalAuthProvider implements AuthProvider {
  private prisma: PrismaClient
  private sessionSecret: string
  private sessionTtlMs: number

  constructor(
    prisma: PrismaClient,
    sessionSecret: string,
    sessionTtlMs: number = DEFAULT_SESSION_TTL_MS
  ) {
    this.prisma = prisma
    this.sessionSecret = sessionSecret
    this.sessionTtlMs = sessionTtlMs
  }

  async signIn(email: string, password: string): Promise<AuthResult | null> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user || !user.passwordHash) {
      return null
    }

    // Verify password
    const isValid = await this.verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return null
    }

    // Create session
    const session: Session = {
      userId: String(user.id),
      email: user.email,
      expiresAt: new Date(Date.now() + this.sessionTtlMs),
    }

    return {
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name ?? undefined,
        timezone: user.timezone ?? null,
      },
      session,
    }
  }

  async signUp(email: string, password: string, name?: string): Promise<AuthResult> {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const passwordHash = await this.hashPassword(password)

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
      },
    })

    // Create session
    const session: Session = {
      userId: String(user.id),
      email: user.email,
      expiresAt: new Date(Date.now() + this.sessionTtlMs),
    }

    return {
      user: {
        id: String(user.id),
        email: user.email,
        name: user.name ?? undefined,
        timezone: user.timezone ?? null,
      },
      session,
    }
  }

  async signOut(_session: Session): Promise<void> {
    // Local sessions are stateless - nothing to invalidate server-side
    // Client should clear the cookie
  }

  async verifyToken(token: string): Promise<Session | null> {
    const payload = this.decodeSession(token)
    if (!payload) {
      return null
    }

    // Look up user to get email
    // Use toUserIdForPrisma to handle both INT (pre-migration) and UUID (post-migration)
    const prismaUserId = toUserIdForPrisma(payload.userId)
    if (!prismaUserId) {
      return null
    }

    const user = await this.prisma.user.findUnique({
      where: { id: prismaUserId },
    })

    if (!user) {
      return null
    }

    return {
      userId: String(user.id),
      email: user.email,
      expiresAt: new Date(payload.issuedAt + this.sessionTtlMs),
    }
  }

  createSessionToken(userId: string): string {
    return this.encodeSession({
      userId,
      issuedAt: Date.now(),
    })
  }

  // =========================================================================
  // Session Encoding/Decoding (HMAC-SHA256)
  // =========================================================================

  private encodeSession(payload: SessionPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(encoded)
      .digest('base64url')
    return `${encoded}.${signature}`
  }

  private decodeSession(value: string): SessionPayload | null {
    const [encoded, signature] = value.split('.')
    if (!encoded || !signature) {
      return null
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(encoded)
      .digest('base64url')

    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (signatureBuffer.length !== expectedBuffer.length) {
      return null
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null
    }

    // Decode payload
    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf-8')
      ) as SessionPayload

      if (!payload.userId || !payload.issuedAt) {
        return null
      }

      // Check expiration
      if (Date.now() - payload.issuedAt > this.sessionTtlMs) {
        return null
      }

      return payload
    } catch {
      return null
    }
  }

  // =========================================================================
  // Password Hashing (Argon2id - compatible with existing authService)
  // =========================================================================

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id })
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch {
      return false
    }
  }
}
