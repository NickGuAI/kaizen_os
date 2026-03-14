import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { supabase } from '../lib/supabaseClient'
import { apiFetch } from '../lib/apiFetch'
import '../styles/public-landing.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoConnectCalendar(session: any) {
  const providerToken = session.provider_token
  const providerRefreshToken = session.provider_refresh_token
  const email = session.user?.email
  if (!providerToken || !email) return
  try {
    await apiFetch('/api/auth/auto-connect-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerToken, providerRefreshToken, email }),
    })
  } catch {
    // Non-critical — user can still connect manually later
    console.warn('[auth] Auto-connect calendar failed silently')
  }
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const exchangeAttemptedRef = useRef(false)

  useEffect(() => {
    const completeLogin = async () => {
      if (exchangeAttemptedRef.current) {
        return
      }
      exchangeAttemptedRef.current = true

      if (!supabase) {
        setError('Supabase OAuth is not configured.')
        return
      }

      const params = new URLSearchParams(location.search)
      const code = params.get('code')
      if (!code) {
        setError('Missing authorization code.')
        return
      }

      const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          await refresh()
          await autoConnectCalendar(sessionData.session)
          navigate('/', { replace: true })
          return
        }
        setError(exchangeError.message)
        return
      }

      await refresh()
      if (exchangeData?.session) {
        await autoConnectCalendar(exchangeData.session)
      }
      navigate('/', { replace: true })
    }

    void completeLogin()
  }, [location.search, navigate, refresh])

  return (
    <main className="public-landing">
      <div className="public-landing__overlay" aria-hidden="true" />
      <section className="public-landing__hero" style={{ maxWidth: 480 }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', 'Palatino Linotype', serif",
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          lineHeight: 1.15,
          letterSpacing: '0.015em',
          color: '#f5f1eb',
          marginBottom: '0.75rem',
        }}>
          Completing sign-in
        </h1>
        {error ? (
          <>
            <p style={{ color: '#C23B22', marginBottom: 16, fontSize: '0.95rem' }}>{error}</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="public-landing__cta"
              style={{ marginTop: '1rem' }}
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'rgba(245, 241, 235, 0.72)', fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)', lineHeight: 1.55, fontFamily: "'Avenir Next', 'Trebuchet MS', sans-serif" }}>
              Finalizing your session. One moment...
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid rgba(139, 148, 103, 0.3)',
                borderTopColor: '#8B9467',
                animation: 'auth-spin 1s linear infinite',
              }} />
            </div>
            <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}
      </section>
    </main>
  )
}
