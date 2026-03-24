// Theme View Page - v4 redesign matching theme_view.html mock
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCard, useCardChildren, useDeleteCard, useUpdateCard } from '../hooks/useCards'
import { useUserSettings } from '../hooks/useUserSettings'
import { ActionRow } from '../components/theme'
import { AppLayout } from '../components/layout'
import { Card, UnitType, WipTypeStatus } from '../lib/api'

export default function ThemeViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const themeId = id ?? ''

  const { data: theme, isLoading: themeLoading } = useCard(themeId)
  const { data: children } = useCardChildren(themeId)
  const { data: settings } = useUserSettings()
  const deleteMutation = useDeleteCard()
  const updateMutation = useUpdateCard()

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const childrenCount = children?.length ?? 0
  const confirmTextMatches = confirmText === theme?.title

  const handleDelete = async () => {
    if (!theme || !confirmTextMatches) return
    await deleteMutation.mutateAsync({ id: theme.id, cascade: true })
    navigate(-1)
  }

  const startEdit = () => {
    if (!theme) return
    setEditTitle(theme.title)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditTitle('')
  }

  const saveEdit = async () => {
    if (!theme || !editTitle.trim()) return
    await updateMutation.mutateAsync({
      id: theme.id,
      data: { title: editTitle.trim() },
    })
    setIsEditing(false)
    setEditTitle('')
  }

  if (themeLoading) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ color: '#999999' }}>Loading...</div>
        </div>
      </AppLayout>
    )
  }

  if (!theme) {
    return (
      <AppLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ color: '#999999' }}>Theme not found</div>
        </div>
      </AppLayout>
    )
  }

  // Filter children by type and status
  const filterByType = (type: UnitType) => children?.filter((c) => c.unitType === type) || []
  const filterActive = (cards: Card[]) => cards.filter((c) => c.status === 'in_progress' || c.status === 'not_started')
  const filterBacklog = (cards: Card[]) => cards.filter((c) => c.status === 'backlog')

  const gates = filterByType('ACTION_GATE')
  const experiments = filterByType('ACTION_EXPERIMENT')
  const routines = filterByType('ACTION_ROUTINE')
  const ops = filterByType('ACTION_OPS')

  // Compute WIP status client-side from children + settings
  const computeWipStatus = (cards: Card[], max: number): WipTypeStatus => {
    const active = cards.filter(c => c.status === 'in_progress').length
    return { active, max, canAdd: active < max }
  }

  const gatesWip = computeWipStatus(gates, settings?.maxGatesPerTheme ?? 2)
  const experimentsWip = computeWipStatus(experiments, settings?.maxExperimentsPerTheme ?? 1)
  const routinesWip = computeWipStatus(routines, settings?.maxRoutinesPerTheme ?? 5)
  const opsWip = computeWipStatus(ops, settings?.maxOpsPerTheme ?? 3)

  const handleAddCard = (unitType: UnitType) => {
    let isFull = false
    if (unitType === 'ACTION_GATE') isFull = !gatesWip.canAdd
    else if (unitType === 'ACTION_EXPERIMENT') isFull = !experimentsWip.canAdd
    else if (unitType === 'ACTION_ROUTINE') isFull = !routinesWip.canAdd
    else if (unitType === 'ACTION_OPS') isFull = !opsWip.canAdd
    const statusParam = isFull ? '&status=backlog' : ''
    navigate(`/create?type=${unitType}&parentId=${themeId}${statusParam}`)
  }

  return (
    <AppLayout>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '48px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Page Header */}
        <div style={{ marginBottom: 48 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666666',
              fontSize: 14,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  autoFocus
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    color: '#1A1A1A',
                    border: '1px solid #8B9467',
                    borderRadius: 8,
                    padding: '4px 12px',
                    outline: 'none',
                    minWidth: 200,
                  }}
                />
                <button
                  onClick={saveEdit}
                  disabled={!editTitle.trim() || updateMutation.isPending}
                  style={{
                    background: '#8B9467',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 12px',
                    fontSize: 12,
                    color: 'white',
                    cursor: editTitle.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    background: 'rgba(153, 153, 153, 0.1)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 12px',
                    fontSize: 12,
                    color: '#999',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                  {theme.title}
                </h1>
                <button
                  onClick={startEdit}
                  style={{
                    background: 'rgba(139, 148, 103, 0.1)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 12px',
                    fontSize: 12,
                    color: '#8B9467',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: 'rgba(153, 153, 153, 0.1)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '4px 12px',
                    fontSize: 12,
                    color: '#999',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
          {theme.description && (
            <p style={{ fontSize: 14, color: '#666666' }}>{theme.description}</p>
          )}
        </div>

        {/* Action Rows */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          background: 'rgba(139, 148, 103, 0.08)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          <ActionRow
            themeId={themeId}
            label="Gates"
            unitType="ACTION_GATE"
            activeCards={filterActive(gates)}
            backlogCards={filterBacklog(gates)}
            wipStatus={gatesWip}
            onAddCard={() => handleAddCard('ACTION_GATE')}
          />
          <ActionRow
            themeId={themeId}
            label="Experiments"
            unitType="ACTION_EXPERIMENT"
            activeCards={filterActive(experiments)}
            backlogCards={filterBacklog(experiments)}
            wipStatus={experimentsWip}
            onAddCard={() => handleAddCard('ACTION_EXPERIMENT')}
          />
          <ActionRow
            themeId={themeId}
            label="Routines"
            unitType="ACTION_ROUTINE"
            activeCards={filterActive(routines)}
            backlogCards={filterBacklog(routines)}
            wipStatus={routinesWip}
            onAddCard={() => handleAddCard('ACTION_ROUTINE')}
            noStack
          />
          <ActionRow
            themeId={themeId}
            label="Ops"
            unitType="ACTION_OPS"
            activeCards={filterActive(ops)}
            backlogCards={filterBacklog(ops)}
            wipStatus={opsWip}
            onAddCard={() => handleAddCard('ACTION_OPS')}
          />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowDeleteConfirm(false)
            setConfirmText('')
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: '#1A1A1A' }}>
              Delete Theme
            </h3>

            {childrenCount > 0 && (
              <div
                style={{
                  background: '#FEF3CD',
                  border: '1px solid #FFC107',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <p style={{ margin: 0, fontSize: 14, color: '#856404' }}>
                  ⚠️ This theme has <strong>{childrenCount} action{childrenCount > 1 ? 's' : ''}</strong> that will also be deleted.
                </p>
              </div>
            )}

            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#666' }}>
              This action cannot be undone. Type <strong>{theme.title}</strong> to confirm.
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type theme name to confirm"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setConfirmText('')
                }}
                style={{
                  padding: '8px 16px',
                  background: '#f5f5f5',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                  color: '#666',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!confirmTextMatches || deleteMutation.isPending}
                style={{
                  padding: '8px 16px',
                  background: confirmTextMatches ? '#DC3545' : '#ccc',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: confirmTextMatches ? 'pointer' : 'not-allowed',
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
