import { expenseTotals } from '../../lib/calc'
import type { Expense, ExpenseCategory } from '../../lib/types'

/** Typical items, seeded as zero-value expenses; `category` is a default expense category name. */
export const COMMON_ITEMS: { item: string; category: string }[] = [
  { item: 'Photographer', category: 'Photo & video' },
  { item: 'Videographer', category: 'Photo & video' },
  { item: 'Music / DJ', category: 'Music' },
  { item: 'Ceremony musicians', category: 'Music' },
  { item: 'Officiant / ceremony fees', category: 'Ceremony' },
  { item: 'Bouquets & buttonholes', category: 'Flowers' },
  { item: 'Reception flowers', category: 'Flowers' },
  { item: 'Cake', category: 'Venue & catering' },
  { item: 'Wedding dress / suit', category: 'Attire' },
  { item: 'Rings', category: 'Attire' },
  { item: 'Hair & makeup', category: 'Hair & makeup' },
  { item: 'Invitations', category: 'Stationery' },
  { item: 'Favours', category: 'Gifts & favours' },
  { item: 'Transport', category: 'Transport' },
  { item: 'Guest accommodation', category: 'Accommodation' },
  { item: 'Drinks', category: 'Drinks' },
]

/** Resolve a default category name to an id, falling back to "Other", then the first category. */
export function categoryIdByName(categories: ExpenseCategory[], name: string): string {
  const find = (n: string) => categories.find((c) => c.name.toLowerCase() === n.toLowerCase())
  return (find(name) ?? find('Other') ?? categories[0])?.id ?? ''
}

export interface CategoryGroup {
  category: ExpenseCategory | undefined
  categoryId: string
  name: string
  expenses: Expense[]
  totals: { estimate: number; paid: number; remaining: number }
}

const empty = () => ({ estimate: 0, paid: 0, remaining: 0 })

/** Groups in category order (unknown categories last), omitting empty ones. */
export function groupByCategory(expenses: Expense[], categories: ExpenseCategory[]): CategoryGroup[] {
  const groups: CategoryGroup[] = categories.map((c) => ({
    category: c, categoryId: c.id, name: c.name, expenses: [], totals: empty(),
  }))
  const orphans: CategoryGroup = {
    category: undefined, categoryId: '', name: 'Uncategorised', expenses: [], totals: empty(),
  }
  for (const e of expenses) (groups.find((g) => g.categoryId === e.categoryId) ?? orphans).expenses.push(e)
  return [...groups, orphans]
    .filter((g) => g.expenses.length)
    .map((g) => ({ ...g, totals: expenseTotals(g.expenses) }))
}
