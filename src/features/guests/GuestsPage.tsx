import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select } from '../../components/ui'
import { guestName } from '../../lib/format'
import { GUEST_TYPES, type GuestType, type Rsvp } from '../../lib/types'
import { useStore } from '../../store/store'
import { ImportStep } from '../import/ImportStep'
import { CategoriesStep } from '../setup/steps/CategoriesStep'
import { GroupsStep } from '../setup/steps/GroupsStep'
import { GuestFormModal, HouseholdFormModal } from './GuestForm'
import { useDeleteGuests, useSetRsvp } from './hooks'
import {
  EMPTY_FILTERS, filterGuests, groupByHousehold, hasActiveFilters, seatsLost, type GuestFilters,
} from './logic'
import { Modal } from './Modal'
import { RSVP_LABEL, RsvpControl } from './RsvpControl'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

type Dialog =
  | { kind: 'guest'; guestId?: string; householdId?: string }
  | { kind: 'household' }
  | { kind: 'import' }
  | { kind: 'labels' }
  | null

export default function GuestsPage() {
  const { guests, households, categories, tags, allAttributes, tables } = useStore(useShallow((s) => ({
    guests: s.guests, households: s.households, categories: s.categories, tags: s.tags,
    allAttributes: s.balanceAttributes, tables: s.tables,
  })))
  const attributes = useMemo(() => allAttributes.filter((a) => a.enabled), [allAttributes])
  const patch = useStore((s) => s.patch)
  const patchMany = useStore((s) => s.patchMany)
  const setRsvp = useSetRsvp()
  const deleteGuests = useDeleteGuests()

  const [filters, setFilters] = useState<GuestFilters>(EMPTY_FILTERS)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showContact, setShowContact] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [note, setNote] = useState('')

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const tableById = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables])

  const filtered = useMemo(() => filterGuests(guests, filters), [guests, filters])
  const groups = useMemo(() => groupByHousehold(filtered, households), [filtered, households])
  const setFilter = <K extends keyof GuestFilters>(k: K, v: GuestFilters[K]) => setFilters((f) => ({ ...f, [k]: v }))

  const selectedIds = useMemo(() => guests.filter((g) => selected.has(g.id)).map((g) => g.id), [guests, selected])
  const visibleIds = filtered.map((g) => g.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  const toggle = (ids: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })

  const changeRsvp = (ids: string[], rsvp: Rsvp) => {
    const lost = seatsLost(guests.filter((g) => ids.includes(g.id)), rsvp)
    setRsvp(ids, rsvp)
    setNote(lost ? `${lost} guest${lost > 1 ? 's were' : ' was'} removed from their table because they declined.` : '')
  }

  const confirmDelete = (ids: string[], label: string) => {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    deleteGuests(ids)
    toggle(ids, false)
  }

  const importModal = dialog?.kind === 'import' && (
    <Modal title="Import guests from CSV" onClose={() => setDialog(null)} wide>
      <ImportStep onDone={() => setDialog(null)} />
    </Modal>
  )

  const actions = (
    <>
      <Button onClick={() => setDialog({ kind: 'labels' })}>Categories &amp; groups</Button>
      <Button onClick={() => setDialog({ kind: 'import' })}>Import CSV</Button>
      <Button onClick={() => setDialog({ kind: 'household' })}>Add household</Button>
      <Button variant="primary" onClick={() => setDialog({ kind: 'guest' })}>Add guest</Button>
    </>
  )

  const dialogs = (
    <>
      {importModal}
      {dialog?.kind === 'labels' && (
        <Modal title="Categories & groups" onClose={() => setDialog(null)} wide>
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 font-semibold text-stone-900">Categories</h3>
              <CategoriesStep />
            </section>
            <section>
              <h3 className="mb-2 font-semibold text-stone-900">Guest groups</h3>
              <GroupsStep />
            </section>
            <div className="flex justify-end"><Button variant="primary" onClick={() => setDialog(null)}>Done</Button></div>
          </div>
        </Modal>
      )}
      {dialog?.kind === 'household' && <HouseholdFormModal onClose={() => setDialog(null)} />}
      {dialog?.kind === 'guest' && (
        <GuestFormModal
          key={dialog.guestId ?? 'new'}
          guest={guests.find((g) => g.id === dialog.guestId)}
          defaultHouseholdId={dialog.householdId}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )

  if (guests.length === 0) {
    return (
      <>
        <PageHeader title="Guests" />
        <EmptyState
          title="No guests yet"
          action={<div className="flex justify-center gap-2">{actions}</div>}
        >
          Import your list from a CSV file, or add guests and households one at a time.
        </EmptyState>
        {dialogs}
      </>
    )
  }

  // checkbox, name, category, groups, type, planned, RSVP, table, actions + attributes + contact
  const colCount = 9 + attributes.length + (showContact ? 2 : 0)

  return (
    <>
      <PageHeader title="Guests" description="Grouped by household. Filter, edit and bulk-update your list." actions={actions} />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Input
              type="search" aria-label="Search guests" placeholder="Search name or email"
              value={filters.search} onChange={(e) => setFilter('search', e.target.value)}
            />
          </div>
          <Select aria-label="Filter by category" value={filters.categoryId} onChange={(e) => setFilter('categoryId', e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select aria-label="Filter by group" value={filters.tagId} onChange={(e) => setFilter('tagId', e.target.value)}>
            <option value="">All groups</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select aria-label="Filter by RSVP" value={filters.rsvp} onChange={(e) => setFilter('rsvp', e.target.value as Rsvp | '')}>
            <option value="">Any RSVP</option>
            {(Object.keys(RSVP_LABEL) as Rsvp[]).map((r) => <option key={r} value={r}>{RSVP_LABEL[r]}</option>)}
          </Select>
          <Select aria-label="Filter by planned" value={filters.planned} onChange={(e) => setFilter('planned', e.target.value as GuestFilters['planned'])}>
            <option value="">Planned or not</option>
            <option value="yes">Planned</option>
            <option value="no">Not planned</option>
          </Select>
          <Select aria-label="Filter by type" value={filters.type} onChange={(e) => setFilter('type', e.target.value as GuestType | '')}>
            <option value="">Any type</option>
            {GUEST_TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
          <span aria-live="polite">Showing {filtered.length} of {guests.length} guests</span>
          <div className="flex gap-2">
            {hasActiveFilters(filters) && <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>}
            <Button size="sm" onClick={() => setShowContact((v) => !v)} aria-pressed={showContact}>
              {showContact ? 'Hide contact' : 'Show contact'}
            </Button>
          </div>
        </div>
      </Card>

      {note && <p role="status" className="mb-3 text-sm text-amber-700">{note}</p>}

      {selectedIds.length > 0 && (
        <BulkBar
          count={selectedIds.length}
          onClear={() => setSelected(new Set())}
          onRsvp={(r) => changeRsvp(selectedIds, r)}
          onPlanned={(v) => patchMany('guests', selectedIds, { planned: v })}
          onCategory={(id) => patchMany('guests', selectedIds, { categoryId: id })}
          onTag={(id, add) => {
            for (const g of guests.filter((x) => selected.has(x.id))) {
              const has = g.tagIds.includes(id)
              if (add && !has) patch('guests', g.id, { tagIds: [...g.tagIds, id] })
              if (!add && has) patch('guests', g.id, { tagIds: g.tagIds.filter((t) => t !== id) })
            }
          }}
          onDelete={() => confirmDelete(selectedIds, `${selectedIds.length} guest${selectedIds.length > 1 ? 's' : ''}`)}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox" className="h-4 w-4 accent-brand-600" aria-label="Select all shown guests"
                  checked={allVisibleSelected} onChange={(e) => toggle(visibleIds, e.target.checked)}
                />
              </th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Groups</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Planned</th>
              <th className="px-3 py-2">RSVP</th>
              <th className="px-3 py-2">Table</th>
              {attributes.map((a) => <th key={a.id} className="px-3 py-2">{a.name}</th>)}
              {showContact && <><th className="px-3 py-2">Email</th><th className="px-3 py-2">Phone</th></>}
              <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td colSpan={colCount} className="px-3 py-8 text-center text-stone-500">No guests match these filters.</td></tr>
            )}
            {groups.map((grp) => {
              const ids = grp.members.map((m) => m.id)
              const allSel = ids.every((id) => selected.has(id))
              return (
                <HouseholdRows key={grp.key}>
                  <tr className="border-t border-stone-200 bg-stone-100/70">
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox" className="h-4 w-4 accent-brand-600" aria-label={`Select household ${grp.name}`}
                        checked={allSel} onChange={(e) => toggle(ids, e.target.checked)}
                      />
                    </td>
                    <td colSpan={colCount - 1} className="px-3 py-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <span className="font-semibold text-stone-800">
                          {grp.name} <span className="font-normal text-stone-500">({grp.members.length})</span>
                        </span>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-xs text-stone-500">Household:</span>
                          <RsvpSet label={grp.name} onSet={(r) => changeRsvp(ids, r)} />
                          {grp.household && (
                            <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'guest', householdId: grp.household?.id })}>+ Member</Button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {grp.members.map((g) => {
                    const cat = catById.get(g.categoryId)
                    const table = g.tableId ? tableById.get(g.tableId) : undefined
                    return (
                      <tr key={g.id} className="border-t border-stone-100 hover:bg-stone-50">
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox" className="h-4 w-4 accent-brand-600" aria-label={`Select ${guestName(g)}`}
                            checked={selected.has(g.id)} onChange={(e) => toggle([g.id], e.target.checked)}
                          />
                        </td>
                        <td className="px-3 py-1.5 pl-6">
                          <button type="button" className="text-left font-medium text-stone-900 hover:underline" onClick={() => setDialog({ kind: 'guest', guestId: g.id })}>
                            {[g.title, g.firstName, g.lastName].filter(Boolean).join(' ')}
                          </button>
                        </td>
                        <td className="px-3 py-1.5">{cat ? <Badge color={cat.color}>{cat.name}</Badge> : <span className="text-stone-400">None</span>}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex flex-wrap gap-1">
                            {g.tagIds.map((id) => tagById.get(id)).filter((t) => !!t).map((t) => <Badge key={t.id} color={t.color}>{t.name}</Badge>)}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">{cap(g.type)}</td>
                        <td className="px-3 py-1.5">
                          <input
                            type="checkbox" className="h-4 w-4 accent-brand-600" aria-label={`${guestName(g)} planned`}
                            checked={g.planned} onChange={(e) => patch('guests', g.id, { planned: e.target.checked })}
                          />
                        </td>
                        <td className="px-3 py-1.5"><RsvpControl label={guestName(g)} value={g.rsvp} onChange={(r) => changeRsvp([g.id], r)} /></td>
                        <td className="px-3 py-1.5 text-stone-600">{table ? table.name : ''}</td>
                        {attributes.map((a) => (
                          <td key={a.id} className="px-3 py-1.5">
                            <Select
                              aria-label={`${a.name} for ${guestName(g)}`} className="py-1"
                              value={g.attributes[a.id] ?? ''}
                              onChange={(e) => patch('guests', g.id, { attributes: { ...g.attributes, [a.id]: e.target.value } })}
                            >
                              <option value="">-</option>
                              {a.values.map((v) => <option key={v} value={v}>{v}</option>)}
                            </Select>
                          </td>
                        ))}
                        {showContact && <>
                          <td className="px-3 py-1.5 text-stone-600">{g.email}</td>
                          <td className="px-3 py-1.5 text-stone-600">{g.phone}</td>
                        </>}
                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'guest', guestId: g.id })}>Edit</Button>
                          <Button size="sm" variant="ghost" aria-label={`Delete ${guestName(g)}`} onClick={() => confirmDelete([g.id], guestName(g) || 'this guest')}>Delete</Button>
                        </td>
                      </tr>
                    )
                  })}
                </HouseholdRows>
              )
            })}
          </tbody>
        </table>
      </div>
      {dialogs}
    </>
  )
}

