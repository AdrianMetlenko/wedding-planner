import { useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Alert, Button, Card, EmptyState, NumberInput, StatTile, cx } from '../../components/ui'
import { planSummary, setLocked, setMode, setShare, syncLines, type PlanLine } from '../../lib/budget'
import { budgetExpenses, countByType, guestsFor, venueCost } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import type { BudgetLine, BudgetMode, ExpenseCategory } from '../../lib/types'
import { getAppState, useStore } from '../../store/store'
import { OVER_COLOR, distribution, resetShares, shareTotal } from './plan'

const VENUE_LABEL = 'Venue & catering (forecast headcount)'
const MODES: { value: BudgetMode; label: string }[] = [
  { value: 'percent', label: '% share' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'off', label: 'Off' },
]

function ModeControl({ name, value, onChange }: { name: string; value: BudgetMode; onChange: (m: BudgetMode) => void }) {
  return (
    <div role="radiogroup" aria-label={`Mode for ${name}`} className="inline-flex overflow-hidden rounded-md border border-stone-300 text-xs">
      {MODES.map((m) => (
        <button
          key={m.value} type="button" role="radio" aria-checked={value === m.value}
          onClick={() => onChange(m.value)}
          className={cx(
            'px-2.5 py-1 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            value === m.value ? 'bg-brand-600 text-white' : 'bg-white text-stone-700 hover:bg-stone-100',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

function CategoryRow({ category, line, plan, notCounted, onLines }: {
  category: ExpenseCategory; line: BudgetLine; plan: PlanLine; notCounted: boolean
  onLines: (fn: (lines: BudgetLine[]) => BudgetLine[]) => void
}) {
  const off = line.mode === 'off'
  const id = `share-${category.id}`
  return (
    <li className={cx('grid items-center gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(9rem,1fr)_auto_minmax(14rem,2fr)_repeat(3,minmax(5rem,auto))]', off && 'opacity-60')}>
      <div className="flex items-center gap-2 font-medium text-stone-800">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: category.color }} aria-hidden />
        {category.name}
      </div>
      <ModeControl name={category.name} value={line.mode} onChange={(m) => onLines((l) => setMode(l, category.id, m))} />
      <div className="flex min-w-0 items-center gap-2">
        {line.mode === 'percent' ? (
          <>
            <input
              id={id} type="range" min={0} max={100} step={0.5} value={line.percent}
              aria-label={`Share of remainder for ${category.name}`}
              onChange={(e) => onLines((l) => setShare(l, category.id, Number(e.target.value)))}
              className="min-w-[6rem] flex-1 accent-brand-600"
            />
            <div className="w-20 shrink-0">
              <NumberInput
                className="px-2" min={0} max={100} step={0.1} value={line.percent}
                aria-label={`Share percent for ${category.name}`}
                onValueChange={(v) => onLines((l) => setShare(l, category.id, v ?? 0))}
              />
            </div>
            <button
              type="button" aria-pressed={line.locked}
              aria-label={`Lock share for ${category.name}`} title={line.locked ? 'Locked: other sliders will not move this' : 'Lock this share'}
              onClick={() => onLines((l) => setLocked(l, category.id, !line.locked))}
              className={cx(
                'shrink-0 rounded-md border px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                line.locked ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-100',
              )}
            >
              {line.locked ? 'Locked' : 'Lock'}
            </button>
          </>
        ) : (
          <span className="text-sm text-stone-500">{line.mode === 'fixed' ? 'Counted at its estimate' : 'Not in the plan'}</span>
        )}
      </div>
      <div className="text-sm tabular-nums">
        <span className="text-xs text-stone-500 md:hidden">Allocated </span>
        {off ? '–' : line.mode === 'fixed' ? '= estimate' : formatMoney(plan.allocated)}
      </div>
      <div className="text-sm tabular-nums text-stone-600">
        <span className="text-xs text-stone-500 md:hidden">Est. </span>{formatMoney(plan.estimate)}
        <span className="mx-1 text-stone-300">/</span>
        <span className="text-xs text-stone-500">paid </span>{formatMoney(plan.paid)}
      </div>
      <div className={cx('text-sm font-medium tabular-nums', plan.difference < 0 ? 'text-red-600' : 'text-emerald-700')}>
        {off ? null : plan.difference < 0 ? `${formatMoney(-plan.difference)} over` : `${formatMoney(plan.difference)} left`}
      </div>
      {off && notCounted && (
        <p className="text-xs text-stone-500 md:col-span-6">Its estimated items aren&rsquo;t counted in the plan.</p>
      )}
    </li>
  )
}

export function BudgetPlanCard() {
  const { budgetPlan, categories, expenses, guests, settings } = useStore(useShallow((s) => ({
    budgetPlan: s.budgetPlan, categories: s.expenseCategories, expenses: s.expenses, guests: s.guests, settings: s.settings,
  })))
  const counted = useMemo(() => budgetExpenses({ expenses, settings }), [expenses, settings])
  const lines = useMemo(() => syncLines(budgetPlan.lines, categories, counted), [budgetPlan.lines, categories, counted])
  const venue = useMemo(() => venueCost(countByType(guestsFor(guests, 'planned')), settings).total, [guests, settings])
  const plan = useMemo(() => ({ ...budgetPlan, lines }), [budgetPlan, lines])
  const summary = useMemo(() => planSummary(plan, venue, counted), [plan, venue, counted])
  const dist = useMemo(() => distribution(summary, categories, VENUE_LABEL), [summary, categories])

  useEffect(() => {
    if (lines !== budgetPlan.lines) useStore.setState({ budgetPlan: { ...getAppState().budgetPlan, lines } })
  }, [lines, budgetPlan.lines])

  const setTotal = (total: number | undefined) =>
    useStore.setState({ budgetPlan: { ...getAppState().budgetPlan, total } })
  const onLines = (fn: (l: BudgetLine[]) => BudgetLine[]) =>
    useStore.setState({ budgetPlan: { ...getAppState().budgetPlan, lines: fn(lines) } })

  const totalField = (
    <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
      Overall budget ($)
      <NumberInput className="w-36" min={0} step={100} value={budgetPlan.total} onValueChange={setTotal} />
    </label>
  )

  if (!budgetPlan.total || budgetPlan.total <= 0) {
    return (
      <Card title="Budget plan">
        <EmptyState title="Set an overall budget" action={totalField}>
          Start from what you can spend in total. The venue and any fixed categories come off the top, and the rest is split
          across the other categories by percentage.
        </EmptyState>
      </Card>
    )
  }

  const catById = new Map(categories.map((c) => [c.id, c]))
  const lineById = new Map(lines.map((l) => [l.categoryId, l]))
  const planById = new Map(summary.lines.map((l) => [l.categoryId, l]))

  return (
    <Card title="Budget plan" actions={totalField}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Overall budget" value={formatMoney(summary.total)} />
        <StatTile label="Non-negotiables" value={`− ${formatMoney(summary.nonNegotiable)}`}
          sub={`Venue ${formatMoney(summary.venue)} + fixed ${formatMoney(summary.fixedItems)}`} />
        <StatTile label="Left to allocate" value={formatMoney(summary.remainder)} />
        <StatTile label="Planned spend" value={formatMoney(summary.plannedSpend)} sub="Venue + estimates, excluding off" />
        <StatTile label="Headroom" value={formatMoney(summary.headroom)} tone={summary.headroom < 0 ? 'bad' : 'good'}
          sub={summary.headroom < 0 ? 'Over the overall budget' : 'Under the overall budget'} />
      </div>

      {summary.overCommitted && (
        <div className="mt-3">
          <Alert tone="error">
            Non-negotiables exceed the budget by {formatMoney(summary.nonNegotiable - summary.total)}. Raise the overall
            budget or switch a fixed category to a share or off.
          </Alert>
        </div>
      )}

      <div className="mt-5">
        <div
          role="img" aria-label="Distribution of the overall budget"
          className={cx('flex h-8 w-full overflow-hidden rounded-md bg-stone-100', dist.over > 0 && 'ring-2 ring-red-500')}
        >
          {dist.segments.map((s) => (
            <div
              key={s.key} style={{ width: `${s.barPercent}%`, background: s.color }}
              title={`${s.label}: ${formatMoney(s.amount)} (${s.budgetPercent.toFixed(1)}% of budget)`}
              className="h-full border-r border-white/70 last:border-r-0"
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
          {dist.segments.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm border border-stone-300" style={{ background: s.color }} aria-hidden />
              {s.label}: <span className="tabular-nums">{formatMoney(s.amount)} ({s.budgetPercent.toFixed(1)}%)</span>
            </li>
          ))}
          {dist.over > 0 && (
            <li className="inline-flex items-center gap-1.5 font-medium" style={{ color: OVER_COLOR }}>
              Over budget: <span className="tabular-nums">{formatMoney(dist.over)}</span>
            </li>
          )}
        </ul>
      </div>

      <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-200">
        {categories.map((c) => {
          const line = lineById.get(c.id)
          const pl = planById.get(c.id)
          if (!line || !pl) return null
          return (
            <CategoryRow
              key={c.id} category={catById.get(c.id)!} line={line} plan={pl}
              notCounted={pl.estimate > 0} onLines={onLines}
            />
          )
        })}
      </ul>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3 text-sm">
        <span>
          Shares total <strong className="tabular-nums" data-testid="share-total">{Math.round(shareTotal(lines) * 10) / 10}%</strong>
        </span>
        <Button size="sm" onClick={() => onLines((l) => resetShares(l, categories, counted))}>Reset shares to estimates</Button>
      </div>
    </Card>
  )
}
