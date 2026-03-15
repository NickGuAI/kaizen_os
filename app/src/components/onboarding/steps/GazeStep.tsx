import { useState } from 'react'
import { Button, Input, Textarea } from '../../ui'
import { GazeData } from '../hooks/useOnboarding'

interface GazeStepProps {
  value: GazeData
  errors: string[]
  canSynthesize: boolean
  isSynthesizing: boolean
  kaizenExperiment: Record<string, unknown> | null
  onChange: (next: GazeData) => void
  onSynthesize: () => Promise<void>
}

function parseCommaSeparatedValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function renderExperiment(experimentPayload: Record<string, unknown>) {
  const experiment =
    experimentPayload.experiment &&
    typeof experimentPayload.experiment === 'object' &&
    !Array.isArray(experimentPayload.experiment)
      ? (experimentPayload.experiment as Record<string, unknown>)
      : experimentPayload

  const title = toString(experiment.title)
  const thesis = toString(experiment.thesis)
  const northStar = toString(experiment.northStar)
  const signals = toStringArray(experiment.successSignals)
  const actions = Array.isArray(experiment.firstActions)
    ? experiment.firstActions
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
        .map((action) => ({
          title: toString(action.title),
          why: toString(action.why),
          window: toString(action.window),
        }))
        .filter((action) => action.title.length > 0)
    : []

  if (!title && !thesis && !northStar && signals.length === 0 && actions.length === 0) {
    return (
      <pre
        style={{
          margin: 'var(--space-3) 0 0',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--color-text-secondary)',
        }}
      >
        {JSON.stringify(experimentPayload, null, 2)}
      </pre>
    )
  }

  return (
    <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {title ? <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</p> : null}
      {thesis ? <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>{thesis}</p> : null}
      {northStar ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>North star:</strong> {northStar}
        </p>
      ) : null}
      {signals.length > 0 ? (
        <div>
          <p style={{ margin: '0 0 var(--space-2)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Success signals
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {signals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {actions.length > 0 ? (
        <div>
          <p style={{ margin: '0 0 var(--space-2)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            First actions
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-text-secondary)', fontSize: 13 }}>
            {actions.map((action) => (
              <li key={action.title}>
                {action.title}
                {action.window ? ` (${action.window})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function GazeStep({
  value,
  errors,
  canSynthesize,
  isSynthesizing,
  kaizenExperiment,
  onChange,
  onSynthesize,
}: GazeStepProps) {
  // Keep raw string so spaces aren't eaten by trim+filter on every keystroke.
  // Only parse to array on blur.
  const [nonNegotiablesRaw, setNonNegotiablesRaw] = useState(value.nonNegotiables.join(', '))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Textarea
        label="Desires"
        placeholder="Write what you want, why you want it, and what must become true."
        rows={8}
        value={value.desires}
        onChange={(event) => onChange({ ...value, desires: event.target.value })}
      />

      <Textarea
        label="Reflection"
        placeholder="Reflect on tradeoffs, fear, resistance, and what you are willing to commit to."
        rows={8}
        value={value.reflection}
        onChange={(event) => onChange({ ...value, reflection: event.target.value })}
      />

      <Input
        label="Non-negotiables"
        placeholder="e.g. 7h sleep, weekly review, no meetings before noon"
        value={nonNegotiablesRaw}
        onChange={(event) => setNonNegotiablesRaw(event.target.value)}
        onBlur={() => onChange({ ...value, nonNegotiables: parseCommaSeparatedValues(nonNegotiablesRaw) })}
      />

      <p style={{ margin: 0, marginTop: '-8px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        Separate non-negotiables with commas.
      </p>

      {errors.length > 0 ? (
        <div
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-3)',
            borderRadius: 10,
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
          }}
        >
          {errors.map((error) => (
            <p key={error} style={{ margin: 0, fontSize: 13, color: 'var(--color-critical)' }}>
              {error}
            </p>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Synthesis is required before final completion.
        </p>
        <Button variant="secondary" onClick={onSynthesize} disabled={!canSynthesize || isSynthesizing}>
          {isSynthesizing ? 'Synthesizing...' : 'Synthesize Kaizen Experiment'}
        </Button>
      </div>

      {kaizenExperiment ? (
        <div
          style={{
            border: '1px solid var(--color-sage-border-light)',
            borderRadius: 12,
            background: 'var(--color-bg)',
            padding: 'var(--space-4)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-text-primary)' }}>Kaizen Experiment Draft</h3>
          {renderExperiment(kaizenExperiment)}
        </div>
      ) : null}
    </div>
  )
}
