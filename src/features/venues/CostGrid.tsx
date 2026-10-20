import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../components/ui'
import { packageCostAt } from '../../lib/calc'
import { paletteColor } from '../../lib/defaults'
import { formatMoney } from '../../lib/format'
import { chartHeadcounts, chartRows, cheapestPerColumn, type PackageRef } from './venueGrid'

export function CostGrid({ refs, headcounts, plannerRange }: {
  refs: PackageRef[]; headcounts: number[]; plannerRange: { min?: number; max: number }
}) {
  if (refs.length === 0) return null
  const packages = refs.map((r) => r.pkg)
  const cheapest = cheapestPerColumn(packages, headcounts)
  const rows = chartRows(packages, chartHeadcounts(packages, plannerRange.max))

  return (
    <Card title="Total cost across headcounts">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Total cost of each package at a range of headcounts. The cheapest per headcount is highlighted.</caption>
          <thead>
            <tr className="text-left text-stone-600">
              <th scope="col" className="p-2 font-medium">Package</th>
              {headcounts.map((n) => <th key={n} scope="col" className="p-2 text-right font-medium">{n} guests</th>)}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {refs.map((r, i) => (
              <tr key={r.pkg.id} className="border-t border-stone-100">
                <th scope="row" className="p-2 text-left font-normal">{r.label}</th>
                {headcounts.map((n, col) => {
                  const c = packageCostAt(r.pkg, n)
                  const best = cheapest[col] === i
                  return (
                    <td key={n}
                      className={`p-2 text-right ${c.overCapacity ? 'text-stone-300' : ''} ${best ? 'bg-emerald-50 font-semibold text-emerald-800' : ''}`}>
                      {c.overCapacity ? <span title={`Over capacity (max ${r.pkg.maxGuests})`}>n/a</span> : formatMoney(c.total)}
                      {best && <span className="sr-only"> (cheapest)</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 h-72 w-full" role="img" aria-label="Line chart of total cost by headcount, one line per package">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="headcount" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 12 }} />
            <ReferenceArea
              x1={plannerRange.min ?? 0} x2={plannerRange.max} fill="#d1fae5" fillOpacity={0.5}
              label={{ value: 'Your range', position: 'insideTop', fontSize: 11, fill: '#047857' }}
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatMoney(v)} width={72} />
            <Tooltip formatter={(v) => (typeof v === 'number' ? formatMoney(v) : '')} labelFormatter={(l) => `${l} guests`} />
            <Legend />
            {refs.map((r, i) => (
              <Line key={r.pkg.id} type="linear" dataKey={r.pkg.id} name={r.label}
                stroke={paletteColor(i)} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
