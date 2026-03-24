import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import { Badge } from '../ui';

interface ThemeSummary {
  themeId: string;
  themeName: string;
  actualHours: number;
  plannedHours: number;
  color: string;
}

interface OpsCard {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  completionDate: string | null;
  parentTheme: { id: string; title: string } | null;
}

interface SummaryData {
  themeSummaries: ThemeSummary[];
  totalHours: number;
  totalEvents: number;
  completedOps: OpsCard[];
  activeOps: OpsCard[];
}

interface Props {
  weekStart: string;
}

export function ReviewSummary({ weekStart }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        const [reviewRes, opsRes] = await Promise.all([
          apiFetch(`/api/calendar/review?weekStart=${weekStart}`),
          apiFetch(`/api/cards/week-summary?weekStart=${weekStart}`),
        ]);

        const review = await reviewRes.json();
        const ops = await opsRes.json();

        setData({
          themeSummaries: review.themeSummaries || [],
          totalHours: review.summary?.totalHours || 0,
          totalEvents: review.summary?.totalEvents || 0,
          completedOps: ops.completed || [],
          activeOps: ops.active || [],
        });
      } catch (err) {
        console.error('Failed to load review summary', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [weekStart]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#999' }}>
        Loading summary...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#999' }}>
        Could not load summary.
      </div>
    );
  }

  const totalActual = data.themeSummaries.reduce((sum, t) => sum + t.actualHours, 0);
  const totalPlanned = data.themeSummaries.reduce((sum, t) => sum + t.plannedHours, 0);

  return (
    <div>
      {/* Week at a Glance */}
      <div style={{
        background: 'var(--color-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-sage-border-light)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-5)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 'var(--space-4)' }}>
          Week at a Glance
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-6)' }}>
          <StatBlock label="Total Hours" value={`${totalActual}h`} sub={`of ${totalPlanned}h planned`} />
          <StatBlock label="Events" value={String(data.totalEvents)} />
          <StatBlock label="Ops Completed" value={String(data.completedOps.length)} color="var(--color-success)" />
          <StatBlock label="Ops Active" value={String(data.activeOps.length)} />
        </div>
      </div>

      {/* Hours by Theme */}
      {data.themeSummaries.length > 0 && (
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-sage-border-light)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-5)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 'var(--space-4)' }}>
            Hours by Theme
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {data.themeSummaries.map(theme => (
              <ThemeRow key={theme.themeId} theme={theme} totalActual={totalActual} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Ops */}
      <div style={{
        background: 'var(--color-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-sage-border-light)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-5)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>
            Completed Ops
          </span>
          <Badge variant="success">{data.completedOps.length}</Badge>
        </div>
        {data.completedOps.length === 0 ? (
          <div style={{ fontSize: 13, color: '#999' }}>No ops completed this week.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {data.completedOps.map(op => (
              <OpsRow key={op.id} op={op} variant="completed" />
            ))}
          </div>
        )}
      </div>

      {/* Active Ops */}
      <div style={{
        background: 'var(--color-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-sage-border-light)',
        padding: 'var(--space-6)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>
            Active Ops
          </span>
          <Badge variant="default">{data.activeOps.length}</Badge>
        </div>
        {data.activeOps.length === 0 ? (
          <div style={{ fontSize: 13, color: '#999' }}>No active ops.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {data.activeOps.map(op => (
              <OpsRow key={op.id} op={op} variant="active" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function StatBlock({ label, value, sub, color }: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div>
      <div style={{
        fontSize: 28,
        fontWeight: 600,
        fontFamily: 'monospace',
        color: color || '#333',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#999' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ThemeRow({ theme, totalActual }: { theme: ThemeSummary; totalActual: number }) {
  const colors: Record<string, string> = {
    blue: '#6B7FD7',
    green: '#27AE60',
    purple: '#9B59B6',
    orange: '#F39C12',
  };
  const color = colors[theme.color] || '#8B9467';
  const pctOfTotal = totalActual > 0 ? Math.round((theme.actualHours / totalActual) * 100) : 0;
  const pctOfPlanned = theme.plannedHours > 0
    ? Math.round((theme.actualHours / theme.plannedHours) * 100)
    : 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-sage-border-light)',
    }}>
      <div style={{ width: 4, height: 24, borderRadius: 2, background: color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{theme.themeName}</div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 80 }}>
        <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace' }}>
          {theme.actualHours}h
        </span>
        <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
          / {theme.plannedHours}h
        </span>
      </div>
      <div style={{
        width: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        <div style={{
          height: 6,
          background: 'rgba(139, 148, 103, 0.1)',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, pctOfPlanned)}%`,
            background: color,
            borderRadius: 3,
          }} />
        </div>
        <span style={{ fontSize: 10, color: '#999', textAlign: 'right' }}>
          {pctOfTotal}% of week
        </span>
      </div>
    </div>
  );
}

function OpsRow({ op, variant }: { op: OpsCard; variant: 'completed' | 'active' }) {
  const dateStr = variant === 'completed' && op.completionDate
    ? new Date(op.completionDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : op.targetDate
      ? `Due: ${new Date(op.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
      : '';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)',
      background: variant === 'completed' ? 'rgba(39, 174, 96, 0.04)' : 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-sage-border-light)',
    }}>
      <span style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        background: variant === 'completed' ? 'rgba(39, 174, 96, 0.15)' : 'rgba(139, 148, 103, 0.1)',
        color: variant === 'completed' ? 'var(--color-success)' : 'var(--color-sage)',
      }}>
        {variant === 'completed' ? '\u2713' : '\u25B6'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#333',
          textDecoration: variant === 'completed' ? 'line-through' : 'none',
          opacity: variant === 'completed' ? 0.7 : 1,
        }}>
          {op.title}
        </div>
      </div>
      {op.parentTheme && (
        <span style={{ fontSize: 11, color: '#999' }}>{op.parentTheme.title}</span>
      )}
      {dateStr && (
        <span style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap' }}>{dateStr}</span>
      )}
    </div>
  );
}
