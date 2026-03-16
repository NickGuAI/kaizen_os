import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../../../lib/apiFetch'

export const ONBOARDING_STEPS = ['connect', 'seed', 'student', 'gaze'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

type Provider = 'google' | 'n2f'

// Legacy onboarding step types are kept for compatibility with existing step components.
export interface SuggestedTheme {
  id: string
  name: string
  description: string
  icon: string
}

export interface SuggestedGate {
  id: string
  title: string
  theme: string
  deadline: string
  criteria?: string[]
}

export interface SuggestedRoutine {
  id: string
  title: string
  frequency: string
  theme: string
}

export interface Suggestions {
  themes: SuggestedTheme[]
  gates: SuggestedGate[]
  routines: SuggestedRoutine[]
}

export interface SeasonData {
  name: string
  startDate: string
  endDate: string
  weeks: number
  intention: string
}

export interface StepValidation {
  isValid: boolean
  errors: string[]
}

export interface ConnectState {
  provider: Provider
  resolvedProvider: Provider
  fallbackProvider: Provider
  fallbackUsed: boolean
  connected: boolean
  connectedAccountIds: string[]
  connectedAccounts: Array<{
    id: string
    provider: string
    email: string
    createdAt: string
  }>
  lastCheckedAt: string | null
}

export interface SeedData {
  coreIdentity: string
  startingPoint: string
  narrative: string
}

export interface StudentData {
  becoming: string
  horizon: string
  narrative: string
}

export interface GazeData {
  desires: string
  reflection: string
  nonNegotiables: string[]
}

export interface OnboardingState {
  flowVersion: number
  currentStep: number
  currentStepKey: OnboardingStep
  maxAllowedStep: number
  connectState: ConnectState
  seed: SeedData
  student: StudentData
  gaze: GazeData
  kaizenExperiment: Record<string, unknown> | null
  synthesisStatus: string
  completedAt: string | null
  isComplete: boolean
  stepValidation: Record<OnboardingStep, StepValidation>
  connectedAccounts: ConnectState['connectedAccounts']
}

interface OnboardingLocalState {
  isLoading: boolean
  isSaving: boolean
  isSynthesizing: boolean
  isConnecting: boolean
  error: string | null
  data: OnboardingState
}

export interface UseOnboardingReturn {
  state: OnboardingLocalState
  currentStepName: OnboardingStep
  setCurrentStep: (step: number) => void
  updateSeed: (seed: SeedData) => void
  updateStudent: (student: StudentData) => void
  updateGaze: (gaze: GazeData) => void
  refreshState: () => Promise<void>
  refreshConnectStatus: () => Promise<void>
  startConnection: (provider?: Provider) => Promise<void>
  synthesizeExperiment: () => Promise<void>
  completeOnboarding: () => Promise<void>
  clearError: () => void
  canAdvanceTo: (step: number) => boolean
}

const DEFAULT_STEP_VALIDATION: Record<OnboardingStep, StepValidation> = {
  connect: { isValid: false, errors: [] },
  seed: { isValid: false, errors: [] },
  student: { isValid: false, errors: [] },
  gaze: { isValid: false, errors: [] },
}

const DEFAULT_STATE: OnboardingState = {
  flowVersion: 2,
  currentStep: 0,
  currentStepKey: 'connect',
  maxAllowedStep: 0,
  connectState: {
    provider: 'n2f',
    resolvedProvider: 'google',
    fallbackProvider: 'google',
    fallbackUsed: true,
    connected: false,
    connectedAccountIds: [],
    connectedAccounts: [],
    lastCheckedAt: null,
  },
  seed: {
    coreIdentity: '',
    startingPoint: '',
    narrative: '',
  },
  student: {
    becoming: '',
    horizon: '',
    narrative: '',
  },
  gaze: {
    desires: '',
    reflection: '',
    nonNegotiables: [],
  },
  kaizenExperiment: null,
  synthesisStatus: 'idle',
  completedAt: null,
  isComplete: false,
  stepValidation: DEFAULT_STEP_VALIDATION,
  connectedAccounts: [],
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function stringArrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string')
}

function stepFromUnknown(value: unknown): OnboardingStep {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase() as OnboardingStep
    if (ONBOARDING_STEPS.includes(normalized)) {
      return normalized
    }
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    const index = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, value))
    return ONBOARDING_STEPS[index]
  }

  return 'connect'
}

function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step)
}

