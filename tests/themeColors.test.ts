import { describe, it, expect } from 'vitest'
import { THEME_COLORS, buildThemeColorMap, getThemeBorderColor } from '../src/utils/themeColors'

describe('themeColors', () => {
  it('buildThemeColorMap assigns stable indexes with wraparound', () => {
    const themes = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'd' },
      { id: 'e' },
    ]

    const map = buildThemeColorMap(themes)

    expect(map.a).toBe(0)
    expect(map.b).toBe(1)
    expect(map.c).toBe(2)
    expect(map.d).toBe(3)
    expect(map.e).toBe(4 % THEME_COLORS.length)
  })

  it('getThemeBorderColor falls back for invalid indexes', () => {
    expect(getThemeBorderColor(undefined)).toBe('#999999')
    expect(getThemeBorderColor(Number.NaN)).toBe('#999999')
  })

  it('getThemeBorderColor returns palette border colors', () => {
    expect(getThemeBorderColor(0)).toBe(THEME_COLORS[0].border)
    expect(getThemeBorderColor(1)).toBe(THEME_COLORS[1].border)
  })
})
