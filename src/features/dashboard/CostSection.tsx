import { Card, StatTile } from '../../components/ui'
import type { VenueCostBreakdown } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import { GUEST_TYPES } from '../../lib/types'
import type { Settings } from '../../lib/types'

const TYPE_LABEL = { adult: 'Adults', child: 'Children', staff: 'Staff' } as const

function CostCard({ title, cost, settings }: { title: string; cost: VenueCostBreakdown; settings: Settings }) {
  const min = settings.capacity.min ?? 0
  const shortfall = cost.billedHeadcount - cost.headcount
  return (
    <Card title={title}>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total" value={formatMoney(cost.total)} />
        <StatTile label="Per head" value={formatMoney(cost.perHead)} sub={`Adult price ${formatMoney(cost.adultPrice)}`} />
      </div>
      <table className="mt-3 w-full text-sm">
        <tbody className="tabular-nums">
          {GUEST_TYPES.map((t) => {
            const price = t === 'adult' ? cost.adultPrice : settings.pricePerHead[t]
            return (
              <tr key={t} className="border-t border-stone-100">
                <td className="py-1">{TYPE_LABEL[t]}</td>
                <td className="py-1 text-right text-stone-500">{cost.counts[t]} × {formatMoney(price)}</td>
                <td className="py-1 text-right">{formatMoney(cost.counts[t] * price)}</td>
              </tr>
            )
          })}
          {shortfall > 0 && (
            <tr className="border-t border-stone-100 text-amber-700">
              <td className="py-1">{cost.billingReason === 'tier' ? 'Extra places to reach a cheaper tier' : 'Unfilled minimum places'}</td>
              <td className="py-1 text-right">{shortfall} × {formatMoney(cost.adultPrice)}</td>
              <td className="py-1 text-right">{formatMoney(shortfall * cost.adultPrice)}</td>
            </tr>
          )}
          {cost.flatFee > 0 && (
            <tr className="border-t border-stone-100">
              <td className="py-1">Venue hire fee</td><td />
              <td className="py-1 text-right">{formatMoney(cost.flatFee)}</td>
            </tr>
          )}
          {cost.discount > 0 && (
            <tr className="border-t border-stone-100">
              <td className="py-1">Discount</td>
              <td className="py-1 text-right text-stone-500">{+((settings.discount ?? 0) * 100).toFixed(2)}% off per-head charges</td>
              <td className="py-1 text-right">{formatMoney(-cost.discount)}</td>
            </tr>
          )}
          {cost.service > 0 && (
            <tr className="border-t border-stone-100">
              <td className="py-1">Service charge</td>
              <td className="py-1 text-right text-stone-500">{+((settings.serviceCharge ?? 0) * 100).toFixed(2)}% gratuity + tax</td>
              <td className="py-1 text-right">{formatMoney(cost.service)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {shortfall > 0 && (
        <p className="mt-2 text-sm text-amber-700">
          {cost.billingReason === 'tier'
            ? <>Paying for {cost.billedHeadcount} places at {formatMoney(cost.adultPrice)} is cheaper than {cost.headcount} at
              the higher per-head price, so you pay for {shortfall} place{shortfall === 1 ? '' : 's'} nobody fills.</>
            : <>The venue charges for at least {min} guests. With {cost.headcount}, you pay for {shortfall} place
              {shortfall === 1 ? '' : 's'} nobody fills ({formatMoney(shortfall * cost.adultPrice)}).</>}
          {' '}Inviting up to {shortfall} more guest{shortfall === 1 ? '' : 's'} adds nothing to this bill.
        </p>
      )}
    </Card>
  )
}

export function CostSection({ settings, planned, attending }: {
  settings: Settings; planned: VenueCostBreakdown; attending: VenueCostBreakdown
}) {
  return (
    <section aria-label="Venue and catering cost" className="grid gap-3 md:grid-cols-2">
      <CostCard title="Venue & catering: forecast" cost={planned} settings={settings} />
      <CostCard title="Venue & catering: attending" cost={attending} settings={settings} />
    </section>
  )
}
