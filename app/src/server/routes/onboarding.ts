import { Router, Request, Response } from 'express'
import { endOfMonth, startOfMonth, subMonths } from 'date-fns'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/db'
import { callGemini } from '../../services/ai/geminiService'

const router = Router()

// ============================================
// High-friction onboarding state (Seed -> Student -> Gaze)
// ============================================

const STEP_ORDER = ['connect', 'seed', 'student', 'gaze'] as const

type OnboardingStepKey = (typeof STEP_ORDER)[number]

type JsonRecord = Record<string, unknown>

interface ConnectedAccount {
  id: string
  provider: string
  email: string
  createdAt: string
}

interface StepValidation {
  isValid: boolean
  errors: string[]
}

interface StepValidationMap {
  connect: StepValidation
  seed: StepValidation
  student: StepValidation
  gaze: StepValidation
}

interface InputValidationResult {
  stepValidation: StepValidationMap
  maxAllowedStep: number
}

const MIN_SEED_NARRATIVE_LENGTH = 140
const MIN_STUDENT_NARRATIVE_LENGTH = 140
const MIN_GAZE_DESIRES_LENGTH = 120
const MIN_GAZE_REFLECTION_LENGTH = 180

const SUPPORTED_PROVIDERS = ['google', 'n2f'] as const

type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number]

function toObject(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as JsonRecord
}

function asJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function valueAsString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function valueAsStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
}

function hasTextMinLength(value: unknown, minLength: number): boolean {
  return valueAsString(value).length >= minLength
}

function normalizeStep(step: unknown): OnboardingStepKey {
  if (typeof step === 'number' && Number.isInteger(step)) {
    const idx = Math.max(0, Math.min(STEP_ORDER.length - 1, step))
    return STEP_ORDER[idx]
  }

  if (typeof step === 'string') {
    const lowerStep = step.toLowerCase()
    const matched = STEP_ORDER.find((candidate) => candidate === lowerStep)
    if (matched) {
      return matched
    }
  }

  return 'connect'
}

function stepToIndex(step: OnboardingStepKey): number {
  return STEP_ORDER.indexOf(step)
}

function serializeAccounts(accounts: Array<{ id: string; provider: string; email: string; createdAt: Date }>): ConnectedAccount[] {
  return accounts.map((account) => ({
    id: account.id,
    provider: account.provider,
    email: account.email,
    createdAt: account.createdAt.toISOString(),
  }))
}

function validateSeed(seed: JsonRecord): string[] {
  const errors: string[] = []

  if (!hasTextMinLength(seed.coreIdentity, 8)) {
    errors.push('Core identity must be at least 8 characters.')
  }

  if (!hasTextMinLength(seed.narrative, MIN_SEED_NARRATIVE_LENGTH)) {
    errors.push(`Seed narrative must be at least ${MIN_SEED_NARRATIVE_LENGTH} characters.`)
  }

  return errors
}

function validateStudent(student: JsonRecord): string[] {
  const errors: string[] = []

  if (!hasTextMinLength(student.becoming, 12)) {
    errors.push('Future-state statement must be at least 12 characters.')
  }

  if (!hasTextMinLength(student.horizon, 3)) {
    errors.push('Horizon is required.')
  }

  if (!hasTextMinLength(student.narrative, MIN_STUDENT_NARRATIVE_LENGTH)) {
    errors.push(`Student narrative must be at least ${MIN_STUDENT_NARRATIVE_LENGTH} characters.`)
  }

  return errors
}

function validateGaze(gaze: JsonRecord): string[] {
  const errors: string[] = []

  if (!hasTextMinLength(gaze.desires, MIN_GAZE_DESIRES_LENGTH)) {
    errors.push(`Desires draft must be at least ${MIN_GAZE_DESIRES_LENGTH} characters.`)
  }

  if (!hasTextMinLength(gaze.reflection, MIN_GAZE_REFLECTION_LENGTH)) {
    errors.push(`Reflection draft must be at least ${MIN_GAZE_REFLECTION_LENGTH} characters.`)
  }

  return errors
}

