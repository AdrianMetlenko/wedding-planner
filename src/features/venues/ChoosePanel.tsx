import { useState } from 'react'
import { Alert, Button, Card, Checkbox } from '../../components/ui'
import { packageToSettings } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import type { PriceTier, Settings } from '../../lib/types'
import { useStore } from '../../store/store'
import { chooseOnly, packageLabel, type PackageRef, venueLabel } from './venueGrid'

const money = (v: number | undefined) => (v === undefined ? 'not set' : formatMoney(v))
const percent = (v: number | undefined) => (v ? `${+(v * 100).toFixed(2)}%` : 'none')
const guests = (v: number | undefined) => (v === undefined ? 'not set' : String(v))
const tiers = (t: PriceTier[]) => (t.length ? t.map((x) => `below ${x.below}: ${formatMoney(x.price)}`).join(', ') : 'none')

/** Before and after values of each setting that choosing a package would write. */
function settingsPreview(patch: ReturnType<typeof packageToSettings>, current: Settings) {
  const before = tiers(current.tiers)
  const after = tiers(patch.tiers)
  const rows = [
    { label: 'Minimum guests', before: guests(current.capacity.min), after: guests(patch.capacity.min) },
    { label: 'Maximum guests', before: guests(current.capacity.max), after: guests(patch.capacity.max) },
    { label: 'Adult price', before: money(current.pricePerHead.adult), after: money(patch.pricePerHead.adult) },
    { label: 'Child price', before: money(current.pricePerHead.child), after: money(patch.pricePerHead.child) },
    { label: 'Staff price', before: money(current.pricePerHead.staff), after: money(patch.pricePerHead.staff) },
    { label: 'Price tiers', before, after },
    { label: 'Venue hire fee', before: money(current.flatFee), after: money(patch.flatFee) },
    { label: 'Discount', before: percent(current.discount), after: percent(patch.discount) },
    { label: 'Service charge (gratuity + tax)', before: percent(current.serviceCharge), after: percent(patch.serviceCharge) },
  ]
  return rows.map((r) => ({ ...r, changed: r.before !== r.after }))
}

export function ChoosePanel({ target, onClose }: { target: PackageRef; onClose: () => void }) {
  const settings = useStore((s) => s.settings)
  const [apply, setApply] = useState(true)
  const patch = packageToSettings(target.pkg, settings)
  const rows = settingsPreview(patch, settings)
  const changes = rows.filter((r) => r.changed).length

  const confirm = () => {
    const state = useStore.getState()
    state.setCollection('venues', chooseOnly(state.venues, target.pkg.id))
    if (apply) state.updateSettings(patch)
    onClose()
  }

  return (
    <Card title={`Choose ${venueLabel(target.venue)} — ${packageLabel(target.pkg)}`}>
      <div role="region" aria-label="Choose package confirmation" className="space-y-4">
        <p className="text-sm text-stone-600">
          This marks the package as your chosen one. Any other chosen package is unmarked.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Planner settings before and after choosing this package</caption>
            <thead>
              <tr className="text-left text-stone-600">
                <th scope="col" className="p-2 font-medium">Setting</th>
                <th scope="col" className="p-2 font-medium">Now</th>
                <th scope="col" className="p-2 font-medium">After</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.label} className={`border-t border-stone-100 ${r.changed ? 'bg-amber-50' : 'text-stone-500'}`}>
                  <th scope="row" className="p-2 text-left font-normal">{r.label}</th>
                  <td className="p-2">{r.before}</td>
                  <td className={`p-2 ${r.changed ? 'font-semibold' : ''}`}>
                    {r.after}{r.changed && <span className="sr-only"> (changed)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Checkbox checked={apply} onChange={setApply} label="Also update my planner's capacity and pricing" />
        {apply && changes === 0 && <Alert tone="info">Your planner already matches this package.</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={confirm}>Confirm</Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  )
}
