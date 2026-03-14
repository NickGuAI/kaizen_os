import { Router, Request, Response, NextFunction } from 'express'
import { getAuthProvider } from '../../auth'
import { requireAuthV2 } from '../middleware/authProvider'
import { clearSessionCookie } from '../middleware/auth'
import { encryptToken } from '../../lib/crypto'
import { prisma } from '../../lib/prismaClient'
import { google } from 'googleapis'

const router = Router()

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Registered user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags:
 *       - Auth
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 * /api/auth/logout:
 *   post:
 *     summary: Log out current user
 *     tags:
 *       - Auth
 *     responses:
 *       204:
 *         description: Logged out
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/AuthUser'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
const SESSION_COOKIE_NAME = 'kaizen_session'
const REFRESH_COOKIE_NAME = 'kaizen_refresh'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days


function getCookieValue(header: string | undefined, name: string): string | null {
  if (!header) {
    return null
  }

  const parts = header.split(';')
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) {
      return decodeURIComponent(rest.join('='))
    }
  }

  return null
}

function setSupabaseSessionCookie(res: Response, token: string, expiresAt?: Date) {
  const maxAge = expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : undefined
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
    path: '/',
  })
}

function setSupabaseRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: REFRESH_TTL_MS,
    path: '/',
  })
}


router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body as {
      email?: string
      password?: string
      name?: string
    }

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      })
    }

    const authProvider = getAuthProvider()
    const result = await authProvider.signUp(email, password, name)

    // Set session cookie for local mode, or return token for Supabase mode
    const isSupabase = process.env.AUTH_PROVIDER === 'supabase'
    if (isSupabase) {
      if (result.session.accessToken) {
        setSupabaseSessionCookie(res, result.session.accessToken, result.session.expiresAt)
      }
      if (result.session.refreshToken) {
        setSupabaseRefreshCookie(res, result.session.refreshToken)
      }
      return res.json({
        user: result.user,
        accessToken: result.session.accessToken,
        expiresAt: result.session.expiresAt,
      })
    }

    // Local mode: set cookie
    const token = authProvider.createSessionToken(result.user.id)
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_MS,
      path: '/',
    })
    return res.json({ user: result.user })
  } catch (error) {
    return next(error)
  }
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      })
    }

    const authProvider = getAuthProvider()
    const result = await authProvider.signIn(email, password)

    if (!result) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      })
    }

    // Set session cookie for local mode, or return token for Supabase mode
    const isSupabase = process.env.AUTH_PROVIDER === 'supabase'
    if (isSupabase) {
      if (result.session.accessToken) {
        setSupabaseSessionCookie(res, result.session.accessToken, result.session.expiresAt)
      }
      if (result.session.refreshToken) {
        setSupabaseRefreshCookie(res, result.session.refreshToken)
      }
      return res.json({
        user: result.user,
        accessToken: result.session.accessToken,
        expiresAt: result.session.expiresAt,
      })
    }

    // Local mode: set cookie
    const token = authProvider.createSessionToken(result.user.id)
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_MS,
      path: '/',
    })
    return res.json({ user: result.user })
  } catch (error) {
    return next(error)
  }
})

router.post('/logout', (req: Request, res: Response) => {
  void req
  clearSessionCookie(res)
  res.status(204).send()
})

router.get('/me', requireAuthV2, (req: Request, res: Response) => {
  // requireAuthV2 already validates auth and loads req.user
  const user = req.user
  const isSupabase = process.env.AUTH_PROVIDER === 'supabase'
  if (isSupabase) {
    const authHeader = req.headers.authorization
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const sessionToken = req.authSession?.accessToken ?? null
    if (bearerToken && sessionToken && bearerToken === sessionToken) {
      const existingCookie = getCookieValue(req.headers.cookie, SESSION_COOKIE_NAME)
      if (existingCookie !== bearerToken) {
        setSupabaseSessionCookie(res, bearerToken, req.authSession?.expiresAt)
      }
    }
  }
  return res.json({
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      emailVerifiedAt: user!.emailVerifiedAt,
      timezone: user!.timezone ?? null,
    },
  })
})

// Auto-connect Google Calendar account from Supabase provider tokens.
// Called by AuthCallbackPage after Google OAuth sign-up/login so the
// user doesn't have to go through a separate calendar connection flow.
router.post('/auto-connect-calendar', requireAuthV2, async (req: Request, res: Response) => {
  const { providerToken, providerRefreshToken, email } = req.body as {
    providerToken?: string
    providerRefreshToken?: string
    email?: string
  }
  const userId = req.user!.id

  if (!providerToken || !email) {
    return res.status(400).json({ error: 'providerToken and email are required' })
  }

  try {
    // Verify the token works by fetching user info
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: providerToken })
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()
    const googleEmail = userInfo.email || email

    const SCOPES = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/tasks',
    ]

    await prisma.calendarAccount.upsert({
      where: {
        userId_provider_email: {
          userId,
          provider: 'google',
          email: googleEmail,
        },
      },
      update: {
        accessTokenEncrypted: encryptToken(providerToken),
        ...(providerRefreshToken && {
          refreshTokenEncrypted: encryptToken(providerRefreshToken),
        }),
        scopes: SCOPES,
      },
      create: {
        userId,
        provider: 'google',
        email: googleEmail,
        accessTokenEncrypted: encryptToken(providerToken),
        refreshTokenEncrypted: providerRefreshToken ? encryptToken(providerRefreshToken) : '',
        scopes: SCOPES,
      },
    })

    console.log(`[auth] Auto-connected calendar for ${googleEmail} (user ${userId})`)
    return res.json({ connected: true, email: googleEmail })
  } catch (error) {
    console.error('[auth] Auto-connect calendar failed:', error)
    return res.json({ connected: false })
  }
})

export default router
