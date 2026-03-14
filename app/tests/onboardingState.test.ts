import { describe, expect, it } from 'vitest'
import { canAdvanceToStep, normalizeOnboardingState } from '@/components/onboarding/hooks/useOnboarding'

describe('onboarding state normalization', () => {
  it('restores current step and draft fields from server payload', () => {
    const state = normalizeOnboardingState({
      currentStep: 2,
      maxAllowedStep: 2,
      seed: {
        coreIdentity: 'Builder',
        startingPoint: 'Restarting focus',
        narrative: 'Seed narrative',
      },
      student: {
        becoming: 'Deliberate operator',
        horizon: '1_year',
        narrative: 'Student narrative',
      },
      gaze: {
        desires: 'Desire text',
        reflection: 'Reflection text',
      },
      stepValidation: {
        connect: { isValid: true, errors: [] },
        seed: { isValid: true, errors: [] },
        student: { isValid: true, errors: [] },
        gaze: { isValid: false, errors: ['Need longer reflection'] },
      },
    })

    expect(state.currentStep).toBe(2)
    expect(state.currentStepKey).toBe('student')
    expect(state.seed.coreIdentity).toBe('Builder')
    expect(state.student.horizon).toBe('1_year')
    expect(state.gaze.reflection).toBe('Reflection text')
    expect(state.stepValidation.gaze.errors[0]).toContain('Need longer reflection')
  })

  it('falls back to safe defaults when payload is empty', () => {
    const state = normalizeOnboardingState({})

    expect(state.currentStep).toBe(0)
    expect(state.currentStepKey).toBe('connect')
    expect(state.seed.narrative).toBe('')
    expect(state.student.narrative).toBe('')
    expect(state.gaze.nonNegotiables).toEqual([])
    expect(state.connectState.connected).toBe(false)
  })
})

describe('step progression helper', () => {
  it('allows only steps at or below the max unlocked step', () => {
    expect(canAdvanceToStep(0, 0)).toBe(true)
    expect(canAdvanceToStep(1, 2)).toBe(false)
    expect(canAdvanceToStep(3, 3)).toBe(true)
  })
})
