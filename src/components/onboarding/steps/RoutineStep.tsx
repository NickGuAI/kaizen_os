import { useState, KeyboardEvent } from 'react'
import { Button, Input, Select } from '../../ui'
import { Card } from '../../../lib/api'
import { Suggestions, SuggestedRoutine } from '../hooks/useOnboarding'

interface Props {
  themes: Card[]
  suggestions: Suggestions
  onCreateAction: (
    type: 'ACTION_ROUTINE',
    parentId: string,
    data: { title: string }
  ) => Promise<Card | null>
  onNext: (entityIds: string[]) => void
  onSkip: () => void
}

const DEFAULT_SUGGESTIONS = [
  'Daily exercise',
  'Weekly review',
  'Morning journaling',
  'Evening planning',
  'Reading habit',
  'Meditation',
]

export function RoutineStep({ themes, suggestions, onCreateAction, onNext, onSkip }: Props) {
  const [selectedTheme, setSelectedTheme] = useState(themes[0]?.id || '')
  const [title, setTitle] = useState('')
  const [createdRoutines, setCreatedRoutines] = useState<Card[]>([])
  const [addedSuggestionIds, setAddedSuggestionIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasSuggestions = suggestions.routines.length > 0

  const handleCreate = async () => {
    if (!title.trim() || !selectedTheme) return
    setIsCreating(true)
    setError(null)

    const card = await onCreateAction('ACTION_ROUTINE', selectedTheme, {
      title: title.trim(),
    })

    setIsCreating(false)
    if (card) {
      setCreatedRoutines((prev) => [...prev, card])
      setTitle('')
    } else {
      setError('Failed to create routine')
    }
  }

  const handleAddSuggestion = async (suggestion: SuggestedRoutine) => {
    const theme = themes.find((t) => t.title === suggestion.theme) || themes[0]
    if (!theme) return

    setIsCreating(true)
    setError(null)

    const card = await onCreateAction('ACTION_ROUTINE', theme.id, {
      title: suggestion.title,
    })

    setIsCreating(false)
    if (card) {
      setCreatedRoutines((prev) => [...prev, card])
      setAddedSuggestionIds((prev) => new Set(prev).add(suggestion.id))
    } else {
      setError('Failed to add routine')
    }
  }

  const handleDefaultSuggestionClick = async (suggestionTitle: string) => {
    if (!selectedTheme) return
    setIsCreating(true)
    setError(null)

    const card = await onCreateAction('ACTION_ROUTINE', selectedTheme, {
      title: suggestionTitle,
    })

    setIsCreating(false)
    if (card) {
      setCreatedRoutines((prev) => [...prev, card])
    } else {
      setError('Failed to create routine')
    }
  }

  const handleContinue = () => {
    onNext(createdRoutines.map((r) => r.id))
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      handleCreate()
    }
  }

  if (themes.length === 0) {
    return (
      <div className="flex flex-col" style={{ padding: 'var(--space-6) 0' }}>
        <h2
          className="text-center"
          style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}
        >
          Establish Your Routines
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

  // Filter out already created routines
  const availableSuggestions = suggestions.routines.filter(
    (s) => !addedSuggestionIds.has(s.id) && !createdRoutines.some((r) => r.title === s.title)
  )

  const availableDefaults = DEFAULT_SUGGESTIONS.filter(
    (s) =>
      !createdRoutines.some((r) => r.title === s) &&
      !suggestions.routines.some((sr) => sr.title === s)
  )

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
        Establish Your Routines
      </h2>
      <p
        className="text-center"
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-6)',
          lineHeight: 1.5,
        }}
      >
        Routines are regular practices that support your themes. They help build consistency
        and momentum over time.
      </p>

      {/* AI Suggestions */}
      {hasSuggestions && availableSuggestions.length > 0 && (
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
            {availableSuggestions.map((routine) => (
              <div
                key={routine.id}
                className="flex items-center justify-between"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-background-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    {routine.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {routine.theme} · {routine.frequency}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddSuggestion(routine)}
                  disabled={isCreating}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Created routines */}
      {createdRoutines.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '12px',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h3 className="text-sm font-medium text-secondary uppercase" style={{ marginBottom: 'var(--space-3)' }}>
            Your Routines ({createdRoutines.length})
          </h3>
          {createdRoutines.map((routine) => (
            <div
              key={routine.id}
              className="flex items-center"
              style={{
                gap: 'var(--space-2)',
                padding: 'var(--space-2) 0',
                color: 'var(--color-text-primary)',
                fontSize: '15px',
              }}
            >
              <span style={{ color: 'var(--color-sage)', fontWeight: 600 }}>✓</span>
              {routine.title}
            </div>
          ))}
        </div>
      )}

      {/* Add custom routine form */}
      <div className="flex flex-col" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Add a routine
        </div>

        <Select
          label="Theme"
          value={selectedTheme}
          onChange={(e) => setSelectedTheme(e.target.value)}
          options={themes.map((t) => ({ value: t.id, label: t.title }))}
        />

        <div className="flex" style={{ gap: 'var(--space-3)' }}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a routine name..."
            style={{ flex: 1 }}
            error={error || undefined}
          />
          <Button onClick={handleCreate} disabled={!title.trim() || isCreating}>
            {isCreating ? 'Adding...' : 'Add'}
          </Button>
        </div>

        {/* Default suggestions */}
        {availableDefaults.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
            {availableDefaults.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleDefaultSuggestionClick(suggestion)}
                disabled={isCreating}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: '13px',
                  border: '1px solid var(--color-sage-border)',
                  borderRadius: '16px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={handleContinue}>
          {createdRoutines.length > 0 ? 'Continue' : 'Continue without routines'}
        </Button>
      </div>
    </div>
  )
}
