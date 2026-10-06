import { describe, it, expect } from 'vitest'
import { groupByPlace, shoppingText } from './ShoppingListPage'
import type { Item } from '../types'

const item = (id: string, place: string | undefined, daysUntilEmpty: number) =>
  ({ id, name: id, categoryId: 'c', createdAt: new Date().toISOString().slice(0, 10), place, daysUntilEmpty }) as Item

describe('groupByPlace', () => {
  it('groups by store, most urgent store first, unknown store last', () => {
    const groups = groupByPlace([item('a', '다이소', 5), item('b', undefined, 0), item('c', '쿠팡', 1), item('d', '다이소', 2)])
    expect(groups.map((g) => g.place)).toEqual(['쿠팡', '다이소', '구매처 미정'])
    expect(groups[1].items.map((i) => i.id)).toEqual(['a', 'd'])
  })
})

describe('shoppingText', () => {
  it('writes each store with ticked and open boxes', () => {
    const text = shoppingText([{ place: '쿠팡', items: [item('세제', '쿠팡', 1), item('치약', '쿠팡', 2)] }], ['세제'])
    expect(text).toBe('이번 주 장보기\n\n[쿠팡]\n☑ 세제\n☐ 치약')
  })
})
