import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper, StepperStep } from '../ui/Stepper'
import { useOnboarding } from './hooks/useOnboarding'
import { ConnectStep, GazeStep, SeedStep, StudentStep } from './steps'

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
          <SeedStep
            value={state.data.seed}
            errors={state.data.stepValidation.seed.errors}
            onChange={updateSeed}
          />
        ),
      },
      {
        id: 'student',
        title: 'Define the Student',
        description: 'Describe the person you are becoming, with a clear horizon and practical stakes.',
        content: (
          <StudentStep
            value={state.data.student}
            errors={state.data.stepValidation.student.errors}
            onChange={updateStudent}
          />
        ),
      },
      {
        id: 'gaze',
        title: 'Define the Gaze',
        description: 'Reflect deeply on your desires and tensions. This drives synthesis of your Kaizen Experiment.',
        content: (
          <GazeStep
            value={state.data.gaze}
            errors={state.data.stepValidation.gaze.errors}
            canSynthesize={canSynthesize}
            isSynthesizing={state.isSynthesizing}
            kaizenExperiment={state.data.kaizenExperiment}
            onChange={updateGaze}
            onSynthesize={synthesizeExperiment}
          />
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

      <Stepper
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
