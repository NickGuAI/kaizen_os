// Sidebar — Season card at top, simple theme list below. No vetoes.
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Card, Season } from '../../lib/api'
import { getSeasonReviewAvailability } from '../../utils/seasonReviewUtils'
import './Layout.css'

interface ThemeWithActions {
  id: string
  title: string
  actions?: Card[]
}

interface SidebarProps {
  season: Season | null
  vetoes?: Card[] // kept for API compat, not displayed
  themes?: ThemeWithActions[]
  themeCount?: number
  actionCount?: number
  onEditVeto?: (veto: Card) => void
  onAddVeto?: () => void
  onThemeClick?: (id: string) => void
  onMidSeasonGrade?: () => void
  onEndSeasonGrade?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const MENU_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Where am I', path: '/where-am-i' },
  { label: 'Review', path: '/review' },
  { label: 'Settings', path: '/settings' },
]

// Theme card palette — muted earth tones
const THEME_CARD_PALETTE = ['#8B9467', '#6F8D9A', '#A67C52', '#8F6A8A', '#6E8B6B']

function getThemeCardColor(themeId: string) {
  let hash = 0
  for (let i = 0; i < themeId.length; i++) {
    hash = (hash * 31 + themeId.charCodeAt(i)) >>> 0
  }
  return THEME_CARD_PALETTE[hash % THEME_CARD_PALETTE.length]
}

const ACTION_BADGE_CONFIG = [
  { key: 'ACTION_GATE', label: 'Gate', color: '#E74C3C' },
  { key: 'ACTION_EXPERIMENT', label: 'Exp', color: '#9B59B6' },
  { key: 'ACTION_ROUTINE', label: 'Routine', color: '#1ABC9C' },
  { key: 'ACTION_OPS', label: 'Ops', color: '#F39C12' },
] as const

function ThemeActionWidgets({ actions }: { actions?: Card[] }) {
  if (!actions || actions.length === 0) return null

  const badges = ACTION_BADGE_CONFIG
    .map(cfg => ({ ...cfg, count: actions.filter(a => a.unitType === cfg.key).length }))
    .filter(b => b.count > 0)

  if (badges.length === 0) return null

  return (
    <div className="theme-card-action-widgets">
      {badges.map(b => (
        <span key={b.key} className="theme-card-action-badge">
          <span className="theme-card-action-dot" style={{ backgroundColor: b.color }} />
          {b.count} {b.label}
        </span>
      ))}
    </div>
  )
}

export function Sidebar({
  season,
  themes = [],
  themeCount = 0,
  actionCount = 0,
  onThemeClick,
  onMidSeasonGrade,
  onEndSeasonGrade,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Season calculations
  const startDate = season ? new Date(season.startDate) : new Date()
  const now = new Date()
  const daysPassed = season ? Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const weeksPassed = Math.ceil(daysPassed / 7)
  const reviewAvailability = season ? getSeasonReviewAvailability(season, now) : null
  const progressPercent = reviewAvailability?.progressPercent ?? 0
  const totalCapacity = season ? season.durationWeeks * season.utilityRate : 0
  const isMidSeason = reviewAvailability?.availableType === 'mid_season'
  const isEndSeason = reviewAvailability?.availableType === 'end_season'

  const handleMenuItemClick = (path: string) => {
    navigate(path)
    setMenuOpen(false)
  }

  return (
    <aside className={`kaizen-sidebar ${collapsed ? 'collapsed' : ''}`}>

      {/* Logo */}
      <div className="sidebar-logo" ref={menuRef}>
        <button className="sidebar-logo-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="sidebar-logo-icon">K</span>
          {!collapsed && (
            <>
              <span className="sidebar-logo-text">Kaizen OS</span>
              <span className={`sidebar-logo-burger ${menuOpen ? 'open' : ''}`}>☰</span>
            </>
          )}
        </button>
        {menuOpen && (
          <div className="sidebar-menu-dropdown">
            {MENU_ITEMS.map((item) => (
              <button key={item.path} className="sidebar-menu-item" onClick={() => handleMenuItemClick(item.path)}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : 'hide'}
        </button>
      )}

      {/* Season Card — top position */}
      {season ? (
        <div className="sidebar-season-card">
          <div className="season-card-header">
            <span className="season-card-label">{season.name.toUpperCase()}</span>
            <span className="season-card-year">{new Date(season.startDate).getFullYear()}</span>
          </div>

          <div className="season-card-stats">
            <div className="season-stat">
              <div className="season-stat-value">{totalCapacity}</div>
              <div className="season-stat-label">hours</div>
            </div>
            <div className="season-stat-divider" />
            <div className="season-stat">
              <div className="season-stat-value">{themeCount}</div>
              <div className="season-stat-label">themes</div>
            </div>
            <div className="season-stat-divider" />
            <div className="season-stat">
              <div className="season-stat-value">{actionCount}</div>
              <div className="season-stat-label">actions</div>
            </div>
          </div>

          <div className="season-card-progress">
            <div className="season-progress-header">
              <span className="season-progress-week">Week {weeksPassed} of {season.durationWeeks}</span>
              <span className="season-progress-percent">{progressPercent}%</span>
            </div>
            <div className="season-progress-bar">
              <div className="season-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Grading buttons — only show when available */}
          {(isMidSeason || isEndSeason) && (
            <div className="season-grading-section">
              {isMidSeason && onMidSeasonGrade && (
                <button className="season-grade-btn mid-season" onClick={onMidSeasonGrade}>
                  Mid-Season Grade
                </button>
              )}
              {isEndSeason && onEndSeasonGrade && (
                <button className="season-grade-btn end-season" onClick={onEndSeasonGrade}>
                  End-Season Grade
                </button>
              )}
            </div>
          )}

          <div className="season-action-btns">
            <button className="season-view-btn" onClick={() => navigate(`/seasons/${season.id}/view`)}>
              View
            </button>
            <button className="season-edit-btn" onClick={() => navigate(`/seasons/${season.id}/edit`)}>
              Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="sidebar-season-card empty">
          <div className="empty-season-icon">📅</div>
          <h3 className="empty-season-title">No Active Season</h3>
          <p className="empty-season-desc">Create a season to start tracking</p>
          <button className="create-season-btn" onClick={() => navigate('/seasons/new')}>
            + Create Season
          </button>
        </div>
      )}

      {/* Themes — simple list */}
      {themes.length > 0 && (
        <div className="sidebar-themes">
          <h2 className="sidebar-section-title">THEMES</h2>
          <div className="sidebar-themes-list">
            {themes.map((theme) => (
              <button
                key={theme.id}
                className="sidebar-theme-card"
                style={{ backgroundColor: getThemeCardColor(theme.id) }}
                onClick={() => onThemeClick?.(theme.id)}
              >
                <span className="sidebar-theme-card-title">{theme.title}</span>
                <ThemeActionWidgets actions={theme.actions} />
              </button>
            ))}
          </div>
        </div>
      )}

    </aside>
  )
}
