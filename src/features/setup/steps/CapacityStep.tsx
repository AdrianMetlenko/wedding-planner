import { Alert, Button, Checkbox, Field, NumberInput } from '../../../components/ui'
import { formatMoney } from '../../../lib/format'
import { adultPriceAt, optimiserCurve } from '../../../lib/calc'
import { GUEST_TYPES, type GuestType } from '../../../lib/types'
import { useStore } from '../../../store/store'
import { validateCapacity } from '../validation'

/** Stored as fractions, typed as percentages; cleared means unset. */
const percentOf = (fraction: number | undefined) => (fraction === undefined ? undefined : +(fraction * 100).toFixed(2))
const fractionOf = (percent: number | undefined) => (percent === undefined ? undefined : +(percent / 100).toFixed(6))

const TYPE_LABEL: Record<GuestType, string> = { adult: 'Adults', child: 'Children', staff: 'Staff' }

export function CapacityStep() {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const errors = validateCapacity(settings)
  const { min, goal, max, countsTypes } = settings.capacity
  const { tiers } = settings

  const toggleType = (t: GuestType, on: boolean) =>
    update({ capacity: { countsTypes: GUEST_TYPES.filter((x) => (x === t ? on : countsTypes.includes(x))) } })

  const setTier = (i: number, p: Partial<{ below: number; price: number }>) =>
    update({ tiers: tiers.map((t, j) => (j === i ? { ...t, ...p } : t)) })
  const addTier = () => {
    const last = tiers[tiers.length - 1]
    update({ tiers: [...tiers, { below: last ? last.below + 20 : (goal ?? max), price: settings.pricePerHead.adult }] })
  }

  const previewN = goal ?? max
  const previewOk = Object.keys(errors).length === 0 && previewN > 0
  const point = previewOk ? optimiserCurve(settings, previewN, previewN)[0] : undefined
  const feeSummary = [
    settings.flatFee ? `a ${formatMoney(settings.flatFee)} hire fee` : undefined,
    settings.discount ? `a ${percentOf(settings.discount)}% discount` : undefined,
    settings.serviceCharge ? `a ${percentOf(settings.serviceCharge)}% service charge` : undefined,
  ].filter(Boolean).join(', ')
  const topTier = tiers.length ? Math.max(...tiers.map((t) => t.below)) : undefined

  return (
    <div className="space-y-8">
      <section aria-labelledby="cap-h" className="space-y-3">
        <h3 id="cap-h" className="font-semibold text-stone-900">Venue capacity</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Maximum guests (required)" error={errors.max} hint="The most the venue allows.">
            <NumberInput min={1} value={max || undefined} onValueChange={(v) => update({ capacity: { max: v ?? 0 } })} />
          </Field>
          <Field label="Minimum guests (optional)" error={errors.min} hint="If the venue bills a minimum.">
            <NumberInput min={1} value={min} onValueChange={(v) => update({ capacity: { min: v } })} />
          </Field>
          <Field label="Goal guests (optional)" error={errors.goal} hint="The headcount you are aiming for.">
            <NumberInput min={1} value={goal} onValueChange={(v) => update({ capacity: { goal: v } })} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-stone-700">Guest types that count toward capacity and price tiers</legend>
          <div className="flex flex-wrap gap-4">
            {GUEST_TYPES.map((t) => (
              <Checkbox key={t} label={TYPE_LABEL[t]} checked={countsTypes.includes(t)} onChange={(on) => toggleType(t, on)} />
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500">Venues differ: some count children and staff, some do not.</p>
          {errors.countsTypes && <p className="mt-1 text-xs text-red-600">{errors.countsTypes}</p>}
        </fieldset>
      </section>

      <section aria-labelledby="price-h" className="space-y-3">
        <h3 id="price-h" className="font-semibold text-stone-900">Price per head</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {GUEST_TYPES.map((t) => (
            <Field key={t} label={`${TYPE_LABEL[t]} ($)`} error={errors[`price-${t}`]}
              hint={t === 'adult' ? 'At or above your highest tier threshold, if you add tiers.' : undefined}>
              <NumberInput min={0} value={settings.pricePerHead[t]}
                onValueChange={(v) => update({ pricePerHead: { [t]: v ?? 0 } })} />
            </Field>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Venue hire fee, flat ($, optional)" error={errors.flatFee}
            hint="Charged whatever the headcount, on top of the per-head prices.">
            <NumberInput min={0} value={settings.flatFee} onValueChange={(v) => update({ flatFee: v })} />
          </Field>
          <Field label="Discount % (optional)" error={errors.discount} hint="Off the per-head charges.">
            <NumberInput min={0} max={100} step="any" value={percentOf(settings.discount)}
              onValueChange={(v) => update({ discount: fractionOf(v) })} />
          </Field>
          <Field label="Service charge % (gratuity + tax, optional)" error={errors.serviceCharge}
            hint="Added to the venue charges.">
            <NumberInput min={0} step="any" value={percentOf(settings.serviceCharge)}
              onValueChange={(v) => update({ serviceCharge: fractionOf(v) })} />
          </Field>
        </div>

        <div className="rounded-md border border-stone-200 p-3">
          <h4 className="text-sm font-medium text-stone-800">Headcount price tiers (optional)</h4>
          <p className="mt-1 text-xs text-stone-500">
            Some venues lower the adult price as the headcount grows. List thresholds in ascending order.
            At or above the highest threshold{topTier ? ` (${topTier} guests)` : ''}, the adult price above applies.
          </p>
          <ul className="mt-3 space-y-2">
            {tiers.map((t, i) => (
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
                    onClick={() => update({ tiers: tiers.filter((_, j) => j !== i) })}>Remove</Button>
                </div>
                {(errors[`tier-${i}-below`] || errors[`tier-${i}-price`]) && (
                  <p className="mt-1 text-xs text-red-600">{errors[`tier-${i}-below`] ?? errors[`tier-${i}-price`]}</p>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3"><Button size="sm" onClick={addTier}>Add tier</Button></div>
        </div>
      </section>

      <section aria-labelledby="other-h" className="space-y-3">
        <h3 id="other-h" className="font-semibold text-stone-900">Other</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Expected average gift per guest, $ (optional)" error={errors.averageGift}
            hint="Powers the headcount optimiser, which weighs the cost of each extra guest against the gifts they bring.">
            <NumberInput min={0} value={settings.averageGift} onValueChange={(v) => update({ averageGift: v })} />
          </Field>
          <Field label="Default table capacity" error={errors.tableCapacity} hint="Seats per table when you add tables. Each table can differ later.">
            <NumberInput min={1} value={settings.defaultTableCapacity || undefined}
              onValueChange={(v) => update({ defaultTableCapacity: v ?? 0 })} />
          </Field>
        </div>
      </section>

      {point ? (
        <Alert tone="info">
          At your {goal ? 'goal' : 'maximum'} of {previewN} guests: {formatMoney(adultPriceAt(previewN, settings))} per adult,
          total {formatMoney(point.cost)}
          {settings.averageGift ? `, net ${formatMoney(point.net)} after gifts` : ''}.
          {feeSummary && ` Includes ${feeSummary}.`}
        </Alert>
      ) : (
        <Alert tone="warn">Fix the highlighted fields to see a cost preview.</Alert>
      )}
    </div>
  )
}
