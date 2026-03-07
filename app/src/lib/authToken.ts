type AccessTokenState = {
  token: string
  expiresAt?: number
}

let accessToken: AccessTokenState | null = null

export function setAccessToken(
  token?: string | null,
  expiresAt?: string | Date | number | null
) {
  if (!token) {
    accessToken = null
    return
  }

  let expiresAtMs: number | undefined
  if (expiresAt != null) {
    if (typeof expiresAt === 'string') {
      const parsed = new Date(expiresAt)
      if (!isNaN(parsed.getTime())) {
        expiresAtMs = parsed.getTime()
      }
    } else if (expiresAt instanceof Date) {
      expiresAtMs = expiresAt.getTime()
    } else {
      expiresAtMs = expiresAt
    }
  }

  accessToken = { token, expiresAt: expiresAtMs }
}

export function getAccessToken(): string | null {
  if (!accessToken) return null
  if (accessToken.expiresAt && Date.now() >= accessToken.expiresAt) {
    accessToken = null
    return null
  }
  return accessToken.token
}
