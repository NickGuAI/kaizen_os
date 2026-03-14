import type { Response } from 'express'

const SESSION_COOKIE_NAME = 'kaizen_session'

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
}
