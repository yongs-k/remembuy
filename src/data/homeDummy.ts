export const DUMMY_PROFILE = {
  name: '지음님',
  titleBadge: '🧴 욕실마스터',
}

export const DUMMY_STATS = {
  totalSaved: 32000,
  points: 128,
  titleProgress: { current: 4, total: 8 },
}

export type DummyQuest = {
  id: string
  icon: string
  title: string
  subtitle: string
  progress: { current: number; total: number }
  rewardPoints: number
}

export const DUMMY_QUESTS: DummyQuest[] = [
  {
    id: 'quest-bathroom-essentials',
    icon: '💧',
    title: '욕실 필수템 채우기',
    subtitle: '샴푸・바디워시・치약',
    progress: { current: 3, total: 3 },
    rewardPoints: 30,
  },
  {
    id: 'quest-kitchen-restock',
    icon: '🍳',
    title: '주방 소모품 채우기',
    subtitle: '세제・수세미・키친타월',
    progress: { current: 1, total: 3 },
    rewardPoints: 20,
  },
]
