import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { apiKeyService, ApiKeyServiceError } from '../../services/apiKeyService'

const router = Router()

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.array(z.enum(['read', 'write', 'delete'])).optional(),
  allowedServers: z.array(z.enum(['kaizen-db', 'workitems', 'calendar'])).optional(),
  expiresAt: z.string().datetime().optional(),
  rateLimit: z.number().int().min(1).max(10_000).optional(),
})

function requireUserId(req: Request, res: Response): string | null {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    })
    return null
  }
  return userId
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) {
      return
    }

    const keys = await apiKeyService.list(userId)
    res.json({ keys })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) {
      return
    }

    const parsed = createApiKeySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }

    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined
    const created = await apiKeyService.generate({
      userId,
      name: parsed.data.name,
      scopes: parsed.data.scopes,
      allowedServers: parsed.data.allowedServers,
      expiresAt,
      rateLimit: parsed.data.rateLimit,
    })

    res.status(201).json(created)
  } catch (error) {
    if (error instanceof ApiKeyServiceError) {
      return res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    next(error)
  }
})

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req, res)
    if (!userId) {
      return
    }

    const keyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!keyId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Key id is required',
        },
      })
    }

    const revoked = await apiKeyService.revoke(userId, keyId)
    if (!revoked) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'API key not found',
        },
      })
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
