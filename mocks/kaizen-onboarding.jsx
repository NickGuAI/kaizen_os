import React, { useState, useEffect } from 'react';

// Kaizen OS Onboarding - Zen Design System (Noguchi Edition)
// A contemplative journey through personal operating system setup

const KaizenOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(true);
  
  // User data state
  const [userData, setUserData] = useState({
    googleConnected: false,
    calendarAnalyzing: false,
    calendarAnalyzed: false,
    journalText: '',
    journalFile: null,
    season: {
      name: '',
      startDate: '',
      endDate: '',
      weeks: 13,
      intention: '',
    },
    themes: [],
    gates: [],
    routines: [],
    experiments: [],
    skipExperiments: false,
  });

  // Suggested data from analysis
  const [suggestions, setSuggestions] = useState({
    themes: [],
    gates: [],
    routines: [],
  });

  const steps = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'connect', label: 'Connect' },
    { id: 'reflect', label: 'Reflect' },
    { id: 'season', label: 'Season' },
    { id: 'themes', label: 'Themes' },
    { id: 'gates', label: 'Gates' },
    { id: 'routines', label: 'Routines' },
    { id: 'experiments', label: 'Experiments' },
    { id: 'complete', label: 'Begin' },
  ];

  const handleTransition = (nextStep) => {
    setAnimateIn(false);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setAnimateIn(true);
    }, 300);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      handleTransition(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      handleTransition(currentStep - 1);
    }
  };

  const skipToStep = (stepId) => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index !== -1) {
      handleTransition(index);
    }
  };

  // Simulate Google Calendar connection
  const connectGoogle = async () => {
    setIsLoading(true);
    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500));
    setUserData(prev => ({ ...prev, googleConnected: true }));
    setIsLoading(false);
  };

  // Simulate calendar analysis
  const analyzeCalendar = async () => {
    setUserData(prev => ({ ...prev, calendarAnalyzing: true }));
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulated suggestions from calendar analysis
    setSuggestions({
      themes: [
        { id: 1, name: 'Health & Wellness', description: 'Regular gym sessions and health appointments detected', icon: '🌿' },
        { id: 2, name: 'Career Growth', description: 'Frequent meetings and professional development events', icon: '📈' },
        { id: 3, name: 'Family & Relationships', description: 'Family dinners and social gatherings', icon: '💝' },
      ],
      gates: [
        { id: 1, title: 'Complete Q1 Performance Review', theme: 'Career Growth', deadline: '2026-03-31' },
        { id: 2, title: 'Annual Health Checkup', theme: 'Health & Wellness', deadline: '2026-02-28' },
      ],
      routines: [
        { id: 1, title: 'Morning Workout', frequency: '3x per week', theme: 'Health & Wellness' },
        { id: 2, title: 'Weekly Team Sync', frequency: 'Every Monday', theme: 'Career Growth' },
      ],
    });
    
    setUserData(prev => ({ 
      ...prev, 
      calendarAnalyzing: false, 
      calendarAnalyzed: true 
    }));
  };

  // Render step content
  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'welcome':
        return <WelcomeStep onNext={nextStep} />;
      case 'connect':
        return (
          <ConnectStep 
            userData={userData}
            isLoading={isLoading}
            onConnect={connectGoogle}
            onAnalyze={analyzeCalendar}
            onNext={nextStep}
            onSkip={() => skipToStep('reflect')}
          />
        );
      case 'reflect':
        return (
          <ReflectStep 
            userData={userData}
            setUserData={setUserData}
            onNext={nextStep}
            onSkip={nextStep}
          />
        );
      case 'season':
        return (
          <SeasonStep 
            userData={userData}
            setUserData={setUserData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'themes':
        return (
          <ThemesStep 
            userData={userData}
            setUserData={setUserData}
            suggestions={suggestions}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'gates':
        return (
          <GatesStep 
            userData={userData}
            setUserData={setUserData}
            suggestions={suggestions}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'routines':
        return (
          <RoutinesStep 
            userData={userData}
            setUserData={setUserData}
            suggestions={suggestions}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 'experiments':
        return (
          <ExperimentsStep 
            userData={userData}
            setUserData={setUserData}
            onNext={nextStep}
            onBack={prevStep}
            onSkip={() => {
              setUserData(prev => ({ ...prev, skipExperiments: true }));
              nextStep();
            }}
          />
        );
      case 'complete':
        return <CompleteStep userData={userData} />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Subtle background texture */}
      <div style={styles.backgroundTexture} />
      
      {/* Progress indicator */}
      <ProgressIndicator 
        steps={steps} 
        currentStep={currentStep} 
        onStepClick={(index) => index <= currentStep && handleTransition(index)}
      />
      
      {/* Main content area */}
      <main style={{
        ...styles.mainContent,
        opacity: animateIn ? 1 : 0,
        transform: animateIn ? 'translateY(0)' : 'translateY(12px)',
      }}>
        {renderStep()}
      </main>
      
      {/* Bottom decorative element */}
      <div style={styles.bottomDecoration} />
    </div>
  );
};

// ============================================
// STEP COMPONENTS
// ============================================

const WelcomeStep = ({ onNext }) => (
  <div style={styles.stepContainer}>
    {/* Kaizen logo mark */}
    <div style={styles.logoMark}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <path 
          d="M32 8L52 20V44L32 56L12 44V20L32 8Z" 
          stroke="#8B9467" 
          strokeWidth="1.5" 
          fill="none"
        />
        <path 
          d="M32 20L44 27V41L32 48L20 41V27L32 20Z" 
          stroke="#8B9467" 
          strokeWidth="1.5" 
          fill="rgba(139, 148, 103, 0.1)"
        />
        <circle cx="32" cy="34" r="4" fill="#8B9467" />
      </svg>
    </div>
    
    <h1 style={styles.welcomeTitle}>Welcome to Kaizen OS</h1>
    
    <p style={styles.welcomeSubtitle}>
      A personal operating system for continuous improvement.
      <br />
      We'll guide you through setting up your life's architecture.
    </p>
    
    <div style={styles.conceptList}>
      <ConceptItem 
        term="Seasons" 
        description="Your planning cycles — focused periods for growth (recommended: 13 weeks)"
        delay={0}
      />
      <ConceptItem 
        term="Themes" 
        description="The areas of life you want to nurture"
        delay={50}
      />
      <ConceptItem 
        term="Gates" 
        description="Commitments you must complete — your non-negotiables"
        delay={100}
      />
      <ConceptItem 
        term="Routines" 
        description="Regular practices that shape your days"
        delay={150}
      />
      <ConceptItem 
        term="Experiments" 
        description="Optional hypotheses to test and learn from"
        delay={200}
      />
      <ConceptItem 
        term="Ops" 
        description="Tasks that simply need to get done"
        delay={250}
      />
    </div>
    
    <button style={styles.primaryButton} onClick={onNext}>
      Begin Setup
    </button>
  </div>
);

const ConceptItem = ({ term, description, delay }) => (
  <div style={{ ...styles.conceptItem, animationDelay: `${delay}ms` }}>
    <div style={styles.conceptBar} />
    <div>
      <span style={styles.conceptTerm}>{term}</span>
      <span style={styles.conceptDash}> — </span>
      <span style={styles.conceptDescription}>{description}</span>
    </div>
  </div>
);

const ConnectStep = ({ userData, isLoading, onConnect, onAnalyze, onNext, onSkip }) => (
  <div style={styles.stepContainer}>
    <div style={styles.stepIcon}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="#8B9467" strokeWidth="1.5" fill="none" />
        <path d="M24 14V24L30 28" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
    
    <h2 style={styles.stepTitle}>Connect Your Calendar</h2>
    
    <p style={styles.stepDescription}>
      By connecting your Google Calendar, we can analyze your activities and events 
      to suggest personalized themes, commitments, and routines. This helps us understand 
      your life's rhythm.
    </p>
    
    {!userData.googleConnected ? (
      <div style={styles.connectCard}>
        <div style={styles.googleIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>
        <div style={styles.connectInfo}>
          <h3 style={styles.connectTitle}>Google Calendar</h3>
          <p style={styles.connectMeta}>Read-only access to your events</p>
        </div>
        <button 
          style={isLoading ? styles.secondaryButtonLoading : styles.secondaryButton}
          onClick={onConnect}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    ) : !userData.calendarAnalyzed ? (
      <div style={styles.connectCard}>
        <div style={styles.connectedBadge}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13 4L6 11L3 8" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Connected
        </div>
        <p style={styles.analyzePrompt}>
          Your calendar is connected. We can now analyze your patterns to generate personalized suggestions.
        </p>
        <button 
          style={userData.calendarAnalyzing ? styles.primaryButtonLoading : styles.primaryButton}
          onClick={onAnalyze}
          disabled={userData.calendarAnalyzing}
        >
          {userData.calendarAnalyzing ? (
            <span style={styles.loadingText}>
              <span style={styles.breathingDot} />
              Analyzing patterns...
            </span>
          ) : 'Analyze My Calendar'}
        </button>
      </div>
    ) : (
      <div style={styles.successCard}>
        <div style={styles.successIcon}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#27AE60" strokeWidth="1.5" fill="rgba(39, 174, 96, 0.08)" />
            <path d="M22 11L14 19L10 15" stroke="#27AE60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 style={styles.successTitle}>Analysis Complete</h3>
        <p style={styles.successDescription}>
          We found patterns in your calendar and have prepared suggestions for your themes, gates, and routines.
        </p>
      </div>
    )}
    
    <div style={styles.buttonRow}>
      <button style={styles.ghostButton} onClick={onSkip}>
        Skip for now
      </button>
      {(userData.calendarAnalyzed || !userData.googleConnected) && (
        <button style={styles.primaryButton} onClick={onNext}>
          Continue
        </button>
      )}
    </div>
  </div>
);

const ReflectStep = ({ userData, setUserData, onNext, onSkip }) => {
  const [inputMode, setInputMode] = useState('text'); // 'text', 'file'
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserData(prev => ({ ...prev, journalFile: file }));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUserData(prev => ({ ...prev, journalFile: file }));
    }
  };

  return (
    <div style={styles.stepContainer}>
      <div style={styles.stepIcon}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="10" y="8" width="28" height="32" rx="2" stroke="#8B9467" strokeWidth="1.5" fill="none" />
          <line x1="16" y1="16" x2="32" y2="16" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="22" x2="28" y2="22" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="28" x2="30" y2="28" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      
      <h2 style={styles.stepTitle}>Share Your Reflections</h2>
      
      <p style={styles.stepDescription}>
        If you have any journals, reflections, or notes about your goals and aspirations, 
        share them here. We'll use your words to understand what matters most to you.
      </p>
      
      <p style={styles.stepHint}>
        This is optional but helps us create more meaningful suggestions.
      </p>
      
      {/* Input mode toggle */}
      <div style={styles.modeToggle}>
        <button 
          style={inputMode === 'text' ? styles.modeButtonActive : styles.modeButton}
          onClick={() => setInputMode('text')}
        >
          Write or Paste
        </button>
        <button 
          style={inputMode === 'file' ? styles.modeButtonActive : styles.modeButton}
          onClick={() => setInputMode('file')}
        >
          Upload File
        </button>
      </div>
      
      {inputMode === 'text' ? (
        <textarea
          style={styles.reflectionTextarea}
          placeholder="Share your thoughts, goals, reflections, or journal entries...

You can write freely here, paste from a document, or use markdown formatting. We'll read between the lines to understand your priorities and aspirations."
          value={userData.journalText}
          onChange={(e) => setUserData(prev => ({ ...prev, journalText: e.target.value }))}
        />
      ) : (
        <div 
          style={{
            ...styles.dropZone,
            ...(dragOver ? styles.dropZoneActive : {}),
            ...(userData.journalFile ? styles.dropZoneSuccess : {})
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {userData.journalFile ? (
            <div style={styles.fileUploaded}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#8B9467" strokeWidth="1.5" fill="none"/>
                <polyline points="14,2 14,8 20,8" stroke="#8B9467" strokeWidth="1.5"/>
              </svg>
              <span style={styles.fileName}>{userData.journalFile.name}</span>
              <button 
                style={styles.removeFileButton}
                onClick={() => setUserData(prev => ({ ...prev, journalFile: null }))}
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M20 8V26M12 18L20 10L28 18" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 28V30C8 31.1 8.9 32 10 32H30C31.1 32 32 31.1 32 30V28" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p style={styles.dropText}>Drop your file here</p>
              <p style={styles.dropSubtext}>or click to browse</p>
              <p style={styles.dropFormats}>Supports .txt, .md, .pdf, .doc</p>
              <input 
                type="file" 
                style={styles.fileInput}
                accept=".txt,.md,.pdf,.doc,.docx"
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>
      )}
      
      <div style={styles.buttonRow}>
        <button style={styles.ghostButton} onClick={onSkip}>
          Skip this step
        </button>
        <button style={styles.primaryButton} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
};

const SeasonStep = ({ userData, setUserData, onNext, onBack }) => {
  const [customWeeks, setCustomWeeks] = useState(false);
  
  // Calculate end date based on start date and weeks
  const calculateEndDate = (startDate, weeks) => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + (weeks * 7) - 1);
    return end.toISOString().split('T')[0];
  };
  
  // Update season data
  const updateSeason = (field, value) => {
    setUserData(prev => {
      const newSeason = { ...prev.season, [field]: value };
      
      // Auto-calculate end date when start date or weeks change
      if (field === 'startDate' || field === 'weeks') {
        const startDate = field === 'startDate' ? value : prev.season.startDate;
        const weeks = field === 'weeks' ? value : prev.season.weeks;
        if (startDate && weeks) {
          newSeason.endDate = calculateEndDate(startDate, weeks);
        }
      }
      
      return { ...prev, season: newSeason };
    });
  };
  
  // Preset season options
  const presetSeasons = [
    { name: 'Q1 2026', start: '2026-01-01', weeks: 13 },
    { name: 'Q2 2026', start: '2026-04-01', weeks: 13 },
    { name: 'Spring 2026', start: '2026-03-20', weeks: 13 },
    { name: 'Summer 2026', start: '2026-06-21', weeks: 13 },
  ];
  
  const selectPreset = (preset) => {
    setUserData(prev => ({
      ...prev,
      season: {
        ...prev.season,
        name: preset.name,
        startDate: preset.start,
        weeks: preset.weeks,
        endDate: calculateEndDate(preset.start, preset.weeks),
      }
    }));
  };
  
  // Get today's date for default
  const today = new Date().toISOString().split('T')[0];
  
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={styles.stepContainer}>
      <div style={styles.stepIcon}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="18" stroke="#8B9467" strokeWidth="1.5" fill="none" />
          <path d="M24 12V24L32 28" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="24" r="3" fill="#8B9467" />
          {/* Season arc segments */}
          <path d="M24 6A18 18 0 0 1 42 24" stroke="#8B9467" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        </svg>
      </div>
      
      <h2 style={styles.stepTitle}>Define Your Season</h2>
      
      <div style={styles.conceptExplainer}>
        <div style={styles.conceptExplainerIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#8B9467" strokeWidth="1.5" fill="none"/>
            <path d="M12 6V12L16 14" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h4 style={styles.conceptExplainerTitle}>Seasons are your planning cycles</h4>
          <p style={styles.conceptExplainerText}>
            A season is a focused period for working toward your goals — like a quarter, 
            but personalized to your rhythm. We recommend <strong>13 weeks</strong> as 
            it's long enough for meaningful progress, short enough to stay focused.
          </p>
        </div>
      </div>
      
      {/* Quick presets */}
      <div style={styles.seasonPresets}>
        <p style={styles.presetLabel}>Quick start with a preset:</p>
        <div style={styles.presetGrid}>
          {presetSeasons.map(preset => (
            <button
              key={preset.name}
              style={{
                ...styles.presetButton,
                ...(userData.season.name === preset.name ? styles.presetButtonActive : {})
              }}
              onClick={() => selectPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
      
      <div style={styles.dividerOr}>
        <span>or customize</span>
      </div>
      
      {/* Custom season form */}
      <div style={styles.seasonForm}>
        <div style={styles.formSection}>
          <div style={styles.formLabel}>Season Name</div>
          <input
            type="text"
            style={styles.inputEnclosed}
            placeholder="e.g., 'New Year Reset', 'Q1 2026', 'Spring Renewal'"
            value={userData.season.name}
            onChange={(e) => updateSeason('name', e.target.value)}
          />
        </div>
        
        <div style={styles.formRow}>
          <div style={styles.formRowItem}>
            <div style={styles.formLabel}>Start Date</div>
            <input
              type="date"
              style={styles.inputEnclosed}
              value={userData.season.startDate}
              onChange={(e) => updateSeason('startDate', e.target.value)}
            />
          </div>
          <div style={styles.formRowItem}>
            <div style={styles.formLabel}>Duration</div>
            <div style={styles.weeksSelector}>
              <button
                style={userData.season.weeks === 13 ? styles.weekOptionActive : styles.weekOption}
                onClick={() => updateSeason('weeks', 13)}
              >
                13 weeks
              </button>
              <button
                style={userData.season.weeks === 12 ? styles.weekOptionActive : styles.weekOption}
                onClick={() => updateSeason('weeks', 12)}
              >
                12 weeks
              </button>
              <button
                style={![12, 13].includes(userData.season.weeks) ? styles.weekOptionActive : styles.weekOption}
                onClick={() => setCustomWeeks(true)}
              >
                Custom
              </button>
            </div>
            {customWeeks && (
              <div style={styles.customWeeksInput}>
                <input
                  type="number"
                  style={{ ...styles.inputEnclosed, width: '80px' }}
                  min="1"
                  max="52"
                  value={userData.season.weeks}
                  onChange={(e) => updateSeason('weeks', parseInt(e.target.value) || 13)}
                />
                <span style={styles.unitLabel}>weeks</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Season preview */}
        {userData.season.startDate && userData.season.weeks && (
          <div style={styles.seasonPreview}>
            <div style={styles.seasonPreviewIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="14" rx="2" stroke="#8B9467" strokeWidth="1.5" fill="none"/>
                <path d="M2 8H18" stroke="#8B9467" strokeWidth="1.5"/>
                <path d="M6 2V6M14 2V6" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={styles.seasonPreviewContent}>
              <span style={styles.seasonPreviewLabel}>Your season runs</span>
              <span style={styles.seasonPreviewDates}>
                {formatDate(userData.season.startDate)} → {formatDate(userData.season.endDate)}
              </span>
              <span style={styles.seasonPreviewWeeks}>
                {userData.season.weeks} weeks · {userData.season.weeks * 7} days
              </span>
            </div>
          </div>
        )}
        
        <div style={styles.formSection}>
          <div style={styles.formLabel}>Season Intention (optional)</div>
          <p style={styles.formHint}>A guiding phrase or focus for this season.</p>
          <input
            type="text"
            style={styles.inputEnclosed}
            placeholder="e.g., 'Build momentum', 'Simplify and focus', 'Launch and learn'"
            value={userData.season.intention}
            onChange={(e) => updateSeason('intention', e.target.value)}
          />
        </div>
      </div>
      
      <div style={styles.buttonRow}>
        <button style={styles.ghostButton} onClick={onBack}>
          Back
        </button>
        <button 
          style={userData.season.name && userData.season.startDate ? styles.primaryButton : styles.primaryButtonDisabled}
          onClick={onNext}
          disabled={!userData.season.name || !userData.season.startDate}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const ThemesStep = ({ userData, setUserData, suggestions, onNext, onBack }) => {
  const [customTheme, setCustomTheme] = useState({ name: '', description: '' });
  const [showCustomForm, setShowCustomForm] = useState(false);

  const toggleTheme = (theme) => {
    setUserData(prev => {
      const exists = prev.themes.find(t => t.id === theme.id);
      if (exists) {
        return { ...prev, themes: prev.themes.filter(t => t.id !== theme.id) };
      }
      return { ...prev, themes: [...prev.themes, theme] };
    });
  };

  const addCustomTheme = () => {
    if (customTheme.name.trim()) {
      const newTheme = {
        id: `custom-${Date.now()}`,
        name: customTheme.name,
        description: customTheme.description,
        icon: '✨',
        custom: true,
      };
      setUserData(prev => ({ ...prev, themes: [...prev.themes, newTheme] }));
      setCustomTheme({ name: '', description: '' });
      setShowCustomForm(false);
    }
  };

  const defaultThemes = [
    { id: 'd1', name: 'Health & Wellness', description: 'Physical and mental wellbeing', icon: '🌿' },
    { id: 'd2', name: 'Career & Work', description: 'Professional growth and achievement', icon: '💼' },
    { id: 'd3', name: 'Relationships', description: 'Connections with family and friends', icon: '💝' },
    { id: 'd4', name: 'Personal Growth', description: 'Learning and self-improvement', icon: '🌱' },
    { id: 'd5', name: 'Finances', description: 'Financial health and security', icon: '💰' },
    { id: 'd6', name: 'Creativity', description: 'Artistic expression and creation', icon: '🎨' },
    { id: 'd7', name: 'Life Admin', description: 'Home, errands, and logistics', icon: '🏠' },
    { id: 'd8', name: 'Adventure', description: 'Travel and new experiences', icon: '🗺️' },
  ];

  const allThemes = suggestions.themes.length > 0 
    ? [...suggestions.themes, ...defaultThemes.filter(d => !suggestions.themes.find(s => s.name === d.name))]
    : defaultThemes;

  return (
    <div style={styles.stepContainer}>
      <h2 style={styles.stepTitle}>Choose Your Themes</h2>
      
      <p style={styles.stepDescription}>
        Themes are the areas of life you want to focus on. Select the ones that 
        resonate with your current priorities.
      </p>
      
      {suggestions.themes.length > 0 && (
        <div style={styles.suggestionBadge}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L8.5 5L13 5.5L9.5 8.5L10.5 13L7 10.5L3.5 13L4.5 8.5L1 5.5L5.5 5L7 1Z" stroke="#8B9467" strokeWidth="1" fill="rgba(139, 148, 103, 0.2)"/>
          </svg>
          Personalized suggestions based on your calendar
        </div>
      )}
      
      <div style={styles.themeGrid}>
        {allThemes.map((theme, index) => {
          const isSelected = userData.themes.find(t => t.id === theme.id);
          const isSuggested = suggestions.themes.find(s => s.id === theme.id);
          
          return (
            <button
              key={theme.id}
              style={{
                ...styles.themeCard,
                ...(isSelected ? styles.themeCardSelected : {}),
                animationDelay: `${index * 50}ms`,
              }}
              onClick={() => toggleTheme(theme)}
            >
              {isSuggested && <div style={styles.suggestedDot} />}
              <span style={styles.themeIcon}>{theme.icon}</span>
              <span style={styles.themeName}>{theme.name}</span>
              <span style={styles.themeDescription}>{theme.description}</span>
            </button>
          );
        })}
        
        {/* Add custom theme button */}
        {!showCustomForm && (
          <button 
            style={styles.addThemeCard}
            onClick={() => setShowCustomForm(true)}
          >
            <span style={styles.addIcon}>+</span>
            <span style={styles.addText}>Add Your Own</span>
          </button>
        )}
      </div>
      
      {/* Custom theme form */}
      {showCustomForm && (
        <div style={styles.customThemeForm}>
          <input
            type="text"
            style={styles.inputEnclosed}
            placeholder="Theme name"
            value={customTheme.name}
            onChange={(e) => setCustomTheme(prev => ({ ...prev, name: e.target.value }))}
          />
          <input
            type="text"
            style={styles.inputEnclosed}
            placeholder="Brief description (optional)"
            value={customTheme.description}
            onChange={(e) => setCustomTheme(prev => ({ ...prev, description: e.target.value }))}
          />
          <div style={styles.customThemeActions}>
            <button style={styles.ghostButton} onClick={() => setShowCustomForm(false)}>
              Cancel
            </button>
            <button style={styles.secondaryButton} onClick={addCustomTheme}>
              Add Theme
            </button>
          </div>
        </div>
      )}
      
      <div style={styles.selectedCount}>
        {userData.themes.length} theme{userData.themes.length !== 1 ? 's' : ''} selected
      </div>
      
      <div style={styles.buttonRow}>
        <button style={styles.ghostButton} onClick={onBack}>
          Back
        </button>
        <button 
          style={userData.themes.length > 0 ? styles.primaryButton : styles.primaryButtonDisabled}
          onClick={onNext}
          disabled={userData.themes.length === 0}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

const GatesStep = ({ userData, setUserData, suggestions, onNext, onBack }) => {
  const [newGate, setNewGate] = useState({ 
    statement: '', 
    theme: '', 
    dueDate: '',
    criteria: [''],
    plannedHours: 0,
  });
  const [showForm, setShowForm] = useState(false);

  const addGate = () => {
    if (newGate.statement.trim()) {
      const gate = {
        id: `gate-${Date.now()}`,
        statement: newGate.statement,
        theme: newGate.theme,
        dueDate: newGate.dueDate,
        criteria: newGate.criteria.filter(c => c.trim()),
        plannedHours: newGate.plannedHours,
      };
      setUserData(prev => ({ ...prev, gates: [...prev.gates, gate] }));
      setNewGate({ statement: '', theme: '', dueDate: '', criteria: [''], plannedHours: 0 });
      setShowForm(false);
    }
  };

  const removeGate = (id) => {
    setUserData(prev => ({ ...prev, gates: prev.gates.filter(g => g.id !== id) }));
  };

  const addSuggestedGate = (gate) => {
    if (!userData.gates.find(g => g.id === gate.id)) {
      setUserData(prev => ({ ...prev, gates: [...prev.gates, gate] }));
    }
  };

  const addCriterion = () => {
    setNewGate(prev => ({ ...prev, criteria: [...prev.criteria, ''] }));
  };

  const updateCriterion = (index, value) => {
    setNewGate(prev => ({
      ...prev,
      criteria: prev.criteria.map((c, i) => i === index ? value : c)
    }));
  };

  const removeCriterion = (index) => {
    setNewGate(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  return (
    <div style={styles.stepContainer}>
      <h2 style={styles.stepTitle}>Define Your Gates</h2>
      
      <div style={styles.conceptExplainer}>
        <div style={styles.conceptExplainerIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#8B9467" strokeWidth="1.5" fill="none"/>
            <path d="M9 12L11 14L15 10" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h4 style={styles.conceptExplainerTitle}>Gates are commitments you must complete</h4>
          <p style={styles.conceptExplainerText}>
            Unlike experiments which are optional, gates are your non-negotiables — 
            deadlines, promises, and milestones that require completion. Each gate has 
            clear criteria that define when it's done.
          </p>
        </div>
      </div>
      
      {/* Suggested gates */}
      {suggestions.gates.length > 0 && (
        <div style={styles.suggestionsSection}>
          <h4 style={styles.suggestionsSectionTitle}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.5 5L13 5.5L9.5 8.5L10.5 13L7 10.5L3.5 13L4.5 8.5L1 5.5L5.5 5L7 1Z" stroke="#8B9467" strokeWidth="1" fill="rgba(139, 148, 103, 0.2)"/>
            </svg>
            Suggested from your calendar
          </h4>
          <div style={styles.suggestionsList}>
            {suggestions.gates.map(gate => {
              const isAdded = userData.gates.find(g => g.id === gate.id);
              return (
                <div key={gate.id} style={styles.suggestionItem}>
                  <div style={styles.suggestionContent}>
                    <span style={styles.suggestionTitle}>{gate.statement || gate.title}</span>
                    <span style={styles.suggestionMeta}>{gate.theme} · Due {gate.dueDate || gate.deadline}</span>
                  </div>
                  <button 
                    style={isAdded ? styles.addedButton : styles.addButton}
                    onClick={() => !isAdded && addSuggestedGate(gate)}
                  >
                    {isAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Current gates */}
      {userData.gates.length > 0 && (
        <div style={styles.currentItems}>
          <h4 style={styles.currentItemsTitle}>Your Gates</h4>
          {userData.gates.map(gate => (
            <div key={gate.id} style={styles.gateItemExpanded}>
              <div style={styles.gateHeader}>
                <div style={styles.gateIconSmall}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 21V8a2 2 0 012-2h2V3h2v3h6V3h2v3h2a2 2 0 012 2v13" stroke="#8B9467" strokeWidth="1.5" fill="none"/>
                    <path d="M8 14h8M8 18h5" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={styles.gateContent}>
                  <span style={styles.gateTitle}>{gate.statement || gate.title}</span>
                  <span style={styles.gateMeta}>
                    {gate.theme && `${gate.theme} · `}
                    {(gate.dueDate || gate.deadline) && `Due ${gate.dueDate || gate.deadline}`}
                  </span>
                </div>
                <button 
                  style={styles.removeButton}
                  onClick={() => removeGate(gate.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {gate.criteria && gate.criteria.length > 0 && (
                <div style={styles.gateCriteriaList}>
                  {gate.criteria.map((c, i) => (
                    <div key={i} style={styles.gateCriteriaItem}>
                      <span style={styles.criterionDot} />
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Add new gate form */}
      {showForm ? (
        <div style={styles.addFormExpanded}>
          <div style={styles.formSection}>
            <div style={styles.formLabel}>Statement</div>
            <input
              type="text"
              style={styles.inputEnclosed}
              placeholder="What this is. (e.g., 'Launch Kaizen MVP')"
              value={newGate.statement}
              onChange={(e) => setNewGate(prev => ({ ...prev, statement: e.target.value }))}
            />
          </div>
          
          <div style={styles.formRow}>
            <div style={styles.formRowItem}>
              <div style={styles.formLabel}>Theme</div>
              <select
                style={styles.selectEnclosed}
                value={newGate.theme}
                onChange={(e) => setNewGate(prev => ({ ...prev, theme: e.target.value }))}
              >
                <option value="">Select theme</option>
                {userData.themes.map(theme => (
                  <option key={theme.id} value={theme.name}>{theme.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.formRowItem}>
              <div style={styles.formLabel}>Due Date</div>
              <input
                type="date"
                style={styles.inputEnclosed}
                value={newGate.dueDate}
                onChange={(e) => setNewGate(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div style={styles.formSection}>
            <div style={styles.formLabel}>Criteria</div>
            <p style={styles.formHint}>The definition of done. How you know you've passed or failed.</p>
            <div style={styles.criteriaInputList}>
              {newGate.criteria.map((criterion, index) => (
                <div key={index} style={styles.criteriaInputRow}>
                  <span style={styles.criterionDot} />
                  <input
                    type="text"
                    style={styles.criteriaInput}
                    placeholder="Add criterion..."
                    value={criterion}
                    onChange={(e) => updateCriterion(index, e.target.value)}
                  />
                  {newGate.criteria.length > 1 && (
                    <button 
                      style={styles.removeCriterionButton}
                      onClick={() => removeCriterion(index)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M10 4L4 10M4 4L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button style={styles.addCriterionButton} onClick={addCriterion}>
              + Add Criterion
            </button>
          </div>
          
          <div style={styles.formSection}>
            <div style={styles.formLabel}>Allocation (optional)</div>
            <p style={styles.formHint}>Planned hours per week for this gate.</p>
            <input
              type="number"
              style={{ ...styles.inputEnclosed, width: '120px' }}
              min="0"
              value={newGate.plannedHours}
              onChange={(e) => setNewGate(prev => ({ ...prev, plannedHours: parseInt(e.target.value) || 0 }))}
            />
            <span style={styles.unitLabel}>hrs/week</span>
          </div>
          
          <div style={styles.formActions}>
            <button style={styles.ghostButton} onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button style={styles.primaryButton} onClick={addGate}>
              Create Gate
            </button>
          </div>
        </div>
      ) : (
        <button style={styles.addItemButton} onClick={() => setShowForm(true)}>
          <span style={styles.addItemIcon}>+</span>
          Add a Gate
        </button>
      )}
      
      <div style={styles.buttonRow}>
        <button style={styles.ghostButton} onClick={onBack}>
          Back
        </button>
        <button style={styles.primaryButton} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
};

const RoutinesStep = ({ userData, setUserData, suggestions, onNext, onBack }) => {
  const [newRoutine, setNewRoutine] = useState({ title: '', frequency: '', theme: '' });
  const [showForm, setShowForm] = useState(false);

  const addRoutine = () => {
    if (newRoutine.title.trim()) {
      const routine = {
        id: `routine-${Date.now()}`,
        ...newRoutine,
      };
      setUserData(prev => ({ ...prev, routines: [...prev.routines, routine] }));
      setNewRoutine({ title: '', frequency: '', theme: '' });
      setShowForm(false);
    }
  };

  const removeRoutine = (id) => {
    setUserData(prev => ({ ...prev, routines: prev.routines.filter(r => r.id !== id) }));
  };

  const addSuggestedRoutine = (routine) => {
    if (!userData.routines.find(r => r.id === routine.id)) {
      setUserData(prev => ({ ...prev, routines: [...prev.routines, routine] }));
    }
  };

  const frequencyOptions = [
    'Daily',
    'Every weekday',
    'Every weekend',
    '3x per week',
    '2x per week',
    'Weekly',
    'Bi-weekly',
    'Monthly',
  ];

  return (
    <div style={styles.stepContainer}>
      <h2 style={styles.stepTitle}>Establish Your Routines</h2>
      
      <p style={styles.stepDescription}>
        Routines are the regular practices that shape your days. They're the 
        habits and rituals you want to maintain consistently.
      </p>
      
      {/* Suggested routines */}
      {suggestions.routines.length > 0 && (
        <div style={styles.suggestionsSection}>
          <h4 style={styles.suggestionsSectionTitle}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.5 5L13 5.5L9.5 8.5L10.5 13L7 10.5L3.5 13L4.5 8.5L1 5.5L5.5 5L7 1Z" stroke="#8B9467" strokeWidth="1" fill="rgba(139, 148, 103, 0.2)"/>
            </svg>
            Patterns from your calendar
          </h4>
          <div style={styles.suggestionsList}>
            {suggestions.routines.map(routine => {
              const isAdded = userData.routines.find(r => r.id === routine.id);
              return (
                <div key={routine.id} style={styles.suggestionItem}>
                  <div style={styles.suggestionContent}>
                    <span style={styles.suggestionTitle}>{routine.title}</span>
                    <span style={styles.suggestionMeta}>{routine.frequency} · {routine.theme}</span>
                  </div>
                  <button 
                    style={isAdded ? styles.addedButton : styles.addButton}
                    onClick={() => !isAdded && addSuggestedRoutine(routine)}
                  >
                    {isAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Current routines */}
      {userData.routines.length > 0 && (
        <div style={styles.currentItems}>
          <h4 style={styles.currentItemsTitle}>Your Routines</h4>
          {userData.routines.map(routine => (
            <div key={routine.id} style={styles.gateItem}>
              <div style={styles.gateContent}>
                <span style={styles.gateTitle}>{routine.title}</span>
                <span style={styles.gateMeta}>
                  {routine.frequency}
                  {routine.theme && ` · ${routine.theme}`}
                </span>
              </div>
              <button 
                style={styles.removeButton}
                onClick={() => removeRoutine(routine.id)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Add new routine form */}
      {showForm ? (
        <div style={styles.addForm}>
          <input
            type="text"
            style={styles.inputEnclosed}
            placeholder="e.g., Morning meditation, Evening walk"
            value={newRoutine.title}
            onChange={(e) => setNewRoutine(prev => ({ ...prev, title: e.target.value }))}
          />
          <div style={styles.formRow}>
            <select
              style={styles.selectEnclosed}
              value={newRoutine.frequency}
              onChange={(e) => setNewRoutine(prev => ({ ...prev, frequency: e.target.value }))}
            >
              <option value="">How often?</option>
              {frequencyOptions.map(freq => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
            <select
              style={styles.selectEnclosed}
              value={newRoutine.theme}
              onChange={(e) => setNewRoutine(prev => ({ ...prev, theme: e.target.value }))}
            >
              <option value="">Select theme (optional)</option>
              {userData.themes.map(theme => (
                <option key={theme.id} value={theme.name}>{theme.name}</option>
              ))}
            </select>
          </div>
          <div style={styles.formActions}>
            <button style={styles.ghostButton} onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button style={styles.secondaryButton} onClick={addRoutine}>
              Add Routine
            </button>
          </div>
        </div>
      ) : (
        <button style={styles.addItemButton} onClick={() => setShowForm(true)}>
          <span style={styles.addItemIcon}>+</span>
          Add a Routine
        </button>
      )}
      
      <div style={styles.buttonRow}>
        <button style={styles.ghostButton} onClick={onBack}>
          Back
        </button>
        <button style={styles.primaryButton} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
};

const ExperimentsStep = ({ userData, setUserData, onNext, onBack, onSkip }) => {
  const [newExperiment, setNewExperiment] = useState({ 
    statement: '', 
    theme: '', 
    evaluationDate: '',
    criteria: [''],
    lagWeeks: 6,
    plannedHours: 0,
  });
  const [showForm, setShowForm] = useState(false);

  const addExperiment = () => {
    if (newExperiment.statement.trim()) {
      const experiment = {
        id: `exp-${Date.now()}`,
        statement: newExperiment.statement,
        theme: newExperiment.theme,
        evaluationDate: newExperiment.evaluationDate,
        criteria: newExperiment.criteria.filter(c => c.trim()),
        lagWeeks: newExperiment.lagWeeks,
        plannedHours: newExperiment.plannedHours,
      };
      setUserData(prev => ({ ...prev, experiments: [...prev.experiments, experiment] }));
      setNewExperiment({ statement: '', theme: '', evaluationDate: '', criteria: [''], lagWeeks: 6, plannedHours: 0 });
      setShowForm(false);
    }
  };

  const removeExperiment = (id) => {
    setUserData(prev => ({ ...prev, experiments: prev.experiments.filter(e => e.id !== id) }));
  };

  const addCriterion = () => {
    setNewExperiment(prev => ({ ...prev, criteria: [...prev.criteria, ''] }));
  };

  const updateCriterion = (index, value) => {
    setNewExperiment(prev => ({
      ...prev,
      criteria: prev.criteria.map((c, i) => i === index ? value : c)
    }));
  };

  const removeCriterion = (index) => {
    setNewExperiment(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  return (
    <div style={styles.stepContainer}>
      <div style={styles.optionalBadge}>Optional</div>
      
      <h2 style={styles.stepTitle}>Run Experiments</h2>
      
      <div style={styles.conceptExplainer}>
        <div style={styles.conceptExplainerIconExperiment}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 3H15M12 3V8M8 8H16L18 21H6L8 8Z" stroke="#C45B4D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="10" cy="14" r="1.5" fill="#C45B4D"/>
            <circle cx="14" cy="16" r="1" fill="#C45B4D"/>
          </svg>
        </div>
        <div>
          <h4 style={styles.conceptExplainerTitle}>Experiments are hypotheses you want to test</h4>
          <p style={styles.conceptExplainerText}>
            Unlike gates which are commitments, experiments are optional explorations. 
            They have a <strong>lag period</strong> — you should only start evaluating 
            results after this time has passed, giving changes time to take effect.
          </p>
        </div>
      </div>
      
      {/* Current experiments */}
      {userData.experiments.length > 0 && (
        <div style={styles.currentItems}>
          <h4 style={styles.currentItemsTitle}>Your Experiments</h4>
          {userData.experiments.map(exp => (
            <div key={exp.id} style={styles.experimentItemExpanded}>
              <div style={styles.gateHeader}>
                <div style={styles.experimentIconSmall}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 3H15M12 3V8M8 8H16L18 21H6L8 8Z" stroke="#C45B4D" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <div style={styles.gateContent}>
                  <span style={styles.gateTitle}>{exp.statement || exp.title}</span>
                  <span style={styles.gateMeta}>
                    {exp.theme && `${exp.theme} · `}
                    Evaluate after {exp.lagWeeks} weeks
                    {exp.evaluationDate && ` · ${exp.evaluationDate}`}
                  </span>
                </div>
                <button 
                  style={styles.removeButton}
                  onClick={() => removeExperiment(exp.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              {exp.criteria && exp.criteria.length > 0 && (
                <div style={styles.gateCriteriaList}>
                  {exp.criteria.map((c, i) => (
                    <div key={i} style={styles.gateCriteriaItem}>
                      <span style={styles.criterionDot} />
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Add new experiment form */}
      {showForm ? (
        <div style={styles.addFormExpanded}>
          <div style={styles.formSection}>
            <div style={styles.formLabel}>Statement</div>
            <input
              type="text"
              style={styles.inputEnclosed}
              placeholder="What this is. (e.g., 'Morning meditation routine')"
              value={newExperiment.statement}
              onChange={(e) => setNewExperiment(prev => ({ ...prev, statement: e.target.value }))}
            />
          </div>
          
          <div style={styles.formRow}>
            <div style={styles.formRowItem}>
              <div style={styles.formLabel}>Theme</div>
              <select
                style={styles.selectEnclosed}
                value={newExperiment.theme}
                onChange={(e) => setNewExperiment(prev => ({ ...prev, theme: e.target.value }))}
              >
                <option value="">Select theme</option>
                {userData.themes.map(theme => (
                  <option key={theme.id} value={theme.name}>{theme.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.formRowItem}>
              <div style={styles.formLabel}>Evaluation Date</div>
              <input
                type="date"
                style={styles.inputEnclosed}
                value={newExperiment.evaluationDate}
                onChange={(e) => setNewExperiment(prev => ({ ...prev, evaluationDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div style={styles.formSection}>
            <div style={styles.formLabel}>Criteria</div>
            <p style={styles.formHint}>The definition of done. How you know you've passed or failed.</p>
            <div style={styles.criteriaInputList}>
              {newExperiment.criteria.map((criterion, index) => (
                <div key={index} style={styles.criteriaInputRow}>
                  <span style={styles.criterionDot} />
                  <input
                    type="text"
                    style={styles.criteriaInput}
                    placeholder="Add criterion..."
                    value={criterion}
                    onChange={(e) => updateCriterion(index, e.target.value)}
                  />
                  {newExperiment.criteria.length > 1 && (
                    <button 
                      style={styles.removeCriterionButton}
                      onClick={() => removeCriterion(index)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M10 4L4 10M4 4L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button style={styles.addCriterionButton} onClick={addCriterion}>
              + Add Criterion
            </button>
          </div>
          
          {/* Experiment-only: Lag period */}
          <div style={styles.experimentOnlySection}>
            <div style={styles.experimentOnlyHeader}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v6l3 3" stroke="#C45B4D" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="7" cy="7" r="6" stroke="#C45B4D" strokeWidth="1.5" fill="none"/>
              </svg>
              <span style={styles.experimentOnlyLabel}>Experiment Only</span>
            </div>
            <div style={styles.formLabel}>Lag</div>
            <p style={styles.formHint}>How long you wait before judging the results (weeks).</p>
            <input
              type="number"
              style={{ ...styles.inputEnclosed, width: '100px' }}
              min="1"
              max="52"
              value={newExperiment.lagWeeks}
              onChange={(e) => setNewExperiment(prev => ({ ...prev, lagWeeks: parseInt(e.target.value) || 6 }))}
            />
            <span style={styles.unitLabel}>weeks</span>
          </div>
          
          <div style={styles.formSection}>
            <div style={styles.formLabel}>Allocation (optional)</div>
            <p style={styles.formHint}>Planned hours per week for this experiment.</p>
            <input
              type="number"
              style={{ ...styles.inputEnclosed, width: '120px' }}
              min="0"
              value={newExperiment.plannedHours}
              onChange={(e) => setNewExperiment(prev => ({ ...prev, plannedHours: parseInt(e.target.value) || 0 }))}
            />
            <span style={styles.unitLabel}>hrs/week</span>
          </div>
          
          <div style={styles.formActions}>
            <button style={styles.ghostButton} onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button style={styles.primaryButton} onClick={addExperiment}>
              Create Experiment
            </button>
          </div>
        </div>
      ) : (
        <button style={styles.addItemButton} onClick={() => setShowForm(true)}>
          <span style={styles.addItemIcon}>+</span>
          Add an Experiment
        </button>
      )}
      
      <div style={styles.buttonRow}>
        <button style={styles.ghostButton} onClick={onBack}>
          Back
        </button>
        <button style={styles.ghostButton} onClick={onSkip}>
          Skip for now
        </button>
        <button style={styles.primaryButton} onClick={onNext}>
          {userData.experiments.length > 0 ? 'Continue' : 'Continue without experiments'}
        </button>
      </div>
    </div>
  );
};

const CompleteStep = ({ userData }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={styles.stepContainer}>
      <div style={styles.completeIcon}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="#8B9467" strokeWidth="1.5" fill="rgba(139, 148, 103, 0.08)" />
          <path 
            d="M28 40L36 48L52 32" 
            stroke="#8B9467" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
      
      <h2 style={styles.completeTitle}>Your System is Ready</h2>
      
      <p style={styles.completeDescription}>
        You've laid the foundation for continuous improvement. 
        Here's what you've set up:
      </p>
      
      {/* Season banner */}
      {userData.season.name && (
        <div style={styles.seasonBanner}>
          <div style={styles.seasonBannerIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#8B9467" strokeWidth="1.5" fill="none"/>
              <path d="M12 6V12L16 14" stroke="#8B9467" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={styles.seasonBannerContent}>
            <span style={styles.seasonBannerName}>{userData.season.name}</span>
            <span style={styles.seasonBannerDates}>
              {formatDate(userData.season.startDate)} → {formatDate(userData.season.endDate)}
              {' · '}{userData.season.weeks} weeks
            </span>
            {userData.season.intention && (
              <span style={styles.seasonBannerIntention}>"{userData.season.intention}"</span>
            )}
          </div>
        </div>
      )}
      
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryNumber}>{userData.themes.length}</span>
          <span style={styles.summaryLabel}>Themes</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryNumber}>{userData.gates.length}</span>
          <span style={styles.summaryLabel}>Gates</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryNumber}>{userData.routines.length}</span>
          <span style={styles.summaryLabel}>Routines</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryNumber}>{userData.experiments.length}</span>
          <span style={styles.summaryLabel}>Experiments</span>
        </div>
      </div>
      
      <p style={styles.completeHint}>
        You can always adjust these later. Kaizen is about continuous, 
        incremental improvement — there's no need to be perfect from the start.
      </p>
      
      <button style={styles.primaryButtonLarge}>
        Enter Kaizen OS
      </button>
    </div>
  );
};

// ============================================
// PROGRESS INDICATOR
// ============================================

const ProgressIndicator = ({ steps, currentStep, onStepClick }) => (
  <div style={styles.progressContainer}>
    <div style={styles.progressTrack}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;
        
        return (
          <React.Fragment key={step.id}>
            <button
              style={{
                ...styles.progressDot,
                ...(isActive ? styles.progressDotActive : {}),
                ...(isComplete ? styles.progressDotComplete : {}),
              }}
              onClick={() => onStepClick(index)}
              title={step.label}
            >
              {isComplete && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            {index < steps.length - 1 && (
              <div style={{
                ...styles.progressLine,
                ...(isComplete ? styles.progressLineComplete : {}),
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
    {/* Only show label if not on welcome step */}
    {currentStep > 0 && (
      <div style={styles.progressLabel}>{steps[currentStep].label}</div>
    )}
  </div>
);

// ============================================
// STYLES
// ============================================

const styles = {
  container: {
    minHeight: '100vh',
    background: '#F5F1EB',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px',
    position: 'relative',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  
  backgroundTexture: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    opacity: 0.02,
    pointerEvents: 'none',
  },
  
  bottomDecoration: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '48px',
    height: '4px',
    background: 'rgba(139, 148, 103, 0.2)',
    borderRadius: '2px 2px 0 0',
  },
  
  // Progress indicator
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '48px',
  },
  
  progressTrack: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
  },
  
  progressDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: 'rgba(139, 148, 103, 0.15)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  progressDotActive: {
    width: '14px',
    height: '14px',
    background: '#8B9467',
    boxShadow: '0 0 0 4px rgba(139, 148, 103, 0.15)',
  },
  
  progressDotComplete: {
    background: '#8B9467',
  },
  
  progressLine: {
    width: '32px',
    height: '1px',
    background: 'rgba(139, 148, 103, 0.15)',
    transition: 'background 0.3s ease',
  },
  
  progressLineComplete: {
    background: '#8B9467',
  },
  
  progressLabel: {
    marginTop: '12px',
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#8B9467',
  },
  
  // Main content
  mainContent: {
    width: '100%',
    maxWidth: '520px',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
  },
  
  stepContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  
  // Welcome step
  logoMark: {
    marginBottom: '32px',
    animation: 'fadeInUp 0.6s ease-out',
  },
  
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  },
  
  welcomeSubtitle: {
    fontSize: '15px',
    color: '#666666',
    lineHeight: '1.7',
    marginBottom: '40px',
  },
  
  conceptList: {
    width: '100%',
    maxWidth: '400px',
    marginBottom: '40px',
  },
  
  conceptItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '14px 0',
    textAlign: 'left',
    borderBottom: '1px solid rgba(139, 148, 103, 0.08)',
    animation: 'fadeInUp 0.5s ease-out backwards',
  },
  
  conceptBar: {
    width: '3px',
    height: '20px',
    background: 'rgba(139, 148, 103, 0.3)',
    borderRadius: '2px',
    flexShrink: 0,
    marginTop: '2px',
  },
  
  conceptTerm: {
    fontWeight: '600',
    color: '#1A1A1A',
    fontSize: '14px',
  },
  
  conceptDash: {
    color: '#999999',
  },
  
  conceptDescription: {
    color: '#666666',
    fontSize: '14px',
  },
  
  // Step common
  stepIcon: {
    marginBottom: '24px',
    opacity: 0.9,
  },
  
  stepTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: '12px',
    letterSpacing: '-0.02em',
  },
  
  stepDescription: {
    fontSize: '15px',
    color: '#666666',
    lineHeight: '1.7',
    marginBottom: '16px',
    maxWidth: '440px',
  },
  
  stepHint: {
    fontSize: '13px',
    color: '#999999',
    marginBottom: '24px',
    fontStyle: 'italic',
  },
  
  // Buttons
  primaryButton: {
    background: 'linear-gradient(135deg, #8B9467 0%, #7A8558 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '2px 12px 2px 12px',
    padding: '14px 32px',
    fontSize: '14px',
    fontWeight: '500',
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
  },
  
  primaryButtonLarge: {
    background: 'linear-gradient(135deg, #8B9467 0%, #7A8558 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '2px 16px 2px 16px',
    padding: '18px 48px',
    fontSize: '15px',
    fontWeight: '500',
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
  },
  
  primaryButtonDisabled: {
    background: 'rgba(139, 148, 103, 0.3)',
    color: 'white',
    border: 'none',
    borderRadius: '2px 12px 2px 12px',
    padding: '14px 32px',
    fontSize: '14px',
    fontWeight: '500',
    letterSpacing: '0.02em',
    cursor: 'not-allowed',
  },
  
  primaryButtonLoading: {
    background: 'linear-gradient(135deg, #8B9467 0%, #7A8558 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '2px 12px 2px 12px',
    padding: '14px 32px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'wait',
    opacity: 0.8,
  },
  
  secondaryButton: {
    background: 'transparent',
    border: '1px solid rgba(139, 148, 103, 0.25)',
    color: '#666666',
    borderRadius: '2px 10px 2px 10px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  
  secondaryButtonLoading: {
    background: 'transparent',
    border: '1px solid rgba(139, 148, 103, 0.25)',
    color: '#999999',
    borderRadius: '2px 10px 2px 10px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'wait',
  },
  
  ghostButton: {
    background: 'transparent',
    border: 'none',
    color: '#666666',
    padding: '12px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  
  buttonRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '32px',
    width: '100%',
  },
  
  // Connect step
  connectCard: {
    width: '100%',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.08)',
    borderRadius: '4px 20px 4px 20px',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  
  googleIcon: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  
  connectInfo: {
    textAlign: 'center',
  },
  
  connectTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: '4px',
  },
  
  connectMeta: {
    fontSize: '13px',
    color: '#999999',
  },
  
  connectedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    background: 'rgba(39, 174, 96, 0.08)',
    borderRadius: '2px 10px 2px 10px',
    color: '#27AE60',
    fontSize: '13px',
    fontWeight: '500',
  },
  
  analyzePrompt: {
    fontSize: '14px',
    color: '#666666',
    textAlign: 'center',
    lineHeight: '1.6',
  },
  
  loadingText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  breathingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'white',
    animation: 'breathe 2s ease-in-out infinite',
  },
  
  successCard: {
    width: '100%',
    background: 'rgba(39, 174, 96, 0.04)',
    border: '1px solid rgba(39, 174, 96, 0.12)',
    borderRadius: '4px 20px 4px 20px',
    padding: '32px 24px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  
  successIcon: {
    marginBottom: '16px',
  },
  
  successTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: '8px',
  },
  
  successDescription: {
    fontSize: '14px',
    color: '#666666',
    lineHeight: '1.6',
  },
  
  // Reflect step
  modeToggle: {
    display: 'flex',
    gap: '4px',
    padding: '4px',
    background: 'rgba(139, 148, 103, 0.06)',
    borderRadius: '4px 12px 4px 12px',
    marginBottom: '20px',
  },
  
  modeButton: {
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: '2px 10px 2px 10px',
    color: '#666666',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  modeButtonActive: {
    padding: '10px 20px',
    background: 'white',
    border: 'none',
    borderRadius: '2px 10px 2px 10px',
    color: '#1A1A1A',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  
  reflectionTextarea: {
    width: '100%',
    minHeight: '200px',
    padding: '20px',
    background: 'rgba(139, 148, 103, 0.02)',
    border: '1px solid rgba(139, 148, 103, 0.1)',
    borderRadius: '4px 16px 4px 16px',
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#1A1A1A',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  
  dropZone: {
    width: '100%',
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    background: 'rgba(139, 148, 103, 0.02)',
    border: '2px dashed rgba(139, 148, 103, 0.15)',
    borderRadius: '4px 20px 4px 20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
  },
  
  dropZoneActive: {
    background: 'rgba(139, 148, 103, 0.05)',
    borderColor: '#8B9467',
  },
  
  dropZoneSuccess: {
    background: 'rgba(39, 174, 96, 0.04)',
    borderColor: 'rgba(39, 174, 96, 0.2)',
    borderStyle: 'solid',
  },
  
  dropText: {
    fontSize: '15px',
    color: '#666666',
    marginTop: '12px',
    marginBottom: '4px',
  },
  
  dropSubtext: {
    fontSize: '13px',
    color: '#999999',
    marginBottom: '12px',
  },
  
  dropFormats: {
    fontSize: '11px',
    color: '#999999',
    letterSpacing: '0.03em',
  },
  
  fileInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    cursor: 'pointer',
  },
  
  fileUploaded: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  fileName: {
    fontSize: '14px',
    color: '#1A1A1A',
    fontWeight: '500',
  },
  
  removeFileButton: {
    background: 'none',
    border: 'none',
    color: '#999999',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  
  // Themes step
  suggestionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: 'rgba(139, 148, 103, 0.06)',
    borderRadius: '2px 12px 2px 12px',
    fontSize: '12px',
    color: '#666666',
    marginBottom: '24px',
  },
  
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    width: '100%',
    marginBottom: '16px',
  },
  
  themeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '20px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.08)',
    borderRadius: '4px 16px 4px 16px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
    textAlign: 'left',
    position: 'relative',
    animation: 'fadeInUp 0.4s ease-out backwards',
  },
  
  themeCardSelected: {
    background: 'rgba(139, 148, 103, 0.08)',
    borderColor: '#8B9467',
  },
  
  suggestedDot: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#8B9467',
  },
  
  themeIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  
  themeName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: '4px',
  },
  
  themeDescription: {
    fontSize: '12px',
    color: '#999999',
    lineHeight: '1.5',
  },
  
  addThemeCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'transparent',
    border: '1px dashed rgba(139, 148, 103, 0.2)',
    borderRadius: '4px 16px 4px 16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '100px',
  },
  
  addIcon: {
    fontSize: '24px',
    color: '#8B9467',
    marginBottom: '4px',
  },
  
  addText: {
    fontSize: '13px',
    color: '#666666',
  },
  
  customThemeForm: {
    width: '100%',
    padding: '20px',
    background: 'rgba(139, 148, 103, 0.04)',
    borderRadius: '4px 16px 4px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  
  customThemeActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  
  selectedCount: {
    fontSize: '13px',
    color: '#666666',
    marginBottom: '8px',
  },
  
  // Season step styles
  seasonPresets: {
    width: '100%',
    marginBottom: '20px',
  },
  
  presetLabel: {
    fontSize: '13px',
    color: '#666666',
    marginBottom: '12px',
    textAlign: 'left',
  },
  
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  
  presetButton: {
    padding: '12px 16px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.1)',
    borderRadius: '4px 12px 4px 12px',
    fontSize: '13px',
    color: '#666666',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  presetButtonActive: {
    background: 'rgba(139, 148, 103, 0.1)',
    borderColor: '#8B9467',
    color: '#1A1A1A',
    fontWeight: '500',
  },
  
  dividerOr: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    margin: '8px 0 20px',
    color: '#999999',
    fontSize: '12px',
  },
  
  seasonForm: {
    width: '100%',
    padding: '24px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.08)',
    borderRadius: '4px 20px 4px 20px',
    marginBottom: '24px',
  },
  
  weeksSelector: {
    display: 'flex',
    gap: '6px',
  },
  
  weekOption: {
    padding: '10px 14px',
    background: 'transparent',
    border: '1px solid rgba(139, 148, 103, 0.15)',
    borderRadius: '4px 10px 4px 10px',
    fontSize: '13px',
    color: '#666666',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  weekOptionActive: {
    padding: '10px 14px',
    background: 'rgba(139, 148, 103, 0.1)',
    border: '1px solid #8B9467',
    borderRadius: '4px 10px 4px 10px',
    fontSize: '13px',
    color: '#1A1A1A',
    fontWeight: '500',
    cursor: 'pointer',
  },
  
  customWeeksInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
  },
  
  seasonPreview: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '18px 20px',
    background: 'rgba(139, 148, 103, 0.04)',
    borderRadius: '4px 16px 4px 16px',
    marginTop: '20px',
    marginBottom: '20px',
  },
  
  seasonPreviewIcon: {
    padding: '8px',
    background: 'rgba(139, 148, 103, 0.08)',
    borderRadius: '8px',
  },
  
  seasonPreviewContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  
  seasonPreviewLabel: {
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#999999',
  },
  
  seasonPreviewDates: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1A1A1A',
  },
  
  seasonPreviewWeeks: {
    fontSize: '12px',
    color: '#666666',
  },

  // Form inputs
  inputEnclosed: {
    width: '100%',
    padding: '14px 20px',
    background: 'rgba(139, 148, 103, 0.02)',
    border: '1px solid rgba(139, 148, 103, 0.1)',
    borderRadius: '4px 16px 4px 16px',
    fontSize: '15px',
    color: '#1A1A1A',
    fontFamily: 'inherit',
  },
  
  selectEnclosed: {
    flex: 1,
    padding: '14px 20px',
    background: 'rgba(139, 148, 103, 0.02)',
    border: '1px solid rgba(139, 148, 103, 0.1)',
    borderRadius: '4px 16px 4px 16px',
    fontSize: '15px',
    color: '#1A1A1A',
    fontFamily: 'inherit',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L2 4h8z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    paddingRight: '40px',
  },
  
  // Gates step
  conceptExplainer: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px 24px',
    background: 'rgba(139, 148, 103, 0.04)',
    borderRadius: '4px 20px 4px 20px',
    marginBottom: '28px',
    textAlign: 'left',
    width: '100%',
  },
  
  conceptExplainerIcon: {
    flexShrink: 0,
    opacity: 0.8,
  },
  
  conceptExplainerTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: '6px',
  },
  
  conceptExplainerText: {
    fontSize: '13px',
    color: '#666666',
    lineHeight: '1.6',
  },
  
  suggestionsSection: {
    width: '100%',
    marginBottom: '24px',
  },
  
  suggestionsSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    letterSpacing: '0.03em',
    color: '#666666',
    marginBottom: '12px',
    textAlign: 'left',
  },
  
  suggestionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'rgba(139, 148, 103, 0.04)',
    borderRadius: '4px 12px 4px 12px',
  },
  
  suggestionContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  
  suggestionTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1A1A1A',
  },
  
  suggestionMeta: {
    fontSize: '12px',
    color: '#999999',
  },
  
  addButton: {
    padding: '8px 16px',
    background: 'white',
    border: '1px solid rgba(139, 148, 103, 0.2)',
    borderRadius: '2px 8px 2px 8px',
    fontSize: '12px',
    color: '#8B9467',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  addedButton: {
    padding: '8px 16px',
    background: 'rgba(139, 148, 103, 0.1)',
    border: '1px solid transparent',
    borderRadius: '2px 8px 2px 8px',
    fontSize: '12px',
    color: '#8B9467',
    fontWeight: '500',
    cursor: 'default',
  },
  
  currentItems: {
    width: '100%',
    marginBottom: '20px',
  },
  
  currentItemsTitle: {
    fontSize: '12px',
    letterSpacing: '0.03em',
    color: '#666666',
    marginBottom: '12px',
    textAlign: 'left',
  },
  
  gateItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.08)',
    borderRadius: '4px 12px 4px 12px',
    marginBottom: '8px',
  },
  
  gateContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  
  gateTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1A1A1A',
  },
  
  gateMeta: {
    fontSize: '12px',
    color: '#999999',
  },
  
  removeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: '#999999',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  
  addForm: {
    width: '100%',
    padding: '24px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.08)',
    borderRadius: '4px 20px 4px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  
  formRowItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  
  formLabel: {
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#999999',
    textAlign: 'left',
    marginBottom: '-8px',
  },
  
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px',
  },
  
  addItemButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    background: 'transparent',
    border: '1px dashed rgba(139, 148, 103, 0.2)',
    borderRadius: '4px 16px 4px 16px',
    fontSize: '14px',
    color: '#666666',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  
  addItemIcon: {
    fontSize: '18px',
    color: '#8B9467',
  },
  
  // Experiments step
  optionalBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    background: 'rgba(139, 148, 103, 0.08)',
    borderRadius: '2px 8px 2px 8px',
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#666666',
    marginBottom: '16px',
  },
  
  criteriaTextarea: {
    width: '100%',
    minHeight: '100px',
    padding: '14px 20px',
    background: 'rgba(139, 148, 103, 0.02)',
    border: '1px solid rgba(139, 148, 103, 0.1)',
    borderRadius: '4px 16px 4px 16px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#1A1A1A',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  
  experimentItem: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.08)',
    borderRadius: '4px 16px 4px 16px',
    marginBottom: '12px',
  },
  
  gateItemExpanded: {
    padding: '20px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.08)',
    borderRadius: '4px 16px 4px 16px',
    marginBottom: '12px',
  },
  
  experimentItemExpanded: {
    padding: '20px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(196, 91, 77, 0.08)',
    borderRadius: '4px 16px 4px 16px',
    marginBottom: '12px',
  },
  
  gateHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  
  gateIconSmall: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(139, 148, 103, 0.06)',
    borderRadius: '8px',
    flexShrink: 0,
  },
  
  experimentIconSmall: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(196, 91, 77, 0.06)',
    borderRadius: '8px',
    flexShrink: 0,
  },
  
  gateCriteriaList: {
    marginTop: '12px',
    marginLeft: '48px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  
  gateCriteriaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#666666',
  },
  
  criterionDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#8B9467',
    flexShrink: 0,
  },
  
  addFormExpanded: {
    width: '100%',
    padding: '28px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.1)',
    borderRadius: '4px 20px 4px 20px',
    marginBottom: '20px',
  },
  
  formSection: {
    marginBottom: '24px',
  },
  
  formLabel: {
    display: 'block',
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#999999',
    marginBottom: '8px',
    textAlign: 'left',
  },
  
  formHint: {
    fontSize: '12px',
    color: '#999999',
    marginTop: '-4px',
    marginBottom: '12px',
    fontStyle: 'italic',
    textAlign: 'left',
  },
  
  criteriaInputList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '12px',
  },
  
  criteriaInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  criteriaInput: {
    flex: 1,
    padding: '14px 18px',
    background: 'rgba(139, 148, 103, 0.02)',
    border: '1px solid rgba(139, 148, 103, 0.1)',
    borderRadius: '4px 12px 4px 12px',
    fontSize: '14px',
    color: '#1A1A1A',
    fontFamily: 'inherit',
  },
  
  removeCriterionButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: '#999999',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  
  addCriterionButton: {
    background: 'transparent',
    border: 'none',
    color: '#8B9467',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '8px 12px',
    marginLeft: '14px',
    transition: 'opacity 0.2s ease',
  },
  
  unitLabel: {
    fontSize: '13px',
    color: '#999999',
    marginLeft: '8px',
  },
  
  experimentOnlySection: {
    padding: '20px',
    background: 'rgba(196, 91, 77, 0.04)',
    border: '1px dashed rgba(196, 91, 77, 0.2)',
    borderRadius: '4px 16px 4px 16px',
    marginBottom: '20px',
  },
  
  experimentOnlyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  
  experimentOnlyLabel: {
    fontSize: '11px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#C45B4D',
    fontWeight: '500',
  },
  
  conceptExplainerIconExperiment: {
    flexShrink: 0,
    opacity: 0.8,
    padding: '8px',
    background: 'rgba(196, 91, 77, 0.06)',
    borderRadius: '8px',
  },

  experimentContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
  },
  
  experimentTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1A1A1A',
  },
  
  experimentMeta: {
    fontSize: '12px',
    color: '#999999',
  },
  
  criteriaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '8px',
  },
  
  criteriaItem: {
    fontSize: '12px',
    color: '#666666',
  },
  
  // Complete step
  completeIcon: {
    marginBottom: '24px',
    animation: 'scaleIn 0.5s ease-out',
  },
  
  completeTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: '12px',
    letterSpacing: '-0.02em',
  },
  
  completeDescription: {
    fontSize: '15px',
    color: '#666666',
    lineHeight: '1.7',
    marginBottom: '24px',
  },
  
  seasonBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    width: '100%',
    padding: '20px 24px',
    background: 'rgba(139, 148, 103, 0.06)',
    borderRadius: '4px 20px 4px 20px',
    marginBottom: '28px',
    textAlign: 'left',
  },
  
  seasonBannerIcon: {
    padding: '10px',
    background: 'rgba(139, 148, 103, 0.1)',
    borderRadius: '10px',
  },
  
  seasonBannerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  
  seasonBannerName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1A1A1A',
  },
  
  seasonBannerDates: {
    fontSize: '13px',
    color: '#666666',
  },
  
  seasonBannerIntention: {
    fontSize: '14px',
    color: '#8B9467',
    fontStyle: 'italic',
    marginTop: '4px',
  },
  
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    width: '100%',
    marginBottom: '32px',
  },
  
  summaryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    background: 'rgba(254, 254, 254, 0.95)',
    border: '1px solid rgba(139, 148, 103, 0.08)',
    borderRadius: '4px 16px 4px 16px',
  },
  
  summaryNumber: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#8B9467',
    marginBottom: '4px',
  },
  
  summaryLabel: {
    fontSize: '12px',
    color: '#666666',
    letterSpacing: '0.03em',
  },
  
  completeHint: {
    fontSize: '13px',
    color: '#999999',
    lineHeight: '1.6',
    marginBottom: '32px',
    maxWidth: '380px',
  },
};

// Add keyframe animations via style injection
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes breathe {
    0%, 100% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }
  
  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: rgba(139, 148, 103, 0.3) !important;
    box-shadow: 0 0 0 3px rgba(139, 148, 103, 0.08);
  }
  
  button:hover {
    transform: translateY(-1px);
  }
  
  button:active {
    transform: translateY(0) scale(0.98);
  }
  
  ::placeholder {
    color: #999999;
  }
`;
document.head.appendChild(styleSheet);

export default KaizenOnboarding;
