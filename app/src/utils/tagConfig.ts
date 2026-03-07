// Tag Mode Configuration
// Defines available tags and their values

export interface TagValue {
  value: string
  displayName: string
  color: string
}

export interface TagDefinition {
  name: string
  displayName: string
  values: TagValue[]
}

// Default tags (hardcoded for now, user config can be added later)
export const DEFAULT_TAGS: TagDefinition[] = [
  {
    name: 'intention',
    displayName: 'Intention',
    values: [
      { value: 'want', displayName: 'I want to do it', color: '#4CAF50' },
      { value: 'dont_want', displayName: "I'm forced", color: '#F44336' },
      { value: 'neutral', displayName: "I don't care", color: '#9E9E9E' },
    ],
  },
]

// Helper to get tag definition by name
export function getTagDefinition(name: string): TagDefinition | undefined {
  return DEFAULT_TAGS.find((t) => t.name === name)
}

// Helper to get tag value config
export function getTagValueConfig(
  tagName: string,
  tagValue: string
): TagValue | undefined {
  const def = getTagDefinition(tagName)
  return def?.values.find((v) => v.value === tagValue)
}

// Get color for a tag value
export function getTagColor(tagName: string, tagValue: string): string {
  return getTagValueConfig(tagName, tagValue)?.color || '#9E9E9E'
}
