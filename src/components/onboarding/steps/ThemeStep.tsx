import { useState, KeyboardEvent } from 'react'
import { Button, Input } from '../../ui'
import { Card } from '../../../lib/api'
import { Suggestions, SuggestedTheme } from '../hooks/useOnboarding'

interface Props {
  createdThemes: Card[]
  suggestions: Suggestions
  onCreateTheme: (title: string) => Promise<Card | null>
  onNext: (entityIds: string[]) => void
  onSkip: () => void
}

interface DefaultTheme {
  id: string
  name: string
  description: string
  icon: string
}

const DEFAULT_THEMES: DefaultTheme[] = [
  { id: 'd1', name: 'Health & Wellness', description: 'Physical and mental wellbeing', icon: '🌿' },
  { id: 'd2', name: 'Career & Work', description: 'Professional growth and achievement', icon: '💼' },
  { id: 'd3', name: 'Relationships', description: 'Connections with family and friends', icon: '💝' },
  { id: 'd4', name: 'Personal Growth', description: 'Learning and self-improvement', icon: '🌱' },
  { id: 'd5', name: 'Finances', description: 'Financial health and security', icon: '💰' },
  { id: 'd6', name: 'Creativity', description: 'Artistic expression and creation', icon: '🎨' },
  { id: 'd7', name: 'Life Admin', description: 'Home, errands, and logistics', icon: '🏠' },
  { id: 'd8', name: 'Adventure', description: 'Travel and new experiences', icon: '🗺️' },
]

export function ThemeStep({ createdThemes, suggestions, onCreateTheme, onNext, onSkip }: Props) {
  const [customTheme, setCustomTheme] = useState({ name: '', description: '' })
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasSuggestions = suggestions.themes.length > 0

  const handleThemeClick = async (theme: SuggestedTheme | DefaultTheme) => {
    // Check if already selected
    if (createdThemes.some((t) => t.title === theme.name)) {
      return
    }
    setIsCreating(true)
    setError(null)
    const card = await onCreateTheme(theme.name)
    setIsCreating(false)
    if (!card) {
      setError('Failed to create theme')
    }
  }

  const handleAddCustomTheme = async () => {
    if (!customTheme.name.trim()) return
    setIsCreating(true)
    setError(null)
    const card = await onCreateTheme(customTheme.name.trim())
    setIsCreating(false)
    if (card) {
      setCustomTheme({ name: '', description: '' })
      setShowCustomForm(false)
    } else {
      setError('Failed to create theme')
    }
  }

  const handleContinue = () => {
    if (createdThemes.length === 0) {
      setError('Create at least one theme to continue')
      return
    }
    onNext(createdThemes.map((t) => t.id))
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && customTheme.name.trim()) {
      handleAddCustomTheme()
    }
  }

  // Build combined themes list: AI suggestions first, then defaults not in suggestions
  const allThemes: (SuggestedTheme | DefaultTheme)[] = hasSuggestions
    ? [
        ...suggestions.themes,
        ...DEFAULT_THEMES.filter((d) => !suggestions.themes.some((s) => s.name === d.name)),
      ]
    : DEFAULT_THEMES

  return (
    <div className="flex flex-col items-center" style={{ padding: 'var(--space-6) 0' }}>
      <h2
        className="text-center"
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        Choose Your Themes
      </h2>
      <p
        className="text-center"
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-6)',
          lineHeight: 1.5,
          maxWidth: '440px',
        }}
      >
        Themes are the areas of life you want to focus on. Select the ones that resonate with your
        current priorities.
      </p>

      {/* AI Suggestions Badge */}
      {hasSuggestions && (
        <div
          className="flex items-center"
          style={{
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-5)',
            padding: 'var(--space-2) var(--space-4)',
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '20px',
            fontSize: '13px',
            color: 'var(--color-sage)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1L8.5 5L13 5.5L9.5 8.5L10.5 13L7 10.5L3.5 13L4.5 8.5L1 5.5L5.5 5L7 1Z"
              stroke="currentColor"
              strokeWidth="1"
              fill="rgba(139, 148, 103, 0.2)"
            />
          </svg>
          Personalized suggestions based on your calendar
        </div>
      )}

      {/* Theme grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--space-3)',
          width: '100%',
          marginBottom: 'var(--space-5)',
        }}
      >
        {allThemes.map((theme) => {
          const isSelected = createdThemes.some((t) => t.title === theme.name)
          const isSuggested = hasSuggestions && suggestions.themes.some((s) => s.id === theme.id)

          return (
            <button
              key={theme.id}
              onClick={() => handleThemeClick(theme)}
              disabled={isCreating || isSelected}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 'var(--space-4) var(--space-3)',
                border: isSelected
                  ? '2px solid var(--color-sage)'
                  : '1px solid var(--color-border)',
                borderRadius: '12px',
                backgroundColor: isSelected ? 'var(--color-sage-light)' : 'transparent',
                cursor: isCreating || isSelected ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
              }}
            >
              {isSuggested && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-sage)',
                  }}
                />
              )}
              <span style={{ fontSize: '24px', marginBottom: 'var(--space-2)' }}>{theme.icon}</span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  marginBottom: '2px',
                }}
              >
                {theme.name}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.3,
                }}
              >
                {theme.description}
              </span>
              {isSelected && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    color: 'var(--color-sage)',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          )
        })}

        {/* Add custom theme button */}
        {!showCustomForm && (
          <button
            onClick={() => setShowCustomForm(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-4) var(--space-3)',
              border: '2px dashed var(--color-border)',
              borderRadius: '12px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              +
            </span>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Add Your Own
            </span>
          </button>
        )}
      </div>

      {/* Custom theme form */}
      {showCustomForm && (
        <div
          style={{
            width: '100%',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-background-secondary)',
            borderRadius: '12px',
            marginBottom: 'var(--space-4)',
          }}
        >
          <Input
            value={customTheme.name}
            onChange={(e) => setCustomTheme((prev) => ({ ...prev, name: e.target.value }))}
            onKeyDown={handleKeyDown}
            placeholder="Theme name"
            style={{ marginBottom: 'var(--space-3)' }}
          />
          <Input
            value={customTheme.description}
            onChange={(e) => setCustomTheme((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description (optional)"
            style={{ marginBottom: 'var(--space-3)' }}
          />
          {error && (
            <p style={{ fontSize: '13px', color: 'var(--color-error)', marginBottom: 'var(--space-3)' }}>
              {error}
            </p>
          )}
          <div className="flex justify-end" style={{ gap: 'var(--space-2)' }}>
            <Button variant="ghost" onClick={() => setShowCustomForm(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleAddCustomTheme} disabled={!customTheme.name.trim() || isCreating}>
              {isCreating ? 'Adding...' : 'Add Theme'}
            </Button>
          </div>
        </div>
      )}

      {/* Selected count */}
      <div
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {createdThemes.length} theme{createdThemes.length !== 1 ? 's' : ''} selected
      </div>

      <div className="flex justify-between w-full" style={{ paddingTop: 'var(--space-4)' }}>
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={handleContinue} disabled={createdThemes.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  )
}
