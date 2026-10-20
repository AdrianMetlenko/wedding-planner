import { useState, type FormEvent } from 'react'
import { Alert, Button, Field, Input, Select, Checkbox } from '../../components/ui'
import { GUEST_TYPES, type Guest, type GuestType, type Household, type Rsvp } from '../../lib/types'
import { newId } from '../../lib/id'
import { useStore } from '../../store/store'
import { Modal } from './Modal'
import { RSVP_LABEL } from './RsvpControl'

const NEW = '__new__'
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const clean = (s: string | undefined) => (s?.trim() ? s.trim() : undefined)

function useRefData() {
  const categories = useStore((s) => s.categories)
  const tags = useStore((s) => s.tags)
  const attributes = useStore((s) => s.balanceAttributes)
  const households = useStore((s) => s.households)
  const tables = useStore((s) => s.tables)
  return { categories, tags, attributes: attributes.filter((a) => a.enabled), households, tables }
}

/** Add or edit one guest. `guest` undefined means add. */
export function GuestFormModal({ guest, defaultHouseholdId, onClose }: {
  guest?: Guest; defaultHouseholdId?: string; onClose: () => void
}) {
  const { categories, tags, attributes, households, tables } = useRefData()
  const upsert = useStore((s) => s.upsert)
  const [f, setF] = useState(() => ({
    title: guest?.title ?? '',
    firstName: guest?.firstName ?? '',
    lastName: guest?.lastName ?? '',
    householdId: guest?.householdId ?? defaultHouseholdId ?? NEW,
    newHousehold: '',
    categoryId: guest?.categoryId ?? categories[0]?.id ?? '',
    tagIds: guest?.tagIds ?? [],
    attributes: guest?.attributes ?? {},
    type: guest?.type ?? ('adult' as GuestType),
    planned: guest?.planned ?? true,
    rsvp: guest?.rsvp ?? ('pending' as Rsvp),
    email: guest?.email ?? '',
    phone: guest?.phone ?? '',
    line1: guest?.address?.line1 ?? '',
    city: guest?.address?.city ?? '',
    state: guest?.address?.state ?? '',
    postcode: guest?.address?.postcode ?? '',
    country: guest?.address?.country ?? '',
    notes: guest?.notes ?? '',
  }))
  const [error, setError] = useState('')
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const table = tables.find((t) => t.id === guest?.tableId)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!f.firstName.trim() && !f.lastName.trim()) return setError('Enter a first or last name.')
    let householdId = f.householdId
    if (householdId === NEW) {
      const name = f.newHousehold.trim() || f.lastName.trim() || f.firstName.trim()
      householdId = newId('hh')
      upsert('households', { id: householdId, name })
    }
    const address = {
      line1: clean(f.line1), city: clean(f.city), state: clean(f.state),
      postcode: clean(f.postcode), country: clean(f.country),
    }
    const hasAddress = Object.values(address).some(Boolean)
    // Declining always clears the seat.
    const unseat = f.rsvp === 'no'
    const record: Guest = {
      ...(guest ?? { id: newId('g') }),
      title: clean(f.title),
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      householdId,
      categoryId: f.categoryId,
      tagIds: f.tagIds,
      attributes: Object.fromEntries(Object.entries(f.attributes).filter(([, v]) => v)),
      type: f.type,
      planned: f.planned,
      rsvp: f.rsvp,
      tableId: unseat ? undefined : guest?.tableId,
      seat: unseat ? undefined : guest?.seat,
      email: clean(f.email),
      phone: clean(f.phone),
      address: hasAddress ? address : undefined,
      notes: clean(f.notes),
    }
    upsert('guests', record)
    onClose()
  }

  return (
    <Modal title={guest ? 'Edit guest' : 'Add guest'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Dr, Mrs…" /></Field>
          <Field label="First name"><Input value={f.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Last name"><Input value={f.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Household">
            <Select value={f.householdId} onChange={(e) => set('householdId', e.target.value)}>
              <option value={NEW}>New household…</option>
              {households.map((h: Household) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
          </Field>
          {f.householdId === NEW && (
            <Field label="New household name" hint="Defaults to the last name">
              <Input value={f.newHousehold} onChange={(e) => set('newHousehold', e.target.value)} />
            </Field>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Category">
            <Select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={f.type} onChange={(e) => set('type', e.target.value as GuestType)}>
              {GUEST_TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
            </Select>
          </Field>
          <Field label="RSVP">
            <Select value={f.rsvp} onChange={(e) => set('rsvp', e.target.value as Rsvp)}>
              {(Object.keys(RSVP_LABEL) as Rsvp[]).map((r) => <option key={r} value={r}>{RSVP_LABEL[r]}</option>)}
            </Select>
          </Field>
          <div className="flex items-end pb-1.5">
            <Checkbox label="Planned (A-list)" checked={f.planned} onChange={(v) => set('planned', v)} />
          </div>
        </div>
        {guest?.tableId && (
          <p className="text-xs text-stone-500">
            Seated at {table?.name ?? 'a table'}{f.rsvp === 'no' ? '. Saving as declined will remove their seat.' : '.'}
          </p>
        )}

        {tags.length > 0 && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-stone-700">Groups</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {tags.map((t) => (
                <Checkbox
                  key={t.id}
                  label={t.name}
                  checked={f.tagIds.includes(t.id)}
                  onChange={(v) => set('tagIds', v ? [...f.tagIds, t.id] : f.tagIds.filter((x) => x !== t.id))}
                />
              ))}
            </div>
          </fieldset>
        )}

        {attributes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {attributes.map((a) => (
              <Field key={a.id} label={a.name}>
                <Select
                  value={f.attributes[a.id] ?? ''}
                  onChange={(e) => set('attributes', { ...f.attributes, [a.id]: e.target.value })}
                >
                  <option value="">Not set</option>
                  {a.values.map((v) => <option key={v} value={v}>{v}</option>)}
                </Select>
              </Field>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Phone"><Input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-6">
          <div className="sm:col-span-6"><Field label="Address"><Input value={f.line1} onChange={(e) => set('line1', e.target.value)} /></Field></div>
          <div className="sm:col-span-2"><Field label="City"><Input value={f.city} onChange={(e) => set('city', e.target.value)} /></Field></div>
          <div className="sm:col-span-1"><Field label="State"><Input value={f.state} onChange={(e) => set('state', e.target.value)} /></Field></div>
          <div className="sm:col-span-1"><Field label="Postcode"><Input value={f.postcode} onChange={(e) => set('postcode', e.target.value)} /></Field></div>
          <div className="sm:col-span-2"><Field label="Country"><Input value={f.country} onChange={(e) => set('country', e.target.value)} /></Field></div>
        </div>
        <Field label="Notes">
          <textarea
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            rows={2}
            value={f.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">{guest ? 'Save' : 'Add guest'}</Button>
        </div>
      </form>
    </Modal>
  )
}

interface MemberRow { key: number; firstName: string; lastName: string; type: GuestType }

/** Quickly add a household: a name plus its members. */
export function HouseholdFormModal({ onClose }: { onClose: () => void }) {
  const categories = useStore((s) => s.categories)
  const upsert = useStore((s) => s.upsert)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [rows, setRows] = useState<MemberRow[]>([
    { key: 1, firstName: '', lastName: '', type: 'adult' },
    { key: 2, firstName: '', lastName: '', type: 'adult' },
  ])
  const [error, setError] = useState('')
  const setRow = (key: number, p: Partial<MemberRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const members = rows.filter((r) => r.firstName.trim() || r.lastName.trim())
    if (members.length === 0) return setError('Add at least one member.')
    const hhName = name.trim() || members[0].lastName.trim() || members[0].firstName.trim()
    const householdId = newId('hh')
    upsert('households', { id: householdId, name: hhName })
    for (const m of members) {
      upsert('guests', {
        id: newId('g'), firstName: m.firstName.trim(), lastName: m.lastName.trim() || name.trim(),
        householdId, categoryId, tagIds: [], attributes: {}, type: m.type, planned: true, rsvp: 'pending',
      })
    }
    onClose()
  }

  return (
    <Modal title="Add household" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Household name" hint="Defaults to the first member's last name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Smiths" />
          </Field>
          <Field label="Category">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
              <Field label={i === 0 ? 'First name' : ''}>
                <Input aria-label={`Member ${i + 1} first name`} value={r.firstName} onChange={(e) => setRow(r.key, { firstName: e.target.value })} />
              </Field>
              <Field label={i === 0 ? 'Last name' : ''}>
                <Input aria-label={`Member ${i + 1} last name`} value={r.lastName} onChange={(e) => setRow(r.key, { lastName: e.target.value })} />
              </Field>
              <Field label={i === 0 ? 'Type' : ''}>
                <Select aria-label={`Member ${i + 1} type`} value={r.type} onChange={(e) => setRow(r.key, { type: e.target.value as GuestType })}>
                  {GUEST_TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
                </Select>
              </Field>
              <Button
                variant="ghost" size="sm" aria-label={`Remove member ${i + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => setRows((rs) => [...rs, { key: Math.max(0, ...rs.map((r) => r.key)) + 1, firstName: '', lastName: '', type: 'adult' }])}
          >
            + Add member
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Add household</Button>
        </div>
      </form>
    </Modal>
  )
}
