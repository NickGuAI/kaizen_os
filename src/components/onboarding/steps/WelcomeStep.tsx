import { Button } from '../../ui'

interface Props {
  onNext: () => void
}

interface ConceptItemProps {
  term: string
  description: string
}

function ConceptItem({ term, description }: ConceptItemProps) {
  return (
    <div
      className="flex"
      style={{
        alignItems: 'flex-start',
        gap: 'var(--space-4)',
        padding: 'var(--space-3) 0',
        textAlign: 'left',
        borderBottom: '1px solid rgba(139, 148, 103, 0.08)',
      }}
    >
      <div
        style={{
          width: '3px',
          height: '20px',
          backgroundColor: 'rgba(139, 148, 103, 0.3)',
          borderRadius: '2px',
          flexShrink: 0,
          marginTop: '2px',
        }}
      />
      <div>
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px' }}>
          {term}
        </span>
        <span style={{ color: 'var(--color-text-tertiary)' }}> — </span>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          {description}
        </span>
      </div>
    </div>
  )
}

export function WelcomeStep({ onNext }: Props) {
  return (
    <div className="flex flex-col items-center text-center" style={{ padding: 'var(--space-8) 0' }}>
      {/* Kaizen logo mark */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path
            d="M32 8L52 20V44L32 56L12 44V20L32 8Z"
            stroke="var(--color-sage)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M32 20L44 27V41L32 48L20 41V27L32 20Z"
            stroke="var(--color-sage)"
            strokeWidth="1.5"
            fill="rgba(139, 148, 103, 0.1)"
          />
          <circle cx="32" cy="34" r="4" fill="var(--color-sage)" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: '28px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-4)',
          letterSpacing: '-0.02em',
        }}
      >
        Welcome to Kaizen OS
      </h1>

      <p
        style={{
          fontSize: '15px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.7,
          marginBottom: 'var(--space-8)',
        }}
      >
        A personal operating system for continuous improvement.
        <br />
        We'll guide you through setting up your life's architecture.
      </p>

      <div style={{ width: '100%', maxWidth: '400px', marginBottom: 'var(--space-8)' }}>
        <ConceptItem
          term="Seasons"
          description="Your planning cycles — focused periods for growth (recommended: 13 weeks)"
        />
        <ConceptItem term="Themes" description="The areas of life you want to nurture" />
        <ConceptItem
          term="Gates"
          description="Commitments you must complete — your non-negotiables"
        />
        <ConceptItem term="Routines" description="Regular practices that shape your days" />
        <ConceptItem term="Experiments" description="Optional hypotheses to test and learn from" />
        <ConceptItem term="Ops" description="Tasks that simply need to get done" />
      </div>

      <Button onClick={onNext} size="lg">
        Begin Setup
      </Button>
    </div>
  )
}
