import { beforeEach, describe, expect, it, vi } from 'vitest'
import express, { Express, NextFunction, Request, Response } from 'express'
import request from 'supertest'

const { prismaMock, callGemini } = vi.hoisted(() => ({
  prismaMock: {
    onboardingProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    calendarAccount: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    cachedCalendarEvent: {
      findMany: vi.fn(),
    },
  },
  callGemini: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}))

vi.mock('@/services/ai/geminiService', () => ({
  callGemini,
}))

import onboardingRouter from '@/server/routes/onboarding'

interface InMemoryState {
  profile: any | null
  settings: Record<string, unknown>
  accounts: Array<{
    id: string
    provider: string
    email: string
    createdAt: Date
  }>
  cachedEvents: Array<{
    summary: string
    recurringEventId: string | null
    startDateTime: Date
  }>
}

function buildProfile(partial: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-123',
    flowVersion: 2,
    currentStep: 'connect',
    connectState: {},
    seed: {},
    student: {},
    gaze: {},
    kaizenExperiment: {},
    synthesisStatus: 'idle',
    completedAt: null,
    createdAt: new Date('2026-03-14T00:00:00.000Z'),
    updatedAt: new Date('2026-03-14T00:00:00.000Z'),
    ...partial,
  }
}

const validSeed = {
  coreIdentity: 'Builder and operator',
  startingPoint: 'Transitioning from reactive work to deliberate work',
  narrative:
    'I am currently fragmented across priorities and want a stable, focused operating rhythm. I need to define the work that compounds and remove low-leverage commitments that consume creative bandwidth.',
}

const validStudent = {
  becoming: 'A disciplined system architect with sharp execution',
  horizon: '1_year',
  narrative:
    'I am becoming someone who can hold long arcs, execute weekly, and protect depth work. I will operate with clear standards, explicit tradeoffs, and consistent review loops that make progress visible.',
}

const validGaze = {
  desires:
    'I want to produce one meaningful artifact every week, improve my physical and emotional baseline, and build trust with collaborators by shipping consistently. I want my calendar to reflect values, not drift.',
  reflection:
    'My main friction is overcommitting and avoiding difficult prioritization conversations. I am willing to cut vanity projects, protect deep work blocks, and accept short-term discomfort in exchange for coherent momentum.',
  nonNegotiables: ['sleep 7h', 'weekly review'],
}

