import { describe, expect, it } from 'vitest'
import type { LiquorItem } from '../../lib/types'
import { liquorTotals, withoutKey } from './liquorMath'

const items: LiquorItem[] = [
  { id: 'a', name: 'Vodka', kind: 'Spirit', bottles: { ev1: 4, ev2: 2 }, prices: { v1: 30, v2: 25 } },
  { id: 'b', name: 'Wine', kind: 'Wine', bottles: { ev1: 10 }, prices: { v1: 12, v2: 0 } },
]

describe('liquorTotals', () => {
  it('sums bottles and uses the cheapest priced vendor per drink', () => {
    const t = liquorTotals(items, ['ev1', 'ev2'])
    expect(t.bottles).toBe(16)
    // Vodka: 6 bottles at 25 = 150; Wine: 10 at 12 = 120 (vendor v2 has no price, ignored)
    expect(t.total).toBe(270)
    expect(t.perEvent).toEqual({ ev1: 14, ev2: 2 })
  })

  it('handles no drinks', () => {
    expect(liquorTotals([], ['ev1'])).toEqual({ bottles: 0, total: 0, perEvent: { ev1: 0 } })
  })
})

describe('withoutKey', () => {
  it('drops one key without mutating the input', () => {
    const rec = { a: 1, b: 2 }
    expect(withoutKey(rec, 'a')).toEqual({ b: 2 })
    expect(rec).toEqual({ a: 1, b: 2 })
  })
})
