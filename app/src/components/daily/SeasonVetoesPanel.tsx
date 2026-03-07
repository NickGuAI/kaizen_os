import type { SeasonVeto } from '../../lib/api'

interface SeasonVetoesPanelProps {
  vetoes: SeasonVeto[]
  loading?: boolean
}

export function SeasonVetoesPanel({ vetoes, loading = false }: SeasonVetoesPanelProps) {
  return (
    <div className="daily-plan-section season-vetoes-panel">
      <div className="daily-plan-section-header">
        <span className="daily-plan-section-title">Season Vetoes</span>
      </div>

      {loading && <div className="loading-state">Loading...</div>}

      {!loading && vetoes.length === 0 && (
        <div className="season-veto-empty">No active-season vetoes</div>
      )}

      {!loading && vetoes.map((veto) => (
        <div key={veto.id} className="season-veto-item">
          <div className="season-veto-dot" />
          <div className="season-veto-content">
            <div className="season-veto-title">{veto.title}</div>
            {veto.description && (
              <div className="season-veto-description">{veto.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
