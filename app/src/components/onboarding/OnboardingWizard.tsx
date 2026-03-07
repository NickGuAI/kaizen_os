import { useOnboarding } from './hooks/useOnboarding'
import { OnboardingProgress } from './OnboardingProgress'
import {
  WelcomeStep,
  ConnectStep,
  ReflectStep,
  SeasonStep,
  ThemeStep,
  GateStep,
  RoutineStep,
  ExperimentStep,
  CompleteStep,
} from './steps'
import { useUserSettings } from '../../hooks/useUserSettings'

export function OnboardingWizard() {
  const {
    state,
    currentStepName,
    skipStep,
    completeStep,
    createTheme,
    createAction,
    refetchThemes,
    analyzeCalendar,
    setJournalText,
    setJournalFile,
    setSeason,
    prevStep,
  } = useOnboarding()

  const { data: settings } = useUserSettings()
  const defaultLagWeeks = settings?.defaultLagWeeks ?? 6

  if (state.isLoading) {
    return (
      <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto', padding: '0 var(--space-6)' }}>
        <div
          className="flex items-center justify-center"
          style={{ minHeight: '400px', color: 'var(--color-text-secondary)' }}
        >
          Loading...
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStepName) {
      case 'welcome':
        return (
          <WelcomeStep
            onNext={() => {
              completeStep()
            }}
          />
        )

      case 'connect':
        return (
          <ConnectStep
            onNext={() => completeStep()}
            onSkip={skipStep}
          />
        )

      case 'reflect':
        return (
          <ReflectStep
            journalText={state.journalText}
            journalFile={state.journalFile}
            onTextChange={setJournalText}
            onFileChange={setJournalFile}
            onNext={() => completeStep()}
            onSkip={skipStep}
            onAnalyze={analyzeCalendar}
            isAnalyzing={state.isAnalyzing}
            hasCalendarConnected={state.hasCalendarConnected}
          />
        )

      case 'season':
        return (
          <SeasonStep
            season={state.season}
            onUpdate={setSeason}
            onNext={() => completeStep()}
            onBack={prevStep}
          />
        )

      case 'themes':
        return (
          <ThemeStep
            createdThemes={state.createdThemes}
            suggestions={state.suggestions}
            onCreateTheme={createTheme}
            onNext={(entityIds) => {
              refetchThemes()
              completeStep(entityIds)
            }}
            onSkip={skipStep}
          />
        )

      case 'gates':
        return (
          <GateStep
            themes={state.createdThemes}
            suggestions={state.suggestions}
            onCreateAction={(type, parentId, data) => createAction(type, parentId, data)}
            onNext={(entityIds) => completeStep(entityIds)}
            onSkip={skipStep}
          />
        )

      case 'routines':
        return (
          <RoutineStep
            themes={state.createdThemes}
            suggestions={state.suggestions}
            onCreateAction={(type, parentId, data) => createAction(type, parentId, data)}
            onNext={(entityIds) => completeStep(entityIds)}
            onSkip={skipStep}
          />
        )

      case 'experiments':
        return (
          <ExperimentStep
            themes={state.createdThemes}
            defaultLagWeeks={defaultLagWeeks}
            onCreateAction={(type, parentId, data) => createAction(type, parentId, data)}
            onNext={(entityIds) => completeStep(entityIds)}
            onSkip={skipStep}
          />
        )

      case 'complete':
        return (
          <CompleteStep
            progress={state.progress}
            themesCount={state.createdThemes.length}
            season={state.season}
            onComplete={() => {
              completeStep()
            }}
          />
        )

      default:
        return null
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto', padding: '0 var(--space-6)' }}>
      <OnboardingProgress currentStep={state.currentStep} progress={state.progress} />
      <div style={{ minHeight: '500px' }}>{renderStep()}</div>
    </div>
  )
}
