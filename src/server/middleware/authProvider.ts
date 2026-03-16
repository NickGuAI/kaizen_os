/**
 * Auth Provider Middleware
 *
 * Uses the configured AuthProvider (local or Supabase) for authentication.
 * Supports both cookie-based sessions (local) and Bearer token auth (Supabase).
 */

import type { Request, RequestHandler } from 'express'
import { prisma } from '../../lib/db'
import { getAuthProvider, Session } from '../../auth'

const SESSION_COOKIE_NAME = 'kaizen_session'

/**
 * Parse cookies from request header.
 */
function parseCookies(header?: string): Record<string, string> {
  if (!header) {
    return {}
  }

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split('=')
    if (!key) {
      return acc
    }
    acc[key] = decodeURIComponent(rest.join('='))
    return acc
  }, {})
}

function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3
}

/**
 * Extract token from request (cookie or Bearer header).
 */
function extractToken(req: Request): string | null {
  const isSupabase = process.env.AUTH_PROVIDER === 'supabase'

  const cookies = parseCookies(req.headers.cookie)
  const cookieToken = cookies[SESSION_COOKIE_NAME]
  const authHeader = req.headers.authorization
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (isSupabase) {
    if (bearerToken && looksLikeJwt(bearerToken)) {
      return bearerToken
    }
    if (cookieToken && looksLikeJwt(cookieToken)) {
      return cookieToken
    }
    return null
  }

  // Local mode: prefer cookie, then Bearer if present.
  if (cookieToken) {
    return cookieToken
  }
  if (bearerToken) {
    return bearerToken
  }

  return null
}

/**
 * Convert userId for Prisma query.
 * Handles both pre-migration (INT) and post-migration (UUID) schemas.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toUserIdForPrisma(userId: string): string | null {
  if (!UUID_RE.test(userId)) {
    return null
  }
  return userId
}

/**
 * Load session from request using configured AuthProvider.
 */
async function loadSession(req: Request): Promise<Session | null> {
  const token = extractToken(req)
  if (!token) {
    return null
  }

  const authProvider = getAuthProvider()
  return authProvider.verifyToken(token)
}

/**
 * Middleware that requires authentication.
 * Populates both req.user (for backward compat) and req.authSession (new).
 */
export const requireAuthV2: RequestHandler = async (req, res, next) => {
  try {
    const session = await loadSession(req)

    if (!session) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }

    // Store session for new code paths
    req.authSession = session

    // Load full user object for backward compatibility
    const prismaUserId = toUserIdForPrisma(session.userId)
    if (!prismaUserId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: prismaUserId },
    })

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
      })
    }

    req.user = user
    return next()
  } catch (error) {
    return next(error)
  }
}

/**
 * Middleware that optionally loads auth context if present.
 */
export const optionalAuthV2: RequestHandler = async (req, _res, next) => {
  try {
    const session = await loadSession(req)
    if (session) {
      req.authSession = session

      // Load full user object
      const prismaUserId = toUserIdForPrisma(session.userId)
      if (!prismaUserId) {
        return next()
      }

      const user = await prisma.user.findUnique({
        where: { id: prismaUserId },
      })

      if (user) {
        req.user = user
      }
    }
    return next()
  } catch (error) {
    return next(error)
  }
}