function computeValidation(
  payload: {
    seed: JsonRecord
    student: JsonRecord
    gaze: JsonRecord
  },
  accounts: ConnectedAccount[]
): InputValidationResult {
  const connectErrors = accounts.length > 0 ? [] : ['Connect at least one account to continue.']
  const seedErrors = validateSeed(payload.seed)
  const studentErrors = validateStudent(payload.student)
  const gazeErrors = validateGaze(payload.gaze)

  const stepValidation: StepValidationMap = {
    connect: { isValid: connectErrors.length === 0, errors: connectErrors },
    seed: { isValid: seedErrors.length === 0, errors: seedErrors },
    student: { isValid: studentErrors.length === 0, errors: studentErrors },
    gaze: { isValid: gazeErrors.length === 0, errors: gazeErrors },
  }

  if (!stepValidation.connect.isValid) {
    return { stepValidation, maxAllowedStep: stepToIndex('connect') }
  }
  if (!stepValidation.seed.isValid) {
    return { stepValidation, maxAllowedStep: stepToIndex('seed') }
  }
  if (!stepValidation.student.isValid) {
    return { stepValidation, maxAllowedStep: stepToIndex('student') }
  }

  return { stepValidation, maxAllowedStep: stepToIndex('gaze') }
}

function sanitizeSeed(seed: JsonRecord): JsonRecord {
  return {
    coreIdentity: valueAsString(seed.coreIdentity),
    startingPoint: valueAsString(seed.startingPoint),
    narrative: valueAsString(seed.narrative),
  }
}

function sanitizeStudent(student: JsonRecord): JsonRecord {
  return {
    becoming: valueAsString(student.becoming),
    horizon: valueAsString(student.horizon),
    narrative: valueAsString(student.narrative),
  }
}

function sanitizeGaze(gaze: JsonRecord): JsonRecord {
  return {
    desires: valueAsString(gaze.desires),
    reflection: valueAsString(gaze.reflection),
    nonNegotiables: valueAsStringArray(gaze.nonNegotiables),
  }
}

function isValidProvider(provider: unknown): provider is SupportedProvider {
  return typeof provider === 'string' && SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)
}

function getLegacyOnboardingProgress(settings: unknown): JsonRecord {
  const settingsObject = toObject(settings)
  return toObject(settingsObject.onboarding_progress)
}

function getLegacyCompletedAt(settings: unknown): string | null {
  const onboardingProgress = getLegacyOnboardingProgress(settings)
  const completedAt = onboardingProgress.completedAt
  if (typeof completedAt !== 'string') {
    return null
  }
  return completedAt || null
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

function toIsoOrNull(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null
}

function isEmptyRecord(value: unknown): boolean {
  const object = toObject(value)
  return Object.keys(object).length === 0
}

function extractJsonFromText(text: string): string {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fencedMatch) {
    return fencedMatch[1]
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }

  return text
}

function normalizeExperimentPayload(payload: JsonRecord): JsonRecord {
  const title = valueAsString(payload.title || payload.experiment_name || payload.name)
  const thesis = valueAsString(payload.thesis || payload.hypothesis || payload.experimentThesis)
  const northStar = valueAsString(payload.northStar || payload.focus || payload.target)

  const successSignals = valueAsStringArray(payload.successSignals || payload.success_metrics || payload.metrics)
  const guardrails = valueAsStringArray(payload.guardrails || payload.riskMitigations || payload.risk_mitigations)

  const rawFirstActions = Array.isArray(payload.firstActions)
    ? payload.firstActions
    : Array.isArray(payload.first_week_actions)
      ? payload.first_week_actions
      : []

  const firstActions = rawFirstActions
    .map((item) => {
      const objectItem = toObject(item)
      const actionTitle = valueAsString(objectItem.title)
      const actionWhy = valueAsString(objectItem.why)
      const actionWindow = valueAsString(objectItem.window || objectItem.dayHint)

      return {
        title: actionTitle,
        why: actionWhy,
        window: actionWindow,
      }
    })
    .filter((item) => item.title.length > 0)

  if (!title || !thesis || !northStar || successSignals.length === 0 || firstActions.length === 0) {
    throw new Error('Synthesis response failed schema validation')
  }

  return {
    title,
    thesis,
    northStar,
    successSignals,
    guardrails,
    firstActions,
  }
}

