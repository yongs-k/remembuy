import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { LockerProvider, useLocker } from './LockerContext'
import type { Item } from '../types'

function wrapper({ children }: { children: React.ReactNode }) {
  return <LockerProvider>{children}</LockerProvider>
}

const sampleItem: Item = {
  id: 'x1',
  name: '테스트 상품',
  locationId: 'bathroom',
  categoryId: 'bathroom-haircare',
  recommendation: 'recommend',
  createdAt: '2026-09-10',
}

describe('LockerContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with the seed items, locations, and categories', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    expect(result.current.items.length).toBeGreaterThan(0)
    expect(result.current.locations.length).toBe(10)
    expect(result.current.categories.length).toBeGreaterThan(0)
  })

  it('addItem appends a new item', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    const initialCount = result.current.items.length
    act(() => {
      result.current.addItem(sampleItem)
    })
    expect(result.current.items.length).toBe(initialCount + 1)
    expect(result.current.items.find((i) => i.id === 'x1')).toEqual(sampleItem)
  })

  it('updateItem patches an existing item', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.addItem(sampleItem)
    })
    act(() => {
      result.current.updateItem('x1', { note: '수정됨' })
    })
    expect(result.current.items.find((i) => i.id === 'x1')?.note).toBe('수정됨')
  })

  it('removeItem deletes an item', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.addItem(sampleItem)
    })
    act(() => {
      result.current.removeItem('x1')
    })
    expect(result.current.items.find((i) => i.id === 'x1')).toBeUndefined()
  })

  it('addLocation appends a new location and returns it', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    const initialCount = result.current.locations.length
    let created
    act(() => {
      created = result.current.addLocation('베란다')
    })
    expect(result.current.locations.length).toBe(initialCount + 1)
    expect(result.current.locations.find((l) => l.id === created!.id)?.name).toBe('베란다')
  })

  it('renameLocation updates the name', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.renameLocation('bathroom', '메인 욕실')
    })
    expect(result.current.locations.find((l) => l.id === 'bathroom')?.name).toBe('메인 욕실')
  })

  it('removeLocation deletes the location, its categories, and its items', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.removeLocation('bathroom')
    })
    expect(result.current.locations.find((l) => l.id === 'bathroom')).toBeUndefined()
    expect(result.current.categories.some((c) => c.locationId === 'bathroom')).toBe(false)
    expect(result.current.items.some((i) => i.locationId === 'bathroom')).toBe(false)
  })

  it('addCategory appends a new category under a location', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    let created
    act(() => {
      created = result.current.addCategory('bathroom', '반려동물 목욕용품')
    })
    expect(result.current.categories.find((c) => c.id === created!.id)).toMatchObject({
      locationId: 'bathroom',
      name: '반려동물 목욕용품',
    })
  })

  it('removeCategory deletes the category and its items', () => {
    const { result } = renderHook(() => useLocker(), { wrapper })
    act(() => {
      result.current.removeCategory('bathroom-haircare')
    })
    expect(result.current.categories.find((c) => c.id === 'bathroom-haircare')).toBeUndefined()
    expect(result.current.items.some((i) => i.categoryId === 'bathroom-haircare')).toBe(false)
  })
})
