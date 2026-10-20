import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import {
  Badge, Button, Card, Checkbox, EmptyState, Field, Input, NumberInput, PageHeader, Select, StatTile, cx,
} from '../../components/ui'
import { giftFromNonAttendees, giftPerHead, giftTotals, thankYouRequired } from '../../lib/calc'
import { formatMoney } from '../../lib/format'
import { newId } from '../../lib/id'
import type { Gift, GiftKind, Household } from '../../lib/types'
import { useStore } from '../../store/store'
import { GiftBoxPlot } from './GiftBoxPlot'
import {
  averagePerAttendingGuest, describeRule, ruleIsActive, sortGifts, thankYouStats,
  type GiftSortKey, type SortDir,
} from './giftHelpers'

const KINDS: { value: GiftKind; label: string }[] = [
  { value: 'money', label: 'Money' },
  { value: 'item', label: 'Item' },
  { value: 'experience', label: 'Experience' },
]
const kindLabel = (k: GiftKind) => KINDS.find((x) => x.value === k)?.label ?? k

interface Draft {
  id?: string
  from: string
  householdIds: string[]
  kind: GiftKind
  amount?: number
  description: string
  thankYouSent: boolean
}
const blank = (): Draft => ({ from: '', householdIds: [], kind: 'money', description: '', thankYouSent: false })

