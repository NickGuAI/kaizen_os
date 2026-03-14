import { AnimatePresence, motion } from 'motion/react'
import { useMemo, type ReactNode } from 'react'
import './Stepper.css'

export interface StepperStep {
  id: string
  title: string
  description: string
  content: ReactNode
}

interface StepperProps {
  steps: StepperStep[]
  currentStep: number
  onStepChange: (step: number) => void | Promise<void>
  onFinalStepCompleted: () => void | Promise<void>
  isNextDisabled?: boolean
  isWorking?: boolean
  nextButtonText?: string
  finalButtonText?: string
}

/**
 * React Bits-style stepper, vendored locally and themed with Zen palette variables.
 */
export function Stepper({
  steps,
  currentStep,
  onStepChange,
  onFinalStepCompleted,
  isNextDisabled = false,
  isWorking = false,
  nextButtonText = 'Continue',
  finalButtonText = 'Complete onboarding',
}: StepperProps) {
  const safeCurrentStep = Math.max(0, Math.min(steps.length - 1, currentStep))
  const isFirstStep = safeCurrentStep === 0
  const isLastStep = safeCurrentStep === steps.length - 1
  const activeStep = steps[safeCurrentStep]
  const transitionKey = useMemo(() => `${activeStep.id}-${safeCurrentStep}`, [activeStep.id, safeCurrentStep])

  return (
    <div className="stepper-shell">
      <div className="stepper-indicators" role="list" aria-label="Onboarding steps">
        {steps.map((step, index) => {
          const isComplete = index < safeCurrentStep
          const isActive = index === safeCurrentStep

          return (
            <div key={step.id} className="stepper-indicator-wrap" role="listitem">
              <button
                type="button"
                className={`stepper-indicator ${isComplete ? 'complete' : ''} ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (index <= safeCurrentStep) {
                    void onStepChange(index)
                  }
                }}
                disabled={index > safeCurrentStep || isWorking}
                title={step.title}
                aria-current={isActive ? 'step' : undefined}
              >
                {isComplete ? '✓' : index + 1}
              </button>
              {index < steps.length - 1 ? (
                <div className={`stepper-connector ${isComplete ? 'complete' : ''}`} aria-hidden="true" />
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="stepper-header">
        <h2>{activeStep.title}</h2>
        <p>{activeStep.description}</p>
      </div>

      <div className="stepper-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={transitionKey}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
          >
            {activeStep.content}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="stepper-footer">
        {!isFirstStep ? (
          <button
            type="button"
            className="stepper-back"
            onClick={() => void onStepChange(safeCurrentStep - 1)}
            disabled={isWorking}
          >
            Back
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="stepper-next"
          disabled={isNextDisabled || isWorking}
          onClick={() => {
            if (isLastStep) {
              void onFinalStepCompleted()
              return
            }
            void onStepChange(safeCurrentStep + 1)
          }}
        >
          {isLastStep ? finalButtonText : nextButtonText}
        </button>
      </div>
    </div>
  )
}
