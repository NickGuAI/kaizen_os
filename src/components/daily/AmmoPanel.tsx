// Ammo Panel - Displays today's playlist (all tasks for the day)
// All items show in a single list. Unassigned items have an indicator.
// Triage (linking to Actions) is done via modal during end-of-week review.
import { useState, useRef, useCallback } from 'react'
import type { WorkItemWithOverlays } from './DailyDashboard'
import { getTodayLocalDate, localDateToUTCRange } from '../../utils/dateUtils'

interface ActionCard {
  id: string
  title: string
  unitType: string
}

export interface AmmoPanelProps {
  playlist: WorkItemWithOverlays[]
  onComplete: (workItemKey: string) => void
  onLink: (workItemKey: string, cardId: string | null) => void
  onPromoteToFocus?: (workItemKey: string) => void
  onRemoveFromFocus?: (workItemKey: string) => void
  onDropFromParking?: (workItemKey: string) => void
  onCreateTask?: (title: string, dueAt?: string) => Promise<void>
  onReorder?: (orderedKeys: string[]) => void
  selectedBlockTitle?: string
  loading?: boolean
  actionCards?: ActionCard[]
  top3Keys?: string[] // Keys of items in top 3 focus
}

type Tab = 'all' | 'active' | 'done'

// Theme color mapping
function getThemeColorClass(title?: string): string {
  if (!title) return 'unassigned'
  const lower = title.toLowerCase()
  if (lower.includes('health') || lower.includes('fitness')) return 'health'
  if (lower.includes('career') || lower.includes('work')) return 'career'
  if (lower.includes('creative') || lower.includes('design')) return 'creative'
  if (lower.includes('relationship') || lower.includes('family')) return 'relationships'
  return 'unassigned'
}

