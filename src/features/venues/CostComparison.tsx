import { Badge, Card, Field, NumberInput } from '../../components/ui'
import { packageCostAt } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import { cheapestIndex, type PackageRef } from './venueGrid'

const DRINKS_NOTE = { included: 'included', 'bar-tab': 'bar tab estimate', byo: 'BYO estimate' } as const

export function CostComparison({ refs, headcount, onHeadcount }: {
  refs: PackageRef[]; headcount: number | undefined; onHeadcount: (n: number | undefined) => void
}) {
  const n = headcount ?? 0
  const costs = refs.map((r) => packageCostAt(r.pkg, n))
  const best = cheapestIndex(costs)

  return (
    <Card title="Cost at a headcount">
      <div className="mb-3 max-w-xs">
        <Field label="Guests" hint="Defaults to your goal, or your maximum. Everyone is priced as an adult.">
          <NumberInput min={1} value={headcount} onValueChange={onHeadcount} />
        </Field>
      </div>
      {n > 0 && refs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Venue charges, drinks, extras and total for each package at {n} guests</caption>
            <thead>
              <tr className="text-left text-stone-600">
                <th scope="col" className="p-2 font-medium">Package</th>
                <th scope="col" className="p-2 text-right font-medium">Venue</th>
                <th scope="col" className="p-2 text-right font-medium">Drinks</th>
                <th scope="col" className="p-2 text-right font-medium">Extras</th>
                <th scope="col" className="p-2 text-right font-medium">Total</th>
                <th scope="col" className="p-2 text-right font-medium">Per guest</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {refs.map((r, i) => {
                const c = costs[i]
                const over = c.overCapacity
                return (
                  <tr key={r.pkg.id}
                    className={`border-t border-stone-100 ${over ? 'text-stone-400' : ''} ${i === best ? 'bg-emerald-50 font-medium' : ''}`}>
                    <th scope="row" className="p-2 text-left font-normal">
                      <span className={i === best ? 'font-semibold' : ''}>{r.label}</span>
                      <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-stone-500">
                        {i === best && <Badge color="#047857">Cheapest</Badge>}
                        {over && <span>Over capacity (max {r.pkg.maxGuests})</span>}
                        {!over && c.billed > c.headcount && <span>Billed for the minimum of {c.billed}</span>}
                        {!over && r.pkg.drinks !== 'included' && <span>Drinks: {DRINKS_NOTE[r.pkg.drinks]}</span>}
                      </div>
                    </th>
                    <td className="p-2 text-right">{formatMoney(c.venue)}</td>
                    <td className="p-2 text-right">{c.drinks ? formatMoney(c.drinks) : '–'}</td>
                    <td className="p-2 text-right">{c.extras ? formatMoney(c.extras) : '–'}</td>
                    <td className="p-2 text-right">{formatMoney(c.total)}</td>
                    <td className="p-2 text-right">{formatMoney(c.perHead)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-stone-500">{refs.length === 0 ? 'Add a package to compare costs.' : 'Enter a number of guests.'}</p>
      )}
    </Card>
  )
}
