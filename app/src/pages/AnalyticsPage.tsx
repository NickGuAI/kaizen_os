import { useNavigate } from 'react-router-dom'
import { useSeasonAnalytics } from '../hooks/useSeasons'
import { AppLayout } from '../components/layout'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const { data: analytics, isLoading } = useSeasonAnalytics()

  if (isLoading) {
    return (
      <AppLayout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-muted">Loading...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-6)', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 className="text-2xl font-semibold">Season Analytics</h1>
          <p className="text-sm text-muted" style={{ marginTop: 'var(--space-1)' }}>
            Completion rates and card distribution across seasons
          </p>
        </div>

        {!analytics || analytics.length === 0 ? (
          <div className="card-static" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <p className="text-lg font-medium">No season data yet</p>
            <p className="text-sm text-muted">Complete a season to see analytics.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
              <div className="card-static" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <div className="text-2xl font-bold">{analytics.length}</div>
                <div className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Total Seasons</div>
              </div>
              <div className="card-static" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-sage)' }}>
                  {analytics.reduce((s, a) => s + a.completed, 0)}
                </div>
                <div className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Cards Completed</div>
              </div>
              <div className="card-static" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-sage)' }}>
                  {analytics.length > 0
                    ? Math.round(analytics.reduce((s, a) => s + a.completionRate, 0) / analytics.length)
                    : 0}%
                </div>
                <div className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Avg Completion</div>
              </div>
            </div>

            {/* Per-Season Breakdown */}
            {analytics.map(season => (
              <div
                key={season.id}
                className="card"
                onClick={() => navigate(`/seasons/${season.id}`)}
                style={{ cursor: 'pointer', padding: 'var(--space-5)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <h3 className="font-semibold">{season.name}</h3>
                      {season.isActive && (
                        <span style={{
                          padding: '2px 8px', fontSize: 10, fontWeight: 600,
                          background: 'rgba(39, 174, 96, 0.1)', color: 'var(--color-success)',
                          borderRadius: 8, textTransform: 'uppercase',
                        }}>Active</span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {new Date(season.startDate).toLocaleDateString()} &bull; {season.durationWeeks} weeks &bull; {season.utilityRate}h/wk
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-xl font-bold" style={{
                      color: season.completionRate >= 70 ? 'var(--color-success)' : season.completionRate >= 40 ? 'var(--color-warning)' : 'var(--color-critical)',
                    }}>{season.completionRate}%</div>
                    <div className="text-xs text-muted">{season.completed}/{season.totalCards} cards</div>
                  </div>
                </div>

                {/* Completion bar */}
                <div style={{ height: 8, background: 'var(--color-sage-border-light)', borderRadius: 4, overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
                  <div style={{
                    height: '100%', width: `${season.completionRate}%`,
                    background: season.completionRate >= 70 ? 'var(--color-success)' : season.completionRate >= 40 ? 'var(--color-warning)' : 'var(--color-critical)',
                    borderRadius: 4, transition: 'width 0.3s',
                  }} />
                </div>

                {/* Type breakdown */}
                <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 12 }}>
                  <span style={{ color: '#E74C3C' }}>Gates: {season.byType.ACTION_GATE}</span>
                  <span style={{ color: '#9B59B6' }}>Experiments: {season.byType.ACTION_EXPERIMENT}</span>
                  <span style={{ color: '#1ABC9C' }}>Routines: {season.byType.ACTION_ROUTINE}</span>
                  <span style={{ color: '#F39C12' }}>Ops: {season.byType.ACTION_OPS}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
