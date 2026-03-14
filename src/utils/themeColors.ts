export const THEME_COLORS = [
  { bg: 'rgba(139, 148, 103, 0.2)', border: '#8B9467', text: '#5a6343' },
  { bg: 'rgba(155, 89, 182, 0.2)', border: '#9B59B6', text: '#7b4293' },
  { bg: 'rgba(52, 152, 219, 0.2)', border: '#3498DB', text: '#2471a3' },
  { bg: 'rgba(230, 126, 34, 0.2)', border: '#E67E22', text: '#a55a1a' },
  { bg: 'rgba(231, 76, 60, 0.2)', border: '#E74C3C', text: '#922b21' },
]

export function buildThemeColorMap(
  themes: Array<{ id: string }>
): Record<string, number> {
  const map: Record<string, number> = {}
  themes.forEach((theme, index) => {
    map[String(theme.id)] = index % THEME_COLORS.length
  })
  return map
}

export function getThemeBorderColor(colorIndex?: number): string {
  if (colorIndex == null || Number.isNaN(colorIndex)) return '#999999'
  const colors = THEME_COLORS[colorIndex % THEME_COLORS.length]
  return colors?.border ?? '#999999'
}
