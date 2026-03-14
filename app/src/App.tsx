import { Routes, Route, useSearchParams, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
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
import ProtectedRoute from './components/ProtectedRoute'
import { AppLayout } from './components/layout'

function CreateDirector() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')
  if (type?.startsWith('ACTION_')) {
    return <Navigate to={`/contract/create?${searchParams.toString()}`} replace />
  }
  return <CardEditPage />
}

function AgentChatScene() {
  return (
    <AppLayout showAgentChatWidget={false}>
      <AgentChatPage />
    </AppLayout>
  )
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<AgentChatScene />} />
          <Route path="/chat" element={<Navigate to="/" replace />} />
          <Route path="/chat/:sessionId" element={<AgentChatScene />} />
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
