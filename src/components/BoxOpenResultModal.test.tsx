import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoxOpenResultModal } from './BoxOpenResultModal'
import type { OpenBoxResult } from '../lib/gameApi'

const FRAGMENT_RESULT: OpenBoxResult = {
  result: { type: 'FRAGMENT', itemId: 'item-a', itemName: '기본 세면대', grade: 'COMMON' },
  pointsSpent: 500,
  pointsBalance: 1000,
  dexEntry: { id: 'item-a', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, roomType: null, status: 'COLLECTING', fragmentCount: 4 },
}

const COMPLETING_FRAGMENT_RESULT: OpenBoxResult = {
  ...FRAGMENT_RESULT,
  dexEntry: { ...FRAGMENT_RESULT.dexEntry, status: 'COMPLETE', fragmentCount: 10 },
}

const FULL_ITEM_RESULT: OpenBoxResult = {
  result: { type: 'FULL_ITEM', itemId: 'item-b', itemName: '골드 거울', grade: 'RARE' },
  pointsSpent: 500,
  pointsBalance: 1000,
  dexEntry: { id: 'item-b', name: '골드 거울', grade: 'RARE', fragmentsRequired: 20, roomType: null, status: 'COMPLETE', fragmentCount: 0 },
}

describe('BoxOpenResultModal', () => {
  it('shows fragment progress for a FRAGMENT result that did not complete the item', () => {
    render(<BoxOpenResultModal result={FRAGMENT_RESULT} onClose={() => {}} onViewCollection={() => {}} />)
    expect(screen.getByText('조각을 획득했어요!')).toBeInTheDocument()
    expect(screen.getByText('4 / 10 조각')).toBeInTheDocument()
  })

  it('shows the completion headline for a FRAGMENT result that just completed the item', () => {
    render(<BoxOpenResultModal result={COMPLETING_FRAGMENT_RESULT} onClose={() => {}} onViewCollection={() => {}} />)
    expect(screen.getByText('아이템을 완성했어요!')).toBeInTheDocument()
    expect(screen.queryByText(/\/ 10 조각/)).not.toBeInTheDocument()
  })

  it('shows the completion headline for a FULL_ITEM result', () => {
    render(<BoxOpenResultModal result={FULL_ITEM_RESULT} onClose={() => {}} onViewCollection={() => {}} />)
    expect(screen.getByText('아이템을 완성했어요!')).toBeInTheDocument()
    expect(screen.getByText('골드 거울')).toBeInTheDocument()
  })

  it('shows the 장소 stage, and the next grade once the stage completes', () => {
    const room = { spaceId: 'bathroom', grade: 'COMMON', slot: 1, copies: 1, pieces: [1, 1, 0, 0], count: 2, completed: false }
    const { unmount } = render(
      <BoxOpenResultModal result={{ ...FRAGMENT_RESULT, room }} onClose={() => {}} onViewCollection={() => {}} />
    )
    expect(screen.getByText('욕실 조각을 얻었어요!')).toBeInTheDocument()
    expect(screen.getByText(/일반 욕실 조각 2 \/ 4/)).toBeInTheDocument()
    unmount()
    render(
      <BoxOpenResultModal
        result={{ ...FRAGMENT_RESULT, room: { ...room, slot: 3, pieces: [1, 1, 1, 1], count: 4, completed: true } }}
        onClose={() => {}}
        onViewCollection={() => {}}
      />
    )
    expect(screen.getByText('일반 욕실 완성!')).toBeInTheDocument()
    expect(screen.getByText(/이제 고급 조각이 나와요/)).toBeInTheDocument()
  })

  it('확인 closes, 도감 보기 goes to the collection and 다시 열기 opens another', () => {
    const onClose = vi.fn()
    const onViewCollection = vi.fn()
    const onReopen = vi.fn()
    render(
      <BoxOpenResultModal result={FRAGMENT_RESULT} onClose={onClose} onViewCollection={onViewCollection} onReopen={onReopen} />
    )
    screen.getByText('확인').click()
    expect(onClose).toHaveBeenCalledTimes(1)
    screen.getByText('도감 보기').click()
    expect(onViewCollection).toHaveBeenCalledTimes(1)
    screen.getByText('다시 열기').click()
    expect(onReopen).toHaveBeenCalledTimes(1)
  })

  it('hides 다시 열기 without a reopen action and disables it without points', () => {
    const { unmount } = render(<BoxOpenResultModal result={FRAGMENT_RESULT} onClose={() => {}} onViewCollection={() => {}} />)
    expect(screen.queryByText('다시 열기')).not.toBeInTheDocument()
    unmount()
    render(
      <BoxOpenResultModal result={FRAGMENT_RESULT} onClose={() => {}} onViewCollection={() => {}} onReopen={() => {}} canReopen={false} />
    )
    expect(screen.getByRole('button', { name: '포인트 부족' })).toBeDisabled()
  })
})
