import { describe, it, expect } from 'vitest'
import { earnedTitles } from './gameProgress'
import type { GameState } from '../lib/gameApi'

describe('earnedTitles', () => {
  it('lists grade titles (newest grade first) before record titles', () => {
    const state = {
      points: 0,
      spaces: [],
      benefits: [],
      titles: [{ spaceId: 'kitchen', tierCode: 'SPROUT', earnedAt: '2026-10-01' }],
    } as GameState
    const rooms = [{ spaceId: 'bathroom', stage: 'RARE', count: 1, completedGrades: ['COMMON', 'ADVANCED'] }]
    expect(earnedTitles(state, rooms)).toEqual([
      { key: 'grade:bathroom:ADVANCED', label: '고급 욕실' },
      { key: 'grade:bathroom:COMMON', label: '일반 욕실' },
      { key: 'kitchen:SPROUT', label: '주방 새싹' },
    ])
  })
})
