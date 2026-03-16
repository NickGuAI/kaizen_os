import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card } from '../ui';
import { apiFetch } from '../../lib/apiFetch';

interface NotionAccount {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  selectedDatabaseIds: string[];
  createdAt: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  url: string;
}

export function NotionSettings() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [accounts, setAccounts] = useState<NotionAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [databases, setDatabases] = useState<Record<string, NotionDatabase[]>>({});
  const [dbLoading, setDbLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetchAccounts();
    if (searchParams.get('notion_connected') === 'true') {
      setConnected(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('notion_connected');
        return next;
      });
    }
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/notion/accounts');
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch Notion accounts:', error);
    }
    setLoading(false);
  }

  async function fetchDatabases(accountId: string) {
    if (databases[accountId]) return;
    setDbLoading(accountId);
    try {
      const res = await apiFetch(`/api/notion/databases?accountId=${accountId}`);
      if (!res.ok) return;
      const data = await res.json();
      setDatabases((prev) => ({ ...prev, [accountId]: data }));
    } catch (error) {
      console.error('Failed to fetch Notion databases:', error);
    }
    setDbLoading(null);
  }

  function handleConnect() {
    // Navigate directly — backend will redirect to Notion OAuth page
    window.location.href = '/api/notion/authorize';
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm('Disconnect this Notion workspace?')) return;
    try {
      await apiFetch(`/api/notion/accounts/${accountId}`, { method: 'DELETE' });
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      if (expandedAccount === accountId) setExpandedAccount(null);
    } catch (error) {
      console.error('Failed to disconnect Notion account:', error);
    }
  }

  async function handleToggleDatabase(accountId: string, databaseId: string) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    const selected = account.selectedDatabaseIds.includes(databaseId)
      ? account.selectedDatabaseIds.filter((id) => id !== databaseId)
      : [...account.selectedDatabaseIds, databaseId];

    setSaving(true);
    try {
      await apiFetch('/api/notion/databases/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, databaseIds: selected }),
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, selectedDatabaseIds: selected } : a))
      );
    } catch (error) {
      console.error('Failed to update Notion database selection:', error);
    }
    setSaving(false);
  }

  function toggleExpand(accountId: string) {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountId);
      fetchDatabases(accountId);
    }
  }

  if (loading) {
    return <Card><p className="text-muted">Loading Notion accounts...</p></Card>;
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 className="text-lg font-semibold">Notion</h2>
        <Button variant="primary" size="sm" onClick={handleConnect}>
          + Connect Workspace
        </Button>
      </div>

      {connected && (
        <div style={{
          padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
          background: 'rgba(52, 168, 83, 0.1)', border: '1px solid rgba(52, 168, 83, 0.3)',
          borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#1a7a3c',
        }}>
          ✓ Notion workspace connected successfully.
        </div>
      )}

      {accounts.length === 0 ? (
        <div style={{
          padding: 'var(--space-6)', textAlign: 'center',
          background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--color-sage-border)',
        }}>
          <p className="text-muted" style={{ marginBottom: 'var(--space-2)' }}>No Notion workspaces connected.</p>
          <p className="text-sm text-muted">Click "+ Connect Workspace" above to link your Notion account.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {accounts.map((account) => (
            <div key={account.id} style={{
              background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-sage-border-light)', overflow: 'hidden',
            }}>
              <div
                style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
                onClick={() => toggleExpand(account.id)}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 16, fontWeight: 700, flexShrink: 0,
                }}>N</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{account.workspaceName || 'Notion Workspace'}</div>
                  <div className="text-sm text-muted">{account.selectedDatabaseIds.length} database(s) synced</div>
                </div>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {expandedAccount === account.id ? '▼' : '▶'}
                </span>
              </div>

              {expandedAccount === account.id && (
                <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-sage-border-light)', background: 'var(--color-card)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
                    Databases to Sync
                  </h3>
                  <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-3)' }}>
                    Select databases you want Kaizen OS to access.
                  </p>

                  {dbLoading === account.id ? (
                    <p className="text-sm text-muted">Loading databases...</p>
                  ) : databases[account.id]?.length === 0 ? (
                    <p className="text-sm text-muted">No databases found. Make sure your integration has access to at least one database in Notion.</p>
                  ) : databases[account.id] ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {databases[account.id].map((db) => (
                        <label key={db.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={account.selectedDatabaseIds.includes(db.id)}
                            onChange={() => handleToggleDatabase(account.id, db.id)}
                            disabled={saving}
                          />
                          <span>{db.title}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">Loading databases...</p>
                  )}

                  <div style={{ paddingTop: 'var(--space-4)', marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-sage-border-light)' }}>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 13, cursor: 'pointer' }}
                    >
                      Disconnect Workspace
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
