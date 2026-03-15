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

interface SynthesizedTheme {
  name: string
  description: string
  icon: string
}

interface SynthesizedGate {
  title: string
  themeName: string
  deadline: string
  criteria: string[]
}

interface SynthesizedExperiment {
  title: string
  themeName: string
  description: string
  lagWeeks: number
}

function extractPlan(payload: Record<string, unknown>): {
  themes: SynthesizedTheme[]
  gates: SynthesizedGate[]
  experiments: SynthesizedExperiment[]
} {
  const rawThemes = Array.isArray(payload.themes) ? payload.themes : []
  const themes: SynthesizedTheme[] = rawThemes
    .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === 'object' && !Array.isArray(t))
    .map((t) => ({
      name: toString(t.name),
      description: toString(t.description),
      icon: toString(t.icon) || '🎯',
    }))
    .filter((t) => t.name.length > 0)

  const rawGates = Array.isArray(payload.gates) ? payload.gates : []
  const gates: SynthesizedGate[] = rawGates
    .filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === 'object' && !Array.isArray(g))
    .map((g) => ({
      title: toString(g.title),
      themeName: toString(g.themeName || g.theme_name || g.theme),
      deadline: toString(g.deadline),
      criteria: toStringArray(g.criteria),
    }))
    .filter((g) => g.title.length > 0)

  const rawExperiments = Array.isArray(payload.experiments) ? payload.experiments : []
  const experiments: SynthesizedExperiment[] = rawExperiments
    .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object' && !Array.isArray(e))
    .map((e) => ({
      title: toString(e.title),
      themeName: toString(e.themeName || e.theme_name || e.theme),
      description: toString(e.description),
      lagWeeks: typeof e.lagWeeks === 'number' ? e.lagWeeks : 4,
    }))
    .filter((e) => e.title.length > 0)

  return { themes, gates, experiments }
}

function renderPlan(payload: Record<string, unknown>) {
  const { themes, gates, experiments } = extractPlan(payload)

  if (themes.length === 0) {
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
        {JSON.stringify(payload, null, 2)}
      </pre>
    )
  }

  return (
    <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {themes.map((theme) => {
        const themeGates = gates.filter((g) => g.themeName === theme.name)
        const themeExperiments = experiments.filter((e) => e.themeName === theme.name)

        return (
          <div
            key={theme.name}
            style={{
              border: '1px solid var(--color-sage-border-light)',
              borderRadius: 10,
              padding: 'var(--space-4)',
              background: 'rgba(255,255,255,0.4)',
            }}
          >
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {theme.icon} {theme.name}
            </p>
            <p style={{ margin: 'var(--space-1) 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {theme.description}
            </p>

            {themeGates.length > 0 ? (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <p style={{ margin: '0 0 var(--space-1)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Gate
                </p>
                {themeGates.map((gate) => (
                  <div key={gate.title} style={{ marginBottom: 'var(--space-2)' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {gate.title}
                      {gate.deadline ? (
                        <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
                          by {gate.deadline}
                        </span>
                      ) : null}
                    </p>
                    {gate.criteria.length > 0 ? (
                      <ul style={{ margin: 'var(--space-1) 0 0', paddingLeft: 18, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                        {gate.criteria.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {themeExperiments.length > 0 ? (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <p style={{ margin: '0 0 var(--space-1)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Experiment
                </p>
                {themeExperiments.map((exp) => (
                  <div key={exp.title} style={{ marginBottom: 'var(--space-2)' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {exp.title}
                      <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)', marginLeft: 8 }}>
                        {exp.lagWeeks}w
                      </span>
                    </p>
                    {exp.description ? (
                      <p style={{ margin: 'var(--space-1) 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {exp.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
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
          Generate your starting plan before finishing onboarding.
        </p>
        <Button variant="secondary" onClick={onSynthesize} disabled={!canSynthesize || isSynthesizing}>
          {isSynthesizing ? 'Generating...' : kaizenExperiment ? 'Re-generate Plan' : 'Generate Plan'}
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
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-text-primary)' }}>Your Kaizen Plan</h3>
          <p style={{ margin: 'var(--space-1) 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            2 themes, each with a gate and an experiment — generated from your identity narrative.
          </p>
          {renderPlan(kaizenExperiment)}
        </div>
      ) : null}
    </div>
  )
}
