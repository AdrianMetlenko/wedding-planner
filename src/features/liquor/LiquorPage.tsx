import { Link } from 'react-router-dom'
import { Alert, Button, Card, EmptyState, NumberInput, PageHeader, StatTile } from '../../components/ui'
import { liquorLine } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import { newId } from '../../lib/id'
import { useStore } from '../../store/store'
import { liquorTotals, withoutKey } from './liquorMath'

const cellClass = 'border border-stone-200 px-2 py-1 align-middle'
const headClass = 'border border-stone-200 bg-stone-50 px-2 py-1.5 text-left text-xs font-medium text-stone-600'

export default function LiquorPage() {
  const enabled = useStore((s) => s.settings.modules.liquor)
  const events = useStore((s) => s.liquorEvents)
  const vendors = useStore((s) => s.liquorVendors)
  const items = useStore((s) => s.liquor)

  if (!enabled) {
    return (
      <>
        <PageHeader title="Drinks" />
        <EmptyState title="The drinks calculator is turned off">
          Turn it on under{' '}
          <Link to="/setup" className="font-medium text-brand-700 underline">setup</Link> to compare drink prices.
        </EmptyState>
      </>
    )
  }

  const { patch, upsert, remove, setCollection } = useStore.getState()
  const totals = liquorTotals(items, events.map((e) => e.id))

  const addEvent = () => upsert('liquorEvents', { id: newId('liqev'), name: `Event ${events.length + 1}` })
  const addVendor = () => upsert('liquorVendors', { id: newId('liqvend'), name: `Vendor ${vendors.length + 1}` })
  const addItem = () => upsert('liquor', { id: newId('liq'), name: '', kind: '', bottles: {}, prices: {} })

  const removeEvent = (id: string) => {
    remove('liquorEvents', id)
    setCollection('liquor', items.map((i) => ({ ...i, bottles: withoutKey(i.bottles, id) })))
  }
  const removeVendor = (id: string) => {
    remove('liquorVendors', id)
    setCollection('liquor', items.map((i) => ({ ...i, prices: withoutKey(i.prices, id) })))
  }

  const setNumber = (
    item: (typeof items)[number],
    field: 'bottles' | 'prices',
    id: string,
    value: number | undefined,
  ) => {
    patch('liquor', item.id, { [field]: { ...item[field], [id]: value ?? 0 } })
  }

  return (
    <>
      <PageHeader
        title="Drinks"
        description="For couples buying their own drinks. Enter bottles needed per event and the price per bottle from each vendor. The cheapest vendor per drink is highlighted."
        actions={<Button variant="primary" onClick={addItem}>Add a drink</Button>}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatTile label="Bottles" value={totals.bottles.toLocaleString('en-US')} sub="all drinks, all events" />
        <StatTile label="Cheapest order" value={formatMoney(totals.total)} sub="each drink from its cheapest vendor" />
        <StatTile
          label="Drinks"
          value={items.length}
          sub={vendors.length ? `${vendors.length} vendor${vendors.length === 1 ? '' : 's'} compared` : 'add vendors to compare prices'}
        />
      </div>

      {vendors.length === 0 && (
        <div className="mb-4">
          <Alert tone="info">Add at least one vendor column (for example "Bottle shop A" or "Direct") to price the drinks.</Alert>
        </div>
      )}

      <Card title="Grid">
        {items.length === 0 ? (
          <EmptyState title="No drinks yet" action={<Button variant="primary" onClick={addItem}>Add a drink</Button>}>
            Add a drink, then enter how many bottles each event needs and what each vendor charges.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={headClass} rowSpan={2}>Drink</th>
                  <th className={headClass} rowSpan={2}>Kind</th>
                  <th className={headClass} colSpan={events.length + 1}>Bottles per event</th>
                  <th className={headClass} colSpan={vendors.length + 1}>Price per bottle</th>
                  <th className={headClass} rowSpan={2}>Total bottles</th>
                  <th className={headClass} rowSpan={2}>Cheapest vendor</th>
                  <th className={headClass} rowSpan={2}>Unit price</th>
                  <th className={headClass} rowSpan={2}>Line total</th>
                  <th className={headClass} rowSpan={2} />
                </tr>
                <tr>
                  {events.map((ev) => (
                    <th key={ev.id} className={headClass}>
                      <div className="flex items-center gap-1">
                        <input
                          className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium text-stone-800 hover:border-stone-300 focus:border-brand-500 focus:outline-none"
                          value={ev.name}
                          aria-label="Event name"
                          onChange={(e) => patch('liquorEvents', ev.id, { name: e.target.value })}
                        />
                        <button
                          type="button"
                          className="text-stone-400 hover:text-red-600"
                          aria-label={`Remove ${ev.name}`}
                          onClick={() => removeEvent(ev.id)}
                        >×</button>
                      </div>
                    </th>
                  ))}
                  <th className={headClass}>
                    <Button size="sm" onClick={addEvent}>+ Event</Button>
                  </th>
                  {vendors.map((v) => (
                    <th key={v.id} className={headClass}>
                      <div className="flex items-center gap-1">
                        <input
                          className="w-32 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium text-stone-800 hover:border-stone-300 focus:border-brand-500 focus:outline-none"
                          value={v.name}
                          aria-label="Vendor name"
                          onChange={(e) => patch('liquorVendors', v.id, { name: e.target.value })}
                        />
                        <button
                          type="button"
                          className="text-stone-400 hover:text-red-600"
                          aria-label={`Remove ${v.name}`}
                          onClick={() => removeVendor(v.id)}
                        >×</button>
                      </div>
                    </th>
                  ))}
                  <th className={headClass}>
                    <Button size="sm" onClick={addVendor}>+ Vendor</Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const line = liquorLine(item)
                  const cheapest = vendors.find((v) => v.id === line.cheapestVendorId)
                  return (
                    <tr key={item.id}>
                      <td className={cellClass}>
                        <input
                          className="w-36 rounded border border-stone-300 px-2 py-1"
                          placeholder="e.g. Vodka"
                          value={item.name}
                          aria-label="Drink name"
                          onChange={(e) => patch('liquor', item.id, { name: e.target.value })}
                        />
                      </td>
                      <td className={cellClass}>
                        <input
                          className="w-28 rounded border border-stone-300 px-2 py-1"
                          placeholder="e.g. Spirit"
                          value={item.kind}
                          aria-label="Drink kind"
                          onChange={(e) => patch('liquor', item.id, { kind: e.target.value })}
                        />
                      </td>
                      {events.map((ev) => (
                        <td key={ev.id} className={cellClass}>
                          <NumberInput
                            className="w-20"
                            min={0}
                            aria-label={`${item.name || 'Drink'} bottles for ${ev.name}`}
                            value={item.bottles[ev.id]}
                            onValueChange={(n) => setNumber(item, 'bottles', ev.id, n)}
                          />
                        </td>
                      ))}
                      <td className={cellClass} />
                      {vendors.map((v) => {
                        const isCheapest = line.cheapestVendorId === v.id
                        return (
                          <td
                            key={v.id}
                            className={`${cellClass} ${isCheapest ? 'bg-emerald-50' : ''}`}
                          >
                            <NumberInput
                              className={`w-24 ${isCheapest ? 'font-semibold text-emerald-800' : ''}`}
                              min={0}
                              step={0.01}
                              aria-label={`${item.name || 'Drink'} price at ${v.name}`}
                              value={item.prices[v.id]}
                              onValueChange={(n) => setNumber(item, 'prices', v.id, n)}
                            />
                          </td>
                        )
                      })}
                      <td className={cellClass} />
                      <td className={`${cellClass} text-right tabular-nums`}>{line.bottles}</td>
                      <td className={cellClass}>{cheapest?.name ?? '—'}</td>
                      <td className={`${cellClass} text-right tabular-nums`}>
                        {line.unitPrice !== undefined ? formatMoney(line.unitPrice, true) : '—'}
                      </td>
                      <td className={`${cellClass} text-right tabular-nums`}>{formatMoney(line.total)}</td>
                      <td className={cellClass}>
                        <Button size="sm" variant="ghost" onClick={() => remove('liquor', item.id)}>Delete</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-medium">
                  <td className={cellClass} colSpan={2}>Per event</td>
                  {events.map((ev) => (
                    <td key={ev.id} className={`${cellClass} text-right tabular-nums`}>{totals.perEvent[ev.id] ?? 0}</td>
                  ))}
                  <td className={cellClass} />
                  <td className={cellClass} colSpan={vendors.length + 1} />
                  <td className={`${cellClass} text-right tabular-nums`}>{totals.bottles}</td>
                  <td className={cellClass} colSpan={2} />
                  <td className={`${cellClass} text-right tabular-nums`}>{formatMoney(totals.total)}</td>
                  <td className={cellClass} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {items.length > 0 && (
          <p className="mt-3 text-xs text-stone-500">
            Drinks with no price entered are left out of the cheapest order. Prices are per bottle.
          </p>
        )}
      </Card>
    </>
  )
}
