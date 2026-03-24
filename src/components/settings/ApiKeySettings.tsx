import { useMemo, useState } from 'react'
import { ApiKeyRecord, CreateApiKeyRequest } from '../../lib/api'
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../../hooks/useApiKeys'
import { Badge, Button, Card, Input } from '../ui'

type ApiKeyScope = 'read' | 'write' | 'delete'
type ApiServer = 'kaizen-db' | 'workitems' | 'calendar'

const SCOPE_OPTIONS: Array<{ value: ApiKeyScope; label: string; variant: 'default' | 'warning' | 'critical' }> = [
  { value: 'read', label: 'Read', variant: 'default' },
  { value: 'write', label: 'Write', variant: 'warning' },
  { value: 'delete', label: 'Delete', variant: 'critical' },
]

const SERVER_OPTIONS: Array<{ value: ApiServer; label: string }> = [
  { value: 'kaizen-db', label: 'kaizen-db' },
  { value: 'workitems', label: 'workitems' },
  { value: 'calendar', label: 'calendar' },
]

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown'
  }

  return parsed.toLocaleString()
}

function sortByActiveThenCreated(keys: ApiKeyRecord[]): ApiKeyRecord[] {
  return [...keys].sort((a, b) => {
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function ApiKeySettings() {
  const { data: keys = [], isLoading } = useApiKeys()
  const createApiKey = useCreateApiKey()
  const revokeApiKey = useRevokeApiKey()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['read'])
  const [allowedServers, setAllowedServers] = useState<ApiServer[]>(['kaizen-db'])
  const [expiresOn, setExpiresOn] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const sortedKeys = useMemo(() => sortByActiveThenCreated(keys), [keys])
  const canSubmit = name.trim().length > 0 && scopes.length > 0 && allowedServers.length > 0

  const toggleScope = (scope: ApiKeyScope) => {
    setScopes(prev => (
      prev.includes(scope)
        ? prev.filter(value => value !== scope)
        : [...prev, scope]
    ))
  }

  const toggleServer = (server: ApiServer) => {
    setAllowedServers(prev => (
      prev.includes(server)
        ? prev.filter(value => value !== server)
        : [...prev, server]
    ))
  }

  const handleCreate = async () => {
    if (!canSubmit) {
      return
    }

    try {
      setErrorMessage(null)
      const response = await createApiKey.mutateAsync({
        name: name.trim(),
        scopes: scopes as CreateApiKeyRequest['scopes'],
        allowedServers: allowedServers as CreateApiKeyRequest['allowedServers'],
        ...(expiresOn && { expiresAt: new Date(`${expiresOn}T23:59:59.999Z`).toISOString() }),
      })

      setNewlyCreatedKey(response.key)
      setShowCreate(false)
      setName('')
      setScopes(['read'])
      setAllowedServers(['kaizen-db'])
      setExpiresOn('')
      setCopyStatus('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create API key'
      setErrorMessage(message)
    }
  }

  const handleRevoke = async (id: string, keyName: string) => {
    const confirmed = window.confirm(`Revoke API key "${keyName}"?`)
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage(null)
      await revokeApiKey.mutateAsync(id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke API key'
      setErrorMessage(message)
    }
  }

  const handleCopy = async () => {
    if (!newlyCreatedKey) {
      return
    }

    try {
      await navigator.clipboard.writeText(newlyCreatedKey)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <div>
          <h3 className="text-md font-semibold">API Keys</h3>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Create keys for external MCP clients. Keys are shown only once at creation time.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowCreate(prev => !prev)}>
          {showCreate ? 'Close' : 'Create Key'}
        </Button>
      </div>

      {errorMessage && (
        <div style={{ marginBottom: 'var(--space-3)', fontSize: 12, color: 'var(--color-critical)' }}>
          {errorMessage}
        </div>
      )}

      {showCreate && (
        <div style={{ marginBottom: 'var(--space-4)', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <Input
              label="Key Name"
              placeholder="OpenClaw production"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <div>
              <label className="text-xs font-medium text-secondary uppercase mb-2 block">Scopes</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SCOPE_OPTIONS.map(option => (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#fff', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={scopes.includes(option.value)}
                      onChange={() => toggleScope(option.value)}
                    />
                    <Badge variant={option.variant}>{option.label}</Badge>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-secondary uppercase mb-2 block">Allowed Servers</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SERVER_OPTIONS.map(option => (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#fff', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={allowedServers.includes(option.value)}
                      onChange={() => toggleServer(option.value)}
                    />
                    <span style={{ fontSize: 12 }}>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Input
              label="Expiry (Optional)"
              type="date"
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button variant="primary" disabled={!canSubmit || createApiKey.isPending} onClick={handleCreate}>
                {createApiKey.isPending ? 'Creating...' : 'Create Key'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading API keys...</p>
      ) : sortedKeys.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: 12, borderRadius: 6, background: 'var(--color-bg-secondary)' }}>
          No API keys yet. Use API keys to let tools like OpenClaw call your MCP endpoints over HTTP.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '8px 6px' }}>Name</th>
                <th style={{ padding: '8px 6px' }}>Prefix</th>
                <th style={{ padding: '8px 6px' }}>Scopes</th>
                <th style={{ padding: '8px 6px' }}>Servers</th>
                <th style={{ padding: '8px 6px' }}>Last Used</th>
                <th style={{ padding: '8px 6px' }}>Created</th>
                <th style={{ padding: '8px 6px' }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedKeys.map(key => (
                <tr key={key.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ fontWeight: 500 }}>{key.name}</div>
                    {!key.isActive && <span style={{ color: 'var(--color-critical)' }}>Revoked</span>}
                  </td>
                  <td style={{ padding: '8px 6px', fontFamily: 'monospace' }}>{key.keyPrefix}...</td>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {key.scopes.map(scope => (
                        <Badge
                          key={scope}
                          variant={scope === 'delete' ? 'critical' : scope === 'write' ? 'warning' : 'default'}
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {key.allowedServers.map(server => (
                        <Badge key={server} variant="sage">{server}</Badge>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '8px 6px' }}>{formatDate(key.lastUsedAt)}</td>
                  <td style={{ padding: '8px 6px' }}>{formatDate(key.createdAt)}</td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                    {key.isActive && (
                      <Button
                        variant="secondary"
                        onClick={() => handleRevoke(key.id, key.name)}
                        disabled={revokeApiKey.isPending}
                        style={{ color: 'var(--color-critical)' }}
                      >
                        Revoke
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {newlyCreatedKey && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ width: 'min(640px, 100%)', background: 'white', borderRadius: 12, padding: 16 }}>
            <h4 style={{ marginBottom: 8 }}>Save Your API Key</h4>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
              This key is shown once. Store it securely before closing.
            </p>
            <pre style={{ fontSize: 12, padding: 10, borderRadius: 6, background: '#f5f5f5', overflowX: 'auto' }}>{newlyCreatedKey}</pre>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{copyStatus}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={handleCopy}>Copy</Button>
                <Button variant="primary" onClick={() => setNewlyCreatedKey(null)}>I&apos;ve Saved This Key</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
