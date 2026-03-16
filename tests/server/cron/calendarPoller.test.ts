import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockEventsList,
  mockCalendarFactory,
  mockDeleteMany,
  mockSubscriptionUpdate,
  mockSubscriptionFindMany,
  mockSubscriptionFindUnique,
  mockGetAuthenticatedClient,
  mockUpsertCalendarEvents,
  mockRenewExpiringSubscriptions,
} = vi.hoisted(() => {
  const eventsList = vi.fn()
  return {
    mockEventsList: eventsList,
    mockCalendarFactory: vi.fn(() => ({
      events: {
        list: eventsList,
      },
    })),
    mockDeleteMany: vi.fn(),
    mockSubscriptionUpdate: vi.fn(),
    mockSubscriptionFindMany: vi.fn(),
    mockSubscriptionFindUnique: vi.fn(),
    mockGetAuthenticatedClient: vi.fn(),
    mockUpsertCalendarEvents: vi.fn(),
    mockRenewExpiringSubscriptions: vi.fn(),
  }
})

vi.mock('googleapis', () => ({
  google: {
    calendar: mockCalendarFactory,
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    cachedCalendarEvent: {
      deleteMany: mockDeleteMany,
    },
    calendarWorkspaceSubscription: {
      update: mockSubscriptionUpdate,
      findMany: mockSubscriptionFindMany,
      findUnique: mockSubscriptionFindUnique,
    },
  },
}))

vi.mock('@/services/calendar/tokenService', () => ({
  getAuthenticatedClient: mockGetAuthenticatedClient,
}))

vi.mock('@/services/calendar/calendarEventUpsertService', () => ({
  upsertCalendarEvents: mockUpsertCalendarEvents,
}))

vi.mock('@/services/calendar/calendarSubscriptionService', () => ({
  renewExpiringSubscriptions: mockRenewExpiringSubscriptions,
}))

import { runPoll, syncSubscriptionIncremental } from '@/server/cron/calendarPoller'

describe('calendarPoller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthenticatedClient.mockResolvedValue({})
  })

  it('recovers from 410 by running full resync and updating sync token', async () => {
    mockEventsList
      .mockRejectedValueOnce({ code: 410 })
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 'evt-1', start: { dateTime: '2026-03-14T10:00:00Z' }, end: { dateTime: '2026-03-14T11:00:00Z' } }],
          nextSyncToken: 'sync-full-2',
        },
      })

    await syncSubscriptionIncremental({
      id: 'sub-1',
      userId: 'user-1',
      accountId: 'acct-1',
      calendarId: 'primary',
      syncToken: 'sync-old-1',
    })

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        accountId: 'acct-1',
        calendarId: 'primary',
      },
    })
    expect(mockUpsertCalendarEvents).toHaveBeenCalledWith(
      'user-1',
      'acct-1',
      'primary',
      expect.arrayContaining([expect.objectContaining({ id: 'evt-1' })])
    )
    expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({
          syncToken: 'sync-full-2',
          state: 'active',
          lastError: null,
        }),
      })
    )
  })

  it('runs fallback poll for stale channels and calls renewal pass first', async () => {
    mockRenewExpiringSubscriptions.mockResolvedValue(undefined)
    mockSubscriptionFindMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: 'user-1',
        accountId: 'acct-1',
        calendarId: 'primary',
        syncToken: 'sync-1',
      },
    ])

    mockEventsList.mockResolvedValue({
      data: {
        items: [{ id: 'evt-2', start: { dateTime: '2026-03-14T12:00:00Z' }, end: { dateTime: '2026-03-14T13:00:00Z' } }],
        nextSyncToken: 'sync-2',
      },
    })

    await runPoll()

    expect(mockRenewExpiringSubscriptions).toHaveBeenCalledTimes(1)
    expect(mockUpsertCalendarEvents).toHaveBeenCalledWith(
      'user-1',
      'acct-1',
      'primary',
      expect.arrayContaining([expect.objectContaining({ id: 'evt-2' })])
    )
    expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ syncToken: 'sync-2' }),
      })
    )
  })
})
