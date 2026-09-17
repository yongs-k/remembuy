export type DummyRecommendation = {
  id: string
  name: string
  reason: string
  price: number
}

export const DUMMY_RECOMMENDATIONS: DummyRecommendation[] = [
  { id: 'rec-1', name: '샴푸', reason: '지난달 재구매 주기가 다가와요', price: 12000 },
  { id: 'rec-2', name: '주방세제', reason: '자주 함께 기록되는 상품이에요', price: 5000 },
]

export type DummyDiscount = {
  id: string
  name: string
  originalPrice: number
  discountedPrice: number
}

export const DUMMY_DISCOUNTS: DummyDiscount[] = [
  { id: 'disc-1', name: '2겹 화장지 30롤', originalPrice: 25000, discountedPrice: 18000 },
  { id: 'disc-2', name: '섬유유연제 3L', originalPrice: 15000, discountedPrice: 11000 },
]

export type DummyGroupBuy = {
  id: string
  name: string
  currentParticipants: number
  targetParticipants: number
  pricePerPerson: number
}

export const DUMMY_GROUP_BUYS: DummyGroupBuy[] = [
  { id: 'gb-1', name: '고급 세탁세제 대용량', currentParticipants: 7, targetParticipants: 10, pricePerPerson: 9000 },
  { id: 'gb-2', name: '유기농 주방타월 세트', currentParticipants: 3, targetParticipants: 8, pricePerPerson: 6000 },
]
