import React from 'react'
import { ONBOARDING_STEPS, OnboardingStep } from './hooks/useOnboarding'
import { OnboardingProgress as OnboardingProgressType } from '../../services/userSettingsTypes'

interface Props {
  currentStep: number
  progress: OnboardingProgressType
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  connect: 'Connect',
  seed: 'Seed',
  student: 'Student',
  gaze: 'Gaze',
}

export function OnboardingProgress({ currentStep, progress }: Props) {
  return (
    <div className="flex flex-col items-center" style={{ marginBottom: 'var(--space-8)' }}>
      <div className="flex items-center">
        {ONBOARDING_STEPS.map((step, index) => {
          const stepData = progress.steps[step]
          const isCompleted = stepData?.status === 'completed' || index < currentStep
          const isCurrent = index === currentStep

          return (
            <React.Fragment key={step}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: isCurrent ? '14px' : '12px',
                  height: isCurrent ? '14px' : '12px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted || isCurrent
                    ? 'var(--color-sage)'
                    : 'rgba(139, 148, 103, 0.15)',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(139, 148, 103, 0.15)' : 'none',
                  color: 'white',
                  transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
                  cursor: 'pointer',
                }}
                title={STEP_LABELS[step]}
              >
                {isCompleted && !isCurrent && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {index < ONBOARDING_STEPS.length - 1 && (
                <div
                  style={{
                    width: '32px',
                    height: '1px',
                    backgroundColor: isCompleted ? 'var(--color-sage)' : 'rgba(139, 148, 103, 0.15)',
                    transition: 'background 0.3s ease',
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
      {currentStep > 0 && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            fontSize: '11px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--color-sage)',
          }}
        >
          {STEP_LABELS[ONBOARDING_STEPS[currentStep]]}
        </div>
      )}
    </div>
  )
}
