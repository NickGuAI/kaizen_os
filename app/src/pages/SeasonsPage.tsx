// Seasons Page - Active bets, scoring panel, and analysis
import { useNavigate } from 'react-router-dom'
import { useThemes, useActiveActions, useGlobalVetoes } from '../hooks/useCards'
import type { Card } from '../lib/api'
import { useActiveSeason } from '../hooks/useSeasons'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { AppLayout } from '../components/layout'

interface ConditionData {
  conditionScore: number
  totalExposure?: number
  lastActivity?: string | null
}

export default function SeasonsPage() {
  const navigate = useNavigate()
  const { data: themes } = useThemes()
  const { data: season } = useActiveSeason()
  const { data: activeActions } = useActiveActions()
  const { data: vetos } = useGlobalVetoes()
  const [conditions, setConditions] = useState<Record<string, ConditionData>>({})
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadConditions = async () => {
      try {
        const data = await api.getAllConditions()
        setConditions(data)
      } catch (error) {
        console.error('Failed to load conditions:', error)
      }
    }
    loadConditions()
  }, [themes])

  const actionsByTheme = activeActions?.reduce((acc: Record<string, Card[]>, action: Card) => {
    const themeId = action.parentId
    if (themeId) {
      if (!acc[themeId]) acc[themeId] = []
      acc[themeId].push(action)
    }
    return acc
  }, {} as Record<string, Card[]>) ?? {}

  const toggleTheme = (themeId: string) => {
    setExpandedThemes(prev => {
      const next = new Set(prev)
      if (next.has(themeId)) next.delete(themeId)
      else next.add(themeId)
      return next
    })
  }

  const trippedVetos = vetos?.filter(v => v.status === 'completed') ?? []

  const seasonProgress = season ? (() => {
    const start = new Date(season.startDate)
    const end = new Date(season.endDate)
    const now = new Date()
    const total = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  })() : 0

  const getConditionColor = (score: number) => {
    if (score >= 70) return 'var(--color-success)'
    if (score >= 40) return 'var(--color-warning)'
    return 'var(--color-critical)'
  }

  const getStatusStyle = (status: string) => {
    if (status === 'in_progress') return { bg: 'rgba(39, 174, 96, 0.1)', color: 'var(--color-success)' }
    if (status === 'not_started') return { bg: 'rgba(243, 156, 18, 0.1)', color: 'var(--color-warning)' }
    return { bg: 'var(--color-sage-border-light)', color: 'var(--color-text-muted)' }
  }

  return (
    <AppLayout>
      <div style={{ padding: 'var(--space-6)', maxWidth: '1200px', margin: '0 auto', overflowY: 'auto', flex: 1 }}>
        <h1 className="text-2xl font-semibold" style={{ marginBottom: 'var(--space-6)' }}>Seasons</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
          {/* Left Column: Active Bets by Theme */}
          <div>
            <h2 className="text-base font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Active Actions by Theme</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {themes?.map(theme => {
                const themeActions = actionsByTheme[theme.id] ?? []
                const isExpanded = expandedThemes.has(theme.id)
                const condition = conditions[theme.id]?.conditionScore ?? 0

                return (
                  <div key={theme.id} className="card-static" style={{ overflow: 'hidden', padding: 0 }}>
                    <button
                      onClick={() => toggleTheme(theme.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 'var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span className="font-medium">{theme.title}</span>
                        <span className="badge badge-sage">{themeActions.length} actions</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: '60px', height: '6px', background: 'var(--color-sage-border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${condition}%`, background: getConditionColor(condition), transition: 'width 0.3s ease' }} />
                        </div>
                        <span className="text-sm text-secondary" style={{ width: '36px' }}>{condition}%</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </button>

                    {isExpanded && themeActions.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--color-sage-border-light)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {themeActions.map(action => {
                          const statusStyle = getStatusStyle(action.status)
                          return (
                            <div
                              key={action.id}
                              onClick={() => navigate(`/contract/${action.id}`)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                                background: 'var(--color-bg)', cursor: 'pointer',
                                transition: 'background 0.2s ease',
                              }}
                            >
                              <div>
                                <div className="font-medium" style={{ color: 'var(--color-text)' }}>{action.title}</div>
                                {action.description && (
                                  <div className="text-xs text-muted" style={{ marginTop: '2px' }}>{action.description}</div>
                                )}
                              </div>
                              <span style={{
                                padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                                background: statusStyle.bg, color: statusStyle.color,
                                borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em',
                              }}>{action.status.replace('_', ' ')}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {isExpanded && themeActions.length === 0 && (
                      <div style={{ borderTop: '1px solid var(--color-sage-border-light)', padding: 'var(--space-4)', textAlign: 'center' }}>
                        <span className="text-sm text-muted">No active actions for this theme</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Scoring & Analysis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Scoring Panel */}
            <div className="card-static">
              <h3 className="font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Condition Scores</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {themes?.map(theme => {
                  const condition = conditions[theme.id]?.conditionScore ?? 0
                  return (
                    <div key={theme.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span className="text-sm" style={{ width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.title}</span>
                      <div style={{ flex: 1, height: '8px', background: 'var(--color-sage-border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${condition}%`, background: getConditionColor(condition), transition: 'width 0.3s ease' }} />
                      </div>
                      <span className="text-sm font-medium" style={{ width: '36px', textAlign: 'right' }}>{condition}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Analysis Panel */}
            <div className="card-static">
              <h3 className="font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Analysis</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-sm text-secondary">Total Active Actions</span>
                  <span className="font-semibold" style={{ color: 'var(--color-sage)' }}>{activeActions?.length ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-sm text-secondary">Themes with Actions</span>
                  <span className="font-semibold" style={{ color: 'var(--color-sage)' }}>{Object.keys(actionsByTheme).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-sm text-secondary">Guardrails Active</span>
                  <span className="font-semibold" style={{ color: 'var(--color-success)' }}>{(vetos?.length ?? 0) - trippedVetos.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-sm text-secondary">Guardrails Tripped</span>
                  <span className="font-semibold" style={{ color: trippedVetos.length > 0 ? 'var(--color-critical)' : 'var(--color-text-muted)' }}>
                    {trippedVetos.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Season Progress */}
            {season && (
              <div className="card-static">
                <h3 className="font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Season Progress</h3>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-sage)' }}>{seasonProgress}%</div>
                  <div className="text-xs text-muted" style={{ marginTop: '2px' }}>{season.name}</div>
                </div>
                <div style={{ height: '8px', background: 'var(--color-sage-border-light)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${seasonProgress}%`, background: 'linear-gradient(90deg, var(--color-sage), #7a8359)', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                  <span className="text-xs text-muted">{new Date(season.startDate).toLocaleDateString()}</span>
                  <span className="text-xs text-muted">{new Date(season.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
