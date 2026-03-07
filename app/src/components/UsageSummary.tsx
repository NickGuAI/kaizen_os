import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card } from './ui'

export function UsageSummary() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['usage', 'summary'],
    queryFn: () => api.getUsageSummary(),
  })

  const { data: balance } = useQuery({
    queryKey: ['usage', 'balance'],
    queryFn: () => api.getUsageBalance(),
  })

  if (isLoading) {
    return (
      <Card>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading usage...</p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="text-md font-semibold" style={{ marginBottom: 'var(--space-3)' }}>Agent Usage</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost (Month)</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>${summary?.totalCostUsd || '0.00'}</div>
        </div>

        <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sessions</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{summary?.sessionCount || 0}</div>
        </div>

        <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input Tokens</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{summary?.totalInputTokens?.toLocaleString() || 0}</div>
        </div>

        <div style={{ padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output Tokens</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{summary?.totalOutputTokens?.toLocaleString() || 0}</div>
        </div>
      </div>

      {balance && (
        <div style={{ marginTop: 'var(--space-4)', padding: 12, background: 'var(--color-sage-bg)', borderRadius: 6, border: '1px solid var(--color-sage-border-light)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Credit Balance</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, color: 'var(--color-sage-dark)' }}>${balance.balanceUsd}</div>
        </div>
      )}
    </Card>
  )
}
