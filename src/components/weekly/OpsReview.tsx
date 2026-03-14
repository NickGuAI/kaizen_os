import { useState } from 'react';
import { useOpsReview, useUpdateCard } from '../../hooks/useCards';
import { Button, Badge } from '../ui';
import { formatDateForInput } from '../../utils/dateUtils';
import type { OpsReviewCard } from '../../lib/api';

interface Props {
  weekStart: string;
}

export function OpsReview({ weekStart }: Props) {
  const { data: ops = [], isLoading } = useOpsReview(weekStart);
  const updateCard = useUpdateCard();
  const [actionTaken, setActionTaken] = useState<Record<string, 'completed' | 'carried'>>({});

  // Next Monday = weekStart + 7 days
  const nextMonday = new Date(weekStart);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const nextMondayStr = nextMonday.toISOString().split('T')[0];

  // Sunday of the reviewed week — ops completed during review are stamped to this date
  // regardless of what day (Mon/Tue/etc) the user actually does their review
  const reviewedSunday = new Date(weekStart);
  reviewedSunday.setDate(reviewedSunday.getDate() + 6);
  const reviewedSundayStr = reviewedSunday.toISOString().split('T')[0];

  // Group by parent theme
  const grouped = ops.reduce<Record<string, { theme: { id: string; title: string }; cards: OpsReviewCard[] }>>((acc, op) => {
    const themeId = op.parentTheme?.id || 'unassigned';
    if (!acc[themeId]) {
      acc[themeId] = {
        theme: op.parentTheme || { id: 'unassigned', title: 'No Theme' },
        cards: [],
      };
    }
    acc[themeId].cards.push(op);
    return acc;
  }, {});

  async function handleComplete(cardId: string) {
    await updateCard.mutateAsync({
      id: cardId,
      data: { status: 'completed', completionDate: reviewedSundayStr },
    });
    setActionTaken(prev => ({ ...prev, [cardId]: 'completed' }));
  }

  async function handleCarryOver(cardId: string) {
    await updateCard.mutateAsync({
      id: cardId,
      data: { targetDate: nextMondayStr },
    });
    setActionTaken(prev => ({ ...prev, [cardId]: 'carried' }));
  }

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#999' }}>
        Loading ops...
      </div>
    );
  }

  if (ops.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-8)',
        textAlign: 'center',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-sage-border-light)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 'var(--space-2)' }}>
          &#10003;
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#333' }}>
          No ops due this week
        </div>
        <div style={{ fontSize: 13, color: '#999', marginTop: 'var(--space-1)' }}>
          All operational tasks are on track.
        </div>
      </div>
    );
  }

  const pendingCount = ops.filter(o => !actionTaken[o.id]).length;
  const overdueCount = ops.filter(o => o.overdue).length;

  return (
    <div>
      {/* Summary */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
      }}>
        <div style={{
          flex: 1,
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-sage-border-light)',
        }}>
          <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{ops.length}</div>
        </div>
        {overdueCount > 0 && (
          <div style={{
            flex: 1,
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(231, 76, 60, 0.05)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(231, 76, 60, 0.2)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-critical)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overdue</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-critical)' }}>{overdueCount}</div>
          </div>
        )}
        <div style={{
          flex: 1,
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-sage-border-light)',
        }}>
          <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{pendingCount}</div>
        </div>
      </div>

      {/* Grouped by theme */}
      {Object.values(grouped).map(({ theme, cards }) => (
        <div key={theme.id} style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
            padding: '0 var(--space-1)',
          }}>
            <div style={{ width: 4, height: 16, borderRadius: 2, background: 'var(--color-sage)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{theme.title}</span>
            <Badge variant="default">{cards.length}</Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {cards.map(card => {
              const action = actionTaken[card.id];
              return (
                <div
                  key={card.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: action ? 'rgba(139, 148, 103, 0.05)' : 'white',
                    borderRadius: 'var(--radius-md)',
                    border: card.overdue
                      ? '1px solid rgba(231, 76, 60, 0.3)'
                      : '1px solid var(--color-sage-border-light)',
                    opacity: action ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#333',
                      textDecoration: action === 'completed' ? 'line-through' : 'none',
                    }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                      {card.targetDate
                        ? `Due: ${formatDateForInput(card.targetDate)}`
                        : 'No due date'}
                      {card.overdue && (
                        <span style={{ color: 'var(--color-critical)', marginLeft: 8, fontWeight: 500 }}>
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {action ? (
                    <Badge variant={action === 'completed' ? 'success' : 'sage'}>
                      {action === 'completed' ? 'Completed' : 'Carried Over'}
                    </Badge>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleComplete(card.id)}
                        disabled={updateCard.isPending}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCarryOver(card.id)}
                        disabled={updateCard.isPending}
                      >
                        Carry Over
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
