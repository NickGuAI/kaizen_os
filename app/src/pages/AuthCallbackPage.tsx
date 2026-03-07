import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { supabase } from '../lib/supabaseClient'

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

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          await refresh()
          navigate('/', { replace: true })
          return
        }
        setError(exchangeError.message)
        return
      }

      await refresh()
      navigate('/', { replace: true })
    }

    void completeLogin()
  }, [location.search, navigate, refresh])

  return (
    <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: 24, background: '#0b0b0b', borderRadius: 12, border: '1px solid #1f2937' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Completing sign-in</h1>
        {error ? (
          <>
            <p style={{ color: '#f87171', marginBottom: 16 }}>{error}</p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{ padding: '10px 12px', borderRadius: 8, background: '#111827', color: '#fff', border: '1px solid #1f2937', cursor: 'pointer' }}
            >
              Back to login
            </button>
          </>
        ) : (
          <p style={{ color: '#9ca3af' }}>Finalizing your session. One moment...</p>
        )}
      </div>
    </div>
  )
}
