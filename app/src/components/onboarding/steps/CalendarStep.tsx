import { useState, useEffect } from 'react'
import { Button } from '../../ui'

interface Props {
  onNext: () => void
  onSkip: () => void
}

interface CalendarAccount {
  id: string
  email: string
  provider: string
}

export function CalendarStep({ onNext, onSkip }: Props) {
  const [accounts, setAccounts] = useState<CalendarAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch connected calendar accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch('/api/calendar/accounts', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setAccounts(data)
        }
      } catch (err) {
        console.error('Failed to fetch calendar accounts:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccounts()

    // Check if returning from OAuth
    const pendingCalendar = sessionStorage.getItem('onboarding_calendar_pending')
    if (pendingCalendar) {
      sessionStorage.removeItem('onboarding_calendar_pending')
      fetchAccounts()
    }
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      // Store flag for OAuth return
      sessionStorage.setItem('onboarding_calendar_pending', 'true')

      // Get auth URL with redirect back to onboarding
      const res = await fetch('/api/calendar/google/authorize?format=json&redirect=/onboarding', {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to get authorization URL')
      }

      const { url } = await res.json()

      // Redirect to Google OAuth
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect calendar')
      setIsConnecting(false)
    }
  }

  const hasConnectedCalendar = accounts.length > 0

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center text-center"
        style={{ padding: 'var(--space-8) 0' }}
      >
        <div style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-12)' }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ padding: 'var(--space-8) 0' }}
    >
      <div style={{ marginBottom: 'var(--space-6)', opacity: 0.9 }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="1.5" />
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="10" x2="21" y2="10" strokeWidth="1.5" />
        </svg>
      </div>

      <h2
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Connect Your Calendar
      </h2>

      {hasConnectedCalendar ? (
        <>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              maxWidth: '400px',
              lineHeight: 1.6,
              marginBottom: 'var(--space-6)',
            }}
          >
            Your Google Calendar is connected.
          </p>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center"
                style={{
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-sage-light)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '15px',
                }}
              >
                <span style={{ color: 'var(--color-sage)', fontWeight: 600 }}>✓</span>
                {account.email}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              maxWidth: '400px',
              lineHeight: 1.6,
              marginBottom: 'var(--space-6)',
            }}
          >
            Connect your Google Calendar to see your events alongside your themes and actions.
            Kaizen OS will help you plan around your existing commitments.
          </p>

          <div
            className="flex flex-col"
            style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}
          >
            <div
              style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-sage-light)',
                borderRadius: '8px',
              }}
            >
              See events on your dashboard
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-sage-light)',
                borderRadius: '8px',
              }}
            >
              Plan work around meetings
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--color-sage-light)',
                borderRadius: '8px',
              }}
            >
              Track time spent on themes
            </div>
          </div>

          {error && (
            <div
              style={{
                color: 'var(--color-critical)',
                fontSize: '14px',
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                borderRadius: '8px',
              }}
            >
              {error}
            </div>
          )}

          <Button onClick={handleConnect} size="lg" disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
          </Button>
        </>
      )}

      <div
        className="flex justify-between w-full"
        style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-4)' }}
      >
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onNext} disabled={!hasConnectedCalendar && isConnecting}>
          {hasConnectedCalendar ? 'Continue' : 'Continue without calendar'}
        </Button>
      </div>
    </div>
  )
}
