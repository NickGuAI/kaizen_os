import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useSeason } from '../hooks/useSeasons'
import { useActiveActions } from '../hooks/useCards'
import { api, Card } from '../lib/api'
import { getSeasonReviewAvailability, MID_SEASON_REVIEW_UNLOCK_PERCENT } from '../utils/seasonReviewUtils'

type GradingType = 'mid_season' | 'end_season'
type CriterionGrade = { criterion: string; passed: boolean | null }

interface ActionGrading {
  cardId: string
  results: CriterionGrade[]
  notes: string
  submitted: boolean
  markComplete: boolean // Mark action as completed when submitting
}

export default function SeasonGradingPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const seasonId = id || ''
  
  const requestedGradingType = (searchParams.get('type') as GradingType) || 'mid_season'
  const { data: season } = useSeason(seasonId)
  const { data: actions } = useActiveActions()
  const seasonReviewAvailability = season ? getSeasonReviewAvailability(season) : null
  const activeGradingType = seasonReviewAvailability?.availableType

  // Filter actions that have criteria
  const gradableActions = useMemo(() => {
    return (actions || []).filter(a => a.criteria && a.criteria.length > 0)
  }, [actions])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [gradings, setGradings] = useState<Record<string, ActionGrading>>({})
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const currentAction = gradableActions[currentIndex]

  // Initialize grading for current action if not exists
  const initGrading = (action: Card): ActionGrading => ({
    cardId: action.id,
    results: action.criteria.map(c => ({ criterion: c, passed: null })),
    notes: '',
    submitted: false,
    markComplete: false,
  })

  const getOrInitGrading = (action: Card): ActionGrading => {
    if (gradings[action.id]) return gradings[action.id]
    const newGrading = initGrading(action)
    setGradings(prev => ({ ...prev, [action.id]: newGrading }))
    return newGrading
  }

  const handleGradeCriterion = (criterionIndex: number, passed: boolean) => {
    if (!currentAction) return
    const grading = getOrInitGrading(currentAction)
    const newResults = [...grading.results]
    newResults[criterionIndex] = { ...newResults[criterionIndex], passed }
    setGradings(prev => ({
      ...prev,
      [currentAction.id]: { ...grading, results: newResults }
    }))
  }

  const handleNotesChange = (notes: string) => {
    if (!currentAction) return
    const grading = getOrInitGrading(currentAction)
    setGradings(prev => ({
      ...prev,
      [currentAction.id]: { ...grading, notes }
    }))
  }

  const handleMarkCompleteToggle = (markComplete: boolean) => {
    if (!currentAction) return
    const grading = getOrInitGrading(currentAction)
    setGradings(prev => ({
      ...prev,
      [currentAction.id]: { ...grading, markComplete }
    }))
  }

  const isAllGraded = (grading: ActionGrading | null): boolean => {
    if (!grading) return false
    return grading.results.every(r => r.passed !== null)
  }

  const getOverallPassed = (grading: ActionGrading | null): boolean | null => {
    if (!grading || !isAllGraded(grading)) return null
    return grading.results.every(r => r.passed === true)
  }

  const handleNext = () => {
    if (!currentAction) return
    const grading = getOrInitGrading(currentAction)

    // Mark as reviewed locally (actual submission happens in batch on finish)
    if (isAllGraded(grading) && !grading.submitted) {
      setGradings(prev => ({
        ...prev,
        [currentAction.id]: { ...grading, submitted: true }
      }))
    }

    if (currentIndex < gradableActions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setShowCompletionModal(true)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async () => {
    if (!activeGradingType) return
    setSubmitting(true)
    try {
      // Collect all submitted gradings for batch submit
      const gradingsToSubmit = Object.values(gradings).filter(g => g.submitted)

      if (gradingsToSubmit.length > 0) {
        await api.submitSeasonGrading(seasonId, activeGradingType, gradingsToSubmit.map(g => ({
          cardId: g.cardId,
          results: g.results.map(r => ({ criterion: r.criterion, passed: r.passed! })),
          notes: g.notes || undefined,
          markComplete: g.markComplete,
        })))
      }

      navigate(`/seasons/${seasonId}`)
    } catch (error) {
      console.error('Failed to submit grading:', error)
      alert('Failed to submit grading. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate summary stats
  const submittedCount = Object.values(gradings).filter(g => g.submitted).length
  const passedCount = Object.values(gradings).filter(g => g.submitted && getOverallPassed(g)).length
  const failedCount = submittedCount - passedCount
  const markCompleteCount = Object.values(gradings).filter(g => g.submitted && g.markComplete).length

  if (!season) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F1EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#999' }}>Loading...</div>
      </div>
    )
  }

  if (!activeGradingType) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F1EB', padding: 32 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <button onClick={() => navigate(`/seasons/${seasonId}`)} className="back-button" style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'white',
            border: '1px solid rgba(139, 148, 103, 0.2)', borderRadius: 12,
            padding: '8px 16px', color: '#666', fontSize: 14, cursor: 'pointer', marginBottom: 24
          }}>
            <span>←</span> Back to Season
          </button>
          <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center' }}>
            <h2 style={{ marginTop: 0, marginBottom: 12, color: '#1A1A1A' }}>Season Review Locked</h2>
            <p style={{ color: '#666', marginBottom: 8 }}>
              Mid-Season Review unlocks at {MID_SEASON_REVIEW_UNLOCK_PERCENT}% season progress.
            </p>
            <p style={{ color: '#666', marginBottom: 24 }}>
              {seasonReviewAvailability?.remainingUnlockPercent ?? MID_SEASON_REVIEW_UNLOCK_PERCENT}% remaining.
            </p>
            <div style={{
              height: 8,
              maxWidth: 360,
              margin: '0 auto',
              background: 'rgba(139, 148, 103, 0.12)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${seasonReviewAvailability?.unlockProgressPercent ?? 0}%`,
                background: 'linear-gradient(90deg, #8B9467 0%, #9FAA7A 100%)',
              }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (gradableActions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F1EB', padding: 32 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <button onClick={() => navigate(-1)} className="back-button" style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'white',
            border: '1px solid rgba(139, 148, 103, 0.2)', borderRadius: 12,
            padding: '8px 16px', color: '#666', fontSize: 14, cursor: 'pointer', marginBottom: 24
          }}>
            <span>←</span> Back to Season
          </button>
          <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center' }}>
            <p style={{ color: '#666' }}>No actions with criteria to grade.</p>
          </div>
        </div>
      </div>
    )
  }

  const grading = currentAction ? getOrInitGrading(currentAction) : null
  const overallPassed = getOverallPassed(grading)
  const progressPercent = Math.round(((currentIndex + (grading?.submitted ? 1 : 0)) / gradableActions.length) * 100)
  const isRequestedTypeMismatched = requestedGradingType !== activeGradingType

  const typeIcons: Record<string, string> = {
    ACTION_GATE: '🚪',
    ACTION_EXPERIMENT: '🧪',
    ACTION_ROUTINE: '🔄',
    ACTION_OPS: '⚙️',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EB', padding: 32 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => navigate(-1)} style={{
              display: 'flex', alignItems: 'center', gap: 8, background: 'white',
              border: '1px solid rgba(139, 148, 103, 0.2)', borderRadius: 12,
              padding: '8px 16px', color: '#666', fontSize: 14, cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <span>←</span> Back to Season
            </button>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>Season Grading</h1>
          </div>
          <span style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: activeGradingType === 'mid_season' ? 'rgba(243, 156, 18, 0.15)' : 'rgba(139, 148, 103, 0.15)',
            color: activeGradingType === 'mid_season' ? '#D68910' : '#8B9467'
          }}>
            {activeGradingType === 'mid_season' ? 'Mid-Season Review' : 'End-Season Review'}
          </span>
        </div>

        {isRequestedTypeMismatched && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(139, 148, 103, 0.2)',
            background: 'rgba(139, 148, 103, 0.08)',
            color: '#666',
            fontSize: 13,
          }}>
            Review type was adjusted to match your current season timing.
          </div>
        )}

        {/* Progress */}
        <div style={{
          background: 'white', borderRadius: 16, border: '1px solid rgba(139, 148, 103, 0.15)',
          padding: '20px 24px', marginBottom: 24, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>Grading Progress</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
              {submittedCount} of {gradableActions.length} actions graded
            </span>
          </div>
          <div style={{ width: '100%', height: 8, background: 'rgba(139, 148, 103, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #8B9467 0%, #9FAA7A 100%)',
              borderRadius: 4, transition: 'width 0.3s ease', width: `${progressPercent}%`
            }} />
          </div>
        </div>

        {/* Queue Navigation */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
          {gradableActions.map((action, i) => {
            const g = gradings[action.id]
            const isGraded = g?.submitted
            const isPassed = isGraded && getOverallPassed(g)
            return (
              <div
                key={action.id}
                onClick={() => setCurrentIndex(i)}
                style={{
                  flexShrink: 0, width: 48, height: 48, borderRadius: 12,
                  border: `2px solid ${i === currentIndex ? '#8B9467' : isGraded ? (isPassed ? '#27AE60' : '#E74C3C') : 'rgba(139, 148, 103, 0.2)'}`,
                  background: i === currentIndex ? 'rgba(139, 148, 103, 0.1)' : isGraded ? (isPassed ? 'rgba(39, 174, 96, 0.1)' : 'rgba(231, 76, 60, 0.1)') : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600,
                  color: i === currentIndex ? '#8B9467' : isGraded ? (isPassed ? '#27AE60' : '#E74C3C') : '#666',
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
              >
                {isGraded ? (isPassed ? '✓' : '✗') : i + 1}
              </div>
            )
          })}
        </div>

        {/* Main Grading Card */}
        {currentAction && grading && (
          <div style={{
            background: 'white', borderRadius: 20, border: '2px solid rgba(139, 148, 103, 0.15)',
            padding: 32, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', marginBottom: 24
          }}>
            {/* Card Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(139, 148, 103, 0.1)'
            }}>
              <div style={{ flex: 1 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                  borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginBottom: 12,
                  background: currentAction.unitType === 'ACTION_EXPERIMENT' ? 'rgba(229, 115, 115, 0.12)' : 'rgba(139, 148, 190, 0.12)',
                  color: currentAction.unitType === 'ACTION_EXPERIMENT' ? '#C53030' : '#4A5568'
                }}>
                  {typeIcons[currentAction.unitType] || '📋'} {currentAction.unitType.replace('ACTION_', '')}
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>{currentAction.title}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {currentAction.targetDate && (
                  <div style={{ fontSize: 13, color: '#666' }}>
                    Target: <strong style={{ color: '#1A1A1A' }}>
                      {new Date(currentAction.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Experiment Lag Notice */}
            {currentAction.unitType === 'ACTION_EXPERIMENT' && currentAction.lagWeeks && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
                background: 'rgba(243, 156, 18, 0.1)', border: '1px solid rgba(243, 156, 18, 0.3)',
                borderRadius: 12, marginBottom: 24
              }}>
                <span style={{ fontSize: 20 }}>⏳</span>
                <span style={{ fontSize: 13, color: '#D68910' }}>
                  <strong>Experiment Lag:</strong> {currentAction.lagWeeks} weeks observation period before final grading
                </span>
              </div>
            )}

            {/* Criteria Section */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                fontSize: 14, fontWeight: 600, color: '#666', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 16
              }}>Criteria</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grading.results.map((result, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                    background: '#F5F1EB', borderRadius: 12, border: '1px solid rgba(139, 148, 103, 0.1)',
                    transition: 'all 0.2s ease'
                  }}>
                    <span style={{ flex: 1, fontSize: 15, color: '#2C2C2C' }}>{result.criterion}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleGradeCriterion(i, true)}
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          border: `2px solid ${result.passed === true ? '#27AE60' : 'rgba(39, 174, 96, 0.3)'}`,
                          background: result.passed === true ? 'rgba(39, 174, 96, 0.15)' : 'white',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, transition: 'all 0.2s ease'
                        }}
                        title="Pass"
                      >✓</button>
                      <button
                        onClick={() => handleGradeCriterion(i, false)}
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          border: `2px solid ${result.passed === false ? '#E74C3C' : 'rgba(231, 76, 60, 0.3)'}`,
                          background: result.passed === false ? 'rgba(231, 76, 60, 0.15)' : 'white',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, transition: 'all 0.2s ease'
                        }}
                        title="Fail"
                      >✗</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes Section */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                fontSize: 14, fontWeight: 600, color: '#666', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 16
              }}>Grading Notes</h3>
              <textarea
                value={grading.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add notes about this action's progress, blockers, or learnings..."
                style={{
                  width: '100%', minHeight: 100, padding: 16,
                  border: '2px solid rgba(139, 148, 103, 0.2)', borderRadius: 12,
                  fontFamily: 'inherit', fontSize: 14, color: '#2C2C2C',
                  background: 'white', resize: 'vertical', transition: 'all 0.2s ease'
                }}
              />
            </div>

            {/* Overall Grade */}
            <div style={{
              background: 'rgba(139, 148, 103, 0.05)', borderRadius: 16, padding: 24, marginBottom: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>Overall Grade</span>
                <span style={{
                  fontSize: 24, fontWeight: 700, padding: '8px 20px', borderRadius: 12,
                  background: overallPassed === null ? 'rgba(139, 148, 103, 0.1)' : overallPassed ? 'rgba(39, 174, 96, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                  color: overallPassed === null ? '#666' : overallPassed ? '#27AE60' : '#E74C3C'
                }}>
                  {overallPassed === null ? 'Pending' : overallPassed ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#666' }}>
                {isAllGraded(grading) ? (
                  <><strong>{grading.results.filter(r => r.passed).length} of {grading.results.length}</strong> criteria passed.</>
                ) : (
                  <>Grade all criteria to determine the overall result. <strong>All criteria must pass</strong> for the action to pass.</>
                )}
              </p>
            </div>

            {/* Mark as Complete Toggle */}
            {(currentAction.unitType === 'ACTION_GATE' || currentAction.unitType === 'ACTION_EXPERIMENT') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
                background: grading.markComplete ? 'rgba(39, 174, 96, 0.1)' : '#F5F1EB',
                border: `2px solid ${grading.markComplete ? '#27AE60' : 'rgba(139, 148, 103, 0.2)'}`,
                borderRadius: 12, marginBottom: 24, cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
                onClick={() => handleMarkCompleteToggle(!grading.markComplete)}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  border: `2px solid ${grading.markComplete ? '#27AE60' : 'rgba(139, 148, 103, 0.4)'}`,
                  background: grading.markComplete ? '#27AE60' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}>
                  {grading.markComplete && <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Mark as Complete</span>
                  <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    Complete this {currentAction.unitType === 'ACTION_GATE' ? 'gate' : 'experiment'} when grading is submitted
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                style={{
                  padding: '14px 28px', borderRadius: 12, border: '1px solid rgba(139, 148, 103, 0.2)',
                  background: 'white', fontSize: 14, fontWeight: 600, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  color: '#666', display: 'flex', alignItems: 'center', gap: 8,
                  opacity: currentIndex === 0 ? 0.5 : 1, transition: 'all 0.2s ease'
                }}
              >
                <span>←</span> Previous
              </button>
              <button
                onClick={handleNext}
                disabled={!isAllGraded(grading)}
                style={{
                  padding: '14px 28px', borderRadius: 12, border: 'none',
                  background: currentIndex === gradableActions.length - 1
                    ? 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)'
                    : 'linear-gradient(135deg, #8B9467 0%, #9FAA7A 100%)',
                  fontSize: 14, fontWeight: 600, cursor: isAllGraded(grading) ? 'pointer' : 'not-allowed',
                  color: 'white', display: 'flex', alignItems: 'center', gap: 8,
                  opacity: isAllGraded(grading) ? 1 : 0.5, transition: 'all 0.2s ease'
                }}
              >
                {currentIndex === gradableActions.length - 1 ? 'Complete' : 'Next'} <span>{currentIndex === gradableActions.length - 1 ? '✓' : '→'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', marginBottom: 16, textAlign: 'center' }}>
              🎉 Grading Complete!
            </h2>
            <div style={{ background: '#F5F1EB', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(139, 148, 103, 0.1)' }}>
                <span style={{ fontSize: 14, color: '#666' }}>Total Actions</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{gradableActions.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(139, 148, 103, 0.1)' }}>
                <span style={{ fontSize: 14, color: '#666' }}>Passed</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#27AE60' }}>{passedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(139, 148, 103, 0.1)' }}>
                <span style={{ fontSize: 14, color: '#666' }}>Failed</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#E74C3C' }}>{failedCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(139, 148, 103, 0.1)' }}>
                <span style={{ fontSize: 14, color: '#666' }}>Success Rate</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                  {submittedCount > 0 ? Math.round((passedCount / submittedCount) * 100) : 0}%
                </span>
              </div>
              {markCompleteCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: 14, color: '#666' }}>Marking Complete</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#8B9467' }}>{markCompleteCount}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowCompletionModal(false)}
                disabled={submitting}
                style={{
                  padding: '12px 24px', borderRadius: 12, border: '1px solid rgba(139, 148, 103, 0.2)',
                  background: 'white', fontSize: 14, fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer', color: '#666',
                  opacity: submitting ? 0.5 : 1
                }}
              >
                Review Again
              </button>
              <button
                onClick={handleFinish}
                disabled={submitting}
                style={{
                  padding: '12px 24px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)',
                  fontSize: 14, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer', color: 'white',
                  opacity: submitting ? 0.7 : 1
                }}
              >
                {submitting ? 'Saving...' : 'Finish & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
