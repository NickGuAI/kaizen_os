// Tag Panel - Left panel component for Tag Mode
// Similar to ActionPlanPanel but for tagging events

import { DEFAULT_TAGS } from '../../utils/tagConfig'

interface TagPanelProps {
  selectedTagType: string
  selectedTagValue: string | null
  onTagTypeChange: (tagType: string) => void
  onTagValueChange: (tagValue: string | null) => void
  onExit: () => void
  taggedCount: number
}

export function TagPanel({
  selectedTagType,
  selectedTagValue,
  onTagTypeChange,
  onTagValueChange,
  onExit,
  taggedCount,
}: TagPanelProps) {
  const currentTagDef = DEFAULT_TAGS.find((t) => t.name === selectedTagType) || DEFAULT_TAGS[0]

  return (
    <div className="panel-card" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: 16, 
          fontWeight: 600,
          color: '#5a6343',
        }}>
          🏷️ Tag Mode
        </h3>
        <button
          onClick={onExit}
          style={{
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            color: '#c0392b',
            cursor: 'pointer',
          }}
        >
          Exit
        </button>
      </div>

      {/* Tag Type Selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ 
          fontSize: 11, 
          fontWeight: 600, 
          color: '#999',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'block',
          marginBottom: 8,
        }}>
          Tag Type
        </label>
        <select
          value={selectedTagType}
          onChange={(e) => {
            onTagTypeChange(e.target.value)
            onTagValueChange(null) // Reset value when type changes
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(139, 148, 103, 0.3)',
            fontSize: 14,
            background: 'white',
          }}
        >
          {DEFAULT_TAGS.map((tag) => (
            <option key={tag.name} value={tag.name}>
              {tag.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Tag Value Selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ 
          fontSize: 11, 
          fontWeight: 600, 
          color: '#999',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'block',
          marginBottom: 8,
        }}>
          Select Value
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {currentTagDef.values.map((val) => (
            <button
              key={val.value}
              onClick={() => onTagValueChange(selectedTagValue === val.value ? null : val.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 8,
                border: selectedTagValue === val.value 
                  ? `2px solid ${val.color}` 
                  : '1px solid rgba(139, 148, 103, 0.2)',
                background: selectedTagValue === val.value 
                  ? `${val.color}15` 
                  : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: val.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ 
                fontSize: 13, 
                fontWeight: selectedTagValue === val.value ? 600 : 400,
                color: '#333',
              }}>
                {val.displayName}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: 12,
        background: 'rgba(139, 148, 103, 0.08)',
        borderRadius: 8,
        marginBottom: 16,
      }}>
        <p style={{ 
          fontSize: 12, 
          color: '#666', 
          margin: 0,
          lineHeight: 1.5,
        }}>
          {selectedTagValue ? (
            <>
              <strong>Click</strong> on events to tag as "{currentTagDef.values.find(v => v.value === selectedTagValue)?.displayName}"
              <br />
              <strong>Double-click</strong> to remove tag
            </>
          ) : (
            <>Select a tag value above, then click on events to tag them.</>
          )}
        </p>
      </div>

      {/* Stats */}
      <div style={{
        padding: 12,
        background: '#f8f8f6',
        borderRadius: 8,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#5a6343' }}>
          {taggedCount}
        </div>
        <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>
          Events Tagged This Session
        </div>
      </div>
    </div>
  )
}
