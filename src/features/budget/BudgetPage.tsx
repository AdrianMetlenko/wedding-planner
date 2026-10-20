import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useShallow } from 'zustand/react/shallow'
import {
  Alert, Button, Card, EmptyState, Field, Input, NumberInput, PageHeader, Select, StatTile,
} from '../../components/ui'
import {
  budgetExpenses, countByType, expenseTotals, guestsFor, remaining, venueCost,
} from '../../lib/calc'
import { PALETTE } from '../../lib/defaults'
import { formatMoney } from '../../lib/format'
import { newId } from '../../lib/id'
import type { Expense, ExpenseCategory, ExpenseModule } from '../../lib/types'
import { useStore } from '../../store/store'
import { BudgetPlanCard } from './BudgetPlanCard'
import { COMMON_ITEMS, categoryIdByName, groupByCategory } from './budgetHelpers'

const VENUE_COLOR = '#a8a29e'
const tip = (v: unknown) => formatMoney(Number(v))

interface Draft {
  id?: string
  item: string
  categoryId: string
  estimate?: number
  paid?: number
  module: ExpenseModule
  notes: string
}

function CategoryPanel({ categories, onClose }: { categories: ExpenseCategory[]; onClose: () => void }) {
  const upsert = useStore((s) => s.upsert)
  const [name, setName] = useState('')
  const add = () => {
    if (!name.trim()) return
    upsert('expenseCategories', { id: newId('exp'), name: name.trim(), color: PALETTE[categories.length % PALETTE.length] })
    setName('')
  }
  return (
    <Card title="Expense categories" actions={<Button size="sm" onClick={onClose}>Done</Button>}>
      <ul className="mb-3 space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <input
              type="color" value={c.color} aria-label={`Colour for ${c.name}`}
              onChange={(e) => upsert('expenseCategories', { ...c, color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-stone-300"
            />
            <Input
              value={c.name} aria-label={`Name of ${c.name}`}
              onChange={(e) => upsert('expenseCategories', { ...c, name: e.target.value })}
            />
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" aria-label="New category name" />
        <Button type="submit" disabled={!name.trim()}>Add</Button>
      </form>
    </Card>
  )
}

function ExpenseForm({ initial, categories, honeymoonOn, onSave, onCancel }: {
  initial: Draft; categories: ExpenseCategory[]; honeymoonOn: boolean
  onSave: (d: Draft) => void; onCancel: () => void
}) {
  const [d, setD] = useState(initial)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const valid = d.item.trim().length > 0
  return (
    <Card title={d.id ? 'Edit expense' : 'Add an expense'}>
      <form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(d) }}>
        <Field label="Item">
          <Input value={d.item} onChange={(e) => set('item', e.target.value)} required autoFocus />
        </Field>
        <Field label="Category">
          <Select value={d.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        {honeymoonOn && (
          <Field label="Belongs to">
            <Select value={d.module} onChange={(e) => set('module', e.target.value as ExpenseModule)}>
              <option value="wedding">Wedding</option>
              <option value="honeymoon">Honeymoon</option>
            </Select>
          </Field>
        )}
        <Field label="Estimate ($)">
          <NumberInput min={0} value={d.estimate} onValueChange={(v) => set('estimate', v)} />
        </Field>
        <Field label="Paid ($)">
          <NumberInput min={0} value={d.paid} onValueChange={(v) => set('paid', v)} />
        </Field>
        <Field label="Notes">
          <Input value={d.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <div className="flex gap-2 md:col-span-3">
          <Button type="submit" variant="primary" disabled={!valid}>{d.id ? 'Save changes' : 'Add expense'}</Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

function ExpenseTable({ expenses, categories, onEdit, onDelete, extraRow }: {
  expenses: Expense[]; categories: ExpenseCategory[]
  onEdit: (e: Expense) => void; onDelete: (e: Expense) => void
  extraRow?: React.ReactNode
}) {
  const groups = useMemo(() => groupByCategory(expenses, categories), [expenses, categories])
  const totals = expenseTotals(expenses)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="py-2 pr-3">Item</th>
            <th className="py-2 pr-3 text-right">Estimate</th>
            <th className="py-2 pr-3 text-right">Paid</th>
            <th className="py-2 pr-3 text-right">Remaining</th>
            <th className="py-2 pr-3">Notes</th>
            <th className="py-2"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        {extraRow}
        {groups.map((g) => (
          <tbody key={g.categoryId || 'none'}>
            <tr className="bg-stone-50">
              <th scope="rowgroup" className="py-1.5 pl-1 pr-3 text-left font-semibold text-stone-800">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: g.category?.color ?? VENUE_COLOR }} />
                {g.name}
              </th>
              <td className="py-1.5 pr-3 text-right tabular-nums text-stone-600">{formatMoney(g.totals.estimate)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums text-stone-600">{formatMoney(g.totals.paid)}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums text-stone-600">{formatMoney(g.totals.remaining)}</td>
              <td colSpan={2} />
            </tr>
            {g.expenses.map((e) => (
              <tr key={e.id} className="border-b border-stone-100">
                <td className="py-2 pl-5 pr-3">{e.item}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(e.estimate)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(e.paid)}</td>
                <td className={`py-2 pr-3 text-right tabular-nums ${remaining(e) < 0 ? 'text-red-600' : ''}`}>{formatMoney(remaining(e))}</td>
                <td className="py-2 pr-3 text-stone-500">{e.notes}</td>
                <td className="whitespace-nowrap py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(e)} aria-label={`Edit ${e.item}`}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(e)} aria-label={`Delete ${e.item}`}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        ))}
        <tfoot className="border-t-2 border-stone-300 font-semibold">
          <tr>
            <td className="py-2 pr-3">Expenses subtotal</td>
            <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(totals.estimate)}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(totals.paid)}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(totals.remaining)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function BudgetPage() {
  const { expenses, categories, guests, settings, upsert, remove } = useStore(useShallow((s) => ({
    expenses: s.expenses, categories: s.expenseCategories, guests: s.guests, settings: s.settings,
    upsert: s.upsert, remove: s.remove,
  })))
  const [editing, setEditing] = useState<Draft | undefined>()
  const [showCats, setShowCats] = useState(false)

  const honeymoon = settings.modules.honeymoon
  const venueAttending = useMemo(() => venueCost(countByType(guestsFor(guests, 'attending')), settings), [guests, settings])
  const venuePlanned = useMemo(() => venueCost(countByType(guestsFor(guests, 'planned')), settings), [guests, settings])
  const counted = useMemo(() => budgetExpenses({ expenses, settings }), [expenses, settings])
  const totals = useMemo(() => expenseTotals(counted), [counted])

  const weddingRows = expenses.filter((e) => e.module === 'wedding')
  const honeymoonRows = honeymoon === 'off' ? [] : expenses.filter((e) => e.module === 'honeymoon')
  const honeymoonTotals = expenseTotals(honeymoonRows)

  const chartData = useMemo(() => {
    const rows = groupByCategory(counted, categories).map((g) => ({
      name: g.name, color: g.category?.color ?? VENUE_COLOR, ...g.totals,
    }))
    return rows
  }, [counted, categories])
  const pieData = useMemo(() => {
    const rows = chartData.filter((r) => r.estimate > 0).map((r) => ({ name: r.name, value: r.estimate, color: r.color }))
    if (venueAttending.total > 0) rows.push({ name: 'Venue & catering (from guest list)', value: venueAttending.total, color: VENUE_COLOR })
    return rows
  }, [chartData, venueAttending.total])

  if (!settings.modules.expenses) {
    return (
      <>
        <PageHeader title="Budget" />
        <EmptyState
          title="The budget is turned off"
          action={<Link to="/setup" className="text-sm font-medium text-brand-700 underline">Turn on in setup</Link>}
        >
          Switch on the expenses module in setup to track estimates and payments.
        </EmptyState>
      </>
    )
  }

  const blank = (module: ExpenseModule = 'wedding'): Draft => ({
    item: '', categoryId: categoryIdByName(categories, module === 'honeymoon' ? 'Honeymoon' : 'Other'),
    module, notes: '',
  })
  const save = (d: Draft) => {
    upsert('expenses', {
      id: d.id ?? newId('exp'),
      item: d.item.trim(),
      categoryId: d.categoryId,
      estimate: d.estimate ?? 0,
      paid: d.paid ?? 0,
      module: honeymoon === 'off' ? 'wedding' : d.module,
      notes: d.notes.trim() || undefined,
    })
    setEditing(undefined)
  }
  const edit = (e: Expense) => setEditing({ ...e, notes: e.notes ?? '' })
  const del = (e: Expense) => {
    if (window.confirm(`Delete "${e.item}"?`)) remove('expenses', e.id)
  }
  const seed = () => {
    for (const c of COMMON_ITEMS) {
      upsert('expenses', {
        id: newId('exp'), item: c.item, categoryId: categoryIdByName(categories, c.category),
        estimate: 0, paid: 0, module: 'wedding',
      })
    }
  }

  const venueRow = (
    <tbody>
      <tr className="border-b border-stone-200 bg-stone-50">
        <td className="py-2 pl-1 pr-3">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: VENUE_COLOR }} />
          <span className="font-medium">Venue &amp; catering (from guest list)</span>
          <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 text-xs text-stone-600">derived</span>
          <div className="pl-5 text-xs text-stone-500">
            {venueAttending.counts.adult + venueAttending.counts.child + venueAttending.counts.staff} attending guests.
            Forecast: {formatMoney(venuePlanned.total)}
          </div>
        </td>
        <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(venueAttending.total)}</td>
        <td className="py-2 pr-3 text-right text-stone-400">–</td>
        <td className="py-2 pr-3 text-right text-stone-400">–</td>
        <td className="py-2 pr-3 text-xs text-stone-500" colSpan={2}>Read-only</td>
      </tr>
    </tbody>
  )

  const totalInclVenue = totals.estimate + venueAttending.total

  return (
    <>
      <PageHeader
        title="Budget"
        description="The reception cost is derived automatically from the headcount."
        actions={(
          <>
            <Button onClick={() => setShowCats((v) => !v)}>Categories</Button>
            <Button variant="primary" onClick={() => setEditing(blank())}>Add expense</Button>
          </>
        )}
      />

      <div className="mb-6"><BudgetPlanCard /></div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Estimate" value={formatMoney(totals.estimate)} sub="Expenses only" />
        <StatTile label="Paid" value={formatMoney(totals.paid)} />
        <StatTile label="Remaining" value={formatMoney(totals.remaining)} tone={totals.remaining < 0 ? 'bad' : 'default'} />
        <StatTile
          label="Total incl. venue" value={formatMoney(totalInclVenue)}
          sub={`Venue ${formatMoney(venueAttending.total)} for attending guests (forecast ${formatMoney(venuePlanned.total)})`}
        />
      </div>

      <div className="space-y-6">
        {showCats && <CategoryPanel categories={categories} onClose={() => setShowCats(false)} />}
        {editing && (
          <ExpenseForm
            key={editing.id ?? 'new'} initial={editing} categories={categories}
            honeymoonOn={honeymoon !== 'off'} onSave={save} onCancel={() => setEditing(undefined)}
          />
        )}

        {expenses.length === 0 && !editing ? (
          <EmptyState
            title="No expenses yet"
            action={(
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" onClick={() => setEditing(blank())}>Add your first expense</Button>
                <Button onClick={seed}>Add common items</Button>
              </div>
            )}
          >
            Add expenses one by one, or start from a typical list of zero-value items and fill in the numbers.
          </EmptyState>
        ) : (
          <>
            <Card title={honeymoon === 'in-budget' ? 'Wedding expenses' : 'Expenses'}>
              <ExpenseTable
                expenses={weddingRows} categories={categories} onEdit={edit} onDelete={del} extraRow={venueRow}
              />
            </Card>

            {honeymoon === 'in-budget' && honeymoonRows.length > 0 && (
              <Card title="Honeymoon (included in budget)">
                <ExpenseTable expenses={honeymoonRows} categories={categories} onEdit={edit} onDelete={del} />
              </Card>
            )}

            {honeymoon === 'separate' && (
              <Card
                title="Honeymoon (not in wedding budget)"
                actions={<Button size="sm" onClick={() => setEditing(blank('honeymoon'))}>Add honeymoon item</Button>}
              >
                {honeymoonRows.length === 0 ? (
                  <p className="text-sm text-stone-600">No honeymoon expenses yet.</p>
                ) : (
                  <>
                    <div className="mb-3 grid gap-3 sm:grid-cols-3">
                      <StatTile label="Estimate" value={formatMoney(honeymoonTotals.estimate)} />
                      <StatTile label="Paid" value={formatMoney(honeymoonTotals.paid)} />
                      <StatTile label="Remaining" value={formatMoney(honeymoonTotals.remaining)} />
                    </div>
                    <ExpenseTable expenses={honeymoonRows} categories={categories} onEdit={edit} onDelete={del} />
                  </>
                )}
              </Card>
            )}

            {pieData.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Estimate by category">
                  <div className="h-72" role="img" aria-label="Donut chart of estimate by category">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1}>
                          {pieData.map((r) => <Cell key={r.name} fill={r.color} />)}
                        </Pie>
                        <Tooltip formatter={tip} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Paid vs remaining">
                  <div className="h-72" role="img" aria-label="Bar chart of paid and remaining amounts per category">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={70} />
                        <YAxis tickFormatter={tip} width={70} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={tip} />
                        <Legend verticalAlign="top" />
                        <Bar dataKey="paid" name="Paid" stackId="a" fill="#5f9e6e" />
                        <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#d4a03a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            ) : (
              <Alert>Add estimates to see the category charts.</Alert>
            )}
          </>
        )}
      </div>
    </>
  )
}
