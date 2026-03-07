import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Select } from '../ui'
import { apiFetch } from '../../lib/apiFetch'

// Common timezones grouped by region
const TIMEZONE_OPTIONS = [
  { group: 'Americas', zones: [
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo' },
  ]},
  { group: 'Europe', zones: [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
    { value: 'Europe/Zurich', label: 'Zurich (CET)' },
  ]},
  { group: 'Asia', zones: [
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Shanghai', label: 'China (CST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  ]},
  { group: 'Pacific', zones: [
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  ]},
]

export function TimezoneSettings() {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  const { data: timezoneData, isLoading } = useQuery({
    queryKey: ['user', 'timezone'],
    queryFn: async () => {
      const res = await apiFetch('/api/users/timezone')
      if (!res.ok) throw new Error('Failed to fetch timezone')
      return res.json()
    },
  })

  const [selectedTimezone, setSelectedTimezone] = useState<string>('')

  useEffect(() => {
    if (timezoneData?.timezone) {
      setSelectedTimezone(timezoneData.timezone)
    }
  }, [timezoneData])

  const updateTimezone = useMutation({
    mutationFn: async (timezone: string) => {
      const res = await apiFetch('/api/users/timezone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      })
      if (!res.ok) throw new Error('Failed to update timezone')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'timezone'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  const handleTimezoneChange = async (value: string) => {
    setSelectedTimezone(value)
    setSaving(true)
    try {
      await updateTimezone.mutateAsync(value)
    } catch (error) {
      console.error('Failed to update timezone:', error)
    } finally {
      setSaving(false)
    }
  }

  // Build flat options list with group labels
  const options = TIMEZONE_OPTIONS.flatMap(group => [
    { value: `__group_${group.group}`, label: `── ${group.group} ──`, disabled: true },
    ...group.zones.map(z => ({ value: z.value, label: z.label })),
  ])

  // Detect browser timezone
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const isUsingBrowserTimezone = selectedTimezone === browserTimezone

  if (isLoading) {
    return <Card><p className="text-muted">Loading timezone...</p></Card>
  }

  return (
    <Card>
      <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>
        Timezone
      </h3>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
        Events on your daily dashboard are filtered based on this timezone.
      </p>

      <Select
        label="Your Timezone"
        value={selectedTimezone}
        onChange={(e) => handleTimezoneChange(e.target.value)}
        options={options}
        disabled={saving}
      />

      {saving && (
        <p style={{ fontSize: 12, color: 'var(--color-sage)', marginTop: 8 }}>
          Saving...
        </p>
      )}

      {!isUsingBrowserTimezone && selectedTimezone && (
        <button
          onClick={() => handleTimezoneChange(browserTimezone)}
          style={{
            marginTop: 8,
            fontSize: 12,
            color: 'var(--color-sage)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Use browser timezone ({browserTimezone})
        </button>
      )}
    </Card>
  )
}
