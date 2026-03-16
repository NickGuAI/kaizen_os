import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../ui'
import { OnboardingProgress } from '../../../services/userSettingsTypes'
import { SeasonData } from '../hooks/useOnboarding'

interface Props {
  progress: OnboardingProgress
  themesCount: number
  season: SeasonData
  onComplete: () => void
}

export function CompleteStep({ progress, themesCount, season, onComplete }: Props) {
  const navigate = useNavigate()

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete()
      navigate('/')
    }, 5000)

    return () => clearTimeout(timer)
  }, [navigate, onComplete])

  const handleGoToDashboard = () => {
    onComplete()
    navigate('/')
  }

  // Count created entities
  const getEntityCount = (stepName: string): number => {
    return progress.steps[stepName]?.entityIds?.length ?? 0
  }

  const gatesCount = getEntityCount('gates')
  const experimentsCount = getEntityCount('experiments')
  const routinesCount = getEntityCount('routines')

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ padding: 'var(--space-8) 0' }}
    >
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="var(--color-sage)" strokeWidth="1.5" fill="rgba(139, 148, 103, 0.08)" />
          <path
            d="M28 40L36 48L52 32"
            stroke="var(--color-sage)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        style={{
          fontSize: '32px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-3)',
        }}
      >
        Your System is Ready
      </h1>

      <p
        style={{
          fontSize: '16px',
          color: 'var(--color-text-secondary)',
          maxWidth: '400px',
          lineHeight: 1.6,
          marginBottom: 'var(--space-6)',
        }}
      >
        You've laid the foundation for continuous improvement.
        Here's what you've set up:
      </p>

      {/* Season banner */}
      {season.name && (
        <div
          className="flex items-start"
          style={{
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '12px',
            marginBottom: 'var(--space-6)',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'left',
          }}
        >
          <div style={{ flexShrink: 0, color: 'var(--color-sage)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex flex-col" style={{ gap: '2px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {season.name}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {formatDate(season.startDate)} → {formatDate(season.endDate)}
              {' · '}{season.weeks} weeks
            </span>
            {season.intention && (
              <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginTop: '4px' }}>
                "{season.intention}"
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary grid - always show all 4 counts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <div
          className="flex flex-col items-center"
          style={{
            padding: 'var(--space-4) var(--space-2)',
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '12px',
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-sage)' }}>
            {themesCount}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Themes
          </span>
        </div>
        <div
          className="flex flex-col items-center"
          style={{
            padding: 'var(--space-4) var(--space-2)',
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '12px',
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-sage)' }}>
            {gatesCount}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Gates
          </span>
        </div>
        <div
          className="flex flex-col items-center"
          style={{
            padding: 'var(--space-4) var(--space-2)',
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '12px',
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-sage)' }}>
            {routinesCount}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Routines
          </span>
        </div>
        <div
          className="flex flex-col items-center"
          style={{
            padding: 'var(--space-4) var(--space-2)',
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '12px',
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-sage)' }}>
            {experimentsCount}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Experiments
          </span>
        </div>
      </div>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-6)',
          maxWidth: '380px',
          lineHeight: 1.6,
        }}
      >
        You can always adjust these later. Kaizen is about continuous,
        incremental improvement — there's no need to be perfect from the start.
      </p>

      <Button onClick={handleGoToDashboard} size="lg">
        Enter Kaizen OS
      </Button>

      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-4)' }}>
        Redirecting in 5 seconds...
      </p>
    </div>
  )
}
