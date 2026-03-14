// Seasons Page — All seasons as big cards with progress
import { useNavigate } from 'react-router-dom'
import { useSeasons } from '../hooks/useSeasons'
import { Button } from '../components/ui'
import { AppLayout } from '../components/layout'

export default function SeasonsPage() {
  const navigate = useNavigate()
  const { data: seasons, isLoading } = useSeasons()

  const getSeasonProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const now = Date.now()
    const total = end - start
    const elapsed = now - start
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }

  const getWeekProgress = (startDate: string, durationWeeks: number) => {
    const start = new Date(startDate).getTime()
    const now = Date.now()
    const weeksPassed = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000))
    return Math.max(0, Math.min(weeksPassed + 1, durationWeeks))
  }

  const getStatus = (isActive: boolean, endDate: string) => {
    if (isActive) return { label: 'Active', bg: 'rgba(39, 174, 96, 0.1)', color: 'var(--color-success)' }
    if (new Date(endDate) < new Date()) return { label: 'Completed', bg: 'var(--color-sage-light)', color: 'var(--color-text-secondary)' }
    return { label: 'Inactive', bg: 'rgba(243, 156, 18, 0.1)', color: 'var(--color-warning)' }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </AppLayout>
    )
  }

  // Sort: active first, then by start date descending
  const sorted = [...(seasons || [])].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  })

  return (
    <AppLayout>
      <div style={{ padding: 'var(--space-6)', maxWidth: '900px', margin: '0 auto', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h1 className="text-2xl font-semibold">Seasons</h1>
          <Button variant="primary" onClick={() => navigate('/seasons/new')}>
            + New Season
          </Button>
        </div>

        {sorted.length === 0 ? (
          <div className="card-static" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <p className="text-lg font-medium" style={{ marginBottom: 'var(--space-2)' }}>No seasons yet</p>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-5)' }}>
              Create your first season to start planning and tracking progress.
            </p>
            <Button variant="primary" onClick={() => navigate('/seasons/new')}>
              Create Season
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {sorted.map(season => {
              const progress = getSeasonProgress(season.startDate, season.endDate)
              const week = getWeekProgress(season.startDate, season.durationWeeks)
              const status = getStatus(season.isActive, season.endDate)
              const totalBudget = season.durationWeeks * season.utilityRate
              const allocatedThemes = Object.keys(season.themeAllocations || {}).length
              const totalAllocation = Object.values(season.themeAllocations || {}).reduce((s, v) => s + v, 0)

              return (
                <div
                  key={season.id}
                  className="card"
                  onClick={() => navigate(`/seasons/${season.id}`)}
                  style={{ cursor: 'pointer', padding: 0, overflow: 'hidden' }}
                >
                  {/* Header */}
                  <div style={{
                    padding: 'var(--space-5) var(--space-6)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                        <h2 className="text-lg font-semibold">{season.name}</h2>
                        <span style={{
                          padding: '3px 10px', fontSize: 11, fontWeight: 600,
                          background: status.bg, color: status.color,
                          borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted">
                        {new Date(season.startDate).toLocaleDateString()} — {new Date(season.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-2xl font-bold" style={{ color: 'var(--color-sage)' }}>{progress}%</div>
                      <div className="text-xs text-muted">Week {week} of {season.durationWeeks}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ padding: '0 var(--space-6)' }}>
                    <div style={{ height: 8, background: 'var(--color-sage-border-light)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${progress}%`,
                        background: season.isActive
                          ? 'linear-gradient(90deg, var(--color-sage), #7a8359)'
                          : 'var(--color-text-muted)',
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div style={{
                    padding: 'var(--space-4) var(--space-6) var(--space-5)',
                    display: 'flex', gap: 'var(--space-6)',
                    marginTop: 'var(--space-3)',
                  }}>
                    <div>
                      <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        Utility Rate
                      </div>
                      <div className="text-sm font-semibold">{season.utilityRate}h / week</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        Total Budget
                      </div>
                      <div className="text-sm font-semibold">{totalBudget}h</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        Themes
                      </div>
                      <div className="text-sm font-semibold">{allocatedThemes} allocated</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        Allocation
                      </div>
                      <div className="text-sm font-semibold" style={{
                        color: totalAllocation === 1 ? 'var(--color-success)' : totalAllocation > 1 ? 'var(--color-critical)' : 'var(--color-warning)',
                      }}>
                        {Math.round(totalAllocation * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
