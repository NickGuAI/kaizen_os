import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { useUserSettings } from '../hooks/useUserSettings'

export function getOnboardingGateState(params: { completedAt: string | null | undefined; pathname: string }) {
  const onboardingComplete = Boolean(params.completedAt)
  const needsOnboarding = !onboardingComplete
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

  if (authLoading) {
    return <div className="app" style={{ padding: 24 }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Wait for settings to load before checking onboarding
  if (settingsLoading) {
    return <div className="app" style={{ padding: 24 }}>Loading...</div>
  }

  const gate = getOnboardingGateState({
    completedAt: settings?.onboarding_progress?.completedAt,
    pathname: location.pathname,
  })

  // Redirect to onboarding if needed (unless already there)
  if (gate.shouldRedirectToOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
