import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Badge, Button, Card, EmptyState, PageHeader, Select, StatTile } from '../../components/ui'
import { guestsFor } from '../../lib/calc'
import { formatPercent, guestName } from '../../lib/format'
import type { Guest } from '../../lib/types'
import { useStore } from '../../store/store'
import { useSetRsvp } from '../guests/hooks'
import { chaseList, emailList, seatsLost, sortByLastName } from '../guests/logic'

export default function RsvpPage() {
  const { guests, households, categories } = useStore(useShallow((s) => ({
    guests: s.guests, households: s.households, categories: s.categories,
  })))
  const setRsvp = useSetRsvp()
  const [categoryId, setCategoryId] = useState('')
  const [copied, setCopied] = useState('')
  const [note, setNote] = useState('')

  const stats = useMemo(() => {
    const planned = guestsFor(guests, 'planned')
    const count = (rsvp: Guest['rsvp']) => guests.filter((g) => g.rsvp === rsvp).length
    return {
      planned: planned.length,
      coming: count('yes'), declined: count('no'), pending: count('pending'),
      replied: count('yes') + count('no'),
    }
  }, [guests])

  const chase = useMemo(() => chaseList(guests, households, categoryId), [guests, households, categoryId])
  const confirmed = useMemo(() => sortByLastName(guests.filter((g) => g.rsvp === 'yes')), [guests])
  const declined = useMemo(() => sortByLastName(guests.filter((g) => g.rsvp === 'no')), [guests])
  const catName = (id: string) => categories.find((c) => c.id === id)

  const set = (members: Guest[], rsvp: Guest['rsvp']) => {
    const lost = seatsLost(members, rsvp)
    setRsvp(members.map((m) => m.id), rsvp)
    setNote(lost ? `${lost} guest${lost > 1 ? 's were' : ' was'} removed from their table because they declined.` : '')
  }

  const copyEmails = async () => {
    const text = emailList(chase)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text ? 'Copied' : 'No emails to copy')
    } catch {
      setCopied('Copy failed')
    }
    setTimeout(() => setCopied(''), 2500)
  }

  if (guests.length === 0) {
    return (
      <>
        <PageHeader title="RSVP" />
        <EmptyState title="No guests yet">Add or import guests on the Guests page, then track replies here.</EmptyState>
      </>
    )
  }

  const repliedPct = guests.length ? stats.replied / guests.length : 0

  return (
    <>
      <PageHeader title="RSVP" description="Chase outstanding replies and see who is confirmed." />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Forecast" value={stats.planned} sub="Confirmed + planned still to reply" />
        <StatTile label="Coming" value={stats.coming} tone="good" sub={`${guestsFor(guests, 'attending').length} confirmed vs ${stats.planned} forecast`} />
        <StatTile label="Declined" value={stats.declined} tone="bad" />
        <StatTile label="Pending" value={stats.pending} tone="warn" />
      </div>

      <Card className="mb-4">
        <div className="mb-1 flex justify-between text-sm text-stone-600">
          <span>Replies received</span>
          <span className="tabular-nums">{stats.replied} of {guests.length} ({formatPercent(repliedPct)})</span>
        </div>
        <div
          role="progressbar" aria-label="Replies received" aria-valuemin={0} aria-valuemax={guests.length} aria-valuenow={stats.replied}
          className="h-2.5 overflow-hidden rounded-full bg-stone-200"
        >
          <div className="h-full bg-emerald-600" style={{ width: `${repliedPct * 100}%` }} />
        </div>
      </Card>

      {note && <p role="status" className="mb-3 text-sm text-amber-700">{note}</p>}

      <Card
        className="mb-4"
        title={`Chase list (${chase.length} household${chase.length === 1 ? '' : 's'})`}
        actions={
          <>
            <Select aria-label="Filter chase list by category" className="w-auto" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button onClick={copyEmails} disabled={chase.length === 0}>Copy emails</Button>
          </>
        }
      >
        {copied && <p role="status" className="mb-2 text-sm text-emerald-700">{copied}</p>}
        {chase.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500">Nobody left to chase.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {chase.map((h) => (
              <li key={h.key} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-stone-900">
                      {h.name} <span className="font-normal text-stone-500">({h.pending.length} pending of {h.members.length})</span>
                    </div>
                    <div className="text-sm text-stone-600">
                      {h.emails.length === 0 && h.phones.length === 0 ? <span className="text-stone-400">No contact details</span> : null}
                      {h.emails.map((e) => <a key={e} href={`mailto:${e}`} className="mr-3 hover:underline">{e}</a>)}
                      {h.phones.map((p) => <span key={p} className="mr-3">{p}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => set(h.pending, 'yes')}>All coming</Button>
                    <Button size="sm" onClick={() => set(h.pending, 'no')}>All declined</Button>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {h.pending.map((g) => {
                    const cat = catName(g.categoryId)
                    return (
                      <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>
                          {guestName(g)} {cat && <Badge color={cat.color}>{cat.name}</Badge>}
                        </span>
                        <span className="flex gap-1">
                          <Button size="sm" aria-label={`${guestName(g)} coming`} onClick={() => set([g], 'yes')}>Yes</Button>
                          <Button size="sm" aria-label={`${guestName(g)} declined`} onClick={() => set([g], 'no')}>No</Button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Confirmed (${confirmed.length})`}>
          {confirmed.length === 0 ? (
            <p className="text-sm text-stone-500">No confirmed guests yet.</p>
          ) : (
            <GuestList guests={confirmed} onUndo={(g) => set([g], 'pending')} />
          )}
        </Card>
        <Card title={`Declined (${declined.length})`}>
          <details>
            <summary className="cursor-pointer text-sm text-stone-600">
              {declined.length === 0 ? 'Nobody has declined' : 'Show declined guests'}
            </summary>
            {declined.length > 0 && (
              <div className="mt-2"><GuestList guests={declined} onUndo={(g) => set([g], 'pending')} /></div>
            )}
          </details>
        </Card>
      </div>
    </>
  )
}

function GuestList({ guests, onUndo }: { guests: Guest[]; onUndo: (g: Guest) => void }) {
  const categories = useStore((s) => s.categories)
  return (
    <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto text-sm">
      {guests.map((g) => {
        const cat = categories.find((c) => c.id === g.categoryId)
        return (
          <li key={g.id} className="flex items-center justify-between gap-2 py-1.5">
            <span>
              {g.lastName}{g.lastName && g.firstName ? ', ' : ''}{g.firstName}{' '}
              {cat && <Badge color={cat.color}>{cat.name}</Badge>}
            </span>
            <Button size="sm" variant="ghost" aria-label={`Reset RSVP for ${guestName(g)}`} onClick={() => onUndo(g)}>Reset</Button>
          </li>
        )
      })}
    </ul>
  )
}