async function getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
  const accounts = await prisma.calendarAccount.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return serializeAccounts(accounts)
}

async function loadUserSettings(userId: string): Promise<JsonRecord> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  })

  return toObject(user?.settings)
}

async function ensureProfileForWrite(userId: string) {
  const existingProfile = await prisma.onboardingProfile.findUnique({ where: { userId } })
  if (existingProfile) {
    return existingProfile
  }

  const settings = await loadUserSettings(userId)
  const legacyCompletedAt = getLegacyCompletedAt(settings)

  return prisma.onboardingProfile.create({
    data: {
      userId,
      currentStep: legacyCompletedAt ? 'gaze' : 'connect',
      completedAt: parseOptionalDate(legacyCompletedAt),
    },
  })
}

async function updateLegacyCompletion(userId: string, completedAt: string) {
  const settings = await loadUserSettings(userId)
  const onboardingProgress = getLegacyOnboardingProgress(settings)
  const steps = toObject(onboardingProgress.steps)

  const nextOnboardingProgress = {
    currentStep: stepToIndex('gaze'),
    completedAt,
    steps,
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      settings: asJsonValue({
        ...settings,
        onboarding_progress: nextOnboardingProgress,
      }),
    },
  })
}

function buildStateResponse(params: {
  profile: {
    flowVersion: number
    currentStep: OnboardingStepKey
    connectState: JsonRecord
    seed: JsonRecord
    student: JsonRecord
    gaze: JsonRecord
    kaizenExperiment: JsonRecord
    synthesisStatus: string
    completedAt: Date | null
  } | null
  accounts: ConnectedAccount[]
  legacyCompletedAt: string | null
}) {
  const nowIso = new Date().toISOString()

  const connectState = {
    ...toObject(params.profile?.connectState),
    connected: params.accounts.length > 0,
    connectedAccountIds: params.accounts.map((account) => account.id),
    connectedAccounts: params.accounts,
    lastCheckedAt: nowIso,
  }

  const seed = sanitizeSeed(toObject(params.profile?.seed))
  const student = sanitizeStudent(toObject(params.profile?.student))
  const gaze = sanitizeGaze(toObject(params.profile?.gaze))

  const validation = computeValidation({ seed, student, gaze }, params.accounts)

  const profileStep = normalizeStep(params.profile?.currentStep)
  const clampedStepIdx = Math.min(stepToIndex(profileStep), validation.maxAllowedStep)
  const currentStep = STEP_ORDER[clampedStepIdx]

  const profileCompletedAtIso = toIsoOrNull(params.profile?.completedAt)
  const completedAt = profileCompletedAtIso || params.legacyCompletedAt

  return {
    flowVersion: params.profile?.flowVersion ?? 2,
    stepOrder: STEP_ORDER,
    currentStep: clampedStepIdx,
    currentStepKey: currentStep,
    maxAllowedStep: validation.maxAllowedStep,
    connectState,
    seed,
    student,
    gaze,
    kaizenExperiment: isEmptyRecord(params.profile?.kaizenExperiment)
      ? null
      : toObject(params.profile?.kaizenExperiment),
    synthesisStatus: params.profile?.synthesisStatus ?? 'idle',
    completedAt,
    isComplete: Boolean(completedAt),
    stepValidation: validation.stepValidation,
    connectedAccounts: params.accounts,
  }
}