function normalizeStepValidation(value: unknown): Record<OnboardingStep, StepValidation> {
  const objectValue = toObject(value)

  return {
    connect: {
      isValid: Boolean(toObject(objectValue.connect).isValid),
      errors: stringArrayValue(toObject(objectValue.connect).errors),
    },
    seed: {
      isValid: Boolean(toObject(objectValue.seed).isValid),
      errors: stringArrayValue(toObject(objectValue.seed).errors),
    },
    student: {
      isValid: Boolean(toObject(objectValue.student).isValid),
      errors: stringArrayValue(toObject(objectValue.student).errors),
    },
    gaze: {
      isValid: Boolean(toObject(objectValue.gaze).isValid),
      errors: stringArrayValue(toObject(objectValue.gaze).errors),
    },
  }
}

export function normalizeOnboardingState(payload: unknown): OnboardingState {
  const data = toObject(payload)
  const currentStepKey = stepFromUnknown(data.currentStepKey ?? data.currentStep)
  const currentStep = stepIndex(currentStepKey)

  const connectStateRaw = toObject(data.connectState)
  const connectedAccounts = Array.isArray(data.connectedAccounts)
    ? data.connectedAccounts
        .map((account) => {
          const accountRecord = toObject(account)
          return {
            id: stringValue(accountRecord.id),
            provider: stringValue(accountRecord.provider),
            email: stringValue(accountRecord.email),
            createdAt: stringValue(accountRecord.createdAt),
          }
        })
        .filter((account) => account.id.length > 0)
    : []

  const provider = stringValue(connectStateRaw.provider) === 'google' ? 'google' : 'n2f'
  const resolvedProvider = stringValue(connectStateRaw.resolvedProvider) === 'n2f' ? 'n2f' : 'google'
  const fallbackProvider = stringValue(connectStateRaw.fallbackProvider) === 'n2f' ? 'n2f' : 'google'

  return {
    flowVersion: typeof data.flowVersion === 'number' ? data.flowVersion : 2,
    currentStep,
    currentStepKey,
    maxAllowedStep: typeof data.maxAllowedStep === 'number' ? data.maxAllowedStep : currentStep,
    connectState: {
      provider,
      resolvedProvider,
      fallbackProvider,
      fallbackUsed: Boolean(connectStateRaw.fallbackUsed),
      connected: Boolean(connectStateRaw.connected),
      connectedAccountIds: stringArrayValue(connectStateRaw.connectedAccountIds),
      connectedAccounts,
      lastCheckedAt: stringValue(connectStateRaw.lastCheckedAt) || null,
    },
    seed: {
      coreIdentity: stringValue(toObject(data.seed).coreIdentity),
      startingPoint: stringValue(toObject(data.seed).startingPoint),
      narrative: stringValue(toObject(data.seed).narrative),
    },
    student: {
      becoming: stringValue(toObject(data.student).becoming),
      horizon: stringValue(toObject(data.student).horizon),
      narrative: stringValue(toObject(data.student).narrative),
    },
    gaze: {
      desires: stringValue(toObject(data.gaze).desires),
      reflection: stringValue(toObject(data.gaze).reflection),
      nonNegotiables: stringArrayValue(toObject(data.gaze).nonNegotiables),
    },
    kaizenExperiment: data.kaizenExperiment ? toObject(data.kaizenExperiment) : null,
    synthesisStatus: stringValue(data.synthesisStatus) || 'idle',
    completedAt: stringValue(data.completedAt) || null,
    isComplete: Boolean(data.isComplete),
    stepValidation: normalizeStepValidation(data.stepValidation),
    connectedAccounts,
  }
}

async function getOnboardingState(signal?: AbortSignal): Promise<OnboardingState> {
  const response = await apiFetch('/api/onboarding/state', { signal })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to load onboarding state')
  }

  return normalizeOnboardingState(await response.json())
}

export function canAdvanceToStep(maxAllowedStep: number, requestedStep: number): boolean {
  return requestedStep <= maxAllowedStep
}

// Client-side validation mirroring server rules — so Continue enables without any API call.
function validateSeedLocal(seed: SeedData): string[] {
  const errors: string[] = []
  if ((seed.coreIdentity?.trim().length ?? 0) < 8) errors.push('Core identity must be at least 8 characters.')
  if ((seed.narrative?.trim().length ?? 0) < 140) errors.push('Seed narrative must be at least 140 characters.')
  return errors
}

function validateStudentLocal(student: StudentData): string[] {
  const errors: string[] = []
  if ((student.becoming?.trim().length ?? 0) < 12) errors.push('Future-state statement must be at least 12 characters.')
  if ((student.horizon?.trim().length ?? 0) < 3) errors.push('Horizon is required.')
  if ((student.narrative?.trim().length ?? 0) < 140) errors.push('Student narrative must be at least 140 characters.')
  return errors
}

