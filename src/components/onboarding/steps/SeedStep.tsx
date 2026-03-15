import { Input, Textarea } from '../../ui'
import { SeedData } from '../hooks/useOnboarding'

interface SeedStepProps {
  value: SeedData
  errors: string[]
  onChange: (next: SeedData) => void
}

export function SeedStep({ value, errors, onChange }: SeedStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Input
        label="Who are you?"
        placeholder="e.g. Software engineer, founder, student, parent..."
        value={value.coreIdentity}
        onChange={(event) => onChange({ ...value, coreIdentity: event.target.value })}
      />

      <Input
        label="Where are you right now in life?"
        placeholder="e.g. Just started a new job, recovering from burnout, building a side project..."
        value={value.startingPoint}
        onChange={(event) => onChange({ ...value, startingPoint: event.target.value })}
      />

      <Textarea
        label="Tell us more"
        placeholder="What's going on in your life right now? What are your constraints (time, energy, money)? Why does this moment feel important?"
        rows={8}
        value={value.narrative}
        onChange={(event) => onChange({ ...value, narrative: event.target.value })}
      />

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
    </div>
  )
}
