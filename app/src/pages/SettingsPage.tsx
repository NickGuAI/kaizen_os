import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input, Select } from '../components/ui'
import { useUserSettings, useUpdateUserSettings } from '../hooks/useUserSettings'
import { useSubscription, useCreateCheckoutSession, useCreatePortalSession } from '../hooks/useSubscription'
import { KAIZEN_DB_TOOLS, CALENDAR_TOOLS, KaizenDbTool, UserSettings, DEFAULT_USER_SETTINGS } from '../services/userSettingsTypes'
import { ProviderSettings } from '../components/settings/ProviderSettings'
import { NotionSettings } from '../components/settings/NotionSettings'
import { TimezoneSettings } from '../components/settings/TimezoneSettings'
import { ApiKeySettings } from '../components/settings/ApiKeySettings'
import { AppLayout } from '../components/layout'
import { useAuth } from '../lib/authContext'
import { UsageSummary } from '../components/UsageSummary'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { data: settings, isLoading } = useUserSettings()
  const { data: subscription, isLoading: subLoading } = useSubscription()
  const createCheckout = useCreateCheckoutSession()
  const createPortal = useCreatePortalSession()
  const updateSettings = useUpdateUserSettings()
  const [form, setForm] = useState<UserSettings>(DEFAULT_USER_SETTINGS)

  useEffect(() => {
    if (settings) {
      setForm({ ...DEFAULT_USER_SETTINGS, ...settings })
    }
  }, [settings])

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(form)
      navigate('/')
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleMcpToolToggle = (toolKey: string) => {
    const tools = form.agentAllowedTools.includes(toolKey)
      ? form.agentAllowedTools.filter(t => t !== toolKey)
      : [...form.agentAllowedTools, toolKey]
    handleChange('agentAllowedTools', tools)
  }

  const handleCalendarToolToggle = (toolKey: string) => {
    const tools = form.agentCalendarTools.includes(toolKey)
      ? form.agentCalendarTools.filter(t => t !== toolKey)
      : [...form.agentCalendarTools, toolKey]
    handleChange('agentCalendarTools', tools)
  }

  const calendarWriteTools = Object.entries(CALENDAR_TOOLS).filter(
    ([, tool]) => tool.category === 'write'
  )
  const calendarDeleteTool = Object.entries(CALENDAR_TOOLS).find(
    ([, tool]) => tool.category === 'destructive'
  )

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const readTools = Object.entries(KAIZEN_DB_TOOLS).filter(
    ([key]) => KAIZEN_DB_TOOLS[key as KaizenDbTool].category === 'read'
  )
  const writeTools = Object.entries(KAIZEN_DB_TOOLS).filter(
    ([key]) => KAIZEN_DB_TOOLS[key as KaizenDbTool].category === 'write'
  )

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <AppLayout>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, width: '100%', minWidth: 0 }}>
        <main style={{ padding: 'var(--space-8) var(--space-6)', width: '100%' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Settings</h1>
        {/* Regular Settings Grid */}
        <div className="settings-grid">

          {/* COLUMN 1: Limits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
              Limits
            </h2>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>WIP Limits</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Input label="Max Themes" type="number" value={form.maxThemes} onChange={(e) => handleChange('maxThemes', parseInt(e.target.value))} />
                <Input label="Max Gates/Theme" type="number" value={form.maxGatesPerTheme} onChange={(e) => handleChange('maxGatesPerTheme', parseInt(e.target.value))} />
                <Input label="Max Experiments/Theme" type="number" value={form.maxExperimentsPerTheme} onChange={(e) => handleChange('maxExperimentsPerTheme', parseInt(e.target.value))} />
                <Input label="Max Routines/Theme" type="number" value={form.maxRoutinesPerTheme} onChange={(e) => handleChange('maxRoutinesPerTheme', parseInt(e.target.value))} />
                <Input label="Max Ops/Theme" type="number" value={form.maxOpsPerTheme} onChange={(e) => handleChange('maxOpsPerTheme', parseInt(e.target.value))} />
              </div>
            </Card>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Requirements</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Input label="Min Criteria/Experiment" type="number" value={form.minCriteriaPerExperiment} onChange={(e) => handleChange('minCriteriaPerExperiment', parseInt(e.target.value))} />
                <Input label="Min Criteria/Gate" type="number" value={form.minCriteriaPerGate} onChange={(e) => handleChange('minCriteriaPerGate', parseInt(e.target.value))} />
              </div>
            </Card>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Season Defaults</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <Input label="Duration (Weeks)" type="number" value={form.defaultSeasonWeeks} onChange={(e) => handleChange('defaultSeasonWeeks', parseInt(e.target.value))} />
                <Input label="Lag (Weeks)" type="number" value={form.defaultLagWeeks} onChange={(e) => handleChange('defaultLagWeeks', parseInt(e.target.value))} />
              </div>
            </Card>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Classification Rules</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                Auto-assign calendar events to actions based on title patterns.
              </p>
              <Button variant="secondary" onClick={() => navigate('/settings/rules')}>
                Manage Rules →
              </Button>
            </Card>
          </div>

          {/* COLUMN 2: App Part 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
              App
            </h2>

            <UsageSummary />

            <ProviderSettings />

            <NotionSettings />

            <TimezoneSettings />

            <ApiKeySettings />

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Email Notifications</h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                Receive a daily end-of-day summary and a weekly review reminder on your planning day.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={form.emailDailySummary}
                      onChange={(e) => handleChange('emailDailySummary', e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <span style={{ fontWeight: 500 }}>Daily Summary</span>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        End-of-day digest with theme hours, tasks, and focus items.
                      </p>
                    </div>
                  </label>
                  {form.emailDailySummary && (
                    <div style={{ marginTop: 8, marginLeft: 22 }}>
                      <Select
                        label="Send at"
                        value={String(form.emailDailySummaryHour)}
                        onChange={(e) => handleChange('emailDailySummaryHour', parseInt(e.target.value))}
                        options={Array.from({ length: 24 }, (_, h) => ({
                          value: String(h),
                          label: `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}`,
                        }))}
                      />
                    </div>
                  )}
                </div>

                <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={form.emailWeeklyReview}
                      onChange={(e) => handleChange('emailWeeklyReview', e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <span style={{ fontWeight: 500 }}>Weekly Review Reminder</span>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Morning nudge on your planning day to start your weekly review.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </Card>
          </div>

          {/* COLUMN 3: App Part 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
              &nbsp;
            </h2>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Planning Schedule</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                Choose which day of the week you do your weekly planning.
              </p>
              <Select
                label="Planning Day"
                value={String(form.planningDay)}
                onChange={(e) => handleChange('planningDay', parseInt(e.target.value))}
                options={[
                  { value: '0', label: 'Sunday' },
                  { value: '1', label: 'Monday' },
                  { value: '2', label: 'Tuesday' },
                  { value: '3', label: 'Wednesday' },
                  { value: '4', label: 'Thursday' },
                  { value: '5', label: 'Friday' },
                  { value: '6', label: 'Saturday' },
                ]}
              />
            </Card>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Subscription</h3>
              {subLoading ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading...</p>
              ) : !subscription || subscription.tier === 'free' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>Free Plan</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      $5.00 AI credit/month
                    </p>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Upgrade to Pro for more AI credits and features.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => createCheckout.mutate()}
                    disabled={createCheckout.isPending}
                  >
                    {createCheckout.isPending ? 'Loading...' : 'Upgrade to Pro'}
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>Pro Plan</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      $15.00 AI credit/month
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Status: {subscription?.status || 'Unknown'}
                    </p>
                    {subscription?.periodEnd && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Renews: {new Date(subscription.periodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => createPortal.mutate()}
                    disabled={createPortal.isPending}
                  >
                    {createPortal.isPending ? 'Loading...' : 'Manage Billing'}
                  </Button>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Account</h3>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                Sign out of your account on this device.
              </p>
              <Button variant="secondary" onClick={handleLogout}>
                Log Out
              </Button>
            </Card>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Agent Tools</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <label className="text-xs font-medium text-secondary uppercase mb-2 block">DB Read</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--color-bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                    {readTools.map(([key, tool]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.agentAllowedTools.includes(key)} onChange={() => handleMcpToolToggle(key)} />
                        <span style={{ fontWeight: 500 }}>{tool.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-secondary uppercase mb-2 block">
                    DB Write <span style={{ color: 'var(--color-warning)', fontSize: 10 }}>⚠️</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--color-bg-secondary)', borderRadius: 6, fontSize: 13, border: '1px solid #e5a00d33' }}>
                    {writeTools.map(([key, tool]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.agentAllowedTools.includes(key)} onChange={() => handleMcpToolToggle(key)} />
                        <span style={{ fontWeight: 500 }}>{tool.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Calendar Tools</h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
                Allow agent to create, update, or delete events on your Google Calendar.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <label className="text-xs font-medium text-secondary uppercase mb-2 block">
                    Write Tools <span style={{ color: 'var(--color-warning)', fontSize: 10 }}>⚠️</span>
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--color-bg-secondary)', borderRadius: 6, fontSize: 13, border: '1px solid #e5a00d33' }}>
                    {calendarWriteTools.map(([key, tool]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.agentCalendarTools.includes(key)}
                          onChange={() => handleCalendarToolToggle(key)}
                        />
                        <span style={{ fontWeight: 500 }}>{tool.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {calendarDeleteTool && (
                  <div>
                    <label className="text-xs font-medium text-secondary uppercase mb-2 block" style={{ color: '#dc2626' }}>
                      Destructive Tools
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: '#ff000008', borderRadius: 6, fontSize: 13, border: '1px solid #ff000033' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: form.agentCalendarDeleteAcknowledged ? 'pointer' : 'not-allowed', opacity: form.agentCalendarDeleteAcknowledged ? 1 : 0.5 }}>
                        <input
                          type="checkbox"
                          checked={form.agentCalendarTools.includes(calendarDeleteTool[0]) && form.agentCalendarDeleteEnabled}
                          disabled={!form.agentCalendarDeleteAcknowledged}
                          onChange={() => {
                            const isCurrentlyEnabled = form.agentCalendarTools.includes(calendarDeleteTool[0])
                            const newTools = isCurrentlyEnabled
                              ? form.agentCalendarTools.filter(t => t !== calendarDeleteTool[0])
                              : [...form.agentCalendarTools, calendarDeleteTool[0]]
                            setForm(prev => ({
                              ...prev,
                              agentCalendarTools: newTools,
                              agentCalendarDeleteEnabled: !isCurrentlyEnabled,
                            }))
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>{calendarDeleteTool[1].name}</span>
                      </label>
                      <p style={{ fontSize: 11, color: '#dc2626', marginLeft: 22 }}>
                        This allows the agent to permanently delete events from your Google Calendar. This action CANNOT be undone.
                      </p>
                      <div style={{ marginTop: 4, marginLeft: 22, padding: 8, background: '#fff', borderRadius: 4, border: '1px solid #ff000022' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                          <input
                            type="checkbox"
                            checked={form.agentCalendarDeleteAcknowledged}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                setForm(prev => ({
                                  ...prev,
                                  agentCalendarDeleteAcknowledged: false,
                                  agentCalendarDeleteEnabled: false,
                                  agentCalendarTools: prev.agentCalendarTools.filter(t => t !== calendarDeleteTool[0]),
                                }))
                              } else {
                                handleChange('agentCalendarDeleteAcknowledged', true)
                              }
                            }}
                            style={{ marginTop: 2 }}
                          />
                          <span>I understand that deleted events cannot be recovered</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
          <Button variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Settings</Button>
        </div>
        </main>
      </div>
    </AppLayout>
  )
}