// A fragment wrapper keeps the household header and members adjacent in the table body.
function HouseholdRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function RsvpSet({ label, onSet }: { label: string; onSet: (r: Rsvp) => void }) {
  return (
    <div role="group" aria-label={`Set RSVP for household ${label}`} className="inline-flex gap-1">
      <Button size="sm" onClick={() => onSet('yes')}>All yes</Button>
      <Button size="sm" onClick={() => onSet('no')}>All no</Button>
      <Button size="sm" onClick={() => onSet('pending')}>Reset</Button>
    </div>
  )
}

function BulkBar({ count, onClear, onRsvp, onPlanned, onCategory, onTag, onDelete }: {
  count: number
  onClear: () => void
  onRsvp: (r: Rsvp) => void
  onPlanned: (v: boolean) => void
  onCategory: (id: string) => void
  onTag: (id: string, add: boolean) => void
  onDelete: () => void
}) {
  const categories = useStore((s) => s.categories)
  const tags = useStore((s) => s.tags)
  // Selects act on change, then snap back to the placeholder.
  const pick = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) fn(e.target.value)
    e.target.value = ''
  }
  return (
    <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm shadow-sm">
      <span className="font-medium">{count} selected</span>
      <Select aria-label="Bulk set RSVP" className="w-auto" defaultValue="" onChange={pick((v) => onRsvp(v as Rsvp))}>
        <option value="">Set RSVP…</option>
        {(Object.keys(RSVP_LABEL) as Rsvp[]).map((r) => <option key={r} value={r}>{RSVP_LABEL[r]}</option>)}
      </Select>
      <Select aria-label="Bulk set planned" className="w-auto" defaultValue="" onChange={pick((v) => onPlanned(v === 'yes'))}>
        <option value="">Set planned…</option>
        <option value="yes">Planned</option>
        <option value="no">Not planned</option>
      </Select>
      <Select aria-label="Bulk set category" className="w-auto" defaultValue="" onChange={pick(onCategory)}>
        <option value="">Set category…</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Select aria-label="Bulk add group" className="w-auto" defaultValue="" onChange={pick((v) => onTag(v, true))}>
        <option value="">Add group…</option>
        {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      <Select aria-label="Bulk remove group" className="w-auto" defaultValue="" onChange={pick((v) => onTag(v, false))}>
        <option value="">Remove group…</option>
        {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
      <Button variant="danger" size="sm" onClick={onDelete}>Delete</Button>
      <Button variant="ghost" size="sm" onClick={onClear}>Clear selection</Button>
    </div>
  )
}
