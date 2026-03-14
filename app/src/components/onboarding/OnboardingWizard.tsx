import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Textarea } from '../ui'
import { ReactBitsStepper, StepperStep } from './ReactBitsStepper'
import { useOnboarding } from './hooks/useOnboarding'
import { ConnectStep } from './steps'

function ValidationList({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return null
  }

  return (
    <div
      style={{
        marginTop: 'var(--space-3)',
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
  )
}

export function OnboardingWizard() {
  const navigate = useNavigate()

  const {
    state,
    currentStepName,
    setCurrentStep,
    updateSeed,
    updateStudent,
    updateGaze,
    refreshConnectStatus,
    startConnection,
    synthesizeExperiment,
    completeOnboarding,
    clearError,
    canAdvanceTo,
  } = useOnboarding()

  const currentValidation = state.data.stepValidation[currentStepName]

  const canSynthesize =
    state.data.stepValidation.connect.isValid &&
    state.data.stepValidation.seed.isValid &&
    state.data.stepValidation.student.isValid &&
    state.data.stepValidation.gaze.isValid

  const synthesisReady = state.data.synthesisStatus === 'ready' && Boolean(state.data.kaizenExperiment)

  const steps = useMemo<StepperStep[]>(
    () => [
      {
        id: 'connect',
        title: 'Connect Account',
        description: 'Connect your account to confirm this onboarding is intentional and grounded in real data.',
        content: (
          <ConnectStep
            connectState={state.data.connectState}
            isConnecting={state.isConnecting}
            isSaving={state.isSaving}
            onStartConnect={() => startConnection('n2f')}
            onRefreshStatus={refreshConnectStatus}
          />
        ),
      },
      {
        id: 'seed',
        title: 'Define the Seed',
        description: 'Write your starting point and core identity in enough depth to be useful.',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Core identity"
              placeholder="Who are you right now at your core?"
              value={state.data.seed.coreIdentity}
              onChange={(event) => updateSeed({ ...state.data.seed, coreIdentity: event.target.value })}
            />
            <Input
              label="Starting point"
              placeholder="What context or season are you starting from?"
              value={state.data.seed.startingPoint}
              onChange={(event) => updateSeed({ ...state.data.seed, startingPoint: event.target.value })}
            />
            <Textarea
              label="Narrative"
              placeholder="Describe your current reality, constraints, and why this chapter matters now."
              rows={8}
              value={state.data.seed.narrative}
              onChange={(event) => updateSeed({ ...state.data.seed, narrative: event.target.value })}
            />
            <ValidationList errors={state.data.stepValidation.seed.errors} />
          </div>
        ),
      },
      {
        id: 'student',
        title: 'Define the Student',
        description: 'Describe the person you are becoming, with a clear horizon and practical stakes.',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Who are you becoming"
              placeholder="State the identity you are building toward."
              value={state.data.student.becoming}
              onChange={(event) => updateStudent({ ...state.data.student, becoming: event.target.value })}
            />
            <Select
              label="Horizon"
              value={state.data.student.horizon}
              onChange={(event) => updateStudent({ ...state.data.student, horizon: event.target.value })}
              options={[
                { value: '', label: 'Select horizon' },
                { value: '90_days', label: '90 days' },
                { value: '1_year', label: '1 year' },
                { value: '3_year', label: '3 years' },
                { value: '5_year', label: '5 years' },
              ]}
            />
            <Textarea
              label="Narrative"
              placeholder="Explain what skills, habits, and standards this future self requires."
              rows={8}
              value={state.data.student.narrative}
              onChange={(event) => updateStudent({ ...state.data.student, narrative: event.target.value })}
            />
            <ValidationList errors={state.data.stepValidation.student.errors} />
          </div>
        ),
      },
      {
        id: 'gaze',
        title: 'Define the Gaze',
        description: 'Reflect deeply on your desires and tensions. This drives synthesis of your Kaizen Experiment.',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Textarea
              label="Desires"
              placeholder="Write what you want, why you want it, and what must become true."
              rows={8}
              value={state.data.gaze.desires}
              onChange={(event) => updateGaze({ ...state.data.gaze, desires: event.target.value })}
            />
            <Textarea
              label="Reflection"
              placeholder="Reflect on tradeoffs, fear, resistance, and what you are willing to commit to."
              rows={8}
              value={state.data.gaze.reflection}
              onChange={(event) => updateGaze({ ...state.data.gaze, reflection: event.target.value })}
            />
            <ValidationList errors={state.data.stepValidation.gaze.errors} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Synthesis is required before final completion.
              </p>
              <Button
                variant="secondary"
                onClick={synthesizeExperiment}
                disabled={!canSynthesize || state.isSynthesizing}
              >
                {state.isSynthesizing ? 'Synthesizing...' : 'Synthesize Kaizen Experiment'}
              </Button>
            </div>

            {state.data.kaizenExperiment ? (
              <div
                style={{
                  border: '1px solid var(--color-sage-border-light)',
                  borderRadius: 12,
                  background: 'var(--color-bg)',
                  padding: 'var(--space-4)',
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-text-primary)' }}>Kaizen Experiment Draft</h3>
                <pre
                  style={{
                    margin: 'var(--space-3) 0 0',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {JSON.stringify(state.data.kaizenExperiment, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        ),
      },
    ],
    [
      canSynthesize,
      refreshConnectStatus,
      startConnection,
      state.data.connectState,
      state.data.gaze,
      state.data.kaizenExperiment,
      state.data.seed,
      state.data.stepValidation.gaze.errors,
      state.data.stepValidation.seed.errors,
      state.data.stepValidation.student.errors,
      state.data.student,
      state.isConnecting,
      state.isSaving,
      state.isSynthesizing,
      synthesizeExperiment,
      updateGaze,
      updateSeed,
      updateStudent,
    ]
  )

  const isWorking = state.isSaving || state.isConnecting || state.isSynthesizing

  const isNextDisabled =
    !currentValidation.isValid ||
    (currentStepName === 'gaze' && !synthesisReady) ||
    (state.data.currentStep < 3 && !canAdvanceTo(state.data.currentStep + 1)) ||
    isWorking

  if (state.isLoading) {
    return (
      <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '0 var(--space-6)' }}>
        <div className="flex items-center justify-center" style={{ minHeight: '360px', color: 'var(--color-text-secondary)' }}>
          Loading onboarding...
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '0 var(--space-6)' }}>
      {state.error ? (
        <div
          style={{
            marginBottom: 'var(--space-4)',
            borderRadius: 10,
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(220, 38, 38, 0.08)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-critical)' }}>{state.error}</p>
          <button
            type="button"
            style={{
              border: 0,
              background: 'transparent',
              color: 'var(--color-critical)',
              cursor: 'pointer',
              fontSize: 13,
            }}
            onClick={clearError}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <ReactBitsStepper
        steps={steps}
        currentStep={state.data.currentStep}
        onStepChange={async (step) => {
          if (step > state.data.currentStep && !canAdvanceTo(step)) {
            return
          }
          await setCurrentStep(step)
        }}
        onFinalStepCompleted={async () => {
          try {
            await completeOnboarding()
            navigate('/', { replace: true })
          } catch {
            // Error state is surfaced by the hook; keep user on this step.
          }
        }}
        isNextDisabled={isNextDisabled}
        isWorking={isWorking}
        nextButtonText="Continue"
        finalButtonText="Finish onboarding"
      />
    </div>
  )
}
