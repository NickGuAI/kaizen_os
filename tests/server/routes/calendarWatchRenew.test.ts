import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { Express } from 'express'

const { mockRenewExpiringSubscriptions } = vi.hoisted(() => ({
  mockRenewExpiringSubscriptions: vi.fn(),
}))

vi.mock('@/services/calendar/calendarSubscriptionService', () => ({
  renewExpiringSubscriptions: mockRenewExpiringSubscriptions,
}))

import calendarWatchRenewRouter from '@/server/routes/calendarWatchRenew'

describe('calendarWatchRenew route', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/calendar/watch/renew', calendarWatchRenewRouter)

    vi.clearAllMocks()
    process.env.CALENDAR_POLL_SECRET = 'test-secret'
  })

  it('rejects unauthorized requests', async () => {
    const response = await request(app).post('/api/calendar/watch/renew').send({})

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('Unauthorized')
    expect(mockRenewExpiringSubscriptions).not.toHaveBeenCalled()
  })

  it('acks authorized requests and runs renewal asynchronously', async () => {
    mockRenewExpiringSubscriptions.mockResolvedValue(undefined)

    const response = await request(app)
      .post('/api/calendar/watch/renew')
      .set('Authorization', 'Bearer test-secret')
      .send({})

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })

    await new Promise((resolve) => setImmediate(resolve))
    expect(mockRenewExpiringSubscriptions).toHaveBeenCalledTimes(1)
  })
})
