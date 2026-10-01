import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoxOpenResultModal } from './BoxOpenResultModal'
import type { OpenBoxResult } from '../lib/gameApi'

const FRAGMENT_RESULT: OpenBoxResult = {
  result: { type: 'FRAGMENT', itemId: 'item-a', itemName: '기본 세면대', grade: 'COMMON' },
  pointsSpent: 500,
  pointsBalance: 1000,
  dexEntry: { id: 'item-a', name: '기본 세면대', grade: 'COMMON', fragmentsRequired: 10, status: 'COLLECTING', fragmentCount: 4 },
}

const COMPLETING_FRAGMENT_RESULT: OpenBoxResult = {
  ...FRAGMENT_RESULT,
  dexEntry: { ...FRAGMENT_RESULT.dexEntry, status: 'COMPLETE', fragmentCount: 10 },
}

const FULL_ITEM_RESULT: OpenBoxResult = {
  result: { type: 'FULL_ITEM', itemId: 'item-b', itemName: '골드 거울', grade: 'RARE' },
  pointsSpent: 500,
  pointsBalance: 1000,
  dexEntry: { id: 'item-b', name: '골드 거울', grade: 'RARE', fragmentsRequired: 20, status: 'COMPLETE', fragmentCount: 0 },
}

describe('BoxOpenResultModal', () => {
  it('shows fragment progress for a FRAGMENT result that did not complete the item', () => {
    render(<BoxOpenResultModal result={FRAGMENT_RESULT} onClose={() => {}} onViewDex={() => {}} />)
    expect(screen.getByText('조각을 획득했어요!')).toBeInTheDocument()
    expect(screen.getByText('4 / 10 조각')).toBeInTheDocument()
  })

  it('shows the completion headline for a FRAGMENT result that just completed the item', () => {
    render(<BoxOpenResultModal result={COMPLETING_FRAGMENT_RESULT} onClose={() => {}} onViewDex={() => {}} />)
    expect(screen.getByText('아이템을 완성했어요!')).toBeInTheDocument()
    expect(screen.queryByText(/\/ 10 조각/)).not.toBeInTheDocument()
  })

  it('shows the completion headline for a FULL_ITEM result', () => {
    render(<BoxOpenResultModal result={FULL_ITEM_RESULT} onClose={() => {}} onViewDex={() => {}} />)
    expect(screen.getByText('아이템을 완성했어요!')).toBeInTheDocument()
    expect(screen.getByText('골드 거울')).toBeInTheDocument()
  })

  it('calls onClose from the backdrop and the 닫기 button, and onViewDex from 아이템 수집함 보기', () => {
    const onClose = vi.fn()
    const onViewDex = vi.fn()
    render(<BoxOpenResultModal result={FRAGMENT_RESULT} onClose={onClose} onViewDex={onViewDex} />)
    screen.getByText('닫기').click()
    expect(onClose).toHaveBeenCalledTimes(1)
    screen.getByText('아이템 수집함 보기').click()
    expect(onViewDex).toHaveBeenCalledTimes(1)
  })
})
