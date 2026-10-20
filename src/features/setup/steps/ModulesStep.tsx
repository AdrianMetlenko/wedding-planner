import type { ReactNode } from 'react'
import { Checkbox, Field, NumberInput } from '../../../components/ui'
import type { HoneymoonMode } from '../../../lib/types'
import { useStore } from '../../../store/store'
import { validateModules } from '../validation'

function Row({ children, help }: { children: ReactNode; help: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-3">
      {children}
      <p className="mt-1 pl-6 text-xs text-stone-500">{help}</p>
    </div>
  )
}

const HONEYMOON: { value: HoneymoonMode; label: string }[] = [
  { value: 'in-budget', label: 'Include in the wedding budget' },
  { value: 'separate', label: 'Track separately' },
  { value: 'off', label: 'Off' },
]

export function ModulesStep() {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const budgetTotal = useStore((s) => s.budgetPlan.total)
  const { modules, thankYouRule } = settings
  const errors = validateModules(settings)
  const hasThreshold = thankYouRule.perHeadOver !== undefined

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">Turn on only what you need. Screens for modules that are off stay hidden, and you can change this later.</p>

      <Row help="Record gifts received and see how they offset the cost of the guest list.">
        <Checkbox label="Gifts" checked={modules.gifts}
          onChange={(v) => update({ modules: v ? { gifts: true } : { gifts: false, thankYous: false } })} />
      </Row>

      <Row help={modules.gifts ? 'Track which gifts have had a thank-you card.' : 'Turn on Gifts first.'}>
        <label className={`inline-flex items-center gap-2 text-sm ${modules.gifts ? 'cursor-pointer' : 'opacity-50'}`}>
          <input type="checkbox" className="h-4 w-4 accent-brand-600" disabled={!modules.gifts}
            checked={modules.gifts && modules.thankYous} onChange={(e) => update({ modules: { thankYous: e.target.checked } })} />
          Thank-you tracking
        </label>
        {modules.gifts && modules.thankYous && (
          <div className="mt-3 space-y-2 pl-6">
            <Checkbox label="Gifts from guests who didn't attend need a card" checked={thankYouRule.nonAttendees}
              onChange={(v) => update({ thankYouRule: { nonAttendees: v } })} />
            <div className="flex flex-wrap items-center gap-2">
              <Checkbox label="Gifts over a set amount per attending guest need a card"
                checked={hasThreshold} onChange={(v) => update({ thankYouRule: { perHeadOver: v ? 50 : undefined } })} />
              {hasThreshold && (
                <Field label="Amount per attending guest ($)" error={errors.perHeadOver}>
                  <NumberInput className="w-28" min={0} value={thankYouRule.perHeadOver}
                    onValueChange={(v) => update({ thankYouRule: { perHeadOver: v ?? 0 } })} />
                </Field>
              )}
            </div>
          </div>
        )}
      </Row>

      <Row help="Estimate and pay-down tracking for every wedding cost.">
        <Checkbox label="Expenses budget" checked={modules.expenses}
          onChange={(v) => update({ modules: v ? { expenses: true } : { expenses: false, honeymoon: 'off' } })} />
        {modules.expenses && (
          <div className="mt-3 pl-6">
            <Field label="Overall budget ($, optional)" hint="Allocation by category happens on the Budget page.">
              <NumberInput className="w-36" min={0} step={100} value={budgetTotal}
                onValueChange={(v) => useStore.setState((s) => ({ budgetPlan: { ...s.budgetPlan, total: v } }))} />
            </Field>
          </div>
        )}
      </Row>

      <Row help="Work out how many bottles of each drink you need and compare vendor prices.">
        <Checkbox label="Drinks calculator" checked={modules.liquor} onChange={(v) => update({ modules: { liquor: v } })} />
      </Row>

      <Row help="Compare venues side by side at your expected headcount.">
        <Checkbox label="Venue scouting" checked={modules.venues} onChange={(v) => update({ modules: { venues: v } })} />
      </Row>

      <div className="rounded-md border border-stone-200 bg-white p-3">
        <fieldset disabled={!modules.expenses}>
          <legend className="text-sm font-medium text-stone-800">Honeymoon</legend>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
            {HONEYMOON.map((o) => (
              <label key={o.value} className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="honeymoon" className="accent-brand-600" value={o.value}
                  checked={modules.honeymoon === o.value} onChange={() => update({ modules: { honeymoon: o.value } })} />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-1 text-xs text-stone-500">
          {modules.expenses ? 'Choose whether honeymoon costs count toward the wedding budget or are tracked on their own.' : 'Turn on Expenses budget to track a honeymoon.'}
        </p>
      </div>
    </div>
  )
}
