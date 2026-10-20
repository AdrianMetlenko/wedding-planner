import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPENSE_CATEGORIES } from '../../lib/defaults'
import type { Expense } from '../../lib/types'
import { COMMON_ITEMS, categoryIdByName, groupByCategory } from './budgetHelpers'

const exp = (id: string, categoryId: string, estimate: number, paid: number): Expense =>
  ({ id, item: id, categoryId, estimate, paid, module: 'wedding' })

describe('budgetHelpers', () => {
  it('maps every common item to an existing category', () => {
    for (const c of COMMON_ITEMS) {
      const id = categoryIdByName(DEFAULT_EXPENSE_CATEGORIES, c.category)
      expect(DEFAULT_EXPENSE_CATEGORIES.some((x) => x.id === id && x.name === c.category)).toBe(true)
    }
  })

  it('falls back to Other for unknown names', () => {
    const id = categoryIdByName(DEFAULT_EXPENSE_CATEGORIES, 'Nope')
    expect(DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === id)?.name).toBe('Other')
  })

  it('groups with totals and keeps orphans', () => {
    const groups = groupByCategory(
      [exp('a', 'exp-2', 100, 40), exp('b', 'exp-2', 50, 50), exp('c', 'gone', 10, 0)],
      DEFAULT_EXPENSE_CATEGORIES,
    )
    expect(groups.map((g) => g.name)).toEqual(['Drinks', 'Uncategorised'])
    expect(groups[0].totals).toEqual({ estimate: 150, paid: 90, remaining: 60 })
  })
})
