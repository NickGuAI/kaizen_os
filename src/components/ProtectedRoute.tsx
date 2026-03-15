import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { useUserSettings } from '../hooks/useUserSettings'
import { useThemes } from '../hooks/useCards'

export function getOnboardingGateState(params: {
  completedAt: string | null | undefined
  hasThemes?: boolean
  pathname: string
}) {
  const onboardingComplete = Boolean(params.completedAt)
  const needsOnboarding = !onboardingComplete && !params.hasThemes
  const isOnOnboardingPage = params.pathname === '/onboarding'

  return {
    needsOnboarding,
    isOnOnboardingPage,
    shouldRedirectToOnboarding: needsOnboarding && !isOnOnboardingPage,
  }
}

export default function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const isAuthReady = !authLoading && !!user
  const { data: settings, isLoading: settingsLoading } = useUserSettings({ enabled: isAuthReady })
  const onboardingCompletedAt = settings?.onboarding_progress?.completedAt
  const shouldLoadThemes = isAuthReady && !settingsLoading && !onboardingCompletedAt
  const { data: themes, isLoading: themesLoading } = useThemes({ enabled: shouldLoadThemes })

  if (authLoading) {
    return <div className="app" style={{ padding: 24 }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Wait for settings to load before checking onboarding.
  if (settingsLoading) {
    return <div className="app" style={{ padding: 24 }}>Loading...</div>
  }

  // Only load themes for legacy compatibility when completion flag is missing.
  if (shouldLoadThemes && themesLoading) {
    return <div className="app" style={{ padding: 24 }}>Loading...</div>
  }

  const gate = getOnboardingGateState({
    completedAt: onboardingCompletedAt,
    hasThemes: (themes?.length || 0) > 0,
    pathname: location.pathname,
  })

  // Redirect to onboarding if needed (unless already there)
  if (gate.shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
