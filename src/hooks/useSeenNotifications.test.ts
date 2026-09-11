import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSeenNotifications } from './useSeenNotifications'

describe('useSeenNotifications', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with an empty seen list', () => {
    const { result } = renderHook(() => useSeenNotifications())
    expect(result.current.seenIds).toEqual([])
  })

  it('markSeen adds new ids without duplicating', () => {
    const { result } = renderHook(() => useSeenNotifications())
    act(() => {
      result.current.markSeen(['a', 'b'])
    })
    expect(result.current.seenIds.slice().sort()).toEqual(['a', 'b'])
    act(() => {
      result.current.markSeen(['b', 'c'])
    })
    expect(result.current.seenIds.slice().sort()).toEqual(['a', 'b', 'c'])
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useSeenNotifications())
    act(() => {
      result.current.markSeen(['x'])
    })
    expect(JSON.parse(window.localStorage.getItem('remembuy:seenNotificationIds')!)).toEqual([
      'x',
    ])
  })
})
