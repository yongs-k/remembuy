import { describe, it, expect } from 'vitest'
import { roomFragments } from './gameProgress'
import type { DexEntry } from '../lib/gameApi'

const entry = (id: string, roomType: string | null, fragmentCount: number, status: DexEntry['status'] = 'COLLECTING'): DexEntry => ({
  id,
  name: id,
  grade: 'COMMON',
  fragmentsRequired: 10,
  roomType,
  status,
  fragmentCount,
})

describe('roomFragments', () => {
  it('sums fragments and completed items per 장소, skipping room-less items', () => {
    const result = roomFragments([
      entry('a', 'bathroom', 3),
      entry('b', 'bathroom', 10, 'COMPLETE'),
      entry('c', 'kitchen', 0, 'LOCKED'),
      entry('d', null, 5),
    ])
    expect(result).toEqual({
      bathroom: { fragments: 13, completed: 1, total: 2 },
      kitchen: { fragments: 0, completed: 0, total: 1 },
    })
  })
})
