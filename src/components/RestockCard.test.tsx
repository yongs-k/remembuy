import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RestockCard } from './RestockCard'
import * as LockerModule from '../state/LockerContext'
import type { Item } from '../types'

vi.mock('../state/LockerContext')

const item = { id: 'i1', name: '치약', categoryId: 'c1', createdAt: '2026-09-01', daysUntilEmpty: 2 } as Item

describe('RestockCard', () => {
  it('재구매하기 offers a store link and records the purchase on 재구매 완료', () => {
    const recordPurchase = vi.fn()
    vi.mocked(LockerModule.useLocker).mockReturnValue({ recordPurchase, items: [], categories: [], locations: [] } as unknown as ReturnType<typeof LockerModule.useLocker>)
    render(
      <MemoryRouter>
        <ul>
          <RestockCard item={item} />
        </ul>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: '재구매하기' }))
    expect(screen.getByRole('link', { name: /구매하러 가기/ }).getAttribute('href')).toContain('coupang.com/np/search?q=')
    fireEvent.click(screen.getByRole('button', { name: /재구매 완료/ }))
    expect(recordPurchase).toHaveBeenCalledWith('i1')
    expect(screen.queryByRole('button', { name: /재구매 완료/ })).toBeNull()
  })
})
