import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockEventsList,
  mockEventsWatch,
  mockChannelsStop,
  mockCalendarFactory,
  mockCalendarAccountFindUnique,
  mockSubscriptionFindMany,
  mockSubscriptionFindUnique,
  mockSubscriptionUpsert,
  mockSubscriptionDeleteMany,
  mockCachedDeleteMany,
  mockGetAuthenticatedClient,
  mockUpsertCalendarEvents,
} = vi.hoisted(() => {
  const eventsList = vi.fn()
  const eventsWatch = vi.fn()
  const channelsStop = vi.fn()

  return {
    mockEventsList: eventsList,
    mockEventsWatch: eventsWatch,
    mockChannelsStop: channelsStop,
    mockCalendarFactory: vi.fn(() => ({
      events: {
        list: eventsList,
        watch: eventsWatch,
      },
      channels: {
        stop: channelsStop,
      },
    })),
    mockCalendarAccountFindUnique: vi.fn(),
    mockSubscriptionFindMany: vi.fn(),
    mockSubscriptionFindUnique: vi.fn(),
    mockSubscriptionUpsert: vi.fn(),
    mockSubscriptionDeleteMany: vi.fn(),
    mockCachedDeleteMany: vi.fn(),
    mockGetAuthenticatedClient: vi.fn(),
    mockUpsertCalendarEvents: vi.fn(),
  }
})

vi.mock('googleapis', () => ({
  google: {
    calendar: mockCalendarFactory,
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    calendarAccount: {
      findUnique: mockCalendarAccountFindUnique,
    },
    calendarWorkspaceSubscription: {
      findMany: mockSubscriptionFindMany,
      findUnique: mockSubscriptionFindUnique,
      upsert: mockSubscriptionUpsert,
      deleteMany: mockSubscriptionDeleteMany,
      update: vi.fn(),
    },
    cachedCalendarEvent: {
      deleteMany: mockCachedDeleteMany,
    },
  },
}))

vi.mock('@/services/calendar/tokenService', () => ({
  getAuthenticatedClient: mockGetAuthenticatedClient,
}))

vi.mock('@/services/calendar/calendarEventUpsertService', () => ({
  upsertCalendarEvents: mockUpsertCalendarEvents,
}))

import {
  setupSubscriptionsForAccount,
  renewExpiringSubscriptions,
  deleteAllSubscriptionsForAccount,
} from '@/services/calendar/calendarSubscriptionService'

describe('calendarSubscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthenticatedClient.mockResolvedValue({})
    process.env.APP_BASE_URL = 'https://kaizen.example.com'

    mockEventsList.mockResolvedValue({
      data: {
        items: [
          {
            id: 'evt-1',
            start: { dateTime: '2026-03-14T10:00:00Z' },
            end: { dateTime: '2026-03-14T11:00:00Z' },
          },
        ],
        nextSyncToken: 'sync-1',
      },
    })

    mockEventsWatch.mockResolvedValue({
      data: {
        resourceId: 'resource-1',
        expiration: String(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    })
  })

  it('creates watch channels and stores sync metadata during setup', async () => {
    mockCalendarAccountFindUnique.mockResolvedValue({ selectedCalendarIds: ['primary'] })
    mockSubscriptionFindMany.mockResolvedValue([])
    mockSubscriptionFindUnique.mockResolvedValue(null)

    await setupSubscriptionsForAccount('user-1', 'acct-1')

    expect(mockUpsertCalendarEvents).toHaveBeenCalledWith(
      'user-1',
      'acct-1',
      'primary',
      expect.arrayContaining([expect.objectContaining({ id: 'evt-1' })])
    )

    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          accountId_calendarId: {
            accountId: 'acct-1',
            calendarId: 'primary',
          },
        },
        update: expect.objectContaining({
          channelId: expect.any(String),
          state: 'active',
          syncToken: 'sync-1',
          resourceId: 'resource-1',
          channelAddress: 'https://kaizen.example.com/api/calendar/push',
        }),
      })
    )
  })

  it('renews expiring channels and stops old channels on account delete', async () => {
    mockSubscriptionFindMany
      .mockResolvedValueOnce([
        {
          id: 'sub-renew',
          userId: 'user-1',
          accountId: 'acct-1',
          calendarId: 'primary',
        },
      ])
      .mockResolvedValueOnce([
        {
          calendarId: 'primary',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'sub-stop',
          userId: 'user-1',
          calendarId: 'primary',
          subscriptionName: 'old-channel',
          resourceId: 'old-resource',
        },
      ])

    mockSubscriptionFindUnique.mockResolvedValue({
      id: 'sub-renew',
      subscriptionName: 'old-channel',
      resourceId: 'old-resource',
      syncToken: 'sync-1',
      state: 'active',
    })

    await renewExpiringSubscriptions()
    await deleteAllSubscriptionsForAccount('acct-1')

    expect(mockEventsWatch).toHaveBeenCalled()
    expect(mockChannelsStop).toHaveBeenCalledWith({
      requestBody: {
        id: 'old-channel',
        resourceId: 'old-resource',
      },
    })
    expect(mockSubscriptionDeleteMany).toHaveBeenCalledWith({
      where: {
        accountId: 'acct-1',
        calendarId: { in: ['primary'] },
      },
    })
    expect(mockCachedDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        accountId: 'acct-1',
        calendarId: 'primary',
      },
    })
  })
})
