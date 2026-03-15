import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { CardNav } from '../components/layout/CardNav'

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

  const audioRef = useRef<HTMLAudioElement>(null)
  const startMusic = useCallback(() => {
    const el = audioRef.current
    if (el && el.paused) {
      el.play().catch(() => {})
    }
  }, [])

  useEffect(() => {
    document.addEventListener('click', startMusic, { once: true })
    return () => document.removeEventListener('click', startMusic)
  }, [startMusic])

  return (
    <div className="login-page">
      <audio ref={audioRef} src="/assets/zenkai.wav" loop />
      <CardNav variant="dark" />

      <div className="login-card">
        <div className="login-mark">K</div>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to continue to Kaizen OS.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting || loading || oauthSubmitting}
            className="login-google-btn"
          >
            {oauthSubmitting ? 'Connecting...' : 'Sign in with Google'}
          </button>

          <div className="login-divider">
            <span className="login-divider-line" />
            <span className="login-divider-text">or</span>
            <span className="login-divider-line" />
          </div>

          <label className="login-field">
            <span className="login-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="login-input"
            />
          </label>

          <label className="login-field">
            <span className="login-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="login-input"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            disabled={submitting || loading || oauthSubmitting}
            className="login-submit-btn"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
