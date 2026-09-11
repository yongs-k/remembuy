import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 0 })
  })

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }))
    act(() => {
      result.current[1]({ count: 5 })
    })
    expect(result.current[0]).toEqual({ count: 5 })
    expect(JSON.parse(window.localStorage.getItem('test-key')!)).toEqual({ count: 5 })
  })

  it('supports functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 1))
    act(() => {
      result.current[1]((prev) => prev + 1)
    })
    expect(result.current[0]).toBe(2)
  })

  it('reads an existing stored value on mount instead of the initial value', () => {
    window.localStorage.setItem('test-key', JSON.stringify({ count: 42 }))
    const { result } = renderHook(() => useLocalStorage('test-key', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 42 })
  })
})
