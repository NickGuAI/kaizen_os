import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express, { Express, Request, Response, NextFunction } from 'express'

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    cachedCalendarEvent: {
      findMany: vi.fn(),
    },
  },
}))

// Mock fetch for Claude API
const mockFetch = vi.fn()
global.fetch = mockFetch

import onboardingRouter from '@/server/routes/onboarding'
import { prisma } from '@/lib/db'

describe('Onboarding API Routes', () => {
  let app: Express
  const originalEnv = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-123' } as any
      next()
    })
    app.use('/api/onboarding', onboardingRouter)
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv
    vi.clearAllMocks()
  })

  describe('POST /generate-suggestions', () => {
    it('returns empty suggestions when no calendar events and no journal', async () => {
      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue([])
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '{"themes": [], "gates": [], "routines": []}' }],
        }),
      })

      const response = await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({})

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('themes')
      expect(response.body).toHaveProperty('gates')
      expect(response.body).toHaveProperty('routines')
    })

    it('processes calendar events and generates suggestions', async () => {
      const mockEvents = [
        {
          id: '1',
          summary: 'Gym workout',
          description: null,
          startDateTime: new Date('2026-01-10'),
          endDateTime: new Date('2026-01-10'),
          isAllDay: false,
          recurringEventId: 'rec-1',
        },
        {
          id: '2',
          summary: 'Team meeting',
          description: null,
          startDateTime: new Date('2026-01-11'),
          endDateTime: new Date('2026-01-11'),
          isAllDay: false,
          recurringEventId: 'rec-2',
        },
      ]

      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue(mockEvents)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{
            text: JSON.stringify({
              themes: [{ id: 't1', name: 'Health', description: 'Fitness focus', icon: '💪' }],
              gates: [{ id: 'g1', title: 'Complete workout plan', theme: 'Health', deadline: '2026-03-01' }],
              routines: [{ id: 'r1', title: 'Morning workout', frequency: 'Daily', theme: 'Health' }],
            }),
          }],
        }),
      })

      const response = await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({})

      expect(response.status).toBe(200)
      expect(response.body.themes).toHaveLength(1)
      expect(response.body.themes[0].name).toBe('Health')
      expect(response.body.gates).toHaveLength(1)
      expect(response.body.routines).toHaveLength(1)
    })

    it('includes journal text in the analysis', async () => {
      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue([])
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '{"themes": [], "gates": [], "routines": []}' }],
        }),
      })

      await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({ journalText: 'I want to focus on health and career growth' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('I want to focus on health and career growth'),
        })
      )
    })

    it('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
      delete process.env.ANTHROPIC_API_KEY
      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue([])

      const response = await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({})

      expect(response.status).toBe(503)
      expect(response.body.error).toContain('not configured')
    })

    it('returns 500 when Claude API returns error', async () => {
      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue([])
      mockFetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('API rate limit exceeded'),
      })

      const response = await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({})

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to generate suggestions')
    })

    it('handles markdown-wrapped JSON response from Claude', async () => {
      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue([])
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{
            text: '```json\n{"themes": [{"id": "t1", "name": "Test", "description": "Test theme", "icon": "🎯"}], "gates": [], "routines": []}\n```',
          }],
        }),
      })

      const response = await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({})

      expect(response.status).toBe(200)
      expect(response.body.themes).toHaveLength(1)
      expect(response.body.themes[0].name).toBe('Test')
    })

    it('returns empty arrays when Claude returns invalid JSON', async () => {
      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue([])
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'This is not valid JSON at all' }],
        }),
      })

      const response = await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({})

      expect(response.status).toBe(500)
    })

    it('validates array types in suggestions response', async () => {
      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue([])
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{
            text: JSON.stringify({
              themes: 'not an array',
              gates: null,
              routines: undefined,
            }),
          }],
        }),
      })

      const response = await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({})

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body.themes)).toBe(true)
      expect(Array.isArray(response.body.gates)).toBe(true)
      expect(Array.isArray(response.body.routines)).toBe(true)
      expect(response.body.themes).toHaveLength(0)
      expect(response.body.gates).toHaveLength(0)
      expect(response.body.routines).toHaveLength(0)
    })

    it('limits calendar events query with take parameter', async () => {
      vi.mocked(prisma.cachedCalendarEvent.findMany).mockResolvedValue([])
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '{"themes": [], "gates": [], "routines": []}' }],
        }),
      })

      await request(app)
        .post('/api/onboarding/generate-suggestions')
        .send({})

      expect(prisma.cachedCalendarEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        })
      )
    })
  })
})
