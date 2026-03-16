import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { Express, Request, Response, NextFunction } from 'express'

const { mockSubscriptionFindMany } = vi.hoisted(() => ({
  mockSubscriptionFindMany: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    calendarWorkspaceSubscription: {
      findMany: mockSubscriptionFindMany,
    },
  },
}))

vi.mock('@/services/calendar/tokenService', () => ({
  getOAuth2Client: vi.fn(() => ({
    generateAuthUrl: vi.fn(() => 'https://example.com/oauth'),
  })),
}))

import calendarRouter from '@/server/routes/calendar'

describe('calendar sync status endpoint', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-1' } as any
      next()
    })
    app.use('/api/calendar', calendarRouter)

    vi.clearAllMocks()
  })

  it('returns webhook sync health summary', async () => {
    const now = Date.now()

    mockSubscriptionFindMany.mockResolvedValue([
      {
        id: 'sub-1',
        state: 'active',
        expiration: new Date(now + 2 * 24 * 60 * 60 * 1000),
        lastNotificationAt: new Date(now - 60 * 1000),
        lastSyncedAt: new Date(now - 2 * 60 * 1000),
        updatedAt: new Date(now - 2 * 60 * 1000),
        lastError: null,
      },
      {
        id: 'sub-2',
        state: 'stale',
        expiration: new Date(now - 24 * 60 * 60 * 1000),
        lastNotificationAt: new Date(now - 30 * 60 * 1000),
        lastSyncedAt: null,
        updatedAt: new Date(now - 10 * 60 * 1000),
        lastError: 'Channel expired',
      },
    ])

    const response = await request(app).get('/api/calendar/sync/status')

    expect(response.status).toBe(200)
    expect(response.body.mode).toBe('webhook_primary')
    expect(response.body.totalSubscriptions).toBe(2)
    expect(response.body.healthySubscriptions).toBe(1)
    expect(response.body.staleSubscriptions).toBe(1)
    expect(response.body.lastUpdatedAt).toBe(new Date(now - 2 * 60 * 1000).toISOString())
    expect(response.body.lastErrors).toEqual(['Channel expired'])
  })
})
