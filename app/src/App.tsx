import { useEffect } from 'react'
import { Routes, Route, useSearchParams, useNavigate, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import PublicLandingPage from './pages/PublicLandingPage'
import WhereAmIPage from './pages/WhereAmIPage'
import SeasonsPage from './pages/SeasonsPage'
import ThemeViewPage from './pages/ThemeViewPage'
import ContractPage from './pages/ContractPage'
import CardEditPage from './pages/CardEditPage'
import SettingsPage from './pages/SettingsPage'
import SeasonView from './pages/SeasonView'
import ActionTableView from './pages/ActionTableView'
import SeasonGradingPage from './pages/SeasonGradingPage'
import ReviewPage from './pages/ReviewPage'
import ClassificationRulesPage from './pages/ClassificationRulesPage'
import AgentChatPage from './pages/AgentChatPage'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import OnboardingPage from './pages/OnboardingPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import ProtectedRoute from './components/ProtectedRoute'
import ZenosLoading from './components/ZenosLoading'
import { useAuth } from './lib/authContext'
import { AppLayout } from './components/layout'

function CreateDirector() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')
  if (type?.startsWith('ACTION_')) {
    return <Navigate to={`/contract/create?${searchParams.toString()}`} replace />
  }
  return <CardEditPage />
}

function RootRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <ZenosLoading />
  }

  if (user) {
    return <Navigate to="/planner" replace />
  }

  return <PublicLandingPage />
}

function AgentChatScene() {
  return (
    <AppLayout showAgentChatWidget={false}>
      <AgentChatPage />
    </AppLayout>
  )
}

function App() {
  const navigate = useNavigate()

  // Native macOS app: handle OAuth callback from kaizenos:// deep link.
  // The native app dispatches 'kaizen:native-oauth' with the callback URL.
  // We navigate to /auth/callback?code=xxx so AuthCallbackPage can exchange
  // (code_verifier stays in sessionStorage — native app must NOT reload first).
  useEffect(() => {
    const handler = (e: CustomEvent<{ callbackUrl: string }>) => {
      const url = e.detail?.callbackUrl
      if (!url) return
      try {
        const parsed = new URL(url)
        const code = parsed.searchParams.get('code') ?? parsed.hash.match(/[?&]code=([^&]+)/)?.[1]
        if (code) {
          navigate(`/auth/callback?code=${encodeURIComponent(code)}`, { replace: true })
        }
      } catch {
        console.warn('[auth] Failed to parse native OAuth callback URL')
      }
    }
    window.addEventListener('kaizen:native-oauth', handler as EventListener)
    return () => window.removeEventListener('kaizen:native-oauth', handler as EventListener)
  }, [navigate])

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/chat" element={<AgentChatScene />} />
          <Route path="/chat/:sessionId" element={<AgentChatScene />} />
          <Route path="/app" element={<Navigate to="/planner" replace />} />
          <Route path="/planner" element={<LandingPage />} />
          <Route path="/themes" element={<Navigate to="/planner" replace />} />
          <Route path="/themes-overview" element={<Navigate to="/where-am-i" replace />} />
          <Route path="/where-am-i" element={<WhereAmIPage />} />
          <Route path="/seasons" element={<SeasonsPage />} />
          <Route path="/seasons/:id" element={<SeasonView />} />
          <Route path="/seasons/:id/view" element={<SeasonView />} />
          <Route path="/theme/:id" element={<ThemeViewPage />} />
          <Route path="/contract/:id" element={<ContractPage />} />
          <Route path="/card/:entryId/edit" element={<CardEditPage />} />
          <Route path="/create" element={<CreateDirector />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/rules" element={<ClassificationRulesPage />} />
          <Route path="/seasons/:id/edit" element={<SeasonView />} />
          <Route path="/seasons/:id/grading" element={<SeasonGradingPage />} />
          <Route path="/theme/:id/actions/:type" element={<ActionTableView />} />
          <Route path="/weekly" element={<Navigate to="/review" replace />} />
          <Route path="/review" element={<ReviewPage />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
