import { useState } from 'react';
import { useBacklogReview, useUpdateCard } from '../../hooks/useCards';
import { Button, Badge } from '../ui';
import type { BacklogReviewCard, UnitType } from '../../lib/api';

const TYPE_LABELS: Record<string, string> = {
  ACTION_GATE: 'Gate',
  ACTION_EXPERIMENT: 'Experiment',
  ACTION_ROUTINE: 'Routine',
  ACTION_OPS: 'Ops',
};

export function BacklogReview() {
  const { data, isLoading } = useBacklogReview();
  const updateCard = useUpdateCard();
  const [activated, setActivated] = useState<Set<string>>(new Set());

  const backlog = data?.backlog ?? [];
  const wipInfo = data?.wipInfo ?? {};

  // Group by theme
  const grouped = backlog.reduce<Record<string, { theme: { id: string; title: string }; cards: BacklogReviewCard[] }>>((acc, card) => {
    const themeId = card.parentTheme?.id || 'unassigned';
    if (!acc[themeId]) {
      acc[themeId] = {
        theme: card.parentTheme || { id: 'unassigned', title: 'No Theme' },
        cards: [],
      };
    }
    acc[themeId].cards.push(card);
    return acc;
  }, {});

  function canActivate(themeId: string, unitType: UnitType): boolean {
    const info = wipInfo[themeId]?.[unitType];
    if (!info) return true;
    return info.active < info.limit;
  }

  function getSlotLabel(themeId: string, unitType: UnitType): string {
    const info = wipInfo[themeId]?.[unitType];
    if (!info) return '';
    return `${info.active}/${info.limit}`;
  }

  async function handleActivate(cardId: string) {
    await updateCard.mutateAsync({
      id: cardId,
      data: { status: 'in_progress' },
    });
    setActivated(prev => new Set(prev).add(cardId));
  }

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: '#999' }}>
        Loading backlog...
      </div>
    );
  }

  if (backlog.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-8)',
        textAlign: 'center',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-sage-border-light)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 'var(--space-2)' }}>
          &#128203;
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#333' }}>
          No backlogged items
        </div>
        <div style={{ fontSize: 13, color: '#999', marginTop: 'var(--space-1)' }}>
          All actions are either active or completed.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 'var(--space-4)' }}>
        {backlog.length} backlogged {backlog.length === 1 ? 'card' : 'cards'} across {Object.keys(grouped).length} {Object.keys(grouped).length === 1 ? 'theme' : 'themes'}.
        Activate cards to promote them to active work.
      </div>

      {Object.values(grouped).map(({ theme, cards }) => (
        <div key={theme.id} style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
            padding: '0 var(--space-1)',
          }}>
            <div style={{ width: 4, height: 16, borderRadius: 2, background: 'var(--color-sage)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{theme.title}</span>
          </div>

          {/* WIP slot summary for this theme */}
          {wipInfo[theme.id] && (
            <div style={{
              display: 'flex',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-3)',
              padding: '0 var(--space-1)',
            }}>
              {Object.entries(wipInfo[theme.id]).map(([ut, info]) => {
                const hasCards = cards.some(c => c.unitType === ut);
                if (!hasCards) return null;
                const full = info.active >= info.limit;
                return (
                  <span key={ut} style={{
                    fontSize: 11,
                    color: full ? 'var(--color-critical)' : '#666',
                    background: full ? 'rgba(231, 76, 60, 0.08)' : 'rgba(0,0,0,0.03)',
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}>
                    {TYPE_LABELS[ut]}: {info.active}/{info.limit} {full ? '(full)' : ''}
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {cards.map(card => {
              const isActivated = activated.has(card.id);
              const slotAvailable = canActivate(theme.id, card.unitType);
              return (
                <div
                  key={card.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    background: isActivated ? 'rgba(39, 174, 96, 0.05)' : 'white',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-sage-border-light)',
                    opacity: isActivated ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                      {card.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 2 }}>
                      <Badge variant="default">
                        {TYPE_LABELS[card.unitType] || card.unitType}
                      </Badge>
                      <span style={{ fontSize: 11, color: '#999' }}>
                        WIP: {getSlotLabel(theme.id, card.unitType)}
                      </span>
                    </div>
                  </div>

                  {isActivated ? (
                    <Badge variant="success">Activated</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant={slotAvailable ? 'primary' : 'ghost'}
                      onClick={() => handleActivate(card.id)}
                      disabled={!slotAvailable || updateCard.isPending}
                      title={slotAvailable ? 'Promote to active' : 'WIP limit reached'}
                    >
                      {slotAvailable ? 'Activate' : 'Full'}
                    </Button>
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
