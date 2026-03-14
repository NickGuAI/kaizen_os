import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSeason, useSeasons, useUpdateSeason, useCreateSeason, useActivateSeason, useDeactivateSeason, useSeasonGradings } from '../hooks/useSeasons'
import { useThemes } from '../hooks/useCards'
import { Button, Card, Input } from '../components/ui'
import { AppLayout } from '../components/layout'
import { getTodayLocalDate, formatDateForInput } from '../utils/dateUtils'
import { getSeasonReviewAvailability, MID_SEASON_REVIEW_UNLOCK_PERCENT } from '../utils/seasonReviewUtils'
import type { SeasonGrading } from '../lib/api'

const HOURS_PER_WEEK = 168
const SLEEP_HOURS = 49 // 7h/day
const ADMIN_HOURS = 14 // 2h/day
const FIXED_HOURS = SLEEP_HOURS + ADMIN_HOURS
const HIGH_LOAD_THRESHOLD = 105

export default function SeasonView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isCreateMode = id === 'new'
  const seasonId = isCreateMode ? '' : (id ?? '')

  const { data: season, isLoading: seasonLoading } = useSeason(seasonId)
  const { data: seasons } = useSeasons()
  const { data: themes } = useThemes()
  const { data: gradingsData } = useSeasonGradings(seasonId)
  const updateSeason = useUpdateSeason()
  const createSeason = useCreateSeason()
  const activateSeason = useActivateSeason()
  const deactivateSeason = useDeactivateSeason()

  // Expanded grading state
  const [expandedGradings, setExpandedGradings] = useState<Set<string>>(new Set())

  // Local form state
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [durationWeeks, setDurationWeeks] = useState(12)
  const [utilityRate, setUtilityRate] = useState(40)
  const [allocations, setAllocations] = useState<Record<string, number>>({})

  // Sync from server or set defaults for create mode
  useEffect(() => {
    if (isCreateMode) {
      setName('')
      setStartDate(getTodayLocalDate())
      setDurationWeeks(12)
      setUtilityRate(40)
      setAllocations({})
    } else if (season) {
      setName(season.name)
      setStartDate(formatDateForInput(season.startDate))
      setDurationWeeks(season.durationWeeks)
      setUtilityRate(season.utilityRate)
      setAllocations(season.themeAllocations || {})
    }
  }, [season, isCreateMode])

  // Use stored isActive from database (not computed from dates)
  const isActive = isCreateMode ? false : (season?.isActive ?? false)

  // Computed values
  const totalBudget = durationWeeks * utilityRate
  const bufferHours = Math.max(0, HOURS_PER_WEEK - FIXED_HOURS - utilityRate)
  const isHighLoad = utilityRate > HIGH_LOAD_THRESHOLD
  const allocationTotal = Object.values(allocations).reduce((sum, v) => sum + v, 0)

  // Historical seasons (exclude current)
  const historicalSeasons = useMemo(() => {
    return seasons?.filter(s => s.id !== seasonId) || []
  }, [seasons, seasonId])

  const handleAllocationChange = (themeId: string, value: number) => {
    setAllocations(prev => ({
      ...prev,
      [String(themeId)]: Math.max(0, Math.min(100, value)) / 100,
    }))
  }

  const handleSave = async () => {
    try {
      if (isCreateMode) {
        const newSeason = await createSeason.mutateAsync({
          name,
          startDate,
          durationWeeks,
          utilityRate: Math.min(utilityRate, HOURS_PER_WEEK),
        })
        navigate(`/seasons/${newSeason.id}`)
      } else {
        await updateSeason.mutateAsync({
          id: seasonId!,
          data: {
            name,
            startDate,
            durationWeeks,
            utilityRate: Math.min(utilityRate, HOURS_PER_WEEK),
            themeAllocations: allocations,
          },
        })
        alert('Season saved successfully!')
      }
    } catch (error) {
      console.error('Failed to save season:', error)
      alert('Failed to save season. Please try again.')
    }
  }

  const handleToggleActive = async () => {
    try {
      if (isActive) {
        await deactivateSeason.mutateAsync(seasonId!)
      } else {
        await activateSeason.mutateAsync(seasonId!)
      }
    } catch (error) {
      console.error('Failed to toggle season status:', error)
      alert('Failed to update season status. Please try again.')
    }
  }

  if (seasonLoading && !isCreateMode) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          Loading...
        </div>
      </AppLayout>
    )
  }

  const weekProgress = season ? (() => {
    const start = new Date(season.startDate)
    const now = new Date()
    const weeksPassed = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    return Math.max(1, Math.min(weeksPassed + 1, season.durationWeeks))
  })() : 1
  const seasonReviewAvailability = season ? getSeasonReviewAvailability(season) : null

  return (
    <AppLayout>
      <div style={{ padding: '16px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontSize: '14px',
            }}
          >
            {'← Back'}
          </button>
          <div>
            <h1 className="text-lg font-semibold">
              {isCreateMode ? 'New Season' : (season?.name || 'Season')}
            </h1>
            {!isCreateMode && (
              <p className="text-sm text-secondary">
                {startDate && `${new Date(startDate).toLocaleDateString()}`} {'•'} Week {weekProgress} of {durationWeeks}
              </p>
            )}
          </div>
        </div>

      <main className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Season Configuration Card */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <Input
              label="Season Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ fontSize: '18px', fontWeight: 500 }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive ? 'rgba(39, 174, 96, 0.1)' : 'rgba(153, 153, 153, 0.1)',
                    color: isActive ? 'var(--color-success)' : 'var(--color-text-muted)',
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'inline-block',
                  }}>
                    {isCreateMode ? 'New Season' : isActive ? '● Active' : '○ Inactive'}
                  </div>
                  {!isCreateMode && (
                    <button
                      onClick={handleToggleActive}
                      disabled={activateSeason.isPending || deactivateSeason.isPending}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: isActive ? '1px solid var(--color-text-muted)' : '1px solid var(--color-success)',
                        background: isActive ? 'transparent' : 'var(--color-success)',
                        color: isActive ? 'var(--color-text-muted)' : 'white',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {activateSeason.isPending || deactivateSeason.isPending 
                        ? '...' 
                        : isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                  {isCreateMode 
                    ? 'Activate the season after creation to use it for planning'
                    : isActive 
                      ? 'This season is active and used for weekly planning' 
                      : 'Activate this season to use it for weekly planning'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-sage-border-light)' }}>
              <Input
                label="Duration (Weeks)"
                type="number"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <div>
                <Input
                  label="Utility Rate (Hours/Week)"
                  type="number"
                  value={utilityRate}
                  onChange={(e) => setUtilityRate(Math.min(HOURS_PER_WEEK, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  style={isHighLoad ? { borderColor: 'var(--color-critical)', color: 'var(--color-critical)' } : {}}
                />
                {isHighLoad && (
                  <p className="text-xs" style={{ color: 'var(--color-critical)', marginTop: 4 }}>
                    ⚠️ Warning: High cognitive load
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Total Budget</label>
                <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--color-sage)', fontFamily: 'monospace' }}>
                  {totalBudget}h
                </div>
              </div>
            </div>

            {/* Capacity Visualization */}
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span className="text-sm font-medium">Weekly Capacity Context ({HOURS_PER_WEEK}h)</span>
                <span className="text-sm text-secondary">Buffer: {bufferHours}h remaining</span>
              </div>
              <div style={{ height: 24, display: 'flex', borderRadius: 6, overflow: 'hidden', fontSize: 11, color: 'white', fontWeight: 600, lineHeight: '24px' }}>
                <div style={{ width: `${(SLEEP_HOURS / HOURS_PER_WEEK) * 100}%`, background: '#95A5A6', textAlign: 'center' }}>Sleep</div>
                <div style={{ width: `${(ADMIN_HOURS / HOURS_PER_WEEK) * 100}%`, background: '#BDC3C7', textAlign: 'center' }}>Admin</div>
                <div style={{ width: `${(Math.min(utilityRate, HOURS_PER_WEEK - FIXED_HOURS) / HOURS_PER_WEEK) * 100}%`, background: 'var(--color-sage)', textAlign: 'center', transition: 'width 0.3s' }}>
                  Focus: {utilityRate}h
                </div>
                <div style={{ width: `${(bufferHours / HOURS_PER_WEEK) * 100}%`, background: bufferHours < 20 ? 'var(--color-critical)' : '#D6DBDF', color: bufferHours < 20 ? 'white' : '#555', textAlign: 'center', transition: 'width 0.3s' }}>
                  Buffer
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                <span>• Sleep (7h/day)</span>
                <span>• Admin (2h/day)</span>
                <span>• Buffer: Remainder</span>
              </div>
            </div>

            {/* Create button for new seasons */}
            {isCreateMode && (
              <div style={{ marginTop: 'var(--space-5)', textAlign: 'right' }}>
                <Button variant="primary" onClick={handleSave}>
                  Create Season
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Theme Allocations Card - only show for existing seasons */}
        {!isCreateMode && (
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 className="font-semibold">Theme Allocations</h3>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 500,
              background: allocationTotal === 1 ? 'rgba(39, 174, 96, 0.1)' : allocationTotal > 1 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(243, 156, 18, 0.1)',
              color: allocationTotal === 1 ? 'var(--color-success)' : allocationTotal > 1 ? 'var(--color-critical)' : 'var(--color-warning)',
            }}>
              Total: {Math.round(allocationTotal * 100)}%
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {themes?.map(theme => {
              const allocation = (allocations[String(theme.id)] || 0) * 100
              const budgetHours = Math.round(totalBudget * (allocation / 100))
              return (
                <div key={theme.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  padding: 'var(--space-4) 0',
                  borderBottom: '1px solid var(--color-sage-border-light)',
                }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <div className="font-medium">{theme.title}</div>
                    <div className="text-xs text-secondary">{budgetHours}h budget</div>
                  </div>
                  <div style={{ flex: 2, padding: '0 var(--space-4)' }}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={allocation}
                      onChange={(e) => handleAllocationChange(theme.id, parseInt(e.target.value, 10))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(allocation)}
                      onChange={(e) => handleAllocationChange(theme.id, parseInt(e.target.value, 10) || 0)}
                      style={{
                        width: 60, padding: 8, border: '1px solid var(--color-sage-border-light)',
                        borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: 14,
                      }}
                    />
                    <span>%</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 'var(--space-5)', textAlign: 'right' }}>
            <Button variant="primary" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </Card>
        )}

        {/* Season Progress & Gradings - only show for existing seasons */}
        {!isCreateMode && (
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 className="font-semibold">Progress & Gradings</h3>
            <Button
              variant="primary"
              size="sm"
              disabled={!seasonReviewAvailability?.availableType}
              onClick={() => {
                if (seasonReviewAvailability?.availableType) {
                  navigate(`/seasons/${seasonId}/grading?type=${seasonReviewAvailability.availableType}`)
                }
              }}
            >
              {seasonReviewAvailability?.availableType === 'end_season'
                ? 'Start End-Season Review'
                : seasonReviewAvailability?.availableType === 'mid_season'
                  ? 'Start Mid-Season Review'
                  : `Unlocks at ${MID_SEASON_REVIEW_UNLOCK_PERCENT}%`}
            </Button>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span className="text-sm text-secondary">Season Progress</span>
              <span className="text-sm font-medium">Week {weekProgress} of {durationWeeks}</span>
            </div>
            <div style={{ height: 8, background: 'var(--color-sage-border-light)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(weekProgress / durationWeeks) * 100}%`,
                  background: 'var(--color-sage)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>

          {/* Grading Summary */}
          {gradingsData && gradingsData.summary.totalGradings > 0 ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-5)',
              }}>
                <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>{gradingsData.summary.totalGradings}</div>
                  <div className="text-xs text-secondary">Total Gradings</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'rgba(39, 174, 96, 0.1)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-success)' }}>{gradingsData.summary.passedCount}</div>
                  <div className="text-xs text-secondary">Passed</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'rgba(231, 76, 60, 0.1)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-critical)' }}>{gradingsData.summary.failedCount}</div>
                  <div className="text-xs text-secondary">Failed</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {gradingsData.summary.totalGradings > 0
                      ? Math.round((gradingsData.summary.passedCount / gradingsData.summary.totalGradings) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-secondary">Pass Rate</div>
                </div>
              </div>

              {/* Grading Type Breakdown */}
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                <span className="text-sm text-secondary">
                  Mid-Season Efforts: <span className="font-medium">{gradingsData.summary.midSeasonEffortCount}</span>
                </span>
                <span className="text-sm text-secondary">
                  End-Season Efforts: <span className="font-medium">{gradingsData.summary.endSeasonEffortCount}</span>
                </span>
              </div>

              {/* Grading History */}
              <div>
                <h4 className="text-sm font-medium" style={{ marginBottom: 'var(--space-3)' }}>Grading History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {(gradingsData.efforts || []).map((effort) => (
                    <div
                      key={effort.id}
                      style={{
                        padding: 'var(--space-3)',
                        background: 'var(--color-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-sage-border-light)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 'var(--space-2)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: effort.summary.failedCount === 0 ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                            color: effort.summary.failedCount === 0 ? 'var(--color-success)' : 'var(--color-critical)',
                            fontWeight: 600,
                            fontSize: 14,
                          }}>
                            {effort.summary.failedCount === 0 ? '✓' : '✗'}
                          </span>
                          <div>
                            <div className="font-medium">
                              {effort.gradingType === 'mid_season' ? 'Mid-Season Review' : 'End-Season Review'}
                            </div>
                            <div className="text-xs text-secondary">
                              {new Date(effort.occurredAt).toLocaleDateString()} • {effort.summary.totalGradings} gradings
                            </div>
                          </div>
                        </div>
                        <span className="text-secondary text-sm">
                          {effort.summary.passedCount} passed • {effort.summary.failedCount} failed
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {effort.gradings.map((grading: SeasonGrading) => (
                          <div
                            key={grading.id}
                            style={{
                              padding: 'var(--space-3)',
                              background: 'white',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-sage-border-light)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                              }}
                              onClick={() => {
                                const newExpanded = new Set(expandedGradings)
                                if (newExpanded.has(grading.id)) {
                                  newExpanded.delete(grading.id)
                                } else {
                                  newExpanded.add(grading.id)
                                }
                                setExpandedGradings(newExpanded)
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: grading.overallPassed ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                                  color: grading.overallPassed ? 'var(--color-success)' : 'var(--color-critical)',
                                  fontWeight: 600,
                                  fontSize: 12,
                                }}>
                                  {grading.overallPassed ? '✓' : '✗'}
                                </span>
                                <div className="text-sm">{grading.cardTitle}</div>
                              </div>
                              <span className="text-secondary" style={{ fontSize: 12 }}>
                                {expandedGradings.has(grading.id) ? '▼' : '▶'}
                              </span>
                            </div>

                            {expandedGradings.has(grading.id) && (
                              <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-sage-border-light)' }}>
                                <div className="text-sm" style={{ marginBottom: 'var(--space-2)' }}>Criteria:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                  {grading.results.map((result, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                      <span style={{
                                        color: result.passed ? 'var(--color-success)' : 'var(--color-critical)',
                                        fontSize: 12,
                                      }}>
                                        {result.passed ? '✓' : '✗'}
                                      </span>
                                      <span className="text-sm">{result.criterion}</span>
                                    </div>
                                  ))}
                                </div>
                                {grading.notes && (
                                  <div style={{ marginTop: 'var(--space-2)' }}>
                                    <div className="text-sm text-secondary">Notes:</div>
                                    <div className="text-sm" style={{ fontStyle: 'italic' }}>{grading.notes}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
              <p>No gradings yet</p>
              <p className="text-sm">Start a grading session to track your progress</p>
            </div>
          )}
        </Card>
        )}

        {/* Historical Seasons */}
        {historicalSeasons.length > 0 && (
          <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-sage-border-light)' }}>
            <h3 className="font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Historical Seasons</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {historicalSeasons.map(s => (
                <Card
                  key={s.id}
                  style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => navigate(`/seasons/${s.id}`)}
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-secondary">
                      {new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()}
                      {s.isActive ? ' • Active' : ' • Completed'}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">View</Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
      </div>
    </AppLayout>
  )
}