export function AmmoPanel({ playlist, onComplete, onLink, onPromoteToFocus, onRemoveFromFocus, onDropFromParking, onCreateTask, onReorder, selectedBlockTitle, loading, actionCards = [], top3Keys = [] }: AmmoPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [quickAddValue, setQuickAddValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  // Track which item is being triaged (for inline assignment)
  const [triageItemKey, setTriageItemKey] = useState<string | null>(null)
  // Internal playlist drag-and-drop state
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const dragOverRef = useRef<string | null>(null)
  // Panel-level drop zone state for parking lot drags
  const [isParkingDragOver, setIsParkingDragOver] = useState(false)

  const handleDragStart = useCallback((e: React.DragEvent, key: string) => {
    setDraggedKey(key)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', key)
    // Make drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    setDraggedKey(null)
    setDragOverKey(null)
    dragOverRef.current = null
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverRef.current !== key) {
      dragOverRef.current = key
      setDragOverKey(key)
    }
  }, [])

  // Count unassigned items for indicator
  const unassignedCount = playlist.filter(item => !item.linkedCardId).length

  // Sort: top3 items first (in top3Keys order), then rest by playlistRank
  const sortedPlaylist = [...playlist].sort((a, b) => {
    const aTop3 = top3Keys.indexOf(a.key)
    const bTop3 = top3Keys.indexOf(b.key)
    if (aTop3 !== -1 && bTop3 !== -1) return aTop3 - bTop3
    if (aTop3 !== -1) return -1
    if (bTop3 !== -1) return 1
    return 0
  })

  // Filter playlist by tab
  const filteredPlaylist = sortedPlaylist.filter(item => {
    if (activeTab === 'active') return item.status !== 'done'
    if (activeTab === 'done') return item.status === 'done'
    return true
  })

  const activeCount = playlist.filter(item => item.status !== 'done').length
  const doneCount = playlist.filter(item => item.status === 'done').length

  const handleDrop = useCallback((e: React.DragEvent, dropKey: string) => {
    e.preventDefault()
    const sourceKey = e.dataTransfer.getData('text/plain')
    if (!sourceKey || sourceKey === dropKey || !onReorder) return

    // Build new order from the full playlist (not just filtered view)
    const currentKeys = playlist.map(item => item.key)
    const sourceIdx = currentKeys.indexOf(sourceKey)
    const dropIdx = currentKeys.indexOf(dropKey)
    if (sourceIdx === -1 || dropIdx === -1) return

    const newKeys = [...currentKeys]
    newKeys.splice(sourceIdx, 1)
    newKeys.splice(dropIdx, 0, sourceKey)

    onReorder(newKeys)
    setDraggedKey(null)
    setDragOverKey(null)
    dragOverRef.current = null
  }, [onReorder, playlist])

  // Panel-level handlers for parking lot → playlist drag
  const handlePanelDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/kaizen-parking')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsParkingDragOver(true)
    }
  }, [])

  const handlePanelDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the panel itself, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsParkingDragOver(false)
    }
  }, [])

  const handlePanelDrop = useCallback((e: React.DragEvent) => {
    const key = e.dataTransfer.getData('application/kaizen-parking')
    if (!key || !onDropFromParking) return
    e.preventDefault()
    setIsParkingDragOver(false)
    onDropFromParking(key)
  }, [onDropFromParking])

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (quickAddValue.trim() && onCreateTask) {
      setIsCreating(true)
      try {
        // Create task with today's date as due date
        const today = localDateToUTCRange(getTodayLocalDate()).start
        await onCreateTask(quickAddValue.trim(), today)
        setQuickAddValue('')
      } catch (error) {
        console.error('Failed to create task:', error)
        alert('Failed to create task. Please try again.')
      } finally {
        setIsCreating(false)
      }
    }
  }

  return (
    <div className="ammo-panel">
      <div
        className={`panel-card ${isParkingDragOver ? 'parking-drop-target' : ''}`}
        onDragOver={handlePanelDragOver}
        onDragLeave={handlePanelDragLeave}
        onDrop={handlePanelDrop}
      >
        <div className="panel-header">
          <span className="panel-title">
            {selectedBlockTitle ? `${selectedBlockTitle} - Playlist` : "Today's Playlist"}
          </span>
          <span className="panel-badge">{playlist.length} tasks</span>
        </div>

        {/* Tab Navigation */}
        <div className="playlist-header">
          <button
            className={`playlist-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All <span className="count">({playlist.length})</span>
          </button>
          <button
            className={`playlist-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active <span className="count">({activeCount})</span>
          </button>
          <button
            className={`playlist-tab ${activeTab === 'done' ? 'active' : ''}`}
            onClick={() => setActiveTab('done')}
          >
            Done <span className="count">({doneCount})</span>
          </button>
        </div>

        {/* Playlist Items */}
        <div className="playlist-list">
          {loading && (
            <div className="loading-state">Loading playlist...</div>
          )}
          {!loading && filteredPlaylist.length === 0 && (
            <div className="empty-state">
              {activeTab === 'all' && 'No tasks in playlist'}
              {activeTab === 'active' && 'No active tasks'}
              {activeTab === 'done' && 'No completed tasks'}
            </div>
          )}
          {!loading && filteredPlaylist.map((item, index) => {
            const isCompleted = item.status === 'done'
            const isUnassigned = !item.linkedCardId
            const themeClass = getThemeColorClass(item.linkedCardTitle)
            const isBeingTriaged = triageItemKey === item.key
            const isDragging = draggedKey === item.key
            const isDragOver = dragOverKey === item.key && draggedKey !== item.key
            const top3Rank = top3Keys.indexOf(item.key) // -1 if not in top3
            const isTop3 = top3Rank !== -1
            const top3Badges = ['①', '②', '③']

            return (
              <div
                key={item.key}
                className={`playlist-item ${isCompleted ? 'completed' : ''} ${isUnassigned && !isTop3 ? 'unassigned' : ''} ${isTop3 ? 'top3-focus' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                draggable={!isCompleted && !!onReorder}
                onDragStart={(e) => handleDragStart(e, item.key)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, item.key)}
                onDrop={(e) => handleDrop(e, item.key)}
              >
                {onReorder && !isCompleted && !isTop3 && (
                  <span className="playlist-drag-handle" title="Drag to reorder">&#x2630;</span>
                )}
                {isTop3 ? (
                  <span className="top3-rank-badge" title={`Top 3 priority #${top3Rank + 1}`}>
                    {top3Badges[top3Rank]}
                  </span>
                ) : (
                  <span className="playlist-rank">{index + 1 - top3Keys.filter(k => filteredPlaylist.slice(0, index).some(i => i.key === k)).length}</span>
                )}
                <div
                  className={`playlist-checkbox ${isCompleted ? 'checked' : ''}`}
                  onClick={() => !isCompleted && onComplete(item.key)}
                />
                <div className="playlist-content">
                  <div className="playlist-title">{item.title}</div>
                </div>
                {/* Star toggle — always visible on active items */}
                {!isCompleted && (
                  <button
                    className={`star-btn ${isTop3 ? 'starred' : ''} ${!isTop3 && top3Keys.length >= 3 ? 'star-full' : ''}`}
                    title={isTop3 ? 'Remove from Top 3' : top3Keys.length < 3 ? 'Add to Top 3' : 'Top 3 is full'}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isTop3) onRemoveFromFocus?.(item.key)
                      else if (top3Keys.length < 3) onPromoteToFocus?.(item.key)
                    }}
                  >
                    {isTop3 ? '★' : '☆'}
                  </button>
                )}
                {/* Show triage selector for unassigned items when clicked */}
                {isBeingTriaged ? (
                  <div className="inline-triage">
                    <select
                      className="card-select"
                      onChange={(e) => {
                        const cardId = e.target.value || null
                        if (cardId) onLink(item.key, cardId)
                        setTriageItemKey(null)
                      }}
                      defaultValue=""
                      autoFocus
                    >
                      <option value="">Select action...</option>
                      {actionCards.map(card => (
                        <option key={card.id} value={card.id}>
                          {card.title}
                        </option>
                      ))}
                    </select>
                    <button
                      className="triage-cancel-btn"
                      onClick={() => setTriageItemKey(null)}
                    >
                      ×
                    </button>
                  </div>
                ) : isUnassigned ? (
                  <button
                    className="assign-btn"
                    onClick={() => setTriageItemKey(item.key)}
                    title="Assign to action"
                  >
                    ⚠
                  </button>
                ) : (
                  <div className={`playlist-action-dot ${themeClass}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Unassigned indicator - shown at bottom if there are unassigned items */}
        {unassignedCount > 0 && (
          <div className="unassigned-indicator">
            <span className="unassigned-icon">⚠</span>
            <span className="unassigned-text">{unassignedCount} task{unassignedCount > 1 ? 's' : ''} need{unassignedCount === 1 ? 's' : ''} triage</span>
          </div>
        )}

        {/* Quick Add */}
        <div className="quick-add">
          <form onSubmit={handleQuickAdd}>
            <input
              type="text"
              className="quick-add-input"
              placeholder="+ Add task to today's playlist..."
              value={quickAddValue}
              onChange={e => setQuickAddValue(e.target.value)}
              disabled={isCreating}
            />
          </form>
        </div>
      </div>
    </div>
  )
}
