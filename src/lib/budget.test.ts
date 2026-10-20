import { describe, expect, it } from 'vitest'
import { normaliseShares, planSummary, setLocked, setMode, setShare, syncLines } from './budget'
import type { BudgetLine, Expense, ExpenseCategory } from './types'

const cat = (id: string): ExpenseCategory => ({ id, name: id, color: '#000' })
const line = (categoryId: string, percent: number, p: Partial<BudgetLine> = {}): BudgetLine =>
  ({ categoryId, percent, mode: 'percent', locked: false, ...p })
const exp = (categoryId: string, estimate: number, paid = 0): Expense =>
  ({ id: `${categoryId}-${estimate}`, item: 'x', categoryId, estimate, paid, module: 'wedding' })
const pct = (lines: BudgetLine[]) => Object.fromEntries(lines.map((l) => [l.categoryId, l.percent]))
const shareSum = (lines: BudgetLine[]) => lines.filter((l) => l.mode === 'percent').reduce((s, l) => s + l.percent, 0)

describe('syncLines', () => {
  it('seeds one share per category from estimates, normalised to 100', () => {
    const lines = syncLines([], [cat('a'), cat('b'), cat('c')], [exp('a', 300), exp('b', 100)])
    expect(pct(lines)).toEqual({ a: 75, b: 25, c: 0 })
  })

  it('splits evenly when nothing is estimated, keeps existing lines, drops deleted categories', () => {
    expect(pct(syncLines([], [cat('a'), cat('b')], []))).toEqual({ a: 50, b: 50 })
    const kept = syncLines([line('a', 60, { locked: true }), line('gone', 40)], [cat('a'), cat('b')], [])
    expect(kept.map((l) => l.categoryId)).toEqual(['a', 'b'])
    expect(kept[0].locked).toBe(true)
    expect(shareSum(kept)).toBeCloseTo(100)
  })

  it('returns the same array when nothing changed', () => {
    const lines = [line('a', 100)]
    expect(syncLines(lines, [cat('a')], [])).toBe(lines)
  })
})

describe('setShare', () => {
  const base = [line('a', 50), line('b', 30), line('c', 20)]

  it('rebalances the other shares proportionally so they total 100', () => {
    const next = setShare(base, 'a', 70)
    expect(pct(next)).toEqual({ a: 70, b: 18, c: 12 })
  })

  it('never moves locked shares, and caps the dragged share at what is free', () => {
    const locked = setLocked(base, 'b', true)
    expect(pct(setShare(locked, 'a', 60))).toEqual({ a: 60, b: 30, c: 10 })
    expect(pct(setShare(locked, 'a', 95))).toEqual({ a: 70, b: 30, c: 0 })
  })

  it('ignores fixed and off lines', () => {
    const lines = [line('a', 50), line('b', 50), line('f', 0, { mode: 'fixed' })]
    expect(pct(setShare(lines, 'a', 80))).toEqual({ a: 80, b: 20, f: 0 })
  })
})

describe('setMode', () => {
  it('turning a share off hands its share to the others', () => {
    const next = setMode([line('a', 50), line('b', 30), line('c', 20)], 'a', 'off')
    expect(pct(next)).toEqual({ a: 50, b: 60, c: 40 })
    expect(shareSum(next)).toBeCloseTo(100)
  })

  it('turning it back on restores a slice and renormalises', () => {
    const off = setMode([line('a', 0), line('b', 100)], 'a', 'off')
    const on = setMode(off, 'a', 'percent')
    expect(on[0].percent).toBeGreaterThan(0)
    expect(shareSum(on)).toBeCloseTo(100)
  })
})

describe('normaliseShares', () => {
  it('keeps locked shares when a category is switched off', () => {
    const lines = [line('a', 40, { locked: true }), line('b', 30), line('c', 30)]
    expect(pct(setMode(lines, 'c', 'off'))).toEqual({ a: 40, b: 60, c: 30 })
  })

  it('leaves plans without shares alone', () => {
    const lines = [line('f', 10, { mode: 'fixed' })]
    expect(normaliseShares(lines)).toBe(lines)
  })
})

describe('planSummary', () => {
  it('subtracts venue and fixed categories, then splits the remainder by share', () => {
    const plan = { total: 60_000, lines: [line('rings', 0, { mode: 'fixed' }), line('photo', 60), line('music', 40), line('limo', 0, { mode: 'off' })] }
    const s = planSummary(plan, 30_000, [exp('rings', 5_000, 5_000), exp('photo', 8_000), exp('music', 6_000), exp('limo', 1_000)])
    expect(s.nonNegotiable).toBe(35_000)
    expect(s.remainder).toBe(25_000)
    const by = Object.fromEntries(s.lines.map((l) => [l.categoryId, l]))
    expect(by.photo).toMatchObject({ allocated: 15_000, difference: 7_000 })
    expect(by.music).toMatchObject({ allocated: 10_000, difference: 4_000 })
    expect(by.rings).toMatchObject({ allocated: 5_000, paid: 5_000, difference: 0 })
    expect(by.limo).toMatchObject({ allocated: 0, estimate: 1_000, difference: 0 })
    expect(s.plannedSpend).toBe(30_000 + 5_000 + 8_000 + 6_000) // limo is off
    expect(s.headroom).toBe(60_000 - 49_000)
    expect(s.overCommitted).toBe(false)
  })

  it('flags when non-negotiables exceed the budget', () => {
    const s = planSummary({ total: 20_000, lines: [line('a', 100)] }, 30_000, [])
    expect(s.overCommitted).toBe(true)
    expect(s.remainder).toBe(0)
  })
})
