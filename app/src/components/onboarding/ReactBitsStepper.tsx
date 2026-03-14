import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import './ReactBitsStepper.css'

export interface StepperStep {
  id: string
  title: string
  description: string
  content: React.ReactNode
}

interface ReactBitsStepperProps {
  steps: StepperStep[]
  currentStep: number
  onStepChange: (step: number) => void
  onFinalStepCompleted: () => void
  isNextDisabled?: boolean
  isWorking?: boolean
  nextButtonText?: string
  finalButtonText?: string
}

export function ReactBitsStepper({
  steps,
  currentStep,
  onStepChange,
  onFinalStepCompleted,
  isNextDisabled = false,
  isWorking = false,
  nextButtonText = 'Continue',
  finalButtonText = 'Complete onboarding',
}: ReactBitsStepperProps) {
  const safeCurrentStep = Math.max(0, Math.min(steps.length - 1, currentStep))
  const isFirstStep = safeCurrentStep === 0
  const isLastStep = safeCurrentStep === steps.length - 1

  const activeStep = steps[safeCurrentStep]

  const transitionKey = useMemo(() => `${activeStep.id}-${safeCurrentStep}`, [activeStep.id, safeCurrentStep])

  return (
    <div className="rb-stepper-shell">
      <div className="rb-stepper-indicators" role="list" aria-label="Onboarding steps">
        {steps.map((step, index) => {
          const isComplete = index < safeCurrentStep
          const isActive = index === safeCurrentStep

          return (
            <div key={step.id} className="rb-stepper-indicator-wrap" role="listitem">
              <button
                type="button"
                className={`rb-stepper-indicator ${isComplete ? 'complete' : ''} ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (index <= safeCurrentStep) {
                    onStepChange(index)
                  }
                }}
                disabled={index > safeCurrentStep}
                title={step.title}
                aria-current={isActive ? 'step' : undefined}
              >
                {isComplete ? '✓' : index + 1}
              </button>
              {index < steps.length - 1 ? (
                <div className={`rb-stepper-connector ${isComplete ? 'complete' : ''}`} aria-hidden="true" />
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="rb-stepper-header">
        <h2>{activeStep.title}</h2>
        <p>{activeStep.description}</p>
      </div>

      <div className="rb-stepper-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={transitionKey}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {activeStep.content}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="rb-stepper-footer">
        {!isFirstStep ? (
          <button
            type="button"
            className="rb-stepper-back"
            onClick={() => onStepChange(safeCurrentStep - 1)}
            disabled={isWorking}
          >
            Back
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="rb-stepper-next"
          disabled={isNextDisabled || isWorking}
          onClick={() => {
            if (isLastStep) {
              onFinalStepCompleted()
              return
            }
            onStepChange(safeCurrentStep + 1)
          }}
        >
          {isLastStep ? finalButtonText : nextButtonText}
        </button>
      </div>
    </div>
  )
}