async function buildCalendarSynthesisSummary(userId: string): Promise<JsonRecord> {
  const windowStart = subMonths(new Date(), 2)

  const events = await prisma.cachedCalendarEvent.findMany({
    where: {
      userId,
      startDateTime: { gte: windowStart },
    },
    select: {
      summary: true,
      recurringEventId: true,
      startDateTime: true,
    },
    orderBy: { startDateTime: 'desc' },
    take: 120,
  })

  const titleCounts = new Map<string, number>()
  const recurringTitleCounts = new Map<string, number>()

  for (const event of events) {
    const summary = valueAsString(event.summary)
    if (!summary) {
      continue
    }

    titleCounts.set(summary, (titleCounts.get(summary) || 0) + 1)

    if (event.recurringEventId) {
      recurringTitleCounts.set(summary, (recurringTitleCounts.get(summary) || 0) + 1)
    }
  }

  const topTitles = [...titleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([title, count]) => ({ title, count }))

  const recurringSignals = [...recurringTitleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([title, count]) => ({ title, count }))

  return {
    totalEventsAnalyzed: events.length,
    topTitles,
    recurringSignals,
  }
}

function buildExperimentPrompt(params: {
  seed: JsonRecord
  student: JsonRecord
  gaze: JsonRecord
  connectState: JsonRecord
  calendarSummary: JsonRecord
}): string {
  return `You are designing a focused "Kaizen Experiment" for onboarding.

Return valid JSON only. No markdown. No extra text.

Input:
${JSON.stringify(params, null, 2)}

Output JSON schema:
{
  "title": "string",
  "thesis": "string",
  "northStar": "string",
  "successSignals": ["string", "string"],
  "guardrails": ["string", "string"],
  "firstActions": [
    { "title": "string", "why": "string", "window": "string" }
  ]
}

Rules:
- Provide 3-5 successSignals.
- Provide 2-4 firstActions.
- Keep title concise (< 70 chars).
- Every field must be grounded in Seed/Student/Gaze narrative.
- Do not include placeholders like TBD.`
}

// GET /api/onboarding/state
router.get('/state', async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const [profile, accounts, settings] = await Promise.all([
    prisma.onboardingProfile.findUnique({ where: { userId } }),
    getConnectedAccounts(userId),
    loadUserSettings(userId),
  ])

  const state = buildStateResponse({
    profile: profile
      ? {
          flowVersion: profile.flowVersion,
          currentStep: normalizeStep(profile.currentStep),
          connectState: toObject(profile.connectState),
          seed: toObject(profile.seed),
          student: toObject(profile.student),
          gaze: toObject(profile.gaze),
          kaizenExperiment: toObject(profile.kaizenExperiment),
          synthesisStatus: profile.synthesisStatus,
          completedAt: profile.completedAt,
        }
      : null,
    accounts,
    legacyCompletedAt: getLegacyCompletedAt(settings),
  })

  return res.json(state)
})

