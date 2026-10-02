import { describe, it, expect } from 'vitest'
import { pickEasiestQuests } from './quests'
import type { Quest } from '../lib/gameApi'

const q = (id: string, progress: number, target: number, extra: Partial<Quest> = {}): Quest => ({
  id,
  kind: 'once',
  title: id,
  target,
  progress,
  reward: 50,
  claimed: false,
  claimable: progress >= target,
  ...extra,
})

describe('pickEasiestQuests', () => {
  it('puts claimable first, then the closest to done, and skips claimed ones', () => {
    const quests = [
      q('far', 1, 10),
      q('done-claimed', 1, 1, { claimed: true, claimable: false }),
      q('half', 5, 10),
      q('ready', 3, 3),
      q('nearly', 4, 5),
    ]
    expect(pickEasiestQuests(quests).map((x) => x.id)).toEqual(['ready', 'nearly', 'half'])
  })

  it('breaks ties with the smaller reward', () => {
    const quests = [q('big', 0, 1, { reward: 300 }), q('small', 0, 1, { reward: 30 })]
    expect(pickEasiestQuests(quests, 1)[0].id).toBe('small')
  })
})