function validateGazeLocal(gaze: GazeData): string[] {
  const errors: string[] = []
  if ((gaze.desires?.trim().length ?? 0) < 120) errors.push('Desires draft must be at least 120 characters.')
  if ((gaze.reflection?.trim().length ?? 0) < 180) errors.push('Reflection draft must be at least 180 characters.')
  return errors
}

function computeLocalValidation(
  data: OnboardingState
): { stepValidation: Record<OnboardingStep, StepValidation>; maxAllowedStep: number } {
  const connectErrors = data.connectState.connected ? [] : ['Connect at least one account to continue.']
  const seedErrors = validateSeedLocal(data.seed)
  const studentErrors = validateStudentLocal(data.student)
  const gazeErrors = validateGazeLocal(data.gaze)

  const stepValidation: Record<OnboardingStep, StepValidation> = {
    connect: { isValid: connectErrors.length === 0, errors: connectErrors },
    seed: { isValid: seedErrors.length === 0, errors: seedErrors },
    student: { isValid: studentErrors.length === 0, errors: studentErrors },
    gaze: { isValid: gazeErrors.length === 0, errors: gazeErrors },
  }

  if (!stepValidation.connect.isValid) return { stepValidation, maxAllowedStep: 0 }
  if (!stepValidation.seed.isValid) return { stepValidation, maxAllowedStep: 1 }
  if (!stepValidation.student.isValid) return { stepValidation, maxAllowedStep: 2 }
  return { stepValidation, maxAllowedStep: 3 }
}

