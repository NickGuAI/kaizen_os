import { useState, useCallback, useEffect } from 'react'
import { useUserSettings, useUpdateUserSettings } from '../../../hooks/useUserSettings'
import { useCreateCard, useThemes } from '../../../hooks/useCards'
import { OnboardingProgress, OnboardingStepStatus } from '../../../services/userSettingsTypes'
import { Card } from '../../../lib/api'

// Step order matching mock: kaizen-onboarding.jsx
export const ONBOARDING_STEPS = [
  'welcome',
  'connect',      // Connect calendar + analyze
  'reflect',      // Journal/reflections input
  'season',       // Define planning cycle
  'themes',
  'gates',        // Commitments
  'routines',
  'experiments',  // Optional experiments
  'complete',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

const DEFAULT_PROGRESS: OnboardingProgress = {
  currentStep: 0,
  completedAt: null,
  steps: {},
}

// Suggestion types from AI analysis
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

// Season data type
export interface SeasonData {
  name: string
  startDate: string
  endDate: string
  weeks: number
  intention: string
}

function getNextSeasonDefault(): SeasonData {
  const today = new Date()
  const year = today.getFullYear()
  const currentQ = Math.floor(today.getMonth() / 3) // 0=Q1, 1=Q2, 2=Q3, 3=Q4
  const nextQ = (currentQ + 1) % 4
  const nextYear = nextQ === 0 ? year + 1 : year
  const startMonth = String(nextQ * 3 + 1).padStart(2, '0')
  const startDate = `${nextYear}-${startMonth}-01`
  const weeks = 13
  // end date = startDate + 13 weeks - 1 day
  const end = new Date(startDate)
  end.setDate(end.getDate() + weeks * 7 - 1)
  const endDate = end.toISOString().split('T')[0]
  return { name: `Q${nextQ + 1} ${nextYear}`, startDate, endDate, weeks, intention: '' }
}

// Normalize legacy array format to new object format
function normalizeOnboardingProgress(progress: unknown): OnboardingProgress {
  if (
    progress &&
    typeof progress === 'object' &&
    !Array.isArray(progress) &&
    'currentStep' in progress
  ) {
    const p = progress as OnboardingProgress
    return {
      currentStep: p.currentStep ?? 0,
      completedAt: p.completedAt ?? null,
      steps: p.steps ?? {},
    }
  }
  return { ...DEFAULT_PROGRESS }
}

export interface OnboardingState {
  currentStep: number
  isLoading: boolean
  error: string | null
  createdThemes: Card[]
  progress: OnboardingProgress
  // Calendar connection state
  hasCalendarConnected: boolean
  // Calendar analysis state
  isAnalyzing: boolean
  isAnalyzed: boolean
  // Journal/reflection state
  journalText: string
  journalFile: File | null
  // Season state
  season: SeasonData
  // AI suggestions
  suggestions: Suggestions
}

export interface UseOnboardingReturn {
  state: OnboardingState
  currentStepName: OnboardingStep
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  skipStep: () => void
  completeStep: (entityIds?: string[]) => void
  createTheme: (title: string) => Promise<Card | null>
  createAction: (
    type: 'ACTION_GATE' | 'ACTION_EXPERIMENT' | 'ACTION_ROUTINE' | 'ACTION_OPS',
    parentId: string,
    data: { title: string; criteria?: string[]; targetDate?: string; lagWeeks?: number }
  ) => Promise<Card | null>
  isComplete: boolean
  canSkip: boolean
  refetchThemes: () => void
  // New methods for personalized onboarding
  analyzeCalendar: () => Promise<void>
  setJournalText: (text: string) => void
  setJournalFile: (file: File | null) => void
  setSeason: (season: SeasonData) => void
}

export function useOnboarding(): UseOnboardingReturn {
  const { data: settings, isLoading: settingsLoading } = useUserSettings()
  const { data: themes, refetch: refetchThemes } = useThemes()
  const updateSettings = useUpdateUserSettings()
  const createCard = useCreateCard()

  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    isLoading: true,
    error: null,
    createdThemes: [],
    progress: DEFAULT_PROGRESS,
    hasCalendarConnected: false,
    isAnalyzing: false,
    isAnalyzed: false,
    journalText: '',
    journalFile: null,
    season: getNextSeasonDefault(),
    suggestions: { themes: [], gates: [], routines: [] },
  })

  // Check calendar connection status
  useEffect(() => {
    const checkCalendarConnection = async () => {
      try {
        const res = await fetch('/api/calendar/accounts', { credentials: 'include' })
        if (res.ok) {
          const accounts = await res.json()
          setState((prev) => ({ ...prev, hasCalendarConnected: accounts.length > 0 }))
        }
      } catch (err) {
        console.error('Failed to check calendar connection:', err)
      }
    }
    checkCalendarConnection()
  }, [])

  // Sync with saved progress on load
  useEffect(() => {
    if (!settingsLoading) {
      const normalizedProgress = settings
        ? normalizeOnboardingProgress(settings.onboarding_progress)
        : DEFAULT_PROGRESS
      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentStep: normalizedProgress.currentStep,
        progress: normalizedProgress,
        createdThemes: themes ?? [],
      }))
    }
  }, [settings, settingsLoading, themes])

  // Save progress to server
  const saveProgress = useCallback(
    async (progress: OnboardingProgress) => {
      try {
        await updateSettings.mutateAsync({ onboarding_progress: progress })
      } catch (err) {
        console.error('Failed to save onboarding progress:', err)
      }
    },
    [updateSettings]
  )

  const goToStep = useCallback(
    (step: number) => {
      const newProgress = {
        ...state.progress,
        currentStep: step,
      }
      setState((prev) => ({ ...prev, currentStep: step, progress: newProgress }))
      saveProgress(newProgress)
    },
    [state.progress, saveProgress]
  )

  const nextStep = useCallback(() => {
    const next = Math.min(state.currentStep + 1, ONBOARDING_STEPS.length - 1)
    goToStep(next)
  }, [state.currentStep, goToStep])

  const prevStep = useCallback(() => {
    const prev = Math.max(state.currentStep - 1, 0)
    goToStep(prev)
  }, [state.currentStep, goToStep])

  const updateStepStatus = useCallback(
    (stepName: OnboardingStep, status: OnboardingStepStatus, entityIds?: string[]) => {
      const nextStepIdx = Math.min(state.currentStep + 1, ONBOARDING_STEPS.length - 1)
      const newProgress: OnboardingProgress = {
        ...state.progress,
        currentStep: nextStepIdx,
        steps: {
          ...state.progress.steps,
          [stepName]: { status, entityIds },
        },
      }

      if (state.currentStep >= ONBOARDING_STEPS.length - 1) {
        newProgress.completedAt = new Date().toISOString()
      }

      setState((prev) => ({
        ...prev,
        currentStep: newProgress.currentStep,
        progress: newProgress,
      }))
      saveProgress(newProgress)
    },
    [state.progress, state.currentStep, saveProgress]
  )

  const skipStep = useCallback(() => {
    const stepName = ONBOARDING_STEPS[state.currentStep]
    updateStepStatus(stepName, 'skipped')
  }, [state.currentStep, updateStepStatus])

  const completeStep = useCallback(
    (entityIds?: string[]) => {
      const stepName = ONBOARDING_STEPS[state.currentStep]
      updateStepStatus(stepName, 'completed', entityIds)
    },
    [state.currentStep, updateStepStatus]
  )

  const createTheme = useCallback(
    async (title: string): Promise<Card | null> => {
      try {
        const card = await createCard.mutateAsync({
          title,
          unitType: 'THEME',
          status: 'not_started',
        })
        setState((prev) => ({
          ...prev,
          createdThemes: [...prev.createdThemes, card],
        }))
        return card
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to create theme',
        }))
        return null
      }
    },
    [createCard]
  )

  const createAction = useCallback(
    async (
      type: 'ACTION_GATE' | 'ACTION_EXPERIMENT' | 'ACTION_ROUTINE' | 'ACTION_OPS',
      parentId: string,
      data: { title: string; criteria?: string[]; targetDate?: string; lagWeeks?: number }
    ): Promise<Card | null> => {
      try {
        const card = await createCard.mutateAsync({
          title: data.title,
          unitType: type,
          parentId,
          status: 'not_started',
          criteria: data.criteria,
          targetDate: data.targetDate,
          lagWeeks: data.lagWeeks,
        })
        return card
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to create action',
        }))
        return null
      }
    },
    [createCard]
  )

  // Analyze calendar and generate suggestions
  const analyzeCalendar = useCallback(async () => {
    setState((prev) => ({ ...prev, isAnalyzing: true, error: null }))

    try {
      // Read file content if a file was uploaded
      let combinedJournalText = state.journalText
      if (state.journalFile) {
        const fileContent = await state.journalFile.text()
        combinedJournalText = combinedJournalText
          ? `${combinedJournalText}\n\n--- File: ${state.journalFile.name} ---\n${fileContent}`
          : fileContent
      }

      const response = await fetch('/api/onboarding/generate-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ journalText: combinedJournalText }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate suggestions')
      }

      const suggestions = await response.json()
      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        isAnalyzed: true,
        suggestions,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        error: err instanceof Error ? err.message : 'Failed to analyze calendar',
      }))
    }
  }, [state.journalText, state.journalFile])

  // Set journal text
  const setJournalText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, journalText: text }))
  }, [])

  // Set journal file
  const setJournalFile = useCallback((file: File | null) => {
    setState((prev) => ({ ...prev, journalFile: file }))
  }, [])

  // Set season data
  const setSeason = useCallback((season: SeasonData) => {
    setState((prev) => ({ ...prev, season }))
  }, [])

  const currentStepName = ONBOARDING_STEPS[state.currentStep]
  const isComplete = state.progress.completedAt !== null
  const canSkip = !['welcome', 'complete'].includes(currentStepName)

  return {
    state,
    currentStepName,
    goToStep,
    nextStep,
    prevStep,
    skipStep,
    completeStep,
    createTheme,
    createAction,
    isComplete,
    canSkip,
    refetchThemes,
    analyzeCalendar,
    setJournalText,
    setJournalFile,
    setSeason,
  }
}
