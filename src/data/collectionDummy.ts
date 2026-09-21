export const DUMMY_COLLECTION_PROFILE = {
  title: '살림 탐험가 민우',
  levelLabel: 'Lv.4',
  nextLevel: 'Lv.5 도감 마스터',
  exp: { current: 180, total: 250 },
  badges: { owned: 4, total: 12, unlockable: 1 },
  savedLabel: '4.8만',
}

export type DummyBadge = {
  id: string
  name: string
  icon: string
  state: 'done' | 'locked'
  tag?: string
  progress?: number
  hint?: string
}

export const DUMMY_BADGES: DummyBadge[] = [
  { id: 'bath-explorer', name: '욕실 탐험가', icon: 'bubble_chart', state: 'done', tag: '달성' },
  { id: 'group-buyer', name: '현명한 공구족', icon: 'diversity_3', state: 'done', tag: '3회 공구' },
  { id: 'saving-king', name: '생필품 절약왕', icon: 'savings', state: 'done', tag: '3만원 절약' },
  { id: 'kitchen-lord', name: '주방의 지배자', icon: 'skillet', state: 'locked', progress: 45 },
  { id: 'eco-refiller', name: '친환경 리필러', icon: 'recycling', state: 'locked', hint: '리필팩 5개 등록' },
]

export const DUMMY_MONTHLY_QUEST = {
  icon: 'local_florist',
  title: '봄맞이 주방 소모품 3종 채우기',
  reward: '한정판 \'봄날의 주방 요정\' 배지와 150P 지급!',
  progress: { current: 2, total: 3 },
}

export const DUMMY_DETAIL_GOAL = '목표: 5개 달성 시 \'반짝이는 세면대\' 칭호 획득! +50P 예정'
