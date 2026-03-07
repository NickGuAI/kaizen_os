import type { User, ApiKey } from '@prisma/client'
import type { Session } from '../../auth/types'

declare global {
  namespace Express {
    interface Request {
      user?: User
      authSession?: Session
      apiKey?: ApiKey
    }
  }
}

export {}
