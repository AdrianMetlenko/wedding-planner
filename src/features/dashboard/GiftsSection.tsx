import { Link } from 'react-router-dom'
import { Card, StatTile } from '../../components/ui'
import { giftTotals } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import type { DashboardData } from './useDashboardData'

export function GiftsSection({ data }: { data: DashboardData }) {
  const totals = giftTotals(data.gifts, data.guests)
  const attendingCount = data.attending.guests.length
  const actualAvg = attendingCount ? totals.attending / attendingCount : undefined
  const expected = data.settings.averageGift
  const diff = actualAvg !== undefined && expected !== undefined ? actualAvg - expected : undefined

  return (
    <Card title="Gifts" actions={<Link to="/gifts" className="text-sm font-medium text-brand-700 underline">Open gifts</Link>}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="From attending" value={formatMoney(totals.attending)} />
        <StatTile label="From non-attending" value={formatMoney(totals.nonAttending)} />
        <StatTile label="Total" value={formatMoney(totals.total)} />
        <StatTile
          label="Avg per attending guest"
          value={actualAvg !== undefined ? formatMoney(actualAvg) : 'n/a'}
          tone={diff === undefined ? 'default' : diff >= 0 ? 'good' : 'warn'}
          sub={actualAvg === undefined ? 'No attending guests yet' : (
            <>
              {formatMoney(totals.attending)} ÷ {attendingCount} attending
              {expected !== undefined && <> · expected {formatMoney(expected)}{diff !== undefined && ` (${diff >= 0 ? '+' : '-'}${formatMoney(Math.abs(diff))})`}</>}
              <br />All gifts ÷ {attendingCount}: {formatMoney(totals.total / attendingCount)}
            </>
          )}
        />
      </div>
    </Card>
  )
}