describe('Onboarding API routes', () => {
  let app: Express
  let memory: InMemoryState

  beforeEach(() => {
    memory = {
      profile: null,
      settings: {
        onboarding_progress: {
          currentStep: 0,
          completedAt: null,
          steps: {},
        },
      },
      accounts: [],
      cachedEvents: [],
    }

    prismaMock.onboardingProfile.findUnique.mockImplementation(async ({ where }: { where: { userId: string } }) => {
      return memory.profile && memory.profile.userId === where.userId ? memory.profile : null
    })

    prismaMock.onboardingProfile.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      memory.profile = buildProfile(data)
      return memory.profile
    })

    prismaMock.onboardingProfile.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      memory.profile = buildProfile({ ...(memory.profile || {}), ...data, updatedAt: new Date() })
      return memory.profile
    })

    prismaMock.calendarAccount.findMany.mockImplementation(async () => memory.accounts)

    prismaMock.user.findUnique.mockImplementation(async () => ({ settings: memory.settings }))

    prismaMock.user.update.mockImplementation(async ({ data }: { data: { settings: Record<string, unknown> } }) => {
      memory.settings = data.settings
      return { settings: memory.settings }
    })

    prismaMock.cachedCalendarEvent.findMany.mockImplementation(async () => memory.cachedEvents)

    callGemini.mockReset()

    app = express()
    app.use(express.json())
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: 'user-123' } as any
      next()
    })
    app.use('/api/onboarding', onboardingRouter)
  })

  it('GET /state returns default locked connect step when incomplete', async () => {
    const response = await request(app).get('/api/onboarding/state')

    expect(response.status).toBe(200)
    expect(response.body.currentStepKey).toBe('connect')
    expect(response.body.maxAllowedStep).toBe(0)
    expect(response.body.stepValidation.connect.isValid).toBe(false)
    expect(response.body.stepValidation.connect.errors[0]).toContain('Connect at least one account')
  })

  it('PUT /state rejects Seed save before connect is complete', async () => {
    const response = await request(app)
      .put('/api/onboarding/state')
      .send({
        currentStep: 1,
        seed: validSeed,
      })

    expect(response.status).toBe(409)
    expect(response.body.error).toContain('Complete connect step')
  })

  it('PUT /state allows Seed save after account is connected', async () => {
    memory.accounts = [
      {
        id: 'acct-1',
        provider: 'google',
        email: 'person@example.com',
        createdAt: new Date('2026-03-14T00:00:00.000Z'),
      },
    ]

    const response = await request(app)
      .put('/api/onboarding/state')
      .send({
        currentStep: 1,
        seed: validSeed,
      })

    expect(response.status).toBe(200)
    expect(response.body.currentStepKey).toBe('seed')
    expect(response.body.seed.coreIdentity).toBe(validSeed.coreIdentity)
    expect(response.body.stepValidation.seed.isValid).toBe(true)
  })

  it('PUT /state rejects Student save when Seed is not valid', async () => {
    memory.accounts = [
      {
        id: 'acct-1',
        provider: 'google',
        email: 'person@example.com',
        createdAt: new Date('2026-03-14T00:00:00.000Z'),
      },
    ]

    const response = await request(app)
      .put('/api/onboarding/state')
      .send({
        currentStep: 2,
        student: validStudent,
      })

    expect(response.status).toBe(409)
    expect(response.body.error).toContain('Complete Seed')
  })

  it('POST /connect/start supports n2f contract with google fallback', async () => {
    const response = await request(app)
      .post('/api/onboarding/connect/start')
      .send({ provider: 'n2f' })

    expect(response.status).toBe(200)
    expect(response.body.provider).toBe('n2f')
    expect(response.body.resolvedProvider).toBe('google')
    expect(response.body.fallbackUsed).toBe(true)
    expect(response.body.startUrl).toBe('/api/calendar/google/authorize?redirect=/onboarding')
  })

  it('POST /synthesize-experiment enforces quality gates', async () => {
    memory.accounts = [
      {
        id: 'acct-1',
        provider: 'google',
        email: 'person@example.com',
        createdAt: new Date('2026-03-14T00:00:00.000Z'),
      },
    ]

    memory.profile = buildProfile({
      currentStep: 'gaze',
      seed: { coreIdentity: 'short', narrative: 'too short' },
      student: {},
      gaze: {},
    })

    const response = await request(app).post('/api/onboarding/synthesize-experiment')

    expect(response.status).toBe(422)
    expect(response.body.error).toContain('Quality gates failed')
    expect(callGemini).not.toHaveBeenCalled()
  })

  it('POST /synthesize-experiment persists normalized experiment output', async () => {
    memory.accounts = [
      {
        id: 'acct-1',
        provider: 'google',
        email: 'person@example.com',
        createdAt: new Date('2026-03-14T00:00:00.000Z'),
      },
    ]

    memory.profile = buildProfile({
      currentStep: 'gaze',
      seed: validSeed,
      student: validStudent,
      gaze: validGaze,
      connectState: { provider: 'n2f' },
    })

    memory.cachedEvents = [
      {
        summary: 'Weekly planning',
        recurringEventId: 'rec-1',
        startDateTime: new Date('2026-03-13T08:00:00.000Z'),
      },
    ]

    callGemini.mockResolvedValue(
      JSON.stringify({
        title: 'Focus Sprint',
        thesis: 'Small weekly experiments create reliable momentum.',
        northStar: 'Ship one meaningful artifact each week',
        successSignals: ['1 weekly artifact shipped', '2 deep work blocks/day'],
        guardrails: ['No new projects during sprint'],
        firstActions: [
          { title: 'Block deep work', why: 'Protect execution time', window: 'Monday morning' },
          { title: 'Define weekly artifact', why: 'Constrain scope', window: 'Monday noon' },
        ],
      })
    )

    const response = await request(app).post('/api/onboarding/synthesize-experiment')

    expect(response.status).toBe(200)
    expect(response.body.synthesisStatus).toBe('ready')
    expect(response.body.kaizenExperiment.experiment.title).toBe('Focus Sprint')
    expect(memory.profile.synthesisStatus).toBe('ready')
  })

  it('POST /complete requires synthesized experiment draft', async () => {
    memory.accounts = [
      {
        id: 'acct-1',
        provider: 'google',
        email: 'person@example.com',
        createdAt: new Date('2026-03-14T00:00:00.000Z'),
      },
    ]

    memory.profile = buildProfile({
      currentStep: 'gaze',
      seed: validSeed,
      student: validStudent,
      gaze: validGaze,
      kaizenExperiment: {},
    })

    const response = await request(app).post('/api/onboarding/complete')

    expect(response.status).toBe(422)
    expect(response.body.error).toContain('Generate your Kaizen Experiment')
  })

  it('POST /complete marks profile and legacy onboarding progress as completed', async () => {
    memory.accounts = [
      {
        id: 'acct-1',
        provider: 'google',
        email: 'person@example.com',
        createdAt: new Date('2026-03-14T00:00:00.000Z'),
      },
    ]

    memory.profile = buildProfile({
      currentStep: 'gaze',
      seed: validSeed,
      student: validStudent,
      gaze: validGaze,
      kaizenExperiment: { experiment: { title: 'Focus Sprint' } },
      synthesisStatus: 'ready',
    })

    const response = await request(app).post('/api/onboarding/complete')

    expect(response.status).toBe(200)
    expect(typeof response.body.completedAt).toBe('string')
    expect(memory.profile.completedAt).toBeInstanceOf(Date)

    const onboardingProgress = (memory.settings.onboarding_progress || {}) as Record<string, unknown>
    expect(typeof onboardingProgress.completedAt).toBe('string')
  })
})
