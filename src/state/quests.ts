import type { Quest } from '../lib/gameApi'

/**
 * The quests closest to done, for the home strip: claimable ones first, then by
 * how much of the target is already reached, then the smaller (quicker) reward.
 */
export function pickEasiestQuests(quests: Quest[], count = 3): Quest[] {
  return quests
    .filter((quest) => !quest.claimed)
    .sort(
      (a, b) =>
        Number(b.claimable) - Number(a.claimable) ||
        b.progress / b.target - a.progress / a.target ||
        a.reward - b.reward
    )
    .slice(0, count)
}
