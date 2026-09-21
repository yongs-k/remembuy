import { describe, it, expect } from 'vitest'
import { percentOff, DUMMY_DEALS } from './purchaseDummy'

describe('percentOff', () => {
  it('rounds the discount percentage', () => {
    expect(percentOff(58000, 42000)).toBe(28)
    expect(percentOff(12900, 8900)).toBe(31)
    expect(percentOff(30000, 19800)).toBe(34)
  })

  it('returns 0 when there is no valid original price', () => {
    expect(percentOff(0, 5000)).toBe(0)
  })

  it('every dummy deal is actually discounted', () => {
    for (const deal of DUMMY_DEALS) {
      expect(percentOff(deal.originalPrice, deal.price)).toBeGreaterThan(0)
    }
  })
})
