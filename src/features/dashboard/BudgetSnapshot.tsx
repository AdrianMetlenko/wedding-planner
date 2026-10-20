import { Link } from 'react-router-dom'
import { Card, StatTile } from '../../components/ui'
import { budgetExpenses, expenseTotals } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import type { DashboardData } from './useDashboardData'

export function BudgetSnapshot({ data }: { data: DashboardData }) {
  const totals = expenseTotals(budgetExpenses({ expenses: data.expenses, settings: data.settings }))
  const venue = data.attending.cost.total
  return (
    <Card title="Budget snapshot" actions={<Link to="/budget" className="text-sm font-medium text-brand-700 underline">Open budget</Link>}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Estimated" value={formatMoney(totals.estimate)} />
        <StatTile label="Paid" value={formatMoney(totals.paid)} />
        <StatTile label="Remaining" value={formatMoney(totals.remaining)} tone={totals.remaining < 0 ? 'bad' : 'default'} />
        <StatTile label="Venue & catering (attending)" value={formatMoney(venue)} sub="Based on confirmed RSVPs" />
      </div>
      <p className="mt-2 text-xs text-stone-500">
        The venue figure is calculated from RSVPs and is shown separately from your expense list.
      </p>
    </Card>
  )
}
