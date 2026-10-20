import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, Card } from '../../components/ui'
import type { Category } from '../../lib/types'
import { GUEST_TYPES } from '../../lib/types'
import type { DashboardData } from './useDashboardData'

const TYPE_LABEL = { adult: 'Adults', child: 'Children', staff: 'Staff' } as const

interface Row { name: string; count: number; color: string }

function HBar({ rows, title }: { rows: Row[]; title: string }) {
  const summary = `${title}: ${rows.map((r) => `${r.name} ${r.count}`).join(', ')}.`
  return (
    <div role="img" aria-label={summary} style={{ height: Math.max(120, rows.length * 32 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} interval={0} />
          <Tooltip formatter={(v) => [`${v} guests`, 'Guests']} cursor={{ fill: '#f5f5f4' }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false} label={{ position: 'right', fontSize: 12 }}>
            {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BreakdownCharts({ data }: { data: DashboardData }) {
  const [basis, setBasis] = useState<'attending' | 'planned'>('planned')
  const set = basis === 'planned' ? data.planned : data.attending

  const categoryRows = useMemo(() => {
    const byId = new Map<string, number>()
    for (const g of set.guests) byId.set(g.categoryId, (byId.get(g.categoryId) ?? 0) + 1)
    const rows: Row[] = data.categories
      .map((c: Category) => ({ name: c.name, count: byId.get(c.id) ?? 0, color: c.color }))
      .filter((r) => r.count > 0)
    const known = new Set(data.categories.map((c) => c.id))
    const other = [...byId].filter(([id]) => !known.has(id)).reduce((s, [, n]) => s + n, 0)
    if (other) rows.push({ name: 'Uncategorised', count: other, color: '#a8a29e' })
    return rows.sort((a, b) => b.count - a.count)
  }, [set, data.categories])

  const typeRows: Row[] = GUEST_TYPES.map((t) => ({
    name: TYPE_LABEL[t], count: set.counts[t], color: '#8a3549',
  })).filter((r) => r.count > 0)

  const toggle = (
    <>
      {(['planned', 'attending'] as const).map((b) => (
        <Button key={b} size="sm" variant={basis === b ? 'primary' : 'secondary'} aria-pressed={basis === b} onClick={() => setBasis(b)}>
          {b === 'planned' ? 'Forecast' : 'Attending'}
        </Button>
      ))}
    </>
  )

  return (
    <section aria-label="Guest breakdown" className="grid gap-3 lg:grid-cols-2">
      <Card title={`${basis === 'planned' ? 'Forecast' : 'Attending'} guests by category`} actions={toggle}>
        {categoryRows.length ? <HBar rows={categoryRows} title="Guests by category" /> : <p className="text-sm text-stone-500">No guests in this group yet.</p>}
      </Card>
      <Card title={`${basis === 'planned' ? 'Forecast' : 'Attending'} guests by type`}>
        {typeRows.length ? <HBar rows={typeRows} title="Guests by type" /> : <p className="text-sm text-stone-500">No guests in this group yet.</p>}
      </Card>
    </section>
  )
}
