import type { RequestHandler } from 'express'
import { apiKeyService } from '../../services/apiKeyService'

function getApiKeyFromHeader(headerValue: string | string[] | undefined): string | null {
  if (!headerValue) {
    return null
  }

  if (Array.isArray(headerValue)) {
    return headerValue[0] || null
  }

  return headerValue
}

export const requireApiKey: RequestHandler = async (req, res, next) => {
  try {
    const rawKey = getApiKeyFromHeader(req.headers['x-api-key'])

    if (!rawKey) {
      return res.status(401).json({
        error: {
          code: 'API_KEY_REQUIRED',
          message: 'X-API-Key header is required',
        },
      })
    }

    const verified = await apiKeyService.verify(rawKey)

    if (!verified) {
      return res.status(401).json({
        error: {
          code: 'API_KEY_INVALID',
          message: 'Invalid or expired API key',
        },
      })
    }

    if (!apiKeyService.checkRateLimit(verified.id, verified.rateLimit)) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'API key rate limit exceeded',
        },
      })
    }

    const { user, ...apiKey } = verified
    req.user = user
    req.apiKey = apiKey

    // Update is debounced in service to avoid a write per request.
    void apiKeyService.touchLastUsed(apiKey.id).catch((error) => {
      console.warn('[api-key] failed to update last_used_at', error)
    })

    return next()
  } catch (error) {
    return next(error)
  }
}
