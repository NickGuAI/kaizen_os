import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../../ui'

interface CalendarAccount {
  id: string
  email: string
  provider: string
}

interface Props {
  onNext: () => void
  onSkip: () => void
}

export function ConnectStep({ onNext, onSkip }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<CalendarAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justConnected, setJustConnected] = useState(false)

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/calendar/accounts', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setAccounts(data)
        return data
      }
    } catch (err) {
      console.error('Failed to fetch calendar accounts:', err)
    } finally {
      setIsLoading(false)
    }
    return []
  }

  useEffect(() => {
    const init = async () => {
      // Check if returning from OAuth with connected=true
      const connected = searchParams.get('connected')
      const authError = searchParams.get('error')

      if (authError) {
        setError('Failed to connect your Google account. Please try again.')
        // Clear the error param from URL
        searchParams.delete('error')
        setSearchParams(searchParams, { replace: true })
        setIsLoading(false)
        return
      }

      if (connected === 'true') {
        // Just returned from OAuth - show success state
        setJustConnected(true)
        // Clear the connected param from URL
        searchParams.delete('connected')
        setSearchParams(searchParams, { replace: true })
        // Clear the pending flag
        sessionStorage.removeItem('onboarding_calendar_pending')
      }

      // Check if returning from OAuth via session storage (backup)
      const pendingCalendar = sessionStorage.getItem('onboarding_calendar_pending')
      if (pendingCalendar) {
        sessionStorage.removeItem('onboarding_calendar_pending')
        setJustConnected(true)
      }

      await fetchAccounts()
    }

    init()
  }, [searchParams, setSearchParams])

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      sessionStorage.setItem('onboarding_calendar_pending', 'true')

      const res = await fetch('/api/calendar/google/authorize?format=json&redirect=/onboarding', {
        credentials: 'include',
      })

      if (!res.ok) {
        // Parse error response for better error messages
        let errorMessage = 'Failed to connect calendar'
        try {
          const errorData = await res.json()
          if (res.status === 401) {
            console.error('Calendar auth failed: session expired or missing', errorData)
            // Redirect to login page, which will redirect back to onboarding after login
            sessionStorage.removeItem('onboarding_calendar_pending')
            navigate('/login', { state: { from: '/onboarding' } })
            return
          } else if (errorData.error?.message) {
            errorMessage = errorData.error.message
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : 'Failed to connect calendar'
          }
        } catch {
          console.error('Calendar auth failed with status:', res.status)
        }
        throw new Error(errorMessage)
      }

      const { url } = await res.json()
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
      {/* Step icon */}
      <div style={{ marginBottom: 'var(--space-6)', opacity: 0.9 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="var(--color-sage)" strokeWidth="1.5" fill="none" />
          <path d="M24 14V24L30 28" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" />
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

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          maxWidth: '400px',
          lineHeight: 1.6,
          marginBottom: 'var(--space-6)',
        }}
      >
        By connecting your Google Calendar, we can analyze your activities and events
        to suggest personalized themes, commitments, and routines. This helps us understand
        your life's rhythm.
      </p>

      {!hasConnectedCalendar ? (
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: 'var(--space-5)',
            backgroundColor: 'var(--color-background-secondary)',
            borderRadius: '12px',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div className="flex items-center" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{ flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                Google Calendar
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                Read-only access to your events
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              variant="secondary"
              size="sm"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          </div>

          {error && (
            <div
              style={{
                color: 'var(--color-critical)',
                fontSize: '13px',
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                borderRadius: '6px',
              }}
            >
              {error}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: 'var(--space-5)',
            backgroundColor: 'rgba(39, 174, 96, 0.08)',
            border: '1px solid rgba(39, 174, 96, 0.2)',
            borderRadius: '12px',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div
            className="flex items-center"
            style={{
              gap: 'var(--space-2)',
              color: 'var(--color-success)',
              fontSize: '14px',
              marginBottom: 'var(--space-4)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 4L6 11L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {justConnected ? 'Successfully Connected!' : 'Calendar Connected'}
          </div>
          {accounts.map((account) => (
            <div
              key={account.id}
              style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              {account.email}
            </div>
          ))}
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: 'var(--space-3)' }}>
            {justConnected
              ? 'Great! Your Google Calendar is now connected. We\'ll analyze your events along with any reflections you share in the next step.'
              : 'Your calendar events will be analyzed along with your reflections to generate personalized suggestions.'}
          </p>
        </div>
      )}

      <div
        className="flex justify-between w-full"
        style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}
      >
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  )
}
