export function percentOff(original: number, price: number): number {
  if (original <= 0) return 0
  return Math.round((1 - price / original) * 100)
}

export const DUMMY_BUTLER = {
  fallback: { name: '아로마티카 티트리 샴푸 400ml', locationName: '욕실', daysUntilEmpty: 5 },
  rankTag: 'RARE #01',
  slotLabel: '도감 슬롯',
  cycleDays: 90,
  remainPercent: 18,
  remainText: '약 72ml 남음',
  price: 18900,
  originalPrice: 24000,
  lowestNote: '역대 최저가 근접',
  next: {
    name: '루치펠로 루이스랜드 치약',
    dday: 'D-14',
    note: '소진 예상일: 다음 주 목요일 · 사전 세일 모니터링',
  },
}

export type DealKind = 'owned' | 'unowned'

export type DummyDeal = {
  id: string
  kind: DealKind
  badge: string
  tag: string
  name: string
  subtitle: string
  price: number
  originalPrice: number
  footnote: string
  cta: string
  aside?: string
}

export const DUMMY_DEALS: DummyDeal[] = [
  {
    id: 'deal-1',
    kind: 'owned',
    badge: 'EPIC #02',
    tag: '내 도감 등록템',
    name: '이솝 제라늄 리프 바디클렌저 500ml',
    subtitle: '욕실 도감 완성 보너스 적용 가능',
    price: 42000,
    originalPrice: 58000,
    footnote: '3,000원 리뷰 쿠폰 즉시 적용',
    cta: '쿠폰 적용 구매',
    aside: '잔여 12:44:10',
  },
  {
    id: 'deal-2',
    kind: 'unowned',
    badge: '주방 도감 미등록',
    tag: '+30P 즉시적립',
    name: '프로쉬 친환경 알로에베라 주방세제',
    subtitle: '독일 직수입 500ml · 9,420원 소창 총',
    price: 8900,
    originalPrice: 12900,
    footnote: '구매 시 주방 도감 #04 잠금 해제',
    cta: '도감 등록 & 특가구매',
    aside: '주방 랭킹 1위',
  },
  {
    id: 'deal-3',
    kind: 'unowned',
    badge: '세탁 도감 슬롯 공석',
    tag: '슈퍼위크 단독할인',
    name: '퍼실 딥클린 플러스 파워캡슐 세제 54입',
    subtitle: '정기 라틴 추천 70일분',
    price: 19800,
    originalPrice: 30000,
    footnote: '도감 등록 시 무료배송 쿠폰 발급',
    cta: '특가 확인하기',
  },
]

export type DummyParty = {
  id: string
  name: string
  price: number
  originalPrice?: number
  joined: number
  target: number
  urgency?: string
  region?: string
  countdown?: string
  saving?: string
  note?: string
  cta: string
}

export const DUMMY_PARTIES: { featured: DummyParty; compact: DummyParty[] } = {
  featured: {
    id: 'party-1',
    name: '아로마티카 티트리 샴푸 400ml [5인 파티]',
    price: 15200,
    joined: 4,
    target: 5,
    urgency: '마감 임박! 1명 남음',
    region: '마포구 연남동 거점',
    countdown: '01:23:40',
    saving: '(-20% 추가 절약)',
    cta: '마지막 자리 탑승하기(15,200원)',
  },
  compact: [
    {
      id: 'party-2',
      name: '스카치브라이트 제로 스크래치 수세미 6입',
      price: 6400,
      originalPrice: 9800,
      joined: 2,
      target: 4,
      note: '개당 1,600원 꼴',
      cta: '참여하기',
    },
    {
      id: 'party-3',
      name: '브레프 토일렛 파워액티브 4입 번들',
      price: 8900,
      originalPrice: 14500,
      joined: 3,
      target: 4,
      note: '+50P 파티 보너스',
      cta: '참여하기',
    },
  ],
}
