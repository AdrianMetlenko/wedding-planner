import { describe, expect, it } from 'vitest'
import { planSummary, setMode, syncLines } from '../../lib/budget'
import type { Expense, ExpenseCategory } from '../../lib/types'
import { distribution, resetShares, shareTotal } from './plan'

const cat = (id: string): ExpenseCategory => ({ id, name: id.toUpperCase(), color: '#123456' })
const exp = (categoryId: string, estimate: number): Expense =>
  ({ id: `${categoryId}-${estimate}`, item: 'x', categoryId, estimate, paid: 0, module: 'wedding' })
const cats = [cat('a'), cat('b'), cat('c')]

describe('resetShares', () => {
  it('recomputes from estimates but keeps modes and locks, totalling 100', () => {
    const expenses = [exp('a', 300), exp('b', 100), exp('c', 100)]
    let lines = syncLines([], cats, [])
    lines = setMode(lines, 'c', 'fixed')
    lines = lines.map((l) => (l.categoryId === 'a' ? { ...l, locked: true } : l))
    const reset = resetShares(lines, cats, expenses)
    expect(reset.map((l) => l.mode)).toEqual(['percent', 'percent', 'fixed'])
    expect(reset[0].locked).toBe(true)
    expect(shareTotal(reset)).toBeCloseTo(100)
    expect(reset[0].percent).toBeCloseTo(75)
  })
})

describe('distribution', () => {
  const lines = syncLines([], cats, [])

  it('covers the budget with venue and allocations', () => {
    const s = planSummary({ total: 1000, lines: setMode(lines, 'c', 'off') }, 200, [])
    const { segments, over } = distribution(s, cats, 'Venue')
    expect(over).toBe(0)
    expect(segments.map((x) => x.key)).toEqual(['venue', 'a', 'b'])
    expect(segments.reduce((n, x) => n + x.barPercent, 0)).toBeCloseTo(100)
  })

  it('adds a leftover when no category takes the remainder', () => {
    const off = setMode(setMode(setMode(lines, 'a', 'off'), 'b', 'off'), 'c', 'off')
    const { segments } = distribution(planSummary({ total: 1000, lines: off }, 200, []), cats, 'Venue')
    expect(segments.map((x) => x.key)).toEqual(['venue', 'leftover'])
    expect(segments[1].amount).toBe(800)
  })

  it('reports how far non-negotiables exceed the budget', () => {
    const { segments, over } = distribution(planSummary({ total: 100, lines }, 250, []), cats, 'Venue')
    expect(over).toBe(150)
    expect(segments.reduce((n, x) => n + x.barPercent, 0)).toBeCloseTo(100)
  })
})
