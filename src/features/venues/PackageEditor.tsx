import { Button, Field, Input, NumberInput, Select } from '../../components/ui'
import { newId } from '../../lib/id'
import type { VenueDrinks, VenuePackage } from '../../lib/types'
import { validateTiers } from '../setup/validation'
import { updatePackage } from './venueActions'
import { fromPercent, per100FromPerGuest, perGuestFromPer100, toPercent } from './venueGrid'

const DRINK_OPTIONS: { value: VenueDrinks; label: string }[] = [
  { value: 'included', label: 'Included' },
  { value: 'bar-tab', label: 'Bar tab' },
  { value: 'byo', label: 'Bring your own' },
]

export function PackageEditor({ venueId, pkg }: { venueId: string; pkg: VenuePackage }) {
  const set = (patch: Partial<VenuePackage>) => updatePackage(venueId, pkg.id, patch)
  const tierErrors = validateTiers(pkg.tiers)
  const topTier = pkg.tiers.length ? Math.max(...pkg.tiers.map((t) => t.below)) : undefined
  const percent = (label: string, key: 'discount' | 'gratuity' | 'tax', hint?: string) => (
    <Field label={label} hint={hint}>
      <NumberInput min={0} max={100} step="any" value={toPercent(pkg[key]) || undefined}
        onValueChange={(v) => set({ [key]: fromPercent(v ?? 0) })} />
    </Field>
  )

  const setTier = (i: number, patch: Partial<{ below: number; price: number }>) =>
    set({ tiers: pkg.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) })
  const addTier = () => {
    const last = pkg.tiers[pkg.tiers.length - 1]
    set({ tiers: [...pkg.tiers, { below: last ? last.below + 20 : (pkg.maxGuests ?? 100), price: pkg.pricePerHead }] })
  }
  const setExtra = (id: string, patch: Partial<VenuePackage['extras'][number]>) =>
    set({ extras: pkg.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)) })

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Package name">
          <Input value={pkg.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Flat hire fee ($)" hint="Charged whatever the headcount.">
          <NumberInput min={0} value={pkg.flatFee || undefined} onValueChange={(v) => set({ flatFee: v ?? 0 })} />
        </Field>
        <Field label="Adult price per head ($)" hint={topTier ? `At or above ${topTier} guests.` : undefined}>
          <NumberInput min={0} value={pkg.pricePerHead || undefined} onValueChange={(v) => set({ pricePerHead: v ?? 0 })} />
        </Field>
        <Field label="Hours (optional)">
          <NumberInput min={0} step="any" value={pkg.hours} onValueChange={(v) => set({ hours: v })} />
        </Field>
      </div>

      <div className="rounded-md border border-stone-200 p-3">
        <h4 className="text-sm font-medium text-stone-800">Headcount price tiers (optional)</h4>
        <p className="mt-1 text-xs text-stone-500">
          Lower the adult price as the headcount grows. List thresholds in ascending order; at or above the highest
          threshold{topTier ? ` (${topTier} guests)` : ''}, the adult price above applies.
        </p>
        <ul className="mt-3 space-y-2">
          {pkg.tiers.map((t, i) => (
            <li key={i}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Below</span>
                <NumberInput aria-label={`Tier ${i + 1} guest threshold`} className="w-24" min={1}
                  value={t.below || undefined} onValueChange={(v) => setTier(i, { below: v ?? 0 })} />
                <span>guests &rarr; $</span>
                <NumberInput aria-label={`Tier ${i + 1} price per adult`} className="w-24" min={0}
                  value={t.price || undefined} onValueChange={(v) => setTier(i, { price: v ?? 0 })} />
                <span>per adult</span>
                <Button size="sm" variant="ghost" aria-label={`Remove tier ${i + 1}`}
                  onClick={() => set({ tiers: pkg.tiers.filter((_, j) => j !== i) })}>Remove</Button>
              </div>
              {(tierErrors[`tier-${i}-below`] || tierErrors[`tier-${i}-price`]) && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {tierErrors[`tier-${i}-below`] ?? tierErrors[`tier-${i}-price`]}
                </p>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3"><Button size="sm" onClick={addTier}>Add tier</Button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Child price ($, optional)">
          <NumberInput min={0} value={pkg.childPrice} onValueChange={(v) => set({ childPrice: v })} />
        </Field>
        <Field label="Staff price ($, optional)">
          <NumberInput min={0} value={pkg.staffPrice} onValueChange={(v) => set({ staffPrice: v })} />
        </Field>
        <Field label="Minimum guests (optional)" hint="Billed as at least this many.">
          <NumberInput min={1} value={pkg.minGuests} onValueChange={(v) => set({ minGuests: v })} />
        </Field>
        <Field label="Maximum guests (optional)">
          <NumberInput min={1} value={pkg.maxGuests} onValueChange={(v) => set({ maxGuests: v })} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {percent('Discount (%)', 'discount', 'Off the per-head charges.')}
        {percent('Gratuity (%)', 'gratuity', 'On the venue charges.')}
        {percent('Tax (%)', 'tax', 'On the venue charges.')}
      </div>

      <fieldset className="rounded-md border border-stone-200 p-3">
        <legend className="px-1 text-sm font-medium text-stone-800">Drinks</legend>
        <div className="flex flex-wrap gap-4">
          {DRINK_OPTIONS.map((o) => (
            <label key={o.value} className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" className="h-4 w-4 accent-brand-600" name={`drinks-${pkg.id}`}
                checked={pkg.drinks === o.value} onChange={() => set({ drinks: o.value })} />
              {o.label}
            </label>
          ))}
        </div>
        {pkg.drinks !== 'included' && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Estimated drinks cost per guest ($)">
              <NumberInput min={0} step="any" value={pkg.drinksPerHead}
                onValueChange={(v) => set({ drinksPerHead: v })} />
            </Field>
            <Field label="Or enter the cost per 100 guests ($)"
              hint="Some caterers quote drinks per 100 guests; this is divided by 100 to give the per-guest figure.">
              <NumberInput min={0} step="any"
                value={pkg.drinksPerHead === undefined ? undefined : per100FromPerGuest(pkg.drinksPerHead)}
                onValueChange={(v) => set({ drinksPerHead: v === undefined ? undefined : perGuestFromPer100(v) })} />
            </Field>
          </div>
        )}
      </fieldset>

      <div className="rounded-md border border-stone-200 p-3">
        <h4 className="text-sm font-medium text-stone-800">Extras not included</h4>
        <p className="mt-1 text-xs text-stone-500">Things you would buy separately (DJ, cake&hellip;). They count toward the total.</p>
        <ul className="mt-3 space-y-2">
          {pkg.extras.map((e, i) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
              <Input aria-label={`Extra ${i + 1} name`} className="w-48" placeholder="Name" value={e.name}
                onChange={(ev) => setExtra(e.id, { name: ev.target.value })} />
              <span>$</span>
              <NumberInput aria-label={`Extra ${i + 1} cost`} className="w-24" min={0} value={e.cost || undefined}
                onValueChange={(v) => setExtra(e.id, { cost: v ?? 0 })} />
              <Select aria-label={`Extra ${i + 1} charged`} className="w-auto"
                value={e.per} onChange={(ev) => setExtra(e.id, { per: ev.target.value as 'flat' | 'head' })}>
                <option value="flat">flat</option>
                <option value="head">per guest</option>
              </Select>
              <Button size="sm" variant="ghost" aria-label={`Remove extra ${i + 1}`}
                onClick={() => set({ extras: pkg.extras.filter((x) => x.id !== e.id) })}>Remove</Button>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Button size="sm"
            onClick={() => set({ extras: [...pkg.extras, { id: newId('x'), name: '', cost: 0, per: 'flat' }] })}>
            Add extra
          </Button>
        </div>
      </div>

      <Field label="Notes (optional)">
        <textarea rows={2} value={pkg.notes ?? ''} onChange={(e) => set({ notes: e.target.value || undefined })}
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
      </Field>
    </div>
  )
}
