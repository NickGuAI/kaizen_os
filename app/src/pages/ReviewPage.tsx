import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeekReview } from '../components/weekly/WeekReview';
import { OpsReview } from '../components/weekly/OpsReview';
import { BacklogReview } from '../components/weekly/BacklogReview';
import { ReviewSummary } from '../components/weekly/ReviewSummary';
import { AppLayout } from '../components/layout';
import { Button } from '../components/ui';
import { getReviewWeekStart, formatWeekRange } from '../utils/dateUtils';
import { apiFetch } from '../lib/apiFetch';

const STEPS = [
  { label: 'Time Classification', icon: '1' },
  { label: 'Ops Review', icon: '2' },
  { label: 'Backlog Promotion', icon: '3' },
  { label: 'Summary', icon: '4' },
] as const;

const SUMMARY_STEP = STEPS.length - 1;

export default function ReviewPage() {
  const navigate = useNavigate();
  const weekStart = useMemo(() => getReviewWeekStart(), []);
  const [step, setStep] = useState(-1); // -1 = loading
  const [reviewed, setReviewed] = useState(false);

  // Check if this week was already reviewed
  useEffect(() => {
    apiFetch(`/api/cards/week-reviewed?weekStart=${weekStart}`)
      .then(r => r.json())
      .then(data => {
        if (data.reviewed) {
          setReviewed(true);
          setStep(SUMMARY_STEP);
        } else {
          setStep(0);
        }
      })
      .catch(() => setStep(0));
  }, [weekStart]);

  // Mark week as reviewed when user reaches summary step (coming from step 2)
  useEffect(() => {
    if (step === SUMMARY_STEP && !reviewed) {
      setReviewed(true);
      apiFetch('/api/cards/week-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart }),
      }).catch(err => console.error('Failed to mark week as reviewed', err));
    }
  }, [step, reviewed, weekStart]);

  if (step === -1) {
    return (
      <AppLayout>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: '#999' }}>
          Loading...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ padding: '16px' }}>
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            background: 'white',
            borderRadius: 12,
            border: '1px solid rgba(139, 148, 103, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#333' }}>
            Weekly Review
          </h2>
          {reviewed && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#27AE60',
                background: 'rgba(39, 174, 96, 0.12)',
                border: '1px solid rgba(39, 174, 96, 0.2)',
                borderRadius: 999,
                padding: '3px 8px',
              }}
            >
              Finalized
            </span>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#666' }}>
            Reviewing: {formatWeekRange(weekStart)}
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginBottom: 20,
          padding: '0 8px',
        }}>
          {STEPS.map((s, i) => {
            const isActive = i === step;
            const isComplete = i < step;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <button
                  onClick={() => setStep(i)}
                  disabled={reviewed}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: reviewed ? 'not-allowed' : 'pointer',
                    background: isActive
                      ? 'var(--color-sage)'
                      : isComplete
                        ? 'rgba(39, 174, 96, 0.1)'
                        : 'rgba(0,0,0,0.04)',
                    color: isActive
                      ? 'white'
                      : isComplete
                        ? 'var(--color-success)'
                        : '#999',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    opacity: reviewed ? 0.7 : 1,
                  }}
                >
                  <span style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    background: isActive
                      ? 'rgba(255,255,255,0.2)'
                      : isComplete
                        ? 'rgba(39, 174, 96, 0.15)'
                        : 'rgba(0,0,0,0.06)',
                  }}>
                    {isComplete ? '\u2713' : s.icon}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: 2,
                    background: isComplete ? 'rgba(39, 174, 96, 0.3)' : 'rgba(0,0,0,0.08)',
                    margin: '0 4px',
                    minWidth: 20,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <main style={{ maxWidth: 1000, margin: '0 auto' }}>
          {step === 0 && <WeekReview weekStart={weekStart} />}
          {step === 1 && <OpsReview weekStart={weekStart} />}
          {step === 2 && <BacklogReview />}
          {step === 3 && <ReviewSummary weekStart={weekStart} />}
        </main>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: reviewed ? 'flex-end' : 'space-between',
          maxWidth: 1000,
          margin: '20px auto 0',
          padding: '16px 0',
          borderTop: '1px solid rgba(139, 148, 103, 0.1)',
        }}>
          {reviewed ? (
            <Button variant="primary" onClick={() => navigate('/')}>
              Done
            </Button>
          ) : (
            <>
              <div>
                {step > 0 && (
                  <Button variant="ghost" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                )}
              </div>
              <div>
                {step < STEPS.length - 1 ? (
                  <Button variant="primary" onClick={() => setStep(step + 1)}>
                    Continue
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => navigate('/')}>
                    Done
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
