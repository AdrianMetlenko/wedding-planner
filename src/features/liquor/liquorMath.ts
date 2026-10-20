import { liquorLine } from '../../lib/calc'
import type { LiquorItem } from '../../lib/types'

/** Copy of a bottles/prices record without one key (used when an event or vendor column is removed). */
export function withoutKey(record: Record<string, number>, key: string): Record<string, number> {
  const next = { ...record }
  delete next[key]
  return next
}

/** Grand totals across all drinks, using each drink's cheapest vendor. */
export function liquorTotals(items: LiquorItem[], eventIds: string[]) {
  const lines = items.map((item) => liquorLine(item))
  return {
    bottles: lines.reduce((sum, l) => sum + l.bottles, 0),
    total: lines.reduce((sum, l) => sum + l.total, 0),
    perEvent: Object.fromEntries(
      eventIds.map((id) => [id, items.reduce((sum, item) => sum + (item.bottles[id] || 0), 0)]),
    ) as Record<string, number>,
  }
}
