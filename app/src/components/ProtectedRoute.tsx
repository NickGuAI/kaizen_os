import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { useUserSettings } from '../hooks/useUserSettings'
import { useThemes } from '../hooks/useCards'

export default function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const isAuthReady = !authLoading && !!user
  const { data: settings, isLoading: settingsLoading } = useUserSettings({ enabled: isAuthReady })
  const { data: themes, isLoading: themesLoading } = useThemes({ enabled: isAuthReady })

  if (authLoading) {
    return <div className="app" style={{ padding: 24 }}>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Wait for settings and themes to load before checking onboarding
  if (settingsLoading || themesLoading) {
    return <div className="app" style={{ padding: 24 }}>Loading...</div>
  }

  // Check if user needs onboarding (no themes and onboarding not completed)
  // completedAt is null by default, becomes a date string when onboarding finishes
  const onboardingComplete = Boolean(settings?.onboarding_progress?.completedAt)
  const hasThemes = themes && themes.length > 0
  const needsOnboarding = !hasThemes && !onboardingComplete
  const isOnOnboardingPage = location.pathname === '/onboarding'

  // Redirect to onboarding if needed (unless already there)
  if (needsOnboarding && !isOnOnboardingPage) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