function HouseholdPicker({ households, value, onChange }: {
  households: Household[]; value: string[]; onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = households.filter((h) => !q || h.name.toLowerCase().includes(q))
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  const byId = new Map(households.map((h) => [h.id, h]))
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-stone-700">Linked households</span>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {value.map((id) => (
            <button
              key={id} type="button" onClick={() => toggle(id)}
              aria-label={`Remove ${byId.get(id)?.name ?? 'household'}`}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs hover:bg-stone-200"
            >
              {byId.get(id)?.name ?? 'Unknown'} ×
            </button>
          ))}
        </div>
      )}
      <Input
        type="search" placeholder="Search households…" value={query}
        onChange={(e) => setQuery(e.target.value)} aria-label="Search households"
      />
      <ul className="mt-1 max-h-36 overflow-y-auto rounded-md border border-stone-200 bg-white p-1">
        {matches.length === 0 && <li className="px-2 py-1 text-sm text-stone-500">No households found</li>}
        {matches.map((h) => (
          <li key={h.id} className="px-2 py-0.5">
            <Checkbox label={h.name} checked={value.includes(h.id)} onChange={() => toggle(h.id)} />
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-stone-500">Leave empty for givers who were not invited.</p>
    </div>
  )
}

function GiftForm({ initial, households, onSave, onCancel }: {
  initial: Draft; households: Household[]; onSave: (d: Draft) => void; onCancel: () => void
}) {
  const [d, setD] = useState(initial)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const valid = d.from.trim().length > 0
  return (
    <Card title={d.id ? 'Edit gift' : 'Log a gift'}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(e) => { e.preventDefault(); if (valid) onSave(d) }}
      >
        <div className="space-y-3">
          <Field label="From">
            <Input value={d.from} onChange={(e) => set('from', e.target.value)} placeholder="e.g. Aunt Jane" required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind">
              <Select value={d.kind} onChange={(e) => set('kind', e.target.value as GiftKind)}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </Select>
            </Field>
            <Field label="Amount ($)" hint="Value or estimate">
              <NumberInput min={0} value={d.amount} onValueChange={(v) => set('amount', v)} />
            </Field>
          </div>
          <Field label="Description">
            <Input value={d.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Checkbox label="Thank-you sent" checked={d.thankYouSent} onChange={(v) => set('thankYouSent', v)} />
        </div>
        <HouseholdPicker households={households} value={d.householdIds} onChange={(v) => set('householdIds', v)} />
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" variant="primary" disabled={!valid}>{d.id ? 'Save changes' : 'Add gift'}</Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}

export default function GiftsPage() {
  const { gifts, guests, households, settings, upsert, patch, remove } = useStore(useShallow((s) => ({
    gifts: s.gifts, guests: s.guests, households: s.households, settings: s.settings,
    upsert: s.upsert, patch: s.patch, remove: s.remove,
  })))
  const [tab, setTab] = useState<'gifts' | 'thanks'>('gifts')
  const [editing, setEditing] = useState<Draft | undefined>()
  const [sortKey, setSortKey] = useState<GiftSortKey>('from')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [onlyNeeded, setOnlyNeeded] = useState(false)

  const totals = useMemo(() => giftTotals(gifts, guests), [gifts, guests])
  const avg = useMemo(() => averagePerAttendingGuest(gifts, guests), [gifts, guests])
  const attendingCount = useMemo(() => guests.filter((g) => g.rsvp === 'yes').length, [guests])
  const stats = useMemo(() => thankYouStats(gifts, guests, settings), [gifts, guests, settings])
  const sorted = useMemo(() => sortGifts(gifts, sortKey, sortDir), [gifts, sortKey, sortDir])
  const householdName = useMemo(() => new Map(households.map((h) => [h.id, h.name])), [households])

  if (!settings.modules.gifts) {
    return (
      <>
        <PageHeader title="Gifts" />
        <EmptyState
          title="Gifts are turned off"
          action={<Link to="/setup" className="text-sm font-medium text-brand-700 underline">Turn on in setup</Link>}
        >
          Switch on the gifts module in setup to log gifts and track thank-you cards.
        </EmptyState>
      </>
    )
  }

  const thanksOn = settings.modules.thankYous
  const ruleActive = ruleIsActive(settings.thankYouRule)
  const ruleText = describeRule(settings.thankYouRule)

  const sortBy = (key: GiftSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'amount' ? 'desc' : 'asc') }
  }
  const arrow = (key: GiftSortKey) => (key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')
  const ariaSort = (key: GiftSortKey) => (key === sortKey ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none')

  const save = (d: Draft) => {
    const gift: Gift = {
      id: d.id ?? newId('gift'),
      from: d.from.trim(),
      householdIds: d.householdIds,
      kind: d.kind,
      amount: d.amount,
      description: d.description.trim() || undefined,
      thankYouSent: d.thankYouSent,
    }
    upsert('gifts', gift)
    setEditing(undefined)
  }
  const edit = (g: Gift) => setEditing({
    id: g.id, from: g.from, householdIds: g.householdIds, kind: g.kind, amount: g.amount,
    description: g.description ?? '', thankYouSent: g.thankYouSent,
  })
  const del = (g: Gift) => {
    if (window.confirm(`Delete the gift from ${g.from}?`)) remove('gifts', g.id)
  }
  const householdsOf = (g: Gift) => g.householdIds.map((id) => householdName.get(id)).filter(Boolean).join(', ')

  const thankRows = sorted.filter((g) => !onlyNeeded || (thankYouRequired(g, guests, settings) && !g.thankYouSent))

  return (
    <>
      <PageHeader
        title="Gifts"
        description="Log gifts and see what they are worth per attending guest."
        actions={<Button variant="primary" onClick={() => setEditing(blank())}>Log a gift</Button>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="From attending guests" value={formatMoney(totals.attending)} />
        <StatTile label="From non-attending / uninvited" value={formatMoney(totals.nonAttending)} />
        <StatTile label="Total gifts" value={formatMoney(totals.total)} sub={`${gifts.length} gift${gifts.length === 1 ? '' : 's'}`} />
        <StatTile
          label="Average per attending guest"
          value={avg === undefined ? '–' : formatMoney(avg)}
          sub={avg === undefined ? 'No attending guests yet' : (
            <>
              {formatMoney(totals.attending)} from attending guests ÷ {attendingCount} attending
              {settings.averageGift !== undefined && <> · expected {formatMoney(settings.averageGift)}</>}
              <br />All gifts ÷ {attendingCount}: {formatMoney(totals.total / attendingCount)}
            </>
          )}
          tone={avg === undefined || settings.averageGift === undefined ? 'default' : avg >= settings.averageGift ? 'good' : 'warn'}
        />
      </div>

      {gifts.length > 0 && (
        <div className="mb-6">
          <GiftBoxPlot gifts={gifts} guests={guests} households={households} expected={settings.averageGift} />
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <GiftForm key={editing.id ?? 'new'} initial={editing} households={households} onSave={save} onCancel={() => setEditing(undefined)} />
        </div>
      )}

      {thanksOn && (
        <div className="mb-4 flex gap-1 border-b border-stone-200" role="tablist">
          {([['gifts', 'All gifts'], ['thanks', 'Thank-you tracker']] as const).map(([id, label]) => (
            <button
              key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cx(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
                tab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-600 hover:text-stone-900',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {gifts.length === 0 ? (
        <EmptyState
          title="No gifts logged yet"
          action={<Button variant="primary" onClick={() => setEditing(blank())}>Log your first gift</Button>}
        >
          Record who gave what, link them to a household, and track thank-you cards.
        </EmptyState>
      ) : tab === 'gifts' || !thanksOn ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="py-2 pr-3" aria-sort={ariaSort('from')}>
                    <button type="button" onClick={() => sortBy('from')} className="font-semibold uppercase">From{arrow('from')}</button>
                  </th>
                  <th className="py-2 pr-3">Households</th>
                  <th className="py-2 pr-3">Kind</th>
                  <th className="py-2 pr-3 text-right" aria-sort={ariaSort('amount')}>
                    <button type="button" onClick={() => sortBy('amount')} className="font-semibold uppercase">Amount{arrow('amount')}</button>
                  </th>
                  <th className="py-2 pr-3 text-right">Per head</th>
                  <th className="py-2 pr-3">Attended?</th>
                  <th className="py-2 pr-3">Thank-you</th>
                  <th className="py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((g) => {
                  const perHead = giftPerHead(g, guests)
                  const away = giftFromNonAttendees(g, guests)
                  return (
                    <tr key={g.id} className="border-b border-stone-100 align-top">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-stone-900">{g.from}</div>
                        {g.description && <div className="text-xs text-stone-500">{g.description}</div>}
                      </td>
                      <td className="py-2 pr-3 text-stone-600">{householdsOf(g) || <span className="text-stone-400">Not invited</span>}</td>
                      <td className="py-2 pr-3">{kindLabel(g.kind)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{g.amount === undefined ? '–' : formatMoney(g.amount)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{perHead === undefined ? '–' : formatMoney(perHead)}</td>
                      <td className="py-2 pr-3">{away ? <Badge color="#b45309">No</Badge> : <Badge color="#047857">Yes</Badge>}</td>
                      <td className="py-2 pr-3">
                        {thanksOn ? (
                          <Checkbox
                            label={g.thankYouSent ? 'Sent' : 'Not sent'}
                            checked={g.thankYouSent}
                            onChange={(v) => patch('gifts', g.id, { thankYouSent: v })}
                          />
                        ) : (g.thankYouSent ? 'Sent' : '–')}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => edit(g)} aria-label={`Edit gift from ${g.from}`}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => del(g)} aria-label={`Delete gift from ${g.from}`}>Delete</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="Thank-you tracker">
          <div className="mb-3 space-y-2 text-sm text-stone-700">
            <div>
              <strong>{stats.sent} of {stats.total}</strong> thank-yous sent
              {ruleActive && <> · {stats.needsCardUnsent} card{stats.needsCardUnsent === 1 ? '' : 's'} still needed</>}
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-stone-100"
              role="progressbar" aria-valuemin={0} aria-valuemax={stats.total} aria-valuenow={stats.sent}
              aria-label="Thank-yous sent"
            >
              <div className="h-full bg-emerald-600" style={{ width: `${stats.total ? (stats.sent / stats.total) * 100 : 0}%` }} />
            </div>
            <p className="text-stone-600">
              {ruleText ?? 'No thank-you rule is set, so every gift is listed without highlighting.'}{' '}
              <Link to="/setup" className="font-medium text-brand-700 underline">Change the rule in setup</Link>
            </p>
            {ruleActive && (
              <Checkbox label="Show only gifts that need a card and are not sent" checked={onlyNeeded} onChange={setOnlyNeeded} />
            )}
          </div>
          <ul className="divide-y divide-stone-100">
            {thankRows.length === 0 && <li className="py-3 text-sm text-stone-500">Nothing to show.</li>}
            {thankRows.map((g) => {
              const required = ruleActive && thankYouRequired(g, guests, settings)
              return (
                <li key={g.id} className={cx('flex flex-wrap items-center justify-between gap-2 px-2 py-2', required && !g.thankYouSent && 'bg-amber-50')}>
                  <Checkbox
                    label={(
                      <span>
                        <span className="font-medium">{g.from}</span>
                        <span className="text-stone-500">
                          {' '}· {kindLabel(g.kind)}{g.amount !== undefined && ` · ${formatMoney(g.amount)}`}
                          {g.description && ` · ${g.description}`}
                        </span>
                      </span>
                    )}
                    checked={g.thankYouSent}
                    onChange={(v) => patch('gifts', g.id, { thankYouSent: v })}
                  />
                  {ruleActive && (required ? <Badge color="#b45309">Needs a card</Badge> : <Badge color="#78716c">Optional</Badge>)}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
