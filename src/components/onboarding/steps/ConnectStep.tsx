import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../ui'
import { ConnectState } from '../hooks/useOnboarding'

interface Props {
  connectState: ConnectState
  isConnecting: boolean
  isSaving: boolean
  onStartConnect: () => Promise<void>
  onRefreshStatus: () => Promise<void>
}

export function ConnectStep({ connectState, isConnecting, isSaving, onStartConnect, onRefreshStatus }: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const connected = searchParams.get('connected')
    const authError = searchParams.get('error')
    const pending = sessionStorage.getItem('onboarding_connect_pending')

    if (authError) {
      setNotice('Connection failed. Please retry.')
      searchParams.delete('error')
      setSearchParams(searchParams, { replace: true })
      sessionStorage.removeItem('onboarding_connect_pending')
      return
    }

    if (connected === 'true' || pending) {
      setNotice('Account connected. Refreshing status...')
      searchParams.delete('connected')
      setSearchParams(searchParams, { replace: true })
      sessionStorage.removeItem('onboarding_connect_pending')
      onRefreshStatus()
    }
  }, [onRefreshStatus, searchParams, setSearchParams])

  const providerLabel = useMemo(() => {
    if (connectState.provider === 'n2f') {
      return 'N2F (Google fallback)'
    }
    return 'Google'
  }, [connectState.provider])

  const hasAccounts = connectState.connectedAccounts.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div
        style={{
          padding: 'var(--space-4)',
          borderRadius: 12,
          border: '1px solid var(--color-sage-border-light)',
          background: 'rgba(139, 148, 103, 0.09)',
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Start with <strong>{providerLabel}</strong>. You must connect at least one account to continue.
        </p>
      </div>

      <div
        style={{
          padding: 'var(--space-4)',
          borderRadius: 12,
          border: '1px solid var(--color-sage-border-light)',
          background: 'var(--color-card)',
        }}
      >
        {hasAccounts ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 600 }}>Connected accounts</p>
            {connectState.connectedAccounts.map((account) => (
              <p key={account.id} style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                {account.email} ({account.provider})
              </p>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>No connected accounts yet.</p>
        )}
      </div>

      {notice ? (
        <div
          style={{
            padding: 'var(--space-3)',
            borderRadius: 10,
            background: 'rgba(139, 148, 103, 0.12)',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
          }}
        >
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          onClick={async () => {
            sessionStorage.setItem('onboarding_connect_pending', 'true')
            await onStartConnect()
          }}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : 'Start Connection'}
        </Button>

        <Button variant="secondary" onClick={onRefreshStatus} disabled={isSaving}>
          Refresh status
        </Button>
      </div>
    </div>
  )
}
