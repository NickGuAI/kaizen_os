import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { Express } from 'express'

const {
  mockFindUnique,
  mockUpdateMany,
  mockUpdate,
  mockSyncSubscriptionByChannelId,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockSyncSubscriptionByChannelId: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    calendarWorkspaceSubscription: {
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany,
      update: mockUpdate,
    },
    calendarAccount: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/crypto', () => ({
  encryptToken: vi.fn((value: string) => `enc_${value}`),
}))

vi.mock('@/services/calendar/tokenService', () => ({
  getOAuth2Client: vi.fn(() => ({
    getToken: vi.fn(),
    setCredentials: vi.fn(),
  })),
}))

vi.mock('@/services/calendar/calendarSubscriptionService', () => ({
  setupSubscriptionsForAccount: vi.fn(),
}))

vi.mock('@/server/cron/calendarPoller', () => ({
  syncSubscriptionByChannelId: mockSyncSubscriptionByChannelId,
}))

vi.mock('googleapis', () => ({
  google: {
    oauth2: vi.fn(() => ({
      userinfo: {
        get: vi.fn(),
      },
    })),
  },
}))

import calendarPushReceiverRouter from '@/server/routes/calendarPushReceiver'

describe('calendarPushReceiver route', () => {
  let app: Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/calendar/pubsub', calendarPushReceiverRouter)

    vi.clearAllMocks()
  })

  it('returns 400 when required headers are missing', async () => {
    const response = await request(app).post('/api/calendar/pubsub').send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Missing required X-Goog headers')
  })

  it('rejects notification when channel token/resource does not match', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'sub-1',
      subscriptionName: 'channel-1',
      resourceId: 'resource-1',
      channelToken: 'expected-token',
      state: 'active',
      lastMessageNumber: null,
    })

    const response = await request(app)
      .post('/api/calendar/pubsub')
      .set('X-Goog-Channel-Id', 'channel-1')
      .set('X-Goog-Resource-Id', 'resource-1')
      .set('X-Goog-Channel-Token', 'wrong-token')
      .set('X-Goog-Message-Number', '3')

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('Channel validation failed')
    expect(mockSyncSubscriptionByChannelId).not.toHaveBeenCalled()
  })

  it('acks duplicate message number without dispatching sync', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'sub-1',
      subscriptionName: 'channel-1',
      resourceId: 'resource-1',
      channelToken: 'token-1',
      state: 'active',
      lastMessageNumber: 10n,
    })
    mockUpdateMany.mockResolvedValue({ count: 0 })

    const response = await request(app)
      .post('/api/calendar/pubsub')
      .set('X-Goog-Channel-Id', 'channel-1')
      .set('X-Goog-Resource-Id', 'resource-1')
      .set('X-Goog-Channel-Token', 'token-1')
      .set('X-Goog-Resource-State', 'exists')
      .set('X-Goog-Message-Number', '9')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true, duplicate: true })
    expect(mockSyncSubscriptionByChannelId).not.toHaveBeenCalled()
  })

  it('acks valid notifications and dispatches incremental sync', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'sub-1',
      subscriptionName: 'channel-1',
      resourceId: 'resource-1',
      channelToken: 'token-1',
      state: 'active',
      lastMessageNumber: 5n,
    })
    mockUpdateMany.mockResolvedValue({ count: 1 })
    mockSyncSubscriptionByChannelId.mockResolvedValue(undefined)

    const response = await request(app)
      .post('/api/calendar/pubsub')
      .set('X-Goog-Channel-Id', 'channel-1')
      .set('X-Goog-Resource-Id', 'resource-1')
      .set('X-Goog-Channel-Token', 'token-1')
      .set('X-Goog-Resource-State', 'exists')
      .set('X-Goog-Message-Number', '6')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })

    await new Promise((resolve) => setImmediate(resolve))
    expect(mockSyncSubscriptionByChannelId).toHaveBeenCalledWith('channel-1')
  })
})
