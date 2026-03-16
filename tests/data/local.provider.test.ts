/**
 * Tests for LocalPostgresProvider
 *
 * Tests database CRUD operations with user isolation (manual user_id filtering).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocalPostgresProvider } from '../../src/data/providers/local.provider'
import { PrismaClient } from '@prisma/client'

// Mock PrismaClient
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  season: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  event: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
} as unknown as PrismaClient

const TEST_USER_ID = 'user-uuid-123'
const TEST_AUTH_CTX = { userId: TEST_USER_ID, email: 'test@example.com' }

describe('LocalPostgresProvider', () => {
  let provider: LocalPostgresProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new LocalPostgresProvider(mockPrisma)
  })

  describe('withAuth', () => {
    it('creates a new provider instance with auth context', () => {
      const authedProvider = provider.withAuth(TEST_AUTH_CTX)

      // Should be a different instance
      expect(authedProvider).not.toBe(provider)
    })

    it('throws error when accessing data without auth', async () => {
      await expect(provider.getUser()).rejects.toThrow('Auth context required')
      await expect(provider.getSeasons()).rejects.toThrow('Auth context required')
      await expect(provider.getEvents()).rejects.toThrow('Auth context required')
    })
  })

  describe('User operations', () => {
    it('getUser returns user data for authenticated user', async () => {
      const mockUser = {
        id: TEST_USER_ID,
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'America/Los_Angeles',
        settings: { theme: 'dark' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      }
      ;(mockPrisma.user.findUnique as any).mockResolvedValue(mockUser)

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      const user = await authedProvider.getUser()

      expect(user).not.toBeNull()
      expect(user!.id).toBe(TEST_USER_ID)
      expect(user!.email).toBe('test@example.com')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_USER_ID },
      })
    })

    it('getUser returns null for non-existent user', async () => {
      ;(mockPrisma.user.findUnique as any).mockResolvedValue(null)

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      const user = await authedProvider.getUser()

      expect(user).toBeNull()
    })

    it('updateUser updates only specified fields', async () => {
      const mockUpdatedUser = {
        id: TEST_USER_ID,
        email: 'test@example.com',
        name: 'Updated Name',
        timezone: 'Europe/London',
        settings: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(mockPrisma.user.update as any).mockResolvedValue(mockUpdatedUser)

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      const user = await authedProvider.updateUser({ name: 'Updated Name', timezone: 'Europe/London' })

      expect(user.name).toBe('Updated Name')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: TEST_USER_ID },
        data: expect.objectContaining({ name: 'Updated Name', timezone: 'Europe/London' }),
      })
    })
  })

  describe('Season operations - User Isolation', () => {
    it('getSeasons filters by user_id', async () => {
      const mockSeasons = [
        { id: 1, userId: TEST_USER_ID, name: 'Q1 2024', startDate: new Date(), durationWeeks: 12, utilityRate: 40, themeAllocations: {}, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]
      ;(mockPrisma.season.findMany as any).mockResolvedValue(mockSeasons)

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      const seasons = await authedProvider.getSeasons()

      expect(seasons).toHaveLength(1)
      expect(mockPrisma.season.findMany).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID },
        orderBy: { startDate: 'desc' },
      })
    })

    it('getSeason verifies ownership via where clause', async () => {
      ;(mockPrisma.season.findFirst as any).mockResolvedValue({
        id: 1,
        userId: TEST_USER_ID,
        name: 'Q1',
        startDate: new Date(),
        durationWeeks: 12,
        utilityRate: 40,
        themeAllocations: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      await authedProvider.getSeason(1)

      expect(mockPrisma.season.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: TEST_USER_ID },
      })
    })

    it('createSeason sets user_id from auth context', async () => {
      const mockCreated = {
        id: 1,
        userId: TEST_USER_ID,
        name: 'New Season',
        startDate: new Date('2024-01-01'),
        durationWeeks: 12,
        utilityRate: 40,
        themeAllocations: {},
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(mockPrisma.season.create as any).mockResolvedValue(mockCreated)

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      const season = await authedProvider.createSeason({
        name: 'New Season',
        startDate: new Date('2024-01-01'),
        durationWeeks: 12,
      })

      expect(season.name).toBe('New Season')
      expect(mockPrisma.season.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: TEST_USER_ID,
          name: 'New Season',
        }),
      })
    })

    it('updateSeason verifies ownership before update', async () => {
      ;(mockPrisma.season.findFirst as any).mockResolvedValue({
        id: 1,
        userId: TEST_USER_ID,
        name: 'Existing',
        startDate: new Date(),
        durationWeeks: 12,
        utilityRate: 40,
        themeAllocations: {},
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      ;(mockPrisma.season.update as any).mockResolvedValue({
        id: 1,
        userId: TEST_USER_ID,
        name: 'Updated',
        startDate: new Date(),
        durationWeeks: 12,
        utilityRate: 40,
        themeAllocations: {},
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      await authedProvider.updateSeason(1, { name: 'Updated' })

      // Should check ownership first
      expect(mockPrisma.season.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: TEST_USER_ID },
      })
    })

    it('updateSeason throws if season not owned by user', async () => {
      ;(mockPrisma.season.findFirst as any).mockResolvedValue(null)

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      await expect(authedProvider.updateSeason(999, { name: 'Hacked' }))
        .rejects.toThrow('Season 999 not found')
    })

    it('deleteSeason verifies ownership before delete', async () => {
      ;(mockPrisma.season.findFirst as any).mockResolvedValue({
        id: 1,
        userId: TEST_USER_ID,
      })
      ;(mockPrisma.season.delete as any).mockResolvedValue({})

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      await authedProvider.deleteSeason(1)

      expect(mockPrisma.season.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: TEST_USER_ID },
      })
      expect(mockPrisma.season.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('deleteSeason throws if season not owned by user', async () => {
      ;(mockPrisma.season.findFirst as any).mockResolvedValue(null)

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      await expect(authedProvider.deleteSeason(999)).rejects.toThrow('Season 999 not found')
    })
  })

  describe('Event operations', () => {
    it('getEvents filters by user_id', async () => {
      const mockEvents = [
        { id: 1, userId: TEST_USER_ID, eventType: 'gate_started', cardId: 1, payload: {}, occurredAt: new Date(), idempotencyKey: null },
      ]
      ;(mockPrisma.event.findMany as any).mockResolvedValue(mockEvents)

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      await authedProvider.getEvents()

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID },
        orderBy: { occurredAt: 'desc' },
        take: undefined,
      })
    })

    it('getEvents applies optional filters', async () => {
      ;(mockPrisma.event.findMany as any).mockResolvedValue([])

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      await authedProvider.getEvents({ eventType: 'gate_started', cardId: 5, limit: 10 })

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID, eventType: 'gate_started', cardId: 5 },
        orderBy: { occurredAt: 'desc' },
        take: 10,
      })
    })

    it('createEvent sets user_id from auth context', async () => {
      ;(mockPrisma.event.create as any).mockResolvedValue({
        id: 1,
        userId: TEST_USER_ID,
        eventType: 'time_logged',
        cardId: 1,
        payload: { hours: 1.5 },
        occurredAt: new Date(),
        idempotencyKey: 'key-123',
      })

      const authedProvider = provider.withAuth(TEST_AUTH_CTX)
      await authedProvider.createEvent({
        eventType: 'time_logged',
        cardId: 1,
        payload: { hours: 1.5 },
        idempotencyKey: 'key-123',
      })

      expect(mockPrisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: TEST_USER_ID,
          eventType: 'time_logged',
          cardId: 1,
        }),
      })
    })
  })

  describe('getRawClient', () => {
    it('returns the underlying Prisma client', () => {
      const client = provider.getRawClient()
      expect(client).toBe(mockPrisma)
    })
  })
})