// PUT /api/onboarding/state
router.put('/state', async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const payload = toObject(req.body)

  const [profile, accounts] = await Promise.all([
    ensureProfileForWrite(userId),
    getConnectedAccounts(userId),
  ])

  const incomingSeed = Object.prototype.hasOwnProperty.call(payload, 'seed') ? sanitizeSeed(toObject(payload.seed)) : null
  const incomingStudent = Object.prototype.hasOwnProperty.call(payload, 'student')
    ? sanitizeStudent(toObject(payload.student))
    : null
  const incomingGaze = Object.prototype.hasOwnProperty.call(payload, 'gaze') ? sanitizeGaze(toObject(payload.gaze)) : null

  const nextSeed = incomingSeed ?? sanitizeSeed(toObject(profile.seed))
  const nextStudent = incomingStudent ?? sanitizeStudent(toObject(profile.student))
  const nextGaze = incomingGaze ?? sanitizeGaze(toObject(profile.gaze))

  const validation = computeValidation(
    {
      seed: nextSeed,
      student: nextStudent,
      gaze: nextGaze,
    },
    accounts
  )

  if (incomingSeed && !validation.stepValidation.connect.isValid) {
    return res.status(409).json({ error: 'Complete connect step before saving Seed.' })
  }

  if (incomingStudent && (!validation.stepValidation.connect.isValid || !validation.stepValidation.seed.isValid)) {
    return res.status(409).json({ error: 'Complete Seed before saving Student.' })
  }

  if (
    incomingGaze &&
    (!validation.stepValidation.connect.isValid || !validation.stepValidation.seed.isValid || !validation.stepValidation.student.isValid)
  ) {
    return res.status(409).json({ error: 'Complete Student before saving Gaze.' })
  }

  const requestedStep = Object.prototype.hasOwnProperty.call(payload, 'currentStep')
    ? normalizeStep(payload.currentStep)
    : normalizeStep(profile.currentStep)

  const requestedStepIdx = stepToIndex(requestedStep)
  if (requestedStepIdx > validation.maxAllowedStep) {
    return res.status(409).json({
      error: 'Requested step is locked until earlier steps are complete.',
      maxAllowedStep: validation.maxAllowedStep,
    })
  }

  const safeStep = STEP_ORDER[Math.min(requestedStepIdx, validation.maxAllowedStep)]

  const providerValue = isValidProvider(payload.provider) ? payload.provider : valueAsString(toObject(profile.connectState).provider)
  const isFallback = providerValue === 'n2f'

  const nextConnectState = {
    ...toObject(profile.connectState),
    provider: providerValue || 'n2f',
    resolvedProvider: isFallback ? 'google' : providerValue || 'google',
    fallbackProvider: 'google',
    connected: accounts.length > 0,
    connectedAccountIds: accounts.map((account) => account.id),
    connectedAccounts: accounts,
    lastCheckedAt: new Date().toISOString(),
  }

  const updatedProfile = await prisma.onboardingProfile.update({
    where: { userId },
    data: {
      flowVersion: 2,
      currentStep: safeStep,
      connectState: asJsonValue(nextConnectState),
      seed: asJsonValue(nextSeed),
      student: asJsonValue(nextStudent),
      gaze: asJsonValue(nextGaze),
    },
  })

  const settings = await loadUserSettings(userId)

  return res.json(
    buildStateResponse({
      profile: {
        flowVersion: updatedProfile.flowVersion,
        currentStep: normalizeStep(updatedProfile.currentStep),
        connectState: toObject(updatedProfile.connectState),
        seed: toObject(updatedProfile.seed),
        student: toObject(updatedProfile.student),
        gaze: toObject(updatedProfile.gaze),
        kaizenExperiment: toObject(updatedProfile.kaizenExperiment),
        synthesisStatus: updatedProfile.synthesisStatus,
        completedAt: updatedProfile.completedAt,
      },
      accounts,
      legacyCompletedAt: getLegacyCompletedAt(settings),
    })
  )
})

// POST /api/onboarding/connect/start
router.post('/connect/start', async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const provider = valueAsString(req.body?.provider || 'n2f').toLowerCase()
  if (!isValidProvider(provider)) {
    return res.status(400).json({ error: 'Unsupported provider. Use google or n2f.' })
  }

  await ensureProfileForWrite(userId)

  const fallbackUsed = provider === 'n2f'
  const resolvedProvider: SupportedProvider = fallbackUsed ? 'google' : provider
  const startUrl = '/api/calendar/google/authorize?redirect=/onboarding'

  await prisma.onboardingProfile.update({
    where: { userId },
    data: {
      connectState: asJsonValue({
        provider,
        resolvedProvider,
        fallbackProvider: 'google',
        fallbackUsed,
        lastStartAt: new Date().toISOString(),
      }),
    },
  })

  return res.json({
    provider,
    resolvedProvider,
    fallbackProvider: 'google',
    fallbackUsed,
    startUrl,
  })
})

