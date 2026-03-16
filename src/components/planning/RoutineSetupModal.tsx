// Routine Setup Modal - Link routine actions to recurring Google Calendar events
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import type { Card } from '../../lib/api';

interface RecurringEventOption {
  accountId: string;
  calendarId: string;
  calendarName: string;
  recurringEventId: string;
  iCalUid: string;
  summary: string;
  recurrenceDescription: string;
  htmlLink?: string;
}

export interface RoutineLinkResult {
  eventSummary: string | null;
  calendarName: string | null;
  eventRecurrence: string | null;
  htmlLink: string | null;
}

interface RoutineSetupModalProps {
  action: Card;
  onClose: () => void;
  onLinked: (linkInfo: RoutineLinkResult) => void;
}

export function RoutineSetupModal({ action, onClose, onLinked }: RoutineSetupModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'create'>('link');
  const [recurringEvents, setRecurringEvents] = useState<RecurringEventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    summary: action.title,
    recurrencePattern: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: 1,
    daysOfWeek: ['MO', 'TU', 'WE', 'TH', 'FR'],
    startDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
    startTime: '09:00',
    duration: 60,
    location: '',
    rrule: '',
    endType: 'never' as 'never' | 'on' | 'after',
    endDate: '',
    occurrences: 13,
  });

  useEffect(() => {
    async function fetchRecurringEvents() {
      try {
        const res = await apiFetch('/api/calendar/routines/recurring-events', {
          
        });
        if (res.ok) {
          const events = await res.json();
          setRecurringEvents(events);
        }
      } catch (error) {
        console.error('Failed to fetch recurring events:', error);
      }
      setLoading(false);
    }
    fetchRecurringEvents();
  }, []);

  const handleLink = async (event: RecurringEventOption) => {
    setLinking(true);
    try {
      const res = await apiFetch('/api/calendar/routines/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({
          cardId: action.id,
          accountId: event.accountId,
          calendarId: event.calendarId,
          recurringEventId: event.recurringEventId,
          iCalUid: event.iCalUid,
        }),
      });
      if (res.ok) {
        onLinked({
          eventSummary: event.summary,
          calendarName: event.calendarName,
          eventRecurrence: event.recurrenceDescription,
          htmlLink: event.htmlLink || null,
        });
      } else {
        alert('Failed to link routine');
      }
    } catch (error) {
      console.error('Failed to link routine:', error);
      alert('Failed to link routine');
    }
    setLinking(false);
  };

  const handleCreate = async () => {
    setLinking(true);
    try {
      const payload: Record<string, unknown> = {
        cardId: action.id,
        summary: createForm.summary,
        startDate: createForm.startDate,
        startTime: createForm.startTime,
        duration: createForm.duration,
        location: createForm.location || undefined,
      };

      // Use raw RRULE if provided, otherwise build from form
      if (createForm.rrule.trim()) {
        payload.rrule = createForm.rrule.trim();
      } else {
        const freqMap: Record<string, string> = {
          daily: 'DAILY',
          weekly: 'WEEKLY',
          monthly: 'MONTHLY',
          yearly: 'YEARLY',
        };

        const rruleParts = [`FREQ=${freqMap[createForm.recurrencePattern]}`];

        if (createForm.interval > 1) {
          rruleParts.push(`INTERVAL=${createForm.interval}`);
        }

        if (createForm.recurrencePattern === 'weekly' && createForm.daysOfWeek.length > 0) {
          rruleParts.push(`BYDAY=${createForm.daysOfWeek.join(',')}`);
        }

        if (createForm.endType === 'on' && createForm.endDate) {
          const untilDate = createForm.endDate.replace(/-/g, '');
          rruleParts.push(`UNTIL=${untilDate}T235959Z`);
        } else if (createForm.endType === 'after' && createForm.occurrences > 0) {
          rruleParts.push(`COUNT=${createForm.occurrences}`);
        }

        payload.rrule = rruleParts.join(';');
      }

      const res = await apiFetch('/api/calendar/routines/create-recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        onLinked({
          eventSummary: data.eventSummary || createForm.summary,
          calendarName: data.calendarName,
          eventRecurrence: data.eventRecurrence,
          htmlLink: data.htmlLink || null,
        });
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to create recurring event');
      }
    } catch (error) {
      console.error('Failed to create recurring event:', error);
      alert('Failed to create recurring event');
    }
    setLinking(false);
  };

  const toggleDay = (day: string) => {
    setCreateForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  return (
    <div className="event-edit-overlay" onClick={onClose}>
      <div className="event-edit-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <h4>Link "{action.title}" to Calendar</h4>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'link' ? 'var(--color-sage)' : 'var(--color-bg)',
              color: activeTab === 'link' ? 'white' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-sage-border)',
              borderRadius: 8,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onClick={() => setActiveTab('link')}
          >
            Link Existing
          </button>
          <button
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeTab === 'create' ? 'var(--color-sage)' : 'var(--color-bg)',
              color: activeTab === 'create' ? 'white' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-sage-border)',
              borderRadius: 8,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onClick={() => setActiveTab('create')}
          >
            Create New
          </button>
        </div>

        {activeTab === 'link' && (
          <>
            <p className="modal-subtitle">Select a recurring event from your Google Calendar:</p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>Loading recurring events...</div>
            ) : recurringEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, background: '#F5F1EB', borderRadius: 8 }}>
                <p style={{ color: '#666', marginBottom: 8 }}>No recurring events found in your calendars.</p>
                <p style={{ fontSize: 12, color: '#999' }}>Create one using the "Create New" tab, or add one in Google Calendar first.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {recurringEvents.map((event, idx) => (
                  <button
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: 'var(--color-bg)',
                      border: '1px solid var(--color-sage-border-light)',
                      borderRadius: 8,
                      cursor: linking ? 'wait' : 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                    onClick={() => !linking && handleLink(event)}
                    disabled={linking}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 8,
                      background: 'linear-gradient(135deg, #4285F4, #34A853)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 18,
                    }}>
                      🔄
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{event.summary}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {event.calendarName} • {event.recurrenceDescription}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Event Title */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Event Title</label>
              <input
                value={createForm.summary}
                onChange={e => setCreateForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Event title..."
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--color-sage-border)',
                  borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>

            {/* First Event Date */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>First Event Date</label>
              <input
                type="date"
                value={createForm.startDate}
                onChange={e => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--color-sage-border)',
                  borderRadius: 8, fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Repeat every */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Repeat every</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  value={createForm.interval}
                  onChange={e => setCreateForm(prev => ({ ...prev, interval: Math.max(1, parseInt(e.target.value) || 1) }))}
                  min={1}
                  max={99}
                  style={{ width: 60, padding: '8px 10px', border: '1px solid var(--color-sage-border)', borderRadius: 6, fontSize: 14 }}
                />
                <select
                  value={createForm.recurrencePattern}
                  onChange={e => setCreateForm(prev => ({
                    ...prev,
                    recurrencePattern: e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly'
                  }))}
                  style={{ padding: '8px 12px', border: '1px solid var(--color-sage-border)', borderRadius: 6, fontSize: 14 }}
                >
                  <option value="daily">{createForm.interval === 1 ? 'day' : 'days'}</option>
                  <option value="weekly">{createForm.interval === 1 ? 'week' : 'weeks'}</option>
                  <option value="monthly">{createForm.interval === 1 ? 'month' : 'months'}</option>
                  <option value="yearly">{createForm.interval === 1 ? 'year' : 'years'}</option>
                </select>
              </div>
            </div>

            {/* Repeat on - only for weekly */}
            {createForm.recurrencePattern === 'weekly' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Repeat on</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { code: 'MO', label: 'M' },
                    { code: 'TU', label: 'T' },
                    { code: 'WE', label: 'W' },
                    { code: 'TH', label: 'T' },
                    { code: 'FR', label: 'F' },
                    { code: 'SA', label: 'S' },
                    { code: 'SU', label: 'S' },
                  ].map(day => (
                    <button
                      key={day.code}
                      type="button"
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: createForm.daysOfWeek.includes(day.code)
                          ? '2px solid var(--color-sage)'
                          : '1px solid var(--color-sage-border)',
                        background: createForm.daysOfWeek.includes(day.code) ? 'var(--color-sage)' : 'white',
                        color: createForm.daysOfWeek.includes(day.code) ? 'white' : 'var(--color-text-secondary)',
                        fontWeight: 500, fontSize: 13, cursor: 'pointer',
                      }}
                      onClick={() => toggleDay(day.code)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ends */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Ends</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="endType"
                    checked={createForm.endType === 'never'}
                    onChange={() => setCreateForm(prev => ({ ...prev, endType: 'never' }))}
                  />
                  <span>Never</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="endType"
                    checked={createForm.endType === 'on'}
                    onChange={() => setCreateForm(prev => ({ ...prev, endType: 'on' }))}
                  />
                  <span>On</span>
                  <input
                    type="date"
                    value={createForm.endDate}
                    onChange={e => setCreateForm(prev => ({ ...prev, endDate: e.target.value, endType: 'on' }))}
                    style={{ padding: '6px 10px', border: '1px solid var(--color-sage-border)', borderRadius: 6, fontSize: 13 }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="endType"
                    checked={createForm.endType === 'after'}
                    onChange={() => setCreateForm(prev => ({ ...prev, endType: 'after' }))}
                  />
                  <span>After</span>
                  <input
                    type="number"
                    value={createForm.occurrences}
                    onChange={e => setCreateForm(prev => ({ ...prev, occurrences: parseInt(e.target.value) || 1, endType: 'after' }))}
                    min={1}
                    style={{ width: 60, padding: '6px 10px', border: '1px solid var(--color-sage-border)', borderRadius: 6, fontSize: 13 }}
                  />
                  <span>occurrences</span>
                </label>
              </div>
            </div>

            {/* Time and Duration */}
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Start Time</label>
                <input
                  type="time"
                  value={createForm.startTime}
                  onChange={e => setCreateForm(prev => ({ ...prev, startTime: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-sage-border)', borderRadius: 6, fontSize: 14 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Duration</label>
                <select
                  value={createForm.duration}
                  onChange={e => setCreateForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-sage-border)', borderRadius: 6, fontSize: 14 }}
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="modal-btn cancel"
            onClick={onClose}
            disabled={linking}
          >
            Cancel
          </button>
          {activeTab === 'create' && (
            <button
              className="modal-btn confirm"
              onClick={handleCreate}
              disabled={linking || !createForm.summary || !createForm.startTime}
            >
              {linking ? 'Creating...' : 'Create & Link'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
