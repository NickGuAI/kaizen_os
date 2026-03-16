import { useState, useEffect } from 'react';
import { Button, Card } from '../ui';
import { apiFetch } from '../../lib/apiFetch';
import { useCreateCard, useThemes } from '../../hooks/useCards';

interface CalendarAccount {
  id: string;
  provider: string;
  email: string;
  selectedCalendarIds: string[];
  writeCalendarId: string | null;
  selectedTaskListId: string | null;
  createdAt: string;
}

interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
  backgroundColor?: string;
}

interface TaskListInfo {
  id: string;
  title: string;
}

interface AccountStatus {
  loading: boolean;
  error: string | null;
  needsReauth: boolean;
}

export function ProviderSettings() {
  const { data: themes = [], refetch: refetchThemes } = useThemes();
  const createCard = useCreateCard();
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<Record<string, CalendarInfo[]>>({});
  const [taskLists, setTaskLists] = useState<Record<string, TaskListInfo[]>>({});
  const [accountStatus, setAccountStatus] = useState<Record<string, AccountStatus>>({});
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [newThemeTitle, setNewThemeTitle] = useState('');
  const [creatingTheme, setCreatingTheme] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/calendar/accounts', {
        
      });
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
    setLoading(false);
  }

  async function fetchCalendars(accountId: string) {
    if (calendars[accountId]) return;

    setAccountStatus(prev => ({
      ...prev,
      [accountId]: { loading: true, error: null, needsReauth: false }
    }));

    try {
      const res = await apiFetch(`/api/calendar/accounts/${accountId}/calendars`, {
        
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch calendars' }));
        const needsReauth = res.status === 401 || errorData.needsReauth ||
          (res.status === 500 && errorData.error?.includes('invalid_grant'));

        setAccountStatus(prev => ({
          ...prev,
          [accountId]: {
            loading: false,
            error: needsReauth ? 'Token expired - please reconnect' : errorData.error,
            needsReauth
          }
        }));
        return;
      }

      const data = await res.json();
      setCalendars((prev) => ({ ...prev, [accountId]: data }));
      setAccountStatus(prev => ({
        ...prev,
        [accountId]: { loading: false, error: null, needsReauth: false }
      }));
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
      setAccountStatus(prev => ({
        ...prev,
        [accountId]: { loading: false, error: 'Network error', needsReauth: false }
      }));
    }
  }

  async function fetchTaskLists(accountId: string) {
    if (taskLists[accountId]) return;

    try {
      const res = await apiFetch(`/api/calendar/accounts/${accountId}/tasklists`, {
        
      });

      if (!res.ok) {
        console.error('Failed to fetch task lists');
        return;
      }

      const data = await res.json();
      setTaskLists((prev) => ({ ...prev, [accountId]: data }));
    } catch (error) {
      console.error('Failed to fetch task lists:', error);
    }
  }

  async function handleRefreshToken(accountId: string) {
    setRefreshing(accountId);
    try {
      const res = await apiFetch(`/api/calendar/accounts/${accountId}/refresh`, {
        method: 'POST',
        
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsReauth) {
          setAccountStatus(prev => ({
            ...prev,
            [accountId]: { loading: false, error: 'Please reconnect your account', needsReauth: true }
          }));
        } else {
          setAccountStatus(prev => ({
            ...prev,
            [accountId]: { loading: false, error: data.error || 'Refresh failed', needsReauth: false }
          }));
        }
        return;
      }

      // Success - clear cached data and refetch
      setCalendars(prev => {
        const newCalendars = { ...prev };
        delete newCalendars[accountId];
        return newCalendars;
      });
      setTaskLists(prev => {
        const newTaskLists = { ...prev };
        delete newTaskLists[accountId];
        return newTaskLists;
      });
      setAccountStatus(prev => ({
        ...prev,
        [accountId]: { loading: false, error: null, needsReauth: false }
      }));

      // Refetch data
      await Promise.all([
        fetchCalendars(accountId),
        fetchTaskLists(accountId)
      ]);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      setAccountStatus(prev => ({
        ...prev,
        [accountId]: { loading: false, error: 'Network error', needsReauth: false }
      }));
    } finally {
      setRefreshing(null);
    }
  }

  async function handleConnect() {
    try {
      const res = await apiFetch('/api/calendar/google/authorize?format=json');
      if (!res.ok) {
        throw new Error('Failed to start Google authorization');
      }
      const data = await res.json();
      if (!data?.url) {
        throw new Error('Missing authorization URL');
      }
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to start Google authorization:', error);
    }
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm('Disconnect this Google account? Event links will be preserved.')) return;
    try {
      await apiFetch(`/api/calendar/accounts/${accountId}`, {
        method: 'DELETE',
      });
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }

  async function handleCreateTheme() {
    const title = newThemeTitle.trim();
    if (!title) {
      setThemeError('Theme title is required.');
      return;
    }

    setCreatingTheme(true);
    setThemeError(null);
    try {
      await createCard.mutateAsync({
        title,
        unitType: 'THEME',
        status: 'not_started',
      });
      setNewThemeTitle('');
      await refetchThemes();
    } catch (error) {
      console.error('Failed to create theme:', error);
      setThemeError('Failed to create theme. Please try again.');
    } finally {
      setCreatingTheme(false);
    }
  }

  async function handleToggleCalendar(accountId: string, calendarId: string) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    const selected = account.selectedCalendarIds.includes(calendarId)
      ? account.selectedCalendarIds.filter((id) => id !== calendarId)
      : [...account.selectedCalendarIds, calendarId];

    await updatePreferences(accountId, { selectedCalendarIds: selected });
  }

  async function handleSetWriteCalendar(accountId: string, calendarId: string) {
    await updatePreferences(accountId, { writeCalendarId: calendarId });
  }

  async function handleSetTaskList(accountId: string, taskListId: string) {
    await updatePreferences(accountId, { selectedTaskListId: taskListId });
  }

  async function updatePreferences(
    accountId: string,
    prefs: { selectedCalendarIds?: string[]; writeCalendarId?: string; selectedTaskListId?: string }
  ) {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/calendar/accounts/${accountId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify(prefs),
      });
      const updated = await res.json();
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, ...updated } : a))
      );
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
    setSaving(false);
  }

  function toggleExpand(accountId: string) {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountId);
      fetchCalendars(accountId);
      fetchTaskLists(accountId);
    }
  }

  if (loading) {
    return <Card><p className="text-muted">Loading provider accounts...</p></Card>;
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 className="text-lg font-semibold">Source Setup</h2>
        <Button variant="primary" size="sm" onClick={handleConnect}>
          + Connect Google Account
        </Button>
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
        Account sources and theme setup now live here. Onboarding no longer creates themes.
      </p>

      {accounts.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-8)',
            textAlign: 'center',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--color-sage-border)',
          }}
        >
          <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
            No accounts connected.
          </p>
          <p className="text-sm text-muted">
            Connect your Google account to sync Calendar events and Tasks.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {accounts.map((account) => (
            <div
              key={account.id}
              style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-sage-border-light)',
                overflow: 'hidden',
              }}
            >
              {/* Account Header */}
              <div
                style={{
                  padding: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  cursor: 'pointer',
                }}
                onClick={() => toggleExpand(account.id)}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4285F4, #34A853)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  G
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{account.email}</div>
                  <div className="text-sm text-muted">
                    {account.selectedCalendarIds.length} calendar(s) synced
                  </div>
                </div>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {expandedAccount === account.id ? '▼' : '▶'}
                </span>
              </div>

              {/* Expanded Content */}
              {expandedAccount === account.id && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    borderTop: '1px solid var(--color-sage-border-light)',
                    background: 'var(--color-card)',
                  }}
                >
                  {/* Error State */}
                  {accountStatus[account.id]?.error && (
                    <div
                      style={{
                        padding: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                        background: 'rgba(220, 38, 38, 0.1)',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-3)',
                      }}
                    >
                      <span style={{ color: '#DC2626', fontSize: 13 }}>
                        ⚠️ {accountStatus[account.id].error}
                      </span>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {accountStatus[account.id].needsReauth ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleConnect}
                          >
                            Reconnect
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRefreshToken(account.id)}
                            disabled={refreshing === account.id}
                          >
                            {refreshing === account.id ? 'Refreshing...' : 'Retry'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Calendar Section */}
                  <div style={{ marginBottom: 'var(--space-5)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                      📅 Calendar
                    </h3>

                    {/* Calendar Selection */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <label className="text-sm font-medium text-secondary uppercase">
                          Calendars to Sync
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefreshToken(account.id)}
                          disabled={refreshing === account.id}
                          style={{ fontSize: 12, padding: '2px 8px' }}
                        >
                          {refreshing === account.id ? '↻ Refreshing...' : '↻ Refresh'}
                        </Button>
                      </div>
                      {accountStatus[account.id]?.loading ? (
                        <p className="text-sm text-muted">Loading calendars...</p>
                      ) : calendars[account.id] && Array.isArray(calendars[account.id]) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {calendars[account.id].map((cal) => (
                            <label
                              key={cal.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                                fontSize: 14,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={account.selectedCalendarIds.includes(cal.id)}
                                onChange={() => handleToggleCalendar(account.id, cal.id)}
                                disabled={saving}
                              />
                              <span
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: 2,
                                  background: cal.backgroundColor || '#8B9467',
                                }}
                              />
                              <span>{cal.summary}</span>
                              {cal.primary && (
                                <span className="text-xs text-muted">(Primary)</span>
                              )}
                            </label>
                          ))}
                        </div>
                      ) : !accountStatus[account.id]?.error ? (
                        <p className="text-sm text-muted">Loading calendars...</p>
                      ) : null}
                    </div>

                    {/* Write Calendar */}
                    <div>
                      <label className="text-sm font-medium text-secondary uppercase mb-2 block">
                        Create Events In
                      </label>
                      <select
                        value={account.writeCalendarId || 'primary'}
                        onChange={(e) => handleSetWriteCalendar(account.id, e.target.value)}
                        disabled={saving || !calendars[account.id]}
                        style={{
                          width: '100%',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-sage-border)',
                          fontSize: 14,
                        }}
                      >
                        {calendars[account.id]?.map((cal) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.summary}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                        New events from weekly planning will be created here.
                      </p>
                    </div>
                  </div>

                  {/* Tasks Section */}
                  <div style={{ marginBottom: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-sage-border-light)' }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                      ✓ Tasks
                    </h3>

                    <div>
                      <label className="text-sm font-medium text-secondary uppercase mb-2 block">
                        Task List
                      </label>
                      <select
                        value={account.selectedTaskListId || ''}
                        onChange={(e) => handleSetTaskList(account.id, e.target.value)}
                        disabled={saving || !taskLists[account.id]}
                        style={{
                          width: '100%',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-sage-border)',
                          fontSize: 14,
                        }}
                      >
                        <option value="">All task lists</option>
                        {taskLists[account.id]?.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.title}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                        Tasks from this list will appear in your daily dashboard. Leave empty to show all.
                      </p>
                    </div>
                  </div>

                  {/* Disconnect */}
                  <div style={{ paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-sage-border-light)' }}>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#DC2626',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Disconnect Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--color-sage-border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h3 className="text-md font-semibold" style={{ margin: 0 }}>Themes</h3>
          <span className="text-xs text-muted">{themes.length} total</span>
        </div>

        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-3)' }}>
          Define themes here before planning actions and experiments.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <input
            className="input"
            value={newThemeTitle}
            onChange={(event) => setNewThemeTitle(event.target.value)}
            placeholder="Create a new theme..."
            maxLength={120}
          />
          <Button variant="secondary" size="sm" onClick={handleCreateTheme} disabled={creatingTheme}>
            {creatingTheme ? 'Creating...' : 'Add Theme'}
          </Button>
        </div>

        {themeError ? (
          <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-critical)', fontSize: 13 }}>{themeError}</p>
        ) : null}

        {themes.length === 0 ? (
          <p className="text-sm text-muted" style={{ margin: 0 }}>No themes yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {themes.map((theme) => (
              <div
                key={theme.id}
                style={{
                  border: '1px solid var(--color-sage-border-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--color-bg)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {theme.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
