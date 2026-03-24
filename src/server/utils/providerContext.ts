/**
 * Provider Context Utilities
 *
 * Helpers for getting auth-scoped data providers from Express requests.
 */

import type { Request } from 'express'
import { getDataProvider, DataProvider, AuthContext } from '../../data'

/**
 * Extract token from request for Supabase RLS.
 * Checks both cookie and Bearer header.
 */
function extractAccessToken(req: Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie)
  const cookieToken = cookies['kaizen_session']
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7)
    if (process.env.AUTH_PROVIDER === 'supabase') {
      if (looksLikeJwt(bearerToken)) {
        return bearerToken
      }
    } else {
      return bearerToken
    }
  }

  if (cookieToken) {
    if (process.env.AUTH_PROVIDER === 'supabase') {
      return looksLikeJwt(cookieToken) ? cookieToken : undefined
    }
    return cookieToken
  }

  return undefined
}

function looksLikeJwt(token: string): boolean {
  return token.split('.').length === 3
}

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

/**
 * Get a DataProvider scoped to the current authenticated user.
 *
 * @param req Express request with authSession populated by requireAuthV2
 * @returns DataProvider instance scoped to the user
 * @throws Error if request is not authenticated
 *
 * @example
 * router.get('/seasons', requireAuthV2, async (req, res) => {
 *   const provider = getDataProviderForRequest(req)
 *   const seasons = await provider.getSeasons() // Auto-filtered to user
 *   res.json({ seasons })
 * })
 */
export function getDataProviderForRequest(req: Request): DataProvider {
  const session = req.authSession
  if (!session) {
    throw new Error('Auth context required. Ensure requireAuthV2 middleware is applied.')
  }

  const authCtx: AuthContext = {
    userId: session.userId,
    email: session.email,
    accessToken: extractAccessToken(req),
  }

  return getDataProvider().withAuth(authCtx)
}

/**
 * Check if request is authenticated (useful for optional auth scenarios).
 */
export function isAuthenticated(req: Request): boolean {
  return !!req.authSession
}
