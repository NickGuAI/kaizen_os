import { useState } from 'react'
import { Button, Input, Select, Textarea } from '../../ui'
import { Card } from '../../../lib/api'
import { Suggestions, SuggestedGate } from '../hooks/useOnboarding'

interface Props {
  themes: Card[]
  suggestions: Suggestions
  onCreateAction: (
    type: 'ACTION_GATE',
    parentId: string,
    data: { title: string; criteria?: string[]; targetDate?: string }
  ) => Promise<Card | null>
  onNext: (entityIds: string[]) => void
  onSkip: () => void
}

export function GateStep({ themes, suggestions, onCreateAction, onNext, onSkip }: Props) {
  const [selectedTheme, setSelectedTheme] = useState(themes[0]?.id || '')
  const [title, setTitle] = useState('')
  const [criteria, setCriteria] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [createdGates, setCreatedGates] = useState<Card[]>([])
  const [addedSuggestionIds, setAddedSuggestionIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasSuggestions = suggestions.gates.length > 0

  const handleCreate = async () => {
    if (!title.trim() || !selectedTheme) return
    setIsCreating(true)
    setError(null)

    const criteriaList = criteria
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean)

    const card = await onCreateAction('ACTION_GATE', selectedTheme, {
      title: title.trim(),
      criteria: criteriaList.length > 0 ? criteriaList : undefined,
      targetDate: targetDate || undefined,
    })

    setIsCreating(false)
    if (card) {
      setCreatedGates((prev) => [...prev, card])
      setTitle('')
      setCriteria('')
      setTargetDate('')
    } else {
      setError('Failed to create commitment')
    }
  }

  const handleAddSuggestion = async (suggestion: SuggestedGate) => {
    // Find the theme by name
    const theme = themes.find((t) => t.title === suggestion.theme) || themes[0]
    if (!theme) return

    setIsCreating(true)
    setError(null)

    // Parse deadline - only use if it's a valid ISO date
    let validTargetDate: string | undefined = undefined
    if (suggestion.deadline) {
      const parsed = new Date(suggestion.deadline)
      if (!isNaN(parsed.getTime())) {
        validTargetDate = suggestion.deadline
      }
    }

    const card = await onCreateAction('ACTION_GATE', theme.id, {
      title: suggestion.title,
      criteria: suggestion.criteria,
      targetDate: validTargetDate,
    })

    setIsCreating(false)
    if (card) {
      setCreatedGates((prev) => [...prev, card])
      setAddedSuggestionIds((prev) => new Set(prev).add(suggestion.id))
    } else {
      setError('Failed to add commitment')
    }
  }

  const handleContinue = () => {
    onNext(createdGates.map((g) => g.id))
  }

  if (themes.length === 0) {
    return (
      <div className="flex flex-col" style={{ padding: 'var(--space-6) 0' }}>
        <h2
          className="text-center"
          style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}
        >
          Define Your Gates
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
      <h2
        className="text-center"
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        Define Your Gates
      </h2>

      {/* Concept explainer */}
      <div
        className="flex"
        style={{
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          backgroundColor: 'var(--color-sage-light)',
          borderRadius: '12px',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ flexShrink: 0, color: 'var(--color-sage)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Gates are commitments you must complete
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Unlike experiments which are optional, commitments are your non-negotiables —
            deadlines, promises, and milestones that require completion. Each has clear criteria
            that define when it's done.
          </p>
        </div>
      </div>

      {/* AI Suggestions */}
      {hasSuggestions && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div
            className="flex items-center"
            style={{
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-3)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-sage)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.5 5L13 5.5L9.5 8.5L10.5 13L7 10.5L3.5 13L4.5 8.5L1 5.5L5.5 5L7 1Z" stroke="currentColor" strokeWidth="1" fill="rgba(139, 148, 103, 0.2)"/>
            </svg>
            Suggested from your calendar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {suggestions.gates.map((gate) => {
              const isAdded = addedSuggestionIds.has(gate.id)
              return (
                <div
                  key={gate.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: isAdded ? 'var(--color-sage-light)' : 'var(--color-background-secondary)',
                    border: isAdded ? '1px solid var(--color-sage)' : '1px solid var(--color-border)',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {gate.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {gate.theme} · Due {gate.deadline}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isAdded ? 'ghost' : 'secondary'}
                    onClick={() => !isAdded && handleAddSuggestion(gate)}
                    disabled={isAdded || isCreating}
                  >
                    {isAdded ? 'Added' : 'Add'}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Created commitments */}
      {createdGates.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '12px',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h3 className="text-sm font-medium text-secondary uppercase" style={{ marginBottom: 'var(--space-3)' }}>
            Your Commitments ({createdGates.length})
          </h3>
          {createdGates.map((gate) => (
            <div
              key={gate.id}
              className="flex items-center"
              style={{
                gap: 'var(--space-2)',
                padding: 'var(--space-2) 0',
                color: 'var(--color-text-primary)',
                fontSize: '15px',
              }}
            >
              <span style={{ color: 'var(--color-sage)', fontWeight: 600 }}>✓</span>
              {gate.title}
            </div>
          ))}
        </div>
      )}

      {/* Add custom commitment form */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--space-3)',
          }}
        >
          Add a commitment
        </div>
        <div className="flex flex-col" style={{ gap: 'var(--space-3)' }}>
          <Select
            label="Theme"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            options={themes.map((t) => ({ value: t.id, label: t.title }))}
          />

          <Input
            label="Commitment Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Launch MVP by Q2"
            error={error || undefined}
          />

          <Textarea
            label="Success Criteria (one per line)"
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="e.g., Product is deployed&#10;10 users signed up&#10;Core features working"
            rows={3}
          />

          <Input
            type="date"
            label="Target Date (optional)"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />

          <Button onClick={handleCreate} disabled={!title.trim() || isCreating}>
            {isCreating ? 'Adding...' : 'Add Commitment'}
          </Button>
        </div>
      </div>

      <div className="flex justify-between" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={handleContinue}>
          {createdGates.length > 0 ? 'Continue' : 'Continue without commitments'}
        </Button>
      </div>
    </div>
  )
}
