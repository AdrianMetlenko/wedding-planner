// Top-down budget plan: overall budget − non-negotiables (venue + fixed categories) = remainder,
// split across the other categories by percentage. Pure functions; the Budget page wires them up.
import type { BudgetLine, BudgetMode, BudgetPlan, Expense, ExpenseCategory } from './types'

const round = (n: number) => Math.round(n * 100) / 100

const isShare = (l: BudgetLine) => l.mode === 'percent'

/**
 * Scale percent-mode lines so they sum to 100. Locked shares keep their value and the unlocked ones
 * fill the rest (equal split if they are all zero); if the locked ones alone exceed 100, everything scales.
 */
export function normaliseShares(lines: BudgetLine[]): BudgetLine[] {
  const shares = lines.filter(isShare)
  if (shares.length === 0) return lines
  const lockedSum = shares.filter((l) => l.locked).reduce((s, l) => s + l.percent, 0)
  const free = shares.filter((l) => !l.locked)
  const keepLocked = free.length > 0 && lockedSum <= 100
  const pool = keepLocked ? free : shares
  const target = keepLocked ? 100 - lockedSum : 100
  const sum = pool.reduce((s, l) => s + l.percent, 0)
  const scaled = new Set(pool)
  return lines.map((l) => {
    if (!isShare(l) || !scaled.has(l)) return l
    return { ...l, percent: round(sum > 0 ? (l.percent / sum) * target : target / pool.length) }
  })
}

/**
 * One line per expense category, in category order. New categories start as a percent share,
 * seeded from current estimates (or an equal split); lines for deleted categories are dropped.
 */
export function syncLines(lines: BudgetLine[], categories: ExpenseCategory[], expenses: Expense[]): BudgetLine[] {
  const existing = new Map(lines.map((l) => [l.categoryId, l]))
  const estimateBy = new Map<string, number>()
  for (const e of expenses) estimateBy.set(e.categoryId, (estimateBy.get(e.categoryId) ?? 0) + e.estimate)
  const anyEstimates = categories.some((c) => (estimateBy.get(c.id) ?? 0) > 0)
  const next = categories.map((c) => existing.get(c.id) ?? {
    categoryId: c.id, mode: 'percent' as const, locked: false,
    percent: anyEstimates ? estimateBy.get(c.id) ?? 0 : 1,
  })
  const changed = next.length !== lines.length || next.some((l, i) => l !== lines[i])
  return changed ? normaliseShares(next) : lines
}

/**
 * Drag one share to `value` %: the other unlocked shares absorb the difference in proportion to
 * their current size, so shares always total 100. Locked shares never move.
 */
export function setShare(lines: BudgetLine[], categoryId: string, value: number): BudgetLine[] {
  const target = lines.find((l) => l.categoryId === categoryId)
  if (!target || !isShare(target)) return lines
  const others = lines.filter((l) => isShare(l) && l.categoryId !== categoryId)
  const lockedSum = others.filter((l) => l.locked).reduce((s, l) => s + l.percent, 0)
  const flexible = others.filter((l) => !l.locked)
  const available = Math.max(0, 100 - lockedSum)
  const v = flexible.length === 0 ? available : Math.min(Math.max(0, value), available)
  const rest = available - v
  const flexSum = flexible.reduce((s, l) => s + l.percent, 0)
  const nextPercent = new Map<string, number>([[categoryId, round(v)]])
  for (const l of flexible) {
    nextPercent.set(l.categoryId, round(flexSum > 0 ? (l.percent / flexSum) * rest : rest / flexible.length))
  }
  return lines.map((l) => (nextPercent.has(l.categoryId) ? { ...l, percent: nextPercent.get(l.categoryId)! } : l))
}

/** Switch a category between share / fixed / off; the remaining shares are rescaled to 100. */
export function setMode(lines: BudgetLine[], categoryId: string, mode: BudgetMode): BudgetLine[] {
  const updated = lines.map((l) => {
    if (l.categoryId !== categoryId) return l
    // Coming back as a share with no size: give it an even slice so it's visible.
    const shares = lines.filter(isShare).length
    const percent = mode === 'percent' && l.percent <= 0 ? 100 / Math.max(1, shares + 1) : l.percent
    return { ...l, mode, percent }
  })
  return normaliseShares(updated)
}

export const setLocked = (lines: BudgetLine[], categoryId: string, locked: boolean) =>
  lines.map((l) => (l.categoryId === categoryId ? { ...l, locked } : l))

export interface PlanLine {
  categoryId: string
  mode: BudgetMode
  percent: number
  /** Money the plan gives this category (share of remainder, or its estimate when fixed). */
  allocated: number
  estimate: number
  paid: number
  /** allocated − estimate: positive = room left, negative = over its allocation. Zero for off lines. */
  difference: number
}

export interface PlanSummary {
  total: number
  venue: number
  fixedItems: number
  /** venue + fixed categories */
  nonNegotiable: number
  /** total − nonNegotiable (never below 0) */
  remainder: number
  /** Non-negotiables already exceed the overall budget. */
  overCommitted: boolean
  lines: PlanLine[]
  /** venue + estimates of every category that isn't off */
  plannedSpend: number
  /** total − plannedSpend: positive = under budget */
  headroom: number
}

export function planSummary(plan: BudgetPlan, venue: number, expenses: Expense[]): PlanSummary {
  const total = plan.total ?? 0
  const sums = new Map<string, { estimate: number; paid: number }>()
  for (const e of expenses) {
    const s = sums.get(e.categoryId) ?? { estimate: 0, paid: 0 }
    sums.set(e.categoryId, { estimate: s.estimate + e.estimate, paid: s.paid + e.paid })
  }
  const of = (id: string) => sums.get(id) ?? { estimate: 0, paid: 0 }
  const fixedItems = plan.lines.filter((l) => l.mode === 'fixed').reduce((s, l) => s + of(l.categoryId).estimate, 0)
  const nonNegotiable = venue + fixedItems
  const remainder = Math.max(0, total - nonNegotiable)
  const lines = plan.lines.map((l): PlanLine => {
    const { estimate, paid } = of(l.categoryId)
    const allocated = l.mode === 'percent' ? (remainder * l.percent) / 100 : l.mode === 'fixed' ? estimate : 0
    return { categoryId: l.categoryId, mode: l.mode, percent: l.percent, allocated, estimate, paid,
      difference: l.mode === 'off' ? 0 : allocated - estimate }
  })
  const plannedSpend = venue + lines.filter((l) => l.mode !== 'off').reduce((s, l) => s + l.estimate, 0)
  return {
    total, venue, fixedItems, nonNegotiable, remainder, overCommitted: total > 0 && nonNegotiable > total,
    lines, plannedSpend, headroom: total - plannedSpend,
  }
}