export function useOnboarding(): UseOnboardingReturn {
  const [state, setState] = useState<OnboardingLocalState>({
    isLoading: true,
    isSaving: false,
    isSynthesizing: false,
    isConnecting: false,
    error: null,
    data: DEFAULT_STATE,
  })

  const mergeState = useCallback((updater: (previous: OnboardingLocalState) => OnboardingLocalState) => {
    setState((previous) => updater(previous))
  }, [])

  const refreshStateAbortRef = useRef<AbortController | null>(null)

  const refreshState = useCallback(async () => {
    if (refreshStateAbortRef.current) {
      refreshStateAbortRef.current.abort()
    }
    const controller = new AbortController()
    refreshStateAbortRef.current = controller

    mergeState((previous) => ({ ...previous, isLoading: true, error: null }))
    try {
      const data = await getOnboardingState(controller.signal)
      if (refreshStateAbortRef.current !== controller) return
      refreshStateAbortRef.current = null
      mergeState((previous) => ({ ...previous, isLoading: false, data }))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (refreshStateAbortRef.current === controller) {
        refreshStateAbortRef.current = null
      }
      mergeState((previous) => ({
        ...previous,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load onboarding',
      }))
    }
  }, [mergeState])

  // Load server state once on mount (to resume incomplete onboarding).
  useEffect(() => {
    refreshState()
    return () => {
      if (refreshStateAbortRef.current) {
        refreshStateAbortRef.current.abort()
      }
    }
  }, [refreshState])

  // Step navigation is purely local. No API calls.
  const setCurrentStep = useCallback(
    (step: number) => {
      const clampedStep = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, step))
      const stepKey = ONBOARDING_STEPS[clampedStep]
      mergeState((previous) => ({
        ...previous,
        data: { ...previous.data, currentStep: clampedStep, currentStepKey: stepKey },
      }))
    },
    [mergeState]
  )

  const updateSeed = useCallback(
    (seed: SeedData) => {
      mergeState((previous) => ({
        ...previous,
        data: { ...previous.data, seed },
      }))
    },
    [mergeState]
  )

  const updateStudent = useCallback(
    (student: StudentData) => {
      mergeState((previous) => ({
        ...previous,
        data: { ...previous.data, student },
      }))
    },
    [mergeState]
  )

  const updateGaze = useCallback(
    (gaze: GazeData) => {
      mergeState((previous) => ({
        ...previous,
        data: { ...previous.data, gaze },
      }))
    },
    [mergeState]
  )

  const refreshConnectStatus = useCallback(async () => {
    mergeState((previous) => ({ ...previous, error: null }))
    try {
      const response = await apiFetch('/api/onboarding/connect/status')
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to refresh connection status')
      }

      const payload = toObject(await response.json())
      const connectedAccounts = Array.isArray(payload.accounts)
        ? payload.accounts
            .map((account) => {
              const accountRecord = toObject(account)
              return {
                id: stringValue(accountRecord.id),
                provider: stringValue(accountRecord.provider),
                email: stringValue(accountRecord.email),
                createdAt: stringValue(accountRecord.createdAt),
              }
            })
            .filter((account) => account.id.length > 0)
        : []

      mergeState((previous) => ({
        ...previous,
        data: {
          ...previous.data,
          connectState: {
            ...previous.data.connectState,
            connected: Boolean(payload.connected),
            connectedAccountIds: connectedAccounts.map((account) => account.id),
            connectedAccounts,
            lastCheckedAt: new Date().toISOString(),
          },
          connectedAccounts,
        },
      }))
    } catch (err) {
      mergeState((previous) => ({
        ...previous,
        error: err instanceof Error ? err.message : 'Failed to refresh connection status',
      }))
    }
  }, [mergeState])

  const startConnection = useCallback(
    async (provider: Provider = 'n2f') => {
      mergeState((previous) => ({ ...previous, isConnecting: true, error: null }))

      try {
        const response = await apiFetch('/api/onboarding/connect/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ provider }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to start account connection')
        }

        const payload = toObject(await response.json())
        const startUrl = stringValue(payload.startUrl)
        if (!startUrl) {
          throw new Error('Missing connect start URL')
        }

        window.location.href = startUrl
      } catch (err) {
        sessionStorage.removeItem('onboarding_connect_pending')
        mergeState((previous) => ({
          ...previous,
          isConnecting: false,
          error: err instanceof Error ? err.message : 'Failed to start account connection',
        }))
      }
    },
    [mergeState]
  )

  const synthesizeExperiment = useCallback(async () => {
    mergeState((previous) => ({ ...previous, isSynthesizing: true, error: null }))

    try {
      const response = await apiFetch('/api/onboarding/synthesize-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: state.data.seed,
          student: state.data.student,
          gaze: state.data.gaze,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to synthesize experiment')
      }

      const payload = toObject(await response.json())
      mergeState((previous) => ({
        ...previous,
        isSynthesizing: false,
        data: {
          ...previous.data,
          synthesisStatus: stringValue(payload.synthesisStatus) || 'ready',
          kaizenExperiment: payload.kaizenExperiment ? toObject(payload.kaizenExperiment) : previous.data.kaizenExperiment,
        },
      }))
    } catch (err) {
      mergeState((previous) => ({
        ...previous,
        isSynthesizing: false,
        error: err instanceof Error ? err.message : 'Failed to synthesize experiment',
      }))
    }
  }, [mergeState, state.data.seed, state.data.student, state.data.gaze])

  const completeOnboarding = useCallback(async () => {
    mergeState((previous) => ({ ...previous, isSaving: true, error: null }))

    try {
      const response = await apiFetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: state.data.seed,
          student: state.data.student,
          gaze: state.data.gaze,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to complete onboarding')
      }

      const payload = toObject(await response.json())
      mergeState((previous) => ({
        ...previous,
        isSaving: false,
        data: {
          ...previous.data,
          completedAt: stringValue(payload.completedAt),
          isComplete: true,
        },
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding'
      mergeState((previous) => ({
        ...previous,
        isSaving: false,
        error: message,
      }))
      throw err instanceof Error ? err : new Error(message)
    }
  }, [mergeState, state.data.seed, state.data.student, state.data.gaze])

  const clearError = useCallback(() => {
    mergeState((previous) => ({ ...previous, error: null }))
  }, [mergeState])

  // Compute validation locally from current form data so Continue enables without server round-trip.
  const localValidation = useMemo(() => computeLocalValidation(state.data), [state.data])

  const canAdvanceTo = useCallback(
    (step: number) => canAdvanceToStep(localValidation.maxAllowedStep, step),
    [localValidation.maxAllowedStep]
  )

  const currentStepName = useMemo(() => state.data.currentStepKey, [state.data.currentStepKey])

  // Expose state with locally-computed validation so UI reacts to typing immediately.
  const stateWithLocalValidation = useMemo<OnboardingLocalState>(
    () => ({
      ...state,
      data: {
        ...state.data,
        stepValidation: localValidation.stepValidation,
        maxAllowedStep: localValidation.maxAllowedStep,
      },
    }),
    [state, localValidation]
  )

  return {
    state: stateWithLocalValidation,
    currentStepName,
    setCurrentStep,
    updateSeed,
    updateStudent,
    updateGaze,
    refreshState,
    refreshConnectStatus,
    startConnection,
    synthesizeExperiment,
    completeOnboarding,
    clearError,
    canAdvanceTo,
  }
}
