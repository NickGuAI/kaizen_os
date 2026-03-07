import { useState } from 'react'
import { Button, Input } from '../../ui'

interface SeasonData {
  name: string
  startDate: string
  endDate: string
  weeks: number
  intention: string
}

interface Props {
  season: SeasonData
  onUpdate: (season: SeasonData) => void
  onNext: () => void
  onBack: () => void
}

const PRESET_SEASONS = [
  { name: 'Q1 2026', start: '2026-01-01', weeks: 13 },
  { name: 'Q2 2026', start: '2026-04-01', weeks: 13 },
  { name: 'Spring 2026', start: '2026-03-20', weeks: 13 },
  { name: 'Summer 2026', start: '2026-06-21', weeks: 13 },
]

function calculateEndDate(startDate: string, weeks: number): string {
  if (!startDate) return ''
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + weeks * 7 - 1)
  return end.toISOString().split('T')[0]
}

export function SeasonStep({ season, onUpdate, onNext, onBack }: Props) {
  const [showCustomWeeks, setShowCustomWeeks] = useState(false)

  const updateSeason = (field: keyof SeasonData, value: string | number) => {
    const newSeason = { ...season, [field]: value }

    // Auto-calculate end date when start date or weeks change
    if (field === 'startDate' || field === 'weeks') {
      const startDate = field === 'startDate' ? (value as string) : season.startDate
      const weeks = field === 'weeks' ? (value as number) : season.weeks
      if (startDate && weeks) {
        newSeason.endDate = calculateEndDate(startDate, weeks)
      }
    }

    onUpdate(newSeason)
  }

  const selectPreset = (preset: { name: string; start: string; weeks: number }) => {
    onUpdate({
      ...season,
      name: preset.name,
      startDate: preset.start,
      weeks: preset.weeks,
      endDate: calculateEndDate(preset.start, preset.weeks),
    })
  }

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const canContinue = season.name && season.startDate && season.weeks > 0

  return (
    <div className="flex flex-col" style={{ padding: 'var(--space-6) 0' }}>
      {/* Step icon */}
      <div className="flex justify-center" style={{ marginBottom: 'var(--space-6)', opacity: 0.9 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="18" stroke="var(--color-sage)" strokeWidth="1.5" fill="none" />
          <path d="M24 12V24L32 28" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="24" r="3" fill="var(--color-sage)" />
          <path d="M24 6A18 18 0 0 1 42 24" stroke="var(--color-sage)" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        </svg>
      </div>

      <h2
        className="text-center"
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Define Your Season
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
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Seasons are your planning cycles
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            A season is a focused period for working toward your goals — like a quarter, but personalized
            to your rhythm. We recommend <strong>13 weeks</strong> as it's long enough for meaningful progress,
            short enough to stay focused.
          </p>
        </div>
      </div>

      {/* Quick presets */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <p
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 'var(--space-2)',
          }}
        >
          Quick start with a preset
        </p>
        <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
          {PRESET_SEASONS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => selectPreset(preset)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: '14px',
                border: season.name === preset.name ? '2px solid var(--color-sage)' : '1px solid var(--color-border)',
                borderRadius: '8px',
                backgroundColor: season.name === preset.name ? 'var(--color-sage-light)' : 'transparent',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div
        className="flex items-center"
        style={{
          margin: 'var(--space-4) 0',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>or customize</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
      </div>

      {/* Custom season form */}
      <div className="flex flex-col" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Input
          label="Season Name"
          value={season.name}
          onChange={(e) => updateSeason('name', e.target.value)}
          placeholder="e.g., 'New Year Reset', 'Q1 2026', 'Spring Renewal'"
        />

        <div className="flex" style={{ gap: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}>
            <Input
              type="date"
              label="Start Date"
              value={season.startDate}
              onChange={(e) => updateSeason('startDate', e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Duration
            </div>
            <div className="flex" style={{ gap: 'var(--space-2)' }}>
              <button
                onClick={() => { updateSeason('weeks', 13); setShowCustomWeeks(false) }}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: '13px',
                  border: season.weeks === 13 && !showCustomWeeks ? '2px solid var(--color-sage)' : '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: season.weeks === 13 && !showCustomWeeks ? 'var(--color-sage-light)' : 'transparent',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                13 weeks
              </button>
              <button
                onClick={() => { updateSeason('weeks', 12); setShowCustomWeeks(false) }}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: '13px',
                  border: season.weeks === 12 && !showCustomWeeks ? '2px solid var(--color-sage)' : '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: season.weeks === 12 && !showCustomWeeks ? 'var(--color-sage-light)' : 'transparent',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                12 weeks
              </button>
              <button
                onClick={() => setShowCustomWeeks(true)}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: '13px',
                  border: showCustomWeeks ? '2px solid var(--color-sage)' : '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: showCustomWeeks ? 'var(--color-sage-light)' : 'transparent',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                Custom
              </button>
            </div>
            {showCustomWeeks && (
              <div className="flex items-center" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={season.weeks}
                  onChange={(e) => updateSeason('weeks', parseInt(e.target.value) || 13)}
                  style={{
                    width: '70px',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>weeks</span>
              </div>
            )}
          </div>
        </div>

        {/* Season summary */}
        {season.startDate && season.endDate && (
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-background-secondary)',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
            }}
          >
            Your season: <strong style={{ color: 'var(--color-text-primary)' }}>{formatDate(season.startDate)}</strong>
            {' → '}
            <strong style={{ color: 'var(--color-text-primary)' }}>{formatDate(season.endDate)}</strong>
            {' '}({season.weeks} weeks)
          </div>
        )}

        <Input
          label="Season Intention (optional)"
          value={season.intention}
          onChange={(e) => updateSeason('intention', e.target.value)}
          placeholder="What do you want to achieve this season?"
        />
      </div>

      <div className="flex justify-between" style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </div>
  )
}
