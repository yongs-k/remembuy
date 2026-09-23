import { describe, it, expect } from 'vitest'
import { GRADE_ORDER, gradeLabel, gradeColor } from './gradeColors'

describe('gradeColors', () => {
  it('fixes the display order regardless of any external ordering', () => {
    expect(GRADE_ORDER).toEqual(['COMMON', 'ADVANCED', 'RARE', 'LEGENDARY'])
  })

  it('labels every known grade in Korean', () => {
    expect(gradeLabel('COMMON')).toBe('일반')
    expect(gradeLabel('ADVANCED')).toBe('고급')
    expect(gradeLabel('RARE')).toBe('레어')
    expect(gradeLabel('LEGENDARY')).toBe('전설')
  })

  it('falls back to the raw string for an unknown grade label', () => {
    expect(gradeLabel('MYTHIC')).toBe('MYTHIC')
  })

  it('gives every known grade a distinct color style', () => {
    const styles = GRADE_ORDER.map((grade) => gradeColor(grade))
    const uniqueBackgrounds = new Set(styles.map((s) => s.bg))
    expect(uniqueBackgrounds.size).toBe(4)
  })

  it('falls back to the COMMON style for an unknown grade', () => {
    expect(gradeColor('MYTHIC')).toEqual(gradeColor('COMMON'))
  })
})