// GET /api/onboarding/connect/status
router.get('/connect/status', async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const [profile, accounts] = await Promise.all([
    prisma.onboardingProfile.findUnique({ where: { userId } }),
    getConnectedAccounts(userId),
  ])

  const connected = accounts.length > 0
  const connectState = {
    ...toObject(profile?.connectState),
    connected,
    connectedAccountIds: accounts.map((account) => account.id),
    connectedAccounts: accounts,
    lastCheckedAt: new Date().toISOString(),
  }

  if (profile) {
    await prisma.onboardingProfile.update({
      where: { userId },
      data: { connectState: asJsonValue(connectState) },
    })
  }

  return res.json({
    connected,
    connectState,
    accounts,
    providers: SUPPORTED_PROVIDERS,
    fallbackProvider: 'google',
  })
})

// POST /api/onboarding/synthesize-experiment
router.post('/synthesize-experiment', async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const [profile, accounts] = await Promise.all([
    ensureProfileForWrite(userId),
    getConnectedAccounts(userId),
  ])

  const seed = sanitizeSeed(toObject(profile.seed))
  const student = sanitizeStudent(toObject(profile.student))
  const gaze = sanitizeGaze(toObject(profile.gaze))

  const validation = computeValidation({ seed, student, gaze }, accounts)

  const qualityErrors = {
    connect: validation.stepValidation.connect.errors,
    seed: validation.stepValidation.seed.errors,
    student: validation.stepValidation.student.errors,
    gaze: validation.stepValidation.gaze.errors,
  }

  const hasQualityErrors = Object.values(qualityErrors).some((errors) => errors.length > 0)
  if (hasQualityErrors) {
    return res.status(422).json({
      error: 'Quality gates failed for synthesis.',
      stepValidation: validation.stepValidation,
    })
  }

  const calendarSummary = await buildCalendarSynthesisSummary(userId)

  const connectState = {
    ...toObject(profile.connectState),
    connected: accounts.length > 0,
    connectedAccountIds: accounts.map((account) => account.id),
    connectedAccounts: accounts,
  }

  try {
    const prompt = buildExperimentPrompt({
      seed,
      student,
      gaze,
      connectState,
      calendarSummary,
    })

    const rawResponse = await callGemini(prompt)
    const parsed = JSON.parse(extractJsonFromText(rawResponse))
    const experiment = normalizeExperimentPayload(toObject(parsed))

    const generatedAt = new Date().toISOString()
    const qualityFlags = {
      seedNarrativeLength: valueAsString(seed.narrative).length,
      studentNarrativeLength: valueAsString(student.narrative).length,
      gazeDesiresLength: valueAsString(gaze.desires).length,
      gazeReflectionLength: valueAsString(gaze.reflection).length,
    }

    const payload = {
      experiment,
      metadata: {
        model: 'gemini-3-flash-preview',
        generatedAt,
        qualityFlags,
        calendarSummary,
      },
    }

    const updatedProfile = await prisma.onboardingProfile.update({
      where: { userId },
      data: {
        kaizenExperiment: asJsonValue(payload),
        synthesisStatus: 'ready',
      },
    })

    return res.json({
      synthesisStatus: updatedProfile.synthesisStatus,
      kaizenExperiment: payload,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to synthesize experiment'

    await prisma.onboardingProfile.update({
      where: { userId },
      data: { synthesisStatus: 'failed' },
    })

    if (message.includes('not configured')) {
      return res.status(503).json({ error: message })
    }

    return res.status(500).json({ error: 'Failed to synthesize experiment' })
  }
})

// POST /api/onboarding/complete
router.post('/complete', async (req: Request, res: Response) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const [profile, accounts] = await Promise.all([
    ensureProfileForWrite(userId),
    getConnectedAccounts(userId),
  ])

  const seed = sanitizeSeed(toObject(profile.seed))
  const student = sanitizeStudent(toObject(profile.student))
  const gaze = sanitizeGaze(toObject(profile.gaze))

  const validation = computeValidation({ seed, student, gaze }, accounts)

  const hasQualityErrors = Object.values(validation.stepValidation).some((step) => !step.isValid)
  if (hasQualityErrors) {
    return res.status(422).json({
      error: 'Cannot complete onboarding until all steps are valid.',
      stepValidation: validation.stepValidation,
    })
  }

  if (isEmptyRecord(profile.kaizenExperiment)) {
    return res.status(422).json({
      error: 'Generate your Kaizen Experiment before completing onboarding.',
    })
  }

  const completedAt = new Date().toISOString()

  await Promise.all([
    prisma.onboardingProfile.update({
      where: { userId },
      data: {
        completedAt: new Date(completedAt),
        currentStep: 'gaze',
      },
    }),
    updateLegacyCompletion(userId, completedAt),
  ])

  return res.json({
    completedAt,
  })
})

