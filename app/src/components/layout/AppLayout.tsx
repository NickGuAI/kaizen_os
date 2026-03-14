// AppLayout - Shared chat-first shell with card navigation
import { ReactNode, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Card from 'react-bootstrap/Card'
import Nav from 'react-bootstrap/Nav'
import { useThemes } from '../../hooks/useCards'
import { useActiveSeason } from '../../hooks/useSeasons'
import { AgentChat } from '../AgentChat'
import { MobileNav } from './MobileNav'
import './Layout.css'

interface AppLayoutProps {
  children: ReactNode
  onThemeClick?: (themeId: string) => void
  showAgentChatWidget?: boolean
}

interface NavLinkItem {
  key: string
  label: string
  path: string
}

const SERVICE_LINKS: NavLinkItem[] = [
  { key: 'service-home', label: 'Home', path: '/planner' },
  { key: 'service-chat', label: 'Chat', path: '/' },
  { key: 'service-review', label: 'Review', path: '/review' },
]

const SCENE_LINKS: NavLinkItem[] = [
  { key: 'scene-themes', label: 'Themes', path: '/where-am-i' },
  { key: 'scene-seasons', label: 'Seasons', path: '/seasons' },
  { key: 'scene-settings', label: 'Settings', path: '/settings' },
]

function getActivePath(pathname: string, links: NavLinkItem[]): string | undefined {
  if (pathname === '/' || pathname === '/chat' || pathname.startsWith('/chat/')) return '/'
  return links.find((link) => pathname === link.path || pathname.startsWith(`${link.path}/`))?.path
}

export function AppLayout({ children, onThemeClick, showAgentChatWidget = true }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const { data: themes } = useThemes()
  const { data: activeSeason } = useActiveSeason()
  const activeServicePath = getActivePath(location.pathname, SERVICE_LINKS)
  const activeScenePath = getActivePath(location.pathname, SCENE_LINKS)

  const activeThemePath = useMemo(() => {
    const match = location.pathname.match(/^\/theme\/([^/]+)/)
    return match ? match[1] : undefined
  }, [location.pathname])

  const seasonBadge = useMemo(() => {
    if (!activeSeason) return null

    const startDate = new Date(activeSeason.startDate)
    const now = new Date()
    const elapsedDays = Math.max(
      0,
      Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    )
    const durationWeeks = Math.max(activeSeason.durationWeeks || 1, 1)
    const week = Math.min(durationWeeks, Math.floor(elapsedDays / 7) + 1)
    const progress = Math.round((week / durationWeeks) * 100)

    return {
      name: activeSeason.name,
      week,
      durationWeeks,
      progress: Math.max(0, Math.min(progress, 100)),
    }
  }, [activeSeason])

  return (
    <div className="kaizen-layout">
      <MobileNav />
      <header className="kaizen-card-nav-shell">
        <div className="kaizen-card-nav-brand">
          <span className="kaizen-card-nav-logo">K</span>
          <div className="kaizen-card-nav-brand-copy">
            <h1>Kaizen OS</h1>
            <p>Chat-first command center</p>
          </div>
          {seasonBadge && (
            <div className="kaizen-season-pill" title={seasonBadge.name}>
              <span className="kaizen-season-pill-name">{seasonBadge.name}</span>
              <span className="kaizen-season-pill-meta">
                Week {seasonBadge.week}/{seasonBadge.durationWeeks}
              </span>
              <div className="kaizen-season-pill-bar">
                <span style={{ width: `${seasonBadge.progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="kaizen-card-nav-grid">
          <Card className="kaizen-nav-card">
            <Card.Header>Services</Card.Header>
            <Card.Body>
              <Nav className="kaizen-nav-list" variant="pills" activeKey={activeServicePath}>
                {SERVICE_LINKS.map((link) => (
                  <Nav.Item key={link.key}>
                    <Nav.Link eventKey={link.path} onClick={() => navigate(link.path)}>
                      {link.label}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </Card.Body>
          </Card>

          <Card className="kaizen-nav-card">
            <Card.Header>Themes</Card.Header>
            <Card.Body>
              {themes && themes.length > 0 ? (
                <Nav className="kaizen-nav-list" variant="pills" activeKey={activeThemePath}>
                  {themes.map((theme) => (
                    <Nav.Item key={theme.id}>
                      <Nav.Link
                        eventKey={theme.id}
                        onClick={() => {
                          if (onThemeClick) {
                            onThemeClick(theme.id)
                            return
                          }
                          navigate(`/theme/${theme.id}`)
                        }}
                      >
                        {theme.title}
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
              ) : (
                <p className="kaizen-nav-empty">No themes yet</p>
              )}
            </Card.Body>
          </Card>

          <Card className="kaizen-nav-card">
            <Card.Header>Scenes</Card.Header>
            <Card.Body>
              <Nav className="kaizen-nav-list" variant="pills" activeKey={activeScenePath}>
                {SCENE_LINKS.map((link) => (
                  <Nav.Item key={link.key}>
                    <Nav.Link eventKey={link.path} onClick={() => navigate(link.path)}>
                      {link.label}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </Card.Body>
          </Card>
        </div>
      </header>

      <main className="kaizen-main">
        {children}
      </main>

      {showAgentChatWidget && (
        <AgentChat
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '1.25rem',
            right: 'auto',
            zIndex: 50,
          }}
        />
      )}
    </div>
  )
}
