import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { CardNav } from '../components/layout/CardNav'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithGoogle, user, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [oauthSubmitting, setOauthSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      const redirectTo = (location.state as { from?: string } | null)?.from || '/'
      navigate(redirectTo, { replace: true })
    }
  }, [loading, user, navigate, location.state])

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
    <div className="login-page">
      <CardNav variant="light" />

      <div className="login-card">
        <img src="/assets/zenos_logo.png" alt="ZenOS" className="login-mark" style={{ width: 48, height: 48, borderRadius: 10 }} />
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to continue to ZenOS.</p>

        <div className="login-form">
          {error && <div className="login-error">{error}</div>}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || oauthSubmitting}
            className="login-google-btn"
          >
            {oauthSubmitting ? 'Connecting...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    </div>
  )
}