// ============================================
// Legacy onboarding suggestions endpoint (kept for compatibility)
// ============================================

const CALENDAR_ANALYSIS_MONTHS = 3
const MAX_CALENDAR_EVENTS = 500
const MAX_CATEGORY_SUGGESTIONS = 5
const MAX_RECURRING_PATTERNS = 10
const MAX_RECENT_EVENTS_SAMPLE = 20
const MIN_RECURRING_COUNT = 3

interface CalendarEvent {
  id: string
  summary: string | null
  description: string | null
  startDateTime: Date
  endDateTime: Date
  isAllDay: boolean
  recurringEventId: string | null
}

interface SuggestedTheme {
  id: string
  name: string
  description: string
  icon: string
}

interface SuggestedGate {
  id: string
  title: string
  theme: string
  deadline: string
  criteria?: string[]
}

interface SuggestedRoutine {
  id: string
  title: string
  frequency: string
  theme: string
}

interface Suggestions {
  themes: SuggestedTheme[]
  gates: SuggestedGate[]
  routines: SuggestedRoutine[]
}

function analyzeCalendarPatterns(events: CalendarEvent[]): {
  recurringPatterns: Map<string, { count: number; summary: string }>
  categories: Map<string, number>
} {
  const recurringPatterns = new Map<string, { count: number; summary: string }>()
  const categories = new Map<string, number>()

  const categoryKeywords: Record<string, string[]> = {
    'Health & Wellness': [
      'gym',
      'workout',
      'doctor',
      'dentist',
      'therapy',
      'yoga',
      'meditation',
      'health',
      'fitness',
      'run',
      'exercise',
    ],
    'Career & Work': [
      'meeting',
      'standup',
      'review',
      'interview',
      '1:1',
      'sync',
      'presentation',
      'deadline',
      'project',
      'work',
    ],
    Relationships: ['dinner', 'lunch', 'coffee', 'family', 'birthday', 'anniversary', 'date', 'friends', 'call with'],
    'Personal Growth': ['class', 'course', 'learn', 'study', 'read', 'workshop', 'training', 'conference', 'mentor'],
    Finance: ['bank', 'tax', 'financial', 'budget', 'investment', 'accountant', 'bills'],
    'Life Admin': ['appointment', 'errand', 'service', 'repair', 'maintenance', 'car', 'house'],
  }

  for (const event of events) {
    const summary = (event.summary || '').toLowerCase()

    if (event.recurringEventId) {
      const existing = recurringPatterns.get(event.recurringEventId)
      if (existing) {
        existing.count++
      } else {
        recurringPatterns.set(event.recurringEventId, { count: 1, summary: event.summary || '' })
      }
    }

    for (const [category, words] of Object.entries(categoryKeywords)) {
      if (words.some((word) => summary.includes(word))) {
        categories.set(category, (categories.get(category) || 0) + 1)
      }
    }
  }

  return { recurringPatterns, categories }
}

function parseGeminiResponse(content: string): Suggestions {
  let jsonText = content || '{}'
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    jsonText = jsonMatch[1]
  }

  const suggestions = JSON.parse(jsonText)

  if (!suggestions || typeof suggestions !== 'object') {
    return { themes: [], gates: [], routines: [] }
  }

  return {
    themes: Array.isArray(suggestions.themes) ? suggestions.themes : [],
    gates: Array.isArray(suggestions.gates) ? suggestions.gates : [],
    routines: Array.isArray(suggestions.routines) ? suggestions.routines : [],
  }
}

