import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingWizard } from '../components/onboarding'
import { useUserSettings } from '../hooks/useUserSettings'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { data: settings, isLoading } = useUserSettings()

  // Redirect if onboarding is already complete
  useEffect(() => {
    if (!isLoading && settings?.onboarding_progress?.completedAt) {
      navigate('/', { replace: true })
    }
  }, [settings, isLoading, navigate])

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center"
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg)',
          paddingTop: 'var(--space-12)',
          paddingBottom: 'var(--space-12)',
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ minHeight: '400px', color: 'var(--color-text-secondary)' }}
        >
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        paddingTop: 'var(--space-12)',
        paddingBottom: 'var(--space-12)',
      }}
    >
      <OnboardingWizard />
    </div>
  )
}
