import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [oauthSubmitting, setOauthSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      const redirectTo = (location.state as { from?: string } | null)?.from || '/'
      navigate(redirectTo, { replace: true })
    }
  }, [loading, user, navigate, location.state])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await login(email.trim().toLowerCase(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setOauthSubmitting(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
    } finally {
      setOauthSubmitting(false)
    }
  }

  return (
    <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: 24, background: '#0b0b0b', borderRadius: 12, border: '1px solid #1f2937' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Welcome back</h1>
        <p style={{ color: '#9ca3af', marginBottom: 24 }}>Sign in to continue to Kaizen OS.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting || loading || oauthSubmitting}
            style={{
              padding: '12px',
              borderRadius: 8,
              background: '#f9fafb',
              color: '#111827',
              fontWeight: 600,
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
            }}
          >
            {oauthSubmitting ? 'Connecting...' : 'Sign in with Google'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, height: 1, background: '#1f2937' }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>or</span>
            <span style={{ flex: 1, height: 1, background: '#1f2937' }} />
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', color: '#f9fafb' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', color: '#f9fafb' }}
            />
          </label>
          {error && (
            <div style={{ color: '#f87171', fontSize: 12 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={submitting || loading || oauthSubmitting}
            style={{ padding: '12px', borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