async function generateSuggestionsWithGemini(calendarSummary: string, journalContent: string | null): Promise<Suggestions> {
  const prompt = `You are helping a user set up their personal productivity system. Based on the data provided, suggest personalized themes (life areas), gates (commitments/goals), and routines.

${calendarSummary ? `Calendar Analysis (last ${CALENDAR_ANALYSIS_MONTHS} months):\n${calendarSummary}` : ''}

${journalContent ? `User's Journal/Reflections:\n${journalContent}` : ''}

Generate suggestions in JSON format. Be specific and personalized based on the data.
- Themes: 2-4 life areas that appear important based on their calendar/reflections
- Gates: 1-3 specific commitments they should focus on (with deadlines if apparent)
- Routines: 2-4 regular practices they already do or should establish

Response format (valid JSON only, no markdown code blocks):
{
  "themes": [
    { "id": "t1", "name": "Theme Name", "description": "Brief description", "icon": "emoji" }
  ],
  "gates": [
    { "id": "g1", "title": "Goal title", "theme": "Related Theme Name", "deadline": "YYYY-MM-DD", "criteria": ["criterion 1", "criterion 2"] }
  ],
  "routines": [
    { "id": "r1", "title": "Routine name", "frequency": "Daily/Weekly/etc", "theme": "Related Theme Name" }
  ]
}`

  const responseText = await callGemini(prompt)
  return parseGeminiResponse(responseText)
}

router.post('/generate-suggestions', async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { journalText } = req.body

  try {
    const now = new Date()
    const analysisStart = startOfMonth(subMonths(now, CALENDAR_ANALYSIS_MONTHS))
    const endDate = endOfMonth(now)

    const events = await prisma.cachedCalendarEvent.findMany({
      where: {
        userId,
        startDateTime: { gte: analysisStart, lte: endDate },
      },
      orderBy: { startDateTime: 'asc' },
      take: MAX_CALENDAR_EVENTS,
    })

    const { recurringPatterns, categories } = analyzeCalendarPatterns(
      events.map((event) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        isAllDay: event.isAllDay,
        recurringEventId: event.recurringEventId,
      }))
    )

    let calendarSummary = ''
    if (events.length > 0) {
      calendarSummary = `Total events analyzed: ${events.length}\n\n`

      const sortedCategories = [...categories.entries()].sort((a, b) => b[1] - a[1])
      if (sortedCategories.length > 0) {
        calendarSummary += 'Event categories detected:\n'
        for (const [category, count] of sortedCategories.slice(0, MAX_CATEGORY_SUGGESTIONS)) {
          calendarSummary += `- ${category}: ${count} events\n`
        }
        calendarSummary += '\n'
      }

      const sortedRecurring = [...recurringPatterns.values()]
        .filter((pattern) => pattern.count >= MIN_RECURRING_COUNT)
        .sort((a, b) => b.count - a.count)

      if (sortedRecurring.length > 0) {
        calendarSummary += 'Recurring events (weekly or more):\n'
        for (const pattern of sortedRecurring.slice(0, MAX_RECURRING_PATTERNS)) {
          calendarSummary += `- "${pattern.summary}" (${pattern.count} occurrences)\n`
        }
        calendarSummary += '\n'
      }

      const recentSample = events.slice(-MAX_RECENT_EVENTS_SAMPLE).map((event) => event.summary).filter(Boolean)
      if (recentSample.length > 0) {
        calendarSummary += 'Sample recent events:\n'
        for (const summary of recentSample) {
          calendarSummary += `- ${summary}\n`
        }
      }
    }

    const suggestions = await generateSuggestionsWithGemini(calendarSummary, journalText || null)
    return res.json(suggestions)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate suggestions'
    if (message.includes('not configured')) {
      return res.status(503).json({ error: message })
    }
    return res.status(500).json({ error: 'Failed to generate suggestions' })
  }
})

export default router
