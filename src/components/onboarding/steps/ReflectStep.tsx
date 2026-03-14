import { useState, DragEvent, ChangeEvent } from 'react'
import { Button, Textarea } from '../../ui'

const MAX_FILE_SIZE = 1024 * 1024 // 1MB

interface Props {
  journalText: string
  journalFile: File | null
  onTextChange: (text: string) => void
  onFileChange: (file: File | null) => void
  onNext: () => void
  onSkip: () => void
  onAnalyze: () => Promise<void>
  isAnalyzing: boolean
  hasCalendarConnected: boolean
}

export function ReflectStep({
  journalText,
  journalFile,
  onTextChange,
  onFileChange,
  onNext,
  onSkip,
  onAnalyze,
  isAnalyzing,
  hasCalendarConnected,
}: Props) {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const validateAndSetFile = (file: File | null) => {
    setFileError(null)
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setFileError('File too large. Maximum size is 1MB')
        return
      }
      // Validate file type
      const validTypes = ['.txt', '.md']
      const hasValidExtension = validTypes.some(ext => file.name.toLowerCase().endsWith(ext))
      if (!hasValidExtension) {
        setFileError('Invalid file type. Only .txt and .md files are supported')
        return
      }
    }
    onFileChange(file)
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const hasContent = journalText.trim().length > 0 || journalFile !== null

  return (
    <div
      className="flex flex-col items-center text-center"
      style={{ padding: 'var(--space-8) 0' }}
    >
      {/* Step icon */}
      <div style={{ marginBottom: 'var(--space-6)', opacity: 0.9 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="10" y="8" width="28" height="32" rx="2" stroke="var(--color-sage)" strokeWidth="1.5" fill="none" />
          <line x1="16" y1="16" x2="32" y2="16" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="22" x2="28" y2="22" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="28" x2="30" y2="28" stroke="var(--color-sage)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <h2
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-4)',
        }}
      >
        Share Your Reflections
      </h2>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          maxWidth: '400px',
          lineHeight: 1.6,
          marginBottom: 'var(--space-2)',
        }}
      >
        If you have any journals, reflections, or notes about your goals and aspirations,
        share them here. We'll use your words to understand what matters most to you.
      </p>

      <p
        style={{
          fontSize: '13px',
          color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--space-6)',
        }}
      >
        This is optional but helps us create more meaningful suggestions.
      </p>

      {/* Input mode toggle */}
      <div
        className="flex"
        style={{
          gap: 'var(--space-1)',
          padding: 'var(--space-1)',
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: '8px',
          marginBottom: 'var(--space-5)',
        }}
      >
        <button
          onClick={() => setInputMode('text')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            fontSize: '13px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: inputMode === 'text' ? 'white' : 'transparent',
            color: inputMode === 'text' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            boxShadow: inputMode === 'text' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Write or Paste
        </button>
        <button
          onClick={() => setInputMode('file')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            fontSize: '13px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: inputMode === 'file' ? 'white' : 'transparent',
            color: inputMode === 'file' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            boxShadow: inputMode === 'file' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Upload File
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '500px', marginBottom: 'var(--space-6)' }}>
        {inputMode === 'text' ? (
          <Textarea
            value={journalText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={`Share your thoughts, goals, reflections, or journal entries...

You can write freely here, paste from a document, or use markdown formatting. We'll read between the lines to understand your priorities and aspirations.`}
            rows={8}
            style={{
              width: '100%',
              resize: 'vertical',
              minHeight: '200px',
              textAlign: 'left',
            }}
          />
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              position: 'relative',
              padding: 'var(--space-8) var(--space-4)',
              border: `2px dashed ${dragOver ? 'var(--color-sage)' : journalFile ? 'var(--color-success)' : 'var(--color-border)'}`,
              borderRadius: '12px',
              backgroundColor: dragOver ? 'var(--color-sage-light)' : journalFile ? 'rgba(39, 174, 96, 0.05)' : 'transparent',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
          >
            {journalFile ? (
              <div className="flex flex-col items-center" style={{ gap: 'var(--space-3)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-sage)">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="1.5" />
                  <polyline points="14,2 14,8 20,8" strokeWidth="1.5" />
                </svg>
                <span style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                  {journalFile.name}
                </span>
                <button
                  onClick={() => onFileChange(null)}
                  style={{
                    padding: 'var(--space-1) var(--space-3)',
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center" style={{ gap: 'var(--space-3)' }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="var(--color-sage)">
                    <path d="M20 8V26M12 18L20 10L28 18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 28V30C8 31.1 8.9 32 10 32H30C31.1 32 32 31.1 32 30V28" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    Drop your file here
                  </p>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    or click to browse
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    Supports .txt, .md (max 1MB)
                  </p>
                  {fileError && (
                    <p style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: 'var(--space-2)' }}>
                      {fileError}
                    </p>
                  )}
                </div>
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {hasContent && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-sage)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Content will be used to personalize your suggestions
        </div>
      )}

      {/* Analysis info banner */}
      {(hasContent || hasCalendarConnected) && (
        <div
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-sage-light)',
            borderRadius: '8px',
            marginBottom: 'var(--space-4)',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span style={{ color: 'var(--color-sage)', marginRight: 'var(--space-2)' }}>✨</span>
          {hasCalendarConnected && hasContent
            ? 'We\'ll analyze your calendar events and reflections to generate personalized suggestions.'
            : hasCalendarConnected
              ? 'We\'ll analyze your calendar events to generate personalized suggestions.'
              : 'We\'ll analyze your reflections to generate personalized suggestions.'}
        </div>
      )}

      <div
        className="flex justify-between w-full"
        style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}
      >
        <Button variant="ghost" onClick={onSkip} disabled={isAnalyzing}>
          Skip this step
        </Button>
        <Button
          onClick={async () => {
            // Trigger analysis if we have calendar or content to analyze
            if (hasCalendarConnected || hasContent) {
              await onAnalyze()
            }
            onNext()
          }}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <span className="flex items-center" style={{ gap: 'var(--space-2)' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'currentColor',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              Analyzing...
            </span>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  )
}
