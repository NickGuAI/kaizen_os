// MainHeader component - Theme filters + Action buttons (Tag, Sync, Review, Plan)
import { useNavigate } from 'react-router-dom'
import type { CardWithActionCount } from '../../lib/api'
import { THEME_COLORS } from '../../utils/themeColors'
import './Layout.css'

interface MainHeaderProps {
  themes: CardWithActionCount[]
  activeThemeId: string | null
  onThemeClick: (themeId: string | null) => void
  // Mode controls
  planMode?: boolean
  tagMode?: boolean
  onPlanModeToggle?: (enabled: boolean) => void
  onTagModeToggle?: (enabled: boolean) => void
  onSync?: () => void
  syncing?: boolean
}

export function MainHeader({
  themes,
  activeThemeId,
  onThemeClick,
  planMode = false,
  tagMode = false,
  onPlanModeToggle,
  onTagModeToggle,
  onSync,
  syncing = false,
}: MainHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="main-header">
      {/* Theme Filters */}
      <div className="theme-filters">
        {themes.map((theme, index) => {
          const colorIndex = index % THEME_COLORS.length
          const isActive = activeThemeId === theme.id

          return (
            <button
              key={theme.id}
              className={`theme-filter-btn ${isActive ? 'active' : ''}`}
              onClick={() => onThemeClick(isActive ? null : theme.id)}
              style={{
                '--theme-color': THEME_COLORS[colorIndex].border,
              } as React.CSSProperties}
            >
              <span
                className="theme-filter-dot"
                style={{
                  background: isActive ? 'white' : THEME_COLORS[colorIndex].border,
                  opacity: activeThemeId && activeThemeId !== theme.id ? 0.3 : 1,
                }}
              />
              <span
                className="theme-filter-name"
                style={{
                  color: activeThemeId && activeThemeId !== theme.id ? '#CCC' : '#1A1A1A',
                }}
              >
                {theme.title}
              </span>
            </button>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="header-actions">
        {!planMode && !tagMode && (
          <>
            <button
              className="header-action-btn tag"
              onClick={() => onTagModeToggle?.(true)}
            >
              🏷️ Tag
            </button>
            {onSync && (
              <button
                className="header-action-btn sync"
                onClick={onSync}
                disabled={syncing}
              >
                {syncing ? '⏳' : '🔄'} {syncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
            <button
              className="header-action-btn review"
              onClick={() => navigate('/review')}
            >
              📊 Review
            </button>
            <button
              className="header-action-btn plan"
              onClick={() => onPlanModeToggle?.(true)}
            >
              📋 Plan
            </button>
          </>
        )}
        {planMode && (
          <button
            className="header-action-btn exit"
            onClick={() => onPlanModeToggle?.(false)}
          >
            ✕ Exit Plan
          </button>
        )}
        {tagMode && (
          <button
            className="header-action-btn exit"
            onClick={() => onTagModeToggle?.(false)}
          >
            ✕ Exit Tag
          </button>
        )}
      </div>
    </header>
  )
}
