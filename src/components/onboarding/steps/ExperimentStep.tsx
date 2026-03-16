import { useState } from 'react'
import { Button, Input, Select, Textarea } from '../../ui'
import { Card } from '../../../lib/api'

interface Props {
  themes: Card[]
  defaultLagWeeks: number
  onCreateAction: (
    type: 'ACTION_EXPERIMENT',
    parentId: string,
    data: { title: string; criteria?: string[]; lagWeeks?: number }
  ) => Promise<Card | null>
  onNext: (entityIds: string[]) => void
  onSkip: () => void
}

export function ExperimentStep({
  themes,
  defaultLagWeeks,
  onCreateAction,
  onNext,
  onSkip,
}: Props) {
  const [selectedTheme, setSelectedTheme] = useState(themes[0]?.id || '')
  const [title, setTitle] = useState('')
  const [criteria, setCriteria] = useState('')
  const [lagWeeks, setLagWeeks] = useState(defaultLagWeeks.toString())
  const [createdExperiments, setCreatedExperiments] = useState<Card[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!title.trim() || !selectedTheme) return
    setIsCreating(true)
    setError(null)

    const criteriaList = criteria
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean)

    const card = await onCreateAction('ACTION_EXPERIMENT', selectedTheme, {
      title: title.trim(),
      criteria: criteriaList.length > 0 ? criteriaList : undefined,
      lagWeeks: parseInt(lagWeeks) || defaultLagWeeks,
    })

    setIsCreating(false)
    if (card) {
      setCreatedExperiments((prev) => [...prev, card])
      setTitle('')
      setCriteria('')
      setLagWeeks(defaultLagWeeks.toString())
    } else {
      setError('Failed to create experiment')
    }
  }

  const handleContinue = () => {
    onNext(createdExperiments.map((e) => e.id))
  }

  if (themes.length === 0) {
    return (
      <div className="flex flex-col" style={{ padding: 'var(--space-6) 0' }}>
        <h2
          className="text-center"
          style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}
        >
          Run Experiments
        </h2>
        <p
          className="text-center"
          style={{ color: 'var(--color-text-secondary)', padding: 'var(--space-8)' }}
        >
          No themes created yet. Go back and create some themes first.
        </p>
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ padding: 'var(--space-6) 0' }}>
      {/* Optional badge */}
      <div
        className="flex items-center justify-center"
        style={{
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-2) var(--space-4)',
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: '20px',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          width: 'fit-content',
          margin: '0 auto var(--space-4)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Optional
      </div>

      <h2
        className="text-center"
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        Run Experiments
      </h2>
      <p
        className="text-center"
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-4)',
          lineHeight: 1.5,
        }}
      >
        Experiments are low-pressure tests — things you want to try without committing to long-term.
        They have a review period to evaluate results.
      </p>

      {/* Concept explainer */}
      <div
        className="flex"
        style={{
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: '12px',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ flexShrink: 0, color: 'var(--color-text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 2h4M10 2v4M6 6h8l1 10H5L6 6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
            Unlike commitments, experiments are optional
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            You can skip this step and add experiments later. Many people prefer to start with
            just themes and commitments, then add experiments as they discover what they want to test.
          </p>
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Select
          label="Theme"
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value)}
          options={themes.map((t) => ({ value: t.id, label: t.title }))}
        />

        <Input
          label="Experiment Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Morning meditation routine"
          error={error || undefined}
        />

        <Textarea
          label="Success Criteria (one per line)"
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder="e.g., Meditated 5+ days per week&#10;Felt calmer during the day&#10;Sleep quality improved"
          rows={3}
        />

        {/* Experiment-only: Lag period */}
        <div
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'rgba(196, 91, 77, 0.05)',
            border: '1px solid rgba(196, 91, 77, 0.15)',
            borderRadius: '12px',
          }}
        >
          <div
            className="flex items-center"
            style={{
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-3)',
              fontSize: '12px',
              fontWeight: 500,
              color: '#C45B4D',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v6l3 3" stroke="#C45B4D" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="7" cy="7" r="6" stroke="#C45B4D" strokeWidth="1.5" fill="none"/>
            </svg>
            Experiment Only
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              marginBottom: '4px',
            }}
          >
            Lag Period
          </div>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            How long you wait before judging the results.
          </p>
          <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
            <input
              type="number"
              min={1}
              max={52}
              value={lagWeeks}
              onChange={(e) => setLagWeeks(e.target.value)}
              style={{
                width: '80px',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>weeks</span>
          </div>
        </div>

        <Button onClick={handleCreate} disabled={!title.trim() || isCreating}>
          {isCreating ? 'Adding...' : 'Add Experiment'}
        </Button>
      </div>

      {createdExperiments.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '12px',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h3 className="text-sm font-medium text-secondary uppercase" style={{ marginBottom: 'var(--space-3)' }}>
            Your Experiments ({createdExperiments.length})
          </h3>
          {createdExperiments.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center"
              style={{
                gap: 'var(--space-2)',
                padding: 'var(--space-2) 0',
                color: 'var(--color-text-primary)',
                fontSize: '15px',
              }}
            >
              <span style={{ color: 'var(--color-sage)', fontWeight: 600 }}>✓</span>
              {exp.title}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
        <Button variant="ghost" onClick={onSkip}>
          Skip experiments
        </Button>
        <Button onClick={handleContinue}>
          {createdExperiments.length > 0 ? 'Continue' : 'Continue without experiments'}
        </Button>
      </div>
    </div>
  )
}
