// Where Am I Page - Season time allocation and intention breakdown
// Replaces /themes-overview with focused season-scoped view

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useThemes, useAllThemeHours } from '../hooks/useCards'
import { useActiveSeason } from '../hooks/useSeasons'
import { AppLayout } from '../components/layout'
import { apiFetch } from '../lib/apiFetch'
import { DEFAULT_TAGS, getTagValueConfig } from '../utils/tagConfig'
import { format } from 'date-fns'

// Theme color palette (sage green shades)
const THEME_COLORS = ['#7A8B5C', '#8B9467', '#9BA578', '#ABB589', '#BBC99A']

interface ThemeRowProps {
  name: string
  allocation: number
  hours: number
  color: string
}

function ThemeRow({ name, allocation, hours, color }: ThemeRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 0',
        borderBottom: '1px solid rgba(139, 148, 103, 0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', lineHeight: 1.4 }}>{name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#8B9467' }}>{allocation}%</span>
          <span style={{ color: '#ccc', fontSize: 10 }}>•</span>
          <span style={{ fontSize: 13, color: '#999' }}>{hours}h</span>
        </div>
      </div>
      <div style={{ marginLeft: 20 }}>
        <div style={{ height: 8, background: 'rgba(139, 148, 103, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${allocation}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s ease' }} />
        </div>
      </div>
    </div>
  )
}

interface DistributionItem {
  label: string
  value: number
  color: string
}

function StackedDistributionBar({ items }: { items: DistributionItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return null

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(139, 148, 103, 0.1)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Time Distribution
      </div>
      <div style={{ height: 40, borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
        {items.map((item, index) => {
          const percentage = Math.round((item.value / total) * 100)
          const showLabel = percentage >= 15
          return (
            <div
              key={index}
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`${item.label}: ${item.value}h (${percentage}%)`}
            >
              {showLabel && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {percentage}%
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: 11, color: '#666' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function WhereAmIPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: themes } = useThemes()
  const { data: themeHoursData } = useAllThemeHours(season?.id)

  const seasonDateRange = useMemo(() => {
    if (!season) return null
    const start = new Date(season.startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + season.durationWeeks * 7)
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
  }, [season])

  const { data: tagStats, isLoading: tagStatsLoading } = useQuery({
    queryKey: ['tagStats', 'season', seasonDateRange?.start],
    queryFn: async () => {
      const params = `seasonStart=${seasonDateRange?.start}&seasonEnd=${seasonDateRange?.end}`
      const res = await apiFetch(`/api/tags/stats?${params}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!seasonDateRange,
    staleTime: 5 * 60 * 1000,
  })

  const themeAllocations = useMemo(() => {
    if (!season || !season.themeAllocations) return []
    const hours = themeHoursData || {}
    const themeMap = new Map((themes || []).map(t => [String(t.id), t.title]))

    return Object.entries(season.themeAllocations as Record<string, number>)
      .map(([themeId, alloc]) => ({
        id: themeId,
        title: themeMap.get(themeId) || themeId,
        allocation: Math.round(alloc * 100),
        hours: Math.round((hours[themeId] || 0) * 10) / 10,
      }))
      .filter(t => t.allocation > 0)
      .sort((a, b) => b.allocation - a.allocation)
  }, [season, themeHoursData, themes])

  const intentionData = useMemo(() => {
    if (!tagStats?.intention) return []
    const total = tagStats.intention.total || 1

    const data = (DEFAULT_TAGS.find(t => t.name === 'intention')?.values || [])
      .map(tagValue => {
        const hours = tagStats.intention.byValue[tagValue.value] || 0
        const config = getTagValueConfig('intention', tagValue.value)
        return {
          id: tagValue.value,
          title: tagValue.displayName,
          percentage: Math.round((hours / total) * 100),
          hours: Math.round(hours * 10) / 10,
          color: config?.color || '#9E9E9E',
        }
      })
      .filter(item => item.hours > 0)

    const untaggedHours = tagStats.intention.untagged || 0
    if (untaggedHours > 0) {
      data.push({
        id: 'untagged',
        title: 'Untagged',
        percentage: Math.round((untaggedHours / total) * 100),
        hours: Math.round(untaggedHours * 10) / 10,
        color: '#BDBDBD',
      })
    }

    data.sort((a, b) => b.hours - a.hours)
    return data
  }, [tagStats])

  const cardStyle = {
    background: 'white',
    borderRadius: 16,
    padding: 20,
    border: '1px solid rgba(139, 148, 103, 0.1)',
  }

  const headingStyle = {
    fontSize: 11,
    fontWeight: 600 as const,
    color: '#999',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: 0,
  }

  const emptyStyle = {
    padding: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f8f6',
    borderRadius: 12,
  }

  return (
    <AppLayout>
      <main className="main-v3" style={{ paddingTop: 16 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Where am I?</h1>
            {season && !seasonLoading && (
              <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                {season.name} &mdash; season time allocation
              </p>
            )}
          </div>

          {/* Am I on track — season-scoped intention breakdown */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={headingStyle}>Am I on track</h3>
              {season && seasonDateRange && (
                <span style={{ fontSize: 11, color: '#aaa' }}>
                  {seasonDateRange.start} &ndash; {seasonDateRange.end}
                </span>
              )}
            </div>

            {seasonLoading || (season && tagStatsLoading) ? (
              <div style={emptyStyle}>
                <p style={{ color: '#999', fontSize: 13 }}>Loading...</p>
              </div>
            ) : !season ? (
              <div style={emptyStyle}>
                <p style={{ color: '#999', fontSize: 13 }}>No active season</p>
              </div>
            ) : !tagStats ? (
              <div style={emptyStyle}>
                <p style={{ color: '#999', fontSize: 13 }}>No data for this season</p>
              </div>
            ) : intentionData.length === 0 ? (
              <div style={emptyStyle}>
                <p style={{ color: '#999', fontSize: 13 }}>No data for this season</p>
              </div>
            ) : (
              <>
                <div>
                  {intentionData.map(item => (
                    <ThemeRow
                      key={item.id}
                      name={item.title}
                      allocation={item.percentage}
                      hours={item.hours}
                      color={item.color}
                    />
                  ))}
                </div>
                <StackedDistributionBar
                  items={intentionData.map(item => ({ label: item.title, value: item.hours, color: item.color }))}
                />
              </>
            )}
          </div>

          {/* Theme Time Allocation for current season */}
          <div style={cardStyle}>
            <h3 style={{ ...headingStyle, marginBottom: 16 }}>Theme Time Allocation</h3>

            {themeAllocations.length === 0 ? (
              <div style={emptyStyle}>
                <p style={{ color: '#999', fontSize: 13, textAlign: 'center' }}>
                  No themes allocated.<br />Set allocations in season settings.
                </p>
              </div>
            ) : (
              <>
                <div>
                  {themeAllocations.map((theme, index) => (
                    <ThemeRow
                      key={theme.id}
                      name={theme.title}
                      allocation={theme.allocation}
                      hours={theme.hours}
                      color={THEME_COLORS[index % THEME_COLORS.length]}
                    />
                  ))}
                </div>
                <StackedDistributionBar
                  items={themeAllocations.map((theme, index) => ({
                    label: theme.title,
                    value: theme.allocation,
                    color: THEME_COLORS[index % THEME_COLORS.length],
                  }))}
                />
              </>
            )}
          </div>

        </div>
      </main>
    </AppLayout>
  )
}
