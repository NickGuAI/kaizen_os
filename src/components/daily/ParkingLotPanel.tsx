// Parking Lot Panel - Ad-hoc items with no planned date, shown across all days
import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { WorkItemWithOverlays } from './DailyDashboard'

export const PARKING_DROP_ZONE_ID = 'parking-drop-zone'

export interface ParkingLotPanelProps {
  items: WorkItemWithOverlays[]
  currentDate: string // YYYY-MM-DD — used for "Pull to today" label
  onComplete: (workItemKey: string) => void
  onPullToDate: (workItemKey: string) => void
  onCreateItem: (title: string) => Promise<void>
  loading?: boolean
}

interface ParkingDraggableItemProps {
  item: WorkItemWithOverlays
  currentDate: string
  pullLabel: string
  onComplete: (workItemKey: string) => void
  onPullToDate: (workItemKey: string) => void
}

function ParkingDraggableItem({
  item,
  currentDate,
  pullLabel,
  onComplete,
  onPullToDate,
}: ParkingDraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `parking:${item.key}`,
    data: {
      source: 'parking',
      type: 'parking-item',
      workItemKey: item.key,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`parking-item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <span className="parking-drag-handle" title="Drag to playlist">&#x2630;</span>
      <div
        className="playlist-checkbox"
        onClick={() => onComplete(item.key)}
      />
      <div className="parking-item-content">
        <div className="parking-item-title">{item.title}</div>
        {item.linkedCardTitle && (
          <div className="parking-item-card">{item.linkedCardTitle}</div>
        )}
      </div>
      <button
        className="pull-to-date-btn"
        onClick={() => onPullToDate(item.key)}
        title={pullLabel}
      >
        ↓ {currentDate === today ? 'Today' : currentDate}
      </button>
    </div>
  )
}

export function ParkingLotPanel({
  items,
  currentDate,
  onComplete,
  onPullToDate,
  onCreateItem,
  loading,
}: ParkingLotPanelProps) {
  const [quickAddValue, setQuickAddValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { setNodeRef, isOver } = useDroppable({
    id: PARKING_DROP_ZONE_ID,
    data: { type: 'parking-zone' },
  })

  const activeItems = items.filter(item => item.status !== 'done')
  const doneItems = items.filter(item => item.status === 'done')

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddValue.trim()) return
    setIsCreating(true)
    try {
      await onCreateItem(quickAddValue.trim())
      setQuickAddValue('')
    } catch (error) {
      console.error('Failed to create parking lot item:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Format date label for "Pull to" button
  const today = new Date().toISOString().slice(0, 10)
  const pullLabel = currentDate === today ? 'Pull to today' : `Pull to ${currentDate}`

  return (
    <div className="parking-lot-panel">
      <div ref={setNodeRef} className={`panel-card ${isOver ? 'snack-drop-target' : ''}`}>
        <div className="panel-header">
          <span className="panel-title">Parking Lot</span>
          <span className="panel-badge">{activeItems.length} items</span>
        </div>

        <div className="parking-lot-list">
          {loading && <div className="loading-state">Loading parking lot...</div>}

          {!loading && activeItems.length === 0 && doneItems.length === 0 && (
            <div className="empty-state">No items in the parking lot</div>
          )}

          {!loading && activeItems.map(item => (
            <ParkingDraggableItem
              key={item.key}
              item={item}
              currentDate={currentDate}
              pullLabel={pullLabel}
              onComplete={onComplete}
              onPullToDate={onPullToDate}
            />
          ))}

          {!loading && doneItems.length > 0 && (
            <div className="parking-done-section">
              {doneItems.map(item => (
                <div key={item.key} className="parking-item completed">
                  <div className="playlist-checkbox checked" />
                  <div className="parking-item-content">
                    <div className="parking-item-title">{item.title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="quick-add">
          <form onSubmit={handleQuickAdd}>
            <input
              type="text"
              className="quick-add-input"
              placeholder="+ Add to parking lot..."
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
