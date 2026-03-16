import { Input, Select, Textarea } from '../../ui'
import { StudentData } from '../hooks/useOnboarding'

interface StudentStepProps {
  value: StudentData
  errors: string[]
  onChange: (next: StudentData) => void
}

export function StudentStep({ value, errors, onChange }: StudentStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Input
        label="Who do you want to become?"
        placeholder="e.g. A disciplined builder who ships every week, a calm and present parent..."
        value={value.becoming}
        onChange={(event) => onChange({ ...value, becoming: event.target.value })}
      />

      <Select
        label="How far out are you looking?"
        value={value.horizon}
        onChange={(event) => onChange({ ...value, horizon: event.target.value })}
        options={[
          { value: '', label: 'Select a timeframe' },
          { value: '90_days', label: '90 days' },
          { value: '1_year', label: '1 year' },
          { value: '3_year', label: '3 years' },
          { value: '5_year', label: '5 years' },
        ]}
      />

      <Textarea
        label="What does that future version of you look like?"
        placeholder="What skills do they have? What habits? What do they say no to? What's different about how they spend their day?"
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
