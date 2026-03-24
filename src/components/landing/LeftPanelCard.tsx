import { useNavigate } from 'react-router-dom'
import { Card, Season } from '../../lib/api'
import { getSeasonReviewAvailability } from '../../utils/seasonReviewUtils'

interface LeftPanelCardProps {
  vetoes: Card[]
  season: Season | null
  themeCount?: number
  actionCount?: number
  onAddVeto?: () => void
  onEditVeto?: (veto: Card) => void
  onMidSeasonGrade?: () => void
  onEndSeasonGrade?: () => void
}

export function LeftPanelCard({
  vetoes,
  season,
  themeCount = 0,
  actionCount = 0,
  onAddVeto,
  onEditVeto,
  onMidSeasonGrade,
  onEndSeasonGrade
}: LeftPanelCardProps) {
  const navigate = useNavigate()

  // Season calculations
  const startDate = season ? new Date(season.startDate) : new Date()
  const endDate = new Date(startDate)
  if (season) endDate.setDate(endDate.getDate() + season.durationWeeks * 7)

  const now = new Date()
  const totalDays = season ? season.durationWeeks * 7 : 1
  const daysPassed = season ? Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) : 0
  const weeksPassed = Math.ceil(daysPassed / 7)
  const reviewAvailability = season ? getSeasonReviewAvailability(season, now) : null
  const progressPercent = reviewAvailability?.progressPercent ?? Math.min(100, Math.round((daysPassed / totalDays) * 100))
  const totalCapacity = season ? season.durationWeeks * season.utilityRate : 0

  // Determine if mid-season or end-season grading is available
  const isMidSeason = reviewAvailability?.availableType === 'mid_season'
  const isEndSeason = reviewAvailability?.availableType === 'end_season'

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="left-panel">
      <div className="panel-card">
        {/* Season Content - Always visible at top */}
        {season ? (
          <div className="season-content">
            <div className="season-header-row">
              <div>
                <div className="season-name-text">{season.name}</div>
                <div className="season-dates-text">
                  {formatDate(startDate)} - {formatDate(endDate)}
                </div>
              </div>
              <button
                className="edit-btn"
                onClick={() => navigate(`/seasons/${season.id}/edit`)}
              >
                Edit
              </button>
            </div>

            <div className="progress-section">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress-labels">
                <span>Week {weeksPassed} of {season.durationWeeks}</span>
                <span>{progressPercent}%</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-value">{totalCapacity}h</div>
                <div className="stat-label">Capacity</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">--</div>
                <div className="stat-label">Logged</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{themeCount}</div>
                <div className="stat-label">Themes</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">{actionCount}</div>
                <div className="stat-label">Actions</div>
              </div>
            </div>

            {/* Grading Buttons */}
            {(isMidSeason || isEndSeason) && (
              <div className="grading-buttons">
                {isMidSeason && (
                  <button
                    className="grading-btn mid-season available"
                    onClick={onMidSeasonGrade}
                    title="Grade mid-season criteria"
                  >
                    📊 Mid-Season Grade
                  </button>
                )}
                {isEndSeason && (
                  <button
                    className="grading-btn end-season available"
                    onClick={onEndSeasonGrade}
                    title="Grade end-of-season criteria"
                  >
                    🏆 End-Season Grade
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="no-season-content">
            <div className="no-season-icon">📅</div>
            <h3>No Active Season</h3>
            <p>Create a season to start tracking</p>
            <button
              className="create-season-btn"
              onClick={() => navigate('/seasons/new')}
            >
              + Create Season
            </button>
          </div>
        )}

        {/* Vetoes Section - Below Season */}
        <div className="vetoes-section">
          <div className="vetoes-header">
            <span className="vetoes-title">Season Vetoes</span>
            <span className="vetoes-count">{vetoes.length}</span>
          </div>
          <div className="vetoes-list">
            {vetoes.map((veto, index) => (
              <div
                key={veto.id}
                className="veto-item"
                onClick={() => onEditVeto?.(veto)}
                style={{ cursor: onEditVeto ? 'pointer' : 'default' }}
              >
                <span className="veto-number">{index + 1}</span>
                <span className="veto-text">{veto.title}</span>
              </div>
            ))}
            {vetoes.length === 0 && (
              <div className="veto-item empty">
                <span className="veto-text">No vetoes set</span>
              </div>
            )}
          </div>
          {onAddVeto && (
            <button className="add-veto-btn" onClick={onAddVeto}>
              + Add Veto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
