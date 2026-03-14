import { describe, expect, it } from 'vitest'
import { getOnboardingGateState } from '@/components/ProtectedRoute'

describe('ProtectedRoute onboarding gate', () => {
  it('redirects incomplete users to /onboarding', () => {
    const gate = getOnboardingGateState({ completedAt: null, hasThemes: false, pathname: '/' })
    expect(gate.needsOnboarding).toBe(true)
    expect(gate.shouldRedirectToOnboarding).toBe(true)
  })

  it('does not redirect when already on /onboarding', () => {
    const gate = getOnboardingGateState({ completedAt: null, hasThemes: false, pathname: '/onboarding' })
    expect(gate.needsOnboarding).toBe(true)
    expect(gate.shouldRedirectToOnboarding).toBe(false)
  })

  it('does not redirect users with completed onboarding', () => {
    const gate = getOnboardingGateState({
      completedAt: '2026-03-14T00:00:00.000Z',
      hasThemes: false,
      pathname: '/',
    })
    expect(gate.needsOnboarding).toBe(false)
    expect(gate.shouldRedirectToOnboarding).toBe(false)
  })

  it('does not redirect legacy users who already have themes', () => {
    const gate = getOnboardingGateState({
      completedAt: null,
      hasThemes: true,
      pathname: '/',
    })
    expect(gate.needsOnboarding).toBe(false)
    expect(gate.shouldRedirectToOnboarding).toBe(false)
  })
})
