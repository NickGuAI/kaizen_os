import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getAccessToken, setAccessToken } from './authToken'
import { supabase } from './supabaseClient'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  emailVerifiedAt: string | null
  timezone: string | null
}

interface AuthResponse {
  user: AuthUser
  accessToken?: string
  expiresAt?: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || 'Authentication failed'
    throw new Error(message)
  }
  return {
    user: payload.user as AuthUser,
    accessToken: payload.accessToken,
    expiresAt: payload.expiresAt,
  }
}

async function fetchCurrentUser(token?: string | null): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  if (response.status === 401) {
    return null
  }

  const authResponse = await parseAuthResponse(response)
  return authResponse.user
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      let sessionToken: string | null = null
      let hasSupabaseSession = false

      if (supabase) {
        const { data } = await supabase.auth.getSession()
        if (data.session?.access_token) {
          hasSupabaseSession = true
          sessionToken = data.session.access_token
          setAccessToken(sessionToken, data.session.expires_at ? data.session.expires_at * 1000 : undefined)
        }
      }

      const token = sessionToken ?? getAccessToken()
      const currentUser = await fetchCurrentUser(token)
      if (currentUser) {
        setUser(currentUser)
        return
      }

      if (hasSupabaseSession && supabase) {
        const { data, error } = await supabase.auth.refreshSession()
        if (!error && data.session?.access_token) {
          setAccessToken(
            data.session.access_token,
            data.session.expires_at ? data.session.expires_at * 1000 : undefined
          )
          const refreshedUser = await fetchCurrentUser(data.session.access_token)
          setUser(refreshedUser)
          if (refreshedUser) {
            return
          }
        }
        setUser(null)
        setAccessToken(null)
        return
      }

      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (!refreshResponse.ok) {
        setUser(null)
        setAccessToken(null)
        return
      }

      const refreshed = await parseAuthResponse(refreshResponse)
      setAccessToken(refreshed.accessToken ?? null, refreshed.expiresAt ?? undefined)
      setUser(refreshed.user)
    } catch (error) {
      console.error('Failed to refresh auth session', error)
      setUser(null)
      setAccessToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    if (!supabase) {
      return
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAccessToken(null)
        setUser(null)
        return
      }

      if (!session?.access_token) {
        return
      }

      setAccessToken(
        session.access_token,
        session.expires_at ? session.expires_at * 1000 : undefined
      )
      void (async () => {
        try {
          const currentUser = await fetchCurrentUser(session.access_token)
          setUser(currentUser)
        } catch (error) {
          console.error('Failed to load user from Supabase session', error)
        }
      })()
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const authResponse = await parseAuthResponse(response)
    setAccessToken(authResponse.accessToken ?? null, authResponse.expiresAt ?? undefined)
    setUser(authResponse.user)
    return authResponse.user
  }, [])

  const loginWithGoogle = useCallback(async () => {
    if (!supabase) {
      throw new Error('Supabase OAuth is not configured')
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw new Error(error.message)
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    })

    const authResponse = await parseAuthResponse(response)
    setAccessToken(authResponse.accessToken ?? null, authResponse.expiresAt ?? undefined)
    setUser(authResponse.user)
    return authResponse.user
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    if (supabase) {
      await supabase.auth.signOut()
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
      refresh,
    }),
    [user, loading, login, loginWithGoogle, register, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
