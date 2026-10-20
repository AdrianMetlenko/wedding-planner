import { Card, StatTile } from '../../components/ui'
import { GUEST_TYPES } from '../../lib/types'
import type { Guest } from '../../lib/types'
import type { DashboardData } from './useDashboardData'
import { rsvpTally } from './useDashboardData'

const TYPE_LABEL = { adult: 'Adults', child: 'Children', staff: 'Staff' } as const

export function HeadcountTiles({ data }: { data: DashboardData }) {
  const { planned, attending, plannedAll, guests } = data
  const plannedTally = rsvpTally(plannedAll)
  const allTally = rsvpTally(guests as Guest[])
  return (
    <section aria-label="Headcount" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Forecast"
          value={planned.guests.length}
          sub={`${attending.guests.length} confirmed + ${plannedTally.pending} planned still to reply (${plannedAll.length} on the plan)`}
        />
        <StatTile
          label="Attending (RSVP yes)"
          value={attending.guests.length}
          tone={attending.guests.length > 0 ? 'good' : 'default'}
          sub={`of ${guests.length} guests invited`}
        />
        <StatTile label="Pending" value={allTally.pending} tone={allTally.pending > 0 ? 'warn' : 'default'} sub="Still to reply" />
        <StatTile label="Declined" value={allTally.declined} sub="Said no" />
      </div>
      <Card title="Guests by type">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-1 pr-4 font-medium">Type</th>
                <th className="py-1 pr-4 text-right font-medium">Forecast</th>
                <th className="py-1 text-right font-medium">Attending</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {GUEST_TYPES.map((t) => (
                <tr key={t} className="border-t border-stone-100">
                  <td className="py-1 pr-4">{TYPE_LABEL[t]}</td>
                  <td className="py-1 pr-4 text-right">{planned.counts[t]}</td>
                  <td className="py-1 text-right">{attending.counts[t]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
