// Glue between the budget plan maths (lib/budget.ts) and the Budget page.
import { normaliseShares, syncLines, type PlanSummary } from '../../lib/budget'
import type { BudgetLine, Expense, ExpenseCategory } from '../../lib/types'

export const VENUE_SEGMENT_COLOR = '#a8a29e'
export const LEFTOVER_COLOR = '#e7e5e4'
export const OVER_COLOR = '#dc2626'

export interface Segment {
  key: string
  label: string
  color: string
  amount: number
  /** Share of the bar's width, 0–100. */
  barPercent: number
  /** Share of the overall budget, 0–100. */
  budgetPercent: number
}

/**
 * Segments for the distribution bar: venue, each fixed category, each percent category's
 * allocation, then whatever is left. The bar is as wide as the larger of the budget and the
 * segments, so an over-committed plan still fits (`over` says by how much).
 */
export function distribution(
  summary: PlanSummary, categories: ExpenseCategory[], venueLabel: string,
): { segments: Segment[]; over: number } {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const raw: { key: string; label: string; color: string; amount: number }[] = []
  if (summary.venue > 0) raw.push({ key: 'venue', label: venueLabel, color: VENUE_SEGMENT_COLOR, amount: summary.venue })
  for (const l of summary.lines) {
    if (l.mode === 'off' || l.allocated <= 0) continue
    const c = byId.get(l.categoryId)
    raw.push({
      key: l.categoryId, label: `${c?.name ?? 'Category'}${l.mode === 'fixed' ? ' (fixed)' : ''}`,
      color: c?.color ?? VENUE_SEGMENT_COLOR, amount: l.allocated,
    })
  }
  const used = raw.reduce((s, r) => s + r.amount, 0)
  // Shares are stored to 2 dp so they can total 100.01%; don't call that an overspend.
  const over = used - summary.total > Math.max(0.5, summary.total * 0.0005) ? used - summary.total : 0
  const leftover = Math.max(0, summary.total - used)
  if (leftover > 0.005) raw.push({ key: 'leftover', label: 'Left unallocated', color: LEFTOVER_COLOR, amount: leftover })
  const width = Math.max(summary.total, used)
  const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0)
  return {
    over,
    segments: raw.map((r) => ({ ...r, barPercent: pct(r.amount, width), budgetPercent: pct(r.amount, summary.total) })),
  }
}

/** Recompute every share from current estimates, keeping each category's mode and lock. */
export function resetShares(lines: BudgetLine[], categories: ExpenseCategory[], expenses: Expense[]): BudgetLine[] {
  const old = new Map(lines.map((l) => [l.categoryId, l]))
  // Recompute every share from estimates (locks don't hold during a reset), then restore the locks.
  const fresh = syncLines([], categories, expenses).map((l) => {
    const prev = old.get(l.categoryId)
    return prev ? { ...l, mode: prev.mode, locked: false } : l
  })
  return normaliseShares(fresh).map((l) => ({ ...l, locked: old.get(l.categoryId)?.locked ?? false }))
}

/** Total of the percent-mode shares. */
export const shareTotal = (lines: BudgetLine[]) =>
  Math.round(lines.filter((l) => l.mode === 'percent').reduce((s, l) => s + l.percent, 0) * 100) / 100
